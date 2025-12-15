import type * as z4 from "zod/v4/core";
import type { Compiler } from "../compiler";
import type { LEXER, TOKEN, TYPE } from "../types_";

export interface Type<T> extends LEXER<T> {
	name: string;
	description: string;

	compile(val: TOKEN<T>, ctx: Compiler): [TYPE, number];
}
