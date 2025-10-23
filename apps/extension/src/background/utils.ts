export function hashReview(input: string): string {
  const encoder = new TextEncoder();
  const view = encoder.encode(input);
  let hash = 0;
  for (const byte of view) {
    hash = (hash << 5) - hash + byte;
    hash = Math.trunc(hash);
  }
  return hash.toString(16);
}
