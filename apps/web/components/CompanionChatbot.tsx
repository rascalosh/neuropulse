'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatWithCompanion, type ChatMessage } from '../lib/gemini';
import { useStorage } from '../hooks/useStorage';
import { getMascotSrc } from '../lib/mascot';
import { useLang } from '../contexts/providers';
import styles from './CompanionChatbot.module.css';

interface DisplayMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS_ID = ['Aku stuck 😩', 'Mau mulai task', 'Cek energiku'];
const QUICK_PROMPTS_EN = ["I'm stuck 😩", 'Want to start a task', 'Check my energy'];

const INITIAL_CONTENT_ID =
  'Hey! 👋 Gimana hari ini? Ada yang mau diceritain?\n\nAku di sini kalau kamu butuh bantuan — mau mulai task, cek energi, atau cuma curhat aja. 💙';
const INITIAL_CONTENT_EN =
  "Hey! 👋 How's today going? Anything you want to talk about?\n\nI'm here if you need help — starting a task, checking your energy, or just venting. 💙";

export default function CompanionChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const { lang } = useLang();
  // Lazy initializer — Date() only runs on the client, never during SSR
  const [messages, setMessages] = useState<DisplayMessage[]>(() => [
    { id: 'init', role: 'model' as const, content: INITIAL_CONTENT_ID, timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [store] = useStorage();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length !== 1 || prev[0]!.id !== 'init') return prev;
      return [{ ...prev[0]!, content: lang === 'id' ? INITIAL_CONTENT_ID : INITIAL_CONTENT_EN }];
    });
  }, [lang]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Build history from display messages (excluding the initial system message)
      const history: ChatMessage[] = messages
        .filter((m) => m.id !== 'init')
        .map((m) => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: text.trim() });

      // Context from the app store
      const moodLog = store.moodLog;
      const avgEnergy =
        moodLog.length > 0
          ? moodLog.slice(-7).reduce((s, m) => s + m.energyLevel, 0) / Math.min(7, moodLog.length)
          : store.currentEnergy;

      const today = new Date().toDateString();
      const completedToday = store.tasks.filter(
        (t) => t.status === 'completed' && t.lastViewedAt && new Date(t.lastViewedAt).toDateString() === today
      ).length;

      const reply = await chatWithCompanion(history, {
        avgEnergy,
        rsdEventsCount: store.rsdEvents.length,
        completedTasksToday: completedToday,
      });

      const modelMsg: DisplayMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        content: reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err) {
      console.error('[CompanionChatbot]', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          content: 'Aduh, ada gangguan teknis bentar 😅 Tapi aku masih di sini ya. Coba lagi sebentar?',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [isTyping, messages, store]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const formatContent = (text: string) => {
    return text.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  const mascotSrc = getMascotSrc(store.currentEnergy);
  const quickPrompts = lang === 'id' ? QUICK_PROMPTS_ID : QUICK_PROMPTS_EN;

  return (
    <>
      {/* Floating Trigger Button */}
      <motion.button
        id="companion-chatbot-trigger"
        aria-label="Buka companion chat"
        onClick={() => setIsOpen(true)}
        className={`${styles.trigger} ${isOpen ? styles.triggerHidden : ''}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mascotSrc} alt="" className={styles.triggerMascot} />
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="companion-chatbot-panel"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className={styles.panel}
          >
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerMascotWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mascotSrc} alt="Pulse mascot" className={styles.headerMascot} />
              </div>

              <div className={styles.headerText}>
                <div className={styles.headerTitle}>NeuroPulse AI</div>
                <div className={styles.headerSubtitle}>
                  {lang === 'id' ? 'Teman ADHD-mu' : 'Your ADHD companion'}
                </div>
              </div>

              <button
                id="companion-chatbot-close"
                onClick={() => setIsOpen(false)}
                className={styles.closeBtn}
                aria-label="Tutup chat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className={styles.messages}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className={`${styles.messageRow} ${msg.role === 'user' ? styles.messageRowUser : styles.messageRowModel}`}
                >
                  {msg.role === 'model' && (
                    <div className={styles.messageAvatar}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mascotSrc} alt="" className={styles.messageAvatarImg} />
                    </div>
                  )}
                  <div className={`${styles.bubble} ${msg.role === 'user' ? styles.bubbleUser : styles.bubbleModel}`}>
                    {formatContent(msg.content)}
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.25 }}
                    className={styles.typingRow}
                  >
                    <div className={styles.messageAvatar}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mascotSrc} alt="" className={styles.messageAvatarImg} />
                    </div>
                    <div className={styles.typingBubble}>
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className={styles.typingDot}
                          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={bottomRef} />
            </div>

            {/* Quick Prompts — shown only when no user messages yet */}
            {messages.filter((m) => m.role === 'user').length === 0 && !isTyping && (
              <div className={styles.quickPrompts}>
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className={styles.quickPromptBtn}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <div className={styles.inputArea}>
              <div className={styles.inputRow}>
                <textarea
                  ref={inputRef}
                  id="companion-chatbot-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={lang === 'id' ? 'Ketik pesan...' : 'Type a message...'}
                  rows={1}
                  disabled={isTyping}
                  className={styles.textarea}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
                  }}
                />
                <motion.button
                  id="companion-chatbot-send"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isTyping}
                  whileTap={{ scale: 0.9 }}
                  className={styles.sendBtn}
                  style={{
                    background:
                      input.trim() && !isTyping
                        ? 'linear-gradient(135deg, #818CF8, #67E8F9)'
                        : 'rgba(196, 213, 255, 0.4)',
                    boxShadow: input.trim() && !isTyping ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                  }}
                  aria-label="Kirim pesan"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={input.trim() && !isTyping ? 'white' : '#A5B4FC'}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </motion.button>
              </div>
              <p className={styles.inputHint}>
                {lang === 'id' ? 'Enter kirim · Shift+Enter baris baru' : 'Enter to send · Shift+Enter for new line'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
