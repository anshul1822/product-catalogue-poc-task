import { Link, Outlet } from 'react-router';
import styles from './Layout.module.css';

/**
 * The frame around every page. Feature slices add to the header: category
 * links (F2) and the search form (F3).
 */
export function Layout() {
  return (
    <>
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link to="/" className={styles.brand}>
            Product catalogue
          </Link>
        </div>
      </header>
      <main id="main" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <div className={styles.inner}>Proof of concept. Product data from the Fake Store API.</div>
      </footer>
    </>
  );
}
