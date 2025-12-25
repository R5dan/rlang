import * as AST from "./ast.js";

// Very small type system
export type Type =
	| { kind: "prim"; name: AST.TypeName }
	| { kind: "func"; params: Type[]; ret: Type };

export interface TypeEnv {
	vars: Map<string, Type>;
	funcs: Map<string, Type>;
	modules: Map<string, any>;
}

export function makeEnv(): TypeEnv {
	return {
		vars: new Map(),
		funcs: new Map(),
		modules: new Map(),
	};
}

function prim(n: AST.TypeName): Type {
	return { kind: "prim", name: n };
}

export function typecheck(
	prog: AST.Program,
	env: TypeEnv,
	nativeRegistry: Map<string, any>
): void {
	// register imports: for native imports, we expect a mapping in nativeRegistry
	for (const imp of prog.imports) {
		if (imp.native) {
			// path is the key
			const loaded = nativeRegistry.get(imp.path);
			if (!loaded)
				throw new Error("Native module not found: " + imp.path);
			env.modules.set(imp.as ?? imp.path, loaded);
			// register functions in funcs map
			for (const k of Object.keys(loaded)) {
				env.funcs.set(
					(imp.as ? imp.as + "." : "") + k,
					inferNativeFnType(loaded[k])
				);
			}
		} else {
			// non-native import not implemented in this minimal example
		}
	}

	// top-level: register function declarations
	for (const s of prog.body) {
		if (s.type === "FuncDecl") {
			const ptypes = s.params.map((p) =>
				p.annotation ? prim(p.annotation) : prim("any")
			);
			const rtype = s.retAnnotation ? prim(s.retAnnotation) : prim("any");
			env.funcs.set(s.name, { kind: "func", params: ptypes, ret: rtype });
		}
	}

	// typecheck each statement
	for (const s of prog.body) typecheckStmt(s, env);
}

function typecheckStmt(s: AST.Statement, env: TypeEnv): Type | undefined {
	switch (s.type) {
		case "VarDecl": {
			const t = s.annotation
				? { kind: "prim", name: s.annotation }
				: prim("any");
			if (s.init) {
				const it = typeOfExpr(s.init, env);
				// permissive: only check if annotated and different
				if (s.annotation && !typeEquals(it, t)) {
					throw new Error(`Type mismatch for ${s.name}`);
				}
			}
			env.vars.set(s.name, t);
			return;
		}
		case "FuncDecl": {
			// create new local env for parameters
			const local = {
				vars: new Map(env.vars),
				funcs: env.funcs,
				modules: env.modules,
			};
			for (const p of s.params) {
				local.vars.set(
					p.name,
					p.annotation ? prim(p.annotation) : prim("any")
				);
			}
			for (const stmt of s.body) {
				const r = typecheckStmt(stmt, local as unknown as TypeEnv);
				// ignore returns here
			}
			return;
		}
		case "ExprStmt":
			typeOfExpr(s.expr, env);
			return;
		case "ReturnStmt":
			if (s.expr) return typeOfExpr(s.expr, env);
			return { kind: "prim", name: "void" };
		case "IfStmt":
			const ct = typeOfExpr(s.cond, env);
			if (!isBoolish(ct)) throw new Error("If condition not boolean");
			s.thenBody.forEach((st) => typecheckStmt(st, env));
			if (s.elseBody) s.elseBody.forEach((st) => typecheckStmt(st, env));
			return;
		case "WhileStmt":
			const ct2 = typeOfExpr(s.cond, env);
			if (!isBoolish(ct2)) throw new Error("While condition not boolean");
			s.body.forEach((st) => typecheckStmt(st, env));
			return;
	}
}

function typeOfExpr(e: AST.Expr, env: TypeEnv): Type {
	switch (e.type) {
		case "NumberLit":
			return prim("number");
		case "StringLit":
			return prim("string");
		case "BoolLit":
			return prim("boolean");
		case "Identifier": {
			const v = env.vars.get(e.name);
			if (v) return v;
			const f = env.funcs.get(e.name);
			if (f) return f;
			throw new Error("Unknown identifier: " + e.name);
		}
		case "BinaryExpr": {
			const l = typeOfExpr(e.left, env);
			const r = typeOfExpr(e.right, env);
			if (e.op === "=") {
				// assignment
				if (e.left.type === "Identifier") {
					// set var type to right's type (permissive)
					env.vars.set(e.left.name, r);
					return r;
				}
				throw new Error("Invalid assignment target");
			}
			if (["+", "-", "*", "/", "%"].includes(e.op)) {
				if (isNumberish(l) && isNumberish(r)) return prim("number");
				if (e.op === "+" && (isStringish(l) || isStringish(r)))
					return prim("string");
				return prim("any");
			}
			if (
				["==", "!=", "<", ">", "<=", ">="].includes(e.op) ||
				["&&", "||"].includes(e.op)
			)
				return prim("boolean");
			return prim("any");
		}
		case "UnaryExpr": {
			const a = typeOfExpr(e.arg, env);
			if (e.op === "!") return prim("boolean");
			if (e.op === "-") return prim("number");
			return prim("any");
		}
		case "CallExpr": {
			// callee can be identifier or member expression referring to native or function
			if (e.callee.type === "Identifier") {
				const f = env.funcs.get(e.callee.name);
				if (!f) throw new Error("Unknown function " + e.callee.name);
				if (f.kind !== "func") throw new Error("Not callable");
				const args = e.args.map((a) => typeOfExpr(a, env));
				// permissive check: count only
				if (args.length !== f.params.length)
					throw new Error("Arity mismatch calling " + e.callee.name);
				return f.ret;
			}
			if (e.callee.type === "MemberExpr") {
				// module.fn
				const objt = typeOfExpr(e.callee.object, env);
				// for simplicity, assume member calls to native are any -> any
				return prim("any");
			}
			return prim("any");
		}
		case "MemberExpr": {
			// evaluate object type; often a module namespace
			if (e.object.type === "Identifier") {
				const mod = env.modules.get(e.object.name);
				if (mod) {
					// return any; callsite type checking handled elsewhere
					return prim("any");
				}
			}
			return prim("any");
		}
	}
}

function typeEquals(a: Type, b: Type): boolean {
	if (a.kind === "prim" && b.kind === "prim") return a.name === b.name;
	if (a.kind === "func" && b.kind === "func") {
		if (a.params.length !== b.params.length) return false;
		for (let i = 0; i < a.params.length; i++) {
			if (!typeEquals(a.params[i], b.params[i])) return false;
		}
		return typeEquals(a.ret, b.ret);
	}
	return false;
}

function isNumberish(t: Type) {
	return t.kind === "prim" && t.name === "number";
}
function isStringish(t: Type) {
	return t.kind === "prim" && t.name === "string";
}
function isBoolish(t: Type) {
	return t.kind === "prim" && t.name === "boolean";
}

function inferNativeFnType(fn: any): Type {
	// Very basic: assume any params and any return
	return { kind: "func", params: [], ret: prim("any") };
}
