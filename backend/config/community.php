<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Profanity Word Blocklist
    |--------------------------------------------------------------------------
    | Basic keyword list for auto-flagging community content.
    | Case-insensitive substring matching. Add words relevant to a school
    | environment. Keep this list appropriately sized; for production use
    | consider a dedicated package or external API.
    */
    'profanity_words' => [
        'spam',
        'scam',
        'fraud',
        'hack',
        'cheat',
        'drugs',
        'violence',
        'abuse',
        'harassment',
        'bully',
        'gambling',
        'betting',
        'porn',
        'explicit',
        'obscene',
    ],
];
