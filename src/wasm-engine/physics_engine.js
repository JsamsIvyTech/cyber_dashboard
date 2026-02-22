// Fallback file for Sentinel-X WASM engine
export default async function init() {
    console.log("SENTINEL-X WASM: Placeholder initialized.");
    return null;
}

export class Simulation {
    constructor(repulsion) {
        console.log("SENTINEL-X WASM: Using JS simulation layer (Repulsion: " + repulsion + ")");
    }
    add_node(id, x, y, radius) { }
    add_link(source, target, dist, strength) { }
    tick() { }
    get_nodes() { return []; }
    update_node_position(id, x, y) { }
    reset_alpha() { }
}
