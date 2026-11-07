const callingCodes = [
  "63",
  "1",
  "44",
  "61",
  "65",
  "91",
  "81",
  "82",
  "86",
  "852",
  "886",
  "60",
  "62",
  "66",
  "84",
  "971",
  "966",
  "974",
  "49",
  "33",
  "39",
  "34",
  "64",
];

export const callingCodeByCountry: Record<string, string> = {
  PH: "63",
  US: "1",
  CA: "1",
  GB: "44",
  AU: "61",
  SG: "65",
  IN: "91",
};

export function digitsOnly(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export function splitPhone(value: string, preferredCode = "63") {
  const digits = digitsOnly(value);
  if (!digits) return { code: preferredCode, number: "" };
  if (value.startsWith("+")) {
    if (!preferredCode) return { code: "", number: digits };
    const code = [preferredCode, ...callingCodes].find((code) => code && digits.startsWith(code));
    // Preserve unfamiliar saved international numbers; let the user specify their code.
    return code ? { code, number: digits.slice(code.length) } : { code: "", number: digits };
  }
  if (preferredCode === "63") {
    if (digits.startsWith("63") && digits.length === 12)
      return { code: "63", number: digits.slice(2) };
    return { code: "63", number: digits.replace(/^0/, "") };
  }
  return { code: preferredCode, number: digits };
}

export function formatNationalPhone(number: string, code: string) {
  if (code !== "63" && code !== "1") return number;
  return [number.slice(0, 3), number.slice(3, 6), number.slice(6)].filter(Boolean).join(" ");
}

export function phoneError(value: string, mobileOnly = false) {
  if (!value) return undefined;
  if (!/^\+[1-9][0-9]{6,14}$/.test(value)) return "Enter a country code and 7–15 digits in total.";
  if (value.startsWith("+63") && !/^\+63[1-9][0-9]{8,9}$/.test(value))
    return "Enter 9–10 digits after +63, without the leading 0.";
  if (mobileOnly && !/^\+639[0-9]{9}$/.test(value))
    return "Enter a Philippine mobile number: 917 123 4567.";
  return undefined;
}

export function normalizeEmail(value: string) {
  return value.replace(/\s/g, "").toLowerCase();
}
