'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, useInView, useScroll, useTransform } from 'framer-motion';
import {
  GraduationCap, Shield, Users, BookOpen, Mail, Phone, MapPin,
  Megaphone, RefreshCw, Send, ChevronRight, Clock, Calendar,
  Award, ArrowRight, Menu, X, ChevronUp, Star, Target, Heart,
  Globe, FileText, CheckCircle2, ChevronLeft, Play, Quote, Camera,
  Sparkles, Trophy, Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';

/* ═══════════════ CONSTANTS ═══════════════ */

const LANDING_API = '/api/v1';
const LANDING_REFRESH_CHANNEL = 'landing-page-refresh';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  GraduationCap, Shield, Users, BookOpen, Megaphone, Award, Star, Target,
  Heart, Globe, Trophy, Lightbulb, Play, Camera, Sparkles, CheckCircle2,
};

/* ═══════════════ TYPES ═══════════════ */

type NavLink = { label?: string; label_bn?: string; href?: string };
type HeroSlide = { imageUrl?: string; title?: string; title_bn?: string; subtitle?: string; subtitle_bn?: string; overlayOpacity?: number };
type StatItem = { icon?: string; value?: number; suffix?: string; label?: string; label_bn?: string };
type GalleryImage = { url?: string; caption?: string; caption_bn?: string };
type Testimonial = { name?: string; name_bn?: string; role?: string; role_bn?: string; text?: string; text_bn?: string; imageUrl?: string; rating?: number };

type LandingData = {
  institution_id?: number;
  config: {
    site?: { logoUrl?: string; schoolName?: string; schoolName_bn?: string; bannerImageUrl?: string };
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
    notices?: { enabled?: boolean; maxItems?: number; sectionTitle?: string; sectionTitle_bn?: string };
  };
  notices?: Array<{ id: number; title: string; title_bn?: string | null; body?: string | null; published_at?: string }>;
};

const DEFAULT_LANDING_DATA: LandingData = {
  config: {
    site: { logoUrl: '', schoolName: 'Our School', schoolName_bn: 'আমাদের স্কুল', bannerImageUrl: '' },
    header: { topBarEnabled: true, topBarLeft: 'Welcome to Our School', topBarLeft_bn: 'আমাদের স্কুলে স্বাগতম', topBarRight: 'Mon-Fri 8AM-4PM', topBarRight_bn: 'সোম-শুক্র সকাল ৮টা-বিকাল ৪টা' },
    nav: { links: [{ label: 'Home', label_bn: 'হোম', href: '#' }, { label: 'About', label_bn: 'আমাদের সম্পর্কে', href: '#about' }, { label: 'Gallery', label_bn: 'গ্যালারি', href: '#gallery' }, { label: 'News & Events', label_bn: 'খবর ও ইভেন্ট', href: '#news' }, { label: 'Contact', label_bn: 'যোগাযোগ', href: '#contact' }] },
    hero: { title: 'Welcome to Our School', title_bn: 'আমাদের স্কুলে স্বাগতম', subtitle: 'Quality education for a brighter future.', subtitle_bn: 'উজ্জ্বল ভবিষ্যতের জন্য মানসম্মত শিক্ষা।', ctaText: 'Login to Portal', ctaLink: '/login', imageUrl: '', background: 'gradient' },
    heroSlides: { enabled: true, autoPlayInterval: 5000, slides: [
      { imageUrl: '', title: 'Welcome to Our School', title_bn: 'আমাদের স্কুলে স্বাগতম', subtitle: 'Quality education for a brighter future.', subtitle_bn: 'উজ্জ্বল ভবিষ্যতের জন্য মানসম্মত শিক্ষা।', overlayOpacity: 70 },
      { imageUrl: '', title: 'Excellence in Education', title_bn: 'শিক্ষায় শ্রেষ্ঠত্ব', subtitle: 'Building leaders of tomorrow.', subtitle_bn: 'আগামীর নেতা তৈরি করা।', overlayOpacity: 70 },
    ] },
    stats: { enabled: true, items: [
      { icon: 'Users', value: 500, suffix: '+', label: 'Students', label_bn: 'শিক্ষার্থী' },
      { icon: 'GraduationCap', value: 50, suffix: '+', label: 'Teachers', label_bn: 'শিক্ষক' },
      { icon: 'Award', value: 95, suffix: '%', label: 'Pass Rate', label_bn: 'পাসের হার' },
      { icon: 'Star', value: 20, suffix: '+', label: 'Years', label_bn: 'বছর অভিজ্ঞতা' },
    ] },
    about: { heading: 'About Our School', heading_bn: 'আমাদের স্কুল সম্পর্কে', body: 'We are committed to providing a nurturing environment where every student can excel.', body_bn: 'আমরা এমন একটি পরিবেশ দেওয়ার জন্য প্রতিশ্রুতিবদ্ধ যেখানে প্রতিটি শিক্ষার্থী উৎকর্ষ অর্জন করতে পারে।', imageUrl: '' },
    aboutGallery: { enabled: true, images: [] },
    academic: { enabled: true, heading: 'Academic Information', heading_bn: 'একাডেমিক তথ্য', body: '', body_bn: '', highlights: [] },
    admission: { enabled: true, heading: 'Admission Information', heading_bn: 'ভর্তি তথ্য', body: '', body_bn: '', requirements: '', requirements_bn: '', contactInfo: '', contactInfo_bn: '' },
    features: [
      { title: 'Quality Education', title_bn: 'মানসম্মত শিক্ষা', description: 'Experienced teachers and modern curriculum.', icon: 'GraduationCap' },
      { title: 'Safe Environment', title_bn: 'নিরাপদ পরিবেশ', description: 'Secure and supportive campus.', icon: 'Shield' },
      { title: 'Parent Portal', title_bn: 'অভিভাবক পোর্টাল', description: 'Track attendance, fees, and results online.', icon: 'Users' },
    ],
    gallery: { enabled: true, heading: 'Our Campus Gallery', heading_bn: 'আমাদের ক্যাম্পাস গ্যালারি', subtitle: 'Explore our vibrant campus life', subtitle_bn: 'আমাদের প্রাণবন্ত ক্যাম্পাস জীবন দেখুন', images: [] },
    testimonials: { enabled: true, heading: 'What People Say', heading_bn: 'মানুষ কি বলে', items: [] },
    contact: { email: 'info@school.edu.bd', phone: '+880 1XXX-XXXXXX', address: 'School Address, City, Bangladesh', address_bn: 'স্কুলের ঠিকানা, শহর, বাংলাদেশ', mapEmbed: '', showSection: true, showContactForm: true },
    footer: {
      aboutTitle: 'About Us', aboutTitle_bn: 'আমাদের সম্পর্কে', aboutText: 'Empowering students with quality education since day one.', aboutText_bn: 'প্রথম দিন থেকেই মানসম্মত শিক্ষা দিয়ে শিক্ষার্থীদের ক্ষমতায়ন করা।',
      linksTitle: 'Quick Links', linksTitle_bn: 'দ্রুত লিঙ্ক',
      quickLinks: [{ label: 'About', label_bn: 'আমাদের সম্পর্কে', href: '#about' }, { label: 'Notices', label_bn: 'নোটিশ', href: '#notices' }, { label: 'Contact', label_bn: 'যোগাযোগ', href: '#contact' }, { label: 'Login', label_bn: 'লগইন', href: '/login' }],
      contactTitle: 'Contact Us', contactTitle_bn: 'যোগাযোগ', text: '', copyright: '© 2024 School Name. All rights reserved.',
      facebook: '', youtube: '', twitter: '', instagram: '', linkedin: '',
    },
    notices: { enabled: true, maxItems: 5, sectionTitle: 'News & Events', sectionTitle_bn: 'খবর ও ইভেন্ট' },
  },
  notices: [],
};

