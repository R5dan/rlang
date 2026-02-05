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
	kind: string;
	value?: string;
	prefix?: (p: Parser) => AnyData<D, R extends string ? R : N>;
	infix?: (p: Parser, left: AnyData) => AnyData<D, R extends string ? R : N>;
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
type MergeInheritance<
	T extends readonly Type<any, any, any, any>[],
	K extends "public" | "private",
	Acc = {},
> = T extends readonly [
	infer Head extends Type<any, any, any, any>,
	...infer Tail extends readonly Type<any, any, any, any>[],
]
	? MergeInheritance<Tail, K, Merge<Acc, Head["data"][K]>>
	: Acc;
type Merge<A, B> = Omit<A, keyof B> & B;
export type Type<
	N extends string = string,
	I extends readonly Type<any, any, any, any>[] = [],
	Pu extends Record<string, Type<string, any, any, any>> = {},
	Pr extends Record<string, any> = {},
> = Data<
	"type",
	{
		name: N;
		inheritance: I;

		public: Merge<MergeInheritance<I, "public">, Pu>;

		private: Merge<MergeInheritance<I, "private">, Pr>;
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
