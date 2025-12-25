import { Token, lex } from "./lexer.js";
import * as AST from "./ast.js";

export function parse(src: string): AST.Program {
	const tokens = lex(src);
	let i = 0;
	function peek(n = 0) {
		return tokens[i + n];
	}
	function next() {
		return tokens[i++];
	}
	function expect(kind: Token["kind"], value?: string) {
		const t = peek();
		if (t.kind !== kind || (value !== undefined && t.value !== value)) {
			throw new Error(
				`Parse error at ${t.pos}: expected ${kind} ${value ?? ""} got ${
					t.kind
				} ${t.value}`
			);
		}
		i++;
		return t;
	}

	function isSym(s: string) {
		const t = peek();
		return t.kind === "sym" && t.value === s;
	}
	function consumeSym(s: string) {
		if (isSym(s)) {
			i++;
			return true;
		}
		return false;
	}

	const imports: AST.ImportDecl[] = [];
	const body: AST.Statement[] = [];

	while (peek().kind !== "eof") {
		const t = peek();
		if (t.kind === "kw" && t.value === "import") {
			i++;
			const p = expect("str").value;
			let asName: string | undefined;
			let native = false;
			if (peek().kind === "kw" && peek().value === "as") {
				i++;
				asName = expect("ident").value;
			}
			if (peek().kind === "kw" && peek().value === "native") {
				i++;
				native = true;
			}
			// optional semicolon
			if (peek().kind === "sym" && peek().value === ";") i++;
			imports.push({ type: "ImportDecl", path: p, as: asName, native });
			continue;
		}
		const stmt = parseStatement();
		body.push(stmt);
	}

	return { type: "Program", body, imports };

	function parseStatement(): AST.Statement {
		const t = peek();
		if (t.kind === "kw" && (t.value === "let" || t.value === "const")) {
			i++;
			const isConst = t.value === "const";
			const name = expect("ident").value;
			let annotation: AST.TypeName | undefined;
			if (consumeSym(":")) {
				const ann = expect("ident").value;
				if (
					!["number", "string", "boolean", "any", "void"].includes(
						ann
					)
				)
					throw new Error("Unknown type " + ann);
				annotation = ann as AST.TypeName;
			}
			expect("sym", "=");
			const init = parseExpr();
			if (peek().kind === "sym" && peek().value === ";") i++;
			return {
				type: "VarDecl",
				name,
				isConst,
				annotation,
				init,
			};
		}
		if (t.kind === "kw" && t.value === "fn") {
			i++;
			const name = expect("ident").value;
			expect("sym", "(");
			const params: { name: string; annotation?: AST.TypeName }[] = [];
			while (!isSym(")")) {
				const pname = expect("ident").value;
				let pann: AST.TypeName | undefined;
				if (consumeSym(":")) {
					const ann = expect("ident").value;
					pann = ann as AST.TypeName;
				}
				params.push({ name: pname, annotation: pann });
				if (isSym(",")) i++;
				else break;
			}
			expect("sym", ")");
			let rett: AST.TypeName | undefined;
			if (consumeSym(":")) {
				const ann = expect("ident").value;
				rett = ann as AST.TypeName;
			}
			expect("sym", "{");
			const body: AST.Statement[] = [];
			while (!isSym("}")) body.push(parseStatement());
			expect("sym", "}");
			return {
				type: "FuncDecl",
				name,
				params,
				retAnnotation: rett,
				body,
			};
		}
		if (t.kind === "kw" && t.value === "return") {
			i++;
			if (peek().kind === "sym" && peek().value === ";") {
				i++;
				return { type: "ReturnStmt" };
			}
			const expr = parseExpr();
			if (peek().kind === "sym" && peek().value === ";") i++;
			return { type: "ReturnStmt", expr };
		}
		if (t.kind === "kw" && t.value === "if") {
			i++;
			expect("sym", "(");
			const cond = parseExpr();
			expect("sym", ")");
			expect("sym", "{");
			const thenBody: AST.Statement[] = [];
			while (!isSym("}")) thenBody.push(parseStatement());
			expect("sym", "}");
			let elseBody: AST.Statement[] | undefined;
			if (peek().kind === "kw" && peek().value === "else") {
				i++;
				expect("sym", "{");
				elseBody = [];
				while (!isSym("}")) elseBody.push(parseStatement());
				expect("sym", "}");
			}
			return { type: "IfStmt", cond, thenBody, elseBody };
		}
		if (t.kind === "kw" && t.value === "while") {
			i++;
			expect("sym", "(");
			const cond = parseExpr();
			expect("sym", ")");
			expect("sym", "{");
			const body: AST.Statement[] = [];
			while (!isSym("}")) body.push(parseStatement());
			expect("sym", "}");
			return { type: "WhileStmt", cond, body };
		}
		// expression statement
		const expr = parseExpr();
		if (peek().kind === "sym" && peek().value === ";") i++;
		return { type: "ExprStmt", expr };
	}

	function parseExpr(): AST.Expr {
		return parseAssignment();
	}
	function parseAssignment(): AST.Expr {
		let left = parseLogicalOr();
		if (peek().kind === "sym" && peek().value === "=") {
			i++;
			const right = parseAssignment();
			// represent as a special binary assignment op
			return {
				type: "BinaryExpr",
				op: "=",
				left,
				right,
			} as AST.BinaryExpr;
		}
		return left;
	}

	function parseLogicalOr(): AST.Expr {
		let left = parseLogicalAnd();
		while (peek().kind === "sym" && peek().value === "||") {
			const op = next().value;
			const right = parseLogicalAnd();
			left = { type: "BinaryExpr", op, left, right };
		}
		return left;
	}
	function parseLogicalAnd(): AST.Expr {
		let left = parseEquality();
		while (peek().kind === "sym" && peek().value === "&&") {
			const op = next().value;
			const right = parseEquality();
			left = { type: "BinaryExpr", op, left, right };
		}
		return left;
	}
	function parseEquality(): AST.Expr {
		let left = parseRelational();
		while (
			peek().kind === "sym" &&
			(peek().value === "==" || peek().value === "!=")
		) {
			const op = next().value;
			const right = parseRelational();
			left = { type: "BinaryExpr", op, left, right };
		}
		return left;
	}
	function parseRelational(): AST.Expr {
		let left = parseAdd();
		while (
			peek().kind === "sym" &&
			(peek().value === "<" ||
				peek().value === ">" ||
				peek().value === "<=" ||
				peek().value === ">=")
		) {
			const op = next().value;
			const right = parseAdd();
			left = { type: "BinaryExpr", op, left, right };
		}
		return left;
	}
	function parseAdd(): AST.Expr {
		let left = parseMul();
		while (
			peek().kind === "sym" &&
			(peek().value === "+" || peek().value === "-")
		) {
			const op = next().value;
			const right = parseMul();
			left = { type: "BinaryExpr", op, left, right };
		}
		return left;
	}
	function parseMul(): AST.Expr {
		let left = parseUnary();
		while (
			peek().kind === "sym" &&
			(peek().value === "*" ||
				peek().value === "/" ||
				peek().value === "%")
		) {
			const op = next().value;
			const right = parseUnary();
			left = { type: "BinaryExpr", op, left, right };
		}
		return left;
	}
	function parseUnary(): AST.Expr {
		if (
			peek().kind === "sym" &&
			(peek().value === "!" || peek().value === "-")
		) {
			const op = next().value;
			const arg = parseUnary();
			return { type: "UnaryExpr", op, arg };
		}
		return parseCallMember();
	}
	function parseCallMember(): AST.Expr {
		let expr = parsePrimary();
		while (true) {
			if (isSym("(")) {
				// call
				i++;
				const args: AST.Expr[] = [];
				while (!isSym(")")) {
					args.push(parseExpr());
					if (isSym(",")) i++;
					else break;
				}
				expect("sym", ")");
				expr = { type: "CallExpr", callee: expr, args };
				continue;
			}
			if (isSym(".")) {
				i++;
				const prop = expect("ident").value;
				expr = { type: "MemberExpr", object: expr, property: prop };
				continue;
			}
			break;
		}
		return expr;
	}
	function parsePrimary(): AST.Expr {
		const t = peek();
		if (t.kind === "num") {
			i++;
			return { type: "NumberLit", value: Number(t.value) };
		}
		if (t.kind === "str") {
			i++;
			return { type: "StringLit", value: t.value };
		}
		if (t.kind === "ident") {
			i++;
			if (t.value === "true") return { type: "BoolLit", value: true };
			if (t.value === "false") return { type: "BoolLit", value: false };
			return { type: "Identifier", name: t.value };
		}
		if (t.kind === "sym" && t.value === "(") {
			i++;
			const e = parseExpr();
			expect("sym", ")");
			return e;
		}
		throw new Error(`Unexpected token ${t.kind} ${t.value} at ${t.pos}`);
	}
}
