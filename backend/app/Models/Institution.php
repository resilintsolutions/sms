<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Institution extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'name_bn', 'eiin', 'address', 'phone', 'email', 'logo',
        'currency', 'locale', 'settings', 'is_active',
        'custom_domain', 'subdomain', 'subscription_status', 'feature_flags',
    ];

    /** Laravel 8: use $casts property */
    protected $casts = [
        'settings' => 'array',
        'feature_flags' => 'array',
        'is_active' => 'boolean',
    ];

    public function hasFeature(string $feature): bool
    {
        $flags = $this->feature_flags ?? [];
        return ($flags[$feature] ?? true) === true;
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function academicSessions(): HasMany
    {
        return $this->hasMany(AcademicSession::class, 'institution_id');
    }

    public function shifts(): HasMany
    {
        return $this->hasMany(Shift::class, 'institution_id');
    }

    public function classes(): HasMany
    {
        return $this->hasMany(ClassModel::class, 'institution_id');
    }

    public function subjects(): HasMany
    {
        return $this->hasMany(Subject::class, 'institution_id');
    }

    public function students(): HasMany
    {
        return $this->hasMany(Student::class, 'institution_id');
    }

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class, 'institution_id');
    }

    public function guardians(): HasMany
    {
        return $this->hasMany(Guardian::class, 'institution_id');
    }

    public function feeHeads(): HasMany
    {
        return $this->hasMany(FeeHead::class, 'institution_id');
    }

    public function notices(): HasMany
    {
        return $this->hasMany(Notice::class, 'institution_id');
    }

    public function gradeRules(): HasMany
    {
        return $this->hasMany(GradeRule::class, 'institution_id');
    }
}
