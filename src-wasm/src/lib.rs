use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use std::collections::HashMap;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Node {
    pub id: String,
    pub x: f32,
    pub y: f32,
    pub vx: f32,
    pub vy: f32,
    pub radius: f32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Link {
    pub source: String,
    pub target: String,
    pub distance: f32,
    pub strength: f32,
}

#[wasm_bindgen]
pub struct Simulation {
    nodes: Vec<Node>,
    links: Vec<Link>,
    node_map: HashMap<String, usize>,
    alpha: f32,
    alpha_decay: f32,
    velocity_decay: f32,
    repulsion_strength: f32,
}

#[wasm_bindgen]
impl Simulation {
    #[wasm_bindgen(constructor)]
    pub fn new(repulsion: f32) -> Simulation {
        Simulation {
            nodes: Vec::new(),
            links: Vec::new(),
            node_map: HashMap::new(),
            alpha: 1.0,
            alpha_decay: 0.02, // Adjust for how fast it stabilizes
            velocity_decay: 0.6,
            repulsion_strength: repulsion,
        }
    }

    pub fn add_node(&mut self, id: String, x: f32, y: f32, radius: f32) {
        let index = self.nodes.len();
        self.node_map.insert(id.clone(), index);
        self.nodes.push(Node {
            id,
            x,
            y,
            vx: 0.0,
            vy: 0.0,
            radius,
        });
    }

    pub fn add_link(&mut self, source: String, target: String, distance: f32, strength: f32) {
        if self.node_map.contains_key(&source) && self.node_map.contains_key(&target) {
            self.links.push(Link { source, target, distance, strength });
        }
    }

    pub fn tick(&mut self) {
        if self.alpha < 0.001 {
            return;
        }

        // 1. Repulsion (Many-Body) - O(N^2) for simplicity, could be Barnes-Hut O(N log N)
        let nodes_len = self.nodes.len();
        for i in 0..nodes_len {
            for j in 0..nodes_len {
                if i == j { continue; }
                
                let dx = self.nodes[i].x - self.nodes[j].x;
                let dy = self.nodes[i].y - self.nodes[j].y;
                let mut d2 = dx * dx + dy * dy;
                if d2 < 0.01 { d2 = 0.01; }
                
                let force = self.repulsion_strength * self.alpha / d2;
                let fx = dx * force;
                let fy = dy * force;
                
                self.nodes[i].vx += fx;
                self.nodes[i].vy += fy;
            }
        }

        // 2. Links (Spring Force)
        for link in &self.links {
            let source_idx = *self.node_map.get(&link.source).unwrap();
            let target_idx = *self.node_map.get(&link.target).unwrap();
            
            let dx = self.nodes[target_idx].x - self.nodes[source_idx].x;
            let dy = self.nodes[target_idx].y - self.nodes[source_idx].y;
            let d = (dx * dx + dy * dy).sqrt().max(0.1);
            
            let force = (d - link.distance) / d * link.strength * self.alpha;
            let fx = dx * force;
            let fy = dy * force;
            
            self.nodes[source_idx].vx += fx;
            self.nodes[source_idx].vy += fy;
            self.nodes[target_idx].vx -= fx;
            self.nodes[target_idx].vy -= fy;
        }

        // 3. Center gravity (optional, prevents drifting)
        for node in &mut self.nodes {
            node.vx -= node.x * 0.01 * self.alpha;
            node.vy -= node.y * 0.01 * self.alpha;
        }

        // 4. Update positions
        for node in &mut self.nodes {
            node.vx *= self.velocity_decay;
            node.vy *= self.velocity_decay;
            node.x += node.vx;
            node.y += node.vy;
        }

        self.alpha *= 1.0 - self.alpha_decay;
    }

    pub fn get_nodes(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.nodes).unwrap()
    }

    pub fn reset_alpha(&mut self) {
        self.alpha = 1.0;
    }

    pub fn update_node_position(&mut self, id: String, x: f32, y: f32) {
        if let Some(&idx) = self.node_map.get(&id) {
            self.nodes[idx].x = x;
            self.nodes[idx].y = y;
            self.nodes[idx].vx = 0.0;
            self.nodes[idx].vy = 0.0;
        }
    }
}
