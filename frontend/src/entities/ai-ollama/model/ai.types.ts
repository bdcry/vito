export type TGenerateDescriptionResponse = {
  response: string;
};

export type TGeneratePriceResponse = {
  response: string;
};

export type TGenerateAnalyzeResponse = {
  response: string;
};

export type TAdAnalyzeResult = {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
};
