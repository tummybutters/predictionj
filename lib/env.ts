export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function requireOneOfEnv(names: string[]): { name: string; value: string } {
  for (const name of names) {
    const value = process.env[name];
    if (value) return { name, value };
  }
  throw new Error(`Missing required env var (one of): ${names.join(", ")}`);
}
