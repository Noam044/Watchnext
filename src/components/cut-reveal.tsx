/**
 * Titre révélé lettre par lettre par un balayage vertical, comme les lettres
 * qu'on pose une à une sur la marquise d'un cinéma. CSS seul : aucun JavaScript.
 */
export function CutReveal({
  text,
  delay = 0,
  stagger = 22,
  className = "",
}: {
  text: string;
  /** Délai avant la première lettre, en ms. */
  delay?: number;
  /** Écart entre deux lettres, en ms. */
  stagger?: number;
  className?: string;
}) {
  let index = 0;
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      {text.split(/(\s+)/).map((word, w) =>
        /^\s+$/.test(word) ? (
          " "
        ) : (
          <span key={w} className="inline-block whitespace-nowrap" aria-hidden>
            {[...word].map((char) => (
              <span
                key={index}
                className="inline-block animate-cut-in"
                style={{ animationDelay: `${delay + index++ * stagger}ms` }}
              >
                {char}
              </span>
            ))}
          </span>
        ),
      )}
    </span>
  );
}
