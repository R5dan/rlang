// AST node types
export type TypeName = "number" | "string" | "boolean" | "any" | "void";

export interface Program {
	type: "Program";
	body: Statement[];
	imports: ImportDecl[];
}

export interface ImportDecl {
	type: "ImportDecl";
	path: string; // string literal path
	as?: string; // optional namespace alias
	native?: boolean;
}

export type Statement =
	| VarDecl
	| FuncDecl
	| ExprStmt
	| ReturnStmt
	| IfStmt
	| WhileStmt;

export interface VarDecl {
	type: "VarDecl";
	name: string;
	isConst: boolean;
	annotation?: TypeName;
	init?: Expr;
}

export interface FuncDecl {
	type: "FuncDecl";
	name: string;
	params: { name: string; annotation?: TypeName }[];
	retAnnotation?: TypeName;
	body: Statement[];
}

export interface ExprStmt {
	type: "ExprStmt";
	expr: Expr;
}

export interface ReturnStmt {
	type: "ReturnStmt";
	expr?: Expr;
}

export interface IfStmt {
	type: "IfStmt";
	cond: Expr;
	thenBody: Statement[];
	elseBody?: Statement[];
}

export interface WhileStmt {
	type: "WhileStmt";
	cond: Expr;
	body: Statement[];
}

export type Expr =
	| NumberLit
	| StringLit
	| BoolLit
	| Identifier
	| BinaryExpr
	| CallExpr
	| UnaryExpr
	| MemberExpr;

export interface NumberLit {
	type: "NumberLit";
	value: number;
}
export interface StringLit {
	type: "StringLit";
	value: string;
}
export interface BoolLit {
	type: "BoolLit";
	value: boolean;
}
export interface Identifier {
	type: "Identifier";
	name: string;
}
export interface BinaryExpr {
	type: "BinaryExpr";
	op: string;
	left: Expr;
	right: Expr;
}
export interface UnaryExpr {
	type: "UnaryExpr";
	op: string;
	arg: Expr;
}
export interface CallExpr {
	type: "CallExpr";
	callee: Expr;
	args: Expr[];
}
export interface MemberExpr {
	type: "MemberExpr";
	object: Expr;
	property: string;
}
