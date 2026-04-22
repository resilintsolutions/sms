'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ExternalLink, Plus, Trash2, Save, Eye, Star, ChevronUp, ChevronDown, Image as ImageIcon } from 'lucide-react';
import { LandingPreview, type LandingConfigPreview } from '@/components/landing/LandingPreview';
import { ImageFieldWithUpload } from '@/components/ImageFieldWithUpload';

type NavLink = { label?: string; label_bn?: string; href?: string };
type HeroSlide = { imageUrl?: string; title?: string; title_bn?: string; subtitle?: string; subtitle_bn?: string; overlayOpacity?: number };
type StatItem = { icon?: string; value?: number; suffix?: string; label?: string; label_bn?: string };
type GalleryImage = { url?: string; caption?: string; caption_bn?: string };
type Testimonial = { name?: string; name_bn?: string; role?: string; role_bn?: string; text?: string; text_bn?: string; imageUrl?: string; rating?: number };

type Config = {
  site?: { logoUrl?: string; schoolName?: string; schoolName_bn?: string; bannerImageUrl?: string; timezone?: string };
  header?: { topBarEnabled?: boolean; topBarLeft?: string; topBarLeft_bn?: string; topBarRight?: string; topBarRight_bn?: string };
  nav?: { links?: NavLink[] };
  hero?: { title?: string; title_bn?: string; subtitle?: string; subtitle_bn?: string; ctaText?: string; ctaLink?: string; imageUrl?: string; background?: string };
  heroSlides?: { enabled?: boolean; autoPlayInterval?: number; slides?: HeroSlide[] };
  stats?: { enabled?: boolean; items?: StatItem[] };
  about?: { heading?: string; heading_bn?: string; body?: string; body_bn?: string; imageUrl?: string };
  aboutGallery?: { enabled?: boolean; images?: string[] };
  academic?: { enabled?: boolean; heading?: string; heading_bn?: string; body?: string; body_bn?: string; highlights?: Array<{ title?: string; title_bn?: string; desc?: string }> };
  admission?: { enabled?: boolean; heading?: string; heading_bn?: string; body?: string; body_bn?: string; requirements?: string; requirements_bn?: string; contactInfo?: string; contactInfo_bn?: string };
  features?: Array<{ title?: string; title_bn?: string; description?: string; icon?: string }>;
  gallery?: { enabled?: boolean; heading?: string; heading_bn?: string; subtitle?: string; subtitle_bn?: string; images?: GalleryImage[] };
  testimonials?: { enabled?: boolean; heading?: string; heading_bn?: string; items?: Testimonial[] };
  contact?: { email?: string; phone?: string; address?: string; address_bn?: string; mapEmbed?: string; showSection?: boolean; showContactForm?: boolean };
  footer?: {
    aboutTitle?: string; aboutTitle_bn?: string; aboutText?: string; aboutText_bn?: string;
    linksTitle?: string; linksTitle_bn?: string; quickLinks?: NavLink[];
    contactTitle?: string; contactTitle_bn?: string;
    text?: string; copyright?: string;
    facebook?: string; youtube?: string; twitter?: string; instagram?: string; linkedin?: string;
  };
  seo?: { metaTitle?: string; metaDescription?: string };
  notices?: { enabled?: boolean; maxItems?: number; sectionTitle?: string; sectionTitle_bn?: string };
};

const ICON_OPTIONS = ['GraduationCap', 'Shield', 'Users', 'BookOpen', 'Megaphone', 'Award', 'Star', 'Target', 'Heart', 'Globe', 'Trophy', 'Lightbulb', 'Camera', 'Sparkles', 'CheckCircle2'];
const TIMEZONE_OPTIONS = [
  { value: 'Asia/Dhaka', label: 'Bangladesh (Asia/Dhaka)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Kolkata', label: 'India (Asia/Kolkata)' },
  { value: 'Asia/Dubai', label: 'UAE (Asia/Dubai)' },
  { value: 'Asia/Singapore', label: 'Singapore (Asia/Singapore)' },
  { value: 'Asia/Tokyo', label: 'Japan (Asia/Tokyo)' },
  { value: 'Europe/London', label: 'UK (Europe/London)' },
  { value: 'Europe/Berlin', label: 'Germany (Europe/Berlin)' },
  { value: 'America/New_York', label: 'US Eastern (America/New_York)' },
  { value: 'America/Chicago', label: 'US Central (America/Chicago)' },
  { value: 'America/Denver', label: 'US Mountain (America/Denver)' },
  { value: 'America/Los_Angeles', label: 'US Pacific (America/Los_Angeles)' },
];

const defaultConfig: Config = {
  site: { logoUrl: '', schoolName: '', schoolName_bn: '', bannerImageUrl: '', timezone: 'Asia/Dhaka' },
  header: { topBarEnabled: true, topBarLeft: '', topBarLeft_bn: '', topBarRight: '', topBarRight_bn: '' },
  nav: { links: [{ label: 'About', label_bn: 'আমাদের সম্পর্কে', href: '#about' }, { label: 'Notices', label_bn: 'নোটিশ', href: '#notices' }, { label: 'Contact', label_bn: 'যোগাযোগ', href: '#contact' }] },
  hero: { title: '', title_bn: '', subtitle: '', subtitle_bn: '', ctaText: 'Login to Portal', ctaLink: '/login', imageUrl: '', background: 'gradient' },
  heroSlides: { enabled: true, autoPlayInterval: 5000, slides: [] },
  stats: { enabled: true, items: [
    { icon: 'Users', value: 500, suffix: '+', label: 'Students', label_bn: 'শিক্ষার্থী' },
    { icon: 'GraduationCap', value: 50, suffix: '+', label: 'Teachers', label_bn: 'শিক্ষক' },
    { icon: 'Award', value: 95, suffix: '%', label: 'Pass Rate', label_bn: 'পাসের হার' },
    { icon: 'Star', value: 20, suffix: '+', label: 'Years', label_bn: 'বছর অভিজ্ঞতা' },
  ] },
  about: { heading: '', heading_bn: '', body: '', body_bn: '', imageUrl: '' },
  aboutGallery: { enabled: true, images: [] },
  features: [],
  gallery: { enabled: true, heading: 'Our Campus Gallery', heading_bn: 'আমাদের ক্যাম্পাস গ্যালারি', subtitle: '', subtitle_bn: '', images: [] },
  testimonials: { enabled: true, heading: 'What People Say', heading_bn: 'মানুষ কি বলে', items: [] },
  contact: { email: '', phone: '', address: '', address_bn: '', mapEmbed: '', showSection: true },
  footer: {
    aboutTitle: 'About Us', aboutTitle_bn: 'আমাদের সম্পর্কে', aboutText: '', aboutText_bn: '',
    linksTitle: 'Quick Links', linksTitle_bn: 'দ্রুত লিঙ্ক', quickLinks: [],
    contactTitle: 'Contact Us', contactTitle_bn: 'যোগাযোগ',
    text: '', copyright: '', facebook: '', youtube: '', twitter: '', instagram: '', linkedin: '',
  },
  seo: { metaTitle: '', metaDescription: '' },
  notices: { enabled: true, maxItems: 5, sectionTitle: 'Latest Notices', sectionTitle_bn: 'সর্বশেষ নোটিশ' },
};

