/**
 * SMS Server — entry point.
 *
 * WHY the tsx loader is registered here:
 *   Prisma v7 generates a TypeScript-native client (generated/prisma/client.ts).
 *   Registering tsx/esm as a Node.js module loader before any dynamic imports
 *   lets ordinary .js files import .ts files at runtime without a build step.
 *   This registration only affects modules loaded AFTER this call.
 */

import 'dotenv/config';
import { register } from 'tsx/esm/api';

// Register tsx so subsequent dynamic imports can resolve .ts files.
// Prisma v7 generates a TypeScript-native client — this avoids a build step.
register();

// Dynamic imports below happen AFTER tsx is active — .ts imports work from here on.
const { default: app }   = await import('./app.js');
const { prisma }         = await import('./lib/prisma.js');

// ── Database connection ───────────────────────────────────────
await prisma.$connect();

// ── Start HTTP server ─────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`SMS Server running on port ${PORT}`);
});

// ── Graceful shutdown ─────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully…`);
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
