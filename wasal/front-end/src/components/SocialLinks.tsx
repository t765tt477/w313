import type { ReactNode } from 'react';

interface SocialItem {
  name: string;
  href: string;
  icon: ReactNode;
}

const FacebookIcon = (
  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor">
    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94z" />
  </svg>
);

const InstagramIcon = (
  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const XIcon = (
  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor">
    <path d="M18.9 2H22l-7.6 8.7L23 22h-6.9l-5.4-6.9L4.5 22H1.4l8.1-9.3L1 2h7l4.9 6.3L18.9 2zm-1.2 18h1.9L7.4 4H5.4l12.3 16z" />
  </svg>
);

const WhatsAppIcon = (
  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.79.47 3.47 1.29 4.93L2 22l5.29-1.39a9.87 9.87 0 004.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm0 18.14h-.01a8.2 8.2 0 01-4.19-1.15l-.3-.18-3.14.82.84-3.06-.2-.31a8.23 8.23 0 01-1.26-4.39c0-4.55 3.7-8.25 8.27-8.25 2.21 0 4.28.86 5.84 2.42a8.19 8.19 0 012.42 5.83c0 4.55-3.71 8.27-8.27 8.27zm4.53-6.19c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.79.97-.14.17-.29.18-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.7-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.36-.77-1.86-.2-.48-.41-.42-.56-.43-.14-.01-.31-.01-.48-.01-.16 0-.43.06-.66.31-.22.25-.87.85-.87 2.08s.89 2.42 1.01 2.58c.12.17 1.75 2.68 4.25 3.76.59.26 1.06.41 1.42.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.11-.22-.17-.47-.29z" />
  </svg>
);

const SOCIAL_LINKS: SocialItem[] = [
  { name: 'فيسبوك', href: 'https://facebook.com', icon: FacebookIcon },
  { name: 'إنستغرام', href: 'https://instagram.com', icon: InstagramIcon },
  { name: 'X (تويتر)', href: 'https://x.com', icon: XIcon },
  { name: 'واتساب', href: 'https://wa.me/', icon: WhatsAppIcon },
];

interface SocialLinksProps {
  /** "footer": real outbound links styled for the site footer. "auth": compact row for login/register forms. */
  variant?: 'footer';
  /** Called (with the network name) when an "auth" button is used, since real social sign-in isn't wired up to the backend yet. */
  onAuthClick?: (name: string) => void;
}

export default function SocialLinks({ variant = 'footer', onAuthClick }: SocialLinksProps) {
  if (variant === 'footer') {
    return (
      <div className="flex items-center justify-center gap-3">
        {SOCIAL_LINKS.map((s) => (
          <button
            key={s.name}
            type="button"
            title={`المتابعة عبر ${s.name}`}
            onClick={() => onAuthClick?.(s.name)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-yellow-500 hover:text-green-700 hover:border-green-300 hover:bg-green-50 transition-colors"
          >
            {s.icon}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {SOCIAL_LINKS.map((s) => (
        <a
          key={s.name}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          title={s.name}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-yellow-400 hover:text-green-900 transition-colors"
        >
          {s.icon}
        </a>
      ))}
    </div>
  );
}
