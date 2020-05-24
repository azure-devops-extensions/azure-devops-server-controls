import * as React from "react";
import * as AdminResources from "Admin/Scripts/Resources/TFS.Resources.Admin";
import * as Utils_Date from "VSS/Utils/Date"
import { ServiceEndpointExecutionHistoryActionCreator } from "Admin/Scripts/ServiceEndpoint/Actions/ServiceEndpointExecutionHistoryActions";
import { ServiceEndpointExecutionHistoryListColumnKeys } from "Admin/Scripts/ServiceEndpoint/Constants";
import { ServiceEndpointExecutionHistoryStore, IServiceEndpointExecutionHistory } from "Admin/Scripts/ServiceEndpoint/Stores/ServiceEndpointExecutionHistoryStore";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import { Fabric } from "OfficeFabric/Fabric";
import { IColumn, CheckboxVisibility, DetailsListLayoutMode } from 'OfficeFabric/DetailsList';
import { TaskResult } from "TFS/DistributedTask/Contracts";
import { Component, Props } from "VSS/Flux/Component";
import { VssDetailsList } from 'VSSUI/VssDetailsList';
import { ServiceEndpointExecutionData, ServiceEndpointExecutionResult } from "TFS/ServiceEndpoint/Contracts";

export interface ServiceEndpointExecutionHistoryProps extends Props {
    instanceId?: string;
}

export class ServiceEndpointExecutionHistory extends Component<ServiceEndpointExecutionHistoryProps, IServiceEndpointExecutionHistory> {
    constructor(props: ServiceEndpointExecutionHistoryProps) {
        super(props);

        this._store = StoreManager.GetStore<ServiceEndpointExecutionHistoryStore>(ServiceEndpointExecutionHistoryStore, this.props.instanceId);
        this._actionCreator = ActionCreatorManager.GetActionCreator<ServiceEndpointExecutionHistoryActionCreator>(ServiceEndpointExecutionHistoryActionCreator, this.props.instanceId);
        this.state = this._store.getState();
    }

    public render(): JSX.Element {
        return (
            <Fabric>
                <VssDetailsList 
                    className='endpoint-execution-history-list' 
                    ariaLabelForGrid='endpoint-execution-history' 
                    items={this.state.data} 
                    columns={this.getColumns()} 
                    checkboxVisibility={CheckboxVisibility.hidden}
                    layoutMode={DetailsListLayoutMode.justified} />
            </Fabric>
        );
    }

    public componentWillMount(): void {
        this._store.addChangedListener(this.onStoreChange);
        this.setState(this._store.getState());
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this.onStoreChange);

