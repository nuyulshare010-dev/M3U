package de.herber_edevelopment.m3uiptv;

import android.app.Activity;
import android.app.PictureInPictureParams;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;
import android.view.KeyEvent;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

public class MainActivity extends Activity {

    protected SafeWebView webView;
    protected String urlToLoad = "file:///android_asset/index.html";
    protected boolean isTvMode = false;

    public boolean isRemoteMode = false;
    public Integer permissionCounter = 0;
    public ValueCallback<Uri[]> filePathCallback;
    public StringBuilder fileReadBuffer;
    private M3UJsBridge jsBridge;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Deteksi TV
        try {
            android.app.UiModeManager uiMode = (android.app.UiModeManager) getSystemService(UI_MODE_SERVICE);
            if (uiMode != null && uiMode.getCurrentModeType() == android.content.res.Configuration.UI_MODE_TYPE_TELEVISION) {
                isTvMode = true;
                urlToLoad = "file:///android_asset/index-tv.html";
            }
        } catch (Exception ignored) {}

        requestWindowFeature(android.view.Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
                android.view.WindowManager.LayoutParams.FLAG_FULLSCREEN,
                android.view.WindowManager.LayoutParams.FLAG_FULLSCREEN);

        webView = new SafeWebView(this);
        setContentView(webView);
        initWebView();

        webView.loadUrl(urlToLoad);
    }

    private void initWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setAllowFileAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowContentAccess(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setUserAgentString("Mozilla/5.0 (m3u-ip.tv 3.0.13) Android");

        webView.setInitialScale(100);
        if (getResources().getDisplayMetrics().widthPixels < 1300) {
            webView.setInitialScale(70);
        }

        jsBridge = new M3UJsBridge(this);
        webView.addJavascriptInterface(jsBridge, "m3uConnector");

        webView.setWebViewClient(new android.webkit.WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                MainActivity.this.filePathCallback = filePathCallback;
                return false; // Biarkan aplikasi menangani sendiri lewat file explorer
            }
        });
    }

    // Bridge ke JavaScript
    public class M3UJsBridge {
        private final Activity activity;

        M3UJsBridge(Activity act) { this.activity = act; }

        @android.webkit.JavascriptInterface
        public void loadSuccess() {
            runOnUiThread(() -> {});
        }

        @android.webkit.JavascriptInterface
        public void closeApp() {
            runOnUiThread(() -> activity.finish());
        }

        @android.webkit.JavascriptInterface
        public void savePlaylist(String data) {
            getSharedPreferences("app", MODE_PRIVATE)
                .edit().putString("playlist", data).apply();
        }

        @android.webkit.JavascriptInterface
        public String loadPlaylist() {
            return getSharedPreferences("app", MODE_PRIVATE)
                .getString("playlist", "");
        }
    }

    // Method membaca file (dari smali K)
    public void readFileContent(String path) {
        fileReadBuffer = new StringBuilder();
        try (java.io.FileInputStream fis = new java.io.FileInputStream(path);
             java.io.InputStreamReader isr = new java.io.InputStreamReader(fis, java.nio.charset.StandardCharsets.UTF_8)) {
            char[] buf = new char[16384];
            int len;
            boolean skipBom = true;
            while ((len = isr.read(buf)) != -1) {
                if (skipBom && len > 0 && buf[0] == 0xFEFF) {
                    fileReadBuffer.append(buf, 1, len - 1);
                } else {
                    fileReadBuffer.append(buf, 0, len);
                }
                skipBom = false;
            }
        } catch (Exception e) {
            toast("Error reading file");
        }
    }

    // Method cek izin (dari smali s)
    public void checkStoragePermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (!android.os.Environment.isExternalStorageManager()) {
                toast("Please use files/ directory.");
            }
            return;
        }
        if (checkSelfPermission(android.Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED) {
            permissionCounter++;
        } else if (shouldShowRequestPermissionRationale(android.Manifest.permission.READ_EXTERNAL_STORAGE)) {
            toast("You need to allow file system access");
        }
        requestPermissions(new String[]{android.Manifest.permission.READ_EXTERNAL_STORAGE}, 0x66);
    }

    public void toast(String msg) {
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (grantResults.length == 0) return;
        if (requestCode == 0x66 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            permissionCounter++;
        }
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_DOWN) {
            String js = null;
            switch (event.getKeyCode()) {
                case KeyEvent.KEYCODE_BACK:   js = "doKey(999)"; break;
                case KeyEvent.KEYCODE_DPAD_UP:    js = "doKey(1011)"; break;
                case KeyEvent.KEYCODE_DPAD_DOWN:  js = "doKey(1012)"; break;
                case KeyEvent.KEYCODE_DPAD_LEFT:  js = "doKey(1013)"; break;
                case KeyEvent.KEYCODE_DPAD_RIGHT: js = "doKey(1014)"; break;
                case KeyEvent.KEYCODE_ENTER:
                case KeyEvent.KEYCODE_DPAD_CENTER: js = "doKey(1000)"; break;
                case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE: js = "doKey(1010)"; break;
            }
            if (js != null) {
                webView.evaluateJavascript(js, null);
                return true;
            }
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    public void onUserLeaveHint() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
                getPackageManager().hasSystemFeature("android.software.picture_in_picture")) {
            webView.evaluateJavascript("clearUi();", null);
            try {
                Rational ratio = new Rational(16, 9);
                PictureInPictureParams params = new PictureInPictureParams.Builder()
                        .setAspectRatio(ratio)
                        .build();
                enterPictureInPictureMode(params);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        super.onUserLeaveHint();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) webView.destroy();
        super.onDestroy();
    }
}