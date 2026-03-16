/**
 * PupilDetailPage — tabbed pupil profile.
 *
 * Tabs:
 *  1. Overview          — personal info, enrolment, identifiers, bursary, latest result
 *  2. Guardian & Family — Mother, Father, Contact Person (new 3-level model) + siblings
 *  3. Fees              — current-term fee progress (Sprint 3+ will add history)
 *  4. Academics         — placeholder (Sprint 4)
 *  5. Communication Log — placeholder (Sprint 5)
 */

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

// ── Tab bar ────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',   label: 'Overview' },
  { id: 'family',     label: 'Guardian & Family' },
  { id: 'fees',       label: 'Fees' },
  { id: 'academics',  label: 'Academics' },
  { id: 'comms',      label: 'Communication Log' },
];

function TabBar({ active, onChange }) {
  return (
    <div className="border-b border-gray-200 bg-white rounded-t-xl">
      <nav className="flex overflow-x-auto" aria-label="Pupil profile tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              active === tab.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ── Overview tab ───────────────────────────────────────────────
function OverviewTab({ pupil }) {
  const stream  = pupil.stream;
  const bursary = pupil.pupilBursaries?.[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">

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

      </div>

      <div className="space-y-5">

        <SectionCard title="Latest Academic Result" icon={BookOpen}>
          {pupil.latestResult ? (
            <dl className="py-1">
              <InfoRow label="Term">{pupil.latestResult.term?.name}</InfoRow>
              <InfoRow label="Period">{pupil.latestResult.assessmentPeriod?.name}</InfoRow>
              <InfoRow label="Aggregate">
                {pupil.latestResult.totalAggregate !== null ? pupil.latestResult.totalAggregate : '—'}
              </InfoRow>
              <InfoRow label="Division">{pupil.latestResult.division ?? '—'}</InfoRow>
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

        {bursary && (
          <SectionCard title="Bursary" icon={Heart}>
            <dl className="py-1">
              <InfoRow label="Scheme">{bursary.bursaryScheme?.name}</InfoRow>
              <InfoRow label="Agreed net fees">UGX {fmt(bursary.agreedNetFeesUgx)}</InfoRow>
              <InfoRow label="Discount">UGX {fmt(bursary.discountUgx)}</InfoRow>
              <InfoRow label="Section at award">{bursary.sectionAtAward}</InfoRow>
              <InfoRow label="Awarded">{fmtDate(bursary.awardedDate)}</InfoRow>
            </dl>
          </SectionCard>
        )}

        <SectionCard title="Identifiers" icon={Hash}>
          <dl className="py-1">
            <InfoRow label="Pupil ID">
              <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                {pupil.pupilIdCode}
              </code>
            </InfoRow>
            {pupil.lin && (
              <InfoRow label="LIN">
                <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{pupil.lin}</code>
              </InfoRow>
            )}
            {pupil.schoolpayCode && (
              <InfoRow label="SchoolPay">
                <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{pupil.schoolpayCode}</code>
              </InfoRow>
            )}
          </dl>
        </SectionCard>

      </div>
    </div>
  );
}

// ── Guardian & Family tab ──────────────────────────────────────
function ContactCard({ title, data, isContactPerson = false }) {
  if (!data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-1">{title}</h4>
        <p className="text-sm text-gray-400">Not recorded</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
        {isContactPerson && (
          <span className="text-xs bg-blue-50 text-blue-700 ring-1 ring-blue-200 px-2 py-0.5 rounded-full">
            School Contact
          </span>
        )}
      </div>
      <p className="text-base font-medium text-gray-900">{data.fullName}</p>
      {isContactPerson && data.relationship && (
        <p className="text-xs text-gray-500">Relationship: {data.relationship}</p>
      )}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {/* Phone fields differ between parent and contact person */}
        {isContactPerson ? (
          <>
            {data.primaryPhone && (
              <a href={`tel:${data.primaryPhone}`}
                 className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600">
                <Phone size={12} />
                {data.primaryPhone}
                {data.whatsappIndicator === 'primary' && (
                  <span className="ml-1 text-green-600 font-medium">WhatsApp</span>
                )}
              </a>
            )}
            {data.secondaryPhone && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <Phone size={12} />
                {data.secondaryPhone}
                {data.whatsappIndicator === 'secondary' && (
                  <span className="ml-1 text-green-600 font-medium">WhatsApp</span>
                )}
              </span>
            )}
          </>
        ) : (
          data.phone && (
            <a href={`tel:${data.phone}`}
               className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600">
              <Phone size={12} /> {data.phone}
            </a>
          )
        )}
        {data.email && (
          <a href={`mailto:${data.email}`}
             className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600">
            <Mail size={12} /> {data.email}
          </a>
        )}
        {(data.physicalAddress || data.address) && (
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin size={12} /> {data.physicalAddress ?? data.address}
          </span>
        )}
      </div>
    </div>
  );
}

function FamilyTab({ pupil, navigate }) {
  const mother = pupil.pupilParents?.find((p) => p.parentType === 'mother') ?? null;
  const father = pupil.pupilParents?.find((p) => p.parentType === 'father') ?? null;
  const contactPerson = pupil.pupilContactPersons?.[0]?.contactPerson ?? null;
  const siblings = pupil.siblings ?? [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ContactCard title="Mother" data={mother} />
        <ContactCard title="Father" data={father} />
        <ContactCard title="Contact Person" data={contactPerson} isContactPerson />
      </div>

      {siblings.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Siblings at this school ({siblings.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {siblings.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/pupils/${s.id}`)}
                className="text-xs text-blue-700 hover:underline bg-blue-50 px-3 py-1.5 rounded-lg"
              >
                {s.firstName} {s.lastName}
                {s.stream && <span className="text-gray-500 ml-1">({s.stream.class?.name})</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {!mother && !father && !contactPerson && (
        <p className="py-6 text-sm text-gray-400 text-center">No family records on file.</p>
      )}
    </div>
  );
}

// ── Fees tab ───────────────────────────────────────────────────
function FeesTab({ pupil }) {
  const bill = pupil.currentBill;

  if (!bill) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
        No fee record for the current term.
      </div>
    );
  }

  const pct     = bill.totalAmount > 0 ? Math.round((bill.totalPaid / bill.totalAmount) * 100) : 0;
  const color   = pct >= 75 ? '#148F77' : pct >= 25 ? '#F39C12' : '#C0392B';
  const balance = bill.totalAmount - bill.totalPaid;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Current Term Balance</h3>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            UGX {fmt(bill.totalPaid)} paid of UGX {fmt(bill.totalAmount)}
          </span>
          <span className="font-semibold" style={{ color }}>{pct}%</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all"
               style={{ width: `${pct}%`, backgroundColor: color }} />
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
          <div className="border-t border-gray-100 pt-4">
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

      <div className="bg-white rounded-xl border border-gray-200 p-5 text-center text-sm text-gray-400">
        Payment history will be available in Sprint 3.
      </div>
    </div>
  );
}

// ── Placeholder tab ────────────────────────────────────────────
function ComingSoonTab({ title, sprint }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
        <BookOpen size={22} className="text-gray-400" />
      </div>
      <p className="text-base font-medium text-gray-700">{title}</p>
      <p className="text-sm text-gray-400">This section will be built in {sprint}.</p>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function PupilDetailPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const roleName     = useAuthStore((s) => s.user?.roleName);
  const photoBase    = import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3000';

  const [activeTab,     setActiveTab]     = useState('overview');
  const [confirmToggle, setConfirmToggle] = useState(false);

  const { data: pupil, isLoading, isError } = useQuery({
    queryKey: ['pupil', id],
    queryFn:  () => pupilsApi.getById(id).then(r => r.data.data),
  });

  const canEdit = ['system_admin', 'bursar'].includes(roleName);

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
        <AlertCircle size={32} className="text-red-500" />
        <p className="text-gray-600 font-medium">Pupil not found or failed to load.</p>
        <button onClick={() => navigate('/pupils')} className="text-sm text-blue-600 hover:underline">
          Back to pupils list
        </button>
      </div>
    );
  }

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

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <TabBar active={activeTab} onChange={setActiveTab} />
        <div className="p-5">
          {activeTab === 'overview'  && <OverviewTab  pupil={pupil} />}
          {activeTab === 'family'    && <FamilyTab    pupil={pupil} navigate={navigate} />}
          {activeTab === 'fees'      && <FeesTab      pupil={pupil} />}
          {activeTab === 'academics' && <ComingSoonTab title="Academics" sprint="Sprint 4" />}
          {activeTab === 'comms'     && <ComingSoonTab title="Communication Log" sprint="Sprint 5" />}
        </div>
      </div>

    </div>
  );
}
