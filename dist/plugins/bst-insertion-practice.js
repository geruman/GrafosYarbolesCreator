const SVG_NS = "http://www.w3.org/2000/svg";

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function makeTree(root, rows) {
  return {
    root,
    nodes: rows.map(([id, value, left = null, right = null]) => ({ id, value, left, right })),
  };
}

const LEVELS = [
  {
    kind: "guided",
    label: "Nivel 1 · Guiado",
    title: "Encontrá la posición correcta",
    instruction: "Elegí uno de los espacios con +. Si te equivocás, la posición se marca en rojo y podés volver a intentar.",
    values: [35],
    tree: makeTree("n50", [
      ["n50", 50, "n30", "n70"], ["n30", 30, "n20", "n40"], ["n70", 70, "n60", "n80"],
      ["n20", 20], ["n40", 40], ["n60", 60], ["n80", 80],
    ]),
  },
  {
    kind: "reset",
    label: "Nivel 2 · Sin errores",
    title: "Insertá dos valores seguidos",
    instruction: "Un error reinicia las inserciones del ejercicio. Compará desde la raíz antes de elegir cada posición.",
    values: [25, 55],
    tree: makeTree("n40", [
      ["n40", 40, "n20", "n60"], ["n20", 20, "n10", "n30"], ["n60", 60, "n50", "n70"],
      ["n10", 10], ["n30", 30], ["n50", 50], ["n70", 70],
    ]),
  },
  {
    kind: "free",
    label: "Nivel 3 · Comprobación final",
    title: "Construí las inserciones sin ayuda",
    instruction: "Ubicá todos los valores libremente. Al terminar, usá Comprobar para validar el árbol completo.",
    values: [5, 30, 65, 80],
    tree: makeTree("n50", [
      ["n50", 50, "n25", "n75"], ["n25", 25, "n10", "n35"], ["n75", 75, "n60", "n90"],
      ["n10", 10], ["n35", 35], ["n60", 60], ["n90", 90],
    ]),
  },
];

export class BstInsertionPractice {
  constructor(screen) {
    this.screen = screen;
    this.canvas = screen.querySelector("#bst-practice-tree");
    this.feedback = screen.querySelector("[data-bst-feedback]");
    this.sequenceInput = screen.querySelector("[data-bst-sequence]");
    this.resetButton = screen.querySelector("[data-bst-reset]");
    this.checkButton = screen.querySelector("[data-bst-check]");
    this.nextButton = screen.querySelector("[data-bst-next]");
    this.config = screen.querySelector("[data-bst-config]");
    this.sizeSelect = screen.querySelector("[data-bst-size]");
    this.correctionSelect = screen.querySelector("[data-bst-correction]");
    this.generateButton = screen.querySelector("[data-bst-generate]");
    this.mode = "fixed";
    this.dynamicLevel = null;
    this.levelIndex = 0;
    this.valueIndex = 0;
    this.nodes = new Map();
    this.rootId = null;
    this.records = [];
    this.wrongSlot = null;
    this.wrongNodes = new Set();
    this.locked = false;
    this.view = null;
    this.panning = null;

    this.canvas.addEventListener("click", (event) => {
      const slot = event.target.closest("[data-bst-slot]");
      if (slot) this.chooseSlot(slot.dataset.parent, slot.dataset.side);
    });
    this.canvas.addEventListener("wheel", (event) => this.zoom(event), { passive: false });
    this.canvas.addEventListener("pointerdown", (event) => this.beginPan(event));
    this.canvas.addEventListener("auxclick", (event) => event.preventDefault());
    window.addEventListener("pointermove", (event) => this.movePan(event));
    window.addEventListener("pointerup", () => this.endPan());
    window.addEventListener("pointercancel", () => this.endPan());
    this.resetButton.addEventListener("click", () => this.loadLevel());
    this.checkButton.addEventListener("click", () => this.checkFree());
    this.nextButton.addEventListener("click", () => this.nextLevel());
    this.generateButton.addEventListener("click", () => this.generateRandomLevel());
  }

  get level() {
    return this.mode === "random" ? this.dynamicLevel : LEVELS[this.levelIndex];
  }

  open(mode = "fixed") {
    this.mode = mode;
    this.levelIndex = 0;
    const random = mode === "random";
    this.config.hidden = !random;
    this.screen.querySelector("[data-bst-kicker]").textContent = random ? "M3.P2 · Práctica personalizada" : "M3.P1 · Práctica de inserción";
    this.screen.querySelector("[data-bst-name]").textContent = random ? "Inserción ABB aleatoria" : "Árbol binario de búsqueda";
    if (random) {
      this.generateRandomLevel();
      return;
    }
    this.loadLevel();
  }

