<?php
/**
 * Seed roles with labels/descriptions + dummy users for user management testing.
 * Run: php seed_user_management.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Employee;
use App\Models\Guardian;
use App\Models\Institution;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

echo "=== User Management Seeder ===\n\n";

// ─── 1. Ensure all roles exist with labels and descriptions ───
$rolesData = [
    ['name' => 'super_admin', 'label' => 'Super Admin',  'guard_name' => 'web', 'description' => 'Full platform access across all institutions'],
    ['name' => 'admin',       'label' => 'Administrator', 'guard_name' => 'web', 'description' => 'School administrator with full school access'],
    ['name' => 'teacher',     'label' => 'Teacher',       'guard_name' => 'web', 'description' => 'Teaching staff with class and grade management'],
    ['name' => 'parent',      'label' => 'Parent',        'guard_name' => 'web', 'description' => 'Parent/guardian with child monitoring access'],
    ['name' => 'student',     'label' => 'Student',       'guard_name' => 'web', 'description' => 'Student with view-only access to own records'],
    ['name' => 'accountant',  'label' => 'Accountant',    'guard_name' => 'web', 'description' => 'Finance staff managing fees and payments'],
    ['name' => 'librarian',   'label' => 'Librarian',     'guard_name' => 'web', 'description' => 'Library management and book tracking'],
];

foreach ($rolesData as $rd) {
    $role = Role::firstOrNew(['name' => $rd['name']]);
    $role->label = $rd['label'];
    $role->guard_name = $rd['guard_name'];
    $role->description = $rd['description'];
    $role->save();
    echo "  Role: {$rd['name']} ({$rd['label']})\n";
}
echo "\n";

// ─── 2. Get the first institution ───
$institution = Institution::first();
if (!$institution) {
    echo "ERROR: No institution found. Run seed_admin.php first.\n";
    exit(1);
}
echo "Institution: {$institution->name} (ID: {$institution->id})\n\n";

$instId = $institution->id;
$adminRole = Role::where('name', 'admin')->first();
$teacherRole = Role::where('name', 'teacher')->first();
$parentRole = Role::where('name', 'parent')->first();
$studentRole = Role::where('name', 'student')->first();
$accountantRole = Role::where('name', 'accountant')->first();
$librarianRole = Role::where('name', 'librarian')->first();

// ─── 3. Seed dummy users ───
$dummyUsers = [
    // Teachers
    [
        'name' => 'Md. Rafiq Ahmed', 'name_bn' => 'মোঃ রফিক আহমেদ',
        'email' => 'rafiq.teacher@school.edu.bd', 'phone' => '01711111001',
        'roles' => [$teacherRole->id],
        'employee' => ['employee_id' => 'TCH-001', 'designation' => 'Senior Teacher', 'department' => 'Academic', 'is_teacher' => true, 'join_date' => '2020-01-15'],
    ],
    [
        'name' => 'Fatema Begum', 'name_bn' => 'ফাতেমা বেগম',
        'email' => 'fatema.teacher@school.edu.bd', 'phone' => '01711111002',
        'roles' => [$teacherRole->id],
        'employee' => ['employee_id' => 'TCH-002', 'designation' => 'Assistant Teacher', 'department' => 'Academic', 'is_teacher' => true, 'join_date' => '2021-06-01'],
    ],
    [
        'name' => 'Kamal Hossain', 'name_bn' => 'কামাল হোসাইন',
        'email' => 'kamal.teacher@school.edu.bd', 'phone' => '01711111003',
        'roles' => [$teacherRole->id],
        'employee' => ['employee_id' => 'TCH-003', 'designation' => 'Teacher', 'department' => 'Academic', 'is_teacher' => true, 'join_date' => '2022-01-10'],
    ],
    [
        'name' => 'Nasreen Akter', 'name_bn' => 'নাসরিন আক্তার',
        'email' => 'nasreen.teacher@school.edu.bd', 'phone' => '01711111004',
        'roles' => [$teacherRole->id],
        'employee' => ['employee_id' => 'TCH-004', 'designation' => 'Teacher', 'department' => 'Academic', 'is_teacher' => true, 'join_date' => '2023-03-20'],
    ],
    [
        'name' => 'Aminul Islam', 'name_bn' => 'আমিনুল ইসলাম',
        'email' => 'aminul.teacher@school.edu.bd', 'phone' => '01711111005',
        'roles' => [$teacherRole->id],
        'employee' => ['employee_id' => 'TCH-005', 'designation' => 'Head Teacher', 'department' => 'Academic', 'is_teacher' => true, 'join_date' => '2018-07-01'],
    ],

    // Parents
    [
        'name' => 'Abdul Karim', 'name_bn' => 'আব্দুল করিম',
        'email' => 'karim.parent@school.edu.bd', 'phone' => '01811111001',
        'roles' => [$parentRole->id],
        'guardian' => ['relation' => 'father', 'occupation' => 'Businessman', 'address' => '123 Mirpur, Dhaka', 'nid' => '1990123456789'],
    ],
    [
        'name' => 'Rehana Sultana', 'name_bn' => 'রেহানা সুলতানা',
        'email' => 'rehana.parent@school.edu.bd', 'phone' => '01811111002',
        'roles' => [$parentRole->id],
        'guardian' => ['relation' => 'mother', 'occupation' => 'Homemaker', 'address' => '456 Dhanmondi, Dhaka', 'nid' => '1985678912345'],
    ],
    [
        'name' => 'Jashim Uddin', 'name_bn' => 'যশীম উদ্দিন',
        'email' => 'jashim.parent@school.edu.bd', 'phone' => '01811111003',
        'roles' => [$parentRole->id],
        'guardian' => ['relation' => 'father', 'occupation' => 'Government Officer', 'address' => '789 Mohammadpur, Dhaka', 'nid' => '1978456123789'],
    ],
    [
        'name' => 'Salma Khatun', 'name_bn' => 'সালমা খাতুন',
        'email' => 'salma.parent@school.edu.bd', 'phone' => '01811111004',
        'roles' => [$parentRole->id],
        'guardian' => ['relation' => 'mother', 'occupation' => 'Teacher', 'address' => '101 Uttara, Dhaka', 'nid' => '1982789456123'],
    ],

    // Accountant
    [
        'name' => 'Shahidul Alam', 'name_bn' => 'শহীদুল আলম',
        'email' => 'shahidul.accountant@school.edu.bd', 'phone' => '01911111001',
        'roles' => [$accountantRole->id],
        'employee' => ['employee_id' => 'ACC-001', 'designation' => 'Head Accountant', 'department' => 'Accounts', 'is_teacher' => false, 'join_date' => '2019-09-01'],
    ],

    // Librarian
    [
        'name' => 'Morium Khatun', 'name_bn' => 'মরিয়ম খাতুন',
        'email' => 'morium.librarian@school.edu.bd', 'phone' => '01911111002',
        'roles' => [$librarianRole->id],
        'employee' => ['employee_id' => 'LIB-001', 'designation' => 'Librarian', 'department' => 'Library', 'is_teacher' => false, 'join_date' => '2020-11-15'],
    ],

    // Multi-role: Admin + Teacher
    [
        'name' => 'Shafiq Rahman', 'name_bn' => 'শফিক রহমান',
        'email' => 'shafiq.admin@school.edu.bd', 'phone' => '01611111001',
        'roles' => [$adminRole->id, $teacherRole->id],
        'employee' => ['employee_id' => 'ADM-002', 'designation' => 'Vice Principal', 'department' => 'Academic', 'is_teacher' => true, 'join_date' => '2017-02-01'],
    ],

    // Inactive user
    [
        'name' => 'Jahangir Kabir', 'name_bn' => 'জাহাঙ্গীর কবির',
        'email' => 'jahangir.inactive@school.edu.bd', 'phone' => '01511111001',
        'roles' => [$teacherRole->id],
        'is_active' => false,
        'employee' => ['employee_id' => 'TCH-006', 'designation' => 'Former Teacher', 'department' => 'Academic', 'is_teacher' => true, 'join_date' => '2015-01-01'],
    ],
];

$created = 0;
$skipped = 0;

foreach ($dummyUsers as $ud) {
    // Skip if user already exists
    if (User::where('email', $ud['email'])->exists()) {
        echo "  SKIP (exists): {$ud['email']}\n";
        $skipped++;
        continue;
    }

    $user = User::create([
        'institution_id' => $instId,
        'name'           => $ud['name'],
        'name_bn'        => $ud['name_bn'] ?? null,
        'email'          => $ud['email'],
        'password'       => Hash::make('password'),
        'phone'          => $ud['phone'] ?? null,
        'is_active'      => $ud['is_active'] ?? true,
    ]);

    // Attach roles
    $user->roles()->sync($ud['roles']);

    // Create employee record if applicable
    if (isset($ud['employee'])) {
        Employee::create(array_merge([
            'institution_id' => $instId,
            'user_id'        => $user->id,
            'name'           => $user->name,
            'name_bn'        => $user->name_bn,
            'phone'          => $user->phone,
            'email'          => $user->email,
            'is_active'      => $ud['is_active'] ?? true,
        ], $ud['employee']));
    }

    // Create guardian record if applicable
    if (isset($ud['guardian'])) {
        Guardian::create(array_merge([
            'institution_id' => $instId,
            'user_id'        => $user->id,
            'name'           => $user->name,
            'name_bn'        => $user->name_bn,
            'phone'          => $user->phone ?? '',
            'email'          => $user->email,
        ], $ud['guardian']));
    }

    $roleNames = Role::whereIn('id', $ud['roles'])->pluck('name')->implode(', ');
    echo "  CREATED: {$ud['name']} <{$ud['email']}> [{$roleNames}]\n";
    $created++;
}

echo "\n=== Done: {$created} created, {$skipped} skipped ===\n";
echo "\nAll dummy users use password: 'password'\n";
echo "\nDummy user accounts:\n";
echo "  Teachers:    rafiq.teacher@school.edu.bd, fatema.teacher@school.edu.bd, kamal.teacher@school.edu.bd, nasreen.teacher@school.edu.bd, aminul.teacher@school.edu.bd\n";
echo "  Parents:     karim.parent@school.edu.bd, rehana.parent@school.edu.bd, jashim.parent@school.edu.bd, salma.parent@school.edu.bd\n";
echo "  Accountant:  shahidul.accountant@school.edu.bd\n";
echo "  Librarian:   morium.librarian@school.edu.bd\n";
echo "  Admin+Teacher: shafiq.admin@school.edu.bd\n";
echo "  Inactive:    jahangir.inactive@school.edu.bd\n";
