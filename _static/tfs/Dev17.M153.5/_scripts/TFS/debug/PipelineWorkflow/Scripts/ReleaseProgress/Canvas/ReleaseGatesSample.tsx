import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";

import { ReleaseProgressNavigateStateActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseGatesSample";

import { KeyCode } from "VSS/Utils/UI";
import * as NavigationService from "VSS/Navigation/Services";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";
import { TooltipHost } from "VSSUI/Tooltip";

export interface IReleaseGatesSampleProps extends Base.IProps {
    environmentId: number;
    isPreDeploymentGates: boolean;
    gatesSampleRanks: number[];
    gateName: string;
    gateEvaluationIndex: number;
    ariaLabel: string;
    gateResultIconName: string;
    gateResultIconClass: string;
    resultIconBaseClass: string;
    sampleResultClass: string;
    onClickGateResult?: (gateName: string, sampleRank: number) => void;
}

export class ReleaseGatesSample extends Component<IReleaseGatesSampleProps, Base.IStateless> {

    public render(): JSX.Element {

        return (
            <div key={this.props.ariaLabel} className={this.props.sampleResultClass}>
                <TooltipHost content={this.props.ariaLabel}>
                    <div
                        className={this.props.gateResultIconClass}
                        role={"button"}
                        data-is-focusable={true}
                        aria-label={this.props.ariaLabel}
                        onClick={this._onClickGateResult}
                        onKeyDown={this._onKeyDown}>
                        <VssIcon className={this.props.resultIconBaseClass} iconName={this.props.gateResultIconName} iconType={VssIconType.fabric} />
                    </div>
                </TooltipHost>
            </div>
        );
    }

    private _onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.keyCode === KeyCode.SPACE || event.keyCode === KeyCode.ENTER) {
            this._onClickGateResult();
            event.preventDefault();
            event.stopPropagation();
        }
    }

    private _onClickGateResult = () => {
        const gateRank = (this.props.gatesSampleRanks.length > this.props.gateEvaluationIndex) ? this.props.gatesSampleRanks[this.props.gateEvaluationIndex] : null;
        if (this.props.onClickGateResult) {
            this.props.onClickGateResult(this.props.gateName, gateRank);
        }
        else {
            const data = {
                environmentId: this.props.environmentId,
                gateName: this.props.gateName,
                gateSampleRank: gateRank,
                isPreDeploymentGatesSelected: this.props.isPreDeploymentGates,
                selectGatesItemInLogsView: true
            };

            NavigationService.getHistoryService().addHistoryPoint(ReleaseProgressNavigateStateActions.ReleaseEnvironmentLogs, data, null, false, true);
        }
    }
}