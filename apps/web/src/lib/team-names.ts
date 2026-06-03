const TEAM_NAMES_PT_BR: Record<string, string> = {
  Algeria: "Argélia",
  Argentina: "Argentina",
  Australia: "Austrália",
  Austria: "Áustria",
  Belgium: "Bélgica",
  "Bosnia and Herzegovina": "Bósnia e Herzegovina",
  Brazil: "Brasil",
  Canada: "Canadá",
  "Cape Verde": "Cabo Verde",
  Colombia: "Colômbia",
  Croatia: "Croácia",
  Curacao: "Curaçao",
  "Curaçao": "Curaçao",
  "Czech Republic": "República Tcheca",
  Czechia: "Tchequia",
  "Democratic Republic of the Congo": "República Democrática do Congo",
  Ecuador: "Equador",
  Egypt: "Egito",
  England: "Inglaterra",
  France: "França",
  Germany: "Alemanha",
  Ghana: "Gana",
  Haiti: "Haiti",
  Iran: "Irã",
  Iraq: "Iraque",
  "Ivory Coast": "Costa do Marfim",
  Japan: "Japão",
  Jordan: "Jordânia",
  Mexico: "México",
  Morocco: "Marrocos",
  Netherlands: "Países Baixos",
  "New Zealand": "Nova Zelândia",
  Norway: "Noruega",
  Panama: "Panamá",
  Paraguay: "Paraguai",
  Portugal: "Portugal",
  Qatar: "Catar",
  "Saudi Arabia": "Arábia Saudita",
  Scotland: "Escócia",
  Senegal: "Senegal",
  "South Africa": "África do Sul",
  "South Korea": "Coreia do Sul",
  Spain: "Espanha",
  Sweden: "Suécia",
  Switzerland: "Suíça",
  Tunisia: "Tunísia",
  Turkey: "Turquia",
  Turkiye: "Turquia",
  "United States": "Estados Unidos",
  Uruguay: "Uruguai",
  Uzbekistan: "Uzbequistão",
};

export function formatTeamNamePtBr(name: string) {
  const translatedName = TEAM_NAMES_PT_BR[name];
  if (translatedName) return translatedName;

  const winnerMatch = /^Winner Match (\d+)$/.exec(name);
  if (winnerMatch) return `Vencedor do jogo ${winnerMatch[1]}`;

  const loserMatch = /^Loser Match (\d+)$/.exec(name);
  if (loserMatch) return `Perdedor do jogo ${loserMatch[1]}`;

  return name;
}
