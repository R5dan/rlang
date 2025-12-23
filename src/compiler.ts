import types from "./types";
import signs from "./signs";
import type { CODE, LOCATION, TOKEN, TOKEN_TYPE, TYPE } from "./types_";

export class Compiler {
	constructor(public code: string, public lexTokens: TOKEN<any>[] = []) {}

	isBreak(char: string) {
		return ["\n", "\r", ";", "}"].includes(char);
	}

	compile() {
		return this.compile_(this.lexTokens);
	}

	private compile_(code: TOKEN<any>[]) {
		const preCompiled: (
			| CODE
			| { type: "sign"; data: string }
			| { type: "eol" }
		)[] = [];
		const ctx = {
			compile: (code: TOKEN<any>[]) => {
				console.log(`RECOMPILE: ${JSON.stringify(code)}`);
				return this.compile_(code);
			},
		};
		console.log("STARTING");
		console.log(JSON.stringify(code));
		let i = 0;
		while (true) {
			const token = code[i];
			// console.log(`Compiling ${JSON.stringify(token)} ${i}`);
			if (!token) {
				break;
			}
			if (token.type === "sign") {
				preCompiled.push({ type: "sign", data: token.value });
			} else if (token.type === "eol") {
				preCompiled.push({ type: "eol" });
			} else if (token.type === "eof") {
				break;
			} else if (token.type === "char") {
				const word = [];
				while (true) {
					const char = code[i];
					console.log(`Char '${JSON.stringify(char)}'`);
					if (!char) {
						console.log("Breaking");
						break;
					} else if (char.type === "char") {
						console.log(`CHAR ${JSON.stringify(char)}`);
						word.push(char.value);
					} else {
						console.log("NOT CHAR");
						break;
					}
					i++;
				}
				preCompiled.push({
					type: "var",
					data: { name: word.join("") },
				});
				i--;
			} else {
				console.log(JSON.stringify(token));
				const code = types[token.type as keyof typeof types].compile(
					token,
					ctx
				);
				preCompiled.push(code);
			}
			i++;
		}

		const compiled: CODE[] = [];
		console.log(`PRECOMPILED: ${JSON.stringify(preCompiled)}`);
		for (let i = 0; i < preCompiled.length; i++) {
			const token = preCompiled[i];
			console.log(`LINE: ${JSON.stringify(token)}`);
			if (!token) {
				console.log("....BREAK");
				break;
			}
			if (token.type === "sign") {
				console.log(`....SIGN`);
				for (const sign of Object.values(signs)) {
					if (sign.sign === token.data) {
						const [code, pre, post] = sign.compile(
							compiled,
							preCompiled,
							ctx
						);
						new Array(pre).forEach(() => {
							compiled.pop();
						});
						compiled.push(code);
						i += post;
						break;
					}
				}
			} else if (token.type === "var") {
				console.log("....VAR");
				compiled.push(token);
			}
		}
		return compiled;
	}

	lex() {
		const tokens = this.lex_(this.code);
		tokens.push({
			type: "eof",
			from: { line: 1, col: 1 },
			to: { line: 1, col: 1 },
			value: undefined,
		});
		this.lexTokens = tokens;
		return tokens;
	}

	private lex_(code: string, startLoc: LOCATION = { line: 1, col: 1 }) {
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
		const loc = () => ({ line, col });

		const ctx = {
			push,
			peek,
			advance,
			isAlpha,
			isAlnum,
			goto,
			lex,
			loc,
		};

		while (true) {
			console.log(`Lexing ${i + 1}/${code.length} '${peek()}'`);
			const ch = peek();
			if (!ch) {
				break;
			}
			if (this.isBreak(ch)) {
				if (ch === "\n") {
					push("eol", undefined, { line, col });
				}
				advance();
				continue;
			} else if (ch === " " || ch === "	") {
				advance();
				continue;
			}
			console.log("....Lexing");
			let found = false;
			for (const sign of Object.values(signs)) {
				if (sign.sign === ch) {
					push("sign", sign.sign, { line, col });
					found = true;
					advance();
					break;
				}
			}
			if (found) {
				continue;
			}
			console.log("....Not sign");
			for (const type of Object.values(types)) {
				if (typeof type.char === "string") {
					console.log("......Type string");
					const regex = new RegExp(`^${type.char}`);
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
						const regex = new RegExp(`^${char}`);
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
			console.log("....Not type");

			push("char", ch, { line, col });
			advance();
		}
		console.log("Returning");
		return tokens;
	}
}