const defaultAcademic = { enabled: true, heading: 'Academic Information', heading_bn: 'একাডেমিক তথ্য', body: '', body_bn: '', highlights: [] as Array<{ title?: string; title_bn?: string; desc?: string }> };
const defaultAdmission = { enabled: true, heading: 'Admission Information', heading_bn: 'ভর্তি তথ্য', body: '', body_bn: '', requirements: '', requirements_bn: '', contactInfo: '', contactInfo_bn: '' };

function mergeConfig(a: Config, b: Config): Config {
  return {
    site: { ...defaultConfig.site, ...a.site, ...b.site },
    header: { ...defaultConfig.header, ...a.header, ...b.header },
    nav: { ...defaultConfig.nav, ...a.nav, ...b.nav },
    hero: { ...defaultConfig.hero, ...a.hero, ...b.hero },
    heroSlides: { ...defaultConfig.heroSlides, ...a.heroSlides, ...b.heroSlides, slides: (b.heroSlides?.slides ?? a.heroSlides?.slides ?? defaultConfig.heroSlides?.slides ?? []) },
    stats: { ...defaultConfig.stats, ...a.stats, ...b.stats, items: (b.stats?.items ?? a.stats?.items ?? defaultConfig.stats?.items ?? []) },
    about: { ...defaultConfig.about, ...a.about, ...b.about },
    aboutGallery: { ...defaultConfig.aboutGallery, ...a.aboutGallery, ...b.aboutGallery, images: (b.aboutGallery?.images ?? a.aboutGallery?.images ?? []) },
    academic: { ...defaultAcademic, ...a.academic, ...b.academic },
    admission: { ...defaultAdmission, ...a.admission, ...b.admission },
    features: b.features?.length ? b.features : (a.features ?? []).map((f) => ({ ...f })),
    gallery: { ...defaultConfig.gallery, ...a.gallery, ...b.gallery, images: (b.gallery?.images ?? a.gallery?.images ?? []) },
    testimonials: { ...defaultConfig.testimonials, ...a.testimonials, ...b.testimonials, items: (b.testimonials?.items ?? a.testimonials?.items ?? []) },
    contact: { ...defaultConfig.contact, ...a.contact, ...b.contact },
    footer: {
      ...defaultConfig.footer,
      ...a.footer,
      ...b.footer,
      quickLinks: (b.footer?.quickLinks ?? a.footer?.quickLinks ?? [])?.length ? (b.footer?.quickLinks ?? a.footer?.quickLinks ?? []) : (defaultConfig.footer?.quickLinks ?? []),
    },
    seo: { ...defaultConfig.seo, ...a.seo, ...b.seo },
    notices: { ...defaultConfig.notices, ...a.notices, ...b.notices },
  };
}

