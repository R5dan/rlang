import type Type from "./type";

export default {
	name: "tuple",
	descriptions: "A tuple",
  schema: `\\((?<val>.*\\s*,\\s*(?:.*\\s*,\\s*)*.*)\\)`,

  compile(val, ctx) {
    console.log(`\n\n\n\n===================================\n\n\n\n`)
    const data = val.split(",").map((x) => {
      console.log(`\n\nVAL: "${x}"`)
		return ctx(x.trim())[0];
    });
    console.log("\n\n\n\n===================================\n\n\n\n");
    return data
  }
} satisfies Type;
