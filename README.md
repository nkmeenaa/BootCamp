# CalcInk

CalcInk is a browser-based handwritten mathematics calculator.

The application allows the user to write mathematical expressions directly on a canvas using a mouse, stylus, or touch input. The handwriting is recognized on-device.

## Features

- Handwritten mathematical expression input
- Mouse, stylus, and touch support
- Smooth canvas drawing
- Undo and redo
- Clear canvas
- Stroke eraser and pixel eraser
- Adjustable stroke width
- High-DPI canvas rendering
- Handwritten recognition for mathematical symbols
- Arithmetic expression evaluation using BODMAS/PEMDAS precedence
- Support for integers, decimals, negative numbers, `+`, `−`, `×`, `÷`, `=`, and parentheses
- Division-by-zero and malformed-expression handling
- Client-side/on-device inference
- No backend API is required for recognition

## Technology Stack

- **Frontend:** React
- **Build Tool:** Vite
- **Handwriting Recognition:** CoMER
- **Browser ML Runtime:** ONNX Runtime Web
- **Recognition Integration:** `ink-on/core`
- **Model Format:** ONNX
- **Language:** JavaScript

# Installation and Setup

## 1. Clone the project

```bash
git clone https://github.com/nkmeenaa/CalcInk
cd calcink
```

## 2. Install dependencies

```bash
npm install
```

The recognition stack uses:

```bash
npm install ink-on onnxruntime-web
```

If these packages are already present in `package.json`, running only `npm install` is sufficient.

## 3. Verify the model files

The pretrained recognition model is stored locally in:

```text
public/
└── models/
    └── comer/
        ├── encoder_int8.onnx
        ├── decoder_int8.onnx
        └── vocab.json
```

These files are required by the recognition module and are loaded from `/models/comer/`.

## 4. Start the development server

```bash
npm run dev
```

Vite will normally make the application available at:

```text
http://localhost:5173/
```

## 5. Build for production

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

# How to Use CalcInk

1. Open the application in your browser.
2. Draw a mathematical expression on the canvas.
3. Use the editing tools when necessary: Pen, Stroke Eraser, Pixel Eraser, Undo, Redo, and Clear.
4. Write an expression such as:

```text
18 + 4 × 3 =
```

5. The handwriting recognition model converts the drawing into a mathematical representation.
6. The expression is normalized and passed to the mathematical parser.
7. The parser evaluates the expression according to operator precedence.
8. The calculated result is displayed alongside the expression.

Example:

```text
18 + 4 × 3 = 30
```

# Handwriting Recognition Model

## Model Name

**CoMER — Coverage-guided Multi-scale Encoder-decoder Transformer**

CalcInk uses the **CoMER handwritten mathematical expression recognition model**, integrated for browser inference through **ink-on** and **ONNX Runtime Web**.

### Model Source

**ink-on:**
https://github.com/kimseungdae/ink-on

The `ink-on` project provides a framework-agnostic browser inference core based on CoMER and can be used from React/JavaScript through `ink-on/core`.

### Underlying CoMER Source

https://github.com/Green-Wood/CoMER

### CoMER Paper

https://arxiv.org/abs/2207.04410

### License / Attribution

The `ink-on` project is released under the **Apache License 2.0**. CalcInk uses its browser-oriented CoMER/ONNX integration and attributes the underlying CoMER research to its original authors and source repository.

When redistributing the project, retain the applicable upstream license and attribution notices for `ink-on`, CoMER, and ONNX Runtime Web.

# Model Files

CalcInk uses these pretrained model assets:

| File | Purpose |
|---|---|
| `encoder_int8.onnx` | INT8-quantized CoMER encoder |
| `decoder_int8.onnx` | INT8-quantized autoregressive decoder |
| `vocab.json` | Token vocabulary used to map model outputs to mathematical symbols |

The files are stored under:

```text
public/models/comer/
```

The model is **not trained by CalcInk**. The project uses an existing pretrained model as required by the challenge.

# Model Architecture

The recognition pipeline is:

