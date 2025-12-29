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
		regex: /^[(){}[]]/,
	},
	{ name: "str", match: stringRule },
	{ name: "eol", regex: /^[\n;]/ },
] satisfies LexingRule<"num" | "ident" | "sym" | "brac" | "str" | "eol", any>[];

export const statementRules = [
	{
		name: "function",
		match: (p) => p.isIdent("fn"),
		parse: (p) => {
			const name = p.expect("ident");
			const args = [];
			p.expect("brac", "(");
			while (p.isNotBrac(")")) {
				args.push(p.parseExpr());
				if (p.isSym(",") || p.isBrac(")")) {
					continue;
				} else {
					throw new ParseError("Expected ',' or ')'");
				}
			}
			const body = p.parseBlock();
			return {
				name,
				args,
				body,
			};
		},
		run: (data, vm) => voidType(),
	},
] satisfies StatementRule<any>[];

export const expressionRules = [
	{
		name: "add",
		precedence: 20,
		kind: "sym",
		value: "+",
		parse: (p, left) => {
			const l = left[left.length - 1];
			if (!l) {
				throw new ParseError("Expected expression");
			}
			const r = p.parseExpr(20);
			return {
				left: l,
				right: r,
			};
		},
		run: (data, vm) => {},
	} satisfies ExpressionRule<{ left: AnyData; right: AnyData }>,
	{
		name: "bracket",
		precedence: 1000,
		kind: "sym",
		value: "(",
		parse: (p, left) => {
			const pre = left[left.length - 1];
			if (!pre) {
				// GROUP
				const expr = p.parseExpr();
				p.expect("brac", ")");
				return {
					type: "group",
					data: expr,
				};
			}
			// CALL
			const args = [];

			while (p.isNotBrac(")")) {
				const arg = p.parseExpr();
				args.push(arg);
				if (p.isSym(",") || p.isBrac(")")) {
					continue;
				} else {
					throw new ParseError("Expected ',' or ')'");
				}
			}
			return {
				type: "call",
				data: {
					var: pre,
					args,
				},
			};
		},
		run: (data, vm) => {},
	} satisfies ExpressionRule<
		| { type: "call"; data: { var: Variable; args: (Type | Expr)[] } }
		| { type: "group"; data: AnyData }
	>,
] satisfies ExpressionRule<any>[];

export function voidType(): Type {
	return {
		name: "type",
		data: {
			name: "void",
			inheritance: [],
			public: {},
			private: {},
		},
	};
}
