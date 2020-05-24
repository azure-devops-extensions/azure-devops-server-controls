import { IStoreState, StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { autobind } from "OfficeFabric/Utilities";

import { ReleaseStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseStore";
import { ReleaseEnvironmentStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentStore";
import { ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";
import { ReleaseEnvironmentHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentHelper";
import {
    ApprovalExecutionOrderIndicator,
    IReleaseEnvironmentStatusInfo,
    IDeploymentConditionsInfo,
    OverallStatusIndicator,
    ReleaseGatesStatusIndicator,
    ReleaseIndicatorType,
    ReleaseApprovalStatusIndicator
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { IStatusProps, Statuses } from "VSSUI/Status";

export interface IReleaseConditionDetailsViewState extends IStoreState {
    id: number;
    definitionEnvironmentId: number;
    name: string;
    statusInfo: IReleaseEnvironmentStatusInfo;
    description: string;
    descriptionIconProps: IStatusProps;
    canShowApprovals: boolean;
    canShowGates: boolean;
    defaultPivot?: ReleaseIndicatorType;
}

export abstract class ReleaseConditionDetailsViewStore extends StoreBase {

    public initialize(instanceId: string): void {

        this._state = {} as IReleaseConditionDetailsViewState;

        this._releaseEnvironmentStore = StoreManager.GetStore<ReleaseEnvironmentStore>(ReleaseEnvironmentStore, instanceId);
        this._releaseEnvironmentStore.addChangedListener(this._onDataStoreChanged);

        this._onDataStoreChanged();
    }

    protected disposeInternal(): void {
        this._releaseEnvironmentStore.removeChangedListener(this._onDataStoreChanged);
    }

    public getState(): IReleaseConditionDetailsViewState {
        return this._state;
    }

    public getReleaseId(): number {
        let releaseEnvironment = this._releaseEnvironmentStore.getEnvironment();
        return releaseEnvironment.releaseId;
    }

    public getReleaseEnvironmentId(): number {
        let releaseEnvironment = this._releaseEnvironmentStore.getEnvironment();
        return releaseEnvironment.id;
    }

    private _onDataStoreChanged = (): void => {
        let releaseEnvironment: ReleaseEnvironment = this._releaseEnvironmentStore.getEnvironment();

        if (releaseEnvironment) {
            const releaseEnvironmentHelper: ReleaseEnvironmentHelper = new ReleaseEnvironmentHelper(releaseEnvironment);
            const statusInfo: IReleaseEnvironmentStatusInfo = this._releaseEnvironmentStore.getStatusInfo();

            if (!this._state ||
                this._hasStateChanged(releaseEnvironment, statusInfo)) {
                let conditionInfo: IDeploymentConditionsInfo = this.getConditionInfo(statusInfo);

                const canShowApprovals: boolean = !!(conditionInfo && conditionInfo.approvalInfo);
                const canShowGates: boolean = !!(conditionInfo && conditionInfo.gatesInfo);
                const gatesInProgress: boolean = this._gatesInProgress(conditionInfo);
                let defaultPivot: ReleaseIndicatorType = this._getDefaultPivot(canShowApprovals, canShowGates, conditionInfo, gatesInProgress);

                this._state = {
                    id: releaseEnvironment.id,
                    definitionEnvironmentId: releaseEnvironment.definitionEnvironmentId,
                    name: releaseEnvironment.name,
                    statusInfo: statusInfo,
                    description: this._getDescription(conditionInfo, statusInfo),
                    descriptionIconProps: this._getDescriptionIconProps(conditionInfo),
                    canShowApprovals: canShowApprovals,
                    canShowGates: canShowGates,
                    defaultPivot: defaultPivot
                };

                this.emitChanged();
            }
        }
    }

    private _getDescriptionIconProps(conditionInfo: IDeploymentConditionsInfo): IStatusProps {
        if (conditionInfo && conditionInfo.overallStatusIndicator) {
            switch (conditionInfo.overallStatusIndicator.overallStatus) {
                case OverallStatusIndicator.Pending:
                    return null;
                case OverallStatusIndicator.InProgress:
                    if (conditionInfo.approvalInfo &&
                        conditionInfo.approvalInfo.statusIndicator === ReleaseApprovalStatusIndicator.ReadyForAction) {
                        return Statuses.Waiting;
                    }
                    else {
                        return Statuses.Running;
                    }
                case OverallStatusIndicator.Succeeded:
                    return Statuses.Success;
                case OverallStatusIndicator.Failed:
                    return Statuses.Failed;
            }
        }
    }

    private _getDescription(conditionInfo: IDeploymentConditionsInfo, statusInfo: IReleaseEnvironmentStatusInfo): string {
        if (conditionInfo && conditionInfo.overallStatusIndicator) {
            switch (conditionInfo.overallStatusIndicator.overallStatus) {
                case OverallStatusIndicator.Pending:
                    return Resources.OverallApprovalsNotDeployed;
                case OverallStatusIndicator.InProgress:
                    return statusInfo ? statusInfo.statusText : Resources.OverallApprovalsNotDeployed;
                case OverallStatusIndicator.Succeeded:
                    return Resources.EnvironmentStatusSucceeded;
                case OverallStatusIndicator.Failed:
                    return Resources.EnvironmentStatusFailed;
            }
        }
        return Resources.OverallApprovalsNotDeployed;
    }

    private _gatesInProgress(conditionInfo: IDeploymentConditionsInfo): boolean {
        if (conditionInfo && conditionInfo.gatesInfo) {
            let gatesInfo = conditionInfo.gatesInfo;
            if (gatesInfo.statusIndicator === ReleaseGatesStatusIndicator.InProgress) {
                return true;
            }
        }
        return false;
    }

    private _hasStateChanged(releaseEnvironment: ReleaseEnvironment, statusInfo: IReleaseEnvironmentStatusInfo): boolean {
        if (this._state.id !== releaseEnvironment.id ||
            this._state.definitionEnvironmentId !== releaseEnvironment.definitionEnvironmentId ||
            this._state.name !== releaseEnvironment.name ||
            !ReleaseEnvironmentHelper.areStatusEqual(this._state.statusInfo, statusInfo)) {
            return true;
        }

        return false;
    }

    private _getDefaultPivot(canShowApprovals: boolean, canShowGates: boolean, conditionInfo: IDeploymentConditionsInfo, gatesInProgress: boolean): ReleaseIndicatorType {
        let defaultPivot: ReleaseIndicatorType;

        if (!conditionInfo) {
            // This should not happen, one repro that we found when this happens is when attempt 1 has approvals and failed.
            // You then edit and disable approvals and redeploy while tab is open.
            defaultPivot = ReleaseIndicatorType.Approval;
        }
        else if (canShowApprovals !== canShowGates) {
            // If either of gates and approvals are present, show the respective pivot
            defaultPivot = canShowApprovals ? ReleaseIndicatorType.Approval : ReleaseIndicatorType.Gate;
        }
        else {
            const gateStatus: ReleaseGatesStatusIndicator = conditionInfo.gatesInfo.statusIndicator;

            /**
             * We should open the gates pivot by default if 
             * 1. Gates are in progress
             * OR
             * 2. Gates have failed AND execution order between gates and approvals is not set to overriding gates
             */
            if (gatesInProgress || (gateStatus === ReleaseGatesStatusIndicator.Failed &&
                (conditionInfo && conditionInfo.executionOrder && conditionInfo.executionOrder !== ApprovalExecutionOrderIndicator.AfterGatesAlways))) {
                defaultPivot = ReleaseIndicatorType.Gate;
            }
            else {
                defaultPivot = ReleaseIndicatorType.Approval;
            }
        }

        return defaultPivot;
    }

    protected abstract getConditionInfo(statusInfo: IReleaseEnvironmentStatusInfo): IDeploymentConditionsInfo;

    protected _state: IReleaseConditionDetailsViewState;
    private _releaseEnvironmentStore: ReleaseEnvironmentStore;
}

