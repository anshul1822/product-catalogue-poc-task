import { Link, Outlet } from 'react-router';
import { CategoryNav } from './CategoryNav';
import styles from './Layout.module.css';
import { SearchForm } from './SearchForm';

/** The frame around every page: brand link, category links (F2) and the search bar (F3) in the header. */
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
          <SearchForm />
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
