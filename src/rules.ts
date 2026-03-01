import fs from "fs";
import { ParseError } from "./errors";
import type {
	AnyData,
	Expr,
	ExpressionRule,
	LexingRule,
	StatementRule,
	Type,
	TypeInstance,
	Variable,
} from "./type";
import { call, functionType, number, type Number } from "./types";
import { Context, Runner } from "./vm";
import path from "path";

export const lexingRules = [
	{
		name: "num",
		regex: /^[0-9]/,
	},
	{
		name: "ident",
		regex: /^[a-zA-Z][a-zA-Z0-9]*/,
	},
	{
		name: "sym",
		regex: /^[+\-*\\/%<>=!,'"`]/,
	},
	{
		name: "brac",
		regex: /^[(){}[\]]/,
	},
	{ name: "eol", regex: /^[\n;]/ },
] satisfies LexingRule<"num" | "ident" | "sym" | "brac" | "str" | "eol", any>[];

export const statementRules = [
	{
		name: "import",
		match: (p) => p.isIdent("import"),
		parse: (p) => {
			const imports = [];
			const ident1 = p.expect("ident");
			imports.push(ident1.value);
			while (true) {
				if (p.isSym(",")) {
					p.advance();
					const ident = p.expect("ident");
					imports.push(ident.value);
					continue;
				}
				break;
			}

			p.expect("ident", "from");
			const file = p.expect("ident");

			return {
				name: "stmt",
				data: {
					name: "import",
					data: {
						file: path.join(path.dirname(file.pos.file), `${file.value}.rc`),
						imports,
					},
				},
			};
		},
		run(data, vm, runner) {
			console.log(data);
			console.log(data.file);
			const compiled = JSON.parse(fs.readFileSync(data.file, "utf-8"));

			const ctx = new Context();
			const r = new Runner(vm, ctx);
			r.load(compiled);
			r.run();
			console.log(r.ctx.exports);
			data.imports.forEach((var_) => {
				console.log(var_);
				if (r.ctx.exports.includes(var_)) {
					runner.ctx.setVar(var_, r.ctx.ctx[var_]!);
					return;
				}
				throw new Error(`No export named '${var_}' in '${data.file}'`);
			});
		},
	} satisfies StatementRule<{ file: string; imports: string[] }>,
	{
		name: "export",
		match: (p) => p.isIdent("export"),
		parse: (p) => {
			p.advance();
			const export_ = p.parseExpr();
			if (export_.name === "typeHolder") {
				throw new Error("Can't export types");
			} else if (export_.name === "variable") {
				return {
					name: "stmt",
					data: {
						name: "export",
						data: {
							var: export_.data.name,
							expr: null,
						},
					},
				};
			} else if (export_.name === "expr") {
				if (export_.data.name === "assign") {
					return {
						name: "stmt",
						data: {
							name: "export",
							data: {
								var: export_.data.name,
								expr: export_,
							},
						},
					};
				}
			} else {
				throw new Error("ERROR");
			}
		},
		run(data, vm, runner) {
			console.log("\n\nEXPORT\n");
			console.log(data);
			console.log("\n\n");
			if (data.expr) {
				vm.execExpr(data.expr, runner);
			}
			runner.ctx.exports.push(data.var);
			console.log(runner.ctx.exports);
		},
	},
	{
		name: "function",
		match: (p) => {
			return p.isIdent("fn");
		},
		parse: (p) => {
			// Consume 'fn' keyword
			// Parse function name
			const nameToken = p.expect("ident");
			const name = nameToken.value!;

			// Parse opening parenthesis
			p.expect("brac", "(");

			// Parse arguments
			const args: string[] = [];
			while (p.isNotBrac(")")) {
				const argToken = p.expect("ident");
				args.push(argToken.value!);

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
			try {
				const body = p.parseBlock();
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
			} catch (e) {
				throw e;
			}
		},
		run(data, vm, runner) {
			const obj = functionType();
			obj.data.private.args = data.args;
			obj.data.private.code = data.body;
			obj.data.private.name = data.name;
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
			const ctx = runner.ctx;

			if (!ctx || ctx.special !== "function") {
				throw new Error("Can only return from a function");
			}
			if (!data) {
				throw new Error("No data");
			} else {
				ctx.returnType = vm.execAny(data, runner);
			}
		},
	} satisfies StatementRule<Expr | Variable | TypeInstance<Type> | null>,
	{
		name: "if",
		match: (p) => p.isIdent("if"),
		parse: (p) => {
			const elses = [] as { expr: Expr | Variable | Type; block: AnyData[] }[];
			let catchAll = [] as AnyData[];

			p.advance();

			while (true) {
				console.log(p.peek());
				p.assert("brac", "(");
				p.advance();
				const expr = p.parseExpr();
				p.assert("brac", ")");
				p.advance();
				const block = p.parseBlock();

				elses.push({ expr, block });

				console.log("\n\n\n");
				console.log(p.peek());
				if (p.isIdent("else")) {
					p.advance();
					if (p.isIdent("if")) {
						p.advance();
						continue;
					}

					const block = p.parseBlock();
					catchAll = block;
					break;
				} else {
					break;
				}
			}
			console.log(p.peek());

			return {
				name: "stmt",
				data: {
					name: "if",
					data: {
						elses,
						catchAll,
					},
				},
			};
		},
		run: (data, vm, runner) => {
			const ctx = new Context(runner.ctx);
			const r = new Runner(vm, ctx);

			let exec = false;
			for (const block of data.elses) {
				const satisfies = vm.execAny(block.expr, r);
				if (
					call(satisfies, satisfies.data.class.public.__bool__, [], runner, vm)
						.data.private.value
				) {
					exec = true;
					r.load(block.block);
					r.run();
					break;
				}
			}
			if (!exec) {
				r.load(data.catchAll);
				r.run();
			}
		},
	} satisfies StatementRule<{
		elses: { expr: Expr | Variable | Type; block: AnyData[] }[];
		catchAll: AnyData[];
	}>,
	{
		name: "while",
		match: (p) => p.isIdent("while"),
		parse: (p) => {
			p.expect("brac", "(");
			p.advance();
			const expr = p.parseExpr();
			p.assert("brac", ")");
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
				if (type.data.class.name === "boolean" && type.data.private.value) {
					r.load(data.block);
					r.run();
				} else if (
					call(type, type.data.class.public.__bool__, [], runner, vm).data
						.private.value
				) {
					r.load(data.block);
					r.run();
				} else {
					break;
				}
			}
			vm.break = false;
		},
	} satisfies StatementRule<{ expr: Expr | Variable | Type; block: AnyData[] }>,
	{
		name: "break",
		match: (p) => p.isIdent("break"),
		parse: (p) => {
			p.advance();
			return {
				name: "stmt",
				data: {
					name: "break",
					data: "",
				},
			};
		},
		run: (data, vm, runner) => {
			vm.break = true;
		},
	},
] satisfies StatementRule<any>[];

export const expressionRules = [
	{
		name: "string",
		precedence: 1000,
		match: (p) => p.isSym("'") || p.isSym("`") || p.isSym(`"`),
		prefix: (p) => {
			const quote = p.peek();
			let str = "";
			while (true) {
				const char = p.advance();
				if (char.value === quote.value) {
					break;
				} else if (p.is("sym", "\\", char)) {
					str += p.advance().value;
				} else {
					str += char.value;
				}
			}
			p.advance();

			return {
				name: "typeHolder",
				data: {
					name: "string",
					private: {
						value: str,
					},
					public: {},
				},
			};
		},
	},
	{
		name: "add",
		precedence: 20,
		match: (p) => p.isSym("+"),
		infix(p, left) {
			const op = p.advance();

			const right = p.parseExpr(20);

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
			const left = vm.execAny(data.data.left, runner) as TypeInstance<
				Number | Type
			>;
			const right = vm.execAny(data.data.right, runner) as TypeInstance<
				Number | Type
			>;
			if (
				left.name === "type" &&
				left.data.class.name === "number" &&
				right.name === "type" &&
				right.data.class.name === "number"
			) {
				return number(left.data.private.value + right.data.private.value);
			}
			throw new Error("End of func");
		},
	} satisfies ExpressionRule<{ left: AnyData; right: AnyData }>,
	{
		name: "bracket",
		runs: ["call", "group"],
		precedence: 1000,
		match: (p) => p.isBrac("("),
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
			if (p.is("brac", ")", p.peek(1))) {
				p.advance(2);
				return {
					name: "expr",
					data: {
						name: "call" as const,
						data: {
							var: left,
							args: [],
						},
					},
				};
			}
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
				return call(var_, var_, data.data.args, runner, vm);
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
		match: (p) => p.isIdent(),
		prefix: (p) => {
			const name = p.assert("ident");

			p.advance();

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
		match: (p) => p.is("num"),
		prefix: (p) => {
			const data = [];
			while (p.is("num")) {
				data.push(p.peek().value);
				p.advance();
			}
			return {
				name: "typeHolder",
				data: {
					name: "number",
					private: {
						value: Number(data.join("")),
					},
					public: {},
				},
			};
		},
		precedence: 1000,
	},
	{
		name: "assign",
		match: (p) => p.isSym("="),
		infix: (p, left) => {
			let name: string;
			if (left.name === "variable") {
				name = left.data.name;
			} else if (left.name === "expr" && left.data.name === "assign") {
				name = left.data.data.name;
			} else {
				throw new Error(`Invalid name type: ${left}`);
			}

			p.advance();

			const val = p.parseExpr();

			return {
				name: "expr",
				data: {
					name: "assign",
					data: {
						name: name!,
						val,
					},
				},
			};
		},
		run: (p, vm, runner) => {
			const val = vm.execAny(p.data.val, runner);

			runner.ctx.ctx[p.data.name] = val;

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
		match: (p) => p.isSym("."),
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
