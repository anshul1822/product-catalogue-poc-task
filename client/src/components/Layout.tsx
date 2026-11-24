import { Link, Outlet } from 'react-router';
import { CategoryNav } from './CategoryNav';
import styles from './Layout.module.css';

/**
 * The frame around every page: brand link and category links (F2) in the header.
 * Slice F3 adds the search form to the header.
 */
export function Layout() {
  return (
    <>
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={`${styles.inner} ${styles.headerInner}`}>
          <Link to="/" className={styles.brand}>
            Product catalogue
          </Link>
          <CategoryNav />
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
