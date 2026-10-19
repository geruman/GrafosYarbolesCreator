const SVG_NS = "http://www.w3.org/2000/svg";

export const RB_RANDOM_CASES = [
  { name: "padre y tío rojos", values: [10, 5, 15, 3], colors: { 10: "black", 5: "red", 15: "red", 3: "red" } },
  { name: "rotación izquierda", values: [10, 20, 30], colors: { 10: "black", 20: "red", 30: "red" } },
  { name: "rotación derecha", values: [30, 20, 10], colors: { 30: "black", 20: "red", 10: "red" } },
  { name: "doble izquierda-derecha", values: [30, 10, 20], colors: { 30: "black", 10: "red", 20: "red" } },
  { name: "doble derecha-izquierda", values: [10, 30, 20], colors: { 10: "black", 30: "red", 20: "red" } },
  { name: "conflicto interno derecho", values: [40, 20, 60, 70, 80], colors: { 40: "black", 20: "black", 60: "black", 70: "red", 80: "red" } },
  { name: "conflicto interno izquierdo", values: [40, 20, 60, 10, 5], colors: { 40: "black", 20: "black", 60: "black", 10: "red", 5: "red" } },
];

export const RB_PRACTICE_CASES = [
  { name: "recoloreo con tío rojo", values: [20, 10, 30, 5, 15], colors: { 20: "black", 10: "black", 30: "black", 5: "red", 15: "red" }, target: 3 },
  { name: "recoloreo espejo", values: [20, 10, 30, 25, 35], colors: { 20: "black", 10: "black", 30: "black", 25: "red", 35: "red" }, target: 37 },
  { name: "rotación derecha", values: [20, 10, 30, 5], colors: { 20: "black", 10: "black", 30: "black", 5: "red" }, target: 3 },
  { name: "rotación izquierda-derecha", values: [20, 10, 30, 5], colors: { 20: "black", 10: "black", 30: "black", 5: "red" }, target: 7 },
  { name: "rotación izquierda", values: [20, 10, 30, 35], colors: { 20: "black", 10: "black", 30: "black", 35: "red" }, target: 37 },
  { name: "rotación derecha-izquierda", values: [20, 10, 30, 35], colors: { 20: "black", 10: "black", 30: "black", 35: "red" }, target: 33 },
];

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

export class RedBlackLab {
  constructor(screen) {
    this.screen = screen;
    this.canvas = screen.querySelector("#red-black-editor");
    this.valueInput = screen.querySelector("[data-rb-value]");
    this.feedback = screen.querySelector("[data-rb-feedback]");
    this.nodes = new Map();
    this.rootId = null;
    this.selectedId = null;
    this.nextId = 1;
    this.history = [];
    this.view = { x: 0, y: 0, width: 1000, height: 650 };
    this.panning = null;
    this.randomPractice = false;
    this.pendingValue = null;
    this.placementWrongId = null;
    this.placementLocked = false;

    screen.querySelector("[data-rb-insert]").addEventListener("click", () => this.insert());
    screen.querySelector("[data-rb-recolor]").addEventListener("click", () => this.recolor());
    screen.querySelector("[data-rb-rotate-left]").addEventListener("click", () => this.rotate("left"));
    screen.querySelector("[data-rb-rotate-right]").addEventListener("click", () => this.rotate("right"));
    screen.querySelectorAll("[data-rb-check]").forEach((button) => button.addEventListener("click", () => this.check()));
    screen.querySelector("[data-rb-undo]").addEventListener("click", () => this.undo());
    screen.querySelector("[data-rb-clear]").addEventListener("click", () => this.clear());
    screen.querySelector("[data-rb-random-unbalanced]").addEventListener("click", () => this.generateUnbalanced());
    screen.querySelectorAll("[data-rb-place]").forEach((button) => button.addEventListener("click", () => this.placeValue(button.dataset.rbPlace)));
    screen.querySelector("[data-rb-next-random]").addEventListener("click", () => this.generateRandomPractice());
    this.valueInput.addEventListener("keydown", (event) => { if (event.key === "Enter") this.insert(); });
    this.canvas.addEventListener("click", (event) => {
      const group = event.target.closest("[data-rb-node]");
      if (!group) return;
      if (this.selectedId === group.dataset.rbNode) {
        this.recolor();
        return;
      }
      this.selectedId = group.dataset.rbNode;
      this.message(`Seleccionado: ${this.nodes.get(this.selectedId).value}.`);
      this.render();
    });
    this.canvas.addEventListener("wheel", (event) => this.zoom(event), { passive: false });
    this.canvas.addEventListener("pointerdown", (event) => this.beginPan(event));
    this.canvas.addEventListener("auxclick", (event) => event.preventDefault());
    window.addEventListener("pointermove", (event) => this.movePan(event));
    window.addEventListener("pointerup", () => this.endPan());
    window.addEventListener("pointercancel", () => this.endPan());
  }

