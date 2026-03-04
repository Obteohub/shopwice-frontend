//@ts-expect-error: Will be resolved by wrangler build
import { handleCdnCgiImageRequest, handleImageRequest } from "./cloudflare/images.js";
//@ts-expect-error: Will be resolved by wrangler build
import { runWithCloudflareRequestContext } from "./cloudflare/init.js";
//@ts-expect-error: Will be resolved by wrangler build
import { maybeGetSkewProtectionResponse } from "./cloudflare/skew-protection.js";
// @ts-expect-error: Will be resolved by wrangler build
import { handler as middlewareHandler } from "./middleware/handler.mjs";
//@ts-expect-error: Will be resolved by wrangler build
export { DOQueueHandler } from "./.build/durable-objects/queue.js";
//@ts-expect-error: Will be resolved by wrangler build
export { DOShardedTagCache } from "./.build/durable-objects/sharded-tag-cache.js";
//@ts-expect-error: Will be resolved by wrangler build
export { BucketCachePurge } from "./.build/durable-objects/bucket-cache-purge.js";
export default {
    async fetch(request, env, ctx) {
        return runWithCloudflareRequestContext(request, env, ctx, async () => {
            const response = maybeGetSkewProtectionResponse(request);
            if (response) {
                return response;
            }
            const url = new URL(request.url);

            // Serve Next.js static assets directly from Pages ASSETS.
            if (url.pathname.startsWith("/_next/static/") ||
                url.pathname === "/favicon.ico" ||
                url.pathname === "/favicon.svg" ||
                url.pathname === "/manifest.json" ||
                url.pathname.startsWith("/icons/") ||
                url.pathname.startsWith("/images/")) {
                const assetResponse = await env.ASSETS?.fetch(request);
                if (assetResponse) {
                    return assetResponse;
                }
            }
            // Serve images in development.
            // Note: "/cdn-cgi/image/..." requests do not reach production workers.
            if (url.pathname.startsWith("/cdn-cgi/image/")) {
                return handleCdnCgiImageRequest(url, env);
            }
            // Fallback for the Next default image loader.
            if (url.pathname ===
                `${globalThis.__NEXT_BASE_PATH__}/_next/image${globalThis.__TRAILING_SLASH__ ? "/" : ""}`) {
                const imageResponse = await handleImageRequest(url, request.headers, env);
                const imageHeaders = new Headers(imageResponse.headers);
                if (!imageHeaders.get("Cache-Control")) {
                    imageHeaders.set("Cache-Control", "public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=86400");
                    imageHeaders.set("CDN-Cache-Control", "public, max-age=2592000, stale-while-revalidate=86400");
                    imageHeaders.set("Cloudflare-CDN-Cache-Control", "public, max-age=2592000, stale-while-revalidate=86400");
                }
                return new Response(imageResponse.body, {
                    status: imageResponse.status,
                    statusText: imageResponse.statusText,
                    headers: imageHeaders,
                }); // __SHOPWICE_IMAGE_CACHE_PATCH__
            }
            // - `Request`s are handled by the Next server
            const reqOrResp = await middlewareHandler(request, env, ctx);
            if (reqOrResp instanceof Response) {
                return reqOrResp;
            }
            // @ts-expect-error: resolved by wrangler build
            const { handler } = await import("./server-functions/default/handler.mjs");

            const appResponse = await handler(reqOrResp, env, ctx, request.signal);
            const contentType = appResponse.headers.get("content-type") || "";
            if (contentType.includes("text/html")) {
                const html = await appResponse.text();
                const rewrittenHtml = html.replace(/(\/\_next\/static\/[^"']+\.(js|css))(?!\?)/g, "$1?v=__SHOPWICE_STATIC_CACHE_BUST__");
                if (rewrittenHtml !== html) {
                    const headers = new Headers(appResponse.headers);
                    headers.delete("content-length");
                    return new Response(rewrittenHtml, {
                        status: appResponse.status,
                        statusText: appResponse.statusText,
                        headers,
                    });
                }
            }
            return appResponse;

        });
    },
};
