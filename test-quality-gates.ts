export function calculateSum(a: number, b: number): number {
  return a + b;
}

export function greetUser(name: string): string {
  return `Hello, ${name}!`;
}

export function multiplyNumbers(a: number, b: number): number {
  return a * b;
}

export function divideNumbers(a: number, b: number): number {
  if (b === 0) {
    throw new Error("Division by zero");
  }
  return a / b;
}
