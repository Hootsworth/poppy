// --- PHASE 7: VISUAL CRAFT (Inspector & UI Blocks) ---

let selectedElement = null;
let inspectActive = false;

const UI_BLOCKS = [
  {
    id: "hero_split",
    name: "Split Hero",
    cat: "hero",
    desc: "Modern two-column layout with headline, badges, dual CTA buttons, and product mockup card.",
    css: `.pb-hero-split{padding:60px 24px;background:#fff;color:#111;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}.pb-hero-split .pb-wrap{max-width:1120px;margin:0 auto;display:grid;grid-template-columns:1.2fr 1fr;gap:48px;align-items:center}.pb-badge{display:inline-block;padding:4px 12px;background:#f3f4f6;color:#374151;font-size:12px;font-weight:700;border-radius:999px;margin-bottom:16px;text-transform:uppercase;letter-spacing:.05em}.pb-hero-split h1{font-size:2.8rem;line-height:1.15;font-weight:800;margin:0 0 16px;letter-spacing:-.02em}.pb-hero-split p{font-size:1.1rem;line-height:1.6;color:#4b5563;margin:0 0 28px}.pb-btn-group{display:flex;gap:12px;flex-wrap:wrap}.pb-btn-primary{background:#111827;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;cursor:pointer;transition:background .15s}.pb-btn-primary:hover{background:#374151}.pb-btn-secondary{background:transparent;color:#111827;border:1.5px solid #e5e7eb;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;cursor:pointer}.pb-btn-secondary:hover{border-color:#111827}.pb-card-mock{background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:16px;padding:24px;box-shadow:0 10px 25px rgba(0,0,0,.04);min-height:240px;display:flex;flex-direction:column;justify-content:center;align-items:center;color:#9ca3af}@media(max-width:768px){.pb-hero-split .pb-wrap{grid-template-columns:1fr;gap:32px}.pb-hero-split h1{font-size:2.2rem}}`,
    html: `<section class="pb-hero-split">\n  <div class="pb-wrap">\n    <div class="pb-hero-content">\n      <span class="pb-badge">New Release</span>\n      <h1>Build faster with intelligent design components</h1>\n      <p>Transform your digital vision into responsive, delightful websites in seconds. Start with pre-built reactive blocks.</p>\n      <div class="pb-btn-group">\n        <button class="pb-btn-primary" type="button">Get Started Free</button>\n        <button class="pb-btn-secondary" type="button">Live Showcase</button>\n      </div>\n    </div>\n    <div class="pb-hero-media">\n      <div class="pb-card-mock">\n        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>\n        <span style="margin-top:12px;font-size:14px;font-weight:500">Interactive Preview Canvas</span>\n      </div>\n    </div>\n  </div>\n</section>`
  },
  {
    id: "hero_centered",
    name: "Centered Hero",
    cat: "hero",
    desc: "Minimalist centered hero with pill announcement, punchy title, subtitle, and action buttons.",
    css: `.pb-hero-center{padding:72px 24px;background:#fafafa;color:#111;text-align:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}.pb-hero-center .pb-wrap{max-width:760px;margin:0 auto}.pb-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:#fff;border:1px solid #e5e7eb;border-radius:999px;font-size:13px;font-weight:600;color:#1f2937;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,.05)}.pb-hero-center h1{font-size:3.2rem;line-height:1.1;font-weight:800;margin:0 0 18px;letter-spacing:-.03em}.pb-hero-center .pb-sub{font-size:1.2rem;line-height:1.6;color:#6b7280;margin:0 0 32px}.pb-hero-center .pb-btn-group{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}@media(max-width:768px){.pb-hero-center h1{font-size:2.4rem}}`,
    html: `<section class="pb-hero-center">\n  <div class="pb-wrap">\n    <div class="pb-pill">The future of web creation</div>\n    <h1>Everything you need to ship your ideas today</h1>\n    <p class="pb-sub">Eliminate repetitive UI assembly. Jump straight into fully responsive, production-ready layouts that work everywhere.</p>\n    <div class="pb-btn-group">\n      <button class="pb-btn-primary" type="button">Start Building Now</button>\n      <button class="pb-btn-secondary" type="button">Documentation</button>\n    </div>\n  </div>\n</section>`
  },
  {
    id: "features_grid",
    name: "Features Grid",
    cat: "features",
    desc: "3-column responsive feature cards with modern SVG icons, headings, and descriptions.",
    css: `.pb-features{padding:64px 24px;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}.pb-features .pb-wrap{max-width:1120px;margin:0 auto}.pb-head{text-align:center;max-width:640px;margin:0 auto 48px}.pb-head h2{font-size:2.2rem;font-weight:800;margin:0 0 12px;letter-spacing:-.02em}.pb-head p{font-size:1.05rem;color:#6b7280;margin:0}.pb-grid-3{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}.pb-feat-card{padding:28px;background:#fff;border:1.5px solid #f3f4f6;border-radius:14px;transition:all .2s ease}.pb-feat-card:hover{border-color:#e5e7eb;transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.04)}.pb-icon-box{width:44px;height:44px;border-radius:10px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;margin-bottom:16px;color:#111827}.pb-feat-card h3{font-size:1.2rem;font-weight:700;margin:0 0 8px;color:#111827}.pb-feat-card p{font-size:.95rem;color:#6b7280;line-height:1.5;margin:0}`,
    html: `<section class="pb-features">\n  <div class="pb-wrap">\n    <div class="pb-head">\n      <h2>Crafted for High Performance</h2>\n      <p>Designed with meticulous attention to detail and modern web accessibility standards.</p>\n    </div>\n    <div class="pb-grid-3">\n      <div class="pb-feat-card">\n        <div class="pb-icon-box">\n          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>\n        </div>\n        <h3>Lightning Fast</h3>\n        <p>Optimized for instantaneous render, minimal layout shift, and smooth 60fps animations.</p>\n      </div>\n      <div class="pb-feat-card">\n        <div class="pb-icon-box">\n          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>\n        </div>\n        <h3>Zero Dependencies</h3>\n        <p>Completely self-contained HTML and CSS with zero external scripts or bloated bundle overhead.</p>\n      </div>\n      <div class="pb-feat-card">\n        <div class="pb-icon-box">\n          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24M14.83 9.17l4.24-4.24M14.83 14.83l4.24 4.24M9.17 14.83l-4.24 4.24"/></svg>\n        </div>\n        <h3>Accessible First</h3>\n        <p>Semantic HTML5 elements with native keyboard navigation, focus indicators, and ARIA tags.</p>\n      </div>\n    </div>\n  </div>\n</section>`
  },
  {
    id: "pricing_table",
    name: "Pricing Table",
    cat: "pricing",
    desc: "3-tier pricing layout with featured badge, checkmark list, and call-to-actions.",
    css: `.pb-pricing{padding:64px 24px;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}.pb-pricing .pb-wrap{max-width:1120px;margin:0 auto}.pb-price-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;align-items:stretch}.pb-tier{background:#fff;border:1.5px solid #e5e7eb;border-radius:16px;padding:32px 24px;display:flex;flex-direction:column;position:relative}.pb-tier.featured{border-color:#111827;box-shadow:0 12px 30px rgba(0,0,0,.08);transform:scale(1.02)}.pb-popular-tag{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#111827;color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;text-transform:uppercase;letter-spacing:.05em}.pb-tier-title{font-size:1.25rem;font-weight:700;margin:0 0 8px;color:#111}.pb-tier-desc{font-size:.9rem;color:#6b7280;margin:0 0 20px}.pb-price{font-size:2.4rem;font-weight:800;color:#111;margin:0 0 24px}.pb-price span{font-size:1rem;color:#6b7280;font-weight:500}.pb-tier ul{list-style:none;padding:0;margin:0 0 32px;display:flex;flex-direction:column;gap:12px;flex:1}.pb-tier li{font-size:.95rem;color:#374151;display:flex;align-items:center;gap:8px}.pb-check{color:#10b981;font-weight:700;flex-shrink:0}.pb-tier button{width:100%;padding:12px;border-radius:8px;font-weight:600;font-size:15px;cursor:pointer}`,
    html: `<section class="pb-pricing">\n  <div class="pb-wrap">\n    <div class="pb-head">\n      <h2>Simple, Transparent Pricing</h2>\n      <p>Choose the right plan to power your projects. Cancel or switch anytime.</p>\n    </div>\n    <div class="pb-price-grid">\n      <div class="pb-tier">\n        <h3 class="pb-tier-title">Starter</h3>\n        <p class="pb-tier-desc">For hobbyists and personal exploration.</p>\n        <div class="pb-price">$0 <span>/ mo</span></div>\n        <ul>\n          <li><span class="pb-check">✓</span> Up to 3 live projects</li>\n          <li><span class="pb-check">✓</span> Community templates</li>\n          <li><span class="pb-check">✓</span> Client-side storage</li>\n        </ul>\n        <button class="pb-btn-secondary" type="button">Get Started</button>\n      </div>\n      <div class="pb-tier featured">\n        <div class="pb-popular-tag">Most Popular</div>\n        <h3 class="pb-tier-title">Pro Creator</h3>\n        <p class="pb-tier-desc">For professionals and indie builders.</p>\n        <div class="pb-price">$19 <span>/ mo</span></div>\n        <ul>\n          <li><span class="pb-check">✓</span> Unlimited live projects</li>\n          <li><span class="pb-check">✓</span> 1-click custom domain export</li>\n          <li><span class="pb-check">✓</span> Direct element inspector & LEGO</li>\n          <li><span class="pb-check">✓</span> SQLite offline database</li>\n        </ul>\n        <button class="pb-btn-primary" type="button">Start Pro Trial</button>\n      </div>\n      <div class="pb-tier">\n        <h3 class="pb-tier-title">Team</h3>\n        <p class="pb-tier-desc">For agencies and product teams.</p>\n        <div class="pb-price">$49 <span>/ mo</span></div>\n        <ul>\n          <li><span class="pb-check">✓</span> Everything in Pro</li>\n          <li><span class="pb-check">✓</span> Realtime P2P collaboration</li>\n          <li><span class="pb-check">✓</span> Shared connector secrets</li>\n          <li><span class="pb-check">✓</span> Priority support channel</li>\n        </ul>\n        <button class="pb-btn-secondary" type="button">Contact Sales</button>\n      </div>\n    </div>\n  </div>\n</section>`
  },
  {
    id: "testimonials_grid",
    name: "Testimonials",
    cat: "social",
    desc: "Customer review cards with initials avatar, quotes, and author roles.",
    css: `.pb-testimonials{padding:64px 24px;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}.pb-testimonials .pb-wrap{max-width:1120px;margin:0 auto}.pb-test-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}.pb-test-card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:24px;display:flex;flex-direction:column;justify-content:space-between}.pb-quote{font-size:1rem;line-height:1.55;color:#374151;margin:0 0 20px;font-style:italic}.pb-author{display:flex;align-items:center;gap:12px}.pb-avatar{width:40px;height:40px;border-radius:50%;background:#111827;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px}.pb-meta-name{font-size:.95rem;font-weight:700;color:#111;margin:0}.pb-meta-role{font-size:.8rem;color:#6b7280;margin:0}`,
    html: `<section class="pb-testimonials">\n  <div class="pb-wrap">\n    <div class="pb-head">\n      <h2>Loved by builders worldwide</h2>\n      <p>See how teams build, iterate, and publish faster than ever.</p>\n    </div>\n    <div class="pb-test-grid">\n      <div class="pb-test-card">\n        <p class="pb-quote">"Poppy completely transformed how our team prototypes web applications. We went from Figma sketch to live interactive site in under an hour."</p>\n        <div class="pb-author">\n          <div class="pb-avatar">SR</div>\n          <div><h4 class="pb-meta-name">Sarah Reynolds</h4><p class="pb-meta-role">Product Lead at Horizon</p></div>\n        </div>\n      </div>\n      <div class="pb-test-card">\n        <p class="pb-quote">"The click-to-edit element inspector and pre-built blocks feel like superpowers. Surgical AI edits make micro-adjustments instantaneous."</p>\n        <div class="pb-author">\n          <div class="pb-avatar">DK</div>\n          <div><h4 class="pb-meta-name">David Kim</h4><p class="pb-meta-role">Founder at StudioCraft</p></div>\n        </div>\n      </div>\n      <div class="pb-test-card">\n        <p class="pb-quote">"No setup, no node_modules hell, and zero external tracking. It runs fully in my browser and exports clean static code."</p>\n        <div class="pb-author">\n          <div class="pb-avatar">EM</div>\n          <div><h4 class="pb-meta-name">Elena Morales</h4><p class="pb-meta-role">Senior Full-Stack Engineer</p></div>\n        </div>\n      </div>\n    </div>\n  </div>\n</section>`
  },
  {
    id: "faq_accordion",
    name: "FAQ Accordion",
    cat: "features",
    desc: "Native accessible details/summary cards for frequently asked questions.",
    css: `.pb-faq{padding:64px 24px;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}.pb-faq .pb-wrap{max-width:760px;margin:0 auto}.pb-faq-list{display:flex;flex-direction:column;gap:12px}.pb-faq-item{background:#fff;border:1.5px solid #e5e7eb;border-radius:12px;overflow:hidden}.pb-faq-item summary{padding:18px 20px;font-weight:700;font-size:1.05rem;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;user-select:none}.pb-faq-item summary::-webkit-details-marker{display:none}.pb-faq-item summary::after{content:"+";font-size:1.3rem;font-weight:400;color:#6b7280;transition:transform .2s}.pb-faq-item[open] summary::after{content:"−";transform:rotate(180deg)}.pb-faq-ans{padding:0 20px 20px;font-size:.95rem;line-height:1.6;color:#4b5563;margin:0}`,
    html: `<section class="pb-faq">\n  <div class="pb-wrap">\n    <div class="pb-head">\n      <h2>Frequently Asked Questions</h2>\n      <p>Have questions? We are here to help.</p>\n    </div>\n    <div class="pb-faq-list">\n      <details class="pb-faq-item" open>\n        <summary>Can I export my project and host it anywhere?</summary>\n        <p class="pb-faq-ans">Yes! You can export a clean ZIP package containing standard HTML, CSS, and JS, or publish with 1-click to GitHub Pages, Netlify, Vercel, or Cloudflare Pages.</p>\n      </details>\n      <details class="pb-faq-item">\n        <summary>Do I need an account or server to run this?</summary>\n        <p class="pb-faq-ans">No account or server is required. Everything runs directly inside your web browser with local data persistence using IndexedDB and WebCrypto.</p>\n      </details>\n      <details class="pb-faq-item">\n        <summary>How does the Click-to-Edit inspector work?</summary>\n        <p class="pb-faq-ans">Click the crosshair icon, hover over any element in the live preview to highlight it, and click. You can change text directly without AI, tweak styles with visual sliders, or give targeted surgical prompts.</p>\n      </details>\n    </div>\n  </div>\n</section>`
  },
  {
    id: "contact_form",
    name: "Contact Form",
    cat: "forms",
    desc: "Responsive contact section with input fields, message area, and send button.",
    css: `.pb-contact{padding:64px 24px;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}.pb-contact .pb-wrap{max-width:580px;margin:0 auto}.pb-form{background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:16px;padding:32px 28px;display:flex;flex-direction:column;gap:16px}.pb-form-group{display:flex;flex-direction:column;gap:6px}.pb-form-group label{font-size:.85rem;font-weight:700;color:#374151}.pb-form-group input,.pb-form-group textarea{padding:10px 14px;border:1.5px solid #d1d5db;border-radius:8px;font-size:.95rem;font-family:inherit;background:#fff;box-sizing:border-box;width:100%}.pb-form-group input:focus,.pb-form-group textarea:focus{border-color:#111827;outline:none}`,
    html: `<section class="pb-contact">\n  <div class="pb-wrap">\n    <div class="pb-head">\n      <h2>Get in Touch</h2>\n      <p>Have an idea or need support? Send us a message and we will respond promptly.</p>\n    </div>\n    <form class="pb-form" onsubmit="event.preventDefault(); alert('Message sent!');">\n      <div class="pb-form-group">\n        <label for="pbName">Your Name</label>\n        <input id="pbName" type="text" placeholder="Alex Morgan" required autocomplete="name">\n      </div>\n      <div class="pb-form-group">\n        <label for="pbEmail">Email Address</label>\n        <input id="pbEmail" type="email" placeholder="alex@example.com" required autocomplete="email">\n      </div>\n      <div class="pb-form-group">\n        <label for="pbMsg">Message</label>\n        <textarea id="pbMsg" rows="4" placeholder="Tell us about your project..." required></textarea>\n      </div>\n      <button class="pb-btn-primary" type="submit" style="width:100%;margin-top:8px">Send Message</button>\n    </form>\n  </div>\n</section>`
  },
  {
    id: "modern_footer",
    name: "Modern Footer",
    cat: "forms",
    desc: "4-column footer with brand summary, links, and copyright bar.",
    css: `.pb-footer{background:#111827;color:#9ca3af;padding:60px 24px 24px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}.pb-footer .pb-wrap{max-width:1120px;margin:0 auto}.pb-foot-grid{display:grid;grid-template-columns:1.5fr repeat(3,1fr);gap:40px;margin-bottom:48px}.pb-foot-brand h3{color:#fff;font-size:1.3rem;font-weight:800;margin:0 0 12px}.pb-foot-brand p{font-size:.9rem;line-height:1.6;margin:0;max-width:280px}.pb-foot-col h4{color:#fff;font-size:.9rem;font-weight:700;margin:0 0 16px;text-transform:uppercase;letter-spacing:.05em}.pb-foot-col ul{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px}.pb-foot-col a{color:#9ca3af;text-decoration:none;font-size:.9rem;transition:color .15s}.pb-foot-col a:hover{color:#fff}.pb-foot-bar{border-top:1px solid #1f2937;padding-top:24px;display:flex;justify-content:space-between;align-items:center;font-size:.85rem}@media(max-width:768px){.pb-foot-grid{grid-template-columns:1fr;gap:28px}.pb-foot-bar{flex-direction:column;gap:12px;text-align:center}}`,
    html: `<footer class="pb-footer">\n  <div class="pb-wrap">\n    <div class="pb-foot-grid">\n      <div class="pb-foot-brand">\n        <h3>Poppy Workspace</h3>\n        <p>Turn descriptions into live web applications, tools, and games with responsive components.</p>\n      </div>\n      <div class="pb-foot-col">\n        <h4>Product</h4>\n        <ul>\n          <li><a href="#features">Features</a></li>\n          <li><a href="#pricing">Pricing</a></li>\n          <li><a href="#showcase">Showcase</a></li>\n        </ul>\n      </div>\n      <div class="pb-foot-col">\n        <h4>Resources</h4>\n        <ul>\n          <li><a href="#docs">Documentation</a></li>\n          <li><a href="#api">API Reference</a></li>\n          <li><a href="#status">System Status</a></li>\n        </ul>\n      </div>\n      <div class="pb-foot-col">\n        <h4>Legal</h4>\n        <ul>\n          <li><a href="#privacy">Privacy Policy</a></li>\n          <li><a href="#terms">Terms of Service</a></li>\n          <li><a href="#security">Security</a></li>\n        </ul>\n      </div>\n    </div>\n    <div class="pb-foot-bar">\n      <div>&copy; 2026 Poppy Inc. All rights reserved. Built with pride.</div>\n      <div>Designed for creators everywhere.</div>\n    </div>\n  </div>\n</footer>`
  }
];

