import string from "./string";
import int from "./int";
import type Type from "./type";
import tuple from "./tuple";

export default {
  string,
  int,
  tuple
} satisfies Record<string, Type>