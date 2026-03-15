/**
 * InstitutionProfileTab — school identity + contact + mobile money settings.
 *
 * On save: updates the school store so the sidebar logo refreshes immediately.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, X, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { schoolProfileApi } from '../../../api/admin.js';
import { useSchoolStore }   from '../../../store/schoolStore.js';

// ── Tiny shared helpers ───────────────────────────────────────

function Field({ label, error, hint, children, required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint  && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

function TextInput({ error, ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none
                  focus:ring-2 focus:ring-primary transition-colors
                  ${error ? 'border-red-300 focus:ring-red-300' : 'border-gray-200 focus:border-primary'}`}
    />
  );
}

function SectionHeading({ children }) {
  return (
    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide pt-2">
      {children}
    </h3>
  );
}

// ── Logo upload ───────────────────────────────────────────────

function LogoUpload({ currentLogoUrl, logoFile, setLogoFile }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  // Revoke blob URL on cleanup to avoid memory leaks
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/svg+xml'].includes(file.type)) {
      toast.error('Logo must be JPEG, PNG, or SVG');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2 MB');
      return;
    }
    setLogoFile(file);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  }, [setLogoFile, preview]);

  const clear = () => {
    setLogoFile(null);
    if (preview) { URL.revokeObjectURL(preview); setPreview(null); }
    if (inputRef.current) inputRef.current.value = '';
  };

  const displaySrc = preview ?? currentLogoUrl;

  return (
    <div className="flex items-center gap-5">
      {/* Circular preview */}
      <div className="relative shrink-0">
        {displaySrc ? (
          <>
            <img
              src={displaySrc}
              alt="School logo"
              className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
            />
            {logoFile && (
              <button
                type="button"
                onClick={clear}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full
                           flex items-center justify-center hover:opacity-90"
              >
                <X size={10} />
              </button>
            )}
          </>
        ) : (
          <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300
                          flex items-center justify-center text-gray-400">
            <Camera size={24} />
          </div>
        )}
      </div>

      <div className="text-sm text-gray-500">
        <p className="font-medium text-gray-700 mb-1">School Logo</p>
        <p className="text-xs">JPEG, PNG, or SVG, max 2 MB.</p>
        <p className="text-xs mb-2">Shown in the sidebar and on printed documents.</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200
                     hover:bg-gray-50 text-gray-700 transition-colors"
        >
          {displaySrc ? 'Change logo' : 'Upload logo'}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/svg+xml"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