function insertBlockIntoHtml(docHtml, blockCss, blockHtml, pos = "bottom", selectedOuterHtml = null) {
  let res = docHtml;
  if (blockCss && blockCss.trim()) {
    if (res.includes("</style>")) {
      const idx = res.lastIndexOf("</style>");
      res = res.slice(0, idx) + "\n\n/* UI Block Style */\n" + blockCss + "\n" + res.slice(idx);
    } else if (res.includes("</head>")) {
      res = res.replace("</head>", `<style>\n${blockCss}\n</style>\n</head>`);
    } else {
      res = `<style>\n${blockCss}\n</style>\n` + res;
    }
  }
  if (pos === "after_selected" && selectedOuterHtml && res.includes(selectedOuterHtml)) {
    const idx = res.indexOf(selectedOuterHtml) + selectedOuterHtml.length;
    res = res.slice(0, idx) + "\n\n" + blockHtml + "\n" + res.slice(idx);
  } else if (pos === "top") {
    const headerMatch = res.match(/<\/(header|nav)>/i);
    if (headerMatch) {
      const idx = headerMatch.index + headerMatch[0].length;
      res = res.slice(0, idx) + "\n\n" + blockHtml + "\n" + res.slice(idx);
    } else {
      const bodyMatch = res.match(/<body[^>]*>/i);
      if (bodyMatch) {
        const idx = bodyMatch.index + bodyMatch[0].length;
        res = res.slice(0, idx) + "\n\n" + blockHtml + "\n" + res.slice(idx);
      } else {
        res = blockHtml + "\n" + res;
      }
    }
  } else {
    const footerMatch = res.match(/<footer[^>]*>/i);
    if (footerMatch) {
      const idx = footerMatch.index;
      res = res.slice(0, idx) + blockHtml + "\n\n" + res.slice(idx);
    } else if (res.includes("</body>")) {
      res = res.replace("</body>", `\n${blockHtml}\n</body>`);
    } else {
      res = res + "\n" + blockHtml;
    }
  }
  return res;
}

