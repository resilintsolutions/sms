'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  CreditCard, Upload, Trash2, Printer, Search, GraduationCap, UserCircle,
  Briefcase, Check, ChevronDown, ChevronUp, ChevronLeft, Plus, X, Eye, Palette, Type,
  Move, Settings2, Layers, Sparkles, Image, RotateCcw, Save, Grid3X3,
  AlignCenter, Bold, Square, Circle, Edit3, ToggleLeft, ToggleRight,
  Grip, ChevronRight, Hash, Phone, Mail, MapPin, Calendar, Droplets, Shield,
  ArrowUp, ArrowDown, Copy, Loader2, Users,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

type CardType = 'student' | 'teacher' | 'staff';

type DesignConfig = {
  // Layout & Theme
  layout: 'portrait' | 'landscape';
  theme: string; // preset name or 'custom'
  headerGradient: [string, string]; // from, to
  footerGradient: [string, string];
  headerTextColor: string;
  bodyBgColor: string;
  bodyTextColor: string;
  labelColor: string;
  accentColor: string;
  borderRadius: number; // px
  borderColor: string;
  borderWidth: number;
  showBorder: boolean;
  // Photo
  photoShape: 'rounded' | 'circle' | 'square';
  photoSize: number; // px width
  photoBorderColor: string;
  photoBorderWidth: number;
  // Header
  showLogo: boolean;
  showSchoolName: boolean;
  showEiin: boolean;
  showCardTypeLabel: boolean;
  headerFontSize: number;
  // Fields - which to show
  enabledFields: string[];
  // Custom fields values (field_key -> value mapping per person, but here we store which custom fields to show)
  customFieldKeys: string[];
  // Footer
  showFooter: boolean;
  footerText: string;
  showAddress: boolean;
  showPhone: boolean;
  // Font
  fontFamily: string;
  nameFontSize: number;
  fieldFontSize: number;
};

type Template = {
  id: number;
  name: string;
  type: string;
  background_image: string;
  is_sample: boolean;
  field_positions: Record<string, unknown> | null;
  design_config: DesignConfig | null;
};

type CustomField = {
  id: number;
  label: string;
  label_bn?: string;
  field_key: string;
  applies_to: string;
  default_value?: string;
  sort_order: number;
  is_active: boolean;
};

type StudentRow = {
  id: number;
  student_id: string;
  name: string;
  name_bn?: string;
  photo?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  enrollments?: {
    section?: { name: string; class?: { name: string } };
    academic_session?: { name: string };
    roll_no?: number;
  }[];
};

type EmployeeRow = {
  id: number;
  employee_id: string;
  name: string;
  name_bn?: string;
  photo?: string;
  designation: string;
  department?: string;
  phone?: string;
  email?: string;
  join_date?: string;
  blood_group?: string;
};

type InstitutionInfo = {
  name: string;
  name_bn?: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  eiin?: string;
};

/* ═══════════════════════════════════════════════════════════════
   THEME PRESETS
   ═══════════════════════════════════════════════════════════════ */

type ThemePreset = {
  name: string;
  label: string;
  preview: [string, string]; // gradient colors for preview swatch
  config: Partial<DesignConfig>;
};

const THEME_PRESETS: ThemePreset[] = [
  {
    name: 'royal-blue', label: 'Royal Blue', preview: ['#1e3a8a', '#3b82f6'],
    config: {
      headerGradient: ['#1e3a8a', '#3b82f6'], footerGradient: ['#1e3a8a', '#2563eb'],
      headerTextColor: '#ffffff', accentColor: '#3b82f6', borderColor: '#bfdbfe',
      photoBorderColor: '#3b82f6', labelColor: '#64748b',
    },
  },
  {
    name: 'emerald', label: 'Emerald Green', preview: ['#064e3b', '#10b981'],
    config: {
      headerGradient: ['#064e3b', '#10b981'], footerGradient: ['#064e3b', '#059669'],
      headerTextColor: '#ffffff', accentColor: '#10b981', borderColor: '#a7f3d0',
      photoBorderColor: '#10b981', labelColor: '#4b5563',
    },
  },
  {
    name: 'royal-purple', label: 'Royal Purple', preview: ['#4c1d95', '#8b5cf6'],
    config: {
      headerGradient: ['#4c1d95', '#8b5cf6'], footerGradient: ['#4c1d95', '#7c3aed'],
      headerTextColor: '#ffffff', accentColor: '#8b5cf6', borderColor: '#c4b5fd',
      photoBorderColor: '#8b5cf6', labelColor: '#6b7280',
    },
  },
  {
    name: 'crimson', label: 'Crimson Red', preview: ['#7f1d1d', '#ef4444'],
    config: {
      headerGradient: ['#7f1d1d', '#ef4444'], footerGradient: ['#7f1d1d', '#dc2626'],
      headerTextColor: '#ffffff', accentColor: '#ef4444', borderColor: '#fecaca',
      photoBorderColor: '#ef4444', labelColor: '#6b7280',
    },
  },
  {
    name: 'ocean-teal', label: 'Ocean Teal', preview: ['#134e4a', '#14b8a6'],
    config: {
      headerGradient: ['#134e4a', '#14b8a6'], footerGradient: ['#134e4a', '#0d9488'],
      headerTextColor: '#ffffff', accentColor: '#14b8a6', borderColor: '#99f6e4',
      photoBorderColor: '#14b8a6', labelColor: '#4b5563',
    },
  },
  {
    name: 'sunset-orange', label: 'Sunset Orange', preview: ['#7c2d12', '#f97316'],
    config: {
      headerGradient: ['#7c2d12', '#f97316'], footerGradient: ['#7c2d12', '#ea580c'],
      headerTextColor: '#ffffff', accentColor: '#f97316', borderColor: '#fed7aa',
      photoBorderColor: '#f97316', labelColor: '#6b7280',
    },
  },
  {
    name: 'dark-slate', label: 'Dark Slate', preview: ['#0f172a', '#475569'],
    config: {
      headerGradient: ['#0f172a', '#475569'], footerGradient: ['#0f172a', '#334155'],
      headerTextColor: '#ffffff', accentColor: '#64748b', borderColor: '#cbd5e1',
      photoBorderColor: '#64748b', labelColor: '#94a3b8',
    },
  },
  {
    name: 'rose-gold', label: 'Rose Gold', preview: ['#881337', '#f43f5e'],
    config: {
      headerGradient: ['#881337', '#f43f5e'], footerGradient: ['#881337', '#e11d48'],
      headerTextColor: '#ffffff', accentColor: '#f43f5e', borderColor: '#fecdd3',
      photoBorderColor: '#f43f5e', labelColor: '#6b7280',
    },
  },
  {
    name: 'forest', label: 'Forest', preview: ['#14532d', '#22c55e'],
    config: {
      headerGradient: ['#14532d', '#22c55e'], footerGradient: ['#14532d', '#16a34a'],
      headerTextColor: '#ffffff', accentColor: '#22c55e', borderColor: '#86efac',
      photoBorderColor: '#22c55e', labelColor: '#4b5563',
    },
  },
];

