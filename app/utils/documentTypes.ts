const DOCUMENT_TYPES = [
  "Evaluering",
  "Forhåndsutredning",
  "Instruks",
  "Kartlegging",
  "Kunnskapsoppsummering",
  "Konseptutvalgutredning (KVU/KS1/KS2)",
  "Melding til Stortinget",
  "Norges offentlige utredninger (NOU)",
  "Områdegjennomgang",
  "Proposisjon til Stortinget",
  "Retningslinjer",
  "Revisjonsberetning",
  "Riksrevisjonsrapport",
  "Statusrapport",
  "Strategi/plan",
  "Studie",
  "Tildelingsbrev",
  "Tilskuddsbrev",
  "Veileder",
  "Årsrapport"
] as const;

const DOCUMENT_TYPE_ALIASES = new Map<string, string>([
  ["evaluering", "Evaluering"],
  ["forhandsutredning", "Forhåndsutredning"],
  ["forhåndsutredning", "Forhåndsutredning"],
  ["instruks", "Instruks"],
  ["kartlegging", "Kartlegging"],
  ["kunnskapsoppsummering", "Kunnskapsoppsummering"],
  ["konseptutvalgutredning (kvu/ks1/ks2)", "Konseptutvalgutredning (KVU/KS1/KS2)"],
  ["konseptutvalg-utredning (kvu/ks1/ks2)", "Konseptutvalgutredning (KVU/KS1/KS2)"],
  ["melding til stortinget", "Melding til Stortinget"],
  ["norges offentlige utredninger (nou)", "Norges offentlige utredninger (NOU)"],
  ["nou", "Norges offentlige utredninger (NOU)"],
  ["områdegjennomgang", "Områdegjennomgang"],
  ["proposisjon til stortinget", "Proposisjon til Stortinget"],
  ["retningslinjer", "Retningslinjer"],
  ["revisjonsberetning", "Revisjonsberetning"],
  ["riksrevisjonsrapport", "Riksrevisjonsrapport"],
  ["riksrevisjons-rapport", "Riksrevisjonsrapport"],
  ["statusrapport", "Statusrapport"],
  ["strategi/plan", "Strategi/plan"],
  ["strategi", "Strategi/plan"],
  ["plan", "Strategi/plan"],
  ["studie", "Studie"],
  ["tildelingsbrev", "Tildelingsbrev"],
  ["tilskuddsbrev", "Tilskuddsbrev"],
  ["veileder", "Veileder"],
  ["årsrapport", "Årsrapport"],
  ["arsrapport", "Årsrapport"]
]);

function canonicalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "");
}

export function listDocumentTypes(): readonly string[] {
  return DOCUMENT_TYPES;
}

export function normalizeDocumentType(value: string): string | null {
  return DOCUMENT_TYPE_ALIASES.get(canonicalize(value)) ?? null;
}