import type { Token } from "../type";

export default class Parser {
	public i = 0;
	constructor(public tokens: Token[]) {}

	public expect(kind: string, value?: string): Token {
		const t = this.peek();
		if (t.kind !== kind) {
			throw new Error(
				`Parse error at ${t.pos}: expected kind '${kind}' got '${t.kind}'`
			);
		}
		if (value && t.value !== value) {
			throw new Error(
				`Parse error at ${t.pos}: expected value '${value}' got '${t.value}'`
			);
		}
		this.i++;
		return t;
	}

	public peek(i: number = 0): Token {
		const t = this.tokens[this.i + i];
		if (!t) throw new Error("Unexpected end of input");
		return t;
	}

	public advance(): Token {
		const t = this.peek();
		this.i++;
		return t;
	}

	public is(kind: string): boolean {
		return this.peek().kind === kind;
	}

	public isNot(kind: string): boolean {
		return this.peek().kind !== kind;
	}

	public isSym(s?: string): boolean {
		return this.peek().kind === "sym" && this.peek().value === s;
	}

	public isIdent(s?: string): boolean {
		return this.peek().kind === "ident" && this.peek().value === s;
	}

	parse() {}
}
