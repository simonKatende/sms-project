/**
 * AcademicCalendarTab — manage academic years and terms.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, CheckCircle, XCircle, Loader2, X, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAcademicYearsApi, adminTermsApi } from '../../../api/admin.js';

// ── Helpers ───────────────────────────────────────────────────

function inputCls(err) {
  return `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary
          ${err ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`;
}

function Badge({ active }) {
  return active ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                     bg-green-50 text-green-700 ring-1 ring-green-200">
      <CheckCircle size={10} /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                     bg-gray-100 text-gray-500 ring-1 ring-gray-200">
      <XCircle size={10} /> Inactive
    </span>
  );
}

function CurrentBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                     bg-blue-50 text-blue-700 ring-1 ring-blue-200">
      <Star size={9} fill="currentColor" /> Current
    </span>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Academic Years Section ────────────────────────────────────

function AcademicYearsSection() {
  const qc = useQueryClient();
  const [modal, setModal]     = useState(null); // null | { mode:'create'|'edit', year? }
  const [form, setForm]       = useState({ yearLabel: '', startDate: '', endDate: '' });
  const [formErr, setFormErr] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin-academic-years'],
    queryFn:  () => adminAcademicYearsApi.list().then(r => r.data.data),
  });
  const years = data ?? [];

  const openCreate = () => {
    setForm({ yearLabel: '', startDate: '', endDate: '' });
    setFormErr({});
    setModal({ mode: 'create' });
  };
  const openEdit = (y) => {
    setForm({
      yearLabel:  y.yearLabel,
      startDate:  y.startDate ? y.startDate.slice(0, 10) : '',
      endDate:    y.endDate   ? y.endDate.slice(0, 10)   : '',
    });
    setFormErr({});
    setModal({ mode: 'edit', year: y });
  };

  const validate = () => {
    const errs = {};
    if (!form.yearLabel.trim()) errs.yearLabel = 'Required';
    if (!form.startDate)        errs.startDate = 'Required';
    if (!form.endDate)          errs.endDate   = 'Required';
    if (form.startDate && form.endDate && form.startDate >= form.endDate)
      errs.endDate = 'Must be after start date';
    setFormErr(errs);
    return Object.keys(errs).length === 0;
  };

  const { mutate: saveYear, isPending: saving } = useMutation({
    mutationFn: (payload) => modal?.mode === 'create'
      ? adminAcademicYearsApi.create(payload)
      : adminAcademicYearsApi.update(modal.year.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-academic-years'] });
      qc.invalidateQueries({ queryKey: ['admin-terms'] });
      toast.success(modal?.mode === 'create' ? 'Academic year created' : 'Academic year updated');
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Save failed'),
  });

  const { mutate: markCurrent, isPending: marking } = useMutation({
    mutationFn: (id) => adminAcademicYearsApi.update(id, { isCurrent: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-academic-years'] });
      qc.invalidateQueries({ queryKey: ['admin-terms'] });
      toast.success('Current year updated');
    },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Update failed'),
  });

  const handleSave = () => {
    if (!validate()) return;
    saveYear({ yearLabel: form.yearLabel.trim(), startDate: form.startDate, endDate: form.endDate });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Academic Years</h2>
          <p className="text-xs text-gray-400">Configure academic years for the school calendar.</p>
        </div>
        <button onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white"
                style={{ backgroundColor: '#2471A3' }}>
          <Plus size={14} /> Add Year
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400"><Loader2 size={20} className="animate-spin mx-auto" /></div>
        ) : years.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No academic years yet. Add one to get started.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Year', 'Start Date', 'End Date', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {years.map(y => (
                <tr key={y.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {y.yearLabel}
                      {y.isCurrent && <CurrentBadge />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{fmtDate(y.startDate)}</td>
                  <td className="px-4 py-3 text-gray-600">{fmtDate(y.endDate)}</td>
                  <td className="px-4 py-3"><Badge active={y.isActive ?? true} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(y)}
                              className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                        <Edit2 size={11} /> Edit
                      </button>
                      {!y.isCurrent && (
                        <button
                          onClick={() => markCurrent(y.id)}
                          disabled={marking}
                          className="text-xs font-medium text-blue-600 hover:underline"
                        >
                          Set Current
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'Add Academic Year' : 'Edit Academic Year'}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year Label *</label>
              <input
                value={form.yearLabel}
                onChange={e => setForm(f => ({ ...f, yearLabel: e.target.value }))}
                placeholder="e.g. 2026"
                className={inputCls(!!formErr.yearLabel)}
              />
              {formErr.yearLabel && <p className="mt-1 text-xs text-red-600">{formErr.yearLabel}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className={inputCls(!!formErr.startDate)}
              />
              {formErr.startDate && <p className="mt-1 text-xs text-red-600">{formErr.startDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className={inputCls(!!formErr.endDate)}
              />
              {formErr.endDate && <p className="mt-1 text-xs text-red-600">{formErr.endDate}</p>}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)}
                      className="flex-1 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                      className="flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                      style={{ backgroundColor: '#2471A3' }}>
                {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Terms Section ─────────────────────────────────────────────

function TermsSection() {
  const qc = useQueryClient();
  const [modal, setModal]         = useState(null); // null | { mode:'create'|'edit', term? }
  const [filterYearId, setFilterYearId] = useState('');
  const [form, setForm]           = useState({ academicYearId: '', termNumber: '1', name: '', startDate: '', endDate: '' });
  const [formErr, setFormErr]     = useState({});

  const { data: yearsData } = useQuery({
    queryKey: ['admin-academic-years'],
    queryFn:  () => adminAcademicYearsApi.list().then(r => r.data.data),
    staleTime: 5 * 60_000,
  });
  const years = yearsData ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['admin-terms', filterYearId],
    queryFn:  () => adminTermsApi.list({ academicYearId: filterYearId || undefined }).then(r => r.data.data),
  });
  const terms = data ?? [];

  const openCreate = () => {
    const defaultYearId = years.find(y => y.isCurrent)?.id ?? years[0]?.id ?? '';
    setForm({ academicYearId: defaultYearId, termNumber: '1', name: '', startDate: '', endDate: '' });
    setFormErr({});
    setModal({ mode: 'create' });
  };
  const openEdit = (t) => {
    setForm({
      academicYearId: t.academicYearId,
      termNumber:     String(t.termNumber),
      name:           t.name,
      startDate:      t.startDate ? t.startDate.slice(0, 10) : '',
      endDate:        t.endDate   ? t.endDate.slice(0, 10)   : '',
    });
    setFormErr({});
    setModal({ mode: 'edit', term: t });
  };

  const validate = () => {
    const errs = {};
    if (modal?.mode === 'create') {
      if (!form.academicYearId) errs.academicYearId = 'Required';
      if (!form.termNumber)     errs.termNumber     = 'Required';
    }
    if (!form.name.trim()) errs.name      = 'Required';
    if (!form.startDate)   errs.startDate = 'Required';
    if (!form.endDate)     errs.endDate   = 'Required';
    if (form.startDate && form.endDate && form.startDate >= form.endDate)
      errs.endDate = 'Must be after start date';
    setFormErr(errs);
    return Object.keys(errs).length === 0;
  };

  const { mutate: saveTerm, isPending: saving } = useMutation({
    mutationFn: (payload) => modal?.mode === 'create'
      ? adminTermsApi.create(payload)
      : adminTermsApi.update(modal.term.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-terms'] });
      toast.success(modal?.mode === 'create' ? 'Term created' : 'Term updated');
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Save failed'),
  });

  const handleSave = () => {
    if (!validate()) return;
    if (modal?.mode === 'create') {
      saveTerm({
        academicYearId: form.academicYearId,
        termNumber:     Number(form.termNumber),
        name:           form.name.trim(),
        startDate:      form.startDate,
        endDate:        form.endDate,
      });
    } else {
      saveTerm({ name: form.name.trim(), startDate: form.startDate, endDate: form.endDate });
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Terms</h2>
          <p className="text-xs text-gray-400">Three terms per academic year.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterYearId}
            onChange={e => setFilterYearId(e.target.value)}
            className="py-2 pl-3 pr-8 text-sm border border-gray-200 rounded-lg bg-white
                       focus:outline-none focus:ring-2 focus:ring-primary text-gray-700"
          >
            <option value="">All Years</option>
            {years.map(y => (
              <option key={y.id} value={y.id}>{y.yearLabel}{y.isCurrent ? ' (current)' : ''}</option>
            ))}
          </select>
          <button onClick={openCreate}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white"
                  style={{ backgroundColor: '#2471A3' }}>
            <Plus size={14} /> Add Term
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400"><Loader2 size={20} className="animate-spin mx-auto" /></div>
        ) : terms.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No terms found. Add one or adjust the filter.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Term', 'Academic Year', 'No.', 'Start Date', 'End Date', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {terms.map(t => (
                <tr key={t.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {t.name}
                      {t.isCurrent && <CurrentBadge />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.academicYear?.yearLabel ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{t.termNumber}</td>
                  <td className="px-4 py-3 text-gray-600">{fmtDate(t.startDate)}</td>
                  <td className="px-4 py-3 text-gray-600">{fmtDate(t.endDate)}</td>
                  <td className="px-4 py-3"><Badge active={t.isActive ?? true} /></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(t)}
                            className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                      <Edit2 size={11} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'Add Term' : 'Edit Term'}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            {modal.mode === 'create' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
                  <select
                    value={form.academicYearId}
                    onChange={e => setForm(f => ({ ...f, academicYearId: e.target.value }))}
                    className={inputCls(!!formErr.academicYearId)}
                  >
                    <option value="">— Select —</option>
                    {years.map(y => (
                      <option key={y.id} value={y.id}>{y.yearLabel}{y.isCurrent ? ' (current)' : ''}</option>
                    ))}
                  </select>
                  {formErr.academicYearId && <p className="mt-1 text-xs text-red-600">{formErr.academicYearId}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Term Number *</label>
                  <select
                    value={form.termNumber}
                    onChange={e => setForm(f => ({ ...f, termNumber: e.target.value }))}
                    className={inputCls(!!formErr.termNumber)}
                  >
                    <option value="1">Term 1</option>
                    <option value="2">Term 2</option>
                    <option value="3">Term 3</option>
                  </select>
                  {formErr.termNumber && <p className="mt-1 text-xs text-red-600">{formErr.termNumber}</p>}
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Term Name *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Term 1 2026"
                className={inputCls(!!formErr.name)}
              />
              {formErr.name && <p className="mt-1 text-xs text-red-600">{formErr.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className={inputCls(!!formErr.startDate)}
              />
              {formErr.startDate && <p className="mt-1 text-xs text-red-600">{formErr.startDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className={inputCls(!!formErr.endDate)}
              />
              {formErr.endDate && <p className="mt-1 text-xs text-red-600">{formErr.endDate}</p>}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)}
                      className="flex-1 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                      className="flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                      style={{ backgroundColor: '#2471A3' }}>
                {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────

export default function AcademicCalendarTab() {
  return (
    <div className="space-y-8">
      <AcademicYearsSection />
      <TermsSection />
    </div>
  );
}
