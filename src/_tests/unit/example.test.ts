import * as assert from 'assert';


// example.test.ts

test('myFunction', () => {
  assert(myFunction() === 'expected value');
});


function myFunction() {
  return 'expected value';
}