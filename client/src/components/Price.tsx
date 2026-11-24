/**
 * Prices in Australian dollars. The source data has no currency, so AUD is an
 * assumption (decision D-03); changing it is this one formatter.
 */
const formatter = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });

export function formatPrice(amount: number): string {
  return formatter.format(amount);
}

export function Price({ amount, className }: { amount: number; className?: string | undefined }) {
  return <span className={className}>{formatPrice(amount)}</span>;
}
