'use client';
import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireRole="operator">
      {({ settings }) => (
        <div className="min-h-screen flex flex-col md:flex-row bg-chalk">
          <Sidebar role="operator" businessName={settings.business_name} />
          <main className="flex-1 p-5 md:p-8">{children}</main>
        </div>
      )}
    </AuthGuard>
  );
}
