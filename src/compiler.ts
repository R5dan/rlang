import * as AST from "./ast.js";

/*
 Bytecode format:
 Instructions are objects { op: string, arg?: any }
 Ops:
  - CONST idx
  - LOAD name
  - STORE name
  - POP
  - ADD, SUB, MUL, DIV, MOD
  - EQ, NEQ, LT, GT, LE, GE
  - JUMP target (pc)
  - JUMP_IF_FALSE target
  - CALL name argCount
  - CALL_NATIVE name argCount
  - RETURN
  - HALT
 Constants table holds literals and strings
*/

export type Instr =
	| { op: "CONST"; arg: number }
	| { op: "LOAD"; arg: string }
	| { op: "STORE"; arg: string }
	| { op: "POP" }
	| { op: "ADD" }
	| { op: "SUB" }
	| { op: "MUL" }
	| { op: "DIV" }
	| { op: "MOD" }
	| { op: "EQ" }
	| { op: "NEQ" }
	| { op: "LT" }
	| { op: "GT" }
	| { op: "LE" }
	| { op: "GE" }
	| { op: "JUMP"; arg: number }
	| { op: "JUMP_IF_FALSE"; arg: number }
	| { op: "CALL"; arg: { name: string; argc: number } }
	| { op: "CALL_NATIVE"; arg: { name: string; argc: number } }
	| { op: "RETURN" }
	| { op: "HALT" };

export interface Bytecode {
	instrs: Instr[];
	consts: any[];
}

