export type TokenType =
  | "identifier"
  | "int"
  | "float"
  | "string"
  | "lbrace"
  | "rbrace"
  | "lparen"
  | "rparen"
  | "comma"
  | "semicolon"
  | "plus"
  | "minus"
  | "plus_eq"
  | "minus_eq"
  | "eq"
  | "lt"
  | "gt"
  | "arrow"
  | "return"
  | "let"
  | "const"
  | "function"
  | "async"
  | "await"
  | "sys"
  | "array"
  | "eof";

export interface Token {
  type: TokenType;
  value?: string;
  line: number;
  col: number;
}

