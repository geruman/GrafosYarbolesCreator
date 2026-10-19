const SVG_NS = "http://www.w3.org/2000/svg";

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

const EXERCISES = [
  ["Izquierda 1", "Rotación simple a la izquierda", [10, 20, 30]],
  ["Izquierda 2", "Equilibrá desde la raíz con una rotación izquierda", [20, 10, 40, 30, 50, 60]],
  ["Izquierda 3", "Encontrá el pivote interno y rotá a la izquierda", [40, 20, 60, 10, 30, 70, 80]],
  ["Derecha 1", "Rotación simple a la derecha", [30, 20, 10]],
  ["Derecha 2", "Equilibrá desde la raíz con una rotación derecha", [50, 30, 60, 20, 40, 10]],
  ["Derecha 3", "Encontrá el pivote interno y rotá a la derecha", [40, 20, 60, 10, 70, 5]],
  ["Doble izquierda-derecha 1", "Primero izquierda; después derecha", [30, 10, 20]],
  ["Doble izquierda-derecha 2", "Resolvé el caso LR desde la raíz", [50, 20, 70, 10, 30, 40]],
  ["Doble izquierda-derecha 3", "Resolvé el caso LR dentro del árbol", [60, 30, 90, 20, 80, 100, 25, 70, 85, 95, 110]],
  ["Doble derecha-izquierda 1", "Primero derecha; después izquierda", [10, 30, 20]],
  ["Doble derecha-izquierda 2", "Resolvé el caso RL desde la raíz", [20, 10, 50, 40, 60, 30]],
  ["Doble derecha-izquierda 3", "Resolvé el caso RL dentro del árbol", [60, 30, 90, 20, 40, 100, 10, 25, 35, 50, 95]],
].map(([label, title, values]) => ({ label, title, values }));

export class AvlRotationPractice {
  constructor(screen) {
    this.screen = screen;
    this.canvas = screen.querySelector("#avl-rotation-tree");
    this.feedback = screen.querySelector("[data-avl-rotation-feedback]");
    this.index = 0;
    this.nodes = new Map();
    this.rootId = null;
    this.selectedId = null;
    this.history = [];
    this.view = null;
    this.panning = null;
    this.wrongIds = new Set();

    this.canvas.addEventListener("click", (event) => {
      const node = event.target.closest("[data-avl-node]");
      if (!node) return;
      this.selectedId = node.dataset.avlNode;
      this.feedback.textContent = `Pivote seleccionado: ${this.nodes.get(this.selectedId).value}.`;
      this.feedback.className = "traversal-feedback";
      this.render();
    });
    this.canvas.addEventListener("wheel", (event) => this.zoom(event), { passive: false });
    this.canvas.addEventListener("pointerdown", (event) => this.beginPan(event));
    this.canvas.addEventListener("auxclick", (event) => event.preventDefault());
    window.addEventListener("pointermove", (event) => this.movePan(event));
    window.addEventListener("pointerup", () => this.endPan());
    window.addEventListener("pointercancel", () => this.endPan());
    screen.querySelector("[data-avl-rotate-left]").addEventListener("click", () => this.rotate("left"));
    screen.querySelector("[data-avl-rotate-right]").addEventListener("click", () => this.rotate("right"));
    screen.querySelector("[data-avl-rotation-undo]").addEventListener("click", () => this.undo());
    screen.querySelector("[data-avl-rotation-reset]").addEventListener("click", () => this.load());
    screen.querySelector("[data-avl-rotation-check]").addEventListener("click", () => this.check());
    screen.querySelector("[data-avl-rotation-next]").addEventListener("click", () => this.next());
  }

  open() {
    this.index = 0;
    this.load();
  }

  load() {
    this.nodes = new Map();
    this.rootId = null;
    this.selectedId = null;
    this.history = [];
    this.wrongIds.clear();
    this.view = null;
    this.exercise.values.forEach((value) => this.insertBst(value));
    this.screen.querySelector("[data-avl-rotation-counter]").textContent = `${this.index + 1} / ${EXERCISES.length}`;
    this.screen.querySelector("[data-avl-rotation-progress]").style.width = `${((this.index + 1) / EXERCISES.length) * 100}%`;
    this.screen.querySelector("[data-avl-rotation-level]").textContent = this.exercise.label;
    this.screen.querySelector("[data-avl-rotation-title]").textContent = this.exercise.title;
    this.feedback.textContent = "Seleccioná el nodo pivote y aplicá la rotación necesaria.";
    this.feedback.className = "traversal-feedback";
    this.screen.querySelector("[data-avl-rotation-next]").hidden = true;
    this.screen.querySelector("[data-avl-rotation-check]").hidden = false;
    this.render();
  }

  get exercise() { return EXERCISES[this.index]; }

  insertBst(value) {
    const id = `a${value}`;
    const node = { id, value, left: null, right: null };
    this.nodes.set(id, node);
    if (!this.rootId) return void (this.rootId = id);
    let current = this.nodes.get(this.rootId);
    while (current) {
      const side = value < current.value ? "left" : "right";
      if (!current[side]) return void (current[side] = id);
      current = this.nodes.get(current[side]);
    }
  }

  height(id) {
    if (!id) return 0;
    const node = this.nodes.get(id);
    return 1 + Math.max(this.height(node.left), this.height(node.right));
  }

  balance(id) {
    const node = this.nodes.get(id);
    return node ? this.height(node.left) - this.height(node.right) : 0;
  }

  snapshot() {
    return { rootId: this.rootId, selectedId: this.selectedId, nodes: [...this.nodes.values()].map((node) => ({ ...node })) };
  }

  parentOf(id) {
    for (const node of this.nodes.values()) {
      if (node.left === id) return { node, side: "left" };
      if (node.right === id) return { node, side: "right" };
    }
    return null;
  }

