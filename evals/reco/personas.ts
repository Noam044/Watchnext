import type { Film } from "@/generated/prisma/client";

/**
 * Jeux d'essai de l'évaluation du moteur de recommandations.
 * Titres réels pour la lisibilité ; les identifiants TMDB et les personnes sont fictifs,
 * seuls les identifiants de genres suivent TMDB.
 */

type Ref = { id: number; name: string };

const G = {
  action: { id: 28, name: "Action" },
  animation: { id: 16, name: "Animation" },
  comedy: { id: 35, name: "Comédie" },
  crime: { id: 80, name: "Crime" },
  drama: { id: 18, name: "Drame" },
  fantasy: { id: 14, name: "Fantastique" },
  history: { id: 36, name: "Histoire" },
  horror: { id: 27, name: "Horreur" },
  music: { id: 10402, name: "Musique" },
  mystery: { id: 9648, name: "Mystère" },
  romance: { id: 10749, name: "Romance" },
  scifi: { id: 878, name: "Science-Fiction" },
  thriller: { id: 53, name: "Thriller" },
} satisfies Record<string, Ref>;

let nextPerson = 1;
const person = (name: string): Ref => ({ id: nextPerson++, name });
let nextKeyword = 1;
const kw = (name: string): Ref => ({ id: nextKeyword++, name });

const P = {
  aster: person("Ari Aster"),
  peele: person("Jordan Peele"),
  flanagan: person("Mike Flanagan"),
  carpenter: person("John Carpenter"),
  eggers: person("Robert Eggers"),
  wong: person("Wong Kar-wai"),
  sciamma: person("Céline Sciamma"),
  koreeda: person("Hirokazu Kore-eda"),
  wells: person("Charlotte Wells"),
  song: person("Celine Song"),
  nolan: person("Christopher Nolan"),
  villeneuve: person("Denis Villeneuve"),
  tarkovsky: person("Andreï Tarkovski"),
  carruth: person("Shane Carruth"),
  coppola: person("Francis Ford Coppola"),
  actionDirector: person("Réalisateur d'action"),
  romcomDirector: person("Réalisateur de comédies romantiques"),
  leung: person("Tony Leung"),
  collette: person("Toni Collette"),
  kaluuya: person("Daniel Kaluuya"),
  caine: person("Michael Caine"),
  diesel: person("Vin Diesel"),
  roberts: person("Julia Roberts"),
};

const K = {
  grief: kw("grief"),
  family: kw("family"),
  occult: kw("occult"),
  folkHorror: kw("folk horror"),
  possession: kw("possession"),
  slasher: kw("slasher"),
  isolation: kw("isolation"),
  socialSatire: kw("social satire"),
  loneliness: kw("loneliness"),
  hongKong: kw("hong kong"),
  unrequitedLove: kw("unrequited love"),
  childhood: kw("childhood"),
  timeTravel: kw("time travel"),
  space: kw("space"),
  dystopia: kw("dystopia"),
  heist: kw("heist"),
  carChase: kw("car chase"),
  wedding: kw("wedding"),
  newYork: kw("new york"),
  mafia: kw("mafia"),
};

type FilmSpec = {
  year: number;
  genres: Ref[];
  directors: Ref[];
  cast?: Ref[];
  keywords?: Ref[];
  /** Note moyenne TMDB et nombre de votes. */
  votes: [number, number];
};

let nextTmdbId = 90_001;
const catalog = new Map<string, Film>();

function film(title: string, spec: FilmSpec): Film {
  const tmdbId = nextTmdbId++;
  const f = {
    id: `eval-${tmdbId}`,
    tmdbId,
    title,
    year: spec.year,
    genres: spec.genres,
    directors: spec.directors,
    cast: spec.cast ?? [],
    keywords: spec.keywords ?? [],
    voteAverage: spec.votes[0],
    voteCount: spec.votes[1],
  } as unknown as Film;
  catalog.set(title, f);
  return f;
}

