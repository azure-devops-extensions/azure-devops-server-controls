import { ServiceUtils } from "Agile/Scripts/Common/Utils";
import { AgileHubServerConstants } from "Agile/Scripts/Generated/HubConstants";
import { Async } from "OfficeFabric/Utilities";
import { WebSettingsScope } from "Presentation/Scripts/TFS/TFS.WebSettingsService";
import { ErrorUtils } from "TFSUI/Common/Utils";
import * as Diag from "VSS/Diag";
import { getService as getSettingsService, SettingsUserScope } from "VSS/Settings/Services";
import { publishEvent, TelemetryEventData } from "VSS/Telemetry/Services";
import { empty, format } from "VSS/Utils/String";
import { IFilterState } from "VSSUI/Utilities/Filter";

export interface IFilterStatePersistenceManager {
    /**
     * Save a filter state to the server
     * @param filterState The filter state to save
     */
    saveFilterStateToServer(filterState: IFilterState);

    /**
     * Write a filter state to local storage
     * @param filterState The filter state to write
     */
    saveFilterStateToLocalStorage(filterState: IFilterState);
}

export const FILTER_THROTTLE_DELAY = 1000;
export const IFILTER_SERIALIZE_ERROR = "IFilterToJsonConvertFailure";
export const INVALID_WEB_SETTINGS_SERVICE_ERROR = "InvalidWebSettingsService";
export const WRITE_SETTINGS_ERROR = "BeginWriteSettingErrorCallback";

/**
 * Manages the persistence of an IFilterState.
 */
export class FilterStatePersistenceManager implements IFilterStatePersistenceManager {
    private _hubName: string;
    private _pivotName: string;
    private _scopeName: string;
    private _scopeValue: string;
    private _registryKey: string;
    private _asyncContext: Async;
    private _throttledSaveFilter: (filterState: IFilterState, serializedFilter: string) => void;

    /**
     * Create a new filter persistence manager
     * @param scopeName The scope to use to save this filter (ex. "project")
     * @param scopeValue The scope value to use to save this filter (ex. project id)
     * @param hubName The current hub name
     * @param pivotName The current pivot name
     */
    constructor(
        scopeName: string,
        scopeValue: string,
        hubName: string,
        pivotName: string,
        additionalKeyParameters?: string[]
    ) {
        this._hubName = hubName;
        this._pivotName = pivotName;
        this._scopeName = scopeName;
        this._scopeValue = scopeValue;
        this._registryKey = this._getFilterRegistryKey(hubName, pivotName, additionalKeyParameters);

        this._asyncContext = new Async();
        this._throttledSaveFilter = this._asyncContext.throttle(this._saveFilterState, FILTER_THROTTLE_DELAY);
    }

    /**
     * Save a filter state to the server
     * @param filterState The filter state to save
     */
    public saveFilterStateToServer(filterState: IFilterState): void {
        // Note that if  specifying onSaveCallback, we will save the state immediatelly (it is not throttled)
        const { success, serializedFilter } = this._serializeFilter(filterState);

        if (success) {
            this._throttledSaveFilter(filterState, serializedFilter);
        }
    }

    /**
     * Save a filter state to the server immediately
     * @param filterState The filter state
     */
    public immediateSaveFilterStateToServer(filterState: IFilterState): Promise<void> {
        // Note that if  specifying onSaveCallback, we will save the state immediatelly (it is not throttled)
        const { success, serializedFilter } = this._serializeFilter(filterState);

        if (success) {
            return this._saveFilterState(filterState, serializedFilter);
        }
    }

    /**
     * Write a filter state to local storage
     * @param filterState The filter state to write
     */
    public saveFilterStateToLocalStorage(filterState: IFilterState): void {
        const webSetttingsSvc = ServiceUtils.getWebSettingsSvc();

        if (webSetttingsSvc) {
            const { success, serializedFilter } = this._serializeFilter(filterState);

            if (success) {
                webSetttingsSvc.writeLocalSetting(
                    this._registryKey,
                    serializedFilter,
                    WebSettingsScope.User
                );
            }
        } else {
            ErrorUtils.PublishError(
                {
                    name: INVALID_WEB_SETTINGS_SERVICE_ERROR,
                    message: `RegKeyName:[${this._registryKey}]`
                },
                false,
                this._getComponentName(),
                "FilterStatePersistenceManager._saveFilterStateToLocalStorage"
            );
        }
    }

