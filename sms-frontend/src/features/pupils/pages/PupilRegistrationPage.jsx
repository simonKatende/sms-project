import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Camera, X, AlertCircle, CheckCircle2, ChevronLeft, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { pupilsApi } from '../../../api/pupils.js';
import { classesApi, streamsApi } from '../../../api/academic.js';
import { adminHousesApi } from '../../../api/admin.js';

// ── Zod schema ────────────────────────────────────────────────
const ugandaPhone = /^\+256[0-9]{9}$/;

const parentSchema = z.object({
  fullName: z.string().optional(),
  phone:    z.string().regex(ugandaPhone, 'Must be +256XXXXXXXXX').or(z.literal('')).optional(),
  email:    z.string().email('Invalid email').or(z.literal('')).optional(),
  address:  z.string().optional(),
  nin:      z.string().optional(),
});

const schema = z.object({
  // Section 1: Personal Info
  firstName:         z.string().min(1, 'Required').max(80),
  lastName:          z.string().min(1, 'Required').max(80),
  otherNames:        z.string().optional(),
  dateOfBirth:       z.string().min(1, 'Required').refine(v => new Date(v) < new Date(), 'Must be in the past'),
  gender:            z.enum(['Male', 'Female'], { required_error: 'Required' }),
  section:           z.enum(['Day', 'Boarding'], { required_error: 'Required' }),
  religion:          z.string().optional(),
  houseId:           z.string().optional(),
  formerSchool:      z.string().optional(),
  medicalConditions: z.string().optional(),
  lin:               z.string().optional(),
  schoolpayCode:     z.string().optional(),
  // Section 2: Mother (optional)
  mother: parentSchema.optional(),
  // Section 3: Father (optional)
  father: parentSchema.optional(),
  // Section 4: Contact Person (required)
  contactPerson: z.object({
    fullName:          z.string().min(1, 'Required'),
    relationship:      z.string().min(1, 'Required'),
    primaryPhone:      z.string().regex(ugandaPhone, 'Must be +256XXXXXXXXX'),
    secondaryPhone:    z.string().regex(ugandaPhone, 'Must be +256XXXXXXXXX').or(z.literal('')).optional(),
    whatsappIndicator: z.enum(['primary', 'secondary', 'none']).default('primary'),
    email:             z.string().email('Invalid email').or(z.literal('')).optional(),
    physicalAddress:   z.string().optional(),
  }),
  // Section 5: Enrolment
  streamId:      z.string().optional(),
  enrolmentDate: z.string().min(1, 'Required'),
  // Section 6: Bursary
  isBursary: z.boolean().default(false),
  bursary: z.object({
    schemeName:          z.string().min(1, 'Required'),
    standardFeesAtAward: z.number().int().positive('Must be positive'),
    discountUgx:         z.number().int().positive('Must be positive'),
  }).optional(),
}).superRefine((data, ctx) => {
  if (data.isBursary) {
    if (!data.bursary?.schemeName)
      ctx.addIssue({ code: 'custom', path: ['bursary', 'schemeName'], message: 'Required' });
    if (!data.bursary?.standardFeesAtAward)
      ctx.addIssue({ code: 'custom', path: ['bursary', 'standardFeesAtAward'], message: 'Required' });
    if (!data.bursary?.discountUgx)
      ctx.addIssue({ code: 'custom', path: ['bursary', 'discountUgx'], message: 'Required' });
    if (data.bursary && data.bursary.standardFeesAtAward <= data.bursary.discountUgx)
      ctx.addIssue({ code: 'custom', path: ['bursary', 'discountUgx'], message: 'Discount must be less than standard fees' });
  }
});

// ── Small UI helpers ──────────────────────────────────────────

