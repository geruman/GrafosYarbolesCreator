import { LessonPlayer } from "./plugins/lesson-player.js?v=39";
import { GraphEditor } from "./plugins/graph-editor.js?v=6";
import { GuidedExercises } from "./plugins/guided-exercises.js?v=6";
import { ProjectNetworkEditor } from "./plugins/project-network-editor.js?v=13";
import { TraversalPractice } from "./plugins/traversal-practice.js?v=39";
import { TreeEditor } from "./plugins/tree-editor.js?v=47";
import { BstInsertionPractice } from "./plugins/bst-insertion-practice.js?v=39";
import { AvlRotationPractice } from "./plugins/avl-rotation-practice.js?v=41";
import { RedBlackLab } from "./plugins/red-black-lab.js?v=55";
import { RedBlackPractice } from "./plugins/red-black-practice.js?v=54";
import { lessons } from "./lessons/index.js?v=48";

const topics = {
  M1: [
    ["Fundamentos de grafos", "5 lecciones visuales disponibles", "m1-l1"],
    ["Ejercicios guiados", "3 desafíos para construir grafos", "exercises"],
    ["Caminos y ciclos", "Recorridos dentro de una red", "m1-paths"],
    ["Caminos mínimos", "Búsqueda de rutas eficientes", "m1-shortest"],
    ["DAG y orden topológico", "Dirección, dependencias y orden", "m1-dag"],
  ],
  LAB: [
    ["Editor libre de grafos", "Elegí el tipo y construí sin consignas", "lab"],
    ["Redes CPM / PERT", "Actividades, tiempos y redes de hasta 50 nodos", "project-lab"],
    ["Recorridos aleatorios", "Preorden, inorden y posorden configurables", "preorder-random"],
    ["Laboratorio de árboles", "Construí árboles binarios, ABB y AVL", "tree-lab"],
    ["Inserción ABB aleatoria", "Elegí tamaño y forma de corrección", "bst-insertion-random"],
    ["Laboratorio AVL", "Insertá valores y observá las rotaciones", "avl-lab"],
    ["AVL manual", "Generá árboles desbalanceados, insertá y rotá", "avl-manual-lab"],
    ["Laboratorio rojinegro", "Insertá, recoloreá y rotá libremente", "red-black-lab"],
  ],
  M2: [
    ["Del grafo al árbol", "La estructura y sus restricciones", "m2-tree-intro"],
    ["Anatomía de un árbol", "Raíz, niveles, ramas y hojas", "m2-tree-anatomy"],
    ["Árboles binarios", "Estructuras con hasta dos hijos", "m2-binary-trees"],
    ["Recorridos", "Preorden, inorden, posorden y niveles", "m2-traversals"],
    ["Práctica de preorden", "Recorré árboles raíz, izquierda y derecha", "preorder-practice"],
    ["Práctica de inorden", "Recorré árboles izquierda, raíz y derecha", "inorder-practice"],
    ["Práctica de posorden", "Recorré árboles izquierda, derecha y raíz", "postorder-practice"],
    ["Recorridos aleatorios", "Elegí recorrido, tamaño y corrección", "preorder-random"],
  ],
  M3: [
    ["Árbol binario de búsqueda", "Orden, búsqueda y operaciones", "m3-bst", "M3.1"],
    ["Práctica de inserción ABB", "Ubicá valores respetando el orden", "bst-insertion-practice", "M3.P1"],
    ["Inserción ABB aleatoria", "Elegí tamaño y forma de corrección", "bst-insertion-random", "M3.P2"],
    ["AVL", "Equilibrio por altura y rotaciones", "m3-avl", "M3.2"],
    ["Laboratorio AVL", "Inserción libre con balanceo automático", "avl-lab", "M3.P3"],
    ["Rotaciones AVL", "12 ejercicios de rotaciones simples y dobles", "avl-rotation-practice", "M3.P4"],
    ["Laboratorio AVL manual", "Generá árboles desbalanceados y corregilos libremente", "avl-manual-lab", "M3.P5"],
    ["Práctica AVL aleatoria", "Insertá el valor propuesto y equilibrá el árbol", "avl-random-practice", "M3.P6"],
    ["Rojinegros", "Balanceo mediante colores", "m3-red-black", "M3.3"],
    ["Práctica guiada rojinegra", "Recoloraciones y rotaciones paso a paso", "red-black-practice", "M3.P7"],
    ["Laboratorio rojinegro", "Practicá recoloreo y rotaciones manuales", "red-black-lab", "M3.P8"],
    ["Práctica rojinegra aleatoria", "Insertá, recoloreá y rotá hasta repararlo", "red-black-random-practice", "M3.P9"],
    ["Árboles AA", "Niveles, torsión y división", "m3-aa", "M3.4"],
    ["Árboles B", "Nodos con múltiples claves", "m3-b-tree", "M3.5"],
  ],
  M4: [
    ["Huffman", "Frecuencias, códigos y compresión", "m4-huffman"],
  ],
};

