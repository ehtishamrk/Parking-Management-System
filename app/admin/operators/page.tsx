'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/lib/types';
import toast from 'react-hot-toast';
import { UserPlus } from 'lucide-react';

export default function OperatorsPage() {
  const supabase = createClient();
  const [operators, setOperators] = useState<Profile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'operator').order('created_at', { ascending: false });
    setOperators(data ?? []);
  }

  async function createOperator(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('manage-operator', {
      body: { action: 'create', ...form },
    });
    setSaving(false);
    if (error || data?.error) {
      toast.error(data?.error ?? error?.message ?? 'Failed to create operator');
      return;
    }
    toast.success('Operator account created');
    setForm({ full_name: '', email: '', password: '', phone: '' });
    setShowForm(false);
    load();
  }

  async function toggleActive(p: Profile) {
    await supabase.functions.invoke('manage-operator', {
      body: { action: 'set_active', id: p.id, is_active: !p.is_active },
    });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl mb-1">Operators</h1>
          <p className="text-steel text-sm">Create logins for ticket-counter staff.</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="flex items-center gap-2 bg-amber text-ink font-semibold px-4 py-2.5 rounded-lg text-sm">
          <UserPlus size={16} /> Add Operator
        </button>
      </div>

      {showForm && (
        <form onSubmit={createOperator} className="bg-paper border border-steel-line rounded-xl p-5 mb-6 grid md:grid-cols-2 gap-4">
          <Field label="Full Name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} required />
          <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
          <Field label="Temporary Password" type="text" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />
          <div className="md:col-span-2">
            <button disabled={saving} className="bg-ink text-chalk font-medium px-5 py-2.5 rounded-lg text-sm">
              {saving ? 'Creating…' : 'Create Login'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-paper border border-steel-line rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-chalk">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Phone</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {operators.map((op) => (
              <tr key={op.id} className="border-t border-steel-line">
                <td className="px-4 py-3 font-medium">{op.full_name}</td>
                <td className="px-4 py-3 text-steel">{op.phone ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${op.is_active ? 'bg-signal-green/15 text-signal-green' : 'bg-signal-red/15 text-signal-red'}`}>
                    {op.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => toggleActive(op)} className="text-xs text-steel underline">
                    {op.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-xs text-steel">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 border border-steel-line rounded-lg px-3 py-2 outline-none focus:border-amber"
      />
    </div>
  );
}