  loadLevel() {
    const level = this.level;
    this.nodes = new Map(level.tree.nodes.map((node) => [node.id, { ...node }]));
    this.rootId = level.tree.root;
    this.valueIndex = 0;
    this.records = [];
    this.wrongSlot = null;
    this.wrongNodes.clear();
    this.locked = false;
    this.view = null;
    this.screen.querySelector("[data-bst-counter]").textContent = this.mode === "random" ? `${level.tree.nodes.length} nodos` : `${this.levelIndex + 1} / ${LEVELS.length}`;
    this.screen.querySelector("[data-bst-progress]").style.width = this.mode === "random" ? "100%" : `${((this.levelIndex + 1) / LEVELS.length) * 100}%`;
    this.screen.querySelector("[data-bst-level]").textContent = level.label;
    this.screen.querySelector("[data-bst-title]").textContent = level.title;
    this.screen.querySelector("[data-bst-instruction]").textContent = level.instruction;
    this.feedback.textContent = level.kind === "free" ? `Ubicá los ${level.values.length} valores y comprobá al final.` : `Tenés que insertar ${level.values.length} valor${level.values.length === 1 ? "" : "es"}. Compará desde la raíz.`;
    this.feedback.className = "traversal-feedback";
    this.resetButton.hidden = false;
    this.checkButton.hidden = level.kind !== "free";
    this.nextButton.hidden = true;
    this.nextButton.textContent = this.mode === "random" ? "Otro ejercicio →" : "Siguiente ejercicio →";
    this.render();
  }

  currentValue() {
    return this.level.values[this.valueIndex];
  }

  expectedSlot(value) {
    let current = this.nodes.get(this.rootId);
    while (current) {
      const side = value < current.value ? "left" : "right";
      if (!current[side]) return { parent: current.id, side };
      current = this.nodes.get(current[side]);
    }
    return null;
  }

  chooseSlot(parentId, side) {
    if (this.locked || this.valueIndex >= this.level.values.length) return;
    const value = this.currentValue();
    const expected = this.expectedSlot(value);
    const chosenKey = `${parentId}:${side}`;
    const correct = expected.parent === parentId && expected.side === side;

    if (this.level.kind !== "free" && !correct) {
      const previewId = `wrong-preview-${this.levelIndex}`;
      const previewParent = this.nodes.get(parentId);
      previewParent[side] = previewId;
      this.nodes.set(previewId, { id: previewId, value, left: null, right: null, inserted: true });
      this.wrongNodes.add(previewId);
      this.feedback.textContent = this.level.kind === "reset"
        ? `${value} quedó en una posición incorrecta. El ejercicio se reiniciará.`
        : `${value} quedó en una posición incorrecta. Mirá el nodo rojo y volvé a comparar desde la raíz.`;
      this.feedback.className = "traversal-feedback is-error";
      this.locked = true;
      this.render();
      window.setTimeout(() => {
        if (this.level.kind === "reset") this.loadLevel();
        else {
          if (previewParent[side] === previewId) previewParent[side] = null;
          this.nodes.delete(previewId);
          this.wrongNodes.delete(previewId);
          this.wrongSlot = null;
          this.locked = false;
          this.render();
        }
      }, 1000);
      return;
    }

    const id = `inserted-${this.levelIndex}-${this.valueIndex}`;
    const parent = this.nodes.get(parentId);
    parent[side] = id;
    this.nodes.set(id, { id, value, left: null, right: null, inserted: true });
    this.records.push(`${value} → ${side === "left" ? "izquierda" : "derecha"} de ${parent.value}`);
    this.valueIndex += 1;
    this.feedback.textContent = this.level.kind === "free" ? "Posición registrada. Continuá con el siguiente valor." : `Bien: ${value} quedó correctamente ubicado.`;
    this.feedback.className = "traversal-feedback is-success";
    this.render();

    if (this.valueIndex === this.level.values.length && this.level.kind !== "free") this.completeLevel();
  }

  checkFree() {
    if (this.valueIndex < this.level.values.length) {
      this.feedback.textContent = `Todavía faltan ${this.level.values.length - this.valueIndex} valores por insertar.`;
      this.feedback.className = "traversal-feedback is-error";
      return;
    }
    this.wrongNodes.clear();
    for (const node of this.nodes.values()) {
      if (!node.inserted) continue;
      const relation = this.findParent(node.id);
      const expected = this.expectedRelationInCorrectTree(node.value);
      if (!relation || relation.parentValue !== expected.parentValue || relation.side !== expected.side) this.wrongNodes.add(node.id);
    }
    if (this.wrongNodes.size) {
      this.feedback.textContent = "Hay inserciones fuera de lugar. Los nodos incorrectos quedaron marcados en rojo.";
      this.feedback.className = "traversal-feedback is-error";
      this.render();
      return;
    }
    this.feedback.textContent = "¡Todas las inserciones respetan el orden del ABB!";
    this.feedback.className = "traversal-feedback is-success";
    this.locked = true;
    this.checkButton.hidden = true;
    this.resetButton.hidden = true;
    this.nextButton.hidden = false;
    this.nextButton.textContent = this.mode === "random" ? "Otro ejercicio →" : "Volver al módulo";
    this.render();
  }

