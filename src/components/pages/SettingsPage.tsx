import { useCallback, useEffect, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

import { SettingsForm, type SettingsCategory } from "@/components/organisms/settings/SettingsForm";
import { testGitLabConnection } from "@/lib/gitlab";
import { loadSettings, saveSettings } from "@/lib/store";
import { applyThemeMode } from "@/lib/theme";
import type { Settings } from "@/lib/types";

export function SettingsPage() {
  const [draft, setDraft] = useState<Settings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("connection");

  useEffect(() => {
    void (async () => {
      const settings = await loadSettings();
      setDraft(settings);
    })();
  }, []);

  useEffect(() => {
    if (!draft) {
      return;
    }
    applyThemeMode(draft.theme);
  }, [draft]);

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

  const handleCloseWindow = useCallback(() => {
    void getCurrentWebviewWindow()
      .close()
      .catch((error) => {
        setStatusMessage(error instanceof Error ? error.message : "Impossible de fermer la fenêtre.");
      });
  }, []);

  if (!draft) {
    return (
      <main className="prefs-shell">
        <section className="prefs-window">
          <header className="prefs-titlebar">
            <div className="prefs-titlebar-drag" data-tauri-drag-region>
              <p className="prefs-titlebar-title">Foxlab — Preferences</p>
            </div>
            <button aria-label="Fermer" className="prefs-close-btn" type="button" onClick={handleCloseWindow}>
              ✕
            </button>
          </header>
          <div className="p-3 text-sm [color:var(--ui-muted-fg)]">Chargement des réglages...</div>
        </section>
      </main>
    );
  }

  return (
    <main className="prefs-shell">
      <section className="prefs-window">
        <header className="prefs-titlebar">
          <div className="prefs-titlebar-drag" data-tauri-drag-region>
            <p className="prefs-titlebar-title">Foxlab — Preferences</p>
          </div>
          <button aria-label="Fermer" className="prefs-close-btn" type="button" onClick={handleCloseWindow}>
            ✕
          </button>
        </header>
        <SettingsForm
          activeCategory={activeCategory}
          draft={draft}
          isSaving={isSaving}
          isTestingConnection={isTestingConnection}
          statusMessage={statusMessage}
          onCategoryChange={setActiveCategory}
          onChange={setDraft}
          onSave={() => void handleSave()}
          onTestConnection={() => void handleTestConnection()}
        />
      </section>
    </main>
  );
}
