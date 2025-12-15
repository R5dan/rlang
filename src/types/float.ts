import z from "zod";
import type { Type } from "./type";

export default {
	name: "int",
	description: "integer",
	char: "[0-9.]",

	compile(val, ctx) {},

	lex(val, ctx, loc) {
		let num = "";
		num += val;

		while (true) {
			const char = ctx.advance();
			if (char in ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "."]) {
				num += char;
			} else {
				ctx.push("float", num, loc);
				break;
			}
		}
	},
} satisfies Type<string>;
