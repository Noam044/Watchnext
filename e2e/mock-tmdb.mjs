// Serveur TMDB factice pour les tests de bout en bout : un petit catalogue de films,
// et les routes utilisées par Watchnext (recherche, détails, recommandations, discover…).
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_TMDB_PORT ?? 4010);
const DRAMA = { id: 18, name: "Drame" };
const CRIME = { id: 80, name: "Crime" };
const SF = { id: 878, name: "Science-Fiction" };
const director = (id, name) => ({ id, name, job: "Director" });

const FILMS = [
  [1001, "Les Évadés", "The Shawshank Redemption", 1994, [DRAMA, CRIME], director(2001, "Frank Darabont")],
  [1002, "Le Parrain", "The Godfather", 1972, [DRAMA, CRIME], director(2002, "Francis Ford Coppola")],
  [1003, "Les Affranchis", "GoodFellas", 1990, [DRAMA, CRIME], director(2003, "Martin Scorsese")],
  [1004, "Casino", "Casino", 1995, [DRAMA, CRIME], director(2003, "Martin Scorsese")],
  [1005, "Inception", "Inception", 2010, [SF], director(2004, "Christopher Nolan")],
  [1006, "Interstellar", "Interstellar", 2014, [SF, DRAMA], director(2004, "Christopher Nolan")],
  [1007, "Heat", "Heat", 1995, [CRIME], director(2005, "Michael Mann")],
  [1008, "Collateral", "Collateral", 2004, [CRIME, DRAMA], director(2005, "Michael Mann")],
  [1009, "Le Loup de Wall Street", "The Wolf of Wall Street", 2013, [CRIME, DRAMA], director(2003, "Martin Scorsese")],
  [1010, "Memento", "Memento", 2000, [CRIME], director(2004, "Christopher Nolan")],
  [1011, "Zodiac", "Zodiac", 2007, [CRIME, DRAMA], director(2006, "David Fincher")],
  [1012, "Seven", "Se7en", 1995, [CRIME], director(2006, "David Fincher")],
].map(([id, title, titleEn, year, genres, dir]) => ({ id, title, titleEn, year, genres, dir }));

const listItem = (f) => ({
  id: f.id,
  title: f.title,
  original_title: f.titleEn,
  original_language: "en",
  release_date: `${f.year}-06-01`,
  poster_path: `/poster-${f.id}.jpg`,
  backdrop_path: `/backdrop-${f.id}.jpg`,
  overview: `Synopsis de ${f.title}.`,
  vote_average: 8,
  vote_count: 5000,
  popularity: 50,
  genre_ids: f.genres.map((g) => g.id),
  adult: false,
});

const details = (f) => ({
  ...listItem(f),
  runtime: 120,
  genres: f.genres,
  credits: { cast: [{ id: 3000 + f.id, name: `Acteur ${f.id}`, order: 0 }], crew: [f.dir] },
  keywords: { keywords: [{ id: 9001, name: "mafia" }] },
  "watch/providers": { results: { FR: { link: "https://example.test/watch", flatrate: [{ provider_id: 8, provider_name: "Netflix", logo_path: null }] } } },
  translations: { translations: [{ iso_639_1: "en", iso_3166_1: "US", data: { title: f.titleEn, overview: `Overview of ${f.titleEn}.` } }] },
});

const page = (results) => ({ page: 1, results, total_pages: 1, total_results: results.length });
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname.replace(/^\/3/, "");
  const send = (status, body) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  let m;
  if (path === "/search/movie") {
    const q = norm(url.searchParams.get("query") ?? "");
    return send(200, page(FILMS.filter((f) => norm(f.title) === q || norm(f.titleEn) === q).map(listItem)));
  }
  if (path === "/genre/movie/list") return send(200, { genres: [DRAMA, CRIME, SF] });
  if (path === "/discover/movie" || path === "/trending/movie/week") return send(200, page(FILMS.map(listItem)));
  if (path === "/watch/providers/movie") {
    return send(200, { results: [{ provider_id: 8, provider_name: "Netflix", logo_path: null, display_priorities: { FR: 1 } }] });
  }
  if ((m = path.match(/^\/movie\/(\d+)\/(recommendations|similar)$/))) {
    return send(200, page(FILMS.filter((f) => f.id !== Number(m[1])).map(listItem)));
  }
  if ((m = path.match(/^\/movie\/(\d+)\/videos$/))) return send(200, { results: [] });
  if ((m = path.match(/^\/movie\/(\d+)$/))) {
    const f = FILMS.find((x) => x.id === Number(m[1]));
    return f ? send(200, details(f)) : send(404, { status_message: "Not found" });
  }
  send(404, { status_message: `Route inconnue du TMDB factice : ${path}` });
}).listen(PORT, () => console.log(`TMDB factice sur http://localhost:${PORT}`));
