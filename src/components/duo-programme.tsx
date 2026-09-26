"use client";

import Link from "next/link";
import { ViewTransition, useState, useTransition } from "react";
import { sendMessageAction } from "@/actions/messages";
import { AnimatedNumber } from "@/components/animated-number";
import { CheckIcon, InfoIcon, ScreenIcon, SendIcon } from "@/components/icons";
import { Poster } from "@/components/poster";
import { ProviderLogos } from "@/components/provider-logos";
import { ScopeScreen } from "@/components/scope-screen";
import { toast } from "@/components/toaster";
import { useI18n } from "@/i18n/client";
import type { Dictionary } from "@/i18n/dictionaries";
import { formatList } from "@/i18n/format";
import { onMyPlatforms, type ProviderInfo, type RegionOffers } from "@/lib/providers";

export type DuoItem = {
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  runtime: number | null;
  directors: string[];
  genres: string[];
  pct: number;
  mePct: number;
  friendPct: number;
  meBecause: string | null;
  friendBecause: string | null;
  inMyWatchlist: boolean;
  inFriendWatchlist: boolean;
  offers: RegionOffers | null;
};

type Friend = { id: string; name: string };

function because(it: DuoItem, d: Dictionary["duo"], name: string) {
  if (it.meBecause && it.friendBecause && it.meBecause !== it.friendBecause) {
    return d.bothLiked(it.meBecause, name, it.friendBecause);
  }
  if (it.meBecause) return d.meLiked(it.meBecause);
  if (it.friendBecause) return d.friendLiked(name, it.friendBecause);
  return d.closeToBoth;
}

