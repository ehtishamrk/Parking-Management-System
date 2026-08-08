'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLang } from '@/lib/i18n/context';
import LanguageToggle from '@/components/LanguageToggle';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useLang();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();
    router.push(profile?.role === 'admin' ? '/admin/dashboard' : '/operator/new-ticket');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center px-4 relative">
      <div className="absolute top-5 right-5">
        <LanguageToggle />
      </div>
      <div className="hazard-stripe w-24 rounded-full mb-6" />
      <p className="font-display text-4xl text-chalk tracking-wide mb-1">ParkStub</p>
      <p className="text-steel text-sm mb-8">{t('app_name')}</p>

      <form onSubmit={handleSubmit} className="bg-surface w-full max-w-sm rounded-2xl p-6 space-y-4 border border-steel-line">
        <div>
          <label className="text-xs text-steel">{t('email')}</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1 bg-surface-2 border border-steel-line rounded-lg px-3 py-2.5 text-chalk outline-none focus:border-amber"
          />
        </div>
        <div>
          <label className="text-xs text-steel">{t('password')}</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1 bg-surface-2 border border-steel-line rounded-lg px-3 py-2.5 text-chalk outline-none focus:border-amber"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber text-ink font-semibold py-2.5 rounded-lg hover:brightness-95 disabled:opacity-60"
        >
          {loading ? '...' : t('sign_in')}
        </button>
      </form>
    </div>
  );
}