export default function InstitutionProfileTab() {
  const qc          = useQueryClient();
  const setProfile  = useSchoolStore((s) => s.setProfile);
  const [logoFile, setLogoFile] = useState(null);

  // ── Load current profile ──────────────────────────────────
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['school-profile'],
    queryFn:  () => schoolProfileApi.get().then(r => r.data.data),
    staleTime: 5 * 60_000,
  });

  const profile = profileData ?? {};

  // ── Form state (controlled) ───────────────────────────────
  const [form, setForm] = useState({
    schoolName:             '',
    schoolMotto:            '',
    addressLine1:           '',
    addressLine2:           '',
    primaryPhone:           '',
    secondaryPhone:         '',
    email:                  '',
    website:                '',
    mobileMoneyMtn:         '',
    mobileMoneyAirtel:      '',
    mobileMoneyAccountName: '',
    invoiceFineAfterDueDate: '',
  });

  // Populate form when profile data arrives
  useEffect(() => {
    if (!profileData) return;
    setForm({
      schoolName:             profileData.schoolName             ?? '',
      schoolMotto:            profileData.schoolMotto            ?? '',
      addressLine1:           profileData.addressLine1           ?? '',
      addressLine2:           profileData.addressLine2           ?? '',
      primaryPhone:           profileData.phonePrimary           ?? '',
      secondaryPhone:         profileData.phoneSecondary         ?? '',
      email:                  profileData.email                  ?? '',
      website:                profileData.website                ?? '',
      mobileMoneyMtn:         profileData.mobileMoneyMtn         ?? '',
      mobileMoneyAirtel:      profileData.mobileMoneyAirtel      ?? '',
      mobileMoneyAccountName: profileData.mobileMoneyAccountName ?? '',
      invoiceFineAfterDueDate: profileData.invoiceFineAfterDueDate != null
                                ? String(profileData.invoiceFineAfterDueDate)
                                : '',
    });
  }, [profileData]);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  // ── Save mutation ─────────────────────────────────────────
  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      for (const [k, v] of Object.entries(form)) {
        if (v !== '') fd.append(k, v);
      }
      if (logoFile) fd.append('logo', logoFile);
      return schoolProfileApi.update(fd);
    },
    onSuccess: (res) => {
      const updated = res.data.data;
      // Refresh query cache
      qc.setQueryData(['school-profile'], updated);
      // Update sidebar store immediately
      setProfile({ schoolName: updated.schoolName, logoUrl: updated.logoUrl });
      setLogoFile(null);
      toast.success('Institution profile saved');
    },
    onError: (e) => {
      const msg = e.response?.data?.errors?.[0]?.msg
               ?? e.response?.data?.error
               ?? 'Save failed';
      toast.error(msg);
    },
  });

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Logo ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <SectionHeading>Logo</SectionHeading>
        <div className="mt-4">
          <LogoUpload
            currentLogoUrl={profile.logoUrl ?? null}
            logoFile={logoFile}
            setLogoFile={setLogoFile}
          />
        </div>
      </div>

      {/* ── School Identity ───────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <SectionHeading>School Identity</SectionHeading>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="School Name" required>
              <TextInput
                value={form.schoolName}
                onChange={set('schoolName')}
                placeholder="Highfield Primary School"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="School Motto">
              <TextInput
                value={form.schoolMotto}
                onChange={set('schoolMotto')}
                placeholder="e.g. Excellence in All We Do"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Address Line 1">
              <TextInput
                value={form.addressLine1}
                onChange={set('addressLine1')}
                placeholder="e.g. Plot 12, Entebbe Road"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Address Line 2">
              <TextInput
                value={form.addressLine2}
                onChange={set('addressLine2')}
                placeholder="e.g. Kampala, Uganda"
              />
            </Field>
          </div>
        </div>
      </div>

      {/* ── Contact Details ───────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <SectionHeading>Contact Details</SectionHeading>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Primary Phone">
            <TextInput
              value={form.primaryPhone}
              onChange={set('primaryPhone')}
              placeholder="+256772000001"
              type="tel"
            />
          </Field>
          <Field label="Secondary Phone">
            <TextInput
              value={form.secondaryPhone}
              onChange={set('secondaryPhone')}
              placeholder="+256701000001"
              type="tel"
            />
          </Field>
          <Field label="Email Address">
            <TextInput
              value={form.email}
              onChange={set('email')}
              placeholder="info@school.ug"
              type="email"
            />
          </Field>
          <Field label="Website">
            <TextInput
              value={form.website}
              onChange={set('website')}
              placeholder="https://highfield.ug"
              type="url"
            />
          </Field>
        </div>
      </div>

      {/* ── Mobile Money ──────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <SectionHeading>Mobile Money</SectionHeading>
        <p className="text-xs text-gray-400 mt-1 mb-4">
          Printed on invoices for additional fee payments (uniform, trips, etc.)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="MTN Mobile Money Number" hint="+256XXXXXXXXX">
            <TextInput
              value={form.mobileMoneyMtn}
              onChange={set('mobileMoneyMtn')}
              placeholder="+256772000001"
              type="tel"
            />
          </Field>
          <Field label="Airtel Money Number" hint="+256XXXXXXXXX">
            <TextInput
              value={form.mobileMoneyAirtel}
              onChange={set('mobileMoneyAirtel')}
              placeholder="+256701000001"
              type="tel"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Account Name" hint="Name as it appears on mobile money">
              <TextInput
                value={form.mobileMoneyAccountName}
                onChange={set('mobileMoneyAccountName')}
                placeholder="e.g. Highfield Primary School"
              />
            </Field>
          </div>
        </div>
      </div>

      {/* ── Invoicing ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <SectionHeading>Invoicing</SectionHeading>
        <div className="mt-4 max-w-xs">
          <Field
            label="Default Invoice Fine (UGX)"
            hint="Charged per invoice if fees are not paid by the due date"
          >
            <TextInput
              value={form.invoiceFineAfterDueDate}
              onChange={set('invoiceFineAfterDueDate')}
              placeholder="e.g. 5000"
              type="number"
              min="0"
            />
          </Field>
        </div>
      </div>

      {/* ── Save ──────────────────────────────────────────── */}
      <div className="flex justify-end pb-4">
        <button
          type="button"
          onClick={() => save()}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg
                     text-white disabled:opacity-60 transition-colors hover:opacity-90"
          style={{ backgroundColor: '#2471A3' }}
        >
          {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}
