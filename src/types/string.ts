import z from "zod";
import type { Type } from "./type";

const escapedChars = {
  "n": "\n",
} as Record<string, string>

export default {
	name: "string",
	description: "A string",
	begin: "^(\"|'|`)",

	compile(val, ctx) {
    let i = 0;
    let value = "";
		while (true) {
      const char = val[i];
      if (char === "\\") {
        i++;
        const next = val[i];
        if (!next) {
          throw new Error("Invalid string");
        }
        if (next in escapedChars) {
          value += escapedChars[next];
        } else {
          value += next;
        }
      }
      else if (char === ctx.res) {
        i++;
        return [{
          type: "type",
          data: {
            type: "string",
            value
          }
        }, i]
      } else {
        value += char
      }
      i++;
		}
	},
} satisfies Type<typeof regex>;