export const byTitle = (title: string) => {
  const f = catalog.get(title);
  if (!f) throw new Error(`Film absent du catalogue d'évaluation : ${title}`);
  return f;
};

// Horreur
film("Hereditary", { year: 2018, genres: [G.horror, G.mystery], directors: [P.aster], cast: [P.collette], keywords: [K.grief, K.family, K.occult], votes: [7.3, 7000] });
film("Midsommar", { year: 2019, genres: [G.horror, G.drama], directors: [P.aster], keywords: [K.folkHorror, K.grief], votes: [7.1, 6000] });
film("Get Out", { year: 2017, genres: [G.horror, G.thriller, G.mystery], directors: [P.peele], cast: [P.kaluuya], keywords: [K.socialSatire], votes: [7.6, 17000] });
film("Doctor Sleep", { year: 2019, genres: [G.horror, G.fantasy], directors: [P.flanagan], keywords: [K.possession], votes: [7.1, 5000] });
film("The Thing", { year: 1982, genres: [G.horror, G.scifi, G.mystery], directors: [P.carpenter], keywords: [K.isolation], votes: [8.1, 7000] });
film("Halloween", { year: 1978, genres: [G.horror, G.thriller], directors: [P.carpenter], keywords: [K.slasher], votes: [7.5, 5000] });
film("Us", { year: 2019, genres: [G.horror, G.thriller, G.mystery], directors: [P.peele], keywords: [K.socialSatire, K.family], votes: [6.9, 10000] });
film("The Witch", { year: 2015, genres: [G.horror, G.fantasy, G.mystery], directors: [P.eggers], keywords: [K.folkHorror, K.family, K.occult], votes: [6.8, 5000] });
film("Oculus", { year: 2013, genres: [G.horror], directors: [P.flanagan], keywords: [K.family, K.possession], votes: [6.4, 2500] });
film("The Fog", { year: 1980, genres: [G.horror, G.fantasy], directors: [P.carpenter], keywords: [K.isolation], votes: [6.6, 1200] });
film("Talk to Me", { year: 2023, genres: [G.horror, G.thriller], directors: [person("Danny Philippou")], keywords: [K.grief, K.possession], votes: [7.1, 2500] });

// Cinéma d'auteur
film("In the Mood for Love", { year: 2000, genres: [G.drama, G.romance], directors: [P.wong], cast: [P.leung], keywords: [K.hongKong, K.unrequitedLove, K.loneliness], votes: [8.1, 3000] });
film("Chungking Express", { year: 1994, genres: [G.drama, G.romance, G.comedy], directors: [P.wong], cast: [P.leung], keywords: [K.hongKong, K.loneliness], votes: [7.9, 1500] });
film("Portrait of a Lady on Fire", { year: 2019, genres: [G.drama, G.romance, G.history], directors: [P.sciamma], keywords: [K.unrequitedLove], votes: [8.1, 3000] });
film("Shoplifters", { year: 2018, genres: [G.drama, G.crime], directors: [P.koreeda], keywords: [K.family, K.childhood], votes: [7.9, 2500] });
film("Aftersun", { year: 2022, genres: [G.drama], directors: [P.wells], keywords: [K.grief, K.childhood, K.family], votes: [7.7, 1500] });
film("Happy Together", { year: 1997, genres: [G.drama, G.romance], directors: [P.wong], cast: [P.leung], keywords: [K.loneliness, K.unrequitedLove], votes: [7.7, 700] });
film("Fallen Angels", { year: 1995, genres: [G.drama, G.romance, G.crime], directors: [P.wong], keywords: [K.hongKong, K.loneliness], votes: [7.6, 600] });
film("2046", { year: 2004, genres: [G.drama, G.romance, G.scifi], directors: [P.wong], cast: [P.leung], keywords: [K.hongKong, K.unrequitedLove], votes: [7.4, 900] });
film("As Tears Go By", { year: 1988, genres: [G.drama, G.crime, G.romance], directors: [P.wong], keywords: [K.hongKong], votes: [6.9, 300] });
film("Petite Maman", { year: 2021, genres: [G.drama, G.fantasy], directors: [P.sciamma], keywords: [K.childhood, K.grief, K.family], votes: [7.4, 500] });
film("Still Walking", { year: 2008, genres: [G.drama], directors: [P.koreeda], keywords: [K.family, K.grief], votes: [7.8, 400] });
film("Past Lives", { year: 2023, genres: [G.drama, G.romance], directors: [P.song], keywords: [K.unrequitedLove, K.childhood], votes: [7.8, 1500] });

