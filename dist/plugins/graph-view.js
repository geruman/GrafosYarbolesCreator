const SVG_NS = "http://www.w3.org/2000/svg";

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

export class GraphView {
  constructor(container) {
    this.container = container;
  }

  render(model, focus = "graph", travel = null) {
    this.container.replaceChildren();
    const svg = svgElement("svg", { viewBox: "0 0 640 430", role: "img" });
    const title = svgElement("title");
    title.textContent = model.label;
    svg.appendChild(title);

    if (model.directed) {
      const defs = svgElement("defs");
      const marker = svgElement("marker", {
        id: "graph-arrow",
        viewBox: "0 0 10 10",
        refX: "9",
        refY: "5",
        markerWidth: "8",
        markerHeight: "8",
        orient: "auto-start-reverse",
      });
      marker.appendChild(svgElement("path", { d: "M 0 0 L 10 5 L 0 10 z", class: "graph-arrowhead" }));
      defs.appendChild(marker);
      svg.appendChild(defs);
    }

    const paths = new Map();
    model.edges.forEach((edgeData, index) => {
      const edgeModel = Array.isArray(edgeData)
        ? { from: edgeData[0], to: edgeData[1] }
        : edgeData;
      const { from: fromId, to: toId, curve = 0 } = edgeModel;
      const from = model.nodes.find((node) => node.id === fromId);
      const to = model.nodes.find((node) => node.id === toId);
      const pathData = this.edgePath(from, to, curve, model.directed);
      const edge = svgElement("path", {
        d: pathData,
        class: `graph-edge${edgeModel.active || focus === "edges" || focus === "graph" ? " is-active" : ""}`,
        "data-edge": index,
      });
      if (model.directed && edgeModel.directed !== false) edge.setAttribute("marker-end", "url(#graph-arrow)");
      paths.set(`${fromId}:${toId}`, pathData);
      svg.appendChild(edge);
    });

    model.nodes.forEach((node) => {
      const active = focus === "nodes" || focus === "graph" || focus === `node:${node.id}`;
      const group = svgElement("g", {
        class: `graph-node${active ? " is-active" : ""}`,
        transform: `translate(${node.x} ${node.y})`,
        "data-node": node.id,
      });
      group.appendChild(svgElement("circle", { r: 35 }));
      const text = svgElement("text", { "text-anchor": "middle", dy: "0.35em" });
      text.textContent = node.label;
      group.appendChild(text);
      svg.appendChild(group);
    });

    if (travel) this.renderTravel(svg, model, paths, travel);

    this.container.appendChild(svg);
  }

  edgePath(from, to, curve, directed) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);
    if (distance === 0) {
      return `M ${from.x - 23} ${from.y - 27} C ${from.x - 82} ${from.y - 112}, ${from.x + 82} ${from.y - 112}, ${from.x + 23} ${from.y - 27}`;
    }
    const startGap = 39;
    const endGap = directed ? 49 : 39;
    const startX = from.x + (dx / distance) * startGap;
    const startY = from.y + (dy / distance) * startGap;
    const endX = to.x - (dx / distance) * endGap;
    const endY = to.y - (dy / distance) * endGap;

    if (!curve) return `M ${startX} ${startY} L ${endX} ${endY}`;
    const middleX = (startX + endX) / 2;
    const middleY = (startY + endY) / 2;
    const normalX = -dy / distance;
    const normalY = dx / distance;
    return `M ${startX} ${startY} Q ${middleX + normalX * curve} ${middleY + normalY * curve} ${endX} ${endY}`;
  }

  renderTravel(svg, model, paths, travel) {
    if (travel.route?.length > 1) {
      const routeNodes = travel.route.map((id) => model.nodes.find((node) => node.id === id));
      if (routeNodes.every(Boolean)) {
        const routePath = routeNodes.map((node, index) => `${index ? "L" : "M"} ${node.x} ${node.y}`).join(" ");
        const dot = svgElement("circle", { r: "9", class: "travel-dot" });
        dot.appendChild(svgElement("animateMotion", {
          dur: `${Math.max(2, routeNodes.length * 0.75)}s`,
          repeatCount: "indefinite",
          path: routePath,
          calcMode: "linear",
        }));
        svg.appendChild(dot);
      }
      return;
    }
    const directPath = paths.get(`${travel.from}:${travel.to}`);
    let pathData = directPath;

    if (!pathData) {
      const reversePath = paths.get(`${travel.to}:${travel.from}`);
      if (reversePath) {
        const from = model.nodes.find((node) => node.id === travel.from);
        const to = model.nodes.find((node) => node.id === travel.to);
        pathData = this.edgePath(from, to, 0, model.directed);
      }
    }
    if (!pathData) return;

    const dot = svgElement("circle", {
      r: "9",
      class: `travel-dot${travel.valid ? "" : " is-blocked"}`,
    });
    const motion = svgElement("animateMotion", {
      dur: travel.valid ? "1.8s" : "1.2s",
      repeatCount: "indefinite",
      path: pathData,
      keyPoints: travel.roundTrip ? "0;1;0" : (travel.valid ? "0;1" : "0;0.45;0"),
      keyTimes: travel.roundTrip ? "0;0.5;1" : (travel.valid ? "0;1" : "0;0.65;1"),
      calcMode: "linear",
    });
    dot.appendChild(motion);
    svg.appendChild(dot);

    if (!travel.valid) {
      const blocked = svgElement("g", { class: "blocked-mark", transform: "translate(320 215)" });
      blocked.appendChild(svgElement("circle", { r: "25" }));
      blocked.appendChild(svgElement("path", { d: "M -9 -9 L 9 9 M 9 -9 L -9 9" }));
      svg.appendChild(blocked);
    }
  }
}