function updateElementTextInDoc(docHtml, selector, newText, oldOuter) {
  if (oldOuter && docHtml.includes(oldOuter)) {
    const tagMatch = oldOuter.match(/^<([a-zA-Z0-9-]+)([^>]*)>([\s\S]*)<\/\1>$/);
    if (tagMatch) {
      const newOuter = `<${tagMatch[1]}${tagMatch[2]}>${newText}</${tagMatch[1]}>`;
      return docHtml.replace(oldOuter, newOuter);
    }
  }
  return docHtml;
}

function replaceElementInDoc(docHtml, selector, oldOuter, newOuter) {
  if (oldOuter && docHtml.includes(oldOuter)) {
    return docHtml.replace(oldOuter, newOuter);
  }
  return docHtml;
}

function updateElementStyleInDoc(docHtml, selector, styleProp, styleVal, oldOuter) {
  if (oldOuter && docHtml.includes(oldOuter)) {
    const styleAttrMatch = oldOuter.match(/style=["']([^"']*)["']/);
    let newOuter;
    const kebab = styleProp.replace(/([A-Z])/g, "-$1").toLowerCase();
    const styleRule = `${kebab}: ${styleVal}`;
    if (styleAttrMatch) {
      let existing = styleAttrMatch[1].trim();
      if (!existing.endsWith(";") && existing.length > 0) existing += "; ";
      newOuter = oldOuter.replace(styleAttrMatch[0], `style="${existing} ${styleRule};"`);
    } else {
      newOuter = oldOuter.replace(/^<([a-zA-Z0-9-]+)/, `<$1 style="${styleRule};"`);
    }
    return { html: docHtml.replace(oldOuter, newOuter), newOuter };
  }
  return { html: docHtml, newOuter: oldOuter };
}

