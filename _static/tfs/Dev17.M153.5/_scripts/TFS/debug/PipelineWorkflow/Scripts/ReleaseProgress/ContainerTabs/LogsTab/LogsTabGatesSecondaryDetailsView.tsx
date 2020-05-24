/// <reference types="react" />

import * as React from "react";

import { css } from "OfficeFabric/Utilities";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";

import { ReleaseEnvironmentGatesViewType } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentGatesTypes";

import { Status, IStatusProps, StatusSize, Statuses } from "VSSUI/Status";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabGatesSecondaryDetailsView";

export interface ILogsTabGatesSecondaryDetailsViewProps extends ComponentBase.IProps {
    gatesViewType: ReleaseEnvironmentGatesViewType;
    gateStatus: string;
    gateStatusMessage: string;
    gateSecondaryMessage: string;
}

interface ISecondaryDetailsIconAndClass {
    statusIconProps: IStatusProps;
    statusClass: string;
}

export class LogsTabGatesSecondaryDetailsView extends ComponentBase.Component<ILogsTabGatesSecondaryDetailsViewProps, ComponentBase.IStateless> {

    public render(): JSX.Element {
        const gateIcon: ISecondaryDetailsIconAndClass = this._getIconNameAndStatusClass();

        return (
            <div className="gates-secondary-details">
                <span className={css("status", gateIcon.statusClass)}>
                    <Status {...gateIcon.statusIconProps} size={StatusSize.m} className="primary-icon" />
                    <span>{this.props.gateStatus}</span>
                </span>
            </div>
        );
    }

    private _getIconNameAndStatusClass(): ISecondaryDetailsIconAndClass {
        switch (this.props.gatesViewType) {
            case ReleaseEnvironmentGatesViewType.Succeeded:
                return {
                    statusIconProps: Statuses.Success,
                    statusClass: "success"
                };

            case ReleaseEnvironmentGatesViewType.Failed:
                return {
                    statusIconProps: Statuses.Failed,
                    statusClass: "failed"
                };

            case ReleaseEnvironmentGatesViewType.Canceled:
                return {
                    statusIconProps: Statuses.Canceled,
                    statusClass: "cancel"
                };
            case ReleaseEnvironmentGatesViewType.Stabilizing:
            case ReleaseEnvironmentGatesViewType.Evaluating:
            default:
                return {
                    statusIconProps: Statuses.Running,
                    statusClass: "in-progress"
                };
        }
    }
}

