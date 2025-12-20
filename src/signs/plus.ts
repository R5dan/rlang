import type { Sign } from "./type";

export default {
	name: "+",
	description: "Add two numbers",
	sign: "+",
	compile(pre, post, ctx) {
		const val1 = pre[-1];
		const val2 = post[0];

		if (!val1 || !val2) {
			throw new Error("Invalid type");
		}

		if (
			val1.type === "type" &&
			val2.type === "type" &&
			val1.data.type === "int" &&
			val2.data.type === "int"
		) {
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
		return [
			{
				type: "expr",
				data: {
					expr: "add",
					data: {
						arg1: val1,
						arg2: val2,
					},
				},
			},
			1,
			1,
		];
	},
} satisfies Sign;
