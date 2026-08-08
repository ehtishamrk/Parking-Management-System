'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { dictionary, Lang, DictKey } from './dictionary';

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: DictKey) => string;
  dir: 'ltr' | 'rtl';
}

const LangContext = createContext<Ctx | null>(null);

export function LangProvider({ children, initialLang = 'en' }: { children: ReactNode; initialLang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? (localStorage.getItem('parkstub_lang') as Lang | null) : null;
    if (stored) setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== 'undefined') localStorage.setItem('parkstub_lang', l);
  };

  const dir = lang === 'ur' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

  const t = (key: DictKey) => dictionary[lang][key] ?? dictionary.en[key];

  return <LangContext.Provider value={{ lang, setLang, t, dir }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside LangProvider');
  return ctx;
}
