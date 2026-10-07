//from offical vue code i used this here by converting react to load the model and vocab
import { InferenceEngine, preprocessStrokes, isStrokeMeaningful, loadVocab } from "ink-on/core";
let engine = null;
let vocab = null;
let initialized = false;

export async function initMathRecognizer(){
  if (initialized){
    return;
  }
  console.log("Loading CoMER model...");
  vocab = await loadVocab("/models/comer/vocab.json");
  engine = new InferenceEngine({
    encoderUrl: "/models/comer/encoder_int8.onnx",
    decoderUrl: "/models/comer/decoder_int8.onnx",
    executionProvider: "wasm",
    beamWidth: 3,
  });

  await engine.init();
  initialized = true;
  console.log("CoMER model loaded successfully.");
}

function convertCanvasStrokes(strokes){
  return strokes
    .filter((stroke) => stroke.tool === "pen")
    .map((stroke) => ({
      points: stroke.points.map((point) => ({
        x: point.x,
        y: point.y,
      })),
      lineWidth: stroke.width,
    }));
}
export async function recognizeMath(strokes){
  if (!initialized){
    await initMathRecognizer();
  }
  const modelStrokes = convertCanvasStrokes(strokes);
  if (modelStrokes.length === 0){
    return {
      latex: "",
      raw: null,
    };
  }
  if (!isStrokeMeaningful(modelStrokes)){
    return {
      latex: "",
      raw: null,
    };
  }
  const input = preprocessStrokes(modelStrokes);
  const result = await engine.recognize(input, vocab);
  return {
    latex: result.latex,
    raw: result,
  };
}
