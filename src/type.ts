export type RegexRule<T> = {
	name: T;
	regex: RegExp;
  match?: never;
};

export type FunctionRule<T> = {
	name: T;
	match: (
		input: string
	) => { rule: FunctionRule<T>; length: number; text: string } | null;
  regex?: never;
};

export type Rule<T> = RegexRule<T> | FunctionRule<T>;

export type Token = {
	kind: string;
	value: string;
	pos: {
		loc: number;
		line: number;
		col: number;
	};
};
