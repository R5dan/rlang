// Lexer for MiniLang
export type TokenKind =
  | "num"
  | "str"
  | "ident"
  | "kw"
  | "sym"
  | "eof";

export interface Token {
  kind: TokenKind;
  value: string;
  pos: number;
}

const keywords = new Set([
  "let",
  "const",
  "fn",
  "return",
  "if",
  "else",
  "while",
  "import",
  "as",
  "native"
]);

export function lex(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;

  function isSpace(ch?: string) {
    return ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
  }
  function isDigit(ch?: string) {
    return ch >= "0" && ch <= "9";
  }
  function isIdStart(ch?: string) {
    return (
      (ch >= "a" && ch <= "z") ||
      (ch >= "A" && ch <= "Z") ||
      ch === "_" ||
      ch === "$"
    );
  }
  function isId(ch?: string) {
    return isIdStart(ch) || isDigit(ch);
  }

  while (i < n) {
    const ch = input[i];
    if (isSpace(ch)) {
      i++;
      continue;
    }
    if (ch === "/" && input[i + 1] === "/") {
      // line comment
      i += 2;
      while (i < n && input[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && input[i + 1] === "*") {
      // block comment
      i += 2;
      while (i + 1 < n && !(input[i] === "*" && input[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      let val = "";
      while (j < n && input[j] !== quote) {
        if (input[j] === "\\") {
          j++;
          if (j < n) {
            const esc = input[j];
            if (esc === "n") val += "\n";
            else if (esc === "t") val += "\t";
            else val += esc;
            j++;
          }
        } else {
          val += input[j++];
        }
      }
      j++; // skip closing
      tokens.push({ kind: "str", value: val, pos: i });
      i = j;
      continue;
    }
    if (isDigit(ch)) {
      let j = i;
      let val = "";
      while (j < n && (isDigit(input[j]) || input[j] === ".")) {
        val += input[j++];
      }
      tokens.push({ kind: "num", value: val, pos: i });
      i = j;
      continue;
    }
    if (isIdStart(ch)) {
      let j = i;
      let id = "";
      while (j < n && isId(input[j])) id += input[j++];
      tokens.push({
        kind: keywords.has(id) ? "kw" : "ident",
        value: id,
        pos: i
      });
      i = j;
      continue;
    }

    // symbols (operators and punctuation)
    const two = input.substr(i, 2);
    const three = input.substr(i, 3);
    const symbols = [
      "==",
      "!=",
      "<=",
      ">=",
      "&&",
      "||",
      "=>",
      "+=",
      "-=",
      "*=",
      "/="
    ];
    if (symbols.includes(two)) {
      tokens.push({ kind: "sym", value: two, pos: i });
      i += 2;
      continue;
    }
    const single = ch;
    tokens.push({ kind: "sym", value: single, pos: i });
    i++;
  }
  tokens.push({ kind: "eof", value: "", pos: i });
  return tokens;
}