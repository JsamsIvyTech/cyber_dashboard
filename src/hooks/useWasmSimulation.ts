import { useState, useEffect, useCallback, useRef } from 'react';
import { SimulationBridge, WasmNode } from './SimulationBridge';

/**
 * Custom hook to manage the Wasm-powered physics simulation.
 * It handles the loading of the module and provides a clean interface for React.
 */
export function useWasmSimulation(repulsion: number = 800) {
    const [bridge, setBridge] = useState<SimulationBridge | null>(null);
    const [isWasmLoaded, setIsWasmLoaded] = useState(false);
    const [nodes, setNodes] = useState<WasmNode[]>([]);
    const requestRef = useRef<number>();

    useEffect(() => {
        const loadWasm = async () => {
            try {
                // This import expects the output of 'wasm-pack build --target web'
                // which generates a JS wrapper and a .wasm file.
                // @ts-ignore
                const wasmModule = await import('../wasm-engine/physics_engine');
                await wasmModule.default(); // Initialize Wasm memory

                const newBridge = new SimulationBridge(wasmModule);
                await newBridge.init(repulsion);

                setBridge(newBridge);
                setIsWasmLoaded(true);
                console.log('Wasm Physics Engine Loaded Successfully');
            } catch (e) {
                console.warn('Wasm module not found or failed to load. Falling back to D3 Physics.', e);
                setIsWasmLoaded(false);
            }
        };

        loadWasm();
    }, [repulsion]);

    const addNode = useCallback((node: any) => {
        bridge?.addNode(node);
    }, [bridge]);

    const addLink = useCallback((link: any) => {
        bridge?.addLink(link);
    }, [bridge]);

    const updatePosition = useCallback((id: string, x: number, y: number) => {
        bridge?.updatePosition(id, x, y);
    }, [bridge]);

    const reset = useCallback(() => {
        bridge?.reset();
    }, [bridge]);

    // The 'tick' function to be called by the animation loop
    const tick = useCallback(() => {
        if (bridge) {
            const updatedNodes = bridge.tick();
            setNodes(updatedNodes);
            return updatedNodes;
        }
        return null;
    }, [bridge]);

    return {
        isWasmLoaded,
        addNode,
        addLink,
        updatePosition,
        reset,
        tick,
        wasmNodes: nodes
    };
}
