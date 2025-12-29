import type Parser from "./parser";

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

export type StatementRule<T extends Record<any, any>> = {
	name: string;
	match: (p: Parser<any>) => boolean;
	parse: (p: Parser<any>) => T;
	run: (data: T, vm: Runner) => Type;
	precedence?: number;
};

export type ExpressionRule<T> = {
	name: string;
	precedence: number;
	kind: string;
	value: string;
	parse: (
		p: Parser<any>,
		left: (AnyData)[],
	) => T;
	run: (data: T, vm: Runner) => Type;
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

export type Keyword<T = string, R = any> = {
	name: string;
	parse: (p: Parser<T>) => R;
};

export type Data<N, D> = {
	name: N;
	data: D;
};

export type Type = Data<
	"type",
	{
		// Name of the type
		name: string;
		inheritance: string[];

		// Accessible via the lang
		public: Record<string, any>;

		// Accessible to the vm
		private: Record<string, any>;
	}
>;

export type Variable = Data<
	"variable",
	{
		name: string;
	}
>;

export type Expr = Data<
	"expr",
	{
		name: string;
		data: any;
	}
>;

export type AnyData = Type | Variable | Expr