  open() {
    this.randomPractice = false;
    this.pendingValue = null;
    this.screen.querySelector("[data-rb-kicker]").textContent = "M3 · Laboratorio";
    this.screen.querySelector("[data-rb-title]").textContent = "Árboles rojinegros";
    this.screen.querySelector("[data-rb-standard-insert]").hidden = false;
    this.screen.querySelector("[data-rb-practice-panel]").hidden = true;
    this.screen.querySelector("[data-rb-next-random]").hidden = true;
    this.render();
  }

  openRandomPractice() {
    this.randomPractice = true;
    this.screen.querySelector("[data-rb-kicker]").textContent = "M3.P9 · Práctica aleatoria";
    this.screen.querySelector("[data-rb-title]").textContent = "Inserción y reparación rojinegra";
    this.screen.querySelector("[data-rb-standard-insert]").hidden = true;
    this.screen.querySelector("[data-rb-practice-panel]").hidden = false;
    this.generateRandomPractice();
  }

  snapshot() {
    return { rootId: this.rootId, selectedId: this.selectedId, nextId: this.nextId, nodes: [...this.nodes.values()].map((node) => ({ ...node })) };
  }

  save() {
    this.history.push(this.snapshot());
    if (this.history.length > 60) this.history.shift();
  }

  insert() {
    const value = Number(this.valueInput.value.trim());
    if (!Number.isFinite(value)) return this.message("Ingresá un número válido.", true);
    if ([...this.nodes.values()].some((node) => node.value === value)) return this.message("Ese número ya existe.", true);
    this.save();
    const node = { id: `rb${this.nextId++}`, value, color: this.rootId ? "red" : "black", left: null, right: null };
    this.nodes.set(node.id, node);
    if (!this.rootId) this.rootId = node.id;
    else {
      let current = this.nodes.get(this.rootId);
      while (current) {
        const side = value < current.value ? "left" : "right";
        if (!current[side]) { current[side] = node.id; break; }
        current = this.nodes.get(current[side]);
      }
    }
    this.selectedId = node.id;
    this.valueInput.value = "";
    this.message(this.rootId === node.id ? `${value} es la raíz y queda negra.` : `${value} insertado en rojo. Repará el árbol manualmente si aparece una infracción.`);
    this.render();
  }

  recolor() {
    if (this.pendingValue !== null) return this.message("Primero insertá correctamente el valor propuesto.", true);
    const node = this.nodes.get(this.selectedId);
    if (!node) return this.message("Seleccioná un nodo para recolorearlo.", true);
    this.save();
    node.color = node.color === "red" ? "black" : "red";
    this.message(`${node.value} ahora es ${node.color === "red" ? "rojo" : "negro"}.`);
    this.render();
  }

  parentOf(id) {
    for (const node of this.nodes.values()) {
      if (node.left === id) return { node, side: "left" };
      if (node.right === id) return { node, side: "right" };
    }
    return null;
  }

  rotate(direction) {
    if (this.pendingValue !== null) return this.message("Primero insertá correctamente el valor propuesto.", true);
    const pivot = this.nodes.get(this.selectedId);
    if (!pivot) return this.message("Seleccioná primero el nodo pivote.", true);
    const childId = direction === "left" ? pivot.right : pivot.left;
    if (!childId) return this.message(`No se puede rotar a la ${direction === "left" ? "izquierda" : "derecha"}.`, true);
    this.save();
    const child = this.nodes.get(childId);
    const parent = this.parentOf(pivot.id);
    if (direction === "left") { pivot.right = child.left; child.left = pivot.id; }
    else { pivot.left = child.right; child.right = pivot.id; }
    if (parent) parent.node[parent.side] = child.id;
    else this.rootId = child.id;
    this.selectedId = child.id;
    this.message(`Rotación a la ${direction === "left" ? "izquierda" : "derecha"} aplicada. Los colores no cambian automáticamente.`);
    this.render();
  }

