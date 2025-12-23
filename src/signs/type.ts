import type { Compiler } from "../compiler";
import type { CODE, COMPILER_CTX, EXPR, TYPE } from "../types_";

export interface Sign {
	name: string;
	description: string;
	sign: string;
	compile(
		pre: CODE[],
		post: (CODE | { type: "sign"; data: string } | { type: "eol" })[],
		ctx: COMPILER_CTX
	): [EXPR | TYPE, number, number]; // returns [data, pre, post]
}
