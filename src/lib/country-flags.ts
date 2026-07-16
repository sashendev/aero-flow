// Minimal country name → ISO-3166 alpha-2 map for country code support
// commonly reports. Falls back to null (UI shows a generic globe icon).
const NAME_TO_CODE: Record<string, string> = {
  "United States": "US",
  "United Kingdom": "GB",
  Germany: "DE",
  France: "FR",
  Spain: "ES",
  Italy: "IT",
  Netherlands: "NL",
  Belgium: "BE",
  Switzerland: "CH",
  Austria: "AT",
  Ireland: "IE",
  Portugal: "PT",
  Sweden: "SE",
  Norway: "NO",
  Finland: "FI",
  Denmark: "DK",
  Iceland: "IS",
  Poland: "PL",
  "Czech Republic": "CZ",
  Czechia: "CZ",
  Hungary: "HU",
  Greece: "GR",
  Turkey: "TR",
  Türkiye: "TR",
  Russia: "RU",
  Ukraine: "UA",
  Canada: "CA",
  Mexico: "MX",
  Brazil: "BR",
  Argentina: "AR",
  Chile: "CL",
  Colombia: "CO",
  Peru: "PE",
  Venezuela: "VE",
  Australia: "AU",
  "New Zealand": "NZ",
  Japan: "JP",
  China: "CN",
  "South Korea": "KR",
  "Korea, Republic of": "KR",
  India: "IN",
  Indonesia: "ID",
  Malaysia: "MY",
  Singapore: "SG",
  Thailand: "TH",
  Philippines: "PH",
  Vietnam: "VN",
  "United Arab Emirates": "AE",
  "Saudi Arabia": "SA",
  Qatar: "QA",
  Israel: "IL",
  Egypt: "EG",
  "South Africa": "ZA",
  Morocco: "MA",
  Nigeria: "NG",
  Kenya: "KE",
  Ethiopia: "ET",
  Luxembourg: "LU",
};

export function countryCode(name: string | null | undefined): string | null {
  if (!name) return null;
  return NAME_TO_CODE[name] ?? null;
}

export function flagEmoji(name: string | null | undefined): string {
  const code = countryCode(name);
  if (!code) return "🌐";
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join("");
}
