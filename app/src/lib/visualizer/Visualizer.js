import { useState, useEffect, useRef } from "react";
import { compose } from "../utils/utils";
import { clearAll, draw } from "../utils/draw";
import { hvmDebugPreParser, hvmDebugParser } from "../utils/parser.ts";

import "./Visualizer.css";

export default function HVMVisualizer() {
  // const query = useQuery();
  // const code = b64_to_utf8(query.get("code"));

  // initial state of component
  const [debugCode, setDebugCode] = useState("");
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(0);
  const [error, setError] = useState(null);

  // every time `debugCode` changes:
  // divide text into 'nodes'
  useEffect(() => {
    if (debugCode) {
      setNodes(hvmDebugPreParser(debugCode));
    }
  }, [debugCode]);

  // every time `nodes` and `selectedNodes`changes:
  // draw the new `selectedNode` of `nodes`
  useEffect(() => {
    if (nodes.length > 0) {
      setError(null);
      try {
        const drawTree = compose(draw, hvmDebugParser);
        drawTree(nodes[selectedNode]);
      } catch (err) {
        setError(err);
      }
    }
  }, [selectedNode, nodes]);

  // every time `selectedNode `changes:
  // scroll to the selected node 
  useEffect(() => {
    scrollToNode();
  }, [selectedNode]);



  return (
    <main className="hvm-visualizer">
      <section className="left-container">
        <LeftContainer
          selectedNode={selectedNode}
          nodes={nodes}
          whenChange={(textarea) => { setDebugCode(textarea.value) }}
          whenSelect={setSelectedNode}
          whenClear={clear}
        />
      </section>
      <section className="tree-container">
        {
          error ? <ErrorMessage message={error} /> :
            <>
              <Pagination
                selected={selectedNode}
                max={nodes.length}
                whenBack={() => { selectNode((a) => a - 1) }}
                whenAdvance={() => { selectNode((a) => a + 1) }}
                whenSelect={v => selectNode(_ => v)}
                whenFastAdvance={() => { fastSelectNode(a => a + 1) }}
                whenFastBack={() => { fastSelectNode(a => a - 1) }}
              />
              <div className="hvm-tree">
                <div id="hvm-tree--html"></div>
                <svg id="hvm-tree--svg"></svg>
              </div>
            </>
        }
      </section>
    </main>
  );

  function selectNode(operation) {
    if (nodes.length > 0) {
      const newSelectedNode = operation(selectedNode);
      if (isSelectedNodeValid(newSelectedNode, nodes)) {
        setSelectedNode(newSelectedNode);
      }
    }
  }

  function fastSelectNode(operation) {
    function removeDolar(code) {
      return code.replaceAll("$", "");
    }

    if (nodes.length > 0) {
      const actualNode = nodes[selectedNode];
      let newSelectedNode = operation(selectedNode);
      while (
        isSelectedNodeValid(newSelectedNode, nodes) &&
        removeDolar(actualNode) === removeDolar(nodes[newSelectedNode])
      )
        newSelectedNode = operation(newSelectedNode);

      setSelectedNode(
        Math.max(0, Math.min(newSelectedNode, nodes.length - 1))
      );
    }
  }

  function isSelectedNodeValid(selectedNode, nodes) {
    return selectedNode >= 0 && selectedNode <= nodes.length - 1;
  }

  function scrollToNode() {
    if (nodes.length > 0) {
      const element = document.querySelector(
        `#text-wrapper-${selectedNode}`
      );
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
    }
  }

  // return everything to initial state
  function clear() {
    setDebugCode("");
    setNodes([]);
    setSelectedNode(0);
    setError(null);
    clearAll();
  }
}

// LEFT
// chooses what to draw in left
function LeftContainer({ selectedNode, nodes, whenSelect, whenClear, whenChange }) {
  if (nodes.length > 0)
    return (
      <NodeBlocks
        selectedNode={selectedNode}
        nodes={nodes}
        whenClick={(i) => { whenSelect(i) }}
        whenClear={whenClear}
      />
    );
  else
    return <TextArea whenChange={whenChange} />;
}

// draws each text block for each node
// also draws a clear button
function NodeBlocks({ nodes, selectedNode, whenClick, whenClear }) {
  return (
    <div className="node-blocks">
      {nodes.map((node, i) =>
        <div
          key={i}
          className="text-wrapper"
          id={`text-wrapper-${i}`}
          onClick={() => whenClick(i)}
          style={{
            borderColor: selectedNode === i ? "orange" : "black",
          }}
        > {node} </div>
      )}
      <button
        className="clear-button"
        onClick={() => { whenClear() }}
      > Clear </button>
    </div>
  );
}

// draws the text area
function TextArea({ whenChange }) {
  const textarea = useRef();

  return (
    <div className="text-input">
      <textarea
        ref={textarea}
        placeholder="Paste your debug here..."
        // onChange={(e) => whenChange(textarea)}
        draggable="false"
        wrap="false"
      ></textarea>
      <button onClick={() => { whenChange(textarea.current) }}>Go</button>
    </div>
  );
}

// RIGHT
// draws the pagination component
function Pagination({ selected, max, whenAdvance, whenFastAdvance, whenBack, whenFastBack, whenSelect }) {
  return (
    // show if there is more than one to show
    max > 0 && (
      <div className="pagination">
        <button onClick={() => { whenFastBack() }}>{"<<"}</button>
        <button onClick={() => { whenBack() }}>{"<"}</button>
        <span>
          <input type="number" value={selected + 1} onChange={(e) => { whenSelect(Number(e.target.value - 1)) }} />
          /{max}
        </span>
        <button onClick={() => { whenAdvance() }}>{">"}</button>
        <button onClick={() => { whenFastAdvance() }}>{">>"}</button>
      </div>
    )
  );
}

function ErrorMessage({ message }) {
  const [start, rest] = message.split("[4m[31m«");
  const [err, end] = rest.split("»[0m");

  return (
    <p className="error-wrapper">
      {start}
      <span className="error-text">{err || "a"}</span>
      {end}
    </p>
  )
}