'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Pass, LotSettings } from '@/lib/types';
import { Printer, X } from 'lucide-react';

export default function PassCard({ pass, settings, onClose }: { pass: Pass; settings: LotSettings; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    QRCode.toDataURL(pass.pass_code, { margin: 0, width: 220 }).then(setQrDataUrl);
  }, [pass.pass_code]);

  return (
    <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 p-4">
      <div className="bg-paper rounded-2xl p-6 max-w-sm w-full">
        <div className="flex justify-between items-center mb-4">
          <p className="font-display text-xl">Printable Pass</p>
          <button onClick={onClose} className="text-steel hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <div className="flex justify-center">
          <div className="id-card-face id-card" id="print-area" data-role="pass-card">
            <div className="flex justify-between items-start">
              <div>
                {settings.logo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings.logo_url} alt="logo" className="h-6 object-contain mb-1" />
                )}
                <p className="font-display text-base leading-tight">{settings.business_name}</p>
                <p className="text-[9px] opacity-80">PARKING PASS</p>
              </div>
              {qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="QR" width={56} height={56} className="rounded bg-chalk p-0.5" />
              )}
            </div>

            <div className="mt-3 mono-num text-[11px] leading-snug">
              <p className="text-sm font-semibold">{pass.holder_name}</p>
              <p>{pass.vehicle_number} · {pass.vehicle_type.toUpperCase()}</p>
              <p className="opacity-80">Valid until {pass.valid_to}</p>
              <p className="opacity-60 text-[9px] mt-1">{pass.pass_code}</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="mt-5 mx-auto flex items-center gap-2 bg-ink text-chalk px-4 py-2 rounded-lg text-sm font-medium hover:bg-surface"
        >
          <Printer size={16} />
          Print Pass (ID card size)
        </button>
        <p className="text-[11px] text-steel text-center mt-2">
          Prints at 85.6mm × 54mm — standard blank ID/PVC card size. Use your printer's card tray or a card-slot feeder.
        </p>
      </div>
    </div>
  );
}
