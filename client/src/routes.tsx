import type { RouteObject } from 'react-router';
import { Layout } from './components/Layout';
import { CategoryPage } from './pages/CategoryPage';
import { EnquirePage } from './pages/EnquirePage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProductPage } from './pages/ProductPage';
import { SearchPage } from './pages/SearchPage';

/** Every page the app has. Shared by the browser router (`main.tsx`) and the memory router in tests. */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'products/:id', element: <ProductPage /> },
      { path: 'products/:id/enquire', element: <EnquirePage /> },
      { path: 'categories/:slug', element: <CategoryPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
