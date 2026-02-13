<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

class Role extends Model
{
    protected $fillable = ['name', 'label', 'guard_name', 'description'];

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'role_has_permissions');
    }

    public function users(): MorphToMany
    {
        return $this->morphedByMany(User::class, 'model', 'model_has_roles');
    }

    public function givePermissionTo(string|Permission $permission): void
    {
        $this->permissions()->syncWithoutDetaching(
            $permission instanceof Permission ? $permission->id : Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web'])->id
        );
    }
}