function toggleInspector(force) {
  if (!current) { toast("Build or open a site first"); return; }
  inspectActive = typeof force === "boolean" ? force : !inspectActive;
  $("#inspectBtn").classList.toggle("active", inspectActive);
  try {
    $("#frame").contentWindow.postMessage({ poppy: 1, cmd: "inspector", active: inspectActive }, "*");
  } catch (e) {}
  if (inspectActive) toast("Inspector active: click any element on the preview to edit");
}

function onElementSelected(data) {
  selectedElement = {
    selector: data.selector,
    tag: data.tag,
    text: data.text || "",
    outerHtml: data.outerHtml || "",
    styles: data.styles || {}
  };
  toggleInspector(false);
  
  $("#inspectTagBadge").textContent = `<${selectedElement.tag}> ${selectedElement.selector}`;
  $("#inspectTextIn").value = selectedElement.text;
  $("#inspectAiIn").value = "";
  $("#inspectAiSt").textContent = "";
  
  const st = selectedElement.styles;
  const parsePx = (v, def) => { const m = parseInt(v, 10); return isNaN(m) ? def : m; };
  $("#inspectStyleFontSize").value = parsePx(st.fontSize, 16);
  $("#inspectValFontSize").textContent = $("#inspectStyleFontSize").value + "px";
  
  $("#inspectStyleRadius").value = parsePx(st.borderRadius, 4);
  $("#inspectValRadius").textContent = $("#inspectStyleRadius").value + "px";
  
  $("#inspectStylePadding").value = parsePx(st.padding, 8);
  $("#inspectValPadding").textContent = $("#inspectStylePadding").value + "px";
  
  const rgbToHex = col => {
    if (!col) return "#000000";
    if (col.startsWith("#")) return col;
    const m = col.match(/\d+/g);
    if (m && m.length >= 3) {
      return "#" + ((1 << 24) + (+m[0] << 16) + (+m[1] << 8) + +m[2]).toString(16).slice(1);
    }
    return "#000000";
  };
  const cHex = rgbToHex(st.color);
  $("#inspectStyleColor").value = cHex;
  $("#inspectStyleColorText").value = cHex;
  
  const bgHex = rgbToHex(st.backgroundColor) || "#ffffff";
  $("#inspectStyleBgColor").value = bgHex;
  $("#inspectStyleBgColorText").value = bgHex;
  
  $("#inspectDlg").showModal();
}

