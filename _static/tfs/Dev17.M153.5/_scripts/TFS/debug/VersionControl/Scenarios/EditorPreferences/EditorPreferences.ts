import * as Telemetry from "VSS/Telemetry/Services";

import { IEditorPreferencesDialogProps, EditorPreferencesDialog} from "VersionControl/Scenarios/EditorPreferences/EditorPreferencesDialog";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { EditorPreferences as EditorUserPreferences, VersionControlUserPreferences } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { IEditorActionDescriptor } from "VersionControl/Scripts/TFS.VersionControl.EditorExtensions";

export const EditorPreferencesMenuId = "tfs-user-preferences";

/**
 * Manages editor user preferences.  Provides methods to get, save, and update via dialog.
 */
export class EditorPreferences {

    private _editorUserPreferences: EditorUserPreferences;
    private _repositoryContext: RepositoryContext;
    private _onSavedCallback: () => void;

    constructor(repositoryContext?: RepositoryContext) {
        this._repositoryContext = repositoryContext;
        this._editorUserPreferences = {} as EditorUserPreferences;
    }

    /**
     * Get the latest editor user preferences.
     */
    public getPreferences(): EditorUserPreferences {
        if (this._repositoryContext) {
            // This should be synchronous since user preferences are seeded from a data provider and kept updated.
            this._repositoryContext.getClient().beginGetUserPreferences((preferences: VersionControlUserPreferences) => {
                if (preferences) {
                    this._editorUserPreferences = preferences.editorPreferences;
                }
            });
        }
        return this._editorUserPreferences;
    }

    /**
     * Merge, save, and publish editor user preferences
     */
    public updatePreferences(editorPreferences: EditorUserPreferences, uiSource: string = "unspecified") {
        this._editorUserPreferences = { ...this._editorUserPreferences, ...editorPreferences };
        if (this._repositoryContext) {
            this._repositoryContext.getClient().beginGetUserPreferences((preferences: VersionControlUserPreferences) => {
                preferences.editorPreferences = { ...preferences.editorPreferences, ...editorPreferences };
                this._editorUserPreferences = preferences.editorPreferences;
                this._repositoryContext.getClient().beginUpdateUserPreferences(preferences);

                Telemetry.publishEvent(
                    new Telemetry.TelemetryEventData(
                        CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                        CustomerIntelligenceConstants.EDITOR_PREFERENCES_UPDATED,
                        {
                            uiSource,
                            ...this._editorUserPreferences
                        }
                    )
                );
            });
        }
    }

    /**
     * Show the dialog to provide updating and saving of Editor User Preferences
     */
    public showDialog(onSavedCallback?: () => void, uiSource: string = "unspecified", preserveLineHeight = false) {
        if (this._repositoryContext) {
            this._onSavedCallback = onSavedCallback;
            EditorPreferencesDialog.show({
                editorUserPreferences: this._editorUserPreferences,
                preserveLineHeight,
                onSavePreferences: this.savePreferences,
                onCancelled: () => { this._onSavedCallback = null },
                uiSource,
            });
        }
    }

    /**
     * Set the repository context
     */
    public setRepository(repositoryContext: RepositoryContext) {
        this._repositoryContext = repositoryContext;
    }

    /**
     * Returns a Monaco context menu item descriptor for the Editor User Preferences
     */
    public getContextMenuItem(): IEditorActionDescriptor {

        // 9_cutcopypaste - The last default group with the basic editing commands in Monaco.  99_preferences sorts below it.
        const groupBelowEditCommands = "99_preferences"

        return {
            contextMenuGroupId: groupBelowEditCommands,
            id: EditorPreferencesMenuId,
            keybindings: null,
            label: VCResources.EditorPreferencesMonacoMenuLabel,
        }
    }

    private savePreferences = (preferences: EditorUserPreferences, uiSource?: string) => {
        this.updatePreferences(preferences, uiSource + "-preferences-dialog");
        if (this._onSavedCallback) {
            this._onSavedCallback();
            this._onSavedCallback = null;
        }
    }
}