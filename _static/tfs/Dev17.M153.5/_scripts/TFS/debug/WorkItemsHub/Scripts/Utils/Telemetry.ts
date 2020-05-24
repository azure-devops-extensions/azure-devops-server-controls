import * as Diag from "VSS/Diag";
import * as Performance from "VSS/Performance";
import * as Telemetry from "VSS/Telemetry/Services";

export namespace TelemetryConstants {
    export const Area = "WorkItemsHub";

    // Performance scenarios
    export const WorkItemsHubInitialLoad = "WorkItemsHubInitialLoad";
    export const WorkItemsHubTabSwitch = "WorkItemsHubTabSwitch";

    // Usage scenarios
    export const CreateWorkItem = "CreateWorkItem";
    export const OpenInQueries = "OpenInQueries";
    export const ColumnOptionsCommand = "ColumnOptionsCommand";
    export const RecycleBin = "RecycleBin";
    export const CopyToClipboard = "CopyToClipboard";
    export const Email = "Email";
    export const Delete = "Delete";
    export const DeleteCommand = "DeleteCommand";
    export const LoadMoreItems = "LoadMoreItems";
    export const CompletedWorkItems = "CompletedWorkItems";
    export const TriageViewNavigation = "TriageViewNavigation";
    export const BackToWorkItemsFromTriageView = "BackToWorkItemsFromTriageView";
    export const ColumnOptionsChange = "ColumnOptionsChange";
    export const ColumnResize = "ColumnResize";
    export const ColumnHeaderClick = "ColumnHeaderClick";
}

/**
 * Telemetry helper for work items hub performance scenarios
 */
export class PerformanceTelemetryHelper {
    private _currentScenario: Performance.IScenarioDescriptor = null;

    /**
     * Starts initial load performance scenario (TTI)
     */
    public startInitialLoad(): void {
        Diag.Debug.assert(this._currentScenario === null);
        this._currentScenario = Performance.getScenarioManager().startScenarioFromNavigation(TelemetryConstants.Area,
            TelemetryConstants.WorkItemsHubInitialLoad,
            true);
    }

    /**
     * Starts 'tab switch' performance scenario
     */
    public startTabSwitch(): void {
        // no-op if there is an active scenario (initial load)
        if (this._currentScenario && this._currentScenario.isActive()) {
            return;
        }

        this._currentScenario = Performance.getScenarioManager().startScenario(TelemetryConstants.Area, TelemetryConstants.WorkItemsHubTabSwitch);
    }

    /**
     * End the current performance scenario
     */
    public end(): void {
        if (this._currentScenario && this._currentScenario.isActive()) {
            this._currentScenario.end(Date.now());
            this._currentScenario = null;
        }
    }

    /**
     * Is the current scenario active?
     */
    public isActive(): boolean {
        return this._currentScenario && this._currentScenario.isActive();
    }

    /**
     * Add additional data to for the currently active scenario
     * @param data Property bag of additional data
     */
    public addData(data: any): void {
        if (this._currentScenario && this._currentScenario.isActive()) {
            this._currentScenario.addData(data);
        }
    }

    /**
     * Insert split timing for the currently active scenario
     * @param splitName Name of split timing
     */
    public split(splitName: string): void {
        if (this._currentScenario && this._currentScenario.isActive()) {
            this._currentScenario.addSplitTiming(splitName);
        }
    }
}

/**
 * Helper for work items hub usage telemetry
 */
export namespace UsageTelemetryHelper {
    /**
     * Publish telemetry for Create New Work Item command
     * @param workItemType The work item type
     */
    export function publishCreateNewWorkItemTelemetry(workItemType: string): void {
        _publish(TelemetryConstants.CreateWorkItem, { workItemType });
    }

    /**
     * Publish telemetry for RecycleBin command
     * @param tabId Tab id
     */
    export function publishRecycleBinCommand(tabId: string): void {
        _publish(TelemetryConstants.RecycleBin, { tabId });
    }

    /**
     * Publish telemetry for Column Options command
     * @param tabId Tab id
     */
    export function publishColumnOptionsCommand(tabId: string): void {
        _publish(TelemetryConstants.ColumnOptionsCommand, { tabId });
    }

