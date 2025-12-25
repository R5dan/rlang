import z from "zod";
import type { Type } from "./type";

export default {
	name: "int",
	description: "integer",
	char: "[0-9]",

	compile(val, ctx) {
		return {
			type: "type",
			data: {
				type: "int",
				value: parseInt(val.value),
			},
		};
	},

	lex(val, ctx, loc) {
		let num = "";

		while (true) {
			const char = ctx.advance();
			if (/[0-9]/.test(char)) {
				num += char;
			} else if (char === ".") {
				ctx.goto(loc);
				return false;
			} else {
				ctx.push("int", num, loc);
				break;
			}
		}
	},
} satisfies Type<string, number>;
