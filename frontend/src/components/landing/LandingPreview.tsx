'use client';

import {
  GraduationCap,
  Shield,
  Users,
  BookOpen,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
} from 'lucide-react';

type NavLink = { label?: string; label_bn?: string; href?: string };

export type LandingConfigPreview = {
  site?: { logoUrl?: string; schoolName?: string; schoolName_bn?: string; bannerImageUrl?: string };
  header?: { topBarEnabled?: boolean; topBarLeft?: string; topBarLeft_bn?: string; topBarRight?: string; topBarRight_bn?: string };
  nav?: { links?: NavLink[] };
  hero?: { title?: string; title_bn?: string; subtitle?: string; subtitle_bn?: string; ctaText?: string; ctaLink?: string; imageUrl?: string };
  about?: { heading?: string; heading_bn?: string; body?: string; body_bn?: string; imageUrl?: string };
  features?: Array<{ title?: string; title_bn?: string; description?: string; icon?: string }>;
  contact?: { email?: string; phone?: string; address?: string; address_bn?: string; mapEmbed?: string; showSection?: boolean };
  footer?: {
    aboutTitle?: string; aboutTitle_bn?: string; aboutText?: string; aboutText_bn?: string;
    linksTitle?: string; linksTitle_bn?: string; quickLinks?: NavLink[];
    contactTitle?: string; contactTitle_bn?: string;
    text?: string; copyright?: string;
    facebook?: string; youtube?: string; twitter?: string; instagram?: string; linkedin?: string;
  };
  notices?: { enabled?: boolean; sectionTitle?: string; sectionTitle_bn?: string };
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  GraduationCap,
  Shield,
  Users,
  BookOpen,
};

type Props = {
  config: LandingConfigPreview;
  locale: string;
  notices?: Array<{ id: number; title: string; title_bn?: string | null; body?: string | null }>;
};

