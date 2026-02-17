import {
  Button,
  ButtonGroup,
  Input,
  Label,
  Modal,
  TextField,
} from "@heroui/react";
import type { PollIntervalMinutes, Settings } from "../lib/types";

interface SettingsModalProps {
  isOpen: boolean;
  draft: Settings;
  isSaving: boolean;
  isTestingConnection: boolean;
  testConnectionResult: string | null;
  onOpenChange: (open: boolean) => void;
  onChange: (next: Settings) => void;
  onTestConnection: () => void;
  onSave: () => void;
}

const INTERVAL_OPTIONS: PollIntervalMinutes[] = [1, 2, 3, 5];

export function SettingsModal({
  isOpen,
  draft,
  isSaving,
  isTestingConnection,
  testConnectionResult,
  onOpenChange,
  onChange,
  onTestConnection,
  onSave,
}: SettingsModalProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container placement="center">
          <Modal.Dialog className="w-full max-w-[420px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Réglages GitLab</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="space-y-3">
              <TextField>
                <Label>GitLab base URL</Label>
                <Input
                  placeholder="https://gitlab.com"
                  value={draft.gitlabBaseUrl}
                  onChange={(event) =>
                    onChange({ ...draft, gitlabBaseUrl: event.currentTarget.value })
                  }
                />
              </TextField>

              <TextField>
                <Label>Personal Access Token</Label>
                <Input
                  placeholder="glpat-..."
                  type="password"
                  value={draft.personalAccessToken}
                  onChange={(event) =>
                    onChange({ ...draft, personalAccessToken: event.currentTarget.value })
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
                      onPress={() => onChange({ ...draft, pollIntervalMinutes: value })}
                    >
                      {value}
                    </Button>
                  ))}
                </ButtonGroup>
              </div>

              {testConnectionResult && (
                <p className="text-sm text-muted">{testConnectionResult}</p>
              )}
            </Modal.Body>
            <Modal.Footer className="flex justify-end gap-2">
              <Button
                isDisabled={isTestingConnection || isSaving}
                variant="secondary"
                onPress={onTestConnection}
              >
                {isTestingConnection ? "Test en cours..." : "Tester la connexion"}
              </Button>
              <Button isDisabled={isSaving || isTestingConnection} onPress={onSave}>
                {isSaving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
