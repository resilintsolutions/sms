<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AcademicSessionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AcademicSession::with('institution');
        if ($request->has('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }
        if ($request->boolean('current_only')) {
            $query->where('is_current', true);
        }
        $sessions = $query->orderByDesc('start_date')->paginate($request->get('per_page', 15));
        return response()->json(['success' => true, 'data' => $sessions]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'name' => 'required|string|max:50',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'is_current' => 'boolean',
        ]);
        if (! empty($validated['is_current'])) {
            AcademicSession::where('institution_id', $validated['institution_id'])->update(['is_current' => false]);
        }
        $session = AcademicSession::create($validated);
        return response()->json(['success' => true, 'data' => $session], 201);
    }

    public function show(AcademicSession $academicSession): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $academicSession->load('institution')]);
    }

    public function update(Request $request, AcademicSession $academicSession): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:50',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date',
            'is_current' => 'boolean',
        ]);
        if (! empty($validated['is_current'])) {
            AcademicSession::where('institution_id', $academicSession->institution_id)->update(['is_current' => false]);
        }
        $academicSession->update($validated);
        return response()->json(['success' => true, 'data' => $academicSession]);
    }

    public function destroy(AcademicSession $academicSession): JsonResponse
    {
        $academicSession->delete();
        return response()->json(['success' => true, 'message' => 'Session deleted']);
    }
}
