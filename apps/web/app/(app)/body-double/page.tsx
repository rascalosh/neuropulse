'use client';
import { useState, useEffect, useRef } from 'react';
import { useLang } from '../../../contexts/providers';
import { translations } from '../../../lib/i18n';
import { 
  IconFileText, 
  IconMonitor, 
  IconMessageCircle, 
  IconUser, 
  IconPlay, 
  IconPause,
  IconArrowRight, 
  IconClock, 
  IconVolume, 
  IconUsers, 
  IconTarget,
  IconCheckSquare,
  IconLogOut,
  IconRefresh
} from '../../../components/Icons';
import styles from './bodydouble.module.css';

const ROOMS = [
  {
    key: 'deadline', Icon: IconFileText, iconBg: '#EFF6FF', iconColor: '#3B82F6', online: 8,
    avatars: [
      { initial: 'A', bg: '#8B5CF6' },
      { initial: 'K', bg: '#3B82F6' },
    ],
  },
  {
    key: 'remote', Icon: IconMonitor, iconBg: '#F5F3FF', iconColor: '#8B5CF6', online: 12,
    avatars: [
      { initial: 'M', bg: '#F59E0B' },
      { initial: 'J', bg: '#6366F1' },
    ],
  },
  {
    key: 'study', Icon: IconMessageCircle, iconBg: '#ECFDF5', iconColor: '#10B981', online: 5,
    avatars: [
      { initial: 'R', bg: '#EF4444' },
      { initial: 'S', bg: '#3B82F6' },
    ],
  },
] as const;

const YT_PRESETS = [
  { key: 'lofi', label: 'Lofi Girl — Study Radio', videoId: 'jfKfPfyJRdk' },
  { key: 'swm', label: 'Study With Me — Pomodoro', query: 'study with me pomodoro live' },
  { key: 'coffee', label: 'Coffee Shop Ambience', query: 'coffee shop ambience study with me' },
] as const;

