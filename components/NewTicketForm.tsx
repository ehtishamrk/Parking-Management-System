'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PricingRule, VehicleType, PricingBasis, PaymentOption, LotSettings, Ticket } from '@/lib/types';
import { generateTicketNumber } from '@/lib/utils';
import { useLang } from '@/lib/i18n/context';
import Scanner from './Scanner';
import TicketReceipt from './TicketReceipt';
import toast from 'react-hot-toast';
import { QrCode, Bike, Car, Bird } from 'lucide-react';

const VEHICLES: { key: VehicleType; icon: any }[] = [
  { key: 'cycle', icon: Bird },
  { key: 'motorcycle', icon: Bike },
  { key: 'car', icon: Car },
];

export default function NewTicketForm() {
  const supabase = createClient();
  const { t } = useLang();
  const [settings, setSettings] = useState<LotSettings | null>(null);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [mode, setMode] = useState<'vehicle' | 'pass'>('vehicle');
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [plate, setPlate] = useState('');
  const [payment, setPayment] = useState<'paid' | 'pending'>('pending');
  const [issuedTicket, setIssuedTicket] = useState<Ticket | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('lot_settings').select('*').eq('id', 1).single().then(({ data }) => setSettings(data));
    supabase.from('pricing_rules').select('*').then(({ data }) => setRules(data ?? []));
  }, []);

  const basis: PricingBasis = settings?.pricing_mode ?? 'hourly';
  const rate = rules.find((r) => r.vehicle_type === vehicleType && r.basis === basis)?.rate ?? 0;
  const paymentMode: PaymentOption = settings?.payment_mode ?? 'both';

  async function issueTicket() {
    if (!plate.trim()) {
      toast.error('Enter a vehicle number');
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const ticket_number = generateTicketNumber();
    const { data, error } = await supabase
      .from('tickets')
      .insert({
        ticket_number,
        vehicle_type: vehicleType,
        vehicle_number: plate.toUpperCase(),
        basis,
        rate_applied: rate,
        amount: rate,
        payment_status: payment,
        created_by: userData.user?.id,
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setIssuedTicket(data);
    setPlate('');
  }

  async function handlePassScan(passCode: string) {
    setScanning(false);
    const { data: pass } = await supabase.from('passes').select('*').eq('pass_code', passCode).single();
    if (!pass) {
      toast.error(t('not_found'));
      return;
    }
    if (pass.status !== 'active' || new Date(pass.valid_to) < new Date()) {
      toast.error('Pass is not active or has expired');
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from('pass_entries').insert({ pass_id: pass.id, scanned_by: userData.user?.id });
    toast.success(`Entry logged for ${pass.holder_name} (${pass.vehicle_number})`);
  }

  if (issuedTicket && settings) {
    return (
      <div>
        <TicketReceipt ticket={issuedTicket} settings={settings} autoPrint />
        <button
          onClick={() => setIssuedTicket(null)}
          className="mt-4 mx-auto block text-sm text-steel underline"
        >
          + Issue another ticket
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex gap-2 mb-5">
        <ModeTab active={mode === 'vehicle'} onClick={() => setMode('vehicle')} label={t('issue_new_ticket')} />
        <ModeTab active={mode === 'pass'} onClick={() => setMode('pass')} label={t('scan_pass')} />
      </div>

      {mode === 'pass' ? (
        <div className="bg-paper border border-steel-line rounded-xl p-5 text-center">
          {!scanning ? (
            <button onClick={() => setScanning(true)} className="flex items-center gap-2 mx-auto bg-ink text-chalk px-5 py-3 rounded-lg font-medium">
              <QrCode size={18} /> {t('scan_pass')}
            </button>
          ) : (
            <Scanner onResult={handlePassScan} />
          )}
        </div>
      ) : (
        <div className="bg-paper border border-steel-line rounded-xl p-5 space-y-5">
          <div>
            <label className="text-xs text-steel">{t('vehicle_type')}</label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {VEHICLES.map(({ key, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setVehicleType(key)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border text-sm ${
                    vehicleType === key ? 'bg-amber border-amber text-ink font-semibold' : 'border-steel-line text-steel'
                  }`}
                >
                  <Icon size={20} />
                  {t(key)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-steel">Pricing Mode <span className="text-steel/70">(set by admin)</span></p>
            <p className="mt-1.5 text-sm font-medium capitalize">{basis} — Rs {rate || '—'}{basis === 'hourly' ? '/hr' : ''}</p>
          </div>

          <div>
            <label className="text-xs text-steel">{t('vehicle_number')}</label>
            <input
              autoFocus
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && issueTicket()}
              placeholder="LEA-1234"
              className="w-full mt-1.5 mono-num border border-steel-line rounded-lg px-3 py-2.5 outline-none focus:border-amber uppercase"
            />
          </div>

          {paymentMode === 'both' ? (
            <div>
              <label className="text-xs text-steel">{t('payment_option')}</label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                <button onClick={() => setPayment('paid')} className={`py-2.5 rounded-lg border text-sm ${payment === 'paid' ? 'bg-signal-green/15 border-signal-green text-signal-green font-semibold' : 'border-steel-line text-steel'}`}>
                  {t('advance')}
                </button>
                <button onClick={() => setPayment('pending')} className={`py-2.5 rounded-lg border text-sm ${payment === 'pending' ? 'bg-signal-red/15 border-signal-red text-signal-red font-semibold' : 'border-steel-line text-steel'}`}>
                  {t('post')}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-steel">Lot policy: {paymentMode === 'advance' ? t('advance') : t('post')}</p>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-steel-line">
            <span className="text-steel text-sm">{basis === 'hourly' ? 'Rate (billed at exit)' : 'Amount'}</span>
            <span className="font-display text-2xl">Rs {rate || 0}{basis === 'hourly' ? '/hr' : ''}</span>
          </div>
          {basis === 'hourly' && (
            <p className="text-xs text-steel -mt-3">
              Hourly tickets are billed on actual time parked — the final amount is calculated when the vehicle exits (Verify screen), rounded up to the next full hour.
            </p>
          )}

          <button
            onClick={issueTicket}
            disabled={saving}
            className="w-full bg-amber text-ink font-semibold py-3 rounded-lg disabled:opacity-60"
          >
            {saving ? '…' : t('print_ticket')}
          </button>
        </div>
      )}
    </div>
  );
}

function ModeTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border ${
        active ? 'bg-ink text-chalk border-ink' : 'border-steel-line text-steel'
      }`}
    >
      {label}
    </button>
  );
}
