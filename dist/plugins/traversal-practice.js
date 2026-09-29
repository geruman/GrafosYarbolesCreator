import { GraphView } from "./graph-view.js?v=32";

const PREORDER_LEVELS = [
  {
    kind: "guided",
    label: "Nivel 1 · Guiado",
    title: "Elegí el siguiente nodo",
    instruction: "Si te equivocás, el nodo se marcará en rojo y podrás volver a intentar. El recorrido solo avanza con el nodo correcto.",
    nodes: [
      { id: "a", label: "A", x: 320, y: 45 },
      { id: "b", label: "B", x: 180, y: 165 }, { id: "c", label: "C", x: 460, y: 165 },
      { id: "d", label: "D", x: 95, y: 335 }, { id: "e", label: "E", x: 255, y: 335 },
      { id: "f", label: "F", x: 460, y: 335 },
    ],
    edges: [["a", "b"], ["a", "c"], ["b", "d"], ["b", "e"], ["c", "f"]],
    answer: ["a", "b", "d", "e", "c", "f"],
  },
  {
    kind: "reset",
    label: "Nivel 2 · Sin errores",
    title: "Completá el recorrido de una vez",
    instruction: "Ahora, un clic incorrecto reinicia todo el recorrido. Observá bien cada subárbol antes de empezar.",
    nodes: [
      { id: "8", label: "8", x: 320, y: 35 },
      { id: "4", label: "4", x: 170, y: 145 }, { id: "12", label: "12", x: 475, y: 145 },
      { id: "2", label: "2", x: 90, y: 270 }, { id: "6", label: "6", x: 245, y: 270 },
      { id: "10", label: "10", x: 400, y: 270 }, { id: "14", label: "14", x: 555, y: 270 },
      { id: "1", label: "1", x: 45, y: 400 }, { id: "3", label: "3", x: 135, y: 400 },
      { id: "11", label: "11", x: 430, y: 400 },
    ],
    edges: [["8", "4"], ["8", "12"], ["4", "2"], ["4", "6"], ["12", "10"], ["12", "14"], ["2", "1"], ["2", "3"], ["10", "11"]],
    answer: ["8", "4", "2", "1", "3", "6", "12", "10", "11", "14"],
  },
  {
    kind: "free",
    label: "Nivel 3 · Comprobación final",
    title: "Armá el recorrido sin ayuda",
    instruction: "Podés elegir los nodos en el orden que quieras. Cuando termines, usá Comprobar para saber si el recorrido es correcto.",
    nodes: [
      { id: "m", label: "M", x: 320, y: 35 },
      { id: "f", label: "F", x: 165, y: 145 }, { id: "t", label: "T", x: 475, y: 145 },
      { id: "b", label: "B", x: 80, y: 275 }, { id: "h", label: "H", x: 245, y: 275 },
      { id: "r", label: "R", x: 400, y: 275 }, { id: "z", label: "Z", x: 560, y: 275 },
      { id: "g", label: "G", x: 205, y: 400 }, { id: "j", label: "J", x: 285, y: 400 },
      { id: "p", label: "P", x: 360, y: 400 },
    ],
    edges: [["m", "f"], ["m", "t"], ["f", "b"], ["f", "h"], ["t", "r"], ["t", "z"], ["h", "g"], ["h", "j"], ["r", "p"]],
    answer: ["m", "f", "b", "h", "g", "j", "t", "r", "p", "z"],
  },
];

const INORDER_LEVELS = [
  {
    ...PREORDER_LEVELS[0],
    traversal: "inorder",
    label: "Nivel 1 · Guiado",
    title: "Elegí el siguiente nodo en inorden",
    instruction: "Recorré primero el subárbol izquierdo, después la raíz y finalmente el subárbol derecho. Un error se marca sin borrar tus aciertos.",
    nodes: PREORDER_LEVELS[0].nodes.map((node) => node.id === "f" ? { ...node, x: 390 } : { ...node }),
    answer: ["d", "b", "e", "a", "f", "c"],
  },
  {
    ...PREORDER_LEVELS[1],
    traversal: "inorder",
    label: "Nivel 2 · Sin errores",
    title: "Completá el inorden de una vez",
    instruction: "Cualquier nodo fuera de orden reinicia el intento. Terminá cada rama izquierda antes de visitar su raíz.",
    answer: ["1", "2", "3", "4", "6", "8", "10", "11", "12", "14"],
  },
  {
    ...PREORDER_LEVELS[2],
    traversal: "inorder",
    label: "Nivel 3 · Comprobación final",
    title: "Armá el inorden sin ayuda",
    instruction: "Elegí libremente todos los nodos. Cuando termines, usá Comprobar para revisar la secuencia completa.",
    answer: ["b", "f", "g", "h", "j", "m", "p", "r", "t", "z"],
  },
];