  validate() {
    const errors = [];
    if (this.rootId && this.nodes.get(this.rootId).color !== "black") errors.push("La raíz debe ser negra.");
    for (const node of this.nodes.values()) {
      if (node.color !== "red") continue;
      if ((node.left && this.nodes.get(node.left).color === "red") || (node.right && this.nodes.get(node.right).color === "red")) {
        errors.push(`El nodo rojo ${node.value} tiene un hijo rojo.`);
      }
    }
    const blackHeight = (id) => {
      if (!id) return 1;
      const node = this.nodes.get(id);
      const left = blackHeight(node.left);
      const right = blackHeight(node.right);
      if (left < 0 || right < 0 || left !== right) return -1;
      return left + (node.color === "black" ? 1 : 0);
    };
    if (blackHeight(this.rootId) < 0) errors.push("Los caminos hacia NIL no tienen la misma altura negra.");
    return errors;
  }

  check() {
    if (this.pendingValue !== null) return this.message("Primero insertá correctamente el valor propuesto.", true);
    const errors = this.validate();
    if (errors.length) this.message(errors[0], true);
    else {
      this.message("¡Correcto! Se cumplen la raíz negra, la separación de rojos y la altura negra.");
      if (this.randomPractice) this.screen.querySelector("[data-rb-next-random]").hidden = false;
    }
  }

  undo() {
    const state = this.history.pop();
    if (!state) return this.message("No hay acciones para deshacer.", true);
    this.rootId = state.rootId;
    this.selectedId = state.selectedId;
    this.nextId = state.nextId;
    this.nodes = new Map(state.nodes.map((node) => [node.id, { ...node }]));
    this.message("Última acción deshecha.");
    this.render();
  }

  clear() {
    if (!this.nodes.size) return;
    this.save();
    this.nodes.clear();
    this.rootId = null;
    this.selectedId = null;
    this.message("Lienzo limpio.");
    this.render();
  }

  expectedSlot(value) {
    let current = this.nodes.get(this.rootId);
    while (current) {
      const side = value < current.value ? "left" : "right";
      if (!current[side]) return { parentId: current.id, side };
      current = this.nodes.get(current[side]);
    }
    return null;
  }

  placeValue(side) {
    if (!this.randomPractice || this.pendingValue === null || this.placementLocked) return;
    const parent = this.nodes.get(this.selectedId);
    if (!parent) return this.message("Seleccioná primero el nodo que debería ser el padre.", true);
    const expected = this.expectedSlot(this.pendingValue);
    if (!expected || expected.parentId !== parent.id || expected.side !== side || parent[side]) {
      let previewId = null;
      if (!parent[side]) {
        previewId = `rb-preview-${this.nextId++}`;
        this.nodes.set(previewId, { id: previewId, value: this.pendingValue, color: "red", left: null, right: null });
        parent[side] = previewId;
        this.placementWrongId = previewId;
      } else this.placementWrongId = parent.id;
      this.placementLocked = true;
      this.message(`${this.pendingValue} no corresponde en ese lugar. El intento incorrecto aparece marcado.`, true);
      this.render();
      window.setTimeout(() => {
        if (previewId && parent[side] === previewId) parent[side] = null;
        if (previewId) this.nodes.delete(previewId);
        this.placementWrongId = null;
        this.placementLocked = false;
        this.render();
      }, 900);
      return;
    }
    this.save();
    const value = this.pendingValue;
    const node = { id: `rb${this.nextId++}`, value, color: "red", left: null, right: null };
    this.nodes.set(node.id, node);
    parent[side] = node.id;
    this.pendingValue = null;
    this.selectedId = node.id;
    this.message(`${value} insertado correctamente en rojo. Ahora repará el árbol con recoloreo y rotaciones.`);
    this.render();
  }

  generateRandomPractice() {
    const sample = RB_PRACTICE_CASES[Math.floor(Math.random() * RB_PRACTICE_CASES.length)];
    const offset = Math.floor(Math.random() * 12) * 4;
    this.nodes.clear();
    this.rootId = null;
    this.selectedId = null;
    this.history = [];
    sample.values.forEach((original) => {
      const value = original + offset;
      const node = { id: `rb${this.nextId++}`, value, color: sample.colors[original], left: null, right: null };
      this.nodes.set(node.id, node);
      if (!this.rootId) this.rootId = node.id;
      else {
        let current = this.nodes.get(this.rootId);
        while (current) {
          const side = value < current.value ? "left" : "right";
          if (!current[side]) { current[side] = node.id; break; }
          current = this.nodes.get(current[side]);
        }
      }
    });
    this.pendingValue = sample.target + offset;
    this.placementWrongId = null;
    this.placementLocked = false;
    this.view = { x: 0, y: 0, width: 1000, height: 650 };
    this.screen.querySelector("[data-rb-proposed-value]").textContent = this.pendingValue;
    this.screen.querySelector("[data-rb-next-random]").hidden = true;
    this.message(`Insertá ${this.pendingValue} como nodo rojo respetando el orden ABB.`);
    this.render();
  }

