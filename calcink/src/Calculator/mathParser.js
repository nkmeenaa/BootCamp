export function normalise(latex) {
  if (!latex || typeof latex !== "string") return "";

  let exp = latex;
  exp = exp.replace(/\\,/g, "");
  exp = exp.replace(/\\;/g, "");
  exp = exp.replace(/\\:/g, "");
  exp = exp.replace(/\\!/g, "");
  exp = exp.replace(/\\times/g, "×");
  exp = exp.replace(/\\cdot/g, "×");
  exp = exp.replace(/\\div/g, "÷");
  exp = exp.replace(/\\left/g, "");
  exp = exp.replace(/\\right/g, "");
  exp = exp.replace(/[\[\]{}]/g, (bracket) => (bracket === "[" || bracket === "{" ? "(" : ")"));
  exp = exp.replace(/−/g, "-");

  // Some recognition results use a handwritten x instead of LaTeX \times.
  exp = exp.replace(/(\d|\))\s*[xX]\s*(?=\d|\()/g, "$1×");

  const index = exp.indexOf("=");
  //to stop eqn here only
  if (index !== -1) exp = exp.substring(0, index);
  exp = exp.replace(/×/g, "*");
  exp = exp.replace(/÷/g, "/");
  exp = exp.replace(/\s+/g, "");

  const unsupportedCommand = exp.match(/\\[a-zA-Z]+/);
  if (unsupportedCommand) {
    throw new Error(`Unsupported symbol: ${unsupportedCommand[0]}`);
  }
  return exp;
}

function tokenize(exp) {
  const tokens = [];
  let i = 0;
  while (i < exp.length) {
    const char = exp[i];
    if (/[0-9.]/.test(char)) {
      let number = "";
      let dotCount = 0;

      while (i < exp.length && /[0-9.]/.test(exp[i])) {
        if (exp[i] === ".") {
          dotCount++;
        }
        number += exp[i];
        i++;
      }

      if (dotCount > 1) {
        throw new Error("Invalid decimal number");
      }
      if (number === ".") {
        throw new Error("Invalid number");
      }
      tokens.push({
        type: "number",
        value: Number(number),
      });
      continue;
    }

    if (char === "+" || char === "-" || char === "*" || char === "/") {
      tokens.push({
        type: "operator",
        value: char,
      });
      i++;
      continue;
    }
    if (char === "(" || char === ")") {
      tokens.push({
        type: "parenthesis",
        value: char,
      });

      i++;
      continue;
    }
    throw new Error(`Unsupported symbol: ${char}`);
  }
  return tokens;
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.position = 0;
  }

  current() {
    return this.tokens[this.position];
  }

  consume() {
    return this.tokens[this.position++];
  }

  parse() {
    if (this.tokens.length === 0) {
      throw new Error("Empty expression");
    }

    const result = this.parseExpression();
    if (this.position < this.tokens.length) {
      throw new Error("Invalid expression");
    }
    return result;
  }

  // + and -
  parseExpression() {
    let value = this.parseTerm();
    while (true) {
      const token = this.current();
      if (!token || token.type !== "operator") {
        break;
      }
      if (token.value !== "+" && token.value !== "-") {
        break;
      }
      this.consume();
      const right = this.parseTerm();
      if (token.value === "+") {
        value += right;
      } else {
        value -= right;
      }
    }

    return value;
  }

  // * and /
  parseTerm() {
    let value = this.parseUnary();
    while (true) {
      const token = this.current();
      if (!token || token.type !== "operator") {
        break;
      }
      if (token.value !== "*" && token.value !== "/") {
        break;
      }
      this.consume();
      const right = this.parseUnary();
      if (token.value === "*") {
        value *= right;
      } else {
        if (right === 0) {
          throw new Error("Division by zero");
        }
        value /= right;
      }
    }
    return value;
  }

  // Handles negative numbers
  parseUnary() {
    const token = this.current();

    if (token && token.type === "operator" && (token.value === "+" || token.value === "-")) {
      this.consume();

      const value = this.parseUnary();

      if (token.value === "-") {
        return -value;
      }

      return value;
    }

    return this.parsePrimary();
  }

  // Numbers and parentheses
  parsePrimary() {
    const token = this.current();

    if (!token) {
      throw new Error("Unexpected end of expression");
    }

    // Number
    if (token.type === "number") {
      this.consume();
      return token.value;
    }

    // (
    if (token.type === "parenthesis" && token.value === "(") {
      this.consume();

      const value = this.parseExpression();

      const closing = this.current();

      if (!closing || closing.type !== "parenthesis" || closing.value !== ")") {
        throw new Error("Missing closing parenthesis");
      }

      this.consume();

      return value;
    }

    throw new Error("Invalid expression");
  }
}

//Calc Functn

export function evalMath(latex) {
  let exp = "";
  try {
    exp = normalise(latex);
    if (!exp) {
      return {
        success: false,
        value: null,
        expression: "",
        error: "Empty expression",
      };
    }
    const tokens = tokenize(exp);
    const parser = new Parser(tokens);
    const value = parser.parse();
    if (!Number.isFinite(value)) {
      return {
        success: false,
        value: null,
        expression: exp,
        error: "Invalid result",
      };
    }
    return {
      success: true,
      value,
      expression: exp,
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      value: null,
      expression: exp,
      error: err.message,
    };
  }
}