export function LandingPreview({ config, locale, notices = [] }: Props) {
  const site = config.site ?? {};
  const headerConfig = config.header ?? {};
  const navConfig = config.nav ?? {};
  const hero = config.hero ?? {};
  const about = config.about ?? {};
  const features = config.features ?? [];
  const contact = config.contact ?? {};
  const footer = config.footer ?? {};
  const noticesConfig = config.notices ?? {};
  const showNotices = noticesConfig.enabled !== false && notices.length > 0;
  const noticeTitle = locale === 'bn' ? (noticesConfig.sectionTitle_bn ?? 'সর্বশেষ নোটিশ') : (noticesConfig.sectionTitle ?? 'Latest Notices');
  const schoolName = (locale === 'bn' && site.schoolName_bn) ? site.schoolName_bn : (site.schoolName || hero.title || 'School');
  const bannerUrl = site.bannerImageUrl || hero.imageUrl || '';
  const showTopBar = headerConfig.topBarEnabled !== false && (headerConfig.topBarLeft || headerConfig.topBarRight);
  const topBarLeft = locale === 'bn' ? (headerConfig.topBarLeft_bn ?? headerConfig.topBarLeft) : headerConfig.topBarLeft;
  const topBarRight = locale === 'bn' ? (headerConfig.topBarRight_bn ?? headerConfig.topBarRight) : headerConfig.topBarRight;
  const navLinks = navConfig.links?.length ? navConfig.links : [{ label: 'About', href: '#about' }, { label: 'Contact', href: '#contact' }];
  const quickLinks = footer.quickLinks ?? [];
  const hasSocialLinks = !!(footer.facebook || footer.youtube || footer.twitter || footer.instagram || footer.linkedin);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/20 to-slate-100 text-left">
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        {showTopBar && (
          <div className="border-b border-slate-700/50 bg-slate-800 px-3 py-1.5 text-xs text-slate-200">
            <div className="flex justify-between">
              <span>{topBarLeft}</span>
              <span>{topBarRight}</span>
            </div>
          </div>
        )}
        <div className="border-b border-primary-200/60 bg-white/98 px-3 py-2">
          <div className="flex items-center justify-between">
            {site.logoUrl ? (
              <img src={site.logoUrl} alt="" className="h-7 w-auto object-contain" />
            ) : null}
            <span className="text-base font-bold text-primary-700">{schoolName}</span>
            <nav className="flex gap-2 text-xs">
              {navLinks.slice(0, 3).map((l, i) => (
                <span key={i} className="text-slate-600">{locale === 'bn' && l.label_bn ? l.label_bn : l.label}</span>
              ))}
              <span className="rounded bg-primary-600 px-2 py-1 font-semibold text-white">Login</span>
            </nav>
          </div>
        </div>
      </header>

      <section
        className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 px-4 py-12 sm:py-16"
        style={bannerUrl ? { background: `linear-gradient(to bottom right, rgba(37, 99, 235, 0.9), rgba(30, 64, 175, 0.95)), url(${bannerUrl}) center/cover` } : undefined}
      >
        <div className="mx-auto max-w-6xl text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow sm:text-3xl">
            {locale === 'bn' && hero.title_bn ? hero.title_bn : (hero.title || 'Welcome')}
          </h1>
          <p className="mt-2 max-w-xl mx-auto text-sm text-primary-100">
            {locale === 'bn' && hero.subtitle_bn ? hero.subtitle_bn : (hero.subtitle || 'Quality education for a brighter future.')}
          </p>
          <div className="mt-4">
            <span className="inline-flex items-center gap-1 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary-700">
              {hero.ctaText || 'Login to Portal'} <ExternalLink className="h-3 w-3" />
            </span>
          </div>
        </div>
      </section>

      <section id="about" className="border-b border-slate-200/80 bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-slate-800">
                {locale === 'bn' && about.heading_bn ? about.heading_bn : (about.heading || 'About Our School')}
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                {locale === 'bn' && about.body_bn ? about.body_bn : (about.body || 'We are committed to providing a nurturing environment.')}
              </p>
            </div>
            {about.imageUrl && (
              <div className="shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                <img src={about.imageUrl} alt="" className="h-24 w-full max-w-[180px] object-cover sm:h-28 sm:max-w-[200px]" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}
          </div>
        </div>
      </section>

      {features.length > 0 && (
        <section className="border-b border-slate-200/80 bg-gradient-to-b from-primary-50/50 to-white px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-6 text-center text-xl font-bold text-slate-800">
              {locale === 'bn' ? 'আমাদের সুবিধা' : 'Why Choose Us'}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => {
                const Icon = iconMap[f.icon ?? ''] ?? GraduationCap;
                return (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 p-2 text-white w-fit">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-3 font-semibold text-slate-800">
                      {locale === 'bn' && f.title_bn ? f.title_bn : (f.title ?? '')}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">{f.description ?? ''}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {showNotices && (
        <section id="notices" className="border-b border-slate-200/80 bg-white px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-4 text-xl font-bold text-slate-800">{noticeTitle}</h2>
            <ul className="space-y-2">
              {notices.slice(0, 3).map((n) => (
                <li key={n.id} className="rounded-lg border border-primary-200 bg-primary-50/50 p-3">
                  <h3 className="font-semibold text-slate-800">{locale === 'bn' && n.title_bn ? n.title_bn : n.title}</h3>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {contact.showSection !== false && (
        <section id="contact" className="border-b border-slate-200/80 bg-gradient-to-b from-white to-primary-50/30 px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-6 text-xl font-bold text-slate-800">{locale === 'bn' ? 'যোগাযোগ' : 'Contact Us'}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {contact.email && (
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
                  <Mail className="h-5 w-5 text-primary-600" />
                  <span className="text-sm text-slate-700">{contact.email}</span>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
                  <Phone className="h-5 w-5 text-primary-600" />
                  <span className="text-sm text-slate-700">{contact.phone}</span>
                </div>
              )}
              {(contact.address || contact.address_bn) && (
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
                  <MapPin className="h-5 w-5 shrink-0 text-primary-600" />
                  <span className="text-sm text-slate-700">{locale === 'bn' && contact.address_bn ? contact.address_bn : contact.address}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <footer className="bg-slate-900 px-4 py-6 text-slate-300">
        <div className="grid gap-4 text-xs sm:grid-cols-3">
          <div>
            <h4 className="font-semibold text-white">{locale === 'bn' ? footer.aboutTitle_bn : footer.aboutTitle || 'About'}</h4>
            <p className="mt-1 line-clamp-2">{locale === 'bn' ? footer.aboutText_bn : footer.aboutText || footer.text || 'Empowering students.'}</p>
          </div>
          {quickLinks.length > 0 && (
            <div>
              <h4 className="font-semibold text-white">{locale === 'bn' ? footer.linksTitle_bn : footer.linksTitle || 'Links'}</h4>
              <ul className="mt-1 space-y-0.5">
                {quickLinks.slice(0, 4).map((l, i) => (
                  <li key={i}>{locale === 'bn' && l.label_bn ? l.label_bn : l.label}</li>
                ))}
              </ul>
            </div>
          )}
          {(contact.email || contact.phone) && (
            <div>
              <h4 className="font-semibold text-white">{locale === 'bn' ? footer.contactTitle_bn : footer.contactTitle || 'Contact'}</h4>
              <div className="mt-1 space-y-0.5">
                {contact.email && <p>{contact.email}</p>}
                {contact.phone && <p>{contact.phone}</p>}
              </div>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-slate-700/80 pt-4">
          <p className="text-xs text-slate-500">{footer.copyright ?? '© School.'}</p>
          {hasSocialLinks && (
            <div className="flex gap-2">
              {footer.facebook && <span className="text-slate-400">FB</span>}
              {footer.youtube && <span className="text-slate-400">YT</span>}
              {footer.instagram && <span className="text-slate-400">IG</span>}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
