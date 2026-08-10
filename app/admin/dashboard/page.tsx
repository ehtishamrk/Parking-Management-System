'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import StatCard from '@/components/StatCard';
import RevenueChart from '@/components/RevenueChart';
import { formatCurrency } from '@/lib/utils';
import { receiptsAndRevenueInRange, RATE_PER_RECEIPT } from '@/lib/billing';

type RangeStats = { revenue: number; receipts: number };

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

async function getRangeStats(supabase: ReturnType<typeof createClient>, from: Date, toExclusive: Date): Promise<RangeStats> {
  const { receipts, revenue } = await receiptsAndRevenueInRange(supabase, isoDate(from), isoDate(toExclusive));
  return { revenue, receipts };
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
    // "to" is inclusive from the user's point of view, so query up to the next day.
    const toExclusive = isoDate(addDays(new Date(`${to}T00:00:00`), 1));
    const result = await receiptsAndRevenueInRange(supabase, from, toExclusive);
    setFilterStats(result);
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

      const now = new Date();
      const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
      const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const tomorrow = addDays(now, 1);

      const [today, week, month, quarter, year] = await Promise.all([
        getRangeStats(supabase, startOfToday, tomorrow),
        getRangeStats(supabase, startOfWeek, tomorrow),
        getRangeStats(supabase, startOfMonth, tomorrow),
        getRangeStats(supabase, startOfQuarter, tomorrow),
        getRangeStats(supabase, startOfYear, tomorrow),
      ]);
      setStats({ today, week, month, quarter, year });

      const fourteenDaysAgo = addDays(now, -13);
      const { data: recentDays } = await supabase
        .from('revenue_ledger')
        .select('day, ticket_revenue, pass_revenue')
        .gte('day', isoDate(fourteenDaysAgo))
        .lte('day', isoDate(now));

      const chartMap: Record<string, number> = {};
      for (let i = 0; i < 14; i++) {
        const d = addDays(fourteenDaysAgo, i);
        chartMap[isoDate(d).slice(5)] = 0;
      }
      (recentDays ?? []).forEach((row) => {
        const key = row.day.slice(5);
        if (key in chartMap) chartMap[key] += Number(row.ticket_revenue) + Number(row.pass_revenue);
      });
      setChartData(Object.entries(chartMap).map(([day, revenue]) => ({ day, revenue })));
    })();
  }, []);

  if (!stats) return <p className="text-steel">Loading…</p>;

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Dashboard</h1>
      <p className="text-steel text-sm mb-6">
        Revenue history is permanent — these numbers stay accurate even after old ticket records are purged.
      </p>

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
          <p className="text-xs uppercase text-steel mb-2">Platform Fee Owed (Rs {RATE_PER_RECEIPT} / receipt, this month)</p>
          <p className="font-display text-3xl text-amber">{formatCurrency(stats.month.receipts * RATE_PER_RECEIPT, symbol)}</p>
        </div>
      </div>
    </div>
  );
}
