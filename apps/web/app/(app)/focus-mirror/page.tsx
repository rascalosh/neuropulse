'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useStorage } from '../../../hooks/useStorage';
import { useLang } from '../../../contexts/providers';
import { translations } from '../../../lib/i18n';
import { IconEye, IconCamera } from '../../../components/Icons';
import Mascot, { MascotHandle, MascotMood } from './Mascot';
import styles from './focusmirror.module.css';

// Indeks landmark Mediapipe
const LEFT_EYE = [362, 385, 387, 263, 373, 380] as const;
const RIGHT_EYE = [33, 160, 158, 133, 153, 144] as const;
const NOSE_TIP = 1;
const LEFT_FACE_EDGE = 234;
const RIGHT_FACE_EDGE = 454;
// Titik tengah iris (tersedia otomatis dari FaceLandmarker, 478 landmark total)
const RIGHT_IRIS = 468;
const LEFT_IRIS = 473;

// ====== Parameter yang gampang diubah-ubah saat demo/testing ======
// Alarm baru bunyi kalau ngantuk/tidak fokus BERTURUT-TURUT selama ini.
// Lagi di-set 10 detik buat gampang testing — balikin ke 45000 kalau udah selesai tes.
const DISTRACTION_ALERT_THRESHOLD_MS = 10000;
// Setelah alarm bunyi, gak akan bunyi lagi dalam rentang ini walau masih distraksi
// (biar gak nge-spam / berasa nge-nagging).
const ALERT_COOLDOWN_MS = 10000;
// Reward dikasih tiap kelipatan durasi fokus berturut-turut ini tercapai.
const FOCUS_REWARD_INTERVAL_MS = 5 * 60 * 1000; // 5 menit
// Kalau tab disembunyikan/pindah selama ini padahal sesi fokus jalan, kirim notifikasi OS.
// Lebih pendek dari threshold distraksi biasa karena pindah tab = niat eksplisit ninggalin.
const TAB_HIDDEN_NOTIFY_THRESHOLD_MS = 2000;
// Jeda antar notifikasi "Kelip nungguin kamu" selama tab masih disembunyikan
// (dipisah dari ALERT_COOLDOWN_MS biar gak keseringan nge-notif tiap 30 detik).
const TAB_SWITCH_NOTIFY_COOLDOWN_MS = 5 * 60 * 1000; // 5 menit

