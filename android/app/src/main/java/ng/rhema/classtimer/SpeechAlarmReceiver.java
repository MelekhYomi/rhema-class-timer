package ng.rhema.classtimer;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

import java.util.Locale;

/** Speaks a scheduled recording cue even if the app is not running. */
public class SpeechAlarmReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        final String text = intent.getStringExtra("text");
        if (text == null || text.trim().isEmpty()) return;

        final PendingResult pending = goAsync();
        final TextToSpeech[] holder = new TextToSpeech[1];

        holder[0] = new TextToSpeech(context.getApplicationContext(), status -> {
            final TextToSpeech engine = holder[0];
            if (status != TextToSpeech.SUCCESS || engine == null) {
                if (engine != null) engine.shutdown();
                pending.finish();
                return;
            }

            int language = engine.setLanguage(Locale.US);
            if (
                language == TextToSpeech.LANG_MISSING_DATA ||
                language == TextToSpeech.LANG_NOT_SUPPORTED
            ) {
                engine.shutdown();
                pending.finish();
                return;
            }

            engine.setOnUtteranceProgressListener(
                new UtteranceProgressListener() {
                    @Override
                    public void onStart(String utteranceId) {}

                    @Override
                    public void onDone(String utteranceId) {
                        engine.shutdown();
                        pending.finish();
                    }

                    @Override
                    public void onError(String utteranceId) {
                        engine.shutdown();
                        pending.finish();
                    }
                }
            );

            engine.setSpeechRate(0.95f);
            engine.setPitch(1.0f);
            engine.speak(
                text,
                TextToSpeech.QUEUE_FLUSH,
                null,
                "rhema-alarm-" + System.currentTimeMillis()
            );
        });
    }
}
