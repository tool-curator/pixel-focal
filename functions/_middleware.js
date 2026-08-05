export async function onRequest(context) {
  const response = await context.next();
  const url = new URL(context.request.url);
  const hostname = url.hostname.toLowerCase();

  // Set X-Robots-Tag: noindex only for pixel-focal.pages.dev and other *.pages.dev subdomains
  if (hostname === 'pixel-focal.pages.dev' || hostname.endsWith('.pages.dev')) {
    const newHeaders = new Headers(response.headers);
    newHeaders.set('X-Robots-Tag', 'noindex');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }

  // For custom domains (pixelfocal.com, www.pixelfocal.com), explicitly remove X-Robots-Tag header if present
  if (response.headers.has('X-Robots-Tag')) {
    const newHeaders = new Headers(response.headers);
    newHeaders.delete('X-Robots-Tag');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }

  return response;
}
