import type { LexingRule, Token } from "../type";
import { lexingRules as rules } from "../rules";

export default class Lexer<N> {
	// @ts-expect-error
	public rules: LexingRule<N, any>[] = rules;

	public lex(input: string, file: string): Token<N>[] {
		let i = -1;
		const tokens = [];
		let { line, col }: { line: number; col: number } = { line: 1, col: 0 };
		while (true) {
			i++;
			col++;
			const ret = input.slice(i);
			const ch = ret[0];
			if (!ret || !ch) {
				break;
			}
			if (this.isBreak(ch)) {
				if (ch === "\n") {
					line++;
					col = 0;
				}
				continue;
			}

			const match = this.matchLongest(ret, this.rules);
			if (!match) {
				throw new Error(`Unexpected token '${ch}' @ (${line}, ${col})`);
			}
			const text = match.text;
			const startCol = col
			const startLine = line
			for (const c of text) {
				if (c === "\n") {
					line++;
					col = 0;
				} else {
					col++;
				}
			}

			tokens.push({
				kind: match.rule.name,
				value: match.text,
				pos: {
					loc: i,
					line: startLine,
					col: startCol,
					file,
				},
			});
			i += match.length-1;

		}
		return tokens;
	}

	public registerRule(rule: LexingRule<N, any>): void {
		this.rules.unshift(rule);
	}

	private isBreak(ch: string): boolean {
		return /[\s]/.test(ch);
	}

	private matchLongest<T>(
		input: string,
		rules: LexingRule<T, any>[]
	): { rule: LexingRule<T, any>; length: number; text: string } | null {
		let bestMatch: {
			rule: LexingRule<T, any>;
			length: number;
			text: string;
		} | null = null;

		for (const rule of rules) {
			if (rule?.regex) {
				const match = input.match(rule.regex);
				if (!match) continue;

				const length = match[0].length;

				if (!bestMatch || length > bestMatch.length) {
					bestMatch = {
						rule,
						length,
						text: match[0],
					};
				}
			} else if (rule?.match) {
				const match = rule.match(input);
				if (!match) continue;

				if (!bestMatch || match.length > bestMatch.length) {
					bestMatch = { ...match, rule };
				}
			}
		}

		return bestMatch;
	}
}