/* ═══════════════ ANIMATION VARIANTS ═══════════════ */

const ease = 'circOut' as const;

const fadeInUp = { hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } };
const fadeInLeft = { hidden: { opacity: 0, x: -60 }, visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease } } };
const fadeInRight = { hidden: { opacity: 0, x: 60 }, visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease } } };
const scaleIn = { hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease } } };
const staggerContainer = { hidden: {}, visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } };
const slideVariant = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.8, ease } },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0, transition: { duration: 0.6, ease } }),
};

/* ═══════════════ HOOKS ═══════════════ */

function useLandingData() {
  return useQuery({
    queryKey: ['landing-page'],
    queryFn: async (): Promise<LandingData> => {
      const url = `${LANDING_API}/landing-page?t=${Date.now()}`;
      try {
        const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store', credentials: 'same-origin' });
        const text = await res.text();
        let json: { success?: boolean; data?: LandingData } = {};
        try { json = JSON.parse(text); } catch { throw new Error('Invalid response'); }
        if (!res.ok) { if (res.status === 404) return DEFAULT_LANDING_DATA; throw new Error('Request failed'); }
        const data = json.data ?? { config: {}, notices: [] };
        return { institution_id: data.institution_id ?? 1, ...data };
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('fetch') || msg.includes('Network')) throw new Error('Cannot reach server.');
        throw err;
      }
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });
}

function useLandingRefreshBroadcast() {
  const qc = useQueryClient();
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const ch = new BroadcastChannel(LANDING_REFRESH_CHANNEL);
      ch.onmessage = () => qc.invalidateQueries({ queryKey: ['landing-page'] });
      return () => ch.close();
    } catch {}
  }, [qc]);
}

/* ═══════════════ REUSABLE COMPONENTS ═══════════════ */

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true, amount: 0.3 });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / 50;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 25);
    return () => clearInterval(timer);
  }, [inView, target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

function MotionSection({ children, className = '', id, variant = fadeInUp }: { children: React.ReactNode; className?: string; id?: string; variant?: typeof fadeInUp }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true, amount: 0.15 });
  return (
    <motion.section ref={ref} id={id} className={className} initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={variant}>
      {children}
    </motion.section>
  );
}

function ParallaxImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref as React.RefObject<HTMLElement>, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  return (
    <div ref={ref} className={`overflow-hidden ${className ?? ''}`}>
      <motion.img src={src} alt={alt} className="w-full h-[120%] object-cover" style={{ y }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
    </div>
  );
}

