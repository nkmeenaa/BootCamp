# CalcInk
Live at : https://boot-camp-zeta.vercel.app/

CalcInk is a browser-based handwritten mathematics calculator.

## Quick Start

### 1. Install dependencies

Clone the repository and open the project folder:

```bash
git clone "https://github.com/nkmeenaa/CalcInk"
cd calcink
```

Install the project dependencies:

```bash
npm install
```

The project uses the following packages for handwritten math recognition:

```bash
npm install ink-on onnxruntime-web
```

If these packages are already present in `package.json`, running `npm install` is sufficient.

### 2. Run the application locally

Start the Vite development server:

```bash
npm run dev
```

Open the local URL shown by Vite, normally:

```text
http://localhost:5173
```

### 3. Build for production

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

---

## How to Use

1. Open CalcInk in the browser.
2. Draw a mathematical expression using a mouse, stylus, or touch.
3. Use the available tools such as undo, redo, clear, and eraser when needed.
4. Write expressions such as:

```text
18 + 4 × 3 =
```

5. CalcInk recognizes the handwriting and evaluates the expression.
6. The mathematical parser follows standard BODMAS/PEMDAS operator precedence.

---

# Pre-trained Model Attribution

## Model

**CoMER — Coverage-guided Multi-scale Encoder-decoder Transformer**

CalcInk uses the pretrained **CoMER** handwritten mathematical expression recognition model through the browser-oriented **ink-on** integration and **ONNX Runtime Web**.

### Source

**ink-on:**  
https://github.com/kimseungdae/ink-on

**CoMER official implementation:**  
https://github.com/Green-Wood/CoMER

**CoMER paper:**  
https://arxiv.org/abs/2207.04410

### License

The `ink-on` project is released under the **Apache License 2.0**.

The underlying CoMER implementation is attributed to its original authors and source repository. The upstream repository should be consulted for its applicable licensing and attribution terms when redistributing the underlying model.

### Architecture

The recognition pipeline is:

```text
Handwritten strokes
        ↓
Stroke preprocessing
        ↓
CoMER Encoder
(DenseNet + Transformer)
        ↓
Autoregressive Transformer Decoder
        ↓
Token IDs
        ↓
vocab.json
        ↓
Recognized mathematical expression
```

The `ink-on` documentation describes preprocessing that resamples strokes, renders them with Bézier curves, scales the input to a 256-pixel height with dynamically aligned width, and converts it into a grayscale Float32 tensor with a padding mask.

The CoMER model uses:

- **DenseNet** for visual feature extraction
- **Transformer Encoder** for contextual representation
- **Autoregressive Transformer Decoder** for mathematical expression generation
- **Coverage attention** during decoding
- **Beam search** for selecting recognition candidates

CalcInk uses the INT8 ONNX model files locally:

```text
public/
└── models/
    └── comer/
        ├── encoder_int8.onnx
        ├── decoder_int8.onnx
        └── vocab.json
```

The `ink-on` project documents the INT8 encoder and decoder as approximately **7.2 MB combined**.

---

## Recognition Runtime

CalcInk uses:

```text
React
  ↓
Canvas stroke input
  ↓
ink-on/core
  ↓
ONNX Runtime Web
  ↓
CoMER ONNX model
  ↓
Recognized expression
  ↓
Math parser
  ↓
Calculated result
```

The recognition runs in the browser using ONNX Runtime Web rather than requiring a remote inference API.

## References

- ink-on: https://github.com/kimseungdae/ink-on
- CoMER: https://github.com/Green-Wood/CoMER
- CoMER Paper: https://arxiv.org/abs/2207.04410
- ONNX Runtime Web: https://github.com/microsoft/onnxruntime
