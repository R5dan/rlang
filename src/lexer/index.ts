import type { Rule, Token } from "../type";

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
				rule: { match: stringRule, name: "str" },
				length: i,
				text: input.slice(0, i),
			};
		}
	}
};

const defaultRules: Rule<string>[] = [
	{ name: "num", regex: /^[0-9]+/ },
	{ name: "char", regex: /^[a-zA-Z]+/ },
	{ name: "ident", regex: /^[a-zA-Z][a-zA-Z0-9]*/ },
	{ name: "sym", regex: /^[+\-*\\/%()<>=!,{}]+/ },
	{ name: "str", match: stringRule },
];

export default class Lexer {
	public rules: Rule<string>[] = defaultRules;

	public lex(input: string): Token[] {
		let i = 0;
		const tokens = [];
		let { line, col }: { line: number; col: number } = { line: 1, col: 1 };
		while (true) {
			const ret = input.slice(i);
			const ch = ret[0];
			console.log(`'${ch}': ${i}`);
			if (!ret || !ch) {
				break;
			}
			if (ch === ";") {
				i++;
				col++;
				continue;
			}
			if (this.isBreak(ch)) {
				if (ch === "\n") {
					line++;
					col = 0;
				}
				col++;

				i++;
				continue;
			}
			const match = this.matchLongest(ret, this.rules);
			if (!match) {
				throw new Error(`Unexpected token ${ch}`);
			}
			const text = match.text;
			for (const c of text) {
				if (c === "\n") {
					line++;
					col = 1;
				} else {
					col++;
				}
			}

			i += match.length;
			tokens.push({
				kind: match.rule.name,
				value: match.text,
				pos: {
					loc: i,
					line,
					col,
				},
			});
		}
		return tokens;
	}

	public registerRule(name: string, regex: string): void {
		this.rules.unshift({ name, regex: new RegExp(`^${regex}`) });
	}

	private isBreak(ch: string): boolean {
		return /[\s]/.test(ch);
	}

	private matchLongest<T>(
		input: string,
		rules: Rule<T>[]
	): { rule: Rule<T>; length: number; text: string } | null {
		let bestMatch: {
			rule: Rule<T>;
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
					bestMatch = match;
				}
			}
		}

		return bestMatch;
	}
}
