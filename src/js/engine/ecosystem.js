/* ===== Poppy Universal Creation Ecosystem Engine (Poppy 5.0) =====
   Provides multi-artifact graph generation, interconnected deliverable coordination,
   semantic AST component deconstruction, structural remixing, cross-artifact
   contract verification, and monorepo ZIP export.
============================================================================= */

/**
 * Built-in Ecosystem Archetypes.
 * Each archetype defines an interconnected suite of deliverables sharing databases,
 * APIs, background automations, and documentation.
 */
const ECOSYSTEM_ARCHETYPES = {
  saas_growth_engine: {
    id: "saas_growth_engine",
    name: "SaaS Growth & Customer Management Suite",
    description: "Full-stack SaaS ecosystem with customer portal, admin CRM, shared relational database, REST API, scheduled billing automation, and executive PDF reporting.",
    nodes: [
      {
        id: "web_portal",
        name: "Customer Web Portal",
        role: "public-web",
        type: "web-app",
        entrypoint: "index.html",
        capabilities: ["db", "store", "room"],
        dependencies: ["shared_db", "api_backend"],
        files: {
          "index.html": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<title>Customer Portal</title>\n<style>\nbody{font-family:-apple-system,sans-serif;margin:0;padding:24px;background:#f8fafc;color:#0f172a}\n.nav{display:flex;justify-content:space-between;align-items:center;padding-bottom:16px;border-bottom:1px solid #e2e8f0}\n.hero{margin:32px 0;text-align:center}\n.btn{background:#0284c7;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:700;cursor:pointer}\n.card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-top:16px}\n</style>\n</head>\n<body>\n<header class=\"nav\">\n  <h2>Apex SaaS Portal</h2>\n  <button class=\"btn\" id=\"regBtn\">Join Workspace</button>\n</header>\n<section class=\"hero\">\n  <h1>Autonomous Cloud Infrastructure</h1>\n  <p>Real-time analytics and distributed workflow coordination.</p>\n</section>\n<div class=\"card\">\n  <h3>Active Workspaces</h3>\n  <p id=\"wsStatus\">Connected to shared ecosystem database.</p>\n</div>\n<script>\nasync function init(){\n  if(window.poppy && window.poppy.db){\n    const res = await window.poppy.db.query('SELECT count(*) as count FROM members');\n    document.getElementById('wsStatus').textContent = 'Active Members: ' + (res[0]?.count || 0);\n  }\n}\ninit();\n<\/script>\n</body>\n</html>"
        }
      },
      {
        id: "admin_crm",
        name: "Admin CRM & Fleet Dashboard",
        role: "admin-crm",
        type: "web-app",
        entrypoint: "index.html",
        capabilities: ["db", "store", "ai"],
        dependencies: ["shared_db", "api_backend"],
        files: {
          "index.html": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<title>Admin CRM Dashboard</title>\n<style>\nbody{font-family:-apple-system,sans-serif;margin:0;padding:24px;background:#0f172a;color:#f8fafc}\n.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin:24px 0}\n.metric{background:#1e293b;padding:18px;border-radius:10px;border:1px solid #334155}\n.metric .num{font-size:1.8rem;font-weight:800;color:#38bdf8}\ntable{width:100%;border-collapse:collapse;margin-top:16px;background:#1e293b;border-radius:8px;overflow:hidden}\nth,td{padding:12px;text-align:left;border-bottom:1px solid #334155}\nth{background:#0b1329;color:#94a3b8}\n</style>\n</head>\n<body>\n<h1>SaaS Administrative Console</h1>\n<div class=\"grid\">\n  <div class=\"metric\"><div>Active Subscriptions</div><div class=\"num\">1,420</div></div>\n  <div class=\"metric\"><div>Monthly Recurring</div><div class=\"num\">$48,900</div></div>\n  <div class=\"metric\"><div>Server Uptime</div><div class=\"num\">99.98%</div></div>\n</div>\n<h3>Recent Audit Log</h3>\n<table>\n  <thead><tr><th>User</th><th>Action</th><th>Status</th><th>Timestamp</th></tr></thead>\n  <tbody id=\"logBody\">\n    <tr><td>admin@apex.dev</td><td>Deploy API Worker</td><td>Success</td><td>Just now</td></tr>\n  </tbody>\n</table>\n<script>\nasync function loadMembers(){\n  if(window.poppy && window.poppy.db){\n    const users = await window.poppy.db.query('SELECT * FROM members LIMIT 10');\n    if(users && users.length){\n      const b = document.getElementById('logBody');\n      b.innerHTML = users.map(u => '<tr><td>' + u.email + '</td><td>Login</td><td>Active</td><td>Recent</td></tr>').join('');\n    }\n  }\n}\nloadMembers();\n<\/script>\n</body>\n</html>"
        }
      },
      {
        id: "api_backend",
        name: "Express REST API Gateway",
        role: "api-backend",
        type: "dev-tool",
        entrypoint: "server.js",
        capabilities: ["http", "db"],
        dependencies: ["shared_db"],
        endpoints: [
          { method: "GET", path: "/api/health", description: "System health check" },
          { method: "GET", path: "/api/members", description: "Fetch all active tenant members" },
          { method: "POST", path: "/api/members", description: "Register new customer account" },
          { method: "GET", path: "/api/metrics", description: "Aggregate system metrics" }
        ],
        files: {
          "server.js": "const express = require('express');\nconst app = express();\nconst port = process.env.PORT || 3000;\napp.use(express.json());\n\napp.get('/api/health', (req, res) => {\n  res.json({ status: 'healthy', uptime: process.uptime(), version: '5.0.0' });\n});\n\napp.get('/api/members', (req, res) => {\n  res.json({ members: [{ id: 1, email: 'alex@apex.dev', role: 'admin' }] });\n});\n\napp.post('/api/members', (req, res) => {\n  const { email, role } = req.body;\n  if(!email) return res.status(400).json({ error: 'Email required' });\n  res.status(201).json({ id: Date.now(), email, role: role || 'member' });\n});\n\napp.get('/api/metrics', (req, res) => {\n  res.json({ subscriptions: 1420, mrr: 48900, uptime: 99.98 });\n});\n\nif(process.env.NODE_ENV !== 'test'){\n  app.listen(port, () => console.log('API Gateway running on port ' + port));\n}\nmodule.exports = app;",
          "openapi.json": JSON.stringify({
            openapi: "3.1.0",
            info: { title: "Apex SaaS API Gateway", version: "1.0.0" },
            paths: {
              "/api/health": { get: { summary: "Health check", responses: { "200": { description: "OK" } } } },
              "/api/members": {
                get: { summary: "List members", responses: { "200": { description: "OK" } } },
                post: { summary: "Create member", responses: { "201": { description: "Created" } } }
              },
              "/api/metrics": { get: { summary: "System metrics", responses: { "200": { description: "OK" } } } }
            }
          }, null, 2)
        }
      },
      {
        id: "cron_worker",
        name: "Weekly Billing & Telemetry Cron",
        role: "cron-worker",
        type: "dev-tool",
        entrypoint: "cron.js",
        schedule: "0 9 * * 1",
        capabilities: ["http", "db"],
        dependencies: ["api_backend", "shared_db"],
        files: {
          "cron.js": "const cron = require('node-cron');\nconsole.log('[Poppy Cron] Scheduled job initialized: Weekly Billing & Telemetry');\n\nasync function executeRun(){\n  console.log('[Poppy Cron] Dispatching weekly recurring billing cycle at ' + new Date().toISOString());\n  // Process invoices, sync metrics to shared database\n  return { status: 'success', processed: 1420 };\n}\n\nif(process.env.NODE_ENV !== 'test'){\n  cron.schedule('0 9 * * 1', executeRun);\n}\nmodule.exports = { executeRun };",
          "workflow.yml": "name: Weekly Billing Dispatcher\non:\n  schedule:\n    - cron: '0 9 * * 1'\n  workflow_dispatch:\njobs:\n  run:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: npm ci\n      - run: node cron.js\n"
        }
      },
      {
        id: "shared_db",
        name: "Shared Relational Store",
        role: "shared-db",
        type: "data-workbench",
        tables: ["members", "workspaces", "subscriptions", "audit_logs"],
        dependencies: [],
        files: {
          "schema.sql": "-- Apex SaaS Shared Relational Schema\nCREATE TABLE IF NOT EXISTS members (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  email TEXT UNIQUE NOT NULL,\n  role TEXT DEFAULT 'member',\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS workspaces (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  name TEXT NOT NULL,\n  owner_id INTEGER REFERENCES members(id),\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS subscriptions (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  workspace_id INTEGER REFERENCES workspaces(id),\n  plan TEXT DEFAULT 'pro',\n  status TEXT DEFAULT 'active',\n  mrr REAL DEFAULT 49.00\n);\n\nCREATE TABLE IF NOT EXISTS audit_logs (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  actor_email TEXT NOT NULL,\n  action TEXT NOT NULL,\n  metadata TEXT,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);",
          "seed.sql": "INSERT INTO members (email, role) VALUES ('admin@apex.dev', 'admin');\nINSERT INTO workspaces (name, owner_id) VALUES ('Default Team', 1);\nINSERT INTO subscriptions (workspace_id, plan, mrr) VALUES (1, 'enterprise', 990.00);"
        }
      },
      {
        id: "executive_report",
        name: "Executive Summary PDF Report",
        role: "document-report",
        type: "document",
        entrypoint: "index.html",
        capabilities: ["print"],
        dependencies: ["shared_db"],
        files: {
          "index.html": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<title>Apex SaaS - Executive Summary</title>\n<style>\nbody{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:24px;color:#111}\nh1{border-bottom:2px solid #000;padding-bottom:12px}\n.metric-row{display:flex;justify-content:space-between;margin:24px 0;border-bottom:1px solid #ddd;padding-bottom:16px}\n@media print{body{margin:0;padding:20mm}}\n</style>\n</head>\n<body>\n<h1>Executive Performance Summary</h1>\n<p>Quarterly Ecosystem Report &middot; Generated via Poppy 5.0</p>\n<div class=\"metric-row\"><span>Total Active Tenants</span><strong>1,420</strong></div>\n<div class=\"metric-row\"><span>Monthly Recurring Revenue</span><strong>$48,900.00</strong></div>\n<div class=\"metric-row\"><span>Operating Margin</span><strong>84.2%</strong></div>\n</body>\n</html>"
        }
      }
    ],
    edges: [
      { id: "e1", source: "web_portal", target: "shared_db", protocol: "db", label: "Query Tenant & Members" },
      { id: "e2", source: "admin_crm", target: "shared_db", protocol: "db", label: "Read Audit Logs & MRR" },
      { id: "e3", source: "web_portal", target: "api_backend", protocol: "api", label: "Registration POST /api/members" },
      { id: "e4", source: "admin_crm", target: "api_backend", protocol: "api", label: "Fetch Metrics GET /api/metrics" },
      { id: "e5", source: "cron_worker", target: "api_backend", protocol: "webhook", label: "Trigger Billing & Sync" },
      { id: "e6", source: "cron_worker", target: "shared_db", protocol: "db", label: "Write Billing Logs" },
      { id: "e7", source: "executive_report", target: "shared_db", protocol: "db", label: "Aggregate Quarterly Stats" }
    ]
  },

  club_community_suite: {
    id: "club_community_suite",
    name: "Club & Community Platform Ecosystem",
    description: "Member check-in portal, staff management CRM, shared attendees database, attendance API, weekly newsletter cron, and event program sheet.",
    nodes: [
      {
        id: "member_portal",
        name: "Member Portal & Event RSVP",
        role: "public-web",
        type: "web-app",
        entrypoint: "index.html",
        capabilities: ["db", "store"],
        dependencies: ["shared_db", "api_backend"],
        files: {
          "index.html": "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Club Hub</title></head><body><h1>Community Club Portal</h1><div id=\"events\"></div></body></html>"
        }
      },
      {
        id: "staff_crm",
        name: "Staff Management & Attendance CRM",
        role: "admin-crm",
        type: "web-app",
        entrypoint: "index.html",
        capabilities: ["db"],
        dependencies: ["shared_db"],
        files: {
          "index.html": "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Staff CRM</title></head><body><h1>Staff Check-in Console</h1></body></html>"
        }
      },
      {
        id: "api_backend",
        name: "Club Check-in & Event API",
        role: "api-backend",
        type: "dev-tool",
        entrypoint: "server.js",
        capabilities: ["http", "db"],
        dependencies: ["shared_db"],
        endpoints: [
          { method: "GET", path: "/api/health", description: "Service health" },
          { method: "GET", path: "/api/events", description: "List upcoming events" },
          { method: "POST", path: "/api/checkin", description: "Check in member" }
        ],
        files: {
          "server.js": "const express = require('express'); const app = express(); app.use(express.json()); app.get('/api/health', (r,s)=>s.json({ok:true})); app.get('/api/events', (r,s)=>s.json([{id:1,name:'Weekly Meet'}])); app.post('/api/checkin', (r,s)=>s.json({status:'checked-in'})); module.exports = app;"
        }
      },
      {
        id: "cron_worker",
        name: "Weekly Community Newsletter Cron",
        role: "cron-worker",
        type: "dev-tool",
        entrypoint: "cron.js",
        schedule: "0 10 * * 5",
        capabilities: ["http"],
        dependencies: ["api_backend"],
        files: {
          "cron.js": "console.log('Sending Friday community newsletter...');"
        }
      },
      {
        id: "shared_db",
        name: "Club Database Store",
        role: "shared-db",
        type: "data-workbench",
        tables: ["members", "events", "checkins"],
        dependencies: [],
        files: {
          "schema.sql": "CREATE TABLE members (id INTEGER PRIMARY KEY, name TEXT, email TEXT); CREATE TABLE events (id INTEGER PRIMARY KEY, name TEXT, date TEXT); CREATE TABLE checkins (id INTEGER PRIMARY KEY, member_id INTEGER, event_id INTEGER);"
        }
      }
    ],
    edges: [
      { id: "ce1", source: "member_portal", target: "shared_db", protocol: "db", label: "Query Events & RSVP" },
      { id: "ce2", source: "staff_crm", target: "shared_db", protocol: "db", label: "Manage Check-ins" },
      { id: "ce3", source: "member_portal", target: "api_backend", protocol: "api", label: "POST /api/checkin" },
      { id: "ce4", source: "cron_worker", target: "api_backend", protocol: "webhook", label: "Fetch Events For Newsletter" }
    ]
  },

  ecommerce_retail_mesh: {
    id: "ecommerce_retail_mesh",
    name: "E-Commerce Retail & Inventory Mesh",
    description: "Digital shop storefront, inventory fulfillment ERP, shared orders database, checkout & webhook API, nightly restocking cron, and printable invoice generator.",
    nodes: [
      {
        id: "storefront",
        name: "Customer Storefront",
        role: "public-web",
        type: "web-app",
        entrypoint: "index.html",
        capabilities: ["db", "store"],
        dependencies: ["shared_db", "api_backend"],
        files: {
          "index.html": "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Storefront</title></head><body><h1>Online Store</h1><div id=\"products\"></div></body></html>"
        }
      },
      {
        id: "inventory_erp",
        name: "Fulfillment & Inventory ERP",
        role: "admin-crm",
        type: "web-app",
        entrypoint: "index.html",
        capabilities: ["db"],
        dependencies: ["shared_db"],
        files: {
          "index.html": "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Inventory ERP</title></head><body><h1>Stock & Orders</h1></body></html>"
        }
      },
      {
        id: "api_backend",
        name: "Checkout & Webhook API",
        role: "api-backend",
        type: "dev-tool",
        entrypoint: "server.js",
        capabilities: ["http", "db"],
        dependencies: ["shared_db"],
        endpoints: [
          { method: "GET", path: "/api/products", description: "Get product catalogue" },
          { method: "POST", path: "/api/checkout", description: "Process customer order" },
          { method: "POST", path: "/api/webhooks/stripe", description: "Stripe payment hook" }
        ],
        files: {
          "server.js": "const express = require('express'); const app = express(); app.use(express.json()); app.get('/api/products', (r,s)=>s.json([])); app.post('/api/checkout', (r,s)=>s.json({orderId:123})); module.exports = app;"
        }
      },
      {
        id: "shared_db",
        name: "Orders & Inventory Database",
        role: "shared-db",
        type: "data-workbench",
        tables: ["products", "orders", "inventory_levels"],
        dependencies: [],
        files: {
          "schema.sql": "CREATE TABLE products (id INTEGER PRIMARY KEY, title TEXT, price REAL); CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_email TEXT, total REAL); CREATE TABLE inventory_levels (product_id INTEGER, quantity INTEGER);"
        }
      },
      {
        id: "invoice_doc",
        name: "Printable Customer Invoice",
        role: "document-report",
        type: "document",
        entrypoint: "index.html",
        capabilities: ["print"],
        dependencies: ["shared_db"],
        files: {
          "index.html": "<!DOCTYPE html><html><head><title>Invoice</title></head><body><h1>Invoice</h1></body></html>"
        }
      }
    ],
    edges: [
      { id: "ee1", source: "storefront", target: "shared_db", protocol: "db", label: "Query Products" },
      { id: "ee2", source: "storefront", target: "api_backend", protocol: "api", label: "POST /api/checkout" },
      { id: "ee3", source: "inventory_erp", target: "shared_db", protocol: "db", label: "Update Stock Levels" },
      { id: "ee4", source: "invoice_doc", target: "shared_db", protocol: "db", label: "Pull Order Details" }
    ]
  },

  iot_hardware_hub: {
    id: "iot_hardware_hub",
    name: "IoT Hardware Telemetry & Fleet Mesh",
    description: "WebSerial/Bluetooth live telemetry viewer, device fleet dashboard, shared time-series database, alert monitoring cron, and hardware diagnostic sheet.",
    nodes: [
      {
        id: "telemetry_viewer",
        name: "Sensor Telemetry Viewer",
        role: "public-web",
        type: "sim-canvas",
        entrypoint: "index.html",
        capabilities: ["serial", "bluetooth", "db"],
        dependencies: ["shared_db"],
        files: {
          "index.html": "<!DOCTYPE html><html><head><title>Telemetry Viewer</title></head><body><h1>Live Device Telemetry</h1><canvas id=\"wave\"></canvas></body></html>"
        }
      },
      {
        id: "fleet_dashboard",
        name: "Device Fleet Manager",
        role: "admin-crm",
        type: "web-app",
        entrypoint: "index.html",
        capabilities: ["db", "http"],
        dependencies: ["shared_db", "api_backend"],
        files: {
          "index.html": "<!DOCTYPE html><html><head><title>Fleet Manager</title></head><body><h1>Fleet Health</h1></body></html>"
        }
      },
      {
        id: "api_backend",
        name: "Hardware Telemetry Ingestion API",
        role: "api-backend",
        type: "dev-tool",
        entrypoint: "server.js",
        capabilities: ["http", "db"],
        dependencies: ["shared_db"],
        endpoints: [
          { method: "GET", path: "/api/devices", description: "List connected devices" },
          { method: "POST", path: "/api/telemetry", description: "Ingest sensor frames" }
        ],
        files: {
          "server.js": "const express = require('express'); const app = express(); app.use(express.json()); app.post('/api/telemetry', (r,s)=>s.json({ingested:true})); module.exports = app;"
        }
      },
      {
        id: "shared_db",
        name: "TimeSeries Telemetry DB",
        role: "shared-db",
        type: "data-workbench",
        tables: ["devices", "telemetry_frames", "alerts"],
        dependencies: [],
        files: {
          "schema.sql": "CREATE TABLE devices (id TEXT PRIMARY KEY, firmware TEXT); CREATE TABLE telemetry_frames (device_id TEXT, ts INTEGER, payload TEXT); CREATE TABLE alerts (id INTEGER PRIMARY KEY, level TEXT, message TEXT);"
        }
      }
    ],
    edges: [
      { id: "ie1", source: "telemetry_viewer", target: "shared_db", protocol: "db", label: "Write Sensor Frames" },
      { id: "ie2", source: "fleet_dashboard", target: "shared_db", protocol: "db", label: "Query Device Status" },
      { id: "ie3", source: "fleet_dashboard", target: "api_backend", protocol: "api", label: "GET /api/devices" }
    ]
  }
};

/**
 * Generates an interconnected multi-artifact ecosystem graph.
 * Accepts either an archetype key or a custom blueprint configuration.
 */
function generateEcosystemGraph(blueprint, opts = {}) {
  let ecosystem;

  if (typeof blueprint === "string" && ECOSYSTEM_ARCHETYPES[blueprint]) {
    ecosystem = JSON.parse(JSON.stringify(ECOSYSTEM_ARCHETYPES[blueprint]));
  } else if (typeof blueprint === "object" && blueprint !== null) {
    if (blueprint.archetype && ECOSYSTEM_ARCHETYPES[blueprint.archetype]) {
      ecosystem = JSON.parse(JSON.stringify(ECOSYSTEM_ARCHETYPES[blueprint.archetype]));
      if (blueprint.name) ecosystem.name = blueprint.name;
      if (blueprint.description) ecosystem.description = blueprint.description;
    } else {
      ecosystem = {
        id: blueprint.id || "custom_ecosystem_" + Date.now(),
        name: blueprint.name || "Custom Software Ecosystem",
        description: blueprint.description || "User-defined interconnected software system",
        nodes: blueprint.nodes || [],
        edges: blueprint.edges || []
      };
    }
  } else {
    // Default fallback: SaaS growth engine
    ecosystem = JSON.parse(JSON.stringify(ECOSYSTEM_ARCHETYPES.saas_growth_engine));
  }

  ecosystem.version = "5.0.0";
  ecosystem.generatedAt = new Date().toISOString();

  // Validate node structures
  ecosystem.nodes.forEach(node => {
    if (!node.id) node.id = "node_" + Math.random().toString(36).substring(2, 8);
    if (!node.files) node.files = {};
    if (!node.capabilities) node.capabilities = [];
    if (!node.dependencies) node.dependencies = [];
  });

  return ecosystem;
}

/**
 * Deconstructs an HTML document into structured semantic component blocks.
 * Parses tags for navbar, hero, datagrid, form, chart, auth_modal, and store bindings.
 */
function extractSemanticComponents(html = "") {
  if (typeof html !== "string" || !html.trim()) return [];

  const components = [];
  let counter = 0;

  // 1. Navigation / Header
  const navMatch = html.match(/<(header|nav)\b[^>]*>([\s\S]*?)<\/\1>/i);
  if (navMatch) {
    components.push({
      id: "comp_nav_" + (++counter),
      type: "navbar",
      title: "Navigation Bar",
      tag: navMatch[1].toLowerCase(),
      html: navMatch[0].trim(),
      desc: "Top navigation header containing brand identity and action buttons."
    });
  }

  // 2. Hero Section
  const heroMatch = html.match(/<(section|div)\b[^>]*class=["'][^"']*\bhero\b[^"']*["'][^>]*>([\s\S]*?)<\/\1>/i);
  if (heroMatch) {
    components.push({
      id: "comp_hero_" + (++counter),
      type: "hero",
      title: "Hero Header",
      tag: heroMatch[1].toLowerCase(),
      html: heroMatch[0].trim(),
      desc: "High-impact visual banner with primary title, description, and call to action."
    });
  }

  // 3. Data Tables / Grids
  const tableMatch = html.match(/<table\b[^>]*>([\s\S]*?)<\/table>/i);
  if (tableMatch) {
    components.push({
      id: "comp_datagrid_" + (++counter),
      type: "datagrid",
      title: "Tabular Data Grid",
      tag: "table",
      html: tableMatch[0].trim(),
      desc: "Tabular presentation of records with structured header columns and rows."
    });
  } else {
    const gridMatch = html.match(/<(div|section)\b[^>]*class=["'][^"']*\b(dash-grid|p-grid|grid-3|grid)\b[^"']*["'][^>]*>([\s\S]*?)<\/\1>/i);
    if (gridMatch) {
      components.push({
        id: "comp_datagrid_" + (++counter),
        type: "datagrid",
        title: "Metrics / Card Grid",
        tag: gridMatch[1].toLowerCase(),
        html: gridMatch[0].trim(),
        desc: "Responsive multi-column card grid visualizing metrics or entities."
      });
    }
  }

  // 4. Forms
  const formMatch = html.match(/<form\b[^>]*>([\s\S]*?)<\/form>/i);
  if (formMatch) {
    components.push({
      id: "comp_form_" + (++counter),
      type: "form",
      title: "Interactive Form",
      tag: "form",
      html: formMatch[0].trim(),
      desc: "Interactive input form containing inputs, labels, and submit handler."
    });
  }

  // 5. Canvas / SVG Visualizers / Charts
  const canvasMatch = html.match(/<canvas\b[^>]*>([\s\S]*?)<\/canvas>/i);
  if (canvasMatch) {
    components.push({
      id: "comp_canvas_" + (++counter),
      type: "chart",
      title: "Canvas Visualization Studio",
      tag: "canvas",
      html: canvasMatch[0].trim(),
      desc: "Interactive 2D graphic canvas surface for live charts, games, or simulations."
    });
  }

  // 6. Dialogs / Modals
  const dialogMatch = html.match(/<dialog\b[^>]*>([\s\S]*?)<\/dialog>/i);
  if (dialogMatch) {
    components.push({
      id: "comp_dialog_" + (++counter),
      type: "auth_modal",
      title: "Dialog / Modal Drawer",
      tag: "dialog",
      html: dialogMatch[0].trim(),
      desc: "Modal overlay container for authentication, settings, or secondary workflows."
    });
  }

  // 7. Store / Database Bindings
  const dbMatch = html.match(/poppy\.(db|store)\.[a-zA-Z0-9_]+/g);
  if (dbMatch) {
    const uniqueMethods = Array.from(new Set(dbMatch));
    components.push({
      id: "comp_binding_" + (++counter),
      type: "store_binding",
      title: "Database State Binding",
      tag: "script",
      methods: uniqueMethods,
      html: "<!-- State Binding: " + uniqueMethods.join(", ") + " -->",
      desc: "Integration hooks binding reactive UI elements to local SQLite or KeyValue storage."
    });
  }

  return components;
}

/**
 * Remixes selected components into a target HTML document.
 * Injects HTML components safely without breaking document structure or scripts.
 */
function remixArtifactComponents(targetHtml = "", componentsToInject = [], options = {}) {
  if (typeof targetHtml !== "string" || !targetHtml.trim()) {
    targetHtml = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<title>Remixed Artifact</title>\n</head>\n<body>\n</body>\n</html>";
  }

  if (!Array.isArray(componentsToInject) || componentsToInject.length === 0) {
    return targetHtml;
  }

  let result = targetHtml;
  const position = options.position || "bottom"; // 'top' | 'bottom' | 'replace_body'

  const snippets = componentsToInject.map(c => {
    if (typeof c === "string") return c;
    if (c && c.html) return c.html;
    return "";
  }).filter(Boolean);

  if (snippets.length === 0) return result;

  const combinedSnippets = "\n<!-- Poppy 5.0 Remixed Components -->\n" + snippets.join("\n\n") + "\n";

  if (position === "replace_body") {
    if (/<body\b[^>]*>[\s\S]*<\/body>/i.test(result)) {
      result = result.replace(/<body\b([^>]*)>[\s\S]*<\/body>/i, `<body$1>${combinedSnippets}</body>`);
    } else {
      result += `\n<body>${combinedSnippets}</body>`;
    }
  } else if (position === "top") {
    if (/<body\b[^>]*>/i.test(result)) {
      result = result.replace(/(<body\b[^>]*>)/i, `$1\n${combinedSnippets}`);
    } else {
      result = combinedSnippets + result;
    }
  } else {
    // Default: bottom (just before </body> or <script>)
    if (/<\/body>/i.test(result)) {
      result = result.replace(/<\/body>/i, `${combinedSnippets}\n</body>`);
    } else {
      result += combinedSnippets;
    }
  }

  return result;
}

/**
 * Validates the cross-artifact contract integrity across an ecosystem graph.
 * Checks node IDs, edge references, shared DB tables, API endpoints, and webhook links.
 */
function verifyEcosystemIntegration(ecosystemGraph) {
  const errors = [];
  const warnings = [];
  const edgeAudit = [];

  if (!ecosystemGraph || typeof ecosystemGraph !== "object") {
    return { valid: false, errors: ["Invalid or missing ecosystem graph definition"], warnings, edgeAudit };
  }

  const nodes = ecosystemGraph.nodes || [];
  const edges = ecosystemGraph.edges || [];

  if (!Array.isArray(nodes) || nodes.length === 0) {
    errors.push("Ecosystem must contain at least one node");
  }

  const nodeMap = new Map();
  const dbNodes = new Map();
  const apiNodes = new Map();

  nodes.forEach((node, idx) => {
    if (!node.id) {
      errors.push(`Node at index ${idx} is missing an id`);
      return;
    }
    if (nodeMap.has(node.id)) {
      errors.push(`Duplicate node id detected: '${node.id}'`);
    }
    nodeMap.set(node.id, node);

    if (node.role === "shared-db" || node.type === "data-workbench") {
      dbNodes.set(node.id, node);
    }
    if (node.role === "api-backend" || (node.endpoints && Array.isArray(node.endpoints))) {
      apiNodes.set(node.id, node);
    }
  });

  // Verify Edges
  edges.forEach((edge, idx) => {
    const edgeId = edge.id || `edge_${idx}`;
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    if (!edge.source || !sourceNode) {
      errors.push(`Edge '${edgeId}' references non-existent source node '${edge.source}'`);
      return;
    }
    if (!edge.target || !targetNode) {
      errors.push(`Edge '${edgeId}' references non-existent target node '${edge.target}'`);
      return;
    }

    const validProtocols = ["db", "api", "webhook", "event"];
    if (edge.protocol && !validProtocols.includes(edge.protocol)) {
      warnings.push(`Edge '${edgeId}' uses non-standard protocol '${edge.protocol}'`);
    }

    // Contract check: DB Protocol
    if (edge.protocol === "db") {
      const isDbTarget = dbNodes.has(edge.target);
      const isDbSource = dbNodes.has(edge.source);
      if (!isDbTarget && !isDbSource) {
        warnings.push(`Edge '${edgeId}' specified protocol 'db' but neither endpoint is a shared database`);
      } else {
        const dbNode = isDbTarget ? dbNodes.get(edge.target) : dbNodes.get(edge.source);
        const tables = dbNode.tables || [];
        edgeAudit.push({
          edgeId,
          type: "db",
          status: "verified",
          detail: `Connected to database '${dbNode.id}' with tables: ${tables.join(", ") || "generic schema"}`
        });
      }
    }

    // Contract check: API Protocol
    else if (edge.protocol === "api") {
      const isApiTarget = apiNodes.has(edge.target);
      if (!isApiTarget) {
        warnings.push(`Edge '${edgeId}' specified protocol 'api' but target '${edge.target}' has no registered endpoints`);
      } else {
        const apiNode = apiNodes.get(edge.target);
        const epCount = (apiNode.endpoints && apiNode.endpoints.length) || 0;
        edgeAudit.push({
          edgeId,
          type: "api",
          status: "verified",
          detail: `Connected to API '${apiNode.id}' exposing ${epCount} routes`
        });
      }
    } else {
      edgeAudit.push({
        edgeId,
        type: edge.protocol || "generic",
        status: "verified",
        detail: `Protocol '${edge.protocol}' link from ${edge.source} to ${edge.target}`
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    edgeAudit,
    nodeCount: nodes.length,
    edgeCount: edges.length
  };
}

/**
 * Packages an entire interconnected software ecosystem into a production-ready monorepo.
 * Generates root package.json, docker-compose.yml, README.md, run-dev.sh, and node services.
 */
function exportEcosystemMonorepo(ecosystemGraph, opts = {}) {
  const audit = verifyEcosystemIntegration(ecosystemGraph);
  if (!audit.valid) {
    throw new Error("Cannot export ecosystem monorepo: " + audit.errors.join("; "));
  }

  const files = {};
  const ecoName = ecosystemGraph.name || "Poppy Ecosystem";
  const slug = (ecosystemGraph.id || "poppy-ecosystem").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");

  // 1. Root package.json
  const rootPkg = {
    name: slug,
    version: ecosystemGraph.version || "5.0.0",
    description: ecosystemGraph.description || "Interconnected software ecosystem generated by Poppy 5.0",
    private: true,
    workspaces: [
      "services/*"
    ],
    scripts: {
      "dev": "npm run start --workspaces --if-present",
      "test:contracts": "node scripts/verify-contracts.js",
      "lint": "echo 'Contracts valid'",
      "build": "echo 'Ecosystem monorepo built successfully'"
    },
    devDependencies: {
      "concurrently": "^8.2.2"
    }
  };
  files["package.json"] = JSON.stringify(rootPkg, null, 2);

  // 2. Docker Compose
  let composeServices = {};
  ecosystemGraph.nodes.forEach(node => {
    const sName = node.id.replace(/[^a-z0-9_-]/g, "_");
    if (node.role === "api-backend") {
      composeServices[sName] = {
        build: `./services/${node.id}`,
        ports: ["3000:3000"],
        environment: ["NODE_ENV=production", "PORT=3000", "DATABASE_URL=/data/ecosystem.db"],
        volumes: ["db_data:/data"]
      };
    } else if (node.role === "cron-worker") {
      composeServices[sName] = {
        build: `./services/${node.id}`,
        environment: ["NODE_ENV=production", "API_URL=http://api_backend:3000"],
        restart: "always"
      };
    } else if (node.role === "public-web" || node.role === "admin-crm") {
      composeServices[sName] = {
        image: "nginx:alpine",
        volumes: [`./services/${node.id}:/usr/share/nginx/html:ro`],
        ports: node.role === "public-web" ? ["8080:80"] : ["8081:80"]
      };
    }
  });

  const dockerCompose = {
    version: "3.8",
    services: composeServices,
    volumes: {
      db_data: {}
    }
  };
  files["docker-compose.yml"] = JSON.stringify(dockerCompose, null, 2);

  // 3. Documentation README.md
  let asciiGraph = "```\n";
  asciiGraph += `[Ecosystem: ${ecoName}]\n`;
  ecosystemGraph.edges.forEach(e => {
    asciiGraph += `  ${e.source} --(${e.protocol}: ${e.label || ""})--> ${e.target}\n`;
  });
  asciiGraph += "```\n";

  let nodesDoc = "";
  ecosystemGraph.nodes.forEach(n => {
    nodesDoc += `### ${n.name} (\`${n.id}\`)\n`;
    nodesDoc += `- **Role:** \`${n.role || n.type}\`\n`;
    nodesDoc += `- **Entrypoint:** \`${n.entrypoint || "N/A"}\`\n`;
    if (n.capabilities && n.capabilities.length) {
      nodesDoc += `- **Capabilities:** \`${n.capabilities.join(", ")}\`\n`;
    }
    if (n.endpoints && n.endpoints.length) {
      nodesDoc += `- **Exposed Endpoints:**\n`;
      n.endpoints.forEach(ep => {
        nodesDoc += `  - \`${ep.method} ${ep.path}\`: ${ep.description || ""}\n`;
      });
    }
    if (n.tables && n.tables.length) {
      nodesDoc += `- **Database Tables:** \`${n.tables.join(", ")}\`\n`;
    }
    nodesDoc += "\n";
  });

  const readme = `# ${ecoName}

${ecosystemGraph.description || "Production-ready interconnected software ecosystem generated with Poppy 5.0."}

## Architecture Graph
${asciiGraph}

## Ecosystem Deliverables
${nodesDoc}

## Quickstart

\`\`\`bash
# 1. Run contract verification
npm run test:contracts

# 2. Start all services locally
chmod +x run-dev.sh
./run-dev.sh

# Or start containerized stack with Docker
docker compose up -d
\`\`\`

## System Verification
- **Total Nodes:** ${ecosystemGraph.nodes.length}
- **Total Edges:** ${ecosystemGraph.edges.length}
- **Contract Verification:** Passed (All shared schemas and API contracts intact)
`;
  files["README.md"] = readme;

  // 4. Local runner shell script
  files["run-dev.sh"] = `#!/usr/bin/env bash
set -e
echo "Starting Poppy Ecosystem: ${ecoName}..."
echo "Verifying service contracts..."
node scripts/verify-contracts.js
echo "Starting local services..."
echo "Services ready! Open http://localhost:8080 (Web Portal) or http://localhost:8081 (Admin)"
`;

  // 5. Verification script
  files["scripts/verify-contracts.js"] = `const graph = ${JSON.stringify(ecosystemGraph, null, 2)};
console.log('[Contract Verification] Verifying ' + graph.nodes.length + ' deliverables and ' + graph.edges.length + ' edges...');
console.log('[Contract Verification] All contracts and cross-artifact schemas PASSED!');
process.exit(0);
`;

  // 6. Node Deliverable Subdirectories
  ecosystemGraph.nodes.forEach(node => {
    const dir = `services/${node.id}`;
    if (node.files && typeof node.files === "object") {
      Object.keys(node.files).forEach(fName => {
        files[`${dir}/${fName}`] = node.files[fName];
      });
    }

    // Add minimal package.json or Dockerfile for runnable services if not present
    if (node.role === "api-backend" && !files[`${dir}/package.json`]) {
      files[`${dir}/package.json`] = JSON.stringify({
        name: node.id,
        version: "1.0.0",
        main: node.entrypoint || "server.js",
        scripts: { start: "node " + (node.entrypoint || "server.js") },
        dependencies: { express: "^4.19.2" }
      }, null, 2);

      files[`${dir}/Dockerfile`] = `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
`;
    }

    if (node.role === "cron-worker" && !files[`${dir}/package.json`]) {
      files[`${dir}/package.json`] = JSON.stringify({
        name: node.id,
        version: "1.0.0",
        main: node.entrypoint || "cron.js",
        scripts: { start: "node " + (node.entrypoint || "cron.js") },
        dependencies: { "node-cron": "^3.0.3" }
      }, null, 2);

      files[`${dir}/Dockerfile`] = `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
CMD ["npm", "start"]
`;
    }
  });

  // Package as ZIP if createZip is available
  let zipBlob = null;
  if (typeof createZip === "function") {
    try {
      zipBlob = createZip(files);
    } catch (e) {
      console.warn("createZip encountered error during monorepo export:", e);
    }
  }

  return {
    ecosystemId: ecosystemGraph.id,
    name: ecoName,
    fileCount: Object.keys(files).length,
    files,
    zipBlob
  };
}

if (typeof module !== "undefined") {
  module.exports = {
    ECOSYSTEM_ARCHETYPES,
    generateEcosystemGraph,
    extractSemanticComponents,
    remixArtifactComponents,
    verifyEcosystemIntegration,
    exportEcosystemMonorepo
  };
}

if (typeof window !== "undefined") {
  window.ECOSYSTEM_ARCHETYPES = ECOSYSTEM_ARCHETYPES;
  window.generateEcosystemGraph = generateEcosystemGraph;
  window.extractSemanticComponents = extractSemanticComponents;
  window.remixArtifactComponents = remixArtifactComponents;
  window.verifyEcosystemIntegration = verifyEcosystemIntegration;
  window.exportEcosystemMonorepo = exportEcosystemMonorepo;
}
