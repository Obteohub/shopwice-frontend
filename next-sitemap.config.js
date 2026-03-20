/** @type {import('next-sitemap').IConfig} */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shopwice.com';

module.exports = {
    siteUrl,
    // Custom routes are served from src/pages/robots.txt.ts and src/pages/sitemap.xml.ts.
    // Keep next-sitemap from generating conflicting root files in /public.
    generateRobotsTxt: false,
    generateIndexSitemap: false,
    sitemapBaseFileName: 'sitemap-static',
    exclude: ['/checkout', '/my-account', '/cart'],
}
