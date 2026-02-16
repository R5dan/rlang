import { expressionRules, statementRules } from "../rules";
import type {
	Expr,
	ExpressionRule,
	StatementRule,
	Token,
	Type,
	Variable,
} from "../type";

export default class Parser {
	public i = 0;
	public exprRules: ExpressionRule[] = expressionRules;
	public stmtRules: StatementRule<any>[] = statementRules;

	constructor(
		public tokens: Token<string>[],
		public minPrc: number = 0,
		public inherit?: Parser,
	) {}

	public assert(kind: string, value?: string): Token<string> {
		const t = this.peek();
		if (t.kind !== kind) {
			throw new Error(
				`Parse error at (${t.pos.col}, ${t.pos.line}) - ${t.pos.loc}: expected kind '${kind}' got '${t.kind}'`,
			);
		}
		if (value && value !== t.value) {
			throw new Error(
				`Parse error at (${t.pos.col}, ${t.pos.line})- ${t.pos.loc}: expected value '${value}' got '${t.value}'`,
			);
		}
		return t;
	}

	public expect(kind: string, value?: string, i: number = 1): Token<string> {
		this.advance(i);
		return this.assert(kind, value);
	}

	public peek(i: number = 0): Token<string> {
		const t = this.tokens[this.i + i];
		if (!t) throw new Error("Unexpected end of input");
		return t;
	}

	public advance(i: number = 1): Token<string> {
		this.inherit?.advance(i);
		this.i += i;
		const t = this.peek();
		return t;
	}

	public future() {
		return this.tokens.slice(this.i + 1);
	}

	public is(kind: string, value?: string, token?: Token): boolean {
		const ident = token ?? this.peek();
		return ident.kind === kind && (!value || ident.value === value);
	}

	public isNot(kind: N, value?: string): boolean {
		return !this.is(kind, value);
	}

	public isSym(s?: string): boolean {
		return this.is("sym", s);
	}

	public isIdent(s?: string): boolean {
		return this.is("ident", s);
	}

	public isNotSym(s?: string): boolean {
		return this.isNot("sym", s);
	}

	public isBrac(s?: string): boolean {
		return this.is("brac", s);
	}

	public isNotBrac(s?: string): boolean {
		return this.isNot("brac", s);
	}

	public isNotIdent(s?: string): boolean {
		return this.isNot("ident", s);
	}

	public parseExpr<R extends boolean = true>(
		minPrec: number = 0,
		required: R = true as R,
	): R extends true ? Type | Variable | Expr : (Type | Variable | Expr) | null {
		let prefixRule = null;
		for (const rule of this.exprRules) {
			if (rule?.prefix && rule.match(this)) {
				prefixRule = rule;
				break;
			}
		}
		if (!prefixRule?.prefix) {
			if (!required) {
				return null;
			}
			throw new Error(
				`Expected expression: ${JSON.stringify(
					prefixRule,
				)} ${JSON.stringify(this.peek())}`,
			);
		}

		let left = prefixRule.prefix(this);

		// Step 2: repeatedly extend expression
		while (true) {
			let rule = null;
			for (const r of this.exprRules) {
				if (r?.infix && r.match(this)) {
					rule = r;
					break;
				}
			}
			if (!rule?.infix) {
				break;
			}

			const prec = rule.precedence ?? 0;
			if (prec <= minPrec) {
				break;
			}

			left = rule.infix(this, left);
		}

		return left;
	}

	public parseStmt() {
		for (const rule of this.stmtRules) {
			if (rule.match(this)) {
				`RULE: ${JSON.stringify(rule)}`;
				const data = rule.parse(this);
				return data;
			}
		}
		`EXPR`;
		return this.parseExpr();
	}

	public parseBlock() {
		this.assert("brac", "{"); // {
		this.advance();

		const statements = [];

		while (this.isNotBrac("}") && this.isNot("EOF")) {
			statements.push(this.parseStmt());
		}

		this.assert("brac", "}"); // }
		this.advance();

		return statements;
	}

	public parse() {
		const statements = [];
		while (this.isNot("EOF")) {
			statements.push(this.parseStmt());
		}
		return statements;
	}
}
