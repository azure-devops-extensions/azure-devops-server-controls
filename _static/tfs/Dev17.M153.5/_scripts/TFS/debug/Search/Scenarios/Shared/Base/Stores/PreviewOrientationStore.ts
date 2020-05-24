import * as Settings from "VSS/Settings";
import { SettingsStore } from "Search/Scenarios/Shared/Base/Stores/SettingsStore";
import { PreviewOrientationChangedPayload } from "Search/Scenarios/Shared/Base/ActionsHub"

export interface PreviewOrientationStoreState {
    previewOrientation: string;

    visible: boolean;
}

export class PreviewOrientationStore extends SettingsStore<string> {
    protected _state: PreviewOrientationStoreState = { visible: false } as PreviewOrientationStoreState;

    constructor(settingsKey: string, settingsService?: Settings.LocalSettingsService) {
        super(settingsKey, settingsService);
    }

    public get state(): PreviewOrientationStoreState {
        return this._state;
    }

    public updatePreviewOrientationMode = (payload: PreviewOrientationChangedPayload) => {
        this._state.previewOrientation = payload.previewOrientation.key;
        this.writeSetting(payload.previewOrientation.key);
        this.emitChanged();
    }

    public onResultsObtained = (settingsPivotVisible: boolean) => {
        this._state.visible = settingsPivotVisible;
        this.emitChanged();
    }
}