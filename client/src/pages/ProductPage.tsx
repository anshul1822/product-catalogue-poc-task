import { Link, useParams } from 'react-router';
import { getProduct } from '../api/catalogue';
import type { Product } from '../api/types';
import { useApiData } from '../api/useApiData';
import { Price } from '../components/Price';
import { ErrorState, LoadingState } from '../components/StatusMessages';
import styles from './ProductPage.module.css';

/** F4: the details page a product tile links to, at /products/:id. */
export function ProductPage() {
  const id = useParams().id ?? '';
  const product = useApiData(`product/${id}`, (signal) => getProduct(id, signal));

  if (product.status === 'loading') {
    return <LoadingState label="Loading product…" />;
  }

  if (product.status === 'error') {
    return product.error.status === 404 ? (
      <ProductNotFound />
    ) : (
      <ErrorState message={product.error.message} onRetry={product.retry} />
    );
  }

  return <ProductDetails product={product.data} />;
}

function ProductDetails({ product }: { product: Product }) {
  return (
    <article className={styles.product} aria-labelledby="product-title">
      <div className={styles.imageBox}>
        <img src={product.imageUrl} alt={product.title} className={styles.image} />
      </div>
      <div className={styles.details}>
        <p className={styles.category}>
          <Link to={`/categories/${encodeURIComponent(product.category.slug)}`}>{product.category.name}</Link>
        </p>
        <h1 id="product-title">{product.title}</h1>
        <Price amount={product.price} className={styles.price} />
        <p className={styles.rating}>{ratingText(product.rating)}</p>
        <h2 className="visually-hidden">Description</h2>
        <p className={styles.description}>{product.description}</p>
      </div>
    </article>
  );
}

function ProductNotFound() {
  return (
    <section aria-labelledby="product-not-found-heading">
      <h1 id="product-not-found-heading">Product not found</h1>
      <p>
        This product does not exist or is no longer available. <Link to="/">Go to the home page</Link>.
      </p>
    </section>
  );
}

function ratingText(rating: Product['rating']): string {
  if (rating === null) {
    return 'No ratings yet';
  }
  const ratings = rating.count === 1 ? 'rating' : 'ratings';
  return `Rated ${rating.rate.toFixed(1)} out of 5 (${rating.count.toLocaleString('en-AU')} ${ratings})`;
}
