import type { Compiler } from "../compiler";
import type { CODE, EXPR, TYPE } from "../types_";

export interface Sign {
  name: string;
  description: string;
  sign: string;
  compile(pre: CODE[], post: (CODE|{type: "sign", data: string})[], ctx: Compiler): [EXPR | TYPE, number, number]; // returns [data, pre, post]
}