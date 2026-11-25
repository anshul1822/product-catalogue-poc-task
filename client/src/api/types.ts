/**
 * The API's response shapes, mirroring the server's domain model
 * (server/src/domain/product.ts). The client never sees Fake Store's shape.
 */

export interface Category {
  readonly slug: string;
  readonly name: string;
}

export interface Rating {
  readonly rate: number;
  readonly count: number;
}

export interface Product {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly price: number;
  readonly imageUrl: string;
  readonly category: Category;
  readonly rating: Rating | null;
}

/** F2: what `GET /api/categories/:slug/products` returns (server/src/domain/category-page.ts). */
export interface CategoryPage {
  readonly category: Category;
  readonly topRated: Product[];
  readonly others: Product[];
}

/** The one error shape every API endpoint returns (server/src/http/errors.ts). */
export interface ApiErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
}
