/**
 * Prisma CLI configuration (prisma generate, prisma migrate). Not used by the
 * running server, which reads DATABASE_URL through src/config.ts.
 *
 * `prisma generate` needs no database. `prisma migrate` reads DATABASE_URL from
 * the environment; the placeholder below only keeps generate working without one.
 */
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env['DATABASE_URL'] ?? 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
});
