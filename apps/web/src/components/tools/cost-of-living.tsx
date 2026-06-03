'use client';

import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/primitives';

// Indicative monthly essentials (AED) by emirate — rent (1BR), food, transport.
const COSTS: Record<string, { name: string; rent: number; food: number; transport: number }> = {
  dubai: { name: 'Dubai', rent: 6500, food: 1500, transport: 800 },
  'abu-dhabi': { name: 'Abu Dhabi', rent: 5500, food: 1400, transport: 700 },
  sharjah: { name: 'Sharjah', rent: 3500, food: 1200, transport: 900 },
};

export function CostOfLiving() {
  const [salary, setSalary] = useState('');
  const [show, setShow] = useState(false);
  const s = Number(salary) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border bg-white p-6 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label>Your monthly salary (AED)</Label>
          <Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="e.g. 12000" />
        </div>
        <Button onClick={() => setShow(true)}><Calculator /> Compare emirates</Button>
      </div>

      {show && (
        <div className="grid gap-4 md:grid-cols-3">
          {Object.values(COSTS).map((c) => {
            const expenses = c.rent + c.food + c.transport;
            const net = s - expenses;
            return (
              <div key={c.name} className="rounded-xl border bg-white p-6">
                <h3 className="font-display text-lg font-bold text-navy-900">{c.name}</h3>
                <div className="mt-3 space-y-1.5 text-sm">
                  <Line label="Rent (1BR)" value={-c.rent} />
                  <Line label="Food" value={-c.food} />
                  <Line label="Transport" value={-c.transport} />
                  <div className="my-2 border-t" />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-navy-900">Net after essentials</span>
                    <span className={`font-display text-lg font-bold ${net >= 0 ? 'text-lime-600' : 'text-accent-600'}`}>
                      AED {net.toLocaleString('en-AE')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-navy-700/50">Indicative single-person essentials. Excludes utilities, schooling, and lifestyle. Rents vary widely by area.</p>
    </div>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-navy-700/70">
      <span>{label}</span>
      <span>AED {Math.abs(value).toLocaleString('en-AE')}</span>
    </div>
  );
}
