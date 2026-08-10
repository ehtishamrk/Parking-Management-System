'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Tag, Palette, Users, Ticket, CreditCard, LogOut, ScanLine, PlusCircle, Receipt, UsersRound } from 'lucide-react';
import { useLang } from '@/lib/i18n/context';
import LanguageToggle from './LanguageToggle';
import { createClient } from '@/lib/supabase/client';

const adminLinks = [
  { href: '/admin/dashboard', key: 'dashboard', icon: LayoutDashboard },
  { href: '/admin/customers', key: 'customers', icon: UsersRound },
  { href: '/admin/pricing', key: 'pricing', icon: Tag },
  { href: '/admin/passes', key: 'passes', icon: CreditCard },
  { href: '/admin/tickets', key: 'tickets', icon: Ticket },
  { href: '/admin/operators', key: 'operators', icon: Users },
  { href: '/admin/billing', key: 'billing', icon: Receipt },
  { href: '/admin/branding', key: 'branding', icon: Palette },
] as const;

const operatorLinks = [
  { href: '/operator/new-ticket', key: 'new_ticket', icon: PlusCircle },
  { href: '/operator/verify', key: 'verify_ticket', icon: ScanLine },
] as const;

export default function Sidebar({ role, businessName }: { role: 'admin' | 'operator'; businessName: string }) {
  const pathname = usePathname();
  const { t } = useLang();
  const router = useRouter();
  const links = role === 'admin' ? adminLinks : operatorLinks;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login/');
  }

  return (
    <aside className="w-full md:w-64 shrink-0 bg-ink text-chalk flex md:flex-col md:min-h-screen">
      <div className="flex md:flex-col w-full">
        <div className="px-5 py-5 flex items-center justify-between md:block">
          <div>
            <p className="font-display text-2xl tracking-wide leading-none">{businessName}</p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-steel mt-1">ParkIn</p>
          </div>
        </div>
        <div className="hazard-stripe md:mx-5 md:rounded-full" />
        <nav className="flex md:flex-col gap-1 px-3 py-4 overflow-x-auto">
          {links.map(({ href, key, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  active ? 'bg-amber text-ink font-semibold' : 'text-steel hover:bg-surface hover:text-chalk'
                }`}
              >
                <Icon size={17} />
                {t(key as any)}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto px-5 py-4 flex items-center justify-between border-t border-steel-line">
          <LanguageToggle />
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-steel hover:text-signal-red text-sm">
            <LogOut size={15} />
            {t('logout')}
          </button>
        </div>
      </div>
    </aside>
  );
}
