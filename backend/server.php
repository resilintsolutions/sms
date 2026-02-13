<?php

/**
 * Laravel built-in server router.
 * Run from backend folder: php -S localhost:8000 server.php
 */

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Serve Swagger UI and OpenAPI spec from public
if ($uri === '/swagger.html' || $uri === '/openapi.json') {
    $path = __DIR__ . '/public' . $uri;
    if (file_exists($path)) {
        header('Content-Type: ' . ($uri === '/openapi.json' ? 'application/json' : 'text/html'));
        header('Cache-Control: no-cache');
        readfile($path);
        return true;
    }
}

if ($uri !== '/' && file_exists(__DIR__ . '/public' . $uri)) {
    return false;
}

require_once __DIR__ . '/public/index.php';
