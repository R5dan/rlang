export type STACK_OBJ<T, D> = {
  type: T;
  data: D;
}

export type EXPR<D = any> = STACK_OBJ<"expr", {expr: string; data: D}>

export type VARIABLE = STACK_OBJ<"var", {name: string}>

export type TYPE<V extends any = any> = STACK_OBJ<"type", {
			type: string;
			value: V;
	}
>

export type CMD<D = any> = STACK_OBJ<"kword", {
	kword: string;
	data: D;
}>

export type CODE = VARIABLE | EXPR | TYPE | CMD