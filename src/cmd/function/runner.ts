import { Executor, Runner } from "../../run";
import type { FunctionData } from "./types";
import type { TYPE } from "../../types";

export class FunctionRunner extends Runner {
	public awaited: boolean = false;
  private _return_: TYPE | undefined = undefined;
  private return_listender: Function | undefined = undefined
  private __returned: boolean = false
  public args: Record<string, TYPE> = {}

	constructor(public func: FunctionData<any>, args: Record<string, TYPE>, executor: Executor) {
		super(func.code, executor);
    this.args = Object.entries(args).reduce((acc, [key, val]) => {
      if (!Number.isNaN(parseInt(key))) {
        acc[(func.args[parseInt(key) as keyof typeof func.args])as string] = val
      } else if (func.args.includes(key)) {
        acc[key as string] = val
      } else {
        throw new Error("Invalid argument")
      }
      return acc
    }, {} as Record<string, TYPE>)
    Object.assign(this.ctx.ctx, this.args)
	}

  return_(val: TYPE) {
    console.log("RETURNING")
    this.return = val
    this.break()
  }

  get return() {
    return this._return_
  }

  set return(val) {
    console.log("SETTING")
    this._return_ = val
    this.return_listender ? this.return_listender() : (() => {this.__returned = true})()
  }

  async call() {
    this.return = {
			type: "type",
			data: {
				type: "void",
				value: "undefined",
			},
		};
		const worker = new Worker("./worker.ts");
			worker.postMessage(this.func);
			worker.onmessage = (event) => {
        const res = event.data;
        console.log(`RETURNING: ${JSON.stringify(res)}`)
				this.return!.data = res
			};
    if (this.func.async) {
      this.return = {
        type: "type",
        data: {
          type: "promise",
          value: null,
        },
		  };
      return;
    } else {
      if (this.__returned) {
        console.log("EARLY RETURN")
        return
      }
      return await new Promise<void>((res) => {
        this.return_listender = () => {
          console.log("RES")
          res()
        }
      })
    }
  }
}
