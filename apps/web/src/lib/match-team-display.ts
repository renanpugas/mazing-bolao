type MatchTeamDisplayInput = {
  teamName?: string | null;
  teamLabel?: string | null;
  teamExternalId?: string | null;
};

export function getMatchTeamDisplayName({ teamName, teamLabel, teamExternalId }: MatchTeamDisplayInput) {
  if (teamExternalId && teamName) return teamName;
  return teamLabel ?? teamName ?? "";
}
