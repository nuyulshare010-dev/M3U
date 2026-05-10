package de.herber_edevelopment.m3uiptv;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

public class BootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Build.VERSION.SDK_INT >= 33) return;
        if (!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) return;

        SharedPreferences prefs = context.getSharedPreferences("settings", Context.MODE_PRIVATE);
        boolean autostart = prefs.getBoolean("autostart_enabled", false);
        if (autostart) {
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                try {
                    Intent launch = context.getPackageManager()
                            .getLaunchIntentForPackage(context.getPackageName());
                    if (launch != null) {
                        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(launch);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }, 3000);
        }
    }
}