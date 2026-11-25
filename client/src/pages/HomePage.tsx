import { getFeaturedProducts } from '../api/catalogue';
import { useApiData } from '../api/useApiData';
import { ProductGrid } from '../components/ProductGrid';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusMessages';

/** F1: the home page shows the 5 products the owner chose as "top rated". */
export function HomePage() {
  const featured = useApiData('featured-products', getFeaturedProducts);

  return (
    <section aria-labelledby="top-rated-heading">
      <h1 id="top-rated-heading">Top rated products</h1>
      {featured.status === 'loading' ? <LoadingState label="Loading top rated products…" /> : null}
      {featured.status === 'error' ? <ErrorState message={featured.error.message} onRetry={featured.retry} /> : null}
      {featured.status === 'success' && featured.data.length === 0 ? (
        <EmptyState>There are no top rated products right now.</EmptyState>
      ) : null}
      {featured.status === 'success' && featured.data.length > 0 ? (
        <ProductGrid products={featured.data} label="Top rated products" />
      ) : null}
    </section>
  );
}
