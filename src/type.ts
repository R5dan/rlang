import type Parser from "./parser";
import type { AllContexts, Runner, VM } from "./vm";

export type LexingRegexRule<N, T> = {
	name: N;
	regex: RegExp;
	match?: never;
};

export type LexingFunctionRule<N, T> = {
	name: N;
	match: (input: string) => { length: number; text: string } | null;
	regex?: never;
};

export type LexingRule<N, T> = LexingRegexRule<N, T> | LexingFunctionRule<N, T>;

export type StatementRule<T> = {
	name: string;
	match: (p: Parser) => boolean;
	parse: (p: Parser) => Stmt<T>;
	precedence?: number;

	run: (data: T, vm: VM, runner: Runner<AllContexts>) => void | Type;
};

export type ExpressionRule<
	D = any,
	R extends string | never = string,
	N = string,
> = {
	name: N;
	match: (p: Parser) => boolean
	prefix?: (p: Parser) => AnyData<D, R extends string ? R : N> | TypeHolder;
	infix?: (p: Parser, left: AnyData) => AnyData<D, R extends string ? R : N> | TypeHolder;
	precedence?: number;

	runs?: R[];
	run?: (p: D, vm: VM, runner: Runner) => Type;
};

export type ExecutionRule<D = any> = {
	name: string;
	run: (data: D, vm: VM) => void;
};

export type Token<K = string> = {
	kind: K;
	value: string | null;
	pos: {
		loc: number | null;
		line: number | null;
		col: number | null;
		file: string;
	};
};

export type Keyword<R = any> = {
	name: string;
	parse: (p: Parser) => R;
};
type MergeUnion<U> = (U extends any ? (x: U) => void : never) extends (
	x: infer I,
) => void
	? { [K in keyof I]: I[K] }
	: never;

export type Data<N, D> = {
	name: N;
	data: D;
};

type Merge<A, B> = Omit<A, keyof B> & B;

export type TypeHolder = Data<"typeHolder", {
	name: string,
	public: Record<string, Expr|Variable|TypeHolder>
	private: Record<string, any>
}>

export type Type<
	N extends string = string,
	I extends readonly Type<any, any, any, any>["type"][] = any[],
	CPu extends Record<string, TypeInstance<Type<string, any, any, any>>> = {},
	CPr extends Record<string, any> = {},
	Pr extends Record<string, any> = {},
	Pu extends Record<string, TypeInstance<Type<any, any, any, any, any, any>>> = {},
> = {
	type: {
		name: N;
		inheritance: I;
		public: CPu;
		private: CPr;
	};
	metadata: {
		pr: Pr;
		pu: Pu;
	};
};

export type TypeInstance<
	T extends Type,
	Pu extends Record<string, Type<string, any[], any, any, any, any>> = {},
	Pr extends Record<string, any> = {},
> = Data<
	"type",
	{
		public: Merge<
			T extends Type<any, any, any, any, any, infer M> ? M : {},
			Pu
		>;
		private: Merge<
			T extends Type<any, any, any, any, infer M, any> ? M : {},
			Pr
		>;
		class: T["type"];
	}
>;

export type Variable = Data<
	"variable",
	{
		name: string;
	}
>;

export type Expr<D extends any = any, N = string> = Data<
	"expr",
	{
		name: N;
		data: D;
	}
>;

export type Stmt<D = any, N = string> = Data<"stmt", { name: N; data: D }>;

export type AnyData<D = any, N = string> =
	| Type
	| Variable
	| Expr<D, N>
	| Stmt<D, N>;

// export type Function = Omit<Type, "data"> & {
// 	data: Omit<Type["data"], "name" | "private">;
// } & {
// 	data: {
// 		name: "function";
// 		private: {
// 			__call__: (
// 				args: (Type | Variable | Expr)[],
// 				runner: Runner,
// 				vm: VM,
// 			) => Type;
// 			[key: string]: any;
// 		};
// 	};
// };
