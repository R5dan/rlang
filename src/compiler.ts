import types from "./types";
import signs from "./signs";
import type { CODE, LOCATION, TOKEN, TOKEN_TYPE, TYPE } from "./types_";
import { safeParse, z } from "zod";

export class Compiler {
	constructor(public code: string) {}

	isBreak(char: string) {
		return char === "\n" || char === ";" || char === "}";
	}

	compile() {}

	lex() {
		const tokens: TOKEN<any>[] = [];
		let i = 0;
		let line = 1;
		let col = 1;

		const push = (
			type: TOKEN_TYPE,
			value: string,
			from: LOCATION,
			to: LOCATION = { line, col }
		) => {
			tokens.push({ type, value, to, from });
		};

		const advance = (i: number = 1) => {
			for (let x = 0; x < i; x++) {
				const ch = this.code[i++];
				if (ch === "\n") {
					line += 1;
					col = 1;
				} else {
					col += 1;
				}
				return ch;
			}
		};

		const peek = (x: number = 0) => this.code[i + x];
		const goto = (loc: LOCATION) => {
			line = loc.line;
			col = loc.col;
		};
		const isAlpha = (c?: string) => !!c && /[A-Za-z_]/.test(c);
		const isAlnum = (c?: string) => !!c && /[A-Za-z0-9_]/.test(c);

		const ctx = {
			push,
			advance,
			isAlpha,
			isAlnum,
			goto,
		} ;

		while (i < this.code.length) {
			const ch = peek();
			if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
				advance();
				continue;
			}

			throw new Error(`Unexpected character '${ch}' at ${line}:${col}`);
		}

		tokens.push({ type: "eof", from: { line, col }});
		return tokens;
	}
}
