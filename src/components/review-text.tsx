/** Critique Letterboxd ; celles qui divulguent l'intrigue restent masquées jusqu'au clic. */
export function ReviewText({ text, spoilers, className = "" }: { text: string; spoilers: boolean; className?: string }) {
  const body = (
    <div className={`space-y-3 text-sm leading-relaxed whitespace-pre-line text-screen/90 ${className}`}>{text}</div>
  );
  if (!spoilers) return body;
  return (
    <details className="group">
      <summary className="meta inline-flex cursor-pointer list-none items-center gap-2 rounded-full border border-bad/30 px-3 py-1 text-bad marker:hidden hover:bg-bad/10">
        Contient des spoilers · <span className="group-open:hidden">afficher</span>
        <span className="hidden group-open:inline">masquer</span>
      </summary>
      <div className="mt-3">{body}</div>
    </details>
  );
}
