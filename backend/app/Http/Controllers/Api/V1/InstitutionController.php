<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Institution;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InstitutionController extends Controller
{
    public function index(): JsonResponse
    {
        $institutions = Institution::where('is_active', true)->get();
        return response()->json(['success' => true, 'data' => $institutions]);
    }

    public function show(Institution $institution): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $institution]);
    }

    public function update(Request $request, Institution $institution): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'name_bn' => 'nullable|string|max:255',
            'eiin' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email',
            'currency' => 'sometimes|string|size:3',
            'locale' => 'sometimes|string|max:5',
        ]);
        $institution->update($validated);
        return response()->json(['success' => true, 'data' => $institution]);
    }
}