export default function AdminWebsitePage() {
  const t = useTranslations('common');
  const tNav = useTranslations('nav');
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [activeTab, setActiveTab] = useState<'site' | 'header' | 'nav' | 'hero' | 'heroSlides' | 'stats' | 'about' | 'academic' | 'admission' | 'features' | 'gallery' | 'testimonials' | 'contact' | 'footer' | 'seo' | 'notices'>('site');
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['landing-page-config'],
    queryFn: async () => {
      const res = await api<Config>('/landing-page/config');
      return res.data ?? defaultConfig;
    },
  });

  useEffect(() => {
    if (data) setConfig(mergeConfig(defaultConfig, data));
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (payload: Config) =>
      api<Config>('/landing-page', { method: 'PUT', body: JSON.stringify({ config: payload }) }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['landing-page-config'] });
      queryClient.invalidateQueries({ queryKey: ['landing-page'] });
      toast.success(t('savedSuccessfully'));
      if (res.data) setConfig(mergeConfig(defaultConfig, res.data));
      if (typeof window !== 'undefined') {
        try {
          new BroadcastChannel('landing-page-refresh').postMessage('updated');
        } catch { /* BroadcastChannel not supported */ }
      }
    },
    onError: () => toast.error(t('saveFailed')),
  });

  const handleUploadSuccess = () => {
    setUploadError(null);
    toast.success(t('savedSuccessfully'));
  };
  const handleUploadError = (err: string) => {
    setUploadError(err);
    toast.error(err || t('saveFailed'));
  };

  const setSite = (key: keyof NonNullable<Config['site']>, value: string | undefined) =>
    setConfig((c) => ({ ...c, site: { ...c.site, [key]: value } }));
  const setHeader = (key: keyof NonNullable<Config['header']>, value: string | boolean | undefined) =>
    setConfig((c) => ({ ...c, header: { ...c.header, [key]: value } }));
  const setNav = (links: NavLink[]) =>
    setConfig((c) => ({ ...c, nav: { ...c.nav, links } }));
  const setNavLink = (index: number, key: keyof NavLink, value: string) => {
    setConfig((c) => {
      const links = [...(c.nav?.links ?? [])];
      if (!links[index]) links[index] = { label: '', label_bn: '', href: '#' };
      (links[index] as Record<string, string>)[key] = value;
      return { ...c, nav: { ...c.nav, links } };
    });
  };
  const addNavLink = () =>
    setConfig((c) => ({ ...c, nav: { ...c.nav, links: [...(c.nav?.links ?? []), { label: '', label_bn: '', href: '#' }] } }));
  const removeNavLink = (index: number) =>
    setConfig((c) => ({ ...c, nav: { ...c.nav, links: (c.nav?.links ?? []).filter((_, i) => i !== index) } }));
  const setFooter = (key: keyof NonNullable<Config['footer']>, value: string | NavLink[] | undefined) =>
    setConfig((c) => ({ ...c, footer: { ...c.footer, [key]: value } }));
  const setFooterQuickLink = (index: number, key: keyof NavLink, value: string) => {
    setConfig((c) => {
      const links = [...(c.footer?.quickLinks ?? [])];
      if (!links[index]) links[index] = { label: '', label_bn: '', href: '#' };
      (links[index] as Record<string, string>)[key] = value;
      return { ...c, footer: { ...c.footer, quickLinks: links } };
    });
  };
  const addFooterQuickLink = () =>
    setConfig((c) => ({ ...c, footer: { ...c.footer, quickLinks: [...(c.footer?.quickLinks ?? []), { label: '', label_bn: '', href: '#' }] } }));
  const removeFooterQuickLink = (index: number) =>
    setConfig((c) => ({ ...c, footer: { ...c.footer, quickLinks: (c.footer?.quickLinks ?? []).filter((_, i) => i !== index) } }));
  const setHero = (key: keyof NonNullable<Config['hero']>, value: string | undefined) =>
    setConfig((c) => ({ ...c, hero: { ...c.hero, [key]: value } }));
  const setAbout = (key: keyof NonNullable<Config['about']>, value: string | undefined) =>
    setConfig((c) => ({ ...c, about: { ...c.about, [key]: value } }));
  const setAcademic = (key: string, value: unknown) =>
    setConfig((c) => ({ ...c, academic: { ...c.academic, [key]: value } }));
  const setAdmission = (key: string, value: unknown) =>
    setConfig((c) => ({ ...c, admission: { ...c.admission, [key]: value } }));
  const setContact = (key: keyof NonNullable<Config['contact']>, value: string | boolean | undefined) =>
    setConfig((c) => ({ ...c, contact: { ...c.contact, [key]: value } }));
  const setSeo = (key: keyof NonNullable<Config['seo']>, value: string | undefined) =>
    setConfig((c) => ({ ...c, seo: { ...c.seo, [key]: value } }));
  const setNotices = (key: keyof NonNullable<Config['notices']>, value: boolean | number | string | undefined) =>
    setConfig((c) => ({ ...c, notices: { ...c.notices, [key]: value } }));

  /* Hero Slides helpers */
  const setHeroSlides = (key: string, value: unknown) =>
    setConfig((c) => ({ ...c, heroSlides: { ...c.heroSlides, [key]: value } }));
  const addHeroSlide = () =>
    setConfig((c) => ({ ...c, heroSlides: { ...c.heroSlides, slides: [...(c.heroSlides?.slides ?? []), { imageUrl: '', title: '', title_bn: '', subtitle: '', subtitle_bn: '', overlayOpacity: 70 }] } }));
  const removeHeroSlide = (index: number) =>
    setConfig((c) => ({ ...c, heroSlides: { ...c.heroSlides, slides: (c.heroSlides?.slides ?? []).filter((_, i) => i !== index) } }));
  const setHeroSlide = (index: number, key: string, value: string | number) =>
    setConfig((c) => {
      const slides = [...(c.heroSlides?.slides ?? [])];
      if (!slides[index]) slides[index] = { imageUrl: '', title: '', title_bn: '', subtitle: '', subtitle_bn: '', overlayOpacity: 70 };
      (slides[index] as Record<string, unknown>)[key] = value;
      return { ...c, heroSlides: { ...c.heroSlides, slides } };
    });
  const moveHeroSlide = (index: number, dir: -1 | 1) =>
    setConfig((c) => {
      const slides = [...(c.heroSlides?.slides ?? [])];
      const newIdx = index + dir;
      if (newIdx < 0 || newIdx >= slides.length) return c;
      [slides[index], slides[newIdx]] = [slides[newIdx], slides[index]];
      return { ...c, heroSlides: { ...c.heroSlides, slides } };
    });

  /* Stats helpers */
  const setStats = (key: string, value: unknown) =>
    setConfig((c) => ({ ...c, stats: { ...c.stats, [key]: value } }));
  const addStatItem = () =>
    setConfig((c) => ({ ...c, stats: { ...c.stats, items: [...(c.stats?.items ?? []), { icon: 'Users', value: 0, suffix: '+', label: '', label_bn: '' }] } }));
  const removeStatItem = (index: number) =>
    setConfig((c) => ({ ...c, stats: { ...c.stats, items: (c.stats?.items ?? []).filter((_, i) => i !== index) } }));
  const setStatItem = (index: number, key: string, value: string | number) =>
    setConfig((c) => {
      const items = [...(c.stats?.items ?? [])];
      if (!items[index]) items[index] = { icon: 'Users', value: 0, suffix: '+', label: '', label_bn: '' };
      (items[index] as Record<string, unknown>)[key] = value;
      return { ...c, stats: { ...c.stats, items } };
    });

  /* Gallery helpers */
  const setGallery = (key: string, value: unknown) =>
    setConfig((c) => ({ ...c, gallery: { ...c.gallery, [key]: value } }));
  const addGalleryImage = () =>
    setConfig((c) => ({ ...c, gallery: { ...c.gallery, images: [...(c.gallery?.images ?? []), { url: '', caption: '', caption_bn: '' }] } }));
  const removeGalleryImage = (index: number) =>
    setConfig((c) => ({ ...c, gallery: { ...c.gallery, images: (c.gallery?.images ?? []).filter((_, i) => i !== index) } }));
  const setGalleryImage = (index: number, key: string, value: string) =>
    setConfig((c) => {
      const images = [...(c.gallery?.images ?? [])];
      if (!images[index]) images[index] = { url: '', caption: '', caption_bn: '' };
      (images[index] as Record<string, string>)[key] = value;
      return { ...c, gallery: { ...c.gallery, images } };
    });

  /* Testimonial helpers */
  const setTestimonials = (key: string, value: unknown) =>
    setConfig((c) => ({ ...c, testimonials: { ...c.testimonials, [key]: value } }));
  const addTestimonial = () =>
    setConfig((c) => ({ ...c, testimonials: { ...c.testimonials, items: [...(c.testimonials?.items ?? []), { name: '', name_bn: '', role: '', role_bn: '', text: '', text_bn: '', imageUrl: '', rating: 5 }] } }));
  const removeTestimonial = (index: number) =>
    setConfig((c) => ({ ...c, testimonials: { ...c.testimonials, items: (c.testimonials?.items ?? []).filter((_, i) => i !== index) } }));
  const setTestimonialItem = (index: number, key: string, value: string | number) =>
    setConfig((c) => {
      const items = [...(c.testimonials?.items ?? [])];
      if (!items[index]) items[index] = { name: '', name_bn: '', role: '', role_bn: '', text: '', text_bn: '', imageUrl: '', rating: 5 };
      (items[index] as Record<string, unknown>)[key] = value;
      return { ...c, testimonials: { ...c.testimonials, items } };
    });

  const setFeature = (index: number, key: string, value: string) => {
    setConfig((c) => {
      const features = [...(c.features ?? [])];
      if (!features[index]) features[index] = { title: '', title_bn: '', description: '', icon: 'GraduationCap' };
      (features[index] as Record<string, string>)[key] = value;
      return { ...c, features };
    });
  };
  const addFeature = () =>
    setConfig((c) => ({ ...c, features: [...(c.features ?? []), { title: '', title_bn: '', description: '', icon: 'GraduationCap' }] }));
  const removeFeature = (index: number) =>
    setConfig((c) => ({ ...c, features: (c.features ?? []).filter((_, i) => i !== index) }));

  const tabs = [
    { id: 'site' as const, label: 'Logo & Name' },
    { id: 'header' as const, label: 'Top Bar' },
    { id: 'nav' as const, label: 'Navigation' },
    { id: 'hero' as const, label: 'Hero' },
    { id: 'heroSlides' as const, label: 'Hero Slides' },
    { id: 'stats' as const, label: 'Stats' },
    { id: 'about' as const, label: 'About' },
    { id: 'academic' as const, label: 'Academic Info' },
    { id: 'admission' as const, label: 'Admission' },
    { id: 'features' as const, label: 'Features' },
    { id: 'gallery' as const, label: 'Gallery' },
    { id: 'testimonials' as const, label: 'Testimonials' },
    { id: 'contact' as const, label: 'Contact' },
    { id: 'footer' as const, label: 'Footer' },
    { id: 'seo' as const, label: 'SEO' },
    { id: 'notices' as const, label: 'News & Events' },
  ];

  type NoticeItem = { id: number; title: string; title_bn?: string | null; body?: string | null };
  const { data: noticesData } = useQuery({
    queryKey: ['notices-preview'],
    queryFn: () => api<NoticeItem[]>('/notices?per_page=5'),
  });
  const previewNotices = Array.isArray(noticesData?.data) ? noticesData.data : [];

  if (isLoading) {
    return <p className="text-slate-500">{t('loading')}</p>;
  }

  return (
    <div className="min-w-0">
      <div className="mb-4 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h2 className="min-w-0 truncate text-xl font-bold text-slate-800 sm:text-2xl">Landing Page Setup</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${locale}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" /> View website
          </Link>
          <button
            type="button"
            onClick={() => updateMutation.mutate(config)}
            disabled={updateMutation.isPending}
            className="btn btn-primary flex items-center gap-2"
          >
            <Save className="h-4 w-4" /> {t('save')} & publish
          </button>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-[1fr,min(400px,100%)]">
        <div className="min-w-0 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setActiveTab(tab.id); toast.info(`Editing: ${tab.label}`, { duration: 1500 }); }}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-slate-700 shadow-sm hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="card-accent space-y-6">
            {activeTab === 'site' && (
              <>
                <h3 className="text-lg font-semibold text-slate-800">Logo, school name & banner</h3>
                {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <ImageFieldWithUpload
                      label="Logo"
                      value={config.site?.logoUrl ?? ''}
                      onChange={(url) => setSite('logoUrl', url)}
                      onUploadSuccess={handleUploadSuccess}
                      onUploadError={handleUploadError}
                      uploadType="logo"
                      uploading={uploading === 'logo'}
                      onUploadingChange={(loading) => setUploading(loading ? 'logo' : null)}
                      previewVariant="logo"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <ImageFieldWithUpload
                      label="Banner image"
                      value={config.site?.bannerImageUrl ?? ''}
                      onChange={(url) => setSite('bannerImageUrl', url)}
                      onUploadSuccess={handleUploadSuccess}
                      onUploadError={handleUploadError}
                      uploadType="banner"
                      uploading={uploading === 'banner'}
                      onUploadingChange={(loading) => setUploading(loading ? 'banner' : null)}
                      previewVariant="banner"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">School name (English)</label>
                    <input type="text" value={config.site?.schoolName ?? ''} onChange={(e) => setSite('schoolName', e.target.value)} className="input mt-1" placeholder="Display in header & nav" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">School name (Bangla)</label>
                    <input type="text" value={config.site?.schoolName_bn ?? ''} onChange={(e) => setSite('schoolName_bn', e.target.value)} className="input mt-1" placeholder="বাংলা নাম" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Login page clock timezone</label>
                    <select
                      value={config.site?.timezone ?? 'Asia/Dhaka'}
                      onChange={(e) => setSite('timezone', e.target.value)}
                      className="input mt-1"
                    >
                      {TIMEZONE_OPTIONS.map((timezone) => (
                        <option key={timezone.value} value={timezone.value}>
                          {timezone.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-sm text-slate-500">
                      This timezone controls the realtime digital clock shown on the public login page.
                    </p>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'header' && (
              <>
                <h3 className="text-lg font-semibold text-slate-800">Top bar (line 1 above nav)</h3>
                <p className="text-sm text-slate-600">The dark bar above the main navigation. Shown on all screen sizes.</p>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="topBarEnabled" checked={config.header?.topBarEnabled !== false} onChange={(e) => setHeader('topBarEnabled', e.target.checked)} />
                  <label htmlFor="topBarEnabled" className="text-sm font-medium text-slate-700">Show top bar</label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Left text (English)</label>
                    <input type="text" value={config.header?.topBarLeft ?? ''} onChange={(e) => setHeader('topBarLeft', e.target.value)} className="input mt-1" placeholder="e.g. Welcome to Our School" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Left text (Bangla)</label>
                    <input type="text" value={config.header?.topBarLeft_bn ?? ''} onChange={(e) => setHeader('topBarLeft_bn', e.target.value)} className="input mt-1" placeholder="বাংলা" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Right text (English)</label>
                    <input type="text" value={config.header?.topBarRight ?? ''} onChange={(e) => setHeader('topBarRight', e.target.value)} className="input mt-1" placeholder="e.g. Mon–Fri 8AM–4PM" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Right text (Bangla)</label>
                    <input type="text" value={config.header?.topBarRight_bn ?? ''} onChange={(e) => setHeader('topBarRight_bn', e.target.value)} className="input mt-1" placeholder="বাংলা" />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'nav' && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">Navigation links</h3>
                  <button type="button" onClick={addNavLink} className="btn flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Add link
                  </button>
                </div>
                <p className="text-sm text-slate-600">Links shown in the main nav. Use #about, #notices, #contact for same-page anchors.</p>
                <div className="space-y-4">
                  {(config.nav?.links ?? []).map((link, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-medium text-slate-700">Link {i + 1}</span>
                        <button type="button" onClick={() => removeNavLink(i)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input type="text" placeholder="Label (EN)" value={link.label ?? ''} onChange={(e) => setNavLink(i, 'label', e.target.value)} className="input" />
                        <input type="text" placeholder="Label (BN)" value={link.label_bn ?? ''} onChange={(e) => setNavLink(i, 'label_bn', e.target.value)} className="input" />
                        <div className="sm:col-span-2">
                          <input type="text" placeholder="URL (e.g. #about or /login)" value={link.href ?? ''} onChange={(e) => setNavLink(i, 'href', e.target.value)} className="input" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'hero' && (
              <>
                <h3 className="text-lg font-semibold text-slate-800">Hero section</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Title (English)</label>
                    <input type="text" value={config.hero?.title ?? ''} onChange={(e) => setHero('title', e.target.value)} className="input mt-1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Title (Bangla)</label>
                    <input type="text" value={config.hero?.title_bn ?? ''} onChange={(e) => setHero('title_bn', e.target.value)} className="input mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Subtitle (English)</label>
                    <input type="text" value={config.hero?.subtitle ?? ''} onChange={(e) => setHero('subtitle', e.target.value)} className="input mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Subtitle (Bangla)</label>
                    <input type="text" value={config.hero?.subtitle_bn ?? ''} onChange={(e) => setHero('subtitle_bn', e.target.value)} className="input mt-1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Button text</label>
                    <input type="text" value={config.hero?.ctaText ?? ''} onChange={(e) => setHero('ctaText', e.target.value)} className="input mt-1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Button link</label>
                    <input type="text" value={config.hero?.ctaLink ?? ''} onChange={(e) => setHero('ctaLink', e.target.value)} className="input mt-1" placeholder="/login" />
                  </div>
                  <div className="sm:col-span-2">
                    <ImageFieldWithUpload
                      label="Hero image (optional)"
                      value={config.hero?.imageUrl ?? ''}
                      onChange={(url) => setHero('imageUrl', url)}
                      onUploadSuccess={handleUploadSuccess}
                      onUploadError={handleUploadError}
                      uploadType="hero"
                      uploading={uploading === 'hero'}
                      onUploadingChange={(loading) => setUploading(loading ? 'hero' : null)}
                      previewVariant="hero"
                      placeholder="URL or upload"
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'heroSlides' && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">Hero Slideshow</h3>
                  <button type="button" onClick={addHeroSlide} className="btn flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Add slide
                  </button>
                </div>
                <p className="text-sm text-slate-600">Add multiple slides with images for the hero banner slideshow. Each slide can have its own title, subtitle, and overlay.</p>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="heroSlidesEnabled" checked={config.heroSlides?.enabled !== false} onChange={(e) => setHeroSlides('enabled', e.target.checked)} />
                  <label htmlFor="heroSlidesEnabled" className="text-sm font-medium text-slate-700">Enable hero slideshow</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Auto-play interval (ms)</label>
                  <input type="number" min={2000} max={15000} step={500} value={config.heroSlides?.autoPlayInterval ?? 5000} onChange={(e) => setHeroSlides('autoPlayInterval', parseInt(e.target.value, 10) || 5000)} className="input mt-1 w-40" />
                </div>
                <div className="space-y-6">
                  {(config.heroSlides?.slides ?? []).map((slide, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-medium text-slate-700">Slide {i + 1}</span>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => moveHeroSlide(i, -1)} disabled={i === 0} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                          <button type="button" onClick={() => moveHeroSlide(i, 1)} disabled={i === (config.heroSlides?.slides?.length ?? 0) - 1} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                          <button type="button" onClick={() => removeHeroSlide(i)} className="p-1 text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label className="block text-sm text-slate-600">Image URL</label>
                          <div className="flex gap-2 mt-1">
                            <input type="text" placeholder="Image URL or upload" value={slide.imageUrl ?? ''} onChange={(e) => setHeroSlide(i, 'imageUrl', e.target.value)} className="input flex-1" />
                            <ImageFieldWithUpload
                              label=""
                              value={slide.imageUrl ?? ''}
                              onChange={(url) => setHeroSlide(i, 'imageUrl', url)}
                              onUploadSuccess={handleUploadSuccess}
                              onUploadError={handleUploadError}
                              uploadType="slide"
                              uploading={uploading === `slide-${i}`}
                              onUploadingChange={(loading) => setUploading(loading ? `slide-${i}` : null)}
                              previewVariant="banner"
                              compact
                            />
                          </div>
                          {slide.imageUrl && <img src={slide.imageUrl} alt="" className="mt-2 h-20 w-full object-cover rounded-lg" />}
                        </div>
                        <input type="text" placeholder="Title (EN)" value={slide.title ?? ''} onChange={(e) => setHeroSlide(i, 'title', e.target.value)} className="input" />
                        <input type="text" placeholder="Title (BN)" value={slide.title_bn ?? ''} onChange={(e) => setHeroSlide(i, 'title_bn', e.target.value)} className="input" />
                        <input type="text" placeholder="Subtitle (EN)" value={slide.subtitle ?? ''} onChange={(e) => setHeroSlide(i, 'subtitle', e.target.value)} className="input" />
                        <input type="text" placeholder="Subtitle (BN)" value={slide.subtitle_bn ?? ''} onChange={(e) => setHeroSlide(i, 'subtitle_bn', e.target.value)} className="input" />
                        <div>
                          <label className="block text-sm text-slate-600">Overlay opacity ({slide.overlayOpacity ?? 70}%)</label>
                          <input type="range" min={0} max={100} value={slide.overlayOpacity ?? 70} onChange={(e) => setHeroSlide(i, 'overlayOpacity', parseInt(e.target.value, 10))} className="mt-1 w-full" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {(config.heroSlides?.slides ?? []).length === 0 && <p className="text-sm text-slate-500 italic">No slides yet. Click &quot;Add slide&quot; to create one.</p>}
                </div>
              </>
            )}

            {activeTab === 'stats' && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">Stats / Counters</h3>
                  <button type="button" onClick={addStatItem} className="btn flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Add stat
                  </button>
                </div>
                <p className="text-sm text-slate-600">Animated counters shown below the hero banner. Each stat has an icon, value, suffix, and label.</p>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="statsEnabled" checked={config.stats?.enabled !== false} onChange={(e) => setStats('enabled', e.target.checked)} />
                  <label htmlFor="statsEnabled" className="text-sm font-medium text-slate-700">Show stats bar</label>
                </div>
                <div className="space-y-4">
                  {(config.stats?.items ?? []).map((stat, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-medium text-slate-700">Stat {i + 1}</span>
                        <button type="button" onClick={() => removeStatItem(i)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm text-slate-600">Icon</label>
                          <select value={stat.icon ?? 'Users'} onChange={(e) => setStatItem(i, 'icon', e.target.value)} className="input mt-1">
                            {ICON_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-slate-600">Value (number)</label>
                          <input type="number" min={0} value={stat.value ?? 0} onChange={(e) => setStatItem(i, 'value', parseInt(e.target.value, 10) || 0)} className="input mt-1" />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-600">Suffix</label>
                          <input type="text" placeholder="e.g. +, %" value={stat.suffix ?? ''} onChange={(e) => setStatItem(i, 'suffix', e.target.value)} className="input mt-1" />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-600">Label (EN)</label>
                          <input type="text" value={stat.label ?? ''} onChange={(e) => setStatItem(i, 'label', e.target.value)} className="input mt-1" />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-600">Label (BN)</label>
                          <input type="text" value={stat.label_bn ?? ''} onChange={(e) => setStatItem(i, 'label_bn', e.target.value)} className="input mt-1" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'about' && (
              <>
                <h3 className="text-lg font-semibold text-slate-800">About section</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Heading (English)</label>
                    <input type="text" value={config.about?.heading ?? ''} onChange={(e) => setAbout('heading', e.target.value)} className="input mt-1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Heading (Bangla)</label>
                    <input type="text" value={config.about?.heading_bn ?? ''} onChange={(e) => setAbout('heading_bn', e.target.value)} className="input mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Body (English)</label>
                    <textarea value={config.about?.body ?? ''} onChange={(e) => setAbout('body', e.target.value)} className="input mt-1 min-h-[120px]" rows={4} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Body (Bangla)</label>
                    <textarea value={config.about?.body_bn ?? ''} onChange={(e) => setAbout('body_bn', e.target.value)} className="input mt-1 min-h-[120px]" rows={4} />
                  </div>
                  <div className="sm:col-span-2">
                    <ImageFieldWithUpload
                      label="About section image (optional)"
                      value={config.about?.imageUrl ?? ''}
                      onChange={(url) => setAbout('imageUrl', url)}
                      onUploadSuccess={handleUploadSuccess}
                      onUploadError={handleUploadError}
                      uploadType="about"
                      uploading={uploading === 'about'}
                      onUploadingChange={(loading) => setUploading(loading ? 'about' : null)}
                      previewVariant="about"
                      placeholder="URL or upload"
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'academic' && (
              <>
                <h3 className="text-lg font-semibold text-slate-800">Academic Info section</h3>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="academicEnabled" checked={config.academic?.enabled !== false} onChange={(e) => setAcademic('enabled', e.target.checked)} />
                  <label htmlFor="academicEnabled" className="text-sm font-medium text-slate-700">Show Academic Info section</label>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Heading (English)</label>
                    <input type="text" value={config.academic?.heading ?? ''} onChange={(e) => setAcademic('heading', e.target.value)} className="input mt-1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Heading (Bangla)</label>
                    <input type="text" value={config.academic?.heading_bn ?? ''} onChange={(e) => setAcademic('heading_bn', e.target.value)} className="input mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Body (English)</label>
                    <textarea value={config.academic?.body ?? ''} onChange={(e) => setAcademic('body', e.target.value)} className="input mt-1 min-h-[100px]" rows={4} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Body (Bangla)</label>
                    <textarea value={config.academic?.body_bn ?? ''} onChange={(e) => setAcademic('body_bn', e.target.value)} className="input mt-1 min-h-[100px]" rows={4} />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium text-slate-700">Highlights (optional)</p>
                  <p className="text-xs text-slate-500">Add key points shown as cards. Edit in JSON or add a highlights editor later.</p>
                </div>
              </>
            )}

            {activeTab === 'admission' && (
              <>
                <h3 className="text-lg font-semibold text-slate-800">Admission section</h3>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="admissionEnabled" checked={config.admission?.enabled !== false} onChange={(e) => setAdmission('enabled', e.target.checked)} />
                  <label htmlFor="admissionEnabled" className="text-sm font-medium text-slate-700">Show Admission section</label>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Heading (English)</label>
                    <input type="text" value={config.admission?.heading ?? ''} onChange={(e) => setAdmission('heading', e.target.value)} className="input mt-1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Heading (Bangla)</label>
                    <input type="text" value={config.admission?.heading_bn ?? ''} onChange={(e) => setAdmission('heading_bn', e.target.value)} className="input mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Body (English)</label>
                    <textarea value={config.admission?.body ?? ''} onChange={(e) => setAdmission('body', e.target.value)} className="input mt-1 min-h-[80px]" rows={3} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Body (Bangla)</label>
                    <textarea value={config.admission?.body_bn ?? ''} onChange={(e) => setAdmission('body_bn', e.target.value)} className="input mt-1 min-h-[80px]" rows={3} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Required Documents (English)</label>
                    <input type="text" value={config.admission?.requirements ?? ''} onChange={(e) => setAdmission('requirements', e.target.value)} className="input mt-1" placeholder="e.g. Birth certificate, previous records..." />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Required Documents (Bangla)</label>
                    <input type="text" value={config.admission?.requirements_bn ?? ''} onChange={(e) => setAdmission('requirements_bn', e.target.value)} className="input mt-1" placeholder="বাংলা" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Contact / Office Hours (English)</label>
                    <input type="text" value={config.admission?.contactInfo ?? ''} onChange={(e) => setAdmission('contactInfo', e.target.value)} className="input mt-1" placeholder="e.g. Visit 9 AM - 3 PM" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Contact / Office Hours (Bangla)</label>
                    <input type="text" value={config.admission?.contactInfo_bn ?? ''} onChange={(e) => setAdmission('contactInfo_bn', e.target.value)} className="input mt-1" placeholder="বাংলা" />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'features' && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">Features</h3>
                  <button type="button" onClick={addFeature} className="btn flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Add feature
                  </button>
                </div>
                <div className="space-y-6">
                  {(config.features ?? []).map((f, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-medium text-slate-700">Feature {i + 1}</span>
                        <button type="button" onClick={() => removeFeature(i)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input type="text" placeholder="Title (EN)" value={f.title ?? ''} onChange={(e) => setFeature(i, 'title', e.target.value)} className="input" />
                        <input type="text" placeholder="Title (BN)" value={f.title_bn ?? ''} onChange={(e) => setFeature(i, 'title_bn', e.target.value)} className="input" />
                        <div className="sm:col-span-2">
                          <input type="text" placeholder="Description" value={f.description ?? ''} onChange={(e) => setFeature(i, 'description', e.target.value)} className="input" />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-600">Icon</label>
                          <select value={f.icon ?? 'GraduationCap'} onChange={(e) => setFeature(i, 'icon', e.target.value)} className="input mt-1">
                            {ICON_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'gallery' && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">Campus Gallery</h3>
                  <button type="button" onClick={addGalleryImage} className="btn flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Add image
                  </button>
                </div>
                <p className="text-sm text-slate-600">A masonry gallery section on the landing page with lightbox. Upload images with optional captions.</p>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="galleryEnabled" checked={config.gallery?.enabled !== false} onChange={(e) => setGallery('enabled', e.target.checked)} />
                  <label htmlFor="galleryEnabled" className="text-sm font-medium text-slate-700">Show gallery section</label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Heading (English)</label>
                    <input type="text" value={config.gallery?.heading ?? ''} onChange={(e) => setGallery('heading', e.target.value)} className="input mt-1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Heading (Bangla)</label>
                    <input type="text" value={config.gallery?.heading_bn ?? ''} onChange={(e) => setGallery('heading_bn', e.target.value)} className="input mt-1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Subtitle (English)</label>
                    <input type="text" value={config.gallery?.subtitle ?? ''} onChange={(e) => setGallery('subtitle', e.target.value)} className="input mt-1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Subtitle (Bangla)</label>
                    <input type="text" value={config.gallery?.subtitle_bn ?? ''} onChange={(e) => setGallery('subtitle_bn', e.target.value)} className="input mt-1" />
                  </div>
                </div>
                <div className="space-y-4">
                  {(config.gallery?.images ?? []).map((img, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-medium text-slate-700">Image {i + 1}</span>
                        <button type="button" onClick={() => removeGalleryImage(i)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label className="block text-sm text-slate-600">Image URL</label>
                          <div className="flex gap-2 mt-1">
                            <input type="text" placeholder="Image URL or upload" value={img.url ?? ''} onChange={(e) => setGalleryImage(i, 'url', e.target.value)} className="input flex-1" />
                            <ImageFieldWithUpload
                              label=""
                              value={img.url ?? ''}
                              onChange={(url) => setGalleryImage(i, 'url', url)}
                              onUploadSuccess={handleUploadSuccess}
                              onUploadError={handleUploadError}
                              uploadType="gallery"
                              uploading={uploading === `gallery-${i}`}
                              onUploadingChange={(loading) => setUploading(loading ? `gallery-${i}` : null)}
                              previewVariant="about"
                              compact
                            />
                          </div>
                          {img.url && <img src={img.url} alt="" className="mt-2 h-16 w-24 object-cover rounded-lg" />}
                        </div>
                        <input type="text" placeholder="Caption (EN)" value={img.caption ?? ''} onChange={(e) => setGalleryImage(i, 'caption', e.target.value)} className="input" />
                        <input type="text" placeholder="Caption (BN)" value={img.caption_bn ?? ''} onChange={(e) => setGalleryImage(i, 'caption_bn', e.target.value)} className="input" />
                      </div>
                    </div>
                  ))}
                  {(config.gallery?.images ?? []).length === 0 && <p className="text-sm text-slate-500 italic">No gallery images yet. Click &quot;Add image&quot; to create one.</p>}
                </div>
              </>
            )}

            {activeTab === 'testimonials' && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">Testimonials</h3>
                  <button type="button" onClick={addTestimonial} className="btn flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Add testimonial
                  </button>
                </div>
                <p className="text-sm text-slate-600">Auto-rotating testimonials carousel on the landing page. Add quotes from parents, students, or faculty.</p>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="testimonialsEnabled" checked={config.testimonials?.enabled !== false} onChange={(e) => setTestimonials('enabled', e.target.checked)} />
                  <label htmlFor="testimonialsEnabled" className="text-sm font-medium text-slate-700">Show testimonials section</label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Heading (English)</label>
                    <input type="text" value={config.testimonials?.heading ?? ''} onChange={(e) => setTestimonials('heading', e.target.value)} className="input mt-1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Heading (Bangla)</label>
                    <input type="text" value={config.testimonials?.heading_bn ?? ''} onChange={(e) => setTestimonials('heading_bn', e.target.value)} className="input mt-1" />
                  </div>
                </div>
                <div className="space-y-6">
                  {(config.testimonials?.items ?? []).map((t, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-medium text-slate-700">Testimonial {i + 1}</span>
                        <button type="button" onClick={() => removeTestimonial(i)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input type="text" placeholder="Name (EN)" value={t.name ?? ''} onChange={(e) => setTestimonialItem(i, 'name', e.target.value)} className="input" />
                        <input type="text" placeholder="Name (BN)" value={t.name_bn ?? ''} onChange={(e) => setTestimonialItem(i, 'name_bn', e.target.value)} className="input" />
                        <input type="text" placeholder="Role (EN) e.g. Parent" value={t.role ?? ''} onChange={(e) => setTestimonialItem(i, 'role', e.target.value)} className="input" />
                        <input type="text" placeholder="Role (BN)" value={t.role_bn ?? ''} onChange={(e) => setTestimonialItem(i, 'role_bn', e.target.value)} className="input" />
                        <div className="sm:col-span-2">
                          <label className="block text-sm text-slate-600">Quote (English)</label>
                          <textarea value={t.text ?? ''} onChange={(e) => setTestimonialItem(i, 'text', e.target.value)} className="input mt-1 min-h-[60px]" rows={2} placeholder="Their testimonial text..." />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm text-slate-600">Quote (Bangla)</label>
                          <textarea value={t.text_bn ?? ''} onChange={(e) => setTestimonialItem(i, 'text_bn', e.target.value)} className="input mt-1 min-h-[60px]" rows={2} />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-600">Photo URL</label>
                          <div className="flex gap-2 mt-1">
                            <input type="text" placeholder="Image URL or upload" value={t.imageUrl ?? ''} onChange={(e) => setTestimonialItem(i, 'imageUrl', e.target.value)} className="input flex-1" />
                            <ImageFieldWithUpload
                              label=""
                              value={t.imageUrl ?? ''}
                              onChange={(url) => setTestimonialItem(i, 'imageUrl', url)}
                              onUploadSuccess={handleUploadSuccess}
                              onUploadError={handleUploadError}
                              uploadType="testimonial"
                              uploading={uploading === `testimonial-${i}`}
                              onUploadingChange={(loading) => setUploading(loading ? `testimonial-${i}` : null)}
                              previewVariant="logo"
                              compact
                            />
                          </div>
                          {t.imageUrl && <img src={t.imageUrl} alt="" className="mt-2 h-12 w-12 rounded-full object-cover" />}
                        </div>
                        <div>
                          <label className="block text-sm text-slate-600">Rating (1-5 stars)</label>
                          <div className="flex gap-1 mt-2">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button key={star} type="button" onClick={() => setTestimonialItem(i, 'rating', star)} className="p-0.5">
                                <Star className={`h-5 w-5 ${star <= (t.rating ?? 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(config.testimonials?.items ?? []).length === 0 && <p className="text-sm text-slate-500 italic">No testimonials yet. Click &quot;Add testimonial&quot; to create one.</p>}
                </div>
              </>
            )}

            {activeTab === 'contact' && (
              <>
                <h3 className="text-lg font-semibold text-slate-800">Contact section</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="showContact" checked={config.contact?.showSection !== false} onChange={(e) => setContact('showSection', e.target.checked)} />
                    <label htmlFor="showContact" className="text-sm font-medium text-slate-700">Show contact section on website</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="showContactForm" checked={config.contact?.showContactForm !== false} onChange={(e) => setContact('showContactForm', e.target.checked)} />
                    <label htmlFor="showContactForm" className="text-sm font-medium text-slate-700">Show contact form (emails sent to the address below)</label>
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-500">Contact form emails are delivered to the school&apos;s email. Configure SMTP in .env for production.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Email</label>
                    <input type="email" value={config.contact?.email ?? ''} onChange={(e) => setContact('email', e.target.value)} className="input mt-1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Phone</label>
                    <input type="text" value={config.contact?.phone ?? ''} onChange={(e) => setContact('phone', e.target.value)} className="input mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Address (English)</label>
                    <input type="text" value={config.contact?.address ?? ''} onChange={(e) => setContact('address', e.target.value)} className="input mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Address (Bangla)</label>
                    <input type="text" value={config.contact?.address_bn ?? ''} onChange={(e) => setContact('address_bn', e.target.value)} className="input mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Map embed HTML (optional)</label>
                    <textarea value={config.contact?.mapEmbed ?? ''} onChange={(e) => setContact('mapEmbed', e.target.value)} className="input mt-1 min-h-[80px]" placeholder="<iframe ...>" />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'footer' && (
              <>
                <h3 className="text-lg font-semibold text-slate-800">Footer (modern multi-column)</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="mb-2 font-medium text-slate-700">About column</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Title (English)</label>
                        <input type="text" value={config.footer?.aboutTitle ?? ''} onChange={(e) => setFooter('aboutTitle', e.target.value)} className="input mt-1" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Title (Bangla)</label>
                        <input type="text" value={config.footer?.aboutTitle_bn ?? ''} onChange={(e) => setFooter('aboutTitle_bn', e.target.value)} className="input mt-1" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-slate-700">About text (English)</label>
                        <textarea value={config.footer?.aboutText ?? ''} onChange={(e) => setFooter('aboutText', e.target.value)} className="input mt-1 min-h-[80px]" rows={3} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-slate-700">About text (Bangla)</label>
                        <textarea value={config.footer?.aboutText_bn ?? ''} onChange={(e) => setFooter('aboutText_bn', e.target.value)} className="input mt-1 min-h-[80px]" rows={3} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="font-medium text-slate-700">Quick links column</h4>
                      <button type="button" onClick={addFooterQuickLink} className="btn flex items-center gap-2 text-sm">
                        <Plus className="h-3 w-3" /> Add
                      </button>
                    </div>
                    <div className="mb-2 grid gap-2 sm:grid-cols-2">
                      <input type="text" placeholder="Column title (EN)" value={config.footer?.linksTitle ?? ''} onChange={(e) => setFooter('linksTitle', e.target.value)} className="input" />
                      <input type="text" placeholder="Column title (BN)" value={config.footer?.linksTitle_bn ?? ''} onChange={(e) => setFooter('linksTitle_bn', e.target.value)} className="input" />
                    </div>
                    <div className="space-y-3">
                      {(config.footer?.quickLinks ?? []).map((link, i) => (
                        <div key={i} className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-2">
                          <input type="text" placeholder="Label (EN)" value={link.label ?? ''} onChange={(e) => setFooterQuickLink(i, 'label', e.target.value)} className="input flex-1 min-w-[80px]" />
                          <input type="text" placeholder="Label (BN)" value={link.label_bn ?? ''} onChange={(e) => setFooterQuickLink(i, 'label_bn', e.target.value)} className="input flex-1 min-w-[80px]" />
                          <input type="text" placeholder="URL" value={link.href ?? ''} onChange={(e) => setFooterQuickLink(i, 'href', e.target.value)} className="input flex-1 min-w-[80px]" />
                          <button type="button" onClick={() => removeFooterQuickLink(i)} className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-2 font-medium text-slate-700">Contact column title</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <input type="text" placeholder="Title (EN)" value={config.footer?.contactTitle ?? ''} onChange={(e) => setFooter('contactTitle', e.target.value)} className="input" />
                      <input type="text" placeholder="Title (BN)" value={config.footer?.contactTitle_bn ?? ''} onChange={(e) => setFooter('contactTitle_bn', e.target.value)} className="input" />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Contact details come from the Contact section above.</p>
                  </div>
                  <div>
                    <h4 className="mb-2 font-medium text-slate-700">Bottom bar</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-slate-700">Copyright</label>
                        <input type="text" value={config.footer?.copyright ?? ''} onChange={(e) => setFooter('copyright', e.target.value)} className="input mt-1" placeholder="© 2024 School Name" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-2 font-medium text-slate-700">Social links</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Facebook</label>
                        <input type="url" value={config.footer?.facebook ?? ''} onChange={(e) => setFooter('facebook', e.target.value)} className="input mt-1" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">YouTube</label>
                        <input type="url" value={config.footer?.youtube ?? ''} onChange={(e) => setFooter('youtube', e.target.value)} className="input mt-1" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Twitter</label>
                        <input type="url" value={config.footer?.twitter ?? ''} onChange={(e) => setFooter('twitter', e.target.value)} className="input mt-1" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Instagram</label>
                        <input type="url" value={config.footer?.instagram ?? ''} onChange={(e) => setFooter('instagram', e.target.value)} className="input mt-1" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">LinkedIn</label>
                        <input type="url" value={config.footer?.linkedin ?? ''} onChange={(e) => setFooter('linkedin', e.target.value)} className="input mt-1" />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'seo' && (
              <>
                <h3 className="text-lg font-semibold text-slate-800">SEO</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Meta title</label>
                    <input type="text" value={config.seo?.metaTitle ?? ''} onChange={(e) => setSeo('metaTitle', e.target.value)} className="input mt-1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Meta description</label>
                    <textarea value={config.seo?.metaDescription ?? ''} onChange={(e) => setSeo('metaDescription', e.target.value)} className="input mt-1 min-h-[80px]" />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'notices' && (
              <>
                <h3 className="text-lg font-semibold text-slate-800">Notices on website</h3>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="noticesEnabled" checked={config.notices?.enabled !== false} onChange={(e) => setNotices('enabled', e.target.checked)} />
                  <label htmlFor="noticesEnabled" className="text-sm font-medium text-slate-700">Show latest notices on landing page</label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Max notices to show</label>
                    <input type="number" min={1} max={20} value={config.notices?.maxItems ?? 5} onChange={(e) => setNotices('maxItems', parseInt(e.target.value, 10) || 5)} className="input mt-1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Section title (English)</label>
                    <input type="text" value={config.notices?.sectionTitle ?? ''} onChange={(e) => setNotices('sectionTitle', e.target.value)} className="input mt-1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Section title (Bangla)</label>
                    <input type="text" value={config.notices?.sectionTitle_bn ?? ''} onChange={(e) => setNotices('sectionTitle_bn', e.target.value)} className="input mt-1" />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="order-first min-w-0 xl:order-none xl:sticky xl:top-24">
          <div className="card border-2 border-primary-200 bg-primary-50/30">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary-800">
              <Eye className="h-4 w-4 shrink-0" /> Live preview
            </div>
            <p className="mb-3 text-xs text-slate-600">Changes update here. Click &quot;Save & publish&quot; to update the public site.</p>
            <div className="max-h-[50vh] overflow-y-auto overflow-x-hidden rounded-lg border border-slate-200 bg-white shadow-inner sm:max-h-[60vh] xl:max-h-[70vh]">
              <LandingPreview
                config={config as LandingConfigPreview}
                locale={locale}
                notices={previewNotices}
              />
            </div>
          </div>
        </div>
      </div>

      {updateMutation.isSuccess && (
        <p className="mt-4 text-sm text-emerald-600">Saved successfully.</p>
      )}
      {updateMutation.isError && (
        <p className="mt-4 text-sm text-red-600">Failed to save. Try again.</p>
      )}
    </div>
  );
}
