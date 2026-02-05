
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const targetUri = searchParams.get('uri');

    if (!targetUri) {
        return new NextResponse('Missing uri parameter', { status: 400 });
    }

    // We no longer strictly require server API key if the URI itself contains the key.
    const serverApiKey = process.env.GEMINI_API_KEY;

    try {
        // Construct the request to Google's file API
        let fetchUrl = targetUri;
        
        // Ensure alt=media is present for download
        if (!fetchUrl.includes('alt=media')) {
            const separator = fetchUrl.includes('?') ? '&' : '?';
            fetchUrl += `${separator}alt=media`;
        }

        // Check if key is present
        if (!fetchUrl.includes('key=')) {
             if (!serverApiKey) {
                // If no key in URL and no server key, we can't fetch (unless public, but unlikely for these files)
                // But let's try anyway, maybe it's a public URL? 
                // Or better, return 401 if we know we need a key.
                // For now, let's proceed, if upstream fails, we return that error.
             } else {
                 const separator = fetchUrl.includes('?') ? '&' : '?';
                 fetchUrl += `${separator}key=${serverApiKey}`;
             }
        }

        const upstreamRes = await fetch(fetchUrl);

        if (!upstreamRes.ok) {
            console.error(`Proxy fetch failed: ${upstreamRes.status} ${upstreamRes.statusText}`);
            return new NextResponse(`Upstream error: ${upstreamRes.statusText}`, { status: upstreamRes.status });
        }

        // Forward headers
        const headers = new Headers();
        // Force video/mp4 if possible for better playback compatibility, or rely on upstream
        const contentType = upstreamRes.headers.get('Content-Type');
        headers.set('Content-Type', contentType && contentType.includes('video') ? contentType : 'video/mp4');
        headers.set('Content-Length', upstreamRes.headers.get('Content-Length') || '');
        headers.set('Cache-Control', 'public, max-age=3600');
        headers.set('Access-Control-Allow-Origin', '*'); // Enable CORS for video tag

        return new NextResponse(upstreamRes.body, {
            status: 200,
            headers,
        });

    } catch (error) {
        console.error('Proxy error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
