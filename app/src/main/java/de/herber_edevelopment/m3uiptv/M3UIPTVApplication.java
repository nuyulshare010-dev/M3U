package de.herber_edevelopment.m3uiptv;

import android.app.Application;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;

import java.lang.ref.WeakReference;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class M3UIPTVApplication extends Application {

    public static ExecutorService executor;
    public static WeakReference<WebView> webViewRef;
    public static final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    public void onCreate() {
        super.onCreate();
        executor = Executors.newSingleThreadExecutor();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            String processName = getProcessName();
            String packageName = getPackageName();
            if (packageName != null && !packageName.equals(processName)) {
                WebView.setDataDirectorySuffix(processName);
            }
        }

        // Inisialisasi background (di aplikasi asli ada Lhg0)
        executor.submit(() -> {
            // Kosongkan untuk sekarang
            return null;
        });
    }

    @Override
    public void onTerminate() {
        super.onTerminate();
        if (executor != null && !executor.isShutdown()) {
            executor.shutdown();
        }
        if (webViewRef != null) {
            WebView wv = webViewRef.get();
            if (wv != null) wv.destroy();
            webViewRef.clear();
        }
    }
}