function extractYoutubeId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1) || null;
    if (url.hostname.includes('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v) return v;
      const liveMatch = url.pathname.match(/\/(live|embed)\/([a-zA-Z0-9_-]{11})/);
      if (liveMatch) return liveMatch[2] ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

interface Participant {
  name: string;
  avatarBg: string;
  initials: string;
  goal: string;
  status: 'fokus' | 'istirahat' | 'idle';
  isMuted: boolean;
}

export default function BodyDoublePage() {
  const { lang } = useLang();
  const tr = translations[lang];
  
  // Room entry states
  const [connectingRoomKey, setConnectingRoomKey] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<typeof ROOMS[number] | null>(null);
  
  // YouTube player states
  const [ytInput, setYtInput] = useState('');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [activeQuery, setActiveQuery] = useState<string | null>(null);

  // Active room states
  const [userGoal, setUserGoal] = useState('');
  const [userGoalInput, setUserGoalInput] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(1500); // 25 minutes
  const [timerActive, setTimerActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // Simulated participants
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Ambient Audio
  const [activeAmbient, setActiveAmbient] = useState<'none' | 'rain' | 'cafe' | 'lofi'>('none');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync ambient audio element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.loop = true;
      }
    }
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    
    if (activeAmbient === 'none') {
      audioRef.current.pause();
    } else {
      let src = '';
      if (activeAmbient === 'rain') {
        src = 'https://www.soundjay.com/nature/sounds/rain-07.mp3'; // real rain sound
      } else if (activeAmbient === 'cafe') {
        src = 'https://assets.mixkit.co/active_storage/sfx/2433/2433-84.wav'; // real cafe ambient chatter
      } else if (activeAmbient === 'lofi') {
        src = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'; // real lofi music
      }
      
      try {
        audioRef.current.src = src;
        audioRef.current.play().catch(e => console.log('Audio autoplay prevented:', e));
      } catch (err) {
        console.error(err);
      }
    }

    return () => {
      audioRef.current?.pause();
    };
  }, [activeAmbient]);

  // Pomodoro timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setTimerActive(false);
      // Play a notification alert sound
      if (typeof window !== 'undefined') {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timerSeconds]);

  // Handle joining room with simulated connection
  const handleJoinRoom = (room: typeof ROOMS[number]) => {
    setConnectingRoomKey(room.key);
    setTimeout(() => {
      setConnectingRoomKey(null);
      setActiveRoom(room);
      setTimerSeconds(1500);
      setTimerActive(false);
      setUserGoal('');
      setUserGoalInput('');
      
      // Initialize mock participants
      const pList: Participant[] = [
        {
          name: 'Sarah W.',
          avatarBg: '#8B5CF6',
          initials: 'SW',
          goal: lang === 'id' ? 'Menulis paper penelitian' : 'Writing research paper',
          status: 'fokus',
          isMuted: true
        },
        {
          name: 'Jessica T.',
          avatarBg: '#10B981',
          initials: 'JT',
          goal: lang === 'id' ? 'Desain UI Neuropulse' : 'UI Design for Neuropulse',
          status: 'fokus',
          isMuted: true
        },
        {
          name: 'Budi Santoso',
          avatarBg: '#F59E0B',
          initials: 'BS',
          goal: lang === 'id' ? 'Belajar struktur data' : 'Studying data structures',
          status: 'istirahat',
          isMuted: false
        }
      ];
      setParticipants(pList);
    }, 1200);
  };

  const handleLeaveRoom = () => {
    setActiveRoom(null);
    setActiveAmbient('none');
  };

  const handleLoadVideo = () => {
    const id = extractYoutubeId(ytInput);
    if (id) {
      setActiveVideoId(id);
      setActiveQuery(null);
    }
  };

  const formatTime = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const s = (totalSecs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // If in active room, show professional virtual room view
  if (activeRoom) {
    const roomInfo = tr.bodydouble.rooms[activeRoom.key];
    return (
      <div className={styles.page}>
        <div className="container">
          
          {/* Active Room Header */}
          <div className={styles.roomHeaderActive}>
            <div className={styles.headerLeft}>
              <div className="icon-box" style={{ background: activeRoom.iconBg, color: activeRoom.iconColor }}>
                <activeRoom.Icon size={20} />
              </div>
              <div>
                <h1 className={styles.activeRoomTitle}>{roomInfo.title}</h1>
                <p className={styles.activeRoomSubtitle}>
                  <span className={styles.onlineDot} /> {participants.length + 1} {lang === 'id' ? 'peserta aktif' : 'active participants'}
                </p>
              </div>
            </div>
            
            <button className={`${styles.leaveButton} btn`} onClick={handleLeaveRoom}>
              <IconLogOut size={16} />
              <span>{lang === 'id' ? 'Keluar Ruangan' : 'Leave Room'}</span>
            </button>
          </div>

          <div className={styles.workspaceGrid}>
            
            {/* Left side: Co-Working Grid */}
            <div className={styles.participantsSection}>
              <div className={styles.sectionHeader}>
                <IconUsers size={18} />
                <h2>{lang === 'id' ? 'Rekan Kerja Virtual Anda' : 'Your Virtual Co-workers'}</h2>
              </div>

              <div className={styles.cohortGrid}>
                {/* User card */}
                <div className={`${styles.participantCard} ${styles.userCardActive}`}>
                  <div className={styles.pCardHeader}>
                    <div className={styles.pAvatar} style={{ background: '#3B82F6' }}>
                      <IconUser size={16} />
                    </div>
                    <span className={styles.pStatusTagActive}>
                      {lang === 'id' ? 'Kamu (Fokus)' : 'You (Focusing)'}
                    </span>
                  </div>
                  <div className={styles.pCardBody}>
                    <h4 className={styles.pName}>{lang === 'id' ? 'Sesi Saya' : 'My Session'}</h4>
                    <p className={styles.pGoal}>
                      {userGoal ? `🎯 ${userGoal}` : (lang === 'id' ? 'Belum menetapkan target fokus.' : 'No focus target set yet.')}
                    </p>
                  </div>
                </div>

                {/* Simulated participants */}
                {participants.map((p, idx) => (
                  <div key={idx} className={styles.participantCard}>
                    <div className={styles.pCardHeader}>
                      <div className={styles.pAvatar} style={{ background: p.avatarBg }}>
                        {p.initials}
                      </div>
                      <span className={`${styles.pStatusTag} ${p.status === 'fokus' ? styles.statusFocus : styles.statusBreak}`}>
                        {p.status === 'fokus' ? (lang === 'id' ? 'Fokus' : 'Focus') : (lang === 'id' ? 'Istirahat' : 'Break')}
                      </span>
                    </div>
                    <div className={styles.pCardBody}>
                      <h4 className={styles.pName}>{p.name}</h4>
                      <p className={styles.pGoal}>🎯 {p.goal}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right side: Tools & Co-Working controls */}
            <div className={styles.sidebarSection}>
              
              {/* Pomodoro Timer widget */}
              <div className={styles.widgetCard}>
                <div className={styles.widgetTitle}>
                  <IconClock size={16} />
                  <h3>{lang === 'id' ? 'Timer Pomodoro' : 'Pomodoro Timer'}</h3>
                </div>
                <div className={styles.timerDisplay}>
                  {formatTime(timerSeconds)}
                </div>
                <div className={styles.timerControls}>
                  <button 
                    className={`btn ${timerActive ? 'btn-secondary' : 'btn-primary'}`} 
                    onClick={() => setTimerActive(!timerActive)}
                  >
                    {timerActive ? <IconPause size={16} /> : <IconPlay size={16} />}
                    <span>{timerActive ? (lang === 'id' ? 'Jeda' : 'Pause') : (lang === 'id' ? 'Mulai' : 'Start')}</span>
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => {
                      setTimerActive(false);
                      setTimerSeconds(1500);
                    }}
                  >
                    <IconRefresh size={16} />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Goal Setter widget */}
              <div className={styles.widgetCard}>
                <div className={styles.widgetTitle}>
                  <IconTarget size={16} />
                  <h3>{lang === 'id' ? 'Target Sesi Ini' : 'Session Goal'}</h3>
                </div>
                <div className={styles.goalInputRow}>
                  <input
                    type="text"
                    className={styles.goalInput}
                    placeholder={lang === 'id' ? 'Apa yang mau diselesaikan?' : 'What are you working on?'}
                    value={userGoalInput}
                    onChange={(e) => setUserGoalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && userGoalInput.trim()) {
                        setUserGoal(userGoalInput);
                      }
                    }}
                  />
                  <button 
                    className="btn btn-primary"
                    onClick={() => {
                      if (userGoalInput.trim()) {
                        setUserGoal(userGoalInput);
                      }
                    }}
                  >
                    {lang === 'id' ? 'Pasang' : 'Set'}
                  </button>
                </div>
              </div>

              {/* Soundscapes Control */}
              <div className={styles.widgetCard}>
                <div className={styles.widgetTitle}>
                  <IconVolume size={16} />
                  <h3>{lang === 'id' ? 'Suara Latar Belakang' : 'Background Audio'}</h3>
                </div>
                <div className={styles.ambientGrid}>
                  <button 
                    className={`${styles.ambientBtn} ${activeAmbient === 'none' ? styles.ambientBtnActive : ''}`}
                    onClick={() => setActiveAmbient('none')}
                  >
                    {lang === 'id' ? 'Hening' : 'Silent'}
                  </button>
                  <button 
                    className={`${styles.ambientBtn} ${activeAmbient === 'rain' ? styles.ambientBtnActive : ''}`}
                    onClick={() => setActiveAmbient('rain')}
                  >
                    🌧️ {lang === 'id' ? 'Hujan' : 'Rain'}
                  </button>
                  <button 
                    className={`${styles.ambientBtn} ${activeAmbient === 'cafe' ? styles.ambientBtnActive : ''}`}
                    onClick={() => setActiveAmbient('cafe')}
                  >
                    ☕ {lang === 'id' ? 'Kafe' : 'Cafe'}
                  </button>
                  <button 
                    className={`${styles.ambientBtn} ${activeAmbient === 'lofi' ? styles.ambientBtnActive : ''}`}
                    onClick={() => setActiveAmbient('lofi')}
                  >
                    🎵 Lofi
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    );
  }

  // Listing view
  return (
    <div className={styles.page}>
      <div className="container">
        
        {/* Header */}
        <div className={styles.header}>
          <div className="icon-box" style={{ background: '#EFF6FF', color: '#3B82F6' }}>
            <IconUser size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">{tr.bodydouble.title}</h1>
            <p className="text-sub mt-2">{tr.bodydouble.desc}</p>
          </div>
        </div>

        {/* Room selection */}
        <div className="grid-3">
          {ROOMS.map((room) => {
            const info = tr.bodydouble.rooms[room.key];
            const isConnecting = connectingRoomKey === room.key;
            
            return (
              <div key={room.key} className={`card ${styles.roomCard}`}>
                <div className={styles.roomTop}>
                  <div className="icon-box icon-box--sm" style={{ background: room.iconBg, color: room.iconColor }}>
                    <room.Icon size={17} />
                  </div>
                  <span className={styles.onlineBadge}>
                    <span className={styles.onlineDot} /> {room.online} {tr.bodydouble.online}
                  </span>
                </div>
                <h3 className={styles.roomTitle}>{info.title}</h3>
                <p className={styles.roomDesc}>{info.desc}</p>
                <div className={styles.avatars}>
                  {room.avatars.map((a) => (
                    <span key={a.initial} className={styles.avatarChip} style={{ background: a.bg }}>{a.initial}</span>
                  ))}
                  <span className={`${styles.avatarChip} ${styles.avatarMore}`}>+</span>
                </div>
                
                <button 
                  className={`btn btn-primary btn-full mt-4 ${styles.joinRoomBtn}`} 
                  onClick={() => handleJoinRoom(room)}
                  disabled={connectingRoomKey !== null}
                >
                  {isConnecting ? (
                    <span className={styles.loadingSpinner} />
                  ) : (
                    <>
                      <IconArrowRight size={16} /> 
                      {tr.bodydouble.join_btn}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* YouTube Ambient Video panel */}
        <div className={styles.ytSection}>
          <div className={styles.ytHeader}>
            <div className="icon-box icon-box--sm" style={{ background: '#FEF2F2', color: '#EF4444' }}>
              <IconPlay size={16} />
            </div>
            <div>
              <h2 className={styles.ytTitle}>Study With Me — YouTube</h2>
              <p className={styles.ytDesc}>Putar video co-working YouTube sebagai teman kerja virtual.</p>
            </div>
          </div>

          <div className={styles.ytPresets}>
            {YT_PRESETS.map((preset) => (
              <button
                key={preset.key}
                className={styles.ytChip}
                onClick={() => {
                  if ('videoId' in preset) {
                    setActiveVideoId(preset.videoId);
                    setActiveQuery(null);
                  } else {
                    setActiveQuery(preset.query);
                    setActiveVideoId(null);
                  }
                }}
              >
                <IconPlay size={14} />
                {preset.label}
              </button>
            ))}
          </div>

          <div className={styles.ytInputRow}>
            <input
              className={styles.ytInput}
              type="text"
              placeholder="Tempel link atau ID video YouTube..."
              value={ytInput}
              onChange={(e) => setYtInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoadVideo()}
            />
            <button className="btn btn-primary" onClick={handleLoadVideo}>Putar</button>
          </div>

          {(activeVideoId || activeQuery) && (
            <div className={`${styles.ytPlayer} animate-in`}>
              <iframe
                src={
                  activeVideoId
                    ? `https://www.youtube.com/embed/${activeVideoId}?autoplay=1`
                    : `https://www.youtube.com/embed?autoplay=1&listType=search&list=${encodeURIComponent(activeQuery ?? '')}`
                }
                title="Study With Me"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>

        {/* Connecting Screen Overlay */}
        {connectingRoomKey && (
          <div className={styles.connectionOverlay}>
            <div className={styles.connectionCard}>
              <div className={styles.pulseLogo}>
                <span className={styles.connectingSpinner} />
              </div>
              <h3>{lang === 'id' ? 'Menghubungkan...' : 'Connecting...'}</h3>
              <p>{lang === 'id' ? 'Mempersiapkan ruang fokus virtual Anda...' : 'Setting up your virtual focus room...'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
