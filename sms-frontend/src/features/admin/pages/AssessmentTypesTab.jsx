/**
 * AssessmentTypesTab — manage assessment types (BOT, MOT, EOT, etc.).
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, CheckCircle, XCircle, Loader2, X, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAssessmentTypesApi } from '../../../api/admin.js';

// ── Helpers ───────────────────────────────────────────────────

function inputCls(err) {
  return `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary
          ${err ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`;
}

function StatusBadge({ active }) {
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

function BoolBadge({ value, trueLabel = 'Yes', falseLabel = 'No' }) {
  return value ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700">
      <CheckCircle size={9} /> {trueLabel}
    </span>
  ) : (
    <span className="text-gray-400 text-xs">{falseLabel}</span>
  );
}

function SystemBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                     bg-purple-50 text-purple-700 ring-1 ring-purple-200">
      <Lock size={9} /> System
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

// ── Main component ────────────────────────────────────────────

export default function AssessmentTypesTab() {
  const qc = useQueryClient();
  const [modal, setModal]     = useState(null); // null | { mode:'create'|'edit', type? }
  const [form, setForm]       = useState({ code: '', label: '', appearsOnReportCard: true, displayOrder: '' });
  const [formErr, setFormErr] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin-assessment-types'],
    queryFn:  () => adminAssessmentTypesApi.list().then(r => r.data.data),
  });
  const types = data ?? [];

  const openCreate = () => {
    setForm({ code: '', label: '', appearsOnReportCard: true, displayOrder: '' });
    setFormErr({});
    setModal({ mode: 'create' });
  };
  const openEdit = (t) => {
    setForm({
      code:                t.code,
      label:               t.label,
      appearsOnReportCard: t.appearsOnReportCard ?? true,
      displayOrder:        t.displayOrder != null ? String(t.displayOrder) : '',
    });
    setFormErr({});
    setModal({ mode: 'edit', type: t });
  };

  const validate = () => {
    const errs = {};
    if (modal?.mode === 'create') {
      if (!form.code.trim()) errs.code = 'Required';
    }
    if (!form.label.trim()) errs.label = 'Required';
    if (form.displayOrder !== '' && isNaN(Number(form.displayOrder)))
      errs.displayOrder = 'Must be a number';
    setFormErr(errs);
    return Object.keys(errs).length === 0;
  };

  const { mutate: saveType, isPending: saving } = useMutation({
    mutationFn: (payload) => modal?.mode === 'create'
      ? adminAssessmentTypesApi.create(payload)
      : adminAssessmentTypesApi.update(modal.type.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-assessment-types'] });
      toast.success(modal?.mode === 'create' ? 'Assessment type created' : 'Assessment type updated');
      setModal(null);
    },
    onError: (e) => {
      const msg = e.response?.data?.error ?? 'Save failed';
      toast.error(e.response?.status === 409 ? 'A type with this code already exists' : msg);
    },
  });

  const { mutate: deactivateType, isPending: deactivating } = useMutation({
    mutationFn: (id) => adminAssessmentTypesApi.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-assessment-types'] });
      toast.success('Assessment type deactivated');
    },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Deactivate failed'),
  });

  const handleSave = () => {
    if (!validate()) return;
    const payload = {
      label:               form.label.trim(),
      appearsOnReportCard: form.appearsOnReportCard,
      displayOrder:        form.displayOrder !== '' ? Number(form.displayOrder) : undefined,
    };
    if (modal?.mode === 'create') payload.code = form.code.trim().toUpperCase();
    saveType(payload);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          System defaults (BOT, MOT, EOT) cannot be edited. Add custom types as needed.
        </p>
        <button onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white"
                style={{ backgroundColor: '#2471A3' }}>
          <Plus size={14} /> Add Type
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400"><Loader2 size={20} className="animate-spin mx-auto" /></div>
        ) : types.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No assessment types found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Code', 'Label', 'On Report', 'Contributes', 'Order', 'Type', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {types.map(t => (
                <tr key={t.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 font-medium">{t.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{t.label}</td>
                  <td className="px-4 py-3"><BoolBadge value={t.appearsOnReportCard} /></td>
                  <td className="px-4 py-3"><BoolBadge value={t.contributesToAggregate} /></td>
                  <td className="px-4 py-3 text-gray-500">{t.displayOrder ?? '—'}</td>
                  <td className="px-4 py-3">
                    {t.isSystemDefault ? <SystemBadge /> : (
                      <span className="text-xs text-gray-400">Custom</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusBadge active={t.isActive ?? true} /></td>
                  <td className="px-4 py-3 text-right">
                    {t.isSystemDefault ? (
                      <span className="text-xs text-gray-400 italic">System default</span>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(t)}
                                className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                          <Edit2 size={11} /> Edit
                        </button>
                        {(t.isActive ?? true) && (
                          <button
                            onClick={() => deactivateType(t.id)}
                            disabled={deactivating}
                            className="text-xs font-medium text-red-600 hover:underline"
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'Add Assessment Type' : 'Edit Assessment Type'}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            {modal.mode === 'create' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                <input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="e.g. CLASS"
                  className={inputCls(!!formErr.code)}
                />
                <p className="mt-1 text-xs text-gray-400">Short identifier. Auto-uppercased.</p>
                {formErr.code && <p className="mt-1 text-xs text-red-600">{formErr.code}</p>}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label *</label>
              <input
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Classwork"
                className={inputCls(!!formErr.label)}
              />
              {formErr.label && <p className="mt-1 text-xs text-red-600">{formErr.label}</p>}
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
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.appearsOnReportCard}
                  onChange={e => setForm(f => ({ ...f, appearsOnReportCard: e.target.checked }))}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                Appears on report card
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
    </>
  );
}