export default function FocusMirrorPage() {
  const [store, updateStore] = useStorage();
  const { lang } = useLang();
  const tr = translations[lang];

  const cameraOn = store.settings.cameraAccess;
  const videoRef = useRef<HTMLVideoElement>(null);
  const mascotRef = useRef<MascotHandle>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sessionStartTimeRef = useRef<number>(Date.now());

  const [status, setStatus] = useState(lang === 'id' ? 'Memuat Model...' : 'Loading Model...');
  const [ear, setEar] = useState<number>(0.3);
  const [blinkCount, setBlinkCount] = useState<number>(0);
  const [isFocusing, setIsFocusing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // Timer 25 Menit (dalam detik)
  const [yawDebug, setYawDebug] = useState<number>(0); // buat kalibrasi threshold saat demo
  const [gazeDebug, setGazeDebug] = useState<number>(0); // buat kalibrasi threshold saat demo

  // Statistik buat laporan & UI reward
  const [drowsyAlerts, setDrowsyAlerts] = useState(0);
  const [distractAlerts, setDistractAlerts] = useState(0);
  const [tabSwitchAlerts, setTabSwitchAlerts] = useState(0);
  const [rewardCount, setRewardCount] = useState(0);
  const [totalDistractedMs, setTotalDistractedMs] = useState(0);
  const [longestFocusMs, setLongestFocusMs] = useState(0);
  const [showReward, setShowReward] = useState(false);

  // ==== Kelip si maskot ====
  const [showMascot, setShowMascot] = useState(false);
  const mascotTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [mascotMessage, setMascotMessage] = useState<string | null>(null);

  const triggerMascotPopup = useCallback((message: string) => {
    setMascotMessage(message);
    setShowMascot(true);

    if (mascotTimeoutRef.current) clearTimeout(mascotTimeoutRef.current);
    mascotTimeoutRef.current = setTimeout(() => {
      setShowMascot(false);
    }, 10000);
    // Notifikasi OS dilepas — bubble di maskot PiP udah nutupin kasus "tab tersembunyi",
    // jadi toast notifikasi cuma dobel & ganggu.
  }, []);

  const mascotMood: MascotMood = showReward
    ? 'reward'
    : status.includes('Mengantuk') || status.includes('Drowsy')
    ? 'drowsy'
    : status.includes('Tidak Fokus') || status.includes('Looking Away')
    ? 'away'
    : isFocusing
    ? 'focus'
    : 'idle';

  // Ref ini yang bikin toggle tombol gak perlu restart kamera/model AI.
  // isFocusing (state) cuma dipakai buat re-render UI tombol; predictLoop baca dari ref ini.
  const isFocusingRef = useRef(isFocusing);
  useEffect(() => {
    isFocusingRef.current = isFocusing;
  }, [isFocusing]);

  // Format timer/durasi MM:SS (menerima detik)
  const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.round(seconds));
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
  };

  const ensureAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, []);

  // Notifikasi lembut buat ngantuk/tidak fokus: nada sine turun (bukan square/beep tajam),
  // volume rendah, attack & fade pelan -> berasa "diingetin", bukan alarm mengagetkan.
  const playGentleAlert = useCallback(() => {
    const ctx = ensureAudioCtx();
    const now = ctx.currentTime;
    const notes = [392.0, 329.63]; // G4 -> E4, turun pelan, kesan menenangkan
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.3;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.1, t + 0.1); // attack pelan
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55); // fade lembut
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  }, [ensureAudioCtx]);

  // Chime reward saat berhasil fokus lama: nada sine naik (C5-E5-G5), ceria tapi tetap lembut.
  const playRewardChime = useCallback(() => {
    const ctx = ensureAudioCtx();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.12;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.09, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  }, [ensureAudioCtx]);

  // Helper Jarak 3D
  const distance = (p1: any, p2: any) => {
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2)
    );
  };

  const calculateEAR = (eyeLandmarks: any[]) => {
    const v1 = distance(eyeLandmarks[1], eyeLandmarks[5]);
    const v2 = distance(eyeLandmarks[2], eyeLandmarks[4]);
    const h = distance(eyeLandmarks[0], eyeLandmarks[3]);
    return (v1 + v2) / (2.0 * h);
  };

  // Rasio posisi iris di dalam kotak mata (pakai koordinat gambar apa adanya,
  // jadi kedua mata konsisten arahnya): 0 = iris nempel di sisi kiri gambar,
  // 1 = nempel di sisi kanan gambar, 0.5 = di tengah (lurus menghadap kamera)
  const getGazeRatio = (iris: any, cornerA: any, cornerB: any) => {
    const xMin = Math.min(cornerA.x, cornerB.x);
    const xMax = Math.max(cornerA.x, cornerB.x);
    if (xMax - xMin === 0) return 0.5;
    return (iris.x - xMin) / (xMax - xMin);
  };

  // Putar titik 2D mengelilingi titik pusat sejauh `angle` radian
  const rotatePoint = (p: { x: number; y: number }, center: { x: number; y: number }, angle: number) => {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos,
    };
  };

  // Bikin & unduh laporan sesi sebagai file teks
  const downloadReport = useCallback(() => {
    const now = new Date();
    const timeUsedSec = 25 * 60 - timeLeft;
    const lines = [
      'Laporan Sesi FocusMirror',
      `Dibuat: ${now.toLocaleString('id-ID')}`,
      '',
      `Waktu sesi terpakai: ${formatTime(timeUsedSec)} dari 25:00`,
      `Total kedipan: ${blinkCount}`,
      '',
      'Ringkasan gangguan fokus:',
      `- Peringatan mengantuk (>=${Math.round(DISTRACTION_ALERT_THRESHOLD_MS / 1000)} detik): ${drowsyAlerts}x`,
      `- Peringatan tidak fokus/menoleh (>=${Math.round(DISTRACTION_ALERT_THRESHOLD_MS / 1000)} detik): ${distractAlerts}x`,
      `- Peringatan pindah/tinggalkan tab (>=${Math.round(TAB_HIDDEN_NOTIFY_THRESHOLD_MS / 1000)} detik): ${tabSwitchAlerts}x`,
      `- Total waktu tidak fokus: ${formatTime(totalDistractedMs / 1000)}`,
      '',
      'Ringkasan pencapaian fokus:',
      `- Streak fokus terpanjang: ${formatTime(longestFocusMs / 1000)}`,
      `- Reward tercapai (tiap ${FOCUS_REWARD_INTERVAL_MS / 60000} menit fokus berturut-turut): ${rewardCount}x`,
      '',
      'Dibuat otomatis oleh FocusMirror.',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focusmirror-report-${now.toISOString().slice(0, 19).replace(/[:T]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [timeLeft, blinkCount, drowsyAlerts, distractAlerts, tabSwitchAlerts, totalDistractedMs, longestFocusMs, rewardCount]);

  // Timer Effect
  useEffect(() => {
    if (!isFocusing || timeLeft <= 0) return;
    const timerId = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timerId);
  }, [isFocusing, timeLeft]);

  // ========================================================
  // Effect terpisah: pantau pindah-tab/minimize walau kamera mati / komponen AI belum siap.
  // Ini yang bikin Kelip tetap bisa "manggil" user via OS Notification walau tab lagi
  // gak keliatan sama sekali (requestAnimationFrame di predictLoop kepause pas tab hidden,
  // jadi deteksi ini sengaja gak numpang di situ, pakai setInterval sendiri).
  // ========================================================
  useEffect(() => {
    let hiddenSince: number | null = null;
    let lastNotifyTime = 0;

    function handleVisibilityChange() {
      hiddenSince = document.hidden ? Date.now() : null;
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = setInterval(() => {
      if (!isFocusingRef.current || !document.hidden || hiddenSince === null) return;
      const elapsed = Date.now() - hiddenSince;
      const cooldownPassed = Date.now() - lastNotifyTime > TAB_SWITCH_NOTIFY_COOLDOWN_MS;
      if (elapsed >= TAB_HIDDEN_NOTIFY_THRESHOLD_MS && cooldownPassed) {
        lastNotifyTime = Date.now();
        setTabSwitchAlerts(prev => prev + 1);
        triggerMascotPopup(
          lang === 'id'
            ? 'Sesi fokusmu masih jalan. Balik ke tab ini yuk 👀'
            : 'Your focus session is still running. Come back to this tab 👀'
        );
      }
    }, 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [lang, triggerMascotPopup]);

  // AI & Webcam Effect
  useEffect(() => {
    if (!cameraOn) return;

    // Mediapipe/TFLite WASM ngirim log INFO & WARNING lewat console.error (bukan console.log),
    // jadi tanpa filter ini overlay error Next.js dev bakal salah nangkep log yang sebenarnya aman.
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const msg = String(args[0] ?? '');
      if (/^(INFO|WARNING):/.test(msg)) return;
      originalConsoleError(...args);
    };

    let vision: any;
    let faceLandmarker: any;
    let animationFrameId: number;
    let stream: MediaStream;
    let isClosed = false;

    // Variabel eskalasi (di-scope ke effect ini, persist antar frame lewat closure,
    // tapi TIDAK bikin efek restart karena bukan React state/deps)
    let distractStartTime: number | null = null; // kapan episode distraksi mulai
    let focusStartTime: number | null = null; // kapan streak fokus saat ini mulai
    let lastSoftAlarmTime = 0; // kapan terakhir kali alarm lembut bunyi
    let rewardMilestone = 0; // sudah dapat reward ke berapa di streak fokus ini

    async function initMediapipe() {
      try {
        const { FilesetResolver, FaceLandmarker } = await import('@mediapipe/tasks-vision');
        vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numFaces: 1
        });
        setStatus(lang === 'id' ? 'Siap!' : 'Ready!');
        startCamera();
      } catch (error) {
        console.error("Gagal memuat AI:", error);
        setStatus("Error AI");
      }
    }

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, frameRate: { ideal: 30 } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', predictLoop);
        }
      } catch (err) {
        setStatus("Kamera Ditolak");
      }
    }

    let lastVideoTime = -1;
    let lastTimestamp = -1;
    let isProcessing = false; // Gembok untuk mencegah AI crash

    // ========================================================
    // FUNGSI UTAMA AI (Looping setiap frame video)
    // ========================================================
    function predictLoop() {
      // 1. Pengecekan Keamanan: Pastikan elemen video & model AI sudah siap
      if (!videoRef.current || !faceLandmarker) return;

      // Jika video masih blank (belum ada frame), tunggu frame berikutnya
      if (videoRef.current.readyState < 2) {
        animationFrameId = requestAnimationFrame(predictLoop);
        return;
      }

      let startTimeMs = performance.now();

      // 2. Anti-Crash System (Strictly Increasing Timestamp & Lock)
      // Jika AI masih sibuk ATAU waktu mundur/sama, lewati frame ini
      if (isProcessing || startTimeMs <= lastTimestamp) {
        animationFrameId = requestAnimationFrame(predictLoop);
        return;
      }

      // 3. Hanya proses jika ada frame gambar BARU dari webcam
      if (videoRef.current.currentTime !== lastVideoTime) {
        isProcessing = true; // Kunci gembok
        lastVideoTime = videoRef.current.currentTime;
        lastTimestamp = startTimeMs;

        try {
          const results = faceLandmarker.detectForVideo(videoRef.current, startTimeMs);

          if (results.faceLandmarks && results.faceLandmarks.length > 0) {
            const lm = results.faceLandmarks[0];

            // --- A. Hitung Ngantuk (Eye Aspect Ratio) ---
            const leftEar = calculateEAR(LEFT_EYE.map(i => lm[i]));
            const rightEar = calculateEAR(RIGHT_EYE.map(i => lm[i]));
            const avgEAR = (leftEar + rightEar) / 2;
            setEar(avgEAR);

            // --- B. Hitung Arah Hadap Wajah (Yaw) TANPA terpengaruh Kemiringan (Roll) ---
            const leftEdge = lm[LEFT_FACE_EDGE];
            const rightEdge = lm[RIGHT_FACE_EDGE];
            const nose = lm[NOSE_TIP];

            const faceCenter = {
              x: (leftEdge.x + rightEdge.x) / 2,
              y: (leftEdge.y + rightEdge.y) / 2,
            };
            const rollAngle = Math.atan2(rightEdge.y - leftEdge.y, rightEdge.x - leftEdge.x);

            const rotatedNose = rotatePoint(nose, faceCenter, -rollAngle);
            const rotatedLeft = rotatePoint(leftEdge, faceCenter, -rollAngle);
            const rotatedRight = rotatePoint(rightEdge, faceCenter, -rollAngle);

            const faceHalfWidth = (rotatedRight.x - rotatedLeft.x) / 2;
            const noseOffset = faceHalfWidth !== 0 ? (rotatedNose.x - faceCenter.x) / faceHalfWidth : 0;
            setYawDebug(noseOffset);

            // --- B2. Hitung Arah Lirikan Mata (Gaze) ---
            const rightGaze = getGazeRatio(lm[RIGHT_IRIS], lm[RIGHT_EYE[0]], lm[RIGHT_EYE[3]]);
            const leftGaze = getGazeRatio(lm[LEFT_IRIS], lm[LEFT_EYE[0]], lm[LEFT_EYE[3]]);
            const avgGaze = (rightGaze + leftGaze) / 2;
            const gazeOffset = avgGaze - 0.5;
            setGazeDebug(gazeOffset);

            // --- C. Logika Penentuan Status ---
            let currentState = lang === 'id' ? 'Fokus' : 'Focused';
            let isDistracted = false;
            let distractionType: 'drowsy' | 'away' | null = null;

            if (avgEAR < 0.22) {
              currentState = lang === 'id' ? 'Mengantuk!' : 'Drowsy!';
              isDistracted = true;
              distractionType = 'drowsy';
              if (!isClosed) isClosed = true;
            } else {
              if (isClosed) {
                setBlinkCount(prev => prev + 1);
                isClosed = false;
              }

              const isHeadTurned = Math.abs(noseOffset) > 0.28;
              const isEyeLookingAway = Math.abs(gazeOffset) > 0.18;

              if (isHeadTurned || isEyeLookingAway) {
                currentState = lang === 'id' ? 'Tidak Fokus Layar!' : 'Looking Away!';
                isDistracted = true;
                distractionType = 'away';
              }
            }

            setStatus(currentState);

            // --- D. Eskalasi: alarm lembut cuma setelah distraksi bertahan lama,
            //        + reward pas berhasil fokus lama. Semua cuma jalan saat sesi aktif. ---
            if (isFocusingRef.current) {
              if (isDistracted) {
                if (distractStartTime === null) {
                  distractStartTime = startTimeMs;
                }
                // Streak fokus keputus di sini: simpan kalau ini yang terpanjang
                if (focusStartTime !== null) {
                  const focusDuration = startTimeMs - focusStartTime;
                  setLongestFocusMs(prev => Math.max(prev, focusDuration));
                  focusStartTime = null;
                  rewardMilestone = 0;
                }

                const distractedDuration = startTimeMs - distractStartTime;
                const cooldownPassed = startTimeMs - lastSoftAlarmTime > ALERT_COOLDOWN_MS;

                if (distractedDuration >= DISTRACTION_ALERT_THRESHOLD_MS && cooldownPassed) {
                  playGentleAlert();
                  lastSoftAlarmTime = startTimeMs;
                  if (distractionType === 'drowsy') {
                    setDrowsyAlerts(prev => prev + 1);
                    triggerMascotPopup(lang === 'id' ? 'Mata udah berat ya? Istirahat bentar, gpp kok 😴' : 'Eyes getting heavy? A short break is okay 😴');
                  } else {
                    setDistractAlerts(prev => prev + 1);
                    triggerMascotPopup(lang === 'id' ? 'Balik sini yuk, kamu pasti bisa fokus lagi! 👀' : 'Come back — you can refocus, I got you! 👀');
                  }
                }
              } else {
                // Kembali fokus: tutup episode distraksi, catat totalnya
                if (distractStartTime !== null) {
                  const distractedDuration = startTimeMs - distractStartTime;
                  setTotalDistractedMs(prev => prev + distractedDuration);
                  distractStartTime = null;
                  lastSoftAlarmTime = 0;
                }
                if (focusStartTime === null) {
                  focusStartTime = startTimeMs;
                }
                const focusDuration = startTimeMs - focusStartTime;
                const nextMilestone = (rewardMilestone + 1) * FOCUS_REWARD_INTERVAL_MS;
                if (focusDuration >= nextMilestone) {
                  rewardMilestone += 1;
                  setRewardCount(prev => prev + 1);
                  playRewardChime();
                  setShowReward(true);
                  triggerMascotPopup(lang === 'id' ? 'Mantap! Streak fokus baru nih 🎉' : 'Nice! New focus streak 🎉');
                  setTimeout(() => setShowReward(false), 4000);
                }
              }
            }

          } else {
            setStatus(lang === 'id' ? 'Wajah Tidak Terlihat' : 'Face Missing');
          }
        } catch (error) {
          console.warn("Frame dilewati karena error AI:", error);
        } finally {
          isProcessing = false;
        }
      }

      animationFrameId = requestAnimationFrame(predictLoop);
    }

    initMediapipe();

    return () => {
      console.error = originalConsoleError;
      cancelAnimationFrame(animationFrameId);
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (faceLandmarker) faceLandmarker.close();
    };
  }, [cameraOn, lang, playGentleAlert, playRewardChime]);

  return (
    <div className={styles.page}>
      <div className="container-md">

        {/* Header & Tombol Mulai Sesi */}
        <div className={styles.header}>
          <h1 className="text-2xl font-extrabold" style={{marginBottom: '5px'}}>{tr.focusmirror.title}</h1>
          <p className="text-sub mt-2" style={{marginBottom: '5px'}}>
            Timer: <span className="font-mono font-bold text-lg text-blue-600">{formatTime(timeLeft)}</span>
          </p>
          <div className="flex gap-3 justify-center mt-4">
            <button
              className="btn btn-secondary"
              onClick={() => {
                updateStore((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    cameraAccess: !cameraOn
                  }
                }));
              }}
            >
              {cameraOn 
                ? (lang === 'id' ? 'Matikan Kamera' : 'Turn Off Camera') 
                : (lang === 'id' ? 'Aktifkan Kamera' : 'Turn On Camera')}
            </button>
            <button
              className="btn btn-secondary"
              onClick={downloadReport}
            >
              Unduh Laporan
            </button>
            <button
              className={`btn ${isFocusing ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => {
                if (!isFocusing) mascotRef.current?.openPip();
                setIsFocusing(!isFocusing);
              }}
              disabled={timeLeft === 0}
            >
              {isFocusing ? 'Jeda Sesi' : 'Mulai Sesi Fokus'}
            </button>
          </div>
        </div>

        {showReward && (
          <div style={{
            marginTop: 32, marginBottom: 16, borderRadius: 'var(--radius-lg)', border: '1px solid #A7F3D0',
            background: '#ECFDF5', padding: '12px 20px', textAlign: 'center',
            fontSize: 13.5, fontWeight: 700, color: '#047857',
          }}>
            Fokus mantap! Kamu baru saja mencapai streak fokus baru.
          </div>
        )}

        {!cameraOn ? (
          <div className="card" style={{ marginTop: 32, marginBottom: 32, textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '48px' }}>📸</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
              {lang === 'id' ? 'Kamera Belum Aktif' : 'Camera is Inactive'}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--color-text-sub)', maxWidth: '320px', margin: '0 auto 12px', lineHeight: 1.5 }}>
              {lang === 'id' 
                ? 'Aktifkan kamera untuk memantau fokus Anda secara real-time dengan teknologi AI.' 
                : 'Enable camera to monitor your focus in real-time using AI technology.'}
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                updateStore((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    cameraAccess: true
                  }
                }));
              }}
            >
              {lang === 'id' ? 'Aktifkan Kamera' : 'Enable Camera'}
            </button>
          </div>
        ) : (
          <div style={{
            marginTop: 32, marginBottom: 32, overflow: 'hidden', borderRadius: 'var(--radius-xl)',
            background: '#fff', aspectRatio: '16 / 9', position: 'relative',
            border: '1px solid var(--color-border)',
          }}>
            <video
              ref={videoRef}
              autoPlay playsInline muted
              style={{ transform: 'scaleX(-1)', width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute', top: 16, right: 16, fontSize: 13.5, fontWeight: 700,
              padding: '4px 12px', borderRadius: 'var(--radius-md)', backdropFilter: 'blur(6px)',
              color: 'white', background: status.includes('!') ? 'rgba(239, 68, 68, 0.8)' : 'rgba(34, 197, 94, 0.8)',
            }}>
              {status}
            </div>
          </div>
        )}

        <div className={`card ${styles.scoreCard}`}>
          <div className={styles.statsGrid}>
            <div className={`card card--flat ${styles.statTile}`}>
              <div className="text-2xl font-extrabold">{ear.toFixed(2)}</div>
              <div className="text-xs text-sub mt-2">EAR</div>
            </div>
            <div className={`card card--flat ${styles.statTile}`}>
              <div className="text-2xl font-extrabold">{blinkCount}</div>
              <div className="text-xs text-sub mt-2">Kedipan</div>
            </div>
            <div className={`card card--flat ${styles.statTile}`}>
              <div className="text-2xl font-extrabold">{isFocusing ? 'Aktif' : 'Jeda'}</div>
              <div className="text-xs text-sub mt-2">Status Sesi</div>
            </div>
          </div>

          <div className={`${styles.statsGrid} ${styles.secondRow}`}>
            <div className={`card card--flat ${styles.statTile}`}>
              <div className="text-2xl font-extrabold">{drowsyAlerts + distractAlerts + tabSwitchAlerts}</div>
              <div className="text-xs text-sub mt-2">Peringatan Terpicu</div>
            </div>
            <div className={`card card--flat ${styles.statTile}`}>
              <div className="text-2xl font-extrabold">{rewardCount}</div>
              <div className="text-xs text-sub mt-2">Reward Fokus</div>
            </div>
            <div className={`card card--flat ${styles.statTile}`}>
              <div className="text-2xl font-extrabold">{formatTime(longestFocusMs / 1000)}</div>
              <div className="text-xs text-sub mt-2">Streak Terpanjang</div>
            </div>
          </div>

          {/* Angka bantu kalibrasi ambang batas "menoleh"/"melirik" saat demo/testing */}
          <div className={`text-xs text-sub text-center ${styles.calibrationNote}`}>
            Yaw offset: {yawDebug.toFixed(2)} (threshold 0.28) &nbsp;|&nbsp; Gaze offset: {gazeDebug.toFixed(2)} (threshold 0.18)
          </div>
        </div>

      </div>

      <Mascot
        ref={mascotRef}
        mood={mascotMood}
        message={mascotMessage}
        visible={showMascot}
      />
    </div>
  );
}