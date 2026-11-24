import { NavLink } from 'react-router';
import { getCategories } from '../api/catalogue';
import { useApiData } from '../api/useApiData';
import styles from './CategoryNav.module.css';

/**
 * F2: the category links in the header. Loaded once, when the app opens.
 * While loading, or if the categories cannot be loaded, the header shows no
 * links rather than an error: the page below shows its own error, and the
 * header must not get in the way of it.
 */
export function CategoryNav() {
  const categories = useApiData('categories', getCategories);

  if (categories.status !== 'success' || categories.data.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Categories" className={styles.nav}>
      <ul className={styles.list}>
        {categories.data.map((category) => (
          <li key={category.slug}>
            {/* NavLink marks the current category with aria-current="page". */}
            <NavLink
              to={`/categories/${encodeURIComponent(category.slug)}`}
              className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
            >
              {category.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