const DEFAULT_DESIGN: DesignConfig = {
  layout: 'portrait',
  theme: 'royal-blue',
  headerGradient: ['#1e3a8a', '#3b82f6'],
  footerGradient: ['#1e3a8a', '#2563eb'],
  headerTextColor: '#ffffff',
  bodyBgColor: '#ffffff',
  bodyTextColor: '#1e293b',
  labelColor: '#64748b',
  accentColor: '#3b82f6',
  borderRadius: 16,
  borderColor: '#e2e8f0',
  borderWidth: 0,
  showBorder: false,
  photoShape: 'rounded',
  photoSize: 100,
  photoBorderColor: '#3b82f6',
  photoBorderWidth: 3,
  showLogo: true,
  showSchoolName: true,
  showEiin: true,
  showCardTypeLabel: true,
  headerFontSize: 14,
  enabledFields: ['name', 'id', 'class_section', 'roll_no', 'blood_group', 'gender', 'dob'],
  customFieldKeys: [],
  showFooter: true,
  footerText: '',
  showAddress: true,
  showPhone: true,
  fontFamily: 'system',
  nameFontSize: 18,
  fieldFontSize: 12,
};

const STUDENT_FIELDS = [
  { key: 'name', label: 'Name', icon: Type },
  { key: 'id', label: 'Student ID', icon: Hash },
  { key: 'class_section', label: 'Class & Section', icon: GraduationCap },
  { key: 'roll_no', label: 'Roll Number', icon: Hash },
  { key: 'session', label: 'Session', icon: Calendar },
  { key: 'blood_group', label: 'Blood Group', icon: Droplets },
  { key: 'gender', label: 'Gender', icon: UserCircle },
  { key: 'dob', label: 'Date of Birth', icon: Calendar },
];

const EMPLOYEE_FIELDS = [
  { key: 'name', label: 'Name', icon: Type },
  { key: 'id', label: 'Employee ID', icon: Hash },
  { key: 'designation', label: 'Designation', icon: Briefcase },
  { key: 'department', label: 'Department', icon: Layers },
  { key: 'phone', label: 'Phone', icon: Phone },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'join_date', label: 'Joining Date', icon: Calendar },
  { key: 'blood_group', label: 'Blood Group', icon: Droplets },
];
/* ═══════════════════════════════════════════════════════════════
   ID CARD PREVIEW COMPONENT — Renders the actual card
   ═══════════════════════════════════════════════════════════════ */

