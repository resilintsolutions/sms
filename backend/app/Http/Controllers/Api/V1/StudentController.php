<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\StudentEnrollment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Student::with(['institution', 'guardians']);
        if ($request->has('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }
        if ($request->filled('search')) {
            $term = '%' . $request->search . '%';
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                    ->orWhere('name_bn', 'like', $term)
                    ->orWhere('student_id', 'like', $term);
            });
        }
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        if ($request->has('gender')) {
            $query->where('gender', $request->gender);
        }
        if ($request->has('section_id') && $request->has('academic_session_id')) {
            $query->whereHas('enrollments', function ($q) use ($request) {
                $q->where('section_id', $request->section_id)
                    ->where('academic_session_id', $request->academic_session_id);
            });
        }
        $students = $query->latest()->paginate($request->get('per_page', 15));
        return response()->json(['success' => true, 'data' => $students]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'student_id' => 'nullable|string|max:50|unique:students,student_id',
            'name' => 'required|string|max:255',
            'name_bn' => 'nullable|string|max:255',
            'date_of_birth' => 'required|date',
            'gender' => 'required|in:male,female,other',
            'birth_reg_no' => 'nullable|string|max:50',
            'nid' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'blood_group' => 'nullable|string|max:5',
            'admission_date' => 'required|date',
            'guardians' => 'required|array|min:1',
            'guardians.*.name' => 'required|string|max:255',
            'guardians.*.name_bn' => 'nullable|string|max:255',
            'guardians.*.relation' => 'required|string|max:50',
            'guardians.*.phone' => 'required|string|max:50',
            'guardians.*.email' => 'nullable|email',
            'guardians.*.nid' => 'nullable|string|max:20',
            'guardians.*.address' => 'nullable|string',
            'guardians.*.occupation' => 'nullable|string|max:255',
        ]);
        $guardians = $validated['guardians'];
        unset($validated['guardians']);

        $validated['student_id'] = $validated['student_id'] ?? $this->generateStudentId($validated['institution_id']);
        $validated['status'] = 'active';
        $student = Student::create($validated);

        foreach ($guardians as $i => $g) {
            $guardian = $student->institution->guardians()->create([
                'name' => $g['name'],
                'name_bn' => $g['name_bn'] ?? null,
                'relation' => $g['relation'],
                'phone' => $g['phone'],
                'email' => $g['email'] ?? null,
                'nid' => $g['nid'] ?? null,
                'address' => $g['address'] ?? null,
                'occupation' => $g['occupation'] ?? null,
                'is_primary' => $i === 0,
            ]);
            $student->guardians()->attach($guardian->id, ['is_primary' => $i === 0]);
        }

        return response()->json(['success' => true, 'data' => $student->load('guardians')], 201);
    }

    public function show(Student $student): JsonResponse
    {
        $student->load(['guardians', 'enrollments.section.class', 'enrollments.academicSession']);
        return response()->json(['success' => true, 'data' => $student]);
    }

    public function update(Request $request, Student $student): JsonResponse
    {
        $validated = $request->validate([
            'student_id' => 'sometimes|string|max:50|unique:students,student_id,' . $student->id,
            'name' => 'sometimes|string|max:255',
            'name_bn' => 'nullable|string|max:255',
            'date_of_birth' => 'sometimes|date',
            'gender' => 'sometimes|in:male,female,other',
            'birth_reg_no' => 'nullable|string|max:50',
            'nid' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'blood_group' => 'nullable|string|max:5',
            'admission_date' => 'nullable|date',
            'status' => 'sometimes|in:active,inactive,passed_out,transferred,dropped',
        ]);
        $student->update($validated);
        return response()->json(['success' => true, 'data' => $student->load('guardians')]);
    }

    public function enroll(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'student_id' => 'required|exists:students,id',
            'section_id' => 'required|exists:sections,id',
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'roll_no' => 'required|integer|min:1',
        ]);
        $exists = StudentEnrollment::where('section_id', $validated['section_id'])
            ->where('academic_session_id', $validated['academic_session_id'])
            ->where('roll_no', $validated['roll_no'])->exists();
        if ($exists) {
            return response()->json(['success' => false, 'message' => 'Roll number already assigned'], 422);
        }
        $enrollment = StudentEnrollment::create($validated);
        return response()->json(['success' => true, 'data' => $enrollment->load('student', 'section', 'academicSession')], 201);
    }

    public function destroy(Student $student): JsonResponse
    {
        $student->delete();
        return response()->json(['success' => true, 'message' => 'Student deleted']);
    }

    private function generateStudentId(int $institutionId): string
    {
        $year = date('y');
        $count = Student::where('institution_id', $institutionId)->count() + 1;
        return sprintf('STU-%s-%05d', $year, $count);
    }
}
