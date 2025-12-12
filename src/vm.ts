import { BytecodeProgram, Instruction, BytecodeFunction } from "./bytecode";

type Value = number | string | ArrayValue | Promise<any> | undefined;

type ArrayValue = { items: Value[]; max: number };

type Frame = {
  locals: Map<string, Value>;
};

export async function executeBytecode(bytecode: BytecodeProgram): Promise<void> {
  const vm = new VM(bytecode);
  await vm.run();
}

class VM {
  private stack: Value[] = [];
  private globals = new Map<string, Value>();
  private frames: Frame[] = [];
  private functions: Record<string, BytecodeFunction>;
  private instructions: Instruction[];

  constructor(private program: BytecodeProgram) {
    this.functions = program.functions;
    this.instructions = program.main;
    this.frames.push({ locals: new Map() });
  }

  private currentFrame() {
    return this.frames[this.frames.length - 1];
  }

  private rootFrame() {
    return this.frames[0];
  }

  async run() {
    await this.executeInstructions(this.instructions);
  }

  private async executeInstructions(instructions: Instruction[]): Promise<Value> {
    for (let ip = 0; ip < instructions.length; ip++) {
      const instr = instructions[ip];
      switch (instr.op) {
        case "push_int":
        case "push_float":
          this.stack.push(instr.value);
          break;
        case "push_string":
          this.stack.push(instr.value);
          break;
        case "make_array": {
          const elements = this.popMany(instr.count).reverse();
          if (elements.length > instr.max) throw new Error(`Array exceeds max ${instr.max}`);
          this.stack.push({ items: elements, max: instr.max });
          break;
        }
        case "add": {
          const right = this.pop();
          const left = this.pop();
          this.stack.push(this.addValues(left, right));
          break;
        }
        case "sub": {
          const right = this.pop();
          const left = this.pop();
          if (typeof left !== "number" || typeof right !== "number") {
            throw new Error("Subtraction requires numbers");
          }
          this.stack.push(left - right);
          break;
        }
        case "declare": {
          const value = this.pop();
          if (instr.sys) this.globals.set(instr.name, value);
          else this.currentFrame().locals.set(instr.name, value);
          break;
        }
        case "store": {
          const value = this.pop();
          const curr = this.currentFrame().locals;
          if (curr.has(instr.name)) {
            curr.set(instr.name, value);
          } else if (this.rootFrame().locals.has(instr.name)) {
            this.rootFrame().locals.set(instr.name, value);
          } else if (this.globals.has(instr.name)) {
            this.globals.set(instr.name, value);
          } else {
            throw new Error(`Unknown binding ${instr.name}`);
          }
          break;
        }
        case "load": {
          const curr = this.currentFrame().locals;
          const value =
            curr.get(instr.name) ?? this.rootFrame().locals.get(instr.name) ?? this.globals.get(instr.name);
          if (
            value === undefined &&
            !curr.has(instr.name) &&
            !this.rootFrame().locals.has(instr.name) &&
            !this.globals.has(instr.name)
          ) {
            throw new Error(`Unknown binding ${instr.name}`);
          }
          this.stack.push(value);
          break;
        }
        case "make_function":
          // functions are already compiled; no-op placeholder to keep stack aligned if we later add first-class functions
          break;
        case "call": {
          const fn = this.functions[instr.name];
          if (!fn) throw new Error(`Unknown function ${instr.name}`);
          const args = this.popMany(instr.argc).reverse();
          if (fn.async) {
            const promise = this.invokeFunctionAsync(fn, args);
            this.stack.push(promise);
          } else {
            const result = await this.invokeFunction(fn, args);
            this.stack.push(result);
          }
          break;
        }
        case "await": {
          const value = this.pop();
          const awaited = await Promise.resolve(value);
          this.stack.push(awaited);
          break;
        }
        case "return": {
          const value = this.stack.pop();
          return value;
        }
      }
    }
    return undefined;
  }

  private async invokeFunction(fn: BytecodeFunction, args: Value[]): Promise<Value> {
    const frame: Frame = { locals: new Map() };
    fn.params.forEach((p, i) => frame.locals.set(p, args[i]));
    this.frames.push(frame);
    const result = await this.executeInstructions(fn.instructions);
    this.frames.pop();
    return result;
  }

  private async invokeFunctionAsync(fn: BytecodeFunction, args: Value[]): Promise<Value> {
    return this.invokeFunction(fn, args);
  }

  private addValues(left: Value, right: Value): Value {
    if (typeof left === "number" && typeof right === "number") return left + right;
    if (typeof left === "string" && typeof right === "string") return left + right;
    if (isArrayValue(left) && isArrayValue(right)) {
      const merged = [...left.items, ...right.items];
      const max = left.max + right.max;
      if (merged.length > max) throw new Error(`Concatenated array exceeds max ${max}`);
      return { items: merged, max };
    }
    throw new Error("Invalid operands for +");
  }

  private pop(): Value {
    if (this.stack.length === 0) throw new Error("Stack underflow");
    return this.stack.pop() as Value;
  }

  private popMany(n: number): Value[] {
    if (n > this.stack.length) throw new Error("Stack underflow");
    const res: Value[] = [];
    for (let i = 0; i < n; i++) res.push(this.pop());
    return res;
  }
}

const isArrayValue = (v: Value): v is ArrayValue => typeof v === "object" && v !== null && "items" in (v as any);

