/**
 * ReportCardSettingsTab — singleton report card configuration.
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminReportCardSettingsApi } from '../../../api/admin.js';

// ── Helpers ───────────────────────────────────────────────────

function inputCls(err) {
  return `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary
          ${err ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`;
}

function SectionHeading({ children }) {
  return (
    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide pt-1 pb-2 border-b border-gray-100 mb-4">
      {children}
    </h3>
  );
}

function CheckField({ label, hint, checked, onChange }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4"
        />
      </div>
      <div>
        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
    </label>
  );
}

// ── Main component ────────────────────────────────────────────

const DEFAULT_FORM = {
  showBot:                true,
  showMot:                true,
  showEot:                true,
  averagePeriods:         false,
  showClassRank:          true,
  rankingFormat:          '1st',
  showGradeGuide:         true,
  showSchoolRequirements: true,
  showNextTermDates:      true,
  whoCanGenerate:         'dos_only',
};

export default function ReportCardSettingsTab() {
  const qc = useQueryClient();
  const [form, setForm]       = useState(DEFAULT_FORM);
  const [formErr, setFormErr] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin-report-card-settings'],
    queryFn:  () => adminReportCardSettingsApi.get().then(r => r.data.data),
    staleTime: 5 * 60_000,
  });

  // Populate form when data arrives
  useEffect(() => {
    if (!data) return;
    setForm({
      showBot:                data.showBot                ?? true,
      showMot:                data.showMot                ?? true,
      showEot:                data.showEot                ?? true,
      averagePeriods:         data.averagePeriods         ?? false,
      showClassRank:          data.showClassRank          ?? true,
      rankingFormat:          data.rankingFormat          ?? '1st',
      showGradeGuide:         data.showGradeGuide         ?? true,
      showSchoolRequirements: data.showSchoolRequirements ?? true,
      showNextTermDates:      data.showNextTermDates      ?? true,
      whoCanGenerate:         data.whoCanGenerate         ?? 'dos_only',
    });
  }, [data]);

  const set     = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  const setCheck = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.checked }));

  const validate = () => {
    const errs = {};
    if (!form.rankingFormat.trim()) errs.rankingFormat = 'Required';
    setFormErr(errs);
    return Object.keys(errs).length === 0;
  };

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => adminReportCardSettingsApi.update(form),
    onSuccess: (res) => {
      qc.setQueryData(['admin-report-card-settings'], res.data.data);
      toast.success('Report card settings saved');
    },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Save failed'),
  });

  const handleSave = () => {
    if (!validate()) return;
    save();
  };

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Assessment periods ─────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <SectionHeading>Assessment Periods</SectionHeading>
        <div className="space-y-3">
          <CheckField
            label="Show BOT (Beginning of Term)"
            hint="Display BOT column on report cards"
            checked={form.showBot}
            onChange={setCheck('showBot')}
          />
          <CheckField
            label="Show MOT (Middle of Term)"
            hint="Display MOT column on report cards"
            checked={form.showMot}
            onChange={setCheck('showMot')}
          />
          <CheckField
            label="Show EOT (End of Term)"
            hint="Display EOT column on report cards"
            checked={form.showEot}
            onChange={setCheck('showEot')}
          />
          <CheckField
            label="Average BOT / MOT / EOT scores"
            hint="Show averaged score instead of individual period scores"
            checked={form.averagePeriods}
            onChange={setCheck('averagePeriods')}
          />
        </div>
      </div>

      {/* ── Rankings ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <SectionHeading>Rankings</SectionHeading>
        <div className="space-y-4">
          <CheckField
            label="Show class rank on report card"
            hint="Display pupil's position in class"
            checked={form.showClassRank}
            onChange={setCheck('showClassRank')}
          />
          {form.showClassRank && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ranking Format</label>
              <input
                value={form.rankingFormat}
                onChange={set('rankingFormat')}
                placeholder='e.g. 1st or 1/25'
                className={inputCls(!!formErr.rankingFormat)}
              />
              <p className="mt-1 text-xs text-gray-400">
                Template for rank display. Use "1st" for ordinal or "1/25" for position/total style.
              </p>
              {formErr.rankingFormat && <p className="mt-1 text-xs text-red-600">{formErr.rankingFormat}</p>}
            </div>
          )}
        </div>
      </div>

      {/* ── Report Card Sections ──────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <SectionHeading>Report Card Sections</SectionHeading>
        <div className="space-y-3">
          <CheckField
            label="Show grade guide at bottom"
            hint="Print grade scale reference table on report card"
            checked={form.showGradeGuide}
            onChange={setCheck('showGradeGuide')}
          />
          <CheckField
            label="Show school requirements section"
            hint="Print items pupils should bring next term"
            checked={form.showSchoolRequirements}
            onChange={setCheck('showSchoolRequirements')}
          />
          <CheckField
            label="Show next term dates"
            hint="Print reporting and closing dates for next term"
            checked={form.showNextTermDates}
            onChange={setCheck('showNextTermDates')}
          />
        </div>
      </div>

      {/* ── Permissions ───────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <SectionHeading>Permissions</SectionHeading>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Who can generate report cards?</label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="whoCanGenerate"
                value="dos_only"
                checked={form.whoCanGenerate === 'dos_only'}
                onChange={set('whoCanGenerate')}
                className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">DOS only</span>
                <p className="text-xs text-gray-400">Only the Director of Studies can generate and print report cards</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="whoCanGenerate"
                value="dos_and_admin"
                checked={form.whoCanGenerate === 'dos_and_admin'}
                onChange={set('whoCanGenerate')}
                className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">DOS and System Admin</span>
                <p className="text-xs text-gray-400">Both DOS and System Admin can generate and print report cards</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* ── Save ──────────────────────────────────────────── */}
      <div className="flex justify-end pb-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg
                     text-white disabled:opacity-60 transition-colors hover:opacity-90"
          style={{ backgroundColor: '#2471A3' }}
        >
          {saving
            ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
            : <><Save size={15} /> Save Settings</>
          }
        </button>
      </div>
    </div>
  );
}
