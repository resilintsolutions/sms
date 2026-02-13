<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Result Card — {{ $data['student']['name'] }} — {{ $data['enrollment']['session_name'] }}</title>
    <style>
        @page { size: A4; margin: 12mm; }
        @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none !important; }
            .result-card { page-break-inside: avoid; }
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Times New Roman', Georgia, serif; font-size: 11px; color: #000; background: #f1f5f9; line-height: 1.4; }
        .result-card { width: 210mm; max-width: 100%; margin: 0 auto; background: #fff; padding: 15mm 12mm; }
        .no-print { text-align: center; padding: 1rem; background: #fff; margin-bottom: 0; }
        .no-print button { padding: 8px 20px; background: #3b82f6; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; margin: 0 5px; }
        .no-print button:hover { background: #2563eb; }

        /* Header */
        .school-header { text-align: center; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 10px; }
        .school-header .logo { width: 60px; height: 60px; object-fit: contain; }
        .school-header h1 { font-size: 20px; font-weight: 700; margin: 4px 0; }
        .school-header h2 { font-size: 14px; font-weight: 600; color: #333; }
        .school-header .address { font-size: 10px; color: #555; }
        .school-header .eiin { font-size: 10px; }

        /* Student Info */
        .student-info { display: flex; gap: 12px; margin: 10px 0; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
        .student-info .photo { width: 70px; height: 80px; border: 1px solid #ddd; object-fit: cover; }
        .student-info .photo-placeholder { width: 70px; height: 80px; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; background: #f8fafc; color: #aaa; font-size: 28px; }
        .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px 16px; flex: 1; font-size: 11px; }
        .info-grid dt { font-weight: 700; font-size: 9px; text-transform: uppercase; color: #666; }
        .info-grid dd { font-size: 12px; font-weight: 600; margin-bottom: 4px; }

        /* Tables */
        table { width: 100%; border-collapse: collapse; font-size: 10px; margin: 8px 0; }
        th, td { border: 1px solid #333; padding: 3px 5px; text-align: center; }
        th { background: #e8e8e8; font-weight: 700; font-size: 9px; text-transform: uppercase; }
        td { font-size: 10px; }
        .subject-name { text-align: left; font-weight: 600; }
        .grade-cell { font-weight: 700; }
        .pass { color: #166534; }
        .fail { color: #991b1b; font-weight: 700; }

        /* Summary blocks */
        .summary-row { display: flex; gap: 12px; margin: 10px 0; }
        .summary-block { flex: 1; border: 1px solid #ccc; border-radius: 4px; padding: 8px; }
        .summary-block h3 { font-size: 11px; font-weight: 700; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 6px; }
        .summary-block table { margin: 0; }
        .summary-block table th, .summary-block table td { border: 1px solid #ddd; font-size: 10px; }

        /* Behavior & Co-curricular */
        .behavior-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; font-size: 10px; }
        .behavior-item { display: flex; justify-content: space-between; padding: 2px 6px; border: 1px solid #eee; border-radius: 3px; }

        /* Remarks */
        .remarks { margin: 10px 0; font-size: 11px; }
        .remarks .remark-box { border: 1px solid #ddd; padding: 6px 8px; margin: 4px 0; border-radius: 3px; min-height: 30px; }
        .remarks label { font-weight: 700; font-size: 9px; text-transform: uppercase; color: #666; }

        /* Final decision */
        .final-decision { text-align: center; margin: 12px 0; padding: 10px; border: 2px solid #333; }
        .final-decision .status { font-size: 18px; font-weight: 700; letter-spacing: 3px; }
        .final-decision .status.promoted { color: #166534; }
        .final-decision .status.not-promoted { color: #991b1b; }

        /* Signatures */
        .signatures { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 8px; }
        .sig-block { text-align: center; width: 25%; }
        .sig-line { border-top: 1px solid #000; margin-top: 30px; padding-top: 4px; font-size: 10px; font-weight: 600; }

        /* QR */
        .qr-section { display: flex; align-items: center; gap: 10px; margin-top: 10px; padding-top: 8px; border-top: 1px solid #ddd; }
        .qr-code { width: 80px; height: 80px; }
        .qr-info { font-size: 9px; color: #666; }

        /* Grade Scale */
        .grade-scale { font-size: 9px; }
        .grade-scale table th, .grade-scale table td { padding: 2px 4px; }
    </style>
</head>
<body>
    <div class="no-print">
        <button onclick="window.print()">🖨️ Print</button>
        <button onclick="window.location.href=window.location.href+'/pdf'">📄 Download PDF</button>
    </div>

    <div class="result-card">
        {{-- ═══ HEADER ═══ --}}
        <div class="school-header">
            @if($data['institution']['logo'])
                <img src="{{ $data['institution']['logo'] }}" class="logo" alt="Logo">
            @endif
            <h1>{{ $data['institution']['name'] }}</h1>
            <h2>Progress Report / Result Card</h2>
            <div class="address">{{ $data['institution']['address'] }}</div>
            @if($data['institution']['eiin'])
                <div class="eiin">EIIN: {{ $data['institution']['eiin'] }}</div>
            @endif
        </div>

        {{-- ═══ STUDENT INFO ═══ --}}
        <div class="student-info">
            @if($data['student']['photo'])
                <img src="{{ $data['student']['photo'] }}" class="photo" alt="Photo">
            @else
                <div class="photo-placeholder">👤</div>
            @endif
            <dl class="info-grid">
                <dt>Student Name</dt>
                <dd>{{ $data['student']['name'] }}</dd>

                <dt>Student ID</dt>
                <dd>{{ $data['student']['student_id'] }}</dd>

                <dt>Class Roll No.</dt>
                <dd style="font-size: 14px; color: #1e40af;">{{ $data['enrollment']['roll_no'] ?? '—' }}</dd>

                <dt>Class & Section</dt>
                <dd>{{ $data['enrollment']['class_name'] }} — {{ $data['enrollment']['section_name'] }}</dd>

                @if($data['enrollment']['group'])
                    <dt>Group</dt>
                    <dd>{{ $data['enrollment']['group'] }}</dd>
                @endif

                <dt>Session</dt>
                <dd>{{ $data['enrollment']['session_name'] }}</dd>

                <dt>Father's Name</dt>
                <dd>{{ $data['student']['father_name'] }}</dd>

                <dt>Mother's Name</dt>
                <dd>{{ $data['student']['mother_name'] }}</dd>

                @if($data['student']['date_of_birth'])
                    <dt>Date of Birth</dt>
                    <dd>{{ \Carbon\Carbon::parse($data['student']['date_of_birth'])->format('d M Y') }}</dd>
                @endif

                @if($data['student']['gender'])
                    <dt>Gender</dt>
                    <dd>{{ ucfirst($data['student']['gender']) }}</dd>
                @endif
            </dl>
        </div>

        {{-- ═══ SUBJECT-WISE MARKS TABLE ═══ --}}
        @foreach($data['result_summaries'] as $summary)
            <h3 style="font-size: 12px; margin: 10px 0 4px; text-align: center; background: #f0f0f0; padding: 4px;">
                {{ $summary['exam_term_name'] }}
            </h3>
            @if(!empty($summary['subject_grades']))
                <table>
                    <thead>
                        <tr>
                            <th style="width: 30px;">SL</th>
                            <th style="text-align: left;">Subject</th>
                            <th>Full Marks</th>
                            <th>Marks Obtained</th>
                            <th>Percentage</th>
                            <th>Grade</th>
                            <th>GPA</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($summary['subject_grades'] as $i => $sg)
                            <tr>
                                <td>{{ $i + 1 }}</td>
                                <td class="subject-name">{{ $sg['subject_name'] }}</td>
                                <td>{{ $sg['full_marks'] }}</td>
                                <td>{{ number_format($sg['obtained'], 2) }}</td>
                                <td>{{ $sg['percentage'] }}%</td>
                                <td class="grade-cell">{{ $sg['grade'] ?? '—' }}</td>
                                <td>{{ $sg['gpa'] !== null ? number_format($sg['gpa'], 2) : '—' }}</td>
                                <td class="{{ $sg['passed'] ? 'pass' : 'fail' }}">{{ $sg['passed'] ? 'PASS' : 'FAIL' }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                    <tfoot>
                        <tr style="font-weight: 700; background: #f8f8f8;">
                            <td colspan="2" style="text-align: right;">TOTAL</td>
                            <td>{{ $summary['total_full_marks'] }}</td>
                            <td>{{ number_format($summary['total_marks'], 2) }}</td>
                            <td>{{ $summary['percentage'] }}%</td>
                            <td class="grade-cell" style="font-size: 12px;">{{ $summary['letter_grade'] }}</td>
                            <td style="font-size: 12px; color: #1e40af; font-weight: 700;">{{ $summary['gpa'] !== null ? number_format($summary['gpa'], 2) : '—' }}</td>
                            <td class="{{ $summary['status'] === 'pass' ? 'pass' : 'fail' }}" style="font-size: 11px;">
                                {{ strtoupper($summary['status']) }}
                            </td>
                        </tr>
                    </tfoot>
                </table>

                {{-- Component detail (if exists) --}}
                @php
                    $hasComponents = collect($summary['subject_grades'])->contains(fn($sg) => !empty($sg['components']));
                @endphp
                @if($hasComponents)
                    <div style="font-size: 9px; margin: 4px 0 8px; color: #666;">
                        <strong>Component Breakdown:</strong>
                        @foreach($summary['subject_grades'] as $sg)
                            @if(!empty($sg['components']))
                                <span style="margin-right: 8px;">
                                    {{ $sg['subject_name'] }}:
                                    @foreach($sg['components'] as $c)
                                        {{ $c['component_name'] }}={{ $c['obtained'] ?? 'AB' }}/{{ $c['max_marks'] }}
                                        @if(!$loop->last), @endif
                                    @endforeach
                                </span>
                            @endif
                        @endforeach
                    </div>
                @endif
            @endif

            {{-- Exam Summary Row --}}
            <div class="summary-row">
                <div class="summary-block">
                    <h3>📊 Result Summary</h3>
                    <table>
                        <tr><td style="text-align:left;"><strong>Total Marks</strong></td><td>{{ $summary['total_marks'] }} / {{ $summary['total_full_marks'] }}</td></tr>
                        <tr><td style="text-align:left;"><strong>Percentage</strong></td><td>{{ $summary['percentage'] }}%</td></tr>
                        <tr><td style="text-align:left;"><strong>GPA</strong></td><td style="color:#1e40af; font-weight:700;">{{ $summary['gpa'] !== null ? number_format($summary['gpa'], 2) : '—' }}</td></tr>
                        <tr><td style="text-align:left;"><strong>Grade</strong></td><td style="font-weight:700;">{{ $summary['letter_grade'] ?? '—' }}</td></tr>
                        <tr><td style="text-align:left;"><strong>Position</strong></td><td>{{ $summary['position'] ?? '—' }} / {{ $summary['total_students'] ?? '—' }}</td></tr>
                        <tr><td style="text-align:left;"><strong>Failed Subjects</strong></td><td class="{{ $summary['fail_count'] > 0 ? 'fail' : '' }}">{{ $summary['fail_count'] }}</td></tr>
                    </table>
                </div>

                {{-- Attendance --}}
                @php
                    $att = collect($data['attendance'])->firstWhere('exam_term_id', $summary['exam_term_id']);
                @endphp
                @if($att)
                    <div class="summary-block">
                        <h3>📅 Attendance</h3>
                        <table>
                            <tr><td style="text-align:left;">Total Days</td><td>{{ $att['total_days'] }}</td></tr>
                            <tr><td style="text-align:left;">Present</td><td>{{ $att['present_days'] }}</td></tr>
                            <tr><td style="text-align:left;">Absent</td><td>{{ $att['absent_days'] }}</td></tr>
                            <tr><td style="text-align:left;">Late</td><td>{{ $att['late_days'] }}</td></tr>
                            <tr><td style="text-align:left;">Attendance %</td><td>{{ $att['attendance_percent'] }}%</td></tr>
                        </table>
                    </div>
                @endif
            </div>
        @endforeach

        {{-- ═══ BEHAVIOR ═══ --}}
        @if(count($data['behavior']) > 0)
            <div style="margin: 10px 0;">
                <h3 style="font-size: 11px; margin-bottom: 6px;">🎭 Behavior Assessment</h3>
                <div class="behavior-grid">
                    @foreach($data['behavior'] as $b)
                        <div class="behavior-item">
                            <span>{{ ucfirst(str_replace('_', ' ', $b['category'])) }}</span>
                            <strong>{{ $b['label'] }}</strong>
                        </div>
                    @endforeach
                </div>
            </div>
        @endif

        {{-- ═══ CO-CURRICULAR ═══ --}}
        @if(count($data['co_curricular']) > 0)
            <div style="margin: 10px 0;">
                <h3 style="font-size: 11px; margin-bottom: 6px;">🏆 Co-Curricular Activities</h3>
                <table>
                    <thead><tr><th>Activity</th><th>Achievement</th><th>Date</th></tr></thead>
                    <tbody>
                        @foreach($data['co_curricular'] as $c)
                            <tr>
                                <td style="text-align:left;">{{ $c['activity'] }}</td>
                                <td>{{ $c['achievement'] ?? '—' }}</td>
                                <td>{{ $c['date'] ? \Carbon\Carbon::parse($c['date'])->format('d M Y') : '—' }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        @endif

        {{-- ═══ TEACHER REMARKS ═══ --}}
        @if(count($data['teacher_remarks']) > 0)
            <div class="remarks">
                @foreach($data['teacher_remarks'] as $r)
                    @if($r['class_teacher_remark'])
                        <div>
                            <label>Class Teacher's Remark:</label>
                            <div class="remark-box">{{ $r['class_teacher_remark'] }}</div>
                        </div>
                    @endif
                    @if($r['principal_remark'])
                        <div>
                            <label>Principal's Remark:</label>
                            <div class="remark-box">{{ $r['principal_remark'] }}</div>
                        </div>
                    @endif
                @endforeach
            </div>
        @endif

        {{-- ═══ FINAL DECISION ═══ --}}
        @php
            $annualSummary = collect($data['result_summaries'])->last();
        @endphp
        @if($annualSummary)
            <div class="final-decision">
                <div class="status {{ $annualSummary['promoted'] ? 'promoted' : 'not-promoted' }}">
                    {{ $annualSummary['promoted'] ? 'PROMOTED' : 'NOT PROMOTED' }}
                </div>
                @if($annualSummary['promoted'])
                    <div style="font-size: 10px; margin-top: 4px;">The student is promoted to the next class.</div>
                @else
                    <div style="font-size: 10px; margin-top: 4px; color: #991b1b;">The student is not promoted. Failed in {{ $annualSummary['fail_count'] }} subject(s).</div>
                @endif
            </div>
        @endif

        {{-- ═══ GRADE SCALE ═══ --}}
        <div class="grade-scale">
            <h3 style="font-size: 10px; margin-bottom: 4px;">Grading Scale</h3>
            <table>
                <thead><tr><th>Range</th><th>Grade</th><th>GPA</th></tr></thead>
                <tbody>
                    @foreach($data['grade_scale'] as $gs)
                        <tr>
                            <td>{{ $gs['min_marks'] }}–{{ $gs['max_marks'] }}</td>
                            <td>{{ $gs['letter_grade'] }}</td>
                            <td>{{ number_format($gs['grade_point'], 2) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        {{-- ═══ SIGNATURES ═══ --}}
        <div class="signatures">
            <div class="sig-block"><div class="sig-line">Class Teacher</div></div>
            <div class="sig-block"><div class="sig-line">Guardian</div></div>
            <div class="sig-block"><div class="sig-line">Exam Controller</div></div>
            <div class="sig-block"><div class="sig-line">Principal</div></div>
        </div>

        {{-- ═══ QR CODE VERIFICATION ═══ --}}
        <div class="qr-section">
            <img src="{{ $data['verification']['qr_url'] }}" class="qr-code" alt="QR Verification">
            <div class="qr-info">
                <strong>Verification</strong><br>
                Scan this QR code or visit:<br>
                <a href="{{ $data['verification']['url'] }}">{{ $data['verification']['url'] }}</a><br>
                <em>Token: {{ substr($data['verification']['token'], 0, 12) }}...</em><br>
                Generated: {{ now()->format('d M Y, h:i A') }}
            </div>
        </div>
    </div>
</body>
</html>
