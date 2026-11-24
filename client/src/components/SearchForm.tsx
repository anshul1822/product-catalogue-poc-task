import { type FormEvent, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { MAX_SEARCH_TERM_LENGTH } from '../api/catalogue';
import styles from './SearchForm.module.css';

/**
 * F3: the search bar in the header. A real form, so the Search button and the
 * Enter key both submit. It goes to /search?q=term; a blank term does nothing.
 * On the results page the box shows the current term, so it can be refined.
 */
export function SearchForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  const currentTerm = location.pathname === '/search' ? (new URLSearchParams(location.search).get('q') ?? '') : '';

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = (inputRef.current?.value ?? '').trim();
    if (term === '') {
      inputRef.current?.focus();
      return;
    }
    void navigate(`/search?${new URLSearchParams({ q: term }).toString()}`);
  };

  return (
    <form role="search" className={styles.form} onSubmit={onSubmit}>
      <label htmlFor="search-term" className="visually-hidden">
        Search products
      </label>
      {/* Keyed by the term in the URL, so the box follows the page (cleared when leaving search). */}
      <input
        key={currentTerm}
        ref={inputRef}
        id="search-term"
        name="q"
        type="search"
        defaultValue={currentTerm}
        maxLength={MAX_SEARCH_TERM_LENGTH}
        placeholder="Search products"
        autoComplete="off"
        className={styles.input}
      />
      <button type="submit" className={styles.button}>
        Search
      </button>
    </form>
  );
}
