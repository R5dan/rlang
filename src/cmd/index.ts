import constCmd from "./const";
import returnCmd from "./return";
import debugCmd from "./debug";
import { functionCmd, asyncCmd } from "./function";
import type Cmd from "./cmd";
import type { Runner } from "../run";

export default {
	const: constCmd,
	function: functionCmd,
	async: asyncCmd,
	return: returnCmd,
  debug: debugCmd,
} satisfies Record<string, Cmd<any, Runner>>;