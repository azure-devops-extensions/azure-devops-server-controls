import * as VSSStore from  "VSS/Flux/Store";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { ActionsHub, TagCreationStatus, TagNameValidationStatus } from "VersionControl/Scenarios/Tags/CreateTags/ActionsHub";

export interface State {
    selectedVersion: VersionSpec;
    tagName: string;
    tagNameError: string;
    message: string;
    isTagCreationEnabled: boolean;
    isTagCreationInProgress: boolean;
    isTagCreationComplete: boolean;
    tagCreationError: string;
}

export class CreateTagStore extends VSSStore.Store {
    private _state: State;
    private _actionsHub: ActionsHub;
    constructor(actionsHub: ActionsHub, version: VersionSpec) {
        super();
        this._state = {
            selectedVersion: version,
            tagName: "",
            message: "",
            isTagCreationEnabled: false,
            tagNameError: "",
            tagCreationError: "",
            isTagCreationInProgress: false,
            isTagCreationComplete: false,
        }
        this._actionsHub = actionsHub;

        this._actionsHub.messageChanged.addListener(this._updateMessage);
        this._actionsHub.selectedVersionChanged.addListener(this._updateVersion);
        this._actionsHub.tagNameValidationStatusChanged.addListener(this._updateTagNameValidationStatus);
        this._actionsHub.tagCreationStatusChanged.addListener(this._updateTagCreationStatus);
    }

    public getState = (): State => {
        return this._state;
    }

    public dispose = (): void => {
        if (this._actionsHub) {
            this._actionsHub.messageChanged.removeListener(this._updateMessage);
            this._actionsHub.selectedVersionChanged.removeListener(this._updateVersion);
            this._actionsHub.tagNameValidationStatusChanged.removeListener(this._updateTagNameValidationStatus);
            this._actionsHub.tagCreationStatusChanged.removeListener(this._updateTagCreationStatus);
            this._actionsHub = null;
        }

        this._state = null;
    }

    private _updateMessage = (message: string): void => {
        this._state.message = message;
        this._updateTagCreationEnabled();
        this.emitChanged();
    }

    private _updateVersion = (version: VersionSpec): void => {
        this._state.selectedVersion = version;
        this.emitChanged();
    }

    private _updateTagNameValidationStatus = (status: TagNameValidationStatus): void => {
        this._state.tagName = status.name;
        this._state.tagNameError = status.error;
        this._updateTagCreationEnabled();
        this.emitChanged();
    }

    private _updateTagCreationStatus = (status: TagCreationStatus) => {
        this._state.isTagCreationComplete = status.complete;
        this._state.tagCreationError = status.error;
        this._state.isTagCreationInProgress = status.inProgress;
        this.emitChanged();
    }

    // helper method only - does not emit change on its own
    private _updateTagCreationEnabled = (): void => {
        this._state.isTagCreationEnabled = (!this._state.tagNameError && !!this._state.tagName && !!this._state.message.trim());
    }
}
