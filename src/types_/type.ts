import type { compileExpr } from "../compile";

export default interface Type {
	name: string;
	descriptions: string;
	schema: string | string[];
	compile?: (val: string, ctx: typeof compileExpr) => any;
}
