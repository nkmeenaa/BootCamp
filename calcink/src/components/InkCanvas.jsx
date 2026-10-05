import {useEffect, useRef} from 'react';

function InkCanvas(){
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });


  //Canvas Setup

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#000000";
    }

    resizeCanvas();

    window.addEventListener('resize', resizeCanvas);

    return() => {
      window.removeEventListener('resize', resizeCanvas);
    };
  },[]);

  // Convert pointer position to canvas coordinates
  const getPointerPosition = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    return {
      x : event.clientX - rect.left,
      y : event.clientY - rect.top
    };
  };
  
  // Start drawing
  const handlePointerDown = (event) => {
    const canvas = canvasRef.current;
    drawing.current = true;
    canvas.setPointerCapture(event.pointerId);
    const point = getPointerPosition(event);
    lastPoint.current = point;
  };

  // Draw
  const handlePointerMove = (event) => {
    if (!drawing.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const point = getPointerPosition(event);
    ctx.beginPath();
    ctx.moveTo(
      lastPoint.current.x,
      lastPoint.current.y
    );

    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPoint.current = point;
  };

  //Stop drawing
  const handlePointerUp = () => {
    drawing.current = false;
  };

  return (
    <canvas
      ref={canvasRef}
      className="ink-canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}

export default InkCanvas;