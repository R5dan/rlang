import types from "./types";
import signs from "./signs";
import type { CODE, LOCATION, TOKEN, TOKEN_TYPE, TYPE } from "./types_";

export class Compiler {
	constructor(public code: string) {}

	isBreak(char: string) {
		return char === "\n" || char === ";" || char === "}";
	}

	compile() {}

	lex() {
		const tokens = this.lex_(this.code);
		tokens.push({
			type: "eof",
			from: { line: 1, col: 1 },
			to: { line: 1, col: 1 },
		});
		return tokens;
	}

	lex_(code: string, startLoc: LOCATION = { line: 1, col: 1 }) {
		let rem = code;
		const tokens: TOKEN<any>[] = [];
		let i = 0;
		let { line, col } = startLoc;

		const push = (
			type: TOKEN_TYPE,
			value: any,
			from: LOCATION,
			to: LOCATION = { line, col }
		) => {
			tokens.push({ type, value, to, from });
		};

		const advance = (inc: number = 1) => {
			let ch = code[i]!;
			for (let x = 0; x < inc; x++) {
				ch = code[i++]!;
				if (ch === "\n") {
					line += 1;
					col = 1;
				} else {
					col += 1;
				}
				rem = rem.slice(1);
			}
			return ch;
		};

		const peek = (x: number = 0) => code[i + x];
		const goto = (loc: LOCATION) => {
			let final = false;
			while (true) {
				const ch = peek(-1);
				if (ch === "\n") {
					line -= 1;
					i -= 1;
					if (line === loc.line) {
						final = true;
					} else if (final) {
						i += loc.col;
						col = loc.col;
						line = loc.line;
						break;
					}
				}
			}
		};
		const isAlpha = (c?: string) => !!c && /[A-Za-z_]/.test(c);
		const isAlnum = (c?: string) => !!c && /[A-Za-z0-9_]/.test(c);
		const lex = (code: string) => {
			return this.lex_(code, { line, col });
		};

		const ctx = {
			push,
			peek,
			advance,
			isAlpha,
			isAlnum,
			goto,
			lex,
		};

		while (i < code.length) {
			const ch = peek();
			if (!ch) {
				break;
			}
			if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
				advance();
				continue;
			}

			let found = false;
			for (const sign of Object.values(signs)) {
				if (sign.sign === ch) {
					push("sign", sign.sign, { line, col });
					found = true;
					break;
				}
			}
			if (found) {
				continue;
			}

			for (const type of Object.values(types)) {
				if (typeof type.char === "string") {
					const regex = new RegExp(type.char);
					const match = regex.exec(rem);
					if (match) {
						const ret = type.lex(ch, ctx, { line, col });
						if (ret !== false) {
							found = true;
							break;
						}
						continue;
					}
				} else {
					for (const char of type.char) {
						const regex = new RegExp(char);
						const match = regex.exec(rem);
						if (match) {
							const ret = type.lex(ch, ctx, {
								line,
								col,
							});
							if (ret !== false) {
								found = true;
							}
							break;
						}
					}
					if (found) {
						break;
					}
				}
			}

			if (found) {
				continue;
			}

			push("char", ch, { line, col });
		}

		return tokens;
	}
}
