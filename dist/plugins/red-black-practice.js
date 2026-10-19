const SVG_NS = "http://www.w3.org/2000/svg";

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

export const RB_EXERCISES = [
  { label: "Recoloreo 1", title: "Padre y tío rojos", values: [10, 5, 15, 3], colors: { 10: "black", 5: "red", 15: "red", 3: "red" }, actions: [["recolor"]], final: { 10: "black", 5: "black", 15: "black", 3: "red" }, explanation: "El padre 5 y el tío 15 pasan a negro. El abuelo es la raíz, por eso permanece negro." },
  { label: "Recoloreo 2", title: "El conflicto continúa hacia arriba", values: [20, 10, 30, 5, 15, 3], colors: { 20: "black", 10: "black", 30: "black", 5: "red", 15: "red", 3: "red" }, actions: [["recolor"]], final: { 20: "black", 10: "red", 30: "black", 5: "black", 15: "black", 3: "red" }, explanation: "Padre y tío pasan a negro; el abuelo 10 pasa a rojo. Como su padre 20 es negro, la reparación termina." },
  { label: "Rotación izquierda 1", title: "Caso externo hacia la derecha", values: [10, 20, 30], colors: { 10: "black", 20: "red", 30: "red" }, actions: [["left", 10]], final: { 20: "black", 10: "red", 30: "red" }, explanation: "Se rota el abuelo 10 a la izquierda. El 20 sube, queda negro y el antiguo abuelo pasa a rojo." },
  { label: "Rotación izquierda 2", title: "El conflicto está dentro del árbol", values: [40, 20, 60, 70, 80], colors: { 40: "black", 20: "black", 60: "black", 70: "red", 80: "red" }, actions: [["left", 60]], final: { 40: "black", 20: "black", 70: "black", 60: "red", 80: "red" }, explanation: "El pivote es 60. El 70 sube y se pinta negro; 60 baja y pasa a rojo." },
  { label: "Rotación derecha 1", title: "Caso externo hacia la izquierda", values: [30, 20, 10], colors: { 30: "black", 20: "red", 10: "red" }, actions: [["right", 30]], final: { 20: "black", 10: "red", 30: "red" }, explanation: "Se rota el abuelo 30 a la derecha. El 20 sube, queda negro y 30 pasa a rojo." },
  { label: "Rotación derecha 2", title: "El conflicto está en una rama", values: [40, 20, 60, 10, 5], colors: { 40: "black", 60: "black", 20: "black", 10: "red", 5: "red" }, actions: [["right", 20]], final: { 40: "black", 60: "black", 10: "black", 5: "red", 20: "red" }, explanation: "El pivote es 20. El 10 sube negro y el antiguo abuelo 20 queda rojo." },
  { label: "Rotación doble izquierda-derecha", title: "Primero enderezamos el quiebre", values: [30, 10, 20], colors: { 30: "black", 10: "red", 20: "red" }, actions: [["left", 10], ["right", 30]], final: { 20: "black", 10: "red", 30: "red" }, explanation: "Primero se rota 10 a la izquierda. Después se rota 30 a la derecha y el nodo central 20 queda negro." },
  { label: "Rotación doble derecha-izquierda", title: "El caso espejo", values: [10, 30, 20], colors: { 10: "black", 30: "red", 20: "red" }, actions: [["right", 30], ["left", 10]], final: { 20: "black", 10: "red", 30: "red" }, explanation: "Primero se rota 30 a la derecha. Después se rota 10 a la izquierda y el 20 queda negro." },
];

export class RedBlackPractice {
  constructor(screen) {
    this.screen = screen;
    this.canvas = screen.querySelector("#red-black-practice-tree");
    this.feedback = screen.querySelector("[data-rbp-feedback]");
    this.index = 0;
    this.actionIndex = 0;
    this.nodes = new Map();
    this.rootId = null;
    this.selectedId = null;
    this.wrongId = null;
    this.view = { x: 0, y: 0, width: 640, height: 470 };
    this.panning = null;

    this.canvas.addEventListener("click", (event) => {
      const node = event.target.closest("[data-rbp-node]");
      if (!node) return;
      if (this.selectedId === node.dataset.rbpNode) {
        this.recolorSelected();
        return;
      }
      this.selectedId = node.dataset.rbpNode;
      this.feedback.textContent = `Pivote seleccionado: ${this.nodes.get(this.selectedId).value}.`;
      this.feedback.className = "traversal-feedback";
      this.render();
    });
    screen.querySelector("[data-rbp-left]").addEventListener("click", () => this.attempt("left"));
    screen.querySelector("[data-rbp-right]").addEventListener("click", () => this.attempt("right"));
    screen.querySelector("[data-rbp-recolor]").addEventListener("click", () => this.attempt("recolor"));
    screen.querySelector("[data-rbp-reset]").addEventListener("click", () => this.load());
    screen.querySelector("[data-rbp-next]").addEventListener("click", () => this.next());
    this.canvas.addEventListener("wheel", (event) => this.zoom(event), { passive: false });
    this.canvas.addEventListener("pointerdown", (event) => this.beginPan(event));
    this.canvas.addEventListener("auxclick", (event) => event.preventDefault());
    window.addEventListener("pointermove", (event) => this.movePan(event));
    window.addEventListener("pointerup", () => this.endPan());
    window.addEventListener("pointercancel", () => this.endPan());
  }

