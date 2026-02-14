<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shift extends Model
{
    protected $fillable = ['institution_id', 'name', 'start_time', 'end_time'];

    protected $casts = [
        'start_time' => 'datetime:H:i',
        'end_time' => 'datetime:H:i',
    ];
    

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function sections(): HasMany
    {
        return $this->hasMany(Section::class);
    }
}
