/**
 * AdminPage — system_admin only.
 * Tabs: Classes | Streams
 *
 * Classes are permanent (survive across academic years).
 * Streams are per-academic-year; the API defaults to the current year.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, CheckCircle, XCircle, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminClassesApi, adminStreamsApi, adminHousesApi } from '../../../api/admin.js';
import { schoolSectionsApi, academicYearsApi } from '../../../api/academic.js';
import InstitutionProfileTab from './InstitutionProfileTab.jsx';

// ── Shared helpers ─────────────────────────────────────────────

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

// ── Modal wrapper ──────────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════
// CLASSES TAB
// ═══════════════════════════════════════════════════════════════

function ClassesTab() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // null | { mode:'create'|'edit', cls? }
  const [form, setForm]   = useState({ schoolSectionId: '', name: '', levelOrder: '' });
  const [formErr, setFormErr] = useState({});

  const { data: classesData, isLoading } = useQuery({
    queryKey: ['admin-classes'],
    queryFn:  () => adminClassesApi.list({ includeInactive: true }).then(r => r.data.data),
  });
  const { data: sectionsData } = useQuery({
    queryKey: ['school-sections'],
    queryFn:  () => schoolSectionsApi.list().then(r => r.data.data),
  });
  const classes  = classesData  ?? [];
  const sections = sectionsData ?? [];

  const openCreate = () => {
    setForm({ schoolSectionId: sections[0]?.id ?? '', name: '', levelOrder: '' });
    setFormErr({});
    setModal({ mode: 'create' });
  };
  const openEdit = (cls) => {
    setForm({ schoolSectionId: cls.schoolSectionId, name: cls.name, levelOrder: String(cls.levelOrder) });
    setFormErr({});
    setModal({ mode: 'edit', cls });
  };

  const validate = () => {
    const errs = {};
    if (!form.schoolSectionId) errs.schoolSectionId = 'Required';
    if (!form.name.trim())     errs.name            = 'Required';
    if (form.levelOrder === '' || isNaN(Number(form.levelOrder))) errs.levelOrder = 'Must be a number';
    setFormErr(errs);
    return Object.keys(errs).length === 0;
  };

  const { mutate: saveClass, isPending: saving } = useMutation({
    mutationFn: (payload) => modal?.mode === 'create'
      ? adminClassesApi.create(payload)
      : adminClassesApi.update(modal.cls.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-classes'] });
      qc.invalidateQueries({ queryKey: ['classes'] });
      toast.success(modal?.mode === 'create' ? 'Class created' : 'Class updated');
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Save failed'),
  });

  const { mutate: toggleActive, isPending: toggling } = useMutation({
    mutationFn: ({ id, isActive }) => adminClassesApi.update(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-classes'] });
      qc.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Update failed'),
  });

  const handleSave = () => {
    if (!validate()) return;
    saveClass({ schoolSectionId: form.schoolSectionId, name: form.name.trim(), levelOrder: Number(form.levelOrder) });
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          Classes are permanent and shared across all academic years. Streams are created per year.
        </p>
        <button onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white"
                style={{ backgroundColor: '#2471A3' }}>
          <Plus size={14} /> Add Class
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400"><Loader2 size={20} className="animate-spin mx-auto" /></div>
        ) : classes.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No classes yet. Add one to get started.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Class name', 'School section', 'Level order', 'Streams', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {classes.map(cls => (
                <tr key={cls.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{cls.name}</td>
                  <td className="px-4 py-3 text-gray-600">{cls.schoolSection?.name}</td>
                  <td className="px-4 py-3 text-gray-600">{cls.levelOrder}</td>
                  <td className="px-4 py-3 text-gray-500">{cls._count?.streams ?? 0}</td>
                  <td className="px-4 py-3"><Badge active={cls.isActive} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(cls)}
                              className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                        <Edit2 size={11} /> Edit
                      </button>
                      <button
                        onClick={() => toggleActive({ id: cls.id, isActive: !cls.isActive })}
                        disabled={toggling}
                        className={`text-xs font-medium hover:underline ${cls.isActive ? 'text-red-600' : 'text-green-600'}`}
                      >
                        {cls.isActive ? 'Deactivate' : 'Activate'}
                      </button>
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
          title={modal.mode === 'create' ? 'Add Class' : 'Edit Class'}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School Section *</label>
              <select
                value={form.schoolSectionId}
                onChange={e => setForm(f => ({ ...f, schoolSectionId: e.target.value }))}
                className={inputCls(!!formErr.schoolSectionId)}
              >
                <option value="">— Select —</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {formErr.schoolSectionId && <p className="mt-1 text-xs text-red-600">{formErr.schoolSectionId}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                     className={inputCls(!!formErr.name)} placeholder="e.g. P.1" />
              {formErr.name && <p className="mt-1 text-xs text-red-600">{formErr.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level Order *</label>
              <input type="number" min={0} value={form.levelOrder}
                     onChange={e => setForm(f => ({ ...f, levelOrder: e.target.value }))}
                     className={inputCls(!!formErr.levelOrder)} placeholder="e.g. 1" />
              <p className="mt-1 text-xs text-gray-400">Controls sort order (0 = Nursery, 1 = P.1, …)</p>
              {formErr.levelOrder && <p className="mt-1 text-xs text-red-600">{formErr.levelOrder}</p>}
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
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// STREAMS TAB
// ═══════════════════════════════════════════════════════════════

function StreamsTab() {
  const qc = useQueryClient();
  const [modal, setModal]     = useState(null);
  const [filterClassId, setFilterClassId] = useState('');
  const [form, setForm]       = useState({ classId: '', name: '', academicYearId: '' });
  const [formErr, setFormErr] = useState({});

  const { data: classesData } = useQuery({
    queryKey: ['admin-classes'],
    queryFn:  () => adminClassesApi.list().then(r => r.data.data),
    staleTime: 5 * 60_000,
  });
  const { data: yearsData } = useQuery({
    queryKey: ['academic-years'],
    queryFn:  () => academicYearsApi.list().then(r => r.data.data),
    staleTime: 5 * 60_000,
  });
  const { data: streamsData, isLoading } = useQuery({
    queryKey: ['admin-streams', filterClassId],
    queryFn:  () => adminStreamsApi.list({
      classId: filterClassId || undefined,
      includeInactive: true,
    }).then(r => r.data.data),
  });

  const classes = classesData ?? [];
  const years   = yearsData   ?? [];
  const streams = streamsData ?? [];

  const currentYearId = years.find(y => y.isCurrent)?.id ?? '';

  const openCreate = () => {
    setForm({ classId: classes[0]?.id ?? '', name: '', academicYearId: currentYearId });
    setFormErr({});
    setModal({ mode: 'create' });
  };
  const openEdit = (s) => {
    setForm({ classId: s.classId, name: s.name, academicYearId: s.academicYearId });
    setFormErr({});
    setModal({ mode: 'edit', stream: s });
  };

  const validate = () => {
    const errs = {};
    if (!form.classId) errs.classId = 'Required';
    if (!form.name.trim()) errs.name = 'Required';
    setFormErr(errs);
    return Object.keys(errs).length === 0;
  };

  const { mutate: saveStream, isPending: saving } = useMutation({
    mutationFn: (payload) => modal?.mode === 'create'
      ? adminStreamsApi.create(payload)
      : adminStreamsApi.update(modal.stream.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-streams'] });
      qc.invalidateQueries({ queryKey: ['streams'] });
      toast.success(modal?.mode === 'create' ? 'Stream created' : 'Stream updated');
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Save failed'),
  });

  const { mutate: toggleActive, isPending: toggling } = useMutation({
    mutationFn: ({ id, isActive }) => adminStreamsApi.update(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-streams'] });
      qc.invalidateQueries({ queryKey: ['streams'] });
    },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Update failed'),
  });

  const handleSave = () => {
    if (!validate()) return;
    saveStream({ classId: form.classId, name: form.name.trim(), academicYearId: form.academicYearId || undefined });
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <select
            value={filterClassId}
            onChange={e => setFilterClassId(e.target.value)}
            className="py-2 pl-3 pr-8 text-sm border border-gray-200 rounded-lg bg-white
                       focus:outline-none focus:ring-2 focus:ring-primary text-gray-700"
          >
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <p className="text-sm text-gray-500">Showing current academic year by default.</p>
        </div>
        <button onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white"
                style={{ backgroundColor: '#2471A3' }}>
          <Plus size={14} /> Add Stream
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400"><Loader2 size={20} className="animate-spin mx-auto" /></div>
        ) : streams.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No streams found. Add one or adjust the filter.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Stream name', 'Class', 'Academic year', 'Class teacher', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {streams.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.class?.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {s.academicYear?.yearLabel}
                    {s.academicYear?.isCurrent && (
                      <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">current</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.classTeacher?.fullName ?? '—'}</td>
                  <td className="px-4 py-3"><Badge active={s.isActive} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(s)}
                              className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                        <Edit2 size={11} /> Edit
                      </button>
                      <button
                        onClick={() => toggleActive({ id: s.id, isActive: !s.isActive })}
                        disabled={toggling}
                        className={`text-xs font-medium hover:underline ${s.isActive ? 'text-red-600' : 'text-green-600'}`}
                      >
                        {s.isActive ? 'Deactivate' : 'Activate'}
                      </button>
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
          title={modal.mode === 'create' ? 'Add Stream' : 'Edit Stream'}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
              <select value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}
                      className={inputCls(!!formErr.classId)}>
                <option value="">— Select —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {formErr.classId && <p className="mt-1 text-xs text-red-600">{formErr.classId}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stream Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                     className={inputCls(!!formErr.name)} placeholder="e.g. P.1A or Sunflower" />
              {formErr.name && <p className="mt-1 text-xs text-red-600">{formErr.name}</p>}
            </div>
            {modal.mode === 'create' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                <select value={form.academicYearId} onChange={e => setForm(f => ({ ...f, academicYearId: e.target.value }))}
                        className={inputCls(false)}>
                  <option value="">Current year (default)</option>
                  {years.map(y => (
                    <option key={y.id} value={y.id}>
                      {y.yearLabel}{y.isCurrent ? ' (current)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOUSES TAB
// ═══════════════════════════════════════════════════════════════

const PRESET_COLOURS = [
  '#F59E0B', '#EF4444', '#3B82F6', '#10B981',
  '#8B5CF6', '#F97316', '#EC4899', '#14B8A6',
];

function ColourDot({ hex, size = 12 }) {
  if (!hex) return <span className="inline-block w-3 h-3 rounded-full bg-gray-200" />;
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{ width: size, height: size, backgroundColor: hex }}
    />
  );
}

function HousesTab() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // null | { mode:'create'|'edit', house? }
  const [form, setForm]   = useState({ name: '', colourHex: '' });
  const [formErr, setFormErr] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null); // house to confirm-delete

  const { data: housesData, isLoading } = useQuery({
    queryKey: ['admin-houses'],
    queryFn:  () => adminHousesApi.list().then(r => r.data.data),
  });
  const houses = housesData ?? [];

  const openCreate = () => {
    setForm({ name: '', colourHex: PRESET_COLOURS[0] });
    setFormErr({});
    setModal({ mode: 'create' });
  };
  const openEdit = (h) => {
    setForm({ name: h.name, colourHex: h.colourHex ?? '' });
    setFormErr({});
    setModal({ mode: 'edit', house: h });
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Required';
    if (form.colourHex && !/^#[0-9A-Fa-f]{3,8}$/.test(form.colourHex))
      errs.colourHex = 'Must be a valid hex colour (e.g. #F59E0B)';
    setFormErr(errs);
    return Object.keys(errs).length === 0;
  };

  const { mutate: saveHouse, isPending: saving } = useMutation({
    mutationFn: (payload) => modal?.mode === 'create'
      ? adminHousesApi.create(payload)
      : adminHousesApi.update(modal.house.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-houses'] });
      qc.invalidateQueries({ queryKey: ['houses-active'] });
      toast.success(modal?.mode === 'create' ? 'House created' : 'House updated');
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.errors?.[0]?.msg ?? e.response?.data?.error ?? 'Save failed'),
  });

  const { mutate: toggleActive, isPending: toggling } = useMutation({
    mutationFn: ({ id, isActive }) => adminHousesApi.update(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-houses'] });
      qc.invalidateQueries({ queryKey: ['houses-active'] });
    },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Update failed'),
  });

  const { mutate: removeHouse, isPending: deleting } = useMutation({
    mutationFn: (id) => adminHousesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-houses'] });
      qc.invalidateQueries({ queryKey: ['houses-active'] });
      toast.success('House deleted');
      setDeleteTarget(null);
    },
    onError: (e) => {
      toast.error(e.response?.data?.error ?? 'Delete failed');
      setDeleteTarget(null);
    },
  });

  const handleSave = () => {
    if (!validate()) return;
    saveHouse({ name: form.name.trim(), colourHex: form.colourHex || undefined });
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          Houses are assigned to pupils at registration. Cannot delete a house with pupils — deactivate instead.
        </p>
        <button onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white"
                style={{ backgroundColor: '#2471A3' }}>
          <Plus size={14} /> Add House
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400"><Loader2 size={20} className="animate-spin mx-auto" /></div>
        ) : houses.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No houses yet. Add one to get started.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['House', 'Colour', 'Pupils', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {houses.map(h => (
                <tr key={h.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                    <ColourDot hex={h.colourHex} size={14} />
                    {h.name}
                  </td>
                  <td className="px-4 py-3">
                    {h.colourHex ? (
                      <span className="flex items-center gap-1.5 text-gray-600 font-mono text-xs">
                        <ColourDot hex={h.colourHex} size={16} />
                        {h.colourHex}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{h._count?.pupils ?? 0}</td>
                  <td className="px-4 py-3"><Badge active={h.isActive} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => openEdit(h)}
                              className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                        <Edit2 size={11} /> Edit
                      </button>
                      <button
                        onClick={() => toggleActive({ id: h.id, isActive: !h.isActive })}
                        disabled={toggling}
                        className={`text-xs font-medium hover:underline ${h.isActive ? 'text-amber-600' : 'text-green-600'}`}
                      >
                        {h.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      {(h._count?.pupils ?? 0) === 0 && (
                        <button
                          onClick={() => setDeleteTarget(h)}
                          className="text-xs font-medium text-red-500 hover:underline"
                        >
                          Delete
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

      {/* Add / Edit modal */}
      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'Add House' : 'Edit House'}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">House Name *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Yellow-Lion"
                className={inputCls(!!formErr.name)}
              />
              {formErr.name && <p className="mt-1 text-xs text-red-600">{formErr.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Colour</label>
              {/* Preset swatches */}
              <div className="flex flex-wrap gap-2 mb-2">
                {PRESET_COLOURS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, colourHex: c }))}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      form.colourHex === c ? 'border-gray-700 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
              {/* Hex input */}
              <div className="flex items-center gap-2">
                <ColourDot hex={form.colourHex} size={20} />
                <input
                  value={form.colourHex}
                  onChange={e => setForm(f => ({ ...f, colourHex: e.target.value }))}
                  placeholder="#F59E0B"
                  className={`flex-1 ${inputCls(!!formErr.colourHex)} font-mono`}
                />
              </div>
              {formErr.colourHex && <p className="mt-1 text-xs text-red-600">{formErr.colourHex}</p>}
              <p className="mt-1 text-xs text-gray-400">Click a swatch or type a hex value</p>
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

      {/* Delete confirmation */}
      {deleteTarget && (
        <Modal title="Delete House" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-gray-700 mb-5">
            Are you sure you want to permanently delete <strong>{deleteTarget.name}</strong>?
            This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)}
                    className="flex-1 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={() => removeHouse(deleteTarget.id)}
              disabled={deleting}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

const TABS = [
  { id: 'classes', label: 'Classes' },
  { id: 'streams', label: 'Streams' },
  { id: 'houses',  label: 'Houses' },
  { id: 'profile', label: 'Institution Profile' },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('classes');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage school structure settings</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'classes' && <ClassesTab />}
        {activeTab === 'streams' && <StreamsTab />}
        {activeTab === 'houses'  && <HousesTab />}
        {activeTab === 'profile' && <InstitutionProfileTab />}
      </div>
    </div>
  );
}
