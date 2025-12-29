import { expressionRules, statementRules } from "../rules";
import type { ExpressionRule, StatementRule, Token } from "../type";
export default class Parser<N> {
	public i = 0;
	public exprRules: ExpressionRule<any>[] = expressionRules;
	public stmtRules: StatementRule<any>[] = statementRules;
	constructor(
		public tokens: Token<N>[],
		public minPrc: number = 0,
		public inherit?: Parser<N>
	) {}

	public assert(kind: string, value?: string): Token<N> {
		const t = this.peek();
		if (t.kind !== kind) {
			throw new Error(
				`Parse error at (${t.pos.col}, ${t.pos.line}): expected kind '${kind}' got '${t.kind}'`
			);
		}
		if (value && value !== t.value) {
			throw new Error(
				`Parse error at (${t.pos.col}, ${t.pos.line}): expected value '${value}' got '${t.value}'`
			);
		}
		return t;
	}

	public expect(kind: string, value?: string, i: number = 1): Token<N> {
		this.advance(i);
		return this.assert(kind, value);
	}

	public peek(i: number = 0): Token<N> {
		const t = this.tokens[this.i + i];
		if (!t) throw new Error("Unexpected end of input");
		return t;
	}

	public advance(i: number = 1): Token<N> {
		this.inherit?.advance(i);
		this.i += i;
		const t = this.peek();
		return t;
	}

	public future() {
		return this.tokens.slice(this.i + 1);
	}

	public is(kind: string, value?: string): boolean {
		return (
			this.peek().kind === kind && (!value || this.peek().value === value)
		);
	}

	public isNot(kind: string, value?: string): boolean {
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

	public parseExpr(minPrec: number = 0): AnyData {
	}

	public parseStmt() {}

	public parseExprStmt() {}

	public parseBlock() {
		this.expect("brac", "{");
		// while (!this.is("}") && !this.is("EOF")) {
		// 	statements.push(parseStatement(p));
		// }
	}

	public parse() {}
}
