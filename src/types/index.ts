import type { AnyData, Expr, Type, TypeInstance, Variable } from "../type";
import { FunctionContext, Runner, type VM } from "../vm";

export type Object<C extends Type = Void> = Type<
	"object",
	[],
	{
		__call__: TypeInstance<Function<C>>;
		__str__: TypeInstance<Function<String>>;
		__bool__: TypeInstance<Function<Boolean>>;
		__get__: TypeInstance<Function<Type>>;
	}
>;

export type Void = Type<"void">;

export type Function<R extends Type = Void> = Type<
	"function",
	[],
	{},
	{
		inst: TypeInstance<Function<R>>["data"];
	},
	{
		code: AnyData[];
		args: string[];
		__call__: (
			args: (TypeInstance<Type> | Expr | Variable)[],
			runner: Runner,
			vm: VM,
			obj: TypeInstance<Type>,
		) => TypeInstance<R>;
	}
>;

export type String = Type<
	"string",
	[Object["type"]],
	{},
	{},
	{ value: string }
>;

export type Number = Type<
	"number",
	[Object["type"]],
	{},
	{},
	{ value: number }
>;
export type Float = Type<"float", [Object["type"], Number["type"]]>;

export type Integer = Type<"integer", [Object["type"], Number["type"]]>;
export type Boolean = Type<"boolean", [Object["type"]], {}, { value: boolean }>;

export const functionType = type<Function<any>>(
	{
		name: "function",
		inheritance: [],
		public: {},
		private: {},
	},
	{
		private: {
			__call__(args, runner, vm, obj: TypeInstance<Function<any>>) {
				if (!obj.data.private.code) return;
				let bound = {} as Record<string, TypeInstance<Type>>;
				if (obj.data.private.args) {
					bound = args.reduce(
						(acc, val, i) => {
							const key = obj.data.private.args[i];
							if (!key) {
								throw new Error("Too many args");
							}
							const value = vm.execAny(val, runner);
							acc[key] = value;
							return acc;
						},
						{} as Record<string, TypeInstance<Type>>,
					);
				}
				const ctx = new FunctionContext(bound, runner.ctx);
				const r = new Runner(vm, ctx);

				r.load(obj.data.private.code);
				r.run();
				return ctx.returnType;
			},
		},
		public: {},
	},
);

export function fn<R extends Type>(
	fn: Function<R>["metadata"]["pr"]["__call__"],
	name: string = "null",
): TypeInstance<Function<R>> {
	const func = functionType();

	func.data.private.__call__ = fn;
	func.custom = true;
	func.cname = name;
	func.data.private.name = name;
	return func;
}

export const object = type<Object>({
	name: "object" as const,
	inheritance: [],
	public: {
		__str__: fn<String>((args, runner, vm, obj) => {
			return string(`<${obj.data.class.type.name}>`);
		}, "obj"),
		__bool__: fn<Boolean>((args, runner, vm) => booleanType(true)),
	},
	private: {},
});

export function type<T extends Type>(
	obj: T["type"],
	inst: {
		public: T["metadata"]["pu"];
		private: T["metadata"]["pr"];
	} = {
		public: {},
		private: {},
	},
): { (): TypeInstance<T>; class: T["type"] } {
	const fn = () => {
		const ret = {
			name: "type",
			data: {
				private: { ...inst.private },
				public: { ...inst.public },
				class: obj,
			},
		};
		ret.data.private.inst = obj;
		ret.data.class.private.inst = obj;
		return ret;
	};
	fn.class = obj;
	return fn;
}

export const voidType = type<Void>({
	name: "void",
	inheritance: [],
	public: {},
	private: {},
});

export const numberType = type<Number>({
	name: "number",
	inheritance: [object.class],
	public: {
		__str__: fn((args, runner, vm, obj) => {
			return string(obj.data.private.value);
		}, "num"),
	},
	private: {
		value: NaN,
	},
});

export function number(value: number) {
	const obj = numberType();
	obj.data.private.value = value;
	return obj;
}

export const stringType = type<String>({
	name: "string",
	inheritance: [object.class],
	private: {},
	public: {
		__str__: fn((args, runner, vm, obj) => {
			return string(obj.data.private.value);
		}, "str"),
	},
});

export function string(value: string) {
	const obj = stringType();
	obj.data.private.value = value;
	return obj;
}

export const booleanType = type<Boolean>({
	name: "boolean",
	inheritance: [object.class],
	public: {
		__bool__: fn<Boolean>((args, r, vm, obj) => {
			return boolean(obj.data.private.value);
		}),
		__str__: fn<String>((args, r, vm, obj) => {
			return string(obj.data.private.value);
		}, "bool"),
	},
	private: {},
});

export function boolean(value: boolean) {
	const obj = booleanType();
	obj.data.private.value = value;
	return obj;
}

export function call<
	T extends TypeInstance<Function<R>> | undefined,
	R extends Type,
>(
	obj: TypeInstance<Type>,
	fn: T,
	args: (TypeInstance<Type> | Variable | Expr)[],
	runner: Runner,
	vm: VM,
): TypeInstance<R> {
	if (!fn) throw new Error("No obj");
	const ret = fn.data.private.__call__(args, runner, vm, obj);
	return ret;
}
