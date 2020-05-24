import { SprintsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import { IRightPanelContributionState } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewContracts";
import { publishErrorToTelemetry } from "VSS/Error";
import { VssService } from "VSS/Service";
import { getService as getSettingsService, SettingsUserScope } from "VSS/Settings/Services";
import { TfsSettingsScopeNames } from "Presentation/Scripts/TFS/Generated/TFS.WebApi.Constants";
import { toNativePromise } from "VSSPreview/Utilities/PromiseUtils";

/**
 * Settings for a Sprints Hub pivot.
 */
export interface ISprintsHubPivotSettings {
    /**
     * Settings for the right panel.
     */
    rightPanelContributionSettings: IRightPanelContributionState;
}

export interface ISprintsNavigationSettings {
    contentPivot?: string;

    directoryPivot?: string;

    iterationId?: string;

    /**
     * Contains settings for each pivot (key is pivot name).
     */
    pivotSettings?: IDictionaryStringTo<ISprintsHubPivotSettings>;
}

export class SprintsNavigationSettingsService extends VssService {
    private _navigationSettings: ISprintsNavigationSettings;
    private _pendingOperations: IDictionaryStringTo<Promise<void>>;

    constructor(testSettings?: ISprintsNavigationSettings) {
        super();

        this._pendingOperations = {};

        if (testSettings) {
            this._navigationSettings = testSettings;
        } else {
            this._navigationSettings = this._getInitialSettings();
        }
    }

    public get directoryPivot(): string {
        return this._getNavigationSetting("directoryPivot");
    }

    public set directoryPivot(pivotKey: string) {
        this._setEntryForUser("directoryPivot", pivotKey);
    }

    public get contentPivot(): string {
        return this._getNavigationSetting("contentPivot");
    }

    public set contentPivot(pivotKey: string) {
        this._setEntryForUser("contentPivot", pivotKey);
    }

    public get iterationId(): string {
        return this._getNavigationSetting("iterationId");
    }

    public set iterationId(iterationId: string) {
        this._setEntryForUser("iterationId", iterationId);
    }

    public get contentPivotSettings(): ISprintsHubPivotSettings {
        const defaultValue = this._getDefaultPivotSettings();
        const entry = this._getNavigationSetting("pivotSettings");
        const entryValue = (entry) ? entry[this.contentPivot] : defaultValue;
        return entryValue || defaultValue;
    }

    public set contentPivotSettings(settings: ISprintsHubPivotSettings) {
        const currentSettings = this._getNavigationSetting("pivotSettings");
        this._setEntryForUser(
            "pivotSettings", {
                ...currentSettings,
                [this.contentPivot]: settings
            });
    }

    public setValues(values: Partial<ISprintsNavigationSettings>): Promise<void> {
        this._navigationSettings = { ...this._navigationSettings, ...values };
        return this._storeSettings(values);
    }

    private _getInitialSettings(): ISprintsNavigationSettings {
        return {
            contentPivot: this._readSetting<string>(this._getSettingsKey("contentPivot")),
            directoryPivot: this._readSetting<string>(this._getSettingsKey("directoryPivot")),
            iterationId: this._readSetting<string>(this._getSettingsKey("iterationId")),
            pivotSettings: this._readSetting<IDictionaryStringTo<ISprintsHubPivotSettings>>(this._getSettingsKey("pivotSettings")),
        };
    }

    private _getNavigationSetting<K extends keyof ISprintsNavigationSettings>(key: K): ISprintsNavigationSettings[K] {
        return this._navigationSettings[key];
    }

    private _setEntryForUser<K extends keyof ISprintsNavigationSettings>(key: K, value: ISprintsNavigationSettings[K]): Promise<void> {
        this._navigationSettings[key] = value;
        return this._storeSettings({ [key]: value });
    }

    private _readSetting<T>(key: string): T {
        const settingsService = getSettingsService();
        return settingsService.getEntry<T>(key, SettingsUserScope.Me, TfsSettingsScopeNames.Project);
    }

    private _storeSettings(settings: Partial<ISprintsNavigationSettings>): Promise<void> {
        const keysToUpdate = Object.keys(settings);

        const storeSettings = () => {
            const settingsValues = {};
            keysToUpdate.forEach((key: keyof ISprintsNavigationSettings) => {
                settingsValues[this._getSettingsKey(key)] = settings[key];
            });

            const promise = toNativePromise(getSettingsService().setEntries(settingsValues, SettingsUserScope.Me, TfsSettingsScopeNames.Project, this.getWebContext().project.id))
                .then(null, (reason): void => {
                    publishErrorToTelemetry(new Error(`Could not store settings for SprintsHub '${reason}'`));
                })
                .then(() => {
                    this._setCompleted(keysToUpdate);
                });
            this._setPending(keysToUpdate, promise);
            return promise;
        };

        return this._getPendingPromise(keysToUpdate).then(storeSettings);
    }

    private _setPending(keys: string[], promise: Promise<void>): void {
        keys.forEach((key: string) => {
            this._pendingOperations[key] = promise;
        });
    }

    private _setCompleted(keys: string[]): void {
        keys.forEach((key: string) => {
            delete this._pendingOperations[key];
        });
    }

    private _getPendingPromise(keys: string[]): Promise<void> {
        for (let key of keys) {
            if (this._pendingOperations[key]) {
                return this._pendingOperations[key];
            }
        }

        return Promise.resolve();
    }

    /**
     * Returns default pivot settings to use when none can be found in the data provider for
     * a given pivot.
     */
    private _getDefaultPivotSettings(): ISprintsHubPivotSettings {
        return {
            rightPanelContributionSettings: {
                contributionId: null, // Default contribution ID is null, pivots can decide what this means
                size: SprintsHubConstants.RIGHT_PANEL_DEFAULT_SIZE_PX
            }
        };
    }

    private _getSettingsKey<K extends keyof ISprintsNavigationSettings>(key: K): string {
        switch (key) {
            case "contentPivot":
                return SprintsHubConstants.ContentPivotSetting;
            case "directoryPivot":
                return SprintsHubConstants.DirectoryPivotSetting;
            case "iterationId":
                return SprintsHubConstants.IterationSetting;
            case "pivotSettings":
                return SprintsHubConstants.PivotSettings;
        }
    }
}