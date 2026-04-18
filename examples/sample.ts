// Example file to trigger a review — intentionally has issues

export function processUserInput(input: string): string {
  // SQL injection vulnerability
  const query = `SELECT * FROM users WHERE name = '${input}'`;
  console.log(query);

  // No error handling
  const data = JSON.parse(input);

  // Hardcoded secret
  const apiKey = "sk-secret-key-12345";

  // Unused variable
  const temp = data.value;

  return apiKey + data.name;
}

export function divide(a: number, b: number): number {
  // No zero division check
  return a / b;
}

export async function fetchData(url: string) {
  // No input validation, no timeout, no error handling
  const res = await fetch(url);
  const json = await res.json();
  return json;
}
// trigger review
