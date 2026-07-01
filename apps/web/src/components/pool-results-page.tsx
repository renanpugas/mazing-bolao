import { useEffect, useRef, useState } from "react";
import { BarChart3, RefreshCw, X } from "lucide-react";

import { ComparisonModal, QuestionComparisonModal } from "@/components/participant-page";
import { usePoolQuestionComparisonQuery } from "@/hooks/use-pool-questions-api";
import { PageHeader, PageShell } from "@/components/page-shell";
import { MatchTime } from "@/components/match-time";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TeamFlag } from "@/components/team-flag";
import { usePredictionMatchComparisonQuery } from "@/hooks/use-predictions-api";
import { usePoolScoringParticipantPredictionsQuery, usePoolScoringRankingHistoryQuery, usePoolScoringRankingQuery } from "@/hooks/use-pool-scoring-api";
import { usePoolsListQuery } from "@/hooks/use-pools-api";
import { useSessionQuery } from "@/hooks/use-session-api";
import { getMatchTeamDisplayName } from "@/lib/match-team-display";
import { formatTeamNamePtBr } from "@/lib/team-names";
import { getStoredTheme, isTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const stageLabels: Record<string, string> = {
  group: "Fase de grupos",
  r32: "16 Avos",
  round_of_32: "16 Avos",
  r16: "Oitavas",
  round_of_16: "Oitavas",
  qf: "Quartas",
  quarter_final: "Quartas",
  sf: "Seminal",
  semi_final: "Seminal",
  third: "Terceiro Lugar",
  third_place: "Terceiro Lugar",
  final: "Final",
};
const allowedGroupFilters: string[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

function formatOdd(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : value.toFixed(2);
}

function getStageLabel(stage: string | null) {
  if (!stage) return "Fase";
  return stageLabels[stage] ?? stage;
}

function parseDateKey(dateKey: string) {
  const [yearPart = "1970", monthPart = "1", dayPart = "1"] = dateKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  return new Date(year, month - 1, day);
}

function formatHistoryDay(dateKey: string) {
  return parseDateKey(dateKey).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatHistoryYAxisValue(value: number) {
  return String(Math.round(value));
}

const historySeriesColors = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#4f46e5",
  "#65a30d",
  "#ea580c",
  "#0f766e",
  "#9333ea",
];

const rankingAnnouncementImages = [
  { src: "/deploy-sexta.png", alt: "Anúncio deploy sexta" },
  { src: "/mazing-bet.png", alt: "Anúncio Mazing Bet" },
  { src: "/mazing-custom.png", alt: "Anúncio Mazing Custom" },
  { src: "/mazing-escalada.png", alt: "Anúncio Mazing Escalada" },
  { src: "/mazing-usa.png", alt: "Anúncio Mazing USA" },
  { src: "/mazing-dev-tv.png", alt: "Anúncio Mazing Dev TV" },
  { src: "/copa-nargas-01.png", alt: "Anúncio Copa Nargas 01" },
  { src: "/copa-nargas-02.png", alt: "Anúncio Copa Nargas 02" },
  { src: "/copa-nargas-03.png", alt: "Anúncio Copa Nargas 03" },
  { src: "/copa-nargas-04.png", alt: "Anúncio Copa Nargas 04" },
];

const dictadorAnnouncementImages = [
  { src: "/dictador.png", alt: "Anúncio Dictador" },
];

type RankingAnnouncementImage = (typeof rankingAnnouncementImages)[number] | (typeof dictadorAnnouncementImages)[number];

function getRandomAnnouncementImage(currentImage: RankingAnnouncementImage | null, theme: Theme) {
  const images = theme === "dictador" ? dictadorAnnouncementImages : rankingAnnouncementImages;
  if (images.length <= 1) return images[0] ?? null;

  const availableImages = images.filter((image) => image.src !== currentImage?.src);
  const randomIndex = Math.floor(Math.random() * availableImages.length);
  return availableImages[randomIndex] ?? images[0] ?? null;
}

function playDictadorAnthem() {
  const audio = new Audio("/kylian-mbappe-dictador-anthem.mp3");
  audio.currentTime = 0;
  void audio.play().catch(() => undefined);
}

function TeamNameWithFlag({ emoji, name }: { emoji: string | null | undefined; name: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <TeamFlag emoji={emoji} name={name} />
      <span className="truncate">{formatTeamNamePtBr(name)}</span>
    </span>
  );
}

function RankingHistoryChart({
  history,
}: {
  history: {
    days: string[];
    series: Array<{ userId: string; name: string; email: string; values: number[]; totalPoints: number }>;
  };
}) {
  const [hoveredSeriesUserId, setHoveredSeriesUserId] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ userId: string; day: string; value: number } | null>(null);

  if (!history.days.length) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Ainda não há pontos distribuídos em dias diferentes para montar a evolução.
      </div>
    );
  }

  const chartWidth = 960;
  const chartHeight = 360;
  const padding = { top: 20, right: 20, bottom: 64, left: 48 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;
  const seriesWithColors = history.series.map((entry, index) => ({
    ...entry,
    color: historySeriesColors[index % historySeriesColors.length],
  }));
  const hoveredSeries = seriesWithColors.find((entry) => entry.userId === hoveredSeriesUserId) ?? null;
  const hoveredPointSeries = hoveredPoint ? seriesWithColors.find((entry) => entry.userId === hoveredPoint.userId) ?? null : null;
  const maxPoints = Math.max(1, ...seriesWithColors.flatMap((entry) => entry.values));
  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount }, (_, index) => (
    Math.round((maxPoints * (yTickCount - 1 - index)) / (yTickCount - 1))
  ));
  const xStep = history.days.length > 1 ? plotWidth / (history.days.length - 1) : 0;
  const yFor = (value: number) => padding.top + plotHeight - (value / maxPoints) * plotHeight;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-background/60 p-3">
        <div className="mb-3 flex min-h-6 items-center justify-end">
          {hoveredPoint && hoveredPointSeries ? (
            <Badge variant="secondary" className="gap-2 px-3 py-1">
              <span className="size-2 rounded-full" style={{ backgroundColor: hoveredPointSeries.color }} />
              <span>{hoveredPointSeries.name}</span>
              <span className="text-muted-foreground">{hoveredPoint.value} pts em {formatHistoryDay(hoveredPoint.day)}</span>
            </Badge>
          ) : hoveredSeries ? (
            <Badge variant="secondary" className="gap-2 px-3 py-1">
              <span className="size-2 rounded-full" style={{ backgroundColor: hoveredSeries.color }} />
              <span>{hoveredSeries.name}</span>
            </Badge>
          ) : null}
        </div>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-auto w-full">
          {yTicks.map((tick) => {
            const y = yFor(tick);
            return (
              <g key={tick}>
                <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="currentColor" strokeOpacity="0.12" />
                <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="12" fill="currentColor" opacity="0.7">
                  {formatHistoryYAxisValue(tick)}
                </text>
              </g>
            );
          })}

          {history.days.map((day, index) => {
            const x = history.days.length === 1 ? padding.left + plotWidth / 2 : padding.left + xStep * index;
            return (
              <text
                key={day}
                x={x}
                y={chartHeight - 14}
                textAnchor="end"
                fontSize="11"
                fill="currentColor"
                opacity="0.7"
                transform={`rotate(-35 ${x} ${chartHeight - 14})`}
              >
                {formatHistoryDay(day)}
              </text>
            );
          })}

          {seriesWithColors.map((entry) => {
            const points = entry.values.map((value, index) => {
              const x = history.days.length === 1 ? padding.left + plotWidth / 2 : padding.left + xStep * index;
              return `${x},${yFor(value)}`;
            }).join(" ");

            const isHovered = hoveredSeriesUserId === entry.userId;

            return (
              <g key={entry.userId}>
                <polyline
                  fill="none"
                  stroke={entry.color}
                  strokeWidth={isHovered ? "4" : "3"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={points}
                  opacity={hoveredSeriesUserId && !isHovered ? 0.35 : 1}
                />
                <polyline
                  fill="none"
                  stroke="transparent"
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={points}
                  onMouseEnter={() => setHoveredSeriesUserId(entry.userId)}
                  onMouseLeave={() => {
                    setHoveredSeriesUserId((current) => current === entry.userId ? null : current);
                    setHoveredPoint((current) => current?.userId === entry.userId ? null : current);
                  }}
                  onFocus={() => setHoveredSeriesUserId(entry.userId)}
                  onBlur={() => {
                    setHoveredSeriesUserId((current) => current === entry.userId ? null : current);
                    setHoveredPoint((current) => current?.userId === entry.userId ? null : current);
                  }}
                  tabIndex={0}
                >
                  <title>{entry.name}</title>
                </polyline>
                {entry.values.map((value, index) => {
                  const x = history.days.length === 1 ? padding.left + plotWidth / 2 : padding.left + xStep * index;
                  const y = yFor(value);
                  const isPointHovered = hoveredPoint?.userId === entry.userId && hoveredPoint.day === history.days[index];

                  return (
                    <circle
                      key={`${entry.userId}-${history.days[index]}`}
                      cx={x}
                      cy={y}
                      r={isPointHovered || (isHovered && index === entry.values.length - 1) ? "5" : "4"}
                      fill={entry.color}
                      stroke="white"
                      strokeWidth="1.5"
                      opacity={hoveredSeriesUserId && !isHovered ? 0.35 : 1}
                      onMouseEnter={() => {
                        setHoveredSeriesUserId(entry.userId);
                        setHoveredPoint({ userId: entry.userId, day: history.days[index] ?? "", value });
                      }}
                      onMouseLeave={() => {
                        setHoveredPoint((current) => current?.userId === entry.userId && current.day === history.days[index] ? null : current);
                      }}
                    >
                      <title>{`${entry.name}: ${value} pts em ${formatHistoryDay(history.days[index] ?? "")}`}</title>
                    </circle>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap gap-2">
        {seriesWithColors.map((entry) => (
          <Badge key={entry.userId} variant="outline" className="gap-2 px-3 py-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span>{entry.name}</span>
            <span className="text-muted-foreground">{entry.totalPoints} pts</span>
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function PoolResultsPage({ initialPoolId = null }: { initialPoolId?: string | null }) {
  const poolsQuery = usePoolsListQuery();
  const sessionQuery = useSessionQuery();
  const pools = poolsQuery.data ?? [];
  const playedLastPlaceAudioPoolsRef = useRef(new Set<string>());
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(initialPoolId);
  const [selectedParticipantUserId, setSelectedParticipantUserId] = useState<string | null>(null);
  const [selectedDetailView, setSelectedDetailView] = useState<"matches" | "questions">("matches");
  const [selectedRankingView, setSelectedRankingView] = useState<"table" | "chart">("table");
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>("all");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("all");
  const [selectedComparisonMatchId, setSelectedComparisonMatchId] = useState<string | null>(null);
  const [selectedComparisonQuestionId, setSelectedComparisonQuestionId] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<Theme>(getStoredTheme);
  const [selectedAnnouncementImage, setSelectedAnnouncementImage] = useState<RankingAnnouncementImage | null>(null);
  const [announcementClosed, setAnnouncementClosed] = useState(false);
  const rankingQuery = usePoolScoringRankingQuery(selectedPoolId);
  const rankingHistoryQuery = usePoolScoringRankingHistoryQuery(selectedPoolId);
  const participantPredictionsQuery = usePoolScoringParticipantPredictionsQuery(selectedPoolId, selectedParticipantUserId);
  const comparisonQuery = usePredictionMatchComparisonQuery(selectedPoolId, selectedComparisonMatchId);
  const questionComparisonQuery = usePoolQuestionComparisonQuery(selectedPoolId, selectedComparisonQuestionId);
  const selectedPool = pools.find((pool) => pool.id === selectedPoolId);
  const ranking = rankingQuery.data ?? [];
  const participantPredictions = participantPredictionsQuery.data;
  const currentUserId = sessionQuery.data?.user?.id;
  const availableStages = Array.from(new Set((participantPredictions?.matches ?? []).map((item) => item.stage).filter((stage): stage is string => Boolean(stage))));
  const availableGroups = allowedGroupFilters.filter((groupName) =>
    (participantPredictions?.matches ?? []).some((item) => item.groupName === groupName),
  );
  const filteredMatches = (participantPredictions?.matches ?? []).filter((item) => {
    if (selectedStageFilter !== "all" && item.stage !== selectedStageFilter) return false;
    if (selectedGroupFilter !== "all" && item.groupName !== selectedGroupFilter) return false;
    return true;
  });

  useEffect(() => {
    setSelectedAnnouncementImage(getRandomAnnouncementImage(null, currentTheme));
    setAnnouncementClosed(false);
  }, [currentTheme]);

  useEffect(() => {
    const updateTheme = (event: Event) => {
      const nextTheme = event instanceof CustomEvent ? event.detail : getStoredTheme();
      if (isTheme(nextTheme)) setCurrentTheme(nextTheme);
    };

    window.addEventListener("mazing-theme-change", updateTheme);
    window.addEventListener("storage", updateTheme);

    return () => {
      window.removeEventListener("mazing-theme-change", updateTheme);
      window.removeEventListener("storage", updateTheme);
    };
  }, []);

  useEffect(() => {
    if (initialPoolId && initialPoolId !== selectedPoolId) {
      setSelectedPoolId(initialPoolId);
      setSelectedParticipantUserId(null);
      setSelectedStageFilter("all");
      setSelectedGroupFilter("all");
      return;
    }

    if (!selectedPoolId && pools[0]) setSelectedPoolId(pools[0].id);
  }, [initialPoolId, selectedPoolId, pools]);

  useEffect(() => {
    if (!ranking.length || selectedParticipantUserId) return;

    const currentUserRanking = ranking.find((entry) => entry.userId === currentUserId);
    setSelectedParticipantUserId(currentUserRanking?.userId ?? ranking[0]?.userId ?? null);
  }, [currentUserId, ranking, selectedParticipantUserId]);

  useEffect(() => {
    if (!selectedParticipantUserId || ranking.some((entry) => entry.userId === selectedParticipantUserId)) return;

    const currentUserRanking = ranking.find((entry) => entry.userId === currentUserId);
    setSelectedParticipantUserId(currentUserRanking?.userId ?? ranking[0]?.userId ?? null);
  }, [currentUserId, ranking, selectedParticipantUserId]);

  useEffect(() => {
    if (selectedStageFilter !== "all" && !availableStages.includes(selectedStageFilter)) {
      setSelectedStageFilter("all");
    }
  }, [availableStages, selectedStageFilter]);

  useEffect(() => {
    if (selectedGroupFilter !== "all" && !availableGroups.includes(selectedGroupFilter)) {
      setSelectedGroupFilter("all");
    }
  }, [availableGroups, selectedGroupFilter]);

  useEffect(() => {
    if (!selectedPoolId || !currentUserId || !ranking.length) return;

    const lastEntry = ranking[ranking.length - 1];
    const isCurrentUserLast = lastEntry?.userId === currentUserId;
    if (!isCurrentUserLast || playedLastPlaceAudioPoolsRef.current.has(selectedPoolId)) return;

    const playAudio = () => {
      if (document.visibilityState !== "visible") return;
      if (playedLastPlaceAudioPoolsRef.current.has(selectedPoolId)) return;

      playedLastPlaceAudioPoolsRef.current.add(selectedPoolId);
      const audio = new Audio("/nao-sobrou-nada.mp3");
      audio.currentTime = 0;
      void audio.play().catch(() => {
        playedLastPlaceAudioPoolsRef.current.delete(selectedPoolId);
      });
    };

    playAudio();
    document.addEventListener("visibilitychange", playAudio);

    return () => {
      document.removeEventListener("visibilitychange", playAudio);
    };
  }, [currentUserId, ranking, selectedPoolId]);

  return (
    <PageShell className="space-y-6" wide>
      <PageHeader title="Ranking" description="Veja a classificação do bolão com pontuação calculada pelas regras configuradas." />

      {selectedAnnouncementImage && !announcementClosed ? (
        <Card className="overflow-hidden border-primary/20 bg-card/90 shadow-sm">
          <CardContent className="relative p-0">
            <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 rounded-full px-3 shadow-sm"
                onClick={() => {
                  setSelectedAnnouncementImage((currentImage) => getRandomAnnouncementImage(currentImage, currentTheme));
                  setAnnouncementClosed(false);
                }}
                aria-label="Trocar anúncio"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 w-8 rounded-full p-0 shadow-sm"
                onClick={() => setAnnouncementClosed(true)}
                aria-label="Fechar anúncio"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <button
              type="button"
              className="block w-full"
              onClick={currentTheme === "dictador" ? playDictadorAnthem : undefined}
              disabled={currentTheme !== "dictador"}
              aria-label={currentTheme === "dictador" ? "Tocar música tema do Dictador" : undefined}
            >
              <img
                src={selectedAnnouncementImage.src}
                alt={selectedAnnouncementImage.alt}
                className={cn(
                  "block max-h-[420px] w-full bg-muted/30 object-contain",
                  currentTheme === "dictador" && "cursor-pointer",
                )}
              />
            </button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader><CardTitle>Selecione o bolão</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {pools.map((pool) => (
            <Button
              key={pool.id}
              variant={pool.id === selectedPoolId ? "default" : "soft"}
              onClick={() => {
                setSelectedPoolId(pool.id);
                setSelectedParticipantUserId(null);
                setSelectedRankingView("table");
              }}
            >
              {pool.name}
            </Button>
          ))}
        </CardContent>
      </Card>

      {poolsQuery.status === "pending" || rankingQuery.status === "pending" ? <Alert variant="info"><AlertTitle>Carregando ranking</AlertTitle><AlertDescription>Buscando participantes, palpites, perguntas e resultados.</AlertDescription></Alert> : null}
      {rankingQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar ranking</AlertTitle><AlertDescription>{rankingQuery.error?.message || "Não foi possível carregar o ranking."}</AlertDescription></Alert> : null}
      {rankingHistoryQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar evolução</AlertTitle><AlertDescription>{rankingHistoryQuery.error?.message || "Não foi possível carregar a evolução diária."}</AlertDescription></Alert> : null}
      {participantPredictionsQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar palpites</AlertTitle><AlertDescription>{participantPredictionsQuery.error?.message || "Não foi possível carregar os palpites do participante."}</AlertDescription></Alert> : null}
      {poolsQuery.status === "success" && !pools.length ? <Alert variant="warning"><AlertTitle>Nenhum bolão encontrado</AlertTitle><AlertDescription>Crie ou entre em um bolão para ver o ranking.</AlertDescription></Alert> : null}

      {selectedPool ? (
        <>
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-2">
                  <CardTitle>{selectedPool.name}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={selectedRankingView === "table" ? "default" : "soft"}
                      size="sm"
                      onClick={() => setSelectedRankingView("table")}
                    >
                      Ranking
                    </Button>
                    <Button
                      variant={selectedRankingView === "chart" ? "default" : "soft"}
                      size="sm"
                      onClick={() => setSelectedRankingView("chart")}
                    >
                      Evolução diária
                    </Button>
                  </div>
                </div>
                <Badge>Líder: {ranking[0]?.name ?? "-"}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {selectedRankingView === "table" ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Posição</TableHead>
                        <TableHead>Participante</TableHead>
                        <TableHead>Pontos</TableHead>
                        <TableHead>Bônus odds</TableHead>
                        <TableHead>Bônus Brasil</TableHead>
                        <TableHead>Placares exatos</TableHead>
                        <TableHead>Resultados corretos</TableHead>
                        <TableHead>Perguntas corretas</TableHead>
                        <TableHead>Pontos perguntas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ranking.map((entry, index) => {
                        const selected = entry.userId === selectedParticipantUserId;

                        return (
                          <TableRow
                            key={entry.userId}
                            aria-selected={selected}
                            className={cn("cursor-pointer", selected && "bg-primary/10 hover:bg-primary/15")}
                            tabIndex={0}
                            onClick={() => setSelectedParticipantUserId(entry.userId)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setSelectedParticipantUserId(entry.userId);
                              }
                            }}
                          >
                            <TableCell>{index + 1}º</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{entry.name}</p>
                                <p className="text-xs text-muted-foreground">{entry.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">{entry.points}</TableCell>
                            <TableCell>
                              {entry.oddBonuses > 0 ? (
                                <div>
                                  <p className="font-medium">{entry.oddBonusPoints} pts</p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {entry.brazilBonusPoints > 0 ? (
                                <div>
                                  <p className="font-medium">{entry.brazilBonusPoints} pts</p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </TableCell>
                            <TableCell>{entry.exactScores}</TableCell>
                            <TableCell>{entry.correctOutcomes}</TableCell>
                            <TableCell>{entry.correctQuestions}</TableCell>
                            <TableCell>{entry.questionPoints}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {rankingQuery.status === "success" && !ranking.length ? <p className="py-6 text-sm text-muted-foreground">Nenhum participante encontrado neste bolão.</p> : null}
                </>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">Gráfico acumulado por dia, somando pontos de jogos finalizados e perguntas corrigidas.</p>
                    {rankingHistoryQuery.status === "pending" ? <Badge variant="secondary">Carregando gráfico</Badge> : null}
                  </div>
                  {rankingHistoryQuery.data ? <RankingHistoryChart history={rankingHistoryQuery.data} /> : null}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader><CardTitle>Selecione o participante</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {ranking.map((entry) => (
                <Button
                  key={entry.userId}
                  variant={entry.userId === selectedParticipantUserId ? "default" : "soft"}
                  onClick={() => setSelectedParticipantUserId(entry.userId)}
                >
                  {entry.name}
                </Button>
              ))}
              {rankingQuery.status === "success" && !ranking.length ? <p className="text-sm text-muted-foreground">Nenhum participante encontrado neste bolão.</p> : null}
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>Palpites de {participantPredictions?.participant.name ?? "participante"}</CardTitle>
                {participantPredictions?.participant.isCurrentUser ? <Badge variant="secondary">Você</Badge> : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {participantPredictionsQuery.status === "pending" ? <p className="py-6 text-sm text-muted-foreground">Carregando palpites do participante.</p> : null}
              {participantPredictions && (participantPredictions.matches.length || participantPredictions.questions.length) ? (
                <>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Ver tabela de</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={selectedDetailView === "matches" ? "default" : "soft"}
                          size="sm"
                          onClick={() => setSelectedDetailView("matches")}
                        >
                          Palpites
                        </Button>
                        <Button
                          variant={selectedDetailView === "questions" ? "default" : "soft"}
                          size="sm"
                          onClick={() => setSelectedDetailView("questions")}
                        >
                          Perguntas
                        </Button>
                      </div>
                    </div>

                    {selectedDetailView === "matches" ? (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Filtrar por fase</p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant={selectedStageFilter === "all" ? "default" : "soft"}
                              size="sm"
                              onClick={() => {
                                setSelectedStageFilter("all");
                                setSelectedGroupFilter("all");
                              }}
                            >
                              Todas
                            </Button>
                            {availableStages.map((stage) => (
                              <Button
                                key={stage}
                                variant={selectedStageFilter === stage ? "default" : "soft"}
                                size="sm"
                                onClick={() => {
                                  setSelectedStageFilter(stage);
                                  if (stage !== "group") setSelectedGroupFilter("all");
                                }}
                              >
                                {getStageLabel(stage)}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {availableGroups.length ? (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Ou por grupo</p>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant={selectedGroupFilter === "all" ? "default" : "soft"}
                                size="sm"
                                onClick={() => setSelectedGroupFilter("all")}
                              >
                                Todos
                              </Button>
                              {availableGroups.map((groupName) => (
                                <Button
                                  key={groupName}
                                  variant={selectedGroupFilter === groupName ? "default" : "soft"}
                                  size="sm"
                                  onClick={() => {
                                    setSelectedGroupFilter(groupName);
                                    setSelectedStageFilter("group");
                                  }}
                                >
                                  Grupo {groupName}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {selectedDetailView === "matches" ? (
                    participantPredictions.matches.length ? (
                      <>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Partida</TableHead>
                              <TableHead>Data</TableHead>
                              <TableHead>Palpite</TableHead>
                              <TableHead>Placar oficial</TableHead>
                              <TableHead>Pontos</TableHead>
                              <TableHead>Acerto</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredMatches.map((item) => {
                              const homeTeam = getMatchTeamDisplayName({
                                teamName: item.homeTeam,
                                teamLabel: item.homeTeamLabel,
                                teamExternalId: item.homeTeamExternalId,
                              });
                              const awayTeam = getMatchTeamDisplayName({
                                teamName: item.awayTeam,
                                teamLabel: item.awayTeamLabel,
                                teamExternalId: item.awayTeamExternalId,
                              });
                              const resultLabel = item.resultType === "exact" ? "placar exato" : item.resultType === "outcome" ? "resultado" : "sem pontos";
                              const resultVariant = item.resultType === "exact" ? "success" : item.resultType === "outcome" ? "warning" : "outline";
                              const detailLabel = item.groupName ? `Grupo ${item.groupName}` : getStageLabel(item.stage);

                              return (
                                <TableRow key={item.matchId}>
                                  <TableCell>
                                    <div>
                                      <p className="flex flex-wrap items-center gap-1.5 font-medium">
                                        <TeamNameWithFlag emoji={item.homeTeamEmoji} name={homeTeam} />
                                        <span className="text-muted-foreground">x</span>
                                        <TeamNameWithFlag emoji={item.awayTeamEmoji} name={awayTeam} />
                                        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setSelectedComparisonMatchId(item.matchId)}>
                                          <BarChart3 className="size-3" /> Comparar
                                        </Button>
                                      </p>
                                      <p className="text-xs text-muted-foreground">{detailLabel} · {item.finished ? "Encerrada" : "Pendente"}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell><MatchTime startsAt={item.startsAt} startsAtTimeZone={item.startsAtTimeZone} /></TableCell>
                                  <TableCell>
                                    {item.showPrediction ? (
                                      item.hasPrediction ? <span className="font-semibold">{item.homeGoals} x {item.awayGoals}</span> : <span className="text-muted-foreground">Sem palpite</span>
                                    ) : (
                                      <span className="text-muted-foreground">Palpite oculto até a partida encerrar</span>
                                    )}
                                  </TableCell>
                                  <TableCell>{item.homeScore !== null && item.awayScore !== null ? <span className="font-semibold">{item.homeScore} x {item.awayScore}</span> : <span className="text-muted-foreground">-</span>}</TableCell>
                                  <TableCell className="font-semibold">
                                    <div>
                                      <p>{item.points}</p>
                                      {item.brazilBonusApplied ? (
                                        <p className="text-xs font-medium text-sky-700">
                                          Bônus Brasil: {item.brazilBonusMultiplier}x
                                        </p>
                                      ) : null}
                                      {item.oddBonusApplied ? (
                                        <p className="text-xs font-medium text-emerald-700">
                                          Bônus odd: +{item.oddBonusPoints} pts ({item.oddBonusPercent}% sobre odd {formatOdd(item.oddUsed)})
                                        </p>
                                      ) : null}
                                    </div>
                                  </TableCell>
                                  <TableCell><Badge variant={resultVariant}>{resultLabel}</Badge></TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>

                        {!filteredMatches.length ? <p className="py-2 text-sm text-muted-foreground">Nenhuma partida encontrada com esse filtro.</p> : null}
                      </>
                    ) : (
                      <p className="py-2 text-sm text-muted-foreground">Nenhuma partida encontrada neste bolão.</p>
                    )
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium">Perguntas respondidas</p>
                        <p className="text-sm text-muted-foreground">Resumo simples das respostas e da pontuação de cada pergunta.</p>
                      </div>

                      {participantPredictions?.questions.length ? (
                        <div className="flex flex-wrap gap-2">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Pergunta</TableHead>
                                <TableHead>Resposta</TableHead>
                                <TableHead>Pontuação</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {participantPredictions.questions.map((item) => (
                                <TableRow key={item.questionId}>
                                  <TableCell>
                                    <p className="flex flex-wrap items-center gap-2 font-medium">
                                      <span>{item.question}</span>
                                      <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setSelectedComparisonQuestionId(item.questionId)}>
                                        <BarChart3 className="size-3" /> Comparar
                                      </Button>
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {item.isCorrect === null ? "Pendente" : "Finalizada"}
                                    </p>
                                  </TableCell>
                                  <TableCell>
                                    {item.showAnswer ? item.answer?.trim() ? item.answer : <span className="text-muted-foreground">Sem resposta</span> : <span className="text-muted-foreground">Resposta oculta até o prazo encerrar</span>}
                                  </TableCell>
                                  <TableCell className="font-semibold">
                                    {item.isCorrect === null ? <span className="text-muted-foreground">Aguardando correção</span> : item.points}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhuma pergunta cadastrada neste bolão.</p>
                      )}
                    </div>
                  )}
                </>
              ) : null}
              {participantPredictionsQuery.status === "success" && !participantPredictions?.matches.length && !participantPredictions?.questions.length ? <p className="py-6 text-sm text-muted-foreground">Nenhuma partida ou pergunta encontrada neste bolão.</p> : null}
            </CardContent>
          </Card>
        </>
      ) : null}
      {selectedComparisonMatchId ? <ComparisonModal data={comparisonQuery.data} status={comparisonQuery.status} error={comparisonQuery.error} onClose={() => setSelectedComparisonMatchId(null)} /> : null}
      {selectedComparisonQuestionId ? <QuestionComparisonModal data={questionComparisonQuery.data} status={questionComparisonQuery.status} error={questionComparisonQuery.error} onClose={() => setSelectedComparisonQuestionId(null)} /> : null}
    </PageShell>
  );
}
