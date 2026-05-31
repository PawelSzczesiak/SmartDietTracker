export interface NutritionDayWindow {
  dateKey: string;
  endIso: string;
  startIso: string;
  timeZone: string;
}

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function getNutritionDayWindow(now = new Date()): NutritionDayWindow {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);

  end.setUTCDate(end.getUTCDate() + 1);

  return {
    dateKey: `${start.getUTCFullYear()}-${pad(start.getUTCMonth() + 1)}-${pad(start.getUTCDate())}`,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    timeZone,
  };
}
