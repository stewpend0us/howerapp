if(!self.define){let e,i={};const n=(n,o)=>(n=new URL(n+".js",o).href,i[n]||new Promise((i=>{if("document"in self){const e=document.createElement("script");e.src=n,e.onload=i,document.head.appendChild(e)}else e=n,importScripts(n),i()})).then((()=>{let e=i[n];if(!e)throw new Error(`Module ${n} didn’t register its module`);return e})));self.define=(o,r)=>{const c=e||("document"in self?document.currentScript.src:"")||location.href;if(i[c])return;let s={};const d=e=>n(e,c),f={module:{uri:c},exports:s,require:d};i[c]=Promise.all(o.map((e=>f[e]||d(e)))).then((e=>(r(...e),s)))}}define(["./workbox-bb40d285"],(function(e){"use strict";self.addEventListener("message",(e=>{e.data&&"SKIP_WAITING"===e.data.type&&self.skipWaiting()})),e.precacheAndRoute([{url:"css/style.css",revision:"9508a9c9c825fd734128015169afa4d8"},{url:"icons/hower-icon-0128.png",revision:"dc1343b10c3c1c911d09f142f6d6b8f7"},{url:"icons/hower-icon-0144.png",revision:"70855ecd6376497fb332f0984f9edcc5"},{url:"icons/hower-icon-0152.png",revision:"b6f88206b85a21a4d60b5d9833d83d8b"},{url:"icons/hower-icon-0192.png",revision:"ba317f632e769ef3d7a526428e07ecb8"},{url:"icons/hower-icon-0256.png",revision:"77c1e234fe82965140d9546921a20dee"},{url:"icons/hower-icon-0512.png",revision:"db44984ecbbd0676bbe044dad398a397"},{url:"icons/hower-icon-1620.png",revision:"aaf7cb588cadec1913093022df33f2b5"},{url:"index.html",revision:"4960cb33210bfb81dbeb4e74ad827190"},{url:"js/main.js",revision:"a9e02006650b4e8d1bd5c012bbf5fd71"}],{ignoreURLParametersMatching:[/^utm_/,/^fbclid$/]})}));
