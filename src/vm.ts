import type { Instr, Bytecode } from "./compiler.js";

export type NativeRegistry = Map<string, (...args: any[]) => any>;

export class VM {
	globals = new Map<string, any>();
	// functions mapping built by scanning bytecode labels
	labels = new Map<string, number>();
	native: NativeRegistry;

	constructor(native?: NativeRegistry) {
		this.native = native ?? new Map();
		// register internal helpers
		this.native.set("__get_member", (obj: any, prop: string) => {
			return obj ? obj[prop] : undefined;
		});
	}

	loadBytecode(bc: Bytecode) {
		// scan for function entry points: we adopt the simple rule that functions
		// start at positions previously recorded during compilation (none in this
		// simple pipeline). To enable calling by name, we expect some external
		// mapping; for this example, we infer functions from global STORE of
		// function names: not perfect, so instead we accept that compile produced
		// labelPositions via external mapping — simpler: we expose a way to provide labels
		// But to keep example runnable, we'll provide a simple function resolution:
		// When CALL name is encountered, we'll search for a STORE of that name to mark labels.
		// For brevity: we'll assume top-level functions were compiled sequentially:
		// The compiler stored their starting positions in the Bytecode.consts as meta? Not done.
		// To keep things simple: store labels externally via vm.registerLabel.
		this.bytecode = bc;
	}

	bytecode!: Bytecode;

	registerLabel(name: string, pc: number) {
		this.labels.set(name, pc);
	}

	run(): any {
		const instrs = this.bytecode.instrs;
		const consts = this.bytecode.consts;
		const stack: any[] = [];
		const callStack: number[] = [];
		let pc = 0;

		const globals = this.globals;
		const native = this.native;

		function pop() {
			const v = stack.pop();
			return v;
		}

		while (pc < instrs.length) {
			const ins = instrs[pc++];
			switch (ins.op) {
				case "CONST":
					stack.push(consts[ins.arg]);
					break;
				case "LOAD":
					stack.push(
						globals.has(ins.arg) ? globals.get(ins.arg) : undefined
					);
					break;
				case "STORE":
					globals.set(ins.arg, pop());
					break;
				case "POP":
					pop();
					break;
				case "ADD": {
					const b = pop();
					const a = pop();
					stack.push(a + b);
					break;
				}
				case "SUB": {
					const b = pop();
					const a = pop();
					stack.push(a - b);
					break;
				}
				case "MUL": {
					const b = pop();
					const a = pop();
					stack.push(a * b);
					break;
				}
				case "DIV": {
					const b = pop();
					const a = pop();
					stack.push(a / b);
					break;
				}
				case "MOD": {
					const b = pop();
					const a = pop();
					stack.push(a % b);
					break;
				}
				case "EQ": {
					const b = pop();
					const a = pop();
					stack.push(a === b);
					break;
				}
				case "NEQ": {
					const b = pop();
					const a = pop();
					stack.push(a !== b);
					break;
				}
				case "LT": {
					const b = pop();
					const a = pop();
					stack.push(a < b);
					break;
				}
				case "GT": {
					const b = pop();
					const a = pop();
					stack.push(a > b);
					break;
				}
				case "LE": {
					const b = pop();
					const a = pop();
					stack.push(a <= b);
					break;
				}
				case "GE": {
					const b = pop();
					const a = pop();
					stack.push(a >= b);
					break;
				}
				case "JUMP":
					pc = ins.arg;
					break;
				case "JUMP_IF_FALSE": {
					const v = pop();
					if (!v) pc = ins.arg;
					break;
				}
				case "CALL": {
					const { name, argc } = ins.arg;
					// handle function call to compiled function
					const target = this.labels.get(name);
					if (target === undefined) {
						throw new Error("Undefined function: " + name);
					}
					// pack args into an array and provide as locals on stack
					// we'll push return pc and continue at target
					callStack.push(pc);
					// push argument markers? For simple approach, push a frame object with args
					const args = [];
					for (let k = 0; k < argc; k++) args.unshift(pop());
					stack.push({ __frame_args: args });
					pc = target;
					break;
				}
				case "CALL_NATIVE": {
					const { name, argc } = ins.arg;
					const args = [];
					for (let k = 0; k < argc; k++) args.unshift(pop());
					const fn = native.get(name);
					if (!fn)
						throw new Error("Native function not found: " + name);
					const ret = fn(...args);
					stack.push(ret);
					break;
				}
				case "RETURN": {
					// If callStack empty => program return
					if (callStack.length === 0) return pop();
					// clean up until frame marker found
					const maybeFrame = pop();
					if (maybeFrame && maybeFrame.__frame_args) {
						// discard frame marker; actual return value should be on stack top
						const ret = stack.pop();
						pc = callStack.pop()!;
						stack.push(ret);
					} else {
						// no frame marker: just pop and set pc
						const retv = maybeFrame;
						pc = callStack.pop()!;
						stack.push(retv);
					}
					break;
				}
				case "HALT":
					return stack.length ? stack[stack.length - 1] : undefined;
				default:
					// handle unknown/extension ops
					throw new Error("Unknown op " + (ins as any).op);
			}
		}
		return undefined;
	}
}
