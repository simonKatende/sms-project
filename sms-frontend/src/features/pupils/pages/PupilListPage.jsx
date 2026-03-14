import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, Download, ChevronLeft, ChevronRight, X, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { pupilsApi } from '../../../api/pupils.js';
import { useAuthStore } from '../../../store/authStore.js';

// ── Constants ─────────────────────────────────────────────────
const CLASSES   = ['Nursery', 'P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'];
const SECTIONS  = ['Day', 'Boarding'];
const PAGE_SIZE = 25;

// ── Small reusable components ─────────────────────────────────

function SectionBadge({ section }) {
  const styles = {
    Day:      'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    Boarding: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[section] ?? 'bg-gray-100 text-gray-600'}`}>
      {section}
    </span>
  );
}

function FeesBar({ bill }) {
  if (!bill) return <span className="text-xs text-gray-400">No bill</span>;
  const pct   = bill.totalAmount > 0 ? Math.round((bill.totalPaid / bill.totalAmount) * 100) : 0;
  const color = pct >= 75 ? '#148F77' : pct >= 25 ? '#F39C12' : '#C0392B';
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">{pct}%</span>
    </div>
  );
}

function PupilAvatar({ pupil, photoBase }) {
  const initials = `${pupil.firstName[0] ?? ''}${pupil.lastName[0] ?? ''}`.toUpperCase();
  const colors   = ['#2471A3','#148F77','#7D3C98','#1A5276','#117A65'];
  const color    = colors[(pupil.firstName.charCodeAt(0) + pupil.lastName.charCodeAt(0)) % colors.length];

  if (pupil.pupilPhoto?.filePath) {
    return (
      <img
        src={`${photoBase}/${pupil.pupilPhoto.filePath}`}
        alt={`${pupil.firstName} ${pupil.lastName}`}
        className="w-9 h-9 rounded-full object-cover shrink-0"
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0
                    text-xs font-bold text-white"
         style={{ backgroundColor: color }}>
      {initials}
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────
function FilterBar({ params, setParams }) {
  const hasFilters = params.search || params.classId || params.section;

  const set = (key, val) =>
    setParams((p) => ({ ...p, [key]: val, page: 1 }));

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-48">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search name, ID, LIN…"
          value={params.search ?? ''}
          onChange={(e) => set('search', e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-primary bg-white"
        />
      </div>

      {/* Class */}
      <select
        value={params.classId ?? ''}
        onChange={(e) => set('classId', e.target.value)}
        className="py-2 pl-3 pr-8 text-sm border border-gray-200 rounded-lg bg-white
                   focus:outline-none focus:ring-2 focus:ring-primary text-gray-700"
      >
        <option value="">All Classes</option>
        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      {/* Section */}
      <select
        value={params.section ?? ''}
        onChange={(e) => set('section', e.target.value)}
        className="py-2 pl-3 pr-8 text-sm border border-gray-200 rounded-lg bg-white
                   focus:outline-none focus:ring-2 focus:ring-primary text-gray-700"
      >
        <option value="">All Sections</option>
        {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {/* Status */}
      <select
        value={params.isActive ?? 'true'}
        onChange={(e) => set('isActive', e.target.value)}
        className="py-2 pl-3 pr-8 text-sm border border-gray-200 rounded-lg bg-white
                   focus:outline-none focus:ring-2 focus:ring-primary text-gray-700"
      >
        <option value="true">Active</option>
        <option value="false">Inactive</option>
        <option value="">All</option>
      </select>

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={() => setParams({ page: 1, limit: PAGE_SIZE, isActive: 'true' })}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <X size={14} /> Clear
        </button>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function PupilListPage() {
  const navigate  = useNavigate();
  const roleName  = useAuthStore((s) => s.user?.roleName);
  const photoBase = import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3000';

  const [params, setParams] = useState({ page: 1, limit: PAGE_SIZE, isActive: 'true' });
  const [exporting, setExporting] = useState(false);

  const queryParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined)
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['pupils', queryParams],
    queryFn:  () => pupilsApi.list(queryParams).then(r => r.data),
    placeholderData: (prev) => prev,
  });

  const pupils    = data?.data  ?? [];
  const meta      = data?.meta  ?? { total: 0, page: 1, totalPages: 1 };
  const canCreate = ['system_admin', 'bursar'].includes(roleName);
  const canExport = ['system_admin', 'bursar'].includes(roleName);

  // ── Export ──────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    try {
      setExporting(true);
      const res  = await pupilsApi.exportXlsx(queryParams);
      const url  = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href     = url;
      link.download = `pupils-${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  }, [queryParams]);

  return (
    <div className="space-y-5">
      {/* ── Page header ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pupils</h1>
          {meta.total > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">{meta.total.toLocaleString()} enrolled pupils</p>
          )}
        </div>
        <div className="flex gap-2">
          {canExport && (
            <button
              onClick={handleExport}
              disabled={exporting || isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
                         border border-gray-200 bg-white text-gray-700 hover:bg-gray-50
                         disabled:opacity-50 transition-colors"
            >
              <Download size={15} />
              {exporting ? 'Exporting…' : 'Export'}
            </button>
          )}
          {canCreate && (
            <button
              onClick={() => navigate('/pupils/new')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg
                         text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: '#2471A3' }}
            >
              <Plus size={15} />
              Register New Pupil
            </button>
          )}
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <FilterBar params={params} setParams={setParams} />
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isError ? (
          <div className="p-12 text-center text-danger">Failed to load pupils. Please refresh.</div>
        ) : isLoading && pupils.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Loading…</div>
        ) : pupils.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto mb-3 text-gray-300" size={40} />
            <p className="text-gray-500 font-medium">No pupils found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Pupil', 'ID', 'Class / Stream', 'Section', 'Guardian', 'Phone', 'SchoolPay', 'Fees', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pupils.map((pupil) => {
                    const primary = pupil.pupilGuardians?.[0]?.guardian;
                    const bill    = pupil.pupilBills?.[0];
                    const stream  = pupil.stream;
                    return (
                      <tr
                        key={pupil.id}
                        className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                        onClick={() => navigate(`/pupils/${pupil.id}`)}
                      >
                        {/* Avatar + name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <PupilAvatar pupil={pupil} photoBase={photoBase} />
                            <div>
                              <p className="font-medium text-gray-900">
                                {pupil.firstName} {pupil.lastName}
                              </p>
                              {pupil.otherNames && (
                                <p className="text-xs text-gray-400">{pupil.otherNames}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* ID */}
                        <td className="px-4 py-3">
                          <code className="text-xs font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                            {pupil.pupilIdCode}
                          </code>
                        </td>
                        {/* Class / Stream */}
                        <td className="px-4 py-3 text-gray-700">
                          {stream ? `${stream.class?.name ?? ''} ${stream.name}` : '—'}
                        </td>
                        {/* Section */}
                        <td className="px-4 py-3">
                          <SectionBadge section={pupil.section} />
                        </td>
                        {/* Guardian name */}
                        <td className="px-4 py-3 text-gray-700">{primary?.fullName ?? '—'}</td>
                        {/* Phone */}
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{primary?.phoneCall ?? '—'}</td>
                        {/* SchoolPay */}
                        <td className="px-4 py-3">
                          {pupil.schoolpayCode
                            ? <code className="text-xs font-mono text-gray-600">{pupil.schoolpayCode}</code>
                            : <span className="text-gray-400">—</span>}
                        </td>
                        {/* Fees */}
                        <td className="px-4 py-3"><FeesBar bill={bill} /></td>
                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/pupils/${pupil.id}`); }}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">
                Showing {((meta.page - 1) * meta.limit) + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setParams(p => ({ ...p, page: p.page - 1 }))}
                  disabled={meta.page <= 1}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-gray-600 px-2">
                  Page {meta.page} / {meta.totalPages}
                </span>
                <button
                  onClick={() => setParams(p => ({ ...p, page: p.page + 1 }))}
                  disabled={meta.page >= meta.totalPages}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

