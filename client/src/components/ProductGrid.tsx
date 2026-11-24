import type { Product } from '../api/types';
import styles from './ProductGrid.module.css';
import { ProductTile } from './ProductTile';

/** A responsive grid of product tiles, as a list so screen readers announce the count. */
export function ProductGrid({ products, label }: { products: readonly Product[]; label: string }) {
  return (
    <ul className={styles.grid} aria-label={label}>
      {products.map((product) => (
        <li key={product.id}>
          <ProductTile product={product} />
        </li>
      ))}
    </ul>
  );
}