const dialog = document.querySelector("#topic-dialog");
const dialogTitle = document.querySelector("#dialog-title");
const dialogModule = document.querySelector("#dialog-module");
const lessonPlayer = new LessonPlayer({
  screen: document.querySelector("#lesson-screen"),
  hub: document.querySelector('[data-screen="hub"]'),
});
lessonPlayer.setLessons(lessons);
const labScreen = document.querySelector("#lab-screen");
const hubScreen = document.querySelector('[data-screen="hub"]');
const graphEditor = new GraphEditor(labScreen);
const exerciseScreen = document.querySelector("#exercise-screen");
const guidedExercises = new GuidedExercises(exerciseScreen);
const projectLabScreen = document.querySelector("#project-lab-screen");
const projectNetworkEditor = new ProjectNetworkEditor(projectLabScreen);
const traversalScreen = document.querySelector("#traversal-screen");
const traversalPractice = new TraversalPractice(traversalScreen);
const treeLabScreen = document.querySelector("#tree-lab-screen");
const treeEditor = new TreeEditor(treeLabScreen);
const bstPracticeScreen = document.querySelector("#bst-practice-screen");
const bstInsertionPractice = new BstInsertionPractice(bstPracticeScreen);
const avlRotationScreen = document.querySelector("#avl-rotation-screen");
const avlRotationPractice = new AvlRotationPractice(avlRotationScreen);
const redBlackLabScreen = document.querySelector("#red-black-lab-screen");
const redBlackLab = new RedBlackLab(redBlackLabScreen);
const redBlackPracticeScreen = document.querySelector("#red-black-practice-screen");
const redBlackPractice = new RedBlackPractice(redBlackPracticeScreen);

function openLab() {
  hubScreen.hidden = true;
  labScreen.hidden = false;
  document.body.classList.add("lesson-open");
  window.scrollTo({ top: 0 });
  graphEditor.resize();
}

function closeLab() {
  labScreen.hidden = true;
  hubScreen.hidden = false;
  document.body.classList.remove("lesson-open");
  window.scrollTo({ top: 0 });
}

function openExercises() {
  hubScreen.hidden = true;
  exerciseScreen.hidden = false;
  document.body.classList.add("lesson-open");
  window.scrollTo({ top: 0 });
  guidedExercises.open();
}

function closeExercises() {
  exerciseScreen.hidden = true;
  hubScreen.hidden = false;
  document.body.classList.remove("lesson-open");
  window.scrollTo({ top: 0 });
}

function openProjectLab() {
  hubScreen.hidden = true;
  projectLabScreen.hidden = false;
  document.body.classList.add("lesson-open");
  window.scrollTo({ top: 0 });
  projectNetworkEditor.resize();
}

function closeProjectLab() {
  projectLabScreen.hidden = true;
  hubScreen.hidden = false;
  document.body.classList.remove("lesson-open");
  window.scrollTo({ top: 0 });
}

function openTraversalPractice(mode = "preorder") {
  hubScreen.hidden = true;
  traversalScreen.hidden = false;
  document.body.classList.add("lesson-open");
  window.scrollTo({ top: 0 });
  traversalPractice.open(mode);
}

function closeTraversalPractice() {
  traversalScreen.hidden = true;
  hubScreen.hidden = false;
  document.body.classList.remove("lesson-open");
  window.scrollTo({ top: 0 });
}

function openTreeLab(mode = "binary", randomPractice = false) {
  hubScreen.hidden = true;
  treeLabScreen.hidden = false;
  document.body.classList.add("lesson-open");
  window.scrollTo({ top: 0 });
  if (randomPractice) treeEditor.openRandomPractice();
  else treeEditor.open(mode);
}

function closeTreeLab() {
  treeLabScreen.hidden = true;
  hubScreen.hidden = false;
  document.body.classList.remove("lesson-open");
  window.scrollTo({ top: 0 });
}

function openBstPractice(mode = "fixed") {
  hubScreen.hidden = true;
  bstPracticeScreen.hidden = false;
  document.body.classList.add("lesson-open");
  window.scrollTo({ top: 0 });
  bstInsertionPractice.open(mode);
}

function closeBstPractice() {
  bstPracticeScreen.hidden = true;
  hubScreen.hidden = false;
  document.body.classList.remove("lesson-open");
  window.scrollTo({ top: 0 });
}

function openAvlRotationPractice() {
  hubScreen.hidden = true;
  avlRotationScreen.hidden = false;
  document.body.classList.add("lesson-open");
  window.scrollTo({ top: 0 });
  avlRotationPractice.open();
}

function closeAvlRotationPractice() {
  avlRotationScreen.hidden = true;
  hubScreen.hidden = false;
  document.body.classList.remove("lesson-open");
  window.scrollTo({ top: 0 });
}

function openRedBlackLab(randomPractice = false) {
  hubScreen.hidden = true;
  redBlackLabScreen.hidden = false;
  document.body.classList.add("lesson-open");
  window.scrollTo({ top: 0 });
  if (randomPractice) redBlackLab.openRandomPractice();
  else redBlackLab.open();
}

