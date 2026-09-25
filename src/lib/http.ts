import { NextResponse } from "next/server";
import type { Dictionary } from "@/i18n/dictionaries";
import { AppError, translateError } from "@/lib/errors";

export function errorResponse(e: unknown, t: Dictionary) {
  if (e instanceof AppError) {
    return NextResponse.json({ error: translateError(e, t), code: e.code }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: t.errors.internal({}) }, { status: 500 });
}
