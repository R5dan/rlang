export interface Kword {
	name: string;
	compile: (code: string, ctx: any) => [number, any];
	execute: (data: any, ctx: any) => void;
}
