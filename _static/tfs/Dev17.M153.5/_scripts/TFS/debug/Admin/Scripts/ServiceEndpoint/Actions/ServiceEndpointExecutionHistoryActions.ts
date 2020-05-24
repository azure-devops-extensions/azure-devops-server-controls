import { Action } from "VSS/Flux/Action";
import { ServiceEndpointExecutionHistoryManager } from "Admin/Scripts/ServiceEndpoint/ServiceEndpointExecutionHistoryManager"
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionsHubBase, ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ServiceEndpointExecutionRecord } from "TFS/ServiceEndpoint/Contracts";

export class ServiceEndpointExecutionHistoryActionCreator extends ActionCreatorBase {
    public initialize(instanceId?: string): void {
        this._actions = ActionsHubManager.GetActionsHub<ServiceEndpointExecutionHistoryActions>(ServiceEndpointExecutionHistoryActions, instanceId);
        this._serviceEndpointExecutionHistoryManager = new ServiceEndpointExecutionHistoryManager();
    }

    public static getKey(): string {
        return ServiceEndpointExecutionHistoryActionCreator.ActionCreatorKey;
    }

    public loadServiceEndpointExecutionHistory(endpointId: string): void {
        this._serviceEndpointExecutionHistoryManager.getServiceEndpointExecutionRecords(endpointId).then( (records: ServiceEndpointExecutionRecord[]) => {
            this._actions.loadExecutionHistory.invoke(records);
        });
    }

    public sortList(columnKey: string): void {
        this._actions.sortList.invoke(columnKey);
    }

    private _actions: ServiceEndpointExecutionHistoryActions;
    private _serviceEndpointExecutionHistoryManager: ServiceEndpointExecutionHistoryManager;
    private static ActionCreatorKey = "ACTION_CREATOR_KEY_SERVICE_ENDPOINT_EXECUTION_HISTORY";
}

export class ServiceEndpointExecutionHistoryActions extends ActionsHubBase {
    public initialize(): void {
        this._loadExecutionHistory = new Action<ServiceEndpointExecutionRecord[]>();
        this._sortList = new Action<string>();
    }

    public static getKey(): string {
        return ServiceEndpointExecutionHistoryActions.ActionsKey;
    }

    public get loadExecutionHistory(): Action<ServiceEndpointExecutionRecord[]> {
        return this._loadExecutionHistory;
    }

    public get sortList(): Action<string> {
        return this._sortList;
    }

    private _loadExecutionHistory: Action<ServiceEndpointExecutionRecord[]>;
    private _sortList: Action<string>;
    private static ActionsKey = "ACTIONS_KEY_SERVICE_ENDPOINT_EXECUTION_HISTORY";
}
