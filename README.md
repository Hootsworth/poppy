# Poppy - Universal Creation Engine

Poppy is an in-browser software engine that transforms plain descriptions into fully functional web applications, retro games, standalone desktop utilities, Keynote-grade 16:9 slide decks, and realtime collaborative spaces.

## Project Structure

```
poppy/
├── src/                          # Modular source code
│   ├── css/                      # Structured stylesheets
│   │   ├── base.css              # Theme variables, typography, layout & animations
│   │   ├── components.css        # Buttons, switches, inputs, dialogs & dropdowns
│   │   ├── studio.css            # Inspector, Database Studio & Realtime Presence UI
│   │   └── ecosystem.css         # Pipeline builder & Template Marketplace cards
│   ├── components/               # Modular HTML components
│   │   ├── symbols.html          # SVG definitions & icon sprites
│   │   ├── home.html             # Hero section, prompt form & mode selectors
│   │   ├── stage.html            # Sandboxed iframe canvas, presence & peer cursors
│   │   └── dialogs/              # Modal windows & drawers
│   │       ├── key.html          # AI Provider keys
│   │       ├── compare.html      # Model comparison dialog
│   │       ├── inspector.html    # Click-to-edit element inspector
│   │       ├── blocks.html       # 8 scoped UI blocks library
│   │       ├── db-studio.html    # SQLite & KV Database Studio
│   │       ├── room.html         # Realtime collaboration room drawer
│   │       ├── automations.html  # Multi-step automation pipeline builder
│   │       ├── ecosystem.html    # Skill plugins & Template Marketplace
│   │       └── extras.html       # Shared previews, onboarder & status logs
│   └── js/                       # Modular JavaScript modules
│       ├── core/
│       │   └── core-engine.js    # Storage, state, AI providers & prompt engine
│       ├── engine/
│       │   └── exporters.js      # ZIP exporter, PWA manifest, Cloudflare, Netlify
│       ├── modules/
│       │   ├── inspector.js      # Visual inspector & surgical AI editor
│       │   ├── db-studio.js      # SQLite table studio & RFC 4180 CSV engine
│       │   └── automations.js    # Multi-step pipeline execution & plugin runner
│       ├── templates/
│       │   └── marketplace.js    # 9 starter templates (pitch deck, invoice, arcade, etc.)
│       ├── tests/
│       │   └── selftest.js       # 64 automated selftests & evals suite
│       └── app.js                # Event bindings, modal controllers & routing
├── scripts/                      # Build and verification scripts
│   ├── build.js                  # Zero-dependency compiler: builds src/ into poppy.html
│   └── test.js                   # Automated test runner executing 64 selftests
├── dist/                         # Distribution build
│   └── index.html                # Compiled bundle
├── poppy.html                    # Root self-contained distribution bundle
└── package.json                  # NPM build & test scripts
```

## Developing & Building

### Build the bundle
```bash
npm run build
# or: node scripts/build.js
```

### Run automated tests
```bash
npm test
# or: node scripts/test.js
```

## Security & Constraints
- **Strict Sandbox:** The `#frame` preview runs strictly with `sandbox="allow-scripts allow-forms allow-modals allow-popups"`, and **never** `allow-same-origin`.
- **Zero API Keys in Frame:** API keys stay strictly within the host localStorage and never cross the postMessage bridge into the generated application.
- **Zero Emojis:** The host interface uses crisp SVGs and clean typography.
