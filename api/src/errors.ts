// Enveloppe d'erreur uniforme — voir app-builder-guidances/README.md,
// « API errors ». { error: { code, message, details? } }, jamais de texte brut.

export class AppError extends Error {
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(opts: {
    code: string;
    message: string;
    statusCode?: number;
    details?: Record<string, unknown>;
  }) {
    super(opts.message);
    this.code = opts.code;
    this.statusCode = opts.statusCode ?? 400;
    this.details = opts.details;
  }
}

export function errorBody(err: AppError | Error) {
  if (err instanceof AppError) {
    return {
      status: err.statusCode,
      body: { error: { code: err.code, message: err.message, details: err.details } },
    };
  }
  return {
    status: 500,
    body: { error: { code: "internal", message: "An error occurred" } },
  };
}
