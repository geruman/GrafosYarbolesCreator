import { GraphView } from "./graph-view.js?v=26";

export class LessonPlayer {
  constructor({ screen, hub }) {
    this.screen = screen;
    this.hub = hub;
    this.graph = new GraphView(screen.querySelector("#graph-stage"));
    this.index = 0;
    this.lesson = null;
    this.nextButton = screen.querySelector("[data-lesson-next]");
    this.backButton = screen.querySelector("[data-lesson-back]");

    screen.querySelector("[data-lesson-exit]").addEventListener("click", () => this.close());
    this.backButton.addEventListener("click", () => this.previous());
    this.nextButton.addEventListener("click", () => this.next());
  }

  open(lesson) {
    this.lesson = lesson;
    this.index = 0;
    this.hub.hidden = true;
    this.screen.hidden = false;
    document.body.classList.add("lesson-open");
    document.querySelector("#lesson-kicker").textContent = `${lesson.module} · Lección ${lesson.number}`;
    document.querySelector("#lesson-name").textContent = lesson.title;
    window.scrollTo({ top: 0 });
    this.render();
  }

  close() {
    this.screen.hidden = true;
    this.hub.hidden = false;
    document.body.classList.remove("lesson-open");
    window.scrollTo({ top: 0 });
  }

  next() {
    if (this.index === this.lesson.steps.length - 1) {
      if (this.lesson.nextLessonId && this.lessonRegistry?.[this.lesson.nextLessonId]) {
        this.open(this.lessonRegistry[this.lesson.nextLessonId]);
        return;
      }
      this.close();
      return;
    }
    this.index += 1;
    this.render();
  }

  previous() {
    if (this.index === 0) return;
    this.index -= 1;
    this.render();
  }

  render() {
    const step = this.lesson.steps[this.index];
    const total = this.lesson.steps.length;
    const key = this.screen.querySelector("#lesson-key");

    this.screen.querySelector("#lesson-counter").textContent = `${this.index + 1} / ${total}`;
    this.screen.querySelector("#lesson-progress-bar").style.width = `${((this.index + 1) / total) * 100}%`;
    this.screen.querySelector("#lesson-step-label").textContent = step.label;
    this.screen.querySelector("#lesson-step-title").textContent = step.title;
    this.screen.querySelector("#lesson-step-text").textContent = step.text;
    this.screen.querySelector("#graph-caption").textContent = step.caption;
    key.textContent = step.key ?? "";
    key.hidden = !step.key;
    this.backButton.disabled = this.index === 0;
    this.nextButton.innerHTML = this.index === total - 1
      ? (this.lesson.nextLessonId ? 'Siguiente lección <span aria-hidden="true">→</span>' : "Terminar")
      : 'Siguiente <span aria-hidden="true">→</span>';

    this.graph.render(step.graph ?? this.lesson.graph, step.focus, step.travel);
  }

  setLessons(registry) {
    this.lessonRegistry = registry;
  }
}
