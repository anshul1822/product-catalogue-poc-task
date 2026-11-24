import { Link, useParams } from 'react-router';
import { getCategoryPage } from '../api/catalogue';
import type { Product } from '../api/types';
import { useApiData } from '../api/useApiData';
import { ProductGrid } from '../components/ProductGrid';
import { ErrorState, LoadingState } from '../components/StatusMessages';
import styles from './CategoryPage.module.css';

/**
 * F2: a category's "top rated" products and the rest, at /categories/:slug.
 * The server decides what "top rated" means (D3); a section with no products is hidden.
 */
export function CategoryPage() {
  const slug = useParams().slug ?? '';
  const page = useApiData(`category/${slug}`, (signal) => getCategoryPage(slug, signal));

  if (page.status === 'loading') {
    return <LoadingState label="Loading category…" />;
  }

  if (page.status === 'error') {
    return page.error.status === 404 ? (
      <CategoryNotFound />
    ) : (
      <ErrorState message={page.error.message} onRetry={page.retry} />
    );
  }

  const { category, topRated, others } = page.data;
  return (
    <div className={styles.page}>
      <h1>{category.name}</h1>
      <ProductSection id="top-rated" heading={`Top rated in ${category.name}`} products={topRated} />
      <ProductSection id="more" heading={`More in ${category.name}`} products={others} />
    </div>
  );
}

function ProductSection({ id, heading, products }: { id: string; heading: string; products: readonly Product[] }) {
  if (products.length === 0) {
    return null;
  }
  const headingId = `${id}-heading`;
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId}>{heading}</h2>
      <ProductGrid products={products} label={heading} />
    </section>
  );
}

function CategoryNotFound() {
  return (
    <section aria-labelledby="category-not-found-heading">
      <h1 id="category-not-found-heading">Category not found</h1>
      <p>
        This category does not exist. <Link to="/">Go to the home page</Link>.
      </p>
    </section>
  );
}
