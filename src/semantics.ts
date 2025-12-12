import {
	Program,
	Statement,
	Expression,
	BinaryExpression,
	AssignmentExpression,
	CallExpression,
	FunctionExpression,
	ArrayLiteral,
	FunctionDeclaration,
	VariableDeclaration,
	ReturnStatement,
} from "./ast";
import { RCType, AnyType, ArrayType, CompileOptions } from "./types";

type VarInfo = { type: RCType; mutable: boolean; sys: boolean };

class Scope {
	private vars = new Map<string, VarInfo>();
	constructor(private parent?: Scope) {}

	define(name: string, info: VarInfo) {
		if (this.vars.has(name)) throw new Error(`Duplicate binding ${name}`);
		this.vars.set(name, info);
	}

	lookup(name: string): VarInfo | undefined {
		return this.vars.get(name) ?? this.parent?.lookup(name);
	}

	entries(): [string, VarInfo][] {
		return [...this.vars.entries()];
	}

	isRoot() {
		return !this.parent;
	}
}

const anyType: AnyType = { kind: "any" };

const numeric = (t: RCType) => t === "int" || t === "float";

const mergeArrayType = (elemTypes: RCType[], maxLength: number): ArrayType => {
	if (elemTypes.length === 0)
		return { kind: "array", element: anyType, maxLength };
	const first = elemTypes[0];
	const same = elemTypes.every((t) => typeEquals(t, first));
	return { kind: "array", element: same ? first : anyType, maxLength };
};

const typeEquals = (a: RCType, b: RCType): boolean => {
	if (typeof a === "string" || typeof b === "string") return a === b;
	if ("kind" in a && "kind" in b && a.kind === "any" && b.kind === "any")
		return true;
	if (a.kind !== b.kind) return false;
	if (a.kind === "array" && b.kind === "array") {
		return typeEquals(a.element, b.element);
	}
	if (a.kind === "promise" && b.kind === "promise")
		return typeEquals(a.inner, b.inner);
	return false;
};

export interface SemanticResult {
	globals: Map<string, VarInfo>;
	functions: Map<string, FunctionExpression>;
}

