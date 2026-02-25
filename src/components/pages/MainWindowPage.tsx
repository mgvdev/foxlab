import { TrayPopover, type ActiveTab } from "@/components/organisms/TrayPopover";
import type {
  AppSnapshot,
  MergeRequestCiStatus,
  MergeRequestDiscussionNote,
  MergeRequestItem,
  TicketItem,
} from "@/lib/types";

interface MainWindowPageProps {
  activeTab: ActiveTab;
  isRefreshing: boolean;
  loading: boolean;
  snapshot: AppSnapshot;
  mutedMrIids: number[];
  showCommentAvatars: boolean;
  onManualRefresh: () => void;
  onOpenComment: (url: string) => void;
  onOpenMr: (url: string) => void;
  onOpenTicket: (url: string) => void;
  onOpenTicketStats: (ticket: TicketItem) => void;
  onLoadMrComments: (mr: MergeRequestItem) => Promise<MergeRequestDiscussionNote[]>;
  onLoadMrCi: (mr: MergeRequestItem) => Promise<MergeRequestCiStatus>;
  onPlayCiJob: (projectId: number, jobId: number) => Promise<void>;
  onAddTicketSpentTime: (ticket: TicketItem, duration: string) => Promise<void>;
  onSetTicketEstimate: (ticket: TicketItem, duration: string) => Promise<void>;
  onToggleMuteMrIid: (iid: number) => void;
  onOpenSettings: () => void;
  onOpenStatsWindow: () => void;
  onRetry: () => void;
  onTabChange: (tab: ActiveTab) => void;
}

export function MainWindowPage(props: MainWindowPageProps) {
  return <TrayPopover {...props} />;
}
