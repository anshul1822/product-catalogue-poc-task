import { Router } from 'express';

/**
 * `GET /api/health`: liveness for Docker and load balancers. It deliberately does
 * not call Fake Store, so an upstream outage does not get the container restarted.
 */
export function healthRoutes(): Router {
  const router = Router();
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  return router;
}
