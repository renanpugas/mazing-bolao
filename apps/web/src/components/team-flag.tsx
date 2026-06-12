function normalizeTeamName(name: string | null | undefined) {
  return (name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getFlagVariant(name: string | null | undefined) {
  const normalizedName = normalizeTeamName(name);
  if (normalizedName === "england" || normalizedName === "inglaterra") return "england";
  if (normalizedName === "scotland" || normalizedName === "escocia") return "scotland";
  return null;
}

const ENGLAND_FLAG = "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}";
const SCOTLAND_FLAG = "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}";

export function TeamFlag({ emoji, name, className = "text-sm leading-none" }: { emoji: string | null | undefined; name?: string | null; className?: string }) {
  const variant = getFlagVariant(name);

  if (variant === "england") return <span className={className} aria-hidden="true">{ENGLAND_FLAG}</span>;
  if (variant === "scotland") return <span className={className} aria-hidden="true">{SCOTLAND_FLAG}</span>;

  return emoji ? <span className={className} aria-hidden="true">{emoji}</span> : null;
}
