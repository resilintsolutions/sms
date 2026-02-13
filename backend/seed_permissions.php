<?php
/**
 * Seed permissions and assign them to roles for granular RBAC.
 * Run: php seed_permissions.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Permission;
use App\Models\Role;

echo "=== Permission Seeder ===\n\n";

// ─── 1. Define all permissions by module ───
$modules = [
    'dashboard'  => ['view'],
    'users'      => ['view', 'create', 'edit', 'delete', 'manage'],
    'classes'    => ['view', 'create', 'edit', 'delete'],
    'sections'   => ['view', 'create', 'edit', 'delete'],
    'sessions'   => ['view', 'create', 'edit', 'delete'],
    'subjects'   => ['view', 'create', 'edit', 'delete'],
    'students'   => ['view', 'create', 'edit', 'delete', 'enroll'],
    'attendance' => ['view', 'mark', 'report'],
    'exams'      => ['view', 'create', 'edit', 'delete'],
    'marks'      => ['view', 'enter', 'calculate'],
    'fees'       => ['view', 'create', 'edit', 'delete', 'collect', 'report'],
    'invoices'   => ['view', 'create', 'edit', 'delete'],
    'notices'    => ['view', 'create', 'edit', 'delete'],
    'website'    => ['view', 'edit', 'upload'],
    'reports'    => ['view', 'generate'],
    'routine'    => ['view', 'edit'],
    'institutions' => ['view', 'edit'],
];

$allPermissions = [];
foreach ($modules as $module => $actions) {
    foreach ($actions as $action) {
        $name = "{$module}.{$action}";
        $perm = Permission::firstOrCreate(
            ['name' => $name],
            ['module' => $module, 'action' => $action, 'guard_name' => 'web']
        );
        $allPermissions[$name] = $perm;
        echo "  Permission: {$name}\n";
    }
}

echo "\nTotal permissions: " . count($allPermissions) . "\n\n";

// ─── 2. Define role-permission mapping ───
$rolePermissions = [
    'super_admin' => array_keys($allPermissions), // Full access

    'admin' => array_keys($allPermissions), // Full school access

    'teacher' => [
        'dashboard.view',
        'attendance.view', 'attendance.mark', 'attendance.report',
        'marks.view', 'marks.enter',
        'students.view',
        'classes.view',
        'sections.view',
        'subjects.view',
        'exams.view',
        'notices.view',
        'routine.view',
    ],

    'parent' => [
        'students.view',
        'attendance.view',
        'marks.view',
        'fees.view',
        'invoices.view',
        'notices.view',
    ],

    'student' => [
        'attendance.view',
        'marks.view',
        'notices.view',
    ],

    'accountant' => [
        'dashboard.view',
        'fees.view', 'fees.create', 'fees.edit', 'fees.delete', 'fees.collect', 'fees.report',
        'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.delete',
        'students.view',
        'reports.view', 'reports.generate',
        'notices.view',
    ],

    'librarian' => [
        'dashboard.view',
        'students.view',
        'notices.view',
    ],
];

// ─── 3. Assign permissions to roles ───
foreach ($rolePermissions as $roleName => $permNames) {
    $role = Role::where('name', $roleName)->first();
    if (!$role) {
        echo "  SKIP: Role '{$roleName}' not found.\n";
        continue;
    }

    $permIds = [];
    foreach ($permNames as $pn) {
        if (isset($allPermissions[$pn])) {
            $permIds[] = $allPermissions[$pn]->id;
        }
    }

    $role->permissions()->sync($permIds);
    echo "  Role '{$roleName}': assigned " . count($permIds) . " permissions\n";
}

echo "\n=== Done ===\n";
echo "\nPermission matrix:\n";
echo str_pad('', 100, '-') . "\n";
printf("%-15s", 'Role');
$shortModules = ['dashboard', 'users', 'classes', 'students', 'attendance', 'marks', 'fees', 'notices', 'website', 'reports'];
foreach ($shortModules as $m) {
    printf("%-12s", $m);
}
echo "\n" . str_pad('', 100, '-') . "\n";

foreach ($rolePermissions as $roleName => $permNames) {
    printf("%-15s", $roleName);
    foreach ($shortModules as $m) {
        $hasAny = false;
        foreach ($permNames as $pn) {
            if (str_starts_with($pn, $m . '.')) {
                $hasAny = true;
                break;
            }
        }
        printf("%-12s", $hasAny ? 'YES' : '—');
    }
    echo "\n";
}
echo str_pad('', 100, '-') . "\n";
