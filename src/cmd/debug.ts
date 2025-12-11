import type Cmd from "./cmd";
import type { TYPE, VARIABLE, EXPR } from "../types";

export default {
	keyword: "debug" as const,
	compile(line, ctx) {
		return [1, {}]
  	},
	async execute(data, ctx) {
		console.log(ctx.ctx.ctx)
		console.log("\n\n")
	},
} satisfies Cmd<{}>;
