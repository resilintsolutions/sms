<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IdCardTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'institution_id',
        'name',
        'type',
        'background_image',
        'is_sample',
        'field_positions',
        'design_config',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_sample'       => 'boolean',
            'is_active'       => 'boolean',
            'field_positions'  => 'array',
            'design_config'    => 'array',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }
}