  expectedRelationInCorrectTree(targetValue) {
    const nodes = new Map(this.level.tree.nodes.map((node) => [node.id, { ...node }]));
    const rootId = this.level.tree.root;
    for (const value of this.level.values) {
      let current = nodes.get(rootId);
      while (current) {
        const side = value < current.value ? "left" : "right";
        if (!current[side]) {
          const id = `expected-${value}`;
          current[side] = id;
          nodes.set(id, { id, value, left: null, right: null });
          if (value === targetValue) return { parentValue: current.value, side };
          break;
        }
        current = nodes.get(current[side]);
      }
    }
    return null;
  }

  findParent(childId) {
    for (const node of this.nodes.values()) {
      if (node.left === childId) return { parentValue: node.value, side: "left" };
      if (node.right === childId) return { parentValue: node.value, side: "right" };
    }
    return null;
  }

  completeLevel() {
    this.locked = true;
    this.feedback.textContent = "¡Ejercicio completado correctamente!";
    this.feedback.className = "traversal-feedback is-success";
    this.resetButton.hidden = true;
    this.nextButton.hidden = false;
    if (this.mode === "random") this.nextButton.textContent = "Otro ejercicio →";
    this.render();
  }

  nextLevel() {
    if (this.mode === "random") {
      this.generateRandomLevel();
      return;
    }
    if (this.levelIndex === LEVELS.length - 1) {
      this.screen.dispatchEvent(new CustomEvent("bst-practice:exit", { bubbles: true }));
      return;
    }
    this.levelIndex += 1;
    this.loadLevel();
  }

  generateRandomLevel() {
    const counts = { small: 7, medium: 11, large: 15, xlarge: 20 };
    const count = counts[this.sizeSelect.value] ?? 7;
    const kind = this.correctionSelect.value;
    const insertionCount = { small: 2, medium: 4, large: 6, xlarge: 8 }[this.sizeSelect.value] ?? 2;
    const pool = Array.from({ length: 90 }, (_, index) => index + 10);
    for (let index = pool.length - 1; index > 0; index -= 1) {
      const other = Math.floor(Math.random() * (index + 1));
      [pool[index], pool[other]] = [pool[other], pool[index]];
    }
    const baseValues = pool.slice(0, count).sort((a, b) => a - b);
    const values = pool.slice(count, count + insertionCount);
    const nodes = [];
    const build = (items) => {
      if (!items.length) return null;
      const center = Math.floor(items.length / 2);
      const variation = items.length > 4 ? Math.floor(Math.random() * 3) - 1 : 0;
      const middle = Math.max(0, Math.min(items.length - 1, center + variation));
      const value = items[middle];
      const id = `random-${value}`;
      const node = { id, value, left: null, right: null };
      nodes.push(node);
      node.left = build(items.slice(0, middle));
      node.right = build(items.slice(middle + 1));
      return id;
    };
    const root = build(baseValues);
    const descriptions = {
      guided: ["Corrección guiada", `Insertá ${insertionCount} valores con ayuda`, "El nodo incorrecto aparecerá en rojo y después podrás reintentar."],
      reset: ["Desafío sin errores", `Insertá ${insertionCount} valores seguidos`, "Una posición incorrecta muestra el nodo rojo y reinicia el ejercicio."],
      free: ["Comprobación final", `Insertá ${insertionCount} valores sin ayuda`, "Ubicá todos los valores y comprobá el árbol completo al terminar."],
    };
    const [label, title, instruction] = descriptions[kind];
    this.dynamicLevel = { kind, label, title, instruction, values, tree: { root, nodes } };
    this.loadLevel();
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
    const positions = new Map();
    order.forEach((id, index) => positions.set(id, {
      x: order.length === 1 ? 320 : 35 + index * (570 / (order.length - 1)),
      y: 45 + depths.get(id) * 105,
    }));
    return positions;
  }

  applyView() {
    const svg = this.canvas.querySelector("svg");
    if (svg && this.view) svg.setAttribute("viewBox", `${this.view.x} ${this.view.y} ${this.view.width} ${this.view.height}`);
  }

