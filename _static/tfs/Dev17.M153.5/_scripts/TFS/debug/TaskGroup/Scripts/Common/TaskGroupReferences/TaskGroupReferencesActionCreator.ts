import * as Q from "q";

import { getDefaultWebContext } from "VSS/Context";
import { getService } from "VSS/Service";
import { ExtensionService } from "VSS/Contributions/Services";
import { getBackgroundInstance as getExtensionBackgroundInstance } from "VSS/Contributions/Controls";

import { ITaskGroupReferencesProvider, ITaskGroupReferenceGroup } from "DistributedTask/TaskGroups/ExtensionContracts";

import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ContributionSource } from "DistributedTaskControls/Sources/ContributionSource";

import {
    TaskGroupReferencesActionsHub,
    ITaskGroupReferencesPayload
} from "TaskGroup/Scripts/Common/TaskGroupReferences/TaskGroupReferencesActionsHub";
import { TaskGroupReferencesActionCreatorKeys, ContributionIds } from "TaskGroup/Scripts/Common/Constants";

export class TaskGroupReferencesActionCreator extends ActionCreatorBase {
    public static getKey(): string {
        return TaskGroupReferencesActionCreatorKeys.TaskGroupReferenceActionCreator;
    }

    public initialize(instanceId?: string): void {
        this._taskGroupReferencesActionsHub = ActionsHubManager.GetActionsHub<TaskGroupReferencesActionsHub>(TaskGroupReferencesActionsHub);
    }

    public resetAllReferences(): void {
        this._taskGroupReferencesActionsHub.resetAllReferences.invoke(null);
    }

    public getAllContributedReferences(taskGroupId: string): void {
        if (!this._referenceContributions) {
            ContributionSource.instance().getContributions(ContributionIds.TaskGroupReferencesTarget, ContributionIds.TaskGroupReferencesType)
                .then((contributions: IExtensionContribution[]) => {
                    this._referenceContributions = contributions;
                    this._getReferencesFromContributions(taskGroupId);
                },
                (error) => {
                    // TODO - handle errors
                });
        }
        else {
            this._getReferencesFromContributions(taskGroupId);
        }
    }

    private _getReferencesFromContributions(taskGroupId: string): void {
        const contributionPromises = this._referenceContributions.map((contribution: IExtensionContribution) => {
            const order = contribution.properties.order || 1000;

            return ContributionSource.instance().getContributionResult<ITaskGroupReferencesProvider>(contribution)
                .then((result: ITaskGroupReferencesProvider) => {
                    if (result.fetchTaskGroupReferences) {
                        return result.fetchTaskGroupReferences(taskGroupId)
                            .then((referenceGroup: ITaskGroupReferenceGroup) => {
                                return {
                                    ...referenceGroup,
                                    order: order
                                }
                            });
                    }
                }, (error) => {
                    //TODO - handle errors
                });
        });

        Q.allSettled(contributionPromises).then((promiseStates: Q.PromiseState<any>[]) => {
            let referenceGroups = [];
            promiseStates.forEach((promiseState) => {
                if (promiseState.state === "fulfilled" && !!promiseState.value) {
                    referenceGroups.push(promiseState.value);
                }
            });

            const sortedReferenceGroups = referenceGroups.sort((r1, r2) => r1.order - r2.order);

            this._taskGroupReferencesActionsHub.getTaskGroupReferences.invoke({
                referenceGroups: sortedReferenceGroups
            } as ITaskGroupReferencesPayload);
        });
    }

    private _getErrorMessage(error): string {
        if (!error) {
            return null;
        }

        return error.message || error;
    }

    private _referenceContributions: IExtensionContribution[];
    private _taskGroupReferencesActionsHub: TaskGroupReferencesActionsHub;
}