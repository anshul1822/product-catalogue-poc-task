import { Link } from 'react-router';

/** Any URL that matches no page. */
export function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-heading">
      <h1 id="not-found-heading">Page not found</h1>
      <p>
        The page you are looking for does not exist. <Link to="/">Go to the home page</Link>.
      </p>
    </section>
  );
}
