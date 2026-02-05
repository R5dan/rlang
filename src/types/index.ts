import type { AnyData, Expr, Type, Variable } from "../type";
import { FunctionContext, Runner, type VM } from "../vm";

export type Object<C extends Type = Void> = Type<
	"object",
	[],
	{
		__call__: Function<C>;
		__str__: Function<String>;
		__bool__: Function<Boolean>;
	}
>;

export type Void = Type<"void">;

export type Function<R extends Type = Void> = Type<
	"function",
	[Object],
	{
		__call__: (
			args: (Type | Expr | Variable)[],
			runner: Runner,
			vm: VM,
		) => R;
	}
>;

export type String = Type<"string", [Object], {}, { value: string }>;

export type Number = Type<"number", [Object], {}, { value: number }>;
export type Float = Type<"float", [Object, Number]>;

export type Integer = Type<"integer", [Object, Number]>;
export type Boolean = Type<"boolean", [Object], {}, { value: boolean }>;

export function object(): Object {
	const obj = {
		name: "type",
		data: {
			name: "object",
			inheritance: [],
			public: {},
		},
	} as Object;
	const priv = {
		__call__(args: (Type | Expr | Variable)[], runner: Runner, vm: VM) {
			return call(this.parent.data.public.__call__, args, runner, vm);
		},
		__str__: functionType((args, runner, vm) => stringType(obj.data.name)),
		parent: obj,
	} as const;
	obj.data.private = priv;
	return obj;
}

export function type<
	N extends string = "void",
	I extends Type[] = [],
	Pu extends Record<string, Type> = {},
	Pr extends Record<string, any> = {},
>(
	data: {
		name: N;
		inheritance: I;
		public?: Partial<Type<N, I, Pu, Pr>["data"]["public"]>;
		private?: Partial<Type<N, I, Pu, Pr>["data"]["private"]>;
	} = { name: "void", inheritance: [] },
): Type<N, I, Pu, Pr> {
	return {
		name: "type",
		data: {
			...({
				name: "void",
				inheritance: [],
				public: {},
				private: {},
			} as any as Type<N, I, Pu, Pr>["data"]),
			...data.inheritance?.reduce(
				(acc, val) => {
					return {
						public: {
							...acc.public,
							...(val?.public ?? {}),
						},
						private: {
							...acc.private,
							...(val?.private ?? {}),
						},
					};
				},
				{ public: {}, private: {} } as Type<N, I, Pu, Pr>["data"],
			),
			...data,
		},
	};
}

export function voidType(): Void {
	return type({ name: "void", inheritance: [] });
}

export function functionType(
	callFn?: Function["data"]["private"]["__call__"],
	code?: AnyData[],
	argsDef?: string[],
): Function {
	const obj = {
		name: "function",
		inheritance: [type()],
		public: {},
		private: {
			__call__(args, runner, vm) {
				if (!code) return;
				let bound = {} as Record<string, Type>;
				if (argsDef) {
					bound = args.reduce(
						(acc, val, i) => {
							const key = argsDef[i];
							if (!key) {
								throw new Error("Too many args");
							}
							const value = vm.execAny(val, runner);
							acc[key] = value;
							return acc;
						},
						{} as Record<string, Type>,
					);
				}
				const ctx = new FunctionContext(bound, runner.ctx);
				const r = new Runner(vm, ctx);
				r.load(code);
				r.run();
				return ctx.returnType;
			},
		},
	} as Function["data"];
	if (callFn) obj.private.__call__ = callFn;
	return type(obj);
}

export function numberType(value: number): Number {
	const obj = {
		name: "number",
		inheritance: [object()],
		public: {},
		private: {
			value,
			__str__: functionType((args, runner, vm) => stringType(value)),
		},
	} satisfies Number["data"];

	return type(obj);
}

export function stringType(value: string): String {
	return type({
		name: "string",
		inheritance: [object()],
		private: {
			value,
		},
	});
}

export function call<T extends Function | undefined>(
	obj: T,
	args: (Type | Variable | Expr)[],
	runner: Runner,
	vm: VM,
): T extends Type ? (T extends Function<infer R> ? R : never) : never {
	if (!obj) throw new Error("No obj");
	// console.log(obj)
	return obj.data.private.__call__(args, runner, vm);
}
