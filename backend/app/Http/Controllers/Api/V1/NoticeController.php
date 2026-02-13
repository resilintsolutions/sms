<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Notice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NoticeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Notice::with('createdBy');
        if ($request->boolean('published_only')) {
            $query->where('is_published', true);
            $query->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            });
        }
        if ($request->has('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }
        if ($request->has('audience')) {
            $query->where(function ($q) use ($request) {
                $q->where('audience', 'all')->orWhere('audience', $request->audience);
            });
        }
        $notices = $query->latest('updated_at')->paginate($request->get('per_page', 15));
        return response()->json(['success' => true, 'data' => $notices]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'title' => 'required|string|max:255',
            'title_bn' => 'nullable|string|max:255',
            'body' => 'nullable|string',
            'body_bn' => 'nullable|string',
            'audience' => 'string|max:50',
            'is_published' => 'boolean',
            'published_at' => 'nullable|date',
            'expires_at' => 'nullable|date',
        ]);
        $validated['created_by'] = $request->user()?->id;
        $validated['is_published'] = $validated['is_published'] ?? false;
        if (! empty($validated['is_published']) && empty($validated['published_at'])) {
            $validated['published_at'] = now();
        }
        $notice = Notice::create($validated);
        return response()->json(['success' => true, 'data' => $notice], 201);
    }

    public function show(Notice $notice): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $notice->load('createdBy')]);
    }

    public function update(Request $request, Notice $notice): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'title_bn' => 'nullable|string|max:255',
            'body' => 'nullable|string',
            'body_bn' => 'nullable|string',
            'audience' => 'sometimes|string|max:50',
            'is_published' => 'boolean',
            'published_at' => 'nullable|date',
            'expires_at' => 'nullable|date',
        ]);
        if (!empty($validated['is_published'] ?? false) && empty($notice->published_at)) {
            $validated['published_at'] = $validated['published_at'] ?? now();
        }
        $notice->update($validated);
        return response()->json(['success' => true, 'data' => $notice]);
    }

    public function destroy(Notice $notice): JsonResponse
    {
        $notice->delete();
        return response()->json(['success' => true, 'message' => 'Notice deleted']);
    }
}
