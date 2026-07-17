import { Badge } from "@/components/ui/badge";

type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

const TONES: Record<string, Tone> = {
  // Project
  DRAFT: "neutral",
  PLANNED: "info",
  ACTIVE: "success",
  ON_HOLD: "warning",
  DELAYED: "danger",
  COMPLETED: "primary",
  CANCELLED: "neutral",
  // Reports / generic workflow
  SUBMITTED: "info",
  APPROVED: "success",
  REJECTED: "danger",
  CHANGES_REQUESTED: "warning",
  // Attendance
  PRESENT: "success",
  ABSENT: "danger",
  LATE: "warning",
  HALF_DAY: "info",
  OVERTIME: "primary",
  // Issues
  OPEN: "warning",
  IN_PROGRESS: "info",
  RESOLVED: "success",
  CLOSED: "neutral",
  CRITICAL: "danger",
  HIGH: "warning",
  MEDIUM: "info",
  LOW: "neutral",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <Badge tone={TONES[status] ?? "neutral"}>{label}</Badge>;
}