function metaLine(it: DuoItem, t: Dictionary) {
  return [
    it.year,
    it.directors[0] && t.film.directedBy(it.directors[0]),
    it.runtime ? t.film.minutes(it.runtime) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Idées de films pour deux amis : un film à l'affiche sur son ticket « À deux »,
 * puis les autres idées. Chaque film peut être proposé à l'ami dans la messagerie.
 */
export function DuoProgramme({
  items,
  friend,
  catalog,
  ours,
}: {
  items: DuoItem[];
  friend: Friend;
  catalog: ProviderInfo[];
  /** Abonnements réunis des deux amis. */
  ours: number[];
}) {
  const { t } = useI18n();
  const d = t.duo;
  const [onOurs, setOnOurs] = useState(false);
  const [short, setShort] = useState(false);
  const [proposed, setProposed] = useState<Set<number>>(new Set());
  const [, startTransition] = useTransition();
  const providers = new Map(catalog.map((p) => [p.id, p]));

  const propose = (it: DuoItem) =>
    startTransition(async () => {
      const res = await sendMessageAction({ toUserId: friend.id, tmdbId: it.tmdbId, body: d.proposeBody });
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      setProposed((s) => new Set(s).add(it.tmdbId));
      toast(d.proposedToast(it.title, friend.name));
    });

  if (items.length === 0) {
    return <p className="card p-8 text-center text-sm text-dust-300">{d.empty}</p>;
  }

  const shown = items.filter(
    (it) => (!onOurs || onMyPlatforms(it.offers, ours)) && (!short || (it.runtime != null && it.runtime <= 120)),
  );
  const [feature, ...rest] = shown;
  const streams = (it: DuoItem) => (it.offers?.stream ?? []).flatMap((id) => providers.get(id) ?? []);
  const shared = { friend, proposed, propose, streams, ours };

  return (
    <div className="space-y-10">
      <div role="group" aria-label={d.filtersLabel} className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
        {ours.length > 0 && (
          <button
            type="button"
            onClick={() => setOnOurs((v) => !v)}
            aria-pressed={onOurs}
            className={onOurs ? "chip-active py-1.5" : "chip py-1.5"}
          >
            <ScreenIcon className="size-3.5" /> {d.onOurPlatforms}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShort((v) => !v)}
          aria-pressed={short}
          className={short ? "chip-active py-1.5" : "chip py-1.5"}
        >
          {d.underTwoHours}
        </button>
      </div>

      {!feature ? (
        <p className="card p-8 text-center text-sm text-dust-300">{d.noMatch}</p>
      ) : (
        <>
          <DuoFeature key={feature.tmdbId} it={feature} {...shared} />
          {rest.length > 0 && (
            <section aria-labelledby="autres-idees" className="space-y-6">
              <h2 id="autres-idees" className="marquee text-3xl sm:text-4xl">
                {d.others}
                <span className="text-dust-400"> · {rest.length}</span>
              </h2>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
                {rest.map((it) => (
                  <DuoCard key={it.tmdbId} it={it} {...shared} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

type Shared = {
  friend: Friend;
  proposed: Set<number>;
  propose: (it: DuoItem) => void;
  streams: (it: DuoItem) => ProviderInfo[];
  ours: number[];
};

function StreamLine({ it, streams, ours }: { it: DuoItem } & Pick<Shared, "streams" | "ours">) {
  const { t, locale } = useI18n();
  const list = streams(it);
  if (list.length === 0) return null;
  const onOurs = onMyPlatforms(it.offers, ours);
  const names = (onOurs ? list.filter((p) => ours.includes(p.id)) : list).slice(0, 2).map((p) => p.name);
  return (
    <p
      className={`mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm ${onOurs ? "text-screen" : "text-dust-300"}`}
    >
      <ProviderLogos providers={list} mine={ours} size={22} max={3} />
      <span>
        {onOurs ? t.duo.ourPlatforms(formatList(names, locale)) : t.film.streamingOn(formatList(names, locale))}
      </span>
    </p>
  );
}

function ProposeButton({
  it,
  friend,
  proposed,
  propose,
  compact = false,
}: { it: DuoItem; compact?: boolean } & Shared) {
  const d = useI18n().t.duo;
  const done = proposed.has(it.tmdbId);
  return (
    <button
      type="button"
      onClick={() => propose(it)}
      disabled={done}
      className={compact ? "btn-quiet gap-1.5 px-2 py-1.5 text-xs" : done ? "btn-ghost" : "btn-primary"}
    >
      {done ? <CheckIcon className="size-3.5" /> : <SendIcon className="size-3.5" />}
      {done ? d.proposed : compact ? d.proposeShort : d.propose(friend.name)}
    </button>
  );
}

/** Le film n°1 pour vous deux, sur l'écran avec son ticket « À deux ». */
function DuoFeature({ it, ...shared }: { it: DuoItem } & Shared) {
  const { t } = useI18n();
  const d = t.duo;
  return (
    <section aria-label={it.title} className="group/feature relative">
      <ViewTransition name={`screen-${it.tmdbId}`} share="morph" default="none">
        <ScopeScreen
          backdropPath={it.backdropPath}
          posterPath={it.posterPath}
          alt=""
          preload
          animate
          className="group/screen transition-shadow duration-500 hover:shadow-[0_0_0_1px_rgb(246_236_220/0.14),0_50px_160px_-30px_rgb(242_184_75/0.45)]"
          imageClassName="[transition:scale_6s_cubic-bezier(0.2,0.7,0.2,1),filter_0.7s_ease-out] group-hover/screen:scale-105 group-hover/screen:brightness-110"
        >
          <Link href={`/film/${it.tmdbId}`} tabIndex={-1} aria-hidden className="absolute inset-0" />
        </ScopeScreen>
      </ViewTransition>
      <div className="relative z-10 -mt-6 sm:mx-4 md:mx-8 md:-mt-20 lg:mx-12">
        <div className="drop-shadow-[0_24px_40px_rgb(0_0_0/0.65)]">
          <div className="ticket flex animate-rise [--ticket-cut:4.75rem] [--ticket-notch:9px] [animation-delay:250ms] sm:[--ticket-cut:8rem] sm:[--ticket-notch:12px]">
            <div className="ticket-stub gap-1 py-5 sm:py-6">
              <span className="font-mono text-[10px] leading-tight tracking-[0.04em] uppercase opacity-70 sm:text-[11px] sm:tracking-[0.12em]">
                {d.stubLabel}
              </span>
              <span className="font-display text-3xl leading-none font-extrabold tabular-nums sm:text-6xl">
                <AnimatedNumber value={it.pct} delay={500} />
                <span className="text-xl sm:text-3xl">%</span>
              </span>
              <span className="font-mono text-[10px] leading-tight opacity-70 sm:text-[11px]">{d.stubFor}</span>
            </div>
            <div className="min-w-0 flex-1 p-4 sm:p-7 lg:p-8">
              <h2 className="marquee text-4xl text-balance sm:text-6xl">
                <Link href={`/film/${it.tmdbId}`} className="hover:text-tungsten">
                  {it.title}
                </Link>
              </h2>
              <p className="meta mt-3">
                {metaLine(it, t)}
                {it.genres.length > 0 && (
                  <span className="hidden sm:inline"> · {it.genres.slice(0, 3).join(", ")}</span>
                )}
              </p>
              <p className="mt-3 max-w-2xl text-base leading-snug text-screen/90">
                {because(it, d, shared.friend.name)}
              </p>
              <p className="meta mt-2 text-tungsten">
                {d.split(it.mePct, shared.friend.name, it.friendPct)}
                {it.inFriendWatchlist && (
                  <span className="text-dust-300"> · {d.inFriendWatchlist(shared.friend.name)}</span>
                )}
                {it.inMyWatchlist && <span className="text-dust-300"> · {d.inMyWatchlist}</span>}
              </p>
              <StreamLine it={it} {...shared} />
              <div className="mt-5 hidden flex-wrap gap-2 sm:flex">
                <ProposeButton it={it} {...shared} />
                <Link href={`/film/${it.tmdbId}`} className="btn-ghost">
                  <InfoIcon /> {t.film.filmPage}
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 sm:hidden">
          <ProposeButton it={it} {...shared} />
          <Link href={`/film/${it.tmdbId}`} className="btn-ghost">
            <InfoIcon /> {t.film.filmPage}
          </Link>
        </div>
      </div>
    </section>
  );
}

function DuoCard({ it, ...shared }: { it: DuoItem } & Shared) {
  const { t } = useI18n();
  const d = t.duo;
  const list = shared.streams(it);
  return (
    <li className="group reveal flex flex-col">
      <Link
        href={`/film/${it.tmdbId}`}
        className="relative block rounded-[5px] transition duration-300 group-hover:-translate-y-1"
      >
        <Poster
          path={it.posterPath}
          title={it.title}
          className="shadow-lg shadow-black/50 ring-1 ring-white/5 transition group-hover:ring-screen/25"
        />
        <span className="absolute top-2 left-2 rounded-sm bg-velvet-950/90 px-1.5 py-0.5 font-mono text-[11px] font-bold text-tungsten">
          {it.pct} %
        </span>
      </Link>
      <div className="mt-3 flex flex-1 flex-col">
        <h3 className="leading-snug font-semibold">
          <Link href={`/film/${it.tmdbId}`} className="hover:text-tungsten">
            {it.title}
          </Link>
        </h3>
        <p className="meta mt-1">{metaLine(it, t)}</p>
        {list.length > 0 && <ProviderLogos providers={list} mine={shared.ours} size={20} max={3} className="mt-2" />}
        <p className="mt-2 line-clamp-3 text-sm leading-snug text-dust-300">{because(it, d, shared.friend.name)}</p>
        <p className="meta mt-1 text-[11px]">{d.split(it.mePct, shared.friend.name, it.friendPct)}</p>
        <div className="mt-auto -ml-2 pt-2">
          <ProposeButton it={it} compact {...shared} />
        </div>
      </div>
    </li>
  );
}
