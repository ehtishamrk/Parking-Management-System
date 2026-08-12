'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile, LotSettings } from '@/lib/types';
import { getBillingLockStatus } from '@/lib/billing';

/**
 * Client-side auth + role + billing gate. Runs in the browser (there is no
 * server to do this on GitHub Pages), so there's a brief flash before
 * redirecting — unavoidable on pure static hosting. Loads the signed-in
 * profile, lot settings, and billing lock status once, re-checks the lock
 * every minute so a midnight rollover into "locked" takes effect live (not
 * just on next login), then renders children via a render-prop.
 */
export default function AuthGuard({
  requireRole,
  children,
}: {
  requireRole: 'admin' | 'operator';
  children: (ctx: { profile: Profile; settings: LotSettings }) => React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<'loading' | 'ready' | 'locked-out'>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<LotSettings | null>(null);
  const [billingDue, setBillingDue] = useState(0);

  const isBillingRoute = pathname?.startsWith('/admin/billing');

  const check = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/login/');
      return;
    }
    const [{ data: prof }, { data: sett }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('lot_settings').select('*').eq('id', 1).single(),
    ]);
    if (!prof || !prof.is_active) {
      router.replace('/login/');
      return;
    }
    if (requireRole === 'admin' && prof.role !== 'admin') {
      router.replace('/operator/new-ticket/');
      return;
    }

    const lock = await getBillingLockStatus(supabase);
    if (lock.locked) {
      setBillingDue(lock.due);
      if (requireRole === 'admin' && isBillingRoute) {
        // Admin is already on the billing screen — let them see it and pay.
        setProfile(prof);
        setSettings(sett);
        setState('ready');
        return;
      }
      if (requireRole === 'admin') {
        router.replace('/admin/billing/');
        return;
      }
      // Operators have no billing access — only the admin can clear dues.
      setState('locked-out');
      return;
    }

    setProfile(prof);
    setSettings(sett);
    setState('ready');
  }, [requireRole, router, isBillingRoute]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (active) await check();
    })();
    // Re-check every minute so a midnight rollover into "locked" (or a
    // just-recorded payment unlocking things) takes effect without a
    // manual refresh.
    const interval = setInterval(() => {
      if (active) check();
    }, 60_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [check]);

  if (state === 'locked-out') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-ink text-chalk px-6 text-center">
        <p className="font-display text-3xl mb-2">Access Suspended</p>
        <p className="text-mist max-w-sm mb-6">
          This lot's account has an unpaid balance of Rs {billingDue.toLocaleString()} from last month.
          Access is paused until your admin clears it from the Billing section.
        </p>
        <button
          onClick={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
            router.replace('/login/');
          }}
          className="text-sm text-mist underline"
        >
          Log Out
        </button>
      </div>
    );
  }

  if (state !== 'ready' || !profile || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-chalk text-steel text-sm">
        Loading…
      </div>
    );
  }

  return <>{children({ profile, settings })}</>;
}
