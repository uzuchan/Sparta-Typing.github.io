import Papa from "papaparse";

export type ParsedCsvWord = {
  question: string;
  answerRaw: string;
};

export function parseWordCsv(csvText: string): ParsedCsvWord[] {
  const result = Papa.parse<string[]>(csvText.trim(), {
    skipEmptyLines: true,
  });

  if (result.errors.length > 0) {
    const message = result.errors.map((error) => error.message).join("\n");
    throw new Error(message);
  }

  return result.data
    .map((row) => ({
      question: String(row[0] ?? "").trim(),
      answerRaw: String(row[1] ?? "").trim(),
    }))
    .filter((row) => row.question.length > 0 && row.answerRaw.length > 0);
}
