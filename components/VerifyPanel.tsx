'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Ticket, Pass } from '@/lib/types';
import { formatCurrency, formatDateTime, computeHourlyCharge } from '@/lib/utils';
import { useLang } from '@/lib/i18n/context';
import Scanner from './Scanner';
import toast from 'react-hot-toast';
import { QrCode, Search, CheckCircle2, XCircle } from 'lucide-react';

type Result = { kind: 'ticket'; data: Ticket } | { kind: 'pass'; data: Pass } | null;

export default function VerifyPanel() {
  const supabase = createClient();
  const { t } = useLang();
  const [mode, setMode] = useState<'scan' | 'number'>('scan');
  const [scanning, setScanning] = useState(false);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<Result>(null);
  const [notFound, setNotFound] = useState(false);

  async function lookup(value: string) {
    setScanning(false);
    setNotFound(false);
    setResult(null);
    const v = value.trim().toUpperCase();

    const { data: ticket } = await supabase
      .from('tickets')
      .select('*')
      .or(`ticket_number.eq.${v},vehicle_number.eq.${v}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (ticket) {
      setResult({ kind: 'ticket', data: ticket });
      return;
    }

    const { data: pass } = await supabase
      .from('passes')
      .select('*')
      .or(`pass_code.eq.${v},vehicle_number.eq.${v}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pass) {
      setResult({ kind: 'pass', data: pass });
      return;
    }

    setNotFound(true);
  }

  async function markExit() {
    if (!result || result.kind !== 'ticket') return;
    const { data: userData } = await supabase.auth.getUser();
    const exitTime = new Date();
    const update: Record<string, unknown> = {
      status: 'closed',
      exit_time: exitTime.toISOString(),
      verified_at: exitTime.toISOString(),
      verified_by: userData.user?.id,
    };
    if (result.data.basis === 'hourly') {
      const { amount } = computeHourlyCharge(result.data.entry_time, result.data.rate_applied, exitTime);
      update.amount = amount;
    }
    await supabase.from('tickets').update(update).eq('id', result.data.id);
    if (result.data.basis === 'hourly') {
      toast.success(`Exit allowed — final charge Rs ${(update.amount as number).toLocaleString()}`);
    } else {
      toast.success('Exit allowed');
    }
    setResult(null);
    setQuery('');
  }

  async function markPaid() {
    if (!result || result.kind !== 'ticket') return;
    await supabase.from('tickets').update({ payment_status: 'paid' }).eq('id', result.data.id);
    toast.success('Marked paid');
    lookup(result.data.ticket_number);
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex gap-2 mb-5">
        <button onClick={() => setMode('scan')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium border flex items-center justify-center gap-2 ${mode === 'scan' ? 'bg-ink text-chalk border-ink' : 'border-steel-line text-steel'}`}>
          <QrCode size={15} /> {t('verify_by_scan')}
        </button>
        <button onClick={() => setMode('number')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium border flex items-center justify-center gap-2 ${mode === 'number' ? 'bg-ink text-chalk border-ink' : 'border-steel-line text-steel'}`}>
          <Search size={15} /> {t('verify_by_number')}
        </button>
      </div>

      <div className="bg-paper border border-steel-line rounded-xl p-5">
        {mode === 'scan' ? (
          !scanning ? (
            <button onClick={() => setScanning(true)} className="flex items-center gap-2 mx-auto bg-ink text-chalk px-5 py-3 rounded-lg font-medium">
              <QrCode size={18} /> {t('verify_by_scan')}
            </button>
          ) : (
            <Scanner onResult={lookup} />
          )
        ) : (
          <div className="flex gap-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && lookup(query)}
              placeholder={t('enter_ticket_or_plate')}
              className="flex-1 mono-num border border-steel-line rounded-lg px-3 py-2.5 outline-none focus:border-amber uppercase"
            />
            <button onClick={() => lookup(query)} className="bg-amber text-ink font-semibold px-4 rounded-lg">
              {t('verify')}
            </button>
          </div>
        )}
      </div>

      {notFound && (
        <div className="mt-4 bg-signal-red/10 border border-signal-red text-signal-red rounded-xl p-4 flex items-center gap-2 text-sm">
          <XCircle size={18} /> {t('not_found')}
        </div>
      )}

      {result?.kind === 'ticket' && (
        <div className="mt-4 bg-paper border border-steel-line rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-display text-xl">{result.data.ticket_number}</p>
            <span className={`text-xs px-2.5 py-1 rounded-full ${result.data.payment_status === 'paid' ? 'bg-signal-green/15 text-signal-green' : 'bg-signal-red/15 text-signal-red'}`}>
              {result.data.payment_status === 'paid' ? t('paid') : t('pending')}
            </span>
          </div>
          <Row label={t('vehicle_type')} value={t(result.data.vehicle_type as any)} />
          <Row label={t('vehicle_number')} value={result.data.vehicle_number} />
          <Row label={t('entry_time')} value={formatDateTime(result.data.entry_time)} />
          <Row
            label={result.data.basis === 'hourly' && result.data.status === 'open' ? 'Amount Due (so far)' : t('amount')}
            value={formatCurrency(
              result.data.basis === 'hourly' && result.data.status === 'open'
                ? computeHourlyCharge(result.data.entry_time, result.data.rate_applied).amount
                : result.data.amount
            )}
          />
          <Row label="Status" value={result.data.status} />

          <div className="flex gap-2 mt-4">
            {result.data.payment_status !== 'paid' && (
              <button onClick={markPaid} className="flex-1 border border-steel-line text-sm py-2.5 rounded-lg font-medium">
                Mark Paid
              </button>
            )}
            {result.data.status === 'open' && (
              <button onClick={markExit} className="flex-1 bg-signal-green text-white text-sm py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 size={16} /> {t('allow_exit')}
              </button>
            )}
          </div>
        </div>
      )}

      {result?.kind === 'pass' && (
        <div className="mt-4 bg-paper border border-steel-line rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-display text-xl">{result.data.pass_code}</p>
            <span className={`text-xs px-2.5 py-1 rounded-full ${result.data.status === 'active' ? 'bg-signal-green/15 text-signal-green' : 'bg-signal-red/15 text-signal-red'}`}>
              {result.data.status}
            </span>
          </div>
          <Row label={t('holder_name')} value={result.data.holder_name} />
          <Row label={t('vehicle_number')} value={result.data.vehicle_number} />
          <Row label={t('valid_until')} value={result.data.valid_to} />
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-steel">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
