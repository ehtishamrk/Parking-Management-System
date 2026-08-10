'use client';
import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function Scanner({
  onResult,
  active = true,
}: {
  onResult: (text: string) => void;
  active?: boolean;
}) {
  const elId = useRef(`scanner-${Math.random().toString(36).slice(2)}`);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!active) return;
    const scanner = new Html5Qrcode(elId.current);
    scannerRef.current = scanner;
    let stopped = false;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (!stopped) {
            stopped = true;
            onResult(decodedText);
            scanner.stop().catch(() => {});
          }
        },
        () => {}
      )
      .catch(() => {});

    return () => {
      stopped = true;
      scanner.stop().catch(() => {});
    };
  }, [active]);

  return <div id={elId.current} className="w-full max-w-sm mx-auto rounded-xl overflow-hidden border border-steel-line" />;
}
