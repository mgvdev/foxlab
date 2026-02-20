import { Button, Card, Popover, Skeleton } from "@heroui/react";
import { useState, type CSSProperties } from "react";
import type { TicketItem } from "../lib/types";

interface TicketListProps {
  tickets: TicketItem[];
  loading: boolean;
  error: string | null;
  onOpen: (url: string) => void;
  onRetry: () => void;
  onAddSpentTime: (ticket: TicketItem, duration: string) => Promise<void>;
  onSetEstimate: (ticket: TicketItem, duration: string) => Promise<void>;
}

function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - Date.parse(isoDate);
  const minutes = Math.max(1, Math.floor(diffMs / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function scopedLabelColors(scope: string): CSSProperties {
  const hue = hashString(scope) % 360;

  return {
    ["--scope-bg" as string]: `hsl(${hue} 22% 28%)`,
    ["--scope-fg" as string]: `hsl(${hue} 24% 86%)`,
    ["--value-bg" as string]: `hsl(${hue} 84% 48%)`,
    ["--value-fg" as string]: "hsl(0 0% 100%)",
  };
}

function renderLabel(label: string, key: string) {
  const separatorIndex = label.indexOf("::");
  const isScoped = separatorIndex > 0;

  if (!isScoped) {
    return (
      <span key={key} className="linear-label">
        {label}
      </span>
    );
  }

  const scope = label.slice(0, separatorIndex);
  const value = label.slice(separatorIndex + 2);

  return (
    <span key={key} className="scoped-label" style={scopedLabelColors(scope)}>
      <span className="scoped-label-scope">{scope}</span>
      <span className="scoped-label-value">{value}</span>
    </span>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-12 rounded-lg" />
      <Skeleton className="h-12 rounded-lg" />
      <Skeleton className="h-12 rounded-lg" />
      <Skeleton className="h-12 rounded-lg" />
    </div>
  );
}

export function TicketList({
  tickets,
  loading,
  error,
  onOpen,
  onRetry,
  onAddSpentTime,
  onSetEstimate,
}: TicketListProps) {
  const [expandedTicketIds, setExpandedTicketIds] = useState<Set<number>>(new Set());
  const [timeInputByTicket, setTimeInputByTicket] = useState<Record<number, string>>({});
  const [estimateInputByTicket, setEstimateInputByTicket] = useState<Record<number, string>>({});
  const [timeSubmittingByTicket, setTimeSubmittingByTicket] = useState<Record<number, boolean>>({});
  const [estimateSubmittingByTicket, setEstimateSubmittingByTicket] = useState<Record<number, boolean>>({});
  const [timeErrorByTicket, setTimeErrorByTicket] = useState<Record<number, string | null>>({});

  const handleAddSpentTime = async (ticket: TicketItem, duration: string) => {
    const normalized = duration.trim();
    if (!normalized) {
      setTimeErrorByTicket((current) => ({
        ...current,
        [ticket.id]: "Durée requise (ex: 30m, 1h 20m).",
      }));
      return;
    }

    if (timeSubmittingByTicket[ticket.id]) {
      return;
    }

    setTimeSubmittingByTicket((current) => ({ ...current, [ticket.id]: true }));
    setTimeErrorByTicket((current) => ({ ...current, [ticket.id]: null }));

    try {
      await onAddSpentTime(ticket, normalized);
      setTimeInputByTicket((current) => ({ ...current, [ticket.id]: "" }));
    } catch (error) {
      setTimeErrorByTicket((current) => ({
        ...current,
        [ticket.id]: error instanceof Error ? error.message : "Impossible d'ajouter le temps",
      }));
    } finally {
      setTimeSubmittingByTicket((current) => ({ ...current, [ticket.id]: false }));
    }
  };

  const handleSetEstimate = async (ticket: TicketItem, duration: string) => {
    const normalized = duration.trim();
    if (!normalized) {
      setTimeErrorByTicket((current) => ({
        ...current,
        [ticket.id]: "Estimate requis (ex: 2h, 1d 2h).",
      }));
      return;
    }

    if (estimateSubmittingByTicket[ticket.id]) {
      return;
    }

    setEstimateSubmittingByTicket((current) => ({ ...current, [ticket.id]: true }));
    setTimeErrorByTicket((current) => ({ ...current, [ticket.id]: null }));

    try {
      await onSetEstimate(ticket, normalized);
      setEstimateInputByTicket((current) => ({ ...current, [ticket.id]: "" }));
    } catch (error) {
      setTimeErrorByTicket((current) => ({
        ...current,
        [ticket.id]: error instanceof Error ? error.message : "Impossible de modifier l'estimate",
      }));
    } finally {
      setEstimateSubmittingByTicket((current) => ({ ...current, [ticket.id]: false }));
    }
  };

  const progressColor = (ratio: number, isOverrun: boolean, hasEstimate: boolean): string => {
    if (!hasEstimate) {
      return "#7c8b9d";
    }

    if (isOverrun) {
      return "#d55d6f";
    }

    const safeRatio = Math.max(0, Math.min(1, ratio));
    const hue = 5 + safeRatio * 120;
    return `hsl(${hue} 70% 52%)`;
  };

  const toggleTicket = (ticketId: number) => {
    setExpandedTicketIds((current) => {
      const next = new Set(current);
      if (next.has(ticketId)) {
        next.delete(ticketId);
      } else {
        next.add(ticketId);
      }
      return next;
    });
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <Card>
        <Card.Content className="flex flex-col gap-2 p-3">
          <p className="text-sm text-danger">{error}</p>
          <Button size="sm" onPress={onRetry}>
            Retry
          </Button>
        </Card.Content>
      </Card>
    );
  }

  if (tickets.length === 0) {
    return (
      <Card>
        <Card.Content className="p-3 text-sm text-muted">Aucun ticket assigné.</Card.Content>
      </Card>
    );
  }

  return (
    <div className="linear-list">
      {tickets.map((ticket) => {
        const hasEstimate = ticket.timeEstimateSeconds > 0;
        const estimateLabel = hasEstimate ? ticket.humanTimeEstimate : "No estimate";
        const rawRatio = hasEstimate ? ticket.totalTimeSpentSeconds / ticket.timeEstimateSeconds : 0;
        const progressPercent = hasEstimate ? Math.min(100, rawRatio * 100) : 0;
        const isOverrun = hasEstimate && ticket.totalTimeSpentSeconds > ticket.timeEstimateSeconds;
        const isSubmittingTime = timeSubmittingByTicket[ticket.id] ?? false;
        const isSubmittingEstimate = estimateSubmittingByTicket[ticket.id] ?? false;
        const timeInput = timeInputByTicket[ticket.id] ?? "";
        const estimateInput = estimateInputByTicket[ticket.id] ?? "";
        const timeError = timeErrorByTicket[ticket.id];
        const fillColor = progressColor(rawRatio, isOverrun, hasEstimate);

        return (
          <div key={ticket.id} className="linear-item ticket-item-row">
            <div className="ticket-toggle-btn">
              <div className="linear-item-head">
                <button
                  className="ticket-title-btn"
                  title={`#${ticket.iid} · ${ticket.title}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpen(ticket.webUrl);
                  }}
                >
                  #{ticket.iid} · {ticket.title}
                </button>
                <button
                  className="ticket-expand-btn"
                  type="button"
                  onClick={() => toggleTicket(ticket.id)}
                >
                  <span className="linear-item-meta ticket-head-meta">
                    <span>{formatRelativeTime(ticket.updatedAt)}</span>
                    <span className={`mr-arrow ${expandedTicketIds.has(ticket.id) ? "is-open" : ""}`}>▾</span>
                  </span>
                </button>
              </div>
              <div className="linear-labels">
                {ticket.labels.length === 0 ? (
                  <span className="linear-label linear-label--empty">No label</span>
                ) : (
                  ticket.labels.map((label) => renderLabel(label, `${ticket.id}-${label}`))
                )}
              </div>
              <div className="mr-time-row">
                <div className="mr-time-meta">
                  <span>Spent {ticket.humanTotalTimeSpent || "0m"}</span>
                  <span>/</span>
                  <span>Est. {estimateLabel}</span>
                  {isOverrun && <span className="mr-time-overrun">Overrun</span>}
                </div>
                <div className={`mr-time-bar ${hasEstimate ? "" : "mr-time-no-estimate"}`}>
                  <div
                    className="mr-time-fill"
                    style={{
                      width: hasEstimate ? `${progressPercent}%` : "34%",
                      background: fillColor,
                    }}
                  />
                </div>
              </div>
            </div>
            {expandedTicketIds.has(ticket.id) && (
              <div className="ticket-accordion-panel">
                <div className="ticket-actions">
                  <button className="mr-open-btn" type="button" onClick={() => onOpen(ticket.webUrl)}>
                    Open
                  </button>
                  <Popover>
                    <Popover.Trigger aria-label={`Ajouter du temps sur ticket #${ticket.iid}`}>
                      <button className="mr-time-btn" type="button">
                        <svg className="mr-time-btn-icon" viewBox="0 0 20 20" aria-hidden="true">
                          <circle cx="9" cy="11" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M9 8.6v2.9l2 1.3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M14.7 3.8v4.2M12.6 5.9h4.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    </Popover.Trigger>
                    <Popover.Content className="mr-time-popover">
                      <Popover.Dialog className="mr-time-popover-fields">
                        <Popover.Heading className="mr-time-popover-title">
                          Time tracking
                        </Popover.Heading>
                        <div className="mr-time-quick-actions">
                          {["15m", "30m", "1h"].map((preset) => (
                            <button
                              key={`${ticket.id}-${preset}`}
                              className="mr-time-quick-btn"
                              disabled={isSubmittingTime || isSubmittingEstimate}
                              type="button"
                              onClick={() => void handleAddSpentTime(ticket, preset)}
                            >
                              +{preset}
                            </button>
                          ))}
                        </div>
                        <div className="mr-time-input-row">
                          <input
                            className="mr-time-input"
                            disabled={isSubmittingTime || isSubmittingEstimate}
                            placeholder="spent: ex 1h 20m"
                            type="text"
                            value={timeInput}
                            onChange={(event) => {
                              const value = event.currentTarget.value;
                              setTimeInputByTicket((current) => ({
                                ...current,
                                [ticket.id]: value,
                              }));
                            }}
                          />
                          <button
                            className="mr-time-submit-btn"
                            disabled={isSubmittingTime || isSubmittingEstimate}
                            type="button"
                            onClick={() => void handleAddSpentTime(ticket, timeInput)}
                          >
                            {isSubmittingTime ? "..." : "Add"}
                          </button>
                        </div>
                        <div className="mr-time-input-row">
                          <input
                            className="mr-time-input"
                            disabled={isSubmittingTime || isSubmittingEstimate}
                            placeholder="estimate: ex 2h"
                            type="text"
                            value={estimateInput}
                            onChange={(event) => {
                              const value = event.currentTarget.value;
                              setEstimateInputByTicket((current) => ({
                                ...current,
                                [ticket.id]: value,
                              }));
                            }}
                          />
                          <button
                            className="mr-time-submit-btn"
                            disabled={isSubmittingTime || isSubmittingEstimate}
                            type="button"
                            onClick={() => void handleSetEstimate(ticket, estimateInput)}
                          >
                            {isSubmittingEstimate ? "..." : "Set est."}
                          </button>
                        </div>
                        {timeError && <p className="mr-time-error">{timeError}</p>}
                      </Popover.Dialog>
                    </Popover.Content>
                  </Popover>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
