import { useEffect, useState } from "react";
import { Button, ButtonGroup, Input, Label, TextField } from "@heroui/react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { testGitLabConnection } from "../lib/gitlab";
import { loadSettings, saveSettings } from "../lib/store";
import type { PollIntervalMinutes, Settings, ThemeMode } from "../lib/types";

const INTERVAL_OPTIONS: PollIntervalMinutes[] = [1, 2, 3, 5];
const THEME_OPTIONS: ThemeMode[] = ["light", "dark"];
const AVATAR_OPTIONS = [true, false] as const;

function parseMutedIids(raw: string): number[] {
  return raw
    .split(",")
    .map((entry) => Number(entry.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
}

export function SettingsWindow() {
  const [draft, setDraft] = useState<Settings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const settings = await loadSettings();
      setDraft(settings);
    })();
  }, []);

  const handleSave = async () => {
    if (!draft || isSaving || isTestingConnection) {
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      await saveSettings(draft);
      await getCurrentWebviewWindow().emit("settings:updated");
      setStatusMessage("Réglages enregistrés.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Impossible d'enregistrer.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!draft || isTestingConnection || isSaving) {
      return;
    }

    setIsTestingConnection(true);
    setStatusMessage(null);

    try {
      const user = await testGitLabConnection(draft);
      setStatusMessage(`Connexion OK: ${user.name} (@${user.username})`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Échec du test de connexion.");
    } finally {
      setIsTestingConnection(false);
    }
  };

  if (!draft) {
    return (
      <main className="window-shell">
        <div className="window-card">Chargement des réglages...</div>
      </main>
    );
  }

  return (
    <main className="window-shell">
      <section className="window-card settings-window">
        <header className="window-head">
          <div>
            <h1 className="window-title">Réglages GitLab</h1>
            <p className="window-subtitle">Configuration de l’app, synchro et métriques.</p>
          </div>
          <Button size="sm" variant="secondary" onPress={() => void getCurrentWebviewWindow().close()}>
            Fermer
          </Button>
        </header>

        <div className="window-form">
          <TextField>
            <Label>GitLab base URL</Label>
            <Input
              placeholder="https://gitlab.com"
              value={draft.gitlabBaseUrl}
              onChange={(event) => setDraft({ ...draft, gitlabBaseUrl: event.currentTarget.value })}
            />
          </TextField>

          <TextField>
            <Label>Personal Access Token</Label>
            <Input
              placeholder="glpat-..."
              type="password"
              value={draft.personalAccessToken}
              onChange={(event) =>
                setDraft({ ...draft, personalAccessToken: event.currentTarget.value })
              }
            />
          </TextField>

          <div className="space-y-2">
            <p className="text-sm font-medium">Intervalle de synchro (min)</p>
            <ButtonGroup className="w-full">
              {INTERVAL_OPTIONS.map((value) => (
                <Button
                  key={value}
                  className="flex-1"
                  variant={draft.pollIntervalMinutes === value ? "primary" : "secondary"}
                  onPress={() => setDraft({ ...draft, pollIntervalMinutes: value })}
                >
                  {value}
                </Button>
              ))}
            </ButtonGroup>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Thème</p>
            <ButtonGroup className="w-full">
              {THEME_OPTIONS.map((value) => (
                <Button
                  key={value}
                  className="flex-1"
                  variant={draft.theme === value ? "primary" : "secondary"}
                  onPress={() => setDraft({ ...draft, theme: value })}
                >
                  {value === "light" ? "Light" : "Dark"}
                </Button>
              ))}
            </ButtonGroup>
          </div>

          <TextField>
            <Label>MRs à atténuer (IID, séparés par virgule)</Label>
            <Input
              placeholder="ex: 1234, 1402, 2201"
              value={draft.mutedMrIids.join(", ")}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  mutedMrIids: parseMutedIids(event.currentTarget.value),
                })
              }
            />
          </TextField>

          <div className="space-y-2">
            <p className="text-sm font-medium">Afficher les avatars commentaires</p>
            <ButtonGroup className="w-full">
              {AVATAR_OPTIONS.map((value) => (
                <Button
                  key={String(value)}
                  className="flex-1"
                  variant={draft.showCommentAvatars === value ? "primary" : "secondary"}
                  onPress={() => setDraft({ ...draft, showCommentAvatars: value })}
                >
                  {value ? "Oui" : "Non"}
                </Button>
              ))}
            </ButtonGroup>
          </div>

          <TextField>
            <Label>Cycle label start</Label>
            <Input
              placeholder="ex: issue-workflow::in-development"
              value={draft.cycleStartLabel}
              onChange={(event) => setDraft({ ...draft, cycleStartLabel: event.currentTarget.value })}
            />
          </TextField>

          <TextField>
            <Label>Cycle label end</Label>
            <Input
              placeholder="ex: issue-workflow::in-review"
              value={draft.cycleEndLabel}
              onChange={(event) => setDraft({ ...draft, cycleEndLabel: event.currentTarget.value })}
            />
          </TextField>
        </div>

        {statusMessage && <p className="window-status">{statusMessage}</p>}

        <footer className="window-actions">
          <Button isDisabled={isSaving || isTestingConnection} variant="secondary" onPress={handleTestConnection}>
            {isTestingConnection ? "Test en cours..." : "Tester la connexion"}
          </Button>
          <Button isDisabled={isSaving || isTestingConnection} onPress={handleSave}>
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </footer>
      </section>
    </main>
  );
}