export function compile(prog: AST.Program, nativeNames: Set<string>): Bytecode {
	const instrs: Instr[] = [];
	const consts: any[] = [];

	function addConst(v: any) {
		const idx = consts.indexOf(v);
		if (idx >= 0) return idx;
		consts.push(v);
		return consts.length - 1;
	}

	function emit(i: Instr) {
		instrs.push(i);
	}

	// compile top-level: functions become callable via CALL name
	for (const s of prog.body) {
		if (s.type === "FuncDecl") {
			// compile function into a named chunk by emitting a top-level callable stub:
			// We'll implement functions as top-level instructions prefixed with a label
			// CALL will call by name and the VM will look up label positions.
			// So we record label as a pseudo-instruction: STORE __label__name -> its PC
			// For simplicity, emit a special CONST label via STORE of metadata (VM will scan)
		}
	}

	// We'll build a label table: function name -> address
	const labelPositions = new Map<string, number>();
	// First compile functions, emitting their code and storing position
	for (const s of prog.body) {
		if (s.type === "FuncDecl") {
			labelPositions.set(s.name, instrs.length);
			// function prologue isn't creating a new frame explicitly for this simple VM
			// We treat RETURN as returning to caller.
			// Compile body statements
			for (const st of s.body) compileStmt(st);
			// ensure RETURN at end
			emit({ op: "RETURN" });
		}
	}

	// After functions, emit main entry that calls "main" if present
	if (labelPositions.has("main")) {
		emit({ op: "CALL", arg: { name: "main", argc: 0 } });
	}
	emit({ op: "HALT" });

	function compileStmt(st: AST.Statement) {
		switch (st.type) {
			case "VarDecl":
				if (st.init) {
					compileExpr(st.init);
					emit({ op: "STORE", arg: st.name });
				} else {
					// initialize with undefined
					const idx = addConst(undefined);
					emit({ op: "CONST", arg: idx });
					emit({ op: "STORE", arg: st.name });
				}
				return;
			case "ExprStmt":
				compileExpr(st.expr);
				emit({ op: "POP" });
				return;
			case "ReturnStmt":
				if (st.expr) compileExpr(st.expr);
				emit({ op: "RETURN" });
				return;
			case "IfStmt": {
				compileExpr(st.cond);
				const jfalsePos = instrs.length;
				emit({ op: "JUMP_IF_FALSE", arg: -1 });
				for (const s of st.thenBody) compileStmt(s);
				let afterThen = instrs.length;
				if (st.elseBody) {
					const jAfterThenPos = instrs.length;
					emit({ op: "JUMP", arg: -1 });
					instrs[jfalsePos] = {
						op: "JUMP_IF_FALSE",
						arg: instrs.length,
					};
					for (const s of st.elseBody) compileStmt(s);
					instrs[jAfterThenPos] = { op: "JUMP", arg: instrs.length };
				} else {
					instrs[jfalsePos] = {
						op: "JUMP_IF_FALSE",
						arg: instrs.length,
					};
				}
				return;
			}
			case "WhileStmt": {
				const loopStart = instrs.length;
				compileExpr(st.cond);
				const jfalsePos = instrs.length;
				emit({ op: "JUMP_IF_FALSE", arg: -1 });
				for (const s of st.body) compileStmt(s);
				emit({ op: "JUMP", arg: loopStart });
				instrs[jfalsePos] = { op: "JUMP_IF_FALSE", arg: instrs.length };
				return;
			}
			case "FuncDecl":
				// already compiled above
				return;
		}
	}

	function compileExpr(e: AST.Expr) {
		switch (e.type) {
			case "NumberLit": {
				const idx = addConst(e.value);
				emit({ op: "CONST", arg: idx });
				return;
			}
			case "StringLit": {
				const idx = addConst(e.value);
				emit({ op: "CONST", arg: idx });
				return;
			}
			case "BoolLit": {
				const idx = addConst(e.value);
				emit({ op: "CONST", arg: idx });
				return;
			}
			case "Identifier": {
				emit({ op: "LOAD", arg: e.name });
				return;
			}
			case "BinaryExpr": {
				if (e.op === "=") {
					// assignment: compile right then store left name
					if (e.left.type !== "Identifier")
						throw new Error("Assignment target must be identifier");
					compileExpr(e.right);
					emit({ op: "STORE", arg: e.left.name });
					// load stored value as expression result
					emit({ op: "LOAD", arg: e.left.name });
					return;
				}
				compileExpr(e.left);
				compileExpr(e.right);
				switch (e.op) {
					case "+":
						emit({ op: "ADD" });
						return;
					case "-":
						emit({ op: "SUB" });
						return;
					case "*":
						emit({ op: "MUL" });
						return;
					case "/":
						emit({ op: "DIV" });
						return;
					case "%":
						emit({ op: "MOD" });
						return;
					case "==":
						emit({ op: "EQ" });
						return;
					case "!=":
						emit({ op: "NEQ" });
						return;
					case "<":
						emit({ op: "LT" });
						return;
					case ">":
						emit({ op: "GT" });
						return;
					case "<=":
						emit({ op: "LE" });
						return;
					case ">=":
						emit({ op: "GE" });
						return;
					case "&&":
						// simplistic: both bool
						emit({ op: "AND" } as any);
						return;
					case "||":
						emit({ op: "OR" } as any);
						return;
				}
				return;
			}
			case "UnaryExpr": {
				compileExpr(e.arg);
				if (e.op === "!") {
					// compile as EQ false
					const idx = addConst(false);
					emit({ op: "CONST", arg: idx });
					emit({ op: "EQ" });
					return;
				}
				if (e.op === "-") {
					const idx = addConst(0);
					emit({ op: "CONST", arg: idx });
					emit({ op: "SUB" });
					return;
				}
				return;
			}
			case "CallExpr": {
				// If callee is a simple identifier and collides with native names, emit CALL_NATIVE
				if (e.callee.type === "Identifier") {
					const name = e.callee.name;
					for (const arg of e.args) compileExpr(arg);
					if (nativeNames.has(name)) {
						emit({
							op: "CALL_NATIVE",
							arg: { name, argc: e.args.length },
						});
						return;
					} else {
						emit({
							op: "CALL",
							arg: { name, argc: e.args.length },
						});
						return;
					}
				}
				// Member calls: object.method(args...) -> name 'obj.method'
				if (e.callee.type === "MemberExpr") {
					// push object
					compileExpr(e.callee.object);
					for (const arg of e.args) compileExpr(arg);
					const full =
						e.callee.object.type === "Identifier"
							? `${e.callee.object.name}.${e.callee.property}`
							: e.callee.property;
					if (nativeNames.has(full)) {
						emit({
							op: "CALL_NATIVE",
							arg: { name: full, argc: e.args.length + 1 }, // include object as first arg
						});
						return;
					}
					emit({
						op: "CALL",
						arg: { name: full, argc: e.args.length + 1 },
					});
					return;
				}
				return;
			}
			case "MemberExpr": {
				// produce a namespace object; for runtime we'll handle resolution
				// compile object reference as a special LOAD of module name?
				if (e.object.type === "Identifier") {
					// load module as a value
					emit({ op: "LOAD", arg: e.object.name });
					// push property name
					const idx = addConst(e.property);
					emit({ op: "CONST", arg: idx });
					// at runtime we can combine to value object.property
					emit({
						op: "CALL_NATIVE",
						arg: { name: "__get_member", argc: 2 },
					});
					return;
				}
				return;
			}
		}
	}

	return { instrs, consts };
}
