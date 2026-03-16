/**
 * Express application factory.
 * Middleware, routes, and error handling live here.
 * Database connection and server startup are handled in server.js.
 */

import path    from 'path';
import express from 'express';
import cors    from 'cors';
import morgan  from 'morgan';
import authRoutes          from './routes/authRoutes.js';
import pupilRoutes         from './routes/pupilRoutes.js';
import adminSettingsRoutes from './routes/adminSettingsRoutes.js';
import houseRoutes         from './routes/houseRoutes.js';
import { classRouter, streamRouter, schoolSectionRouter, academicYearRouter }
  from './routes/classStreamRoutes.js';
import { academicYearAdminRouter, termAdminRouter }
  from './routes/academicCalendarRoutes.js';
import { classGroupRouter, classSubGroupRouter, classHierarchyRouter }
  from './routes/classHierarchyRoutes.js';
import userManagementRoutes from './routes/userManagementRoutes.js';
import { subjectRouter, classSubjectAssignmentRouter } from './routes/subjectRoutes.js';
import { subjectSectionRulesRouter, gradingScaleRouter } from './routes/gradingConfigRoutes.js';
import { assessmentTypeRouter, reportCardSettingsRouter } from './routes/reportCardConfigRoutes.js';

const app = express();

// ── Core middleware ──────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Static file serving — uploaded files (logos, etc.) ───────
const STORAGE_PATH = path.resolve(process.env.STORAGE_PATH ?? './storage');
app.use('/storage', express.static(STORAGE_PATH));

// ── API routes ────────────────────────────────────────────────
app.use('/api/v1/auth',            authRoutes);
app.use('/api/v1/pupils',          pupilRoutes);
app.use('/api/v1/admin/settings',  adminSettingsRoutes);
app.use('/api/v1/admin/houses',    houseRoutes);
app.use('/api/v1/classes',         classRouter);
app.use('/api/v1/streams',         streamRouter);
app.use('/api/v1/school-sections', schoolSectionRouter);
app.use('/api/v1/academic-years',       academicYearRouter);
app.use('/api/v1/admin/academic-years',  academicYearAdminRouter);
app.use('/api/v1/admin/terms',           termAdminRouter);
app.use('/api/v1/admin/class-groups',    classGroupRouter);
app.use('/api/v1/admin/class-sub-groups', classSubGroupRouter);
app.use('/api/v1/admin/class-hierarchy', classHierarchyRouter);
app.use('/api/v1/admin/users',                    userManagementRoutes);
app.use('/api/v1/admin/subjects',                 subjectRouter);
app.use('/api/v1/admin/class-subject-assignments', classSubjectAssignmentRouter);
app.use('/api/v1/admin/subject-section-rules',    subjectSectionRulesRouter);
app.use('/api/v1/admin/grading-scale',            gradingScaleRouter);
app.use('/api/v1/admin/assessment-types',         assessmentTypeRouter);
app.use('/api/v1/admin/report-card-settings',     reportCardSettingsRouter);

// ── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ── 404 handler ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ─────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status ?? err.statusCode ?? 500;
  res.status(status).json({ error: err.message ?? 'Internal server error' });
});

export default app;
