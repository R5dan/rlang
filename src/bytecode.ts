import { Program } from "./ast";
import { RCType } from "./types";

export type Instruction =
  | { op: "push_int"; value: number }
  | { op: "push_float"; value: number }
  | { op: "push_string"; value: string }
  | { op: "make_array"; max: number; count: number }
  | { op: "add" }
  | { op: "sub" }
  | { op: "declare"; name: string; mutable: boolean; sys: boolean }
  | { op: "store"; name: string }
  | { op: "load"; name: string }
  | { op: "return" }
  | { op: "make_function"; name: string }
  | { op: "call"; name: string; argc: number; async: boolean }
  | { op: "await" };

export interface BytecodeFunction {
  name: string;
  params: string[];
  async: boolean;
  instructions: Instruction[];
}

export interface BytecodeProgram {
  source: string;
  main: Instruction[];
  functions: Record<string, BytecodeFunction>;
  globals: string[];
}

export interface EmitContext {
  program: Program;
}

export interface TypedBinding {
  name: string;
  type: RCType;
  mutable: boolean;
  sys: boolean;
}

