/**
 * UsersTab — manage system users (roles, status, password reset).
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, CheckCircle, XCircle, Loader2, X, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminUsersApi } from '../../../api/admin.js';

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
                     bg-red-50 text-red-700 ring-1 ring-red-200">
      <XCircle size={10} /> Inactive
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

const ROLE_OPTIONS = [
  { value: 'system_admin',  label: 'System Admin' },
  { value: 'head_teacher',  label: 'Head Teacher' },
  { value: 'dos',           label: 'Director of Studies' },
  { value: 'bursar',        label: 'Bursar' },
  { value: 'class_teacher', label: 'Class Teacher' },
];

function roleLabel(roleName) {
  return ROLE_OPTIONS.find(r => r.value === roleName)?.label ?? roleName;
}

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Main component ────────────────────────────────────────────

export default function UsersTab() {
  const qc = useQueryClient();

  // modal: null | { mode: 'create' | 'edit' | 'reset', user? }
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState({ fullName: '', username: '', roleName: 'class_teacher', temporaryPassword: '' });
  const [resetPwd, setResetPwd] = useState('');
  const [formErr, setFormErr] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn:  () => adminUsersApi.list({ includeInactive: true }).then(r => r.data.data),
  });
  const users = data ?? [];

  const openCreate = () => {
    setForm({ fullName: '', username: '', roleName: 'class_teacher', temporaryPassword: '' });
    setFormErr({});
    setModal({ mode: 'create' });
  };
  const openEdit = (u) => {
    setForm({ fullName: u.fullName, username: u.username, roleName: u.roleName, temporaryPassword: '' });
    setFormErr({});
    setModal({ mode: 'edit', user: u });
  };
  const openReset = (u) => {
    setResetPwd('');
    setFormErr({});
    setModal({ mode: 'reset', user: u });
  };

  const validateCreate = () => {
    const errs = {};
    if (!form.fullName.trim())        errs.fullName        = 'Required';
    if (!form.username.trim())        errs.username        = 'Required';
    if (!form.roleName)               errs.roleName        = 'Required';
    if (!form.temporaryPassword.trim()) errs.temporaryPassword = 'Required';
    setFormErr(errs);
    return Object.keys(errs).length === 0;
  };
  const validateEdit = () => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = 'Required';
    if (!form.roleName)        errs.roleName = 'Required';
    setFormErr(errs);
    return Object.keys(errs).length === 0;
  };
  const validateReset = () => {
    const errs = {};
    if (!resetPwd.trim()) errs.resetPwd = 'Required';
    setFormErr(errs);
    return Object.keys(errs).length === 0;
  };

  const { mutate: saveUser, isPending: saving } = useMutation({
    mutationFn: (payload) => modal?.mode === 'create'
      ? adminUsersApi.create(payload)
      : adminUsersApi.update(modal.user.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(modal?.mode === 'create' ? 'User created' : 'User updated');
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.errors?.[0]?.msg ?? e.response?.data?.error ?? 'Save failed'),
  });

  const { mutate: toggleStatus, isPending: toggling } = useMutation({
    mutationFn: ({ id, isActive }) => isActive
      ? adminUsersApi.reactivate(id)
      : adminUsersApi.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User status updated');
    },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Update failed'),
  });

  const { mutate: doReset, isPending: resetting } = useMutation({
    mutationFn: ({ id, newPassword }) => adminUsersApi.resetPassword(id, { newPassword }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Password reset successfully');
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Reset failed'),
  });

  const handleSave = () => {
    if (modal?.mode === 'create') {
      if (!validateCreate()) return;
      saveUser({ fullName: form.fullName.trim(), username: form.username.trim(), roleName: form.roleName, temporaryPassword: form.temporaryPassword });
    } else {
      if (!validateEdit()) return;
      saveUser({ fullName: form.fullName.trim(), roleName: form.roleName });
    }
  };

  const handleReset = () => {
    if (!validateReset()) return;
    doReset({ id: modal.user.id, newPassword: resetPwd });
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          Manage staff accounts. Class teachers can only enter scores.
        </p>
        <button onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white"
                style={{ backgroundColor: '#2471A3' }}>
          <Plus size={14} /> Add User
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400"><Loader2 size={20} className="animate-spin mx-auto" /></div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No users found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Full Name', 'Username', 'Role', 'Status', 'Last Login', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.fullName}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{u.username}</td>
                  <td className="px-4 py-3 text-gray-600">{roleLabel(u.roleName)}</td>
                  <td className="px-4 py-3"><StatusBadge active={u.isActive} /></td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmtDateTime(u.lastLoginAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(u)}
                              className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                        <Edit2 size={11} /> Edit
                      </button>
                      <button onClick={() => openReset(u)}
                              className="text-xs font-medium text-amber-600 hover:underline flex items-center gap-1">
                        <Key size={11} /> Reset
                      </button>
                      <button
                        onClick={() => toggleStatus({ id: u.id, isActive: !u.isActive })}
                        disabled={toggling}
                        className={`text-xs font-medium hover:underline ${u.isActive ? 'text-red-600' : 'text-green-600'}`}
                      >
                        {u.isActive ? 'Deactivate' : 'Reactivate'}
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
      {modal && modal.mode !== 'reset' && (
        <Modal
          title={modal.mode === 'create' ? 'Add User' : 'Edit User'}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                placeholder="e.g. Sarah Nakato"
                className={inputCls(!!formErr.fullName)}
              />
              {formErr.fullName && <p className="mt-1 text-xs text-red-600">{formErr.fullName}</p>}
            </div>
            {modal.mode === 'create' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <input
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="e.g. snakato"
                  className={inputCls(!!formErr.username)}
                />
                {formErr.username && <p className="mt-1 text-xs text-red-600">{formErr.username}</p>}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select
                value={form.roleName}
                onChange={e => setForm(f => ({ ...f, roleName: e.target.value }))}
                className={inputCls(!!formErr.roleName)}
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {formErr.roleName && <p className="mt-1 text-xs text-red-600">{formErr.roleName}</p>}
            </div>
            {modal.mode === 'create' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password *</label>
                <input
                  type="text"
                  value={form.temporaryPassword}
                  onChange={e => setForm(f => ({ ...f, temporaryPassword: e.target.value }))}
                  placeholder="Initial password"
                  className={inputCls(!!formErr.temporaryPassword)}
                />
                <p className="mt-1 text-xs text-gray-400">User should change this on first login.</p>
                {formErr.temporaryPassword && <p className="mt-1 text-xs text-red-600">{formErr.temporaryPassword}</p>}
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

      {/* Reset password modal */}
      {modal?.mode === 'reset' && (
        <Modal title={`Reset Password — ${modal.user.fullName}`} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter a new password for <strong>{modal.user.username}</strong>. They will need to use this to log in.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password *</label>
              <input
                type="text"
                value={resetPwd}
                onChange={e => setResetPwd(e.target.value)}
                placeholder="New password"
                className={inputCls(!!formErr.resetPwd)}
              />
              {formErr.resetPwd && <p className="mt-1 text-xs text-red-600">{formErr.resetPwd}</p>}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)}
                      className="flex-1 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleReset} disabled={resetting}
                      className="flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                      style={{ backgroundColor: '#F39C12' }}>
                {resetting ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Reset Password'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