function applyElementText() {
  if (!selectedElement || !current) return;
  const newText = $("#inspectTextIn").value;
  const updatedHtml = updateElementTextInDoc(current, selectedElement.selector, newText, selectedElement.outerHtml);
  if (updatedHtml !== current) {
    current = updatedHtml;
    currentFiles["index.html"] = current;
    hist = hist.slice(0, hi + 1);
    hist.push({ t: Date.now(), prompt: `Edit text in <${selectedElement.tag}>`, html: current, files: {...currentFiles}, prov: prov() });
    if (hist.length > 30) hist.splice(0, hist.length - 30);
    trimHist(hist);
    hi = hist.length - 1;
    saveHist();
    refreshVers();
    show(current);
    toast("Saved element text");
  }
  $("#inspectDlg").close();
}

async function applyElementAi() {
  if (!selectedElement || !current) return;
  const inst = $("#inspectAiIn").value.trim();
  if (!inst) { toast("Please type an instruction"); return; }
  const stEl = $("#inspectAiSt");
  stEl.textContent = "AI is updating element...";
  $("#inspectApplyAiBtn").disabled = true;
  
  try {
    const surgicalSys = "You are a surgical web designer. You receive an element's outerHTML and an edit request. Reply with ONLY the updated outerHTML of the element. Do not wrap in markdown or code blocks. Do not include <html>, <head>, or <body> tags. Keep attributes and classes unless instructed.";
    const userPrompt = `Current outerHTML:\n${selectedElement.outerHtml}\n\nInstruction:\n${inst}`;
    let newOuter = "";
    for await (const chunk of stream([{ role: "user", content: userPrompt }], surgicalSys)) {
      newOuter += chunk;
    }
    newOuter = newOuter.trim().replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
    if (!newOuter.startsWith("<") || !newOuter.endsWith(">")) {
      throw new Error("Invalid HTML returned by AI");
    }
    const updatedHtml = replaceElementInDoc(current, selectedElement.selector, selectedElement.outerHtml, newOuter);
    if (updatedHtml !== current) {
      current = updatedHtml;
      currentFiles["index.html"] = current;
      hist = hist.slice(0, hi + 1);
      hist.push({ t: Date.now(), prompt: `AI edit <${selectedElement.tag}>: ${inst.slice(0, 30)}`, html: current, files: {...currentFiles}, prov: prov() });
      if (hist.length > 30) hist.splice(0, hist.length - 30);
      trimHist(hist);
      hi = hist.length - 1;
      saveHist();
      refreshVers();
      show(current);
      toast("Applied surgical AI edit");
    }
    $("#inspectDlg").close();
  } catch (err) {
    stEl.textContent = "Error: " + err.message;
  } finally {
    $("#inspectApplyAiBtn").disabled = false;
  }
}

