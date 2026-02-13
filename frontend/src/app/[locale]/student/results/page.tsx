'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useTranslations, useLocale } from 'next-intl';
import {
  Award,
  BookOpen,
  User,
  Printer,
  Download,
  Eye,
  X,
  Calendar,
  MapPin,
  Phone,
  Droplets,
  Star,
  Trophy,
  TrendingUp,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';

/* ───── Types ───── */
type MarkItem = {
  subject_id: number;
  subject_name: string;
  subject_name_bn?: string;
  marks_obtained: number;
  total_marks: number;
  full_marks: number;
  percentage: number;
  letter_grade: string;
  gpa: number;
};

type ReportCard = {
  exam_term: { id: number; name: string; start_date: string; end_date: string };
  marks: MarkItem[];
  total_marks: number;
  total_full: number;
  gpa?: number;
  letter_grade?: string;
  position?: number;
  total_students?: number;
};

type StudentInfo = {
  id: number;
  student_id: string;
  name: string;
  name_bn?: string;
  photo?: string;
  gender?: string;
  date_of_birth?: string;
  blood_group?: string;
  father_name?: string;
  father_name_bn?: string;
  mother_name?: string;
  mother_name_bn?: string;
};

type EnrollmentInfo = {
  class_name: string;
  section_name: string;
  session_name: string;
  roll_no?: number;
};

type Data = {
  student: StudentInfo;
  enrollment: EnrollmentInfo | null;
  report_cards: ReportCard[];
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

/* ───── Grade Scale ───── */
const GRADE_SCALE = [
  { min: 80, max: 100, gpa: 5.00, grade: 'A+', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  { min: 70, max: 79, gpa: 4.00, grade: 'A', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  { min: 60, max: 69, gpa: 3.50, grade: 'A-', bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
  { min: 50, max: 59, gpa: 3.00, grade: 'B', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  { min: 40, max: 49, gpa: 2.00, grade: 'C', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  { min: 33, max: 39, gpa: 1.00, grade: 'D', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  { min: 0, max: 32, gpa: 0.00, grade: 'F', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
];

const gradeColor = (grade?: string) => {
  if (!grade) return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };
  if (grade === 'A+') return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' };
  if (grade.startsWith('A')) return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' };
  if (grade.startsWith('B')) return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' };
  if (grade.startsWith('C')) return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' };
  if (grade.startsWith('D')) return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' };
  return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' };
};

const formatDate = (d?: string) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; }
};

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/* ═══════════════════════════════════════════════════════════════
   DUMMY DATA FOR TESTING — Set USE_DUMMY = false to use real API
   ═══════════════════════════════════════════════════════════════ */
const USE_DUMMY = true;

const DUMMY_INSTITUTION: InstitutionInfo = {
  name: 'Greenfield International School',
  name_bn: 'গ্রিনফিল্ড ইন্টারন্যাশনাল স্কুল',
  address: '123 Education Road, Dhaka-1205, Bangladesh',
  phone: '+880-2-9876543',
  email: 'info@greenfieldschool.edu.bd',
  logo: '',
  eiin: '108245',
};

const DUMMY_STUDENT: StudentInfo = {
  id: 1,
  student_id: 'GIS-2025-0042',
  name: 'Anika Rahman',
  name_bn: 'অনিকা রহমান',
  photo: '',
  gender: 'Female',
  date_of_birth: '2012-03-15',
  blood_group: 'B+',
  father_name: 'Mahbubur Rahman',
  father_name_bn: 'মাহবুবুর রহমান',
  mother_name: 'Fatema Begum',
  mother_name_bn: 'ফাতেমা বেগম',
};

const DUMMY_ENROLLMENT: EnrollmentInfo = {
  class_name: 'Class 8',
  section_name: 'A',
  session_name: '2025-2026',
  roll_no: 7,
};

const makeMark = (id: number, name: string, nameBn: string, obtained: number, full: number): MarkItem => {
  const pct = (obtained / full) * 100;
  const g = GRADE_SCALE.find(gs => pct >= gs.min && pct <= gs.max) || GRADE_SCALE[6];
  return { subject_id: id, subject_name: name, subject_name_bn: nameBn, marks_obtained: obtained, total_marks: obtained, full_marks: full, percentage: pct, letter_grade: g.grade, gpa: g.gpa };
};

const DUMMY_REPORT_CARDS: ReportCard[] = [
  {
    exam_term: { id: 1, name: '1st Term Examination', start_date: '2025-04-10', end_date: '2025-04-22' },
    marks: [
      makeMark(1, 'Bangla', 'বাংলা', 82, 100),
      makeMark(2, 'English', 'ইংরেজি', 75, 100),
      makeMark(3, 'Mathematics', 'গণিত', 91, 100),
      makeMark(4, 'Science', 'বিজ্ঞান', 68, 100),
      makeMark(5, 'Social Science', 'সমাজবিজ্ঞান', 72, 100),
      makeMark(6, 'Religion & Moral Education', 'ধর্ম ও নৈতিক শিক্ষা', 88, 100),
      makeMark(7, 'ICT', 'তথ্য ও যোগাযোগ প্রযুক্তি', 95, 100),
      makeMark(8, 'Physical Education', 'শারীরিক শিক্ষা', 80, 100),
    ],
    total_marks: 651,
    total_full: 800,
    gpa: 4.56,
    letter_grade: 'A+',
    position: 3,
    total_students: 45,
  },
  {
    exam_term: { id: 2, name: 'Mid-Term Examination', start_date: '2025-07-15', end_date: '2025-07-27' },
    marks: [
      makeMark(1, 'Bangla', 'বাংলা', 78, 100),
      makeMark(2, 'English', 'ইংরেজি', 85, 100),
      makeMark(3, 'Mathematics', 'গণিত', 62, 100),
      makeMark(4, 'Science', 'বিজ্ঞান', 73, 100),
      makeMark(5, 'Social Science', 'সমাজবিজ্ঞান', 58, 100),
      makeMark(6, 'Religion & Moral Education', 'ধর্ম ও নৈতিক শিক্ষা', 90, 100),
      makeMark(7, 'ICT', 'তথ্য ও যোগাযোগ প্রযুক্তি', 88, 100),
      makeMark(8, 'Physical Education', 'শারীরিক শিক্ষা', 76, 100),
    ],
    total_marks: 610,
    total_full: 800,
    gpa: 4.06,
    letter_grade: 'A',
    position: 7,
    total_students: 45,
  },
  {
    exam_term: { id: 3, name: 'Final Examination', start_date: '2025-11-20', end_date: '2025-12-05' },
    marks: [
      makeMark(1, 'Bangla', 'বাংলা', 85, 100),
      makeMark(2, 'English', 'ইংরেজি', 90, 100),
      makeMark(3, 'Mathematics', 'গণিত', 45, 100),
      makeMark(4, 'Science', 'বিজ্ঞান', 82, 100),
      makeMark(5, 'Social Science', 'সমাজবিজ্ঞান', 76, 100),
      makeMark(6, 'Religion & Moral Education', 'ধর্ম ও নৈতিক শিক্ষা', 92, 100),
      makeMark(7, 'ICT', 'তথ্য ও যোগাযোগ প্রযুক্তি', 97, 100),
      makeMark(8, 'Physical Education', 'শারীরিক শিক্ষা', 35, 100),
    ],
    total_marks: 602,
    total_full: 800,
    gpa: 3.88,
    letter_grade: 'A',
    position: 5,
    total_students: 45,
  },
];

const DUMMY_DATA: Data = {
  student: DUMMY_STUDENT,
  enrollment: DUMMY_ENROLLMENT,
  report_cards: DUMMY_REPORT_CARDS,
};

/* ───── Printable Result Card Component ───── */
function PrintableResultCard({ student, enrollment, rc, institution, locale }: {
  student: StudentInfo;
  enrollment: EnrollmentInfo | null;
  rc: ReportCard;
  institution: InstitutionInfo;
  locale: string;
}) {
  const highestIdx = rc.marks.reduce((best, m, i, arr) => m.percentage > arr[best].percentage ? i : best, 0);
  const totalPct = rc.total_full > 0 ? ((rc.total_marks / rc.total_full) * 100).toFixed(1) : '0';
  const failed = rc.letter_grade === 'F' || !rc.letter_grade;

  return (
    <div className="bg-white rounded-lg border-2 border-slate-300 overflow-hidden print-card" style={{ pageBreakAfter: 'always', pageBreakInside: 'avoid' }}>
      {/* ── School Header ── */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white px-6 py-5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="relative flex items-center gap-4">
          {institution.logo ? (
            <img src={institution.logo} alt="" className="h-16 w-16 rounded-full bg-white p-1 object-contain" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
          )}
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold tracking-wide">
              {locale === 'bn' && institution.name_bn ? institution.name_bn : institution.name || 'School Name'}
            </h1>
            {institution.address && (
              <p className="text-blue-200 text-xs mt-1 flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3" /> {institution.address}
              </p>
            )}
            <div className="flex items-center justify-center gap-4 text-xs text-blue-200 mt-1">
              {institution.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {institution.phone}</span>}
              {institution.eiin && <span>EIIN: {institution.eiin}</span>}
            </div>
          </div>
          <div className="w-16" /> {/* spacer for symmetry */}
        </div>
      </div>

      {/* ── Exam Title Banner ── */}
      <div className="bg-gradient-to-r from-slate-100 to-blue-50 px-6 py-3 border-b-2 border-slate-200 text-center">
        <h2 className="text-base font-bold text-slate-800 flex items-center justify-center gap-2">
          <Award className="w-4 h-4 text-blue-600" />
          {rc.exam_term.name}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {enrollment?.session_name && <span>{enrollment.session_name} | </span>}
          {formatDate(rc.exam_term.start_date)} — {formatDate(rc.exam_term.end_date)}
        </p>
      </div>

      {/* ── Student Info Grid ── */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex gap-4">
          {/* Photo */}
          <div className="shrink-0">
            {student.photo ? (
              <img src={student.photo} alt="" className="w-20 h-24 rounded-lg object-cover border-2 border-slate-200" />
            ) : (
              <div className="w-20 h-24 rounded-lg bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                <User className="w-8 h-8 text-slate-300" />
              </div>
            )}
          </div>
          {/* Details grid */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Student Name</p>
              <p className="font-semibold text-slate-800">{locale === 'bn' && student.name_bn ? student.name_bn : student.name}</p>
            </div>
            {student.father_name && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Father&apos;s Name</p>
                <p className="font-semibold text-slate-800">{locale === 'bn' && student.father_name_bn ? student.father_name_bn : student.father_name}</p>
              </div>
            )}
            {student.mother_name && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Mother&apos;s Name</p>
                <p className="font-semibold text-slate-800">{locale === 'bn' && student.mother_name_bn ? student.mother_name_bn : student.mother_name}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Student ID</p>
              <p className="font-semibold text-slate-800">{student.student_id}</p>
            </div>
            {enrollment && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Class & Section</p>
                <p className="font-semibold text-slate-800">{enrollment.class_name} — {enrollment.section_name}</p>
              </div>
            )}
            {enrollment?.roll_no && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Roll No</p>
                <p className="font-semibold text-slate-800">{enrollment.roll_no}</p>
              </div>
            )}
            {student.date_of_birth && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Date of Birth</p>
                <p className="font-semibold text-slate-800">{formatDate(student.date_of_birth)}</p>
              </div>
            )}
            {student.gender && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Gender</p>
                <p className="font-semibold text-slate-800 capitalize">{student.gender}</p>
              </div>
            )}
            {student.blood_group && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Blood Group</p>
                <p className="font-semibold text-slate-800 flex items-center gap-1"><Droplets className="w-3 h-3 text-red-500" />{student.blood_group}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* ── Marks Table ── */}
      <div className="px-6 py-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
              <th className="py-2 px-3 text-left rounded-tl-lg w-10">SL</th>
              <th className="py-2 px-3 text-left">Subject</th>
              <th className="py-2 px-3 text-center w-16">Full</th>
              <th className="py-2 px-3 text-center w-20">Obtained</th>
              <th className="py-2 px-3 text-center w-16">%</th>
              <th className="py-2 px-3 text-center w-14">Grade</th>
              <th className="py-2 px-3 text-center rounded-tr-lg w-14">GPA</th>
            </tr>
          </thead>
          <tbody>
            {rc.marks.map((m, i) => {
              const gc = gradeColor(m.letter_grade);
              const isHighest = i === highestIdx && rc.marks.length > 1;
              return (
                <tr key={m.subject_id} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} ${isHighest ? 'ring-1 ring-amber-300 bg-amber-50/50' : ''}`}>
                  <td className="py-2 px-3 text-slate-500 text-center">{i + 1}</td>
                  <td className="py-2 px-3 font-medium text-slate-800 flex items-center gap-1">
                    {m.subject_name}
                    {isHighest && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-600">{m.full_marks}</td>
                  <td className="py-2 px-3 text-center font-bold text-slate-800">{m.total_marks ?? '—'}</td>
                  <td className="py-2 px-3 text-center text-slate-600">{m.percentage.toFixed(1)}%</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${gc.bg} ${gc.text} ${gc.border} border`}>{m.letter_grade || '—'}</span>
                  </td>
                  <td className="py-2 px-3 text-center font-semibold text-slate-700">{Number(m.gpa).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
          {/* Totals row */}
          <tfoot>
            <tr className="bg-gradient-to-r from-slate-100 to-slate-200 font-bold text-slate-800">
              <td colSpan={2} className="py-2.5 px-3 rounded-bl-lg">Total</td>
              <td className="py-2.5 px-3 text-center">{rc.total_full}</td>
              <td className="py-2.5 px-3 text-center text-blue-700">{rc.total_marks}</td>
              <td className="py-2.5 px-3 text-center">{totalPct}%</td>
              <td className="py-2.5 px-3 text-center">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${gradeColor(rc.letter_grade).bg} ${gradeColor(rc.letter_grade).text} ${gradeColor(rc.letter_grade).border} border`}>{rc.letter_grade || '—'}</span>
              </td>
              <td className="py-2.5 px-3 text-center rounded-br-lg">{Number(rc.gpa).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Result Summary ── */}
      <div className="px-6 py-4 border-t border-slate-200">
        <div className={`rounded-xl p-4 ${failed ? 'bg-red-50 border border-red-200' : 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200'}`}>
          <div className="flex flex-wrap items-center justify-center gap-6 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">GPA</p>
              <p className={`text-2xl font-black ${failed ? 'text-red-600' : 'text-emerald-700'}`}>{Number(rc.gpa).toFixed(2)}</p>
            </div>
            <div className="h-10 w-px bg-slate-200" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Grade</p>
              <p className={`text-2xl font-black ${failed ? 'text-red-600' : 'text-emerald-700'}`}>{rc.letter_grade || '—'}</p>
            </div>
            {rc.position != null && (
              <>
                <div className="h-10 w-px bg-slate-200" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Position</p>
                  <p className="text-2xl font-black text-blue-700">{ordinal(rc.position)}</p>
                  {rc.total_students && <p className="text-[10px] text-slate-400">of {rc.total_students}</p>}
                </div>
              </>
            )}
            <div className="h-10 w-px bg-slate-200" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Status</p>
              <p className={`text-lg font-black ${failed ? 'text-red-600' : 'text-emerald-700'}`}>
                {failed ? '✗ FAILED' : '✓ PASSED'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Grade Scale ── */}
      <div className="px-6 py-3 border-t border-slate-100">
        <p className="text-[10px] uppercase text-slate-400 tracking-wider font-medium mb-2">Grade Scale</p>
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          {GRADE_SCALE.map(g => (
            <span key={g.grade} className={`px-2 py-0.5 rounded border ${g.bg} ${g.text} ${g.border} font-medium`}>
              {g.grade} ({g.min}-{g.max}%) = {g.gpa.toFixed(2)}
            </span>
          ))}
        </div>
      </div>

      {/* ── Signatures ── */}
      <div className="px-6 py-6 mt-4">
        <div className="flex justify-between items-end">
          <div className="text-center">
            <div className="w-32 border-t-2 border-slate-400 pt-1">
              <p className="text-xs text-slate-600 font-medium">Class Teacher</p>
            </div>
          </div>
          <div className="text-center">
            <div className="w-32 border-t-2 border-slate-400 pt-1">
              <p className="text-xs text-slate-600 font-medium">Guardian</p>
            </div>
          </div>
          <div className="text-center">
            <div className="w-32 border-t-2 border-slate-400 pt-1">
              <p className="text-xs text-slate-600 font-medium">Principal</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="bg-slate-50 px-6 py-2 text-center text-[10px] text-slate-400 border-t border-slate-200">
        Printed on {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
        {institution.name && ` — ${institution.name}`}
      </div>
    </div>
  );
}
/* ───── Print Window Utility ───── */
function openPrintWindow(cards: string[], title: string) {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>
<script src="https://cdn.tailwindcss.com"><\/script>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
  *{font-family:'Noto Sans Bengali','Segoe UI',system-ui,sans-serif}
  @media print{
    @page{size:A4;margin:10mm}
    body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .print-card{box-shadow:none!important;border-radius:0!important;break-inside:avoid;page-break-inside:avoid}
    .no-print{display:none!important}
  }
  @media screen{
    body{background:#f1f5f9;padding:20px}
    .print-card{max-width:800px;margin:0 auto 24px;box-shadow:0 4px 20px rgba(0,0,0,.1)}
  }
</style></head><body>
<div class="no-print" style="text-align:center;padding:12px;background:white;border-radius:8px;max-width:800px;margin:0 auto 16px;box-shadow:0 2px 8px rgba(0,0,0,.1)">
  <button onclick="window.print()" style="padding:8px 24px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:14px">🖨️ Print / Save as PDF</button>
  <button onclick="window.close()" style="padding:8px 24px;margin-left:8px;background:#64748b;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:14px">✕ Close</button>
</div>
${cards.join('\n')}
</body></html>`);
  w.document.close();
}
/* ───── Render a single card to HTML string (for print) ───── */
function renderCardHTML(student: StudentInfo, enrollment: EnrollmentInfo | null, rc: ReportCard, inst: InstitutionInfo, locale: string): string {
  const highestIdx = rc.marks.reduce((best, m, i, arr) => m.percentage > arr[best].percentage ? i : best, 0);
  const totalPct = rc.total_full > 0 ? ((rc.total_marks / rc.total_full) * 100).toFixed(1) : '0';
  const failed = rc.letter_grade === 'F' || !rc.letter_grade;
  const gc = (grade: string) => {
    const g = GRADE_SCALE.find(x => x.grade === grade) || GRADE_SCALE[GRADE_SCALE.length - 1];
    return g;
  };

  const studentName = locale === 'bn' && student.name_bn ? student.name_bn : student.name;
  const fatherName = locale === 'bn' && student.father_name_bn ? student.father_name_bn : student.father_name;
  const motherName = locale === 'bn' && student.mother_name_bn ? student.mother_name_bn : student.mother_name;
  const schoolName = locale === 'bn' && inst.name_bn ? inst.name_bn : inst.name || 'School Name';

  const marksRows = rc.marks.map((m, i) => {
    const isHighest = i === highestIdx && rc.marks.length > 1;
    const g = gc(m.letter_grade);
    return `<tr style="border-bottom:1px solid #f1f5f9;${i % 2 === 0 ? '' : 'background:#f8fafc;'}${isHighest ? 'background:#fffbeb;outline:1px solid #fde68a;' : ''}">
      <td style="padding:6px 10px;text-align:center;color:#64748b;font-size:13px">${i + 1}</td>
      <td style="padding:6px 10px;font-weight:600;color:#1e293b;font-size:13px">${m.subject_name}${isHighest ? ' ⭐' : ''}</td>
      <td style="padding:6px 10px;text-align:center;color:#475569;font-size:13px">${m.full_marks}</td>
      <td style="padding:6px 10px;text-align:center;font-weight:700;color:#1e293b;font-size:13px">${m.total_marks ?? '—'}</td>
      <td style="padding:6px 10px;text-align:center;color:#475569;font-size:13px">${m.percentage.toFixed(1)}%</td>
      <td style="padding:6px 10px;text-align:center"><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:${g.grade === 'A+' ? '#dcfce7' : g.grade === 'A' ? '#d1fae5' : g.grade === 'A-' ? '#e0f2fe' : g.grade === 'B' ? '#fef9c3' : g.grade === 'C' ? '#ffedd5' : g.grade === 'D' ? '#fee2e2' : '#fecaca'};color:${g.grade === 'F' ? '#991b1b' : '#1e293b'}">${m.letter_grade || '—'}</span></td>
      <td style="padding:6px 10px;text-align:center;font-weight:600;color:#334155;font-size:13px">${Number(m.gpa).toFixed(2)}</td>
    </tr>`;
  }).join('');

  const gradeScaleHTML = GRADE_SCALE.map(g =>
    `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:500;margin:2px;border:1px solid #e2e8f0;background:#f8fafc">${g.grade} (${g.min}-${g.max}%) = ${g.gpa.toFixed(2)}</span>`
  ).join('');

  return `<div class="print-card" style="background:white;border-radius:8px;border:2px solid #cbd5e1;overflow:hidden;margin-bottom:24px;page-break-after:always;page-break-inside:avoid">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e3a5f,#1e40af,#312e81);color:white;padding:20px 24px;position:relative">
      <div style="display:flex;align-items:center;gap:16px">
        ${inst.logo ? `<img src="${inst.logo}" style="height:60px;width:60px;border-radius:50%;background:white;padding:4px;object-fit:contain"/>` : `<div style="height:60px;width:60px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:28px">🎓</div>`}
        <div style="flex:1;text-align:center">
          <h1 style="font-size:18px;font-weight:700;margin:0;letter-spacing:0.5px">${schoolName}</h1>
          ${inst.address ? `<p style="color:#93c5fd;font-size:11px;margin:4px 0 0">📍 ${inst.address}</p>` : ''}
          <div style="display:flex;align-items:center;justify-content:center;gap:16px;font-size:11px;color:#93c5fd;margin-top:4px">
            ${inst.phone ? `<span>📞 ${inst.phone}</span>` : ''}
            ${inst.eiin ? `<span>EIIN: ${inst.eiin}</span>` : ''}
          </div>
        </div>
        <div style="width:60px"></div>
      </div>
    </div>
    <!-- Exam Banner -->
    <div style="background:linear-gradient(90deg,#f8fafc,#eff6ff);padding:10px 24px;border-bottom:2px solid #e2e8f0;text-align:center">
      <h2 style="font-size:15px;font-weight:700;color:#1e293b;margin:0">🏆 ${rc.exam_term.name}</h2>
      <p style="font-size:11px;color:#64748b;margin:3px 0 0">${enrollment?.session_name ? enrollment.session_name + ' | ' : ''}${formatDate(rc.exam_term.start_date)} — ${formatDate(rc.exam_term.end_date)}</p>
    </div>
    <!-- Student Info -->
    <div style="padding:16px 24px;border-bottom:1px solid #e2e8f0">
      <div style="display:flex;gap:16px">
        ${student.photo ? `<img src="${student.photo}" style="width:80px;height:96px;border-radius:8px;object-fit:cover;border:2px solid #e2e8f0"/>` : `<div style="width:80px;height:96px;border-radius:8px;background:#f1f5f9;border:2px solid #e2e8f0;display:flex;align-items:center;justify-content:center;font-size:32px;color:#94a3b8">👤</div>`}
        <div style="flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:8px 24px;font-size:13px">
          <div><p style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin:0;font-weight:500">Student Name</p><p style="font-weight:600;color:#1e293b;margin:2px 0 0">${studentName}</p></div>
          ${fatherName ? `<div><p style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin:0;font-weight:500">Father's Name</p><p style="font-weight:600;color:#1e293b;margin:2px 0 0">${fatherName}</p></div>` : ''}
          ${motherName ? `<div><p style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin:0;font-weight:500">Mother's Name</p><p style="font-weight:600;color:#1e293b;margin:2px 0 0">${motherName}</p></div>` : ''}
          <div><p style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin:0;font-weight:500">Student ID</p><p style="font-weight:600;color:#1e293b;margin:2px 0 0">${student.student_id}</p></div>
          ${enrollment ? `<div><p style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin:0;font-weight:500">Class & Section</p><p style="font-weight:600;color:#1e293b;margin:2px 0 0">${enrollment.class_name} — ${enrollment.section_name}</p></div>` : ''}
          ${enrollment?.roll_no ? `<div><p style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin:0;font-weight:500">Roll No</p><p style="font-weight:600;color:#1e293b;margin:2px 0 0">${enrollment.roll_no}</p></div>` : ''}
          ${student.date_of_birth ? `<div><p style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin:0;font-weight:500">Date of Birth</p><p style="font-weight:600;color:#1e293b;margin:2px 0 0">${formatDate(student.date_of_birth)}</p></div>` : ''}
          ${student.gender ? `<div><p style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin:0;font-weight:500">Gender</p><p style="font-weight:600;color:#1e293b;margin:2px 0 0;text-transform:capitalize">${student.gender}</p></div>` : ''}
          ${student.blood_group ? `<div><p style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin:0;font-weight:500">Blood Group</p><p style="font-weight:600;color:#1e293b;margin:2px 0 0">🩸 ${student.blood_group}</p></div>` : ''}
        </div>
      </div>
    </div>    <!-- Marks Table -->
    <div style="padding:16px 24px">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:linear-gradient(90deg,#334155,#1e293b);color:white">
            <th style="padding:8px 10px;text-align:left;border-radius:6px 0 0 0;width:40px">SL</th>
            <th style="padding:8px 10px;text-align:left">Subject</th>
            <th style="padding:8px 10px;text-align:center;width:60px">Full</th>
            <th style="padding:8px 10px;text-align:center;width:75px">Obtained</th>
            <th style="padding:8px 10px;text-align:center;width:55px">%</th>
            <th style="padding:8px 10px;text-align:center;width:55px">Grade</th>
            <th style="padding:8px 10px;text-align:center;border-radius:0 6px 0 0;width:55px">GPA</th>
          </tr>
        </thead>
        <tbody>${marksRows}</tbody>
        <tfoot>
          <tr style="background:linear-gradient(90deg,#f1f5f9,#e2e8f0);font-weight:700;color:#1e293b">
            <td colspan="2" style="padding:10px;border-radius:0 0 0 6px">Total</td>
            <td style="padding:10px;text-align:center">${rc.total_full}</td>
            <td style="padding:10px;text-align:center;color:#1d4ed8">${rc.total_marks}</td>
            <td style="padding:10px;text-align:center">${totalPct}%</td>
            <td style="padding:10px;text-align:center"><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:${failed ? '#fecaca' : '#dcfce7'};color:${failed ? '#991b1b' : '#166534'}">${rc.letter_grade || '—'}</span></td>
            <td style="padding:10px;text-align:center;border-radius:0 0 6px 0">${Number(rc.gpa).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <!-- Result Summary -->
    <div style="padding:16px 24px;border-top:1px solid #e2e8f0">
      <div style="border-radius:12px;padding:16px;${failed ? 'background:#fef2f2;border:1px solid #fecaca' : 'background:linear-gradient(90deg,#ecfdf5,#f0fdfa);border:1px solid #a7f3d0'}">
        <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:24px;text-align:center">
          <div><p style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin:0;font-weight:500">GPA</p><p style="font-size:24px;font-weight:900;margin:4px 0 0;color:${failed ? '#dc2626' : '#047857'}">${Number(rc.gpa).toFixed(2)}</p></div>
          <div style="height:40px;width:1px;background:#e2e8f0"></div>
          <div><p style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin:0;font-weight:500">Grade</p><p style="font-size:24px;font-weight:900;margin:4px 0 0;color:${failed ? '#dc2626' : '#047857'}">${rc.letter_grade || '—'}</p></div>
          ${rc.position != null ? `<div style="height:40px;width:1px;background:#e2e8f0"></div><div><p style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin:0;font-weight:500">Position</p><p style="font-size:24px;font-weight:900;margin:4px 0 0;color:#1d4ed8">${ordinal(rc.position)}</p>${rc.total_students ? `<p style="font-size:10px;color:#94a3b8;margin:2px 0 0">of ${rc.total_students}</p>` : ''}</div>` : ''}
          <div style="height:40px;width:1px;background:#e2e8f0"></div>
          <div><p style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin:0;font-weight:500">Status</p><p style="font-size:18px;font-weight:900;margin:4px 0 0;color:${failed ? '#dc2626' : '#047857'}">${failed ? '✗ FAILED' : '✓ PASSED'}</p></div>
        </div>
      </div>
    </div>
    <!-- Grade Scale -->
    <div style="padding:10px 24px;border-top:1px solid #f1f5f9">
      <p style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:500;margin:0 0 6px">Grade Scale</p>
      <div style="display:flex;flex-wrap:wrap;gap:4px">${gradeScaleHTML}</div>
    </div>
    <!-- Signatures -->
    <div style="padding:24px;margin-top:16px">
      <div style="display:flex;justify-content:space-between;align-items:flex-end">
        <div style="text-align:center"><div style="width:120px;border-top:2px solid #94a3b8;padding-top:4px"><p style="font-size:11px;color:#475569;margin:0;font-weight:500">Class Teacher</p></div></div>
        <div style="text-align:center"><div style="width:120px;border-top:2px solid #94a3b8;padding-top:4px"><p style="font-size:11px;color:#475569;margin:0;font-weight:500">Guardian</p></div></div>
        <div style="text-align:center"><div style="width:120px;border-top:2px solid #94a3b8;padding-top:4px"><p style="font-size:11px;color:#475569;margin:0;font-weight:500">Principal</p></div></div>
      </div>
    </div>
    <!-- Footer -->
    <div style="background:#f8fafc;padding:8px 24px;text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0">
      Printed on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}${inst.name ? ` — ${inst.name}` : ''}
    </div>
  </div>`;
}
/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function StudentResultsPage() {
  const t = useTranslations('student');
  const locale = useLocale();
  const [expandedTerm, setExpandedTerm] = useState<number | null>(null);
  const [previewCard, setPreviewCard] = useState<ReportCard | null>(null);
  const [showGradeScale, setShowGradeScale] = useState(false);

  // Fetch report card data
  const { data: apiData, isLoading, error } = useQuery<Data>({
    queryKey: ['student-report-card'],
    queryFn: () => api('/reports/student/report-card'),
    enabled: !USE_DUMMY,
  });

  // Fetch institution info
  const { data: apiInstitution } = useQuery<InstitutionInfo>({
    queryKey: ['institution-info'],
    queryFn: () => api('/id-cards/institution'),
    enabled: !USE_DUMMY,
  });

  const data = USE_DUMMY ? DUMMY_DATA : apiData;
  const institution = USE_DUMMY ? DUMMY_INSTITUTION : apiInstitution;

  const inst: InstitutionInfo = institution || { name: '', name_bn: '', address: '', phone: '', email: '', logo: '', eiin: '' };
  const student = data?.student;
  const enrollment = data?.enrollment || null;
  const reportCards = data?.report_cards || [];

  /* ── Print single card ── */
  function handlePrint(rc: ReportCard) {
    if (!student) return;
    const html = renderCardHTML(student, enrollment, rc, inst, locale);
    openPrintWindow([html], `Result Card - ${rc.exam_term.name}`);
  }

  /* ── Print all cards ── */
  function handlePrintAll() {
    if (!student) return;
    const htmls = reportCards.map(rc => renderCardHTML(student, enrollment, rc, inst, locale));
    openPrintWindow(htmls, 'All Result Cards');
  }

  /* ── Loading State ── */
  if (!USE_DUMMY && isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-slate-200 rounded-lg" />
          <div className="h-40 bg-slate-200 rounded-xl" />
          <div className="h-60 bg-slate-200 rounded-xl" />
          <div className="h-60 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  /* ── Error State ── */
  if (!USE_DUMMY && (error || !data)) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <BookOpen className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-800">Failed to load results</h3>
          <p className="text-red-600 text-sm mt-1">Please try again later or contact administration.</p>
        </div>
      </div>
    );
  }

  /* ── Empty State ── */
  if (reportCards.length === 0) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-700">No Results Available</h3>
          <p className="text-slate-500 text-sm mt-2">Your exam results will appear here once published.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Award className="w-6 h-6 text-blue-600" />
            {t('results') || 'My Results'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {locale === 'bn' && student?.name_bn ? student.name_bn : student?.name} • {enrollment?.class_name} ({enrollment?.section_name})
            {enrollment?.roll_no && ` • Roll: ${enrollment.roll_no}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowGradeScale(!showGradeScale)} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            <BookOpen className="w-4 h-4" /> Grade Scale
            {showGradeScale ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {reportCards.length > 1 && (
            <button onClick={handlePrintAll} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm">
              <Printer className="w-4 h-4" /> Print All
            </button>
          )}
        </div>
      </div>

      {/* ── Grade Scale Panel ── */}
      {showGradeScale && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {GRADE_SCALE.map(g => (
              <div key={g.grade} className={`rounded-lg p-3 text-center border ${g.bg} ${g.border}`}>
                <p className={`text-lg font-black ${g.text}`}>{g.grade}</p>
                <p className="text-xs text-slate-500 mt-0.5">{g.min}% - {g.max}%</p>
                <p className={`text-sm font-bold ${g.text} mt-0.5`}>GPA {g.gpa.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Student Profile Summary ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
          <div className="flex items-center gap-4">
            {student?.photo ? (
              <img src={student.photo} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-white/30" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <User className="w-7 h-7 text-white" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold">{locale === 'bn' && student?.name_bn ? student.name_bn : student?.name}</h2>
              <p className="text-blue-200 text-sm">
                ID: {student?.student_id} • {enrollment?.class_name} — {enrollment?.section_name}
                {enrollment?.session_name && ` • ${enrollment.session_name}`}
              </p>
            </div>
            <div className="ml-auto hidden sm:flex items-center gap-6 text-sm">
              {student?.date_of_birth && (
                <div className="text-center">
                  <Calendar className="w-4 h-4 mx-auto mb-0.5 text-blue-200" />
                  <span className="text-blue-100">{formatDate(student.date_of_birth)}</span>
                </div>
              )}
              {student?.blood_group && (
                <div className="text-center">
                  <Droplets className="w-4 h-4 mx-auto mb-0.5 text-blue-200" />
                  <span className="text-blue-100">{student.blood_group}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100">
          {reportCards.map(rc => {
            const failed = rc.letter_grade === 'F' || !rc.letter_grade;
            return (
              <div key={rc.exam_term.id} className="p-3 text-center">
                <p className="text-xs text-slate-400 truncate">{rc.exam_term.name}</p>
                <p className={`text-xl font-black ${failed ? 'text-red-500' : 'text-emerald-600'}`}>{Number(rc.gpa).toFixed(2)}</p>
                <p className={`text-xs font-semibold ${failed ? 'text-red-400' : 'text-emerald-500'}`}>{rc.letter_grade || '—'}</p>
              </div>
            );
          })}
        </div>
      </div>
      {/* ── Exam Term Cards ── */}
      <div className="space-y-4">
        {reportCards.map((rc, idx) => {
          const isExpanded = expandedTerm === idx;
          const failed = rc.letter_grade === 'F' || !rc.letter_grade;
          const totalPct = rc.total_full > 0 ? ((rc.total_marks / rc.total_full) * 100).toFixed(1) : '0';
          const highestIdx = rc.marks.reduce((best, m, i, arr) => m.percentage > arr[best].percentage ? i : best, 0);

          return (
            <div key={rc.exam_term.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all">
              {/* Term Header — clickable to expand */}
              <button
                onClick={() => setExpandedTerm(isExpanded ? null : idx)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${failed ? 'bg-red-100' : 'bg-emerald-100'}`}>
                    <Trophy className={`w-5 h-5 ${failed ? 'text-red-600' : 'text-emerald-600'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{rc.exam_term.name}</h3>
                    <p className="text-xs text-slate-400">{formatDate(rc.exam_term.start_date)} — {formatDate(rc.exam_term.end_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-3 text-sm">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${failed ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      GPA: {Number(rc.gpa).toFixed(2)} ({rc.letter_grade || '—'})
                    </span>
                    {rc.position != null && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                        {ordinal(rc.position)} Position
                      </span>
                    )}
                    <span className="text-slate-500">{totalPct}%</span>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-slate-100">
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
                    <button onClick={() => handlePrint(rc)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                      <Printer className="w-3.5 h-3.5" /> Print Result Card
                    </button>
                    <button onClick={() => handlePrint(rc)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-white transition-colors">
                      <Download className="w-3.5 h-3.5" /> Download PDF
                    </button>
                    <button onClick={() => setPreviewCard(rc)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-white transition-colors">
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </button>
                  </div>

                  {/* Marks Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600">
                          <th className="py-2.5 px-4 text-left w-10">#</th>
                          <th className="py-2.5 px-4 text-left">Subject</th>
                          <th className="py-2.5 px-4 text-center w-16">Full</th>
                          <th className="py-2.5 px-4 text-center w-20">Obtained</th>
                          <th className="py-2.5 px-4 text-center w-16">%</th>
                          <th className="py-2.5 px-4 text-center w-16">Grade</th>
                          <th className="py-2.5 px-4 text-center w-14">GPA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rc.marks.map((m, i) => {
                          const gc = gradeColor(m.letter_grade);
                          const isHighest = i === highestIdx && rc.marks.length > 1;
                          return (
                            <tr key={m.subject_id} className={`border-b border-slate-50 ${i % 2 === 0 ? '' : 'bg-slate-50/50'} ${isHighest ? 'bg-amber-50/60' : ''} hover:bg-slate-50 transition-colors`}>
                              <td className="py-2.5 px-4 text-slate-400">{i + 1}</td>
                              <td className="py-2.5 px-4 font-medium text-slate-800">
                                {m.subject_name}
                                {isHighest && <Star className="w-3 h-3 text-amber-500 fill-amber-500 inline ml-1" />}
                              </td>
                              <td className="py-2.5 px-4 text-center text-slate-500">{m.full_marks}</td>
                              <td className="py-2.5 px-4 text-center font-bold text-slate-800">{m.total_marks ?? '—'}</td>
                              <td className="py-2.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${m.percentage >= 80 ? 'bg-emerald-500' : m.percentage >= 60 ? 'bg-blue-500' : m.percentage >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(m.percentage, 100)}%` }} />
                                  </div>
                                  <span className="text-xs text-slate-500">{m.percentage.toFixed(0)}%</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${gc.bg} ${gc.text} ${gc.border} border`}>{m.letter_grade || '—'}</span>
                              </td>
                              <td className="py-2.5 px-4 text-center font-semibold text-slate-600">{Number(m.gpa).toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Bar */}
                  <div className={`mx-4 my-3 rounded-xl p-4 ${failed ? 'bg-red-50 border border-red-200' : 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200'}`}>
                    <div className="flex flex-wrap items-center justify-center gap-6 text-center">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">Total</p>
                        <p className="font-bold text-slate-700">{rc.total_marks}/{rc.total_full}</p>
                      </div>
                      <div className="h-8 w-px bg-slate-200" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">Percentage</p>
                        <p className="font-bold text-slate-700">{totalPct}%</p>
                      </div>
                      <div className="h-8 w-px bg-slate-200" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">GPA</p>
                        <p className={`text-xl font-black ${failed ? 'text-red-600' : 'text-emerald-700'}`}>{Number(rc.gpa).toFixed(2)}</p>
                      </div>
                      <div className="h-8 w-px bg-slate-200" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">Grade</p>
                        <p className={`text-xl font-black ${failed ? 'text-red-600' : 'text-emerald-700'}`}>{rc.letter_grade || '—'}</p>
                      </div>
                      {rc.position != null && (
                        <>
                          <div className="h-8 w-px bg-slate-200" />
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400">Position</p>
                            <p className="text-xl font-black text-blue-700">{ordinal(rc.position)}</p>
                            {rc.total_students && <p className="text-[10px] text-slate-400">of {rc.total_students}</p>}
                          </div>
                        </>
                      )}
                      <div className="h-8 w-px bg-slate-200" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">Status</p>
                        <p className={`font-black ${failed ? 'text-red-600' : 'text-emerald-700'}`}>{failed ? '✗ FAILED' : '✓ PASSED'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* ── Preview Modal ── */}
      {previewCard && student && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="relative w-full max-w-3xl">
            {/* Modal controls */}
            <div className="sticky top-0 z-10 flex items-center justify-between bg-white/90 backdrop-blur rounded-t-xl px-4 py-3 border-b border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" /> Result Card Preview
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={() => handlePrint(previewCard)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button onClick={() => handlePrint(previewCard)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
                <button onClick={() => setPreviewCard(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* Card preview */}
            <div className="bg-slate-100 rounded-b-xl p-4">
              <PrintableResultCard student={student} enrollment={enrollment} rc={previewCard} institution={inst} locale={locale} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}