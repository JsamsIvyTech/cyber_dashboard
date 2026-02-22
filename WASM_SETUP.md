# WASM Physics Engine Setup

To enable the high-performance physics engine, follow these steps:

## 1. Prerequisites
- **Rust**: Install from [rustup.rs](https://rustup.rs/)
- **wasm-pack**: Install via `cargo install wasm-pack` or download from [wasm-pack website](https://rustwasm.github.io/wasm-pack/installer/)

## 2. Compile the Rust Code
Navigate to the `src-wasm` directory and build the package:
```bash
cd src-wasm
wasm-pack build --target web
```
This will generate a `pkg` folder inside `src-wasm`.

## 3. Link to React
The `NetworkGraph.tsx` component is prepared to import the generated glue code. Once you build the Rust project, you should move the `pkg` folder to `src/wasm-engine` (or update the import path).

```typescript
// src/components/NetworkGraph.tsx
import init, { Simulation } from '../wasm-engine/physics_engine.js';

// Inside useEffect:
await init();
const sim = new Simulation(500.0);
```

## 4. Why WASM?
For enterprise-grade dashboards handling 10,000+ nodes (e.g., full botnet visualizations), standard JavaScript physics engines (like D3's default) can hit 60fps bottlenecks due to single-threaded garbage collection. Our Rust implementation:
- Uses a tightly packed memory layout.
- Can be extended with SIMD instructions for even faster calculations.
- Offloads O(N²) or O(N log N) calculations to highly optimized machine code.
