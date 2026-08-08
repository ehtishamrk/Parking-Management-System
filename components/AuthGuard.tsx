'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile, LotSettings } from '@/lib/types';

/**
 * Client-side auth + role gate. Runs in the browser (there is no server to
 * do this on GitHub Pages), so there's a brief flash before redirecting —
 * unavoidable on pure static hosting. Loads the signed-in profile and lot
 * settings once, then renders children via a render-prop.
 */
export default function AuthGuard({
  requireRole,
  children,
}: {
  requireRole: 'admin' | 'operator';
  children: (ctx: { profile: Profile; settings: LotSettings }) => React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'ready' | 'denied'>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<LotSettings | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login/');
        return;
      }
      const [{ data: prof }, { data: sett }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('lot_settings').select('*').eq('id', 1).single(),
      ]);
      if (!active) return;
      if (!prof || !prof.is_active) {
        router.replace('/login/');
        return;
      }
      if (requireRole === 'admin' && prof.role !== 'admin') {
        router.replace('/operator/new-ticket/');
        return;
      }
      setProfile(prof);
      setSettings(sett);
      setState('ready');
    }
    check();
    return () => { active = false; };
  }, [requireRole, router]);

  if (state !== 'ready' || !profile || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-chalk text-steel text-sm">
        Loading…
      </div>
    );
  }

  return <>{children({ profile, settings })}</>;
}
