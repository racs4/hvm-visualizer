import {
  select,
  tree,
  hierarchy,
  linkVertical,
} from "d3";

const WIDTH = 500;
const HEIGHT = 500;

function getName(term) {
  switch (term.type) {
    case "Node":
      if (term.parent.type !== "Name") {
        // return `(${getName(term.parent)}${(term.parent.children || [])
        //   .map(getName)
        //   .join(" ")})`;
        return "App";
      }
      return getName(term.parent);
    case "Number":
      return term.name;
    case "Name":
      return term.name;
    case "Var":
      return getName(term.name);
    case "Lam":
      return "λ" + term.name;
    case "Sup":
      return "{ }";
    case "Dup":
      return `${getName(term.name1)} ${getName(term.name2)}`;
    default:
      return "";
  }
}

function getChildren(term) {
  switch (term.type) {
    case "Lam":
      return [term.body];
    case "Sup":
      return [term.term1, term.term2];
    case "Dup":
      return [term.term];
    case "Node":
      return term.parent.type !== "Name"
        ? [term.parent, ...term.children]
        : term.children;
    default:
      return term.children;
  }
}

export function clearAll() {
  clearDraw();
  select("#hvm-tree--svg").attr("width", null).attr("height", null).selectAll("*").remove();
}

export function clearDraw() {
  select("#hvm-tree--html").selectAll("div").remove();
  select("#hvm-tree--svg").selectAll("*").remove();
}

function getAllTreeNodes(data) {
  return data.flatMap((term, i) => {
    const hierarchicalTerms = hierarchy(term, getChildren);

    const termTree = tree()
      .size([WIDTH, HEIGHT])
      .separation(function separation(a, b) {
        return a.parent === b.parent ? 1 : 1;
      })(hierarchicalTerms);

    return termTree.descendants().map((node) => ({ ...node, i }));
  });
}

export function draw(data) {
  clearDraw();

  sortData(data);
  drawData(data);

  function drawTerm(termNode) {
    let termNodeSelection = select(this);
    termNodeSelection = termNodeSelection.style("border-radius", "10px");

    const { data } = termNode;
    if (data.type === "Node") {
      termNodeSelection
        .style("border", "2px solid black")
        .style("padding", "10px 5px")
        .transition()
        .duration(200)
        .text(({ data }) => getName(data))
        .style("background", ({ data }) => (data.here ? "grey" : "white"))
        .style("color", ({ data }) => (data.here ? "white" : "black"));
    } else if (data.type === "Dup") {
      termNodeSelection.text(({ data }) => getName(data));
    } else {
      termNodeSelection
        .style("padding", "5px")
        .transition()
        .duration(200)
        .text(({ data }) => getName(data))
        .style("background", ({ data }) => (data.here ? "grey" : "white"))
        .style("color", ({ data }) => (data.here ? "white" : "black"));
    }

    // TODO move this to another place?
    // scroll to here element
    if (data.here) {
      document
        .querySelector(".tree-container")
        .scroll({ left: termNode.i * WIDTH, top: 0, behavior: "smooth" });
    }
  }

  function drawSvg(termNode) {
    let termNodeSelection = select(this);

    const { data, x, y, i, children } = termNode;
    const x0 = x + WIDTH * i;

    if (data.type === "Dup") {
      termNodeSelection
        .append("polygon")
        .attr("fill", "white")
        .attr("stroke", "black")
        .attr("stroke-width", "2")
        .attr(
          "points",
          [
            x0,
            y + Math.min(children[0].y / 2, 75),
            x0 - 50,
            y + 20,
            x0 - 12.5,
            y + 20,
            x0 - 12.5,
            y + 10,
            x0 - 12.5,
            y + 20,
            x0 + 12.5,
            y + 20,
            x0 + 12.5,
            y + 10,
            x0 + 12.5,
            y + 20,
            x0 + 50,
            y + 20,
          ].join(",")
        );
    }
  }

  function drawData(data) {
    const nodes = getAllTreeNodes(data);

    select("#hvm-tree--html")
      .selectAll("div")
      .data(nodes)
      .enter()
      .append("div")
      .style("position", `absolute`)
      .style(
        "transform",
        ({ x, y, i }) => `translate(${x + WIDTH * i}px,${y}px)`
      )
      .append("div")
      .style("transform-origin", `0 0`)
      .style("transform", `translate(-50%, -50%)`)
      .style("background", "white")
      .each(drawTerm);

    const SVG = select("#hvm-tree--svg")
      .attr("width", WIDTH * data.length)
      .attr("height", HEIGHT)
      .selectAll("path")
      .data(nodes)
      .enter();

    const links = linkVertical()
      .source(function ({ x, y, i }) {
        return [x + WIDTH * i, y];
      })
      .target(function ({ parent, x, i }) {
        return [
          (parent?.x || x) + WIDTH * i,
          (parent?.y || 0) + (parent?.data?.type === "Dup" ? 20 : 0),
        ];
      });

    // SVG.append("line")
    //   .attr("stroke", "black")
    //   .attr("stroke-linejoin", "round")
    //   .attr("stroke-width", 2)
    //   .attr("x1", ({ x, i }) => x + WIDTH * i)
    //   .attr("y1", ({ y }) => y)
    //   .attr("x2", ({ parent, x, i }) => (parent?.x || x) + WIDTH * i)
    //   .attr(
    //     "y2",
    //     ({ parent, y }) =>
    //       (parent?.y || 0) + (parent?.data?.type === "Dup" ? 20 : 0)
    //   );
    SVG.append("path")
      .attr("d", links)
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", 2);

    SVG.each(drawSvg);
  }

  function sortData(data) {
    data.sort((term1, term2) => {
      if (term1.type === "Node") return -1;
      else if (term2.type === "Node") return 1;
      else {
        return getName(term1) < getName(term2) ? -1 : 1;
      }
    });
  }
}
