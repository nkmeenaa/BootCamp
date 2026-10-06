CalcInk is a browser-based handwritten mathematics calculator designed for the IIT Guwahati Inter IIT Bootcamp software challenge.

The user writes a mathematical expression directly on a canvas, for example:

```text
8 + 2 =
```

CalcInk recognizes the handwriting on-device, converts it into a mathematical expression, evaluates it using a safe custom parser, and displays the calculated result inline beside the handwritten equation.

## Key Features

- Handwritten math input using mouse, stylus, or touch
- Smooth canvas drawing with pointer events
- High-DPI canvas support
- Pressure-aware stroke width
- Pen tool
- Pixel eraser
- Stroke eraser
- Undo and redo
- Clear canvas
- Automatic recognition after a complete `=` is detected
- Re-recognition after editing an existing expression
- Inline calculated answer displayed beside the handwritten expression
- Recognition result sized approximately to the user's handwriting
- Multi-digit and decimal arithmetic support through the custom math parser
- Safe expression evaluation without JavaScript `eval()`
- Client-side/on-device handwriting recognition
- Local model files so the application can operate without a remote recognition API

## Tech Stack

### Frontend

- React
- JavaScript
- HTML5 Canvas
- CSS

### Handwriting Recognition

- CoMER handwritten mathematical expression recognition
- `ink-on`
- ONNX Runtime Web
- ONNX models running locally in the browser

### Mathematics

- Custom JavaScript expression parser
- BODMAS/PEMDAS-style operator precedence
- Safe evaluation without `eval()`

## How It Works

The application follows this pipeline:

```text
User handwriting
       |
       v
HTML5 Canvas
       |
       v
Stroke collection
       |
       v
Detect "="
       |
       v
CoMER handwriting recognition
       |
       v
Recognized mathematical expression
       |
       v
Expression normalization
       |
       v
Custom math parser
       |
       v
Calculated result
       |
       v
Inline answer on canvas
```

### 1. Drawing

Every handwritten character is stored as a collection of strokes. Each stroke contains its points, width, drawing tool, and pointer information.

The canvas supports:

- Mouse
- Touch
- Stylus
- Pressure-based width
- High-DPI rendering

### 2. Stroke History

CalcInk stores stroke history separately from the visual canvas so that undo and redo can restore the actual drawing state.

The application clones stroke data when saving history to avoid accidental mutation of previous states.

### 3. Detecting `=`

Recognition is intentionally not triggered after every stroke.

The application checks whether the drawing contains a pair of horizontal strokes that can represent an equals sign. This prevents expensive handwriting recognition from running continuously while the user is still writing.

### 4. Handwriting Recognition

CalcInk uses the CoMER model through `ink-on` and ONNX Runtime Web.

The model files are stored locally:

```text
public/
└── models/
    └── comer/
        ├── encoder_int8.onnx
        ├── decoder_int8.onnx
        └── vocab.json
```

Inference happens in the browser rather than through a server-side recognition API.

### 5. Mathematical Evaluation

The recognized expression is passed to the application's custom parser.

The parser is responsible for:

- Operator precedence
- Multi-digit numbers
- Decimal numbers
- Negative numbers
- Arithmetic operators
- Invalid expression handling
- Division-by-zero handling

JavaScript `eval()` is not used.

### 6. Result Projection

After successful evaluation, the result is drawn directly onto the canvas.

For example:

```text
8 + 2 = 10
```

The answer is positioned after the handwritten equation and its font size is estimated from the height of the handwriting.

## Installation

Clone the project and install the dependencies:

```bash
npm install
```

The handwriting recognition dependencies are:

```bash
npm install ink-on onnxruntime-web
```

Start the Vite development server:

```bash
npm run dev
```

The application will normally be available at:

```text
http://localhost:5173
```

## Model Setup

Place the CoMER model files in:

```text
public/models/comer/
```

Required files:

```text
encoder_int8.onnx
decoder_int8.onnx
vocab.json
```

The application loads them using paths such as:

```text
/models/comer/encoder_int8.onnx
/models/comer/decoder_int8.onnx
/models/comer/vocab.json
```

The model is loaded and executed locally by ONNX Runtime Web.

## Usage