```text
User handwriting
      │
      ▼
Canvas stroke collection
      │
      ▼
Stroke preprocessing
      │
      ▼
Normalized model input
      │
      ▼
CoMER Encoder
(DenseNet + Transformer)
      │
      ▼
Autoregressive Transformer Decoder
      │
      ▼
Token IDs
      │
      ▼
vocab.json
      │
      ▼
Recognized mathematical expression
      │
      ▼
Math normalizer/parser
      │
      ▼
Calculated result
```

CoMER combines visual feature extraction with Transformer-based sequence modeling for handwritten mathematical expression recognition. The `ink-on` implementation preprocesses the captured strokes before passing them to the ONNX encoder and decoder.

# Recognition Pipeline in CalcInk

The recognition code uses the framework-independent API from `ink-on/core`.

```text
Canvas strokes
    ↓
convertCanvasStrokes()
    ↓
isStrokeMeaningful()
    ↓
preprocessStrokes()
    ↓
InferenceEngine
    ↓
CoMER ONNX encoder
    ↓
CoMER ONNX decoder
    ↓
Recognized expression
```

The model is configured with:

```javascript
const engine = new InferenceEngine({
  encoderUrl: "/models/comer/encoder_int8.onnx",
  decoderUrl: "/models/comer/decoder_int8.onnx",
  executionProvider: "wasm",
  beamWidth: 3,
});
```

# Mathematical Expression Parser

The recognized expression is **not executed using JavaScript `eval()`**.

CalcInk uses normalization, tokenization, and a recursive-descent parser:

```text
Recognized expression
        ↓
Normalization
        ↓
Tokenization
        ↓
Parsing
        ↓
Operator precedence
        ↓
Result
```

The parser handles numbers, decimal values, unary `+`/`-`, addition, subtraction, multiplication, division, parentheses, division-by-zero detection, and invalid expressions.

For example:

```text
2 + 4 × 3
```

is evaluated as:

```text
2 + (4 × 3)
```

and produces:

```text
14
```

# Safety and Invalid Input Handling

The parser does not execute arbitrary JavaScript. Expressions are tokenized and validated first. Unsupported characters, malformed numbers, invalid operators, missing parentheses, and division by zero are reported as errors.

Example:

```text
10 / 0
```

produces a division-by-zero error rather than a result.

# On-Device and Offline Design

CalcInk is designed around client-side execution:

```text
Browser
 ├── React UI
 ├── Canvas
 ├── Math Parser
 ├── ONNX Runtime Web
 └── Local CoMER model files
```

There is no application backend involved in recognition. Once the application assets and model files are available locally, handwriting recognition can be performed in the browser without sending the handwritten expression to a remote inference API.

ONNX Runtime Web runs ONNX models directly in browsers using browser execution backends such as WebAssembly.

# Project Structure

```text
CalcInk/
├── public/
│   └── models/
│       └── comer/
│           ├── encoder_int8.onnx
│           ├── decoder_int8.onnx
│           └── vocab.json
│
├── src/
│   ├── components/
│   │   └── InkCanvas.jsx
│   │
│   ├── recognition/
│   │   └── mathRecognizer.js
│   │
│   └── ...
│
├── package.json
├── vite.config.js
└── README.md
```

# Important Notes

### Model loading

The first recognition request may take longer because the ONNX model must be initialized.

### Browser support

Use a modern browser with Canvas and WebAssembly support.

### Model size

The `ink-on` project documents INT8 encoder and decoder assets totaling approximately 7.2 MB.

### Multi-threaded WASM

Multi-threaded WebAssembly execution can require:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Without these headers, the runtime can fall back to single-threaded execution.

# References

1. **ink-on — Browser-based handwritten math recognition using CoMER**  
   https://github.com/kimseungdae/ink-on

2. **CoMER — Official implementation**  
   https://github.com/Green-Wood/CoMER

3. **CoMER Research Paper**  
   https://arxiv.org/abs/2207.04410

4. **ONNX Runtime Web**  
   https://github.com/microsoft/onnxruntime

