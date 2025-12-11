import type Type from "./type";

export default {
  name: "int",
  descriptions: "integer",
  schema: "(?<val>[0-9]+)"
} satisfies Type;