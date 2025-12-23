import type { Type } from "./type";

const escapedChars = {
	n: "\n",
} as Record<string, string>;

export default {
	name: "string",
	description: "A string",
	char: ["'", '"', "`"],

	compile(val, ctx) {
		return {
				type: "type",
				data: {
					type: "string",
					value: val.value,
				},
			}
	},

	lex(val, ctx, loc) {
		let str = "";
		while (true) {
			const char = ctx.advance();
			if (char === "\\") {
				const next = ctx.advance();
				if (next in escapedChars) {
					str += escapedChars[next];
				}
			} else if (char === val) {
				ctx.push("str", str, loc);
				break;
			} else {
				str += char;
			}
		}
	},
} satisfies Type<string, string>;
