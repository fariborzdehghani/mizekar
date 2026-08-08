export class PublicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicError";
  }
}

export function getPublicErrorMessage(error: unknown, fallback: string) {
  return error instanceof PublicError ? error.message : fallback;
}

export function reportError(context: string, error: unknown) {
  console.error(`[${context}]`, error);
}
