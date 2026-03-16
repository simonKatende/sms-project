/**
 * SubjectsTab — manage school subjects.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, CheckCircle, XCircle, Loader2, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminSubjectsApi } from '../../../api/admin.js';
import { schoolSectionsApi } from '../../../api/academic.js';

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

function BoolBadge({ value }) {
  return value ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700">
      <CheckCircle size={9} /> Yes
    </span>
  ) : (
    <span className="text-gray-400 text-xs">—</span>
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

// ── Main component ────────────────────────────────────────────

export default function SubjectsTab() {
  const qc = useQueryClient();
  const [modal, setModal]         = useState(null); // null | { mode:'create'|'edit', subject? }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm]           = useState({
    code: '', name: '', schoolSectionId: '', isCore: false,
    excludeFromAggregate: false, displayOrder: '',
  });
  const [formErr, setFormErr] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin-subjects'],
    queryFn:  () => adminSubjectsApi.list({ includeInactive: true }).then(r => r.data.data),
  });
  const { data: sectionsData } = useQuery({
    queryKey: ['school-sections'],
    queryFn:  () => schoolSectionsApi.list().then(r => r.data.data),
    staleTime: 5 * 60_000,
  });

  const subjects = data     ?? [];
  const sections = sectionsData ?? [];

  const openCreate = () => {
    setForm({ code: '', name: '', schoolSectionId: sections[0]?.id ?? '', isCore: false, excludeFromAggregate: false, displayOrder: '' });
    setFormErr({});
    setModal({ mode: 'create' });
  };
  const openEdit = (s) => {
    setForm({
      code:                 s.code,
      name:                 s.name,
      schoolSectionId:      s.schoolSectionId ?? '',
      isCore:               s.isCore ?? false,
      excludeFromAggregate: s.excludeFromAggregate ?? false,
      displayOrder:         s.displayOrder != null ? String(s.displayOrder) : '',
    });
    setFormErr({});
    setModal({ mode: 'edit', subject: s });
  };

  const validate = () => {
    const errs = {};
    if (modal?.mode === 'create') {
      if (!form.code.trim())          errs.code = 'Required';
      if (form.code.length > 20)      errs.code = 'Max 20 characters';
    }
    if (!form.name.trim())            errs.name = 'Required';
    if (form.name.length > 80)        errs.name = 'Max 80 characters';
    if (!form.schoolSectionId)        errs.schoolSectionId = 'Required';
    if (form.displayOrder !== '' && isNaN(Number(form.displayOrder)))
      errs.displayOrder = 'Must be a number';
    setFormErr(errs);
    return Object.keys(errs).length === 0;
  };

  const { mutate: saveSubject, isPending: saving } = useMutation({
    mutationFn: (payload) => modal?.mode === 'create'
      ? adminSubjectsApi.create(payload)
      : adminSubjectsApi.update(modal.subject.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-subjects'] });
      toast.success(modal?.mode === 'create' ? 'Subject created' : 'Subject updated');
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Save failed'),
  });

  const { mutate: toggleActive, isPending: toggling } = useMutation({
    mutationFn: ({ id, isActive }) => adminSubjectsApi.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-subjects'] }),
    onError: (e) => toast.error(e.response?.data?.error ?? 'Update failed'),
  });

  const { mutate: deleteSubject, isPending: deleting } = useMutation({
    mutationFn: (id) => adminSubjectsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-subjects'] });
      toast.success('Subject deleted');
      setDeleteTarget(null);
    },
    onError: (e) => {
      const msg = e.response?.data?.error ?? 'Delete failed';
      toast.error(e.response?.status === 409 ? 'Cannot delete — subject is assigned to classes' : msg);
      setDeleteTarget(null);
    },
  });

  const handleSave = () => {
    if (!validate()) return;
    const payload = {
      name:                 form.name.trim(),
      schoolSectionId:      form.schoolSectionId,
      isCore:               form.isCore,
      excludeFromAggregate: form.excludeFromAggregate,
      displayOrder:         form.displayOrder !== '' ? Number(form.displayOrder) : undefined,
    };
    if (modal?.mode === 'create') payload.code = form.code.trim().toUpperCase();
    saveSubject(payload);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          Subjects are assigned per school section. Religious Education is excluded from aggregates by default.
        </p>
        <button onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white"
                style={{ backgroundColor: '#2471A3' }}>
          <Plus size={14} /> Add Subject
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400"><Loader2 size={20} className="animate-spin mx-auto" /></div>
        ) : subjects.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No subjects yet. Add one to get started.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Code', 'Name', 'Section', 'Core', 'Excl. Aggregate', 'Order', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {subjects.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 font-medium">{s.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.schoolSection?.name ?? '—'}</td>
                  <td className="px-4 py-3"><BoolBadge value={s.isCore} /></td>
                  <td className="px-4 py-3"><BoolBadge value={s.excludeFromAggregate} /></td>
                  <td className="px-4 py-3 text-gray-500">{s.displayOrder ?? '—'}</td>
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
                        className={`text-xs font-medium hover:underline ${s.isActive ? 'text-amber-600' : 'text-green-600'}`}
                      >
                        {s.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => setDeleteTarget(s)}
                        className="text-xs font-medium text-red-500 hover:underline flex items-center gap-1"
                      >
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit modal */}
      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'Add Subject' : 'Edit Subject'}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            {modal.mode === 'create' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                <input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="e.g. ENG"
                  maxLength={20}
                  className={inputCls(!!formErr.code)}
                />
                <p className="mt-1 text-xs text-gray-400">Short code, max 20 chars. Auto-uppercased.</p>
                {formErr.code && <p className="mt-1 text-xs text-red-600">{formErr.code}</p>}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. English Language"
                maxLength={80}
                className={inputCls(!!formErr.name)}
              />
              {formErr.name && <p className="mt-1 text-xs text-red-600">{formErr.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School Section *</label>
              <select
                value={form.schoolSectionId}
                onChange={e => setForm(f => ({ ...f, schoolSectionId: e.target.value }))}
                className={inputCls(!!formErr.schoolSectionId)}
              >
                <option value="">— Select —</option>
                {sections.map(sec => <option key={sec.id} value={sec.id}>{sec.name}</option>)}
              </select>
              {formErr.schoolSectionId && <p className="mt-1 text-xs text-red-600">{formErr.schoolSectionId}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
              <input
                type="number"
                min={0}
                value={form.displayOrder}
                onChange={e => setForm(f => ({ ...f, displayOrder: e.target.value }))}
                placeholder="e.g. 1"
                className={inputCls(!!formErr.displayOrder)}
              />
              {formErr.displayOrder && <p className="mt-1 text-xs text-red-600">{formErr.displayOrder}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isCore}
                  onChange={e => setForm(f => ({ ...f, isCore: e.target.checked }))}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                Core subject
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.excludeFromAggregate}
                  onChange={e => setForm(f => ({ ...f, excludeFromAggregate: e.target.checked }))}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                Exclude from aggregate
              </label>
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
        <Modal title="Delete Subject" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-gray-700 mb-5">
            Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)}
                    className="flex-1 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={() => deleteSubject(deleteTarget.id)}
              disabled={deleting}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: '#C0392B' }}
            >
              {deleting ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