// Science-fiction
film("Inception", { year: 2010, genres: [G.action, G.scifi, G.thriller], directors: [P.nolan], cast: [P.caine], keywords: [K.heist], votes: [8.4, 36000] });
film("Interstellar", { year: 2014, genres: [G.scifi, G.drama], directors: [P.nolan], cast: [P.caine], keywords: [K.space, K.timeTravel, K.family], votes: [8.4, 35000] });
film("The Prestige", { year: 2006, genres: [G.drama, G.mystery, G.thriller], directors: [P.nolan], cast: [P.caine], votes: [8.2, 16000] });
film("Arrival", { year: 2016, genres: [G.drama, G.scifi, G.mystery], directors: [P.villeneuve], keywords: [K.timeTravel, K.grief], votes: [7.6, 18000] });
film("Blade Runner 2049", { year: 2017, genres: [G.scifi, G.drama], directors: [P.villeneuve], keywords: [K.dystopia], votes: [7.6, 13000] });
film("Tenet", { year: 2020, genres: [G.action, G.thriller, G.scifi], directors: [P.nolan], cast: [P.caine], keywords: [K.timeTravel, K.heist], votes: [7.2, 10000] });
film("Oppenheimer", { year: 2023, genres: [G.drama, G.history], directors: [P.nolan], votes: [8.1, 9000] });
film("Memento", { year: 2000, genres: [G.mystery, G.thriller], directors: [P.nolan], votes: [8.2, 10000] });
film("Dune", { year: 2021, genres: [G.scifi, G.action], directors: [P.villeneuve], keywords: [K.dystopia], votes: [7.8, 12000] });
film("Solaris", { year: 1972, genres: [G.scifi, G.drama, G.mystery], directors: [P.tarkovsky], keywords: [K.space, K.grief], votes: [7.7, 1100] });
film("Primer", { year: 2004, genres: [G.scifi, G.thriller], directors: [P.carruth], keywords: [K.timeTravel], votes: [6.8, 1400] });

