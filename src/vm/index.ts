import type {
	AnyData,
	Expr,
	Stmt,
	Type,
	TypeHolder,
	TypeInstance,
	Variable,
} from "../type";
import { EventEmitter } from "node:events";
import { statementRules, expressionRules } from "../rules";
import { booleanType, numberType, stringType, voidType } from "../types";

export type ContextType = {
	ctx: Record<string, TypeInstance<Type>>;
	special: string | null;
	parent: ContextType | null;
	getVar(variable: Variable): TypeInstance<Type>;
};

abstract class BaseContext implements ContextType {
	public ctx: Record<string, TypeInstance<Type>> = {};
	public abstract special: string | null;
	constructor(public parent: ContextType | null = null) {}

	getVar(variable: Variable): TypeInstance<Type> {
		const name = variable.data.name;
		if (this.ctx[name]) return this.ctx[name];
		if (this.parent) return this.parent.getVar(variable);

		throw new Error(`Variable ${name} not found`);
	}

	setVar(variable: Variable | string, data: TypeInstance<Type>): void {
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
	public returnType: TypeInstance<Type> = voidType();
	public override special = "function" as const;

	constructor(
		args: Record<string, TypeInstance<Type>>,
		parent: ContextType | null = null,
	) {
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
	public types = {
		string: stringType,
		number: numberType,
		boolean: booleanType,
	};

	public worker = new Worker("./worker.ts");
	public line: Line | null = null;
	public break: boolean = false;
	public eventId: number = 1

	constructor(
		public queue: Line[],
		public microtasks: (() => void)[],
		public microevents: Record<number, () => void>,
	) {}

	execExpr(expr: Expr, runner: Runner): TypeInstance<Type> {
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

		return rule.run(data, this, runner) as TypeInstance<Type>;
	}

	execStmt(stmt: Stmt, runner: Runner): void {
		const data = stmt.data.data;
		const name = stmt.data.name;

		const rule = statementRules.find((r) => r.name === name && r?.run);
		if (!rule) throw new Error(`No rule for ${name}`);

		rule.run(data, this, runner);
	}

	exec(expr: Stmt | Expr, runner: Runner): TypeInstance<Type> | void {
		if (expr.name === "stmt") {
			return this.execStmt(expr, runner);
		} else if (expr.name === "expr") {
			return this.execExpr(expr, runner);
		}
	}

	getVar(variable: Variable): TypeInstance<Type> {
		const var_ = this.line?.ctx.getVar(variable);
		if (!var_) throw new Error(`Variable ${variable.data.name} not found`);
		return var_;
	}

	execLine(line: Line): void {
		try {
			const data = line.data;
			this.exec(data, line.runner);
			line.exec();
		} catch (e) {
			console.error("\n\nERROR:");
			console.error(line.data);
			throw e;
		}
	}

	execAny(
		data: Expr | TypeInstance<Type> | Variable | TypeHolder,
		runner: Runner,
	): TypeInstance<Type> {
		if (data.name === "expr") {
			return this.execExpr(data, runner);
		} else if (data.name === "variable") {
			return this.getVar(data);
		} else if (data.name === "type") {
			return data;
		} else if (data.name === "typeHolder") {
			const obj = this.types[data.data.name]() as TypeInstance<Type>;
			obj.data.public = { ...obj.data.public, ...data.data.public };
			obj.data.private = { ...obj.data.private, ...data.data.private };
			return obj;
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
			let i = 0;
			while (true) {
				const e = this.runTick(queue, microtasks, microevents);
				//
				if (this.break) {
					break;
				}
				if (break_ && i > break_ && !queue.length) {
					break;
				} else {
				}
				if (!e) {
					i++;
				} else {
					i = 0;
				}
			}
		} catch (e) {
			throw e;
		}
	}

	runTick(
		queue: Line[],
		microtasks: (() => void)[],
		microevents: (() => void)[],
	) {
		let event = false;

		while (true) {
			const line = queue.shift();

			if (!line) {
				break;
			}
			// console.log(line)
			// const { data } = { ...line };

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
		while (i < Object.values(microevents).length) {
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

	addEvent(fn: () => void): number {
		const id = this.eventId
		this.microevents[id] = fn
		this.eventId++
		return id
	}

	removeEvent(id: number) {
		delete this.microevents[id]
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
