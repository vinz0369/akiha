export type ReminderEligibility = {
  enabled: boolean;
  currentMinutes: number;
  scheduledMinutes: number;
  hasCheckin: boolean;
  hasActiveSubscription: boolean;
  existingStatus: "pending" | "sent" | "skipped" | "failed" | null;
  attemptCount: number;
};

export function isSchedulerWindow(currentMinutes: number, scheduledMinutes: number): boolean {
  return currentMinutes >= scheduledMinutes && currentMinutes < scheduledMinutes + 15;
}

export function canReserveDailyReminder(input: ReminderEligibility): boolean {
  if (!input.enabled || input.hasCheckin || !input.hasActiveSubscription) return false;
  if (!isSchedulerWindow(input.currentMinutes, input.scheduledMinutes)) return false;
  if (input.existingStatus === null) return true;
  return input.existingStatus === "failed" && input.attemptCount < 3;
}
