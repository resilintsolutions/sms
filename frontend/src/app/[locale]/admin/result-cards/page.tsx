'use client';

import { useState, useRef, useCallback, useEffect, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';
import {
  Award,
  BookOpen,
  Printer,
  Search,
  GraduationCap,
  UserCircle,
  Filter,
  FileText,
  Eye,
  X,
  Loader2,
  Download,
  Users,
  User,
  ChevronRight,
  BarChart3,
  Trophy,
  TrendingUp,
  Calendar,
  Phone,
  MapPin,
  Hash,
  Droplets,
  Star,
  ScrollText,
  Medal,
} from 'lucide-react';

/* ───── Types ───── */

type ClassItem = { id: number; name: string; numeric_name?: number };
type SectionItem = { id: number; name: string; class_id: number };
type ExamTerm = { id: number; name: string; name_bn?: string; start_date?: string; end_date?: string; publish_status?: string; academic_session_id?: number };
type SessionItem = { id: number; name: string; is_current?: boolean };

type MarkItem = {
  subject_name: string;
  subject_name_bn?: string;
  marks_obtained: number;
  full_marks: number;
  percentage: number;
};

type StudentCard = {
  student: {
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
  enrollment: {
    class_name: string;
    section_name: string;
    session_name: string;
    roll_no?: number;
  };
  marks: MarkItem[];
  total_marks: number;
  total_full: number;
  gpa?: number;
  letter_grade?: string;
  position?: number;
  total_students?: number;
};

type BulkData = {
  exam_term: { id: number; name: string; start_date?: string; end_date?: string; session?: string };
  cards: StudentCard[];
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

type SearchStudent = {
  id: number;
  student_id: string;
  name: string;
  name_bn?: string;
  photo?: string;
  class_name: string;
  section_name: string;
  session_name: string;
  roll_no?: number;
};

type IndividualReportCard = {
  exam_term: { id: number; name: string; start_date?: string; end_date?: string; session?: string };
  enrollment?: StudentCard['enrollment'] | null;
  marks: MarkItem[];
  total_marks: number;
  total_full: number;
  gpa?: number;
  letter_grade?: string;
  position?: number;
  total_students?: number;
};

type IndividualData = {
  student: StudentCard['student'];
  enrollment: StudentCard['enrollment'] | null;
  report_cards: IndividualReportCard[];
};
/* ───── Grading Scale ───── */
const GRADE_SCALE = [
  { range: '80-100', gpa: 5.00, grade: 'A+', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  { range: '70-79', gpa: 4.00, grade: 'A', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  { range: '60-69', gpa: 3.50, grade: 'A-', bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
  { range: '50-59', gpa: 3.00, grade: 'B', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  { range: '40-49', gpa: 2.00, grade: 'C', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  { range: '33-39', gpa: 1.00, grade: 'D', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  { range: '0-32', gpa: 0.00, grade: 'F', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
];

/* ───── Utility ───── */
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
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};
/* ─────────────────────────────────────────────────────────────────────────────
   PRINTABLE RESULT CARD COMPONENT
   ───────────────────────────────────────────────────────────────────────────── */

function ResultCard({
  card,
  examTerm,
  institution,
  locale,
  showWatermark = false,
}: {
  card: StudentCard;
  examTerm: BulkData['exam_term'];
  institution: InstitutionInfo;
  locale: string;
  showWatermark?: boolean;
}) {
  const isBn = locale === 'bn';
  const schoolName = isBn ? (institution.name_bn || institution.name) : institution.name;
  const studentName = isBn ? (card.student.name_bn || card.student.name) : card.student.name;
  const fatherName = isBn ? (card.student.father_name_bn || card.student.father_name) : card.student.father_name;
  const motherName = isBn ? (card.student.mother_name_bn || card.student.mother_name) : card.student.mother_name;
  const totalPercent = card.total_full > 0 ? ((card.total_marks / card.total_full) * 100).toFixed(1) : '0';
  const gc = gradeColor(card.letter_grade);
  const sortedMarks = [...card.marks].sort((a, b) => b.percentage - a.percentage);
  const highestSubject = sortedMarks[0];
  const failedSubjects = card.marks.filter(m => m.percentage < 33);

  return (
    <div className="result-card w-[750px] overflow-hidden rounded-xl bg-white shadow-lg print:shadow-none relative" style={{ pageBreakInside: 'avoid', pageBreakAfter: 'always' }}>
      {showWatermark && (
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
          <span className="text-[120px] font-black text-slate-900 rotate-[-30deg] select-none">RESULT</span>
        </div>
      )}

      {/* School Header */}
      <div className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-800 px-6 py-5 text-white z-10">
        <div className="relative flex items-center gap-5">
          {institution.logo ? (
            <img src={institution.logo} alt="" className="h-16 w-16 rounded-full bg-white/20 object-contain p-1.5 ring-2 ring-white/30" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/30">
              <GraduationCap className="h-8 w-8 text-white/80" />
            </div>
          )}
          <div className="flex-1 text-center">
            <h2 className="text-2xl font-bold tracking-wide drop-shadow-sm">{schoolName}</h2>
            {institution.address && (
              <p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-blue-200">
                <MapPin className="h-3 w-3" /> {institution.address}
              </p>
            )}
            <div className="mt-1 flex items-center justify-center gap-4 text-[10px] text-blue-300">
              {institution.phone && <span className="flex items-center gap-1"><Phone className="h-2.5 w-2.5" /> {institution.phone}</span>}
              {institution.eiin && <span className="flex items-center gap-1"><Hash className="h-2.5 w-2.5" /> EIIN: {institution.eiin}</span>}
            </div>
          </div>
          <div className="w-16" />
        </div>
        <div className="relative mt-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-1.5 backdrop-blur-sm">
            <Award className="h-4 w-4" />
            <span className="text-sm font-bold tracking-widest uppercase">Academic Result Card</span>
          </div>
        </div>
      </div>

      {/* Exam Term Banner */}
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-100 to-blue-50 px-6 py-2.5 border-b border-slate-200 z-10 relative">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-blue-600" />
          <span className="font-semibold text-slate-700">{examTerm.name}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          {examTerm.session && <span>Session: <strong className="text-slate-700">{examTerm.session}</strong></span>}
          {examTerm.start_date && <span>{formatDate(examTerm.start_date)} — {formatDate(examTerm.end_date)}</span>}
        </div>
      </div>

      {/* Student Info */}
      <div className="grid grid-cols-[auto_1fr_1fr] gap-5 px-6 py-4 border-b border-slate-200 relative z-10">
        <div className="row-span-2">
          {card.student.photo ? (
            <img src={card.student.photo} alt="" className="h-24 w-20 rounded-lg border-2 border-slate-200 object-cover shadow-sm" />
          ) : (
            <div className="flex h-24 w-20 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50">
              <UserCircle className="h-12 w-12 text-slate-300" />
            </div>
          )}
        </div>
        <div className="space-y-1.5 text-sm">
          <div>
            <span className="text-[10px] font-semibold uppercase text-slate-400">Student Name</span>
            <p className="text-lg font-bold text-slate-800 -mt-0.5">{studentName}</p>
          </div>
          {fatherName && (
            <div>
              <span className="text-[10px] font-semibold uppercase text-slate-400">Father&apos;s Name</span>
              <p className="text-sm font-medium text-slate-700 -mt-0.5">{fatherName}</p>
            </div>
          )}
          {motherName && (
            <div>
              <span className="text-[10px] font-semibold uppercase text-slate-400">Mother&apos;s Name</span>
              <p className="text-sm font-medium text-slate-700 -mt-0.5">{motherName}</p>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>
              <span className="text-[10px] font-semibold uppercase text-slate-400">Student ID</span>
              <p className="font-mono font-semibold text-slate-700">{card.student.student_id}</p>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase text-slate-400">Class &amp; Section</span>
              <p className="font-semibold text-slate-700">{card.enrollment.class_name} ({card.enrollment.section_name})</p>
            </div>
            {card.enrollment.roll_no && (
              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400">Roll No</span>
                <p className="font-semibold text-slate-700">{card.enrollment.roll_no}</p>
              </div>
            )}
            {card.student.date_of_birth && (
              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400">Date of Birth</span>
                <p className="font-semibold text-slate-700">{formatDate(card.student.date_of_birth)}</p>
              </div>
            )}
            {card.student.gender && (
              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400">Gender</span>
                <p className="font-semibold text-slate-700 capitalize">{card.student.gender}</p>
              </div>
            )}
            {card.student.blood_group && (
              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400">Blood Group</span>
                <p className="font-semibold text-slate-700 flex items-center gap-1">
                  <Droplets className="h-3 w-3 text-red-400" /> {card.student.blood_group}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Marks Table */}
      <div className="px-6 py-4 relative z-10">
        <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gradient-to-r from-slate-700 to-slate-600 text-white">
              <th className="px-3 py-2.5 text-left text-xs font-semibold w-10">SL</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold">Subject</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold w-20">Full Marks</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold w-20">Obtained</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold w-16">%</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold w-16">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {card.marks.map((m, i) => {
              const isPassed = m.percentage >= 33;
              return (
                <tr key={i} className={`${!isPassed ? 'bg-red-50/60' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                  <td className="px-3 py-2 text-slate-400 text-xs">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-slate-700">
                    {isBn ? (m.subject_name_bn || m.subject_name) : m.subject_name}
                    {highestSubject === m && <Star className="inline h-3 w-3 ml-1 text-amber-400 fill-amber-400" />}
                  </td>
                  <td className="px-3 py-2 text-center text-slate-500">{m.full_marks}</td>
                  <td className={`px-3 py-2 text-center font-bold ${!isPassed ? 'text-red-600' : 'text-slate-800'}`}>
                    {m.marks_obtained ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-block min-w-[44px] rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      m.percentage >= 80 ? 'bg-emerald-100 text-emerald-700' :
                      m.percentage >= 60 ? 'bg-blue-100 text-blue-700' :
                      m.percentage >= 40 ? 'bg-amber-100 text-amber-700' :
                      m.percentage >= 33 ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {m.percentage}%
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-[10px] font-bold ${isPassed ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isPassed ? '✓ Pass' : '✗ Fail'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gradient-to-r from-slate-700 to-slate-600 text-white font-bold">
              <td className="px-3 py-2.5" />
              <td className="px-3 py-2.5 text-sm">Total</td>
              <td className="px-3 py-2.5 text-center text-sm">{card.total_full}</td>
              <td className="px-3 py-2.5 text-center text-sm">{card.total_marks}</td>
              <td className="px-3 py-2.5 text-center text-sm">{totalPercent}%</td>
              <td className="px-3 py-2.5 text-center">
                <span className={`text-[10px] font-bold ${failedSubjects.length === 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {failedSubjects.length === 0 ? 'PASSED' : `${failedSubjects.length} Failed`}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Result Summary */}
      <div className="mx-6 mb-4 rounded-xl border-2 border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 p-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {card.gpa != null && (
              <div className="text-center rounded-xl bg-white border border-blue-200 px-5 py-2.5 shadow-sm">
                <p className="text-3xl font-black text-blue-700">{card.gpa.toFixed(2)}</p>
                <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">GPA</p>
              </div>
            )}
            {card.letter_grade && (
              <div className={`text-center rounded-xl bg-white border ${gc.border} px-5 py-2.5 shadow-sm`}>
                <p className={`text-3xl font-black ${gc.text}`}>{card.letter_grade}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Grade</p>
              </div>
            )}
            {card.position != null && (
              <div className="text-center rounded-xl bg-white border border-violet-200 px-5 py-2.5 shadow-sm">
                <div className="flex items-baseline justify-center gap-0.5">
                  <p className="text-3xl font-black text-violet-700">{card.position}</p>
                  <span className="text-xs text-violet-400">
                    {card.position === 1 ? 'st' : card.position === 2 ? 'nd' : card.position === 3 ? 'rd' : 'th'}
                  </span>
                </div>
                <p className="text-[9px] font-bold text-violet-400 uppercase tracking-wider">Position</p>
              </div>
            )}
          </div>
          <div className="text-right space-y-1 text-xs text-slate-500">
            {card.total_students && (
              <p className="flex items-center justify-end gap-1">
                <Users className="h-3 w-3" /> Total Students: <strong className="text-slate-700">{card.total_students}</strong>
              </p>
            )}
            <p className="flex items-center justify-end gap-1">
              <BookOpen className="h-3 w-3" /> Subjects: <strong className="text-slate-700">{card.marks.length}</strong>
            </p>
            {highestSubject && (
              <p className="flex items-center justify-end gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" /> Highest: <strong className="text-emerald-600">{highestSubject.subject_name} ({highestSubject.percentage}%)</strong>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Grade Scale compact */}
      <div className="mx-6 mb-4 relative z-10">
        <div className="flex items-center gap-1 flex-wrap justify-center">
          {GRADE_SCALE.map((g) => (
            <span key={g.grade} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${g.bg} ${g.text} ${g.border}`}>
              {g.grade} ({g.range}%)
            </span>
          ))}
        </div>
      </div>

      {/* Signature Area */}
      <div className="grid grid-cols-3 gap-8 border-t-2 border-slate-200 px-6 py-8 relative z-10">
        <div className="text-center">
          <div className="mx-auto mb-2 h-px w-32 bg-slate-400" />
          <p className="text-xs font-semibold text-slate-500">Class Teacher</p>
        </div>
        <div className="text-center">
          <div className="mx-auto mb-2 h-px w-32 bg-slate-400" />
          <p className="text-xs font-semibold text-slate-500">Guardian</p>
        </div>
        <div className="text-center">
          <div className="mx-auto mb-2 h-px w-32 bg-slate-400" />
          <p className="text-xs font-semibold text-slate-500">Principal</p>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-100 px-6 py-2 text-center text-[9px] text-slate-400 border-t border-slate-200 relative z-10">
        <p>This is a computer-generated result card. Printed on {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}.</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CERTIFICATE OF ACHIEVEMENT — Printable
   ───────────────────────────────────────────────────────────────────────────── */

function CertificateCard({
  card,
  examTerm,
  institution,
  locale,
}: {
  card: StudentCard;
  examTerm: BulkData['exam_term'];
  institution: InstitutionInfo;
  locale: string;
}) {
  const isBn = locale === 'bn';
  const schoolName = isBn ? (institution.name_bn || institution.name) : institution.name;
  const studentName = isBn ? (card.student.name_bn || card.student.name) : card.student.name;
  const fatherName = isBn ? (card.student.father_name_bn || card.student.father_name) : card.student.father_name;
  const totalPercent = card.total_full > 0 ? ((card.total_marks / card.total_full) * 100) : 0;
  const certNo = `CERT-${card.student.student_id}-${examTerm.id}`;
  const issueDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const getRemarks = (gpa?: number) => {
    if (!gpa) return 'Need Improvement';
    if (gpa >= 5.0) return 'Outstanding';
    if (gpa >= 4.0) return 'Excellent';
    if (gpa >= 3.5) return 'Very Good';
    if (gpa >= 3.0) return 'Good';
    if (gpa >= 2.0) return 'Average';
    if (gpa >= 1.0) return 'Below Average';
    return 'Needs Improvement';
  };

  const isPassed = card.letter_grade !== 'F' && card.letter_grade != null;
  const isDistinction = (card.gpa ?? 0) >= 5.0;

  return (
    <div className="certificate-card" style={{ width: 800, minHeight: 580, position: 'relative', overflow: 'hidden', background: '#fff', pageBreakInside: 'avoid', pageBreakAfter: 'always' }}>
      {/* Decorative border */}
      <div style={{ position: 'absolute', inset: 8, border: '3px double #1e3a8a', borderRadius: 12, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 14, border: '1px solid #93c5fd', borderRadius: 8, pointerEvents: 'none' }} />

      {/* Corner ornaments */}
      <div style={{ position: 'absolute', top: 20, left: 20, width: 60, height: 60, borderTop: '3px solid #d4af37', borderLeft: '3px solid #d4af37', borderRadius: '8px 0 0 0' }} />
      <div style={{ position: 'absolute', top: 20, right: 20, width: 60, height: 60, borderTop: '3px solid #d4af37', borderRight: '3px solid #d4af37', borderRadius: '0 8px 0 0' }} />
      <div style={{ position: 'absolute', bottom: 20, left: 20, width: 60, height: 60, borderBottom: '3px solid #d4af37', borderLeft: '3px solid #d4af37', borderRadius: '0 0 0 8px' }} />
      <div style={{ position: 'absolute', bottom: 20, right: 20, width: 60, height: 60, borderBottom: '3px solid #d4af37', borderRight: '3px solid #d4af37', borderRadius: '0 0 8px 0' }} />

      {/* Content */}
      <div style={{ position: 'relative', padding: '40px 50px 30px', textAlign: 'center' }}>
        {/* School logo + name */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 4 }}>
          {institution.logo && (
            <img src={institution.logo} alt="" style={{ height: 56, width: 56, borderRadius: '50%', objectFit: 'contain', border: '2px solid #e2e8f0', padding: 2 }} />
          )}
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e3a8a', letterSpacing: 1, margin: 0 }}>{schoolName}</h1>
            {institution.address && <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>{institution.address}</p>}
            {institution.eiin && <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0' }}>EIIN: {institution.eiin}</p>}
          </div>
        </div>

        {/* Title */}
        <div style={{ margin: '20px 0 8px' }}>
          <div style={{ display: 'inline-block', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', padding: '8px 36px', borderRadius: 50 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: 3, textTransform: 'uppercase', margin: 0 }}>Certificate of Achievement</h2>
          </div>
          {isDistinction && (
            <p style={{ fontSize: 12, color: '#d4af37', fontWeight: 700, marginTop: 6, letterSpacing: 2, textTransform: 'uppercase' }}>★ With Distinction ★</p>
          )}
        </div>

        {/* Certificate body */}
        <div style={{ margin: '24px 0', lineHeight: 2, fontSize: 14, color: '#334155' }}>
          <p>This is to certify that</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: '#1e3a8a', margin: '4px 0', fontFamily: 'Georgia, serif' }}>{studentName}</p>
          {fatherName && <p style={{ fontSize: 12, color: '#64748b' }}>Son/Daughter of <strong style={{ color: '#334155' }}>{fatherName}</strong></p>}
          <p style={{ marginTop: 4 }}>Student ID: <strong>{card.student.student_id}</strong> &nbsp;|&nbsp; Class: <strong>{card.enrollment.class_name} ({card.enrollment.section_name})</strong>
            {card.enrollment.roll_no && <> &nbsp;|&nbsp; Roll No: <strong>{card.enrollment.roll_no}</strong></>}
          </p>
          <p style={{ marginTop: 8 }}>
            has successfully {isPassed ? 'passed' : 'appeared in'} the <strong style={{ color: '#1e3a8a' }}>{examTerm.name}</strong>
            {examTerm.session && <> of <strong>Session {examTerm.session}</strong></>}
          </p>
          {isPassed && card.gpa != null && (
            <p style={{ marginTop: 4 }}>
              and obtained GPA <span style={{ fontSize: 22, fontWeight: 800, color: '#1e3a8a', margin: '0 4px' }}>{card.gpa.toFixed(2)}</span> out of 5.00
              {card.letter_grade && <> (Grade: <strong style={{ color: '#1e3a8a' }}>{card.letter_grade}</strong>)</>}
            </p>
          )}
          {card.position != null && (
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              securing position <strong style={{ color: '#1e3a8a' }}>{card.position}</strong> among {card.total_students} students
            </p>
          )}
        </div>

        {/* Result summary boxes */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, margin: '20px 0' }}>
          <div style={{ textAlign: 'center', padding: '10px 20px', border: '2px solid #dbeafe', borderRadius: 12, background: '#eff6ff', minWidth: 100 }}>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#1e3a8a', margin: 0 }}>{card.total_marks}</p>
            <p style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, margin: 0 }}>Total Marks</p>
          </div>
          <div style={{ textAlign: 'center', padding: '10px 20px', border: '2px solid #dbeafe', borderRadius: 12, background: '#eff6ff', minWidth: 100 }}>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#1e3a8a', margin: 0 }}>{totalPercent.toFixed(1)}%</p>
            <p style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, margin: 0 }}>Percentage</p>
          </div>
          {card.gpa != null && (
            <div style={{ textAlign: 'center', padding: '10px 20px', border: '2px solid #dbeafe', borderRadius: 12, background: '#eff6ff', minWidth: 100 }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#1e3a8a', margin: 0 }}>{card.gpa.toFixed(2)}</p>
              <p style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, margin: 0 }}>GPA</p>
            </div>
          )}
          <div style={{ textAlign: 'center', padding: '10px 20px', border: '2px solid #dbeafe', borderRadius: 12, background: '#eff6ff', minWidth: 100 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', margin: 0 }}>{getRemarks(card.gpa ?? undefined)}</p>
            <p style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, margin: 0 }}>Remarks</p>
          </div>
        </div>

        {/* Signatures */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 48, marginTop: 36, padding: '0 20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 120, margin: '0 auto 8px', borderBottom: '1.5px solid #475569' }} />
            <p style={{ fontSize: 11, fontWeight: 600, color: '#475569', margin: 0 }}>Class Teacher</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 120, margin: '0 auto 8px', borderBottom: '1.5px solid #475569' }} />
            <p style={{ fontSize: 11, fontWeight: 600, color: '#475569', margin: 0 }}>Controller of Examinations</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 120, margin: '0 auto 8px', borderBottom: '1.5px solid #475569' }} />
            <p style={{ fontSize: 11, fontWeight: 600, color: '#475569', margin: 0 }}>Principal</p>
          </div>
        </div>

        {/* Footer meta */}
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#94a3b8', padding: '0 10px' }}>
          <span>Certificate No: {certNo}</span>
          <span>Date of Issue: {issueDate}</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ACADEMIC TRANSCRIPT — Printable
   ───────────────────────────────────────────────────────────────────────────── */

function TranscriptCard({
  card,
  examTerm,
  institution,
  locale,
}: {
  card: StudentCard;
  examTerm: BulkData['exam_term'];
  institution: InstitutionInfo;
  locale: string;
}) {
  const isBn = locale === 'bn';
  const schoolName = isBn ? (institution.name_bn || institution.name) : institution.name;
  const studentName = isBn ? (card.student.name_bn || card.student.name) : card.student.name;
  const fatherName = isBn ? (card.student.father_name_bn || card.student.father_name) : card.student.father_name;
  const motherName = isBn ? (card.student.mother_name_bn || card.student.mother_name) : card.student.mother_name;
  const totalPercent = card.total_full > 0 ? ((card.total_marks / card.total_full) * 100) : 0;
  const issueDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const failedSubjects = card.marks.filter(m => m.percentage < 33);
  const isPassed = failedSubjects.length === 0;

  const getGradeForSubject = (pct: number) => {
    if (pct >= 80) return { grade: 'A+', gp: '5.00' };
    if (pct >= 70) return { grade: 'A', gp: '4.00' };
    if (pct >= 60) return { grade: 'A-', gp: '3.50' };
    if (pct >= 50) return { grade: 'B', gp: '3.00' };
    if (pct >= 40) return { grade: 'C', gp: '2.00' };
    if (pct >= 33) return { grade: 'D', gp: '1.00' };
    return { grade: 'F', gp: '0.00' };
  };

  return (
    <div className="transcript-card" style={{ width: 800, position: 'relative', overflow: 'hidden', background: '#fff', pageBreakInside: 'avoid', pageBreakAfter: 'always' }}>
      {/* Top border accent */}
      <div style={{ height: 6, background: 'linear-gradient(90deg, #1e3a8a, #3b82f6, #1e3a8a)' }} />

      {/* Header */}
      <div style={{ padding: '24px 40px 16px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          {institution.logo && (
            <img src={institution.logo} alt="" style={{ height: 52, width: 52, borderRadius: '50%', objectFit: 'contain', border: '2px solid #e2e8f0', padding: 2 }} />
          )}
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e3a8a', margin: 0, letterSpacing: 1 }}>{schoolName}</h1>
            {institution.address && <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>{institution.address}</p>}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
              {institution.phone && <span>☎ {institution.phone}</span>}
              {institution.eiin && <span>EIIN: {institution.eiin}</span>}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'inline-block', background: '#f1f5f9', padding: '6px 32px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#334155', letterSpacing: 3, textTransform: 'uppercase', margin: 0 }}>Academic Transcript</h2>
        </div>
      </div>

      {/* Student information block */}
      <div style={{ padding: '16px 40px', display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '12px 24px', borderBottom: '1px solid #e2e8f0', fontSize: 12 }}>
        <div style={{ gridRow: 'span 3' }}>
          {card.student.photo ? (
            <img src={card.student.photo} alt="" style={{ width: 72, height: 88, borderRadius: 8, objectFit: 'cover', border: '2px solid #e2e8f0' }} />
          ) : (
            <div style={{ width: 72, height: 88, borderRadius: 8, border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
              <span style={{ fontSize: 32, color: '#cbd5e1' }}>👤</span>
            </div>
          )}
        </div>
        <div>
          <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1 }}>Student Name</span>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', margin: '0' }}>{studentName}</p>
        </div>
        <div>
          <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1 }}>Student ID</span>
          <p style={{ fontWeight: 600, color: '#334155', margin: 0, fontFamily: 'monospace' }}>{card.student.student_id}</p>
        </div>
        {fatherName && (
          <div>
            <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1 }}>Father&apos;s Name</span>
            <p style={{ fontWeight: 500, color: '#334155', margin: 0 }}>{fatherName}</p>
          </div>
        )}
        {motherName && (
          <div>
            <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1 }}>Mother&apos;s Name</span>
            <p style={{ fontWeight: 500, color: '#334155', margin: 0 }}>{motherName}</p>
          </div>
        )}
        <div style={{ display: 'flex', gap: 24 }}>
          <div>
            <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1 }}>Class & Section</span>
            <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>{card.enrollment.class_name} ({card.enrollment.section_name})</p>
          </div>
          {card.enrollment.roll_no && (
            <div>
              <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1 }}>Roll No</span>
              <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>{card.enrollment.roll_no}</p>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <div>
            <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1 }}>Exam</span>
            <p style={{ fontWeight: 600, color: '#1e3a8a', margin: 0 }}>{examTerm.name}</p>
          </div>
          {examTerm.session && (
            <div>
              <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1 }}>Session</span>
              <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>{examTerm.session}</p>
            </div>
          )}
          {card.student.date_of_birth && (
            <div>
              <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1 }}>Date of Birth</span>
              <p style={{ fontWeight: 500, color: '#334155', margin: 0 }}>{formatDate(card.student.date_of_birth)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Subject-wise marks table */}
      <div style={{ padding: '16px 40px' }}>
        <h3 style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Subject-wise Results</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', color: '#fff', fontSize: 10, fontWeight: 600, width: 40 }}>Sl.</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', color: '#fff', fontSize: 10, fontWeight: 600 }}>Subject Name</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', color: '#fff', fontSize: 10, fontWeight: 600, width: 70 }}>Full Marks</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', color: '#fff', fontSize: 10, fontWeight: 600, width: 70 }}>Obtained</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', color: '#fff', fontSize: 10, fontWeight: 600, width: 50 }}>%</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', color: '#fff', fontSize: 10, fontWeight: 600, width: 50 }}>Grade</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', color: '#fff', fontSize: 10, fontWeight: 600, width: 40 }}>GP</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', color: '#fff', fontSize: 10, fontWeight: 600, width: 50 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {card.marks.map((m, i) => {
              const passed = m.percentage >= 33;
              const sg = getGradeForSubject(m.percentage);
              return (
                <tr key={i} style={{ background: !passed ? '#fef2f2' : i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '7px 12px', color: '#94a3b8', fontSize: 11 }}>{i + 1}</td>
                  <td style={{ padding: '7px 12px', fontWeight: 600, color: '#334155' }}>
                    {isBn ? (m.subject_name_bn || m.subject_name) : m.subject_name}
                  </td>
                  <td style={{ padding: '7px 12px', textAlign: 'center', color: '#64748b' }}>{m.full_marks}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'center', fontWeight: 700, color: passed ? '#1e293b' : '#dc2626' }}>
                    {m.marks_obtained ?? '—'}
                  </td>
                  <td style={{ padding: '7px 12px', textAlign: 'center', color: '#64748b' }}>{m.percentage}%</td>
                  <td style={{ padding: '7px 12px', textAlign: 'center', fontWeight: 700, color: '#1e3a8a' }}>{sg.grade}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'center', color: '#475569' }}>{sg.gp}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'center', fontWeight: 600, fontSize: 10, color: passed ? '#16a34a' : '#dc2626' }}>
                    {passed ? '✓ Pass' : '✗ Fail'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', color: '#fff', fontWeight: 700 }}>
              <td style={{ padding: '8px 12px' }} />
              <td style={{ padding: '8px 12px' }}>Total</td>
              <td style={{ padding: '8px 12px', textAlign: 'center' }}>{card.total_full}</td>
              <td style={{ padding: '8px 12px', textAlign: 'center' }}>{card.total_marks}</td>
              <td style={{ padding: '8px 12px', textAlign: 'center' }}>{totalPercent.toFixed(1)}%</td>
              <td style={{ padding: '8px 12px', textAlign: 'center' }}>{card.letter_grade ?? '—'}</td>
              <td style={{ padding: '8px 12px', textAlign: 'center' }}>{card.gpa?.toFixed(2) ?? '—'}</td>
              <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: 10 }}>
                {isPassed ? '✓ PASSED' : `${failedSubjects.length} Failed`}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Overall Result summary */}
      <div style={{ margin: '0 40px 16px', padding: 16, borderRadius: 10, border: '2px solid #dbeafe', background: 'linear-gradient(135deg, #eff6ff, #f0f4ff)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
          {card.gpa != null && (
            <div>
              <p style={{ fontSize: 28, fontWeight: 800, color: '#1e3a8a', margin: 0 }}>{card.gpa.toFixed(2)}</p>
              <p style={{ fontSize: 9, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>GPA (out of 5.00)</p>
            </div>
          )}
          {card.letter_grade && (
            <div>
              <p style={{ fontSize: 28, fontWeight: 800, color: '#1e3a8a', margin: 0 }}>{card.letter_grade}</p>
              <p style={{ fontSize: 9, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Letter Grade</p>
            </div>
          )}
          {card.position != null && (
            <div>
              <p style={{ fontSize: 28, fontWeight: 800, color: '#1e3a8a', margin: 0 }}>{card.position}</p>
              <p style={{ fontSize: 9, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
                Position (of {card.total_students})
              </p>
            </div>
          )}
          <div>
            <p style={{ fontSize: 28, fontWeight: 800, color: isPassed ? '#16a34a' : '#dc2626', margin: 0 }}>{isPassed ? 'PASSED' : 'FAILED'}</p>
            <p style={{ fontSize: 9, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Overall Status</p>
          </div>
        </div>
      </div>

      {/* Grade scale */}
      <div style={{ padding: '0 40px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
          {GRADE_SCALE.map(g => (
            <span key={g.grade} style={{ fontSize: 8, padding: '2px 8px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 600 }}>
              {g.grade} = {g.range}% (GP: {g.gpa.toFixed(2)})
            </span>
          ))}
        </div>
      </div>

      {/* Signatures */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 48, padding: '20px 40px', borderTop: '2px solid #e2e8f0' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 110, margin: '0 auto 6px', borderBottom: '1.5px solid #475569' }} />
          <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', margin: 0 }}>Class Teacher</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 110, margin: '0 auto 6px', borderBottom: '1.5px solid #475569' }} />
          <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', margin: 0 }}>Controller of Examinations</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 110, margin: '0 auto 6px', borderBottom: '1.5px solid #475569' }} />
          <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', margin: 0 }}>Principal</p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#f8fafc', padding: '8px 40px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#94a3b8' }}>
        <span>This is a computer-generated transcript.</span>
        <span>Issued on: {issueDate}</span>
      </div>

      {/* Bottom border accent */}
      <div style={{ height: 4, background: 'linear-gradient(90deg, #1e3a8a, #3b82f6, #1e3a8a)' }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   INDIVIDUAL RESULT SHEET — Combined marks for all exam terms
   ───────────────────────────────────────────────────────────────────────────── */

function IndividualResultSheet({
  data,
  institution,
  locale,
}: {
  data: IndividualData;
  institution: InstitutionInfo;
  locale: string;
}) {
  const isBn = locale === 'bn';
  const schoolName = isBn ? (institution.name_bn || institution.name) : institution.name;
  const studentName = isBn ? (data.student.name_bn || data.student.name) : data.student.name;
  const fatherName = isBn ? (data.student.father_name_bn || data.student.father_name) : data.student.father_name;
  const motherName = isBn ? (data.student.mother_name_bn || data.student.mother_name) : data.student.mother_name;
  const enrollment = data.enrollment;
  const reportCards = data.report_cards;

  // Collect all unique subjects from all exam terms
  const subjectOrder: string[] = [];
  const subjectBn: Record<string, string> = {};
  reportCards.forEach(rc => {
    rc.marks.forEach(m => {
      if (!subjectOrder.includes(m.subject_name)) {
        subjectOrder.push(m.subject_name);
        subjectBn[m.subject_name] = m.subject_name_bn || '';
      }
    });
  });

  // Build marks lookup: subject_name -> exam_term_id -> MarkItem
  const marksLookup: Record<string, Record<number, MarkItem>> = {};
  reportCards.forEach(rc => {
    rc.marks.forEach(m => {
      if (!marksLookup[m.subject_name]) marksLookup[m.subject_name] = {};
      marksLookup[m.subject_name][rc.exam_term.id] = m;
    });
  });

  const getGrade = (pct: number) => {
    if (pct >= 80) return 'A+';
    if (pct >= 70) return 'A';
    if (pct >= 60) return 'A-';
    if (pct >= 50) return 'B';
    if (pct >= 40) return 'C';
    if (pct >= 33) return 'D';
    return 'F';
  };

  const issueDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const thStyle: React.CSSProperties = { padding: '8px 10px', fontSize: 11, fontWeight: 700, textAlign: 'center', color: '#fff', borderRight: '1px solid rgba(255,255,255,0.2)' };
  const tdStyle: React.CSSProperties = { padding: '6px 10px', fontSize: 12, textAlign: 'center', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' };
  const tdLeftStyle: React.CSSProperties = { ...tdStyle, textAlign: 'left', fontWeight: 600, color: '#334155' };

  return (
    <div className="result-sheet" style={{ width: 800, background: '#fff', pageBreakInside: 'avoid', pageBreakAfter: 'always', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      {/* Top accent */}
      <div style={{ height: 5, background: 'linear-gradient(90deg, #1e3a8a, #3b82f6, #1e3a8a)' }} />

      {/* School Header */}
      <div style={{ padding: '20px 32px 12px', textAlign: 'center', borderBottom: '2px solid #1e3a8a' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          {institution.logo && (
            <img src={institution.logo} alt="" style={{ height: 52, width: 52, borderRadius: '50%', objectFit: 'contain', border: '2px solid #e2e8f0', padding: 2 }} />
          )}
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e3a8a', margin: 0, letterSpacing: 1 }}>{schoolName}</h1>
            {institution.address && <p style={{ fontSize: 10, color: '#64748b', margin: '2px 0 0' }}>{institution.address}</p>}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
              {institution.phone && <span>☎ {institution.phone}</span>}
              {institution.eiin && <span>EIIN: {institution.eiin}</span>}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10, display: 'inline-block', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', padding: '6px 30px', borderRadius: 4 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 3, textTransform: 'uppercase', margin: 0 }}>Academic Result Sheet</h2>
        </div>
        {enrollment?.session_name && (
          <p style={{ fontSize: 12, color: '#475569', marginTop: 6, fontWeight: 600 }}>Session: {enrollment.session_name}</p>
        )}
      </div>

      {/* Student Info */}
      <div style={{ padding: '14px 32px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 20px', borderBottom: '1px solid #e2e8f0', fontSize: 12 }}>
        <div style={{ gridRow: 'span 2' }}>
          {data.student.photo ? (
            <img src={data.student.photo} alt="" style={{ width: 72, height: 88, borderRadius: 8, objectFit: 'cover', border: '2px solid #e2e8f0' }} />
          ) : (
            <div style={{ width: 72, height: 88, borderRadius: 8, border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
              <span style={{ fontSize: 32, color: '#cbd5e1' }}>👤</span>
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 20px' }}>
          <div>
            <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1 }}>Student Name</span>
            <p style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', margin: 0 }}>{studentName}</p>
          </div>
          <div>
            <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1 }}>Student ID</span>
            <p style={{ fontWeight: 600, color: '#334155', margin: 0, fontFamily: 'monospace' }}>{data.student.student_id}</p>
          </div>
          <div>
            <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1 }}>Class Roll No</span>
            <p style={{ fontWeight: 700, fontSize: 18, color: '#1e3a8a', margin: 0 }}>{enrollment?.roll_no ?? '—'}</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 20px' }}>
          <div>
            <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1 }}>Class &amp; Section</span>
            <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>{enrollment?.class_name ?? '—'} ({enrollment?.section_name ?? '—'})</p>
          </div>
          {fatherName && (
            <div>
              <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1 }}>Father&apos;s Name</span>
              <p style={{ fontWeight: 500, color: '#334155', margin: 0 }}>{fatherName}</p>
            </div>
          )}
          {motherName && (
            <div>
              <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1 }}>Mother&apos;s Name</span>
              <p style={{ fontWeight: 500, color: '#334155', margin: 0 }}>{motherName}</p>
            </div>
          )}
          {data.student.date_of_birth && (
            <div>
              <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1 }}>Date of Birth</span>
              <p style={{ fontWeight: 500, color: '#334155', margin: 0 }}>{formatDate(data.student.date_of_birth)}</p>
            </div>
          )}
          {data.student.gender && (
            <div>
              <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1 }}>Gender</span>
              <p style={{ fontWeight: 500, color: '#334155', margin: 0, textTransform: 'capitalize' }}>{data.student.gender}</p>
            </div>
          )}
          {data.student.blood_group && (
            <div>
              <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1 }}>Blood Group</span>
              <p style={{ fontWeight: 500, color: '#334155', margin: 0 }}>🩸 {data.student.blood_group}</p>
            </div>
          )}
        </div>
      </div>

      {/* Combined Marks Table */}
      <div style={{ padding: '14px 32px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)' }}>
              <th style={{ ...thStyle, width: 36, borderBottom: '1px solid rgba(255,255,255,0.2)' }} rowSpan={2}>SL</th>
              <th style={{ ...thStyle, textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.2)' }} rowSpan={2}>Subject</th>
              {reportCards.map(rc => (
                <th key={rc.exam_term.id} style={{ ...thStyle, borderBottom: '1px solid rgba(255,255,255,0.2)' }} colSpan={3}>
                  {rc.exam_term.name}
                </th>
              ))}
            </tr>
            <tr style={{ background: '#334155' }}>
              {reportCards.map(rc => (
                <Fragment key={`hdr-${rc.exam_term.id}`}>
                  <th style={{ ...thStyle, fontSize: 9, padding: '5px 6px' }}>FM</th>
                  <th style={{ ...thStyle, fontSize: 9, padding: '5px 6px' }}>Marks</th>
                  <th style={{ ...thStyle, fontSize: 9, padding: '5px 6px' }}>Grade</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {subjectOrder.map((subj, i) => (
              <tr key={subj} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={{ ...tdStyle, color: '#94a3b8', fontSize: 11 }}>{i + 1}</td>
                <td style={tdLeftStyle}>{isBn ? (subjectBn[subj] || subj) : subj}</td>
                {reportCards.map(rc => {
                  const mark = marksLookup[subj]?.[rc.exam_term.id];
                  if (!mark) {
                    return (
                      <Fragment key={`m-${rc.exam_term.id}`}>
                        <td style={tdStyle}>—</td>
                        <td style={tdStyle}>—</td>
                        <td style={tdStyle}>—</td>
                      </Fragment>
                    );
                  }
                  const passed = mark.percentage >= 33;
                  const grade = getGrade(mark.percentage);
                  return (
                    <Fragment key={`m-${rc.exam_term.id}`}>
                      <td style={{ ...tdStyle, color: '#64748b' }}>{mark.full_marks}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: passed ? '#1e293b' : '#dc2626' }}>{mark.marks_obtained}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: grade === 'F' ? '#dc2626' : '#1e3a8a', fontSize: 11 }}>{grade}</td>
                    </Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#1e293b', color: '#fff', fontWeight: 700 }}>
              <td style={{ ...thStyle, fontSize: 12 }} />
              <td style={{ ...thStyle, fontSize: 12, textAlign: 'left' }}>Total</td>
              {reportCards.map(rc => (
                <Fragment key={`t-${rc.exam_term.id}`}>
                  <td style={{ ...thStyle, fontSize: 12 }}>{rc.total_full}</td>
                  <td style={{ ...thStyle, fontSize: 12 }}>{rc.total_marks}</td>
                  <td style={{ ...thStyle, fontSize: 12 }} />
                </Fragment>
              ))}
            </tr>
            <tr style={{ background: '#e0e7ff' }}>
              <td style={{ padding: '8px 10px', borderRight: '1px solid #c7d2fe' }} />
              <td style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#1e3a8a', borderRight: '1px solid #c7d2fe' }}>GPA</td>
              {reportCards.map(rc => (
                <Fragment key={`g-${rc.exam_term.id}`}>
                  <td style={{ padding: '8px 10px', borderRight: '1px solid #c7d2fe' }} />
                  <td style={{ padding: '8px 10px', fontWeight: 800, fontSize: 16, color: '#1e3a8a', borderRight: '1px solid #c7d2fe', textAlign: 'center' }}>{rc.gpa?.toFixed(2) ?? '—'}</td>
                  <td style={{ padding: '8px 10px', borderRight: '1px solid #c7d2fe' }} />
                </Fragment>
              ))}
            </tr>
            <tr style={{ background: '#eff6ff' }}>
              <td style={tdStyle} />
              <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 600, color: '#475569' }}>Letter Grade</td>
              {reportCards.map(rc => (
                <Fragment key={`lg-${rc.exam_term.id}`}>
                  <td style={tdStyle} />
                  <td style={{ ...tdStyle, fontWeight: 700, fontSize: 14, color: '#1e3a8a' }}>{rc.letter_grade ?? '—'}</td>
                  <td style={tdStyle} />
                </Fragment>
              ))}
            </tr>
            <tr style={{ background: '#f8fafc' }}>
              <td style={tdStyle} />
              <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 600, color: '#475569' }}>Position</td>
              {reportCards.map(rc => (
                <Fragment key={`p-${rc.exam_term.id}`}>
                  <td style={tdStyle} />
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#475569' }}>
                    {rc.position != null ? `${rc.position} / ${rc.total_students ?? ''}` : '—'}
                  </td>
                  <td style={tdStyle} />
                </Fragment>
              ))}
            </tr>
            <tr style={{ background: '#fff', borderTop: '2px solid #cbd5e1' }}>
              <td style={tdStyle} />
              <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 700, color: '#475569' }}>Status</td>
              {reportCards.map(rc => {
                const failed = rc.letter_grade === 'F' || !rc.letter_grade;
                return (
                  <Fragment key={`s-${rc.exam_term.id}`}>
                    <td style={tdStyle} />
                    <td style={{ ...tdStyle, fontWeight: 700, fontSize: 13, color: failed ? '#dc2626' : '#16a34a' }}>
                      {failed ? '✗ FAIL' : '✓ PASS'}
                    </td>
                    <td style={tdStyle} />
                  </Fragment>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Grade Scale */}
      <div style={{ padding: '4px 32px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
          {GRADE_SCALE.map(g => (
            <span key={g.grade} style={{ fontSize: 8, padding: '2px 8px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 600 }}>
              {g.grade} = {g.range}% (GP: {g.gpa.toFixed(2)})
            </span>
          ))}
        </div>
      </div>

      {/* Signatures */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 48, padding: '24px 40px', borderTop: '2px solid #e2e8f0' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 110, margin: '0 auto 6px', borderBottom: '1.5px solid #475569' }} />
          <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', margin: 0 }}>Class Teacher</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 110, margin: '0 auto 6px', borderBottom: '1.5px solid #475569' }} />
          <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', margin: 0 }}>Guardian</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 110, margin: '0 auto 6px', borderBottom: '1.5px solid #475569' }} />
          <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', margin: 0 }}>Principal</p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#f8fafc', padding: '6px 32px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#94a3b8' }}>
        <span>This is a computer-generated result sheet.</span>
        <span>Printed on: {issueDate}</span>
      </div>

      {/* Bottom accent */}
      <div style={{ height: 4, background: 'linear-gradient(90deg, #1e3a8a, #3b82f6, #1e3a8a)' }} />
    </div>
  );
}

/* ─── Print / PDF Utility ─── */

function openPrintWindow(contentHtml: string, title: string, docType: 'result' | 'certificate' | 'transcript' | 'sheet' = 'result') {
  const pw = window.open('', '_blank');
  if (!pw) return;
  const pageSize = docType === 'certificate' ? 'size: A4 landscape;' : 'size: A4;';
  pw.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Noto Sans Bengali', 'Segoe UI', system-ui, sans-serif; background: #f1f5f9; }
    .print-container { padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 30px; }
    .no-print { text-align: center; padding: 16px; margin-bottom: 8px; }

    /* Result card */
    .result-card { width: 750px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #fff; page-break-inside: avoid; page-break-after: always; }
    /* Certificate */
    .certificate-card { width: 800px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #fff; page-break-inside: avoid; page-break-after: always; }
    /* Transcript */
    .transcript-card { width: 800px; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; background: #fff; page-break-inside: avoid; page-break-after: always; }
    /* Result Sheet */
    .result-sheet { width: 800px; border: 1px solid #e2e8f0; overflow: hidden; background: #fff; page-break-inside: avoid; page-break-after: always; }

    table { border-collapse: collapse; width: 100%; }
    img { max-width: 100%; }

    /* Tailwind utility classes used in components */
    .relative { position: relative; }
    .absolute { position: absolute; }
    .flex { display: flex; }
    .flex-1 { flex: 1 1 0%; }
    .flex-col { flex-direction: column; }
    .items-center { align-items: center; }
    .items-baseline { align-items: baseline; }
    .justify-center { justify-content: center; }
    .justify-between { justify-content: space-between; }
    .justify-end { justify-content: flex-end; }
    .gap-1 { gap: 0.25rem; }
    .gap-2 { gap: 0.5rem; }
    .gap-3 { gap: 0.75rem; }
    .gap-4 { gap: 1rem; }
    .gap-5 { gap: 1.25rem; }
    .gap-8 { gap: 2rem; }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    .font-medium { font-weight: 500; }
    .font-black { font-weight: 900; }
    .font-mono { font-family: monospace; }
    .text-white { color: #fff; }
    .text-xs { font-size: 0.75rem; line-height: 1rem; }
    .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
    .text-lg { font-size: 1.125rem; }
    .text-xl { font-size: 1.25rem; }
    .text-2xl { font-size: 1.5rem; }
    .text-3xl { font-size: 1.875rem; }
    .leading-tight { line-height: 1.25; }
    .tracking-wide { letter-spacing: 0.025em; }
    .tracking-widest { letter-spacing: 0.1em; }
    .uppercase { text-transform: uppercase; }
    .capitalize { text-capitalize; }
    .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .w-full { width: 100%; }
    .h-full { height: 100%; }
    .w-16 { width: 4rem; }
    .h-16 { height: 4rem; }
    .w-20 { width: 5rem; }
    .h-24 { height: 6rem; }
    .w-32 { width: 8rem; }
    .overflow-hidden { overflow: hidden; }
    .rounded-full { border-radius: 9999px; }
    .rounded-xl { border-radius: 0.75rem; }
    .rounded-lg { border-radius: 0.5rem; }
    .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0,0,0,.05); }
    .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1); }
    .bg-white { background-color: #fff; }
    .border { border: 1px solid #e2e8f0; }
    .border-b { border-bottom: 1px solid #e2e8f0; }
    .border-t { border-top: 1px solid #e2e8f0; }
    .border-t-2 { border-top: 2px solid #e2e8f0; }
    .border-dashed { border-style: dashed; }
    .object-cover { object-fit: cover; }
    .object-contain { object-fit: contain; }
    .ring-2 { box-shadow: 0 0 0 2px; }
    .divide-y > * + * { border-top: 1px solid #f1f5f9; }
    .space-y-1 > * + * { margin-top: 0.25rem; }
    .inline { display: inline; }
    .inline-block { display: inline-block; }
    .inline-flex { display: inline-flex; }
    .fill-amber-400 { fill: #fbbf24; }
    .grid { display: grid; }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .row-span-2 { grid-row: span 2; }
    .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
    .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .px-5 { padding-left: 1.25rem; padding-right: 1.25rem; }
    .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
    .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
    .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
    .py-5 { padding-top: 1.25rem; padding-bottom: 1.25rem; }
    .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
    .p-1\\.5 { padding: 0.375rem; }
    .p-2 { padding: 0.5rem; }
    .p-4 { padding: 1rem; }
    .mt-0\\.5 { margin-top: 0.125rem; }
    .mt-1 { margin-top: 0.25rem; }
    .mt-2 { margin-top: 0.5rem; }
    .mt-3 { margin-top: 0.75rem; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mx-6 { margin-left: 1.5rem; margin-right: 1.5rem; }
    .mx-auto { margin-left: auto; margin-right: auto; }
    .ml-1 { margin-left: 0.25rem; }
    .mr-1 { margin-right: 0.25rem; }
    .shrink-0 { flex-shrink: 0; }

    /* Colors */
    .text-slate-400 { color: #94a3b8; }
    .text-slate-500 { color: #64748b; }
    .text-slate-700 { color: #334155; }
    .text-slate-800 { color: #1e293b; }
    .text-blue-200 { color: #bfdbfe; }
    .text-blue-300 { color: #93c5fd; }
    .text-blue-600 { color: #2563eb; }
    .text-blue-700 { color: #1d4ed8; }
    .text-red-300 { color: #fca5a5; }
    .text-red-400 { color: #f87171; }
    .text-red-600 { color: #dc2626; }
    .text-emerald-300 { color: #6ee7b7; }
    .text-emerald-600 { color: #059669; }
    .text-emerald-700 { color: #047857; }
    .text-amber-400 { color: #fbbf24; }
    .text-violet-400 { color: #a78bfa; }
    .text-violet-700 { color: #6d28d9; }
    .text-green-700 { color: #15803d; }
    .text-orange-700 { color: #c2410c; }

    .bg-emerald-100 { background-color: #d1fae5; }
    .bg-green-100 { background-color: #dcfce7; }
    .bg-teal-100 { background-color: #ccfbf1; }
    .bg-blue-100 { background-color: #dbeafe; }
    .bg-amber-100 { background-color: #fef3c7; }
    .bg-orange-100 { background-color: #ffedd5; }
    .bg-red-100 { background-color: #fee2e2; }
    .bg-red-50\\/60 { background-color: rgba(254,242,242,0.6); }
    .bg-slate-50\\/50 { background-color: rgba(248,250,252,0.5); }
    .bg-white\\/20 { background-color: rgba(255,255,255,0.2); }
    .bg-white\\/10 { background-color: rgba(255,255,255,0.1); }

    .border-slate-200 { border-color: #e2e8f0; }
    .border-blue-200 { border-color: #bfdbfe; }
    .border-blue-100 { border-color: #dbeafe; }
    .border-white\\/20 { border-color: rgba(255,255,255,0.2); }
    .border-white\\/30 { border-color: rgba(255,255,255,0.3); }
    .border-violet-200 { border-color: #ddd6fe; }
    .border-emerald-300 { border-color: #6ee7b7; }
    .border-green-300 { border-color: #86efac; }
    .border-blue-300 { border-color: #93c5fd; }
    .border-amber-300 { border-color: #fcd34d; }
    .border-orange-300 { border-color: #fdba74; }
    .border-red-300 { border-color: #fca5a5; }

    .ring-white\\/30 { --tw-ring-color: rgba(255,255,255,0.3); }
    .opacity-80 { opacity: 0.8; }
    .opacity-60 { opacity: 0.6; }
    .backdrop-blur-sm { backdrop-filter: blur(4px); }
    .drop-shadow-sm { filter: drop-shadow(0 1px 1px rgba(0,0,0,.05)); }
    .pointer-events-none { pointer-events: none; }
    .select-none { user-select: none; }
    .rotate-\\[-30deg\\] { transform: rotate(-30deg); }
    .z-0 { z-index: 0; }
    .z-10 { z-index: 10; }
    .inset-0 { inset: 0; }
    .h-px { height: 1px; }
    .bg-slate-400 { background-color: #94a3b8; }
    .bg-slate-100 { background-color: #f1f5f9; }

    @media print {
      @page { margin: 6mm; ${pageSize} }
      body { background: white !important; }
      .result-card, .certificate-card, .transcript-card { box-shadow: none !important; border: none !important; }
      .no-print { display: none !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="display:flex;align-items:center;justify-content:center;gap:12px;padding:16px">
    <button onclick="window.print()" style="padding:10px 28px;background:#2563eb;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;display:inline-flex;align-items:center;gap:6px">🖨️ Print / Save as PDF</button>
    <button onclick="window.close()" style="padding:10px 28px;background:#64748b;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px">✕ Close</button>
  </div>
  <div class="print-container">${contentHtml}</div>
  <script>
    document.fonts.ready.then(() => { setTimeout(() => { window.print(); }, 800); });
  <\/script>
</body>
</html>`);
  pw.document.close();
}
/* ─── MAIN PAGE ─── */

export default function ResultCardsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const t = useTranslations('resultCards');
  const tc = useTranslations('common');

  const [mode, setMode] = useState<'bulk' | 'individual'>('bulk');
  const [selectedSession, setSelectedSession] = useState<number | ''>('');
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [selectedSection, setSelectedSection] = useState<number | ''>('');
  const [selectedExam, setSelectedExam] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<SearchStudent | null>(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [previewCard, setPreviewCard] = useState<{ card: StudentCard; examTerm: BulkData['exam_term'] } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const individualPrintRef = useRef<HTMLDivElement>(null);
  const certificatePrintRef = useRef<HTMLDivElement>(null);
  const transcriptPrintRef = useRef<HTMLDivElement>(null);
  const individualCertificateRef = useRef<HTMLDivElement>(null);
  const individualTranscriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearchDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data: sessionsData } = useQuery({ queryKey: ['academic-sessions'], queryFn: () => api<{ data: SessionItem[] }>('/academic-sessions?per_page=100') });
  const sessions: SessionItem[] = Array.isArray((sessionsData as any)?.data) ? (sessionsData as any).data : (sessionsData as any)?.data?.data ?? [];

  // Auto-select current session
  useEffect(() => {
    if (!selectedSession && sessions.length > 0) {
      const current = sessions.find(s => s.is_current);
      if (current) setSelectedSession(current.id);
    }
  }, [sessions, selectedSession]);

  const { data: classesData } = useQuery({ queryKey: ['classes'], queryFn: () => api<{ data: ClassItem[] }>('/classes') });
  const classes: ClassItem[] = Array.isArray((classesData as any)?.data) ? (classesData as any).data : (classesData as any)?.data?.data ?? [];

  const { data: sectionsData } = useQuery({ queryKey: ['sections', selectedClass], queryFn: () => api<{ data: SectionItem[] }>(`/sections?class_id=${selectedClass}`), enabled: !!selectedClass });
  const sections: SectionItem[] = Array.isArray((sectionsData as any)?.data) ? (sectionsData as any).data : (sectionsData as any)?.data?.data ?? [];

  const { data: examsData } = useQuery({ queryKey: ['exam-terms', selectedSession], queryFn: () => api<{ data: ExamTerm[] }>(`/exam-terms?per_page=100${selectedSession ? `&academic_session_id=${selectedSession}` : ''}`), enabled: !!selectedSession });
  const exams: ExamTerm[] = (() => { const v = (examsData as any)?.data; return Array.isArray(v) ? v : v?.data ?? []; })();

  const { data: instData } = useQuery({ queryKey: ['id-card-institution'], queryFn: () => api<{ data: InstitutionInfo }>('/id-cards/institution') });
  const institution: InstitutionInfo = (instData as any)?.data ?? { name: '', address: '', phone: '', email: '' };

  const canFetch = !!selectedSection && !!selectedExam;
  const { data: bulkData, isLoading: bulkLoading, isFetching: bulkFetching } = useQuery({
    queryKey: ['bulk-result-cards', selectedSection, selectedExam],
    queryFn: () => api<{ data: BulkData }>(`/reports/admin/bulk-result-cards?section_id=${selectedSection}&exam_term_id=${selectedExam}`),
    enabled: canFetch,
  });
  const resultData = (bulkData as any)?.data as BulkData | undefined;
  const cards = resultData?.cards ?? [];
  const examTermInfo = resultData?.exam_term;

  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['search-students-results', debouncedSearch],
    queryFn: () => api<{ data: SearchStudent[] }>(`/reports/admin/search-students?search=${encodeURIComponent(debouncedSearch)}`),
    enabled: debouncedSearch.length >= 1 && mode === 'individual',
  });
  const searchResults: SearchStudent[] = (searchData as any)?.data ?? [];

  const { data: individualData, isLoading: individualLoading, isFetching: individualFetching } = useQuery({
    queryKey: ['individual-result-card', selectedStudent?.id],
    queryFn: () => api<{ data: IndividualData }>(`/reports/admin/individual-result-card?student_id=${selectedStudent!.id}`),
    enabled: !!selectedStudent,
  });
  const indivData = (individualData as any)?.data as IndividualData | undefined;

  const handleBulkPrint = useCallback(() => {
    if (!printRef.current) return;
    openPrintWindow(printRef.current.innerHTML, `Result Cards — ${examTermInfo?.name ?? 'Print'}`);
  }, [examTermInfo]);

  const handleIndividualPrint = useCallback(() => {
    if (!individualPrintRef.current) return;
    openPrintWindow(individualPrintRef.current.innerHTML, `Result Sheet — ${indivData?.student?.name ?? 'Student'}`, 'sheet');
  }, [indivData]);

  const handlePDFDownload = useCallback((ref: React.RefObject<HTMLDivElement | null>, title: string) => {
    if (!ref.current) return;
    openPrintWindow(ref.current.innerHTML, title);
  }, []);

  const handleBulkCertificatePrint = useCallback(() => {
    if (!certificatePrintRef.current) return;
    openPrintWindow(certificatePrintRef.current.innerHTML, `Certificates — ${examTermInfo?.name ?? 'Print'}`, 'certificate');
  }, [examTermInfo]);

  const handleBulkTranscriptPrint = useCallback(() => {
    if (!transcriptPrintRef.current) return;
    openPrintWindow(transcriptPrintRef.current.innerHTML, `Transcripts — ${examTermInfo?.name ?? 'Print'}`, 'transcript');
  }, [examTermInfo]);

  const handleIndividualCertificatePrint = useCallback(() => {
    if (!individualCertificateRef.current) return;
    openPrintWindow(individualCertificateRef.current.innerHTML, `Certificate — ${indivData?.student?.name ?? 'Student'}`, 'certificate');
  }, [indivData]);

  const handleIndividualTranscriptPrint = useCallback(() => {
    if (!individualTranscriptRef.current) return;
    openPrintWindow(individualTranscriptRef.current.innerHTML, `Transcript — ${indivData?.student?.name ?? 'Student'}`, 'transcript');
  }, [indivData]);

  const bulkStats = cards.length > 0 ? {
    total: cards.length,
    gpa4Plus: cards.filter(c => c.gpa != null && c.gpa >= 4.0).length,
    gpa5: cards.filter(c => c.gpa != null && c.gpa >= 5.0).length,
    avgGPA: cards.reduce((s, c) => s + (c.gpa ?? 0), 0) / cards.length,
    passed: cards.filter(c => c.letter_grade && c.letter_grade !== 'F').length,
    failed: cards.filter(c => c.letter_grade === 'F' || !c.letter_grade).length,
    subjects: cards[0]?.marks.length ?? 0,
  } : null;
  /* ─── RENDER ─── */
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            {t('title')}
          </h1>
          <p className="text-gray-500 mt-1">{t('subtitle')}</p>
        </div>
        {/* mode tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 self-start">
          <button onClick={() => setMode('bulk')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'bulk' ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Users className="w-4 h-4" /> {t('bulkMode')}
          </button>
          <button onClick={() => setMode('individual')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'individual' ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <User className="w-4 h-4" /> {t('individualMode')}
          </button>
        </div>
      </div>

      {/* ═══════════════════ BULK MODE ═══════════════════ */}
      {mode === 'bulk' && (
        <div className="space-y-6">
          {/* filters */}
          <div className="card p-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('selectFilters')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <select className="input" value={selectedSession} onChange={e => { setSelectedSession(e.target.value ? +e.target.value : ''); setSelectedExam(''); }}>
                <option value="">{t('allSessions')}</option>
                {sessions.map(s => <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' ★' : ''}</option>)}
              </select>
              <select className="input" value={selectedClass} onChange={e => { setSelectedClass(e.target.value ? +e.target.value : ''); setSelectedSection(''); }}>
                <option value="">{t('selectClass')}</option>
                {classes.map(c => <option key={c.id} value={c.id}>{locale === 'bn' ? c.name_bn || c.name : c.name}</option>)}
              </select>
              <select className="input" value={selectedSection} onChange={e => setSelectedSection(e.target.value ? +e.target.value : '')} disabled={!selectedClass}>
                <option value="">{t('selectSection')}</option>
                {sections.map(s => <option key={s.id} value={s.id}>{locale === 'bn' ? s.name_bn || s.name : s.name}</option>)}
              </select>
              <select className="input" value={selectedExam} onChange={e => setSelectedExam(e.target.value ? +e.target.value : '')}>
                <option value="">{t('selectExam')}</option>
                {exams.map(ex => <option key={ex.id} value={ex.id}>{locale === 'bn' ? ex.name_bn || ex.name : ex.name}</option>)}
              </select>
            </div>
          </div>

          {(bulkLoading || bulkFetching) && canFetch && <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>}

          {!bulkLoading && !bulkFetching && canFetch && cards.length === 0 && (
            <div className="card p-12 text-center"><FileText className="mx-auto w-12 h-12 text-gray-300 mb-3" /><p className="font-semibold text-gray-500">{t('noResults')}</p><p className="text-sm text-gray-400 mt-1">{t('noResultsDesc')}</p></div>
          )}

          {bulkStats && (
            <>
              {/* stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="card p-4 text-center border-l-4 border-l-indigo-500"><p className="text-2xl font-bold text-indigo-600">{bulkStats.total}</p><p className="text-xs text-gray-500 mt-1">{t('totalStudents')}</p></div>
                <div className="card p-4 text-center border-l-4 border-l-green-500"><p className="text-2xl font-bold text-green-600">{bulkStats.avgGPA.toFixed(2)}</p><p className="text-xs text-gray-500 mt-1">{t('avgGPA')}</p></div>
                <div className="card p-4 text-center border-l-4 border-l-yellow-500"><p className="text-2xl font-bold text-yellow-600">{bulkStats.gpa5}</p><p className="text-xs text-gray-500 mt-1">{t('gpa5')}</p></div>
                <div className="card p-4 text-center border-l-4 border-l-emerald-500"><p className="text-2xl font-bold text-emerald-600">{bulkStats.passed}</p><p className="text-xs text-gray-500 mt-1">{t('passed')}</p></div>
                <div className="card p-4 text-center border-l-4 border-l-red-500"><p className="text-2xl font-bold text-red-600">{bulkStats.failed}</p><p className="text-xs text-gray-500 mt-1">{t('failed')}</p></div>
              </div>

              {/* actions */}
              <div className="flex flex-wrap gap-3">
                <button className="btn btn-primary flex items-center gap-2" onClick={handleBulkPrint}><Printer className="w-4 h-4" /> {t('printAll')} ({cards.length} {t(cards.length === 1 ? 'card' : 'cards')})</button>
                <button className="btn bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2" onClick={handleBulkCertificatePrint}><Medal className="w-4 h-4" /> {t('printCertificate')}</button>
                <button className="btn bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2" onClick={handleBulkTranscriptPrint}><ScrollText className="w-4 h-4" /> {t('printTranscript')}</button>
                <button className="btn bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2" onClick={() => handlePDFDownload(printRef, `Result Cards - ${examTermInfo?.name ?? ''}`)}><Download className="w-4 h-4" /> {t('downloadPDF')}</button>
              </div>

              {/* student list table */}
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="table-header">
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">{t('studentList')}</th>
                      <th className="px-4 py-3 text-center">{t('rollNo')}</th>
                      <th className="px-4 py-3 text-center">{t('total')}</th>
                      <th className="px-4 py-3 text-center">{t('grade')}</th>
                      <th className="px-4 py-3 text-center">GPA</th>
                      <th className="px-4 py-3 text-center">{t('position')}</th>
                      <th className="px-4 py-3 text-center">{t('status')}</th>
                      <th className="px-4 py-3 text-center">{t('actions')}</th>
                    </tr></thead>
                    <tbody>
                      {cards.map((c, i) => {
                        const failed = c.letter_grade === 'F' || !c.letter_grade;
                        const gc = gradeColor(c.letter_grade);
                        return (
                          <tr key={c.student.student_id} className="table-row-hover border-b dark:border-gray-700">
                            <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200 flex items-center gap-3">
                              {c.student.photo ? <img src={c.student.photo} className="w-8 h-8 rounded-full object-cover" alt="" /> : <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 font-bold text-xs">{(locale === 'bn' ? c.student.name_bn || c.student.name : c.student.name).charAt(0)}</div>}
                              <div><p>{locale === 'bn' ? c.student.name_bn || c.student.name : c.student.name}</p><p className="text-xs text-gray-400">ID: {c.student.student_id}</p></div>
                            </td>
                            <td className="px-4 py-3 text-center">{c.enrollment.roll_no ?? '-'}</td>
                            <td className="px-4 py-3 text-center font-semibold">{c.total_marks ?? '-'}</td>
                            <td className="px-4 py-3 text-center"><span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${gc.bg} ${gc.text} ${gc.border} border`}>{c.letter_grade ?? '-'}</span></td>
                            <td className="px-4 py-3 text-center font-semibold">{c.gpa?.toFixed(2) ?? '-'}</td>
                            <td className="px-4 py-3 text-center">{c.position ?? '-'}</td>
                            <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${failed ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>{failed ? t('failed') : t('passed')}</span></td>
                            <td className="px-4 py-3 text-center">
                              <button className="text-indigo-600 hover:text-indigo-800 text-xs font-medium" onClick={() => examTermInfo && setPreviewCard({ card: c, examTerm: examTermInfo })}><Eye className="w-4 h-4 inline mr-1" />{t('view')}</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* offscreen cards for printing */}
              <div className="sr-only"><div ref={printRef}>{cards.map(c => <ResultCard key={c.student.id} card={c} examTerm={examTermInfo!} institution={institution} locale={locale} />)}</div></div>
              <div className="sr-only"><div ref={certificatePrintRef}>{cards.map(c => <CertificateCard key={c.student.id} card={c} examTerm={examTermInfo!} institution={institution} locale={locale} />)}</div></div>
              <div className="sr-only"><div ref={transcriptPrintRef}>{cards.map(c => <TranscriptCard key={c.student.id} card={c} examTerm={examTermInfo!} institution={institution} locale={locale} />)}</div></div>
            </>
          )}
        </div>
      )}
      {/* ═══════════════════ INDIVIDUAL MODE ═══════════════════ */}
      {mode === 'individual' && (
        <div className="space-y-6">
          {/* search form */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <Search className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">{t('searchStudent')}</h3>
                <p className="text-xs text-gray-400">Enter Student ID or Name to find a student</p>
              </div>
            </div>
            <div ref={searchRef} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                className="input pl-10 w-full text-base"
                placeholder="e.g. STU-24-00001 or Ayan Rahman..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowSearchDropdown(true); }}
                onFocus={() => setShowSearchDropdown(true)}
              />
              {searchLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-indigo-500" />}
              {showSearchDropdown && debouncedSearch.length >= 1 && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-xl max-h-80 overflow-y-auto">
                  {searchResults.length === 0 && !searchLoading && (
                    <p className="p-4 text-sm text-gray-400 text-center">{t('noStudentsFound')}</p>
                  )}
                  {searchResults.map(s => (
                    <button
                      key={s.id}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors text-left border-b dark:border-gray-700 last:border-b-0"
                      onClick={() => { setSelectedStudent(s); setShowSearchDropdown(false); setSearchQuery(''); }}
                    >
                      {s.photo ? (
                        <img src={s.photo} className="w-10 h-10 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold text-sm">
                          {s.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">{s.name}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                          <span className="font-mono">{s.student_id}</span>
                          <span>{s.class_name} — {s.section_name}</span>
                          {s.roll_no && <span className="font-semibold text-indigo-500">Roll: {s.roll_no}</span>}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedStudent && (
              <div className="mt-4 flex items-center gap-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl px-4 py-3 border border-indigo-100 dark:border-indigo-800">
                {selectedStudent.photo ? (
                  <img src={selectedStudent.photo} className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-200" alt="" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold text-lg ring-2 ring-indigo-200">
                    {selectedStudent.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-sm">
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-gray-400">Name</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{selectedStudent.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-gray-400">Student ID</p>
                    <p className="font-mono font-medium text-gray-600 dark:text-gray-300">{selectedStudent.student_id}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-gray-400">Class &amp; Section</p>
                    <p className="font-medium text-gray-600 dark:text-gray-300">{selectedStudent.class_name} — {selectedStudent.section_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-gray-400">Class Roll</p>
                    <p className="font-bold text-lg text-indigo-600">{selectedStudent.roll_no ?? '—'}</p>
                  </div>
                </div>
                <button className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors" onClick={() => setSelectedStudent(null)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {(individualLoading || individualFetching) && selectedStudent && <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>}

          {!selectedStudent && (
            <div className="card p-16 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-indigo-300" />
              </div>
              <p className="text-lg font-semibold text-gray-400">{t('searchToBegin')}</p>
              <p className="text-sm text-gray-400 mt-1">Enter a Student ID or name above to generate their result sheet</p>
            </div>
          )}

          {indivData && !individualLoading && !individualFetching && (
            <>
              {indivData.report_cards.length === 0 && (
                <div className="card p-12 text-center"><FileText className="mx-auto w-12 h-12 text-gray-300 mb-3" /><p className="font-semibold text-gray-500">{t('noResults')}</p><p className="text-sm text-gray-400 mt-1">{t('noIndividualResultsDesc')}</p></div>
              )}

              {indivData.report_cards.length > 0 && (
                <>
                  {/* action buttons */}
                  <div className="flex flex-wrap gap-3">
                    <button className="btn btn-primary flex items-center gap-2" onClick={handleIndividualPrint}><Printer className="w-4 h-4" /> Print Result Sheet</button>
                    <button className="btn bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2" onClick={handleIndividualCertificatePrint}><Medal className="w-4 h-4" /> {t('printCertificate')}</button>
                    <button className="btn bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2" onClick={handleIndividualTranscriptPrint}><ScrollText className="w-4 h-4" /> {t('printTranscript')}</button>
                    <button className="btn bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2" onClick={() => handlePDFDownload(individualPrintRef, `Result Sheet - ${indivData.student.name}`)}><Download className="w-4 h-4" /> {t('downloadPDF')}</button>
                  </div>

                  {/* Combined result sheet */}
                  <div className="flex justify-center">
                    <IndividualResultSheet data={indivData} institution={institution} locale={locale} />
                  </div>

                  {/* offscreen for printing */}
                  <div className="sr-only">
                    <div ref={individualPrintRef}>
                      <IndividualResultSheet data={indivData} institution={institution} locale={locale} />
                    </div>
                  </div>
                  <div className="sr-only"><div ref={individualCertificateRef}>{indivData.report_cards.map(rc => {
                    const card = { student: indivData.student, enrollment: rc.enrollment || indivData.enrollment || { class_name: '', section_name: '', session_name: '' }, marks: rc.marks, total_marks: rc.total_marks, total_full: rc.total_full, gpa: rc.gpa, letter_grade: rc.letter_grade, position: rc.position, total_students: rc.total_students ?? 0 } as StudentCard;
                    return <CertificateCard key={rc.exam_term.id} card={card} examTerm={rc.exam_term} institution={institution} locale={locale} />;
                  })}</div></div>
                  <div className="sr-only"><div ref={individualTranscriptRef}>{indivData.report_cards.map(rc => {
                    const card = { student: indivData.student, enrollment: rc.enrollment || indivData.enrollment || { class_name: '', section_name: '', session_name: '' }, marks: rc.marks, total_marks: rc.total_marks, total_full: rc.total_full, gpa: rc.gpa, letter_grade: rc.letter_grade, position: rc.position, total_students: rc.total_students ?? 0 } as StudentCard;
                    return <TranscriptCard key={rc.exam_term.id} card={card} examTerm={rc.exam_term} institution={institution} locale={locale} />;
                  })}</div></div>
                </>
              )}
            </>
          )}
        </div>
      )}
      {/* ═══════════════════ GRADE SCALE REFERENCE ═══════════════════ */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700 font-semibold text-sm flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" /> {t('gradeScale')}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="table-header">
              <th className="px-4 py-2 text-left">{t('marksRange')}</th>
              <th className="px-4 py-2 text-center">{t('letterGrade')}</th>
              <th className="px-4 py-2 text-center">{t('gradePoint')}</th>
            </tr></thead>
            <tbody>
              {GRADE_SCALE.map(g => (
                <tr key={g.grade} className="table-row-hover border-b dark:border-gray-700">
                  <td className="px-4 py-2">{g.range}</td>
                  <td className="px-4 py-2 text-center"><span className={`inline-block px-3 py-0.5 rounded text-xs font-bold ${g.bg} ${g.text} ${g.border} border`}>{g.grade}</span></td>
                  <td className="px-4 py-2 text-center font-semibold">{g.gpa.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════ PREVIEW MODAL ═══════════════════ */}
      {previewCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setPreviewCard(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-700 px-5 py-3 flex items-center justify-between z-10">
              <h3 className="font-semibold text-gray-800 dark:text-white">{t('previewTitle')}</h3>
              <div className="flex items-center gap-2">
                <button className="btn btn-primary btn-sm flex items-center gap-1" onClick={() => { const div = document.getElementById('preview-card-print'); if (div) openPrintWindow(div.innerHTML, `Result Card — ${previewCard.card.name}`); }}><Printer className="w-3.5 h-3.5" /> {t('print')}</button>
                <button className="btn bg-emerald-600 hover:bg-emerald-700 text-white btn-sm flex items-center gap-1" onClick={() => { const div = document.getElementById('preview-card-print'); if (div) openPrintWindow(div.innerHTML, `Result Card — ${previewCard.card.name}`); }}><Download className="w-3.5 h-3.5" /> PDF</button>
                <button className="text-gray-400 hover:text-gray-600" onClick={() => setPreviewCard(null)}><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-5" id="preview-card-print">
              <ResultCard card={previewCard.card} examTerm={previewCard.examTerm} institution={institution} locale={locale} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}