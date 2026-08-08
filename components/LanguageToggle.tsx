'use client';
import { useLang } from '@/lib/i18n/context';

export default function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="inline-flex rounded-full border border-steel-line bg-surface-2 p-0.5 text-xs font-medium">
      {(['en', 'ur'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-3 py-1 rounded-full transition-colors ${
            lang === l ? 'bg-amber text-ink' : 'text-steel hover:text-chalk'
          }`}
        >
          {l === 'en' ? 'EN' : 'اردو'}
        </button>
      ))}
    </div>
  );
}
