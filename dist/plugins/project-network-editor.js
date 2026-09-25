const SVG_NS = "http://www.w3.org/2000/svg";
const VIEW_WIDTH = 1200;
const VIEW_HEIGHT = 700;
const MAX_NODES = 50;

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

export class ProjectNetworkEditor {
  constructor(screen) {
    this.screen = screen;
    this.container = screen.querySelector("#project-network-editor");
    this.mode = "cpm";
    this.tool = "move";
    this.nodes = [];
    this.edges = [];
    this.history = [];
    this.nextNode = 1;
    this.selectedNode = null;
    this.selection = null;
    this.dragging = null;
    this.panning = null;
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this.pendingEdge = null;
    this.editingEdgeId = null;
    this.editingNodeId = null;
    this.dialog = screen.querySelector("#activity-dialog");
    this.nodeDialog = screen.querySelector("#node-dialog");
    this.bindControls();
    window.addEventListener("pointermove", (event) => this.pointerMove(event));
    window.addEventListener("pointerup", () => this.pointerUp());
    window.addEventListener("keydown", (event) => this.keyDown(event));
    this.render();
  }

  bindControls() {
    this.screen.querySelectorAll("[data-project-mode]").forEach((button) => {
      button.addEventListener("click", () => this.setMode(button.dataset.projectMode));
    });
    this.screen.querySelectorAll("[data-project-tool]").forEach((button) => {
      button.addEventListener("click", () => this.setTool(button.dataset.projectTool));
    });
    this.screen.querySelector("[data-project-undo]").addEventListener("click", () => this.undo());
    this.screen.querySelector("[data-project-clear]").addEventListener("click", () => this.clear());
    this.screen.querySelector("[data-project-fit]").addEventListener("click", () => this.fit());
    this.screen.querySelector("[data-project-export]").addEventListener("click", () => this.exportSvg());
    this.screen.querySelector("[data-project-export-json]").addEventListener("click", () => this.exportJson());
    this.screen.querySelector("[data-project-import]").addEventListener("click", () => this.screen.querySelector("[data-project-file]").click());
    this.screen.querySelector("[data-project-file]").addEventListener("change", (event) => this.importJson(event));
    this.screen.querySelector("[data-project-zoom-in]").addEventListener("click", () => this.zoomBy(1.2));
    this.screen.querySelector("[data-project-zoom-out]").addEventListener("click", () => this.zoomBy(1 / 1.2));
    this.screen.querySelector("[data-activity-cancel]").addEventListener("click", () => this.cancelActivity());
    this.dialog.querySelector("form").addEventListener("submit", (event) => this.saveActivity(event));
    this.dialog.addEventListener("close", () => {
      if (this.dialog.returnValue !== "save") this.pendingEdge = null;
      this.editingEdgeId = null;
    });
    this.nodeDialog.querySelector("form").addEventListener("submit", (event) => this.saveNode(event));
    this.nodeDialog.querySelector("[data-node-cancel]").addEventListener("click", () => this.nodeDialog.close("cancel"));
    this.nodeDialog.addEventListener("close", () => { this.editingNodeId = null; });
  }

  resize() { this.render(); }

  setMode(mode) {
    this.mode = mode;
    this.selectedNode = null;
    this.feedback(`Modo ${mode.toUpperCase()} seleccionado.`);
    this.render();
  }

  setTool(tool) {
    this.tool = tool;
    this.selectedNode = null;
    const copy = {
      move: ["Mover nodos", "Arrastrá un nodo. Usá el botón central para desplazar el lienzo."],
      node: ["Crear evento", "Hacé clic en el lienzo para agregar un evento numerado."],
      edge: ["Crear actividad", "Elegí el evento de origen y luego el de destino."],
      delete: ["Borrar", "Hacé clic sobre un nodo o una actividad."],
    };
    this.screen.querySelector("[data-project-tool-name]").textContent = copy[tool][0];
    this.screen.querySelector("[data-project-instruction]").textContent = copy[tool][1];
    this.render();
  }

