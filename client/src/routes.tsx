import type { RouteObject } from 'react-router';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';

/**
 * Every page the app has. Shared by the browser router (`main.tsx`) and the
 * memory router in tests. Feature slices add their routes here:
 * `/products/:id` (F4), `/categories/:slug` (F2), `/search` (F3), `/products/:id/enquire` (F5).
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