    /**
     * Publish telemetry for Open in Queries command
     * @param tabId Tab id
     * @param hasFilter Indicate if filter applied
     * @param hasSelection Indicate if selection applied
     */
    export function publishOpenInQueriesTelemetry(tabId: string, hasFilter: boolean, hasSelection: boolean): void {
        _publish(TelemetryConstants.OpenInQueries, { tabId, hasFilter, hasSelection });
    }

    /**
     * Publish telemetry for Copy to clipboard command
     * @param tabId Tab id
     * @param keyboardShortcutEvent Indicates if the command was triggered via keyboard shortcut
     */
    export function publishCopyToClipboardTelemetry(tabId: string, keyboardShortcutEvent: boolean): void {
        _publish(TelemetryConstants.CopyToClipboard, { tabId, keyboardShortcutEvent });
    }

    /**
     * Publish telemetry for Delete command
     * @param tabId Tab id
     * @param keyboardShortcutEvent Indicates if the command was triggered via keyboard shortcut
     */
    export function publishDeleteTelemetry(tabId: string, keyboardShortcutEvent: boolean): void {
        _publish(TelemetryConstants.Delete, { tabId, keyboardShortcutEvent });
    }

    /**
     * Publish telemetry for paging (load more items)
     * @param tabId Tab id
     * @param workItemCount number of paged work items
     */
    export function publishLoadMoreItemsTelemetry(tabId: string, workItemCount: number): void {
        _publish(TelemetryConstants.LoadMoreItems, { tabId, workItemCount });
    }

    /**
     * Publish telemetry for Email command
     * @param tabId Tab id
     */
    export function publishEmailTelemetry(tabId: string): void {
        _publish(TelemetryConstants.Email, { tabId });
    }

    /**
     * Publish telemetry for view option (completed work items) change
     * @param tabId Tab id
     * @param isOn Whether the view option is turned on or not
     */
    export function publishCompletedWorkItemsViewOptionTelemetry(tabId: string, isOn: boolean): void {
        _publish(TelemetryConstants.CompletedWorkItems, { tabId, isOn });
    }

    /**
     * Publish telemetry for triage view navigation
     * @param tabId Tab id
     * @param fromIndex From index
     * @param toIndex To index
     * @param numberOfWorkItems Number of work items
     */
    export function publishTriageViewNavigationTelemetry(tabId: string, fromIndex: number, toIndex: number, numberOfWorkItems: number): void {
        _publish(TelemetryConstants.TriageViewNavigation, { tabId, fromIndex, toIndex, numberOfWorkItems });
    }

    /**
     * Publish telemetry for Back to Work Items from triage view command
     * @param tabId Tab id
     * @param numberOfWorkItems Number of work items
     */
    export function publishBackToWorkItemsFromTriageViewTelemetry(tabId: string, numberOfWorkItems: number): void {
        _publish(TelemetryConstants.BackToWorkItemsFromTriageView, { tabId, numberOfWorkItems });
    }

    /**
     * Publish telemetry for column options change
     * @param tabId Tab id
     * @param properties properties
     */
    export function publishColumnOptionsChange(tabId: string, properties: IDictionaryStringTo<string | number | boolean>): void {
        _publish(TelemetryConstants.ColumnOptionsChange, { tabId, ...properties });
    }

    /**
     * Publish telemetry for column resize
     * @param tabId Tab id
     * @param properties properties
     */
    export function publishColumnResize(tabId: string, properties: IDictionaryStringTo<string | number | boolean>): void {
        _publish(TelemetryConstants.ColumnResize, { tabId, ...properties });
    }

    /**
     * Publish telemetry for column header click
     * @param tabId Tab id
     * @param properties properties
     */
    export function publishColumnHeaderClick(tabId: string, properties: IDictionaryStringTo<string | number | boolean>): void {
        _publish(TelemetryConstants.ColumnHeaderClick, { tabId, ...properties });
    }

    function _publish(featureName: string, properties: IDictionaryStringTo<string | number | boolean>): void {
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(TelemetryConstants.Area, featureName, properties));
    }
}
