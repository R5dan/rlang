import type { TYPE, CODE } from "../types";
import type Expr from "./expr";

type AddData = {
	arg1: CODE;
	arg2: CODE;
};

export default {
	name: "add",
	description: "Add two numbers",
	pre: 1,
	post: 1,
	sign: "+" as const,
	compile(pre, post) {
		console.log(pre, post);
		return {
			arg1: pre[0]!,
			arg2: post[0]!,
		};
	},
	async execute({ arg1, arg2 }, ctx) {
		let val1: TYPE;
		let val2: TYPE;

		if (arg1.type !== "type") {
			val1 = await ctx.eval(arg1)!;
		} else {
			val1 = arg1;
		}

		if (arg2.type !== "type") {
			val2 = await ctx.eval(arg2)!;
		} else {
			val2 = arg2;
		}

		if (val1.data.type === "int" && val2.data.type === "int") {
			return {
				type: "type",
				data: {
					type: "int",
					value: `${
						parseInt(val1.data.value) + parseInt(val2.data.value)
					}`,
				},
			};
		}
		throw new Error("Invalid type");
	},
} satisfies Expr<AddData, number>;
