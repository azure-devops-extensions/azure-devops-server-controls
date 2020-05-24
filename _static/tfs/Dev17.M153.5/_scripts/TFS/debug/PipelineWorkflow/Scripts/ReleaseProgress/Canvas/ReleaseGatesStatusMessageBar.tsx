/// <reference types="react" />
import * as React from "react";

import { Component, IProps, IStateless } from "DistributedTaskControls/Common/Components/Base";

import { css } from "OfficeFabric/Utilities";

import { ApproversAndManualInterventionStatusMessageBar } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ApproversAndManualInterventionStatusMessageBar";
import {
    ReleaseEnvironmentGatesViewType,
    IReleaseEnvironmentGatesStatusExitConditionData
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentGatesTypes";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { IStatusProps, Statuses } from "VSSUI/Status";

export interface IReleaseGatesStatusMessageBarProps extends IProps {
    gatesViewType: ReleaseEnvironmentGatesViewType;
    gateStatusTitle: string;
    gateStatusTitleSubText: string;
    gateStatusSubText: string;
    showTimeout: boolean;
    timeoutTimeText?: string;
    canceledByUserDisplayName?: string;
    canceledByUserImageUrl?: string;
    exitConditionData?: IReleaseEnvironmentGatesStatusExitConditionData;
}

export class ReleaseGatesStatusMessageBar extends Component<IReleaseGatesStatusMessageBarProps, IStateless> {

    public render(): JSX.Element {
        return this._getGatesMessageBar();
    }

    private _getGatesMessageBar(): JSX.Element {
        let statusIconProps: IStatusProps;
        let className: string;

        switch (this.props.gatesViewType) {
            case ReleaseEnvironmentGatesViewType.NotStarted:
                className = "inactive";
                statusIconProps = Statuses.Waiting;
                break;
            case ReleaseEnvironmentGatesViewType.Stabilizing:
                className = "info";
                statusIconProps = Statuses.Waiting;
                break;

            case ReleaseEnvironmentGatesViewType.WaitingOnExitConditions:
            case ReleaseEnvironmentGatesViewType.Evaluating:
                statusIconProps = Statuses.Running;
                className = "info";
                break;
            case ReleaseEnvironmentGatesViewType.Succeeded:
                className = "success";
                statusIconProps = Statuses.Success;
                break;
            case ReleaseEnvironmentGatesViewType.Failed:
                className = "failed";
                statusIconProps = Statuses.Failed;
                break;
            case ReleaseEnvironmentGatesViewType.Canceled:
                className = "inactive";
                statusIconProps = Statuses.Canceled;
                break;

        }

        return this._getMessageBarBody(statusIconProps, className);
    }

    private _getMessageBarBody(statusIconProps: IStatusProps, statusClassName: string): JSX.Element {

        let timeoutText: string;
        const messageBarClassName = css("gates-message-bar", statusClassName);
        if (this.props.showTimeout) {
            timeoutText = this.props.gatesViewType === ReleaseEnvironmentGatesViewType.Evaluating ? Resources.TimeoutText : Resources.GateTimeoutOf;
        }

        return (
            <ApproversAndManualInterventionStatusMessageBar
                messageBarClassName={messageBarClassName}
                statusIconProps={statusIconProps}
                showTimeout={this.props.showTimeout}
                timeoutTextFormat={timeoutText}
                timeoutTimeText={this.props.timeoutTimeText}
                statusSubText={this.props.gateStatusSubText}
                statusTitleFormat={this.props.gateStatusTitle}
                statusTitleSubText={this.props.gateStatusTitleSubText}
                canceledByUserDisplayName={this.props.canceledByUserDisplayName}
                canceledByUserImageUrl={this.props.canceledByUserImageUrl}
                exitConditionData={this.props.exitConditionData} />
        );
    }
}