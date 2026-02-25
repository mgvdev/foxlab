import type React from "react";
import type { TicketItem } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";

import { StatsTicketRow } from "./StatsTicketRow";

interface CycleStats {
  completedCycles: number;
  totalSeconds: number;
  inProgressSeconds: number;
}

interface TicketStatsListProps {
  tickets: TicketItem[];
  cycleStatsByTicket: Record<string, CycleStats>;
  cycleConfigured: boolean;
  focusedTicketKey: string | null;
  ticketRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  ticketKey: (ticket: TicketItem) => string;
  onOpen: (url: string) => void;
  formatDuration: (seconds: number) => string;
}

export function TicketStatsList({
  tickets,
  cycleStatsByTicket,
  cycleConfigured,
  focusedTicketKey,
  ticketRefs,
  ticketKey,
  onOpen,
  formatDuration,
}: TicketStatsListProps) {
  return (
    <section className="stats-ticket-list">
      <ScrollArea className="themed-scroll-area">
        {tickets.map((ticket) => {
          const key = ticketKey(ticket);

          return (
            <div
              key={key}
              ref={(node) => {
                ticketRefs.current[key] = node;
              }}
            >
              <StatsTicketRow
                cycleConfigured={cycleConfigured}
                cycleStats={cycleStatsByTicket[key]}
                formatDuration={formatDuration}
                isFocused={focusedTicketKey === key}
                ticket={ticket}
                onOpen={onOpen}
              />
            </div>
          );
        })}
      </ScrollArea>
    </section>
  );
}
