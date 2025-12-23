import { debug } from "../utils";
import type { Sign } from "./type";

export default {
	name: "Equal sign",
	description: "An equal sign",
	sign: "=",
	compile(pre, post, ctx) {
    const next = post[0];
    if (!next) {
      throw new Error("Syntax Error");
    }
    if (next.type === "type" && next.data.type === "sign" && next.data.value === "=") {
      const comp1 = pre[pre.length-1];
      const comp2 = post[1];
      return [
        {
          type: "expr",
          data: {
            expr: "booleanEqual",
            data: {
              left: comp1,
              right: comp2
            }
          }
        },
        1,
        1
      ]
    } else {
      const var_ = pre[pre.length-1];
      const val = post[0];
      console.log(debug`SETTING: ${var_} to ${val}`)
      return [
        {
          type: "expr",
          data: {
            expr: "setVar",
            data: {
              var: var_,
              val
            }
          }
        },
        1,
        1
      ]
    }
	},
} satisfies Sign;
