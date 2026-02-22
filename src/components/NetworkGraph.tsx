import React, { useEffect, useRef, memo } from 'react';
import * as d3 from 'd3';

export interface Node extends d3.SimulationNodeDatum {
    id: string;
    type: 'server' | 'firewall' | 'database' | 'endpoint';
    status: 'online' | 'warning' | 'critical';
    label: string;
    value: number;
    traffic: number;
    sector: string;
}

interface Link extends d3.SimulationLinkDatum<Node> {
    source: any;
    target: any;
}

interface NetworkGraphProps {
    nodes: Node[];
    links: Link[];
    isLockdown: boolean;
    onNodeSelect: (node: Node | null) => void;
}

// ─── Wrapped in memo so it only re-renders when its own props change,
//     not whenever parent App re-renders from metrics/ip interval ticks ───
const NetworkGraph: React.FC<NetworkGraphProps> = memo(({ nodes, links, isLockdown, onNodeSelect }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const simRef = useRef<d3.Simulation<Node, Link> | null>(null);
    const lockdownRef = useRef(isLockdown); // track lockdown without triggering graph rebuild

    // ─── Effect 1: Update link/node colors when lockdown toggles.
    //     This does NOT rebuild the graph — it just recolors existing elements. ───
    useEffect(() => {
        lockdownRef.current = isLockdown;
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        const color = isLockdown ? 'rgba(255,45,85,0.1)' : 'rgba(0,209,255,0.08)';
        svg.selectAll<SVGLineElement, Link>('line').attr('stroke', color);
        if (simRef.current) {
            isLockdown ? simRef.current.stop() : simRef.current.alpha(0.1).restart();
        }
    }, [isLockdown]);

    // ─── Effect 2: Rebuild the graph only when nodes/links arrays change. ───
    useEffect(() => {
        if (!svgRef.current || !containerRef.current) return;
        const width = containerRef.current.clientWidth || 600;
        const height = containerRef.current.clientHeight || 400;

        // Stop previous simulation
        if (simRef.current) simRef.current.stop();

        const svg = d3.select(svgRef.current).attr('viewBox', [0, 0, width, height]);
        svg.selectAll('*').remove();

        const defs = svg.append('defs');
        const filter = defs.append('filter').attr('id', 'node-glow')
            .attr('x', '-100%').attr('y', '-100%').attr('width', '300%').attr('height', '300%');
        filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
        filter.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

        const g = svg.append('g');

        svg.call(d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.3, 5])
            .on('zoom', (event) => g.attr('transform', event.transform)));

        // CRITICAL: Deep-copy links before D3 mutates source/target to node objects.
        const linksCopy: Link[] = links.map(l => ({
            source: typeof l.source === 'object' && l.source !== null ? l.source.id : l.source,
            target: typeof l.target === 'object' && l.target !== null ? l.target.id : l.target,
        } as Link));

        // Deep-copy nodes so D3's x/y mutations don't touch our React state.
        const nodesCopy: Node[] = nodes.map(n => ({ ...n }));

        const linkColor = lockdownRef.current ? 'rgba(255,45,85,0.1)' : 'rgba(0,209,255,0.08)';

        const simulation = d3.forceSimulation<Node>(nodesCopy)
            .force('link', d3.forceLink<Node, Link>(linksCopy).id(d => d.id).distance(90).strength(0.8))
            .force('charge', d3.forceManyBody<Node>().strength(-280))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide<Node>().radius(d => d.value + 12))
            // Higher alphaDecay = settles faster (default 0.0228, we use 0.04)
            .alphaDecay(0.04);

        simRef.current = simulation;

        const link = g.append('g').attr('stroke-width', 1)
            .selectAll('line').data(linksCopy).join('line')
            .attr('stroke', linkColor);

        const node = g.append('g')
            .selectAll<SVGGElement, Node>('g').data(nodesCopy).join('g')
            .attr('cursor', 'pointer')
            .on('click', (event, d) => {
                event.stopPropagation();
                // Find the matching original node from props to return to parent
                onNodeSelect(nodes.find(n => n.id === d.id) ?? null);
                highlightNode(d.id);
            })
            .call(d3.drag<SVGGElement, Node>()
                .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
                .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
                .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }) as any);

        svg.on('click', () => {
            onNodeSelect(null);
            resetHighlights();
        });

        node.each(function (d) {
            const el = d3.select(this);
            const color = d.status === 'critical' ? '#ff2d55' : d.status === 'warning' ? '#ffb800' : '#00d1ff';
            el.append('circle').attr('r', d.value + 4).attr('fill', 'none').attr('stroke', color).attr('stroke-width', 1).attr('stroke-opacity', 0.1).attr('class', 'outer-ring');
            el.append('circle').attr('r', d.value).attr('fill', color).attr('fill-opacity', 0.05).attr('stroke', color).attr('stroke-width', 1).attr('class', 'main-node');
            el.append('circle').attr('r', 2).attr('fill', color).attr('filter', 'url(#node-glow)').attr('class', 'glow-dot');
            if (d.type !== 'endpoint') {
                el.append('text').text(d.label).attr('y', d.value + 15).attr('text-anchor', 'middle')
                    .attr('fill', 'white').style('font-size', '8px').style('font-family', 'monospace')
                    .style('opacity', 0.3).style('pointer-events', 'none');
            }
        });

        const highlightNode = (id: string) => {
            node.selectAll('.main-node').transition().duration(150).attr('fill-opacity', (d: any) => d.id === id ? 0.3 : 0.05);
            node.selectAll('.outer-ring').transition().duration(150).attr('stroke-opacity', (d: any) => d.id === id ? 0.8 : 0.1);
        };
        const resetHighlights = () => {
            node.selectAll('.main-node').transition().duration(150).attr('fill-opacity', 0.05);
            node.selectAll('.outer-ring').transition().duration(150).attr('stroke-opacity', 0.1);
        };

        simulation.on('tick', () => {
            link.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
                .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y);
            node.attr('transform', (d: any) => `translate(${d.x ?? 0},${d.y ?? 0})`);
        });

        if (lockdownRef.current) simulation.stop();

        return () => { simulation.stop(); };
    }, [nodes, links]); // ← isLockdown intentionally NOT here

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
            <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
});

export default NetworkGraph;
