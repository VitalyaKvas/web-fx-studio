# WebFX Studio — Agent Directives

Staff frontend engineer building **WebFX Studio**: a client-only, in-browser IDE for web graphics (GLSL / WGSL shaders, CSS Houdini, WebGL / WebGPU, SVG filters, Three.js / PixiJS). Vue 3 + TypeScript + Vite. **Zero backend.** Everything compiles, persists, and renders in the user's browser.

Canonical product specs live in `docs/full-specification.md` and `docs/ui-specification.md` at the workspace root (one level up from this app). When spec and code disagree, **stop and ask** — do not guess.

Decision order when rules collide: **correctness → security → data integrity → simplicity → maintainability → performance → convenience**.

## Tier legend
- **[CRITICAL]** — non-negotiable. Bypass risks data loss, security incident, or broken core flow. Requires explicit user approval to deviate.
- **[STRONG]** — default. Deviation needs a written reason in review.
- **[GUIDELINE]** — preference.

## Stack [CRITICAL]
- **Core:** Vue 3 (Composition API, `<script setup lang="ts">`), TypeScript strict, Vite.
- **State:** Pinia. One store per concern (`editorStore`, `presetsStore`, …). No global singletons outside Pinia.
- **Code editor:** Monaco Editor — integrated directly or via `@guolao/vue-monaco-editor`.
- **Local persistence:** Dexie.js over IndexedDB. **Only** for user-created presets — never for built-in templates.
- **Export:** JSZip + FileSaver.js. All bundling happens in-browser.
- **Styling:** SCSS (Sass) with CSS Modules or Vue `<style lang="scss" scoped>`. Dark Mode is the default and only theme until a light theme is explicitly scoped.
- **Routing:** vue-router only if multiple top-level routes appear. The IDE is single-page by default; do not introduce routes for modals or panels.

There is **no backend, no shared package, no Prisma, no Nest, no server actions.** Do not invent them. Do not propose a server "for convenience."

## No backend — client-only invariants [CRITICAL]
- All state lives in memory (Pinia) or IndexedDB (Dexie).
- Built-in presets are read from `public/presets/` via `fetch()` at runtime. They are **read-only** — never write back to them, never persist edits to them, never offer a "Save to template" affordance.
- User-created presets persist to IndexedDB via Dexie. They survive reloads. Deleting one is a destructive op that requires a confirm step.
- No network calls except: (a) fetching files under `public/presets/`, (b) loading Monaco's workers, (c) anything explicitly added by the user to their own preset code (which runs inside the iframe, not the host).
- No telemetry, analytics, or remote logging without explicit approval.

## Directory layout [STRONG]
Follow `docs/full-specification.md` §4:

```
src/
├── assets/          # icons, global styles
├── components/
│   ├── editor/      # MonacoEditor.vue, FileTabs.vue
│   ├── preview/     # IframeRenderer.vue, ErrorOverlay.vue
│   ├── sidebar/     # PresetList.vue, FileTree.vue
│   └── shared/      # buttons, modals (CreatePresetModal.vue)
├── stores/          # Pinia stores (editorStore.ts, presetsStore.ts)
├── utils/           # bundler.ts, zipExport.ts, db.ts
├── types/           # index.ts — FileItem, Preset, LogMessage, PresetType, FileLanguage
├── router/          # only if multi-route ever needed
├── App.vue
└── main.ts

public/
└── presets/
    ├── <slug>/      # one folder per built-in preset
    └── presets-manifest.json
```

The data model in `src/types/index.ts` must match `docs/full-specification.md` §3 verbatim (`FileItem`, `Preset`, `LogMessage`, `FileLanguage`, `PresetType`). Renaming or extending these is a contract change — propose first.

## Vue conventions [CRITICAL]
- `<script setup lang="ts">` only. **No Options API.** No `defineComponent({ ... })` wrappers.
- `ref` for primitives, `reactive` for objects, `computed` for derivations. Don't use `watch` for derived values — that's what `computed` is for. `watch` / `watchEffect` is for synchronizing with external systems (Monaco, iframe, IndexedDB).
- Props and emits are **typed** via `defineProps<...>()` and `defineEmits<...>()` generics. No runtime `props: { ... }` objects unless validation needs them.
- Cross-component shared state goes through **Pinia**. Never reach into another component's refs via template refs except for imperative DOM/Monaco handles.
- No mega-components. Split when a `<template>` exceeds ~150 lines or a `<script setup>` exceeds ~200. Split by responsibility, not by line count alone.

