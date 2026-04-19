<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Institution;
use App\Models\LandingPageConfig;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class SuperAdminController extends Controller
{
    /**
     * Resolve institution from domain/subdomain. Public endpoint for frontend routing.
     * Returns institution_id or null if no match.
     */
    public function resolveDomain(Request $request): JsonResponse
    {
        $domain = $request->input('domain', '');
        if (empty($domain)) {
            return response()->json(['success' => true, 'data' => ['institution_id' => null]]);
        }

        $domainNaked = preg_replace('/^www\./', '', strtolower($domain));

        // 1. Check custom_domain
        $inst = Institution::where('custom_domain', $domain)
            ->orWhere('custom_domain', $domainNaked)
            ->first();
        if ($inst) {
            return response()->json([
                'success' => true,
                'data' => [
                    'institution_id' => $inst->id,
                    'name' => $inst->name,
                    'type' => 'custom_domain',
                    'is_active' => $inst->is_active,
                ],
            ]);
        }

        // 2. Check subdomain (e.g. dt-school.sms.resilentsolutions.com)
        $platformDomain = env('PLATFORM_DOMAIN', 'sms.resilentsolutions.com');
        $platformDomainEscaped = preg_quote($platformDomain, '/');
        if (preg_match('/^(.+)\.' . $platformDomainEscaped . '$/i', $domainNaked, $matches)) {
            $slug = strtolower($matches[1]);
            $inst = Institution::where('subdomain', $slug)->first();
            if ($inst) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'institution_id' => $inst->id,
                        'name' => $inst->name,
                        'type' => 'subdomain',
                        'is_active' => $inst->is_active,
                    ],
                ]);
            }
        }

        return response()->json(['success' => true, 'data' => ['institution_id' => null]]);
    }

    /**
     * Verify DNS for a school's custom domain - checks if domain resolves to our server IP.
     */
    public function verifyDomain(Request $request, Institution $institution): JsonResponse
    {
        $domain = $institution->custom_domain;
        if (empty($domain)) {
            return response()->json([
                'success' => false,
                'message' => 'No custom domain set for this school.',
            ], 422);
        }

        $serverIp = env('SERVER_IP', '185.146.167.202');
        $verified = false;
        $dnsInfo = [];

        // Check A record
        $aRecords = @dns_get_record($domain, DNS_A);
        if ($aRecords) {
            foreach ($aRecords as $record) {
                $dnsInfo[] = ['type' => 'A', 'value' => $record['ip'] ?? ''];
                if (($record['ip'] ?? '') === $serverIp) {
                    $verified = true;
                }
            }
        }

        // Check CNAME record
        $cnameRecords = @dns_get_record($domain, DNS_CNAME);
        if ($cnameRecords) {
            foreach ($cnameRecords as $record) {
                $target = $record['target'] ?? '';
                $dnsInfo[] = ['type' => 'CNAME', 'value' => $target];
                // Resolve the CNAME target to see if it points to our IP
                $resolved = @gethostbyname($target);
                if ($resolved === $serverIp) {
                    $verified = true;
                }
            }
        }

        // Also resolve the domain directly
        $resolvedIp = @gethostbyname($domain);
        if ($resolvedIp === $serverIp) {
            $verified = true;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'domain' => $domain,
                'server_ip' => $serverIp,
                'verified' => $verified,
                'resolved_ip' => $resolvedIp !== $domain ? $resolvedIp : null,
                'dns_records' => $dnsInfo,
            ],
        ]);
    }

    /**
     * Create a new institution (school) with an initial admin user.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name'                => 'required|string|max:255',
            'name_bn'             => 'nullable|string|max:255',
            'eiin'                => 'nullable|string|max:20',
            'address'             => 'nullable|string|max:500',
            'email'               => 'nullable|email|max:255',
            'phone'               => 'nullable|string|max:50',
            'custom_domain'       => 'nullable|string|max:255|unique:institutions,custom_domain',
            'subdomain'           => 'nullable|string|max:100|unique:institutions,subdomain',
            'subscription_status' => 'nullable|string|in:active,trial,suspended,cancelled',
            'feature_flags'       => 'nullable|array',
            // Optional: create an admin user for this school
            'admin_name'          => 'nullable|string|max:255',
            'admin_email'         => 'nullable|email|max:255|unique:users,email',
            'admin_password'      => 'required_with:admin_email|string|min:8|max:100',
        ]);

        $institution = DB::transaction(function () use ($request) {
            $institution = Institution::create([
                'name'                => $request->input('name'),
                'name_bn'             => $request->input('name_bn'),
                'eiin'                => $request->input('eiin'),
                'address'             => $request->input('address'),
                'email'               => $request->input('email'),
                'phone'               => $request->input('phone'),
                'custom_domain'       => $request->input('custom_domain') ?: null,
                'subdomain'           => $request->input('subdomain') ?: null,
                'subscription_status' => $request->input('subscription_status', 'active'),
                'feature_flags'       => $request->input('feature_flags', [
                    'fees' => true,
                    'attendance' => true,
                    'exams' => true,
                    'notices' => true,
                    'landing_page' => true,
                ]),
                'is_active'           => true,
            ]);

            // Create default landing page config
            LandingPageConfig::create([
                'institution_id' => $institution->id,
                'config'         => LandingPageConfig::defaultConfig(),
            ]);

            // Create initial admin user if credentials provided
            if ($request->filled('admin_email')) {
                $user = User::create([
                    'name'           => $request->input('admin_name', 'Admin'),
                    'email'          => $request->input('admin_email'),
                    'password'       => Hash::make($request->input('admin_password')),
                    'institution_id' => $institution->id,
                ]);

                $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
                $user->roles()->syncWithoutDetaching([$adminRole->id]);
            }

            return $institution;
        });

        $institution->loadCount(['users', 'students']);

        return response()->json([
            'success' => true,
            'data'    => $institution,
            'message' => 'School created successfully.',
        ], 201);
    }

    /**
     * Show single institution with landing config - super admin only.
     */
    public function show(Institution $institution): JsonResponse
    {
        $row = LandingPageConfig::where('institution_id', $institution->id)->first();
        $config = $row
            ? LandingPageConfig::mergeWithDefaults($row->config)
            : LandingPageConfig::defaultConfig();

        $institution->loadCount(['users', 'students']);

        return response()->json([
            'success' => true,
            'data' => [
                'institution' => $institution,
                'landing_config' => $config,
            ],
        ]);
    }

    /**
     * Update landing config for an institution - super admin only.
     */
    public function updateConfig(Request $request, Institution $institution): JsonResponse
    {
        $request->validate([
            'config' => 'required|array',
        ]);

        $row = LandingPageConfig::firstOrNew(['institution_id' => $institution->id]);
        $existing = $row->exists ? $row->config : [];
        $merged = LandingPageConfig::mergeWithDefaults($existing);
        $merged = LandingPageConfig::deepMerge($merged, $request->input('config', []));

        $row->institution_id = $institution->id;
        $row->config = $merged;
        $row->save();

        return response()->json([
            'success' => true,
            'data' => LandingPageConfig::mergeWithDefaults($row->config),
            'message' => 'School configuration updated.',
        ]);
    }

    /**
     * List all institutions (subscriptions) - super admin only.
     */
    public function index(Request $request): JsonResponse
    {
        $institutions = Institution::withCount(['users', 'students'])
            ->orderBy('name')
            ->get(['id', 'name', 'name_bn', 'eiin', 'email', 'phone', 'custom_domain', 'subdomain', 'is_active', 'subscription_status', 'feature_flags', 'created_at']);

        return response()->json(['success' => true, 'data' => $institutions]);
    }

    /**
     * Update institution: is_active, subscription_status, feature_flags, custom_domain, subdomain.
     */
    public function update(Request $request, Institution $institution): JsonResponse
    {
        $request->validate([
            'name' => 'nullable|string|max:255',
            'name_bn' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean',
            'subscription_status' => 'nullable|string|in:active,trial,suspended,cancelled',
            'custom_domain' => 'nullable|string|max:255',
            'subdomain' => 'nullable|string|max:100',
            'feature_flags' => 'nullable|array',
            'feature_flags.fees' => 'nullable|boolean',
            'feature_flags.attendance' => 'nullable|boolean',
            'feature_flags.exams' => 'nullable|boolean',
            'feature_flags.notices' => 'nullable|boolean',
            'feature_flags.landing_page' => 'nullable|boolean',
        ]);

        if ($request->filled('name')) {
            $institution->name = $request->input('name');
        }
        if ($request->has('name_bn')) {
            $institution->name_bn = $request->input('name_bn') ?: null;
        }
        if ($request->has('email')) {
            $institution->email = $request->input('email') ?: null;
        }
        if ($request->has('phone')) {
            $institution->phone = $request->input('phone') ?: null;
        }
        if ($request->has('is_active')) {
            $institution->is_active = $request->boolean('is_active');
        }
        if ($request->has('subscription_status')) {
            $institution->subscription_status = $request->input('subscription_status');
        }
        if ($request->has('custom_domain')) {
            $institution->custom_domain = $request->input('custom_domain') ?: null;
        }
        if ($request->has('subdomain')) {
            $institution->subdomain = $request->input('subdomain') ?: null;
        }
        if ($request->has('feature_flags')) {
            $flags = $institution->feature_flags ?? [];
            $institution->feature_flags = array_merge($flags, $request->input('feature_flags', []));
        }

        $institution->save();

        return response()->json([
            'success' => true,
            'data' => $institution->fresh(['id', 'name', 'email', 'custom_domain', 'subdomain', 'is_active', 'subscription_status', 'feature_flags']),
            'message' => 'School updated.',
        ]);
    }

    /**
     * Platform stats for super admin dashboard.
     */
    public function stats(): JsonResponse
    {
        $totalSchools = Institution::count();
        $activeSchools = Institution::where('is_active', true)->count();
        $totalUsers = User::count();

        return response()->json([
            'success' => true,
            'data' => [
                'total_schools' => $totalSchools,
                'active_schools' => $activeSchools,
                'suspended_schools' => $totalSchools - $activeSchools,
                'total_users' => $totalUsers,
            ],
        ]);
    }

    /**
     * List admin users for an institution.
     */
    public function listAdmins(Institution $institution): JsonResponse
    {
        $adminRole = Role::where('name', 'admin')->first();

        $admins = User::where('institution_id', $institution->id)
            ->whereHas('roles', function ($q) {
                $q->where('name', 'admin');
            })
            ->get(['id', 'name', 'name_bn', 'email', 'phone', 'is_active', 'last_login_at', 'created_at']);

        return response()->json([
            'success' => true,
            'data' => $admins,
        ]);
    }

    /**
     * Add a new admin user to an institution.
     */
    public function addAdmin(Request $request, Institution $institution): JsonResponse
    {
        $request->validate([
            'name'     => 'required|string|max:255',
            'name_bn'  => 'nullable|string|max:255',
            'email'    => 'required|email|max:255|unique:users,email',
            'phone'    => 'nullable|string|max:50',
            'password' => 'required|string|min:8|max:100',
        ]);

        $user = User::create([
            'name'           => $request->input('name'),
            'name_bn'        => $request->input('name_bn'),
            'email'          => $request->input('email'),
            'phone'          => $request->input('phone'),
            'password'       => Hash::make($request->input('password')),
            'institution_id' => $institution->id,
            'is_active'      => true,
        ]);

        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $user->roles()->syncWithoutDetaching([$adminRole->id]);

        return response()->json([
            'success' => true,
            'data'    => $user->only(['id', 'name', 'name_bn', 'email', 'phone', 'is_active', 'created_at']),
            'message' => 'Admin user created successfully.',
        ], 201);
    }

    /**
     * Update admin user details (name, email, phone).
     */
    public function updateAdmin(Request $request, Institution $institution, User $user): JsonResponse
    {
        if ($user->institution_id !== $institution->id) {
            return response()->json(['success' => false, 'message' => 'User does not belong to this institution.'], 403);
        }

        $request->validate([
            'name'    => 'nullable|string|max:255',
            'name_bn' => 'nullable|string|max:255',
            'email'   => 'nullable|email|max:255|unique:users,email,' . $user->id,
            'phone'   => 'nullable|string|max:50',
        ]);

        if ($request->filled('name')) $user->name = $request->input('name');
        if ($request->has('name_bn')) $user->name_bn = $request->input('name_bn') ?: null;
        if ($request->filled('email')) $user->email = $request->input('email');
        if ($request->has('phone')) $user->phone = $request->input('phone') ?: null;

        $user->save();

        return response()->json([
            'success' => true,
            'data'    => $user->only(['id', 'name', 'name_bn', 'email', 'phone', 'is_active', 'last_login_at', 'created_at']),
            'message' => 'Admin updated successfully.',
        ]);
    }

    /**
     * Reset an admin user's password.
     */
    public function resetAdminPassword(Request $request, Institution $institution, User $user): JsonResponse
    {
        if ($user->institution_id !== $institution->id) {
            return response()->json(['success' => false, 'message' => 'User does not belong to this institution.'], 403);
        }

        $request->validate([
            'password' => 'required|string|min:8|max:100',
        ]);

        $user->password = Hash::make($request->input('password'));
        // Revoke all existing tokens so the admin is logged out with old creds
        $user->tokens()->delete();
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Password reset successfully. All active sessions have been terminated.',
        ]);
    }

    /**
     * Toggle admin user active status.
     */
    public function toggleAdminActive(Institution $institution, User $user): JsonResponse
    {
        if ($user->institution_id !== $institution->id) {
            return response()->json(['success' => false, 'message' => 'User does not belong to this institution.'], 403);
        }

        $user->is_active = !$user->is_active;

        // If deactivating, revoke all tokens
        if (!$user->is_active) {
            $user->tokens()->delete();
        }

        $user->save();

        return response()->json([
            'success' => true,
            'data'    => ['is_active' => $user->is_active],
            'message' => $user->is_active ? 'Admin activated.' : 'Admin deactivated. All sessions terminated.',
        ]);
    }
}