  generateUnbalanced() {
    const sample = RB_RANDOM_CASES[Math.floor(Math.random() * RB_RANDOM_CASES.length)];
    const offset = Math.floor(Math.random() * 12) * 4;
    this.save();
    this.nodes.clear();
    this.rootId = null;
    this.selectedId = null;
    sample.values.forEach((original) => {
      const value = original + offset;
      const node = { id: `rb${this.nextId++}`, value, color: sample.colors[original], left: null, right: null };
      this.nodes.set(node.id, node);
      if (!this.rootId) this.rootId = node.id;
      else {
        let current = this.nodes.get(this.rootId);
        while (current) {
          const side = value < current.value ? "left" : "right";
          if (!current[side]) { current[side] = node.id; break; }
          current = this.nodes.get(current[side]);
        }
      }
    });
    this.view = { x: 0, y: 0, width: 1000, height: 650 };
    this.message(`Árbol al azar generado con un caso de ${sample.name}. Reparalo manualmente y comprobá las propiedades.`);
    this.render();
  }

  layout() {
    const order = [];
    const depths = new Map();
    const walk = (id, depth) => {
      if (!id) return;
      const node = this.nodes.get(id);
      walk(node.left, depth + 1); order.push(id); depths.set(id, depth); walk(node.right, depth + 1);
    };
    walk(this.rootId, 0);
    return new Map(order.map((id, index) => [id, { x: order.length === 1 ? 500 : 75 + index * (850 / (order.length - 1)), y: 75 + depths.get(id) * 125 }]));
  }

  render() {
    const positions = this.layout();
    const svg = svgElement("svg", { viewBox: `${this.view.x} ${this.view.y} ${this.view.width} ${this.view.height}`, role: "img", "aria-label": "Laboratorio de árboles rojinegros" });
    for (const node of this.nodes.values()) {
      const from = positions.get(node.id);
      for (const childId of [node.left, node.right]) {
        if (!childId) continue;
        const to = positions.get(childId);
        svg.appendChild(svgElement("line", { x1: from.x, y1: from.y, x2: to.x, y2: to.y, class: "tree-editor-edge" }));
      }
    }
    for (const node of this.nodes.values()) {
      const point = positions.get(node.id);
      const group = svgElement("g", { class: `rb-lab-node is-${node.color}${node.id === this.selectedId ? " is-selected" : ""}${node.id === this.placementWrongId ? " is-placement-wrong" : ""}`, transform: `translate(${point.x} ${point.y})`, "data-rb-node": node.id });
      group.appendChild(svgElement("circle", { r: "31" }));
      const text = svgElement("text", { "text-anchor": "middle", dy: "0.35em" });
      text.textContent = node.value;
      group.appendChild(text);
      svg.appendChild(group);
    }
    this.canvas.replaceChildren(svg);
    this.screen.querySelector("[data-rb-count]").textContent = `${this.nodes.size} nodo${this.nodes.size === 1 ? "" : "s"}`;
  }

  zoom(event) {
    event.preventDefault();
    const bounds = this.canvas.getBoundingClientRect();
    const rx = (event.clientX - bounds.left) / bounds.width;
    const ry = (event.clientY - bounds.top) / bounds.height;
    const factor = event.deltaY < 0 ? 0.86 : 1 / 0.86;
    const width = Math.max(260, Math.min(4000, this.view.width * factor));
    const height = width * 0.65;
    const worldX = this.view.x + rx * this.view.width;
    const worldY = this.view.y + ry * this.view.height;
    this.view = { x: worldX - rx * width, y: worldY - ry * height, width, height };
    this.render();
  }

  beginPan(event) {
    if (event.button !== 1) return;
    event.preventDefault();
    this.panning = { clientX: event.clientX, clientY: event.clientY, x: this.view.x, y: this.view.y };
    this.canvas.classList.add("is-panning");
  }

  movePan(event) {
    if (!this.panning) return;
    const bounds = this.canvas.getBoundingClientRect();
    this.view.x = this.panning.x - ((event.clientX - this.panning.clientX) / bounds.width) * this.view.width;
    this.view.y = this.panning.y - ((event.clientY - this.panning.clientY) / bounds.height) * this.view.height;
    this.render();
  }

  endPan() { this.panning = null; this.canvas.classList.remove("is-panning"); }

  message(text, error = false) {
    this.feedback.textContent = text;
    this.feedback.className = `lab-feedback${error ? " is-error" : ""}`;
  }
}
