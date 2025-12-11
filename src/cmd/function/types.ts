import type { CODE } from "../../types";

export type FunctionData<A extends boolean> = {
	name: string;
	code: CODE[];
	args: string[];
  length: number;
  async: A;
};
