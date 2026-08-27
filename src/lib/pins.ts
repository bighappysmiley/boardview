export function randomPin() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

export function isPin(value: string) {
  return /^\d{4}$/.test(value);
}
