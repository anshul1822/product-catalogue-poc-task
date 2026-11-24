import { Router } from 'express';
import { z } from 'zod';
import { MAX_SEARCH_TERM_LENGTH } from '../../domain/search.js';
import type { CatalogueService } from '../../services/catalogue-service.js';
import { ApiError } from '../errors.js';

/**
 * The query string of `GET /api/search`: exactly one `q`, 1 to
 * MAX_SEARCH_TERM_LENGTH characters once trimmed. A repeated `q` arrives as an
 * array and is rejected, so the term is never ambiguous.
 */
const searchQuerySchema = z.object({
  q: z
    .string({ error: 'Enter a search term.' })
    .trim()
    .min(1, 'Enter a search term.')
    .max(MAX_SEARCH_TERM_LENGTH, `Use at most ${MAX_SEARCH_TERM_LENGTH} characters.`),
});

/**
 * F3. `GET /api/search?q=term`: the products whose text matches the term, in source
 * order (an empty list when nothing matches). A missing, blank, repeated or too
 * long `q` is 400 `INVALID_SEARCH_TERM` and never reaches the product source.
 */
export function searchRoutes(catalogue: CatalogueService): Router {
  const router = Router();
  router.get('/search', async (req, res) => {
    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Enter a search term.';
      throw new ApiError(400, 'INVALID_SEARCH_TERM', message, { field: 'q' });
    }
    res.json(await catalogue.search(parsed.data.q));
  });
  return router;
}