    private _serializeFilter(filterState: IFilterState): { success: boolean, serializedFilter: string } {
        let success = true;
        let serializedFilter: string;
        try {
            serializedFilter = JSON.stringify(filterState || {});
        } catch (error) {
            success = false;
            ErrorUtils.PublishError(
                error,
                false,
                this._getComponentName(),
                "FilterStatePersistenceManager._serializeFilter",
                IFILTER_SERIALIZE_ERROR,
                `RegKeyName:[${this._registryKey}]`
            );
        }

        return {
            success,
            serializedFilter
        };
    }

    private _saveFilterState = (filterState: IFilterState, serializedFilter: string): Promise<void> => {
        const setting = {
            [this._registryKey]: serializedFilter
        };

        return new Promise((resolve, reject) => {
            const settingsService = getSettingsService();
            if (settingsService) {
                settingsService.setEntries(setting, SettingsUserScope.Me, this._scopeName, this._scopeValue)
                    .then(this._onSaveFilterStateSucceeded(filterState), this._onSaveFilterStateFailed)
                    .then(resolve, reject);
            } else {
                ErrorUtils.PublishError(
                    {
                        name: INVALID_WEB_SETTINGS_SERVICE_ERROR,
                        message: `RegKeyName:[${this._registryKey}]`
                    },
                    false,
                    this._getComponentName(),
                    "FilterStatePersistenceManager._saveFilterStateToServer"
                );

                reject(new Error("Could not get an instance of the settings http client"));
            }
        });
    }

    /**
     * SaveFilterState success handler
     */
    private _onSaveFilterStateSucceeded = (filterState: IFilterState): () => void => {
        return () => {
            const eventData = new TelemetryEventData(
                this._hubName,
                `${this._pivotName}_FilterChanged`,
                {
                    appliedFilters: this._getAppliedFilters(filterState).join(", ")
                }
            );

            publishEvent(eventData, false);

            Diag.log(
                Diag.LogVerbosity.Verbose,
                "FilterStatePersistenceManager: Filter state saved"
            );
        }
    }

    /**
     * SaveFilterState error handler
     * @param error
     */
    private _onSaveFilterStateFailed = (error: Error): void => {
        ErrorUtils.PublishError(
            /** Error */ error,
            /** Immediate save */ false,
            /** Component name */ this._getComponentName(),
            /** Source */ "FilterStatePersistenceManager._getSaveErrorHandler",
            /** Error name */ WRITE_SETTINGS_ERROR,
            /** Error message */ `RegKeyName: [${this._registryKey}]`
        );

        Diag.log(
            Diag.LogVerbosity.Verbose,
            `FilterStatePersistenceManager: Error saving filter state: ${error}`
        );
    }

    /**
     * Returns a list of applied filters
     */
    private _getAppliedFilters(filterState: IFilterState): string[] {
        const filterKeys = Object.keys(filterState || {});
        return filterKeys.filter((key: string): boolean => {
            const filter = filterState[key];
            if (typeof filter.value === "string") {
                return filter.value !== empty;
            } else {
                return filter.value && !!filter.value.length;
            }
        });
    }

    private _getComponentName(): string {
        return `${this._hubName}_${this._pivotName}`;
    }

    /**
     * Returns the registry key name used to store a pivot's filter state.
     * @param hubName The hub name
     * @param pivotName The pivot name
     */
    private _getFilterRegistryKey(
        hubName: string,
        pivotName: string,
        additionalKeyParameters: string[]
    ): string {

        /* {HubName}/{PivotName}/Filter */
        let key = format(
            AgileHubServerConstants.FilterRegistryKeyFormat,
            hubName,
            pivotName
        );

        if (additionalKeyParameters) {
            const keySegments = key.split("/");
            keySegments.splice(keySegments.length - 1, 0, ...additionalKeyParameters);
            key = keySegments.join("/");
        }

        return key;
    }
}