import { Token, TokenType } from "./token";

const KEYWORDS: Record<string, TokenType> = {
  let: "let",
  const: "const",
  function: "function",
  async: "async",
  await: "await",
  return: "return",
  sys: "sys",
  array: "array",
};

export function lex(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  const push = (type: TokenType, value?: string) => {
    tokens.push({ type, value, line, col });
  };

  const advance = () => {
    const ch = input[i++];
    if (ch === "\n") {
      line += 1;
      col = 1;
    } else {
      col += 1;
    }
    return ch;
  };

  const peek = () => input[i];

  const isAlpha = (c?: string) => !!c && /[A-Za-z_]/.test(c);
  const isAlnum = (c?: string) => !!c && /[A-Za-z0-9_]/.test(c);

  while (i < input.length) {
    const ch = peek();
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
      advance();
      continue;
    }

    // comments
    if (ch === "/" && input[i + 1] === "/") {
      while (i < input.length && peek() !== "\n") advance();
      continue;
    }

    // strings with ', ", or `
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = advance();
      let value = "";
      while (i < input.length && peek() !== quote) {
        const c = advance();
        if (c === "\\") {
          const next = advance();
          value += next;
        } else {
          value += c;
        }
      }
      if (peek() !== quote) throw new Error(`Unterminated string at ${line}:${col}`);
      advance();
      push("string", value);
      continue;
    }

    // numbers
    if (/[0-9]/.test(ch)) {
      let num = "";
      let hasDot = false;
      while (/[0-9.]/.test(peek())) {
        const c = advance();
        if (c === ".") {
          if (hasDot) throw new Error(`Invalid number at ${line}:${col}`);
          hasDot = true;
        }
        num += c;
      }
      push(hasDot ? "float" : "int", num);
      continue;
    }

    // identifiers / keywords
    if (isAlpha(ch)) {
      let id = "";
      while (isAlnum(peek())) id += advance();
      const kw = KEYWORDS[id];
      if (kw) push(kw);
      else push("identifier", id);
      continue;
    }

    // symbols
    switch (ch) {
      case "{":
        advance();
        push("lbrace");
        continue;
      case "}":
        advance();
        push("rbrace");
        continue;
      case "(":
        advance();
        push("lparen");
        continue;
      case ")":
        advance();
        push("rparen");
        continue;
      case ",":
        advance();
        push("comma");
        continue;
      case ";":
        advance();
        push("semicolon");
        continue;
      case "+":
        advance();
        if (peek() === "=") {
          advance();
          push("plus_eq");
        } else {
          push("plus");
        }
        continue;
      case "-":
        advance();
        if (peek() === "=") {
          advance();
          push("minus_eq");
        } else {
          push("minus");
        }
        continue;
      case "=":
        advance();
        push("eq");
        continue;
      case "<":
        advance();
        push("lt");
        continue;
      case ">":
        advance();
        push("gt");
        continue;
    }

    throw new Error(`Unexpected character '${ch}' at ${line}:${col}`);
  }

  tokens.push({ type: "eof", line, col });
  return tokens;
}