const POSTORDER_LEVELS = [
  {
    ...PREORDER_LEVELS[0],
    traversal: "postorder",
    label: "Nivel 1 · Guiado",
    title: "Elegí el siguiente nodo en posorden",
    instruction: "Recorré el subárbol izquierdo, luego el derecho y visitá la raíz al final. Un error se marca sin borrar tus aciertos.",
    nodes: PREORDER_LEVELS[0].nodes.map((node) => node.id === "f" ? { ...node, x: 390 } : { ...node }),
    answer: ["d", "e", "b", "f", "c", "a"],
  },
  {
    ...PREORDER_LEVELS[1],
    traversal: "postorder",
    label: "Nivel 2 · Sin errores",
    title: "Completá el posorden de una vez",
    instruction: "Cualquier nodo fuera de orden reinicia el intento. Cada raíz se visita después de completar sus dos ramas.",
    answer: ["1", "3", "2", "6", "4", "11", "10", "14", "12", "8"],
  },
  {
    ...PREORDER_LEVELS[2],
    traversal: "postorder",
    label: "Nivel 3 · Comprobación final",
    title: "Armá el posorden sin ayuda",
    instruction: "Elegí libremente todos los nodos. Cuando termines, usá Comprobar para revisar la secuencia completa.",
    answer: ["b", "g", "j", "h", "f", "p", "r", "z", "t", "m"],
  },
];

export class TraversalPractice {
  constructor(screen) {
    this.screen = screen;
    this.treeElement = screen.querySelector("#traversal-tree");
    this.graph = new GraphView(this.treeElement);
    this.sequenceInput = screen.querySelector("[data-traversal-sequence]");
    this.feedback = screen.querySelector("[data-traversal-feedback]");
    this.checkButton = screen.querySelector("[data-traversal-check]");
    this.nextButton = screen.querySelector("[data-traversal-next]");
    this.clearButton = screen.querySelector("[data-traversal-clear]");
    this.config = screen.querySelector("[data-traversal-config]");
    this.traversalSelect = screen.querySelector("[data-traversal-type]");
    this.sizeSelect = screen.querySelector("[data-traversal-size]");
    this.correctionSelect = screen.querySelector("[data-traversal-correction]");
    this.generateButton = screen.querySelector("[data-traversal-generate]");
    this.mode = "preorder";
    this.levels = PREORDER_LEVELS;
    this.levelIndex = 0;
    this.selected = [];
    this.wrongId = null;
    this.locked = false;

    this.treeElement.addEventListener("click", (event) => {
      const node = event.target.closest("[data-node]");
      if (node) this.selectNode(node.dataset.node);
    });
    this.clearButton.addEventListener("click", () => this.resetAttempt());
    this.checkButton.addEventListener("click", () => this.checkFreeAttempt());
    this.nextButton.addEventListener("click", () => this.nextLevel());
    this.generateButton.addEventListener("click", () => this.generateRandomLevel());
  }

  open(mode) {
    this.mode = mode;
    this.levelIndex = 0;
    const random = mode === "preorder-random";
    const inorder = mode === "inorder";
    const postorder = mode === "postorder";
    this.config.hidden = !random;
    this.screen.querySelector("[data-traversal-kicker]").textContent = random ? "M2.8 · Práctica" : (postorder ? "M2.7 · Práctica" : (inorder ? "M2.6 · Práctica" : "M2.5 · Práctica"));
    this.screen.querySelector("[data-traversal-name]").textContent = random ? "Recorridos aleatorios" : (postorder ? "Práctica de posorden" : (inorder ? "Práctica de inorden" : "Recorrido preorden"));
    if (random) {
      this.generateRandomLevel();
      return;
    }
    this.levels = postorder ? POSTORDER_LEVELS : (inorder ? INORDER_LEVELS : PREORDER_LEVELS);
    this.setTraversalRule(postorder ? "postorder" : (inorder ? "inorder" : "preorder"));
    this.showLevel();
  }

  get level() {
    return this.levels[this.levelIndex];
  }

