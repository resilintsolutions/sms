<?php

namespace App\Services;

/**
 * Basic server-side profanity keyword blocklist for community content moderation.
 * Returns 'FLAGGED' if any banned keyword is found in the text.
 *
 * Configurable via config/community.php 'profanity_words' key.
 */
class ProfanityFilterService
{
    /** @var string[] */
    private array $words;

    public function __construct()
    {
        $this->words = config('community.profanity_words', []);
    }

    /**
     * Check one or more text fields for banned keywords.
     * Returns true if the content should be flagged.
     */
    public function isFlagged(string ...$texts): bool
    {
        $combined = mb_strtolower(implode(' ', array_filter($texts)));
        foreach ($this->words as $word) {
            if (mb_strpos($combined, mb_strtolower($word)) !== false) {
                return true;
            }
        }
        return false;
    }

    /**
     * Determine moderation_status based on content.
     */
    public function moderationStatus(string ...$texts): string
    {
        return $this->isFlagged(...$texts) ? 'FLAGGED' : 'CLEAN';
    }
}
