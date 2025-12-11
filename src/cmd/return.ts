import type Cmd from "./cmd";
import type { TYPE, VARIABLE, EXPR } from "../types";
import type { FunctionRunner } from "./function/runner";

type ConstData = {
	value: TYPE | VARIABLE | EXPR;
};

export default {
	keyword: "return" as const,
	compile(line, ctx) {
		const val = line.trim();
		console.log(`RETURN: ${val}`);
		const value = ctx.compileExpr(val)
		console.log(`RETURN VALUE: ${value}`)
		return [
			1,
			{
				value: value[0]
			},
		] as const;
	},
	async execute(data, ctx) {
		const val = await ctx.eval(data.value)!;
		console.log(`RETURNING: "${JSON.stringify(val)}"`)

		if (!Object.hasOwn(ctx, "return_")) {
			ctx.ctx.ctx["return"] = val["data"];
		}
		ctx.return_(val);
	},
} satisfies Cmd<ConstData, FunctionRunner>;
