import type * as z4 from "zod/v4/core";
import type { Compiler } from "../compiler";
import type { TYPE } from "../types_";

export interface Type<T extends z4.$ZodType> {
  name: string;
  description: string;
  begin: string;

  compile(val: string, ctx: {res: ReturnType<RegExp["exec"]>, comp: Compiler }): [TYPE, number];
}