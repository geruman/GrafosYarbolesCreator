const SVG_NS = "http://www.w3.org/2000/svg";

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

export class TreeEditor {
  constructor(screen) {
    this.screen = screen;
    this.canvas = screen.querySelector("#tree-editor");
    this.valueInput = screen.querySelector("[data-tree-value]");
    this.feedback = screen.querySelector("[data-tree-feedback]");
    this.fileInput = screen.querySelector("[data-tree-file]");
    this.nodes = new Map();
    this.rootId = null;
    this.selectedId = null;
    this.mode = "binary";
    this.nextId = 1;
    this.history = [];
    this.dragging = null;
    this.dragSaved = false;
    this.panning = null;
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };

    screen.querySelectorAll("[data-tree-mode]").forEach((button) => button.addEventListener("click", () => this.setMode(button.dataset.treeMode)));
    screen.querySelectorAll("[data-tree-add]").forEach((button) => button.addEventListener("click", () => this.addBinary(button.dataset.treeAdd)));
    screen.querySelector("[data-tree-insert-bst]").addEventListener("click", () => this.insertBst());
    screen.querySelector("[data-tree-delete]").addEventListener("click", () => this.deleteSelected());
    screen.querySelector("[data-tree-arrange]").addEventListener("click", () => this.arrange(true));
    screen.querySelector("[data-tree-undo]").addEventListener("click", () => this.undo());
    screen.querySelector("[data-tree-clear]").addEventListener("click", () => this.clear());
    screen.querySelector("[data-tree-zoom-in]").addEventListener("click", () => this.zoomBy(1.2));
    screen.querySelector("[data-tree-zoom-out]").addEventListener("click", () => this.zoomBy(1 / 1.2));
    screen.querySelector("[data-tree-fit]").addEventListener("click", () => this.fit());
    screen.querySelector("[data-tree-export]").addEventListener("click", () => this.exportJson());
    screen.querySelector("[data-tree-import]").addEventListener("click", () => this.fileInput.click());
    this.fileInput.addEventListener("change", () => this.importJson());
    this.valueInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      if (this.mode === "bst") this.insertBst();
      else if (!this.rootId) this.addBinary("root");
    });

    this.canvas.addEventListener("pointerdown", (event) => this.pointerDown(event));
    this.canvas.addEventListener("wheel", (event) => this.wheel(event), { passive: false });
    this.canvas.addEventListener("auxclick", (event) => event.preventDefault());
    window.addEventListener("pointermove", (event) => this.pointerMove(event));
    window.addEventListener("pointerup", () => this.pointerUp());
    window.addEventListener("pointercancel", () => this.pointerUp());
    this.canvas.addEventListener("dblclick", (event) => this.editFromEvent(event));
    document.addEventListener("keydown", (event) => {
      if (this.screen.hidden || event.key !== "Delete" || event.target.matches("input, select, textarea")) return;
      this.deleteSelected();
    });
  }

  open() {
    this.render();
  }

  snapshot() {
    return {
      mode: this.mode,
      rootId: this.rootId,
      selectedId: this.selectedId,
      nextId: this.nextId,
      nodes: [...this.nodes.values()].map((node) => ({ ...node })),
    };
  }

  saveHistory() {
    this.history.push(this.snapshot());
    if (this.history.length > 60) this.history.shift();
  }

  restore(state) {
    this.mode = state.mode;
    this.rootId = state.rootId;
    this.selectedId = state.selectedId;
    this.nextId = state.nextId;
    this.nodes = new Map(state.nodes.map((node) => [node.id, { ...node }]));
    this.syncModeUi();
    this.render();
  }

  setMode(mode) {
    if (mode === this.mode) return;
    if (mode === "bst" && this.nodes.size && !this.isValidBst()) {
      this.message("El árbol actual no cumple las reglas de un ABB. Limpiá el lienzo o corregilo antes de cambiar.", true);
      return;
    }
    this.saveHistory();
    this.mode = mode;
    this.syncModeUi();
    this.message(mode === "bst" ? "Modo ABB: ingresá números y se ubicarán automáticamente." : "Modo binario libre: seleccioná un padre y elegí el lado.");
    this.render();
  }

  syncModeUi() {
    this.screen.querySelectorAll("[data-tree-mode]").forEach((button) => button.classList.toggle("is-active", button.dataset.treeMode === this.mode));
    this.screen.querySelector("[data-tree-binary-actions]").hidden = this.mode !== "binary";
    this.screen.querySelector("[data-tree-bst-actions]").hidden = this.mode !== "bst";
    this.valueInput.placeholder = this.mode === "bst" ? "Número, por ejemplo 25" : "Etiqueta, por ejemplo A";
  }

  readValue() {
    const value = this.valueInput.value.trim();
    if (!value) {
      this.message("Escribí un valor antes de insertar.", true);
      this.valueInput.focus();
      return null;
    }
    return value;
  }

  createNode(value) {
    const id = `t${this.nextId++}`;
    return { id, value, left: null, right: null, x: 500, y: 80 };
  }

  addBinary(side) {
    if (this.mode !== "binary") return;
    const value = this.readValue();
    if (value === null) return;
    if (side === "root") {
      if (this.rootId) return this.message("El árbol ya tiene raíz. Seleccioná un nodo para agregar un hijo.", true);
      this.saveHistory();
      const node = this.createNode(value);
      this.nodes.set(node.id, node);
      this.rootId = node.id;
      this.selectedId = node.id;
    } else {
      const parent = this.nodes.get(this.selectedId);
      if (!parent) return this.message("Seleccioná primero el nodo padre.", true);
      if (parent[side]) return this.message(`La posición ${side === "left" ? "izquierda" : "derecha"} ya está ocupada.`, true);
      this.saveHistory();
      const node = this.createNode(value);
      this.nodes.set(node.id, node);
      parent[side] = node.id;
      this.selectedId = node.id;
    }
    this.valueInput.value = "";
    this.arrange(false);
    this.message(`Nodo ${value} agregado.`);
  }

  insertBst() {
    if (this.mode !== "bst") return;
    const raw = this.readValue();
    if (raw === null) return;
    const value = Number(raw);
    if (!Number.isFinite(value)) return this.message("En un ABB los valores deben ser numéricos.", true);
    if ([...this.nodes.values()].some((node) => Number(node.value) === value)) return this.message("Ese valor ya existe en el árbol.", true);
    this.saveHistory();
    const node = this.createNode(String(value));
    if (!this.rootId) {
      this.rootId = node.id;
      this.nodes.set(node.id, node);
    } else {
      let current = this.nodes.get(this.rootId);
      while (current) {
        const side = value < Number(current.value) ? "left" : "right";
        if (!current[side]) {
          current[side] = node.id;
          this.nodes.set(node.id, node);
          break;
        }
        current = this.nodes.get(current[side]);
      }
    }
    this.selectedId = node.id;
    this.valueInput.value = "";
    this.arrange(false);
    this.message(`${value} insertado siguiendo el orden del ABB.`);
  }

  arrange(save = true) {
    if (!this.rootId) return;
    if (save) this.saveHistory();
    const order = [];
    const depths = new Map();
    const walk = (id, depth) => {
      if (!id) return;
      const node = this.nodes.get(id);
      walk(node.left, depth + 1);
      order.push(id);
      depths.set(id, depth);
      walk(node.right, depth + 1);
    };
    walk(this.rootId, 0);
    const spacing = 840 / Math.max(1, order.length - 1);
    order.forEach((id, index) => {
      const node = this.nodes.get(id);
      node.x = order.length === 1 ? 500 : 80 + index * spacing;
      node.y = 70 + depths.get(id) * 125;
    });
    this.render();
    if (save) this.message("Árbol reorganizado automáticamente.");
  }

  deleteSelected() {
    if (!this.selectedId || !this.nodes.has(this.selectedId)) return this.message("Seleccioná un nodo para borrarlo.", true);
    this.saveHistory();
    const doomed = new Set();
    const collect = (id) => {
      if (!id) return;
      doomed.add(id);
      const node = this.nodes.get(id);
      collect(node?.left);
      collect(node?.right);
    };
    collect(this.selectedId);
    if (this.selectedId === this.rootId) this.rootId = null;
    else {
      for (const node of this.nodes.values()) {
        if (node.left === this.selectedId) node.left = null;
        if (node.right === this.selectedId) node.right = null;
      }
    }
    doomed.forEach((id) => this.nodes.delete(id));
    this.selectedId = null;
    if (this.rootId) this.arrange(false);
    else this.render();
    this.message(`${doomed.size} nodo${doomed.size === 1 ? "" : "s"} eliminado${doomed.size === 1 ? "" : "s"}.`);
  }

  editFromEvent(event) {
    const group = event.target.closest("[data-tree-node]");
    if (!group) return;
    const node = this.nodes.get(group.dataset.treeNode);
    const next = window.prompt("Nuevo valor del nodo:", node.value);
    if (next === null || !next.trim() || next.trim() === node.value) return;
    const value = next.trim();
    this.saveHistory();
    const previous = node.value;
    node.value = value;
    if (this.mode === "bst" && (!Number.isFinite(Number(value)) || !this.isValidBst())) {
      node.value = previous;
      this.history.pop();
      this.message("Ese cambio rompería el orden del ABB.", true);
      this.render();
      return;
    }
    this.message(`Nodo actualizado a ${value}.`);
    this.render();
  }

  isValidBst() {
    const seen = new Set();
    const validate = (id, min, max) => {
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      const node = this.nodes.get(id);
      const value = Number(node?.value);
      if (!node || !Number.isFinite(value) || value <= min || value >= max) return false;
      return validate(node.left, min, value) && validate(node.right, value, max);
    };
    return !this.rootId || validate(this.rootId, -Infinity, Infinity);
  }

  clear() {
    if (!this.nodes.size) return;
    this.saveHistory();
    this.nodes.clear();
    this.rootId = null;
    this.selectedId = null;
    this.render();
    this.message("Lienzo limpio.");
  }

  undo() {
    const previous = this.history.pop();
    if (!previous) return this.message("No hay acciones para deshacer.", true);
    this.restore(previous);
    this.message("Última acción deshecha.");
  }

  pointerDown(event) {
    if (event.button === 1) {
      event.preventDefault();
      const point = this.svgPoint(event);
      this.panning = { startX: point.x, startY: point.y, panX: this.pan.x, panY: this.pan.y };
      this.canvas.classList.add("is-panning");
      return;
    }
    if (event.button !== 0) return;
    const group = event.target.closest("[data-tree-node]");
    if (!group) return;
    this.selectedId = group.dataset.treeNode;
    const point = this.worldPoint(event);
    const node = this.nodes.get(this.selectedId);
    this.dragging = { id: node.id, dx: point.x - node.x, dy: point.y - node.y };
    this.dragSaved = false;
    event.target.setPointerCapture?.(event.pointerId);
    this.render();
  }

  pointerMove(event) {
    if (this.panning) {
      const point = this.svgPoint(event);
      this.pan.x = this.panning.panX + point.x - this.panning.startX;
      this.pan.y = this.panning.panY + point.y - this.panning.startY;
      this.render();
      return;
    }
    if (!this.dragging) return;
    if (!this.dragSaved) {
      this.saveHistory();
      this.dragSaved = true;
    }
    const point = this.worldPoint(event);
    const node = this.nodes.get(this.dragging.id);
    node.x = Math.max(-4000, Math.min(5000, point.x - this.dragging.dx));
    node.y = Math.max(-4000, Math.min(5000, point.y - this.dragging.dy));
    this.render();
  }

  pointerUp() {
    this.dragging = null;
    this.dragSaved = false;
    this.panning = null;
    this.canvas.classList.remove("is-panning");
  }

  svgPoint(event) {
    const bounds = this.canvas.querySelector("svg")?.getBoundingClientRect() ?? this.canvas.getBoundingClientRect();
    return { x: ((event.clientX - bounds.left) / bounds.width) * 1000, y: ((event.clientY - bounds.top) / bounds.height) * 650 };
  }

  worldPoint(event) {
    const point = this.svgPoint(event);
    return { x: (point.x - this.pan.x) / this.zoom, y: (point.y - this.pan.y) / this.zoom };
  }

  wheel(event) {
    event.preventDefault();
    const point = this.svgPoint(event);
    const world = { x: (point.x - this.pan.x) / this.zoom, y: (point.y - this.pan.y) / this.zoom };
    const nextZoom = Math.max(0.18, Math.min(3, this.zoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12)));
    this.pan.x = point.x - world.x * nextZoom;
    this.pan.y = point.y - world.y * nextZoom;
    this.zoom = nextZoom;
    this.render();
  }

  zoomBy(factor) {
    const center = { x: 500, y: 325 };
    const world = { x: (center.x - this.pan.x) / this.zoom, y: (center.y - this.pan.y) / this.zoom };
    this.zoom = Math.max(0.18, Math.min(3, this.zoom * factor));
    this.pan.x = center.x - world.x * this.zoom;
    this.pan.y = center.y - world.y * this.zoom;
    this.render();
  }

  fit() {
    if (!this.nodes.size) {
      this.zoom = 1;
      this.pan = { x: 0, y: 0 };
      this.render();
      return;
    }
    const xs = [...this.nodes.values()].map((node) => node.x);
    const ys = [...this.nodes.values()].map((node) => node.y);
    const minX = Math.min(...xs) - 65;
    const maxX = Math.max(...xs) + 65;
    const minY = Math.min(...ys) - 65;
    const maxY = Math.max(...ys) + 65;
    this.zoom = Math.max(0.18, Math.min(1.6, Math.min(940 / Math.max(1, maxX - minX), 590 / Math.max(1, maxY - minY))));
    this.pan.x = (1000 - (minX + maxX) * this.zoom) / 2;
    this.pan.y = (650 - (minY + maxY) * this.zoom) / 2;
    this.render();
  }

  traversals() {
    const result = { preorder: [], inorder: [], postorder: [] };
    const walk = (id) => {
      if (!id) return;
      const node = this.nodes.get(id);
      result.preorder.push(node.value);
      walk(node.left);
      result.inorder.push(node.value);
      walk(node.right);
      result.postorder.push(node.value);
    };
    walk(this.rootId);
    return result;
  }

  render() {
    this.syncModeUi();
    this.canvas.replaceChildren();
    const svg = svgElement("svg", { viewBox: "0 0 1000 650", role: "img", "aria-label": "Árbol editable" });
    const world = svgElement("g", { transform: `translate(${this.pan.x} ${this.pan.y}) scale(${this.zoom})` });
    for (const node of this.nodes.values()) {
      for (const childId of [node.left, node.right]) {
        if (!childId) continue;
        const child = this.nodes.get(childId);
        world.appendChild(svgElement("line", { x1: node.x, y1: node.y, x2: child.x, y2: child.y, class: "tree-editor-edge" }));
      }
    }
    for (const node of this.nodes.values()) {
      const group = svgElement("g", { class: `tree-editor-node${node.id === this.selectedId ? " is-selected" : ""}`, transform: `translate(${node.x} ${node.y})`, "data-tree-node": node.id });
      group.appendChild(svgElement("circle", { r: 31 }));
      const text = svgElement("text", { "text-anchor": "middle", dy: "0.35em" });
      text.textContent = node.value;
      group.appendChild(text);
      world.appendChild(group);
    }
    svg.appendChild(world);
    this.canvas.appendChild(svg);
    this.screen.querySelector("[data-tree-count]").textContent = `${this.nodes.size} nodo${this.nodes.size === 1 ? "" : "s"}`;
    const selected = this.nodes.get(this.selectedId);
    this.screen.querySelector("[data-tree-selection]").textContent = selected ? `Seleccionado: ${selected.value}` : "Ningún nodo seleccionado";
    const traversals = this.traversals();
    this.screen.querySelector("[data-tree-preorder]").textContent = traversals.preorder.join(" → ") || "—";
    this.screen.querySelector("[data-tree-inorder]").textContent = traversals.inorder.join(" → ") || "—";
    this.screen.querySelector("[data-tree-postorder]").textContent = traversals.postorder.join(" → ") || "—";
    this.screen.querySelector("[data-tree-zoom]").textContent = `${Math.round(this.zoom * 100)}%`;
  }

  exportJson() {
    const data = JSON.stringify({ format: "taller-tree-v1", ...this.snapshot() }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `arbol-${this.mode}.json`;
    link.click();
    URL.revokeObjectURL(url);
    this.message("Árbol exportado como JSON.");
  }

  async importJson() {
    const file = this.fileInput.files?.[0];
    this.fileInput.value = "";
    if (!file) return;
    let saved = false;
    try {
      const data = JSON.parse(await file.text());
      if (data.format !== "taller-tree-v1" || !Array.isArray(data.nodes)) throw new Error("Formato incorrecto");
      const ids = new Set(data.nodes.map((node) => node.id));
      if (data.rootId && !ids.has(data.rootId)) throw new Error("Raíz inexistente");
      if (data.nodes.some((node) => (node.left && !ids.has(node.left)) || (node.right && !ids.has(node.right)))) throw new Error("Enlace inexistente");
      const imported = new Map(data.nodes.map((node) => [node.id, node]));
      const visited = new Set();
      const visiting = new Set();
      const verify = (id) => {
        if (!id) return;
        if (visiting.has(id) || visited.has(id)) throw new Error("La estructura contiene ciclos o nodos con más de un padre");
        visiting.add(id);
        const node = imported.get(id);
        verify(node.left);
        verify(node.right);
        visiting.delete(id);
        visited.add(id);
      };
      verify(data.rootId);
      if (visited.size !== data.nodes.length) throw new Error("Hay nodos desconectados de la raíz");
      this.saveHistory();
      saved = true;
      this.restore({ mode: data.mode === "bst" ? "bst" : "binary", rootId: data.rootId ?? null, selectedId: null, nextId: Number(data.nextId) || data.nodes.length + 1, nodes: data.nodes });
      if (this.mode === "bst" && !this.isValidBst()) throw new Error("El archivo no contiene un ABB válido");
      this.message("Árbol importado correctamente.");
    } catch (error) {
      if (saved) this.undo();
      this.message(`No se pudo importar: ${error.message}`, true);
    }
  }

  message(text, error = false) {
    this.feedback.textContent = text;
    this.feedback.className = `lab-feedback${error ? " is-error" : ""}`;
  }
}
