package com.quizspace.badawy;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Environment;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.security.MessageDigest;
import java.util.Locale;

@CapacitorPlugin(name = "QuizSpaceUpdate")
public class QuizSpaceUpdatePlugin extends Plugin {
    private static final String APK_MIME = "application/vnd.android.package-archive";

    @PluginMethod
    public void enqueue(PluginCall call) {
        String url = call.getString("url");
        String fileName = safeFileName(call.getString("fileName"));
        if (url == null || url.trim().isEmpty()) {
            call.reject("A download URL is required");
            return;
        }

        File target = apkFile(fileName);
        if (target.exists() && !target.delete()) {
            call.reject("The cached update file could not be replaced");
            return;
        }

        DownloadManager.Request request;
        try {
            request = new DownloadManager.Request(Uri.parse(url.trim()));
        } catch (IllegalArgumentException error) {
            call.reject("The update URL is invalid");
            return;
        }
        request.setTitle("QuizSpace update");
        request.setDescription("Downloading the latest QuizSpace app");
        request.setMimeType(APK_MIME);
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        request.setAllowedOverMetered(true);
        request.setAllowedOverRoaming(false);
        request.setDestinationUri(Uri.fromFile(target));

        long id = getDownloadManager().enqueue(request);
        JSObject result = new JSObject();
        result.put("downloadId", Long.toString(id));
        result.put("fileName", fileName);
        call.resolve(result);
    }

    @PluginMethod
    public void status(PluginCall call) {
        String idValue = call.getString("downloadId");
        if (idValue == null || idValue.trim().isEmpty()) {
            call.reject("A download ID is required");
            return;
        }

        long id;
        try {
            id = Long.parseLong(idValue);
        } catch (NumberFormatException error) {
            call.reject("The download ID is invalid");
            return;
        }

        DownloadManager.Query query = new DownloadManager.Query().setFilterById(id);
        try (Cursor cursor = getDownloadManager().query(query)) {
            if (cursor == null || !cursor.moveToFirst()) {
                JSObject missing = new JSObject();
                missing.put("state", "missing");
                missing.put("downloadId", idValue);
                call.resolve(missing);
                return;
            }

            int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
            long downloaded = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
            long total = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
            String state = stateFor(status);
            String localUri = cursor.getString(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_LOCAL_URI));

            JSObject result = new JSObject();
            result.put("state", state);
            result.put("downloadId", idValue);
            result.put("downloadedBytes", downloaded);
            result.put("totalBytes", total);
            result.put("progress", total > 0 ? Math.min(1.0, Math.max(0.0, (double) downloaded / (double) total)) : 0.0);
            result.put("localUri", localUri == null ? "" : localUri);
            if (status == DownloadManager.STATUS_FAILED) {
                result.put("reason", cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON)));
            }
            call.resolve(result);
        }
    }

    @PluginMethod
    public void sha256(PluginCall call) {
        String fileName = safeFileName(call.getString("fileName"));
        File target = apkFile(fileName);
        if (!target.isFile()) {
            call.reject("The cached update file is not ready");
            return;
        }
        try (InputStream input = new FileInputStream(target)) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[1024 * 128];
            int count;
            while ((count = input.read(buffer)) != -1) digest.update(buffer, 0, count);
            StringBuilder hex = new StringBuilder(64);
            for (byte value : digest.digest()) hex.append(String.format(Locale.ROOT, "%02x", value));
            JSObject result = new JSObject();
            result.put("sha256", hex.toString());
            result.put("fileName", fileName);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("The cached update file could not be verified");
        }
    }

    @PluginMethod
    public void openInstaller(PluginCall call) {
        String fileName = safeFileName(call.getString("fileName"));
        File target = apkFile(fileName);
        if (!target.isFile()) {
            call.reject("The cached update file is not ready");
            return;
        }
        try {
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", target);
            Intent intent = new Intent(Intent.ACTION_VIEW)
                .setDataAndType(uri, APK_MIME)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Android could not open the package installer");
        }
    }

    private DownloadManager getDownloadManager() {
        return (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
    }

    private File apkFile(String fileName) {
        File directory = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (directory == null) directory = getContext().getFilesDir();
        if (!directory.exists()) directory.mkdirs();
        return new File(directory, fileName);
    }

    private static String safeFileName(String value) {
        if (value == null || value.trim().isEmpty()) return "quizspace-update.apk";
        String clean = value.trim().replaceAll("[^A-Za-z0-9._-]", "_");
        return clean.endsWith(".apk") ? clean : clean + ".apk";
    }

    private static String stateFor(int status) {
        if (status == DownloadManager.STATUS_PENDING || status == DownloadManager.STATUS_PAUSED) return "pending";
        if (status == DownloadManager.STATUS_RUNNING) return "running";
        if (status == DownloadManager.STATUS_SUCCESSFUL) return "complete";
        if (status == DownloadManager.STATUS_FAILED) return "failed";
        return "unknown";
    }
}
