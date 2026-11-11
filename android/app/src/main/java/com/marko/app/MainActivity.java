package com.marko.app;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.util.Log;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MarkoMainActivity";
    private String pendingFileJson = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        Uri data = intent.getData();

        if (Intent.ACTION_VIEW.equals(action) && data != null) {
            readFileFromUri(data);
        }
    }

    private void readFileFromUri(Uri uri) {
        try {
            String fileName = getFileName(uri);
            InputStream is = getContentResolver().openInputStream(uri);
            if (is == null) return;

            BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            reader.close();
            is.close();

            JSONObject json = new JSONObject();
            json.put("fileName", fileName);
            json.put("content", sb.toString());
            final String jsonString = json.toString();

            runOnUiThread(() -> dispatchFileToWeb(jsonString));
        } catch (Exception e) {
            Log.e(TAG, "Error reading file from intent uri: " + uri, e);
        }
    }

    private void dispatchFileToWeb(String jsonString) {
        WebView webView = (getBridge() != null) ? getBridge().getWebView() : null;
        if (webView != null) {
            String script = "(function() { " +
                "try { " +
                "    var data = " + jsonString + "; " +
                "    if (typeof window.handleAndroidOpenFile === 'function') { " +
                "        window.handleAndroidOpenFile(data); " +
                "    } else { " +
                "        window.__pendingAndroidFile = data; " +
                "    } " +
                "} catch (e) { console.error('Error dispatching file:', e); } " +
                "})();";
            webView.evaluateJavascript(script, null);
        } else {
            pendingFileJson = jsonString;
        }
    }

    private String getFileName(Uri uri) {
        String result = null;
        if ("content".equalsIgnoreCase(uri.getScheme())) {
            try (Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int colIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (colIndex != -1) {
                        result = cursor.getString(colIndex);
                    }
                }
            } catch (Exception ignored) {}
        }
        if (result == null || result.trim().isEmpty()) {
            String path = uri.getPath();
            if (path != null) {
                int cut = path.lastIndexOf('/');
                if (cut != -1) {
                    result = path.substring(cut + 1);
                }
            }
        }
        return (result != null && !result.trim().isEmpty()) ? result : "document.md";
    }

    @Override
    public void onResume() {
        super.onResume();
        if (pendingFileJson != null) {
            dispatchFileToWeb(pendingFileJson);
            pendingFileJson = null;
        }
    }
}
