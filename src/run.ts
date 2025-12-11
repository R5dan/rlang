import type { EXPR, TYPE, CMD, CODE } from "./types";
import cmds from "./cmd";
import exprs from "./expr";
import { isPromise } from "./utils";

export class Executor {
	public stack: Line[] = [];

	constructor() {}

	async eval<C extends CODE>(
		code: C,
		runner: Runner
	): Promise<C extends CMD ? undefined : C extends EXPR ? TYPE : undefined> {
		if (code.type === "kword") {
			const cmd = cmds[code.data.kword as keyof typeof cmds];
			if (!cmd) {
				throw new Error("ERROR");
			}

			await cmd.execute(code.data.data, runner);
			// @ts-expect-error
			return;
		} else if (code.type === "expr") {
			const expr = exprs[code.data.expr as keyof typeof exprs];
			if (!expr) {
				throw new Error("Error");
			}

			const data = expr.execute(code.data.data, runner);
			if (isPromise(data)) {
				return await data;
			}
			return data;
		} else if (code.type === "var") {
			const val = runner.ctx.ctx[code.data.name];
			if (!val) {
				throw new Error("Invalid variable");
			}
			return val;
		} else {
			console.log(`ELSE: ${JSON.stringify(code)}`);
		}
		// @ts-expect-error
		return undefined;
	}

	load(lines: Line): void;
	load(lines: Line[]): void;

	load(lines: Line | Line[]) {
		if (Array.isArray(lines)) {
			this.stack.push(...lines);
			return;
		} else {
			this.stack.push(lines);
		}
		console.log(`LOADING: ${this.stack}`);
	}

	async execute() {
		while (true) {
			let line = this.stack.pop();
			if (!line) {
				console.log(`BREAKING: "${this.stack}" "${line}"`);
				break;
			}
			await this.eval(line.code, line.runner);
			line.exec();
		}
	}
}

class Context {
	public ctx: Record<string, TYPE["data"]>;
	constructor() {
		this.ctx = {};
	}
}

class Line {
	constructor(public code: CODE, public runner: Runner) {}

	public exec() {
		this.runner.execute();
	}
}

export class Runner {
	public code: CODE[];
	public pc: number;
	public ctx: Context;
	public executor: Executor;
	public curLine?: Line;
	public _break = false;

	constructor(code: CODE[], executor: Executor) {
		this.code = code;
		this.pc = 0;
		this.ctx = new Context();
		this.executor = executor;
	}

	eval(code: CODE) {
		return this.executor.eval(code, this);
	}

	execute() {
		const code = this.code[this.pc];
		if (!code) {
			console.log(`END OF CODE: ${this.pc} ${this.code.length}`);
			return;
		}
		if (this._break) {
			console.log(`BREAK: ${this.pc} ${this.code.length}`);
			return;
		}
		const line = new Line(code, this);
		this.curLine = line;
		this.executor.stack.push(line);
		this.pc++;
	}

	break() {
		this._break = true;
	}
}