1. Open CalcInk in the browser.
2. Select the **Pen** tool.
3. Write an arithmetic expression.
4. Finish the expression with a handwritten `=`.
5. CalcInk detects the equals sign.
6. The handwriting recognition model processes the strokes.
7. The recognized expression is passed to the math parser.
8. The result is displayed inline on the canvas.

Example:

```text
5 + 7 =
```

Result:

```text
5 + 7 = 12
```

### Editing an Expression

An existing expression can be edited using the stroke eraser.

For example:

```text
5 + 4 =
```

Erase `4` and write `7`:

```text
5 + 7 =
```

CalcInk can detect that the existing expression still contains an equals sign and schedule recognition again.

## Tools

### Pen

Draw handwritten strokes.

### Eraser

Erase portions of strokes at the pixel level.

### Stroke Eraser

Remove complete strokes from the stored stroke collection.

### Undo

Restore the previous stroke state.

### Redo

Restore a previously undone state.

### Clear

Remove the complete drawing and calculated result.

### Width

Change the pen stroke width.

### Recognize

Manually trigger handwriting recognition when needed.

## Offline and On-Device Design

A major design goal of CalcInk is to keep computation on the user's device.

The intended architecture is:

```text
Browser
  |
  +-- React UI
  |
  +-- Canvas
  |
  +-- CoMER / ONNX Runtime Web
  |
  +-- Math Parser
```

No remote handwriting-recognition API is required by the application.

The ONNX model files are served from the application's own `public` directory and inference is performed in the browser.

## Performance Considerations

Handwriting recognition is considerably more expensive than drawing.

CalcInk therefore avoids running recognition after every pointer movement.

Recognition is scheduled only after the application detects a completed equals sign, with a short debounce period. Recognition state is also tracked so that multiple recognition operations are not started simultaneously.

The drawing path itself uses direct canvas line rendering so that pointer movement remains responsive.

## Current Recognition Limitations

Handwritten mathematical recognition is probabilistic and can make mistakes.

For example, depending on handwriting style, the model may confuse characters such as:

```text
4
21
θ
```

or return LaTeX-style symbols instead of the exact CalcInk arithmetic symbol.

The application therefore needs a normalization and validation layer between model output and the calculator.

Unsupported recognition should not be treated as a valid arithmetic expression.

## Current Project Status

### Implemented

- Canvas-based handwriting
- Mouse/stylus/touch input
- High-DPI rendering
- Pressure-aware stroke width
- Pen
- Pixel eraser
- Stroke eraser
- Undo
- Redo
- Clear
- Stroke history cloning
- CoMER model loading
- Local ONNX model inference
- Automatic equals-sign detection
- Debounced recognition
- Recognition state handling
- Custom mathematical evaluation
- Inline answer rendering

### Ongoing Improvements

- Improve recognition accuracy for handwritten digits and operators
- Normalize CoMER LaTeX output into the limited CalcInk symbol set
- Reject unsupported symbols safely
- Prevent stale recognition results from replacing newer drawing states
- Improve recognition behavior while editing an existing expression
- Further optimize inference so recognition does not interfere with drawing responsiveness
- Add broader automated tests for recognition and mathematical parsing

## Suggested Project Structure

```text
src/
├── Calculator/
│   └── mathParser.js
│
├── recognition/
│   └── mathRecognizer.js
│
├── components/
│   └── InkCanvas.jsx
│
└── ...

public/
└── models/
    └── comer/
        ├── encoder_int8.onnx
        ├── decoder_int8.onnx
        └── vocab.json
```

## Safety

CalcInk does not evaluate recognized expressions using JavaScript's `eval()`.

Instead, recognized input is processed by the application's own parser. This allows the calculator to explicitly control which operators and numeric forms are accepted and to handle malformed expressions and division by zero safely.

## Future Improvements

- More robust recognition normalization
- Better handwritten digit/operator accuracy
- Recognition confidence handling
- More robust editing of existing equations
- Web Worker-based inference isolation
- Improved multi-threaded WASM configuration where deployment headers permit it
- Automated unit and integration tests
- Better error feedback for malformed expressions
- Additional mathematical operations if supported by the project requirements

## License

Add the project's chosen license here before publishing the repository.
"""

path = "/mnt/data/README.md"
pypandoc.convert_text(readme, "md", format="md", outputfile=path, extra_args=["--standalone"])
print(path)
