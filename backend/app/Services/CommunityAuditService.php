<?php

namespace App\Services;

use App\Models\CommunityAuditLog;
use Illuminate\Database\Eloquent\Model;

class CommunityAuditService
{
    /**
     * Log a community action for audit trail.
     */
    public function log(
        string $action,
        ?int $userId,
        ?int $institutionId,
        ?Model $auditable = null,
        ?array $meta = null
    ): void {
        CommunityAuditLog::create([
            'user_id' => $userId,
            'institution_id' => $institutionId,
            'action' => $action,
            'auditable_type' => $auditable ? get_class($auditable) : null,
            'auditable_id' => $auditable?->getKey(),
            'meta' => $meta,
        ]);
    }
}
