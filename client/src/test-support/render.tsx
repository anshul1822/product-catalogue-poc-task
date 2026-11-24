import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { Product } from '../api/types';
import { routes } from '../routes';

/** Renders the real app routes at `path`, as if the user had opened that URL. */
export function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return { router, ...render(<RouterProvider router={router} />) };
}

/** Renders one component inside a router, for components that contain links. */
export function renderWithRouter(ui: ReactElement) {
  const router = createMemoryRouter([{ path: '*', element: ui }], { initialEntries: ['/'] });
  return { router, ...render(<RouterProvider router={router} />) };
}

/** A product for component tests; override only what the test cares about. */
export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: '3',
    title: 'Mens Cotton Jacket',
    description: 'Great outerwear jackets for Spring, Autumn and Winter.',
    price: 55.99,
    imageUrl: 'https://images.test/jacket.png',
    category: { slug: 'mens-clothing', name: "Men's Clothing" },
    rating: { rate: 4.7, count: 500 },
    ...overrides,
  };
}
