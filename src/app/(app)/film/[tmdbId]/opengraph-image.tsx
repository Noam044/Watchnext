import { ImageResponse } from "next/og";
import { dictionaries } from "@/i18n/dictionaries";
import { prisma } from "@/lib/db";
import { refs } from "@/lib/films";
import { OG_COLORS, OG_SIZE, OgLogo, ogFonts } from "@/lib/og";
import { backdropUrl, posterUrl } from "@/lib/tmdb-images";

export const alt = "Watchnext";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Aperçu d'un film partagé (WhatsApp, Messenger…) : son image de fond assombrie, l'affiche
 * et le titre. Seuls les films déjà connus de Watchnext sont illustrés, sans appel à TMDB.
 */
export default async function Image({ params }: { params: Promise<{ tmdbId: string }> }) {
  const tmdbId = Number((await params).tmdbId);
  const film = Number.isInteger(tmdbId)
    ? await prisma.film.findUnique({
        where: { tmdbId },
        select: { title: true, year: true, runtime: true, directors: true, backdropPath: true, posterPath: true },
      })
    : null;
  const fonts = await ogFonts();
  if (!film) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: OG_COLORS.velvet,
        }}
      >
        <OgLogo size={72} />
      </div>,
      { ...size, fonts },
    );
  }

  const t = dictionaries.fr.film;
  const director = refs(film.directors)[0]?.name;
  const meta = [film.year, director && t.directedBy(director), film.runtime ? t.hours(film.runtime) : null]
    .filter(Boolean)
    .join(" · ");
  const backdrop = backdropUrl(film.backdropPath, "w1280");
  const poster = posterUrl(film.posterPath, "w342");

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: OG_COLORS.velvet }}>
      {backdrop && (
        <img
          src={backdrop}
          alt=""
          width={1200}
          height={675}
          style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
        />
      )}
      <div
        style={{
          // next/og (Satori) ignore « inset » : position et taille explicites.
          position: "absolute",
          top: 0,
          left: 0,
          width: OG_SIZE.width,
          height: OG_SIZE.height,
          display: "flex",
          background: "linear-gradient(90deg, rgba(18,8,9,0.96) 0%, rgba(18,8,9,0.82) 48%, rgba(18,8,9,0.25) 100%)",
        }}
      />
      <div style={{ position: "relative", display: "flex", width: "100%", padding: 64, gap: 56, alignItems: "center" }}>
        <div
          style={{ display: "flex", flexDirection: "column", flex: 1, height: "100%", justifyContent: "space-between" }}
        >
          <OgLogo size={34} />
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              style={{
                fontFamily: "Big Shoulders",
                fontSize: film.title.length > 28 ? 76 : 104,
                lineHeight: 0.92,
                textTransform: "uppercase",
                color: OG_COLORS.screen,
              }}
            >
              {film.title}
            </div>
            {meta && <div style={{ fontFamily: "Hanken Grotesk", fontSize: 30, color: OG_COLORS.dust }}>{meta}</div>}
          </div>
        </div>
        {poster && (
          <img
            src={poster}
            alt=""
            width={300}
            height={450}
            style={{
              borderRadius: 8,
              border: "2px solid rgba(246,236,220,0.15)",
              boxShadow: "0 30px 60px rgba(0,0,0,0.6)",
            }}
          />
        )}
      </div>
    </div>,
    { ...size, fonts },
  );
}
