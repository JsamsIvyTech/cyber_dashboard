export interface WasmNode {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
}

export interface WasmLink {
    source: string;
    target: string;
    distance: number;
    strength: number;
}

/**
 * SimulationBridge handles the interaction between React/D3 and the Rust WASM engine.
 * It provides a clean API for adding/removing data and running the tick.
 */
export class SimulationBridge {
    private wasm: any;
    private simulation: any;
    private isInitialized: boolean = false;

    constructor(wasmModule: any) {
        this.wasm = wasmModule;
    }

    async init(repulsion: number = 800.0) {
        if (this.wasm) {
            this.simulation = new this.wasm.Simulation(repulsion);
            this.isInitialized = true;
        }
    }

    addNode(node: { id: string, radius?: number }) {
        if (!this.isInitialized) return;
        this.simulation.add_node(
            node.id,
            Math.random() * 800,
            Math.random() * 600,
            node.radius || 10
        );
    }

    addLink(link: { source: string, target: string, distance?: number, strength?: number }) {
        if (!this.isInitialized) return;
        this.simulation.add_link(
            link.source,
            link.target,
            link.distance || 100,
            link.strength || 0.5
        );
    }

    tick(): WasmNode[] {
        if (!this.isInitialized) return [];
        this.simulation.tick();
        return this.simulation.get_nodes() as WasmNode[];
    }

    updatePosition(id: string, x: number, y: number) {
        if (!this.isInitialized) return;
        this.simulation.update_node_position(id, x, y);
    }

    reset() {
        if (!this.isInitialized) return;
        this.simulation.reset_alpha();
    }
}
