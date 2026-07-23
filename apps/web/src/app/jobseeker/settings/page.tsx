'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, MapPin, Plane, Banknote, Check } from 'lucide-react';
import { EMIRATES } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/primitives';

type Visa = 'yes' | 'no' | 'nopref';
const SAL_MIN = 0;
const SAL_MAX = 50000;
const STEP = 1000;

export default function JobseekerSettingsPage() {
  const utils = trpc.useUtils();
  const settings = trpc.jobseekers.getSettings.useQuery();
  const save = trpc.jobseekers.updateSettings.useMutation({
    onSuccess: () => { toast.success('Preferences saved'); utils.jobseekers.getSettings.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const [visa, setVisa] = useState<Visa>('nopref');
  const [locations, setLocations] = useState<string[]>([]);
  const [salMin, setSalMin] = useState(0);
  const [salMax, setSalMax] = useState(SAL_MAX);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready || settings.isLoading) return;
    const d = settings.data;
    setVisa(d?.visaSponsorshipNeeded === true ? 'yes' : d?.visaSponsorshipNeeded === false ? 'no' : 'nopref');
    setLocations(d?.preferredLocations ?? []);
    if (d?.salaryExpectationsAed) { setSalMin(d.salaryExpectationsAed[0] ?? 0); setSalMax(d.salaryExpectationsAed[1] ?? SAL_MAX); }
    setReady(true);
  }, [settings.data, settings.isLoading, ready]);

  if (settings.isLoading || !ready) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>;

  const toggleLoc = (name: string) => setLocations((l) => (l.includes(name) ? l.filter((x) => x !== name) : [...l, name]));

  function onSave() {
    const lo = Math.min(salMin, salMax);
    const hi = Math.max(salMin, salMax);
    save.mutate({
      visaSponsorshipNeeded: visa === 'yes' ? true : visa === 'no' ? false : null,
      preferredLocations: locations,
      salaryExpectationsAed: [lo, hi],
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-navy-900">Job Preferences</h1>
      <p className="mt-1 text-sm text-navy-700/60">Help us match you to the right UAE roles.</p>

      {/* Visa */}
      <section className="mt-6 rounded-2xl border bg-white p-5">
        <Label className="flex items-center gap-2"><Plane className="h-4 w-4 text-teal-500" /> Visa sponsorship</Label>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {([['yes', 'I need it'], ['no', "I don't"], ['nopref', 'No preference']] as const).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setVisa(v)}
              className={`rounded-lg border py-2.5 text-sm font-semibold transition-colors ${visa === v ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-navy-200 text-navy-700 hover:bg-navy-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Locations */}
      <section className="mt-4 rounded-2xl border bg-white p-5">
        <Label className="flex items-center gap-2"><MapPin className="h-4 w-4 text-teal-500" /> Preferred locations</Label>
        <div className="mt-3 flex flex-wrap gap-2">
          {EMIRATES.map((em) => {
            const on = locations.includes(em.name);
            return (
              <button
                key={em.slug}
                type="button"
                onClick={() => toggleLoc(em.name)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${on ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-navy-200 text-navy-700 hover:bg-navy-50'}`}
              >
                {on && <Check className="h-3.5 w-3.5" />} {em.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* Salary */}
      <section className="mt-4 rounded-2xl border bg-white p-5">
        <Label className="flex items-center gap-2"><Banknote className="h-4 w-4 text-teal-500" /> Expected salary (AED / month)</Label>
        <p className="mt-2 text-sm font-semibold text-navy-900">{salMin.toLocaleString()} – {salMax >= SAL_MAX ? `${SAL_MAX.toLocaleString()}+` : salMax.toLocaleString()} AED</p>
        <div className="mt-3 space-y-3">
          <div>
            <span className="text-xs text-navy-700/60">Minimum</span>
            <input type="range" min={SAL_MIN} max={SAL_MAX} step={STEP} value={salMin} onChange={(e) => setSalMin(Number(e.target.value))} className="w-full accent-teal-600" aria-label="Minimum salary" />
          </div>
          <div>
            <span className="text-xs text-navy-700/60">Maximum</span>
            <input type="range" min={SAL_MIN} max={SAL_MAX} step={STEP} value={salMax} onChange={(e) => setSalMax(Number(e.target.value))} className="w-full accent-teal-600" aria-label="Maximum salary" />
          </div>
        </div>
      </section>

      <Button onClick={onSave} disabled={save.isPending} className="mt-6 w-full sm:w-auto">
        {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save preferences
      </Button>
    </div>
  );
}
