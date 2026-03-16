/**
 * GradingScaleTab — view and inline-edit grading scale entries and division boundaries.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Check, X as XIcon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminGradingApi } from '../../../api/admin.js';

// ── Helpers ───────────────────────────────────────────────────

function inlineInputCls(err) {
  return `w-full rounded border px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary
          ${err ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'}`;
}

// ── Grade Entries Table ───────────────────────────────────────

function GradeEntriesSection({ entries }) {
  const qc = useQueryClient();
  const [editingId, setEditingId]   = useState(null);
  const [editForm, setEditForm]     = useState({});
  const [editErr, setEditErr]       = useState({});

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditForm({
      minMark: String(entry.minMark),
      maxMark: String(entry.maxMark),
      points:  String(entry.points),
      label:   entry.label ?? '',
    });
    setEditErr({});
  };
  const cancelEdit = () => { setEditingId(null); setEditErr({}); };

  const validate = () => {
    const errs = {};
    if (editForm.minMark === '' || isNaN(Number(editForm.minMark))) errs.minMark = 'Required';
    if (editForm.maxMark === '' || isNaN(Number(editForm.maxMark))) errs.maxMark = 'Required';
    if (editForm.points  === '' || isNaN(Number(editForm.points)))  errs.points  = 'Required';
    if (Number(editForm.minMark) > Number(editForm.maxMark)) errs.maxMark = 'Must be ≥ min';
    setEditErr(errs);
    return Object.keys(errs).length === 0;
  };

  const { mutate: updateEntry, isPending: saving } = useMutation({
    mutationFn: ({ id, data }) => adminGradingApi.updateEntry(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-grading-scale'] });
      toast.success('Grade entry updated');
      setEditingId(null);
    },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Save failed'),
  });

  const handleSave = (id) => {
    if (!validate()) return;
    updateEntry({
      id,
      data: {
        minMark: Number(editForm.minMark),
        maxMark: Number(editForm.maxMark),
        points:  Number(editForm.points),
        label:   editForm.label || undefined,
      },
    });
  };

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-gray-800">Grade Entries</h2>
        <p className="text-xs text-gray-400">Uganda MoES 9-point scale. Click Edit on any row to adjust thresholds.</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Grade', 'Min Mark', 'Max Mark', 'Points', 'Label', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {entries.map(entry => (
              <tr key={entry.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-bold text-gray-900">{entry.grade}</td>
                {editingId === entry.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={editForm.minMark}
                        onChange={e => setEditForm(f => ({ ...f, minMark: e.target.value }))}
                        className={inlineInputCls(!!editErr.minMark)}
                      />
                      {editErr.minMark && <p className="text-xs text-red-600 mt-0.5">{editErr.minMark}</p>}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={editForm.maxMark}
                        onChange={e => setEditForm(f => ({ ...f, maxMark: e.target.value }))}
                        className={inlineInputCls(!!editErr.maxMark)}
                      />
                      {editErr.maxMark && <p className="text-xs text-red-600 mt-0.5">{editErr.maxMark}</p>}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={editForm.points}
                        onChange={e => setEditForm(f => ({ ...f, points: e.target.value }))}
                        className={inlineInputCls(!!editErr.points)}
                      />
                      {editErr.points && <p className="text-xs text-red-600 mt-0.5">{editErr.points}</p>}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={editForm.label}
                        onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))}
                        className={inlineInputCls(false)}
                        placeholder="e.g. Distinction 1"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleSave(entry.id)}
                          disabled={saving}
                          className="p-1.5 rounded text-white text-xs"
                          style={{ backgroundColor: '#148F77' }}
                          title="Save"
                        >
                          {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
                          title="Cancel"
                        >
                          <XIcon size={12} />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-gray-600">{entry.minMark}</td>
                    <td className="px-4 py-3 text-gray-600">{entry.maxMark}</td>
                    <td className="px-4 py-3 text-gray-600">{entry.points}</td>
                    <td className="px-4 py-3 text-gray-500">{entry.label ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => startEdit(entry)}
                        className="text-xs font-medium text-primary hover:underline flex items-center gap-1 ml-auto"
                      >
                        <Edit2 size={11} /> Edit
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Division Boundaries Table ─────────────────────────────────

function DivisionBoundariesSection({ divisions }) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm]   = useState({});
  const [editErr, setEditErr]     = useState({});

  const startEdit = (div) => {
    setEditingId(div.id);
    setEditForm({ minPoints: String(div.minPoints), maxPoints: String(div.maxPoints) });
    setEditErr({});
  };
  const cancelEdit = () => { setEditingId(null); setEditErr({}); };

  const validate = () => {
    const errs = {};
    if (editForm.minPoints === '' || isNaN(Number(editForm.minPoints))) errs.minPoints = 'Required';
    if (editForm.maxPoints === '' || isNaN(Number(editForm.maxPoints))) errs.maxPoints = 'Required';
    if (Number(editForm.minPoints) > Number(editForm.maxPoints)) errs.maxPoints = 'Must be ≥ min';
    setEditErr(errs);
    return Object.keys(errs).length === 0;
  };

  const { mutate: updateDivision, isPending: saving } = useMutation({
    mutationFn: ({ id, data }) => adminGradingApi.updateDivision(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-grading-scale'] });
      toast.success('Division boundary updated');
      setEditingId(null);
    },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Save failed'),
  });

  const handleSave = (id) => {
    if (!validate()) return;
    updateDivision({ id, data: { minPoints: Number(editForm.minPoints), maxPoints: Number(editForm.maxPoints) } });
  };

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-gray-800">Division Boundaries</h2>
        <p className="text-xs text-gray-400">Aggregate point ranges for each division. Lower aggregate = better performance.</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Division', 'Min Points', 'Max Points', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {divisions.map(div => (
              <tr key={div.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-bold text-gray-900">{div.divisionName}</td>
                {editingId === div.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={editForm.minPoints}
                        onChange={e => setEditForm(f => ({ ...f, minPoints: e.target.value }))}
                        className={inlineInputCls(!!editErr.minPoints)}
                      />
                      {editErr.minPoints && <p className="text-xs text-red-600 mt-0.5">{editErr.minPoints}</p>}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={editForm.maxPoints}
                        onChange={e => setEditForm(f => ({ ...f, maxPoints: e.target.value }))}
                        className={inlineInputCls(!!editErr.maxPoints)}
                      />
                      {editErr.maxPoints && <p className="text-xs text-red-600 mt-0.5">{editErr.maxPoints}</p>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleSave(div.id)}
                          disabled={saving}
                          className="p-1.5 rounded text-white text-xs"
                          style={{ backgroundColor: '#148F77' }}
                          title="Save"
                        >
                          {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
                          title="Cancel"
                        >
                          <XIcon size={12} />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-gray-600">{div.minPoints}</td>
                    <td className="px-4 py-3 text-gray-600">{div.maxPoints}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => startEdit(div)}
                        className="text-xs font-medium text-primary hover:underline flex items-center gap-1 ml-auto"
                      >
                        <Edit2 size={11} /> Edit
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────

export default function GradingScaleTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-grading-scale'],
    queryFn:  () => adminGradingApi.getActive().then(r => r.data.data),
  });

  if (isLoading) {
    return <div className="p-10 text-center text-gray-400"><Loader2 size={20} className="animate-spin mx-auto" /></div>;
  }

  const entries   = data?.entries   ?? [];
  const divisions = data?.divisions ?? [];

  return (
    <div className="space-y-8">
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-800">
        System defaults are pre-seeded per Uganda MoES standards. Changes here override the defaults for this school.
      </div>
      <GradeEntriesSection entries={entries} />
      <DivisionBoundariesSection divisions={divisions} />
    </div>
  );
}
