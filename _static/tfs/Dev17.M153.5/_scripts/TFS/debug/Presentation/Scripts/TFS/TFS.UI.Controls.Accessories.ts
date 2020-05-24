/// <reference types="jquery" />

import Context = require("VSS/Context");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Service = require("VSS/Service");
import Settings = require("VSS/Settings");
import Settings_RestClient = require("VSS/Settings/RestClient");
import Splitter = require("VSS/Controls/Splitter");
import Utils_Core = require("VSS/Utils/Core");
import VSS = require("VSS/VSS");

export interface StatefulSplitterOptions {
    settingPath: string;
    useLocalStorage?: boolean;
}

export interface StatefulSplitterSetting {
    size: number;
    expanded: boolean;
}

const DEFAULT_ENHANCEMENT_SELECTOR: string = ".stateful";

export class StatefulSplitterEnhancement extends Controls.Enhancement<StatefulSplitterOptions> {
    private _splitter: Splitter.Splitter;
    private _isExpanded: boolean;
    private _size: number;
    private _settingPath: string;
    private _useLocalStorage: boolean;

    constructor(options?: StatefulSplitterOptions) {
        super(options);

        this._splitter = null;
        this._isExpanded = null;
        this._settingPath = null;

        if (this._canSaveState()) {
            Diag.Debug.assertIsStringNotEmpty(options.settingPath, "options.settingPath is empty");
            this._settingPath = options.settingPath;
            this._useLocalStorage = options.useLocalStorage;
        }
    }

    private _canSaveState() {
        // ControlStateEnhancement only works against collection and project level
        // If the level is account or deployment we should not allow saving state
        return !!Context.getDefaultWebContext().collection;
    }

    public initialize() {
        super.initialize();

        this._splitter = <Splitter.Splitter>Controls.Enhancement.ensureEnhancement(Splitter.Splitter, this._element);

        if (this._canSaveState()) {
            this._bind("changed", Utils_Core.delegate(this, this._onSplitterChanged));
        }
    }

    public setSettingPath(newSettingPath: string): void {
        this._settingPath = newSettingPath;
    }

    private _onSplitterChanged(e: JQueryEventObject, target: any) {

        if (target !== this._splitter) {
            // A "changed" event from some other element
            return;
        }

        var isExpanded = this._splitter.isExpanded();
        var newSize = this._splitter.getFixedSidePixels();
        var expansionStatusUpdated = (this._isExpanded === null || isExpanded !== this._isExpanded);
        var sizeUpdated = (this._size === null || this._size !== newSize);

        if (expansionStatusUpdated || sizeUpdated) {

            var setting: StatefulSplitterSetting = {
                size: newSize,
                expanded: isExpanded
            };

            if (sizeUpdated) {
                this._size = newSize;
            }
            if (expansionStatusUpdated) {
                this._isExpanded = isExpanded;
            }

            if (this._useLocalStorage) {
                Service.getLocalService(Settings.LocalSettingsService).write(this._settingPath, setting);
            }
            else {
                var entries: IDictionaryStringTo<StatefulSplitterSetting> = {};
                entries[this._settingPath] = setting;

                this.delayExecute("saveSettings", 500, true, () => {
                    var settingsClient = Service.getClient(Settings_RestClient.SettingsHttpClient, undefined, undefined, undefined, { showProgressIndicator: false });
                    settingsClient.setEntries(entries, "me");
                });
            }
        }
    }
}

Controls.Enhancement.registerEnhancement(StatefulSplitterEnhancement, "." + Splitter.Splitter.CORE_CSS_CLASS + DEFAULT_ENHANCEMENT_SELECTOR);

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.UI.Controls.Accessories", exports);