function applyElementStyles() {
  if (!selectedElement || !current) return;
  const fs = $("#inspectStyleFontSize").value + "px";
  const rad = $("#inspectStyleRadius").value + "px";
  const pad = $("#inspectStylePadding").value + "px";
  const col = $("#inspectStyleColorText").value || $("#inspectStyleColor").value;
  const bg = $("#inspectStyleBgColorText").value || $("#inspectStyleBgColor").value;
  
  let cur = current;
  let o = selectedElement.outerHtml;
  
  let res1 = updateElementStyleInDoc(cur, selectedElement.selector, "fontSize", fs, o); cur = res1.html; o = res1.newOuter;
  let res2 = updateElementStyleInDoc(cur, selectedElement.selector, "borderRadius", rad, o); cur = res2.html; o = res2.newOuter;
  let res3 = updateElementStyleInDoc(cur, selectedElement.selector, "padding", pad, o); cur = res3.html; o = res3.newOuter;
  let res4 = updateElementStyleInDoc(cur, selectedElement.selector, "color", col, o); cur = res4.html; o = res4.newOuter;
  let res5 = updateElementStyleInDoc(cur, selectedElement.selector, "backgroundColor", bg, o); cur = res5.html; o = res5.newOuter;
  
  if (cur !== current) {
    current = cur;
    currentFiles["index.html"] = current;
    hist = hist.slice(0, hi + 1);
    hist.push({ t: Date.now(), prompt: `Style edit <${selectedElement.tag}>`, html: current, files: {...currentFiles}, prov: prov() });
    if (hist.length > 30) hist.splice(0, hist.length - 30);
    trimHist(hist);
    hi = hist.length - 1;
    saveHist();
    refreshVers();
    show(current);
    toast("Saved element styles");
  }
  $("#inspectDlg").close();
}