  get exercise() { return RB_EXERCISES[this.index]; }

  open() { this.index = 0; this.load(); }

  load() {
    this.nodes.clear(); this.rootId = null; this.selectedId = null; this.wrongId = null; this.actionIndex = 0;
    this.exercise.values.forEach((value) => this.insertRaw(value, this.exercise.colors[value]));
    this.screen.querySelector("[data-rbp-counter]").textContent = `${this.index + 1} / ${RB_EXERCISES.length}`;
    this.screen.querySelector("[data-rbp-progress]").style.width = `${((this.index + 1) / RB_EXERCISES.length) * 100}%`;
    this.screen.querySelector("[data-rbp-level]").textContent = this.exercise.label;
    this.screen.querySelector("[data-rbp-title]").textContent = this.exercise.title;
    this.feedback.textContent = this.exercise.actions[0][0] === "recolor" ? "Observá padre, tío y abuelo. Aplicá el recoloreo automático." : "Seleccioná el pivote correcto y elegí la rotación.";
    this.feedback.className = "traversal-feedback";
    this.screen.querySelector("[data-rbp-next]").hidden = true;
    this.screen.querySelector("[data-rbp-recolor]").hidden = this.exercise.actions[0][0] !== "recolor";
    this.screen.querySelector("[data-rbp-left]").hidden = this.exercise.actions[0][0] === "recolor";
    this.screen.querySelector("[data-rbp-right]").hidden = this.exercise.actions[0][0] === "recolor";
    this.render();
  }

  insertRaw(value, color) {
    const id = `p${value}`;
    const node = { id, value, color, left: null, right: null };
    this.nodes.set(id, node);
    if (!this.rootId) return void (this.rootId = id);
    let current = this.nodes.get(this.rootId);
    while (current) {
      const side = value < current.value ? "left" : "right";
      if (!current[side]) return void (current[side] = id);
      current = this.nodes.get(current[side]);
    }
  }

  attempt(operation) {
    const expected = this.exercise.actions[this.actionIndex];
    const selectedValue = this.nodes.get(this.selectedId)?.value;
    if (operation !== expected[0] || (operation !== "recolor" && selectedValue !== expected[1])) {
      this.wrongId = this.selectedId;
      this.feedback.textContent = operation === "recolor" ? "Este caso necesita una rotación." : "Ese pivote o esa dirección no corresponden al caso.";
      this.feedback.className = "traversal-feedback is-error";
      this.render();
      window.setTimeout(() => { this.wrongId = null; this.render(); }, 800);
      return;
    }
    if (operation !== "recolor") this.rotate(this.selectedId, operation);
    this.actionIndex += 1;
    if (this.actionIndex < this.exercise.actions.length) {
      const next = this.exercise.actions[this.actionIndex];
      this.selectedId = null;
      this.feedback.textContent = `Bien. Ahora seleccioná ${next[1]} y aplicá rotación ${next[0] === "left" ? "izquierda" : "derecha"}.`;
      this.feedback.className = "traversal-feedback is-success";
      this.render();
      return;
    }
    for (const node of this.nodes.values()) node.color = this.exercise.final[node.value] ?? node.color;
    this.completeExercise();
  }

  recolorSelected() {
    const node = this.nodes.get(this.selectedId);
    if (!node) return;
    node.color = node.color === "red" ? "black" : "red";
    const expected = this.exercise.actions[this.actionIndex];
    if (expected?.[0] === "recolor") {
      const errors = this.colorErrors();
      if (errors.length === 0) {
        this.actionIndex += 1;
        this.completeExercise();
        return;
      }
      this.wrongId = node.id;
      const error = errors[0];
      this.feedback.textContent = `Árbol rojinegro inconsistente: ${error}`;
      this.feedback.className = "traversal-feedback is-error";
    } else {
      this.wrongId = node.id;
      const error = this.colorErrors()[0] ?? "El recoloreo no corresponde a este paso.";
      this.feedback.textContent = `Árbol rojinegro inconsistente: ${error}`;
      this.feedback.className = "traversal-feedback is-error";
    }
    this.render();
  }

