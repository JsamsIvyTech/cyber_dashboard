# 🛰️ Sentinel-X: High-Performance Cyber Dashboard

Enterprise-grade network visualization dashboard built with **React**, **TypeScript**, and a **Rust-powered WebAssembly** physics engine.

## 🏗️ Architecture

-   **Frontend**: React 19 + Vite (for lightning-fast HMR and Wasm support).
-   **Styling**: Tailwind CSS with a custom "Elite-Dark" design system.
-   **Visualization**: D3.js (rendering) + Rust/Wasm (calculation).
-   **Performance**: Offloads O(N²) Many-body repulsion and link-force calculations to highly optimized machine code (Wasm).

## 🚀 Getting Started

### 1. Prerequisites
-   [Rust](https://rustup.rs/) (to compile the physics engine).
-   [wasm-pack](https://rustwasm.github.io/wasm-pack/) (`cargo install wasm-pack`).

### 2. Build the WASM Module
```bash
npm run build:wasm
```
This generates the optimized `src-wasm/pkg` folder. The app is pre-configured to look for this in `src/wasm-engine`.

### 3. Run the Dashboard
```bash
npm install
npm run dev
```

## 🛠️ Design Tokens
The design follows a **Modular Balanced Grid** system:
-   **Spacing**: 12-column symmetrical layout with `px-12` focus padding.
-   **Colors**: Electric Blue (#00d1ff), Crimson Danger (#ff2d55), emerald Success (#00ffa3).
-   **Typography**: *Outfit* for UI clarity and *JetBrains Mono* for data integrity.

## ✨ Features
-   **Dynamic Mesh**: High-density endpoint visualization.
-   **Tactical HUD**: Centered branding and balanced module placement.
-   **Wasm Bridge**: Seamless hand-off between JavaScript and Rust memory buffers.
-   **Fallback Mode**: Automatically detects if Wasm is missing and switches to D3's native JS engine.
