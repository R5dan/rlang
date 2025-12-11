export type STACK_OBJ<T extends string, D> = {
  type: T
  data: D
}

export type TYPE<V extends any = any> = STACK_OBJ<"type", {
  type: string
  value: V
}>

export type EXPR<D = any> = STACK_OBJ<"expr", {
  expr: string
  data: D
}>;

export type VARIABLE = STACK_OBJ<"var", {
  name: string
}>;

export type CODE = VARIABLE | EXPR | TYPE;