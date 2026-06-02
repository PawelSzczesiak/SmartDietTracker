export type DashboardFlashVariant = "error" | "success" | "warning";

export interface DashboardFlashMessage {
  message: string;
  prefix?: string;
  variant: DashboardFlashVariant;
}

export function getDashboardFlashMessages(searchParams: URLSearchParams, dashboardError: string | null) {
  const profileError = searchParams.get("profileError");
  const mealError = searchParams.get("mealError");
  const mealWarning = searchParams.get("mealWarning");
  const profileSuccess = searchParams.get("profileSuccess");
  const mealSuccess = searchParams.get("mealSuccess");

  const messages: DashboardFlashMessage[] = [];

  if (dashboardError) {
    messages.push({ message: dashboardError, variant: "error" });
  }
  if (profileError) {
    messages.push({ message: profileError, prefix: "Profile", variant: "error" });
  }
  if (mealError) {
    messages.push({ message: mealError, prefix: "Meals", variant: "error" });
  }
  if (mealWarning) {
    messages.push({ message: mealWarning, prefix: "Meals", variant: "warning" });
  }
  if (profileSuccess) {
    messages.push({ message: profileSuccess, variant: "success" });
  }
  if (mealSuccess) {
    messages.push({ message: mealSuccess, variant: "success" });
  }

  return messages;
}
