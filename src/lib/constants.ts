export const CATEGORIES = ["CAR", "BUS", "COMMERCIAL"] as const;
export type Category = (typeof CATEGORIES)[number];

export const glassLabel = (key: string) => key;
