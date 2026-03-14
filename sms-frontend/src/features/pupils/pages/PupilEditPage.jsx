/**
 * PupilEditPage — edit a pupil's core details + replace their photo.
 * Covers all fields exposed by PUT /api/v1/pupils/:id.
 * Guardian and bursary changes are separate flows.
 */
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, AlertCircle, Loader2, Camera, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { pupilsApi }              from '../../../api/pupils.js';
import { classesApi, streamsApi } from '../../../api/academic.js';

// ── Constants ──────────────────────────────────────────────────
const SECTIONS  = ['Day', 'Boarding'];
const GENDERS   = ['Male', 'Female'];
const RELIGIONS = ['Christianity', 'Islam', 'Other'];
const HOUSES    = ['Red', 'Blue', 'Green', 'Yellow'];

// ── Zod schema ─────────────────────────────────────────────────
const schema = z.object({
  firstName:         z.string().min(1, 'Required').max(80),
  lastName:          z.string().min(1, 'Required').max(80),
  otherNames:        z.string().optional(),
  dateOfBirth:       z.string().min(1, 'Required').refine(v => new Date(v) < new Date(), 'Must be in the past'),
  gender:            z.enum(['Male', 'Female'], { required_error: 'Required' }),
  section:           z.enum(['Day', 'Boarding'], { required_error: 'Required' }),
  religion:          z.string().optional(),
  house:             z.string().optional(),
  formerSchool:      z.string().optional(),
  medicalConditions: z.string().optional(),
  lin:               z.string().optional(),
  schoolpayCode:     z.string().optional(),
  streamId:          z.string().optional(),
  enrolmentDate:     z.string().min(1, 'Required'),
  isActive:          z.boolean(),
});

// ── Helpers ────────────────────────────────────────────────────
function inputCls(hasError) {
  return `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary
          ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`;
}

