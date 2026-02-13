<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Guardian;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserManagementController extends Controller
{
    /**
     * List all users for the current institution with their roles.
     */
    public function index(Request $request): JsonResponse
    {
        $institutionId = $request->user()->institution_id;

        $query = User::where('institution_id', $institutionId)
            ->with('roles:id,name,label')
            ->withCount(['employee', 'guardian', 'student']);

        // School admins cannot see super_admin users
        if (!$request->user()->hasRole('super_admin')) {
            $query->whereDoesntHave('roles', fn ($q) => $q->where('name', 'super_admin'));
        }

        // Search filter
        if ($request->filled('search')) {
            $s = $request->input('search');
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%")
                  ->orWhere('phone', 'like', "%{$s}%");
            });
        }

        // Role filter
        if ($request->filled('role')) {
            $roleName = $request->input('role');
            $query->whereHas('roles', fn ($q) => $q->where('name', $roleName));
        }

        // Status filter
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $users = $query->orderBy('name')->get([
            'id', 'institution_id', 'name', 'name_bn', 'email', 'phone',
            'avatar', 'is_active', 'last_login_at', 'created_at',
        ]);

        return response()->json(['success' => true, 'data' => $users]);
    }

    /**
     * Show a single user with full details.
     */
    public function show(Request $request, User $user): JsonResponse
    {
        $this->authorizeInstitution($request, $user);

        $user->load('roles:id,name,label', 'employee', 'guardian');

        return response()->json(['success' => true, 'data' => $user]);
    }

    /**
     * Create a new user within the institution.
     */
    public function store(Request $request): JsonResponse
    {
        $institutionId = $request->user()->institution_id;

        $request->validate([
            'name'          => 'required|string|max:255',
            'name_bn'       => 'nullable|string|max:255',
            'email'         => 'required|email|max:255|unique:users,email',
            'password'      => 'required|string|min:6|max:100',
            'phone'         => 'nullable|string|max:50',
            'is_active'     => 'nullable|boolean',
            'roles'         => 'required|array|min:1',
            'roles.*'       => 'string|exists:roles,name',
            // Optional employee fields
            'employee_id_num' => 'nullable|string|max:50|unique:employees,employee_id',
            'designation'     => 'nullable|string|max:255',
            'department'      => 'nullable|string|max:255',
            'is_teacher'      => 'nullable|boolean',
            'join_date'       => 'nullable|date',
            // Optional guardian fields
            'relation'      => 'nullable|string|max:50',
            'nid'           => 'nullable|string|max:20',
            'address'       => 'nullable|string|max:500',
            'occupation'    => 'nullable|string|max:255',
        ]);

        $allowedRoles = $this->filterAllowedRoles($request, $request->input('roles', []));

        $user = DB::transaction(function () use ($request, $institutionId, $allowedRoles) {
            $user = User::create([
                'institution_id' => $institutionId,
                'name'           => $request->input('name'),
                'name_bn'        => $request->input('name_bn'),
                'email'          => $request->input('email'),
                'password'       => Hash::make($request->input('password')),
                'phone'          => $request->input('phone'),
                'is_active'      => $request->boolean('is_active', true),
            ]);

            // Attach roles (filtered)
            $roleIds = Role::whereIn('name', $allowedRoles)->pluck('id');
            $user->roles()->sync($roleIds);

            $roles = $allowedRoles;

            // Auto-create employee record for teacher/admin
            if (in_array('teacher', $roles) || in_array('admin', $roles)) {
                Employee::create([
                    'institution_id' => $institutionId,
                    'user_id'        => $user->id,
                    'employee_id'    => $request->input('employee_id_num', 'EMP-' . str_pad($user->id, 4, '0', STR_PAD_LEFT)),
                    'name'           => $user->name,
                    'name_bn'        => $user->name_bn,
                    'designation'    => $request->input('designation', in_array('teacher', $roles) ? 'Teacher' : 'Admin'),
                    'department'     => $request->input('department', 'Academic'),
                    'phone'          => $user->phone,
                    'email'          => $user->email,
                    'join_date'      => $request->input('join_date', now()),
                    'is_teacher'     => in_array('teacher', $roles),
                    'is_active'      => true,
                ]);
            }

            // Auto-create guardian record for parent role
            if (in_array('parent', $roles)) {
                Guardian::create([
                    'institution_id' => $institutionId,
                    'user_id'        => $user->id,
                    'name'           => $user->name,
                    'name_bn'        => $user->name_bn,
                    'relation'       => $request->input('relation', 'father'),
                    'phone'          => $user->phone ?? '',
                    'email'          => $user->email,
                    'nid'            => $request->input('nid'),
                    'address'        => $request->input('address'),
                    'occupation'     => $request->input('occupation'),
                ]);
            }

            return $user;
        });

        $user->load('roles:id,name,label');

        return response()->json([
            'success' => true,
            'data'    => $user,
            'message' => 'User created successfully.',
        ], 201);
    }

    /**
     * Update an existing user.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $this->authorizeInstitution($request, $user);

        $request->validate([
            'name'      => 'nullable|string|max:255',
            'name_bn'   => 'nullable|string|max:255',
            'email'     => ['nullable', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password'  => 'nullable|string|min:6|max:100',
            'phone'     => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean',
            'roles'     => 'nullable|array|min:1',
            'roles.*'   => 'string|exists:roles,name',
        ]);

        DB::transaction(function () use ($request, $user) {
            if ($request->filled('name')) $user->name = $request->input('name');
            if ($request->has('name_bn')) $user->name_bn = $request->input('name_bn');
            if ($request->filled('email')) $user->email = $request->input('email');
            if ($request->filled('password')) $user->password = Hash::make($request->input('password'));
            if ($request->has('phone')) $user->phone = $request->input('phone');
            if ($request->has('is_active')) $user->is_active = $request->boolean('is_active');
            $user->save();

            // Update roles if provided (filtered)
            if ($request->has('roles')) {
                $filtered = $this->filterAllowedRoles($request, $request->input('roles', []));
                $roleIds = Role::whereIn('name', $filtered)->pluck('id');
                $user->roles()->sync($roleIds);
            }
        });

        $user->load('roles:id,name,label');

        return response()->json([
            'success' => true,
            'data'    => $user,
            'message' => 'User updated successfully.',
        ]);
    }

    /**
     * Delete a user (soft check: prevent self-delete).
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->authorizeInstitution($request, $user);

        if ($user->id === $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot delete your own account.',
            ], 422);
        }

        DB::transaction(function () use ($user) {
            $user->roles()->detach();
            $user->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully.',
        ]);
    }

    /**
     * Get all available roles.
     * School admins cannot see or assign 'super_admin' role.
     */
    public function roles(Request $request): JsonResponse
    {
        $query = Role::select('id', 'name', 'label', 'description')->orderBy('name');

        // Only super_admin can see the super_admin role
        if (!$request->user()->hasRole('super_admin')) {
            $query->where('name', '!=', 'super_admin');
        }

        return response()->json(['success' => true, 'data' => $query->get()]);
    }

    /**
     * Update only roles for a specific user.
     */
    public function updateRoles(Request $request, User $user): JsonResponse
    {
        $this->authorizeInstitution($request, $user);

        $request->validate([
            'roles'   => 'required|array|min:1',
            'roles.*' => 'string|exists:roles,name',
        ]);

        $filtered = $this->filterAllowedRoles($request, $request->input('roles'));
        $roleIds = Role::whereIn('name', $filtered)->pluck('id');
        $user->roles()->sync($roleIds);

        $user->load('roles:id,name,label');

        return response()->json([
            'success' => true,
            'data'    => $user,
            'message' => 'User roles updated successfully.',
        ]);
    }

    /**
     * Toggle user active status.
     */
    public function toggleActive(Request $request, User $user): JsonResponse
    {
        $this->authorizeInstitution($request, $user);

        if ($user->id === $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot deactivate your own account.',
            ], 422);
        }

        $user->is_active = !$user->is_active;
        $user->save();

        return response()->json([
            'success' => true,
            'data'    => $user,
            'message' => $user->is_active ? 'User activated.' : 'User deactivated.',
        ]);
    }

    /**
     * Ensure the target user belongs to the same institution.
     */
    private function authorizeInstitution(Request $request, User $user): void
    {
        if ($user->institution_id !== $request->user()->institution_id) {
            abort(403, 'You cannot manage users from another institution.');
        }
    }

    /**
     * Filter out protected roles that the current user cannot assign.
     * School admins cannot assign 'super_admin' role.
     */
    private function filterAllowedRoles(Request $request, array $roleNames): array
    {
        if (!$request->user()->hasRole('super_admin')) {
            $roleNames = array_values(array_filter($roleNames, fn ($r) => $r !== 'super_admin'));
        }
        return $roleNames;
    }
}
