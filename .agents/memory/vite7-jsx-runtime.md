---
name: Vite 7 needs @vitejs/plugin-react for JSX
description: "React is not defined" crash when the React plugin is missing
---

# Vite 7 requires @vitejs/plugin-react for the automatic JSX runtime

A Vite 7 project that renders JSX must include `@vitejs/plugin-react` in its
plugins. Without it, Vite's default esbuild JSX transform compiles JSX to classic
`React.createElement(...)` calls that assume a `React` in scope; with the modern
"no React import needed" style this throws `React is not defined` at runtime and
the app renders blank/crashes.

**Why:** the plugin enables the automatic JSX runtime (and Fast Refresh);
esbuild's bare default does not.

**How to apply:** when importing/porting a React app into a Vite 7 workspace and
JSX crashes with "React is not defined," add `@vitejs/plugin-react` to
devDependencies and `plugins: [react()]` in `vite.config.js`.