// Grand public
film("The Godfather", { year: 1972, genres: [G.drama, G.crime], directors: [P.coppola], keywords: [K.mafia, K.family], votes: [8.7, 20000] });
film("Crazy Rich Asians", { year: 2018, genres: [G.comedy, G.romance], directors: [P.romcomDirector], keywords: [K.wedding], votes: [6.7, 3000] });
film("The Proposal", { year: 2009, genres: [G.comedy, G.romance], directors: [P.romcomDirector], keywords: [K.wedding], votes: [6.9, 6000] });
film("Love Actually", { year: 2003, genres: [G.comedy, G.romance], directors: [person("Richard Curtis")], keywords: [K.wedding], votes: [7.0, 6000] });
film("The Notebook", { year: 2004, genres: [G.romance, G.drama], directors: [person("Nick Cassavetes")], keywords: [K.unrequitedLove], votes: [7.9, 11000] });
film("Notting Hill", { year: 1999, genres: [G.romance, G.comedy], directors: [P.romcomDirector], cast: [P.roberts], keywords: [K.wedding], votes: [7.0, 5000] });
film("The Holiday", { year: 2006, genres: [G.comedy, G.romance], directors: [person("Nancy Meyers")], votes: [7.0, 4000] });
film("27 Dresses", { year: 2008, genres: [G.comedy, G.romance], directors: [person("Anne Fletcher")], keywords: [K.wedding, K.newYork], votes: [6.4, 3000] });
film("Mamma Mia!", { year: 2008, genres: [G.comedy, G.romance, G.music], directors: [person("Phyllida Lloyd")], keywords: [K.wedding], votes: [6.9, 5000] });
film("Bridesmaids", { year: 2011, genres: [G.comedy], directors: [person("Paul Feig")], keywords: [K.wedding], votes: [6.4, 4000] });
film("Furious 7", { year: 2015, genres: [G.action, G.thriller, G.crime], directors: [P.actionDirector], cast: [P.diesel], keywords: [K.carChase, K.heist], votes: [7.2, 10000] });
film("Fast X", { year: 2023, genres: [G.action, G.crime, G.thriller], directors: [P.actionDirector], cast: [P.diesel], keywords: [K.carChase], votes: [7.0, 4000] });
film("Transformers", { year: 2007, genres: [G.action, G.scifi], directors: [person("Michael Bay")], votes: [6.8, 11000] });
film("Transformers: Age of Extinction", { year: 2014, genres: [G.action, G.scifi], directors: [person("Michael Bay")], votes: [5.9, 8000] });
film("The Expendables", { year: 2010, genres: [G.action, G.thriller], directors: [person("Sylvester Stallone")], votes: [6.2, 7000] });
film("Moonfall", { year: 2022, genres: [G.scifi, G.action], directors: [person("Roland Emmerich")], keywords: [K.space], votes: [5.8, 2500] });
film("Toy Story", { year: 1995, genres: [G.animation, G.comedy], directors: [person("John Lasseter")], keywords: [K.childhood], votes: [8.0, 18000] });
film("Parasite", { year: 2019, genres: [G.comedy, G.thriller, G.drama], directors: [person("Bong Joon-ho")], keywords: [K.socialSatire, K.family], votes: [8.5, 18000] });

export type Watched = { title: string; rating: number | null; liked?: boolean };

export type PoolEntry = {
  title: string;
  /** Films vus d'où vient le candidat (TMDB /recommendations) : alimentent le soutien et l'explication. */
  from?: string[];
  inWatchlist?: boolean;
};

export type Persona = {
  name: string;
  library: Watched[];
  pool: PoolEntry[];
  /** Candidats qu'un humain mettrait en tête pour ce profil. */
  good: string[];
  /** Candidats qui ne devraient jamais figurer dans le top 5. */
  bad: string[];
  /** Paires [a, b] : a doit être classé avant b. */
  above?: [string, string][];
  /** Films aimés que l'explication d'un candidat doit citer. */
  because?: Record<string, string[]>;
  /** Étiquettes que l'explication d'un candidat doit contenir. */
  tags?: Record<string, string[]>;
  /**
   * Défauts connus du moteur : ces vérifications doivent échouer (it.fails). Quand le moteur
   * est corrigé, elles repassent au vert… et font échouer l'évaluation : retirer alors l'entrée.
   */
  knownIssues?: { check: "precision" | "bad"; why: string }[];
};

