<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Result Card — {{ $data['student']['name'] }}</title>
    <style>
        @page { size: A4 portrait; margin: 10mm 8mm; }
        body { font-family: 'bangla', 'nikosh', 'DejaVu Sans', sans-serif; font-size: 10px; color: #000; margin: 0; padding: 0; line-height: 1.35; }

        /* Header */
        .header { text-align: center; border-bottom: 2px double #000; padding-bottom: 6px; margin-bottom: 8px; }
        .header h1 { font-size: 18px; margin: 2px 0; }
        .header h2 { font-size: 12px; font-weight: 600; color: #333; margin: 2px 0; }
        .header .sub { font-size: 9px; color: #555; }

        /* Student info table */
        .info-table { width: 100%; border: 1px solid #999; margin-bottom: 8px; }
        .info-table td { padding: 3px 6px; font-size: 10px; border: none; vertical-align: top; }
        .info-table .label { font-weight: 700; font-size: 8px; text-transform: uppercase; color: #666; width: 100px; }
        .info-table .value { font-weight: 600; font-size: 11px; }
        .info-table .roll { font-size: 14px; color: #1a3e8a; font-weight: 700; }

        /* Marks table */
        .marks-table { width: 100%; border-collapse: collapse; margin: 6px 0; }
        .marks-table th, .marks-table td { border: 1px solid #333; padding: 2px 4px; text-align: center; font-size: 9px; }
        .marks-table th { background: #ddd; font-weight: 700; font-size: 8px; text-transform: uppercase; }
        .marks-table .subj { text-align: left; font-weight: 600; font-size: 10px; }
        .marks-table .total-row { background: #f0f0f0; font-weight: 700; }
        .marks-table .total-row td { font-size: 10px; }
        .pass { color: #166534; }
        .fail { color: #b91c1c; font-weight: 700; }
        .gpa-highlight { font-size: 12px; color: #1a3e8a; font-weight: 700; }

        /* Summary */
        .summary-table { width: 48%; border-collapse: collapse; margin: 6px 0; }
        .summary-table th, .summary-table td { border: 1px solid #999; padding: 2px 5px; font-size: 9px; }
        .summary-table th { background: #eee; }

        /* Decision */
        .decision { text-align: center; margin: 10px 0; padding: 8px; border: 2px solid #333; }
        .decision .status { font-size: 16px; font-weight: 700; letter-spacing: 2px; }
        .promoted { color: #166534; }
        .not-promoted { color: #b91c1c; }

        /* Attendance, Behavior */
        .section-title { font-size: 10px; font-weight: 700; margin: 8px 0 2px; padding: 2px 4px; background: #f0f0f0; }
        .behavior-table { width: 100%; border-collapse: collapse; }
        .behavior-table td { border: 1px solid #ccc; padding: 2px 4px; font-size: 9px; }

        /* Signatures */
        .signatures { margin-top: 25px; width: 100%; }
        .signatures td { border: none; text-align: center; padding-top: 25px; font-size: 9px; font-weight: 600; border-top: 1px solid #000; width: 25%; }

        /* Grade Scale */
        .grade-table { width: 60%; margin: 6px auto; border-collapse: collapse; }
        .grade-table th, .grade-table td { border: 1px solid #999; padding: 1px 3px; font-size: 8px; text-align: center; }
        .grade-table th { background: #eee; }

        /* QR */
        .qr-section { margin-top: 8px; border-top: 1px solid #ccc; padding-top: 6px; }
        .qr-section .qr { width: 70px; height: 70px; float: left; margin-right: 8px; }
        .qr-section .info { font-size: 8px; color: #666; }

        .clearfix::after { content: ''; display: table; clear: both; }

        /* Exam header */
        .exam-header { text-align: center; background: #e0e0e0; padding: 3px; font-size: 11px; font-weight: 700; margin-top: 8px; }
    </style>
</head>
<body>
    {{-- ═══ SCHOOL HEADER ═══ --}}
    <div class="header">
        @if($data['institution']['logo'])
            <img src="{{ $data['institution']['logo'] }}" style="width:50px; height:50px;" alt="">
        @endif
        <h1>{{ $data['institution']['name'] }}</h1>
        <h2>Academic Progress Report</h2>
        <div class="sub">
            {{ $data['institution']['address'] }}
            @if($data['institution']['eiin']) | EIIN: {{ $data['institution']['eiin'] }} @endif
            @if($data['institution']['phone']) | ☎ {{ $data['institution']['phone'] }} @endif
        </div>
    </div>

    {{-- ═══ STUDENT INFO ═══ --}}
    <table class="info-table">
        <tr>
            <td class="label">Student Name</td>
            <td class="value" colspan="2">{{ $data['student']['name'] }}</td>
            <td class="label">Student ID</td>
            <td class="value">{{ $data['student']['student_id'] }}</td>
            <td class="label">Class Roll</td>
            <td class="value roll">{{ $data['enrollment']['roll_no'] ?? '—' }}</td>
        </tr>
        <tr>
            <td class="label">Class & Section</td>
            <td class="value">{{ $data['enrollment']['class_name'] }} — {{ $data['enrollment']['section_name'] }}</td>
            @if($data['enrollment']['group'])
                <td class="label">Group</td>
                <td class="value">{{ $data['enrollment']['group'] }}</td>
            @else
                <td colspan="2"></td>
            @endif
            <td class="label">Session</td>
            <td class="value" colspan="2">{{ $data['enrollment']['session_name'] }}</td>
        </tr>
        <tr>
            <td class="label">Father</td>
            <td class="value">{{ $data['student']['father_name'] }}</td>
            <td class="label">Mother</td>
            <td class="value">{{ $data['student']['mother_name'] }}</td>
            @if($data['student']['date_of_birth'])
                <td class="label">DOB</td>
                <td class="value" colspan="2">{{ \Carbon\Carbon::parse($data['student']['date_of_birth'])->format('d M Y') }}</td>
            @else
                <td colspan="3"></td>
            @endif
        </tr>
    </table>

    {{-- ═══ PER-EXAM RESULTS ═══ --}}
    @foreach($data['result_summaries'] as $summary)
        <div class="exam-header">{{ $summary['exam_term_name'] }}</div>

        @if(!empty($summary['subject_grades']))
            <table class="marks-table">
                <thead>
                    <tr>
                        <th style="width:20px;">SL</th>
                        <th style="text-align:left;">Subject</th>
                        <th>Full Marks</th>
                        <th>Obtained</th>
                        <th>%</th>
                        <th>Grade</th>
                        <th>GPA</th>
                        <th>Result</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($summary['subject_grades'] as $i => $sg)
                        <tr>
                            <td>{{ $i + 1 }}</td>
                            <td class="subj">{{ $sg['subject_name'] }}</td>
                            <td>{{ $sg['full_marks'] }}</td>
                            <td>{{ number_format($sg['obtained'], 2) }}</td>
                            <td>{{ $sg['percentage'] }}%</td>
                            <td style="font-weight:700;">{{ $sg['grade'] ?? '—' }}</td>
                            <td>{{ $sg['gpa'] !== null ? number_format($sg['gpa'], 2) : '—' }}</td>
                            <td class="{{ $sg['passed'] ? 'pass' : 'fail' }}">{{ $sg['passed'] ? 'P' : 'F' }}</td>
                        </tr>
                    @endforeach
                </tbody>
                <tfoot>
                    <tr class="total-row">
                        <td colspan="2" style="text-align:right;">TOTAL</td>
                        <td>{{ $summary['total_full_marks'] }}</td>
                        <td>{{ number_format($summary['total_marks'], 2) }}</td>
                        <td>{{ $summary['percentage'] }}%</td>
                        <td style="font-weight:700;">{{ $summary['letter_grade'] }}</td>
                        <td class="gpa-highlight">{{ $summary['gpa'] !== null ? number_format($summary['gpa'], 2) : '—' }}</td>
                        <td class="{{ $summary['status'] === 'pass' ? 'pass' : 'fail' }}">{{ strtoupper($summary['status']) }}</td>
                    </tr>
                    <tr class="total-row">
                        <td colspan="4" style="text-align:right;">Position</td>
                        <td colspan="4">{{ $summary['position'] ?? '—' }} out of {{ $summary['total_students'] ?? '—' }} students</td>
                    </tr>
                </tfoot>
            </table>
        @endif

        {{-- Attendance for this exam --}}
        @php $att = collect($data['attendance'])->firstWhere('exam_term_id', $summary['exam_term_id']); @endphp
        @if($att)
            <table class="summary-table" style="width:100%; margin-top:4px;">
                <tr>
                    <th>Total Days</th><th>Present</th><th>Absent</th><th>Late</th><th>Leave</th><th>Attendance %</th>
                </tr>
                <tr>
                    <td>{{ $att['total_days'] }}</td>
                    <td>{{ $att['present_days'] }}</td>
                    <td>{{ $att['absent_days'] }}</td>
                    <td>{{ $att['late_days'] }}</td>
                    <td>{{ $att['leave_days'] }}</td>
                    <td style="font-weight:700;">{{ $att['attendance_percent'] }}%</td>
                </tr>
            </table>
        @endif
    @endforeach

    {{-- ═══ BEHAVIOR ═══ --}}
    @if(count($data['behavior']) > 0)
        <div class="section-title">Behavior Assessment</div>
        <table class="behavior-table">
            @foreach($data['behavior']->chunk(3) as $chunk)
                <tr>
                    @foreach($chunk as $b)
                        <td>{{ ucfirst(str_replace('_',' ',$b['category'])) }}: <strong>{{ $b['label'] }}</strong></td>
                    @endforeach
                    @for($j = count($chunk); $j < 3; $j++) <td></td> @endfor
                </tr>
            @endforeach
        </table>
    @endif

    {{-- ═══ CO-CURRICULAR ═══ --}}
    @if(count($data['co_curricular']) > 0)
        <div class="section-title">Co-Curricular Activities</div>
        <table class="marks-table">
            <thead><tr><th>Activity</th><th>Achievement</th><th>Date</th></tr></thead>
            <tbody>
                @foreach($data['co_curricular'] as $c)
                    <tr>
                        <td style="text-align:left;">{{ $c['activity'] }}</td>
                        <td>{{ $c['achievement'] ?? '—' }}</td>
                        <td>{{ $c['date'] ?? '—' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    {{-- ═══ REMARKS ═══ --}}
    @if(count($data['teacher_remarks']) > 0)
        <div class="section-title">Teacher Remarks</div>
        @foreach($data['teacher_remarks'] as $r)
            @if($r['class_teacher_remark'])
                <p style="margin:2px 0;"><strong>Class Teacher:</strong> {{ $r['class_teacher_remark'] }}</p>
            @endif
            @if($r['principal_remark'])
                <p style="margin:2px 0;"><strong>Principal:</strong> {{ $r['principal_remark'] }}</p>
            @endif
        @endforeach
    @endif

    {{-- ═══ FINAL DECISION ═══ --}}
    @php $final = collect($data['result_summaries'])->last(); @endphp
    @if($final)
        <div class="decision">
            <span class="status {{ $final['promoted'] ? 'promoted' : 'not-promoted' }}">
                {{ $final['promoted'] ? '✓ PROMOTED' : '✗ NOT PROMOTED' }}
            </span>
        </div>
    @endif

    {{-- ═══ GRADE SCALE ═══ --}}
    <table class="grade-table">
        <thead><tr><th>Marks Range</th><th>Grade</th><th>GPA</th></tr></thead>
        <tbody>
            @foreach($data['grade_scale'] as $gs)
                <tr><td>{{ $gs['min_marks'] }}–{{ $gs['max_marks'] }}</td><td>{{ $gs['letter_grade'] }}</td><td>{{ number_format($gs['grade_point'], 2) }}</td></tr>
            @endforeach
        </tbody>
    </table>

    {{-- ═══ SIGNATURES ═══ --}}
    <table class="signatures">
        <tr>
            <td>Class Teacher</td>
            <td>Guardian</td>
            <td>Exam Controller</td>
            <td>Principal</td>
        </tr>
    </table>

    {{-- ═══ QR ═══ --}}
    <div class="qr-section clearfix">
        <img src="{{ $data['verification']['qr_url'] }}" class="qr" alt="QR">
        <div class="info">
            <strong>Verification Code:</strong> {{ substr($data['verification']['token'], 0, 16) }}<br>
            Verify at: {{ $data['verification']['url'] }}<br>
            Printed: {{ now()->format('d M Y, h:i A') }}
        </div>
    </div>
</body>
</html>
