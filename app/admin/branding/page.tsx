'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LotSettings } from '@/lib/types';
import toast from 'react-hot-toast';

export default function BrandingPage() {
  const supabase = createClient();
  const [settings, setSettings] = useState<LotSettings | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.from('lot_settings').select('*').eq('id', 1).single().then(({ data }) => setSettings(data));
  }, []);

  async function save() {
    if (!settings) return;
    const { id, updated_at, ...rest } = settings as any;
    const { error } = await supabase.from('lot_settings').update(rest).eq('id', 1);
    if (error) toast.error(error.message);
    else toast.success('Saved');
  }

  async function handleLogoUpload(file: File) {
    setUploading(true);
    const path = `logo-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('branding').upload(path, file, { upsert: true });
    if (error) {
      toast.error('Upload failed — create a public "branding" storage bucket in Supabase');
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from('branding').getPublicUrl(path);
    setSettings((s) => (s ? { ...s, logo_url: data.publicUrl } : s));
    setUploading(false);
  }

  if (!settings) return <p className="text-steel">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl mb-1">Branding</h1>
      <p className="text-steel text-sm mb-6">This appears on every printed ticket and the operator app header.</p>

      <div className="bg-paper border border-steel-line rounded-xl p-5 space-y-4">
        <Field label="Business Name" value={settings.business_name} onChange={(v) => setSettings({ ...settings, business_name: v })} />
        <div>
          <label className="text-xs text-steel">Logo</label>
          <div className="flex items-center gap-3 mt-1">
            {settings.logo_url && <img src={settings.logo_url} alt="logo" className="h-12 object-contain" />}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
              className="text-sm"
            />
            {uploading && <span className="text-xs text-steel">Uploading…</span>}
          </div>
        </div>
        <Field label="Address" value={settings.address ?? ''} onChange={(v) => setSettings({ ...settings, address: v })} />
        <Field label="Phone" value={settings.phone ?? ''} onChange={(v) => setSettings({ ...settings, phone: v })} />
        <Field label="Currency Symbol" value={settings.currency_symbol} onChange={(v) => setSettings({ ...settings, currency_symbol: v })} />
        <TextArea label="Instructions (shown on receipt)" value={settings.instructions ?? ''} onChange={(v) => setSettings({ ...settings, instructions: v })} />
        <TextArea label="Rules & Terms (shown on receipt)" value={settings.rules ?? ''} onChange={(v) => setSettings({ ...settings, rules: v })} />
        <Field label="Receipt Footer" value={settings.receipt_footer ?? ''} onChange={(v) => setSettings({ ...settings, receipt_footer: v })} />

        <button onClick={save} className="bg-amber text-ink font-semibold px-5 py-2.5 rounded-lg text-sm">
          Save Changes
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-steel">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 border border-steel-line rounded-lg px-3 py-2 outline-none focus:border-amber"
      />
    </div>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-steel">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full mt-1 border border-steel-line rounded-lg px-3 py-2 outline-none focus:border-amber"
      />
    </div>
  );
}