/* ─── Hero Slideshow ─── */
function HeroSlideshow({ slides, autoPlay, hero, locale, ctaLink }: {
  slides: HeroSlide[]; autoPlay: number; hero: LandingData['config']['hero']; locale: string; ctaLink: string;
}) {
  const [[current, direction], setCurrent] = useState([0, 0]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const safeSlides = slides.length > 0 ? slides : [{ imageUrl: '', title: hero?.title, title_bn: hero?.title_bn, subtitle: hero?.subtitle, subtitle_bn: hero?.subtitle_bn, overlayOpacity: 70 }];

  const go = useCallback((next: number, dir: number) => {
    setCurrent([((next % safeSlides.length) + safeSlides.length) % safeSlides.length, dir]);
  }, [safeSlides.length]);

  useEffect(() => {
    if (safeSlides.length <= 1) return;
    timerRef.current = setInterval(() => go(current + 1, 1), autoPlay);
    return () => clearInterval(timerRef.current);
  }, [current, autoPlay, go, safeSlides.length]);

  const slide = safeSlides[current];
  const title = locale === 'bn' && slide.title_bn ? slide.title_bn : (slide.title || hero?.title || 'Welcome');
  const subtitle = locale === 'bn' && slide.subtitle_bn ? slide.subtitle_bn : (slide.subtitle || hero?.subtitle || '');
  const opacity = (slide.overlayOpacity ?? 70) / 100;

  return (
    <section className="relative overflow-hidden min-h-[560px] sm:min-h-[640px] lg:min-h-[720px] flex items-center">
      {/* Slide backgrounds */}
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={current}
          custom={direction}
          variants={slideVariant}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0"
        >
          {slide.imageUrl ? (
            <>
              <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, rgba(15,23,42,${opacity}) 0%, rgba(88,28,135,${opacity * 0.9}) 50%, rgba(192,38,211,${opacity * 0.7}) 100%)` }} />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-purple-900 to-fuchsia-900">
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(168,85,247,0.5) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(236,72,153,0.4) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(59,130,246,0.3) 0%, transparent 60%)' }} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Animated particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => {
          const colors = ['bg-fuchsia-400/10', 'bg-purple-400/10', 'bg-blue-400/10', 'bg-amber-400/10', 'bg-emerald-400/10', 'bg-rose-400/10', 'bg-cyan-400/10', 'bg-violet-400/10'];
          return (
          <motion.div
            key={i}
            className={`absolute rounded-full ${colors[i % colors.length]}`}
            style={{ width: 60 + i * 35, height: 60 + i * 35, left: `${8 + i * 12}%`, top: `${15 + (i % 4) * 20}%` }}
            animate={{ y: [0, -30, 0], x: [0, 15, 0], scale: [1, 1.15, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 8 + i * 2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
          />
        )})}
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-28 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            {/* Badge */}
            <motion.div
              className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-1.5 mb-6"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-fuchsia-200">{locale === 'bn' ? 'ভর্তি চলছে' : 'Admissions Open'}</span>
            </motion.div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight">
              {title}
            </h1>
            <p className="mt-6 max-w-xl text-lg sm:text-xl text-blue-100/90 leading-relaxed">{subtitle}</p>

            <motion.div
              className="mt-10 flex flex-wrap items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <Link href={ctaLink} className="group inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-white to-fuchsia-50 px-7 py-3.5 text-base font-bold text-purple-700 shadow-xl shadow-purple-900/30 hover:shadow-2xl hover:-translate-y-0.5 transition-all">
                {hero?.ctaText || 'Login to Portal'}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1 text-fuchsia-600" />
              </Link>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Slide indicators */}
        {safeSlides.length > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
            <button onClick={() => go(current - 1, -1)} className="rounded-full bg-white/10 backdrop-blur-sm border border-white/20 p-2 text-white hover:bg-white/20 transition-all">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex gap-2">
              {safeSlides.map((_, i) => (
                <button key={i} onClick={() => go(i, i > current ? 1 : -1)} className={`h-2.5 rounded-full transition-all duration-500 ${i === current ? 'w-8 bg-white' : 'w-2.5 bg-white/40 hover:bg-white/60'}`} />
              ))}
            </div>
            <button onClick={() => go(current + 1, 1)} className="rounded-full bg-white/10 backdrop-blur-sm border border-white/20 p-2 text-white hover:bg-white/20 transition-all">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <svg viewBox="0 0 1440 100" fill="none" className="w-full h-auto"><path d="M0,60 C360,100 720,20 1080,60 C1260,80 1380,70 1440,60 L1440,100 L0,100 Z" fill="white" /></svg>
      </div>
    </section>
  );
}

/* ─── Gallery Slideshow ─── */
function GallerySection({ gallery, locale }: { gallery: NonNullable<LandingData['config']['gallery']>; locale: string }) {
  const images = gallery.images ?? [];
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  if (images.length === 0) return null;

  const heading = locale === 'bn' && gallery.heading_bn ? gallery.heading_bn : (gallery.heading || 'Gallery');
  const subtitle = locale === 'bn' && gallery.subtitle_bn ? gallery.subtitle_bn : (gallery.subtitle || '');

  return (
    <MotionSection id="gallery" className="scroll-mt-20 py-20 sm:py-28 bg-gradient-to-b from-white via-cyan-50/30 to-white relative overflow-hidden" variant={fadeInUp}>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-tl from-teal-200/20 to-cyan-200/20 rounded-full blur-3xl" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div className="text-center max-w-2xl mx-auto mb-14" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-100 to-cyan-100 px-4 py-1.5 mb-4 border border-teal-200/50">
            <Camera className="h-4 w-4 text-teal-700" />
            <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">{locale === 'bn' ? 'গ্যালারি' : 'Gallery'}</span>
          </motion.div>
          <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-extrabold text-slate-900">{heading}</motion.h2>
          {subtitle && <motion.p variants={fadeInUp} className="mt-4 text-lg text-slate-600">{subtitle}</motion.p>}
        </motion.div>

        {/* Masonry-like grid */}
        <motion.div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          {images.map((img, i) => (
            <motion.div
              key={i}
              variants={scaleIn}
              className="break-inside-avoid cursor-pointer group relative rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300"
              onClick={() => setSelectedIdx(i)}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <img src={img.url} alt={img.caption || ''} className="w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                {img.caption && <p className="text-white text-sm font-medium">{locale === 'bn' && img.caption_bn ? img.caption_bn : img.caption}</p>}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedIdx !== null && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedIdx(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative max-w-5xl max-h-[85vh] mx-4"
              onClick={e => e.stopPropagation()}
            >
              <img src={images[selectedIdx]?.url} alt="" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
              <button onClick={() => setSelectedIdx(null)} className="absolute -top-3 -right-3 rounded-full bg-white p-2 shadow-lg text-gray-800 hover:bg-gray-100"><X className="h-5 w-5" /></button>
              {images.length > 1 && (
                <>
                  <button onClick={e => { e.stopPropagation(); setSelectedIdx((selectedIdx - 1 + images.length) % images.length); }} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg hover:bg-white"><ChevronLeft className="h-5 w-5" /></button>
                  <button onClick={e => { e.stopPropagation(); setSelectedIdx((selectedIdx + 1) % images.length); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg hover:bg-white"><ChevronRight className="h-5 w-5" /></button>
                </>
              )}
              {images[selectedIdx]?.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 rounded-b-lg">
                  <p className="text-white text-center">{locale === 'bn' && images[selectedIdx]?.caption_bn ? images[selectedIdx].caption_bn : images[selectedIdx].caption}</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionSection>
  );
}

/* ─── Testimonials Slideshow ─── */
function TestimonialsSection({ testimonials, locale }: { testimonials: NonNullable<LandingData['config']['testimonials']>; locale: string }) {
  const items = testimonials.items ?? [];
  const [[current, dir], setCurrent] = useState([0, 0]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const go = useCallback((next: number, d: number) => {
    if (items.length === 0) return;
    setCurrent([((next % items.length) + items.length) % items.length, d]);
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    timerRef.current = setInterval(() => go(current + 1, 1), 6000);
    return () => clearInterval(timerRef.current);
  }, [current, go, items.length]);

  if (items.length === 0) return null;
  const heading = locale === 'bn' && testimonials.heading_bn ? testimonials.heading_bn : (testimonials.heading || 'Testimonials');
  const t = items[current];

  return (
    <MotionSection className="py-20 sm:py-28 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-rose-50 relative overflow-hidden" variant={fadeInUp}>
      {/* Decorative */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-fuchsia-200/30 to-purple-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-violet-200/30 to-indigo-200/20 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-amber-200/15 to-rose-200/15 rounded-full blur-3xl" />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 relative z-10">
        <motion.div className="text-center mb-12" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-200/80 to-fuchsia-200/80 px-4 py-1.5 mb-4 border border-purple-300/50">
            <Quote className="h-4 w-4 text-purple-700" />
            <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">{locale === 'bn' ? 'মতামত' : 'Testimonials'}</span>
          </motion.div>
          <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-extrabold text-slate-900">{heading}</motion.h2>
        </motion.div>

        <div className="relative min-h-[280px]">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={current}
              initial={{ opacity: 0, x: dir > 0 ? 100 : -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir > 0 ? -100 : 100 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-3xl bg-white/90 backdrop-blur-md p-8 sm:p-10 shadow-xl shadow-purple-200/40 border border-purple-100/50 text-center"
            >
              <Quote className="mx-auto h-10 w-10 text-fuchsia-300 mb-6" />
              <p className="text-lg sm:text-xl text-slate-700 leading-relaxed italic max-w-2xl mx-auto">
                &ldquo;{locale === 'bn' && t.text_bn ? t.text_bn : (t.text || '')}&rdquo;
              </p>
              <div className="mt-6 flex flex-col items-center gap-3">
                {t.imageUrl && (
                  <img src={t.imageUrl} alt="" className="h-14 w-14 rounded-full object-cover ring-4 ring-purple-200" />
                )}
                <div>
                  <p className="font-bold text-slate-800">{locale === 'bn' && t.name_bn ? t.name_bn : (t.name || '')}</p>
                  <p className="text-sm text-slate-500">{locale === 'bn' && t.role_bn ? t.role_bn : (t.role || '')}</p>
                </div>
                {(t.rating ?? 0) > 0 && (
                  <div className="flex gap-1">
                    {[...Array(t.rating ?? 5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {items.length > 1 && (
          <div className="flex justify-center gap-3 mt-8">
            <button onClick={() => go(current - 1, -1)} className="rounded-full bg-white p-2.5 shadow-md text-purple-600 hover:bg-purple-50 hover:text-fuchsia-600 hover:shadow-lg hover:shadow-purple-100/50 transition-all"><ChevronLeft className="h-5 w-5" /></button>
            <div className="flex items-center gap-2">
              {items.map((_, i) => (
                <button key={i} onClick={() => go(i, i > current ? 1 : -1)} className={`h-2.5 rounded-full transition-all duration-500 ${i === current ? 'w-8 bg-gradient-to-r from-purple-600 to-fuchsia-600' : 'w-2.5 bg-purple-300 hover:bg-purple-400'}`} />
              ))}
            </div>
            <button onClick={() => go(current + 1, 1)} className="rounded-full bg-white p-2.5 shadow-md text-purple-600 hover:bg-purple-50 hover:text-fuchsia-600 hover:shadow-lg hover:shadow-purple-100/50 transition-all"><ChevronRight className="h-5 w-5" /></button>
          </div>
        )}
      </div>
    </MotionSection>
  );
}

/* ═══════════════ MAIN COMPONENT ═══════════════ */

export default function LandingPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  useLandingRefreshBroadcast();
  const { data, isLoading, error, refetch, isFetching } = useLandingData();

  const dataOrDefault = (data ?? (error ? DEFAULT_LANDING_DATA : null)) ?? DEFAULT_LANDING_DATA;
  const usedFallback = !isLoading && (!!error || !data);

  const { config, notices = [], institution_id = 1 } = dataOrDefault;
  const site = config.site ?? {};
  const headerConfig = config.header ?? {};
  const navConfig = config.nav ?? {};
  const hero = config.hero ?? {};
  const heroSlides = config.heroSlides ?? {};
  const statsConfig = config.stats ?? {};
  const about = config.about ?? {};
  const aboutGallery = config.aboutGallery ?? {};
  const academic = config.academic ?? {};
  const admission = config.admission ?? {};
  const features = config.features ?? [];
  const galleryConfig = config.gallery ?? {};
  const testimonialsConfig = config.testimonials ?? {};
  const contact = config.contact ?? {};
  const footer = config.footer ?? {};
  const noticesConfig = config.notices ?? {};

  const showNotices = noticesConfig.enabled !== false && notices.length > 0;
  const noticeTitle = locale === 'bn' ? (noticesConfig.sectionTitle_bn ?? 'সর্বশেষ নোটিশ') : (noticesConfig.sectionTitle ?? 'Latest Notices');
  const schoolName = (locale === 'bn' && site.schoolName_bn) ? site.schoolName_bn : (site.schoolName || 'School');
  const showTopBar = headerConfig.topBarEnabled !== false;
  const topBarLeft = locale === 'bn' ? (headerConfig.topBarLeft_bn ?? headerConfig.topBarLeft) : (headerConfig.topBarLeft ?? '');
  const topBarRight = locale === 'bn' ? (headerConfig.topBarRight_bn ?? headerConfig.topBarRight) : (headerConfig.topBarRight ?? '');
  const navLinks = navConfig.links?.length ? navConfig.links : DEFAULT_LANDING_DATA.config.nav!.links!;
  const quickLinks = footer.quickLinks ?? [];
  const hasSocialLinks = !!(footer.facebook || footer.youtube || footer.twitter || footer.instagram || footer.linkedin);
  const showContactForm = contact.showContactForm !== false && contact.email;
  const ctaLink = hero.ctaLink ? (hero.ctaLink.startsWith('http') ? hero.ctaLink : `/${locale}${hero.ctaLink === '/login' ? '/login' : hero.ctaLink}`) : `/${locale}/login`;

  const statsItems = statsConfig.items ?? DEFAULT_LANDING_DATA.config.stats!.items!;
  const showStats = statsConfig.enabled !== false;
  const showGallery = galleryConfig.enabled !== false && (galleryConfig.images ?? []).length > 0;
  const showTestimonials = testimonialsConfig.enabled !== false && (testimonialsConfig.items ?? []).length > 0;
  const useSlideshow = heroSlides.enabled !== false && (heroSlides.slides ?? []).length > 0;

  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => { setScrolled(window.scrollY > 20); setShowScrollTop(window.scrollY > 500); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contactSubmitting) return;
    setContactSubmitting(true);
    try {
      const res = await fetch(`${LANDING_API}/contact`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ institution_id, name: contactForm.name.trim(), email: contactForm.email.trim(), subject: contactForm.subject.trim(), message: contactForm.message.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(locale === 'bn' ? 'বার্তা পাঠানো হয়েছে।' : 'Your message has been sent.');
        setContactForm({ name: '', email: '', subject: '', message: '' });
      } else { toast.error(json.message || 'Failed to send.'); }
    } catch { toast.error('Failed to send.'); }
    finally { setContactSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Fallback banner */}
      {usedFallback && (
        <div className="flex flex-wrap items-center justify-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-center text-sm text-amber-700">
          <span>Showing default content. Start the backend and</span>
          <button type="button" onClick={() => refetch()} disabled={isFetching} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition">
            <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      )}

      {/* ════════════ TOP BAR ════════════ */}
      {showTopBar && (topBarLeft || topBarRight) && (
        <motion.div
          className="bg-gradient-to-r from-indigo-900 via-purple-900 to-fuchsia-900 text-indigo-200"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs sm:text-sm sm:px-6">
            <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-fuchsia-400" /><span>{topBarLeft}</span></div>
            <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-amber-400" /><span>{topBarRight}</span></div>
          </div>
        </motion.div>
      )}

      {/* ════════════ HEADER ════════════ */}
      <motion.header
        className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-xl shadow-lg shadow-slate-200/50' : 'bg-white/80 backdrop-blur-sm'}`}
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4 px-4 sm:px-6 h-16 lg:h-[72px]">
          <Link href={`/${locale}`} className="flex shrink-0 items-center gap-3 group">
            {site.logoUrl ? (
              <motion.img src={site.logoUrl} alt="" className="h-10 w-auto max-h-12 object-contain" whileHover={{ scale: 1.05 }} />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-600 flex items-center justify-center shadow-md shadow-purple-500/30">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
            )}
            <span className="hidden sm:block text-lg font-bold bg-gradient-to-r from-indigo-700 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">{schoolName}</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link, i) => {
              const href = link.href?.startsWith('http') ? link.href : (link.href?.startsWith('/') ? `/${locale}${link.href}` : link.href ?? '#');
              const label = locale === 'bn' && link.label_bn ? link.label_bn : (link.label ?? '');
              return (
                <motion.a key={i} href={href} className="relative px-3 py-2 text-sm font-medium text-slate-600 rounded-lg hover:text-purple-600 hover:bg-purple-50/80 transition-all group"
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  {label}
                  <span className="absolute bottom-0 left-1/2 h-0.5 w-0 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-full transition-all duration-300 group-hover:w-3/4 group-hover:left-[12.5%]" />
                </motion.a>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => refetch()} disabled={isFetching} className="rounded-lg p-2 text-slate-400 hover:bg-purple-50 hover:text-purple-600 transition" title="Refresh">
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
            <Link href={`/${locale}/login`} className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-500/30 hover:shadow-lg hover:shadow-purple-500/40 hover:-translate-y-0.5 transition-all">
              {locale === 'bn' ? 'লগইন' : 'Login'}<ArrowRight className="h-4 w-4" />
            </Link>
            <button type="button" className="lg:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              className="lg:hidden border-t border-slate-100 bg-white/98 backdrop-blur-xl px-4 pb-4"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-1 pt-2">
                {navLinks.map((link, i) => {
                  const href = link.href?.startsWith('http') ? link.href : (link.href?.startsWith('/') ? `/${locale}${link.href}` : link.href ?? '#');
                  const label = locale === 'bn' && link.label_bn ? link.label_bn : (link.label ?? '');
                  return <a key={i} href={href} onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition">{label}</a>;
                })}
                <Link href={`/${locale}/login`} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white mt-2">
                  {locale === 'bn' ? 'লগইন' : 'Login'} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ════════════ HERO (SLIDESHOW) ════════════ */}
      {useSlideshow ? (
        <HeroSlideshow slides={heroSlides.slides ?? []} autoPlay={heroSlides.autoPlayInterval ?? 5000} hero={hero} locale={locale} ctaLink={ctaLink} />
      ) : (
        /* Fallback single hero */
        <section className="relative overflow-hidden min-h-[560px] sm:min-h-[640px] flex items-center">
          <div className="absolute inset-0">
            {(site.bannerImageUrl || hero.imageUrl) ? (
              <>
                <img src={site.bannerImageUrl || hero.imageUrl} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-purple-900/80 to-fuchsia-900/70" />
              </>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-900 via-purple-900 to-fuchsia-900" />
            )}
          </div>
          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-28 w-full">
            <motion.div className="max-w-3xl" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1]">
                {locale === 'bn' && hero.title_bn ? hero.title_bn : (hero.title || 'Welcome')}
              </h1>
              <p className="mt-6 max-w-xl text-lg sm:text-xl text-blue-100/90">{locale === 'bn' && hero.subtitle_bn ? hero.subtitle_bn : (hero.subtitle || '')}</p>
              <div className="mt-10">
                <Link href={ctaLink} className="group inline-flex items-center gap-2.5 rounded-2xl bg-white px-7 py-3.5 text-base font-bold text-blue-700 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all">
                  {hero.ctaText || 'Login to Portal'}<ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </motion.div>
          </div>
          <div className="absolute bottom-0 left-0 right-0"><svg viewBox="0 0 1440 100" fill="none" className="w-full h-auto"><path d="M0,60 C360,100 720,20 1080,60 C1260,80 1380,70 1440,60 L1440,100 L0,100 Z" fill="white" /></svg></div>
        </section>
      )}

      {/* ════════════ STATS BAR ════════════ */}
      {showStats && (
        <MotionSection className="relative -mt-6 z-20 scroll-mt-20" variant={fadeInUp}>
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 p-6 sm:p-8 shadow-2xl shadow-purple-500/25 border border-purple-400/20"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {statsItems.map((stat, i) => {
                const SIcon = iconMap[stat.icon ?? 'Users'] ?? Users;
                const colors = ['text-amber-300 bg-white/15', 'text-emerald-300 bg-white/15', 'text-cyan-300 bg-white/15', 'text-rose-300 bg-white/15', 'text-fuchsia-300 bg-white/15', 'text-violet-300 bg-white/15'];
                return (
                  <motion.div key={i} variants={scaleIn} className="flex items-center gap-3 sm:gap-4">
                    <div className={`shrink-0 rounded-xl p-2.5 backdrop-blur-sm ${colors[i % colors.length]}`}><SIcon className="h-5 w-5 sm:h-6 sm:w-6" /></div>
                    <div>
                      <p className="text-xl sm:text-2xl font-extrabold text-white"><AnimatedCounter target={stat.value ?? 0} suffix={stat.suffix ?? ''} /></p>
                      <p className="text-xs sm:text-sm text-purple-100/80">{locale === 'bn' && stat.label_bn ? stat.label_bn : (stat.label ?? '')}</p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </MotionSection>
      )}

      {/* ════════════ ABOUT ════════════ */}
      <MotionSection id="about" className="scroll-mt-20 py-20 sm:py-28 relative overflow-hidden" variant={fadeInUp}>
        {/* Decorative background blobs */}
        <div className="absolute top-20 -left-40 w-80 h-80 bg-gradient-to-br from-purple-200/40 to-fuchsia-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-40 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-cyan-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-amber-100/20 to-rose-100/20 rounded-full blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <motion.div variants={fadeInLeft} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-100 to-fuchsia-100 px-4 py-1.5 mb-4 border border-purple-200/50">
                <Globe className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">{locale === 'bn' ? 'আমাদের সম্পর্কে' : 'About Us'}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-slate-900 via-purple-900 to-fuchsia-900 bg-clip-text text-transparent leading-tight">{locale === 'bn' && about.heading_bn ? about.heading_bn : (about.heading || 'About Our School')}</h2>
              <p className="mt-5 text-lg text-slate-600 leading-relaxed">{locale === 'bn' && about.body_bn ? about.body_bn : (about.body || '')}</p>
              <div className="mt-8 grid grid-cols-2 gap-4">
                {[{ icon: Target, label: locale === 'bn' ? 'দূরদৃষ্টি' : 'Our Vision', color: 'text-indigo-600 bg-gradient-to-br from-indigo-50 to-purple-50' }, { icon: Heart, label: locale === 'bn' ? 'মূল্যবোধ' : 'Our Values', color: 'text-rose-600 bg-gradient-to-br from-rose-50 to-pink-50' }].map((item, i) => (
                  <motion.div key={i} className="flex items-center gap-3 rounded-xl border border-purple-200/50 bg-white/80 backdrop-blur-sm p-3 hover:border-purple-300 hover:shadow-md hover:shadow-purple-100/50 transition-all" whileHover={{ scale: 1.03 }}>
                    <div className={`rounded-lg p-2 ${item.color}`}><item.icon className="h-4 w-4" /></div>
                    <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div className="relative" variants={fadeInRight} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              {about.imageUrl ? (
                <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-slate-300/50">
                  <ParallaxImage src={about.imageUrl} alt="About" className="h-80 sm:h-96 rounded-2xl" />
                  <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-2xl" />
                </div>
              ) : (
                <div className="relative rounded-2xl bg-gradient-to-br from-purple-100 via-fuchsia-50 to-pink-100 h-80 sm:h-96 flex items-center justify-center overflow-hidden">
                  <GraduationCap className="h-24 w-24 text-purple-300/50" />
                </div>
              )}

              {/* About gallery thumbnails */}
              {aboutGallery.enabled !== false && (aboutGallery.images ?? []).length > 0 && (
                <div className="absolute -bottom-6 left-4 right-4 flex gap-2">
                  {(aboutGallery.images ?? []).slice(0, 4).map((imgUrl, i) => (
                    <motion.div key={i} className="flex-1 h-16 rounded-lg overflow-hidden shadow-md border-2 border-white" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}>
                      <img src={imgUrl as string} alt="" className="w-full h-full object-cover" />
                    </motion.div>
                  ))}
                </div>
              )}

              <motion.div
                className="absolute -bottom-4 -left-4 sm:-bottom-6 sm:-left-6 bg-white rounded-xl p-4 shadow-lg border border-slate-100"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-emerald-100 p-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
                  <div><p className="text-sm font-bold text-slate-800">{locale === 'bn' ? 'স্বীকৃত' : 'Recognized'}</p><p className="text-xs text-slate-500">{locale === 'bn' ? 'সরকার অনুমোদিত' : 'Govt. Approved'}</p></div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </MotionSection>

      {/* ════════════ ACADEMIC INFO ════════════ */}
      {academic.enabled !== false && (
        <MotionSection id="academic" className="scroll-mt-20 py-20 sm:py-28 bg-gradient-to-b from-violet-50 via-indigo-50/50 to-white relative overflow-hidden" variant={fadeInUp}>
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-violet-200/30 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-indigo-200/30 to-transparent rounded-full blur-3xl" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <motion.div className="text-center max-w-2xl mx-auto mb-12" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-100 to-violet-100 px-4 py-1.5 mb-4 border border-indigo-200/50"><BookOpen className="h-4 w-4 text-indigo-600" /><span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">{locale === 'bn' ? 'একাডেমিক' : 'Academics'}</span></motion.div>
              <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-extrabold text-slate-900">{locale === 'bn' && academic.heading_bn ? academic.heading_bn : (academic.heading || 'Academic Information')}</motion.h2>
              {(academic.body || academic.body_bn) && <motion.p variants={fadeInUp} className="mt-4 text-lg text-slate-600">{locale === 'bn' && academic.body_bn ? academic.body_bn : academic.body}</motion.p>}
            </motion.div>
            {(academic.highlights ?? []).length > 0 && (
              <motion.div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                {(academic.highlights ?? []).map((h, i) => (
                  <motion.div key={i} variants={fadeInUp} className="group rounded-2xl border border-violet-200/50 bg-white/80 backdrop-blur-sm p-6 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-100/50 transition-all duration-300" whileHover={{ y: -6 }}>
                    <div className="h-1 w-12 rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 mb-4 group-hover:w-20 transition-all duration-300" />
                    <h3 className="text-lg font-bold text-slate-800">{locale === 'bn' && h.title_bn ? h.title_bn : (h.title ?? '')}</h3>
                    <p className="mt-2 text-slate-600">{h.desc ?? ''}</p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </MotionSection>
      )}

      {/* ════════════ ADMISSION ════════════ */}
      {admission.enabled !== false && (
        <MotionSection id="admission" className="scroll-mt-20 py-20 sm:py-28" variant={fadeInUp}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <motion.div
              className="rounded-3xl bg-gradient-to-br from-violet-600 via-purple-700 to-fuchsia-800 overflow-hidden relative"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
            >
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
              <div className="relative p-8 sm:p-12 lg:p-16">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm px-4 py-1.5 mb-5 border border-white/20"><FileText className="h-4 w-4 text-fuchsia-200" /><span className="text-xs font-semibold text-fuchsia-100 uppercase tracking-wider">{locale === 'bn' ? 'ভর্তি' : 'Admission'}</span></div>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-white">{locale === 'bn' && admission.heading_bn ? admission.heading_bn : (admission.heading || 'Admission')}</h2>
                  <p className="mt-4 text-lg text-purple-100/90">{locale === 'bn' && admission.body_bn ? admission.body_bn : (admission.body || '')}</p>
                  <div className="mt-8 space-y-6">
                    {(admission.requirements || admission.requirements_bn) && (
                      <motion.div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-6" whileHover={{ scale: 1.02 }}>
                        <h4 className="font-bold text-white flex items-center gap-2"><FileText className="h-4 w-4" /> {locale === 'bn' ? 'প্রয়োজনীয় নথি' : 'Required Documents'}</h4>
                        <p className="mt-2 text-blue-100">{locale === 'bn' && admission.requirements_bn ? admission.requirements_bn : admission.requirements}</p>
                      </motion.div>
                    )}
                    {(admission.contactInfo || admission.contactInfo_bn) && (
                      <motion.div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-6" whileHover={{ scale: 1.02 }}>
                        <h4 className="font-bold text-white flex items-center gap-2"><Phone className="h-4 w-4" /> {locale === 'bn' ? 'যোগাযোগ' : 'Contact'}</h4>
                        <p className="mt-2 text-blue-100">{locale === 'bn' && admission.contactInfo_bn ? admission.contactInfo_bn : admission.contactInfo}</p>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </MotionSection>
      )}

      {/* ════════════ FEATURES ════════════ */}
      {features.length > 0 && (
        <MotionSection className="py-20 sm:py-28 bg-gradient-to-b from-white via-amber-50/30 to-white relative overflow-hidden" variant={fadeInUp}>
          {/* Decorative */}
          <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-br from-amber-200/20 to-orange-200/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-72 h-72 bg-gradient-to-br from-emerald-200/20 to-teal-200/20 rounded-full blur-3xl" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <motion.div className="text-center max-w-2xl mx-auto mb-14" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 px-4 py-1.5 mb-4 border border-emerald-200/50"><Star className="h-4 w-4 text-emerald-600" /><span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">{locale === 'bn' ? 'সুবিধা' : 'Features'}</span></motion.div>
              <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-extrabold text-slate-900">{locale === 'bn' ? 'আমাদের সুবিধা' : 'Why Choose Us'}</motion.h2>
            </motion.div>
            <motion.div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 relative z-10" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              {features.map((f, i) => {
                const Icon = iconMap[f.icon ?? ''] ?? GraduationCap;
                const colors = ['from-blue-500 to-cyan-500', 'from-emerald-500 to-teal-500', 'from-purple-500 to-fuchsia-500', 'from-amber-500 to-orange-500', 'from-rose-500 to-pink-500', 'from-violet-500 to-indigo-500'];
                const borderColors = ['hover:border-blue-300', 'hover:border-emerald-300', 'hover:border-purple-300', 'hover:border-amber-300', 'hover:border-rose-300', 'hover:border-violet-300'];
                const shadowColors = ['hover:shadow-blue-100/50', 'hover:shadow-emerald-100/50', 'hover:shadow-purple-100/50', 'hover:shadow-amber-100/50', 'hover:shadow-rose-100/50', 'hover:shadow-violet-100/50'];
                return (
                  <motion.div key={i} variants={fadeInUp} className={`group relative rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-sm p-7 ${borderColors[i % borderColors.length]} ${shadowColors[i % shadowColors.length]} hover:shadow-xl transition-all overflow-hidden`} whileHover={{ y: -8, transition: { duration: 0.3 } }}>
                    <motion.div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${colors[i % colors.length]} opacity-0 group-hover:opacity-100 transition-opacity`} />
                    <div className={`inline-flex rounded-2xl bg-gradient-to-br ${colors[i % colors.length]} p-3.5 text-white shadow-lg`}><Icon className="h-6 w-6" /></div>
                    <h3 className="mt-5 text-lg font-bold text-slate-800">{locale === 'bn' && f.title_bn ? f.title_bn : (f.title ?? '')}</h3>
                    <p className="mt-2 text-slate-600 leading-relaxed">{f.description ?? ''}</p>
                    <div className="mt-4 flex items-center gap-1 text-sm font-medium text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      {locale === 'bn' ? 'বিস্তারিত' : 'Learn more'} <ChevronRight className="h-4 w-4" />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </MotionSection>
      )}

      {/* ════════════ GALLERY ════════════ */}
      {showGallery && <GallerySection gallery={galleryConfig} locale={locale} />}

      {/* ════════════ TESTIMONIALS ════════════ */}
      {showTestimonials && <TestimonialsSection testimonials={testimonialsConfig} locale={locale} />}

      {/* ════════════ NEWS & EVENTS ════════════ */}
      {showNotices && (
        <MotionSection id="news" className="scroll-mt-20 py-20 sm:py-28 bg-gradient-to-b from-orange-50/50 via-amber-50/30 to-white relative overflow-hidden" variant={fadeInUp}>
          <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-amber-200/20 to-transparent rounded-full blur-3xl" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <motion.div className="mb-10" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-1.5 mb-4 border border-amber-200/50"><Megaphone className="h-4 w-4 text-amber-600" /><span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">{locale === 'bn' ? 'সংবাদ' : 'News'}</span></motion.div>
              <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-extrabold text-slate-900">{noticeTitle}</motion.h2>
            </motion.div>
            <motion.div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              {notices.slice(0, noticesConfig.maxItems ?? 5).map((n, i) => (
                <motion.div key={n.id} variants={fadeInUp} className="group rounded-2xl border border-amber-200/50 bg-white/90 backdrop-blur-sm overflow-hidden hover:border-purple-300 hover:shadow-lg hover:shadow-purple-100/30 transition-all" whileHover={{ y: -6 }}>
                  <div className={`h-1.5 w-full bg-gradient-to-r ${['from-violet-500 to-fuchsia-500', 'from-emerald-500 to-cyan-500', 'from-amber-500 to-rose-500'][i % 3]}`} />
                  <div className="p-5 sm:p-6">
                    <h3 className="font-bold text-slate-800 group-hover:text-purple-700 transition-colors line-clamp-2">{locale === 'bn' && n.title_bn ? n.title_bn : n.title}</h3>
                    {n.body && <p className="mt-2 text-sm text-slate-500 line-clamp-3">{n.body}</p>}
                    {n.published_at && (
                      <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(n.published_at).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </MotionSection>
      )}

      {/* ════════════ CONTACT ════════════ */}
      {contact.showSection !== false && (
        <MotionSection id="contact" className="scroll-mt-20 py-20 sm:py-28 relative overflow-hidden bg-gradient-to-br from-fuchsia-100 via-purple-50 to-violet-50" variant={fadeInUp}>
          {/* Decorative background */}
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-200 via-purple-100 to-violet-100 opacity-80" />
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-gradient-to-br from-purple-200/20 to-fuchsia-200/20 rounded-full blur-3xl" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <motion.div className="text-center max-w-2xl mx-auto mb-12 relative z-10" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-100 to-fuchsia-100 px-4 py-1.5 mb-4 border border-violet-200/50"><Mail className="h-4 w-4 text-violet-600" /><span className="text-xs font-semibold text-violet-700 uppercase tracking-wider">{locale === 'bn' ? 'যোগাযোগ' : 'Contact'}</span></motion.div>
              <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-slate-900 via-purple-900 to-fuchsia-800 bg-clip-text text-transparent">{locale === 'bn' ? 'যোগাযোগ করুন' : 'Get in Touch'}</motion.h2>
            </motion.div>
            <div className="grid gap-8 lg:grid-cols-5 relative z-10">
              <motion.div className="lg:col-span-2 space-y-4" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                {contact.email && (
                  <motion.a href={`mailto:${contact.email}`} variants={fadeInLeft} className="group flex items-center gap-4 rounded-2xl border border-violet-200/50 bg-white/90 backdrop-blur-sm p-5 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100/50 transition-all" whileHover={{ x: 4 }}>
                    <div className="rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 p-3 group-hover:from-violet-200 group-hover:to-purple-200 transition-colors"><Mail className="h-5 w-5 text-violet-600" /></div>
                    <div><p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{locale === 'bn' ? 'ইমেইল' : 'Email'}</p><p className="font-semibold text-slate-700 group-hover:text-violet-600 transition-colors">{contact.email}</p></div>
                  </motion.a>
                )}
                {contact.phone && (
                  <motion.a href={`tel:${contact.phone}`} variants={fadeInLeft} className="group flex items-center gap-4 rounded-2xl border border-emerald-200/50 bg-white/90 backdrop-blur-sm p-5 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100/50 transition-all" whileHover={{ x: 4 }}>
                    <div className="rounded-xl bg-emerald-50 p-3 group-hover:bg-emerald-100 transition-colors"><Phone className="h-5 w-5 text-emerald-600" /></div>
                    <div><p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{locale === 'bn' ? 'ফোন' : 'Phone'}</p><p className="font-semibold text-slate-700 group-hover:text-emerald-600 transition-colors">{contact.phone}</p></div>
                  </motion.a>
                )}
                {(contact.address || contact.address_bn) && (
                  <motion.div variants={fadeInLeft} className="flex items-center gap-4 rounded-2xl border border-rose-200/50 bg-white/90 backdrop-blur-sm p-5">
                    <div className="rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 p-3"><MapPin className="h-5 w-5 text-rose-600" /></div>
                    <div><p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{locale === 'bn' ? 'ঠিকানা' : 'Address'}</p><p className="font-semibold text-slate-700">{locale === 'bn' && contact.address_bn ? contact.address_bn : contact.address}</p></div>
                  </motion.div>
                )}
                {contact.mapEmbed && (() => {
                  // Sanitize: only allow iframe src URLs from trusted embed providers
                  const srcMatch = contact.mapEmbed.match(/<iframe[^>]+src=["']([^"']+)["']/i);
                  const iframeSrc = srcMatch?.[1];
                  const isTrustedEmbed = iframeSrc && /^https:\/\/(www\.google\.com\/maps|maps\.google\.com|www\.openstreetmap\.org)\//i.test(iframeSrc);
                  return isTrustedEmbed ? (
                    <iframe
                      src={iframeSrc}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 aspect-video w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      sandbox="allow-scripts allow-same-origin"
                      title="Map"
                    />
                  ) : null;
                })()}
              </motion.div>
              {showContactForm && (
                <motion.div className="lg:col-span-3 rounded-2xl border border-violet-200/30 bg-white/90 backdrop-blur-sm p-6 sm:p-8 shadow-lg shadow-violet-100/20" variants={fadeInRight} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">{locale === 'bn' ? 'আমাদের কাছে বার্তা পাঠান' : 'Send us a message'}</h3>
                  <p className="text-sm text-slate-500 mb-6">{locale === 'bn' ? 'আপনার বার্তা স্কুলের ইমেইলে পাঠানো হবে।' : "Your message will be sent to the school's email."}</p>
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">{locale === 'bn' ? 'নাম' : 'Name'}</label>
                        <input type="text" required value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} className="w-full rounded-xl border border-violet-200/50 bg-violet-50/30 px-4 py-3 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 focus:bg-white outline-none transition" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">{locale === 'bn' ? 'ইমেইল' : 'Email'}</label>
                        <input type="email" required value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} className="w-full rounded-xl border border-violet-200/50 bg-violet-50/30 px-4 py-3 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 focus:bg-white outline-none transition" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">{locale === 'bn' ? 'বিষয়' : 'Subject'}</label>
                      <input type="text" required value={contactForm.subject} onChange={e => setContactForm(f => ({ ...f, subject: e.target.value }))} className="w-full rounded-xl border border-violet-200/50 bg-violet-50/30 px-4 py-3 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 focus:bg-white outline-none transition" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">{locale === 'bn' ? 'বার্তা' : 'Message'}</label>
                      <textarea required rows={4} value={contactForm.message} onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))} className="w-full rounded-xl border border-violet-200/50 bg-violet-50/30 px-4 py-3 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 focus:bg-white outline-none transition resize-none" />
                    </div>
                    <motion.button type="submit" disabled={contactSubmitting} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-purple-500/25 hover:shadow-lg hover:shadow-purple-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50" whileTap={{ scale: 0.97 }}>
                      {contactSubmitting ? 'Sending...' : (locale === 'bn' ? 'বার্তা পাঠান' : 'Send message')}<Send className="h-4 w-4" />
                    </motion.button>
                  </form>
                </motion.div>
              )}
            </div>
          </div>
        </MotionSection>
      )}

      {/* ════════════ FOOTER ════════════ */}
      <footer className="relative bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 text-slate-400 overflow-hidden">
        {/* Decorative top gradient line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400" />
        {/* Decorative blobs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-900/20 rounded-full blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14 lg:py-16 relative z-10">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                {site.logoUrl ? <img src={site.logoUrl} alt="" className="h-9 w-auto max-h-10 object-contain brightness-0 invert opacity-80" /> : <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30"><GraduationCap className="h-5 w-5 text-white" /></div>}
                <span className="text-lg font-bold text-white">{schoolName}</span>
              </div>
              <p className="text-sm leading-relaxed">{locale === 'bn' ? (footer.aboutText_bn ?? footer.aboutText) : (footer.aboutText ?? '')}</p>
              {hasSocialLinks && (
                <div className="mt-5 flex gap-3">
                  {footer.facebook && <a href={footer.facebook} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white/10 backdrop-blur-sm p-2 text-slate-400 hover:bg-blue-600 hover:text-white hover:shadow-lg hover:shadow-blue-500/30 transition-all"><svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>}
                  {footer.youtube && <a href={footer.youtube} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white/10 backdrop-blur-sm p-2 text-slate-400 hover:bg-red-600 hover:text-white hover:shadow-lg hover:shadow-red-500/30 transition-all"><svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></a>}
                  {footer.twitter && <a href={footer.twitter} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white/10 backdrop-blur-sm p-2 text-slate-400 hover:bg-sky-500 hover:text-white hover:shadow-lg hover:shadow-sky-500/30 transition-all"><svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>}
                  {footer.instagram && <a href={footer.instagram} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white/10 backdrop-blur-sm p-2 text-slate-400 hover:bg-gradient-to-br hover:from-purple-600 hover:to-pink-500 hover:text-white hover:shadow-lg hover:shadow-pink-500/30 transition-all"><svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></a>}
                  {footer.linkedin && <a href={footer.linkedin} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white/10 backdrop-blur-sm p-2 text-slate-400 hover:bg-blue-700 hover:text-white hover:shadow-lg hover:shadow-blue-700/30 transition-all"><svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a>}
                </div>
              )}
            </div>
            {quickLinks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">{locale === 'bn' ? (footer.linksTitle_bn ?? 'দ্রুত লিঙ্ক') : (footer.linksTitle ?? 'Quick Links')}</h3>
                <ul className="space-y-2.5">
                  {quickLinks.map((link, i) => {
                    const href = link.href?.startsWith('http') ? link.href : (link.href?.startsWith('/') ? `/${locale}${link.href}` : link.href ?? '#');
                    return <li key={i}><a href={href} className="group inline-flex items-center gap-1.5 text-sm hover:text-white transition-colors"><ChevronRight className="h-3 w-3 text-purple-400/60 group-hover:text-fuchsia-400" />{locale === 'bn' && link.label_bn ? link.label_bn : (link.label ?? '')}</a></li>;
                  })}
                </ul>
              </div>
            )}
            {(contact.email || contact.phone || contact.address) && (
              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">{locale === 'bn' ? (footer.contactTitle_bn ?? 'যোগাযোগ') : (footer.contactTitle ?? 'Contact Us')}</h3>
                <div className="space-y-3 text-sm">
                  {contact.email && <a href={`mailto:${contact.email}`} className="flex items-center gap-2.5 hover:text-white transition-colors"><Mail className="h-4 w-4 text-violet-400 shrink-0" />{contact.email}</a>}
                  {contact.phone && <a href={`tel:${contact.phone}`} className="flex items-center gap-2.5 hover:text-white transition-colors"><Phone className="h-4 w-4 text-emerald-400 shrink-0" />{contact.phone}</a>}
                  {(contact.address || contact.address_bn) && <div className="flex items-start gap-2.5"><MapPin className="h-4 w-4 text-fuchsia-400 shrink-0 mt-0.5" /><span>{locale === 'bn' && contact.address_bn ? contact.address_bn : contact.address}</span></div>}
                </div>
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">{locale === 'bn' ? 'পোর্টালে যান' : 'Visit Portal'}</h3>
              <p className="text-sm mb-4">{locale === 'bn' ? 'অভিভাবক ও শিক্ষার্থীরা পোর্টালে লগইন করুন' : 'Parents and students can login to the portal'}</p>
              <Link href={`/${locale}/login`} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-fuchsia-500 hover:via-purple-500 hover:to-indigo-500 shadow-md shadow-purple-500/30 transition-all">
                {locale === 'bn' ? 'লগইন করুন' : 'Login Now'} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">{footer.copyright ?? '© School. All rights reserved.'}</p>
            <div className="flex items-center gap-1 text-xs text-slate-600"><span>{locale === 'bn' ? 'তৈরি করেছে' : 'Powered by'}</span><span className="font-medium bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">School Management System</span></div>
          </div>
        </div>
      </footer>

      {/* Scroll to top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-50 rounded-full bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-600 p-3 text-white shadow-lg shadow-purple-600/40 hover:shadow-xl hover:shadow-purple-500/50 transition-all"
            initial={{ opacity: 0, scale: 0, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0, y: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
