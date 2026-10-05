import {useEffect, useRef , useState} from 'react';

function InkCanvas(){
  const canvasRef = useRef(null);

  const strokes = useRef([]);
  const undoStrokes = useRef([]);
  const redoStack = useRef([]);
  const currentStroke = useRef([]);
  const isDrawing = useRef(false);
  const [eraserSize, setEraserSize] = useState(30);
  const [tool, setTool] = useState("pen");
  const [strokeWidth,setStrokeWidth] = useState(4);

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
    
    return {
      x : event.clientX - rect.left,
      y : event.clientY - rect.top
    };
  };

  // DRAW ONE STROKE
  const drawStroke = (ctx, stroke) => {
    const canvas = canvasRef.current;
    if (stroke.points.length < 2) return;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = stroke.width;

    if(stroke.tool == "pixel-eraser"){
      ctx.globalCompositeOperation = "destination-out";
    }else{
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#000000";
    }

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
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
      width: strokeWidth,
      tool: tool,
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
    currentStroke.current.points.push(point);
    const points = currentStroke.current.points;
    if (points.length < 2) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const previous = points[points.length - 2];
    ctx.save();

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = strokeWidth;
    if(tool === "pixel-eraser") {ctx.globalCompositeOperation = "destination-out";} 
    else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#000000";
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

      </div>

      {/* CANVAS */}

      <canvas
        ref={canvasRef}
        className="ink-canvas"

        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

    </div>
  );
}

export default InkCanvas;