function Field({ label, error, required, children, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
      {hint  && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-danger flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

// ── Photo section ──────────────────────────────────────────────
function PhotoEditor({ pupil, photoBase, pupilId, onPhotoUpdated }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const colors  = ['#2471A3','#148F77','#7D3C98','#1A5276','#117A65'];
  const color   = colors[(pupil.firstName.charCodeAt(0) + pupil.lastName.charCodeAt(0)) % colors.length];
  const initials = `${pupil.firstName[0] ?? ''}${pupil.lastName[0] ?? ''}`.toUpperCase();

  const existingPhotoUrl = pupil.pupilPhoto?.filePath
    ? `${photoBase}/${pupil.pupilPhoto.filePath}`
    : null;

  const displaySrc = preview ?? existingPhotoUrl;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Only JPEG or PNG photos are accepted');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Photo must be under 2 MB');
      return;
    }

    // Local preview
    setPreview(URL.createObjectURL(file));

    // Upload immediately
    const fd = new FormData();
    fd.append('photo', file);
    try {
      setUploading(true);
      await pupilsApi.uploadPhoto(pupilId, fd);
      toast.success('Photo updated');
      onPhotoUpdated?.();
    } catch {
      toast.error('Photo upload failed');
      setPreview(null);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex items-center gap-5">
      {/* Avatar / photo */}
      <div className="relative shrink-0">
        {displaySrc ? (
          <img
            src={displaySrc}
            alt="Pupil photo"
            className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow"
          />
        ) : (
          <div className="w-20 h-20 rounded-full flex items-center justify-center
                          text-xl font-bold text-white ring-4 ring-white shadow"
               style={{ backgroundColor: color }}>
            {initials}
          </div>
        )}

        {/* Camera overlay */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-white
                     flex items-center justify-center shadow hover:opacity-90 disabled:opacity-50"
        >
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
        </button>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700">Pupil Photo</p>
        <p className="text-xs text-gray-400 mt-0.5">JPEG or PNG · max 2 MB · resized to 300×400 px</p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="mt-2 text-xs font-medium text-primary hover:underline disabled:opacity-50"
        >
          {existingPhotoUrl || preview ? 'Replace photo' : 'Upload photo'}
        </button>
        {preview && (
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="ml-3 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <X size={11} /> Discard preview
          </button>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function PupilEditPage() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const photoBase   = import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3000';

  const [selectedClassId, setSelectedClassId] = useState('');

  // Load existing pupil
  const { data: pupil, isLoading, isError } = useQuery({
    queryKey: ['pupil', id],
    queryFn:  () => pupilsApi.getById(id).then(r => r.data.data),
  });

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
    staleTime: 5 * 60_000,
  });
  const streams = streamsData ?? [];

  const {
    register, handleSubmit, reset, setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(schema) });

  // Pre-fill form + set initial class filter
  useEffect(() => {
    if (!pupil) return;
    reset({
      firstName:         pupil.firstName         ?? '',
      lastName:          pupil.lastName          ?? '',
      otherNames:        pupil.otherNames        ?? '',
      dateOfBirth:       pupil.dateOfBirth ? pupil.dateOfBirth.slice(0, 10) : '',
      gender:            pupil.gender            ?? 'Male',
      section:           pupil.section           ?? 'Day',
      religion:          pupil.religion          ?? '',
      house:             pupil.house             ?? '',
      formerSchool:      pupil.formerSchool      ?? '',
      medicalConditions: pupil.medicalConditions ?? '',
      lin:               pupil.lin               ?? '',
      schoolpayCode:     pupil.schoolpayCode     ?? '',
      streamId:          pupil.streamId          ?? '',
      enrolmentDate:     pupil.enrolmentDate ? pupil.enrolmentDate.slice(0, 10) : '',
      isActive:          pupil.isActive ?? true,
    });
    // Set class filter to the pupil's current class
    if (pupil.stream?.classId) setSelectedClassId(pupil.stream.classId);
  }, [pupil, reset]);

  const handleClassChange = (e) => {
    setSelectedClassId(e.target.value);
    setValue('streamId', '', { shouldDirty: true });
  };

  const { mutateAsync: updatePupil } = useMutation({
    mutationFn: (fields) => pupilsApi.update(id, fields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pupil', id] });
      queryClient.invalidateQueries({ queryKey: ['pupils'] });
    },
  });

  const onSubmit = async (data) => {
    try {
      await updatePupil(data);
      toast.success('Pupil updated successfully');
      navigate(`/pupils/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Update failed.');
    }
  };

  const handlePhotoUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['pupil', id] });
  };

  // ── States ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-gray-400">
        <Loader2 size={20} className="animate-spin" /> Loading pupil…
      </div>
    );
  }
  if (isError || !pupil) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle size={32} className="text-danger" />
        <p className="text-gray-600">Pupil not found.</p>
        <button onClick={() => navigate('/pupils')} className="text-sm text-primary hover:underline">
          Back to pupils
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={() => navigate(`/pupils/${id}`)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Pupil</h1>
          <p className="text-sm text-gray-500">
            {pupil.firstName} {pupil.lastName} · {pupil.pupilIdCode}
          </p>
        </div>
      </div>

      <div className="space-y-6 max-w-3xl">

        {/* ── Photo ─────────────────────────────────────────── */}
        <SectionCard title="Pupil Photo">
          <PhotoEditor
            pupil={pupil}
            photoBase={photoBase}
            pupilId={id}
            onPhotoUpdated={handlePhotoUpdated}
          />
        </SectionCard>

        {/* ── Personal Information ──────────────────────────── */}
        <SectionCard title="Personal Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First name" required error={errors.firstName?.message}>
              <input {...register('firstName')} className={inputCls(!!errors.firstName)} />
            </Field>
            <Field label="Last name" required error={errors.lastName?.message}>
              <input {...register('lastName')} className={inputCls(!!errors.lastName)} />
            </Field>
            <Field label="Other names">
              <input {...register('otherNames')} className={inputCls(false)} />
            </Field>
            <Field label="Date of birth" required error={errors.dateOfBirth?.message}>
              <input type="date" {...register('dateOfBirth')} className={inputCls(!!errors.dateOfBirth)} />
            </Field>
            <Field label="Gender" required error={errors.gender?.message}>
              <select {...register('gender')} className={inputCls(!!errors.gender)}>
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Religion">
              <select {...register('religion')} className={inputCls(false)}>
                <option value="">— Select —</option>
                {RELIGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="House">
              <select {...register('house')} className={inputCls(false)}>
                <option value="">— Select —</option>
                {HOUSES.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </Field>
            <Field label="Former school">
              <input {...register('formerSchool')} className={inputCls(false)} />
            </Field>
          </div>
          <Field label="Medical conditions / notes">
            <textarea {...register('medicalConditions')} rows={2}
                      className={`${inputCls(false)} resize-none`} />
          </Field>
        </SectionCard>

        {/* ── Enrolment Details ─────────────────────────────── */}
        <SectionCard title="Enrolment Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Section" required error={errors.section?.message}>
              <select {...register('section')} className={inputCls(!!errors.section)}>
                {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Enrolment date" required error={errors.enrolmentDate?.message}>
              <input type="date" {...register('enrolmentDate')} className={inputCls(!!errors.enrolmentDate)} />
            </Field>

            {/* Cascading class → stream */}
            <Field label="Class" hint="Select to filter streams">
              <select value={selectedClassId} onChange={handleClassChange} className={inputCls(false)}>
                <option value="">— Select class —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Stream" error={errors.streamId?.message}>
              <select {...register('streamId')} className={inputCls(!!errors.streamId)}
                      disabled={!selectedClassId && streams.length === 0}>
                <option value="">— Select stream —</option>
                {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>

            <Field label="LIN" hint="Ministry of Education learner number">
              <input {...register('lin')} className={inputCls(false)} placeholder="Optional" />
            </Field>
            <Field label="SchoolPay code">
              <input {...register('schoolpayCode')} className={inputCls(false)} placeholder="Optional" />
            </Field>
          </div>

          {/* Status toggle */}
          <div className="flex items-center gap-3 pt-1">
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
              Pupil is active
            </label>
            <input id="isActive" type="checkbox" {...register('isActive')}
                   className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer" />
          </div>
        </SectionCard>

        {/* ── Sticky action bar ─────────────────────────────── */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-4 lg:-mx-6 px-4 lg:px-6 py-4
                        flex items-center justify-between gap-3 z-10">
          <button type="button" onClick={() => navigate(`/pupils/${id}`)}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting || !isDirty}
                  className="px-6 py-2 text-sm font-semibold rounded-lg text-white
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#2471A3' }}>
            {isSubmitting
              ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Saving…</span>
              : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}
