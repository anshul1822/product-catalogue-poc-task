import type { RouteObject } from 'react-router';
import { Layout } from './components/Layout';
import { CategoryPage } from './pages/CategoryPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProductPage } from './pages/ProductPage';

/**
 * Every page the app has. Shared by the browser router (`main.tsx`) and the
 * memory router in tests. Feature slices add their routes here:
 * `/search` (F3), `/products/:id/enquire` (F5).
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'products/:id', element: <ProductPage /> },
      { path: 'categories/:slug', element: <CategoryPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
