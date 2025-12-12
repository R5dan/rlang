export type StringLiteral = { kind: "string"; value: string };
export type IntLiteral = { kind: "int"; value: number };
export type FloatLiteral = { kind: "float"; value: number };
export type ArrayLiteral = { kind: "array"; maxLength?: number; elements: Expression[] };
export type Identifier = { kind: "identifier"; name: string };
export type AwaitExpression = { kind: "await"; expression: Expression };

export type Expression =
  | StringLiteral
  | IntLiteral
  | FloatLiteral
  | ArrayLiteral
  | Identifier
  | BinaryExpression
  | AssignmentExpression
  | CallExpression
  | FunctionExpression
  | AwaitExpression;

export type BinaryOperator = "+" | "-";
export type AssignmentOperator = "=" | "+=" | "-=";

export type BinaryExpression = { kind: "binary"; op: BinaryOperator; left: Expression; right: Expression };
export type AssignmentExpression = {
  kind: "assign";
  op: AssignmentOperator;
  target: Identifier;
  value: Expression;
};

export type CallExpression = {
  kind: "call";
  callee: Identifier | FunctionExpression;
  args: Expression[];
};

export type FunctionExpression = {
  kind: "function";
  name?: string;
  params: string[];
  body: Statement[];
  async: boolean;
};

export type VariableDeclaration = {
  kind: "var";
  name: string;
  value: Expression;
  mutable: boolean;
  sys: boolean;
};

export type FunctionDeclaration = {
  kind: "fun";
  fn: FunctionExpression & { name: string };
};

export type ReturnStatement = { kind: "return"; value?: Expression };
export type ExpressionStatement = { kind: "expr"; expression: Expression };

export type Statement = VariableDeclaration | FunctionDeclaration | ReturnStatement | ExpressionStatement;

export type Program = { kind: "program"; body: Statement[] };

