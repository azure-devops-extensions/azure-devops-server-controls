import { IActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";

import { PlanGroupStatus, TaskOrchestrationQueuedPlanGroup } from "TFS/DistributedTask/Contracts";

export interface IHub {
    name: string;
    displayText: string;
    // Helps to have mapping for PlanGroupStatus to Text
    statusHeaderText: { [key: string]: string };
    getQueuedPlanGroups?: (props: IPlanGroupsListProps) => IPromise<TaskOrchestrationQueuedPlanGroup[]>;
}

export interface IPlanGroupsQueueDialogOptions {
    dialogTitle?: string;
    hubs: IHub[];
    selectedHubName?: string;
    selectedStatus?: PlanGroupStatus;
    showDialog?: boolean;
    errorMessage?: string;
}

export interface IPlanGroupsQueueDialogState extends IPlanGroupsQueueDialogOptions, ComponentBase.IState {
}

export interface IPlanGroupsStatusItemProps extends ComponentBase.IProps {
    displayText: string;
    // parentHubName field will be empty when isHeader is true
    parentHubName?: string;
    isHeader?: boolean;
    status?: PlanGroupStatus;
    rightPanelHeaderDetailsText?: string;
    getQueuedPlanGroups?: (props: IPlanGroupsListProps) => IPromise<TaskOrchestrationQueuedPlanGroup[]>;
}

export interface IPlanGroupsListProps extends IPlanGroupsStatusItemProps {
    hubName: string;
    status?: PlanGroupStatus;
    rightPanelHeaderDetailsText?: string;
    getQueuedPlanGroups?: (props: IPlanGroupsListProps) => IPromise<TaskOrchestrationQueuedPlanGroup[]>;
}

export interface IPlanGroupsListState extends ComponentBase.IState, IPlanGroupsListProps {
    planGroupItems: IQueuedPlanGroupItem[];
    errorMessage?: string;
}

export interface IPlanGroupsListPayload extends IActionPayload, IPlanGroupsListState {
}

export interface IQueuedPlanGroupItem extends TaskOrchestrationQueuedPlanGroup {
    queueTimeText?: string;
    startedTimeText?: string;
    durationText?: string;
}