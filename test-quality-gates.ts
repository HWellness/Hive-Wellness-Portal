// This file intentionally fails quality gates for testing

const testObject = {
  name: "test",
  value: 123,
  active: true,
};

const unusedVar = 42;
console.log("This should fail lint");


function badFunction() {
  const arr = [1, 2, 3];
  return arr.map((x) => x * 2);
}

  export default class TestClass {
  constructor() {
    this.value = 0;
  }
  method() {
    return "test";
  }
}