  snapshot() {
    this.history.push(JSON.stringify({ nodes: this.nodes, edges: this.edges, nextNode: this.nextNode }));
    if (this.history.length > 60) this.history.shift();
  }

  undo() {
    const state = this.history.pop();
    if (!state) return this.feedback("No hay cambios para deshacer.");
    Object.assign(this, JSON.parse(state));
    this.selectedNode = null;
    this.selection = null;
    this.feedback("Se deshizo el último cambio.");
    this.render();
  }

  clear() {
    if (!this.nodes.length) return;
    this.snapshot();
    this.nodes = [];
    this.edges = [];
    this.nextNode = 1;
    this.selectedNode = null;
    this.selection = null;
    this.feedback("Red vacía.");
    this.render();
  }

  clientPoint(event) {
    const rect = this.svg.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT,
    };
  }

  worldPoint(event) {
    const point = this.clientPoint(event);
    return { x: (point.x - this.pan.x) / this.zoom, y: (point.y - this.pan.y) / this.zoom };
  }

  addNode(event) {
    if (event.target !== this.svg && event.target.dataset.canvas !== "true") return;
    if (this.nodes.length >= MAX_NODES) return this.feedback("La red admite hasta 50 nodos.", true);
    this.snapshot();
    const point = this.worldPoint(event);
    this.nodes.push({ id: `event-${this.nextNode}`, label: String(this.nextNode), x: point.x, y: point.y });
    this.nextNode += 1;
    this.feedback("Evento creado.");
    this.render();
  }

  selectForEdge(nodeId) {
    if (!this.selectedNode) {
      this.selectedNode = nodeId;
      this.feedback("Ahora elegí el evento de destino.");
      return this.render();
    }
    if (this.selectedNode === nodeId) {
      this.selectedNode = null;
      this.feedback("Una actividad debe conectar dos eventos distintos.", true);
      return this.render();
    }
    this.pendingEdge = { from: this.selectedNode, to: nodeId };
    this.selectedNode = null;
    this.openActivityDialog();
    this.render();
  }

  openActivityDialog(edge = null) {
    const form = this.dialog.querySelector("form");
    form.reset();
    this.editingEdgeId = edge?.id || null;
    const dialogMode = edge?.mode || this.mode;
    this.dialog.querySelector("[data-activity-title]").textContent = edge ? "Editar actividad" : "Datos del arco";
    this.dialog.querySelector("[data-activity-submit]").textContent = edge ? "Guardar cambios" : "Crear actividad";
    this.dialog.querySelector("[data-activity-mode]").textContent = dialogMode.toUpperCase();
    this.dialog.querySelector("[data-cpm-fields]").hidden = dialogMode !== "cpm";
    this.dialog.querySelector("[data-pert-fields]").hidden = dialogMode !== "pert";
    form.elements.duration.required = dialogMode === "cpm";
    ["optimistic", "likely", "pessimistic"].forEach((name) => { form.elements[name].required = dialogMode === "pert"; });
    if (edge) {
      form.elements.activity.value = edge.activity;
      form.elements.duration.value = edge.duration ?? "";
      form.elements.optimistic.value = edge.optimistic ?? "";
      form.elements.likely.value = edge.likely ?? "";
      form.elements.pessimistic.value = edge.pessimistic ?? "";
    }
    this.dialog.showModal();
    requestAnimationFrame(() => form.elements.activity.focus());
  }

  cancelActivity() {
    this.pendingEdge = null;
    this.editingEdgeId = null;
    this.dialog.close("cancel");
  }

  saveActivity(event) {
    event.preventDefault();
    if (!this.pendingEdge && !this.editingEdgeId) return;
    const data = new FormData(event.currentTarget);
    const previous = this.edges.find((item) => item.id === this.editingEdgeId);
    const edgeMode = previous?.mode || this.mode;
    const edge = {
      id: previous?.id || crypto.randomUUID(),
      from: previous?.from || this.pendingEdge.from,
      to: previous?.to || this.pendingEdge.to,
      activity: String(data.get("activity")).trim(),
      duration: Number(data.get("duration")),
      optimistic: Number(data.get("optimistic")),
      likely: Number(data.get("likely")),
      pessimistic: Number(data.get("pessimistic")),
      mode: edgeMode,
    };
    this.snapshot();
    if (previous) this.edges = this.edges.map((item) => item.id === previous.id ? edge : item);
    else this.edges.push(edge);
    this.pendingEdge = null;
    this.editingEdgeId = null;
    this.dialog.close("save");
    this.feedback(`Actividad ${edge.activity} ${previous ? "actualizada" : "creada"}.`);
    this.render();
  }

  openNodeDialog(node) {
    this.editingNodeId = node.id;
    const input = this.nodeDialog.querySelector("[name=nodeNumber]");
    input.value = node.label;
    this.nodeDialog.showModal();
    requestAnimationFrame(() => input.select());
  }

  saveNode(event) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("nodeNumber")).trim();
    if (this.nodes.some((node) => node.id !== this.editingNodeId && node.label === value)) {
      return this.nodeDialog.querySelector("[data-node-error]").textContent = "Ese número ya está en uso.";
    }
    this.snapshot();
    const node = this.nodes.find((item) => item.id === this.editingNodeId);
    node.label = value;
    this.nodeDialog.querySelector("[data-node-error]").textContent = "";
    this.nodeDialog.close("save");
    this.feedback(`Nodo cambiado a ${value}.`);
    this.render();
  }

  deleteNode(nodeId) {
    this.snapshot();
    this.nodes = this.nodes.filter((node) => node.id !== nodeId);
    this.edges = this.edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId);
    this.selection = null;
    this.feedback("Evento y sus actividades eliminados.");
    this.render();
  }

  deleteEdge(edgeId) {
    this.snapshot();
    this.edges = this.edges.filter((edge) => edge.id !== edgeId);
    this.selection = null;
    this.feedback("Actividad eliminada.");
    this.render();
  }

  beginNodeDrag(event, nodeId) {
    if (event.button !== 0 || this.tool !== "move") return;
    this.snapshot();
    const node = this.nodes.find((item) => item.id === nodeId);
    const point = this.worldPoint(event);
    this.dragging = { nodeId, offsetX: node.x - point.x, offsetY: node.y - point.y };
    event.preventDefault();
  }

  beginPan(event) {
    if (event.button !== 1) return;
    event.preventDefault();
    const point = this.clientPoint(event);
    this.panning = { startX: point.x, startY: point.y, panX: this.pan.x, panY: this.pan.y };
    this.container.classList.add("is-panning");
  }

  pointerMove(event) {
    if (this.panning) {
      const point = this.clientPoint(event);
      this.pan.x = this.panning.panX + point.x - this.panning.startX;
      this.pan.y = this.panning.panY + point.y - this.panning.startY;
      return this.draw();
    }
    if (!this.dragging) return;
    const node = this.nodes.find((item) => item.id === this.dragging.nodeId);
    const point = this.worldPoint(event);
    node.x = point.x + this.dragging.offsetX;
    node.y = point.y + this.dragging.offsetY;
    this.draw();
  }

  pointerUp() {
    if (this.dragging) this.feedback("Evento movido.");
    this.dragging = null;
    this.panning = null;
    this.container.classList.remove("is-panning");
  }

  keyDown(event) {
    if (event.key !== "Delete" || !this.selection || this.screen.hidden || this.dialog.open) return;
    const active = document.activeElement;
    if (active?.matches("input, textarea, select")) return;
    event.preventDefault();
    if (this.selection.type === "node") this.deleteNode(this.selection.id);
    else this.deleteEdge(this.selection.id);
  }

  wheel(event) {
    event.preventDefault();
    const point = this.clientPoint(event);
    const world = { x: (point.x - this.pan.x) / this.zoom, y: (point.y - this.pan.y) / this.zoom };
    const nextZoom = Math.max(0.25, Math.min(2.5, this.zoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12)));
    this.pan.x = point.x - world.x * nextZoom;
    this.pan.y = point.y - world.y * nextZoom;
    this.zoom = nextZoom;
    this.draw();
    this.updateZoomLabel();
  }

  zoomBy(factor) {
    const center = { x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2 };
    const world = { x: (center.x - this.pan.x) / this.zoom, y: (center.y - this.pan.y) / this.zoom };
    this.zoom = Math.max(0.25, Math.min(2.5, this.zoom * factor));
    this.pan.x = center.x - world.x * this.zoom;
    this.pan.y = center.y - world.y * this.zoom;
    this.render();
  }

  fit() {
    if (!this.nodes.length) {
      this.zoom = 1;
      this.pan = { x: 0, y: 0 };
      return this.render();
    }
    const xs = this.nodes.map((node) => node.x);
    const ys = this.nodes.map((node) => node.y);
    const minX = Math.min(...xs) - 100;
    const maxX = Math.max(...xs) + 100;
    const minY = Math.min(...ys) - 100;
    const maxY = Math.max(...ys) + 100;
    this.zoom = Math.max(0.25, Math.min(1.5, Math.min(VIEW_WIDTH / (maxX - minX), VIEW_HEIGHT / (maxY - minY))));
    this.pan.x = (VIEW_WIDTH - (minX + maxX) * this.zoom) / 2;
    this.pan.y = (VIEW_HEIGHT - (minY + maxY) * this.zoom) / 2;
    this.render();
  }

  exportSvg() {
    if (!this.nodes.length) return this.feedback("Creá al menos un nodo antes de exportar.", true);
    this.selection = null;
    this.fit();
    const clone = this.svg.cloneNode(true);
    clone.setAttribute("xmlns", SVG_NS);
    clone.setAttribute("width", "1800");
    clone.setAttribute("height", "1050");
    const style = svgElement("style");
    style.textContent = `
      .project-grid-dot{fill:#dce3ee}.project-edge{fill:none;stroke:#70829c;stroke-width:4}
      .project-arrow{fill:#70829c}.project-node circle{fill:#fff;stroke:#172b4d;stroke-width:4}
      .project-node text{fill:#172b4d;font:850 17px Arial,sans-serif}.project-edge-label text{fill:#172b4d;stroke:#fff;stroke-width:8;paint-order:stroke;font:800 15px Arial,sans-serif}
    `;
    clone.insertBefore(style, clone.firstChild);
    const source = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
    const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `red-${this.mode}-${new Date().toISOString().slice(0, 10)}.svg`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.feedback("Red exportada como SVG en 1800 × 1050 px.");
  }

  download(content, type, filename) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  exportJson() {
    const data = { version: 1, kind: "cpm-pert-network", mode: this.mode, nextNode: this.nextNode, nodes: this.nodes, edges: this.edges };
    this.download(JSON.stringify(data, null, 2), "application/json;charset=utf-8", `red-${this.mode}-${new Date().toISOString().slice(0, 10)}.json`);
    this.feedback("Red exportada como JSON.");
  }

  async importJson(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.kind !== "cpm-pert-network" || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) throw new Error("Formato incompatible");
      if (data.nodes.length > MAX_NODES) throw new Error("La red supera los 50 nodos");
      const ids = new Set();
      const labels = new Set();
      const nodes = data.nodes.map((node) => {
        const id = String(node.id);
        const label = String(node.label);
        if (ids.has(id) || labels.has(label) || !Number.isFinite(Number(node.x)) || !Number.isFinite(Number(node.y))) throw new Error("Nodos inválidos o repetidos");
        ids.add(id); labels.add(label);
        return { id, label, x: Number(node.x), y: Number(node.y) };
      });
      const edges = data.edges.map((edge) => {
        if (!ids.has(String(edge.from)) || !ids.has(String(edge.to))) throw new Error("Una actividad referencia un nodo inexistente");
        const mode = edge.mode === "pert" ? "pert" : "cpm";
        return {
          id: String(edge.id || crypto.randomUUID()), from: String(edge.from), to: String(edge.to),
          activity: String(edge.activity || "Actividad").slice(0, 32), mode,
          duration: Number(edge.duration) || 0, optimistic: Number(edge.optimistic) || 0,
          likely: Number(edge.likely) || 0, pessimistic: Number(edge.pessimistic) || 0,
        };
      });
      this.snapshot();
      this.nodes = nodes;
      this.edges = edges;
      this.mode = data.mode === "pert" ? "pert" : "cpm";
      const numericLabels = nodes.map((node) => Number(node.label)).filter(Number.isFinite);
      this.nextNode = Math.max(Number(data.nextNode) || 1, numericLabels.length ? Math.max(...numericLabels) + 1 : 1);
      this.selection = null;
      this.fit();
      this.feedback(`Red importada: ${nodes.length} nodos y ${edges.length} actividades.`);
    } catch (error) {
      this.feedback(`No se pudo importar: ${error.message}.`, true);
    } finally {
      input.value = "";
    }
  }

  updateZoomLabel() {
    this.screen.querySelector("[data-project-zoom]").textContent = `${Math.round(this.zoom * 100)}%`;
  }

  feedback(message, error = false) {
    const element = this.screen.querySelector("[data-project-feedback]");
    element.textContent = message;
    element.classList.toggle("is-error", error);
  }

  edgePath(edge, index, peers) {
    const from = this.nodes.find((node) => node.id === edge.from);
    const to = this.nodes.find((node) => node.id === edge.to);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const sx = from.x + dx / length * 34;
    const sy = from.y + dy / length * 34;
    const ex = to.x - dx / length * 48;
    const ey = to.y - dy / length * 48;
    if (peers.length === 1) return { d: `M ${sx} ${sy} L ${ex} ${ey}`, labelX: (sx + ex) / 2, labelY: (sy + ey) / 2 - 12 };
    const offset = (index - (peers.length - 1) / 2) * 64;
    const mx = (sx + ex) / 2 - dy / length * offset;
    const my = (sy + ey) / 2 + dx / length * offset;
    return { d: `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`, labelX: mx, labelY: my - 12 };
  }

  edgeLabel(edge) {
    if (edge.mode === "pert") return `${edge.activity} [${edge.optimistic}, ${edge.likely}, ${edge.pessimistic}]`;
    return `${edge.activity} [${edge.duration}]`;
  }

  render() {
    this.screen.querySelectorAll("[data-project-mode]").forEach((button) => button.classList.toggle("is-active", button.dataset.projectMode === this.mode));
    this.screen.querySelectorAll("[data-project-tool]").forEach((button) => button.classList.toggle("is-active", button.dataset.projectTool === this.tool));
    this.screen.querySelector("[data-project-count]").textContent = `${this.nodes.length}/50 nodos · ${this.edges.length} actividades`;
    this.updateZoomLabel();
    this.draw();
  }

  draw() {
    this.container.replaceChildren();
    this.svg = svgElement("svg", { viewBox: `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`, role: "img", "aria-label": "Editor de red CPM o PERT" });
    this.svg.addEventListener("mousedown", (event) => this.beginPan(event));
    this.svg.addEventListener("auxclick", (event) => event.preventDefault());
    this.svg.addEventListener("wheel", (event) => this.wheel(event), { passive: false });

    const defs = svgElement("defs");
    const pattern = svgElement("pattern", { id: "project-grid", width: "40", height: "40", patternUnits: "userSpaceOnUse" });
    pattern.appendChild(svgElement("circle", { cx: "1", cy: "1", r: "1.4", class: "project-grid-dot" }));
    defs.appendChild(pattern);
    const marker = svgElement("marker", { id: "project-arrow", viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "8", markerHeight: "8", orient: "auto" });
    marker.appendChild(svgElement("path", { d: "M 0 0 L 10 5 L 0 10 z", class: "project-arrow" }));
    defs.appendChild(marker);
    this.svg.appendChild(defs);
    this.svg.appendChild(svgElement("rect", { x: "-5000", y: "-5000", width: "10000", height: "10000", fill: "url(#project-grid)", "data-canvas": "true" }));

    const world = svgElement("g", { transform: `translate(${this.pan.x} ${this.pan.y}) scale(${this.zoom})` });
    this.edges.forEach((edge) => {
      const peers = this.edges.filter((candidate) => candidate.from === edge.from && candidate.to === edge.to);
      const geometry = this.edgePath(edge, peers.indexOf(edge), peers);
      const selected = this.selection?.type === "edge" && this.selection.id === edge.id;
      const path = svgElement("path", { d: geometry.d, class: `project-edge${selected ? " is-selected" : ""}`, "marker-end": "url(#project-arrow)" });
      path.addEventListener("click", (event) => {
        event.stopPropagation();
        if (this.tool === "delete") this.deleteEdge(edge.id);
        else {
          this.selection = { type: "edge", id: edge.id };
          this.feedback(`Actividad ${edge.activity} seleccionada. Presioná Delete para borrarla.`);
          this.container.querySelectorAll(".is-selected").forEach((item) => item.classList.remove("is-selected"));
          path.classList.add("is-selected");
        }
      });
      path.addEventListener("dblclick", (event) => {
        event.stopPropagation();
        this.openActivityDialog(edge);
      });
      world.appendChild(path);
      const label = svgElement("g", { class: "project-edge-label", transform: `translate(${geometry.labelX} ${geometry.labelY})` });
      const text = svgElement("text", { "text-anchor": "middle", dy: "0.35em" });
      text.textContent = this.edgeLabel(edge);
      label.appendChild(text);
      world.appendChild(label);
    });

    this.nodes.forEach((node) => {
      const selected = this.selectedNode === node.id || (this.selection?.type === "node" && this.selection.id === node.id);
      const group = svgElement("g", { class: `project-node${selected ? " is-selected" : ""}`, transform: `translate(${node.x} ${node.y})` });
      group.appendChild(svgElement("circle", { r: "31" }));
      const text = svgElement("text", { "text-anchor": "middle", dy: "0.35em" });
      text.textContent = node.label;
      group.appendChild(text);
      group.addEventListener("pointerdown", (event) => this.beginNodeDrag(event, node.id));
      group.addEventListener("click", (event) => {
        event.stopPropagation();
        if (this.tool === "edge") this.selectForEdge(node.id);
        if (this.tool === "delete") this.deleteNode(node.id);
        if (this.tool === "move") {
          this.selection = { type: "node", id: node.id };
          this.feedback(`Nodo ${node.label} seleccionado. Podés moverlo o borrarlo con Delete.`);
          this.container.querySelectorAll(".is-selected").forEach((item) => item.classList.remove("is-selected"));
          group.classList.add("is-selected");
        }
      });
      group.addEventListener("dblclick", (event) => {
        event.stopPropagation();
        this.openNodeDialog(node);
      });
      world.appendChild(group);
    });
    this.svg.appendChild(world);
    this.svg.addEventListener("click", (event) => {
      if (this.tool === "node") return this.addNode(event);
      if (event.target.dataset.canvas === "true" && this.selection) {
        this.selection = null;
        this.render();
      }
    });
    this.container.appendChild(this.svg);
  }
}
