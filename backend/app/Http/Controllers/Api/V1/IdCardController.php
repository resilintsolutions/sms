<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\IdCardCustomField;
use App\Models\IdCardTemplate;
use App\Models\Institution;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class IdCardController extends Controller
{
    /* ─── Templates ─── */

    /** List all templates (samples + institution-specific) for a given type */
    public function templates(Request $request): JsonResponse
    {
        $request->validate(['type' => 'required|in:student,teacher,staff']);
        $user = $request->user();
        $instId = $user->institution_id;

        $templates = IdCardTemplate::where('type', $request->type)
            ->where(function ($q) use ($instId) {
                $q->where('institution_id', $instId)
                  ->orWhere('is_sample', true);
            })
            ->orderByDesc('is_sample')
            ->orderBy('name')
            ->get();

        return response()->json(['success' => true, 'data' => $templates]);
    }

    /** Create a new template (admin uploads own design) */
    public function storeTemplate(Request $request): JsonResponse
    {
        $request->validate([
            'name'             => 'required|string|max:100',
            'type'             => 'required|in:student,teacher,staff',
            'background_image' => 'nullable|image|mimes:jpeg,png,webp|max:5120',
            'field_positions'  => 'nullable|json',
            'design_config'    => 'nullable|json',
        ]);

        $url = null;
        if ($request->hasFile('background_image')) {
            $file = $request->file('background_image');
            $ext  = $file->getClientOriginalExtension() ?: 'png';
            $name = 'idcard_' . Str::random(12) . '.' . strtolower($ext);
            $dir  = public_path('id-cards');
            if (!is_dir($dir)) { mkdir($dir, 0755, true); }
            $file->move($dir, $name);
            $url = asset('id-cards/' . $name);
        }

        $template = IdCardTemplate::create([
            'institution_id'   => $request->user()->institution_id,
            'name'             => $request->name,
            'type'             => $request->type,
            'background_image' => $url,
            'is_sample'        => false,
            'field_positions'  => $request->field_positions ? json_decode($request->field_positions, true) : null,
            'design_config'    => $request->design_config ? json_decode($request->design_config, true) : null,
            'is_active'        => true,
        ]);

        return response()->json(['success' => true, 'data' => $template, 'message' => 'Template created.'], 201);
    }

    /** Update a template's design_config */
    public function updateTemplate(Request $request, int $id): JsonResponse
    {
        $template = IdCardTemplate::findOrFail($id);

        $request->validate([
            'name'            => 'sometimes|string|max:100',
            'design_config'   => 'nullable|json',
            'field_positions' => 'nullable|json',
        ]);

        if ($request->has('name')) {
            $template->name = $request->name;
        }
        if ($request->has('design_config')) {
            $template->design_config = $request->design_config ? json_decode($request->design_config, true) : null;
        }
        if ($request->has('field_positions')) {
            $template->field_positions = $request->field_positions ? json_decode($request->field_positions, true) : null;
        }
        if ($request->hasFile('background_image')) {
            $file = $request->file('background_image');
            $ext  = $file->getClientOriginalExtension() ?: 'png';
            $fname = 'idcard_' . Str::random(12) . '.' . strtolower($ext);
            $dir  = public_path('id-cards');
            if (!is_dir($dir)) { mkdir($dir, 0755, true); }
            $file->move($dir, $fname);
            $template->background_image = asset('id-cards/' . $fname);
        }
        $template->save();

        return response()->json(['success' => true, 'data' => $template, 'message' => 'Template updated.']);
    }

    /** Delete a custom template (not samples) */
    public function destroyTemplate(int $id): JsonResponse
    {
        $template = IdCardTemplate::findOrFail($id);
        if ($template->is_sample) {
            return response()->json(['success' => false, 'message' => 'Cannot delete sample templates.'], 403);
        }
        $template->delete();
        return response()->json(['success' => true, 'message' => 'Template deleted.']);
    }

    /* ─── Custom Fields ─── */

    /** List custom fields for the institution */
    public function customFields(Request $request): JsonResponse
    {
        $instId = $request->user()->institution_id;
        $fields = IdCardCustomField::where('institution_id', $instId)
            ->orderBy('sort_order')
            ->orderBy('label')
            ->get();

        return response()->json(['success' => true, 'data' => $fields]);
    }

    /** Create a new custom field */
    public function storeCustomField(Request $request): JsonResponse
    {
        $request->validate([
            'label'         => 'required|string|max:100',
            'label_bn'      => 'nullable|string|max:100',
            'field_key'     => 'required|string|max:50|unique:id_card_custom_fields,field_key',
            'applies_to'    => 'required|in:student,teacher,staff,all',
            'default_value' => 'nullable|string|max:255',
            'sort_order'    => 'nullable|integer',
        ]);

        $field = IdCardCustomField::create([
            'institution_id' => $request->user()->institution_id,
            'label'          => $request->label,
            'label_bn'       => $request->label_bn,
            'field_key'      => $request->field_key,
            'applies_to'     => $request->applies_to,
            'default_value'  => $request->default_value,
            'sort_order'     => $request->sort_order ?? 0,
            'is_active'      => true,
        ]);

        return response()->json(['success' => true, 'data' => $field, 'message' => 'Custom field created.'], 201);
    }

    /** Update a custom field */
    public function updateCustomField(Request $request, int $id): JsonResponse
    {
        $field = IdCardCustomField::findOrFail($id);

        $request->validate([
            'label'         => 'sometimes|string|max:100',
            'label_bn'      => 'nullable|string|max:100',
            'applies_to'    => 'sometimes|in:student,teacher,staff,all',
            'default_value' => 'nullable|string|max:255',
            'sort_order'    => 'nullable|integer',
            'is_active'     => 'sometimes|boolean',
        ]);

        $field->update($request->only(['label', 'label_bn', 'applies_to', 'default_value', 'sort_order', 'is_active']));

        return response()->json(['success' => true, 'data' => $field, 'message' => 'Custom field updated.']);
    }

    /** Delete a custom field */
    public function destroyCustomField(int $id): JsonResponse
    {
        $field = IdCardCustomField::findOrFail($id);
        $field->delete();
        return response()->json(['success' => true, 'message' => 'Custom field deleted.']);
    }

    /* ─── People Lists ─── */

    /** Get students for ID card generation (with optional filters) */
    public function students(Request $request): JsonResponse
    {
        $instId = $request->user()->institution_id;
        $q = Student::where('institution_id', $instId)
            ->where('status', 'active')
            ->with(['enrollments' => fn ($e) => $e->with('section.class', 'academicSession')->latest('id')->limit(1)]);

        if ($request->filled('class_id')) {
            $q->whereHas('enrollments.section', fn ($s) => $s->where('class_id', $request->class_id));
        }
        if ($request->filled('section_id')) {
            $q->whereHas('enrollments', fn ($e) => $e->where('section_id', $request->section_id));
        }
        if ($request->filled('search')) {
            $term = $request->search;
            $q->where(fn ($w) => $w->where('name', 'like', "%$term%")
                ->orWhere('student_id', 'like', "%$term%"));
        }

        return response()->json(['success' => true, 'data' => $q->orderBy('name')->limit(200)->get()]);
    }

    /** Get employees (teachers / staff) for ID card generation */
    public function employees(Request $request): JsonResponse
    {
        $instId = $request->user()->institution_id;
        $type   = $request->get('type', 'teacher');

        $q = Employee::where('institution_id', $instId)
            ->where('is_active', true);

        if ($type === 'teacher') {
            $q->where('is_teacher', true);
        } else {
            $q->where('is_teacher', false);
        }

        if ($request->filled('search')) {
            $term = $request->search;
            $q->where(fn ($w) => $w->where('name', 'like', "%$term%")
                ->orWhere('employee_id', 'like', "%$term%"));
        }

        return response()->json(['success' => true, 'data' => $q->orderBy('name')->limit(200)->get()]);
    }

    /** Get institution info for ID card header */
    public function institutionInfo(Request $request): JsonResponse
    {
        $inst = Institution::find($request->user()->institution_id);
        return response()->json([
            'success' => true,
            'data'    => [
                'name'    => $inst->name ?? '',
                'name_bn' => $inst->name_bn ?? '',
                'address' => $inst->address ?? '',
                'phone'   => $inst->phone ?? '',
                'email'   => $inst->email ?? '',
                'logo'    => $inst->logo ?? '',
                'eiin'    => $inst->eiin ?? '',
            ],
        ]);
    }
}
