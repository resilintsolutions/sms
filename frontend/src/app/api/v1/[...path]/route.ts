import { NextRequest, NextResponse } from 'next/server';

/**
 * API Proxy Route Handler
 *
 * Proxies all /api/v1/* requests to the Laravel backend while preserving
 * the original Host header. This is essential for multi-domain/subdomain
 * resolution — the backend uses the Host to determine which institution
 * the request belongs to.
 *
 * Next.js rewrites don't reliably preserve the Host header when proxying
 * to a different origin, so this route handler replaces the rewrite.
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

async function proxyToBackend(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join('/');
  const targetUrl = new URL(`/api/v1/${pathStr}`, BACKEND_URL);

  // Forward query string
  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  // Gather original headers
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    // Skip hop-by-hop headers
    if (!['host', 'connection', 'keep-alive', 'transfer-encoding', 'expect', 'content-length'].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // Preserve the original Host via X-Forwarded-Host so the backend
  // can resolve the correct institution from the domain.
  const originalHost = request.headers.get('host') || '';
  headers.set('X-Forwarded-Host', originalHost);
  headers.set('X-Forwarded-For', request.headers.get('x-forwarded-for') || request.ip || '127.0.0.1');
  headers.set('X-Forwarded-Proto', request.nextUrl.protocol.replace(':', ''));

  try {
    // Build fetch options
    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
    };

    // Forward body for non-GET/HEAD requests
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('multipart/form-data')) {
        // For file uploads, forward the raw body
        fetchOptions.body = await request.arrayBuffer();
      } else {
        const bodyText = await request.text();
        if (bodyText) {
          fetchOptions.body = bodyText;
        }
      }
    }

    const backendResponse = await fetch(targetUrl.toString(), fetchOptions);

    // Build response, forwarding backend headers
    const responseHeaders = new Headers();
    backendResponse.headers.forEach((value, key) => {
      // Skip hop-by-hop and CORS headers (Next.js handles CORS)
      if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[API Proxy] Backend request failed:', error);
    return NextResponse.json(
      { success: false, message: 'Backend service unavailable' },
      { status: 502 }
    );
  }
}

export const GET = proxyToBackend;
export const POST = proxyToBackend;
export const PUT = proxyToBackend;
export const PATCH = proxyToBackend;
export const DELETE = proxyToBackend;
