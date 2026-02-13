<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\LessonPlan;
use App\Models\StudyMaterial;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LessonPlanController extends Controller
{
    // ═══════════════════════════════════════
    // LESSON PLANS
    // ═══════════════════════════════════════

    /**
     * List lesson plans with filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = LessonPlan::with(['classModel', 'section', 'subject', 'academicSession', 'creator'])
            ->orderByDesc('created_at');

        if ($request->filled('academic_session_id')) {
            $query->where('academic_session_id', $request->academic_session_id);
        }
        if ($request->filled('class_id')) {
            $query->where('class_id', $request->class_id);
        }
        if ($request->filled('section_id')) {
            $query->where('section_id', $request->section_id);
        }
        if ($request->filled('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }
        if ($request->filled('created_by')) {
            $query->where('created_by', $request->created_by);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('week_number')) {
            $query->where('week_number', $request->week_number);
        }
        if ($request->filled('plan_date_from')) {
            $query->whereDate('plan_date', '>=', $request->plan_date_from);
        }
        if ($request->filled('plan_date_to')) {
            $query->whereDate('plan_date', '<=', $request->plan_date_to);
        }

        $perPage = $request->integer('per_page', 20);
        $data = $query->paginate($perPage);

        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * Create a lesson plan.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'class_id'            => 'required|exists:classes,id',
            'section_id'          => 'nullable|exists:sections,id',
            'subject_id'          => 'required|exists:subjects,id',
            'title'               => 'required|string|max:255',
            'title_bn'            => 'nullable|string|max:255',
            'objective'           => 'nullable|string',
            'objective_bn'        => 'nullable|string',
            'content'             => 'nullable|string',
            'content_bn'          => 'nullable|string',
            'teaching_method'     => 'nullable|string',
            'resources'           => 'nullable|string',
            'assessment'          => 'nullable|string',
            'homework'            => 'nullable|string',
            'plan_date'           => 'nullable|date',
            'duration_minutes'    => 'nullable|integer|min:1|max:600',
            'topic'               => 'nullable|string|max:255',
            'topic_bn'            => 'nullable|string|max:255',
            'week_number'         => 'nullable|integer|min:1|max:52',
            'status'              => 'nullable|in:draft,published,completed',
        ]);

        $validated['institution_id'] = $request->user()->institution_id;
        $validated['created_by'] = $request->user()->id;

        $plan = LessonPlan::create($validated);
        $plan->load(['classModel', 'section', 'subject', 'academicSession', 'creator']);

        return response()->json(['success' => true, 'data' => $plan], 201);
    }

    /**
     * Show a single lesson plan.
     */
    public function show(int $id): JsonResponse
    {
        $plan = LessonPlan::with(['classModel', 'section', 'subject', 'academicSession', 'creator'])
            ->findOrFail($id);

        return response()->json(['success' => true, 'data' => $plan]);
    }

    /**
     * Update a lesson plan.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $plan = LessonPlan::findOrFail($id);

        $validated = $request->validate([
            'academic_session_id' => 'sometimes|exists:academic_sessions,id',
            'class_id'            => 'sometimes|exists:classes,id',
            'section_id'          => 'nullable|exists:sections,id',
            'subject_id'          => 'sometimes|exists:subjects,id',
            'title'               => 'sometimes|string|max:255',
            'title_bn'            => 'nullable|string|max:255',
            'objective'           => 'nullable|string',
            'objective_bn'        => 'nullable|string',
            'content'             => 'nullable|string',
            'content_bn'          => 'nullable|string',
            'teaching_method'     => 'nullable|string',
            'resources'           => 'nullable|string',
            'assessment'          => 'nullable|string',
            'homework'            => 'nullable|string',
            'plan_date'           => 'nullable|date',
            'duration_minutes'    => 'nullable|integer|min:1|max:600',
            'topic'               => 'nullable|string|max:255',
            'topic_bn'            => 'nullable|string|max:255',
            'week_number'         => 'nullable|integer|min:1|max:52',
            'status'              => 'nullable|in:draft,published,completed',
        ]);

        $plan->update($validated);
        $plan->load(['classModel', 'section', 'subject', 'academicSession', 'creator']);

        return response()->json(['success' => true, 'data' => $plan]);
    }

    /**
     * Delete a lesson plan.
     */
    public function destroy(int $id): JsonResponse
    {
        $plan = LessonPlan::findOrFail($id);
        $plan->delete();

        return response()->json(['success' => true, 'message' => 'Lesson plan deleted']);
    }

    /**
     * Teacher portal: list lesson plans for the authenticated teacher.
     */
    public function teacherLessonPlans(Request $request): JsonResponse
    {
        $query = LessonPlan::with(['classModel', 'section', 'subject', 'academicSession'])
            ->where('created_by', $request->user()->id)
            ->orderByDesc('plan_date')
            ->orderByDesc('created_at');

        if ($request->filled('academic_session_id')) {
            $query->where('academic_session_id', $request->academic_session_id);
        }
        if ($request->filled('class_id')) {
            $query->where('class_id', $request->class_id);
        }
        if ($request->filled('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json(['success' => true, 'data' => $query->get()]);
    }

    // ═══════════════════════════════════════
    // STUDY MATERIALS / CONTENT
    // ═══════════════════════════════════════

    /**
     * List study materials with filters.
     */
    public function materials(Request $request): JsonResponse
    {
        $query = StudyMaterial::with(['classModel', 'section', 'subject', 'academicSession', 'creator'])
            ->orderByDesc('created_at');

        if ($request->filled('academic_session_id')) {
            $query->where('academic_session_id', $request->academic_session_id);
        }
        if ($request->filled('class_id')) {
            $query->where('class_id', $request->class_id);
        }
        if ($request->filled('section_id')) {
            $query->where('section_id', $request->section_id);
        }
        if ($request->filled('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }
        if ($request->filled('created_by')) {
            $query->where('created_by', $request->created_by);
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $perPage = $request->integer('per_page', 20);
        $data = $query->paginate($perPage);

        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * Create a study material / content link.
     */
    public function materialStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'class_id'            => 'required|exists:classes,id',
            'section_id'          => 'nullable|exists:sections,id',
            'subject_id'          => 'required|exists:subjects,id',
            'title'               => 'required|string|max:255',
            'title_bn'            => 'nullable|string|max:255',
            'description'         => 'nullable|string',
            'description_bn'      => 'nullable|string',
            'type'                => 'required|in:google_drive,dropbox,youtube,website,document,other',
            'link'                => 'required|url|max:2048',
            'file_name'           => 'nullable|string|max:255',
            'file_type'           => 'nullable|string|max:50',
            'is_public'           => 'nullable|boolean',
            'status'              => 'nullable|in:draft,published',
        ]);

        $validated['institution_id'] = $request->user()->institution_id;
        $validated['created_by'] = $request->user()->id;

        $material = StudyMaterial::create($validated);
        $material->load(['classModel', 'section', 'subject', 'academicSession', 'creator']);

        return response()->json(['success' => true, 'data' => $material], 201);
    }

    /**
     * Show a single study material.
     */
    public function materialShow(int $id): JsonResponse
    {
        $material = StudyMaterial::with(['classModel', 'section', 'subject', 'academicSession', 'creator'])
            ->findOrFail($id);

        return response()->json(['success' => true, 'data' => $material]);
    }

    /**
     * Update a study material.
     */
    public function materialUpdate(Request $request, int $id): JsonResponse
    {
        $material = StudyMaterial::findOrFail($id);

        $validated = $request->validate([
            'academic_session_id' => 'sometimes|exists:academic_sessions,id',
            'class_id'            => 'sometimes|exists:classes,id',
            'section_id'          => 'nullable|exists:sections,id',
            'subject_id'          => 'sometimes|exists:subjects,id',
            'title'               => 'sometimes|string|max:255',
            'title_bn'            => 'nullable|string|max:255',
            'description'         => 'nullable|string',
            'description_bn'      => 'nullable|string',
            'type'                => 'sometimes|in:google_drive,dropbox,youtube,website,document,other',
            'link'                => 'sometimes|url|max:2048',
            'file_name'           => 'nullable|string|max:255',
            'file_type'           => 'nullable|string|max:50',
            'is_public'           => 'nullable|boolean',
            'status'              => 'nullable|in:draft,published',
        ]);

        $material->update($validated);
        $material->load(['classModel', 'section', 'subject', 'academicSession', 'creator']);

        return response()->json(['success' => true, 'data' => $material]);
    }

    /**
     * Delete a study material.
     */
    public function materialDestroy(int $id): JsonResponse
    {
        $material = StudyMaterial::findOrFail($id);
        $material->delete();

        return response()->json(['success' => true, 'message' => 'Study material deleted']);
    }

    /**
     * Teacher portal: list study materials for the authenticated teacher.
     */
    public function teacherMaterials(Request $request): JsonResponse
    {
        $query = StudyMaterial::with(['classModel', 'section', 'subject', 'academicSession'])
            ->where('created_by', $request->user()->id)
            ->orderByDesc('created_at');

        if ($request->filled('academic_session_id')) {
            $query->where('academic_session_id', $request->academic_session_id);
        }
        if ($request->filled('class_id')) {
            $query->where('class_id', $request->class_id);
        }
        if ($request->filled('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        return response()->json(['success' => true, 'data' => $query->get()]);
    }

    /**
     * Student portal: list published study materials for student's class.
     */
    public function studentMaterials(Request $request): JsonResponse
    {
        $user = $request->user();
        // Get student's enrollment info
        $enrollment = \App\Models\StudentEnrollment::where('student_id', function ($q) use ($user) {
            $q->select('id')->from('students')->where('user_id', $user->id)->limit(1);
        })->latest()->first();

        if (!$enrollment) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $query = StudyMaterial::with(['subject', 'creator', 'classModel'])
            ->where('status', 'published')
            ->where('is_public', true)
            ->where('class_id', $enrollment->class_id)
            ->where(function ($q) use ($enrollment) {
                $q->whereNull('section_id')
                  ->orWhere('section_id', $enrollment->section_id);
            })
            ->orderByDesc('created_at');

        if ($request->filled('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        return response()->json(['success' => true, 'data' => $query->get()]);
    }
}
