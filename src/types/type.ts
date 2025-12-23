import type * as z4 from "zod/v4/core";
import type { COMPILER_CTX, LEXER, TOKEN, TYPE } from "../types_";

export interface Type<L, C> extends LEXER<L> { 
	name: string;
	description: string;

	compile(val: TOKEN<L>, ctx: COMPILER_CTX): TYPE<C>;
}
