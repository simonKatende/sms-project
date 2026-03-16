/**
 * ClassSubjectTab — assign subjects to classes.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminClassSubjectsApi, adminSubjectsApi, adminClassesApi } from '../../../api/admin.js';

// ── Helpers ───────────────────────────────────────────────────

function inputCls(err) {
  return `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary
          ${err ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`;
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

export default function ClassSubjectTab() {
  const qc = useQueryClient();
  const [filterClassId, setFilterClassId] = useState('');
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState({ classId: '', subjectId: '', displayOrder: '' });
  const [formErr, setFormErr] = useState({});
  const [removeTarget, setRemoveTarget] = useState(null);

  const { data: classesData } = useQuery({
    queryKey: ['admin-classes'],
    queryFn:  () => adminClassesApi.list({ includeInactive: false }).then(r => r.data.data),
    staleTime: 5 * 60_000,
  });
  const { data: subjectsData } = useQuery({
    queryKey: ['admin-subjects'],
    queryFn:  () => adminSubjectsApi.list({ includeInactive: false }).then(r => r.data.data),
    staleTime: 5 * 60_000,
  });
  const { data, isLoading } = useQuery({
    queryKey: ['admin-class-subjects', filterClassId],
    queryFn:  () => adminClassSubjectsApi.list({ classId: filterClassId || undefined }).then(r => r.data.data),
  });

  const classes  = classesData  ?? [];
  const subjects = subjectsData ?? [];
  const assignments = data ?? [];

  const openCreate = () => {
    setForm({ classId: filterClassId || classes[0]?.id || '', subjectId: subjects[0]?.id || '', displayOrder: '' });
    setFormErr({});
    setModal(true);
  };

  const validate = () => {
    const errs = {};
    if (!form.classId)   errs.classId   = 'Required';
    if (!form.subjectId) errs.subjectId = 'Required';
    if (form.displayOrder !== '' && isNaN(Number(form.displayOrder)))
      errs.displayOrder = 'Must be a number';
    setFormErr(errs);
    return Object.keys(errs).length === 0;
  };

  const { mutate: addAssignment, isPending: adding } = useMutation({
    mutationFn: (payload) => adminClassSubjectsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-class-subjects'] });
      toast.success('Subject assigned to class');
      setModal(false);
    },
    onError: (e) => {
      const msg = e.response?.data?.error ?? 'Save failed';
      toast.error(e.response?.status === 409 ? 'This subject is already assigned to this class' : msg);
    },
  });

  const { mutate: removeAssignment, isPending: removing } = useMutation({
    mutationFn: (id) => adminClassSubjectsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-class-subjects'] });
      toast.success('Assignment removed');
      setRemoveTarget(null);
    },
    onError: (e) => {
      toast.error(e.response?.data?.error ?? 'Remove failed');
      setRemoveTarget(null);
    },
  });

  const handleAdd = () => {
    if (!validate()) return;
    addAssignment({
      classId:      form.classId,
      subjectId:    form.subjectId,
      displayOrder: form.displayOrder !== '' ? Number(form.displayOrder) : undefined,
    });
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
          <p className="text-sm text-gray-500">Showing all class-subject assignments.</p>
        </div>
        <button onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white"
                style={{ backgroundColor: '#2471A3' }}>
          <Plus size={14} /> Add Assignment
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400"><Loader2 size={20} className="animate-spin mx-auto" /></div>
        ) : assignments.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No assignments found. Add one to get started.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Subject', 'Class', 'Display Order', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {assignments.map(a => (
                <tr key={a.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <span className="font-mono text-xs text-gray-500 mr-2">{a.subject?.code}</span>
                    {a.subject?.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{a.class?.name}</td>
                  <td className="px-4 py-3 text-gray-500">{a.displayOrder ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setRemoveTarget(a)}
                      className="text-xs font-medium text-red-500 hover:underline flex items-center gap-1 ml-auto"
                    >
                      <Trash2 size={11} /> Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add modal */}
      {modal && (
        <Modal title="Add Class-Subject Assignment" onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
              <select
                value={form.classId}
                onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}
                className={inputCls(!!formErr.classId)}
              >
                <option value="">— Select —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {formErr.classId && <p className="mt-1 text-xs text-red-600">{formErr.classId}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <select
                value={form.subjectId}
                onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
                className={inputCls(!!formErr.subjectId)}
              >
                <option value="">— Select —</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                ))}
              </select>
              {formErr.subjectId && <p className="mt-1 text-xs text-red-600">{formErr.subjectId}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
              <input
                type="number"
                min={0}
                value={form.displayOrder}
                onChange={e => setForm(f => ({ ...f, displayOrder: e.target.value }))}
                placeholder="Optional"
                className={inputCls(!!formErr.displayOrder)}
              />
              {formErr.displayOrder && <p className="mt-1 text-xs text-red-600">{formErr.displayOrder}</p>}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(false)}
                      className="flex-1 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleAdd} disabled={adding}
                      className="flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                      style={{ backgroundColor: '#2471A3' }}>
                {adding ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Add'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Remove confirmation */}
      {removeTarget && (
        <Modal title="Remove Assignment" onClose={() => setRemoveTarget(null)}>
          <p className="text-sm text-gray-700 mb-5">
            Remove <strong>{removeTarget.subject?.name}</strong> from <strong>{removeTarget.class?.name}</strong>?
          </p>
          <div className="flex gap-3">
            <button onClick={() => setRemoveTarget(null)}
                    className="flex-1 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={() => removeAssignment(removeTarget.id)}
              disabled={removing}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: '#C0392B' }}
            >
              {removing ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Remove'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