  rotate(direction) {
    const pivot = this.nodes.get(this.selectedId);
    if (!pivot) return this.error("Seleccioná primero el nodo que funcionará como pivote.");
    const childId = direction === "left" ? pivot.right : pivot.left;
    if (!childId) return this.flashWrong(pivot.id, `No se puede rotar a la ${direction === "left" ? "izquierda" : "derecha"}: falta el hijo necesario.`);
    this.history.push(this.snapshot());
    const child = this.nodes.get(childId);
    const parent = this.parentOf(pivot.id);
    if (direction === "left") {
      pivot.right = child.left;
      child.left = pivot.id;
    } else {
      pivot.left = child.right;
      child.right = pivot.id;
    }
    if (!parent) this.rootId = child.id;
    else parent.node[parent.side] = child.id;
    this.selectedId = child.id;
    this.feedback.textContent = `Rotación a la ${direction === "left" ? "izquierda" : "derecha"} aplicada. Podés seguir rotando o comprobar.`;
    this.feedback.className = "traversal-feedback is-success";
    this.render();
  }

  undo() {
    const state = this.history.pop();
    if (!state) return this.error("No hay rotaciones para deshacer.");
    this.rootId = state.rootId;
    this.selectedId = state.selectedId;
    this.nodes = new Map(state.nodes.map((node) => [node.id, { ...node }]));
    this.wrongIds.clear();
    this.feedback.textContent = "Última rotación deshecha.";
    this.feedback.className = "traversal-feedback";
    this.render();
  }

  check() {
    const unbalanced = [...this.nodes.keys()].filter((id) => Math.abs(this.balance(id)) > 1);
    if (unbalanced.length) {
      this.wrongIds = new Set(unbalanced);
      this.error("El árbol todavía no es AVL. Los nodos desequilibrados quedaron marcados en rojo.");
      this.render();
      return;
    }
    this.wrongIds.clear();
    this.feedback.textContent = "¡Correcto! El árbol conserva el orden y todos sus factores están entre −1 y 1.";
    this.feedback.className = "traversal-feedback is-success";
    this.screen.querySelector("[data-avl-rotation-check]").hidden = true;
    const next = this.screen.querySelector("[data-avl-rotation-next]");
    next.hidden = false;
    next.textContent = this.index === EXERCISES.length - 1 ? "Volver al módulo" : "Siguiente ejercicio →";
    this.render();
  }

  next() {
    if (this.index === EXERCISES.length - 1) return void this.screen.dispatchEvent(new CustomEvent("avl-rotation:exit", { bubbles: true }));
    this.index += 1;
    this.load();
  }

  error(message) {
    this.feedback.textContent = message;
    this.feedback.className = "traversal-feedback is-error";
  }

  flashWrong(id, message) {
    this.wrongIds.add(id);
    this.error(message);
    this.render();
    window.setTimeout(() => { this.wrongIds.delete(id); this.render(); }, 800);
  }

  layout() {
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
    return new Map(order.map((id, index) => [id, { x: order.length === 1 ? 320 : 50 + index * (540 / (order.length - 1)), y: 58 + depths.get(id) * 112 }]));
  }

  render() {
    const positions = this.layout();
    const height = Math.max(470, ...[...positions.values()].map((point) => point.y + 80));
    if (!this.view) this.view = { x: 0, y: 0, width: 640, height };
    const svg = svgElement("svg", { viewBox: `${this.view.x} ${this.view.y} ${this.view.width} ${this.view.height}`, role: "img", "aria-label": "Práctica de rotaciones AVL" });
    for (const node of this.nodes.values()) {
      const from = positions.get(node.id);
      for (const childId of [node.left, node.right]) {
        if (!childId) continue;
        const to = positions.get(childId);
        svg.appendChild(svgElement("line", { x1: from.x, y1: from.y, x2: to.x, y2: to.y, class: "bst-practice-edge" }));
      }
    }
    for (const node of this.nodes.values()) {
      const point = positions.get(node.id);
      const classes = ["bst-practice-node", "avl-rotation-node"];
      if (node.id === this.selectedId) classes.push("is-selected");
      if (this.wrongIds.has(node.id)) classes.push("is-wrong");
      const group = svgElement("g", { class: classes.join(" "), transform: `translate(${point.x} ${point.y})`, "data-avl-node": node.id });
      group.appendChild(svgElement("circle", { r: "27" }));
      const value = svgElement("text", { "text-anchor": "middle", dy: "0.35em" });
      value.textContent = node.value;
      group.appendChild(value);
      const detail = svgElement("text", { "text-anchor": "middle", y: "47", class: "avl-balance-label" });
      detail.textContent = `FB ${this.balance(node.id)}`;
      group.appendChild(detail);
      svg.appendChild(group);
    }
    this.canvas.replaceChildren(svg);
  }

  zoom(event) {
    const svg = this.canvas.querySelector("svg");
    if (!svg || !this.view) return;
    event.preventDefault();
    const bounds = svg.getBoundingClientRect();
    const rx = (event.clientX - bounds.left) / bounds.width;
    const ry = (event.clientY - bounds.top) / bounds.height;
    const factor = event.deltaY < 0 ? 0.86 : 1 / 0.86;
    const width = Math.max(180, Math.min(3000, this.view.width * factor));
    const height = this.view.height * (width / this.view.width);
    const worldX = this.view.x + rx * this.view.width;
    const worldY = this.view.y + ry * this.view.height;
    this.view = { x: worldX - rx * width, y: worldY - ry * height, width, height };
    this.render();
  }

  beginPan(event) {
    if (event.button !== 1 || !this.view) return;
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

  endPan() {
    this.panning = null;
    this.canvas.classList.remove("is-panning");
  }
}
