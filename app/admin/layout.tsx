import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/Sidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') redirect('/operator/new-ticket');

  const { data: settings } = await supabase.from('lot_settings').select('*').eq('id', 1).single();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-chalk">
      <Sidebar role="admin" businessName={settings?.business_name ?? 'ParkStub'} />
      <main className="flex-1 p-5 md:p-8">{children}</main>
    </div>
  );
}