  zoom(event) {
    const svg = this.canvas.querySelector("svg");
    if (!svg || !this.view) return;
    event.preventDefault();
    const bounds = svg.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const rx = (event.clientX - bounds.left) / bounds.width;
    const ry = (event.clientY - bounds.top) / bounds.height;
    const factor = event.deltaY < 0 ? 0.86 : 1 / 0.86;
    const width = Math.max(180, Math.min(3200, this.view.width * factor));
    const scale = width / this.view.width;
    const height = this.view.height * scale;
    const worldX = this.view.x + rx * this.view.width;
    const worldY = this.view.y + ry * this.view.height;
    this.view = { x: worldX - rx * width, y: worldY - ry * height, width, height };
    this.applyView();
  }

  beginPan(event) {
    if (event.button !== 1 || !this.view) return;
    event.preventDefault();
    this.panning = { clientX: event.clientX, clientY: event.clientY, x: this.view.x, y: this.view.y };
    this.canvas.classList.add("is-panning");
  }

  movePan(event) {
    if (!this.panning || !this.view) return;
    const bounds = this.canvas.getBoundingClientRect();
    this.view.x = this.panning.x - ((event.clientX - this.panning.clientX) / bounds.width) * this.view.width;
    this.view.y = this.panning.y - ((event.clientY - this.panning.clientY) / bounds.height) * this.view.height;
    this.applyView();
  }

  endPan() {
    this.panning = null;
    this.canvas.classList.remove("is-panning");
  }

  render() {
    const positions = this.layout();
    const visualCount = Math.max(this.nodes.size, this.level.tree.nodes.length + this.level.values.length);
    const nodeRadius = visualCount > 22 ? 10 : (visualCount > 17 ? 13 : (visualCount > 12 ? 17 : 27));
    const nodeFontSize = visualCount > 22 ? 9 : (visualCount > 17 ? 11 : (visualCount > 12 ? 13 : 16));
    const slotRadius = Math.max(7, Math.round(nodeRadius * 0.62));
    const slotOffsetX = nodeRadius + 10;
    const slotOffsetY = nodeRadius + 42;
    this.canvas.replaceChildren();
    const viewHeight = Math.max(470, ...[...positions.values()].map((position) => position.y + 105));
    if (!this.view) this.view = { x: 0, y: 0, width: 640, height: viewHeight };
    const svg = svgElement("svg", { viewBox: `${this.view.x} ${this.view.y} ${this.view.width} ${this.view.height}`, role: "img", "aria-label": "Ejercicio de inserción en ABB" });

    for (const node of this.nodes.values()) {
      const from = positions.get(node.id);
      for (const childId of [node.left, node.right]) {
        if (!childId) continue;
        const to = positions.get(childId);
        svg.appendChild(svgElement("line", { x1: from.x, y1: from.y, x2: to.x, y2: to.y, class: "bst-practice-edge" }));
      }
    }

    for (const node of this.nodes.values()) {
      const position = positions.get(node.id);
      const group = svgElement("g", { class: `bst-practice-node${node.inserted ? " is-inserted" : ""}${this.wrongNodes.has(node.id) ? " is-wrong" : ""}`, transform: `translate(${position.x} ${position.y})` });
      group.appendChild(svgElement("circle", { r: String(nodeRadius) }));
      const text = svgElement("text", { "text-anchor": "middle", dy: "0.35em" });
      text.setAttribute("style", `font-size:${nodeFontSize}px`);
      text.textContent = node.value;
      group.appendChild(text);
      svg.appendChild(group);
    }

    if (!this.locked || this.level.kind === "free") {
      for (const node of this.nodes.values()) {
        const position = positions.get(node.id);
        for (const side of ["left", "right"]) {
          if (node[side]) continue;
          const x = position.x + (side === "left" ? -slotOffsetX : slotOffsetX);
          const y = position.y + slotOffsetY;
          const key = `${node.id}:${side}`;
          svg.appendChild(svgElement("line", { x1: position.x, y1: position.y + nodeRadius, x2: x, y2: y - slotRadius, class: "bst-slot-edge" }));
          const slot = svgElement("g", { class: `bst-slot${this.wrongSlot === key ? " is-wrong" : ""}`, transform: `translate(${x} ${y})`, "data-bst-slot": key, "data-parent": node.id, "data-side": side });
          slot.appendChild(svgElement("circle", { r: String(slotRadius) }));
          const plus = svgElement("text", { "text-anchor": "middle", dy: "0.35em" });
          plus.setAttribute("style", `font-size:${Math.max(12, slotRadius * 1.3)}px`);
          plus.textContent = "+";
          slot.appendChild(plus);
          svg.appendChild(slot);
        }
      }
    }
    this.canvas.appendChild(svg);
    const value = this.currentValue();
    this.screen.querySelector("[data-bst-value]").textContent = value ?? "Listo";
    this.sequenceInput.value = this.records.join(" · ");
  }
}
