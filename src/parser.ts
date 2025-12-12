import { Token, TokenType } from "./token";
import { lex } from "./lexer";
import {
  ArrayLiteral,
  AssignmentExpression,
  AssignmentOperator,
  AwaitExpression,
  BinaryExpression,
  BinaryOperator,
  CallExpression,
  Expression,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  Program,
  Statement,
  VariableDeclaration,
  ReturnStatement,
  ExpressionStatement,
} from "./ast";

export function parse(input: string): Program {
  const tokens = lex(input);
  let pos = 0;

  const peek = () => tokens[pos];
  const at = (type: TokenType) => peek().type === type;
  const consume = (type: TokenType, msg?: string): Token => {
    if (!at(type)) throw new Error(msg ?? `Expected ${type} but found ${peek().type}`);
    return tokens[pos++];
  };

  const eof = () => at("eof");

  const parseProgram = (): Program => {
    const body: Statement[] = [];
    while (!eof()) {
      body.push(parseStatement());
    }
    return { kind: "program", body };
  };

  const parseStatement = (): Statement => {
    if (at("let") || at("const") || at("sys")) return parseVariableOrSys();
    if (at("function") || (at("async") && tokens[pos + 1]?.type === "function")) return parseFunctionDecl();
    if (at("return")) return parseReturn();
    const expr = parseExpression();
    if (at("semicolon")) consume("semicolon");
    return { kind: "expr", expression: expr } satisfies ExpressionStatement;
  };

  const parseReturn = (): ReturnStatement => {
    consume("return");
    if (at("semicolon")) {
      consume("semicolon");
      return { kind: "return" };
    }
    const value = parseExpression();
    if (at("semicolon")) consume("semicolon");
    return { kind: "return", value };
  };

  const parseVariableOrSys = (): VariableDeclaration => {
    let sys = false;
    if (at("sys")) {
      consume("sys");
      sys = true;
    }
    const mutToken = consume(at("let") ? "let" : "const");
    const mutable = mutToken.type === "let";
    const name = consume("identifier", "Expected identifier").value!;
    consume("eq", "Expected =");
    const value = parseExpression();
    if (at("semicolon")) consume("semicolon");
    return { kind: "var", name, value, mutable, sys };
  };

  const parseFunctionDecl = (): FunctionDeclaration => {
    const fn = parseFunctionExpression(true);
    return { kind: "fun", fn: { ...fn, name: fn.name! } };
  };

  const parseFunctionExpression = (requireName = false): FunctionExpression => {
    let isAsync = false;
    if (at("async")) {
      consume("async");
      isAsync = true;
    }
    consume("function");
    let name: string | undefined;
    if (requireName || at("identifier")) {
      name = consume("identifier", "Expected function name").value!;
    }
    consume("lparen", "Expected (");
    const params: string[] = [];
    if (!at("rparen")) {
      do {
        const id = consume("identifier", "Expected parameter").value!;
        params.push(id);
        if (at("comma")) consume("comma");
        else break;
      } while (!at("rparen"));
    }
    consume("rparen", "Expected )");
    consume("lbrace", "Expected {");
    const body: Statement[] = [];
    while (!at("rbrace")) {
      body.push(parseStatement());
    }
    consume("rbrace", "Expected }");
    return { kind: "function", name, params, body, async: isAsync };
  };

  const parseExpression = (): Expression => parseAssignment();

  const parseAssignment = (): Expression => {
    const left = parseBinary();
    if (at("eq") || at("plus_eq") || at("minus_eq")) {
      const opToken = consume(peek().type);
      const op: AssignmentOperator =
        opToken.type === "eq" ? "=" : opToken.type === "plus_eq" ? "+=" : "-=";
      if (left.kind !== "identifier") throw new Error("Assignment target must be identifier");
      const value = parseAssignment();
      return { kind: "assign", op, target: left, value };
    }
    return left;
  };

  const parseBinary = (): Expression => {
    let expr = parseCall();
    while (at("plus") || at("minus")) {
      const opToken = consume(peek().type);
      const op: BinaryOperator = opToken.type === "plus" ? "+" : "-";
      const right = parseCall();
      expr = { kind: "binary", op, left: expr, right };
    }
    return expr;
  };

  const parseCall = (): Expression => {
    let expr = parsePrimary();
    while (at("lparen")) {
      consume("lparen");
      const args: Expression[] = [];
      if (!at("rparen")) {
        do {
          args.push(parseExpression());
          if (at("comma")) consume("comma");
          else break;
        } while (!at("rparen"));
      }
      consume("rparen", "Expected ) after arguments");
      expr = { kind: "call", callee: expr as Identifier, args };
    }
    return expr;
  };

  const parseArrayLiteral = (): ArrayLiteral => {
    consume("array");
    let maxLength: number | undefined;
    if (at("lt")) {
      consume("lt");
      const numTok = consume(peek().type === "int" ? "int" : "float", "Expected array max number");
      maxLength = Number(numTok.value);
      consume("gt", "Expected >");
    }
    const elements: Expression[] = [];
    // no surrounding braces, gather comma-separated expressions until statement end or closing )
    do {
      elements.push(parseAssignment());
      if (at("comma")) consume("comma");
      else break;
    } while (true);
    return { kind: "array", elements, maxLength };
  };

  const parsePrimary = (): Expression => {
    if (at("int")) return { kind: "int", value: Number(consume("int").value) };
    if (at("float")) return { kind: "float", value: Number(consume("float").value) };
    if (at("string")) return { kind: "string", value: consume("string").value ?? "" };
    if (at("identifier")) return { kind: "identifier", name: consume("identifier").value! };
    if (at("await")) {
      consume("await");
      return { kind: "await", expression: parsePrimary() } satisfies AwaitExpression;
    }
    if (at("array")) return parseArrayLiteral();
    if (at("async") || at("function")) return parseFunctionExpression();
    if (at("lparen")) {
      consume("lparen");
      const expr = parseExpression();
      consume("rparen", "Expected )");
      return expr;
    }
    throw new Error(`Unexpected token ${peek().type}`);
  };

  return parseProgram();
}