## TypeScript [CRITICAL]
- `strict: true`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`. Don't loosen these.
- **No `any`.** Use `unknown` and narrow. No `@ts-ignore`; use `@ts-expect-error` with a one-line reason and remove it when the cause is fixed.
- Prefer `satisfies` and inference over `as X` and non-null `!`. The only acceptable `as` cases are DOM cast (`as HTMLCanvasElement`) and Monaco's typed API gaps.
- Barrels (`index.ts` re-exports) only at `types/`, `stores/`, and feature roots — never deep chains.

## Monaco Editor [CRITICAL]
- **One editor instance per editor mount.** Switch files via `editor.setModel(model)` against per-file `monaco.editor.createModel(...)`. Never destroy and recreate the editor to switch tabs — that throws away undo/redo history.
- Models are owned by the editor store and disposed when the preset closes. Leaking models between presets is a memory leak and a correctness bug (undo crosses presets).
- Language is set per model from `FileItem.language`. Map `glsl` and `wgsl` to Monaco's `'plaintext'` if no language plugin is wired, but never silently fall back without a comment recording why.
- Monaco workers are loaded via Vite's worker imports — do not load them from a CDN.

## Iframe preview — the sandbox [CRITICAL]
The `<iframe>` runs untrusted-by-design user code and built-in template code. Treat it as hostile.

- Attributes **must** include: `sandbox="allow-scripts allow-same-origin"` and `allow="webgpu"`. Add other `allow-*` tokens only when a concrete feature requires them and the user approves.
- The iframe is fed via `srcdoc` built by `utils/bundler.ts` from the in-memory `Preset.files`. No blob URLs leaked to disk, no `document.write` from the host.
- **Virtual filesystem injection** (per spec §5.2): inject a script that captures `window.fetch` and serves any URL matching an in-memory file from `window.__VIRTUAL_FILES__`. Pass through to the original `fetch` otherwise. Same pattern can extend to `import` via import maps when needed.
- **Console bridge** (per spec §5.3): inject a script that wraps `console.{log,warn,error}` and posts `{ type: 'CONSOLE_LOG' | 'CONSOLE_WARN' | 'CONSOLE_ERROR', payload }` via `window.parent.postMessage`. The host (`IframeRenderer.vue`) listens via `window.addEventListener('message', ...)` and pushes `LogMessage` entries into the editor store.
- **Origin check on `message` events.** Since the iframe runs same-origin (`allow-same-origin`), `event.source === iframeRef.contentWindow` is the right gate — do not blindly trust any postMessage.
- **No auto-rerender.** Per UX spec §3 Сценарій А, the user explicitly clicks "Оновити рендеринг" to rebuild the iframe. Hot-reloading the preview on every keystroke is a defect — it breaks the mental model and burns GPU.
- On rebuild, clear stale error overlays and old logs of type `'error'` from the previous run.

## IndexedDB / Dexie [CRITICAL]
- Schema lives in `src/utils/db.ts`. Migrations use Dexie's `version(n).stores(...).upgrade(...)` chain — never delete a `version()` call once shipped, even if superseded.
- All Dexie reads/writes are wrapped in `try/catch`; failures surface as a `LogMessage` of type `'error'` or a UI toast, never a silent drop.
- `Preset.id` is a stable id (`crypto.randomUUID()` or a slug). Never use array index or display name as a primary key.
- `isCustom: false` presets must never be written to IndexedDB. Built-ins live in `public/presets/` and are loaded fresh every session.
- Deleting a custom preset: confirm dialog → Dexie delete → store update. No silent deletes.

## UI / UX [STRONG]
Layout, panels, and states are spec-driven (`docs/ui-specification.md`). Highlights that are easy to get wrong:

- **Dark Mode default.** Don't ship a light theme without explicit scope.
- **`isDirty` indicator.** A modified file shows `*` next to its name in the file tree **and** its tab. `isDirty` resets when the user clicks "Оновити рендеринг" (which is also the implicit "apply" action) — or on explicit revert.
- **Error overlay.** When the iframe run fails or emits a compile error, a semi-transparent red banner covers the top of the preview pane with copy directing to the console. The overlay clears on the next successful run.
- **Console panel.** Logs are color-coded by `LogMessage.type`. Errors are red with an icon. Timestamps are `HH:MM:SS` local. The console is scrollable and has a clear button.
- **Built-in vs custom presets.** Built-ins are read-only — no delete icon, no rename. Custom presets show a trash icon on hover and are renamable.
- **"Create your own" modal.** Tech selector (WebGL / WebGPU / Houdini / SVG / Three.js) + name field. On submit, scaffolds a minimal working template for the chosen tech and persists it to Dexie immediately.

## SCSS [STRONG]
- Component styles live in Vue `<style lang="scss" scoped>` blocks **or** sibling `*.module.scss` files imported into the component. Pick one approach per component — don't mix scoped + modules in the same file.
- **Design tokens** (colors, spacing, radii, font sizes, z-index scale, breakpoints) live in `src/assets/styles/_tokens.scss` and are exposed as **CSS custom properties** on `:root` (and a `[data-theme="dark"]` block when a second theme arrives). Components read tokens via `var(--color-bg-panel)`, not by importing the SCSS variable — this keeps runtime theming possible without rebuilding.
- SCSS-only constructs (mixins, functions, `@use`) live in partials under `src/assets/styles/` (`_mixins.scss`, `_breakpoints.scss`, …) and are imported via `@use` — **never `@import`** (deprecated in Dart Sass).
- Configure Vite's `css.preprocessorOptions.scss.additionalData` to auto-inject the tokens/mixins partials so components don't repeat `@use` boilerplate. Keep that auto-injection list short — only side-effect-free partials.
- **No utility-class soup.** Don't reinvent Tailwind in SCSS. Style by semantic class names (`.preset-list__item--active`) — BEM or a single-class equivalent — not by stacking `.flex .gap-2 .text-sm` clones.
- **Global styles** are minimal: a reset/normalize, root tokens, base typography. Everything else is scoped to its component.
- Shared primitives (`Button`, `Modal`, `IconButton`) are allowed **only** when they encapsulate accessibility, keyboard handling, focus management, or ARIA wiring. They are not class-bundling components.

## Accessibility — WCAG 2.1 AA [STRONG]
- Every interactive element is keyboard-operable with a visible `:focus-visible` indicator.
- Modals trap focus and restore it to the trigger on close. Escape closes them.
- Color is never the only carrier of meaning — error logs pair red with an icon; the dirty marker pairs typography with the `*` glyph.
- Inputs paired with `<label>`. Form errors wired via `aria-describedby` + `aria-invalid`.
- The Monaco editor itself ships its own accessibility model — don't fight it.

## Anti-abstraction [CRITICAL]
Forbidden without explicit approval: generic `BaseComponent` / `BaseStore`, repository abstractions over Dexie, command/query buses, plugin systems, decorator factories, mega-composables that wrap five unrelated concerns. Duplicate twice before abstracting; three call sites is the minimum signal.

A composable is justified when it encapsulates: (a) shared reactive state with lifecycle, (b) cross-cutting browser API usage (resize observer, keyboard shortcuts), or (c) the same `watch` + `onMounted` pattern repeated in three places. Otherwise inline it.

## Dependency policy [CRITICAL]
For every new package, state in one paragraph: (1) problem it solves, (2) why in-house is impractical, (3) trade-off (bundle size, maintenance signal, license). **Wait for explicit user approval before editing `package.json`.** Same gate applies to Vite plugins, Tailwind plugins, and ESLint plugins.

Tier-1 packages already approved by the spec: `pinia`, `vue-router`, Monaco (via `@guolao/vue-monaco-editor` or direct), `dexie`, `jszip`, `file-saver`, `sass` (Dart Sass, as a devDependency for Vite's built-in SCSS handling). Anything else is a proposal.

Before adding anything > ~30 KB gz, run a bundle inspection (`vite build` + `rollup-plugin-visualizer` or `vite-bundle-visualizer`) and report numbers.

## Performance [GUIDELINE]
- Monaco is heavy. Lazy-load it (`defineAsyncComponent` + dynamic import) so initial paint isn't gated on the editor bundle.
- The iframe is recreated on every "Оновити рендеринг". Don't try to be clever and patch it — full teardown is correct and avoids stale GPU state.
- Avoid reactive deep-watching of large objects (file content strings). Watch by file `name` key or use shallow refs for the active file content when the editor pushes updates.

## Env & secrets [CRITICAL]
- Vite env vars: only `VITE_*`-prefixed values reach the client bundle. The app has no server, so any env var is a public broadcast.
- No API keys, no signing secrets — there's nothing to sign or authenticate against.
- `.env*` is gitignored except `.env.example` if/when one is introduced. Document every var there with a safe placeholder.

## Testing [STRONG]
- Vitest + `@vue/test-utils`. Query by accessible role and name. Test behavior, not internals.
- **No component snapshot tests.**
- Critical units to cover: `utils/bundler.ts` (srcdoc shape, virtual fetch behavior, console bridge injection), `utils/zipExport.ts` (archive shape), `stores/editorStore` (dirty tracking, model lifecycle), `utils/db.ts` (Dexie schema migrations).
- Iframe and Monaco are integration-tested or mocked at their seams — don't mount a real Monaco in unit tests.

## Commits [CRITICAL]
Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `perf:`, `build:`, `style:`. Scope optional. **Never `--no-verify`** — if a hook fails, fix the cause. Atomic commits — one logical change each.

## Comments [STRONG]
Write only when the *why* is non-obvious: a hidden constraint, a subtle invariant, a workaround for a specific bug. No decorative dividers, no restating code, no "added for X flow" rot. Identifiers should carry the *what*.

## When in doubt
- Spec ambiguous → ask.
- Spec and code disagree → ask.
- A "small" change touches the iframe sandbox, the Monaco model lifecycle, or the Dexie schema → it's not small. Slow down.
