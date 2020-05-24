import * as React from "react";

import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";

import * as Base from "DistributedTaskControls/Common/Components/Base";

import { INodeDetailsGatesInfo } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";

export interface INodeDetailsGatesStatusProps extends Base.IProps {
    gatesInfo: INodeDetailsGatesInfo;
}

export class NodeDetailsGatesStatus extends Base.Component<INodeDetailsGatesStatusProps, Base.IStateless> {

    public render(): JSX.Element {
        
        let splitLeftContent: JSX.Element = null;
        // If there is a success count, we are probably waiting on exit conditions
        if (this.props.gatesInfo.succeededGatesCount) {
            splitLeftContent = this._getSuccessGateContent();
        }
        else {
            splitLeftContent = this._getFailedGateContent();
        }
        
        let domToReturn: JSX.Element = <div className="gates-status-split" aria-hidden="true">
            {splitLeftContent}
            <div className="gates-separator" />
            <div className="gates-status-right">
                <div className="sample-time">{this.props.gatesInfo.nextSampleTime}</div>
                <TooltipIfOverflow tooltip={this.props.gatesInfo.nextSampleSubText} targetElementClassName="subtext-tooltip" cssClass="subtext-tooltip">
                    <div className="subtext">{this.props.gatesInfo.nextSampleSubText}</div>
                </TooltipIfOverflow>
            </div>
        </div>;

        return domToReturn;
    }

    private _getSuccessGateContent(): JSX.Element {
        return (
            <div className="gates-status-left">
                <div className="succeeded-gates">{this.props.gatesInfo.succeededGatesCount}</div>
                <TooltipIfOverflow tooltip={this.props.gatesInfo.succeededGatesCountSubText} targetElementClassName="subtext-tooltip" cssClass="subtext-tooltip">
                    <div className="subtext">{this.props.gatesInfo.succeededGatesCountSubText}</div>
                </TooltipIfOverflow> 
            </div>
            );
    }

    private _getFailedGateContent(): JSX.Element {
        let failedGatesSubText: JSX.Element = null;

        // If there's no failed gates count but failed gates subtext is present, that's the 'no samples present' message.
        // We need to style that differently to span multiple lines unlike other subtexts.
        if (!this.props.gatesInfo.failedGatesCount) {
            failedGatesSubText = <div className="subtext multiline">{this.props.gatesInfo.failedGatesCountSubText}</div>;
        }
        else {
            failedGatesSubText = <div className="subtext">{this.props.gatesInfo.failedGatesCountSubText}</div>;
        }

        return (
            <div className="gates-status-left">
                <div className="failed-gates">{this.props.gatesInfo.failedGatesCount}</div>
                <TooltipIfOverflow tooltip={this.props.gatesInfo.failedGatesCountSubText} targetElementClassName="subtext-tooltip" cssClass="subtext-tooltip">
                    {failedGatesSubText}
                </TooltipIfOverflow> 
            </div>
            );
    }
}