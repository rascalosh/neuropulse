// lib/tts.ts — Google Cloud Text-to-Speech wrapper, with browser speechSynthesis fallback

const TTS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY;
const TTS_API_BASE = 'https://texttospeech.googleapis.com/v1/text:synthesize';

export type TtsLang = 'id-ID' | 'en-US';

// Neural2/Wavenet voices sound close to a real native speaker; Standard is the robotic fallback.
const VOICE_BY_LANG: Record<TtsLang, string> = {
  'id-ID': 'id-ID-Wavenet-A',
  'en-US': 'en-US-Neural2-C',
};

interface SynthesizeResult {
  audioContent: string; // base64 mp3
}

async function synthesizeSpeech(text: string, langCode: TtsLang): Promise<string> {
  if (!TTS_API_KEY) {
    throw new Error('NO_TTS_API_KEY — isi NEXT_PUBLIC_GOOGLE_TTS_API_KEY di apps/web/.env lalu restart dev server');
  }

  const response = await fetch(`${TTS_API_BASE}?key=${TTS_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: langCode, name: VOICE_BY_LANG[langCode] },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 0.98 },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error?.message || `Cloud TTS error: ${response.status}`);
  }

  const data: SynthesizeResult = await response.json();
  return data.audioContent;
}

export interface CloudSpeaker {
  isAvailable: boolean;
  speak: (text: string, langCode: TtsLang) => Promise<void>;
  stop: () => void;
}

// A sequential, stoppable Cloud-TTS player. Falls back to unavailable if no API key is set,
// so callers can detect that and use browser speechSynthesis instead.
export function createCloudSpeaker(): CloudSpeaker {
  let currentAudio: HTMLAudioElement | null = null;
  let stopped = false;

  return {
    isAvailable: !!TTS_API_KEY,

    async speak(text: string, langCode: TtsLang) {
      if (!TTS_API_KEY || stopped) return;
      const audioContent = await synthesizeSpeech(text, langCode);
      if (stopped) return;

      await new Promise<void>((resolve) => {
        const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
        currentAudio = audio;
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
    },

    stop() {
      stopped = true;
      currentAudio?.pause();
      currentAudio = null;
    },
  };
}