export function checkSemantics(
	program: Program,
	options: CompileOptions
): SemanticResult {
	const globalScope = new Scope();
	const functions = new Map<string, FunctionExpression>();

	// pre-register functions to allow forward references
	for (const stmt of program.body) {
		if (stmt.kind === "fun") {
			functions.set(stmt.fn.name, stmt.fn);
		}
	}

	const checkStatement = (stmt: Statement, scope: Scope) => {
		switch (stmt.kind) {
			case "var":
				return checkVariable(stmt, scope);
			case "fun":
				if (!scope.isRoot())
					throw new Error(
						"Nested function declarations are not supported; use function expressions"
					);
				return; // handled separately
			case "expr":
				checkExpression(stmt.expression, scope, options);
				return;
			case "return":
				if (stmt.value) checkExpression(stmt.value, scope, options);
				return;
		}
	};

	const checkFunctionBody = (decl: FunctionDeclaration, parent: Scope) => {
		const scope = new Scope(parent);
		// register params
		for (const param of decl.fn.params) {
			scope.define(param, { type: anyType, mutable: true, sys: false });
		}
		for (const stmt of decl.fn.body) {
			checkStatement(stmt, scope);
		}
	};

	const checkVariable = (stmt: VariableDeclaration, scope: Scope) => {
		const valueType = checkExpression(stmt.value, scope, options);
		const info: VarInfo = {
			type: valueType,
			mutable: stmt.mutable,
			sys: stmt.sys,
		};
		if (stmt.sys) {
			// elevate to global
			globalScope.define(stmt.name, info);
		} else {
			scope.define(stmt.name, info);
		}
	};

	const checkExpression = (
		expr: Expression,
		scope: Scope,
		opts: CompileOptions
	): RCType => {
		switch (expr.kind) {
			case "string":
				return "string";
			case "int":
				return "int";
			case "float":
				return "float";
			case "identifier": {
				const info =
					scope.lookup(expr.name) ?? globalScope.lookup(expr.name);
				if (!info) throw new Error(`Unknown identifier ${expr.name}`);
				return info.type;
			}
			case "array": {
				return checkArrayLiteral(expr, scope, opts);
			}
			case "binary":
				return checkBinary(expr, scope, opts);
			case "assign":
				return checkAssign(expr, scope, opts);
			case "call":
				return checkCall(expr, scope, opts);
			case "function": {
				// nested anonymous function, treat as any but check body for correctness
				checkFunctionBody(
					{
						kind: "fun",
						fn: expr as FunctionExpression & { name: string },
					},
					scope
				);
				return anyType;
			}
			case "await": {
				const inner = checkExpression(expr.expression, scope, opts);
				if (typeof inner !== "string" && inner.kind === "promise")
					return inner.inner;
				throw new Error("await expects a promise");
			}
		}
	};

	const checkArrayLiteral = (
		arr: ArrayLiteral,
		scope: Scope,
		opts: CompileOptions
	): RCType => {
		const elems = arr.elements.map((e) => checkExpression(e, scope, opts));
		const max = arr.maxLength ?? opts.defaultArrayMax;
		if (elems.length > max)
			throw new Error(`Array length ${elems.length} exceeds max ${max}`);
		return mergeArrayType(elems, max);
	};

	const checkBinary = (
		expr: BinaryExpression,
		scope: Scope,
		opts: CompileOptions
	): RCType => {
		const left = checkExpression(expr.left, scope, opts);
		const right = checkExpression(expr.right, scope, opts);
		if (expr.op === "+") {
			if (numeric(left) && numeric(right))
				return left === "float" || right === "float" ? "float" : "int";
			if (left === "string" && right === "string") return "string";
			if (
				typeof left !== "string" &&
				left.kind === "array" &&
				typeof right !== "string" &&
				right.kind === "array"
			) {
				return {
					kind: "array",
					element: anyType,
					maxLength: left.maxLength + right.maxLength,
				};
			}
			throw new Error("Invalid operands for +");
		}
		if (expr.op === "-") {
			if (numeric(left) && numeric(right))
				return left === "float" || right === "float" ? "float" : "int";
			throw new Error("Invalid operands for -");
		}
		return anyType;
	};

	const checkAssign = (
		expr: AssignmentExpression,
		scope: Scope,
		opts: CompileOptions
	): RCType => {
		const target =
			scope.lookup(expr.target.name) ??
			globalScope.lookup(expr.target.name);
		if (!target) throw new Error(`Unknown identifier ${expr.target.name}`);
		if (!target.mutable && expr.op !== "=")
			throw new Error(`Cannot mutate const ${expr.target.name}`);
		const valueType = checkExpression(expr.value, scope, opts);
		if (!target.mutable && expr.op === "=")
			throw new Error(`Cannot reassign const ${expr.target.name}`);
		if (expr.op === "+=" || expr.op === "-=") {
			const bin: BinaryExpression = {
				kind: "binary",
				op: expr.op === "+=" ? "+" : "-",
				left: expr.target,
				right: expr.value,
			};
			const resultType = checkBinary(bin, scope, opts);
			target.type = resultType;
			return resultType;
		}
		target.type = valueType;
		return valueType;
	};

	const checkCall = (
		expr: CallExpression,
		scope: Scope,
		opts: CompileOptions
	): RCType => {
		const callee = expr.callee;
		if (callee.kind === "identifier") {
			const fn = functions.get(callee.name);
			if (!fn) return anyType;
			if (expr.args.length !== fn.params.length)
				throw new Error(`Arity mismatch for ${callee.name}`);
			for (const arg of expr.args) checkExpression(arg, scope, opts);
			return fn.async ? { kind: "promise", inner: anyType } : anyType;
		}
		// calling anonymous function returns any
		for (const arg of expr.args) checkExpression(arg, scope, opts);
		return anyType;
	};

	const checkFunctionBody = (decl: FunctionDeclaration, parent: Scope) => {
		const scope = new Scope(parent);
		// register params
		for (const param of decl.fn.params) {
			scope.define(param, { type: anyType, mutable: true, sys: false });
		}
		for (const stmt of decl.fn.body) {
			checkStatement(stmt, scope);
		}
	};

	// walk program
	const root = new Scope();
	for (const stmt of program.body) {
		checkStatement(stmt, root);
		if (stmt.kind === "fun") {
			checkFunctionBody(stmt, root);
		}
	}

	return { globals: collectGlobals(globalScope), functions };
}

const collectGlobals = (scope: Scope): Map<string, VarInfo> => {
	const map = new Map<string, VarInfo>();
	for (const [k, v] of scope.entries()) map.set(k, v);
	return map;
};
