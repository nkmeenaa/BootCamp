import { useEffect, useRef, useState } from "react";
import { recognizeMath } from "../recognition/mathRecognizer";

function InkCanvas(){
  const canvasRef = useRef(null);

  const strokes = useRef([]);
  const redoStack = useRef([]);
  const currentStroke = useRef(null);
  const isDrawing = useRef(false);
  const [eraserSize, setEraserSize] = useState(30);
  const [tool, setTool] = useState("pen");
  const [strokeWidth,setStrokeWidth] = useState(4);

//For model recognition
  const [recognizedLatex, setRecognizedLatex] = useState("");
  const [isRecognizing, setIsRecognizing] = useState(false);

  //Canvas Setup
  useEffect(() => {
    resizeCanvas();

    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  },[]);

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if(!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    redrawCanvas();
    };
  //Get Pointer Position
  const getPointerPosition = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    let pressure = event.pressure;
    if(event.pointerType === "mouse"){
      pressure = 0.5; // Default pressure for mouse
    };
    
    return {
      x : event.clientX - rect.left,
      y : event.clientY - rect.top,
      pressure,
    };
  };
  
  const getPressureWidth = (pressure) => {
    const minWidth = strokeWidth * 0.5;
    const maxWidth = strokeWidth * 1.5;

    return (
      minWidth +
      pressure * (maxWidth - minWidth)
    );
  };

  const addPointToStroke = (point) => {
    const points = currentStroke.current.points;
    const lastPoint = points[points.length - 1];
    if (!lastPoint) {
      points.push(point);
      return;
    }
    const dx = point.x - lastPoint.x;
    const dy = point.y - lastPoint.y;
    const distance = Math.sqrt(
      dx * dx + dy * dy
    );
    if (distance < 1.5) { // Ignore very tiny movements
      return;
    }
    points.push(point);
  };

  // DRAW ONE STROKE
  const drawStroke = (ctx, stroke) => {
    if (stroke.points.length < 2) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = stroke.width;

    if (stroke.tool === "pixel-eraser") {
      ctx.globalCompositeOperation = "destination-out";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#000000";
    }
    ctx.beginPath();
    const points = stroke.points;

    // Start at first point
    ctx.moveTo(points[0].x, points[0].y);
//For Smoother Curves
    for (let i = 1; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;

      ctx.quadraticCurveTo(
        current.x,
        current.y,
        midX,
        midY
      );
    }

    // Connect to the final point
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
    ctx.restore();
  };

  // Redraw
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if(!canvas) return;

    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    ctx.setTransform(1, 0, 0, 1, 0, 0);     // see changes here  dpr <--> 1
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); 

    for(const stroke of strokes.current){
      drawStroke(ctx,stroke);
    };
  }

  // Start drawing
  const handlePointerDown = (event) => {
    const canvas = canvasRef.current;
    canvas.setPointerCapture(event.pointerId);
    const point = getPointerPosition(event);
    isDrawing.current = true;
    currentStroke.current = {
      points: [point],
      width: 
      tool === "stroke-eraser" ? eraserSize : strokeWidth,
      tool: tool,
      pointerType : event.pointerType,
      startTime : performance.now(),
    };
    if (tool === "stroke-eraser") {
      eraseStrokeAtPoint(point);
    }
  };

  

  // Draw
  const handlePointerMove = (event) => {
    if (!isDrawing.current) return;
    
    const point = getPointerPosition(event);
    if (tool === "stroke-eraser") {
      eraseStrokeAtPoint(point);
      return;
    };
    addPointToStroke(point);
    const points = currentStroke.current.points;
    if (points.length < 2) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const previous = points[points.length - 2];
    ctx.save();

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    

    if (tool === "pixel-eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = eraserSize;
    }else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = getPressureWidth(point.pressure);
    }
    ctx.beginPath();
    ctx.moveTo(previous.x, previous.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    ctx.restore();
    
  };

  //Stop drawing
  const handlePointerUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    if(
      currentStroke.current &&
      currentStroke.current.points.length > 1 &&
      tool !== "stroke-eraser"
    ){
      currentStroke.current.endTime = performance.now();
      strokes.current.push(currentStroke.current);
      redoStack.current = [];
    }
    
    currentStroke.current = null;
  };

  const eraseStrokeAtPoint = (point) => {
    const eraserRadius = eraserSize / 2;
    let removed = false;
    strokes.current = strokes.current.filter((stroke) => {
      const hit = stroke.points.some((p) => {
        const dx = p.x - point.x;
        const dy = p.y - point.y;
        const distance = Math.sqrt(
          dx * dx + dy * dy
        );
        return distance < eraserRadius;
      });

      if (hit) {
        removed = true;
        redoStack.current.push(stroke);
        return false;
      }
      return true;
    });
    if (removed) {
      redrawCanvas();
    }
  };

  const undo = () => {
    if (strokes.current.length === 0) return;
    const lastStroke = strokes.current.pop();
    redoStack.current.push(lastStroke);
    redrawCanvas();
  };

  const redo = () => {
    if (redoStack.current.length === 0) return;
    const stroke = redoStack.current.pop();
    strokes.current.push(stroke);
    redrawCanvas();
  };


  const clearCanvas = () => {
    strokes.current = [];
    redoStack.current = [];
    redrawCanvas();
  };

  const handleRecognize = async () => {
    if (strokes.current.length === 0) {
      return;
    };
    try {
    setIsRecognizing(true);
    const result = await recognizeMath(strokes.current);
    console.log("Recognition(CoMER) Result:", result);
    setRecognizedLatex(result.latex || "");
  } catch (err) {
    console.error("Recognition failed:", err);
    setRecognizedLatex("");
  } finally {
    setIsRecognizing(false);
  }
};

  return (
    <div className="canvas-wrapper">

      {/* TOOLBAR */}
      

      <div className="toolbar">

        <button
          onClick={() => setTool("pen")}
          className={tool === "pen" ? "active" : ""}
        >
          Pen
        </button>

        <button
          onClick={() => setTool("pixel-eraser")}
          className={
            tool === "pixel-eraser"
              ? "active"
              : ""
          }
        >
          Eraser
        </button>

        <button
          onClick={() => setTool("stroke-eraser")}
          className={
            tool === "stroke-eraser"
              ? "active"
              : ""
          }
        >
          Stroke Eraser
        </button>

        <button onClick={undo}>
          Undo
        </button>

        <button onClick={redo}>
          Redo
        </button>

        <button onClick={clearCanvas}>
          Clear
        </button>

        {/* STROKE WIDTH */}

        <label>
          Width:

          <input
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) =>
              setStrokeWidth(
                Number(e.target.value)
              )
            }
          />

          {strokeWidth}px
        </label>

        <button
          onClick={handleRecognize}
          disabled={isRecognizing}
        >
          {isRecognizing ? "Recognizing..." : "Recognize"}
        </button>

      </div>

      {/* CANVAS */}

      <canvas
        ref={canvasRef}
        className="ink-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      {recognizedLatex && (
        <div className="recognition-result">
          <strong>Recognized:</strong>{" "}
          <span>{recognizedLatex}</span>
        </div>
      )}

    </div>
  );
}

export default InkCanvas;