function openBlocksDrawer() {
  renderBlocksGrid("all");
  $("#blocksDlg").showModal();
}

function renderBlocksGrid(cat) {
  const grid = $("#blocksGrid");
  grid.textContent = "";
  const list = cat === "all" ? UI_BLOCKS : UI_BLOCKS.filter(b => b.cat === cat);
  list.forEach(b => {
    const card = document.createElement("div");
    card.className = "block-card";
    
    const preview = document.createElement("div");
    preview.className = "block-preview";
    preview.innerHTML = `<span style="font-size:12px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:.05em">${b.cat}</span>`;
    
    const meta = document.createElement("div");
    meta.className = "block-meta";
    const h = document.createElement("h4");
    h.className = "block-title";
    h.textContent = b.name;
    const p = document.createElement("p");
    p.className = "block-desc";
    p.textContent = b.desc;
    meta.append(h, p);
    
    const acts = document.createElement("div");
    acts.className = "block-acts";
    const insBtn = document.createElement("button");
    insBtn.className = "go sm";
    insBtn.textContent = "Insert Block";
    insBtn.onclick = () => {
      insertSelectedBlock(b);
      $("#blocksDlg").close();
    };
    acts.append(insBtn);
    
    card.append(preview, meta, acts);
    grid.append(card);
  });
}

function insertSelectedBlock(block) {
  if (!current) { toast("Build or open a site first"); return; }
  const pos = $("#blockInsertPos").value;
  const selOuter = selectedElement ? selectedElement.outerHtml : null;
  const newHtml = insertBlockIntoHtml(current, block.css, block.html, pos, selOuter);
  if (newHtml !== current) {
    current = newHtml;
    currentFiles["index.html"] = current;
    hist = hist.slice(0, hi + 1);
    hist.push({ t: Date.now(), prompt: `Inserted block: ${block.name}`, html: current, files: {...currentFiles}, prov: prov() });
    if (hist.length > 30) hist.splice(0, hist.length - 30);
    trimHist(hist);
    hi = hist.length - 1;
    saveHist();
    refreshVers();
    show(current);
    toast(`Inserted ${block.name} block`);
  }
}

