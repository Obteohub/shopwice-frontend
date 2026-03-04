import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

export default defineCloudflareConfig({
	incrementalCache: r2IncrementalCache,
	// "direct" is the only viable queue for Cloudflare Pages deployments.
	// memoryQueue/doQueue require a WORKER_SELF_REFERENCE service binding,
	// which can only point to a Worker — not a Pages project.
	queue: "direct",
});
