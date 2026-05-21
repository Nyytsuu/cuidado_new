package com.cuidado.app;

import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.content.pm.ServiceInfo;
import android.os.Bundle;
import android.os.Build;
import android.speech.RecognitionListener;
import android.speech.RecognitionService;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import org.json.JSONObject;

public class AndroidSpeechBridge implements RecognitionListener {
    private static final String TAG = "CuidadoSpeech";
    private static final List<String> PREFERRED_RECOGNITION_PACKAGES = Arrays.asList(
        "com.google.android.as",
        "com.google.android.tts",
        "com.google.android.googlequicksearchbox"
    );

    private final MainActivity activity;
    private final WebView webView;
    private SpeechRecognizer speechRecognizer;
    private String activeRecognizerId;
    private String lastTranscript = "";
    private String activeLocaleTag = "en-US";
    private boolean retriedWithFallbackLanguage = false;
    private int activeBackendIndex = 0;
    private int rmsEventCount = 0;
    private float maxRms = Float.NEGATIVE_INFINITY;

    public AndroidSpeechBridge(MainActivity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    @JavascriptInterface
    public void start(String id, String language) {
        activity.runOnUiThread(() -> {
            if (!activity.hasAudioPermission()) {
                activity.requestAudioPermission();
                emitError(id, "not-allowed");
                return;
            }

            if (!SpeechRecognizer.isRecognitionAvailable(activity)) {
                emitError(id, "not-supported");
                return;
            }

            beginListening(id, language, false, 0);
        });
    }

    private void beginListening(String id, String language, boolean fallbackLanguage, int backendIndex) {
        stopCurrentRecognizer();

        activeRecognizerId = id;
        lastTranscript = "";
        retriedWithFallbackLanguage = fallbackLanguage;
        activeBackendIndex = Math.max(0, backendIndex);
        rmsEventCount = 0;
        maxRms = Float.NEGATIVE_INFINITY;
        speechRecognizer = createRecognizer(activeBackendIndex);
        speechRecognizer.setRecognitionListener(this);

        String localeTag = fallbackLanguage
            ? "en-US"
            : language != null && !language.trim().isEmpty()
                ? language
                : "en-US";
        activeLocaleTag = localeTag;

        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(
            RecognizerIntent.EXTRA_LANGUAGE_MODEL,
            RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
        );
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, localeTag);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, localeTag);
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
        intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, activity.getPackageName());
        intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, isOnDeviceBackend(activeBackendIndex));
        intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 7000);
        intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 2500);
        intent.putExtra(
            RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS,
            2500
        );

        try {
            speechRecognizer.startListening(intent);
        } catch (Exception exception) {
            Log.w(TAG, "Speech recognizer could not start", exception);
            emitError(id, "client");
            stopCurrentRecognizer();
        }
    }

    private SpeechRecognizer createRecognizer(int backendIndex) {
        if (isOnDeviceBackend(backendIndex)) {
            try {
                Log.d(TAG, "Using on-device speech recognizer");
                return SpeechRecognizer.createOnDeviceSpeechRecognizer(activity);
            } catch (Exception exception) {
                Log.w(TAG, "Could not create on-device speech recognizer", exception);
            }
        }

        List<ComponentName> services = resolveRecognitionServices();
        int serviceIndex = getServiceIndexForBackend(backendIndex);

        if (!services.isEmpty()) {
            ComponentName service = services.get(Math.min(serviceIndex, services.size() - 1));
            try {
                Log.d(TAG, "Using speech recognizer " + service.flattenToShortString());
                return SpeechRecognizer.createSpeechRecognizer(activity, service);
            } catch (Exception exception) {
                Log.w(TAG, "Could not create preferred speech recognizer", exception);
            }
        }

        Log.d(TAG, "Using default speech recognizer");
        return SpeechRecognizer.createSpeechRecognizer(activity);
    }

    private boolean isOnDeviceRecognitionAvailable() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            SpeechRecognizer.isOnDeviceRecognitionAvailable(activity);
    }

    private boolean isOnDeviceBackend(int backendIndex) {
        return isOnDeviceRecognitionAvailable() && backendIndex == 0;
    }

    private int getServiceIndexForBackend(int backendIndex) {
        return isOnDeviceRecognitionAvailable() ? Math.max(0, backendIndex - 1) : backendIndex;
    }

    private int getBackendCount() {
        return resolveRecognitionServices().size() + (isOnDeviceRecognitionAvailable() ? 1 : 0);
    }

    private String describeBackend(int backendIndex) {
        if (isOnDeviceBackend(backendIndex)) {
            return "on-device speech recognizer";
        }

        List<ComponentName> services = resolveRecognitionServices();
        int serviceIndex = getServiceIndexForBackend(backendIndex);

        if (services.isEmpty()) {
            return "default speech recognizer";
        }

        return services.get(Math.min(serviceIndex, services.size() - 1)).flattenToShortString();
    }

    private List<ComponentName> resolveRecognitionServices() {
        List<ComponentName> recognitionServices = new ArrayList<>();

        try {
            Intent serviceIntent = new Intent(RecognitionService.SERVICE_INTERFACE);
            List<ResolveInfo> services = activity
                .getPackageManager()
                .queryIntentServices(serviceIntent, PackageManager.MATCH_DEFAULT_ONLY);

            if (services == null || services.isEmpty()) {
                services = activity.getPackageManager().queryIntentServices(serviceIntent, 0);
            }

            if (services == null || services.isEmpty()) {
                return recognitionServices;
            }

            for (String packageName : PREFERRED_RECOGNITION_PACKAGES) {
                for (ResolveInfo resolveInfo : services) {
                    ServiceInfo serviceInfo = resolveInfo.serviceInfo;
                    if (serviceInfo != null &&
                        packageName.equals(serviceInfo.packageName) &&
                        !containsService(recognitionServices, serviceInfo)) {
                        recognitionServices.add(new ComponentName(serviceInfo.packageName, serviceInfo.name));
                    }
                }
            }

            for (ResolveInfo resolveInfo : services) {
                ServiceInfo serviceInfo = resolveInfo.serviceInfo;
                if (serviceInfo != null && !containsService(recognitionServices, serviceInfo)) {
                    recognitionServices.add(new ComponentName(serviceInfo.packageName, serviceInfo.name));
                }
            }
        } catch (Exception exception) {
            Log.w(TAG, "Could not resolve speech recognition service", exception);
        }

        return recognitionServices;
    }

    private boolean containsService(List<ComponentName> services, ServiceInfo serviceInfo) {
        for (ComponentName componentName : services) {
            if (componentName.getPackageName().equals(serviceInfo.packageName) &&
                componentName.getClassName().equals(serviceInfo.name)) {
                return true;
            }
        }

        return false;
    }

    @JavascriptInterface
    public void stop(String id) {
        activity.runOnUiThread(() -> {
            if (id != null && id.equals(activeRecognizerId) && speechRecognizer != null) {
                speechRecognizer.stopListening();
            }
        });
    }

    @JavascriptInterface
    public void abort(String id) {
        activity.runOnUiThread(() -> {
            if (id != null && id.equals(activeRecognizerId)) {
                stopCurrentRecognizer();
            }
        });
    }

    @Override
    public void onReadyForSpeech(Bundle params) {
        Log.d(TAG, "Speech recognizer ready for audio");
        if (activeRecognizerId != null) {
            emitStart(activeRecognizerId);
        }
    }

    @Override
    public void onBeginningOfSpeech() {}

    @Override
    public void onRmsChanged(float rmsdB) {
        rmsEventCount++;
        if (rmsdB > maxRms) {
            maxRms = rmsdB;
        }

        if (rmsEventCount == 1 || rmsEventCount % 25 == 0) {
            Log.d(TAG, "Speech audio level rms=" + rmsdB + " max=" + maxRms);
        }
    }

    @Override
    public void onBufferReceived(byte[] buffer) {}

    @Override
    public void onEndOfSpeech() {}

    @Override
    public void onError(int error) {
        if (isLanguageError(error) && activeRecognizerId != null) {
            if (!retriedWithFallbackLanguage && !"en-US".equalsIgnoreCase(activeLocaleTag)) {
                String recognizerId = activeRecognizerId;
                beginListening(recognizerId, "en-US", true, activeBackendIndex);
                return;
            }

            if (tryNextRecognitionService()) {
                return;
            }

            Log.w(TAG, "All speech backends rejected language " + activeLocaleTag);
        }

        if (isServiceError(error) && activeRecognizerId != null && tryNextRecognitionService()) {
            return;
        }

        if ((error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) &&
            activeRecognizerId != null &&
            !lastTranscript.trim().isEmpty()) {
            emitResult(activeRecognizerId, lastTranscript, true);
            stopCurrentRecognizer();
            return;
        }

        if ((error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) &&
            activeRecognizerId != null &&
            !retriedWithFallbackLanguage) {
            String recognizerId = activeRecognizerId;
            beginListening(recognizerId, "en-US", true, activeBackendIndex);
            return;
        }

        String mappedError;

        switch (error) {
            case SpeechRecognizer.ERROR_AUDIO:
                mappedError = "audio";
                break;
            case SpeechRecognizer.ERROR_NETWORK:
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                mappedError = "network";
                break;
            case SpeechRecognizer.ERROR_CLIENT:
                mappedError = "client";
                break;
            case SpeechRecognizer.ERROR_SERVER:
                mappedError = "service";
                break;
            case SpeechRecognizer.ERROR_NO_MATCH:
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                mappedError = "no-speech";
                break;
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                mappedError = "not-allowed";
                break;
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                mappedError = "busy";
                break;
            default:
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
                    error == SpeechRecognizer.ERROR_SERVER_DISCONNECTED) {
                    mappedError = "service";
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
                    error == SpeechRecognizer.ERROR_TOO_MANY_REQUESTS) {
                    mappedError = "busy";
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                    (error == SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED ||
                        error == SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE ||
                        error == SpeechRecognizer.ERROR_CANNOT_CHECK_SUPPORT)) {
                    mappedError = "language";
                } else {
                    mappedError = "speech-error-" + error;
                }
                break;
        }

        Log.w(
            TAG,
            "Speech recognition failed with code " + error +
                " mapped to " + mappedError +
                " rmsEvents=" + rmsEventCount +
                " maxRms=" + maxRms
        );

        if (activeRecognizerId != null) {
            emitError(activeRecognizerId, mappedError);
        }

        stopCurrentRecognizer();
    }

    private boolean isLanguageError(int error) {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            (error == SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED ||
                error == SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE ||
                error == SpeechRecognizer.ERROR_CANNOT_CHECK_SUPPORT);
    }

    private boolean isServiceError(int error) {
        if (error == SpeechRecognizer.ERROR_CLIENT ||
            error == SpeechRecognizer.ERROR_SERVER ||
            error == SpeechRecognizer.ERROR_AUDIO) {
            return true;
        }

        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            error == SpeechRecognizer.ERROR_SERVER_DISCONNECTED;
    }

    private boolean tryNextRecognitionService() {
        int nextBackendIndex = activeBackendIndex + 1;

        if (nextBackendIndex >= getBackendCount()) {
            return false;
        }

        String recognizerId = activeRecognizerId;
        boolean fallbackLanguage = retriedWithFallbackLanguage;
        Log.w(TAG, "Retrying speech recognition with " + describeBackend(nextBackendIndex));
        beginListening(recognizerId, "en-US", fallbackLanguage, nextBackendIndex);
        return true;
    }

    @Override
    public void onResults(Bundle results) {
        String transcript = "";

        if (results != null &&
            results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) != null &&
            !results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION).isEmpty()) {
            transcript = results
                .getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                .get(0);
        }

        if (transcript.trim().isEmpty()) {
            transcript = lastTranscript;
        }

        if (activeRecognizerId != null) {
            Log.d(TAG, "Speech result transcript length=" + transcript.length() + " maxRms=" + maxRms);
            emitResult(activeRecognizerId, transcript, true);
        }

        stopCurrentRecognizer();
    }

    @Override
    public void onPartialResults(Bundle partialResults) {
        String transcript = "";

        if (partialResults != null &&
            partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) != null &&
            !partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION).isEmpty()) {
            transcript = partialResults
                .getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                .get(0);
        }

        if (!transcript.trim().isEmpty() && activeRecognizerId != null) {
            lastTranscript = transcript;
            emitResult(activeRecognizerId, transcript, false);
        }
    }

    @Override
    public void onEvent(int eventType, Bundle params) {}

    public void destroy() {
        stopCurrentRecognizer();
    }

    private void stopCurrentRecognizer() {
        if (speechRecognizer != null) {
            speechRecognizer.cancel();
            speechRecognizer.destroy();
            speechRecognizer = null;
        }

        activeRecognizerId = null;
        lastTranscript = "";
        activeLocaleTag = "en-US";
        retriedWithFallbackLanguage = false;
        activeBackendIndex = 0;
    }

    private void emitStart(String id) {
        String script = String.format(
            Locale.US,
            "window.__cuidadoSpeechOnStart(%s);",
            json(id)
        );
        webView.post(() -> webView.evaluateJavascript(script, null));
    }

    private void emitResult(String id, String transcript, boolean isFinal) {
        String script = String.format(
            Locale.US,
            "window.__cuidadoSpeechOnResult(%s, %s, %s);",
            json(id),
            json(transcript),
            isFinal ? "true" : "false"
        );
        webView.post(() -> webView.evaluateJavascript(script, null));
    }

    private void emitError(String id, String error) {
        String script = String.format(
            Locale.US,
            "window.__cuidadoSpeechOnError(%s, %s);",
            json(id),
            json(error)
        );
        webView.post(() -> webView.evaluateJavascript(script, null));
    }

    private String json(String value) {
        return JSONObject.quote(value == null ? "" : value);
    }
}
