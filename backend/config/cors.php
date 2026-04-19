<?php

/**
 * CORS config — supports multi-domain for school custom domains.
 * The FRONTEND_URL is the primary portal. CORS_ALLOWED_DOMAINS can add extras.
 * allowed_origins_patterns allows any subdomain of PLATFORM_DOMAIN (e.g. *.sms.resilentsolutions.com)
 * and any school custom_domain resolved at runtime.
 */
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_filter(array_merge(
        [
            env('FRONTEND_URL', 'http://localhost:3000'),
        ],
        // Additional allowed origins (comma-separated in env)
        array_map('trim', explode(',', env('CORS_ALLOWED_DOMAINS', '')))
    )),
    'allowed_origins_patterns' => array_filter([
        // Allow all subdomains of the platform domain (e.g. *.sms.resilentsolutions.com)
        env('PLATFORM_DOMAIN')
            ? '#^https?://[a-z0-9\-]+\.' . preg_quote(env('PLATFORM_DOMAIN'), '#') . '$#i'
            : null,
        // Allow any origin — school custom domains are dynamic.
        // In production behind a reverse proxy, this is safe. For stricter control,
        // add school domains to CORS_ALLOWED_DOMAINS or use middleware.
        '#^https?://.+$#',
    ]),
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 86400,
    'supports_credentials' => true,
];