  showLevel() {
    this.selected = [];
    this.wrongId = null;
    this.locked = false;
    const level = this.level;
    this.screen.querySelector("[data-traversal-counter]").textContent = this.mode === "preorder-random" ? `${level.nodes.length} nodos` : `${this.levelIndex + 1} / ${this.levels.length}`;
    this.screen.querySelector("[data-traversal-progress]").style.width = `${((this.levelIndex + 1) / this.levels.length) * 100}%`;
    this.screen.querySelector("[data-traversal-level]").textContent = level.label;
    this.screen.querySelector("[data-traversal-title]").textContent = level.title;
    this.screen.querySelector("[data-traversal-instruction]").textContent = level.instruction;
    this.feedback.textContent = level.kind === "free" ? "Elegí todos los nodos y después comprobá." : "Elegí el primer nodo del recorrido.";
    this.feedback.className = "traversal-feedback";
    this.checkButton.hidden = level.kind !== "free";
    this.nextButton.hidden = true;
    this.nextButton.textContent = "Siguiente árbol →";
    this.clearButton.hidden = false;
    this.updateView();
  }

  selectNode(id) {
    if (this.locked || this.selected.includes(id)) return;
    const level = this.level;
    if (level.kind === "free") {
      if (this.selected.length >= level.answer.length) return;
      this.selected.push(id);
      this.feedback.textContent = "Secuencia registrada. Podés comprobarla cuando estén todos los nodos.";
      this.feedback.className = "traversal-feedback";
      this.updateView();
      return;
    }

    const expected = level.answer[this.selected.length];
    if (id === expected) {
      this.selected.push(id);
      this.feedback.textContent = `Bien: ${this.labelFor(id)} era el siguiente nodo.`;
      this.feedback.className = "traversal-feedback is-success";
      this.updateView();
      if (this.selected.length === level.answer.length) this.completeLevel();
      return;
    }

    this.wrongId = id;
    this.feedback.textContent = level.kind === "reset"
      ? `Ese nodo no sigue el recorrido. El intento comienza nuevamente.`
      : `Todavía no corresponde visitar ${this.labelFor(id)}. Buscá el siguiente nodo.`;
    this.feedback.className = "traversal-feedback is-error";
    this.locked = true;
    this.updateView();
    window.setTimeout(() => {
      if (level.kind === "reset") this.selected = [];
      this.wrongId = null;
      this.locked = false;
      this.updateView();
    }, 700);
  }

  checkFreeAttempt() {
    const level = this.level;
    if (this.selected.length !== level.answer.length) {
      this.feedback.textContent = `Todavía faltan ${level.answer.length - this.selected.length} nodos.`;
      this.feedback.className = "traversal-feedback is-error";
      return;
    }
    const mismatch = this.selected.findIndex((id, index) => id !== level.answer[index]);
    if (mismatch !== -1) {
      this.wrongId = this.selected[mismatch];
      this.feedback.textContent = `El primer error está en la posición ${mismatch + 1}. Revisá el recorrido o empezá de nuevo.`;
      this.feedback.className = "traversal-feedback is-error";
      this.updateView();
      return;
    }
    this.feedback.textContent = "¡Recorrido completo y correcto!";
    this.feedback.className = "traversal-feedback is-success";
    this.checkButton.hidden = true;
    this.clearButton.hidden = true;
    this.nextButton.hidden = false;
    this.nextButton.textContent = this.mode === "preorder-random" ? "Otro árbol →" : "Volver al módulo";
    this.locked = true;
    this.updateView();
  }

  completeLevel() {
    this.locked = true;
    this.feedback.textContent = "¡Árbol completado correctamente!";
    this.feedback.className = "traversal-feedback is-success";
    this.clearButton.hidden = true;
    this.nextButton.hidden = false;
    if (this.mode === "preorder-random") this.nextButton.textContent = "Otro árbol →";
  }

  nextLevel() {
    if (this.mode === "preorder-random") {
      this.generateRandomLevel();
      return;
    }
    if (this.levelIndex === this.levels.length - 1) {
      this.screen.dispatchEvent(new CustomEvent("traversal:exit", { bubbles: true }));
      return;
    }
    this.levelIndex += 1;
    this.nextButton.textContent = "Siguiente árbol →";
    this.showLevel();
  }

  resetAttempt() {
    this.selected = [];
    this.wrongId = null;
    this.locked = false;
    this.feedback.textContent = this.level.kind === "free" ? "Intento limpio. Elegí nuevamente." : "Intento reiniciado. Elegí el primer nodo.";
    this.feedback.className = "traversal-feedback";
    this.nextButton.hidden = true;
    this.checkButton.hidden = this.level.kind !== "free";
    this.updateView();
  }

