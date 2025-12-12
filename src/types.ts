export type PrimitiveType = "int" | "float" | "string" | "void";

export interface AnyType {
  kind: "any";
}

export interface ArrayType {
  kind: "array";
  element: RCType;
  maxLength: number;
}

export interface PromiseType {
  kind: "promise";
  inner: RCType;
}

export type RCType = PrimitiveType | ArrayType | PromiseType | AnyType;

export interface SourceFile {
  path: string;
  content: string;
}

export interface CompileOptions {
  defaultArrayMax: number;
}

