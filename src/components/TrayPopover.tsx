import { Button, Chip, Tabs } from "@heroui/react";
import { CommentsList } from "./CommentsList";
import { MrList } from "./MrList";
import type { AppSnapshot } from "../lib/types";

export type ActiveTab = "comments" | "mrs";

interface TrayPopoverProps {
  snapshot: AppSnapshot;
  loading: boolean;
  activeTab: ActiveTab;
  isRefreshing: boolean;
  onTabChange: (tab: ActiveTab) => void;
  onOpenSettings: () => void;
  onManualRefresh: () => void;
  onRetry: () => void;
  onOpenComment: (url: string) => void;
  onOpenMr: (url: string) => void;
}

export function TrayPopover({
  snapshot,
  loading,
  activeTab,
  isRefreshing,
  onTabChange,
  onOpenSettings,
  onManualRefresh,
  onRetry,
  onOpenComment,
  onOpenMr,
}: TrayPopoverProps) {
  return (
    <main className="menubar-root">
      <header className="menubar-header">
        <div>
          <p className="text-sm font-semibold">GitLab Companion</p>
          <p className="text-xs text-muted">
            {snapshot.lastSyncAt
              ? `Dernière sync: ${new Date(snapshot.lastSyncAt).toLocaleTimeString()}`
              : "Pas encore synchronisé"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onPress={onManualRefresh}>
            {isRefreshing ? "Refresh..." : "Refresh"}
          </Button>
          <Button size="sm" variant="secondary" onPress={onOpenSettings}>
            Réglages
          </Button>
        </div>
      </header>

      <Tabs
        className="w-full"
        selectedKey={activeTab}
        onSelectionChange={(key) => onTabChange(String(key) as ActiveTab)}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="GitLab sections" className="w-full">
            <Tabs.Tab id="comments" className="relative">
              Commentaires
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="mrs">
              MRs
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <div className="tab-meta">
          <Chip color="accent" size="sm" variant="soft">
            {snapshot.unreadCount} non lu{snapshot.unreadCount > 1 ? "s" : ""}
          </Chip>
        </div>

        <Tabs.Panel id="comments" className="pt-2">
          <CommentsList
            comments={snapshot.comments}
            error={snapshot.error}
            loading={loading}
            onOpen={onOpenComment}
            onRetry={onRetry}
          />
        </Tabs.Panel>

        <Tabs.Panel id="mrs" className="pt-2">
          <MrList
            error={snapshot.error}
            loading={loading}
            mrs={snapshot.mrs}
            onOpen={onOpenMr}
            onRetry={onRetry}
          />
        </Tabs.Panel>
      </Tabs>
    </main>
  );
}
