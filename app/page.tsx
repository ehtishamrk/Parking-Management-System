'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace('/login/');
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      router.replace(profile?.role === 'admin' ? '/admin/dashboard/' : '/operator/new-ticket/');
    });
  }, [router]);
  return <div className="min-h-screen flex items-center justify-center bg-chalk text-steel text-sm">Loading…</div>;
}