function IdCardPreview({
  design,
  person,
  type,
  institution,
  locale,
  customFields,
  scale = 1,
}: {
  design: DesignConfig;
  person: StudentRow | EmployeeRow | null;
  type: CardType;
  institution: InstitutionInfo;
  locale: string;
  customFields: CustomField[];
  scale?: number;
}) {
  const isBn = locale === 'bn';
  const schoolName = isBn ? (institution.name_bn || institution.name) : institution.name;
  const typeLabel = type === 'student' ? 'STUDENT' : type === 'teacher' ? 'TEACHER' : 'STAFF';

  const w = design.layout === 'landscape' ? 540 : 340;
  const h = design.layout === 'landscape' ? 340 : 540;

  // Resolve person data
  const personName = person ? (isBn ? ((person as StudentRow).name_bn || person.name) : person.name) : 'Student Name';
  const photo = (person as StudentRow)?.photo || null;

  // Build fields array
  const fieldDefs = type === 'student' ? STUDENT_FIELDS : EMPLOYEE_FIELDS;
  const getFieldValue = (key: string): string => {
    if (!person) {
      // Placeholder values for preview
      const placeholders: Record<string, string> = {
        name: 'John Doe', id: 'STU-2025-001', class_section: 'Class 10 — A', roll_no: '15',
        session: '2025-2026', blood_group: 'O+', gender: 'Male', dob: '01 Jan 2010',
        designation: 'Senior Teacher', department: 'Science', phone: '+880-1700000000',
        email: 'teacher@school.edu', join_date: '01 Jan 2020',
      };
      return placeholders[key] || '—';
    }
    if (type === 'student') {
      const s = person as StudentRow;
      const enr = s.enrollments?.[0];
      switch (key) {
        case 'name': return personName;
        case 'id': return s.student_id;
        case 'class_section': return enr ? `${enr.section?.class?.name || '—'} — ${enr.section?.name || '—'}` : '—';
        case 'roll_no': return enr?.roll_no ? String(enr.roll_no) : '—';
        case 'session': return enr?.academic_session?.name || '—';
        case 'blood_group': return s.blood_group || '—';
        case 'gender': return s.gender || '—';
        case 'dob': return s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
        default: return '—';
      }
    } else {
      const e = person as EmployeeRow;
      switch (key) {
        case 'name': return personName;
        case 'id': return e.employee_id;
        case 'designation': return e.designation || '—';
        case 'department': return e.department || '—';
        case 'phone': return e.phone || '—';
        case 'email': return e.email || '—';
        case 'join_date': return e.join_date ? new Date(e.join_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
        case 'blood_group': return e.blood_group || '—';
        default: return '—';
      }
    }
  };

  const visibleFields = design.enabledFields.filter(k => k !== 'name');
  const visibleCustom = customFields.filter(cf => design.customFieldKeys.includes(cf.field_key) && cf.is_active);

  const photoShapeClass = design.photoShape === 'circle' ? 'rounded-full' : design.photoShape === 'square' ? 'rounded-none' : 'rounded-xl';

  return (
    <div
      className="id-card relative overflow-hidden bg-white shadow-xl print:shadow-none flex flex-col"
      style={{
        width: w * scale,
        height: h * scale,
        borderRadius: design.borderRadius * scale,
        border: design.showBorder ? `${design.borderWidth}px solid ${design.borderColor}` : 'none',
        fontSize: `${scale * 100}%`,
        pageBreakInside: 'avoid',
        fontFamily: design.fontFamily === 'system' ? "'Noto Sans Bengali', 'Segoe UI', system-ui, sans-serif"
          : design.fontFamily === 'serif' ? "'Noto Serif Bengali', Georgia, serif"
          : design.fontFamily === 'mono' ? "'Courier New', monospace"
          : `'${design.fontFamily}', 'Noto Sans Bengali', sans-serif`,
      }}
    >
      {/* ── Header ── */}
      <div
        className="relative px-4 py-3 flex flex-col items-center justify-center text-center shrink-0"
        style={{
          background: `linear-gradient(135deg, ${design.headerGradient[0]}, ${design.headerGradient[1]})`,
          color: design.headerTextColor,
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -left-6 -top-6 w-20 h-20 rounded-full opacity-10 bg-white" />
        <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full opacity-[0.07] bg-white" />

        <div className="relative z-10 flex items-center gap-2">
          {design.showLogo && institution.logo && (
            <img src={institution.logo} alt="" className="h-9 w-9 rounded-full bg-white/20 object-contain p-0.5" style={{ height: 36 * scale, width: 36 * scale }} />
          )}
          <div>
            {design.showSchoolName && (
              <p className="font-bold leading-tight" style={{ fontSize: design.headerFontSize * scale }}>{schoolName || 'School Name'}</p>
            )}
            {design.showCardTypeLabel && (
              <p className="tracking-[3px] opacity-80 mt-0.5" style={{ fontSize: 9 * scale }}>{typeLabel} ID CARD</p>
            )}
            {design.showEiin && institution.eiin && (
              <p className="opacity-60 mt-0.5" style={{ fontSize: 8 * scale }}>EIIN: {institution.eiin}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex flex-col items-center px-4 py-3 overflow-hidden" style={{ background: design.bodyBgColor, color: design.bodyTextColor }}>
        {/* Photo */}
        <div
          className={`${photoShapeClass} overflow-hidden flex items-center justify-center shrink-0`}
          style={{
            width: design.photoSize * scale,
            height: (design.photoSize * 1.15) * scale,
            border: `${design.photoBorderWidth}px solid ${design.photoBorderColor}`,
            background: `${design.accentColor}15`,
          }}
        >
          {photo ? (
            <img src={photo} alt="" className="h-full w-full object-cover" />
          ) : (
            <UserCircle style={{ width: 40 * scale, height: 40 * scale, color: `${design.accentColor}60` }} />
          )}
        </div>

        {/* Name */}
        {design.enabledFields.includes('name') && (
          <p className="font-bold text-center mt-2 leading-tight" style={{ fontSize: design.nameFontSize * scale, color: design.bodyTextColor }}>
            {getFieldValue('name')}
          </p>
        )}

        {/* Divider */}
        <div className="w-3/4 my-1.5" style={{ height: 1, background: `${design.accentColor}30` }} />

        {/* Fields */}
        <div className="w-full space-y-1 px-2" style={{ fontSize: design.fieldFontSize * scale }}>
          {visibleFields.map(key => {
            const def = fieldDefs.find(f => f.key === key);
            if (!def) return null;
            const val = getFieldValue(key);
            return (
              <div key={key} className="flex items-baseline gap-1.5">
                <span className="font-medium shrink-0" style={{ color: design.labelColor, fontSize: (design.fieldFontSize - 1) * scale }}>
                  {def.label}:
                </span>
                <span className="font-semibold truncate" style={{ color: design.bodyTextColor }}>{val}</span>
              </div>
            );
          })}
          {/* Custom Fields */}
          {visibleCustom.map(cf => (
            <div key={cf.field_key} className="flex items-baseline gap-1.5">
              <span className="font-medium shrink-0" style={{ color: design.labelColor, fontSize: (design.fieldFontSize - 1) * scale }}>
                {isBn && cf.label_bn ? cf.label_bn : cf.label}:
              </span>
              <span className="font-semibold truncate" style={{ color: design.bodyTextColor }}>{cf.default_value || '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      {design.showFooter && (
        <div
          className="px-4 py-2 text-center shrink-0"
          style={{
            background: `linear-gradient(135deg, ${design.footerGradient[0]}, ${design.footerGradient[1]})`,
            color: design.headerTextColor,
            fontSize: 8 * scale,
          }}
        >
          {design.footerText || (
            <>
              {design.showAddress && institution.address && <span>{institution.address}</span>}
              {design.showPhone && institution.phone && <span>{design.showAddress && institution.address ? ' • ' : ''}{institution.phone}</span>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
/* ═══════════════════════════════════════════════════════════════
   DESIGN PANEL — Sidebar editor for customizing the card
   ═══════════════════════════════════════════════════════════════ */

function DesignPanel({
  design,
  onChange,
  type,
  customFields,
  onAddField,
  onDeleteField,
  onToggleField,
}: {
  design: DesignConfig;
  onChange: (d: DesignConfig) => void;
  type: CardType;
  customFields: CustomField[];
  onAddField: () => void;
  onDeleteField: (id: number) => void;
  onToggleField: (key: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'theme' | 'layout' | 'fields' | 'style'>('theme');
  const set = <K extends keyof DesignConfig>(key: K, val: DesignConfig[K]) => onChange({ ...design, [key]: val });

  const fieldDefs = type === 'student' ? STUDENT_FIELDS : EMPLOYEE_FIELDS;

  const tabs = [
    { id: 'theme' as const, label: 'Themes', icon: Palette },
    { id: 'fields' as const, label: 'Fields', icon: Grid3X3 },
    { id: 'style' as const, label: 'Style', icon: Settings2 },
    { id: 'layout' as const, label: 'Layout', icon: Layers },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
              activeTab === tab.id ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-500' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 max-h-[520px] overflow-y-auto space-y-4">
        {/* ──── Theme Tab ──── */}
        {activeTab === 'theme' && (
          <>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Color Themes</p>
            <div className="grid grid-cols-3 gap-2">
              {THEME_PRESETS.map(t => (
                <button
                  key={t.name}
                  onClick={() => onChange({ ...design, theme: t.name, ...t.config })}
                  className={`group relative rounded-xl p-2 border-2 transition-all ${
                    design.theme === t.name ? 'border-primary-500 ring-2 ring-primary-200 bg-primary-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="h-8 rounded-lg overflow-hidden" style={{ background: `linear-gradient(135deg, ${t.preview[0]}, ${t.preview[1]})` }} />
                  <p className="mt-1.5 text-[10px] font-medium text-slate-600 text-center truncate">{t.label}</p>
                  {design.theme === t.name && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary-600 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Custom Colors</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="color" value={design.headerGradient[0]} onChange={e => set('headerGradient', [e.target.value, design.headerGradient[1]])} className="w-6 h-6 rounded cursor-pointer border-0" />
                  Header Start
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="color" value={design.headerGradient[1]} onChange={e => set('headerGradient', [design.headerGradient[0], e.target.value])} className="w-6 h-6 rounded cursor-pointer border-0" />
                  Header End
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="color" value={design.accentColor} onChange={e => set('accentColor', e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0" />
                  Accent
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="color" value={design.bodyTextColor} onChange={e => set('bodyTextColor', e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0" />
                  Text
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="color" value={design.labelColor} onChange={e => set('labelColor', e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0" />
                  Labels
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="color" value={design.bodyBgColor} onChange={e => set('bodyBgColor', e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0" />
                  Background
                </label>
              </div>
            </div>
          </>
        )}

        {/* ──── Fields Tab ──── */}
        {activeTab === 'fields' && (
          <>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Standard Fields</p>
            <p className="text-[10px] text-slate-400 -mt-2">Toggle fields on/off. Drag to reorder.</p>
            <div className="space-y-1">
              {fieldDefs.map(f => {
                const enabled = design.enabledFields.includes(f.key);
                return (
                  <div key={f.key} className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${enabled ? 'bg-primary-50 border border-primary-200' : 'bg-slate-50 border border-slate-100'}`}>
                    <f.icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-xs font-medium text-slate-700 flex-1">{f.label}</span>
                    <button onClick={() => onToggleField(f.key)} className="p-0.5">
                      {enabled ? <ToggleRight className="w-5 h-5 text-primary-600" /> : <ToggleLeft className="w-5 h-5 text-slate-300" />}
                    </button>
                    {enabled && f.key !== 'name' && (
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => {
                            const arr = [...design.enabledFields];
                            const idx = arr.indexOf(f.key);
                            if (idx > 0) { [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; set('enabledFields', arr); }
                          }}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            const arr = [...design.enabledFields];
                            const idx = arr.indexOf(f.key);
                            if (idx < arr.length - 1) { [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; set('enabledFields', arr); }
                          }}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Custom Fields */}
            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Custom Fields</p>
                <button onClick={onAddField} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                  <Plus className="w-3 h-3" /> Add Field
                </button>
              </div>
              {customFields.length === 0 && (
                <p className="text-[10px] text-slate-400 italic">No custom fields created yet.</p>
              )}
              <div className="space-y-1">
                {customFields.filter(cf => cf.applies_to === 'all' || cf.applies_to === type).map(cf => {
                  const enabled = design.customFieldKeys.includes(cf.field_key);
                  return (
                    <div key={cf.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${enabled ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-100'}`}>
                      <Edit3 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="text-xs font-medium text-slate-700 flex-1">{cf.label}</span>
                      <button onClick={() => {
                        const keys = enabled ? design.customFieldKeys.filter(k => k !== cf.field_key) : [...design.customFieldKeys, cf.field_key];
                        set('customFieldKeys', keys);
                      }} className="p-0.5">
                        {enabled ? <ToggleRight className="w-5 h-5 text-amber-600" /> : <ToggleLeft className="w-5 h-5 text-slate-300" />}
                      </button>
                      <button onClick={() => { if (confirm('Delete this custom field?')) onDeleteField(cf.id); }} className="text-red-400 hover:text-red-600 p-0.5">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ──── Style Tab ──── */}
        {activeTab === 'style' && (
          <>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Photo</p>
            <div className="space-y-2">
              <div className="flex gap-2">
                {(['rounded', 'circle', 'square'] as const).map(s => (
                  <button key={s} onClick={() => set('photoShape', s)} className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium border-2 transition ${design.photoShape === s ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <label className="flex items-center justify-between text-xs text-slate-600">
                <span>Photo Size: {design.photoSize}px</span>
                <input type="range" min={60} max={130} value={design.photoSize} onChange={e => set('photoSize', Number(e.target.value))} className="w-28 accent-primary-600" />
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input type="color" value={design.photoBorderColor} onChange={e => set('photoBorderColor', e.target.value)} className="w-5 h-5 rounded cursor-pointer border-0" />
                Photo Border Color
              </label>
              <label className="flex items-center justify-between text-xs text-slate-600">
                <span>Border Width: {design.photoBorderWidth}px</span>
                <input type="range" min={0} max={6} value={design.photoBorderWidth} onChange={e => set('photoBorderWidth', Number(e.target.value))} className="w-28 accent-primary-600" />
              </label>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Typography</p>
              <label className="flex items-center justify-between text-xs text-slate-600 mb-2">
                <span>Font Family</span>
                <select
                  value={design.fontFamily}
                  onChange={e => set('fontFamily', e.target.value)}
                  className="input text-xs py-1 px-2 w-36"
                >
                  <option value="system">System Default</option>
                  <option value="Noto Sans Bengali">Noto Sans Bengali</option>
                  <option value="serif">Serif (Classic)</option>
                  <option value="mono">Monospace</option>
                  <option value="Inter">Inter</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Roboto">Roboto</option>
                </select>
              </label>
              <label className="flex items-center justify-between text-xs text-slate-600 mb-1">
                <span>Name Size: {design.nameFontSize}px</span>
                <input type="range" min={14} max={24} value={design.nameFontSize} onChange={e => set('nameFontSize', Number(e.target.value))} className="w-28 accent-primary-600" />
              </label>
              <label className="flex items-center justify-between text-xs text-slate-600 mb-1">
                <span>Field Size: {design.fieldFontSize}px</span>
                <input type="range" min={9} max={16} value={design.fieldFontSize} onChange={e => set('fieldFontSize', Number(e.target.value))} className="w-28 accent-primary-600" />
              </label>
              <label className="flex items-center justify-between text-xs text-slate-600">
                <span>Header Size: {design.headerFontSize}px</span>
                <input type="range" min={10} max={20} value={design.headerFontSize} onChange={e => set('headerFontSize', Number(e.target.value))} className="w-28 accent-primary-600" />
              </label>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Card Border</p>
              <label className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                <input type="checkbox" checked={design.showBorder} onChange={e => set('showBorder', e.target.checked)} className="rounded" />
                Show Border
              </label>
              {design.showBorder && (
                <div className="space-y-1 ml-5">
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input type="color" value={design.borderColor} onChange={e => set('borderColor', e.target.value)} className="w-5 h-5 rounded cursor-pointer border-0" />
                    Color
                  </label>
                  <label className="flex items-center justify-between text-xs text-slate-600">
                    <span>Width: {design.borderWidth}px</span>
                    <input type="range" min={1} max={5} value={design.borderWidth} onChange={e => set('borderWidth', Number(e.target.value))} className="w-20 accent-primary-600" />
                  </label>
                </div>
              )}
              <label className="flex items-center justify-between text-xs text-slate-600 mt-2">
                <span>Corner Radius: {design.borderRadius}px</span>
                <input type="range" min={0} max={24} value={design.borderRadius} onChange={e => set('borderRadius', Number(e.target.value))} className="w-28 accent-primary-600" />
              </label>
            </div>
          </>
        )}

        {/* ──── Layout Tab ──── */}
        {activeTab === 'layout' && (
          <>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Card Orientation</p>
            <div className="flex gap-2">
              {(['portrait', 'landscape'] as const).map(o => (
                <button key={o} onClick={() => set('layout', o)} className={`flex-1 flex flex-col items-center gap-1 rounded-xl p-3 border-2 transition ${design.layout === o ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className={`bg-slate-300 rounded ${o === 'portrait' ? 'w-6 h-9' : 'w-9 h-6'}`} />
                  <span className="text-[10px] font-medium text-slate-600 capitalize">{o}</span>
                </button>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Header Options</p>
              <div className="space-y-1.5">
                {([
                  ['showLogo', 'Show Logo'] as const,
                  ['showSchoolName', 'Show School Name'] as const,
                  ['showEiin', 'Show EIIN'] as const,
                  ['showCardTypeLabel', 'Show Card Type Label'] as const,
                ]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" checked={design[key] as boolean} onChange={e => set(key, e.target.checked)} className="rounded" />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Footer Options</p>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={design.showFooter} onChange={e => set('showFooter', e.target.checked)} className="rounded" />
                  Show Footer
                </label>
                {design.showFooter && (
                  <>
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      <input type="checkbox" checked={design.showAddress} onChange={e => set('showAddress', e.target.checked)} className="rounded" />
                      Show Address
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      <input type="checkbox" checked={design.showPhone} onChange={e => set('showPhone', e.target.checked)} className="rounded" />
                      Show Phone
                    </label>
                    <div>
                      <label className="text-xs text-slate-500 font-medium">Custom Footer Text</label>
                      <input type="text" value={design.footerText} onChange={e => set('footerText', e.target.value)} placeholder="Leave blank for auto" className="input w-full mt-1 text-xs" />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <button
                onClick={() => onChange({ ...DEFAULT_DESIGN, theme: 'royal-blue', ...THEME_PRESETS[0].config })}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium"
              >
                <RotateCcw className="w-3 h-3" /> Reset to Defaults
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function IdCardsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const t = useTranslations('idCards');
  const qc = useQueryClient();

  // ── State ──
  const [cardType, setCardType] = useState<CardType>('student');
  const [activeStep, setActiveStep] = useState(1);
  const [design, setDesign] = useState<DesignConfig>({ ...DEFAULT_DESIGN });
  const [selectedPeople, setSelectedPeople] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newField, setNewField] = useState({ label: '', label_bn: '', field_key: '', default_value: '', applies_to: 'all' as string });
  const [previewPerson, setPreviewPerson] = useState<(StudentRow | EmployeeRow) | null>(null);
  const [savedDesignName, setSavedDesignName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // ── Queries ──
  const { data: templatesData } = useQuery({
    queryKey: ['id-card-templates', cardType],
    queryFn: () => api<{ data: Template[] }>(`/id-cards/templates?type=${cardType}`),
  });
  const templates = (templatesData as { data?: Template[] })?.data ?? [];

  const { data: customFieldsData, refetch: refetchFields } = useQuery({
    queryKey: ['id-card-custom-fields'],
    queryFn: () => api<{ data: CustomField[] }>('/id-cards/custom-fields'),
  });
  const customFields = (customFieldsData as { data?: CustomField[] })?.data ?? [];

  const { data: studentsData, isLoading: loadingStudents } = useQuery({
    queryKey: ['id-card-students', search],
    queryFn: () => api<{ data: StudentRow[] }>(`/id-cards/students?search=${encodeURIComponent(search)}`),
    enabled: cardType === 'student',
  });
  const students = (studentsData as { data?: StudentRow[] })?.data ?? [];

  const { data: employeesData, isLoading: loadingEmployees } = useQuery({
    queryKey: ['id-card-employees', cardType, search],
    queryFn: () => api<{ data: EmployeeRow[] }>(`/id-cards/employees?type=${cardType}&search=${encodeURIComponent(search)}`),
    enabled: cardType === 'teacher' || cardType === 'staff',
  });
  const employees = (employeesData as { data?: EmployeeRow[] })?.data ?? [];

  const { data: instData } = useQuery({
    queryKey: ['id-card-institution'],
    queryFn: () => api<{ data: InstitutionInfo }>('/id-cards/institution'),
  });
  const institution: InstitutionInfo = (instData as { data?: InstitutionInfo })?.data ?? { name: '', address: '', phone: '', email: '' };

  const people: (StudentRow | EmployeeRow)[] = cardType === 'student' ? students : employees;
  const loadingPeople = cardType === 'student' ? loadingStudents : loadingEmployees;

  // ── Mutations ──
  const saveDesignMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('name', savedDesignName || `Custom ${cardType} Design`);
      fd.append('type', cardType);
      fd.append('design_config', JSON.stringify(design));
      return api<{ data: Template }>('/id-cards/templates', { method: 'POST', body: fd, isFormData: true });
    },
    onSuccess: () => {
      toast.success('Design saved as template!');
      qc.invalidateQueries({ queryKey: ['id-card-templates'] });
      setShowSaveModal(false);
      setSavedDesignName('');
    },
    onError: () => toast.error('Failed to save design'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/id-cards/templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('templateDeleted'));
      qc.invalidateQueries({ queryKey: ['id-card-templates'] });
    },
  });

  const addFieldMutation = useMutation({
    mutationFn: (data: { label: string; label_bn: string; field_key: string; default_value: string; applies_to: string }) => api('/id-cards/custom-fields', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      toast.success('Custom field created!');
      refetchFields();
      setShowAddFieldModal(false);
      setNewField({ label: '', label_bn: '', field_key: '', default_value: '', applies_to: 'all' });
    },
    onError: () => toast.error('Failed to create field'),
  });

  const deleteFieldMutation = useMutation({
    mutationFn: (id: number) => api(`/id-cards/custom-fields/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('Field deleted'); refetchFields(); },
  });

  // ── Handlers ──
  const toggleField = (key: string) => {
    const arr = [...design.enabledFields];
    const idx = arr.indexOf(key);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(key);
    setDesign(d => ({ ...d, enabledFields: arr }));
  };

  const loadTemplate = (tpl: Template) => {
    if (tpl.design_config) {
      setDesign({ ...DEFAULT_DESIGN, ...tpl.design_config });
    } else {
      // Legacy sample templates - map to design config
      const bg = tpl.background_image || '';
      const preset = THEME_PRESETS.find(p => bg.includes(p.name.replace('-', ''))) || THEME_PRESETS.find(p =>
        bg.includes('blue') ? p.name === 'royal-blue' : bg.includes('green') ? p.name === 'emerald' : bg.includes('purple') ? p.name === 'royal-purple' : false
      );
      if (preset) {
        setDesign({ ...DEFAULT_DESIGN, theme: preset.name, ...preset.config });
      }
    }
  };

  const togglePerson = (id: number) => setSelectedPeople(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  const selectAll = () => setSelectedPeople(people.map(p => p.id));
  const clearSelection = () => setSelectedPeople([]);
  const selectedPeopleData = people.filter(p => selectedPeople.includes(p.id));

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Resolve font family for the print window body
    const fontFamilyCSS = design.fontFamily === 'system'
      ? "'Noto Sans Bengali', 'Segoe UI', system-ui, sans-serif"
      : design.fontFamily === 'serif'
      ? "'Noto Serif Bengali', Georgia, serif"
      : design.fontFamily === 'mono'
      ? "'Courier New', monospace"
      : `'${design.fontFamily}', 'Noto Sans Bengali', sans-serif`;

    // Card dimensions
    const cardW = design.layout === 'landscape' ? 540 : 340;
    const cardH = design.layout === 'landscape' ? 340 : 540;

    printWindow.document.write(`<!DOCTYPE html><html><head><title>ID Cards</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700;800&family=Noto+Serif+Bengali:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
<style>
  /* ── Reset ── */
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: ${fontFamilyCSS}; background: #f8fafc; }

  /* ── Print Grid ── */
  .print-grid { display: flex; flex-wrap: wrap; gap: 24px; padding: 24px; justify-content: center; }

  /* ── Card Shell ── */
  .id-card {
    position: relative; overflow: hidden; background: #fff;
    display: flex; flex-direction: column;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1);
    page-break-inside: avoid; break-inside: avoid;
    width: ${cardW}px; height: ${cardH}px;
    border-radius: ${design.borderRadius}px;
    ${design.showBorder ? `border: ${design.borderWidth}px solid ${design.borderColor};` : ''}
    font-family: ${fontFamilyCSS};
  }

  /* ── Tailwind Utilities (self-contained) ── */
  .relative { position: relative; }
  .absolute { position: absolute; }
  .z-10 { z-index: 10; }
  .flex { display: flex; }
  .flex-1 { flex: 1 1 0%; }
  .flex-col { flex-direction: column; }
  .flex-wrap { flex-wrap: wrap; }
  .items-center { align-items: center; }
  .items-baseline { align-items: baseline; }
  .justify-center { justify-content: center; }
  .gap-1\.5 { gap: 0.375rem; }
  .gap-2 { gap: 0.5rem; }
  .gap-6 { gap: 1.5rem; }
  .shrink-0 { flex-shrink: 0; }
  .overflow-hidden { overflow: hidden; }
  .text-center { text-align: center; }
  .font-bold { font-weight: 700; }
  .font-semibold { font-weight: 600; }
  .font-medium { font-weight: 500; }
  .leading-tight { line-height: 1.25; }
  .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .w-full { width: 100%; }
  .h-full { height: 100%; }
  .w-3\/4 { width: 75%; }
  .w-20 { width: 5rem; }
  .h-20 { height: 5rem; }
  .w-16 { width: 4rem; }
  .h-16 { height: 4rem; }
  .object-cover { object-fit: cover; }
  .object-contain { object-fit: contain; }
  .bg-white { background-color: #fff; }
  .bg-white\/20 { background-color: rgba(255,255,255,0.2); }
  .rounded-full { border-radius: 9999px; }
  .rounded-xl { border-radius: 0.75rem; }
  .rounded-none { border-radius: 0; }
  .opacity-10 { opacity: 0.1; }
  .opacity-60 { opacity: 0.6; }
  .opacity-80 { opacity: 0.8; }
  [class*="opacity-\\[0.07\\]"] { opacity: 0.07; }
  .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
  .px-4 { padding-left: 1rem; padding-right: 1rem; }
  .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
  .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
  .p-0\.5 { padding: 0.125rem; }
  .p-4 { padding: 1rem; }
  .mt-0\.5 { margin-top: 0.125rem; }
  .mt-2 { margin-top: 0.5rem; }
  .my-1\.5 { margin-top: 0.375rem; margin-bottom: 0.375rem; }
  .space-y-1 > * + * { margin-top: 0.25rem; }
  .-left-6 { left: -1.5rem; }
  .-top-6 { top: -1.5rem; }
  .-right-4 { right: -1rem; }
  .-bottom-4 { bottom: -1rem; }
  .h-9 { height: 2.25rem; }
  .w-9 { width: 2.25rem; }
  .tracking-\[3px\] { letter-spacing: 3px; }

  /* ── Print-specific ── */
  .no-print { text-align: center; padding: 16px; margin-bottom: 16px; background: #fff; }
  @media print {
    body { background: #fff !important; }
    .id-card { box-shadow: none !important; }
    .no-print { display: none !important; }
    .print-grid { padding: 0; gap: 16px; }
    @page { margin: 8mm; size: ${design.layout === 'landscape' ? 'landscape' : 'portrait'}; }
  }
</style>
</head><body>
<div class="no-print" style="display:flex;align-items:center;justify-content:center;gap:12px">
  <button onclick="window.print()" style="padding:10px 28px;background:#2563eb;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;display:inline-flex;align-items:center;gap:6px">🖨️ Print / Save as PDF</button>
  <button onclick="window.close()" style="padding:10px 28px;background:#64748b;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px">✕ Close</button>
</div>
<div class="print-grid">${printRef.current.innerHTML}</div>
</body></html>`);
    printWindow.document.close();
  };

  const typeOptions: { value: CardType; icon: typeof GraduationCap; label: string }[] = [
    { value: 'student', icon: GraduationCap, label: t('studentCards') },
    { value: 'teacher', icon: UserCircle, label: t('teacherCards') },
    { value: 'staff', icon: Briefcase, label: t('staffCards') },
  ];

  const steps = [
    { num: 1, label: 'Card Type' },
    { num: 2, label: 'Design Card' },
    { num: 3, label: 'Select People' },
    { num: 4, label: 'Print' },
  ];

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-primary-600" />
            {t('title')}
          </h1>
          <p className="text-sm text-slate-500">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedPeople.length > 0 && (
            <button onClick={handlePrint} className="btn btn-primary flex items-center gap-2">
              <Printer className="h-4 w-4" /> {t('printCards')} ({selectedPeople.length})
            </button>
          )}
        </div>
      </div>

      {/* ── Step Progress ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center flex-1">
              <button
                onClick={() => setActiveStep(s.num)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                  activeStep === s.num
                    ? 'bg-primary-100 text-primary-700'
                    : activeStep > s.num
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-slate-50 text-slate-400'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  activeStep === s.num ? 'bg-primary-600 text-white' : activeStep > s.num ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {activeStep > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
                </div>
                <span className="text-xs font-medium hidden sm:inline">{s.label}</span>
              </button>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 rounded ${activeStep > s.num ? 'bg-emerald-300' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ══════ Step 1: Card Type ══════ */}
      {activeStep === 1 && (
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-slate-700 uppercase tracking-wider">{t('step1')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {typeOptions.map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => { setCardType(value); setSelectedPeople([]); setSearch(''); setActiveStep(2); }}
                className={`group relative flex flex-col items-center gap-3 rounded-2xl border-2 p-8 transition-all hover:shadow-md ${
                  cardType === value
                    ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-blue-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                  cardType === value ? 'bg-primary-100' : 'bg-slate-100 group-hover:bg-slate-200'
                }`}>
                  <Icon className={`w-8 h-8 ${cardType === value ? 'text-primary-600' : 'text-slate-400'}`} />
                </div>
                <span className={`text-sm font-semibold ${cardType === value ? 'text-primary-700' : 'text-slate-600'}`}>{label}</span>
                {cardType === value && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══════ Step 2: Design Card ══════ */}
      {activeStep === 2 && (
        <div className="space-y-6">
          {/* Saved Templates */}
          {templates.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Saved Designs</h2>
                <button onClick={() => setShowSaveModal(true)} className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium">
                  <Save className="w-3.5 h-3.5" /> Save Current Design
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {templates.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => loadTemplate(tpl)}
                    className="group relative shrink-0 flex flex-col items-center rounded-xl border-2 border-slate-200 p-2 transition-all hover:border-slate-300 hover:shadow-sm w-28"
                  >
                    <div className="w-full h-16 rounded-lg overflow-hidden bg-slate-100">
                      {tpl.design_config ? (
                        <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${(tpl.design_config as DesignConfig).headerGradient?.[0] || '#1e3a8a'}, ${(tpl.design_config as DesignConfig).headerGradient?.[1] || '#3b82f6'})` }} />
                      ) : tpl.background_image?.startsWith('/samples/') ? (
                        <div className="w-full h-full" style={{ background: tpl.background_image.includes('blue') ? 'linear-gradient(135deg,#1e3a8a,#3b82f6)' : tpl.background_image.includes('green') ? 'linear-gradient(135deg,#064e3b,#10b981)' : 'linear-gradient(135deg,#4c1d95,#8b5cf6)' }} />
                      ) : (
                        <img src={tpl.background_image} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <p className="mt-1 text-[10px] font-medium text-slate-600 text-center truncate w-full">{tpl.name}</p>
                    {tpl.is_sample && <span className="text-[8px] bg-amber-100 text-amber-700 rounded-full px-1.5 font-semibold">Sample</span>}
                    {!tpl.is_sample && (
                      <button
                        onClick={e => { e.stopPropagation(); if (confirm('Delete this template?')) deleteMutation.mutate(tpl.id); }}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="w-2.5 h-2.5 text-white" />
                      </button>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Designer - Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
            {/* Left: Design Panel */}
            <DesignPanel
              design={design}
              onChange={setDesign}
              type={cardType}
              customFields={customFields}
              onAddField={() => setShowAddFieldModal(true)}
              onDeleteField={id => deleteFieldMutation.mutate(id)}
              onToggleField={toggleField}
            />

            {/* Right: Live Preview */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary-600" /> Live Preview
                </h3>
                <button onClick={() => setActiveStep(3)} className="btn btn-primary text-xs flex items-center gap-1.5">
                  Next: Select People <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 p-8 min-h-[400px]" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0.02) 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
                <IdCardPreview design={design} person={null} type={cardType} institution={institution} locale={locale} customFields={customFields} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ Step 3: Select People ══════ */}
      {activeStep === 3 && (
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
              {cardType === 'student' ? t('selectStudents') : t('selectEmployees')}
            </h2>
            <div className="flex items-center gap-2">
              {selectedPeople.length > 0 && (
                <span className="text-xs bg-primary-100 text-primary-700 rounded-full px-2.5 py-0.5 font-medium">
                  {selectedPeople.length} selected
                </span>
              )}
              <button onClick={selectAll} className="text-xs text-primary-600 hover:underline font-medium">Select All</button>
              {selectedPeople.length > 0 && (
                <button onClick={clearSelection} className="text-xs text-red-500 hover:underline font-medium">Clear</button>
              )}
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={cardType === 'student' ? t('searchStudent') : t('searchEmployee')}
              className="input pl-10 w-full"
            />
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="table-header">
                  <th className="p-3 text-left w-8">
                    <input type="checkbox" checked={cardType === 'student' ? selectedPeople.length === students.length && students.length > 0 : selectedPeople.length === employees.length && employees.length > 0} onChange={() => selectedPeople.length === people.length ? clearSelection() : selectAll()} className="rounded border-slate-300" />
                  </th>
                  <th className="p-3 text-left">{t('photo')}</th>
                  <th className="p-3 text-left">{t('name')}</th>
                  <th className="p-3 text-left">{cardType === 'student' ? t('classSection') : t('designation')}</th>
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left w-20">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {cardType === 'student' && students.map((s: StudentRow) => (
                  <tr key={s.id} className="table-row-hover">
                    <td className="p-3">
                      <input type="checkbox" checked={selectedPeople.includes(s.id)} onChange={() => togglePerson(s.id)} className="rounded border-slate-300" />
                    </td>
                    <td className="p-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden">
                        {s.photo ? <img src={s.photo} alt="" className="w-full h-full object-cover" /> : <Users className="w-5 h-5 text-slate-400 m-auto mt-2" />}
                      </div>
                    </td>
                    <td className="p-3 font-medium text-slate-700">{locale === 'bn' ? (s.name_bn || s.name) : s.name}</td>
                    <td className="p-3 text-slate-500">{s.enrollments?.[0]?.section?.class?.name || '—'} - {s.enrollments?.[0]?.section?.name || '—'}</td>
                    <td className="p-3 text-slate-500 font-mono text-xs">{s.student_id}</td>
                    <td className="p-3">
                      <button onClick={() => setPreviewPerson(s)} className="p-1.5 text-slate-400 hover:text-primary-600 rounded-lg hover:bg-primary-50">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {cardType !== 'student' && employees.map((e: EmployeeRow) => (
                  <tr key={e.id} className="table-row-hover">
                    <td className="p-3">
                      <input type="checkbox" checked={selectedPeople.includes(e.id)} onChange={() => togglePerson(e.id)} className="rounded border-slate-300" />
                    </td>
                    <td className="p-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden">
                        {e.photo ? <img src={e.photo} alt="" className="w-full h-full object-cover" /> : <Users className="w-5 h-5 text-slate-400 m-auto mt-2" />}
                      </div>
                    </td>
                    <td className="p-3 font-medium text-slate-700">{locale === 'bn' ? (e.name_bn || e.name) : e.name}</td>
                    <td className="p-3 text-slate-500">{e.designation || e.department}</td>
                    <td className="p-3 text-slate-500 font-mono text-xs">{e.employee_id}</td>
                    <td className="p-3">
                      <button onClick={() => setPreviewPerson(e)} className="p-1.5 text-slate-400 hover:text-primary-600 rounded-lg hover:bg-primary-50">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cardType === 'student' && students.length === 0 && (
              <div className="text-center py-10 text-sm text-slate-400">{t('noStudentsFound')}</div>
            )}
            {cardType !== 'student' && employees.length === 0 && (
              <div className="text-center py-10 text-sm text-slate-400">{t('noEmployeesFound')}</div>
            )}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
            <button onClick={() => setActiveStep(2)} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Design
            </button>
            <button
              onClick={() => setActiveStep(4)}
              disabled={selectedPeople.length === 0}
              className="btn btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              Preview & Print <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ══════ Step 4: Print Preview ══════ */}
      {activeStep === 4 && (
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">{t('printPreview')}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{selectedPeople.length} card(s) ready to print</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setActiveStep(3)} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button onClick={() => setShowSaveModal(true)} className="btn text-xs flex items-center gap-1.5 border-slate-200">
                <Save className="w-3.5 h-3.5" /> Save Design
              </button>
              <button onClick={handlePrint} className="btn btn-primary text-xs flex items-center gap-1.5">
                <Printer className="w-4 h-4" /> Print All
              </button>
            </div>
          </div>

          <div ref={printRef} className="flex flex-wrap justify-center gap-6 p-4">
            {cardType === 'student' && students.filter((s: StudentRow) => selectedPeople.includes(s.id)).map((s: StudentRow) => (
              <IdCardPreview key={s.id} design={design} person={s} type="student" institution={institution} locale={locale} customFields={customFields} />
            ))}
            {cardType !== 'student' && employees.filter((e: EmployeeRow) => selectedPeople.includes(e.id)).map((e: EmployeeRow) => (
              <IdCardPreview key={e.id} design={design} person={e} type={cardType} institution={institution} locale={locale} customFields={customFields} />
            ))}
          </div>
        </div>
      )}

      {/* ══════ Save Design Modal ══════ */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowSaveModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Save className="w-5 h-5 text-primary-600" /> Save Design
              </h3>
              <button onClick={() => setShowSaveModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Template Name</label>
                <input
                  type="text"
                  value={savedDesignName}
                  onChange={e => setSavedDesignName(e.target.value)}
                  placeholder="e.g. Modern Blue Student Card"
                  className="input w-full"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowSaveModal(false)} className="btn text-xs border-slate-200">Cancel</button>
                <button
                  onClick={() => {
                    saveDesignMutation.mutate();
                    setShowSaveModal(false);
                  }}
                  disabled={!savedDesignName.trim()}
                  className="btn btn-primary text-xs disabled:opacity-50"
                >
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ Add Custom Field Modal ══════ */}
      {showAddFieldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowAddFieldModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary-600" /> Add Custom Field
              </h3>
              <button onClick={() => setShowAddFieldModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Label (English)</label>
                <input
                  type="text"
                  value={newField.label}
                  onChange={e => setNewField(f => ({ ...f, label: e.target.value, field_key: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') }))}
                  placeholder="e.g. Emergency Contact"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Label (Bangla)</label>
                <input
                  type="text"
                  value={newField.label_bn}
                  onChange={e => setNewField(f => ({ ...f, label_bn: e.target.value }))}
                  placeholder="e.g. জরুরি যোগাযোগ"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Field Key</label>
                <input
                  type="text"
                  value={newField.field_key}
                  readOnly
                  className="input w-full bg-slate-50 text-slate-500 font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Auto-generated from label</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Applies To</label>
                <select
                  value={newField.applies_to}
                  onChange={e => setNewField(f => ({ ...f, applies_to: e.target.value }))}
                  className="input w-full"
                >
                  <option value="all">All Types</option>
                  <option value="student">Students Only</option>
                  <option value="teacher">Teachers Only</option>
                  <option value="staff">Staff Only</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Default Value (optional)</label>
                <input
                  type="text"
                  value={newField.default_value}
                  onChange={e => setNewField(f => ({ ...f, default_value: e.target.value }))}
                  placeholder="Leave blank if no default"
                  className="input w-full"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowAddFieldModal(false)} className="btn text-xs border-slate-200">Cancel</button>
                <button
                  onClick={() => {
                    addFieldMutation.mutate(newField);
                    setShowAddFieldModal(false);
                    setNewField({ label: '', label_bn: '', field_key: '', applies_to: 'all', default_value: '' });
                  }}
                  disabled={!newField.label.trim() || !newField.field_key.trim()}
                  className="btn btn-primary text-xs disabled:opacity-50"
                >
                  Add Field
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ Preview Person Modal ══════ */}
      {previewPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setPreviewPerson(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Card Preview</h3>
              <button onClick={() => setPreviewPerson(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="flex items-center justify-center">
              <IdCardPreview
                design={design}
                person={previewPerson}
                type={cardType}
                institution={institution}
                locale={locale}
                customFields={customFields}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}