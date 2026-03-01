import "console" as console native;

fn main(): void {
  // local variable with type hint
  let x: number = 10;
  let s: string = "World";
  // call native console.log via member expression
  console.log("Hello", s);
  // call top-level native function 'print'
  print("sum:", x + 5);
  return;
}