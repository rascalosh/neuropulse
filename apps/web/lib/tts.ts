// lib/tts.ts — Google Cloud Text-to-Speech wrapper, falls back to browser speechSynthesis at the call site.

const TTS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY;
const TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

const VOICE_BY_LANG: Record<'id-ID' | 'en-US', { languageCode: string; name: string }> = {
  'id-ID': { languageCode: 'id-ID', name: 'id-ID-Standard-A' },
  'en-US': { languageCode: 'en-US', name: 'en-US-Standard-C' },
};

export interface CloudSpeaker {
  isAvailable: boolean;
  speak: (text: string, lang: 'id-ID' | 'en-US') => Promise<void>;
  stop: () => void;
}

export function createCloudSpeaker(): CloudSpeaker {
  let currentAudio: HTMLAudioElement | null = null;

  const stop = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
      currentAudio = null;
    }
  };

  const speak = async (text: string, lang: 'id-ID' | 'en-US'): Promise<void> => {
    if (!TTS_API_KEY) throw new Error('NO_TTS_API_KEY');

    const voice = VOICE_BY_LANG[lang];
    const response = await fetch(`${TTS_ENDPOINT}?key=${TTS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice,
        audioConfig: { audioEncoding: 'MP3', speakingRate: 0.98 },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`TTS_API_ERROR ${response.status}: ${body.slice(0, 200)}`);
    }

    const data: { audioContent?: string } = await response.json();
    if (!data.audioContent) throw new Error('TTS_EMPTY_RESPONSE');

    return new Promise((resolve, reject) => {
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      currentAudio = audio;
      audio.onended = () => {
        if (currentAudio === audio) currentAudio = null;
        resolve();
      };
      audio.onerror = () => {
        if (currentAudio === audio) currentAudio = null;
        reject(new Error('TTS_PLAYBACK_ERROR'));
      };
      audio.play().catch(reject);
    });
  };

  return {
    isAvailable: Boolean(TTS_API_KEY),
    speak,
    stop,
  };
}
