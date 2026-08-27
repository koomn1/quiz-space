import React from 'react';
import { Facebook, Github, Instagram, Linkedin, Link as LinkIcon } from 'lucide-react';

interface SocialSupportLinksProps {
  github?: string;
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  isAr?: boolean;
}

const normalizeExternalUrl = (value?: string): string | null => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
};

export function SocialSupportLinks({ github, instagram, linkedin, facebook, isAr = true }: SocialSupportLinksProps) {
  const links = [
    { id: 'github', url: normalizeExternalUrl(github), icon: Github, name: 'GitHub', tone: 'hover:bg-slate-900 hover:border-slate-700 hover:text-white hover:shadow-slate-950/30' },
    { id: 'instagram', url: normalizeExternalUrl(instagram), icon: Instagram, name: 'Instagram', tone: 'hover:bg-gradient-to-tr hover:from-orange-500 hover:via-rose-500 hover:to-fuchsia-600 hover:border-rose-400 hover:text-white hover:shadow-rose-500/30' },
    { id: 'linkedin', url: normalizeExternalUrl(linkedin), icon: Linkedin, name: 'LinkedIn', tone: 'hover:bg-sky-700 hover:border-sky-500 hover:text-white hover:shadow-sky-500/30' },
    { id: 'facebook', url: normalizeExternalUrl(facebook), icon: Facebook, name: 'Facebook', tone: 'hover:bg-blue-600 hover:border-blue-400 hover:text-white hover:shadow-blue-500/30' },
  ].filter((link): link is typeof link & { url: string } => Boolean(link.url));

  return (
    <div className="flex w-full items-center justify-center gap-2 py-2 sm:justify-start" dir={isAr ? 'rtl' : 'ltr'}>
      {links.length > 0 ? (
        links.map(({ id, url, icon: Icon, name, tone }, index) => (
          <a
            key={id}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={isAr ? `فتح ${name}` : `Open ${name}`}
            title={name}
            className={`group relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-105 motion-safe:active:scale-95 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 ${tone}`}
            style={{ animationDelay: `${index * 45}ms` }}
          >
            <Icon className="h-4.5 w-4.5 transition-transform duration-200 group-hover:rotate-6" strokeWidth={2.1} aria-hidden="true" />
            <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[10px] font-black text-white opacity-0 shadow-xl transition-all duration-200 group-hover:-translate-y-0.5 group-hover:opacity-100">
              {name}
            </span>
          </a>
        ))
      ) : (
        <div className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-3 text-xs font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-500">
          <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{isAr ? 'لم تتم إضافة روابط اجتماعية بعد.' : "No social links added yet."}</span>
        </div>
      )}
    </div>
  );
}
