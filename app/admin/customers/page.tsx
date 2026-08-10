'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Ticket } from '@/lib/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Search } from 'lucide-react';

function threeMonthsAgoIso() {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().slice(0, 10);
}

export default function CustomersPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [plate, setPlate] = useState('');
  const [from, setFrom] = useState(threeMonthsAgoIso());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    search();
  }, []);

  async function search() {
    setLoading(true);
    let query = supabase
      .from('tickets')
      .select('*')
      .gte('entry_time', `${from}T00:00:00`)
      .lte('entry_time', `${to}T23:59:59`)
      .order('entry_time', { ascending: false })
      .limit(300);
    if (plate.trim()) {
      query = query.ilike('vehicle_number', `%${plate.trim().toUpperCase()}%`);
    }
    const { data } = await query;
    setRows(data ?? []);
    setLoading(false);
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Customers</h1>
      <p className="text-steel text-sm mb-6">
        Every vehicle serviced, kept for 3 months. Filter by date range or search a plate number.
      </p>

      <div className="bg-paper border border-steel-line rounded-xl p-5 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs text-steel">From</label>
          <input type="date" value={from} min={threeMonthsAgoIso()} onChange={(e) => setFrom(e.target.value)} className="block mt-1 border border-steel-line rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-steel">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="block mt-1 border border-steel-line rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs text-steel">Plate Number</label>
          <div className="relative mt-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel" />
            <input
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="e.g. LEA-1234"
              className="w-full pl-9 border border-steel-line rounded-lg px-3 py-2 text-sm uppercase"
            />
          </div>
        </div>
        <button onClick={search} className="bg-amber text-ink font-semibold px-5 py-2.5 rounded-lg text-sm">
          Search
        </button>
      </div>

      <div className="bg-paper border border-steel-line rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-chalk">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Plate</th>
              <th className="text-left px-4 py-3 font-medium">Vehicle</th>
              <th className="text-left px-4 py-3 font-medium">Entry</th>
              <th className="text-left px-4 py-3 font-medium">Exit</th>
              <th className="text-left px-4 py-3 font-medium">Amount</th>
              <th className="text-left px-4 py-3 font-medium">Payment</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-steel">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-steel">No matching records</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-steel-line">
                  <td className="px-4 py-3 mono-num">{r.vehicle_number}</td>
                  <td className="px-4 py-3 capitalize">{r.vehicle_type}</td>
                  <td className="px-4 py-3">{formatDateTime(r.entry_time)}</td>
                  <td className="px-4 py-3">{r.exit_time ? formatDateTime(r.exit_time) : '—'}</td>
                  <td className="px-4 py-3">{formatCurrency(r.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${r.payment_status === 'paid' ? 'bg-signal-green/15 text-signal-green' : 'bg-signal-red/15 text-signal-red'}`}>
                      {r.payment_status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-steel mt-3">Records older than 3 months are automatically removed — see the retention job in the README.</p>
    </div>
  );
}
