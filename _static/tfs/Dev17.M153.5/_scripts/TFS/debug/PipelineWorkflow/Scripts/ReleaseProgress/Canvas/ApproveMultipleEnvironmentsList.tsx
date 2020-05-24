/// <reference types="react" />
import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { FriendlyDate, PastDateMode } from "DistributedTaskControls/Common/FriendlyDate";
import { TooltipHost, TooltipOverflowMode, DirectionalHint } from "VSSUI/Tooltip";
import { CheckboxVisibility, ConstrainMode, DetailsListLayoutMode, IColumn, Selection, ColumnActionsMode } from "OfficeFabric/DetailsList";
import { css, autobind, getId } from "OfficeFabric/Utilities";
import { SelectionMode } from "OfficeFabric/utilities/selection/interfaces";
import { ServiceEndpoint } from "TFS/DistributedTask/Contracts";
import {
    IEnvironmentSkeleton,
    IDetailedReleaseApprovalData,
    IApprovalDataForList,
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ApproveMultipleEnvironmentsPanelActions";
import { AvatarList, IUserProfile } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/AvatarList";
import {
    IReleaseApprovalItem,
    IReleaseApprovalsData,
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentApprovalTypes";
import { ApprovalOrderKeys} from "PipelineWorkflow/Scripts/Common/Types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { VssDetailsList, VssDetailsListRowStyle } from "VSSUI/VssDetailsList";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ApproveMultipleEnvironmentsList";

export interface IApproveMultipleEnvironmentsListProps extends Base.IProps {
    environments: IEnvironmentSkeleton[];
    setSelectedEnvironmentIds: (selectedEnvironmentIds: number[]) => void;
    approvalData: IDictionaryNumberTo<IApprovalDataForList>;
    initialSelectedEnvironmentIds: number[];
}

interface IEnvironmentApprovalListItem {
    key: number;
    environment: IEnvironmentSkeleton;
    approval_data: IApprovalDataForList;
}

export class ApproveMultipleEnvironmentsList extends Base.Component<IApproveMultipleEnvironmentsListProps, Base.IStateless> {

    constructor(props) {
        super(props);
        this._environmentListSelection = new Selection({
            onSelectionChanged: this._setSelectedEnvironmentIds,
            selectionMode: SelectionMode.multiple,
        });
        this._environmentListSelection.setItems(this._getApprovalItems());           
    }

    public componentDidMount(){
        this._setInitialEnvironmentSelection(this.props.initialSelectedEnvironmentIds);    
    }

    public componentDidReceiveProps(props: IApproveMultipleEnvironmentsListProps){
         this._setInitialEnvironmentSelection(this.props.initialSelectedEnvironmentIds);
    }

    public render(): JSX.Element {
        if (this.props.environments.length > 0){
            return this.renderList();
        } else {
            return this.renderNoEnvironments();
        }
    }

    private renderList(): JSX.Element {
        return (<VssDetailsList
            rowStyle={VssDetailsListRowStyle.oneLine}
            items={this._getApprovalItems()}
            selectionPreservedOnEmptyClick={ true }
            setKey={"approve-multiple-environments"}
            selectionMode={SelectionMode.multiple}
            selection={ this._environmentListSelection }
            constrainMode={ConstrainMode.horizontalConstrained}
            className={"approve-environments-container"}
            layoutMode={DetailsListLayoutMode.fixedColumns}               
            columns={this._getEnvironmentColumns()}
            checkboxVisibility={CheckboxVisibility.onHover}
            ariaLabelForSelectAllCheckbox={Resources.SelectAllEnvironments}
            checkButtonAriaLabel={Resources.SelectEnvironment}/>
        );
    }

    private renderNoEnvironments(): JSX.Element {
        return (<div className="no-environments-to-approve">
            {Resources.NoEnvironmentsToApprove}
        </div>);
    }    

    @autobind
    private _setSelectedEnvironmentIds() {
        const selection = (this._environmentListSelection.getSelection()) as IEnvironmentApprovalListItem[];
        let selectedEnvironmentIds: number[] = [];
        for (let element of selection){
            selectedEnvironmentIds.push(element.environment.id);
        }

        if (!Utils_Array.shallowEquals(selectedEnvironmentIds, this.props.initialSelectedEnvironmentIds)){
            this.props.setSelectedEnvironmentIds(selectedEnvironmentIds);
        }        
    }

    private _setInitialEnvironmentSelection(initialSelectedEnvironmentIds: number[]){
        this._environmentListSelection.setChangeEvents(false);
        for (const environmentId of initialSelectedEnvironmentIds){
            this._environmentListSelection.setKeySelected(environmentId.toString(), true, false);
        } 
        this._environmentListSelection.setChangeEvents(true);
    }

    private _getApprovalItems(): IEnvironmentApprovalListItem[] {
        let items: IEnvironmentApprovalListItem[] = [];
        if (this.props.environments){
            for (const environment of this.props.environments){
                items.push(
                    {
                        key: environment.id,
                        environment: environment,
                        approval_data: this.props.approvalData[environment.id]
                    } as IEnvironmentApprovalListItem
                );
            }
        }
        return items;
    }

    private _getEnvironmentColumns(): IColumn[] {
        //TODO - defer and endpoint
        const _columns: IColumn[] = [
            {
              key: "environment",
              name: Resources.Environment,
              fieldName: "environment",
              minWidth: 100,
              maxWidth: 200,
              isResizable: true,
              columnActionsMode: ColumnActionsMode.disabled,
              onRender: this._renderEnvironment
            },
            {
                key: "currently_approving",
                name: Resources.CurrentlyApproving,
                fieldName: "currently_approving",
                minWidth: 50,
                maxWidth: 250,
                isResizable: true,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: this._renderCurrentlyApproving
            },      
            {
                key: "defer",
                name: Resources.EnvironmentStatusDeferred,
                fieldName: "defer",
                isIconOnly: true,
                minWidth: 5,
                maxWidth: 5,
                isResizable: false,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: this._renderDeferredIcon
            }, 
            {
                key: "already_approved",
                name: Resources.AlreadyApproved,
                fieldName: "already_approved",
                minWidth: 50,
                maxWidth: 100,
                isResizable: true,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: this._renderAlreadyApproved
              },       
              {
                key: "to_be_approved",
                name: Resources.ToBeApproved,
                fieldName: "to_be_approved",
                minWidth: 50,
                maxWidth: 100,
                isResizable: true,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: this._renderFutureApprovals
              },
          ];
          return _columns;
    }

    @autobind
    private _renderDeferredIcon(item: IEnvironmentApprovalListItem, index: number, column: IColumn): JSX.Element {
        const isDeferred = item.approval_data.isDeferred;
        const deferApprovalMessage = item.approval_data.deferApprovalMessage;
        const tooltipId = getId("environmentDeferredTooltip");

        return (<div className="approval-list-cell environment-deferred-container">
                {isDeferred && <div className="defer-info-icon-container">
                    <TooltipHost
                        id={tooltipId}
                        directionalHint={DirectionalHint.bottomCenter}
                        content={deferApprovalMessage}>
                        {this._getBowtieIcon("defer-info-icon", "bowtie-status-info-outline", Resources.DeferredInfo, tooltipId)}
                    </TooltipHost>
                </div>}             
            </div>);
    }

    @autobind
    private _renderEnvironment(item: IEnvironmentApprovalListItem, index: number, column: IColumn): JSX.Element{
        return (<div className="approval-list-cell environment-name-container">
                <TooltipHost 
                    content={item.environment.name} 
                    overflowMode={TooltipOverflowMode.Parent}
                    className="environment-element" >
                    <div>{item.environment.name}</div>
                </TooltipHost>       
            </div>);
    }

    @autobind
    private _renderAlreadyApproved(item: IEnvironmentApprovalListItem, index: number, column: IColumn): JSX.Element{
        let approverList: IReleaseApprovalItem[] = item.approval_data.alreadyApproved;
        return <div className="approval-list-cell already-approved-container">
                {this._renderAvatarList(approverList, false)}
            </div>;
    }

    @autobind
    private _renderCurrentlyApproving(item: IEnvironmentApprovalListItem, index: number, column: IColumn): JSX.Element{
        let approverList: IReleaseApprovalItem[] = item.approval_data.currentlyApproving;
        return <div className="approval-list-cell currently-approved-container">
                {this._renderAvatarList(approverList, true)}
            </div>;
    }

    @autobind
    private _renderFutureApprovals(item: IEnvironmentApprovalListItem, index: number, column: IColumn): JSX.Element{
        let approverList: IReleaseApprovalItem[] = item.approval_data.pendingApprovals;
        return <div className="approval-list-cell to-be-approved-container">
                {this._renderAvatarList(approverList, false)}
            </div>;
    }

    private _renderAvatarList(items: IReleaseApprovalItem[], showNames: boolean): JSX.Element{
        let profiles: IUserProfile[] = items.map((item: IReleaseApprovalItem) => {
            return {
                displayName: item.iconProps && item.iconProps.alternateText,
                url: item.iconProps && item.iconProps.url
            } as IUserProfile;
        });
        return <AvatarList instanceId={this.props.instanceId} profiles={profiles} getDetailedList={showNames} />;
    }

    private _getBowtieIcon(className: string, bowtieIcon: string, ariaLabel: string, ariaDescribedBy: string): JSX.Element {
        return <div 
            tabIndex={0}  
            aria-describedby={ariaDescribedBy}
            data-is-focusable={true} 
            aria-label={ariaLabel} 
            className={css(className, "bowtie-icon", bowtieIcon)} />;
    }

    private _environmentListSelection: Selection;

}