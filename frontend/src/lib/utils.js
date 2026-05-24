import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Alias for legacy components using `cls`
export const cls = cn;

// Format ISO date to MMM DD, YYYY
export function fmtDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Relative time (e.g. "just now", "5m ago", "3h ago")
export function fmtRelative(dateString) {
  if (!dateString) return "";
  const diff = Date.now() - new Date(dateString).getTime();
  if (isNaN(diff)) return "";
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day}d ago`;
  return fmtDate(dateString);
}

// Status to color mapping for Kanban/Dashboard
export const statusColor = {
  "To Do":       "#6366f1",
  "In Progress": "#f59e0b",
  "In Review":   "#00d4ff",
  "Done":        "#10b981",
};
