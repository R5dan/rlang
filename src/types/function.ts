import z from "zod";

export default {
	name: "function",
	description: "A function",
	begin: "^function",
	compile(val, ctx) {
		const regex = new RegExp(
			"^function\\s+(?<name>[a-zA-Z_]+)\\s*\\((?<args>[a-zA-Z, ]*)\\)"
		);
		const match = regex.exec(val);
		if (!match) {
			throw new Error("Malformed function");
		}
		const name = match.groups!.name!;
		const args = match.groups!.args!.split(",").map((arg) => {
			return arg.trim();
		});

		const [data, i] = ctx.compile(val.slice(match[0].length));
		return [
			{
				type: "type",
				data: {
					type: "function",
					value: {
						name,
						args,
						code: data,
					},
				},
			},
			i,
		];
	},
};
