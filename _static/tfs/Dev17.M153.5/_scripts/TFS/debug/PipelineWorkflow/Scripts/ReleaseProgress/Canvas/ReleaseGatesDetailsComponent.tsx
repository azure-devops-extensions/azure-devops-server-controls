/// <reference types="react" />
import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";

import { DateTimeUtils } from "PipelineWorkflow/Scripts/Shared/Utils/DateTimeUtils";
import { ReleaseGatesActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseGatesActionCreator";
import { ReleaseGatesActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseGatesActions";
import { IReleaseGatesDetailsProps, ReleaseGatesDetails } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseGatesDetails";
import { IReleaseGatesStatusMessageBarProps, ReleaseGatesStatusMessageBar } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseGatesStatusMessageBar";
import { IReleaseEnvironmentGatesData, IReleaseEnvironmentGatesList, IReleaseEnvironmentGatesStatusData, IReleaseGateInfo, ReleaseEnvironmentGatesViewType } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentGatesTypes";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { IgnoredGate } from "ReleaseManagement/Core/Contracts";

import { autobind } from "OfficeFabric/Utilities";

import { ignoreCaseComparer, localeFormat } from "VSS/Utils/String";

export interface IReleaseGatesDetailsComponentProps extends Base.IProps {
    gatesData: IReleaseEnvironmentGatesData;
    environmentId: number;
    hasManageApproverPermission: boolean;
    isPreDeploymentGates: boolean;
    onClickGateResult?: (gateName: string, sampleRank: number) => void;
}

 // state is for updating the component, when user ignores a gate
interface IReleaseGatesDetailsComponentState extends Base.IState {
    toggleValue: boolean;
}

export class ReleaseGatesDetailsComponent extends Base.Component<IReleaseGatesDetailsComponentProps, IReleaseGatesDetailsComponentState> {
    constructor(props: IReleaseGatesDetailsComponentProps) {
        super(props);
        this._gatesData = this.props.gatesData;
        this.state = { toggleValue: false };
        this._actionsHub = ActionsHubManager.GetActionsHub<ReleaseGatesActions>(ReleaseGatesActions, this.props.environmentId.toString());
        this._actionsHub.updateReleaseGate.addListener(this._onUpdateIgnoredGate);
    }

    public render(): JSX.Element {
        this._updateIgnoredGates();

        return (
            <div className="gates-details-container">
                <ReleaseGatesStatusMessageBar {...this._getGatesMessageBarProps()} />
                <ReleaseGatesDetails  {...this._getGatesDetailsProps()} />
            </div>
        );
    }

    public componentWillUnmount(): void {
        this._actionsHub.updateReleaseGate.removeListener(this._onUpdateIgnoredGate);
    }

    private _getGatesMessageBarProps(): IReleaseGatesStatusMessageBarProps {
        if (this._gatesData) {
            let gatesStatus: IReleaseEnvironmentGatesStatusData = this._gatesData.gatesStatus;

            return {
                gatesViewType: gatesStatus.gatesViewType,
                gateStatusTitle: gatesStatus.gateStatusTitle,
                gateStatusTitleSubText: gatesStatus.gateStatusTitleSubText,
                gateStatusSubText: gatesStatus.gateStatusSubText,
                showTimeout: gatesStatus.showTimeout,
                timeoutTimeText: gatesStatus.timeoutTimeText,
                canceledByUserDisplayName: gatesStatus.lastModifiedUserDisplayName,
                canceledByUserImageUrl: gatesStatus.lastModifiedUserImageUrl,
                exitConditionData: gatesStatus.exitConditionData
            };
        }
    }

    private _getGatesDetailsProps(): IReleaseGatesDetailsProps {

        if (this._gatesData) {
            let gatesList: IReleaseEnvironmentGatesList = this._gatesData.gatesList;
            let gatesViewType: ReleaseEnvironmentGatesViewType = this._gatesData.gatesStatus.gatesViewType;

            // Whether we wish to highlight the latest sample depends on whether the latest sample is of evaluation phase or not
            let highlightLatestSample: boolean = false;
            if (gatesList && gatesList.gatesInfoList) {
                const validGateWithSamples = gatesList.gatesInfoList.find(g => !g.isIgnored && g.evaluationResults && g.evaluationResults.length > 0);
                if (validGateWithSamples) {
                    const evaluationResults = validGateWithSamples.evaluationResults;
                    const lastEvaluationResult = evaluationResults[evaluationResults.length - 1];
                    if (lastEvaluationResult && !lastEvaluationResult.isStabilizationResult) {
                        highlightLatestSample = true;
                    }
                }
            }

            const anyGateNotIgnored = gatesList.gatesInfoList.some((gateInfo: IReleaseGateInfo) => {
                return !gateInfo.isIgnored;
            });

            return {
                gatesInfoList: gatesList.gatesInfoList,
                gatesEvaluationTimestamps: gatesList.gatesEvaluationTimestamps,
                showSamples: gatesViewType !== ReleaseEnvironmentGatesViewType.NotStarted,
                highlightLatestSample: highlightLatestSample,
                showNextSampleTime: gatesList.showNextSampleTime && anyGateNotIgnored,
                nextSampleTimestampText: gatesList.nextSampleTimestampText,
                nextSampleTimestampTooltip: gatesList.nextSampleTimestampTooltip,
                environmentId: this.props.environmentId,
                gatesSampleRanks: gatesList.gatesSampleRanks,
                showGateActions: anyGateNotIgnored && this._isGateInProgress() && this.props.hasManageApproverPermission,
                onGateIgnore: this._onIgnoreGate,
                isPreDeploymentGates: this.props.isPreDeploymentGates,
                onClickGateResult: this.props.onClickGateResult
            };
        }
    }

    private _isGateInProgress(): boolean {
        const gateStatus = this._gatesData.gatesStatus.gatesViewType;
        return gateStatus === ReleaseEnvironmentGatesViewType.Evaluating 
               || gateStatus === ReleaseEnvironmentGatesViewType.Stabilizing
               || gateStatus === ReleaseEnvironmentGatesViewType.WaitingOnExitConditions;
    }

    private _updateIgnoredGates(): void {
        this._gatesData = this.props.gatesData;
        if (this._gatesData && this._gatesData.gatesList && this._ignoredGates) {
            for (const ignoredGate of this._ignoredGates) {
                let ignoredGateInfo = this._gatesData.gatesList.gatesInfoList.find((gateInfo) => {
                    return ignoreCaseComparer(gateInfo.name, ignoredGate.name) === 0;
                });

                if (ignoredGateInfo && !ignoredGateInfo.isIgnored) {
                    ignoredGateInfo.isIgnored = true;
                    ignoredGateInfo.description = localeFormat(Resources.GateIgnoredAt, DateTimeUtils.getLocaleTimestamp(ignoredGate.lastModifiedOn));
                }
            }
        }
    }

    @autobind
    private _onIgnoreGate(gateName: string, comment: string): void {
        const gatesActionCreator = ActionCreatorManager.GetActionCreator(ReleaseGatesActionCreator, this.props.environmentId.toString());
        gatesActionCreator.ignoreGate(this._gatesData.gatesStepId, gateName, comment);
    }

    @autobind
    private _onUpdateIgnoredGate(ignoredGate: IgnoredGate): void {
        if (this._ignoredGates) {
            this._ignoredGates.push(ignoredGate);
        }
        else {
            this._ignoredGates = [ignoredGate];
        }

        this.setState({ toggleValue: !this.state.toggleValue });
    }

    private _ignoredGates: IgnoredGate[];
    private _actionsHub: ReleaseGatesActions;
    private _gatesData: IReleaseEnvironmentGatesData;
}