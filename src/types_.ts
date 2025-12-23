export type STACK_OBJ<T extends string, D> = {
	type: T;
	data: D;
};

export type TYPE<V extends any = any> = STACK_OBJ<
	"type",
	{
		type: string;
		value: V;
	}
>;

export type EXPR<D = any> = STACK_OBJ<
	"expr",
	{
		expr: string;
		data: D;
	}
>;

export type VARIABLE = STACK_OBJ<
	"var",
	{
		name: string;
	}
>;

export type CODE = VARIABLE | EXPR | TYPE;

export type LEXER_CTX<T> = {
	advance: (i?: number) => string;
	loc: () => LOCATION;
	peek: () => string | undefined;
	isAlpha: (c?: string) => boolean;
	isAlnum: (c?: string) => boolean;
	push: (type: TOKEN_TYPE, value: T, from: LOCATION, to?: LOCATION) => void;
	goto: (loc: LOCATION) => void;
	lex: (char: string) => TOKEN<any>[];
};

export interface LEXER<T> {
	lex(char: string, ctx: LEXER_CTX<T>, loc: LOCATION): void | false;
	char: string | string[] | RegExp;
}

// 'sign' | 'eof' | 'eol' | 'char' | types
export type TOKEN_TYPE =
	| "str"
	| "int"
	| "float"
	| "function"
	| "eof"
	| "eol"
	| "char"
	| "sign";

export type TOKEN<T> = {
	type: TOKEN_TYPE;
	value: T;
	to?: LOCATION;
	from: LOCATION;
};

export type LOCATION = {
	line: number;
	col: number;
};

export type COMPILER_CTX = {
	compile: (code: TOKEN<any>[]) => CODE[]
}