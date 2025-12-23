export function assert<B extends boolean>(
	condition: B,
	message: string
): B extends true ? void : never {
	if (!condition) {
		throw new Error(message);
	}
}

export function debug(strings: TemplateStringsArray, ...values: any[]) {
	return strings.reduce(
			(acc, str, i) =>
				`${acc}${str}${
					i < values.length ? `'${JSON.stringify(values[i])}` : ""
				}'`,
			""
		)
}
