import type { AnyData, Expr, Stmt, Type, Variable } from "../type";
import { EventEmitter } from "node:events";
import { statementRules, expressionRules } from "../rules";
import { voidType } from "../types";

export type ContextType = {
	ctx: Record<string, Type>;
	special: string | null;
	parent: ContextType | null;
	getVar(variable: Variable): Type;
};

abstract class BaseContext implements ContextType {
	public ctx: Record<string, Type> = {};
	public abstract special: string | null;
	constructor(public parent: ContextType | null = null) {}

	getVar(variable: Variable): Type {
		// console.log("GET");
		// console.log(JSON.stringify(this.ctx));
		const name = variable.data.name;
		if (this.ctx[name]) return this.ctx[name];
		if (this.parent) return this.parent.getVar(variable);

		throw new Error(`Variable ${name} not found`);
	}

	setVar(variable: Variable | string, data: Type): void {
		if (typeof variable === "string") {
			this.ctx[variable] = data;
		} else {
			this.ctx[variable.data.name] = data;
		}
	}
}

export class Context extends BaseContext implements ContextType {
	public override special = null;
}

export class FunctionContext extends BaseContext implements ContextType {
	public returnType: Type = voidType();
	public override special = "function" as const;

	constructor(args: Record<string, Type>, parent: ContextType | null = null) {
		super(parent);
		this.ctx = { ...this.ctx, ...args };
	}
}

export type AllContexts = Context | FunctionContext;

export class Line<C extends ContextType = AllContexts> {
	constructor(
		public data: Expr | Stmt,
		public runner: Runner<C>,
		public ctx: ContextType,
	) {}

	exec(): void {
		this.runner.exec();
	}
}

export class VM {
	public eventEmitter = new EventEmitter();
	public worker = new Worker("./worker.ts");
	public line: Line | null = null;
	public break: boolean = false;
	// public ctxs: Generator<void, Type, void>[] = [];
	constructor(
		public queue: Line[],
		public microtasks: (() => void)[],
		public microevents: (() => void)[],
	) {}

	execExpr(expr: Expr, runner: Runner): Type {
		const data = expr.data;
		const name = expr.data.name;

		const rule = expressionRules.find((r) => {
			if (r.runs) {
				return r.runs.includes(name);
			}
			return r.name === name && r?.run;
		});
		if (!rule) throw new Error(`No rule for '${name}'`);
		if (!rule.run) throw new Error(`No run for rule '${name}'`);

		return rule.run(data, this, runner) as Type;
	}

	execStmt(stmt: Stmt, runner: Runner): void {
		const data = stmt.data.data;
		const name = stmt.data.name;

		const rule = statementRules.find((r) => r.name === name && r?.run);
		if (!rule) throw new Error(`No rule for ${name}`);

		rule.run(data, this, runner);
	}

	exec(expr: Stmt | Expr, runner: Runner): Type | void {
		// console.log("EXEC");
		// console.log(runner);
		if (expr.name === "stmt") {
			return this.execStmt(expr, runner);
		} else if (expr.name === "expr") {
			return this.execExpr(expr, runner);
		}
	}

	getVar(variable: Variable): Type {
		const var_ = this.line?.ctx.getVar(variable);
		if (!var_) throw new Error(`Variable ${variable.data.name} not found`);
		return var_;
	}

	execLine(line: Line): void {
		// console.log(JSON.stringify(line.data));
		const data = line.data;
		this.exec(data, line.runner);
		line.exec();
	}

	execAny(data: Expr | Type | Variable, runner: Runner): Type {
		if (data.name === "expr") {
			return this.execExpr(data, runner);
		} else if (data.name === "variable") {
			return this.getVar(data);
		} else if (data.name === "type") {
			return data;
		}
		throw new Error("Invalid data");
	}

	run() {
		return this.run_(this.queue, this.microtasks, this.microevents);
	}

	run_(
		queue: Line[],
		microtasks: (() => void)[],
		microevents: (() => void)[],
		break_: number = -1,
	) {
		try {
			// console.log(queue);
			let i = 0;
			while (true) {
				const e = this.runTick(queue, microtasks, microevents);
				// // console.log("TICK")
				if (this.break) {
					break;
				}
				if (break_ && i > break_ && !queue.length) {
					// console.log("\n\n\n");
					// console.log(
					// 	JSON.stringify(
					// 		queue.map((l) => {
					// 			const { data } = l;
					// 			return data;
					// 		}),
					// 	),
					// );
					// console.log("\n\n\n");
					break;
				} else {
					// 	console.log(i);
					// 	console.log(!queue.length);
					// 	console.log(i > break_);
					// 	console.log(!!break_ && i > break_ && !queue.length);
				}
				if (!e) {
					i++;
				} else {
					i = 0;
				}
			}
		} catch (e) {
			// console.log(this.queue);
			throw e;
		}
	}

	runTick(
		queue: Line[],
		microtasks: (() => void)[],
		microevents: (() => void)[],
	) {
		let event = false;
		// console.log("\n\n\nTICK\n");
		// console.log([...queue]);
		while (true) {
			const line = queue.shift();
			// console.log("LINE");
			if (!line) {
				// console.log([...queue]);
				// console.log(line);
				break;
			}
			// const { data } = { ...line };
			// console.log(JSON.stringify(data));

			event = true;
			this.line = line;
			this.execLine(this.line);
		}

		while (true) {
			const fn = microtasks.shift();
			if (!fn) break;
			event = true;

			fn();
		}

		let i = 0;
		while (i < microevents.length) {
			const fn = microevents[i];
			if (!fn) break;
			event = true;
			fn();
			i++;
		}
		return event;
	}

	addMicrotask(fn: () => void): void {
		this.microtasks.push(fn);
	}

	addEvent(fn: () => void): void {
		this.microevents.push(fn);
	}

	background() {}
}

export class Runner<C extends ContextType = AllContexts> {
	public running: boolean = false;
	constructor(
		public vm: VM,
		public ctx: C,
	) {
		if (!this.ctx) {
			throw new Error("Error");
		}
	}

	public lines: Line<C>[] = [];

	exec(): void {
		if (this.running) return;
		const line = this.lines.shift();
		if (!line) return;
		this.vm.queue.push(line);
	}

	run() {
		// const line = this.lines.shift()
		// if (!line) return void 0
		this.running = true;
		const ret = this.vm.run_(
			this.lines,
			this.vm.microtasks,
			this.vm.microevents,
			3,
		);
		this.running = true;
		this.lines = [];
		return ret;
	}

	load(data: AnyData): void;
	load(data: AnyData[]): void;

	load(data: AnyData | AnyData[]): void {
		if (Array.isArray(data)) {
			data.forEach((d) => {
				this.load(d);
			});
			return;
		}
		const line = new Line(data, this, this.ctx);
		this.lines.push(line);
	}
}
