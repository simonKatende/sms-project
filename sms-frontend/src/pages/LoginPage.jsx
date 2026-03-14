import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authApi } from '../api/auth.js';
import { useAuthStore } from '../store/authStore.js';

export default function LoginPage() {
  const navigate  = useNavigate();
  const setAuth   = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  const { mutate: login, isPending } = useMutation({
    mutationFn: () => authApi.login(form),
    onSuccess: ({ data }) => {
      setAuth(data.user, data.accessToken);
      navigate('/', { replace: true });
    },
    onError: (err) => {
      const msg = err.response?.data?.error ?? 'Login failed. Please try again.';
      setError(msg);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.username || !form.password) return;
    login();
  };

  const canSubmit = form.username.trim() && form.password && !isPending;

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel: school branding ─────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center gap-8 px-16"
           style={{ backgroundColor: '#1A3C5E' }}>
        {/* School crest placeholder */}
        <div className="w-28 h-28 rounded-full bg-white/10 flex items-center justify-center">
          <GraduationCap size={56} className="text-white opacity-80" />
        </div>
        <div className="text-center text-white">
          <h1 className="text-3xl font-bold tracking-tight">Highfield Primary School</h1>
          <p className="mt-3 text-base text-white/70">Knowledge · Integrity · Excellence</p>
        </div>
        <p className="text-white/40 text-sm">School Management System v1.0</p>
      </div>

      {/* ── Right panel: login form ──────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-surface">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm px-8 py-10">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-6">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
                 style={{ backgroundColor: '#1A3C5E' }}>
              <GraduationCap size={28} className="text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
          <p className="mt-1 text-sm text-gray-500">Sign in to continue to the SMS</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoFocus
                autoComplete="username"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                           disabled:bg-gray-50"
                disabled={isPending}
                placeholder="Enter your username"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-11 text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                             disabled:bg-gray-50"
                  disabled={isPending}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400
                             hover:text-gray-600 focus:outline-none"
                  tabIndex={-1}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div role="alert"
                   className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white
                         transition-opacity disabled:opacity-50 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              style={{ backgroundColor: '#2471A3' }}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                            stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            Contact your system administrator if you cannot access your account.
          </p>
        </div>
      </div>
    </div>
  );
}
