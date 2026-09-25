import { GraphEditor } from "./graph-editor.js?v=6";

const exercises = [
  {
    title: "Construí un grafo no dirigido",
    instruction: "Creá 4 vértices y conectá A–B, A–C, B–D y C–D.",
    type: "undirected",
    validate(editor) {
      const wanted = ["A-B", "A-C", "B-D", "C-D"];
      return exactGraph(editor, 4, wanted, false);
    },
    hint: "Necesitás 4 vértices y exactamente 4 aristas.",
  },
  {
    title: "Dibujá las direcciones",
    instruction: "Creá 3 vértices y los arcos A→B, B→C y A→C.",
    type: "directed",
    validate(editor) {
      return exactGraph(editor, 3, ["A>B", "B>C", "A>C"], true);
    },
    hint: "Al conectar, elegí primero el origen y después el destino.",
  },
  {
    title: "Construí un grafo sencillo",
    instruction: "Creá un grafo sencillo conectado con 5 vértices y 6 aristas.",
    type: "simple",
    validate(editor) {
      return editor.nodes.length === 5 && editor.edges.length === 6 && isConnected(editor);
    },
    hint: "Todos los vértices deben quedar comunicados, sin lazos ni aristas repetidas.",
  },
];

function exactGraph(editor, nodeCount, wanted, directed) {
  if (editor.nodes.length !== nodeCount || editor.edges.length !== wanted.length) return false;
  const labels = new Map(editor.nodes.map((node) => [node.id, node.label]));
  const actual = editor.edges.map((edge) => {
    const from = labels.get(edge.from);
    const to = labels.get(edge.to);
    return directed ? `${from}>${to}` : [from, to].sort().join("-");
  });
  return wanted.every((edge) => actual.includes(edge));
}

function isConnected(editor) {
  if (!editor.nodes.length) return false;
  const seen = new Set([editor.nodes[0].id]);
  const pending = [editor.nodes[0].id];
  while (pending.length) {
    const current = pending.pop();
    editor.edges.forEach((edge) => {
      const next = edge.from === current ? edge.to : edge.to === current ? edge.from : null;
      if (next && !seen.has(next)) {
        seen.add(next);
        pending.push(next);
      }
    });
  }
  return seen.size === editor.nodes.length;
}

export class GuidedExercises {
  constructor(screen) {
    this.screen = screen;
    this.index = 0;
    this.completed = new Set();
    this.editor = new GraphEditor(screen, {
      editorSelector: "#exercise-editor",
      countSelector: "[data-exercise-live]",
      type: exercises[0].type,
      onChange: () => this.updateStatus(),
    });
    this.checkButton = screen.querySelector("[data-exercise-check]");
    this.nextButton = screen.querySelector("[data-exercise-next]");
    this.checkButton.addEventListener("click", () => this.check());
    this.nextButton.addEventListener("click", () => this.next());
    this.load(0);
  }

  open() {
    this.load(this.index);
  }

  load(index) {
    this.index = index;
    const exercise = exercises[index];
    this.editor.type = exercise.type;
    this.editor.nodes = [];
    this.editor.edges = [];
    this.editor.history = [];
    this.editor.nextNode = 0;
    this.editor.selectedNode = null;
    this.editor.setTool("node");
    this.screen.querySelector("[data-exercise-number]").textContent = `Ejercicio ${index + 1} de ${exercises.length}`;
    this.screen.querySelector("[data-exercise-title]").textContent = exercise.title;
    this.screen.querySelector("[data-exercise-instruction]").textContent = exercise.instruction;
    this.screen.querySelector("[data-exercise-type]").textContent = `Tipo: ${exercise.type === "directed" ? "dirigido" : exercise.type === "simple" ? "sencillo" : "no dirigido"}`;
    this.screen.querySelector("[data-exercise-progress]").style.width = `${((index + 1) / exercises.length) * 100}%`;
    this.screen.querySelector("[data-lab-feedback]").textContent = "Creá los vértices para comenzar.";
    this.checkButton.hidden = false;
    this.nextButton.hidden = true;
  }

  updateStatus() {
    if (!this.editor || !this.screen.querySelector("[data-exercise-live]")) return;
    this.screen.querySelector("[data-exercise-live]").textContent = `${this.editor.nodes.length} vértices · ${this.editor.edges.length} conexiones`;
  }

  check() {
    const exercise = exercises[this.index];
    const correct = exercise.validate(this.editor);
    const feedback = this.screen.querySelector("[data-lab-feedback]");
    feedback.classList.toggle("is-error", !correct);
    if (!correct) {
      feedback.textContent = `Todavía no coincide. ${exercise.hint}`;
      return;
    }
    this.completed.add(this.index);
    feedback.textContent = this.index === exercises.length - 1
      ? "¡Correcto! Completaste los tres ejercicios."
      : "¡Correcto! Ya podés pasar al siguiente ejercicio.";
    this.checkButton.hidden = true;
    this.nextButton.hidden = false;
    this.nextButton.textContent = this.index === exercises.length - 1 ? "Volver al hub" : "Siguiente ejercicio →";
  }

  next() {
    if (this.index < exercises.length - 1) this.load(this.index + 1);
    else this.screen.dispatchEvent(new CustomEvent("exercises:exit"));
  }
}