function Field({ label, error, required, children, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-danger ml-0.5" aria-hidden>*</span>}
      </label>
      {children}
      {hint  && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs text-danger flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

function Input({ error, ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none
                  focus:ring-2 focus:ring-primary transition-colors
                  ${error ? 'border-danger focus:ring-danger' : 'border-gray-200 focus:border-primary'}
                  disabled:bg-gray-50`}
    />
  );
}

function Select({ error, children, ...props }) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none
                  focus:ring-2 focus:ring-primary bg-white transition-colors
                  ${error ? 'border-danger focus:ring-danger' : 'border-gray-200 focus:border-primary'}
                  disabled:bg-gray-50`}
    >
      {children}
    </select>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function CollapsibleCard({ title, subtitle, badge, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between"
      >
        <div className="text-left">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <span className="text-xs text-gray-400 font-normal">(optional)</span>
            {badge && (
              <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && <div className="px-6 py-5">{children}</div>}
    </div>
  );
}

// ── Photo upload ──────────────────────────────────────────────
function PhotoUpload({ photoFile, setPhotoFile }) {
  const inputRef  = useRef(null);
  const [preview, setPreview] = useState(null);

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Only JPEG or PNG photos accepted');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Photo must be under 2 MB');
      return;
    }
    setPhotoFile(file);
    setPreview(URL.createObjectURL(file));
  }, [setPhotoFile]);

  const clear = () => {
    setPhotoFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex items-start gap-5">
      <div className="relative shrink-0">
        {preview ? (
          <>
            <img src={preview} alt="Preview" className="w-24 h-32 object-cover rounded-xl border border-gray-200" />
            <button
              type="button"
              onClick={clear}
              className="absolute -top-2 -right-2 w-6 h-6 bg-danger text-white rounded-full
                         flex items-center justify-center hover:opacity-90"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-24 h-32 rounded-xl border-2 border-dashed border-gray-300
                       flex flex-col items-center justify-center gap-2 text-gray-400
                       hover:border-primary hover:text-primary transition-colors"
          >
            <Camera size={24} />
            <span className="text-xs font-medium">Upload</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      <div className="text-sm text-gray-500 mt-2">
        <p className="font-medium text-gray-700">Pupil Photo</p>
        <p className="mt-1 text-xs">Upload a recent passport-size photo.</p>
        <p className="text-xs">JPEG or PNG, max 2 MB.</p>
        <p className="text-xs">Will be resized to 300×400 px on save.</p>
        {preview && (
          <button type="button" onClick={() => inputRef.current?.click()}
                  className="mt-2 text-xs text-primary hover:underline">
            Change photo
          </button>
        )}
      </div>
    </div>
  );
}

// ── Contact person lookup ─────────────────────────────────────
function ContactPersonLookup({ phone }) {
  const { data, isFetching } = useQuery({
    queryKey:  ['contact-person-check', phone],
    queryFn:   () => pupilsApi.contactPersonCheck(phone).then(r => r.data),
    enabled:   /^\+256[0-9]{9}$/.test(phone ?? ''),
    staleTime: 30_000,
  });

  if (!phone || !/^\+256[0-9]{9}$/.test(phone)) return null;
  if (isFetching) return (
    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
      <Loader2 size={12} className="animate-spin" /> Checking…
    </p>
  );
  if (!data) return null;

  if (data.exists) {
    return (
      <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 flex items-start gap-3">
        <CheckCircle2 size={16} className="text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-blue-800">Contact person already registered</p>
          <p className="text-blue-600 text-xs mt-0.5">
            {data.contactPerson.fullName} · {data.contactPerson.relationship}
          </p>
          <p className="text-blue-600 text-xs">This pupil will be linked to the existing record (family link).</p>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 flex items-start gap-3">
      <AlertCircle size={16} className="text-gray-400 mt-0.5 shrink-0" />
      <p className="text-sm text-gray-500">No existing contact found. A new record will be created.</p>
    </div>
  );
}

// ── Parent fields component ───────────────────────────────────
function ParentFields({ prefix, register, errors }) {
  const e = errors?.[prefix] ?? {};
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Full Name" error={e.fullName?.message}>
        <Input {...register(`${prefix}.fullName`)} placeholder="e.g. Mary Nakato" />
      </Field>
      <Field label="Phone" error={e.phone?.message} hint="+256XXXXXXXXX">
        <Input {...register(`${prefix}.phone`)} placeholder="+256772000000" type="tel" />
      </Field>
      <Field label="Email" error={e.email?.message}>
        <Input type="email" {...register(`${prefix}.email`)} placeholder="parent@example.com" />
      </Field>
      <Field label="NIN (National ID)" error={e.nin?.message}>
        <Input {...register(`${prefix}.nin`)} placeholder="CM123456789..." className="font-mono" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Address" error={e.address?.message}>
          <textarea {...register(`${prefix}.address`)} rows={2}
                    placeholder="Home address…"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm
                               focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
        </Field>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function PupilRegistrationPage() {
  const navigate = useNavigate();
  const [photoFile, setPhotoFile]   = useState(null);
  const [selectedClassId, setSelectedClassId] = useState('');

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver:      zodResolver(schema),
    defaultValues: {
      isBursary:                          false,
      enrolmentDate:                      new Date().toISOString().slice(0, 10),
      'contactPerson.whatsappIndicator':  'primary',
    },
  });

  const isBursary           = watch('isBursary');
  const standardFeesAtAward = watch('bursary.standardFeesAtAward') ?? 0;
  const discountUgx         = watch('bursary.discountUgx')         ?? 0;
  const agreedNetFees       = standardFeesAtAward - discountUgx;
  const contactPhone        = watch('contactPerson.primaryPhone');

  // Houses dropdown
  const { data: housesData } = useQuery({
    queryKey: ['houses-active'],
    queryFn:  () => adminHousesApi.listActive().then(r => r.data.data),
    staleTime: 10 * 60_000,
  });
  const houses = housesData ?? [];

  // Dynamic classes + streams
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn:  () => classesApi.list().then(r => r.data.data),
    staleTime: 5 * 60_000,
  });
  const classes = classesData ?? [];

  const { data: streamsData } = useQuery({
    queryKey: ['streams', selectedClassId],
    queryFn:  () => streamsApi.list({ classId: selectedClassId || undefined }).then(r => r.data.data),
    enabled:  true,
    staleTime: 5 * 60_000,
  });
  const streams = streamsData ?? [];

  const handleClassChange = (e) => {
    setSelectedClassId(e.target.value);
    setValue('streamId', '');
  };

  const { mutateAsync: createPupil } = useMutation({
    mutationFn: (fd) => pupilsApi.create(fd),
  });

  const onSubmit = async (data) => {
    try {
      const fd = new FormData();

      // Scalar pupil fields
      const scalars = ['firstName','lastName','otherNames','dateOfBirth','gender','section',
                       'religion','houseId','formerSchool','medicalConditions','lin',
                       'schoolpayCode','streamId','enrolmentDate'];
      for (const key of scalars) {
        if (data[key] != null && data[key] !== '') fd.append(key, data[key]);
      }

      // Mother (optional — only if fullName provided)
      if (data.mother?.fullName) {
        for (const [k, v] of Object.entries(data.mother)) {
          if (v != null && v !== '') fd.append(`mother[${k}]`, v);
        }
      }

      // Father (optional — only if fullName provided)
      if (data.father?.fullName) {
        for (const [k, v] of Object.entries(data.father)) {
          if (v != null && v !== '') fd.append(`father[${k}]`, v);
        }
      }

      // Contact person (required)
      for (const [k, v] of Object.entries(data.contactPerson)) {
        if (v != null && v !== '') fd.append(`contactPerson[${k}]`, v);
      }

      // Bursary
      if (data.isBursary && data.bursary) {
        fd.append('isBursary', 'true');
        fd.append('bursary[schemeName]',          data.bursary.schemeName);
        fd.append('bursary[standardFeesAtAward]', data.bursary.standardFeesAtAward);
        fd.append('bursary[discountUgx]',         data.bursary.discountUgx);
      }

      // Photo
      if (photoFile) fd.append('photo', photoFile);

      const res = await createPupil(fd);
      toast.success('Pupil registered successfully!');
      navigate(`/pupils/${res.data.data.id}`);
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.msg
               ?? err.response?.data?.error
               ?? 'Registration failed. Please check the form.';
      toast.error(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* ── Page header ──────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/pupils')}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Register New Pupil</h1>
            <p className="text-sm text-gray-500">Complete all required fields marked with *</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 max-w-3xl">

        {/* ── SECTION 1: Personal Information ─────────────── */}
        <SectionCard title="Personal Information" subtitle="Basic pupil details and photo">
          <div className="mb-6">
            <PhotoUpload photoFile={photoFile} setPhotoFile={setPhotoFile} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First Name" required error={errors.firstName?.message}>
              <Input {...register('firstName')} error={errors.firstName} placeholder="e.g. Jane" />
            </Field>
            <Field label="Last Name" required error={errors.lastName?.message}>
              <Input {...register('lastName')} error={errors.lastName} placeholder="e.g. Nakato" />
            </Field>
            <Field label="Other Names" error={errors.otherNames?.message}>
              <Input {...register('otherNames')} placeholder="Middle name(s)" />
            </Field>
            <Field label="Date of Birth" required error={errors.dateOfBirth?.message}>
              <Input type="date" {...register('dateOfBirth')} error={errors.dateOfBirth} />
            </Field>

            <Field label="Gender" required error={errors.gender?.message}>
              <div className="flex gap-4 mt-1">
                {['Male','Female'].map(g => (
                  <label key={g} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value={g} {...register('gender')} className="accent-primary" />
                    <span className="text-sm text-gray-700">{g}</span>
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Section" required error={errors.section?.message}>
              <Select {...register('section')} error={errors.section}>
                <option value="">Select section…</option>
                <option value="Day">Day (Non-Resident)</option>
                <option value="Boarding">Boarding (Resident)</option>
              </Select>
            </Field>

            <Field label="Religion" error={errors.religion?.message}>
              <Input {...register('religion')} placeholder="e.g. Catholic" />
            </Field>
            <Field label="House" error={errors.houseId?.message}>
              <div className="relative">
                <Select {...register('houseId')} error={errors.houseId}>
                  <option value="">— No house —</option>
                  {houses.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </Select>
                {/* Coloured dot overlay for selected house */}
                {(() => {
                  const selectedId = watch('houseId');
                  const h = houses.find(x => x.id === selectedId);
                  return h?.colourHex ? (
                    <span
                      className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                      style={{ backgroundColor: h.colourHex }}
                    />
                  ) : null;
                })()}
              </div>
            </Field>
            <Field label="LIN (Learner ID Number)" error={errors.lin?.message}
                   hint="Ministry of Education learner number">
              <Input {...register('lin')} placeholder="e.g. LIN-XXXX" className="font-mono" />
            </Field>
            <Field label="Former School" error={errors.formerSchool?.message}>
              <Input {...register('formerSchool')} placeholder="Previous school name" />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Medical Conditions / Notes" error={errors.medicalConditions?.message}>
              <textarea {...register('medicalConditions')} rows={2}
                        placeholder="Allergies, conditions, or special needs…"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm
                                   focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
            </Field>
          </div>
        </SectionCard>

        {/* ── SECTION 2: Mother Details (optional) ─────────── */}
        <CollapsibleCard
          title="Mother's Details"
          subtitle="Biological mother information"
          badge={watch('mother.fullName') ? 'Added' : undefined}
        >
          <ParentFields prefix="mother" register={register} errors={errors} />
        </CollapsibleCard>

        {/* ── SECTION 3: Father Details (optional) ─────────── */}
        <CollapsibleCard
          title="Father's Details"
          subtitle="Biological father information"
          badge={watch('father.fullName') ? 'Added' : undefined}
        >
          <ParentFields prefix="father" register={register} errors={errors} />
        </CollapsibleCard>

        {/* ── SECTION 4: Contact Person (required) ─────────── */}
        <SectionCard
          title="Contact Person"
          subtitle="The school's communication contact — required. Can be the mother, father, or another person."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name" required error={errors.contactPerson?.fullName?.message}>
              <Input {...register('contactPerson.fullName')} error={errors.contactPerson?.fullName}
                     placeholder="e.g. Sarah Nakato" />
            </Field>
            <Field label="Relationship" required error={errors.contactPerson?.relationship?.message}>
              <Select {...register('contactPerson.relationship')} error={errors.contactPerson?.relationship}>
                <option value="">Select…</option>
                {['Mother','Father','Guardian','Uncle','Aunt','Grandparent','Sibling','Other'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Select>
            </Field>

            <Field label="Primary Phone" required error={errors.contactPerson?.primaryPhone?.message}
                   hint="Used for calls and SMS. Format: +256XXXXXXXXX">
              <Input {...register('contactPerson.primaryPhone')} error={errors.contactPerson?.primaryPhone}
                     placeholder="+256772000000" type="tel" />
            </Field>
            <Field label="Secondary Phone" error={errors.contactPerson?.secondaryPhone?.message}
                   hint="Optional alternative number">
              <Input {...register('contactPerson.secondaryPhone')} error={errors.contactPerson?.secondaryPhone}
                     placeholder="+256701000000" type="tel" />
            </Field>

            {/* WhatsApp indicator */}
            <div className="sm:col-span-2">
              <Field label="WhatsApp Number" error={errors.contactPerson?.whatsappIndicator?.message}
                     hint="Which number is on WhatsApp?">
                <div className="flex gap-6 mt-1">
                  {[
                    { value: 'primary',   label: 'Primary number' },
                    { value: 'secondary', label: 'Secondary number' },
                    { value: 'none',      label: 'Not on WhatsApp' },
                  ].map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" value={opt.value}
                             {...register('contactPerson.whatsappIndicator')}
                             className="accent-primary" />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </Field>
            </div>

            <Field label="Email Address" error={errors.contactPerson?.email?.message}>
              <Input type="email" {...register('contactPerson.email')}
                     placeholder="contact@example.com" />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Physical Address" error={errors.contactPerson?.physicalAddress?.message}>
              <textarea {...register('contactPerson.physicalAddress')} rows={2}
                        placeholder="Home or work address…"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm
                                   focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
            </Field>
          </div>

          {/* Contact person lookup / family-link indicator */}
          <ContactPersonLookup phone={contactPhone} />
        </SectionCard>

        {/* ── SECTION 5: Enrolment Details ─────────────────── */}
        <SectionCard title="Enrolment Details" subtitle="Class assignment and payment codes">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Enrolment Date" required error={errors.enrolmentDate?.message}>
              <Input type="date" {...register('enrolmentDate')} error={errors.enrolmentDate} />
            </Field>
            <Field label="SchoolPay Code" error={errors.schoolpayCode?.message}
                   hint="Assigned by SchoolPay for payment tracking">
              <Input {...register('schoolpayCode')} placeholder="e.g. SP-XXXX"
                     className="font-mono" />
            </Field>
            <Field label="Class" hint="Select a class to filter streams">
              <Select value={selectedClassId} onChange={handleClassChange}>
                <option value="">— Select class —</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>

            <Field label="Stream" error={errors.streamId?.message}
                   hint="Optional at registration; assign after class selection">
              <Select {...register('streamId')} disabled={!selectedClassId && streams.length === 0}>
                <option value="">— Select stream —</option>
                {streams.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </Field>
          </div>
        </SectionCard>

        {/* ── SECTION 6: Fees & Bursary ────────────────────── */}
        <SectionCard title="Fees & Bursary Information"
                     subtitle="Configure bursary scheme if applicable">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              {...register('isBursary')}
              className="mt-0.5 h-4 w-4 rounded accent-primary"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">This pupil is on a bursary scheme</span>
              <p className="text-xs text-gray-400 mt-0.5">Enables reduced fees based on an agreed net amount</p>
            </div>
          </label>

          {isBursary && (
            <div className="mt-5 space-y-4 pt-5 border-t border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Bursary Scheme" required error={errors.bursary?.schemeName?.message}>
                  <Input {...register('bursary.schemeName')} error={errors.bursary?.schemeName}
                         placeholder="e.g. Staff Bursary" />
                </Field>
                <Field label="Standard Fees (UGX)" required error={errors.bursary?.standardFeesAtAward?.message}
                       hint="Full fee amount for this class/section">
                  <Input
                    type="number" min="0"
                    {...register('bursary.standardFeesAtAward', { valueAsNumber: true })}
                    error={errors.bursary?.standardFeesAtAward}
                    placeholder="e.g. 600000"
                  />
                </Field>
                <Field label="Discount (UGX)" required error={errors.bursary?.discountUgx?.message}>
                  <Input
                    type="number" min="0"
                    {...register('bursary.discountUgx', { valueAsNumber: true })}
                    error={errors.bursary?.discountUgx}
                    placeholder="e.g. 200000"
                  />
                </Field>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agreed Net Fees (UGX)
                    <span className="ml-1.5 text-xs font-normal text-gray-400">(auto-computed)</span>
                  </label>
                  <div className={`w-full rounded-lg border px-3 py-2 text-sm font-mono
                                  bg-gray-50 ${agreedNetFees > 0 ? 'text-success border-success/30' : 'text-danger border-danger/30'}`}>
                    {agreedNetFees > 0
                      ? agreedNetFees.toLocaleString()
                      : agreedNetFees < 0
                        ? 'Discount exceeds standard fees!'
                        : '—'}
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Standard − Discount = Net payable per term</p>
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        {/* ── Sticky action bar ─────────────────────────────── */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-4 lg:-mx-6 px-4 lg:px-6 py-4
                        flex items-center justify-end gap-3 shadow-sm">
          <button
            type="button"
            onClick={() => navigate('/pupils')}
            className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-200
                       text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg
                       text-white transition-colors hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#2471A3' }}
          >
            {isSubmitting ? (
              <><Loader2 size={15} className="animate-spin" /> Saving…</>
            ) : 'Save Pupil'}
          </button>
        </div>
      </div>
    </form>
  );
}
