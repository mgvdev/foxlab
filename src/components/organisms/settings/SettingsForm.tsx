import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  THEME_PRESET_OPTIONS,
  type PollIntervalMinutes,
  type Settings,
  type ThemeMode,
  type ThemePreset,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export type SettingsCategory = "connection" | "appearance" | "workflow";

interface SettingsFormProps {
  activeCategory: SettingsCategory;
  draft: Settings;
  isSaving: boolean;
  isTestingConnection: boolean;
  statusMessage: string | null;
  onCategoryChange: (next: SettingsCategory) => void;
  onChange: (next: Settings) => void;
  onTestConnection: () => void;
  onSave: () => void;
}

const INTERVAL_OPTIONS: PollIntervalMinutes[] = [1, 2, 3, 5];
const THEME_OPTIONS: ThemeMode[] = ["light", "dark"];
const AVATAR_OPTIONS = [true, false] as const;
const THEME_PRESET_LABELS: Record<ThemePreset, string> = {
  claude: "Claude",
  "light-green": "Light Green",
};

const SETTINGS_CATEGORIES: Array<{
  id: SettingsCategory;
  label: string;
  subtitle: string;
  title: string;
  description: string;
}> = [
  {
    id: "connection",
    label: "Connexion",
    subtitle: "GitLab",
    title: "Connexion GitLab",
    description: "URL, token et fréquence de synchronisation.",
  },
  {
    id: "appearance",
    label: "Apparence",
    subtitle: "Interface",
    title: "Apparence",
    description: "Thème visuel et avatars dans les commentaires.",
  },
  {
    id: "workflow",
    label: "Workflow",
    subtitle: "Cycle",
    title: "Workflow",
    description: "MR atténuées et labels utilisés pour les métriques.",
  },
];

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
    <div
      className="prefs-option-segment"
      style={{ gridTemplateColumns: `repeat(${Math.max(options.length, 1)}, minmax(0, 1fr))` }}
    >
      {options.map((option) => (
        <button
          key={String(option)}
          className={cn("prefs-option-btn", selected === option && "is-active")}
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
  activeCategory,
  draft,
  isSaving,
  isTestingConnection,
  statusMessage,
  onCategoryChange,
  onChange,
  onTestConnection,
  onSave,
}: SettingsFormProps) {
  const selectedCategory =
    SETTINGS_CATEGORIES.find((category) => category.id === activeCategory) ?? SETTINGS_CATEGORIES[0];
  const statusIsError = Boolean(
    statusMessage &&
      /impossible|erreur|échec|forbidden|unauthorized|failed|invalid|invalide|denied|timeout/i.test(
        statusMessage,
      ),
  );

  return (
    <div className="prefs-layout">
      <aside className="prefs-sidebar">
        <p className="prefs-sidebar-label">Préférences</p>
        <div className="prefs-sidebar-menu">
          {SETTINGS_CATEGORIES.map((category) => (
            <button
              key={category.id}
              className={cn("prefs-sidebar-item", activeCategory === category.id && "is-active")}
              type="button"
              onClick={() => onCategoryChange(category.id)}
            >
              <span className="prefs-sidebar-item-title">{category.label}</span>
              <span className="prefs-sidebar-item-subtitle">{category.subtitle}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="prefs-panel">
        <header className="prefs-panel-head">
          <h1 className="prefs-panel-title">{selectedCategory.title}</h1>
          <p className="prefs-panel-subtitle">{selectedCategory.description}</p>
        </header>

        <div className="prefs-panel-content">
          {activeCategory === "connection" && (
            <>
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
                <p className="text-xs font-semibold uppercase tracking-wide [color:var(--ui-muted-fg)]">
                  Intervalle de synchro (min)
                </p>
                <OptionSegment
                  getLabel={(value) => String(value)}
                  options={INTERVAL_OPTIONS}
                  selected={draft.pollIntervalMinutes}
                  onSelect={(value) => onChange({ ...draft, pollIntervalMinutes: value as PollIntervalMinutes })}
                />
              </div>
            </>
          )}

          {activeCategory === "appearance" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="theme-preset">Palette (shadcn)</Label>
                <select
                  id="theme-preset"
                  className="prefs-theme-select"
                  value={draft.themePreset}
                  onChange={(event) =>
                    onChange({ ...draft, themePreset: event.currentTarget.value as ThemePreset })
                  }
                >
                  {THEME_PRESET_OPTIONS.map((preset) => (
                    <option key={preset} value={preset}>
                      {THEME_PRESET_LABELS[preset]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide [color:var(--ui-muted-fg)]">Thème</p>
                <OptionSegment
                  getLabel={(value) => (value === "light" ? "Light" : "Dark")}
                  options={THEME_OPTIONS}
                  selected={draft.theme}
                  onSelect={(value) => onChange({ ...draft, theme: value as ThemeMode })}
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide [color:var(--ui-muted-fg)]">
                  Afficher les avatars commentaires
                </p>
                <OptionSegment
                  getLabel={(value) => (value ? "Oui" : "Non")}
                  options={AVATAR_OPTIONS}
                  selected={draft.showCommentAvatars}
                  onSelect={(value) => onChange({ ...draft, showCommentAvatars: value as boolean })}
                />
              </div>
            </>
          )}

          {activeCategory === "workflow" && (
            <>
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
            </>
          )}
        </div>

        {statusMessage && (
          <p className={cn("window-status", statusIsError && "window-status-error")}>{statusMessage}</p>
        )}

        <footer className="prefs-actions">
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
      </section>
    </div>
  );
}
