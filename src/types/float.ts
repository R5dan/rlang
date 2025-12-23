import z from "zod";
import type { Type } from "./type";

export default {
	name: "float",
	description: "A floating point number",
	char: "[0-9\\.]",

	compile(val, ctx) {
		let num = "";
		let dec = "";
		let isDec = false;

		val.value.split("").forEach((char) => {
			if (char === ".") {
				if (isDec) {
					throw new Error("Invalid float");
				}
				isDec = true;
			} else {
				if (isDec) {
					dec += char;
				} else {
					num += char;
				}
			}
		});

		return {
			type: "type",
			data: {
				type: "float",
				value: { num: parseInt(num), dec: parseInt(dec) },
			},
		};
	},

	lex(val, ctx, loc) {
		return false;
	},
} satisfies Type<
	string,
	{
		num: number;
		dec: number;
	}
>;
