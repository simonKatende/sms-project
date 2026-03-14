/**
 * Prisma client singleton.
 *
 * Imported AFTER tsx is registered in server.js, so the .ts extension
 * import below is handled transparently at runtime by the tsx loader.
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.ts';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
