/**
 * SectionRulesTab — configure subject-section rules (assessability, max score).
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, CheckCircle, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminSectionRulesApi, adminSubjectsApi } from '../../../api/admin.js';
import { schoolSectionsApi } from '../../../api/academic.js';

// ── Helpers ───────────────────────────────────────────────────

function inputCls(err) {
  return `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary
          ${err ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`;
}

function BoolBadge({ value }) {
  return value ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700">
      <CheckCircle size={9} /> Yes
    </span>
  ) : (
    <span className="text-gray-400 text-xs">No</span>
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

export default function SectionRulesTab() {
  const qc = useQueryClient();
  const [modal, setModal]     = useState(null); // null | { mode:'create'|'edit', rule? }
  const [form, setForm]       = useState({ subjectId: '', schoolSectionId: '', isAssessable: true, maxScore: '100', displayOrder: '' });
  const [formErr, setFormErr] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin-section-rules'],
    queryFn:  () => adminSectionRulesApi.list().then(r => r.data.data),
  });
  const { data: subjectsData } = useQuery({
    queryKey: ['admin-subjects'],
    queryFn:  () => adminSubjectsApi.list({ includeInactive: false }).then(r => r.data.data),
    staleTime: 5 * 60_000,
  });
  const { data: sectionsData } = useQuery({
    queryKey: ['school-sections'],
    queryFn:  () => schoolSectionsApi.list().then(r => r.data.data),
    staleTime: 5 * 60_000,
  });

  const rules    = data         ?? [];
  const subjects = subjectsData ?? [];
  const sections = sectionsData ?? [];

  const openCreate = () => {
    setForm({
      subjectId:      subjects[0]?.id ?? '',
      schoolSectionId: sections[0]?.id ?? '',
      isAssessable:   true,
      maxScore:       '100',
      displayOrder:   '',
    });
    setFormErr({});
    setModal({ mode: 'create' });
  };
  const openEdit = (r) => {
    setForm({
      subjectId:       r.subjectId,
      schoolSectionId: r.schoolSectionId,
      isAssessable:    r.isAssessable ?? true,
      maxScore:        r.maxScore != null ? String(r.maxScore) : '100',
      displayOrder:    r.displayOrder != null ? String(r.displayOrder) : '',
    });
    setFormErr({});
    setModal({ mode: 'edit', rule: r });
  };

  const validate = () => {
    const errs = {};
    if (modal?.mode === 'create') {
      if (!form.subjectId)       errs.subjectId       = 'Required';
      if (!form.schoolSectionId) errs.schoolSectionId = 'Required';
    }
    if (form.maxScore === '' || isNaN(Number(form.maxScore)) || Number(form.maxScore) <= 0)
      errs.maxScore = 'Must be a positive number';
    if (form.displayOrder !== '' && isNaN(Number(form.displayOrder)))
      errs.displayOrder = 'Must be a number';
    setFormErr(errs);
    return Object.keys(errs).length === 0;
  };

  const { mutate: saveRule, isPending: saving } = useMutation({
    mutationFn: (payload) => modal?.mode === 'create'
      ? adminSectionRulesApi.create(payload)
      : adminSectionRulesApi.update(modal.rule.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-section-rules'] });
      toast.success(modal?.mode === 'create' ? 'Rule created' : 'Rule updated');
      setModal(null);
    },
    onError: (e) => {
      const msg = e.response?.data?.error ?? 'Save failed';
      toast.error(e.response?.status === 409 ? 'A rule for this subject/section combination already exists' : msg);
    },
  });

  const handleSave = () => {
    if (!validate()) return;
    const payload = {
      isAssessable:  form.isAssessable,
      maxScore:      Number(form.maxScore),
      displayOrder:  form.displayOrder !== '' ? Number(form.displayOrder) : undefined,
    };
    if (modal?.mode === 'create') {
      payload.subjectId       = form.subjectId;
      payload.schoolSectionId = form.schoolSectionId;
    }
    saveRule(payload);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          Subject-section rules control assessability and max scores per school section.
        </p>
        <button onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white"
                style={{ backgroundColor: '#2471A3' }}>
          <Plus size={14} /> Add Rule
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400"><Loader2 size={20} className="animate-spin mx-auto" /></div>
        ) : rules.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No section rules yet. Add one to get started.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Subject', 'School Section', 'Assessable', 'Max Score', 'Order', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rules.map(r => (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <span className="font-mono text-xs text-gray-500 mr-2">{r.subject?.code}</span>
                    {r.subject?.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.schoolSection?.name ?? '—'}</td>
                  <td className="px-4 py-3"><BoolBadge value={r.isAssessable} /></td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{r.maxScore ?? 100}</td>
                  <td className="px-4 py-3 text-gray-500">{r.displayOrder ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(r)}
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
          title={modal.mode === 'create' ? 'Add Section Rule' : 'Edit Section Rule'}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            {modal.mode === 'create' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                  <select
                    value={form.subjectId}
                    onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
                    className={inputCls(!!formErr.subjectId)}
                  >
                    <option value="">— Select —</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                  </select>
                  {formErr.subjectId && <p className="mt-1 text-xs text-red-600">{formErr.subjectId}</p>}
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
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Score *</label>
              <input
                type="number"
                min={1}
                value={form.maxScore}
                onChange={e => setForm(f => ({ ...f, maxScore: e.target.value }))}
                className={inputCls(!!formErr.maxScore)}
              />
              {formErr.maxScore && <p className="mt-1 text-xs text-red-600">{formErr.maxScore}</p>}
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
                  checked={form.isAssessable}
                  onChange={e => setForm(f => ({ ...f, isAssessable: e.target.checked }))}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                Subject is assessable in this section
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
