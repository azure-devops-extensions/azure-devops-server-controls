import { IStatus, IJobItem, JobStates, JobType } from "DistributedTaskUI/Logs/Logs.Types";
import { NavigationStateUtils } from "PipelineWorkflow/Scripts/Common/NavigationStateUtils";
import {
    ReleaseDeploymentAttemptHelper,
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseDeploymentAttemptHelper";
import * as PipelineResources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import { Statuses } from "VSSUI/Status";

export class DeploymentAttemptsHelper {

    public static getDeploymentViewStatus(state: ReleaseContracts.DeploymentStatus): IStatus {

        let iconName: string = Utils_String.empty;
        let statusProps = Statuses.Queued;

        switch (state) {
            case ReleaseContracts.DeploymentStatus.NotDeployed:
                statusProps = Statuses.Queued;
                break;
            case ReleaseContracts.DeploymentStatus.Succeeded:
                statusProps = Statuses.Success;
                break;
            case ReleaseContracts.DeploymentStatus.Failed:
                statusProps = Statuses.Failed;
                break;
            case ReleaseContracts.DeploymentStatus.InProgress:
                statusProps = Statuses.Running;
                break;
            case ReleaseContracts.DeploymentStatus.PartiallySucceeded:
                statusProps = Statuses.Warning;
                break;
            case ReleaseContracts.DeploymentStatus.Undefined:
                statusProps = Statuses.Waiting;
                break;
        }

        return {
            iconName: iconName,
            status: ReleaseDeploymentAttemptHelper.getStatusText(state),
            statusProps: statusProps
        };
    }

    public static getSpecificAttemptApprovals(approvals: ReleaseContracts.ReleaseApproval[], selectedAttemptNumber: number): ReleaseContracts.ReleaseApproval {
        let specificAttemptApproval: ReleaseContracts.ReleaseApproval = null;
        for (const approval of approvals) {
            if (approval && approval.attempt === selectedAttemptNumber) {
                specificAttemptApproval = approval;
                break;
            }
        }

        return specificAttemptApproval;
    }

    public static getAttemptDisplayName(attempts: ReleaseContracts.DeploymentAttempt[], selectedAttempt: number): string {
        if (attempts) {
            if (attempts.length > 1 && selectedAttempt > 0) {
                return Utils_String.localeFormat(PipelineResources.AttemptPropertiesLabel, selectedAttempt);
            } else {
                return PipelineResources.DeploymentPropertiesLabel;
            }
        }
        return Utils_String.empty;
    }

    public static getDefaultSelectedJobItemInAttempt(environment: ReleaseContracts.ReleaseEnvironment, items: IJobItem[], selectedAttemptNumber: number): string {

        let selectedItemKey: string = Utils_String.empty;

        if (environment && selectedAttemptNumber > 0 && items && items.length > 0) {
            const attempts = environment.deploySteps;
            const selectedAttempt = ReleaseDeploymentAttemptHelper.getDeploymentAttemptForAttemptNumber(attempts, selectedAttemptNumber);
            if (selectedAttempt) {
                selectedItemKey = this._getJobItemKeyToSelectFromNavigation(items);

                if (!selectedItemKey) {
                    selectedItemKey = this._getGatesItemKeyIfItHasToBeSelected(items);
                }

                if (!selectedItemKey) {
                    switch (selectedAttempt.status) {
                        case ReleaseContracts.DeploymentStatus.InProgress:
                            selectedItemKey = this._getSelectedItemKeyForInProgressState(items);
                            break;
                        case ReleaseContracts.DeploymentStatus.NotDeployed:
                            selectedItemKey = this._getDefaultItemForNotDeployedAttempt(items);
                            break;
                        case ReleaseContracts.DeploymentStatus.Succeeded:
                            selectedItemKey = this._getDefaultItemForSucceededAttempt(items);
                            break;
                        case ReleaseContracts.DeploymentStatus.Failed:
                        case ReleaseContracts.DeploymentStatus.PartiallySucceeded:
                            selectedItemKey = this._getDefaultItemForFailedOrPartiallySucceededAttempt(items);
                            break;
                        case ReleaseContracts.DeploymentStatus.Undefined:
                            selectedItemKey = this._getDefaultItemForUndefinedAttempt(items);
                            break;
                    }
                }
            }
        }

        return selectedItemKey;
    }

    private static _getSelectedItemKeyForInProgressState(items: IJobItem[]): string {
        if (NavigationStateUtils.selectFirstErrorFromAllPhases()) {
            return this._getDefaultItemForFailedOrPartiallySucceededAttempt(items);
        } else {
            return this._getDefaultItemForInProgressOrNotDeployedAttempt(items);
        }
    }

    private static _getDefaultItemForNotDeployedAttempt(items: IJobItem[], additionalJobStates?: JobStates[]): string {
        return this._getDefaultItemForInProgressOrNotDeployedAttempt(items, [JobStates.GatesFailed, JobStates.Rejected]);
    }

    private static _getDefaultItemForInProgressOrNotDeployedAttempt(items: IJobItem[], additionalJobStates?: JobStates[]): string {
        let jobStates = [JobStates.InProgress, JobStates.ApprovalPending, JobStates.Cancelling, JobStates.Pending, JobStates.Reassigned, JobStates.EvaluatingGates];
        if (additionalJobStates) {
            jobStates = jobStates.concat(additionalJobStates);
        }
        return this._getDefaultItemForAttemptWithState(items, jobStates);
    }

    private static _getDefaultItemForSucceededAttempt(items: IJobItem[]): string {
        return this._getDefaultItemForAttemptWithState(items, [JobStates.Approved, JobStates.AutomatedApproval, JobStates.Succeeded, JobStates.GatesSucceded]);
    }

    private static _getDefaultItemForFailedOrPartiallySucceededAttempt(items: IJobItem[]): string {
        return this._getDefaultItemForAttemptWithState(items, [JobStates.Failed, JobStates.Cancelled, JobStates.PartiallySucceeded, JobStates.Rejected, JobStates.GatesFailed]);
    }

    private static _getDefaultItemForUndefinedAttempt(items: IJobItem[]): string {
        return this._getDefaultItemForAttemptWithState(items, [JobStates.Undefined]);
    }

    private static _getDefaultItemForAttemptWithState(items: IJobItem[], states: JobStates[]): string {
        let selectedKey: string = null;
        if (items && items.length > 0) {
            let firstItem: IJobItem = Utils_Array.first(items, (item) => {
                let isAcceptableState: boolean = false;
                for (let state of states) {
                    if (item.jobState === state) {
                        isAcceptableState = true;
                        break;
                    }
                }
                return isAcceptableState;
            });

            if (firstItem) {
                selectedKey = firstItem.id;
            }
        }
        return selectedKey;
    }

    private static _getGatesItemKeyIfItHasToBeSelected(items: IJobItem[]): any {
        let selectedKey: string = null;

        if (NavigationStateUtils.selectGatesItemInLogsView()) {
            let targetJobType = NavigationStateUtils.isPreDeploymentGatesSelected() ? JobType.PreDeploymentGateJob : JobType.PostDeploymentGateJob;
            let gateJobItem = Utils_Array.first(items, (item) => item.jobType === targetJobType);
            if (gateJobItem) {
                selectedKey = gateJobItem.id;
            }
        }

        return selectedKey;
    }

    private static _getJobItemKeyToSelectFromNavigation(items: IJobItem[]): string {
        const jobTimelineRecordIdToSelect: string = NavigationStateUtils.getJobTimelineRecordIdToSelect();
        let jobItemForTimelineRecordId: IJobItem = null;

        if (items && items.length > 0) {
            jobItemForTimelineRecordId = items.find(item => item.id === jobTimelineRecordIdToSelect);
        }

        return !!jobItemForTimelineRecordId ? jobTimelineRecordIdToSelect : Utils_String.empty;
    }
}
