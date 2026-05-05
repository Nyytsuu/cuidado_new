package com.cuidado.medihelp

import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.webkit.JavascriptInterface
import android.webkit.WebView
import org.json.JSONObject
import java.util.Locale

class AndroidSpeechBridge(
    private val activity: MainActivity,
    private val webView: WebView
) : RecognitionListener {
    private var speechRecognizer: SpeechRecognizer? = null
    private var activeRecognizerId: String? = null

    @JavascriptInterface
    fun start(id: String, language: String?) {
        activity.runOnUiThread {
            if (!activity.hasAudioPermission()) {
                activity.requestAudioPermission()
                emitError(id, "not-allowed")
                return@runOnUiThread
            }

            if (!SpeechRecognizer.isRecognitionAvailable(activity)) {
                emitError(id, "not-supported")
                return@runOnUiThread
            }

            stopCurrentRecognizer()

            activeRecognizerId = id
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(activity).apply {
                setRecognitionListener(this@AndroidSpeechBridge)
            }

            val localeTag = language?.takeIf { it.isNotBlank() } ?: "en-PH"
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(
                    RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                    RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
                )
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, localeTag)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, localeTag)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            }

            speechRecognizer?.startListening(intent)
        }
    }

    @JavascriptInterface
    fun stop(id: String) {
        activity.runOnUiThread {
            if (id == activeRecognizerId) {
                speechRecognizer?.stopListening()
            }
        }
    }

    @JavascriptInterface
    fun abort(id: String) {
        activity.runOnUiThread {
            if (id == activeRecognizerId) {
                stopCurrentRecognizer()
            }
        }
    }

    override fun onReadyForSpeech(params: Bundle?) = Unit

    override fun onBeginningOfSpeech() = Unit

    override fun onRmsChanged(rmsdB: Float) = Unit

    override fun onBufferReceived(buffer: ByteArray?) = Unit

    override fun onEndOfSpeech() = Unit

    override fun onError(error: Int) {
        val mappedError = when (error) {
            SpeechRecognizer.ERROR_NETWORK,
            SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "network"
            SpeechRecognizer.ERROR_NO_MATCH,
            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "no-speech"
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "not-allowed"
            else -> "speech-error"
        }

        activeRecognizerId?.let { emitError(it, mappedError) }
        stopCurrentRecognizer()
    }

    override fun onResults(results: Bundle?) {
        val transcript = results
            ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            ?.firstOrNull()
            .orEmpty()

        activeRecognizerId?.let { emitResult(it, transcript, true) }
        stopCurrentRecognizer()
    }

    override fun onPartialResults(partialResults: Bundle?) {
        val transcript = partialResults
            ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            ?.firstOrNull()
            .orEmpty()

        if (transcript.isNotBlank()) {
            activeRecognizerId?.let { emitResult(it, transcript, false) }
        }
    }

    override fun onEvent(eventType: Int, params: Bundle?) = Unit

    fun destroy() {
        stopCurrentRecognizer()
    }

    private fun stopCurrentRecognizer() {
        speechRecognizer?.cancel()
        speechRecognizer?.destroy()
        speechRecognizer = null
        activeRecognizerId = null
    }

    private fun emitResult(id: String, transcript: String, isFinal: Boolean) {
        val script =
            "window.__cuidadoSpeechOnResult(${json(id)}, ${json(transcript)}, $isFinal);"
        webView.post { webView.evaluateJavascript(script, null) }
    }

    private fun emitError(id: String, error: String) {
        val script = "window.__cuidadoSpeechOnError(${json(id)}, ${json(error)});"
        webView.post { webView.evaluateJavascript(script, null) }
    }

    private fun json(value: String): String = JSONObject.quote(value)
}
