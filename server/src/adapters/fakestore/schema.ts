import { z } from 'zod';

/**
 * Shape of a Fake Store product (https://fakestoreapi.com/products).
 * Validated on every response instead of trusted. Unknown keys are dropped.
 * This type must not be imported outside `adapters/fakestore/`.
 */
export const fakeStoreProductSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().trim().min(1),
  price: z.number().nonnegative(),
  description: z.string(),
  category: z.string().trim().min(1),
  image: z.url({ protocol: /^https?$/ }),
  rating: z
    .object({
      rate: z.number().min(0).max(5),
      count: z.number().int().nonnegative(),
    })
    .optional(),
});

export const fakeStoreProductListSchema = z.array(fakeStoreProductSchema);

export type FakeStoreProduct = z.infer<typeof fakeStoreProductSchema>;
