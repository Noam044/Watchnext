import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { createImportJob } from "@/lib/import";
import { filesFromZip, parseLetterboxdExport, type ExportFile } from "@/lib/letterboxd/export";
import { getCurrentUser } from "@/lib/session";
import { errorResponse } from "@/lib/http";

const MAX_BYTES = 25 * 1024 * 1024;

/** Réception de l'export Letterboxd (.zip ou CSV séparés) et création de l'import. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

  try {
    const form = await req.formData();
    const uploads = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (uploads.length === 0) throw new AppError("CSV_INVALID", "Aucun fichier reçu.");
    const totalSize = uploads.reduce((s, f) => s + f.size, 0);
    if (totalSize > MAX_BYTES) throw new AppError("FILE_TOO_LARGE", "Fichier trop volumineux (25 Mo maximum).", 413);

    const files: ExportFile[] = [];
    for (const f of uploads) {
      const name = f.name.toLowerCase();
      if (name.endsWith(".zip")) files.push(...filesFromZip(new Uint8Array(await f.arrayBuffer())));
      else if (name.endsWith(".csv")) files.push({ name: f.name, content: await f.text() });
      else throw new AppError("CSV_INVALID", `« ${f.name} » n'est ni un .zip ni un .csv.`);
    }

    const { entries, used } = parseLetterboxdExport(files);
    const label = uploads.map((f) => f.name).join(", ");
    const job = await createImportJob(user.id, label, entries);
    return NextResponse.json({ jobId: job.id, total: entries.length, files: used });
  } catch (e) {
    return errorResponse(e);
  }
}
