"use strict";(()=>{var a={};a.id=3220,a.ids=[3220],a.modules={361:a=>{a.exports=require("next/dist/compiled/next-server/pages.runtime.prod.js")},2015:a=>{a.exports=require("react")},3873:a=>{a.exports=require("path")},6381:(a,b,c)=>{c.r(b),c.d(b,{default:()=>f});var d=c(8732),e=c(2341);function f(){let a="true"!==process.env.NEXT_PUBLIC_ENABLE_PWA_SW;return(0,d.jsxs)(e.Html,{lang:"en",children:[(0,d.jsxs)(e.Head,{children:[(0,d.jsx)("link",{rel:"icon",href:"/favicon.ico"}),(0,d.jsx)("link",{rel:"icon",type:"image/png",href:"/favicon.png"}),a?(0,d.jsx)("script",{dangerouslySetInnerHTML:{__html:`
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
              `}}):null]}),(0,d.jsxs)("body",{suppressHydrationWarning:!0,children:[(0,d.jsx)(e.Main,{}),(0,d.jsx)(e.NextScript,{})]})]})}},8732:a=>{a.exports=require("react/jsx-runtime")}};var b=require("../webpack-runtime.js");b.C(a);var c=b.X(0,[5335,2341],()=>b(b.s=6381));module.exports=c})();