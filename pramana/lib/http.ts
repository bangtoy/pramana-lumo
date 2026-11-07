import { ZodError } from "zod";

class HttpError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export function fail(message: string, status = 400): never { throw new HttpError(message, status); }

export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response> | Response) {
  return async (...args: A): Promise<Response> => {
    try { return await fn(...args); }
    catch (error) {
      if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
      if (error instanceof ZodError) return Response.json({ error: "Invalid input.", issues: error.issues.map(({ path, message }) => ({ path, message })) }, { status: 400 });
      console.error("Request failed:", error instanceof Error ? error.name : "UnknownError");
      return Response.json({ error: "The request could not be completed. Please try again." }, { status: 500 });
    }
  };
}
