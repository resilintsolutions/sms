<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MessageLog extends Model
{
    protected $fillable = ['institution_id', 'channel', 'recipient', 'message', 'subject', 'status', 'response', 'reference'];

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }
}
