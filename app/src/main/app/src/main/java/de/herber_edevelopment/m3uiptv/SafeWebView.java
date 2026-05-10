package de.herber_edevelopment.m3uiptv;

import android.content.Context;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.view.PointerIcon;
import android.webkit.WebView;

public class SafeWebView extends WebView {

    public SafeWebView(Context context) {
        super(context);
    }

    public SafeWebView(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    @Override
    public PointerIcon onResolvePointerIcon(MotionEvent event, int pointerIndex) {
        try {
            return super.onResolvePointerIcon(event, pointerIndex);
        } catch (NullPointerException e) {
            return null;
        }
    }
}