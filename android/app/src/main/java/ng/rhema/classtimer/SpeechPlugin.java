package ng.rhema.classtimer;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.speech.tts.TextToSpeech;

import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * Android text-to-speech for the recording cues.
 *
 * "speak" talks immediately (used while the app is open, right after the bell
 * audio has finished). "schedule" sets an exact alarm so the same sentence is
 * spoken even when the app is in the background or the phone is locked and the
 * bell was delivered as a notification.
 */
@CapacitorPlugin(name = "Speech")
public class SpeechPlugin extends Plugin {

    private static final String PREFS = "rhema_speech";
    private static final String IDS_KEY = "alarm_ids";
    private static final String ACTION_SPEAK = "ng.rhema.classtimer.SPEAK";

    private TextToSpeech tts;
    private boolean ready = false;
    private String pendingText;
    private float pendingRate = 0.95f;
    private float pendingPitch = 1.0f;

    @Override
    public void load() {
        tts = new TextToSpeech(getContext(), status -> {
            if (status == TextToSpeech.SUCCESS) {
                int language = tts.setLanguage(Locale.US);
                ready =
                    language != TextToSpeech.LANG_MISSING_DATA &&
                    language != TextToSpeech.LANG_NOT_SUPPORTED;
                if (ready && pendingText != null) {
                    speakNow(pendingText, pendingRate, pendingPitch);
                    pendingText = null;
                }
            }
        });
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        if (text == null || text.trim().isEmpty()) {
            call.reject("Missing speech text");
            return;
        }
        float rate = call.getDouble("rate", 0.95).floatValue();
        float pitch = call.getDouble("pitch", 1.0).floatValue();

        if (ready) {
            speakNow(text, rate, pitch);
        } else {
            pendingText = text;
            pendingRate = rate;
            pendingPitch = pitch;
        }
        call.resolve();
    }

    private void speakNow(String text, float rate, float pitch) {
        tts.setSpeechRate(rate);
        tts.setPitch(pitch);
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "rhema-" + UUID.randomUUID());
    }

    @PluginMethod
    public void schedule(PluginCall call) {
        String text = call.getString("text", "");
        String id = call.getString("id", "");
        Double at = call.getDouble("at", 0.0);

        if (
            text == null ||
            text.trim().isEmpty() ||
            id == null ||
            id.isEmpty() ||
            at == null ||
            at <= 0
        ) {
            call.reject("Missing text, id or at");
            return;
        }

        Context context = getContext();
        PendingIntent pending = pendingIntent(context, id, text);
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        if (manager != null) {
            long triggerAt = at.longValue();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !manager.canScheduleExactAlarms()) {
                manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending);
            } else {
                manager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pending);
            }
        }

        rememberId(id, true);
        call.resolve();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        Context context = getContext();
        JSArray ids = call.getArray("ids");
        if (ids != null) {
            try {
                for (Object value : ids.toList()) {
                    cancelOne(context, String.valueOf(value));
                }
            } catch (Exception err) {
                call.reject("Invalid speech ids", err);
                return;
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void cancelAll(PluginCall call) {
        Context context = getContext();
        for (String id : readIds()) {
            cancelOne(context, id);
        }
        clearIds();
        call.resolve();
    }

    private PendingIntent pendingIntent(Context context, String id, String text) {
        Intent intent = new Intent(context, SpeechAlarmReceiver.class);
        intent.setAction(ACTION_SPEAK);
        intent.setData(Uri.parse("rhema-speech://" + id));
        if (text != null) intent.putExtra("text", text);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getBroadcast(context, id.hashCode(), intent, flags);
    }

    private void cancelOne(Context context, String id) {
        PendingIntent pending = pendingIntent(context, id, null);
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager != null) manager.cancel(pending);
        pending.cancel();
        rememberId(id, false);
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private Set<String> readIds() {
        return new HashSet<>(prefs().getStringSet(IDS_KEY, new HashSet<>()));
    }

    private void rememberId(String id, boolean add) {
        Set<String> ids = readIds();
        boolean changed = add ? ids.add(id) : ids.remove(id);
        if (changed) prefs().edit().putStringSet(IDS_KEY, ids).apply();
    }

    private void clearIds() {
        prefs().edit().remove(IDS_KEY).apply();
    }

    @Override
    protected void handleOnDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
        super.handleOnDestroy();
    }
}
