'use client';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Ticket, LotSettings } from '@/lib/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useLang } from '@/lib/i18n/context';
import { Printer } from 'lucide-react';

export default function TicketReceipt({ ticket, settings }: { ticket: Ticket; settings: LotSettings }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const { t } = useLang();

  useEffect(() => {
    QRCode.toDataURL(ticket.ticket_number, { margin: 1, width: 180 }).then(setQrDataUrl);
  }, [ticket.ticket_number]);

  return (
    <div>
      <div className="ticket-stub rounded-md px-5 py-5 max-w-xs mx-auto" id="print-area">
        <div className="text-center">
          {settings.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logo_url} alt="logo" className="h-10 mx-auto mb-2 object-contain" />
          )}
          <p className="font-display text-xl leading-tight">{settings.business_name}</p>
          {settings.address && <p className="text-[11px] text-steel">{settings.address}</p>}
          {settings.phone && <p className="text-[11px] text-steel">{settings.phone}</p>}
        </div>

        <div className="my-3 border-t border-dashed border-steel" />

        <div className="mono-num text-[13px] space-y-1">
          <Row label={t('ticket_number')} value={ticket.ticket_number} />
          <Row label={t('vehicle_type')} value={t(ticket.vehicle_type as any)} />
          <Row label={t('vehicle_number')} value={ticket.vehicle_number} />
          <Row label={t('entry_time')} value={formatDateTime(ticket.entry_time)} />
          <Row label={t('amount')} value={formatCurrency(ticket.amount, settings.currency_symbol)} />
          <Row
            label={t('payment_status')}
            value={ticket.payment_status === 'paid' ? t('paid') : t('pending')}
          />
        </div>

        <div className="my-3 border-t border-dashed border-steel" />

        <div className="flex justify-center">
          {qrDataUrl && <img src={qrDataUrl} alt="QR code" width={140} height={140} />}
        </div>

        {settings.instructions && (
          <p className="text-[10px] text-steel text-center mt-3">{settings.instructions}</p>
        )}
        {settings.rules && (
          <p className="text-[9px] text-steel text-center mt-1 leading-snug">{settings.rules}</p>
        )}
        {settings.receipt_footer && (
          <p className="text-[10px] text-center mt-2 font-medium">{settings.receipt_footer}</p>
        )}
      </div>

      <button
        onClick={() => window.print()}
        className="mt-4 mx-auto flex items-center gap-2 bg-ink text-chalk px-4 py-2 rounded-lg text-sm font-medium hover:bg-surface"
      >
        <Printer size={16} />
        {t('print_ticket')}
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-steel">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
