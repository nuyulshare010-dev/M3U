package de.herber_edevelopment.m3uiptv;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;

public class OverlayService extends Service {

    private WindowManager wm;
    private View overlay;

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    "boot_channel", "Overlay", NotificationManager.IMPORTANCE_LOW);
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
        Notification notif = new Notification.Builder(this, "boot_channel")
                .setContentTitle("Starting app")
                .setContentText("Please wait...")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .build();
        startForeground(1, notif);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
                !Settings.canDrawOverlays(this)) {
            stopSelf();
            return START_NOT_STICKY;
        }

        wm = (WindowManager) getSystemService(WINDOW_SERVICE);
        overlay = new View(this);
        overlay.setBackgroundColor(0);
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                1, 1,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ?
                        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY :
                        WindowManager.LayoutParams.TYPE_SYSTEM_ALERT,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                        WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
                android.graphics.PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.START;
        wm.addView(overlay, params);

        Intent launch = new Intent(this, MainActivity.class);
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(launch);

        if (overlay != null && wm != null) wm.removeView(overlay);
        stopSelf();
        return START_NOT_STICKY;
    }
}