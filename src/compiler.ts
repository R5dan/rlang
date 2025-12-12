import { parse } from "./parser";
import { checkSemantics } from "./semantics";
import { BytecodeFunction, BytecodeProgram, Instruction } from "./bytecode";
import { Program, Statement, Expression, FunctionExpression, AssignmentExpression, BinaryExpression, CallExpression } from "./ast";
import { CompileOptions, SourceFile } from "./types";

export async function loadSourceFile(path: string): Promise<SourceFile> {
  const file = Bun.file(path);
  return { path, content: await file.text() };
}

export async function compileSource(
  source: SourceFile,
  options: CompileOptions = { defaultArrayMax: 256 }
): Promise<{ bytecode: BytecodeProgram }> {
  const program = parse(source.content);
  const semantic = checkSemantics(program, options);
  const emitter = new Emitter(program, options);
  const bytecode = emitter.emit(semantic.functions, [...semantic.globals.keys()]);
  bytecode.source = source.path;
  return { bytecode };
}

class Emitter {
  private functions = new Map<string, BytecodeFunction>();
  private counter = 0;
  constructor(private program: Program, private options: CompileOptions) {}

  emit(fnMap: Map<string, FunctionExpression>, globals: string[]): BytecodeProgram {
    for (const fn of fnMap.values()) this.addFunction(fn);
    const main: Instruction[] = [];
    for (const stmt of this.program.body) {
      if (stmt.kind === "fun") continue; // already emitted
      this.emitStatement(stmt, main);
    }
    return { source: "", main, functions: Object.fromEntries(this.functions), globals };
  }

  private addFunction(fn: FunctionExpression & { name: string }) {
    const instructions: Instruction[] = [];
    // params are pre-bound on frame creation in VM
    for (const stmt of fn.body) {
      this.emitStatement(stmt, instructions);
    }
    instructions.push({ op: "return" });
    this.functions.set(fn.name, { name: fn.name, params: fn.params, async: fn.async, instructions });
  }

  private emitStatement(stmt: Statement, out: Instruction[]) {
    switch (stmt.kind) {
      case "var": {
        this.emitExpression(stmt.value, out);
        out.push({ op: "declare", name: stmt.name, mutable: stmt.mutable, sys: stmt.sys });
        break;
      }
      case "expr": {
        this.emitExpression(stmt.expression, out);
        break;
      }
      case "return": {
        if (stmt.value) this.emitExpression(stmt.value, out);
        out.push({ op: "return" });
        break;
      }
      case "fun":
        // handled in emit
        break;
    }
  }

  private emitExpression(expr: Expression, out: Instruction[]) {
    switch (expr.kind) {
      case "string":
        out.push({ op: "push_string", value: expr.value });
        return;
      case "int":
        out.push({ op: "push_int", value: expr.value });
        return;
      case "float":
        out.push({ op: "push_float", value: expr.value });
        return;
      case "identifier":
        out.push({ op: "load", name: expr.name });
        return;
      case "array": {
        for (const el of expr.elements) this.emitExpression(el, out);
        out.push({ op: "make_array", max: expr.maxLength ?? this.options.defaultArrayMax, count: expr.elements.length });
        return;
      }
      case "binary":
        this.emitExpression(expr.left, out);
        this.emitExpression(expr.right, out);
        out.push({ op: expr.op === "+" ? "add" : "sub" });
        return;
      case "assign":
        this.emitAssignment(expr, out);
        return;
      case "call":
        this.emitCall(expr, out);
        return;
      case "function": {
        throw new Error("Function expressions must be called directly");
      }
      case "await":
        this.emitExpression(expr.expression, out);
        out.push({ op: "await" });
        return;
    }
  }

  private emitAssignment(expr: AssignmentExpression, out: Instruction[]) {
    if (expr.op === "=") {
      this.emitExpression(expr.value, out);
      out.push({ op: "store", name: expr.target.name });
      return;
    }
    // compound
    out.push({ op: "load", name: expr.target.name });
    this.emitExpression(expr.value, out);
    out.push({ op: expr.op === "+=" ? "add" : "sub" });
    out.push({ op: "store", name: expr.target.name });
  }

  private emitCall(expr: CallExpression, out: Instruction[]) {
    for (const arg of expr.args) this.emitExpression(arg, out);
    if (expr.callee.kind === "identifier") {
      const name = expr.callee.name;
      out.push({ op: "call", name, argc: expr.args.length, async: false });
      return;
    }
    if (expr.callee.kind === "function") {
      const name = expr.callee.name ?? `anon_${this.counter++}`;
      this.addFunction({ ...expr.callee, name });
      out.push({ op: "call", name, argc: expr.args.length, async: expr.callee.async });
      return;
    }
    throw new Error("Unsupported callee");
  }
}

