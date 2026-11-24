import type { ReactNode } from 'react';
import styles from './StatusMessages.module.css';

/** Shown while data loads; announced politely to screen readers. */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <p role="status" className={styles.message}>
      {label}
    </p>
  );
}

/** Shown when a request fails; announced immediately, with an optional retry. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className={`${styles.message} ${styles.error}`}>
      <p>{message}</p>
      {onRetry === undefined ? null : (
        <button type="button" onClick={onRetry} className={styles.button}>
          Try again
        </button>
      )}
    </div>
  );
}

/** Shown when a request succeeds but there is nothing to list. */
export function EmptyState({ children }: { children: ReactNode }) {
  return <p className={styles.message}>{children}</p>;
}
