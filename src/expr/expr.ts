import type {CODE, TYPE} from "../types";
import type {Runner} from "../run"

export default interface Expr<D, P extends number | string = number> {
  name: string;
  description: string;

  pre: number;
  post: P;
  sign: string;

  compile(pre: CODE[], post: P extends number ? CODE[] : string): D;
  execute(data: D, ctx: Runner): TYPE | Promise<TYPE>;
}