        StoreManager.DeleteStore<ServiceEndpointExecutionHistoryStore>(ServiceEndpointExecutionHistoryStore, this.props.instanceId);
    }

    private getColumns(): IColumn[] {
        var columns: IColumn[] = [];

        columns.push({
            key: ServiceEndpointExecutionHistoryListColumnKeys.Result,
            name: AdminResources.ServiceEndpointExecutionHistoryListResultColumnName,
            fieldName: null,
            minWidth: 50,
            maxWidth: 100,
            onRender: this.renderResult,
            onColumnClick: this.onColumnClick,
            isSorted: this.isColumnSorted(ServiceEndpointExecutionHistoryListColumnKeys.Result),
            isSortedDescending: this.state.isColumnSortedDescending,
            isResizable: true
        });

        columns.push({
            key: ServiceEndpointExecutionHistoryListColumnKeys.Type,
            name: AdminResources.ServiceEndpointExecutionHistoryListTypeColumnName,
            fieldName: null,
            minWidth: 50,
            maxWidth: 50,
            onRender: this.renderType,
            onColumnClick: this.onColumnClick,
            isSorted: this.isColumnSorted(ServiceEndpointExecutionHistoryListColumnKeys.Type),
            isSortedDescending: this.state.isColumnSortedDescending,
            isResizable: true
        });

        columns.push({
            key: ServiceEndpointExecutionHistoryListColumnKeys.Definition,
            name: AdminResources.ServiceEndpointExecutionHistoryListDefinitionColumnName,
            fieldName: null,
            minWidth: 100,
            maxWidth: 400,
            onRender: this.renderDefinition,
            onColumnClick: this.onColumnClick,
            isSorted: this.isColumnSorted(ServiceEndpointExecutionHistoryListColumnKeys.Definition),
            isSortedDescending: this.state.isColumnSortedDescending,
            isResizable: true
        });

        columns.push({
            key: ServiceEndpointExecutionHistoryListColumnKeys.Name,
            name: AdminResources.ServiceEndpointExecutionHistoryListNameColumnName,
            fieldName: null,
            minWidth: 100,
            maxWidth: 400,
            onRender: this.renderName,
            onColumnClick: this.onColumnClick,
            isSorted: this.isColumnSorted(ServiceEndpointExecutionHistoryListColumnKeys.Name),
            isSortedDescending: this.state.isColumnSortedDescending,
            isResizable: true
        })

        columns.push({
            key: ServiceEndpointExecutionHistoryListColumnKeys.StartTime,
            name: AdminResources.ServiceEndpointExecutionHistoryListStartTimeColumnName,
            fieldName: null,
            minWidth: 100,
            maxWidth: 150,
            onRender: this.renderStartTime,
            onColumnClick: this.onColumnClick,
            isSorted: this.isColumnSorted(ServiceEndpointExecutionHistoryListColumnKeys.StartTime),
            isSortedDescending: this.state.isColumnSortedDescending,
            isResizable: true
        })

        columns.push({
            key: ServiceEndpointExecutionHistoryListColumnKeys.FinishTime,
            name: AdminResources.ServiceEndpointExecutionHistoryListFinishTimeColumnName,
            fieldName: null,
            minWidth: 100,
            maxWidth: 150,
            onRender: this.renderFinishTime,
            onColumnClick: this.onColumnClick,
            isSorted: this.isColumnSorted(ServiceEndpointExecutionHistoryListColumnKeys.FinishTime),
            isSortedDescending: this.state.isColumnSortedDescending,
            isResizable: true
        })

        return columns;
    }

    private renderResult(item: ServiceEndpointExecutionData): JSX.Element {
        var iconClassName: string = "bowtie-icon ";
        var resultText: string;
        switch (item.result) {
            case ServiceEndpointExecutionResult.Abandoned:
                iconClassName += "bowtie-status-stop";
                resultText = AdminResources.TaskResultAbandoned;
                break;
            case ServiceEndpointExecutionResult.Canceled:
                iconClassName += "bowtie-status-stop";
                resultText = AdminResources.TaskResultCanceled;
                break;
            case ServiceEndpointExecutionResult.Failed:
                iconClassName += "bowtie-edit-delete";
                resultText = AdminResources.TaskResultFailed;
                break;

            case ServiceEndpointExecutionResult.Succeeded:
                iconClassName += "bowtie-check";
                resultText = AdminResources.TaskResultSucceeded;
                break;
            
            case ServiceEndpointExecutionResult.Skipped:
                iconClassName += "bowtie-status-no";
                resultText = AdminResources.TaskResultSkipped;
                break;
            
            case ServiceEndpointExecutionResult.SucceededWithIssues:
                iconClassName += "bowtie-status-warning";
                resultText = AdminResources.TaskResultSucceededWithIssues;
                break;
            default:
                iconClassName += "bowtie-status-info";
                resultText = "";
                break;
        }

        return (
            <div>
                <span className={iconClassName} />
                <span> {resultText} </span>
            </div>
        );
    }

    private renderType(item: ServiceEndpointExecutionData): JSX.Element {
        return (
            <div>
                {item.planType}
            </div>
        );
    }

    private renderDefinition(item: ServiceEndpointExecutionData): JSX.Element {
        return (
            <SafeLink href={item.definition._links.web.href} target="_blank">
                {item.definition.name}
            </SafeLink>
        );
    }

    private renderName(item: ServiceEndpointExecutionData): JSX.Element {
        return (
            <SafeLink href={item.owner._links.web.href} target="_blank">
                {item.owner.name}
            </SafeLink>
        );
    }

    private renderStartTime(item: ServiceEndpointExecutionData): JSX.Element {
        return (
            <div>
                {Utils_Date.localeFormat(item.startTime, "g")}
            </div>
        );
    }

    private renderFinishTime(item: ServiceEndpointExecutionData): JSX.Element {
        return (
            <div>
                {Utils_Date.localeFormat(item.finishTime, "g")}
            </div>
        );
    }

    private onColumnClick = (event: React.MouseEvent<HTMLElement>, column: IColumn): void => {
        this._actionCreator.sortList(column.key);
    }

    private isColumnSorted(columnKey: string): boolean {
        return this.state.sortedColumn === columnKey;
    }

    private onStoreChange = (): void => {
        this.setState(this._store.getState());
    }

    private _store: ServiceEndpointExecutionHistoryStore;
    private _actionCreator: ServiceEndpointExecutionHistoryActionCreator;
}