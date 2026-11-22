import { describe, expect, it } from "vitest";
import { calculateIncidentPriorityScore } from "./priority-scoring.js";

const day = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 0, 20, 12);

describe("calculateIncidentPriorityScore", () => {
  it("maps severity to the documented base score", () => {
    const createdAt = new Date(now);
    expect(calculateIncidentPriorityScore("low", 0, false, createdAt, now)).toBe(10);
    expect(calculateIncidentPriorityScore("medium", 0, false, createdAt, now)).toBe(25);
    expect(calculateIncidentPriorityScore("high", 0, false, createdAt, now)).toBe(45);
    expect(calculateIncidentPriorityScore("critical", 0, false, createdAt, now)).toBe(60);
  });

  it("adds bounded impact and safety-risk points", () => {
    expect(calculateIncidentPriorityScore("low", 9, true, new Date(now), now)).toBe(40);
    expect(calculateIncidentPriorityScore("low", 10_000_000, false, new Date(now), now)).toBe(30);
    expect(calculateIncidentPriorityScore("low", Number.MAX_SAFE_INTEGER, true, new Date(now), now)).toBe(50);
  });

  it("adds one point per full day and caps aging at ten points", () => {
    expect(calculateIncidentPriorityScore("low", 0, false, new Date(now - day + 1), now)).toBe(10);
    expect(calculateIncidentPriorityScore("low", 0, false, new Date(now - day), now)).toBe(11);
    expect(calculateIncidentPriorityScore("low", 0, false, new Date(now - 30 * day), now)).toBe(20);
  });

  it("does not award aging points for future incidents", () => {
    expect(calculateIncidentPriorityScore("medium", 0, false, new Date(now + day), now)).toBe(25);
  });

  it("always caps the final score at one hundred", () => {
    expect(calculateIncidentPriorityScore("critical", 10_000_000, true, new Date(now - 90 * day), now)).toBe(100);
  });

  it("handles invalid timestamps and non-finite impact values safely", () => {
    expect(calculateIncidentPriorityScore("high", Number.NaN, false, new Date(Number.NaN), now)).toBe(45);
  });
});
