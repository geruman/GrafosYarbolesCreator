import { LessonPlayer } from "./plugins/lesson-player.js?v=9";
import { GraphEditor } from "./plugins/graph-editor.js?v=6";
import { GuidedExercises } from "./plugins/guided-exercises.js?v=6";
import { ProjectNetworkEditor } from "./plugins/project-network-editor.js?v=13";
import { lessons } from "./lessons/index.js?v=9";

const topics = {
  M1: [
    ["Fundamentos de grafos", "5 lecciones visuales disponibles", "m1-l1"],
    ["Ejercicios guiados", "3 desafíos para construir grafos", "exercises"],
    ["Caminos y ciclos", "Recorridos dentro de una red", "m1-paths"],
    ["Caminos mínimos", "Búsqueda de rutas eficientes", null],
    ["DAG y orden topológico", "Dirección, dependencias y orden", null],
  ],
  LAB: [
    ["Editor libre de grafos", "Elegí el tipo y construí sin consignas", "lab"],
    ["Redes CPM / PERT", "Actividades, tiempos y redes de hasta 50 nodos", "project-lab"],
  ],
  M2: [
    ["Del grafo al árbol", "La estructura y sus restricciones"],
    ["Anatomía de un árbol", "Raíz, niveles, ramas y hojas"],
    ["Árboles binarios", "Estructuras con hasta dos hijos"],
    ["Recorridos", "Preorden, inorden, posorden y niveles"],
  ],
  M3: [
    ["Árbol binario de búsqueda", "Orden, búsqueda y operaciones"],
    ["AVL", "Equilibrio por altura y rotaciones"],
    ["Rojinegros", "Balanceo mediante colores"],
    ["Árboles AA", "Niveles, torsión y división"],
    ["Árboles B", "Nodos con múltiples claves"],
  ],
  M4: [
    ["Huffman", "Frecuencias, códigos y compresión"],
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

labScreen.querySelector("[data-lab-exit]").addEventListener("click", closeLab);
exerciseScreen.querySelector("[data-exercise-exit]").addEventListener("click", closeExercises);
exerciseScreen.addEventListener("exercises:exit", closeExercises);
projectLabScreen.querySelector("[data-project-exit]").addEventListener("click", closeProjectLab);

Object.entries(topics).forEach(([module, items]) => {
  const grid = document.querySelector(`[data-module="${module}"]`);

  items.forEach(([title, description, lessonId], index) => {
    const button = document.createElement("button");
    button.className = "topic-card";
    button.type = "button";
    button.innerHTML = `
      <span class="topic-index">${module === "LAB" ? "MODO LIBRE" : `${module}.${index + 1}`}</span>
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
