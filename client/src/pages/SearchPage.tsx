import { useSearchParams } from 'react-router';
import { searchProducts } from '../api/catalogue';
import { useApiData } from '../api/useApiData';
import { ProductGrid } from '../components/ProductGrid';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusMessages';

/**
 * F3: the results page at /search?q=term. The server decides what matches
 * (`matchesSearch`); this page shows exactly what it returns. With no term in
 * the URL it asks for one and makes no request.
 */
export function SearchPage() {
  const term = (useSearchParams()[0].get('q') ?? '').trim();

  if (term === '') {
    return (
      <section aria-labelledby="search-heading">
        <h1 id="search-heading">Search</h1>
        <EmptyState>Enter a search term in the search bar to find products.</EmptyState>
      </section>
    );
  }

  return <SearchResults term={term} />;
}

function SearchResults({ term }: { term: string }) {
  const results = useApiData(`search/${term}`, (signal) => searchProducts(term, signal));
  const quoted = `“${term}”`;

  return (
    <section aria-labelledby="search-heading">
      <h1 id="search-heading">Search results for {quoted}</h1>
      {results.status === 'loading' ? <LoadingState label="Searching…" /> : null}
      {results.status === 'error' ? (
        // A 400 (e.g. a term over 100 characters typed into the URL) will not change on retry.
        <ErrorState
          message={results.error.message}
          {...(results.error.status === 400 ? {} : { onRetry: results.retry })}
        />
      ) : null}
      {results.status === 'success' && results.data.length === 0 ? (
        <EmptyState>No products match {quoted}. Try a different word.</EmptyState>
      ) : null}
      {results.status === 'success' && results.data.length > 0 ? (
        <>
          <p role="status">
            {results.data.length === 1 ? '1 product matches' : `${results.data.length} products match`}
          </p>
          <ProductGrid products={results.data} label={`Search results for ${quoted}`} />
        </>
      ) : null}
    </section>
  );
}
