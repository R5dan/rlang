import type { Sign } from "./type";

export const open = {
	name: "Bracket",
	description: "Bracket",
	sign: "(",
	compile(pre, post, ctx) {
		const prep = pre[pre.length-1];
		console.log(prep);
		if (prep && prep.type === "var") {
			const args = [];
			let i = 0;
			while (true) {
				const val = post[i];
				if (!val) {
					throw new Error("Syntax Error");
				}
				if (val.type === "sign" && val.data === "(") {
					break;
				} else {
					args.push(val);
				}
				i++;
			}
			return [
				{
					type: "expr",
					data: {
						expr: "call",
						data: {
							var: prep,
							args,
						},
					},
				},
				0,
				i+1,
			];
		} else {
			const group = [];
			let i = 0;
			while (true) {
				const val = post[i];
				console.log(`GROUP: ${JSON.stringify(val)} ${i}`);
				if (!val) {
					throw new Error("Syntax Error");
				}
				if (val.type === "sign" && val.data === ")") {
					break;
				} else {
					group.push(val);
				}
				i++;
			}

			return [
				{
					type: "expr",
					data: {
						expr: "group",
						data: group,
					},
				},
				0,
				i+1,
			];
		}
	},
} satisfies Sign;

export const close = {
	name: "Close-Bracket",
	description: "Bracket",
	sign: ")",
	compile(pre, post) {
		throw new Error("Syntax Error");
	},
} satisfies Sign;
