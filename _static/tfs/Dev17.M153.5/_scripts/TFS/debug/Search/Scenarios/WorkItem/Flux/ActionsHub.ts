import { Action } from "VSS/Flux/Action";
import * as BaseActionsHub from "Search/Scenarios/Shared/Base/ActionsHub";
import * as _AgileCommon from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import * as _WorkItemContracts from "Search/Scenarios/WebApi/Workitem.Contracts";
import * as _WITContracts from "TFS/WorkItemTracking/Contracts";
import { WorkitemPreviewPaneScenario } from "Search/Scenarios/WorkItem/Flux/Stores/NotificationStore";

export namespace TreeItemAction {
    export const treeItemAction = "treeItemAction";
}

export interface IWITFieldWrapper {
    field: _WITContracts.WorkItemField;

    shortcut?: string;
}

export interface AreaNodeRetrievedPayload {
    project: string;

    areaNode: _AgileCommon.INode;
}

export interface ColorsDataPayload {
    colorsData: IDictionaryStringTo<string>;
}

export interface WorkItemFieldsRetrievedPayload {
    fields: IWITFieldWrapper[];

    text: string;
}

export interface WorkItemFieldsRetrievalFailedPayload {
    error: any;
}

export class ActionsHub extends BaseActionsHub.ActionsHub<_WorkItemContracts.WorkItemSearchRequest, _WorkItemContracts.WorkItemSearchResponse, _WorkItemContracts.WorkItemResult> {
    public areaNodeRetrieved = new Action<AreaNodeRetrievedPayload>();
    public knownAreaNodeFetched = new Action<AreaNodeRetrievedPayload>();
    public treeItemCollapsed = new Action<string>(TreeItemAction.treeItemAction);
    public areaNodeRetrievalFailed = new Action(TreeItemAction.treeItemAction);
    public treeItemExpanded = new Action<string>(TreeItemAction.treeItemAction);
    public treeItemNavigated = new Action<boolean>(TreeItemAction.treeItemAction);
    public treeSearchTextChanged = new Action<string>(TreeItemAction.treeItemAction);
    public treeDropdownDismissed = new Action(TreeItemAction.treeItemAction);
    public treeDropdownInvoked = new Action(TreeItemAction.treeItemAction);
    public updateDefaultAreaPath = new Action<string>(TreeItemAction.treeItemAction);
    public refreshTree = new Action(TreeItemAction.treeItemAction);
    public colorsDataRetrieved = new Action<ColorsDataPayload>();
    public showPreviewMessageBanner = new Action<WorkitemPreviewPaneScenario>();
    public dismissPreviewMessageBanner = new Action();
    public workItemFieldsRetrieved = new Action<WorkItemFieldsRetrievedPayload>();
    public workItemFieldsRetrievalFailed = new Action<WorkItemFieldsRetrievalFailedPayload>();
    public workItemSearchTextChanged = new Action<string>();
    public helpDropdownVisibilityChanged = new Action<boolean>();
}