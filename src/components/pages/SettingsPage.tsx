import { useEffect, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

import { SettingsForm, type SettingsCategory } from "@/components/organisms/settings/SettingsForm";
import { SecondaryWindowTemplate } from "@/components/templates/SecondaryWindowTemplate";
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

  if (!draft) {
    return (
      <SecondaryWindowTemplate className="settings-window">
        <div className="p-3 text-sm [color:var(--ui-muted-fg)]">Chargement des réglages...</div>
      </SecondaryWindowTemplate>
    );
  }

  return (
    <SecondaryWindowTemplate className="settings-window">
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
    </SecondaryWindowTemplate>
  );
}
