import z from "zod";
import type { Type } from "./type";
import type { TOKEN } from "../types_";

export default {
	name: "function",
	description: "A function",
	char: "function",

	lex(val, ctx, loc) {
		let part = "name";
		let name = "";
		const args: TOKEN<any>[] = [];
		const code: TOKEN<any>[] = [];
		ctx.advance(8);
		while (true) {
			const char = ctx.advance();
			if (part === "name") {
				if (char in [" ", "("]) {
					part = "args";
				} else if (ctx.isAlnum(char)) {
					name += char;
				} else {
					throw new Error(
						`Unexpected character '${char}' at ${loc.line}:${loc.col}`
					);
				}
			} else if (part === "args") {
				if (char === ")") {
					part = "code";
				} else if (char === ",") {
					args.push({
						type: "char",
						value: char,
						from: loc,
						to: loc,
					});
				} else {
					args.push(ctx.lex(char));
				}
			} else if (part === "code") {
				if (char === "}") {
					break;
				} else {
					code.push(ctx.lex(char));
				}
			}
		}

		ctx.push(
			"function",
			{
				name,
				args,
				code,
			},
			loc
		);
	},

	compile(val, ctx) {
		const args = [];
		let temp = [];
		for (const type of val.value!.args) {
			if (type.type === "char" && type.value === ",") {
				const compiled = ctx.compile(temp)
			}
		}
	},
} satisfies Type<{
	name: string;
	args: TOKEN<any>[];
	code: TOKEN<any>[];
}>;
