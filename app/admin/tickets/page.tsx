'use client';
import { useState } from 'react';
import NewTicketForm from '@/components/NewTicketForm';
import VerifyPanel from '@/components/VerifyPanel';

export default function AdminTicketsPage() {
  const [tab, setTab] = useState<'new' | 'verify'>('new');
  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Tickets</h1>
      <p className="text-steel text-sm mb-6">Same counter tools operators use — for when admin needs to step in.</p>
      <div className="flex gap-2 mb-6 max-w-lg mx-auto">
        <button onClick={() => setTab('new')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium border ${tab === 'new' ? 'bg-amber border-amber text-ink font-semibold' : 'border-steel-line text-steel'}`}>New Ticket</button>
        <button onClick={() => setTab('verify')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium border ${tab === 'verify' ? 'bg-amber border-amber text-ink font-semibold' : 'border-steel-line text-steel'}`}>Verify Ticket</button>
      </div>
      {tab === 'new' ? <NewTicketForm /> : <VerifyPanel />}
    </div>
  );
}