  colorErrors() {
    const errors = [];
    if (this.rootId && this.nodes.get(this.rootId).color !== "black") errors.push("la raíz dejó de ser negra.");
    for (const node of this.nodes.values()) {
      if (node.color !== "red") continue;
      if ((node.left && this.nodes.get(node.left).color === "red") || (node.right && this.nodes.get(node.right).color === "red")) {
        errors.push(`el nodo rojo ${node.value} tiene un hijo rojo.`);
        break;
      }
    }
    const blackHeight = (id) => {
      if (!id) return 1;
      const current = this.nodes.get(id);
      const left = blackHeight(current.left);
      const right = blackHeight(current.right);
      if (left < 0 || right < 0 || left !== right) return -1;
      return left + (current.color === "black" ? 1 : 0);
    };
    if (blackHeight(this.rootId) < 0) errors.push("los caminos no tienen la misma altura negra.");
    return errors;
  }

  completeExercise() {
    this.selectedId = null;
    this.wrongId = null;
    this.feedback.textContent = `¡Correcto! ${this.exercise.explanation}`;
    this.feedback.className = "traversal-feedback is-success";
    const next = this.screen.querySelector("[data-rbp-next]");
    next.hidden = false;
    next.textContent = this.index === RB_EXERCISES.length - 1 ? "Volver al módulo" : "Siguiente ejercicio →";
    this.render();
  }

  parentOf(id) {
    for (const node of this.nodes.values()) {
      if (node.left === id) return { node, side: "left" };
      if (node.right === id) return { node, side: "right" };
    }
    return null;
  }

  rotate(pivotId, direction) {
    const pivot = this.nodes.get(pivotId);
    const childId = direction === "left" ? pivot.right : pivot.left;
    const child = this.nodes.get(childId);
    const parent = this.parentOf(pivotId);
    if (direction === "left") { pivot.right = child.left; child.left = pivotId; }
    else { pivot.left = child.right; child.right = pivotId; }
    if (parent) parent.node[parent.side] = childId;
    else this.rootId = childId;
  }

  next() {
    if (this.index === RB_EXERCISES.length - 1) return void this.screen.dispatchEvent(new CustomEvent("rbp:exit", { bubbles: true }));
    this.index += 1; this.load();
  }

  layout() {
    const order = []; const depths = new Map();
    const walk = (id, depth) => { if (!id) return; const node = this.nodes.get(id); walk(node.left, depth + 1); order.push(id); depths.set(id, depth); walk(node.right, depth + 1); };
    walk(this.rootId, 0);
    return new Map(order.map((id, index) => [id, { x: order.length === 1 ? 320 : 55 + index * (530 / (order.length - 1)), y: 65 + depths.get(id) * 125 }]));
  }

  render() {
    const positions = this.layout();
    const svg = svgElement("svg", { viewBox: `${this.view.x} ${this.view.y} ${this.view.width} ${this.view.height}`, role: "img", "aria-label": "Práctica guiada de rojinegros" });
    for (const node of this.nodes.values()) {
      const from = positions.get(node.id);
      for (const childId of [node.left, node.right]) if (childId) { const to = positions.get(childId); svg.appendChild(svgElement("line", { x1: from.x, y1: from.y, x2: to.x, y2: to.y, class: "tree-editor-edge" })); }
    }
    for (const node of this.nodes.values()) {
      const point = positions.get(node.id);
      const group = svgElement("g", { class: `rb-lab-node is-${node.color}${node.id === this.selectedId ? " is-selected" : ""}${node.id === this.wrongId ? " is-wrong" : ""}`, transform: `translate(${point.x} ${point.y})`, "data-rbp-node": node.id });
      group.appendChild(svgElement("circle", { r: "31" }));
      const text = svgElement("text", { "text-anchor": "middle", dy: "0.35em" }); text.textContent = node.value; group.appendChild(text); svg.appendChild(group);
    }
    this.canvas.replaceChildren(svg);
  }

  zoom(event) {
    event.preventDefault(); const bounds = this.canvas.getBoundingClientRect(); const rx = (event.clientX - bounds.left) / bounds.width; const ry = (event.clientY - bounds.top) / bounds.height; const factor = event.deltaY < 0 ? .86 : 1 / .86; const width = Math.max(180, Math.min(2800, this.view.width * factor)); const height = width * (470 / 640); const wx = this.view.x + rx * this.view.width; const wy = this.view.y + ry * this.view.height; this.view = { x: wx - rx * width, y: wy - ry * height, width, height }; this.render();
  }
  beginPan(event) { if (event.button !== 1) return; event.preventDefault(); this.panning = { clientX: event.clientX, clientY: event.clientY, x: this.view.x, y: this.view.y }; this.canvas.classList.add("is-panning"); }
  movePan(event) { if (!this.panning) return; const bounds = this.canvas.getBoundingClientRect(); this.view.x = this.panning.x - ((event.clientX - this.panning.clientX) / bounds.width) * this.view.width; this.view.y = this.panning.y - ((event.clientY - this.panning.clientY) / bounds.height) * this.view.height; this.render(); }
  endPan() { this.panning = null; this.canvas.classList.remove("is-panning"); }
}