// Wire up inspector tabs
if ($("#inspectTabs")) $("#inspectTabs").onclick = e => {
  const b = e.target.closest("button.tab");
  if (!b) return;
  $("#inspectTabs").querySelectorAll(".tab").forEach(t => t.setAttribute("aria-pressed", "false"));
  b.setAttribute("aria-pressed", "true");
  const tab = b.dataset.tab;
  $("#inspectTabText").style.display = tab === "text" ? "flex" : "none";
  $("#inspectTabAi").style.display = tab === "ai" ? "flex" : "none";
  $("#inspectTabStyles").style.display = tab === "styles" ? "flex" : "none";
};

// Wire up block category tabs
if ($("#blockCatTabs")) $("#blockCatTabs").onclick = e => {
  const b = e.target.closest("button.lib-tab");
  if (!b) return;
  $("#blockCatTabs").querySelectorAll(".lib-tab").forEach(t => t.classList.remove("active"));
  b.classList.add("active");
  renderBlocksGrid(b.dataset.cat);
};

// Live style adjustments in iframe
$("#inspectStyleFontSize").oninput = e => {
  $("#inspectValFontSize").textContent = e.target.value + "px";
  if (selectedElement) try { $("#frame").contentWindow.postMessage({ poppy: 1, cmd: "update_element_style", selector: selectedElement.selector, prop: "fontSize", val: e.target.value + "px" }, "*"); } catch (err) {}
};
$("#inspectStyleRadius").oninput = e => {
  $("#inspectValRadius").textContent = e.target.value + "px";
  if (selectedElement) try { $("#frame").contentWindow.postMessage({ poppy: 1, cmd: "update_element_style", selector: selectedElement.selector, prop: "borderRadius", val: e.target.value + "px" }, "*"); } catch (err) {}
};
$("#inspectStylePadding").oninput = e => {
  $("#inspectValPadding").textContent = e.target.value + "px";
  if (selectedElement) try { $("#frame").contentWindow.postMessage({ poppy: 1, cmd: "update_element_style", selector: selectedElement.selector, prop: "padding", val: e.target.value + "px" }, "*"); } catch (err) {}
};
$("#inspectStyleColor").oninput = e => {
  $("#inspectStyleColorText").value = e.target.value;
  if (selectedElement) try { $("#frame").contentWindow.postMessage({ poppy: 1, cmd: "update_element_style", selector: selectedElement.selector, prop: "color", val: e.target.value }, "*"); } catch (err) {}
};
$("#inspectStyleColorText").oninput = e => {
  $("#inspectStyleColor").value = e.target.value;
  if (selectedElement) try { $("#frame").contentWindow.postMessage({ poppy: 1, cmd: "update_element_style", selector: selectedElement.selector, prop: "color", val: e.target.value }, "*"); } catch (err) {}
};
$("#inspectStyleBgColor").oninput = e => {
  $("#inspectStyleBgColorText").value = e.target.value;
  if (selectedElement) try { $("#frame").contentWindow.postMessage({ poppy: 1, cmd: "update_element_style", selector: selectedElement.selector, prop: "backgroundColor", val: e.target.value }, "*"); } catch (err) {}
};
$("#inspectStyleBgColorText").oninput = e => {
  $("#inspectStyleBgColor").value = e.target.value;
  if (selectedElement) try { $("#frame").contentWindow.postMessage({ poppy: 1, cmd: "update_element_style", selector: selectedElement.selector, prop: "backgroundColor", val: e.target.value }, "*"); } catch (err) {}
};

// Buttons
if ($("#inspectBtn")) $("#inspectBtn").onclick = () => toggleInspector();
if ($("#inspectMenuBtn")) $("#inspectMenuBtn").onclick = () => { $("#menu").hidden = true; toggleInspector(); };
if ($("#blocksBtn")) $("#blocksBtn").onclick = openBlocksDrawer;
if ($("#blocksMenuBtn")) $("#blocksMenuBtn").onclick = () => { $("#menu").hidden = true; openBlocksDrawer(); };
if ($("#inspectClose")) $("#inspectClose").onclick = () => $("#inspectDlg").close();
if ($("#blocksClose")) $("#blocksClose").onclick = () => $("#blocksDlg").close();
if ($("#inspectApplyTextBtn")) $("#inspectApplyTextBtn").onclick = applyElementText;
if ($("#inspectApplyAiBtn")) $("#inspectApplyAiBtn").onclick = applyElementAi;
if ($("#inspectApplyStylesBtn")) $("#inspectApplyStylesBtn").onclick = applyElementStyles;
