"use strict";(()=>{var a={};a.id=3221,a.ids=[636,3220,3221],a.modules={361:a=>{a.exports=require("next/dist/compiled/next-server/pages.runtime.prod.js")},2015:a=>{a.exports=require("react")},2177:a=>{a.exports=import("zustand")},2326:a=>{a.exports=require("react-dom")},2870:a=>{a.exports=import("zustand/middleware")},3873:a=>{a.exports=require("path")},4075:a=>{a.exports=require("zlib")},6060:a=>{a.exports=require("next/dist/shared/lib/no-fallback-error.external.js")},6381:(a,b,c)=>{c.r(b),c.d(b,{default:()=>f});var d=c(8732),e=c(2341);function f(){let a="true"!==process.env.NEXT_PUBLIC_ENABLE_PWA_SW;return(0,d.jsxs)(e.Html,{lang:"en",children:[(0,d.jsxs)(e.Head,{children:[(0,d.jsx)("link",{rel:"icon",href:"/favicon.ico"}),(0,d.jsx)("link",{rel:"icon",type:"image/png",href:"/favicon.png"}),a?(0,d.jsx)("script",{dangerouslySetInnerHTML:{__html:`
                (function () {
                  if (!('serviceWorker' in navigator)) return;
                  navigator.serviceWorker.getRegistrations().then(function (registrations) {
                    registrations.forEach(function (registration) { registration.unregister(); });
                  });
                  if ('caches' in window) {
                    caches.keys().then(function (keys) {
                      return Promise.all(
                        keys
                          .filter(function (key) { return key.indexOf('shopwice-cache') === 0; })
                          .map(function (key) { return caches.delete(key); })
                      );
                    });
                  }
                })();
              `}}):null]}),(0,d.jsxs)("body",{suppressHydrationWarning:!0,children:[(0,d.jsx)(e.Main,{}),(0,d.jsx)(e.NextScript,{})]})]})}},6393:(a,b,c)=>{c.a(a,async(a,d)=>{try{c.r(b),c.d(b,{config:()=>q,default:()=>m,getServerSideProps:()=>p,getStaticPaths:()=>o,getStaticProps:()=>n,handler:()=>y,reportWebVitals:()=>r,routeModule:()=>x,unstable_getServerProps:()=>v,unstable_getServerSideProps:()=>w,unstable_getStaticParams:()=>u,unstable_getStaticPaths:()=>t,unstable_getStaticProps:()=>s});var e=c(3885),f=c(237),g=c(1413),h=c(6381),i=c(9347),j=c(6510),k=c(2289),l=a([i]);i=(l.then?(await l)():l)[0];let m=(0,g.M)(j,"default"),n=(0,g.M)(j,"getStaticProps"),o=(0,g.M)(j,"getStaticPaths"),p=(0,g.M)(j,"getServerSideProps"),q=(0,g.M)(j,"config"),r=(0,g.M)(j,"reportWebVitals"),s=(0,g.M)(j,"unstable_getStaticProps"),t=(0,g.M)(j,"unstable_getStaticPaths"),u=(0,g.M)(j,"unstable_getStaticParams"),v=(0,g.M)(j,"unstable_getServerProps"),w=(0,g.M)(j,"unstable_getServerSideProps"),x=new e.PagesRouteModule({definition:{kind:f.RouteKind.PAGES,page:"/robots.txt",pathname:"/robots.txt",bundlePath:"",filename:""},distDir:".next",relativeProjectDir:"",components:{App:i.default,Document:h.default},userland:j}),y=(0,k.U)({srcPage:"/robots.txt",config:q,userland:j,routeModule:x,getStaticPaths:o,getStaticProps:n,getServerSideProps:p});d()}catch(a){d(a)}})},6510:(a,b,c)=>{c.r(b),c.d(b,{default:()=>e,getServerSideProps:()=>d});let d=async({res:a})=>{let b="https://web.shopwice.com".replace(/\/+$/,""),c=`User-agent: *
Allow: /
# If WordPress backend paths share this same domain, disallow only those backend paths there.
Sitemap: ${b}/sitemap.xml`;return a.statusCode=200,a.setHeader("Content-Type","text/plain; charset=utf-8"),a.setHeader("Cache-Control","public, s-maxage=86400, stale-while-revalidate=86400"),a.end(c),{props:{}}},e=()=>null},6653:a=>{a.exports=require("nprogress")},7910:a=>{a.exports=require("stream")},8732:a=>{a.exports=require("react/jsx-runtime")},9021:a=>{a.exports=require("fs")}};var b=require("../webpack-runtime.js");b.C(a);var c=b.X(0,[5335,7980,2341,5781,9347],()=>b(b.s=6393));module.exports=c})();