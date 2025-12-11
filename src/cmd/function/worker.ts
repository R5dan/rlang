import { Executor, Runner } from "../../run";
import type { FunctionData } from "./types";

declare var self: Worker;

self.onmessage = (event: MessageEvent) => {
  const func = (event.data as FunctionData<any>)
  const executor = new Executor();
	const runner = new Runner(func.code, executor);
	runner.execute();
  executor.execute(); 
  self.postMessage(runner.ctx.ctx["_return"])
};