import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL belum diatur.");
}

const rawSql = neon(process.env.DATABASE_URL);

function isTransientDatabaseError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error && "cause" in error ? String(error.cause) : "";
  const sourceError =
    typeof error === "object" && error !== null && "sourceError" in error
      ? String((error as { sourceError?: unknown }).sourceError)
      : "";

  return [message, cause, sourceError].some((text) =>
    /fetch failed|ECONNRESET|ETIMEDOUT|UND_ERR|network|socket/i.test(text)
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await rawSql(strings, ...values);
    } catch (error) {
      lastError = error;
      if (!isTransientDatabaseError(error) || attempt === 2) {
        throw error;
      }

      await wait(250 * (attempt + 1));
    }
  }

  throw lastError;
}) as typeof rawSql;

function serializeDbValue(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
}

export function toCamelRow<T extends Record<string, unknown>>(row: Record<string, unknown>): T {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase()),
      serializeDbValue(value),
    ])
  ) as T;
}

export function toCamelRows<T extends Record<string, unknown>>(rows: Record<string, unknown>[]): T[] {
  return rows.map((row) => toCamelRow<T>(row));
}
