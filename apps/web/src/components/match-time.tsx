import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const locale = "pt-BR";
const fallbackTimeZone = "UTC";
const hugoTimeZone = "Etc/GMT+6";

function getUserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || fallbackTimeZone;
}

function formatTimeZoneName(timeZone: string) {
  return timeZone.replaceAll("_", " ");
}

export function formatMatchDateTime(value: Date | string | number, timeZone = getUserTimeZone()) {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatMatchDate(value: Date | string | number, timeZone = getUserTimeZone()) {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function MatchTime({ startsAt, startsAtTimeZone }: { startsAt: Date | string | number; startsAtTimeZone?: string | null }) {
  const date = new Date(startsAt);
  const userTimeZone = getUserTimeZone();
  const matchTimeZone = startsAtTimeZone || fallbackTimeZone;
  const userValue = formatMatchDateTime(date, userTimeZone);
  const utcValue = formatMatchDateTime(date, fallbackTimeZone);
  const matchLocalValue = formatMatchDateTime(date, matchTimeZone);
  const hugoValue = formatMatchDateTime(date, hugoTimeZone);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="text-left underline decoration-dotted underline-offset-4 hover:text-foreground">
          {userValue}
        </button>
      </PopoverTrigger>
      <PopoverContent className="space-y-3 text-xs" align="end">
        <div>
          <p className="font-medium text-sm">Horário da partida</p>
          <p className="text-muted-foreground">Exibido na timezone do seu navegador.</p>
        </div>
        <dl className="space-y-2">
          <div>
            <dt className="font-medium">Seu horário ({formatTimeZoneName(userTimeZone)})</dt>
            <dd className="text-muted-foreground">{userValue}</dd>
          </div>
          <div>
            <dt className="font-medium">UTC</dt>
            <dd className="text-muted-foreground">{utcValue}</dd>
          </div>
          <div>
            <dt className="font-medium">Local do jogo ({formatTimeZoneName(matchTimeZone)})</dt>
            <dd className="text-muted-foreground">{matchLocalValue}</dd>
          </div>
          <div>
            <dt className="font-medium">Timezone Hugo (UTC-6 Mountain Time)</dt>
            <dd className="text-muted-foreground">{hugoValue}</dd>
          </div>
        </dl>
      </PopoverContent>
    </Popover>
  );
}
