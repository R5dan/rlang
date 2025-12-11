import type Type from "./type";
import z from "zod";

export default {
	name: "string",
	descriptions: "string",
  schema: `("|')(?<val>.*)\\1`
} satisfies Type;