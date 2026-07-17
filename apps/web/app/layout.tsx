import type { Metadata } from 'next';
import './globals.css';
import './globals-omnifocus.css';
import { LangProvider, A11yProvider } from '../contexts/providers';
import AccessibilityPanel from '../components/AccessibilityPanel';
import ReadingAids from '../components/ReadingAids';

export const metadata: Metadata = {
  title: 'NeuroPulse — Ready when you are 💛',
  description: 'Aplikasi produktivitas untuk otak ADHD. Task decomposer, focus mirror, mood tracker — dirancang khusus untukmu.',
  keywords: ['ADHD', 'produktivitas', 'NeuroPulse', 'task management'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning={true}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning={true}>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <LangProvider>
          <A11yProvider>
            {children}
            <AccessibilityPanel />
            <ReadingAids />
          </A11yProvider>
        </LangProvider>
      </body>
    </html>
  );
}
