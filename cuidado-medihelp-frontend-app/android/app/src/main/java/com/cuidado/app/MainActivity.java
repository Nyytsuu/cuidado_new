package com.cuidado.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    private static final int RECORD_AUDIO_REQUEST = 1001;
    private AndroidSpeechBridge speechBridge;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        bridgeBuilder.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView webView) {
                injectNativeSpeechPolyfill(webView);
            }
        });

        super.onCreate(savedInstanceState);

        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }

        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        settings.setMediaPlaybackRequiresUserGesture(false);

        speechBridge = new AndroidSpeechBridge(this, webView);
        webView.addJavascriptInterface(speechBridge, "CuidadoAndroidSpeech");

        requestAudioPermissionIfNeeded();
        injectNativeSpeechPolyfill(webView);
    }

    public boolean hasAudioPermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
            checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }

    public void requestAudioPermission() {
        requestAudioPermissionIfNeeded();
    }

    private void requestAudioPermissionIfNeeded() {
        if (!hasAudioPermission()) {
            requestPermissions(new String[] { Manifest.permission.RECORD_AUDIO }, RECORD_AUDIO_REQUEST);
        }
    }

    private void injectNativeSpeechPolyfill(WebView webView) {
        if (webView == null) {
            return;
        }

        webView.evaluateJavascript(NATIVE_SPEECH_POLYFILL, null);
    }

    @Override
    public void onDestroy() {
        if (speechBridge != null) {
            speechBridge.destroy();
        }

        super.onDestroy();
    }

    private static final String NATIVE_SPEECH_POLYFILL =
        "(function () {" +
        "  if (!window.CuidadoAndroidSpeech || window.__cuidadoNativeSpeechReady) return;" +
        "  window.__cuidadoNativeSpeechReady = true;" +
        "  window.__cuidadoSpeechRecognizers = {};" +
        "  window.__cuidadoSpeechId = 0;" +
        "  function NativeSpeechRecognition() {" +
        "    this.lang = 'en-US';" +
        "    this.continuous = false;" +
        "    this.interimResults = true;" +
        "    this.onstart = null;" +
        "    this.onresult = null;" +
        "    this.onerror = null;" +
        "    this.onend = null;" +
        "    this.__id = String(++window.__cuidadoSpeechId);" +
        "    window.__cuidadoSpeechRecognizers[this.__id] = this;" +
        "  }" +
        "  NativeSpeechRecognition.prototype.start = function () {" +
        "    window.CuidadoAndroidSpeech.start(this.__id, this.lang || 'en-US');" +
        "  };" +
        "  NativeSpeechRecognition.prototype.stop = function () {" +
        "    window.CuidadoAndroidSpeech.stop(this.__id);" +
        "  };" +
        "  NativeSpeechRecognition.prototype.abort = function () {" +
        "    window.CuidadoAndroidSpeech.abort(this.__id);" +
        "  };" +
        "  window.__cuidadoSpeechOnStart = function (id) {" +
        "    var recognizer = window.__cuidadoSpeechRecognizers[id];" +
        "    if (!recognizer || typeof recognizer.onstart !== 'function') return;" +
        "    recognizer.onstart(new Event('start'));" +
        "  };" +
        "  window.__cuidadoSpeechOnResult = function (id, transcript, isFinal) {" +
        "    var recognizer = window.__cuidadoSpeechRecognizers[id];" +
        "    if (!recognizer || typeof recognizer.onresult !== 'function') return;" +
        "    var item = { 0: { transcript: transcript || '' }, length: 1, isFinal: !!isFinal };" +
        "    var event = { results: { 0: item, length: 1 } };" +
        "    recognizer.onresult(event);" +
        "    if (isFinal && typeof recognizer.onend === 'function') recognizer.onend(new Event('end'));" +
        "  };" +
        "  window.__cuidadoSpeechOnError = function (id, error) {" +
        "    var recognizer = window.__cuidadoSpeechRecognizers[id];" +
        "    if (!recognizer) return;" +
        "    if (typeof recognizer.onerror === 'function') recognizer.onerror({ error: error || 'speech-error' });" +
        "    if (typeof recognizer.onend === 'function') recognizer.onend(new Event('end'));" +
        "  };" +
        "  window.SpeechRecognition = NativeSpeechRecognition;" +
        "  window.webkitSpeechRecognition = NativeSpeechRecognition;" +
        "})();";
}
