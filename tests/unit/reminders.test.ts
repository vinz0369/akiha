import { describe, expect, it } from "vitest";

import { canReserveDailyReminder, isSchedulerWindow } from "@/lib/notifications/rules";

const eligible = {
  enabled: true,
  currentMinutes: 19 * 60,
  scheduledMinutes: 19 * 60,
  hasCheckin: false,
  hasActiveSubscription: true,
  existingStatus: null,
  attemptCount: 0,
} as const;

describe("reminder eligibility", () => {
  it("uses a 15-minute scheduler window", () => {
    expect(isSchedulerWindow(19 * 60, 19 * 60)).toBe(true);
    expect(isSchedulerWindow(19 * 60 + 14, 19 * 60)).toBe(true);
    expect(isSchedulerWindow(19 * 60 + 15, 19 * 60)).toBe(false);
  });

  it("does not send after check-in or without a subscription", () => {
    expect(canReserveDailyReminder({ ...eligible, hasCheckin: true })).toBe(false);
    expect(canReserveDailyReminder({ ...eligible, hasActiveSubscription: false })).toBe(false);
  });

  it("blocks duplicate pending/sent deliveries", () => {
    expect(canReserveDailyReminder({ ...eligible, existingStatus: "pending" })).toBe(false);
    expect(canReserveDailyReminder({ ...eligible, existingStatus: "sent" })).toBe(false);
  });

  it("allows only capped retries of failed deliveries", () => {
    expect(canReserveDailyReminder({ ...eligible, existingStatus: "failed", attemptCount: 2 })).toBe(true);
    expect(canReserveDailyReminder({ ...eligible, existingStatus: "failed", attemptCount: 3 })).toBe(false);
  });
});
