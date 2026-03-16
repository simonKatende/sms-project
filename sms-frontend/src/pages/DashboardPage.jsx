/**
 * DashboardPage — role-aware KPI overview.
 *
 * Cards are filtered by role. Data is currently mocked; a real
 * /api/v1/dashboard/stats endpoint should be built in Sprint 3+.
 *
 * Colour semantics:
 *   Teal  #148F77 — good / paid / complete
 *   Amber #F39C12 — pending / in-progress
 *   Red   #C0392B — overdue / error
 *   Blue  #2471A3 — info / primary
 */

import { useAuthStore } from '../store/authStore.js';

// ── KPI card definitions (role-filtered) ─────────────────────
const KPI_CARDS = [
  // system_admin / head_teacher cards
  {
    id:       'total-pupils',
    label:    'Total Pupils',
    value:    '—',
    trend:    null,
    colour:   '#2471A3',
    bg:       '#EBF5FB',
    roles:    ['system_admin', 'head_teacher', 'dos'],
  },
  {
    id:       'active-staff',
    label:    'Active Staff',
    value:    '—',
    trend:    null,
    colour:   '#2471A3',
    bg:       '#EBF5FB',
    roles:    ['system_admin', 'head_teacher'],
  },
  {
    id:       'current-term',
    label:    'Current Term',
    value:    '—',
    trend:    null,
    colour:   '#148F77',
    bg:       '#E8F8F5',
    roles:    ['system_admin', 'head_teacher', 'dos', 'bursar', 'class_teacher'],
  },
  {
    id:       'report-cards-pending',
    label:    'Report Cards Pending',
    value:    '—',
    trend:    null,
    colour:   '#F39C12',
    bg:       '#FEF9E7',
    roles:    ['system_admin', 'head_teacher'],
  },
  // dos cards
  {
    id:       'score-windows-open',
    label:    'Score Windows Open',
    value:    '—',
    trend:    null,
    colour:   '#F39C12',
    bg:       '#FEF9E7',
    roles:    ['dos'],
  },
  {
    id:       'report-cards-generated',
    label:    'Report Cards Generated',
    value:    '—',
    trend:    null,
    colour:   '#148F77',
    bg:       '#E8F8F5',
    roles:    ['dos'],
  },
  {
    id:       'subjects-configured',
    label:    'Subjects Configured',
    value:    '—',
    trend:    null,
    colour:   '#2471A3',
    bg:       '#EBF5FB',
    roles:    ['dos'],
  },
  // bursar cards
  {
    id:       'fees-collected',
    label:    'Fees Collected This Term',
    value:    '—',
    trend:    null,
    colour:   '#148F77',
    bg:       '#E8F8F5',
    roles:    ['bursar'],
  },
  {
    id:       'outstanding-balance',
    label:    'Outstanding Balance',
    value:    '—',
    trend:    null,
    colour:   '#C0392B',
    bg:       '#FDEDEC',
    roles:    ['bursar'],
  },
  {
    id:       'overdue-pupils',
    label:    'Overdue Pupils',
    value:    '—',
    trend:    null,
    colour:   '#C0392B',
    bg:       '#FDEDEC',
    roles:    ['bursar'],
  },
  // class_teacher cards
  {
    id:       'my-class',
    label:    'My Class',
    value:    '—',
    trend:    null,
    colour:   '#2471A3',
    bg:       '#EBF5FB',
    roles:    ['class_teacher'],
  },
  {
    id:       'pupils-in-class',
    label:    'Pupils in My Class',
    value:    '—',
    trend:    null,
    colour:   '#2471A3',
    bg:       '#EBF5FB',
    roles:    ['class_teacher'],
  },
  {
    id:       'score-windows-ct',
    label:    'Score Entry Windows Open',
    value:    '—',
    trend:    null,
    colour:   '#F39C12',
    bg:       '#FEF9E7',
    roles:    ['class_teacher'],
  },
];

// ── KPI Card component ────────────────────────────────────────
function KpiCard({ label, value, colour, bg }) {
  return (
    <div
      className="rounded-xl border p-5 flex flex-col gap-2 shadow-sm"
      style={{ backgroundColor: bg, borderColor: colour + '33' }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: colour }}>
        {label}
      </p>
      <p className="text-3xl font-bold" style={{ color: colour }}>
        {value}
      </p>
    </div>
  );
}

// ── Quick links by role ───────────────────────────────────────
const QUICK_LINKS = {
  system_admin:  [
    { label: 'Register Pupil',  href: '/pupils/new' },
    { label: 'Admin Settings',  href: '/admin' },
  ],
  head_teacher:  [
    { label: 'View Pupils',     href: '/pupils' },
  ],
  dos:  [
    { label: 'Academics',       href: '/academics' },
    { label: 'Admin Settings',  href: '/admin' },
  ],
  bursar: [
    { label: 'Fees & Billing',  href: '/fees' },
  ],
  class_teacher: [
    { label: 'My Pupils',       href: '/pupils' },
    { label: 'Score Entry',     href: '/academics' },
  ],
};

// ── Role label formatting ─────────────────────────────────────
function roleLabel(roleName) {
  const map = {
    system_admin:  'System Administrator',
    head_teacher:  'Head Teacher',
    dos:           'Director of Studies',
    bursar:        'Bursar',
    class_teacher: 'Class Teacher',
  };
  return map[roleName] ?? roleName;
}

// ── Page ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const user     = useAuthStore((s) => s.user);
  const roleName = user?.roleName ?? '';
  const fullName = user?.fullName ?? 'User';

  const visibleCards = KPI_CARDS.filter((c) => c.roles.includes(roleName));
  const quickLinks   = QUICK_LINKS[roleName] ?? [];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Welcome back, {fullName} &mdash; {roleLabel(roleName)}
        </p>
      </div>

      {/* Data notice */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Live statistics will be available once the backend stats endpoint is built (Sprint 3+).
        The cards below show their final structure.
      </div>

      {/* KPI grid */}
      {visibleCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleCards.map((card) => (
            <KpiCard key={card.id} {...card} />
          ))}
        </div>
      )}

      {/* Quick links */}
      {quickLinks.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            {quickLinks.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium
                           text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#2471A3' }}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
