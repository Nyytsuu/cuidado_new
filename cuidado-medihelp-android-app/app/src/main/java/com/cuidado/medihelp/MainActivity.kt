package com.cuidado.medihelp

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.net.http.SslError
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.webkit.PermissionRequest
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView

class MainActivity : Activity() {
    private lateinit var root: FrameLayout
    private lateinit var webView: WebView
    private lateinit var loading: ProgressBar
    private lateinit var errorView: LinearLayout
    private lateinit var speechBridge: AndroidSpeechBridge

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        root = FrameLayout(this)
        webView = WebView(this)
        loading = ProgressBar(this)
        errorView = createErrorView()

        root.addView(
            webView,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )

        root.addView(
            loading,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER
            )
        )

        root.addView(
            errorView,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )

        setContentView(root)

        configureWebView()
        requestAudioPermissionIfNeeded()
        webView.loadUrl(BuildConfig.WEB_APP_URL)
    }

    private fun configureWebView() {
        speechBridge = AndroidSpeechBridge(this, webView)

        WebView.setWebContentsDebuggingEnabled(true)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            allowFileAccess = true
            allowContentAccess = true
            loadsImagesAutomatically = true
            useWideViewPort = true
            loadWithOverviewMode = true
        }

        webView.addJavascriptInterface(speechBridge, "CuidadoAndroidSpeech")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
                loading.visibility = View.GONE
                errorView.visibility = View.GONE
                injectAppConfig()
                injectNativeSpeechPolyfill()
                super.onPageFinished(view, url)
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                if (request.isForMainFrame) {
                    loading.visibility = View.GONE
                    errorView.visibility = View.VISIBLE
                }
                super.onReceivedError(view, request, error)
            }

            override fun onReceivedSslError(
                view: WebView,
                handler: SslErrorHandler,
                error: SslError
            ) {
                handler.cancel()
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    request.grant(request.resources)
                }
            }
        }
    }

    private fun createErrorView(): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(48, 48, 48, 48)
            setBackgroundColor(0xFFF6FAFB.toInt())
            visibility = View.GONE

            val title = TextView(context).apply {
                text = getString(R.string.webview_unavailable_title)
                textSize = 22f
                setTextColor(0xFF102B44.toInt())
                gravity = Gravity.CENTER
            }

            val message = TextView(context).apply {
                text = getString(R.string.webview_unavailable_message)
                textSize = 15f
                setTextColor(0xFF64748B.toInt())
                gravity = Gravity.CENTER
                setPadding(0, 16, 0, 24)
            }

            val retry = Button(context).apply {
                text = "Try again"
                setOnClickListener {
                    visibility = View.GONE
                    loading.visibility = View.VISIBLE
                    webView.loadUrl(BuildConfig.WEB_APP_URL)
                }
            }

            addView(title)
            addView(message)
            addView(retry)
        }
    }

    private fun requestAudioPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
            checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), RECORD_AUDIO_REQUEST)
        }
    }

    fun hasAudioPermission(): Boolean {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
            checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
    }

    fun requestAudioPermission() {
        requestAudioPermissionIfNeeded()
    }

    private fun injectAppConfig() {
        val backendUrl = org.json.JSONObject.quote(BuildConfig.BACKEND_URL)
        webView.evaluateJavascript(
            "window.CUIDADO_BACKEND_URL = $backendUrl;",
            null
        )
    }

    private fun injectNativeSpeechPolyfill() {
        val script = """
            (function () {
              if (window.__cuidadoNativeSpeechReady) return;
              window.__cuidadoNativeSpeechReady = true;
              window.__cuidadoSpeechRecognizers = {};
              window.__cuidadoSpeechId = 0;

              function NativeSpeechRecognition() {
                this.lang = 'en-PH';
                this.continuous = false;
                this.interimResults = true;
                this.onstart = null;
                this.onresult = null;
                this.onerror = null;
                this.onend = null;
                this.__id = String(++window.__cuidadoSpeechId);
                window.__cuidadoSpeechRecognizers[this.__id] = this;
              }

              NativeSpeechRecognition.prototype.start = function () {
                if (typeof this.onstart === 'function') this.onstart(new Event('start'));
                window.CuidadoAndroidSpeech.start(this.__id, this.lang || 'en-PH');
              };

              NativeSpeechRecognition.prototype.stop = function () {
                window.CuidadoAndroidSpeech.stop(this.__id);
              };

              NativeSpeechRecognition.prototype.abort = function () {
                window.CuidadoAndroidSpeech.abort(this.__id);
              };

              window.__cuidadoSpeechOnResult = function (id, transcript, isFinal) {
                var recognizer = window.__cuidadoSpeechRecognizers[id];
                if (!recognizer || typeof recognizer.onresult !== 'function') return;
                var item = { 0: { transcript: transcript }, length: 1, isFinal: !!isFinal };
                var event = { results: { 0: item, length: 1 } };
                recognizer.onresult(event);
                if (isFinal && typeof recognizer.onend === 'function') {
                  recognizer.onend(new Event('end'));
                }
              };

              window.__cuidadoSpeechOnError = function (id, error) {
                var recognizer = window.__cuidadoSpeechRecognizers[id];
                if (!recognizer) return;
                if (typeof recognizer.onerror === 'function') {
                  recognizer.onerror({ error: error || 'speech-error' });
                }
                if (typeof recognizer.onend === 'function') {
                  recognizer.onend(new Event('end'));
                }
              };

              if (!window.SpeechRecognition) window.SpeechRecognition = NativeSpeechRecognition;
              if (!window.webkitSpeechRecognition) window.webkitSpeechRecognition = NativeSpeechRecognition;
            })();
        """.trimIndent()

        webView.evaluateJavascript(script, null)
    }

    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        if (::speechBridge.isInitialized) {
            speechBridge.destroy()
        }
        if (::webView.isInitialized) {
            webView.destroy()
        }
        super.onDestroy()
    }

    companion object {
        private const val RECORD_AUDIO_REQUEST = 1001
    }
}