  generateRandomLevel() {
    const counts = { small: 7, medium: 11, large: 15, xlarge: 20 };
    const count = counts[this.sizeSelect.value] ?? 7;
    const kind = this.correctionSelect.value;
    const traversal = this.traversalSelect.value;
    const tree = this.buildRandomTree(count, traversal);
    const descriptions = {
      guided: ["Corrección guiada", "Elegí el siguiente nodo", "Un error se marca en rojo, pero conserva lo que ya resolviste."],
      reset: ["Desafío sin errores", "Completalo de una vez", "Si elegís un nodo incorrecto, el recorrido vuelve a comenzar."],
      free: ["Comprobación al final", "Resolvelo sin ayuda", "Elegí todos los nodos libremente y luego usá Comprobar."],
    };
    const [label, title, instruction] = descriptions[kind];
    const traversalNames = { preorder: "preorden", inorder: "inorden", postorder: "posorden" };
    this.levels = [{ kind, label: `${label} · ${traversalNames[traversal]}`, title, instruction, traversal, ...tree }];
    this.levelIndex = 0;
    this.setTraversalRule(traversal);
    this.showLevel();
  }

  buildRandomTree(count, traversal) {
    const values = Array.from({ length: 90 }, (_, index) => index + 10);
    for (let index = values.length - 1; index > 0; index -= 1) {
      const other = Math.floor(Math.random() * (index + 1));
      [values[index], values[other]] = [values[other], values[index]];
    }
    const raw = [{ id: "n0", label: String(values[0]), depth: 0, left: null, right: null }];
    const maxDepth = count > 15 ? 4 : 3;
    for (let index = 1; index < count; index += 1) {
      const candidates = raw.filter((node) => node.depth < maxDepth && (!node.left || !node.right));
      const parent = candidates[Math.floor(Math.random() * candidates.length)];
      const freeSides = ["left", "right"].filter((side) => !parent[side]);
      const side = freeSides[Math.floor(Math.random() * freeSides.length)];
      const child = { id: `n${index}`, label: String(values[index]), depth: parent.depth + 1, left: null, right: null };
      raw.push(child);
      parent[side] = child.id;
    }

    const byId = new Map(raw.map((node) => [node.id, node]));
    const inorder = [];
    const walkInorder = (id) => {
      if (!id) return;
      const node = byId.get(id);
      walkInorder(node.left);
      inorder.push(id);
      walkInorder(node.right);
    };
    walkInorder("n0");
    const xById = new Map(inorder.map((id, index) => [id, 42 + index * (556 / Math.max(1, count - 1))]));
    const radius = count > 15 ? 14 : (count >= 15 ? 19 : (count >= 11 ? 24 : 35));
    const fontSize = count > 15 ? 11 : (count >= 15 ? 13 : (count >= 11 ? 15 : 18));
    const yStep = maxDepth === 4 ? 92 : 118;
    const nodes = raw.map((node) => ({ id: node.id, label: node.label, x: xById.get(node.id), y: 35 + node.depth * yStep, radius, fontSize }));
    const edges = raw.flatMap((node) => [node.left, node.right].filter(Boolean).map((child) => [node.id, child]));
    const answer = [];
    const walk = (id) => {
      if (!id) return;
      const node = byId.get(id);
      if (traversal === "preorder") answer.push(id);
      walk(node.left);
      if (traversal === "inorder") answer.push(id);
      walk(node.right);
      if (traversal === "postorder") answer.push(id);
    };
    walk("n0");
    return { nodes, edges, answer };
  }

  setTraversalRule(traversal) {
    const rules = {
      preorder: ["Regla de preorden", "Raíz → Izquierda → Derecha"],
      inorder: ["Regla de inorden", "Izquierda → Raíz → Derecha"],
      postorder: ["Regla de posorden", "Izquierda → Derecha → Raíz"],
    };
    const [name, rule] = rules[traversal];
    this.screen.querySelector("[data-traversal-rule-name]").textContent = name;
    this.screen.querySelector("[data-traversal-rule]").textContent = rule;
  }

  labelFor(id) {
    return this.level.nodes.find((node) => node.id === id)?.label ?? id;
  }

  updateView() {
    const model = {
      label: `Árbol para practicar recorrido ${this.level.traversal ?? "preorden"}`,
      directed: false,
      nodes: this.level.nodes.map((node) => ({
        ...node,
        state: node.id === this.wrongId ? "wrong" : (this.selected.includes(node.id) ? "visited" : undefined),
        badge: this.selected.includes(node.id) ? this.selected.indexOf(node.id) + 1 : undefined,
      })),
      edges: this.level.edges,
    };
    this.graph.render(model, "none");
    this.sequenceInput.value = this.selected.map((id) => this.labelFor(id)).join(" → ");
  }
}
