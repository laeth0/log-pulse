export function readArgument(
  argumentName: string,
  defaultValue: string,
): string {
  const prefix = `--${argumentName}=`;
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument?.slice(prefix.length) ?? defaultValue;
}

export function readPositiveInteger(
  argumentName: string,
  defaultValue: number,
): number {
  const value = Number(readArgument(argumentName, String(defaultValue)));

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${argumentName} must be a positive integer`);
  }

  return value;
}

export function hasFlag(flagName: string): boolean {
  return process.argv.includes(`--${flagName}`);
}
