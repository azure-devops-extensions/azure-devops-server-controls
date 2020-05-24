import { ServiceEndpointExecutionHistoryActions } from "Admin/Scripts/ServiceEndpoint/Actions/ServiceEndpointExecutionHistoryActions"
import { ServiceEndpointExecutionHistoryListColumnKeys } from "Admin/Scripts/ServiceEndpoint/Constants";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { ServiceEndpointExecutionRecord, ServiceEndpointExecutionData, ServiceEndpointExecutionResult } from "TFS/ServiceEndpoint/Contracts";

export interface IServiceEndpointExecutionHistory {
    endpointId: string,
    data: ServiceEndpointExecutionData[],
    sortedColumn?: string,
    isColumnSortedDescending?: boolean
}

export class ServiceEndpointExecutionHistoryStore extends StoreBase {
    public initialize(instanceId?: string): void {
        this._actions = ActionsHubManager.GetActionsHub<ServiceEndpointExecutionHistoryActions>(ServiceEndpointExecutionHistoryActions, instanceId);
        this._actions.loadExecutionHistory.addListener(this.loadServiceEndpointsExecutionHistory, this);
        this._actions.sortList.addListener(this.sortList, this);
    }

    public static getKey(): string {
        return ServiceEndpointExecutionHistoryStore.StoreKey;
    }

    protected disposeInternal(): void {
        this._actions.loadExecutionHistory.removeListener(this.loadServiceEndpointsExecutionHistory);
        this._actions.sortList.removeListener(this.sortList);

        this._serviceEndpointExecutionHistory = null;
    }

    public getState(): IServiceEndpointExecutionHistory {
        if (!this._serviceEndpointExecutionHistory) {
            this.resetState();
        }
        
        return this._serviceEndpointExecutionHistory;
    }

    private resetState(): void {
        this._serviceEndpointExecutionHistory = {
            endpointId: "",
            data: [],
            sortedColumn: "",
            isColumnSortedDescending: true
        }
    }

    private loadServiceEndpointsExecutionHistory(records: ServiceEndpointExecutionRecord[]): void {
        if (!records || records.length == 0) {
            this.resetState();
        }
        else {
            let endpointId: string = records[0].endpointId;
            let data: ServiceEndpointExecutionData[] = records.map((record: ServiceEndpointExecutionRecord) => {
                return record.data;
            })

            this._serviceEndpointExecutionHistory = {
                endpointId: endpointId,
                data: data,
                sortedColumn: "",
                isColumnSortedDescending: true
            }

            this.sortList(ServiceEndpointExecutionHistoryListColumnKeys.FinishTime);
        }

        this.emitChanged();
    }

    private sortList(columnKey: string): void {
        if(this._serviceEndpointExecutionHistory.sortedColumn === columnKey) {
            this._serviceEndpointExecutionHistory.isColumnSortedDescending = !this._serviceEndpointExecutionHistory.isColumnSortedDescending;
        }
        else {
            this._serviceEndpointExecutionHistory.sortedColumn = columnKey;
            this._serviceEndpointExecutionHistory.isColumnSortedDescending = true;
        }
        
        let comparer = this.getComparer(columnKey, this._serviceEndpointExecutionHistory.isColumnSortedDescending);
        this._serviceEndpointExecutionHistory.data = this._serviceEndpointExecutionHistory.data.sort(comparer);

        this.emitChanged();
    }

    private getComparer(columnKey: string, sortDescending: boolean): (a: ServiceEndpointExecutionData, b: ServiceEndpointExecutionData) => number {
        switch (columnKey) {
            case ServiceEndpointExecutionHistoryListColumnKeys.Result:
                return (a: ServiceEndpointExecutionData, b: ServiceEndpointExecutionData): number => {
                    return this.compareStrings(ServiceEndpointExecutionResult[a.result], ServiceEndpointExecutionResult[b.result], sortDescending);
                };

            case ServiceEndpointExecutionHistoryListColumnKeys.Type:
                return (a: ServiceEndpointExecutionData, b: ServiceEndpointExecutionData): number => {
                    return this.compareStrings(a.planType.toLowerCase(), b.planType.toLowerCase(), sortDescending);
                };

            case ServiceEndpointExecutionHistoryListColumnKeys.Definition:
                return (a: ServiceEndpointExecutionData, b: ServiceEndpointExecutionData): number => {
                    return this.compareStrings(a.definition.name.toLowerCase(), b.definition.name.toLowerCase(), sortDescending);
                };

            case ServiceEndpointExecutionHistoryListColumnKeys.Name:
                return (a: ServiceEndpointExecutionData, b: ServiceEndpointExecutionData): number => {
                    return this.compareStrings(a.owner.name.toLowerCase(), b.owner.name.toLowerCase(), sortDescending);
                };

            case ServiceEndpointExecutionHistoryListColumnKeys.StartTime:
                return (a: ServiceEndpointExecutionData, b: ServiceEndpointExecutionData): number => {
                    return this.compareDates(a.startTime, b.startTime, sortDescending);
                };

            case ServiceEndpointExecutionHistoryListColumnKeys.FinishTime:
                return (a: ServiceEndpointExecutionData, b: ServiceEndpointExecutionData): number => {
                    return this.compareDates(a.finishTime, b.finishTime, sortDescending);
                };
        }
    }

    private compareStrings(firstValue: string, secondValue: string, sortDescending: boolean): number {
        if (firstValue === secondValue) {
            return 0;
        }
        else {
            let higher: boolean = firstValue > secondValue;
            return higher === sortDescending ? -1 : 1;
        }
    }

    private compareDates(firstValue: Date, secondValue: Date, sortDescending): number {
        if (firstValue.getTime() === secondValue.getTime()) {
            return 0;
        }
        else {
            let higher: boolean = firstValue > secondValue;
            return higher === sortDescending ? -1 : 1;
        }
    }

    private _serviceEndpointExecutionHistory: IServiceEndpointExecutionHistory;
    private _actions: ServiceEndpointExecutionHistoryActions;
    private static StoreKey = "STORE_KEY_SERVICE_ENDPOINT_EXECUTION_HISTORY";
}