function closeRedBlackLab() {
  redBlackLabScreen.hidden = true;
  hubScreen.hidden = false;
  document.body.classList.remove("lesson-open");
  window.scrollTo({ top: 0 });
}

function openRedBlackPractice() {
  hubScreen.hidden = true;
  redBlackPracticeScreen.hidden = false;
  document.body.classList.add("lesson-open");
  window.scrollTo({ top: 0 });
  redBlackPractice.open();
}

function closeRedBlackPractice() {
  redBlackPracticeScreen.hidden = true;
  hubScreen.hidden = false;
  document.body.classList.remove("lesson-open");
  window.scrollTo({ top: 0 });
}

labScreen.querySelector("[data-lab-exit]").addEventListener("click", closeLab);
exerciseScreen.querySelector("[data-exercise-exit]").addEventListener("click", closeExercises);
exerciseScreen.addEventListener("exercises:exit", closeExercises);
projectLabScreen.querySelector("[data-project-exit]").addEventListener("click", closeProjectLab);
traversalScreen.querySelector("[data-traversal-exit]").addEventListener("click", closeTraversalPractice);
traversalScreen.addEventListener("traversal:exit", closeTraversalPractice);
treeLabScreen.querySelector("[data-tree-exit]").addEventListener("click", closeTreeLab);
bstPracticeScreen.querySelector("[data-bst-exit]").addEventListener("click", closeBstPractice);
bstPracticeScreen.addEventListener("bst-practice:exit", closeBstPractice);
avlRotationScreen.querySelector("[data-avl-rotation-exit]").addEventListener("click", closeAvlRotationPractice);
avlRotationScreen.addEventListener("avl-rotation:exit", closeAvlRotationPractice);
redBlackLabScreen.querySelector("[data-rb-exit]").addEventListener("click", closeRedBlackLab);
redBlackPracticeScreen.querySelector("[data-rbp-exit]").addEventListener("click", closeRedBlackPractice);
redBlackPracticeScreen.addEventListener("rbp:exit", closeRedBlackPractice);

Object.entries(topics).forEach(([module, items]) => {
  const grid = document.querySelector(`[data-module="${module}"]`);

  items.forEach(([title, description, lessonId, topicCode], index) => {
    const button = document.createElement("button");
    button.className = "topic-card";
    button.type = "button";
    button.innerHTML = `
      <span class="topic-index">${module === "LAB" ? "MODO LIBRE" : (topicCode ?? `${module}.${index + 1}`)}</span>
      <span class="topic-status ${lessonId ? "is-ready" : ""}">${lessonId ? "Disponible" : "Próximamente"}</span>
      <strong>${title}</strong>
      <small>${description}</small>
      <span class="topic-arrow" aria-hidden="true">→</span>
    `;
    button.addEventListener("click", () => {
      if (lessonId === "lab") {
        openLab();
        return;
      }
      if (lessonId === "exercises") {
        openExercises();
        return;
      }
      if (lessonId === "project-lab") {
        openProjectLab();
        return;
      }
      if (lessonId === "preorder-practice") {
        openTraversalPractice();
        return;
      }
      if (lessonId === "preorder-random") {
        openTraversalPractice("preorder-random");
        return;
      }
      if (lessonId === "inorder-practice") {
        openTraversalPractice("inorder");
        return;
      }
      if (lessonId === "postorder-practice") {
        openTraversalPractice("postorder");
        return;
      }
      if (lessonId === "tree-lab") {
        openTreeLab();
        return;
      }
      if (lessonId === "avl-lab") {
        openTreeLab("avl");
        return;
      }
      if (lessonId === "avl-manual-lab") {
        openTreeLab("avl-manual");
        return;
      }
      if (lessonId === "avl-random-practice") {
        openTreeLab("avl-manual", true);
        return;
      }
      if (lessonId === "bst-insertion-practice") {
        openBstPractice();
        return;
      }
      if (lessonId === "bst-insertion-random") {
        openBstPractice("random");
        return;
      }
      if (lessonId === "avl-rotation-practice") {
        openAvlRotationPractice();
        return;
      }
      if (lessonId === "red-black-lab") {
        openRedBlackLab();
        return;
      }
      if (lessonId === "red-black-random-practice") {
        openRedBlackLab(true);
        return;
      }
      if (lessonId === "red-black-practice") {
        openRedBlackPractice();
        return;
      }
      if (lessonId) {
        lessonPlayer.open(lessons[lessonId]);
        return;
      }
      dialogModule.textContent = module;
      dialogTitle.textContent = title;
      dialog.showModal();
    });
    grid.appendChild(button);
  });
});

document.querySelectorAll(".dialog-close, .dialog-action").forEach((button) => {
  button.addEventListener("click", () => dialog.close());
});

dialog.addEventListener("click", (event) => {
  const bounds = dialog.getBoundingClientRect();
  const outside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  if (outside) dialog.close();
});
