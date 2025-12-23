import type { Sign } from "./type";

export default {
	name: "Full Stop",
	description: "Int to Float || Get the value of a variable",
	sign: ".",
	compile(pre, post, ctx) {
		const val = pre[pre.length-1];
		if (!val) {
			throw new Error("Invalid type");
		}
		if (val.type === "type" && val.data.type === "int") {
			const val2 = post[0];
			if (val2 && val2.type === "type" && val2.data.type === "int") {
				return [
					{
						type: "type",
						data: {
							type: "float",
							value: `${parseInt(val.data.value)}.${parseInt(val2.data.value)}`,
						},
					},
					1,
					1,
				];
			}
		}
		return [
			{
				type: "type",
				data: {
					type: "unknown",
					value: "never",
				},
			},
			1,
			0,
		];
	},
} satisfies Sign;
