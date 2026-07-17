'use client';
import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useStorage } from '../../../hooks/useStorage';
import { reframeWithInterest, generateFrictionBuster, FrictionBusterResult, DecomposedTask } from '../../../lib/gemini';
import { genId, checkTaskDecay, checkChronicStuck, Task, MicroTask, TaskGroup } from '../../../lib/storage';
import { XP_REWARDS } from '../../../lib/gamification';
import { createCloudSpeaker } from '../../../lib/tts';
import { useLang } from '../../../contexts/providers';
import { translations, Lang } from '../../../lib/i18n';
import {
  IconCheckSquare, IconSparkles, IconClock, IconAlertTriangle, IconCheck,
  IconZap, IconTarget, IconArrowRight, IconBrain, IconMessageCircle,
  IconFileText, IconCopy,
} from '../../../components/Icons';
import styles from './tasks.module.css';

function IconMic({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function IconClose({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function IconTrophy({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M17 5h3a1 1 0 0 1 1 1 4 4 0 0 1-4 4M7 5H4a1 1 0 0 0-1 1 4 4 0 0 0 4 4" />
    </svg>
  );
}

// ─── Speech Recognition types ───────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySpeechRecognition = any;

// ─── Task Graph Component — "Quest Path" ─────────────────────────────────────
// Micro-tasks laid out along a winding path (à la game level map). Parallel
// groups fork into side-by-side branches that merge back into the main path.
interface TaskGraphProps {
  task: Task;
  onToggle: (microtaskId: string) => void;
  speakingMicroId?: string | null;
}

interface QuestLayer {
  id: string;
  tasks: MicroTask[];
  groupLabel: string;
  showGroupLabel: boolean;
  parallel: boolean;
}

interface QuestPoint { x: number; y: number }
interface QuestEdge { key: string; d: string; done: boolean }

function TaskGraph({ task, onToggle, speakingMicroId }: TaskGraphProps) {
  const groups = task.groups ?? [];

  // Fallback: if no groups, put all microtasks in one group
  const displayGroups: Array<{ label: string; type: string; tasks: MicroTask[] }> =
    groups.length > 0
      ? groups.map((g) => ({
          label: g.label,
          type: g.type,
          tasks: task.microTasks.filter((m) => m.group === g.label),
        }))
      : [{ label: 'Perjalanan', type: 'sequential', tasks: task.microTasks }];

  // Flatten groups into layers: a parallel group becomes one branching layer,
  // a sequential group becomes one layer per task (each a step on the path).
  const layers: QuestLayer[] = [];
  displayGroups.forEach((group) => {
    if (group.tasks.length === 0) return;
    if (group.type === 'parallel') {
      layers.push({ id: `L${layers.length}`, tasks: group.tasks, groupLabel: group.label, showGroupLabel: true, parallel: true });
    } else {
      group.tasks.forEach((t, ti) => {
        layers.push({ id: `L${layers.length}`, tasks: [t], groupLabel: group.label, showGroupLabel: ti === 0, parallel: false });
      });
    }
  });

  const orderedTasks = layers.flatMap((l) => l.tasks);
  const currentTaskId = orderedTasks.find((t) => !t.completed)?.id;
  const allDone = orderedTasks.length > 0 && orderedTasks.every((t) => t.completed);

  // A layer only unlocks once every task in every earlier layer is completed.
  // Tasks inside the same (parallel) layer unlock together — order within the
  // layer doesn't matter, but you can't jump ahead to a later layer.
  const layerUnlocked: boolean[] = [];
  layers.reduce((prefixDone, layer, li) => {
    layerUnlocked[li] = prefixDone;
    return prefixDone && layer.tasks.every((t) => t.completed);
  }, true);

  const containerRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [edges, setEdges] = useState<QuestEdge[]>([]);
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });

  const computeRef = useRef<() => void>(() => {});
  computeRef.current = () => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();

    const center = (el: HTMLElement | null | undefined): QuestPoint | null => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left - cRect.left + r.width / 2, y: r.top - cRect.top + r.height / 2 };
    };
    const curve = (p1: QuestPoint, p2: QuestPoint) => {
      const midY = (p1.y + p2.y) / 2;
      return `M ${p1.x} ${p1.y} C ${p1.x} ${midY}, ${p2.x} ${midY}, ${p2.x} ${p2.y}`;
    };

    const newEdges: QuestEdge[] = [];
    const startPt = center(startRef.current);
    let prevPoints: Array<{ pt: QuestPoint; done: boolean }> = startPt ? [{ pt: startPt, done: true }] : [];

    layers.forEach((layer, li) => {
      const layerPoints = layer.tasks
        .map((t) => ({ pt: center(nodeRefs.current.get(t.id)), done: t.completed }))
        .filter((p): p is { pt: QuestPoint; done: boolean } => !!p.pt);

      prevPoints.forEach((pp, pi) => {
        layerPoints.forEach((lp, lpi) => {
          newEdges.push({ key: `e${li}-${pi}-${lpi}`, d: curve(pp.pt, lp.pt), done: pp.done });
        });
      });

      if (layerPoints.length > 0) prevPoints = layerPoints;
    });

    const endPt = center(endRef.current);
    if (endPt) {
      prevPoints.forEach((pp, pi) => {
        newEdges.push({ key: `eEnd-${pi}`, d: curve(pp.pt, endPt), done: pp.done && allDone });
      });
    }

    setEdges(newEdges);
    setSvgSize({ width: cRect.width, height: Math.max(cRect.height, 1) });
  };

  useLayoutEffect(() => {
    computeRef.current();
  }, [task]);

  useEffect(() => {
    if (!speakingMicroId) return;
    const el = nodeRefs.current.get(speakingMicroId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [speakingMicroId]);

  useEffect(() => {
    const handler = () => computeRef.current();
    const ro = new ResizeObserver(handler);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', handler);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handler);
    };
  }, []);

  return (
    <div className={styles.questWrap} ref={containerRef}>
      <svg className={styles.questSvg} width={svgSize.width} height={svgSize.height} aria-hidden="true">
        {edges.map((e) => (
          <path key={e.key} d={e.d} fill="none" className={`${styles.questEdge} ${e.done ? styles.questEdgeDone : ''}`} />
        ))}
      </svg>

      <div className={styles.questFlagNode} ref={startRef}>
        <span className={`${styles.questFlag} ${styles.questFlagStart}`}><IconTarget size={18} /></span>
        <span className={styles.questFlagLabel}>Mulai</span>
      </div>

      {layers.map((layer, li) => (
        <div
          key={layer.id}
          className={`${styles.questLayer} ${layer.parallel ? styles.questLayerParallel : ''}`}
        >
          {layer.showGroupLabel && (
            <div className={styles.questGroupLabel}>
              <span>{layer.groupLabel}</span>
              {layer.parallel && (
                <span className={styles.graphParallelBadge}><IconZap size={11} /> Bisa bareng</span>
              )}
            </div>
          )}
          <div className={layer.parallel ? styles.questRow : styles.questSingle}>
            {layer.tasks.map((mt) => {
              const isCurrent = mt.id === currentTaskId;
              const globalIndex = orderedTasks.indexOf(mt) + 1;
              const isLocked = !layerUnlocked[li] && !mt.completed;
              const isSpeaking = mt.id === speakingMicroId;
              return (
                <button
                  key={mt.id}
                  ref={(el) => {
                    if (el) nodeRefs.current.set(mt.id, el);
                    else nodeRefs.current.delete(mt.id);
                  }}
                  className={`${styles.questNode} ${mt.completed ? styles.questNodeDone : ''} ${isCurrent ? styles.questNodeCurrent : ''} ${isLocked ? styles.questNodeLocked : ''} ${isSpeaking ? styles.questNodeSpeaking : ''}`}
                  onClick={() => { if (!isLocked) onToggle(mt.id); }}
                  disabled={isLocked}
                  aria-pressed={mt.completed}
                  aria-disabled={isLocked}
                  title={isLocked ? 'Selesaikan langkah sebelumnya dulu' : undefined}
                >
                  {isCurrent && (
                    <span className={styles.questCurrentBadge}>
                      Kamu di sini <IconArrowRight size={11} />
                    </span>
                  )}
                  <div className={styles.questNodeCircle}>
                    {mt.completed ? <IconCheck size={13} /> : globalIndex}
                  </div>
                  <div className={styles.graphNodeContent}>
                    {mt.reframedTitle && !mt.completed && (
                      <div className={styles.graphNodeReframed}>
                        <IconSparkles size={11} /> {mt.reframedTitle}
                      </div>
                    )}
                    <div className={`${styles.graphNodeTitle} ${mt.completed ? styles.graphNodeTitleDone : ''}`}>
                      {mt.title}
                    </div>
                    <div className={styles.graphNodeMeta}>
                      <IconClock size={11} /> {mt.estimatedMinutes}m
                      {mt.completed && <span className="badge badge-xp" style={{ fontSize: 10 }}>+{XP_REWARDS.MICROTASK_COMPLETE} XP</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className={`${styles.questFlagNode} ${allDone ? styles.questFlagNodeDone : ''}`} ref={endRef}>
        <span className={`${styles.questFlag} ${allDone ? styles.questFlagTrophy : ''}`}>
          {allDone ? <IconTrophy size={22} /> : <IconSparkles size={18} />}
        </span>
        <span className={styles.questFlagLabel}>{allDone ? 'Selesai!' : 'Finish'}</span>
      </div>
    </div>
  );
}

// ─── Friction Buster Card ────────────────────────────────────────────────────
interface FrictionBusterCardProps {
  taskTitle: string;
  microTaskTitle: string;
  lang: Lang;
  onClose: () => void;
}

function FrictionBusterCard({ taskTitle, microTaskTitle, lang, onClose }: FrictionBusterCardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<FrictionBusterResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    generateFrictionBuster(taskTitle, microTaskTitle, lang).then((res) => {
      setResult(res);
      setIsLoading(false);
    });
  }, [taskTitle, microTaskTitle, lang]);

  const handleCopy = () => {
    if (result?.content) {
      navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const typeIcon = {
    email_draft: IconMessageCircle,
    template: IconFileText,
    links: IconTarget,
    outline: IconFileText,
  };
  const TypeIcon = result ? typeIcon[result.type] : null;

  return (
    <div className={styles.frictionCard}>
      <div className={styles.frictionHeader}>
        <div className={styles.frictionIconRow}>
          <span className={styles.frictionIcon}><IconZap size={22} /></span>
          <div>
            <div className={styles.frictionTitle}>AI sudah mulai duluan!</div>
            <div className={styles.frictionSub}>Friction awal sudah diambil alih. Tinggal lanjutkan.</div>
          </div>
        </div>
        <button className={styles.frictionClose} onClick={onClose} aria-label="Tutup">
          <IconClose size={15} />
        </button>
      </div>

      {isLoading ? (
        <div className={styles.frictionLoading}>
          <span className="spinner spinner--blue" />
          <span>AI lagi nulis buat kamu...</span>
        </div>
      ) : result ? (
        <div className={styles.frictionBody}>
          <div className={styles.frictionTypeLabel}>
            {TypeIcon && <TypeIcon size={13} />} {result.title}
          </div>
          <pre className={styles.frictionContent}>{result.content}</pre>
          <div className={styles.frictionActions}>
            <button className="btn btn-primary btn-sm" onClick={handleCopy}>
              {copied ? <><IconCheck size={14} /> Tersalin!</> : <><IconCopy size={14} /> Salin</>}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function TasksPage() {
  const [store, update] = useStorage();
  const { lang } = useLang();
  const tr = translations[lang];

  const [newTask, setNewTask] = useState('');
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState<{ tier: string; limit: number } | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [frictionTaskId, setFrictionTaskId] = useState<string | null>(null);
  const [speakingTaskId, setSpeakingTaskId] = useState<string | null>(null);
  const [speakingMicroId, setSpeakingMicroId] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const speakingRunIdRef = useRef(0);
  const cloudSpeakerRef = useRef<ReturnType<typeof createCloudSpeaker> | null>(null);
  const recognitionRef = useRef<AnySpeechRecognition>(null);

  const interests = store.profile?.interestKeywords || store.profile?.interests || [];
  const energy = store.currentEnergy;

  // ── Load available TTS voices (populated async by the browser) ───────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Pick the best-sounding available voice for a given language.
  const pickVoice = (voiceLang: 'id-ID' | 'en-US'): SpeechSynthesisVoice | undefined => {
    const prefix = voiceLang === 'id-ID' ? 'id' : 'en';
    const candidates = voices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
    if (candidates.length === 0) return undefined;

    // Prefer higher-quality "natural"/online voices over the robotic local default.
    const qualityHints = ['natural', 'neural', 'premium', 'wavenet', 'google', 'online'];
    const byQuality = candidates.find((v) =>
      qualityHints.some((hint) => v.name.toLowerCase().includes(hint))
    );
    if (byQuality) return byQuality;

    // Exact locale match beats a same-language-different-region voice.
    const exact = candidates.find((v) => v.lang.toLowerCase() === voiceLang.toLowerCase());
    return exact ?? candidates[0];
  };

  // Stop any read-aloud when leaving the page
  useEffect(() => {
    return () => {
      speakingRunIdRef.current++;
      cloudSpeakerRef.current?.stop();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // ── Speech to Text ──────────────────────────────────────────────────────────
  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      alert('Speech recognition tidak didukung browser ini. Gunakan Chrome atau Edge ya!');
      return;
    }

    const recognition: AnySpeechRecognition = new SpeechRecognitionAPI();
    recognition.lang = 'id-ID';
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = newTask;

    recognition.onstart = () => setIsRecording(true);

    recognition.onresult = (event: AnySpeechRecognition) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t + ' ';
        } else {
          interim = t;
        }
      }
      setNewTask(finalTranscript + interim);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setNewTask(finalTranscript.trim());
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // ── Decompose ───────────────────────────────────────────────────────────────
  const handleDecompose = async () => {
    if (!newTask.trim()) return;
    setIsDecomposing(true);
    setQuotaExceeded(null);
    try {
      const res = await fetch('/api/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskTitle: newTask, interests, energyLevel: energy, lang }),
      });
      if (res.status === 402) {
        const info = await res.json();
        setQuotaExceeded({ tier: info.tier, limit: info.limit });
        return;
      }
      if (!res.ok) throw new Error(`decompose_api_${res.status}`);
      const result: DecomposedTask = await res.json();
      const taskId = genId();
      const now = new Date().toISOString();

      const microTasks: MicroTask[] = await Promise.all(
        result.microTasks.map(async (mt) => {
          let reframed: string | undefined;
          if (interests.length > 0) {
            try {
              reframed = await reframeWithInterest(mt.title, interests, lang);
            } catch {
              reframed = undefined;
            }
          }
          return {
            id: genId(),
            parentTaskId: taskId,
            title: mt.title,
            reframedTitle: reframed,
            estimatedMinutes: mt.estimatedMinutes,
            completed: false,
            viewCount: 0,
            editCount: 0,
            createdAt: now,
            group: mt.group,
            parallel: mt.parallel,
          };
        })
      );

      const groups: TaskGroup[] = (result.groups ?? []).map((g) => ({
        label: g.label,
        microTaskIds: microTasks.filter((m) => m.group === g.label).map((m) => m.id),
        type: g.type,
      }));

      const total = microTasks.reduce((s, m) => s + m.estimatedMinutes, 0);
      const task: Task = {
        id: taskId,
        title: newTask.trim(),
        microTasks,
        groups,
        totalEstimatedMinutes: total,
        completedCount: 0,
        status: 'active',
        viewCount: 0,
        lastViewedAt: now,
        createdAt: now,
      };

      update((prev) => ({
        ...prev,
        tasks: [task, ...prev.tasks],
        totalXP: prev.totalXP + XP_REWARDS.MICROTASK_COMPLETE,
        xpHistory: [...prev.xpHistory, { id: genId(), amount: XP_REWARDS.MICROTASK_COMPLETE, reason: `Task: "${newTask.slice(0, 30)}"`, timestamp: now }],
      }));
      setNewTask('');
      setActiveTaskId(taskId);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDecomposing(false);
    }
  };

  // ── Toggle Microtask ────────────────────────────────────────────────────────
  const toggleMicrotask = (taskId: string, microtaskId: string) => {
    update((prev) => {
      const tasks = prev.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const microTasks = t.microTasks.map((m) => {
          if (m.id !== microtaskId) return m;
          return { ...m, completed: !m.completed, completedAt: !m.completed ? new Date().toISOString() : undefined };
        });
        const completedCount = microTasks.filter((m) => m.completed).length;
        const status = completedCount === microTasks.length ? 'completed' : 'active';
        return { ...t, microTasks, completedCount, status: status as Task['status'] };
      });

      const wasDone = prev.tasks.find((t) => t.id === taskId)?.microTasks.find((m) => m.id === microtaskId)?.completed;
      const xpDelta = wasDone ? -XP_REWARDS.MICROTASK_COMPLETE : XP_REWARDS.MICROTASK_COMPLETE;

      return {
        ...prev,
        tasks,
        totalXP: Math.max(0, prev.totalXP + xpDelta),
        xpHistory: !wasDone ? [...prev.xpHistory, { id: genId(), amount: XP_REWARDS.MICROTASK_COMPLETE, reason: 'Micro-task selesai', timestamp: new Date().toISOString() }] : prev.xpHistory,
      };
    });
  };

  const viewTask = (taskId: string) => {
    update((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId ? { ...t, viewCount: t.viewCount + 1, lastViewedAt: new Date().toISOString() } : t
      ),
    }));
    setActiveTaskId(activeTaskId === taskId ? null : taskId);
  };

  const deleteTask = (taskId: string) => {
    update((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId) }));
    if (activeTaskId === taskId) setActiveTaskId(null);
  };

  // ── Read Task Aloud ──────────────────────────────────────────────────────────
  const readTaskAloud = (taskId: string) => {
    if (typeof window === 'undefined') return;

    // Toggle off if this task is already being read
    if (speakingTaskId === taskId) {
      speakingRunIdRef.current++;
      cloudSpeakerRef.current?.stop();
      window.speechSynthesis?.cancel();
      setSpeakingTaskId(null);
      setSpeakingMicroId(null);
      return;
    }

    const task = store.tasks.find((t) => t.id === taskId);
    if (!task) return;

    cloudSpeakerRef.current?.stop();
    window.speechSynthesis?.cancel();
    setSpeakingTaskId(taskId);
    const runId = ++speakingRunIdRef.current;

    const voiceLang = lang === 'en' ? 'en-US' : 'id-ID';

    // Prefer real human-sounding Cloud TTS; fall back to the browser's built-in
    // speechSynthesis voices if no API key is configured or a call fails.
    const cloudSpeaker = createCloudSpeaker();
    cloudSpeakerRef.current = cloudSpeaker;
    const browserVoice = pickVoice(voiceLang);

    const speak = async (text: string): Promise<void> => {
      if (cloudSpeaker.isAvailable) {
        try {
          await cloudSpeaker.speak(text, voiceLang);
          return;
        } catch {
          // fall through to browser TTS
        }
      }
      if (!window.speechSynthesis) return;
      await new Promise<void>((resolve) => {
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = browserVoice?.lang ?? voiceLang;
        if (browserVoice) utter.voice = browserVoice;
        utter.rate = 0.95;
        utter.onend = () => resolve();
        utter.onerror = () => resolve();
        window.speechSynthesis.speak(utter);
      });
    };

    (async () => {
      await speak(`${task.title}. Total ${task.microTasks.length} langkah.`);
      for (const mt of task.microTasks) {
        if (speakingRunIdRef.current !== runId) return;
        setSpeakingMicroId(mt.id);
        await speak(mt.title);
      }
      if (speakingRunIdRef.current !== runId) return;
      // Balik ke awal setelah selesai dibacakan
      setSpeakingTaskId(null);
      setSpeakingMicroId(null);
    })();
  };

  const activeTasks = store.tasks.filter((t) => t.status === 'active');
  const doneTasks = store.tasks.filter((t) => t.status === 'completed');

  return (
    <div className={styles.page}>
      <div className="container-md">

        {/* Header */}
        <div className={styles.header}>
          <div className="icon-box icon-box--lg"><IconCheckSquare size={24} /></div>
          <div>
            <div className={styles.breadcrumb}>{lang === 'id' ? 'FOKUS' : 'FOCUS'}</div>
            <h1 className="text-2xl font-extrabold">{tr.tasks.title}</h1>
            <p className="text-sub mt-2">{tr.tasks.desc}</p>
          </div>
        </div>

        {quotaExceeded && (
          <div className="card" style={{ marginBottom: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#92400E' }}>
              {lang === 'id'
                ? `Kuota Task Decomposer bulan ini (${quotaExceeded.limit}x, paket ${quotaExceeded.tier}) sudah habis.`
                : `This month's Task Decomposer quota (${quotaExceeded.limit}x, ${quotaExceeded.tier} plan) is used up.`}
            </span>
            <a href="/pricing" className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>
              {lang === 'id' ? 'Upgrade' : 'Upgrade'}
            </a>
          </div>
        )}

        {/* Input Card */}
        <div className={`card ${styles.inputCard}`}>
          <div className={styles.inputRow}>
            <textarea
              className={`input textarea ${styles.taskInput} ${isRecording ? styles.taskInputRecording : ''}`}
              placeholder={isRecording ? 'Lagi merekam... bicara sekarang' : tr.tasks.input_placeholder}
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleDecompose();
              }}
            />
            {/* Mic button */}
            <button
              type="button"
              className={`${styles.micBtn} ${isRecording ? styles.micBtnActive : ''}`}
              onClick={toggleRecording}
              title={isRecording ? 'Stop merekam' : 'Klik untuk bicara'}
              aria-label="Rekam suara"
            >
              {isRecording ? (
                <span className={styles.micRecordingDot} />
              ) : (
                <IconMic size={18} />
              )}
            </button>
          </div>

          <div className={styles.inputFooter}>
            <div className={styles.inputHint}>
              {isRecording ? (
                <span className={styles.recordingHint}>
                  <span className={styles.recordingPulse} />
                  Merekam... klik mic lagi untuk berhenti
                </span>
              ) : interests.length > 0 ? (
                <span className="flex items-center gap-2">
                  <IconSparkles size={13} /> {tr.tasks.reframe_hint} <strong>{interests.slice(0, 2).join(', ')}</strong>
                </span>
              ) : (
                <>{tr.tasks.input_hint}</>
              )}
            </div>
            <button
              className="btn btn-primary"
              onClick={handleDecompose}
              disabled={isDecomposing || !newTask.trim()}
            >
              {isDecomposing ? (
                <span className="flex items-center gap-2">
                  <span className="spinner" />
                  {tr.tasks.decomposing}
                </span>
              ) : (
                <span className="flex items-center gap-2"><IconSparkles size={15} /> Pecah dengan AI</span>
              )}
            </button>
          </div>
        </div>

        {/* Active Tasks */}
        {activeTasks.length > 0 && (
          <section className={styles.section}>
            <h2 className="section-label">
              {tr.tasks.active_title} <span className="badge badge-blue">{activeTasks.length}</span>
            </h2>
            <div className={styles.taskList}>
              {activeTasks.map((task) => {
                const isDecaying = checkTaskDecay(task);
                const isChronicStuck = checkChronicStuck(task);
                const isOpen = activeTaskId === task.id;
                const percent = Math.round((task.completedCount / task.microTasks.length) * 100);
                const showFriction = frictionTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    className={`card card--flat ${styles.taskCard} ${isDecaying ? styles.taskDecaying : ''} ${isOpen ? 'card--active' : ''}`}
                  >
                    <div className={styles.taskHeader} onClick={() => viewTask(task.id)}>
                      <div className={styles.taskInfo}>
                        {isChronicStuck && (
                          <span className={styles.stuckBadge}>
                            <span className={styles.stuckDot} /> Stuck kronis — AI bisa bantu mulai
                          </span>
                        )}
                        {isDecaying && !isChronicStuck && (
                          <span className="badge badge-yellow mb-2 flex items-center gap-1" style={{ display: 'inline-flex' }}>
                            <IconAlertTriangle size={11} /> {tr.tasks.decaying_badge}
                          </span>
                        )}
                        <div className={styles.taskTitle}>{task.title}</div>
                        <div className={styles.taskMeta}>
                          <span className="flex items-center gap-1"><IconClock size={12} /> ~{task.totalEstimatedMinutes}m</span>
                          <span>·</span>
                          <span>{task.completedCount}/{task.microTasks.length} langkah</span>
                        </div>
                      </div>

                      <div className={styles.taskActions}>
                        <div
                          className={styles.progressCircle}
                          style={{ background: `conic-gradient(var(--color-primary) ${percent}%, var(--color-bg) 0)` }}
                        >
                          <span className={styles.progressCircleInner}>{percent}%</span>
                        </div>
                        <button
                          className="btn btn-ghost btn-icon"
                          onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                          aria-label="Hapus task"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className={styles.taskExpandedBody}>
                        {/* "Biar Aku Mulai Duluan" Banner */}
                        {isChronicStuck && !showFriction && (
                          <div className={styles.frictionBanner}>
                            <div className={styles.frictionBannerContent}>
                              <span className={styles.frictionBannerIcon}><IconBrain size={20} /></span>
                              <div>
                                <div className={styles.frictionBannerTitle}>
                                  Tingkat paralysis parah terdeteksi
                                </div>
                                <div className={styles.frictionBannerDesc}>
                                  Kamu udah lihat task ini {task.viewCount}x tapi belum mulai. Biar AI yang ambil alih friction pertama.
                                </div>
                              </div>
                            </div>
                            <button
                              className={styles.frictionBannerBtn}
                              onClick={() => setFrictionTaskId(task.id)}
                            >
                              <IconZap size={13} /> Biar AI Mulai Duluan
                            </button>
                          </div>
                        )}

                        {/* Friction Buster Card */}
                        {showFriction && task.microTasks[0] && (
                          <FrictionBusterCard
                            taskTitle={task.title}
                            microTaskTitle={task.microTasks.find((m) => !m.completed)?.title ?? task.microTasks[0].title}
                            lang={lang}
                            onClose={() => setFrictionTaskId(null)}
                          />
                        )}

                        {/* Task Graph */}
                        <TaskGraph
                          task={task}
                          onToggle={(microtaskId) => toggleMicrotask(task.id, microtaskId)}
                          speakingMicroId={speakingTaskId === task.id ? speakingMicroId : null}
                        />

                        {/* Read Aloud & Actions */}
                        <div className={styles.taskFooterActions}>
                          <button
                            className={`btn btn-outline btn-sm ${styles.calBtn}`}
                            onClick={() => readTaskAloud(task.id)}
                          >
                            {speakingTaskId === task.id ? (
                              <><IconClose size={13} /> Berhenti Membaca</>
                            ) : (
                              <><IconMic size={13} /> Bacakan Task</>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Done Tasks */}
        {doneTasks.length > 0 && (
          <section className={styles.section}>
            <h2 className="section-label">
              {tr.tasks.done_title} <span className="badge badge-green">{doneTasks.length}</span>
            </h2>
            <div className={styles.taskList}>
              {doneTasks.slice(0, 5).map((task) => (
                <div key={task.id} className={`card card--flat ${styles.taskDone}`}>
                  <div className={styles.taskHeader}>
                    <div>
                      <div className={styles.taskTitle}>{task.title}</div>
                      <div className={styles.taskMeta}><IconCheck size={12} /> {task.microTasks.length} {tr.tasks.microtasks_done}</div>
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={() => deleteTask(task.id)}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {store.tasks.length === 0 && (
          <div className="empty-state">
            <div className="empty-state__icon" style={{ color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'center' }}><IconCheckSquare size={36} /></div>
            <h3 className="empty-state__title">{tr.tasks.empty_title}</h3>
            <p className="empty-state__desc">{tr.tasks.empty_desc}</p>
          </div>
        )}
      </div>
    </div>
  );
}
