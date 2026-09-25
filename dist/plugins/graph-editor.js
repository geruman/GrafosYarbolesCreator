const SVG_NS = "http://www.w3.org/2000/svg";
const WIDTH = 900;
const HEIGHT = 560;

const graphTypes = {
  undirected: { label: "No dirigido", directed: false, loops: false, parallel: false },
  directed: { label: "Dirigido", directed: true, loops: false, parallel: false },
  simple: { label: "Sencillo", directed: false, loops: false, parallel: false },
  multigraph: { label: "Multigrafo", directed: false, loops: false, parallel: true },
  pseudograph: { label: "Pseudografo", directed: false, loops: true, parallel: true },
};

const toolCopy = {
  move: ["Mover vértices", "Arrastrá cualquier vértice para cambiar su posición."],
  node: ["Crear vértice", "Hacé clic en un espacio libre del tablero."],
  edge: ["Conectar vértices", "Elegí el vértice inicial y después el final."],
  delete: ["Borrar elementos", "Hacé clic sobre un vértice o una conexión."],
};

function svgElement(name, attrs = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

export class GraphEditor {
  constructor(screen, options = {}) {
    this.screen = screen;
    this.container = screen.querySelector(options.editorSelector || "#graph-editor");
    this.type = options.type || "undirected";
    this.onChange = options.onChange || null;
    this.countSelector = options.countSelector || "[data-lab-count]";
    this.tool = "move";
    this.nodes = [];
    this.edges = [];
    this.history = [];
    this.selectedNode = null;
    this.dragging = null;
    this.nextNode = 0;
    this.buildTypeButtons();
    this.bindControls();
    window.addEventListener("pointermove", (event) => this.moveDrag(event));
    window.addEventListener("pointerup", () => this.endDrag());
    this.render();
  }

  buildTypeButtons() {
    const list = this.screen.querySelector("[data-graph-types]");
    Object.entries(graphTypes).forEach(([id, config]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = config.label;
      button.dataset.graphType = id;
      button.addEventListener("click", () => this.setType(id));
      list.appendChild(button);
    });
  }

  bindControls() {
    this.screen.querySelectorAll("[data-tool]").forEach((button) => {
      button.addEventListener("click", () => this.setTool(button.dataset.tool));
    });
    this.screen.querySelector("[data-lab-undo]").addEventListener("click", () => this.undo());
    this.screen.querySelector("[data-lab-clear]").addEventListener("click", () => this.clear());
  }

  resize() { this.render(); }

  setType(type) {
    this.type = type;
    this.selectedNode = null;
    this.feedback(`Modo ${graphTypes[type].label} seleccionado.`);
    this.render();
  }

  setTool(tool) {
    this.tool = tool;
    this.selectedNode = null;
    const [name, instruction] = toolCopy[tool];
    this.screen.querySelector("[data-lab-tool-name]").textContent = name;
    this.screen.querySelector("[data-lab-instruction]").textContent = instruction;
    this.feedback(instruction);
    this.render();
  }

  snapshot() {
    this.history.push(JSON.stringify({ nodes: this.nodes, edges: this.edges, nextNode: this.nextNode }));
    if (this.history.length > 40) this.history.shift();
  }

  undo() {
    const state = this.history.pop();
    if (!state) return this.feedback("No hay cambios para deshacer.");
    Object.assign(this, JSON.parse(state));
    this.selectedNode = null;
    this.feedback("Se deshizo el último cambio.");
    this.render();
  }

  clear() {
    if (!this.nodes.length) return;
    this.snapshot();
    this.nodes = [];
    this.edges = [];
    this.nextNode = 0;
    this.selectedNode = null;
    this.feedback("Tablero limpio.");
    this.render();
  }

  point(event) {
    const rect = this.svg.getBoundingClientRect();
    return {
      x: Math.max(45, Math.min(WIDTH - 45, ((event.clientX - rect.left) / rect.width) * WIDTH)),
      y: Math.max(45, Math.min(HEIGHT - 45, ((event.clientY - rect.top) / rect.height) * HEIGHT)),
    };
  }

  addNode(event) {
    if (event.target !== this.svg) return;
    this.snapshot();
    const point = this.point(event);
    const id = `n${this.nextNode}`;
    const label = this.nodeLabel(this.nextNode);
    this.nextNode += 1;
    this.nodes.push({ id, label, ...point });
    this.feedback(`Vértice ${label} creado.`);
    this.render();
  }

  nodeLabel(index) {
    const letter = String.fromCharCode(65 + (index % 26));
    return index < 26 ? letter : `${letter}${Math.floor(index / 26)}`;
  }

  connect(nodeId) {
    if (this.selectedNode === null) {
      this.selectedNode = nodeId;
      this.feedback("Ahora elegí el vértice de destino.");
      this.render();
      return;
    }

    const from = this.selectedNode;
    const to = nodeId;
    const rules = graphTypes[this.type];
    if (from === to && !rules.loops) {
      this.selectedNode = null;
      this.feedback("Este tipo de grafo no permite lazos.", true);
      return this.render();
    }

    const repeated = this.edges.some((edge) => rules.directed
      ? edge.from === from && edge.to === to
      : (edge.from === from && edge.to === to) || (edge.from === to && edge.to === from));
    if (repeated && !rules.parallel) {
      this.selectedNode = null;
      this.feedback("Este tipo de grafo no permite conexiones repetidas.", true);
      return this.render();
    }

    this.snapshot();
    this.edges.push({ id: crypto.randomUUID(), from, to });
    this.selectedNode = null;
    this.feedback(rules.directed ? "Arco creado." : "Arista creada.");
    this.render();
  }

  deleteNode(nodeId) {
    this.snapshot();
    this.nodes = this.nodes.filter((node) => node.id !== nodeId);
    this.edges = this.edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId);
    this.feedback("Vértice y sus conexiones eliminados.");
    this.render();
  }

  deleteEdge(edgeId) {
    this.snapshot();
    this.edges = this.edges.filter((edge) => edge.id !== edgeId);
    this.feedback("Conexión eliminada.");
    this.render();
  }

  beginDrag(event, nodeId) {
    if (this.tool !== "move") return;
    this.snapshot();
    this.dragging = nodeId;
    event.preventDefault();
  }

  moveDrag(event) {
    if (!this.dragging) return;
    const node = this.nodes.find((item) => item.id === this.dragging);
    Object.assign(node, this.point(event));
    this.draw();
  }

  endDrag() {
    if (!this.dragging) return;
    this.dragging = null;
    this.feedback("Vértice movido.");
  }

  feedback(message, error = false) {
    const element = this.screen.querySelector("[data-lab-feedback]");
    element.textContent = message;
    element.classList.toggle("is-error", error);
  }

  edgePath(edge, parallelIndex, parallelCount) {
    const from = this.nodes.find((node) => node.id === edge.from);
    const to = this.nodes.find((node) => node.id === edge.to);
    if (from.id === to.id) {
      return `M ${from.x - 22} ${from.y - 28} C ${from.x - 78} ${from.y - 112}, ${from.x + 78} ${from.y - 112}, ${from.x + 22} ${from.y - 28}`;
    }
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    const endGap = graphTypes[this.type].directed ? 48 : 38;
    const sx = from.x + dx / length * 38;
    const sy = from.y + dy / length * 38;
    const ex = to.x - dx / length * endGap;
    const ey = to.y - dy / length * endGap;
    if (parallelCount === 1) return `M ${sx} ${sy} L ${ex} ${ey}`;
    const offset = (parallelIndex - (parallelCount - 1) / 2) * 54;
    const mx = (sx + ex) / 2 - dy / length * offset;
    const my = (sy + ey) / 2 + dx / length * offset;
    return `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`;
  }

  render() {
    this.screen.querySelectorAll("[data-graph-type]").forEach((button) => button.classList.toggle("is-active", button.dataset.graphType === this.type));
    this.screen.querySelectorAll("[data-tool]").forEach((button) => button.classList.toggle("is-active", button.dataset.tool === this.tool));
    const count = this.screen.querySelector(this.countSelector);
    if (count) count.textContent = `${this.nodes.length} ${this.nodes.length === 1 ? "vértice" : "vértices"} · ${this.edges.length} ${this.edges.length === 1 ? "conexión" : "conexiones"}`;
    this.draw();
    if (this.onChange) this.onChange(this);
  }

  draw() {
    this.container.replaceChildren();
    this.svg = svgElement("svg", { viewBox: `0 0 ${WIDTH} ${HEIGHT}`, role: "img" });
    this.svg.addEventListener("click", (event) => this.tool === "node" && this.addNode(event));
    const defs = svgElement("defs");
    const marker = svgElement("marker", { id: "editor-arrow", viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "8", markerHeight: "8", orient: "auto" });
    marker.appendChild(svgElement("path", { d: "M 0 0 L 10 5 L 0 10 z", class: "editor-arrow" }));
    defs.appendChild(marker);
    this.svg.appendChild(defs);

    this.edges.forEach((edge, index) => {
      const peers = this.edges.filter((candidate) => {
        if (edge.from === edge.to) return candidate.from === edge.from && candidate.to === edge.to;
        return (candidate.from === edge.from && candidate.to === edge.to) || (candidate.from === edge.to && candidate.to === edge.from);
      });
      const peerIndex = peers.findIndex((candidate) => candidate.id === edge.id);
      const path = svgElement("path", { d: this.edgePath(edge, peerIndex, peers.length), class: "editor-edge", "data-edge": index });
      if (graphTypes[this.type].directed) path.setAttribute("marker-end", "url(#editor-arrow)");
      path.addEventListener("click", (event) => {
        event.stopPropagation();
        if (this.tool === "delete") this.deleteEdge(edge.id);
      });
      this.svg.appendChild(path);
    });

    this.nodes.forEach((node) => {
      const group = svgElement("g", { transform: `translate(${node.x} ${node.y})`, class: `editor-node${this.selectedNode === node.id ? " is-selected" : ""}` });
      group.appendChild(svgElement("circle", { r: "34" }));
      const label = svgElement("text", { "text-anchor": "middle", dy: "0.35em" });
      label.textContent = node.label;
      group.appendChild(label);
      group.addEventListener("click", (event) => {
        event.stopPropagation();
        if (this.tool === "edge") this.connect(node.id);
        if (this.tool === "delete") this.deleteNode(node.id);
      });
      group.addEventListener("pointerdown", (event) => this.beginDrag(event, node.id));
      this.svg.appendChild(group);
    });

    this.container.appendChild(this.svg);
  }
}
