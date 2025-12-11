import type { TYPE, EXPR, VARIABLE } from "../types";
import type Expr from "./expr";
import { compileExpr } from "../compile";
import type { FunctionData } from "../cmd/function/types";
import { FunctionRunner } from "../cmd/function/runner";
type CallData = {
	var: VARIABLE;
	args: TYPE;
};

export default {
	name: "call",
	description: "Call a function",
	pre: 1,
	post: 1,
	sign: ":" as const,
	compile(pre, post) {
    console.log(`PRE: ${JSON.stringify(pre)} POST: ${post}`)
		const var_ = pre[0]!;
		if (var_.type !== "var") {
			throw new Error("Invalid variable");
    }
    const args = post[0]!;
    if (args.type !== "type" && args.data.type !== "tuple") {
      console.log(JSON.stringify(args))
			throw new Error("Invalid arguments");
		}
		return {
			var: var_,
			args,
		};
	},
  async execute({ var: var_, args: a }, ctx) {
    console.log(`CALL: ${var_.data.name}`)
    let args;
    if (a.type === "type" && a.data.type === "tuple") {
      args = a
    } else {
      args = await ctx.eval(a)!
      if (args.type !== "type" || args.data.type !== "tuple") {
        throw new Error("Invalid arguments")
      }
    }


    const func = (ctx.ctx.ctx[var_.data.name]!.value) as FunctionData<any>;
    
    const runner = new FunctionRunner(func, (args.data.value as TYPE[]).reduce((acc, val, i) => {
      acc[i.toFixed(0)] = val
      return acc
    }, {} as Record<string, TYPE>), ctx.executor); 
    console.log("CALLING")
    await runner.call();
    console.log("RESPONDED")
    const res = runner.return
    console.log(`RETURNED: "${JSON.stringify(res)}"`)
    if (!res) {

      return {
        type: "type",
        data: {
          type: "void",
          value: null
        }
      }
    }
    return res;
  },
} satisfies Expr<CallData>;
