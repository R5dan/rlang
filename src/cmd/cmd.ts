import type { Runner } from "../run";
import type { CODE, EXPR, TYPE, VARIABLE } from "../types";

export default interface Cmd<T, R extends Runner = Runner> {
	keyword: string;

	compile(
		line: string,
		ctx: {
			compile: (code: string[]) => [number, CODE[]];
			compileExpr: (code: string) => [EXPR | TYPE | VARIABLE, number];
			code: string[];
		}
	): [number, T];

	execute(data: T, ctx: R): Promise<void>;
}
