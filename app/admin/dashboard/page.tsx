import { createClient } from '@/lib/supabase/server';
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

async function getRangeStats(supabase: any, range: 'today' | 'week' | 'month' | 'quarter' | 'year') {
  const { data: tickets } = await supabase
    .from('tickets')
    .select('amount')
    .gte('entry_time', startOf(range));
  const { data: passes } = await supabase
    .from('passes')
    .select('amount_paid')
    .gte('created_at', startOf(range));
  const ticketRevenue = (tickets ?? []).reduce((s: number, t: any) => s + Number(t.amount), 0);
  const passRevenue = (passes ?? []).reduce((s: number, p: any) => s + Number(p.amount_paid), 0);
  const receipts = (tickets?.length ?? 0) + (passes?.length ?? 0);
  return { revenue: ticketRevenue + passRevenue, receipts };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from('lot_settings').select('*').eq('id', 1).single();
  const symbol = settings?.currency_symbol ?? 'Rs';

  const [today, week, month, quarter, year] = await Promise.all([
    getRangeStats(supabase, 'today'),
    getRangeStats(supabase, 'week'),
    getRangeStats(supabase, 'month'),
    getRangeStats(supabase, 'quarter'),
    getRangeStats(supabase, 'year'),
  ]);

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
  (recentTickets ?? []).forEach((t: any) => {
    const key = t.entry_time.slice(5, 10);
    if (key in chartMap) chartMap[key] += Number(t.amount);
  });
  const chartData = Object.entries(chartMap).map(([day, revenue]) => ({ day, revenue }));

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Dashboard</h1>
      <p className="text-steel text-sm mb-6">Revenue across every time range, updated live from tickets and passes.</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <StatCard label="Today" value={formatCurrency(today.revenue, symbol)} accent />
        <StatCard label="This Week" value={formatCurrency(week.revenue, symbol)} />
        <StatCard label="This Month" value={formatCurrency(month.revenue, symbol)} />
        <StatCard label="This Quarter" value={formatCurrency(quarter.revenue, symbol)} />
        <StatCard label="This Year" value={formatCurrency(year.revenue, symbol)} />
      </div>

      <div className="bg-paper border border-steel-line rounded-xl p-5 mb-8">
        <p className="font-display text-xl mb-4">Last 14 Days</p>
        <RevenueChart data={chartData} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-paper border border-steel-line rounded-xl p-5">
          <p className="text-xs uppercase text-steel mb-2">Total Receipts (This Month)</p>
          <p className="font-display text-3xl">{month.receipts}</p>
        </div>
        <div className="bg-ink text-chalk rounded-xl p-5">
          <p className="text-xs uppercase text-steel mb-2">Platform Fee Owed (Rs 3.5 / receipt, this month)</p>
          <p className="font-display text-3xl text-amber">{formatCurrency(month.receipts * 3.5, symbol)}</p>
        </div>
      </div>
    </div>
  );
}
