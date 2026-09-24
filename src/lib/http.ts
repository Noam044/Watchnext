import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";

export function errorResponse(e: unknown) {
  if (e instanceof AppError) {
    return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
}
