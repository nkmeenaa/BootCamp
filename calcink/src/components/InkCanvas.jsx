import { useEffect, useRef, useState } from "react";
import { recognizeMath } from "../recognition/mathRecognizer";

import { evalMath } from "../Calculator/mathParser";

function InkCanvas(){
  const canvasRef = useRef(null);

  const strokes = useRef([]);
  const redoStack = useRef([]);
  const undoStack = useRef([]);
  const currentStroke = useRef(null);

  const isDrawing = useRef(false);
  const [eraserSize] = useState(30);
  const [tool, setTool] = useState("pen");
  const [strokeWidth, setStrokeWidth] = useState(4);

  //For model recognition
  const [recognizedLatex, setRecognizedLatex] = useState("");
  const [calculatedResult, setCalculatedResult] = useState(null);
  const [calculationError, setCalculationError] = useState("");
  const [isRecognizing, setIsRecognizing] = useState(false);
  const recognitionTimer = useRef(null);
  const recognitionRunning = useRef(false);
  const recognitionPending = useRef(false);

  //Canvas Setup

  const cloneStrokes = (source) => {
    return source.map((stroke) => ({
      ...stroke,
      points: stroke.points.map((point) => ({
        ...point,
      })),
    }));
  };

  const saveHistory = () => {
    undoStack.current.push(cloneStrokes(strokes.current));
    redoStack.current = [];
  };

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  useEffect(() => {
    redrawCanvas();
  }, [calculatedResult]);

  useEffect(() => {
    return () => {
      clearTimeout(recognitionTimer.current);
    };
  }, []);

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    redrawCanvas();
  };


  const getPointerPosition = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    let pressure = event.pressure;
    if (event.pointerType === "mouse"){
      pressure = 0.5; // Default pressure for mouse
    }
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      pressure,
    };
  };

  const getPressureWidth = (pressure) => {
    const minWidth = strokeWidth * 0.5;
    const maxWidth = strokeWidth * 1.5;
    return minWidth + pressure * (maxWidth - minWidth);
  };

  const addPointToStroke = (point) => {
    const points = currentStroke.current.points;
    const lastPoint = points[points.length - 1];
    if (!lastPoint){
      points.push(point);
      return;
    }
    const dx = point.x - lastPoint.x;
    const dy = point.y - lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 1.5){
      return;                            // Ignore very tiny movements
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
    if (stroke.tool === "pixel-eraser"){
      ctx.globalCompositeOperation = "destination-out";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#000000";
    }
    const points = stroke.points;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++){
      ctx.lineTo(
        points[i].x,
        points[i].y
      );
    }
    ctx.stroke();
    ctx.restore();
  };

  //for drawing final eqn
  const drawCalculatedAnswer = (ctx) => {
    if (calculatedResult === null){
      return;
    }
    const penStrokes = strokes.current.filter((stroke) => stroke.tool === "pen");
    if (penStrokes.length === 0){
      return;
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const stroke of penStrokes){
      for (const point of stroke.points){
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);

        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }
    }
    const writingHeight = maxY - minY;
    let fontSize = writingHeight * 0.65;
    fontSize = Math.max(20, Math.min(fontSize, 80));
    const answerX = maxX + 30;
    const answerY = (minY + maxY) / 2;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#2563eb";
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textBaseline = "middle";
    ctx.fillText(String(calculatedResult), answerX, answerY);
    ctx.restore();
  };


  // Redraw
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const stroke of strokes.current){
      drawStroke(ctx, stroke);
    }
    drawCalculatedAnswer(ctx);                           // Draw calculated answer
    
  };

  const scheduleRecognition = () => {
    clearTimeout(recognitionTimer.current);
    recognitionTimer.current = setTimeout(() => {
      if (recognitionRunning.current){
        recognitionPending.current = true;
        return;
      }
      handleRecognize();
    }, 700);
  };

  // Start drawing
  const handlePointerDown = (event) => {
    const canvas = canvasRef.current;
    canvas.setPointerCapture(event.pointerId);
    const point = getPointerPosition(event);
    isDrawing.current = true;
    saveHistory();
    if (tool === "pixel-eraser"){      //pixel-eraser
      eraseStrokeAtPoint(point);
      currentStroke.current = null;
      return;
    }

    if (tool === "stroke-eraser"){        //stroke-eraser defining
      eraseWholeStrokeAtPoint(point);
      currentStroke.current = null;
      return;
    }
    currentStroke.current = {          //degine pen
      points: [point],
      width: getPressureWidth(point.pressure),
      tool: "pen",
      pointerType: event.pointerType,
      startTime: performance.now(),
    };
  };


  // Draw
  const handlePointerMove = (event) => {
    if (!isDrawing.current) return;
    const point = getPointerPosition(event);
    if (tool === "stroke-eraser"){
      eraseWholeStrokeAtPoint(point);
      return;
    }
    if (tool === "pixel-eraser"){
      eraseStrokeAtPoint(point);
      return;
    }
    addPointToStroke(point);
    const points = currentStroke.current.points;
    if (points.length < 2) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const previous = points[points.length - 2];
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = currentStroke.current.width;
    ctx.beginPath();
    ctx.moveTo(
      previous.x,
      previous.y
    );
    ctx.lineTo(
      point.x,
      point.y
    );

    ctx.stroke();
    ctx.restore();
  };

  const getStrokeBounds = (stroke) => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const point of stroke.points){
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }

    return {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
      centerY: (minY + maxY) / 2,
    };
  };

  const isHorizontalStroke = (stroke) => {
    if (!stroke || stroke.points.length < 2){
      return false;
    }
    const first = stroke.points[0];
    const last = stroke.points[stroke.points.length - 1];
    const dx = Math.abs(last.x - first.x);
    const dy = Math.abs(last.y - first.y);

    if (dx < 15){                    // Not enough horizontal movement
      return false;
    }
    return dy / dx < 0.25;
  };


  const isEqualsSign = () => {
    const penStrokes = strokes.current.filter(
      (stroke) => stroke.tool === "pen"
    );
    if (penStrokes.length < 2){
      return false;
    }

    // Check every pair of pen strokes
    for (let i = 0; i < penStrokes.length - 1; i++){
      const top = penStrokes[i];
      const bottom = penStrokes[i + 1];
      if (
        !isHorizontalStroke(top) ||
        !isHorizontalStroke(bottom)
      ){
        continue;
      }
      const a = getStrokeBounds(top);
      const b = getStrokeBounds(bottom);
      const overlapStart = Math.max(
        a.minX,
        b.minX
      );
      const overlapEnd = Math.min(
        a.maxX,
        b.maxX
      );
      const overlap = overlapEnd - overlapStart;
      if (overlap <= 0){
        continue;
      }

      const verticalDistance = Math.abs(
        a.centerY - b.centerY
      );
      const averageHeight = Math.max(
        a.height,
        b.height,
        10
      );
      if (verticalDistance <= averageHeight * 8){ 
        return true; 
      }
    }

    return false;
  };


  //Stop drawing
  const handlePointerUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (currentStroke.current && currentStroke.current.points.length > 1 && tool === "pen"){
      currentStroke.current.endTime = performance.now();
      strokes.current.push(currentStroke.current);
      redoStack.current = [];
      if (isEqualsSign()){
        scheduleRecognition();
      }
    }
    currentStroke.current = null;
  };
  const eraseStrokeAtPoint = (point) => {
    const eraserRadius = eraserSize / 2;
    let anythingChanged = false;
    const newStrokes = [];
    for (const stroke of strokes.current){
      if (!stroke.points || stroke.points.length < 2){
        continue;
      }
      let strokeChanged = false;
      const segments = [];
      let currentSegment = [];
      for (const p of stroke.points){
        const dx = p.x - point.x;
        const dy = p.y - point.y;
        const distance = Math.sqrt(
          dx * dx + dy * dy
        );
        if (distance < eraserRadius){
          strokeChanged = true;
          anythingChanged = true;
          if (currentSegment.length >= 2){
            segments.push(currentSegment);
          }
          currentSegment = [];
        }else{
          currentSegment.push(p);
        }
      }
      if(currentSegment.length >= 2){
        segments.push(currentSegment);
      }
      if(!strokeChanged){
        newStrokes.push(stroke);
        continue;
      }
      for(const segment of segments){
        newStrokes.push({
          ...stroke,
          points: segment,
        });
      }
    }

    if(!anythingChanged){
      return;
    }
    strokes.current = newStrokes;             // Replace old strokes with the split strokes
    
    setCalculatedResult(null);
    setRecognizedLatex("");                 // Clear old recognition/result
    setCalculationError("");

    redrawCanvas();                                            // Redraw from actual stroke data
  };

  const eraseWholeStrokeAtPoint = (point) => {
    const eraserRadius = eraserSize / 2;
    let anythingChanged = false;
    strokes.current = strokes.current.filter((stroke) => {
      const touchesEraser = stroke.points.some((strokePoint) => {
        const dx = strokePoint.x - point.x;
        const dy = strokePoint.y - point.y;
        return Math.hypot(dx, dy) < eraserRadius;
      });
      if (touchesEraser){
        anythingChanged = true;
        return false;
      }
      return true;
    });
    if (!anythingChanged){
      return;
    }
    setCalculatedResult(null);
    setRecognizedLatex("");
    setCalculationError("");
    redrawCanvas();
  };


  const undo = () => {
    if (undoStack.current.length === 0){
      return;
    }
    redoStack.current.push(cloneStrokes(strokes.current));
    strokes.current = undoStack.current.pop();
    setCalculatedResult(null);
    setRecognizedLatex("");
    setCalculationError("");
    redrawCanvas();
  };


  const redo = () => {
    if (redoStack.current.length === 0){
      return;
    }
    undoStack.current.push(cloneStrokes(strokes.current));
    strokes.current = redoStack.current.pop();
    setCalculatedResult(null);
    setRecognizedLatex("");
    setCalculationError("");
    redrawCanvas();
  };


  const clearCanvas = () => {
    if (strokes.current.length === 0){
      return;
    }
    saveHistory();
    strokes.current = [];
    setCalculatedResult(null);
    setRecognizedLatex("");
    setCalculationError("");
    redrawCanvas();
  };

