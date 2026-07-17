'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';
import { useLang } from '../../contexts/providers';
import { IconMoon, IconSun, IconArrowLeft } from '../../components/Icons';
import styles from './login.module.css';

const LOGIN_TRANSLATIONS = {
  id: {
    title: 'Selamat Datang di NeuroPulse',
    subtitle: 'Ruang aman untuk mengelola fokus, energi, dan emosi ADHD-mu.',
    googleButton: 'Masuk dengan Google',
    loading: 'Menghubungkan...',
    errorTitle: 'Terjadi Kesalahan',
    errorCodeExchange: 'Gagal menukar kode otentikasi. Silakan coba lagi.',
    generalError: 'Gagal melakukan login. Silakan hubungi admin.',
    footer: 'Dirancang khusus untuk membantu otak neurodivergen berkembang.',
    
    // Manual Auth additions
    signInTab: 'Masuk',
    signUpTab: 'Daftar',
    emailLabel: 'Alamat Email',
    emailPlaceholder: 'nama@domain.com',
    passwordLabel: 'Kata Sandi',
    passwordPlaceholder: 'Masukkan kata sandi',
    usernameLabel: 'Nama Pengguna',
    usernamePlaceholder: 'Panggilan (min. 3 karakter)',
    confirmPasswordLabel: 'Konfirmasi Kata Sandi',
    confirmPasswordPlaceholder: 'Masukkan ulang kata sandi',
    signInButton: 'Masuk Akun',
    signUpButton: 'Daftar Akun',
    noAccount: 'Belum punya akun?',
    haveAccount: 'Sudah punya akun?',
    orDivider: 'atau',
    
    // Validations & success
    valUsernameShort: 'Nama pengguna harus minimal 3 karakter.',
    valEmailInvalid: 'Format email tidak valid.',
    valPasswordWeak: 'Kata sandi tidak memenuhi semua kriteria keamanan.',
    valPasswordMismatch: 'Konfirmasi kata sandi tidak cocok.',
    successRegisterVerify: 'Registrasi berhasil! Silakan periksa kotak masuk email Anda untuk verifikasi.',
    successRegisterDirect: 'Registrasi berhasil! Mengalihkan...',
    
    // Password criteria Checklist
    critLength: 'Minimal 8 karakter',
    critUpper: 'Minimal 1 huruf besar (A-Z)',
    critLower: 'Minimal 1 huruf kecil (a-z)',
    critNumber: 'Minimal 1 angka (0-9)',
    critSpecial: 'Minimal 1 karakter khusus (!@#$%^&*)',
  },
  en: {
    title: 'Welcome to NeuroPulse',
    subtitle: 'A safe space to manage your focus, energy, and ADHD emotions.',
    googleButton: 'Sign in with Google',
    loading: 'Connecting...',
    errorTitle: 'Something went wrong',
    errorCodeExchange: 'Failed to exchange authentication code. Please try again.',
    generalError: 'Failed to log in. Please try again.',
    footer: 'Designed specifically to help neurodivergent brains thrive.',
    
    // Manual Auth additions
    signInTab: 'Sign In',
    signUpTab: 'Sign Up',
    emailLabel: 'Email Address',
    emailPlaceholder: 'name@domain.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    usernameLabel: 'Username',
    usernamePlaceholder: 'Name (min. 3 characters)',
    confirmPasswordLabel: 'Confirm Password',
    confirmPasswordPlaceholder: 'Re-enter your password',
    signInButton: 'Sign In',
    signUpButton: 'Sign Up',
    noAccount: "Don't have an account?",
    haveAccount: 'Already have an account?',
    orDivider: 'or',
    
    // Validations & success
    valUsernameShort: 'Username must be at least 3 characters.',
    valEmailInvalid: 'Invalid email format.',
    valPasswordWeak: 'Password does not meet all safety requirements.',
    valPasswordMismatch: 'Password confirmation does not match.',
    successRegisterVerify: 'Registration successful! Please check your email inbox to verify.',
    successRegisterDirect: 'Registration successful! Redirecting...',
    
    // Password criteria Checklist
    critLength: 'At least 8 characters',
    critUpper: 'At least 1 uppercase letter (A-Z)',
    critLower: 'At least 1 lowercase letter (a-z)',
    critNumber: 'At least 1 number (0-9)',
    critSpecial: 'At least 1 special character (!@#$%^&*)',
  },
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, setLang } = useLang();
  
  // Tab view: 'signin' | 'signup'
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  
  // Form inputs
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const t = LOGIN_TRANSLATIONS[lang] || LOGIN_TRANSLATIONS.id;

  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('neuropulse-theme');
    const initial = saved === 'dark' ? 'dark' : 'light';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('neuropulse-theme', next);
  };

  // Real-time password criteria verification
  const criteria = {
    hasLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'auth-code-exchange-failed') {
      setErrorMessage(t.errorCodeExchange);
    }
  }, [searchParams, t]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMessage(err.message || t.generalError);
      setLoading(false);
    }
  };

  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    try {
      const supabase = createClient();

      if (mode === 'signup') {
        // Sign Up validations
        if (username.trim().length < 3) {
          throw new Error(t.valUsernameShort);
        }
        if (!emailRegex.test(email)) {
          throw new Error(t.valEmailInvalid);
        }
        const isPasswordStrong = Object.values(criteria).every(Boolean);
        if (!isPasswordStrong) {
          throw new Error(t.valPasswordWeak);
        }
        if (password !== passwordConfirm) {
          throw new Error(t.valPasswordMismatch);
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: username.trim(),
            },
          },
        });

        if (error) throw error;

        // If session exists immediately (no email verification needed)
        if (data.session) {
          setSuccessMessage(t.successRegisterDirect);
          setTimeout(() => {
            router.push('/');
          }, 1500);
        } else {
          setSuccessMessage(t.successRegisterVerify);
          // Clear inputs
          setUsername('');
          setEmail('');
          setPassword('');
          setPasswordConfirm('');
          setLoading(false);
        }
      } else {
        // Sign In validations
        if (!emailRegex.test(email)) {
          throw new Error(t.valEmailInvalid);
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.push('/');
      }
    } catch (err: any) {
      setErrorMessage(err.message || t.generalError);
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.glowBlob1} aria-hidden="true" />
      <div className={styles.glowBlob2} aria-hidden="true" />

      <div className={styles.backWrapper}>
        <button type="button" className={styles.backBtn} onClick={() => router.push('/')}>
          <IconArrowLeft size={15} />
          {lang === 'id' ? 'Beranda' : 'Home'}
        </button>
      </div>

      <div className={styles.langWrapper}>
        <div className={styles.langToggle} role="group" aria-label="Language switcher">
          <button
            className={`${styles.langBtn} ${lang === 'id' ? styles.langActive : ''}`}
            onClick={() => setLang('id')}
            aria-pressed={lang === 'id'}
            lang="id"
          >
            ID
          </button>
          <button
            className={`${styles.langBtn} ${lang === 'en' ? styles.langActive : ''}`}
            onClick={() => setLang('en')}
            aria-pressed={lang === 'en'}
            lang="en"
          >
            EN
          </button>
        </div>
        <button
          type="button"
          className={styles.themeBtn}
          onClick={toggleTheme}
          aria-pressed={theme === 'dark'}
          aria-label={
            theme === 'dark'
              ? lang === 'id' ? 'Ganti ke mode terang' : 'Switch to light mode'
              : lang === 'id' ? 'Ganti ke mode gelap' : 'Switch to dark mode'
          }
          title={
            theme === 'dark'
              ? lang === 'id' ? 'Mode terang' : 'Light mode'
              : lang === 'id' ? 'Mode gelap' : 'Dark mode'
          }
        >
          {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.logoSection}>
          <div className={styles.logoBadge} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className={styles.logoImg} />
          </div>
          <h1 className={styles.brandTitle}>NeuroPulse</h1>
        </div>

        <div className={styles.headerText}>
          <h2 className={styles.title}>{t.title}</h2>
          <p className={styles.subtitle}>{t.subtitle}</p>
        </div>

        {/* Tab Selector */}
        <div className={styles.tabContainer}>
          <button
            type="button"
            className={`${styles.tabBtn} ${mode === 'signin' ? styles.tabActive : ''}`}
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
          >
            {t.signInTab}
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${mode === 'signup' ? styles.tabActive : ''}`}
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
          >
            {t.signUpTab}
          </button>
        </div>

        {errorMessage && (
          <div className={styles.errorBox} role="alert">
            <strong className={styles.errorHeader}>{t.errorTitle}</strong>
            <p className={styles.errorText}>{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className={styles.successBox} role="alert">
            <p className={styles.successText}>{successMessage}</p>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleManualAuth} className={styles.form}>
          {mode === 'signup' && (
            <div className={styles.inputGroup}>
              <label htmlFor="username" className={styles.label}>{t.usernameLabel}</label>
              <input
                id="username"
                type="text"
                required
                className={styles.input}
                placeholder={t.usernamePlaceholder}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>{t.emailLabel}</label>
            <input
              id="email"
              type="email"
              required
              className={styles.input}
              placeholder={t.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>{t.passwordLabel}</label>
            <input
              id="password"
              type="password"
              required
              className={styles.input}
              placeholder={t.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {mode === 'signup' && (
            <>
              {/* Password strength checklist */}
              <div className={styles.criteriaChecklist}>
                <div className={`${styles.criteriaItem} ${criteria.hasLength ? styles.criteriaValid : ''}`}>
                  <span className={styles.criteriaDot}>●</span> {t.critLength}
                </div>
                <div className={`${styles.criteriaItem} ${criteria.hasUpper ? styles.criteriaValid : ''}`}>
                  <span className={styles.criteriaDot}>●</span> {t.critUpper}
                </div>
                <div className={`${styles.criteriaItem} ${criteria.hasLower ? styles.criteriaValid : ''}`}>
                  <span className={styles.criteriaDot}>●</span> {t.critLower}
                </div>
                <div className={`${styles.criteriaItem} ${criteria.hasNumber ? styles.criteriaValid : ''}`}>
                  <span className={styles.criteriaDot}>●</span> {t.critNumber}
                </div>
                <div className={`${styles.criteriaItem} ${criteria.hasSpecial ? styles.criteriaValid : ''}`}>
                  <span className={styles.criteriaDot}>●</span> {t.critSpecial}
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="passwordConfirm" className={styles.label}>{t.confirmPasswordLabel}</label>
                <input
                  id="passwordConfirm"
                  type="password"
                  required
                  className={styles.input}
                  placeholder={t.confirmPasswordPlaceholder}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  disabled={loading}
                />
              </div>
            </>
          )}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <span className={styles.spinner} aria-hidden="true" /> : (mode === 'signin' ? t.signInButton : t.signUpButton)}
          </button>
        </form>

        {mode === 'signin' && (
          <>
            <div className={styles.divider}>
              <span className={styles.dividerLine} />
              <span className={styles.dividerText}>{t.orDivider}</span>
              <span className={styles.dividerLine} />
            </div>

            <div className={styles.buttonZone}>
              <button
                id="google-login-btn"
                className={styles.googleBtn}
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <svg className={styles.googleIcon} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.62-.63-1.03-1.37-1.21-2.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className={styles.btnText}>{t.googleButton}</span>
              </button>
            </div>
          </>
        )}

        <div className={styles.toggleModeText}>
          {mode === 'signin' ? (
            <p>
              {t.noAccount}{' '}
              <button type="button" className={styles.linkBtn} onClick={() => setMode('signup')}>
                {t.signUpTab}
              </button>
            </p>
          ) : (
            <p>
              {t.haveAccount}{' '}
              <button type="button" className={styles.linkBtn} onClick={() => setMode('signin')}>
                {t.signInTab}
              </button>
            </p>
          )}
        </div>

        <footer className={styles.footer}>
          <p>{t.footer}</p>
        </footer>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <p style={{ color: 'var(--color-text-sub)', fontWeight: 600 }}>Loading...</p>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
