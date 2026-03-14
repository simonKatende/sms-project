import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, Edit2, UserX, UserCheck, Phone, Mail, MapPin,
  Briefcase, BookOpen, CreditCard, MessageSquare, Users,
  GraduationCap, Heart, AlertCircle, Hash, Camera, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { pupilsApi } from '../../../api/pupils.js';
import { useAuthStore } from '../../../store/authStore.js';

// ── Helpers ────────────────────────────────────────────────────

const fmt = (n) =>
  n !== null && n !== undefined ? Number(n).toLocaleString('en-UG') : '—';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── Small display components ───────────────────────────────────

function StatusBadge({ isActive }) {
  return isActive ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-green-200">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 ring-1 ring-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
      Inactive
    </span>
  );
}

function SectionBadge({ section }) {
  const styles = {
    Day:      'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    Boarding: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[section] ?? 'bg-gray-100 text-gray-600'}`}>
      {section}
    </span>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="py-2.5 grid grid-cols-5 gap-2 border-b border-gray-50 last:border-0">
      <dt className="col-span-2 text-xs font-medium text-gray-500 uppercase tracking-wide self-center">{label}</dt>
      <dd className="col-span-3 text-sm text-gray-800">{children ?? <span className="text-gray-400">—</span>}</dd>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <Icon size={15} className="text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  );
}

// ── Photo / Avatar ─────────────────────────────────────────────
function PupilHero({ pupil, photoBase, canEdit, onPhotoUpdated }) {
  const fileRef  = useRef(null);
  const [uploading, setUploading] = useState(false);
  const initials = `${pupil.firstName[0] ?? ''}${pupil.lastName[0] ?? ''}`.toUpperCase();
  const colors   = ['#2471A3','#148F77','#7D3C98','#1A5276','#117A65'];
  const color    = colors[(pupil.firstName.charCodeAt(0) + pupil.lastName.charCodeAt(0)) % colors.length];

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) { toast.error('JPEG or PNG only'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Photo must be under 2 MB'); return; }
    const fd = new FormData();
    fd.append('photo', file);
    try {
      setUploading(true);
      await pupilsApi.uploadPhoto(pupil.id, fd);
      toast.success('Photo updated');
      onPhotoUpdated?.();
    } catch { toast.error('Photo upload failed'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0">
        {pupil.pupilPhoto?.filePath ? (
          <img
            src={`${photoBase}/${pupil.pupilPhoto.filePath}`}
            alt={`${pupil.firstName} ${pupil.lastName}`}
            className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="w-20 h-20 rounded-full flex items-center justify-center
                          text-xl font-bold text-white ring-4 ring-white shadow"
               style={{ backgroundColor: color }}>
            {initials}
          </div>
        )}
        {canEdit && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-white
                       flex items-center justify-center shadow hover:opacity-90 disabled:opacity-50"
            title="Change photo"
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
          </button>
        )}
        {canEdit && (
          <input ref={fileRef} type="file" accept="image/jpeg,image/png"
                 className="hidden" onChange={handleFile} />
        )}
      </div>
      <div className="min-w-0">
        <h2 className="text-2xl font-bold text-gray-900 leading-tight">
          {pupil.firstName} {pupil.lastName}
        </h2>
        {pupil.otherNames && (
          <p className="text-sm text-gray-500 mt-0.5">{pupil.otherNames}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <code className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
            {pupil.pupilIdCode}
          </code>
          <StatusBadge isActive={pupil.isActive} />
          <SectionBadge section={pupil.section} />
        </div>
      </div>
    </div>
  );
}

// ── Fees progress ──────────────────────────────────────────────
function FeesSection({ bill }) {
  if (!bill) {
    return <p className="py-4 text-sm text-gray-400 text-center">No bill for the current term.</p>;
  }

  const pct   = bill.totalAmount > 0 ? Math.round((bill.totalPaid / bill.totalAmount) * 100) : 0;
  const color = pct >= 75 ? '#148F77' : pct >= 25 ? '#F39C12' : '#C0392B';
  const balance = bill.totalAmount - bill.totalPaid;

  return (
    <div className="py-2 space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">
          UGX {fmt(bill.totalPaid)} paid of UGX {fmt(bill.totalAmount)}
        </span>
        <span className="font-semibold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Balance: <span className={balance > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
          UGX {fmt(balance)}
        </span></span>
        <span className={`px-2 py-0.5 rounded-full font-medium ${
          bill.status === 'paid'    ? 'bg-green-50 text-green-700' :
          bill.status === 'partial' ? 'bg-amber-50 text-amber-700' :
          'bg-red-50 text-red-700'
        }`}>{bill.status}</span>
      </div>

      {bill.billLineItems?.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Line Items</p>
          <div className="space-y-1.5">
            {bill.billLineItems.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.feeCategory?.name ?? item.description}</span>
                <span className="text-gray-900 font-medium">UGX {fmt(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Comms log ──────────────────────────────────────────────────
function CommsLog({ comms }) {
  if (!comms?.length) {
    return <p className="py-4 text-sm text-gray-400 text-center">No recent communications.</p>;
  }
  return (
    <ul className="divide-y divide-gray-50">
      {comms.map((c) => (
        <li key={c.id} className="py-2.5 flex items-start gap-3">
          <MessageSquare size={14} className="text-gray-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-gray-800 line-clamp-2">{c.messageBody}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              To {c.guardian?.fullName ?? 'Guardian'} · {fmtDate(c.createdAt)}
              {c.deliveryStatus && (
                <span className={`ml-2 px-1.5 py-0.5 rounded font-medium ${
                  c.deliveryStatus === 'delivered' ? 'bg-green-50 text-green-700' :
                  c.deliveryStatus === 'failed'    ? 'bg-red-50 text-red-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{c.deliveryStatus}</span>
              )}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function PupilDetailPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const roleName     = useAuthStore((s) => s.user?.roleName);
  const photoBase    = import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3000';

  const [confirmToggle, setConfirmToggle] = useState(false);

  const { data: pupil, isLoading, isError } = useQuery({
    queryKey: ['pupil', id],
    queryFn:  () => pupilsApi.getById(id).then(r => r.data.data),
  });

  const canEdit   = ['system_admin', 'bursar'].includes(roleName);
  const canDelete = roleName === 'system_admin';

  const { mutate: toggleActive, isPending: isToggling } = useMutation({
    mutationFn: () => pupilsApi.update(id, { isActive: !pupil.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pupil', id] });
      queryClient.invalidateQueries({ queryKey: ['pupils'] });
      toast.success(pupil.isActive ? 'Pupil deactivated' : 'Pupil reactivated');
      setConfirmToggle(false);
    },
    onError: () => toast.error('Failed to update status'),
  });

  // ── Loading / error states ───────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading pupil profile…
      </div>
    );
  }

  if (isError || !pupil) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <AlertCircle size={32} className="text-danger" />
        <p className="text-gray-600 font-medium">Pupil not found or failed to load.</p>
        <button
          onClick={() => navigate('/pupils')}
          className="text-sm text-primary hover:underline"
        >
          Back to pupils list
        </button>
      </div>
    );
  }

  const stream   = pupil.stream;
  const primary  = pupil.pupilGuardians?.[0]?.guardian;
  const bursary  = pupil.pupilBursaries?.[0];
  const siblings = pupil.siblings ?? [];

  return (
    <div className="space-y-5">

      {/* ── Page header ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate('/pupils')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft size={16} /> Back to Pupils
        </button>

        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/pupils/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
                         border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Edit2 size={14} /> Edit
            </button>
            <button
              onClick={() => setConfirmToggle(true)}
              disabled={isToggling}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
                          border transition-colors disabled:opacity-50 ${
                pupil.isActive
                  ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                  : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              {pupil.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
              {pupil.isActive ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>
        )}
      </div>

      {/* ── Confirm toggle dialog ─────────────────────────────── */}
      {confirmToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">
              {pupil.isActive ? 'Deactivate' : 'Reactivate'} pupil?
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {pupil.isActive
                ? `${pupil.firstName} will be marked inactive and won't appear in active lists.`
                : `${pupil.firstName} will be marked active again.`}
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setConfirmToggle(false)}
                className="flex-1 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => toggleActive()}
                disabled={isToggling}
                className={`flex-1 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50 ${
                  pupil.isActive ? 'bg-red-600' : 'bg-green-600'
                }`}
              >
                {isToggling ? 'Updating…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero card ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <PupilHero
          pupil={pupil}
          photoBase={photoBase}
          canEdit={canEdit}
          onPhotoUpdated={() => queryClient.invalidateQueries({ queryKey: ['pupil', id] })}
        />
      </div>

      {/* ── Two-column grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* LEFT column (2/3) */}
        <div className="lg:col-span-2 space-y-5">

          {/* Personal Info */}
          <SectionCard title="Personal Information" icon={GraduationCap}>
            <dl>
              <InfoRow label="Date of Birth">{fmtDate(pupil.dateOfBirth)}</InfoRow>
              <InfoRow label="Gender">{pupil.gender}</InfoRow>
              <InfoRow label="Religion">{pupil.religion}</InfoRow>
              <InfoRow label="House">{pupil.house}</InfoRow>
              <InfoRow label="Medical notes">{pupil.medicalConditions}</InfoRow>
              <InfoRow label="Former school">{pupil.formerSchool}</InfoRow>
              <InfoRow label="Enrolment date">{fmtDate(pupil.enrolmentDate)}</InfoRow>
            </dl>
          </SectionCard>

          {/* Enrolment details */}
          <SectionCard title="Enrolment Details" icon={BookOpen}>
            <dl>
              <InfoRow label="Class">
                {stream ? `${stream.class?.name ?? ''} — ${stream.name}` : null}
              </InfoRow>
              <InfoRow label="Section"><SectionBadge section={pupil.section} /></InfoRow>
              <InfoRow label="LIN">
                {pupil.lin
                  ? <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{pupil.lin}</code>
                  : null}
              </InfoRow>
              <InfoRow label="SchoolPay code">
                {pupil.schoolpayCode
                  ? <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{pupil.schoolpayCode}</code>
                  : null}
              </InfoRow>
            </dl>
          </SectionCard>

          {/* Guardian */}
          <SectionCard title="Guardian & Family" icon={Users}>
            {pupil.pupilGuardians?.length ? (
              <ul className="divide-y divide-gray-50">
                {pupil.pupilGuardians.map(({ guardian, isPrimary }) => (
                  <li key={guardian.id} className="py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-sm text-gray-900">{guardian.fullName}</span>
                      <div className="flex gap-1.5">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {guardian.relationship}
                        </span>
                        {isPrimary && (
                          <span className="text-xs bg-blue-50 text-blue-700 ring-1 ring-blue-200 px-2 py-0.5 rounded-full">
                            Primary
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1">
                      {guardian.phoneCall && (
                        <a href={`tel:${guardian.phoneCall}`}
                           className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-primary">
                          <Phone size={12} /> {guardian.phoneCall}
                        </a>
                      )}
                      {guardian.phoneWhatsapp && guardian.phoneWhatsapp !== guardian.phoneCall && (
                        <span className="flex items-center gap-1.5 text-xs text-gray-500">
                          <MessageSquare size={12} /> {guardian.phoneWhatsapp}
                        </span>
                      )}
                      {guardian.email && (
                        <a href={`mailto:${guardian.email}`}
                           className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-primary">
                          <Mail size={12} /> {guardian.email}
                        </a>
                      )}
                      {guardian.physicalAddress && (
                        <span className="flex items-center gap-1.5 text-xs text-gray-500">
                          <MapPin size={12} /> {guardian.physicalAddress}
                        </span>
                      )}
                      {guardian.occupation && (
                        <span className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Briefcase size={12} /> {guardian.occupation}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-sm text-gray-400 text-center">No guardian on record.</p>
            )}

            {siblings.length > 0 && (
              <div className="border-t border-gray-100 pt-3 pb-2 mt-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Siblings at this school ({siblings.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {siblings.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => navigate(`/pupils/${s.id}`)}
                      className="text-xs text-primary hover:underline bg-blue-50 px-2 py-1 rounded-lg"
                    >
                      {s.firstName} {s.lastName}
                      {s.stream && <span className="text-gray-500 ml-1">({s.stream.class?.name})</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          {/* Recent comms */}
          <SectionCard title="Recent Communications" icon={MessageSquare}>
            <CommsLog comms={pupil.recentComms} />
          </SectionCard>
        </div>

        {/* RIGHT column (1/3) */}
        <div className="space-y-5">

          {/* Academic result */}
          <SectionCard title="Latest Academic Result" icon={BookOpen}>
            {pupil.latestResult ? (
              <dl className="py-1">
                <InfoRow label="Term">
                  {pupil.latestResult.term?.name}
                </InfoRow>
                <InfoRow label="Period">
                  {pupil.latestResult.assessmentPeriod?.name}
                </InfoRow>
                <InfoRow label="Aggregate">
                  {pupil.latestResult.totalAggregate !== null
                    ? pupil.latestResult.totalAggregate
                    : '—'}
                </InfoRow>
                <InfoRow label="Division">
                  {pupil.latestResult.division ?? '—'}
                </InfoRow>
                <InfoRow label="Rank in class">
                  {pupil.latestResult.rankInClass
                    ? `${pupil.latestResult.rankInClass} / ${pupil.latestResult.totalInClass}`
                    : '—'}
                </InfoRow>
              </dl>
            ) : (
              <p className="py-4 text-sm text-gray-400 text-center">No results yet.</p>
            )}
          </SectionCard>

          {/* Fees */}
          <SectionCard title="Fees — Current Term" icon={CreditCard}>
            <FeesSection bill={pupil.currentBill} />
          </SectionCard>

          {/* Bursary */}
          {bursary && (
            <SectionCard title="Bursary" icon={Heart}>
              <dl className="py-1">
                <InfoRow label="Scheme">{bursary.bursaryScheme?.name}</InfoRow>
                <InfoRow label="Agreed net fees">
                  UGX {fmt(bursary.agreedNetFeesUgx)}
                </InfoRow>
                <InfoRow label="Discount">
                  UGX {fmt(bursary.discountUgx)}
                </InfoRow>
                <InfoRow label="Section at award">{bursary.sectionAtAward}</InfoRow>
                <InfoRow label="Awarded">{fmtDate(bursary.awardedDate)}</InfoRow>
              </dl>
            </SectionCard>
          )}

          {/* IDs */}
          <SectionCard title="Identifiers" icon={Hash}>
            <dl className="py-1">
              <InfoRow label="Pupil ID">
                <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                  {pupil.pupilIdCode}
                </code>
              </InfoRow>
              {pupil.lin && (
                <InfoRow label="LIN">
                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                    {pupil.lin}
                  </code>
                </InfoRow>
              )}
              {pupil.schoolpayCode && (
                <InfoRow label="SchoolPay">
                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                    {pupil.schoolpayCode}
                  </code>
                </InfoRow>
              )}
            </dl>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