// This is i'm do for showing predicted exn if it predictwd some worng then user can understand what have to change.

  const normalizeLatex = (latex) => {
    if (!latex || typeof latex !== "string"){
      return "";
    }
    let expression = latex
      // CoMER may escape the command prefix, returning "\\frac" instead of "\frac".
      .replace(/\\\\(?=[a-zA-Z])/g, "\\")
      // Multiplication
      .replace(/\\times/g, "×")
      .replace(/\\cdot/g, "×")
      // Division
      .replace(/\\div/g, "÷")
      // CoMER may wrap handwritten brackets in LaTeX sizing commands.
      .replace(/\\left/g, "")
      .replace(/\\right/g, "")
      // Convert fractions before braces are converted to parentheses.
      .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "($1)/($2)")
      .replace(/[\[\]{}]/g, (bracket) => (bracket === "[" || bracket === "{" ? "(" : ")"))
      // Minus
      .replace(/−/g, "-")
      // Remove LaTeX spacing
      .replace(/\\,/g, "")
      .replace(/\\;/g, "")
      .replace(/\\:/g, "")
      .replace(/\\!/g, "")
      .replace(/\\ /g, " ")
      // Remove whitespace
      .replace(/\s+/g, "");
  
    // before the first equals sign is used for calculation.
    const equalsIndex = expression.indexOf("=");
    if (equalsIndex !== -1){
      expression = expression.slice(0, equalsIndex + 1);
    }
    expression = expression.replace(/(\d|\))[xX](?=\d|\()/g, "$1×");
    return expression;
  };

  const validateRecognizedExpression = (expression) => {
    if (!expression || expression.trim() === ""){
      return{
        valid: false,
        error: "Could not recognize the handwriting.",
      };
    }
    const value = expression.replace(/\s+/g, "");
    if (!value.includes("=")){
      return{
        valid: false,
        error: "Please write '=' at the end of the expression.",
      };
    }
    if (!value.endsWith("=")){
      return{
        valid: false,
        error: "Invalid '=' position. Write '=' at the end.",
      };
    }
    const expressionWithoutEquals = value.slice(0, -1);
    const allowedPattern = /^[0-9+\-*/.×÷()]+$/;
    if (!allowedPattern.test(expressionWithoutEquals)){
      const invalidCharacter = [...expressionWithoutEquals].find(
        (char) => !/[0-9+\-*/.×÷()]/.test(char)
      );
      return {
        valid: false,
        error: `Unrecognized symbol "${invalidCharacter}". Please rewrite it.`,
      };
    }
    if (expressionWithoutEquals.length === 0){
      return {
        valid: false,
        error: "No expression was recognized before '='.",
      };
    }
    return {
      valid: true,
      expression: value,
    };
  };


  const handleRecognize = async () => {
    if (strokes.current.length === 0){
      return;
    }
    if (recognitionRunning.current){
      recognitionPending.current = true;
      return;
    }
    recognitionRunning.current = true;
    try {
      setIsRecognizing(true);
      setCalculatedResult(null);
      setRecognizedLatex("");
      setCalculationError("");
      // snapshot instead of a stroke array that the user may still edit.
      const recognitionStrokes = cloneStrokes(strokes.current);
      const result = await recognizeMath(recognitionStrokes);
      console.log("Recognition(CoMER) Result:", result);
      const latex = result.latex || "";
      const normalized = normalizeLatex(latex);
      console.log("Raw CoMER:", latex);
      console.log("Normalized:", normalized);
      const validation = validateRecognizedExpression(normalized);

      if (!validation.valid){
        console.warn("Invalid recognition:", latex);
        setRecognizedLatex("");
        setCalculatedResult(null);
        setCalculationError(validation.error);
        return;
      }
      const calculation = evalMath(normalized);
      console.log("Calculation Result:", calculation);

      if (!calculation.success){
        setRecognizedLatex("");
        setCalculatedResult(null);
        setCalculationError(
          `Could not calculate "${latex}". ${calculation.error}`
        );
        return;
      }
      setCalculatedResult(calculation.value);
      const displayExpression = calculation.expression
        .replace(/\\times/g, " × ")
        .replace(/\\cdot/g, " × ")
        .replace(/\\div/g, " ÷ ")           //So that user can't get confused
        .replace(/\*/g, " × ")
        .replace(/\//g, " ÷ ");
      setRecognizedLatex(
        `${displayExpression} = ${calculation.value}`
      );
      setCalculationError("");
    }catch(err){
      console.error("Recognition failed:", err);
      setRecognizedLatex("");
      setCalculatedResult(null);
      setCalculationError(
        "Could not recognize the handwriting. Please rewrite it."
      );
    }finally{
      recognitionRunning.current = false;
      setIsRecognizing(false);
      if (recognitionPending.current){
        recognitionPending.current = false;
        if (isEqualsSign()){
          scheduleRecognition();
        }
      }
    }
  };

  return (
    <div className="canvas-wrapper">
      {/* TOOLBAR */}
      <div className="toolbar">
        <button onClick={() => setTool("pen")} className={tool === "pen" ? "active" : ""}>
          Pen
        </button>

        <button
          onClick={() => setTool("pixel-eraser")}
          className={tool === "pixel-eraser" ? "active" : ""}
        >
          Eraser
        </button>

        <button
          onClick={() => setTool("stroke-eraser")}
          className={tool === "stroke-eraser" ? "active" : ""}
        >
          Stroke Eraser
        </button>

        <button onClick={undo}>Undo</button>
        <button onClick={redo}>Redo</button>
        <button onClick={clearCanvas}>Clear</button>

        <label>
          Width:
          <input
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
          />
          {strokeWidth}px
        </label>

        <button onClick={handleRecognize} disabled={isRecognizing}>
          {isRecognizing ? "Recognizing..." : "Recognize"}
        </button>
      </div>

      <canvas
        ref={canvasRef}
        className="ink-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      {(recognizedLatex || calculationError) && (
        <div className="recognition-result">
          {recognizedLatex && (
            <div>
              <strong>Recognized:</strong> <span>{recognizedLatex}</span>
            </div>
          )}
          {calculationError && (
            <div>
              <strong>Error:</strong> <span>{calculationError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default InkCanvas;
