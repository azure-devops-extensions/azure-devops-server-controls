
import * as Q from "q";

import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { ActionCreatorKeys } from "DistributedTaskControls/PlanGroupsQueue/Constants";
import { PlanGroupsListActions } from "DistributedTaskControls/PlanGroupsQueue/Actions/PlanGroupsListActions";
import { PlanGroupsSource } from "DistributedTaskControls/PlanGroupsQueue/PlanGroupsSource";
import { IPlanGroupsListPayload, IPlanGroupsListProps, IQueuedPlanGroupItem } from "DistributedTaskControls/PlanGroupsQueue/Types";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";

import { PlanGroupStatus, TaskOrchestrationQueuedPlanGroup } from "TFS/DistributedTask/Contracts";

import * as StringUtils from "VSS/Utils/String";
import * as VSS from "VSS/VSS";

export class PlanGroupsListActionsCreator extends ActionsBase.ActionCreatorBase {
    constructor(private _options: IPlanGroupsListProps) {
        super();
    }

    public static getKey(): string {
        return ActionCreatorKeys.PlanGroupsListActionsCreator;
    }

    public initialize() {
        this._actions = ActionsHubManager.GetActionsHub<PlanGroupsListActions>(PlanGroupsListActions);
    }

    public updatePlanGroupsList(props: IPlanGroupsListProps): void {
        let planGroupsListPayload: IPlanGroupsListPayload = { ...props, planGroupItems: [] } as IPlanGroupsListPayload;

        let progressId: number = VSS.globalProgressIndicator.actionStarted("PlanGroupsListActionsCreator.getQueuedPlanGroups", true);
        let planGroupsPromise;
        if (JQueryWrapper.isFunction(props.getQueuedPlanGroups)) {
            planGroupsPromise = <Q.Promise<TaskOrchestrationQueuedPlanGroup[]>>props.getQueuedPlanGroups(props);
        }
        else {
            planGroupsPromise = <Q.Promise<TaskOrchestrationQueuedPlanGroup[]>>PlanGroupsSource.instance().getQueuedPlanGroups(props.hubName, props.status);
        }

        // Cleaning the plangroups list when switched to a new status
        this._actions.updatePlanGroupsList.invoke(planGroupsListPayload);

        planGroupsPromise.then((planGroups: TaskOrchestrationQueuedPlanGroup[]) => {
            planGroupsListPayload.planGroupItems = planGroups.map((planGroupItem: IQueuedPlanGroupItem) => { return planGroupItem; });
        }, (error: any) => {
            planGroupsListPayload.errorMessage = VSS.getErrorMessage(error);
        }).fin(() => {
            VSS.globalProgressIndicator.actionCompleted(progressId);
            this._actions.updatePlanGroupsList.invoke(planGroupsListPayload);
        });
    }

    public dismissErrorMessage(): void {
        this._actions.dismissErrorMessage.invoke(null);
    }

    private _actions: PlanGroupsListActions;
}