export const PERSONAS: Persona[] = [
  {
    name: "Fan d'horreur",
    library: [
      { title: "Hereditary", rating: 5, liked: true },
      { title: "Midsommar", rating: 4.5 },
      { title: "Get Out", rating: 4.5, liked: true },
      { title: "Doctor Sleep", rating: 4 },
      { title: "The Thing", rating: 5 },
      { title: "Halloween", rating: 4 },
      { title: "Crazy Rich Asians", rating: 2 },
      { title: "The Proposal", rating: 1.5 },
    ],
    pool: [
      { title: "Us", from: ["Get Out"] },
      { title: "The Witch", from: ["Hereditary", "Midsommar"] },
      { title: "Oculus", from: ["Doctor Sleep"] },
      { title: "The Fog", from: ["The Thing"] },
      { title: "Talk to Me" },
      { title: "Interstellar" },
      { title: "Parasite" },
      { title: "Notting Hill" },
      { title: "Mamma Mia!" },
      { title: "Bridesmaids" },
    ],
    good: ["Us", "The Witch", "Oculus", "The Fog", "Talk to Me"],
    bad: ["Notting Hill", "Mamma Mia!", "Bridesmaids"],
    // Un film d'horreur inédit bat un chef-d'œuvre hors de ses goûts.
    above: [["Talk to Me", "Interstellar"]],
    because: { Us: ["Get Out"], "The Witch": ["Hereditary"] },
  },
  {
    name: "Cinéma d'auteur",
    library: [
      { title: "In the Mood for Love", rating: 5, liked: true },
      { title: "Chungking Express", rating: 4.5 },
      { title: "Portrait of a Lady on Fire", rating: 5, liked: true },
      { title: "Shoplifters", rating: 4.5 },
      { title: "Aftersun", rating: 5 },
      { title: "Furious 7", rating: 1.5 },
      { title: "Transformers", rating: 1 },
    ],
    pool: [
      { title: "Happy Together", from: ["In the Mood for Love"] },
      { title: "Fallen Angels", from: ["Chungking Express"] },
      { title: "2046", from: ["In the Mood for Love"] },
      { title: "As Tears Go By" },
      { title: "Petite Maman", from: ["Portrait of a Lady on Fire"] },
      { title: "Still Walking", from: ["Shoplifters"] },
      { title: "Past Lives" },
      { title: "Dune" },
      { title: "Fast X" },
      { title: "Transformers: Age of Extinction" },
      { title: "The Expendables" },
    ],
    good: ["Happy Together", "Fallen Angels", "2046", "Petite Maman", "Still Walking", "Past Lives"],
    bad: ["Fast X", "Transformers: Age of Extinction", "The Expendables"],
    above: [["Past Lives", "Dune"]],
    because: { "Petite Maman": ["Portrait of a Lady on Fire"] },
  },
  {
    name: "Fan de Nolan, allergique aux comédies romantiques",
    library: [
      { title: "Inception", rating: 5 },
      { title: "Interstellar", rating: 5, liked: true },
      { title: "The Prestige", rating: 4.5 },
      { title: "Arrival", rating: 4.5, liked: true },
      { title: "Blade Runner 2049", rating: 4 },
      { title: "Love Actually", rating: 1 },
      { title: "The Notebook", rating: 1.5 },
    ],
    pool: [
      { title: "Tenet", from: ["Inception"] },
      { title: "Oppenheimer", from: ["Interstellar"] },
      { title: "Memento", from: ["The Prestige"] },
      { title: "Dune", from: ["Blade Runner 2049"] },
      { title: "Solaris", inWatchlist: true },
      { title: "Primer" },
      { title: "Moonfall" },
      { title: "The Holiday" },
      { title: "27 Dresses" },
      { title: "Notting Hill" },
    ],
    good: ["Tenet", "Oppenheimer", "Memento", "Dune", "Solaris"],
    bad: ["The Holiday", "27 Dresses", "Notting Hill"],
    above: [["Primer", "Moonfall"]],
    tags: { Dune: ["Réalisé par Denis Villeneuve"], Solaris: ["Dans ta watchlist"] },
  },
  {
    name: "Démarrage à froid (films vus sans note)",
    library: [
      { title: "Toy Story", rating: null },
      { title: "Inception", rating: null },
      { title: "Crazy Rich Asians", rating: null },
    ],
    pool: [
      { title: "The Godfather" },
      { title: "Parasite" },
      { title: "Interstellar" },
      { title: "Memento" },
      { title: "In the Mood for Love" },
      { title: "Moonfall" },
      { title: "Transformers: Age of Extinction" },
      { title: "27 Dresses" },
    ],
    // Sans goûts marqués, la qualité doit primer.
    good: ["The Godfather", "Parasite", "Interstellar", "Memento", "In the Mood for Love"],
    bad: ["Moonfall", "Transformers: Age of Extinction"],
    above: [
      ["The Godfather", "Moonfall"],
      ["The Godfather", "Transformers: Age of Extinction"],
    ],
  },
];
