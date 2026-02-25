import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PollIntervalMinutes, Settings, ThemeMode } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SettingsFormProps {
  draft: Settings;
  isSaving: boolean;
  isTestingConnection: boolean;
  statusMessage: string | null;
  onClose: () => void;
  onChange: (next: Settings) => void;
  onTestConnection: () => void;
  onSave: () => void;
}

const INTERVAL_OPTIONS: PollIntervalMinutes[] = [1, 2, 3, 5];
const THEME_OPTIONS: ThemeMode[] = ["light", "dark"];
const AVATAR_OPTIONS = [true, false] as const;

function parseMutedIids(raw: string): number[] {
  return raw
    .split(",")
    .map((entry) => Number(entry.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
}

function OptionSegment<T extends string | number | boolean>({
  options,
  selected,
  getLabel,
  onSelect,
}: {
  options: readonly T[];
  selected: T;
  getLabel: (value: T) => string;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1 rounded-lg border border-zinc-800 bg-zinc-950/70 p-1">
      {options.map((option) => (
        <button
          key={String(option)}
          className={cn(
            "h-8 rounded-md border text-xs font-semibold transition",
            selected === option
              ? "border-zinc-600 bg-zinc-800 text-zinc-50"
              : "border-transparent bg-transparent text-zinc-400 hover:bg-zinc-900",
          )}
          type="button"
          onClick={() => onSelect(option)}
        >
          {getLabel(option)}
        </button>
      ))}
    </div>
  );
}

export function SettingsForm({
  draft,
  isSaving,
  isTestingConnection,
  statusMessage,
  onClose,
  onChange,
  onTestConnection,
  onSave,
}: SettingsFormProps) {
  return (
    <>
      <header className="window-head">
        <div>
          <h1 className="window-title">Réglages GitLab</h1>
          <p className="window-subtitle">Configuration de l’app, synchro et métriques.</p>
        </div>
        <Button size="sm" variant="secondary" onClick={onClose}>
          Fermer
        </Button>
      </header>

      <div className="window-form">
        <div className="space-y-2">
          <Label htmlFor="gitlab-base-url">GitLab base URL</Label>
          <Input
            id="gitlab-base-url"
            placeholder="https://gitlab.com"
            value={draft.gitlabBaseUrl}
            onChange={(event) => onChange({ ...draft, gitlabBaseUrl: event.currentTarget.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gitlab-pat">Personal Access Token</Label>
          <Input
            id="gitlab-pat"
            placeholder="glpat-..."
            type="password"
            value={draft.personalAccessToken}
            onChange={(event) =>
              onChange({ ...draft, personalAccessToken: event.currentTarget.value })
            }
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Intervalle de synchro (min)</p>
          <OptionSegment
            getLabel={(value) => String(value)}
            options={INTERVAL_OPTIONS}
            selected={draft.pollIntervalMinutes}
            onSelect={(value) => onChange({ ...draft, pollIntervalMinutes: value as PollIntervalMinutes })}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Thème</p>
          <OptionSegment
            getLabel={(value) => (value === "light" ? "Light" : "Dark")}
            options={THEME_OPTIONS}
            selected={draft.theme}
            onSelect={(value) => onChange({ ...draft, theme: value as ThemeMode })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="muted-mrs">MRs à atténuer (IID, séparés par virgule)</Label>
          <Input
            id="muted-mrs"
            placeholder="ex: 1234, 1402, 2201"
            value={draft.mutedMrIids.join(", ")}
            onChange={(event) =>
              onChange({
                ...draft,
                mutedMrIids: parseMutedIids(event.currentTarget.value),
              })
            }
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Afficher les avatars commentaires</p>
          <OptionSegment
            getLabel={(value) => (value ? "Oui" : "Non")}
            options={AVATAR_OPTIONS}
            selected={draft.showCommentAvatars}
            onSelect={(value) => onChange({ ...draft, showCommentAvatars: value as boolean })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cycle-start">Cycle label start</Label>
          <Input
            id="cycle-start"
            placeholder="ex: issue-workflow::in-development"
            value={draft.cycleStartLabel}
            onChange={(event) => onChange({ ...draft, cycleStartLabel: event.currentTarget.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cycle-end">Cycle label end</Label>
          <Input
            id="cycle-end"
            placeholder="ex: issue-workflow::in-review"
            value={draft.cycleEndLabel}
            onChange={(event) => onChange({ ...draft, cycleEndLabel: event.currentTarget.value })}
          />
        </div>
      </div>

      {statusMessage && <p className="window-status">{statusMessage}</p>}

      <footer className="window-actions">
        <Button
          disabled={isSaving || isTestingConnection}
          variant="secondary"
          onClick={onTestConnection}
        >
          {isTestingConnection ? "Test en cours..." : "Tester la connexion"}
        </Button>
        <Button disabled={isSaving || isTestingConnection} onClick={onSave}>
          {isSaving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </footer>
    </>
  );
}
