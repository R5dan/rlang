import { ParseError } from "./errors";
import type {
	AnyData,
	Expr,
	ExpressionRule,
	LexingRule,
	StatementRule,
	Type,
	Variable,
} from "./type";
import { call, functionType, numberType, type Number } from "./types";
import { Context, Runner } from "./vm";

const stringRule = (input: string) => {
	let i = 1;
	const quote = input[0];
	if (!quote) {
		return null;
	} else if (!/"'`/.test(quote)) {
		return null;
	}
	while (true) {
		const ch = input[i];
		if (!ch) {
			return null;
		}
		if (ch === quote) {
			i++;
			return {
				length: i,
				text: input.slice(0, i),
			};
		}
		i++;
	}
};

export const lexingRules = [
	{
		name: "num",
		regex: /^[0-9]+/,
	},
	{
		name: "ident",
		regex: /^[a-zA-Z][a-zA-Z0-9]*/,
	},
	{
		name: "sym",
		regex: /^[+\-*\\/%<>=!,]+/,
	},
	{
		name: "brac",
		regex: /^[(){}[\]]/,
	},
	{ name: "str", match: stringRule },
	{ name: "eol", regex: /^[\n;]/ },
] satisfies LexingRule<"num" | "ident" | "sym" | "brac" | "str" | "eol", any>[];

export const statementRules = [
	{
		name: "function",
		match: (p) => {
			// console.log(JSON.stringify(p.peek()));
			return p.isIdent("fn");
		},
		parse: (p) => {
			// console.log("PARSE FUNCTION");
			// Consume 'fn' keyword
			// console.log(`PEEK: ${JSON.stringify(p.peek())}`);

			// Parse function name
			const nameToken = p.expect("ident");
			const name = nameToken.value!;
			// console.log(`NAME: ${name}`);

			// Parse opening parenthesis
			p.expect("brac", "(");

			// Parse arguments
			const args: string[] = [];
			while (p.isNotBrac(")")) {
				// console.log(`PEEK: ${JSON.stringify(p.peek())}`);
				const argToken = p.expect("ident");
				args.push(argToken.value!);
				// console.log(`PEEK: ${JSON.stringify(p.peek())}`);
				p.advance();
				// Check for comma or closing parenthesis
				if (p.isSym(",")) {
					continue;
				} else if (p.isNotBrac(")")) {
					throw new ParseError("Expected ',' or ')'");
				}
			}

			// Consume closing parenthesis
			p.advance();

			// Parse function body (block)
			const body = p.parseBlock();
			// console.log(`BODY: ${JSON.stringify(body)}`);
			return {
				name: "stmt",
				data: {
					name: "function",
					data: {
						name,
						args,
						body,
					},
				},
			};
		},
		run(data, vm, runner) {
			const obj = functionType(undefined, data.body, data.args);
			runner.ctx.setVar(data.name, obj);
			return obj;
		},
	} satisfies StatementRule<{
		name: string;
		args: string[];
		body: AnyData[];
	}>,
	{
		name: "return",
		match: (p) => {
			return p.isIdent("return");
		},
		parse: (p) => {
			// console.log("RETURN");
			p.advance();
			const right = p.parseExpr(0, false);

			return {
				name: "stmt",
				data: {
					name: "return",
					data: right,
				},
			};
		},
		run(data, vm, runner) {
			const ctx = vm.line?.ctx;
			// console.log("RETURN");

			if (!ctx || ctx.special !== "function") {
				throw new Error("Can only return from a function");
			}
			if (!data) {
				throw new Error("No data");
			} else {
				ctx.returnType = vm.execAny(data, runner);
			}
		},
	} satisfies StatementRule<Expr | Variable | Type | null>,
	{
		name: "if",
		match: (p) => p.isIdent("if"),
		parse: (p) => {
			p.expect("brac", "(");
			p.advance();
			const expr = p.parseExpr();
			p.expect("brac", ")");
			p.advance();
			const block = p.is("brac", "{") ? p.parseBlock() : [p.parseStmt()];

			return {
				name: "stmt",
				data: {
					name: "if",
					data: {
						expr,
						block,
					},
				},
			};
		},
		run: (data, vm, runner) => {
			const ctx = new Context(runner.ctx);
			const r = new Runner(vm, ctx);

			const type = vm.execAny(data.expr, r);
			if (type.data.name === "boolean" && type.data.private.value) {
				r.load(data.block);
				r.run();
			} else if (
				call(type.data.public.__bool__, [], runner, vm).data.private.value
			) {
				r.load(data.block);
				r.run();
			}
		},
	} satisfies StatementRule<{ expr: Expr | Variable | Type; block: AnyData[] }>,
	{
		name: "while",
		match: (p) => p.isIdent("while"),
		parse: (p) => {
			p.expect("brac", "(");
			p.advance();
			const expr = p.parseExpr();
			p.expect("brac", ")");
			p.advance();
			const block = p.is("brac", "{") ? p.parseBlock() : [p.parseStmt()];

			return {
				name: "stmt",
				data: {
					name: "while",
					data: {
						expr,
						block,
					},
				},
			};
		},
		run: (data, vm, runner) => {
			const ctx = new Context(runner.ctx);
			const r = new Runner(vm, ctx);
			while (true) {
				const type = vm.execAny(data.expr, r);
				if (type.data.name === "boolean" && type.data.private.value) {
					r.load(data.block);
					r.run();
				} else if (
					call(type.data.public.__bool__, [], runner, vm).data.private.value
				) {
					r.load(data.block);
					r.run();
				} else {
					break
				}
			}
		},
	} satisfies StatementRule<{ expr: Expr | Variable | Type; block: AnyData[] }>,
] satisfies StatementRule<any>[];

