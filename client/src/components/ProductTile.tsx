import { Link } from 'react-router';
import type { Product } from '../api/types';
import { Price } from './Price';
import styles from './ProductTile.module.css';

/**
 * A product card. The whole tile is one link to the product page (F4).
 * The image has empty alt text because the title right below says the same:
 * a screen reader announces the link once, as "{title} {price}".
 */
export function ProductTile({ product }: { product: Product }) {
  return (
    <Link to={`/products/${encodeURIComponent(product.id)}`} className={styles.tile}>
      <img src={product.imageUrl} alt="" loading="lazy" className={styles.image} />
      <span className={styles.title}>{product.title}</span>{' '}
      {/* The space keeps the link's spoken name "{title} {price}", not "{title}{price}"; flex layout hides it visually. */}
      <Price amount={product.price} className={styles.price} />
    </Link>
  );
}
