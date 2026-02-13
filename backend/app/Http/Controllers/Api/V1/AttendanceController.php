<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\StudentAttendance;
use App\Models\StudentEnrollment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'section_id' => 'required|exists:sections,id',
            'date' => 'required|date',
        ]);
        $enrollments = StudentEnrollment::where('section_id', $request->section_id)
            ->with('student')
            ->get();
        $attendances = StudentAttendance::whereIn('student_enrollment_id', $enrollments->pluck('id'))
            ->where('date', $request->date)
            ->get()
            ->keyBy('student_enrollment_id');
        $data = $enrollments->map(function ($e) use ($attendances) {
            $att = $attendances->get($e->id);
            return [
                'student_enrollment_id' => $e->id,
                'student' => $e->student,
                'roll_no' => $e->roll_no,
                'status' => $att ? $att->status : null,
                'remark' => $att?->remark,
            ];
        });
        return response()->json(['success' => true, 'data' => $data]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'section_id' => 'required|exists:sections,id',
            'date' => 'required|date',
            'attendances' => 'required|array',
            'attendances.*.student_enrollment_id' => 'required|exists:student_enrollments,id',
            'attendances.*.status' => 'required|in:present,absent,late,leave',
            'attendances.*.remark' => 'nullable|string|max:255',
        ]);
        $userId = $request->user()?->id;
        foreach ($validated['attendances'] as $a) {
            StudentAttendance::updateOrCreate(
                [
                    'student_enrollment_id' => $a['student_enrollment_id'],
                    'date' => $validated['date'],
                ],
                [
                    'status' => $a['status'],
                    'remark' => $a['remark'] ?? null,
                    'marked_by' => $userId,
                ]
            );
        }
        return response()->json(['success' => true, 'message' => 'Attendance saved']);
    }

    /** Report: attendance summary by date range and optional section */
    public function report(Request $request): JsonResponse
    {
        $request->validate([
            'from_date' => 'required|date',
            'to_date' => 'required|date|after_or_equal:from_date',
            'section_id' => 'nullable|exists:sections,id',
        ]);
        $from = $request->from_date;
        $to = $request->to_date;
        $sectionId = $request->section_id;

        $enrollments = StudentEnrollment::with('student')
            ->when($sectionId, fn ($q) => $q->where('section_id', $sectionId))
            ->get();
        $enrollmentIds = $enrollments->pluck('id');

        $attendances = \App\Models\StudentAttendance::whereIn('student_enrollment_id', $enrollmentIds)
            ->whereBetween('date', [$from, $to])
            ->get();

        $byDate = $attendances->groupBy('date');
        $summary = [];
        $dates = [];
        for ($d = $from; $d <= $to; $d = date('Y-m-d', strtotime($d . ' +1 day'))) {
            $dates[] = $d;
            $dayAtt = $byDate->get($d) ?? collect();
            $present = $dayAtt->whereIn('status', ['present', 'late'])->count();
            $absent = $dayAtt->where('status', 'absent')->count();
            $leave = $dayAtt->where('status', 'leave')->count();
            $summary[] = [
                'date' => $d,
                'present' => $present,
                'absent' => $absent,
                'leave' => $leave,
                'total_marked' => $dayAtt->count(),
            ];
        }
        return response()->json([
            'success' => true,
            'data' => $summary,
            'enrollment_count' => $enrollmentIds->count(),
        ]);
    }
}