export const expressionRules = [
	{
		name: "add",
		precedence: 20,
		kind: "sym",
		value: "+",
		infix(p, left) {
			const op = p.advance();
			// console.log(`ADD: ${JSON.stringify(p.peek())}`);

			const right = p.parseExpr(20);
			// console.log(`ADD: ${JSON.stringify(p.peek())}`);

			return {
				name: "expr",
				data: {
					name: "add",
					data: {
						left,
						right,
					},
				},
			};
		},
		run(data, vm, runner) {
			// console.log(JSON.stringify(data));
			const left = vm.execAny(data.data.left, runner) as Type | Number;
			const right = vm.execAny(data.data.right, runner) as Type | Number;
			if (
				left.name === "type" &&
				left.data.name === "number" &&
				right.name === "type" &&
				right.data.name === "number"
			) {
				return numberType(left.data.private.value + right.data.private.value);
			}
			throw new Error("End of func");
		},
	} satisfies ExpressionRule<{ left: AnyData; right: AnyData }>,
	{
		name: "bracket",
		runs: ["call", "group"],
		precedence: 1000,
		kind: "brac",
		value: "(",
		prefix: (p) => {
			// GROUP
			p.advance();
			const expr = p.parseExpr();
			p.expect("brac", ")");
			p.advance();
			return {
				name: "expr",
				data: {
					name: "group" as const,
					data: expr,
				},
			};
		},
		infix: (p, left) => {
			// CALL
			const args = [];
			while (p.isNotBrac(")")) {
				p.advance();
				const arg = p.parseExpr();
				args.push(arg);
				if (p.isSym(",") || p.isBrac(")")) {
					continue;
				} else {
					throw new ParseError("Expected ',' or ')'");
				}
			}
			p.advance();
			return {
				name: "expr",
				data: {
					name: "call" as const,
					data: {
						var: left,
						args,
					},
				},
			};
		},
		run(data, vm, runner) {
			if (data.name === "group") {
				return vm.execAny(data.data, runner);
			} else if (data.name === "call") {
				const var_ = vm.execAny(data.data.var, runner);
				return call(var_, data.data.args, runner, vm);
			} else {
				throw new Error("Invalid use of brackets");
			}
		},
	} satisfies ExpressionRule<
		| { name: "group"; data: Type | Variable | Expr }
		| {
				name: "call";
				data: { var: AnyData; args: (Type | Variable | Expr)[] };
		  }
	>,
	{
		name: "var",
		kind: "ident",
		prefix: (p) => {
			const name = p.peek();
			// console.log(`var1: ${JSON.stringify(p.peek())}`);

			p.advance();
			// console.log(`VAR2: ${JSON.stringify(p.peek())}`);

			return {
				name: "variable",
				data: {
					name: name.value!,
				},
			};
		},
		precedence: 1000,
	},
	{
		name: "number",
		kind: "num",
		prefix: (p) => {
			const data = p.peek();
			p.advance();
			return numberType(data.value);
		},
		precedence: 1000,
	},
	{
		name: "assign",
		kind: "sym",
		value: "=",
		infix: (p, left) => {
			const name = p.peek(-1);
			// console.log(`ASSIGN1: ${JSON.stringify(p.peek())}`);

			p.advance();
			// console.log(`ASSIGN2: ${JSON.stringify(p.peek())}`);

			const val = p.parseExpr();
			// console.log(`ASSIGN3: ${JSON.stringify(p.peek())}`);

			return {
				name: "expr",
				data: {
					name: "assign",
					data: {
						name: name.value!,
						val,
					},
				},
			};
		},
		run: (p, vm, runner) => {
			// console.log("ASSIGN");
			// console.log(p);
			const val = vm.execAny(p.data.val, runner);
			runner.ctx.ctx[p.data.name] = val;
			// console.log("END ASSIGN");
			return val;
		},
		precedence: 100000,
	} satisfies ExpressionRule<{
		name: "assign";
		data: {
			name: string;
			val: Expr | Type | Variable;
		};
	}>,
	{
		name: "decimal",
		kind: "sym",
		value: ".",
		runs: ["access"],
		infix: (p, left) => {
			const prop = p.expect("ident");

			return {
				name: "expr",
				data: {
					name: "access",
					data: {
						obj: left,
						prop,
					},
				},
			};
		},
		run: (p, vm, runner) => {
			// return call(vm.execAny(p.data.obj, runner).data.public.__get__, [type({
			// 	name: "string",
			// 	inheritance: [type()],
			// 	private: {
			// 		value: p.data.prop
			// 	}
			// })], runner, vm)
		},
		precedence: 100000,
	} satisfies ExpressionRule<{
		name: "assign";
		data: {
			obj: Expr | Type | Variable;
			prop: Type;
		};
	}>,
] satisfies ExpressionRule<any>[];
