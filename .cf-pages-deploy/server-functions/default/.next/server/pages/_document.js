"use strict";(()=>{var a={};a.id=3220,a.ids=[3220],a.modules={8732:a=>{a.exports=require("react/jsx-runtime")},33873:a=>{a.exports=require("path")},40361:a=>{a.exports=require("next/dist/compiled/next-server/pages.runtime.prod.js")},46381:(a,b,c)=>{c.r(b),c.d(b,{default:()=>f});var d=c(8732),e=c(82341);function f(){let a="false"===String(process.env.NEXT_PUBLIC_ENABLE_PWA_SW||"").toLowerCase(),b=String("GTM-M3V2T863").trim();return(0,d.jsxs)(e.Html,{lang:"en",suppressHydrationWarning:!0,children:[(0,d.jsxs)(e.Head,{children:[(0,d.jsx)("link",{rel:"icon",href:"/favicon.ico"}),(0,d.jsx)("link",{rel:"icon",type:"image/png",href:"/favicon.png"}),(0,d.jsx)("link",{rel:"manifest",href:"/manifest.json"}),(0,d.jsx)("link",{rel:"apple-touch-icon",href:"/icons/icon-192x192.png"}),(0,d.jsx)("meta",{name:"application-name",content:"Shopwice"}),(0,d.jsx)("meta",{name:"apple-mobile-web-app-capable",content:"yes"}),(0,d.jsx)("meta",{name:"apple-mobile-web-app-status-bar-style",content:"default"}),(0,d.jsx)("meta",{name:"apple-mobile-web-app-title",content:"Shopwice"}),(0,d.jsx)("meta",{name:"mobile-web-app-capable",content:"yes"}),(0,d.jsx)("meta",{name:"theme-color",content:"#0C6DC9"}),(0,d.jsx)("meta",{name:"msapplication-TileColor",content:"#0C6DC9"}),(0,d.jsx)("meta",{name:"msapplication-config",content:"/browserconfig.xml"}),b?(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("link",{rel:"preconnect",href:"https://www.googletagmanager.com"}),(0,d.jsx)("link",{rel:"dns-prefetch",href:"https://www.googletagmanager.com"}),(0,d.jsx)("link",{rel:"preconnect",href:"https://www.google-analytics.com"}),(0,d.jsx)("link",{rel:"dns-prefetch",href:"https://www.google-analytics.com"})]}):null,a?(0,d.jsx)("script",{dangerouslySetInnerHTML:{__html:`
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
              `}}):null]}),(0,d.jsxs)("body",{suppressHydrationWarning:!0,children:[b?(0,d.jsx)("noscript",{children:(0,d.jsx)("iframe",{src:`https://www.googletagmanager.com/ns.html?id=${b}`,height:"0",width:"0",style:{display:"none",visibility:"hidden"}})}):null,(0,d.jsx)(e.Main,{}),(0,d.jsx)(e.NextScript,{})]})]})}},56472:a=>{a.exports=require("@opentelemetry/api")},82015:a=>{a.exports=require("react")}};var b=require("../webpack-runtime.js");b.C(a);var c=b.X(0,[5335,2341],()=>b(b.s=46381));module.exports=c})();