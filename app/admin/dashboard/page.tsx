'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import StatCard from '@/components/StatCard';
import RevenueChart from '@/components/RevenueChart';
import { formatCurrency } from '@/lib/utils';

function startOf(range: 'today' | 'week' | 'month' | 'quarter' | 'year') {
  const now = new Date();
  const d = new Date(now);
  if (range === 'today') d.setHours(0, 0, 0, 0);
  if (range === 'week') { d.setDate(now.getDate() - now.getDay()); d.setHours(0, 0, 0, 0); }
  if (range === 'month') d.setDate(1);
  if (range === 'quarter') { const q = Math.floor(now.getMonth() / 3); d.setMonth(q * 3, 1); }
  if (range === 'year') d.setMonth(0, 1);
  return d.toISOString();
}

async function getRangeStats(supabase: ReturnType<typeof createClient>, range: 'today' | 'week' | 'month' | 'quarter' | 'year') {
  const { data: tickets } = await supabase.from('tickets').select('amount').gte('entry_time', startOf(range));
  const { data: passes } = await supabase.from('passes').select('amount_paid').gte('created_at', startOf(range));
  const ticketRevenue = (tickets ?? []).reduce((s, t) => s + Number(t.amount), 0);
  const passRevenue = (passes ?? []).reduce((s, p) => s + Number(p.amount_paid), 0);
  const receipts = (tickets?.length ?? 0) + (passes?.length ?? 0);
  return { revenue: ticketRevenue + passRevenue, receipts };
}

type RangeStats = { revenue: number; receipts: number };

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const [symbol, setSymbol] = useState('Rs');
  const [stats, setStats] = useState<Record<string, RangeStats> | null>(null);
  const [chartData, setChartData] = useState<{ day: string; revenue: number }[]>([]);
  const [filterFrom, setFilterFrom] = useState(isoDate(new Date()));
  const [filterTo, setFilterTo] = useState(isoDate(new Date()));
  const [filterStats, setFilterStats] = useState<RangeStats | null>(null);
  const [filterLoading, setFilterLoading] = useState(false);

  async function runFilter(from: string, to: string) {
    setFilterLoading(true);
    setFilterFrom(from);
    setFilterTo(to);
    const supabase = createClient();
    const [{ data: tickets }, { data: passes }] = await Promise.all([
      supabase.from('tickets').select('amount').gte('entry_time', `${from}T00:00:00`).lte('entry_time', `${to}T23:59:59`),
      supabase.from('passes').select('amount_paid').gte('created_at', `${from}T00:00:00`).lte('created_at', `${to}T23:59:59`),
    ]);
    const ticketRevenue = (tickets ?? []).reduce((s, t) => s + Number(t.amount), 0);
    const passRevenue = (passes ?? []).reduce((s, p) => s + Number(p.amount_paid), 0);
    setFilterStats({ revenue: ticketRevenue + passRevenue, receipts: (tickets?.length ?? 0) + (passes?.length ?? 0) });
    setFilterLoading(false);
  }

  function applyPreset(preset: 'today' | 'week' | 'month' | 'quarter' | 'year') {
    const now = new Date();
    const from = new Date(now);
    if (preset === 'week') from.setDate(now.getDate() - now.getDay());
    if (preset === 'month') from.setDate(1);
    if (preset === 'quarter') from.setMonth(Math.floor(now.getMonth() / 3) * 3, 1);
    if (preset === 'year') from.setMonth(0, 1);
    runFilter(isoDate(from), isoDate(now));
  }

  useEffect(() => {
    runFilter(isoDate(new Date()), isoDate(new Date()));
  }, []);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const { data: settings } = await supabase.from('lot_settings').select('currency_symbol').eq('id', 1).single();
      setSymbol(settings?.currency_symbol ?? 'Rs');

      const [today, week, month, quarter, year] = await Promise.all([
        getRangeStats(supabase, 'today'),
        getRangeStats(supabase, 'week'),
        getRangeStats(supabase, 'month'),
        getRangeStats(supabase, 'quarter'),
        getRangeStats(supabase, 'year'),
      ]);
      setStats({ today, week, month, quarter, year });

      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
      const { data: recentTickets } = await supabase
        .from('tickets')
        .select('amount, entry_time')
        .gte('entry_time', fourteenDaysAgo.toISOString());

      const chartMap: Record<string, number> = {};
      for (let i = 0; i < 14; i++) {
        const d = new Date(fourteenDaysAgo);
        d.setDate(d.getDate() + i);
        chartMap[d.toISOString().slice(5, 10)] = 0;
      }
      (recentTickets ?? []).forEach((t) => {
        const key = t.entry_time.slice(5, 10);
        if (key in chartMap) chartMap[key] += Number(t.amount);
      });
      setChartData(Object.entries(chartMap).map(([day, revenue]) => ({ day, revenue })));
    })();
  }, []);

  if (!stats) return <p className="text-steel">Loading…</p>;

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Dashboard</h1>
      <p className="text-steel text-sm mb-6">Revenue across every time range, updated live from tickets and passes.</p>

      <div className="bg-paper border border-steel-line rounded-xl p-5 mb-6">
        <p className="font-display text-lg mb-3">Filter Revenue</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex gap-2">
            {(['today', 'week', 'month', 'quarter', 'year'] as const).map((p) => (
              <button key={p} onClick={() => applyPreset(p)} className="px-3 py-2 rounded-lg text-xs font-medium border border-steel-line text-steel hover:border-amber capitalize">
                {p}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="text-xs text-steel">From</label>
              <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="block mt-1 border border-steel-line rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-steel">To</label>
              <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="block mt-1 border border-steel-line rounded-lg px-3 py-2 text-sm" />
            </div>
            <button onClick={() => runFilter(filterFrom, filterTo)} className="bg-amber text-ink font-semibold px-4 py-2 rounded-lg text-sm">
              Apply
            </button>
          </div>
        </div>
        {filterStats && (
          <div className="flex gap-8 mt-4 pt-4 border-t border-steel-line">
            <div>
              <p className="text-xs uppercase text-steel">Revenue ({filterFrom} – {filterTo})</p>
              <p className="font-display text-2xl">{filterLoading ? '…' : formatCurrency(filterStats.revenue, symbol)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-steel">Receipts</p>
              <p className="font-display text-2xl">{filterLoading ? '…' : filterStats.receipts}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <StatCard label="Today" value={formatCurrency(stats.today.revenue, symbol)} accent />
        <StatCard label="This Week" value={formatCurrency(stats.week.revenue, symbol)} />
        <StatCard label="This Month" value={formatCurrency(stats.month.revenue, symbol)} />
        <StatCard label="This Quarter" value={formatCurrency(stats.quarter.revenue, symbol)} />
        <StatCard label="This Year" value={formatCurrency(stats.year.revenue, symbol)} />
      </div>

      <div className="bg-paper border border-steel-line rounded-xl p-5 mb-8">
        <p className="font-display text-xl mb-4">Last 14 Days</p>
        <RevenueChart data={chartData} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-paper border border-steel-line rounded-xl p-5">
          <p className="text-xs uppercase text-steel mb-2">Total Receipts (This Month)</p>
          <p className="font-display text-3xl">{stats.month.receipts}</p>
        </div>
        <div className="bg-ink text-chalk rounded-xl p-5">
          <p className="text-xs uppercase text-steel mb-2">Platform Fee Owed (Rs 3.5 / receipt, this month)</p>
          <p className="font-display text-3xl text-amber">{formatCurrency(stats.month.receipts * 3.5, symbol)}</p>
        </div>
      </div>
    </div>
  );
}
