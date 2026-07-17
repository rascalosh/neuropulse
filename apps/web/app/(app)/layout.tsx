import Nav from '../../components/Nav';
import TopBar from '../../components/TopBar';
import CompanionChatbot from '../../components/CompanionChatbot';
import styles from './layout.module.css';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.root}>
      <Nav />
      <div className={styles.mainWrap}>
        <TopBar />
        <main className={styles.main}>{children}</main>
      </div>
      <CompanionChatbot />
    </div>
  );
}
