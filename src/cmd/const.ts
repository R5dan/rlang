import type Cmd from "./cmd";
import type { TYPE, VARIABLE, EXPR } from "../types";

type ConstData = {
	name: string;
	value: TYPE | VARIABLE | EXPR;
};

export default {
	keyword: "const" as const,
	compile(line, ctx) {
		const [name, value] = line.split("=");
		if (!name || !value) throw new Error("Invalid const");
		return [
			1,
			{
				name: name.trim(),
				value: ctx.compileExpr(value.trim())[0],
			},
		] as const;
	},
  async execute(data, ctx) {
		console.log(JSON.stringify(data))
		if (data.value.type === "type") {
			ctx.ctx.ctx[data.name] = data.value.data;
		} else {
			ctx.ctx.ctx[data.name] = (await ctx.eval(data.value))!.data;
		}
	},
} satisfies Cmd<ConstData>;
