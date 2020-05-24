import * as React from "react";

import { GatesType } from "PipelineWorkflow/Scripts/Common/Types";
import {
    INodeDetailsGatesInfo,
    NodeDetailsInfoType,
    INodeDetailsReleaseGatesPhaseInfo
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { INodeDetailsRenderer, ICommonRendererConfig } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/NodeDetailsRendererFactory";
import { INodeDetailsGatesStatusProps, NodeDetailsGatesStatus } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/NodeDetailsGatesStatus";
import { ReleaseEnvironmentHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentHelper";
import { PhaseIndexWithCountLabel } from "PipelineWorkflow/Scripts/SharedComponents/Environment/PhaseIndexWithCountLabel";

import { css } from "VSS/Platform/Layout";
import { HtmlNormalizer } from "VSS/Utils/Html";
import { empty, newLine } from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/NodeDetailsGatesRenderer";

export class NodeDetailsGatesRenderer implements INodeDetailsRenderer {
    
    constructor(gatesInfo: INodeDetailsGatesInfo, commonRendererConfig: ICommonRendererConfig) {
        this._gatesInfo = gatesInfo;
        this._commonRendererConfig = commonRendererConfig;
        this._isPhaseType = gatesInfo.gatesType === GatesType.Deploy;
    }

    public getSubStatusElement(className?: string, index?: number): JSX.Element {

        let gatesStatusDom: JSX.Element = null;
        if (this._gatesInfo.stabilizationMessage) {
            // Stabilization phase message
            gatesStatusDom = <div className="stabilization-message">
                {this._gatesInfo.stabilizationMessage}
            </div>;
        }
        else {
            // Evaluation phase status
            let timeoutMessage: JSX.Element = null;

            if (this._gatesInfo.timeoutMessage && this._gatesInfo.timeoutMessageAriaLabel) {
                let timeoutText: string = this._gatesInfo.timeoutMessage;

                let subSpan = (
                    <span>{timeoutText}</span>
                );

                timeoutMessage = <div className="gates-timeout-message">
                    <span className="bowtie-icon bowtie-stopwatch"></span>
                    {subSpan}
                </div>;
            }

            const gatesStatusProps: INodeDetailsGatesStatusProps = {
                gatesInfo: this._gatesInfo
            };

            gatesStatusDom = <div>
                <NodeDetailsGatesStatus {...gatesStatusProps} />
                {timeoutMessage}
            </div>;
        }

        const key = this._commonRendererConfig.instanceId + "-NodeDetailsGates-" + (index ? index : empty);
        const phaseHeaderContent = this._getPhaseHeaderDetails(); // applicable only for gates phase
        const outerClassName = css("cd-release-environment-inprogress-details-container", phaseHeaderContent ? "" : "cd-environment-in-progress-single-phase-details");

        return (
            <div className={outerClassName}>
                {phaseHeaderContent}
                <div className="cd-environment-gates-status-container" key={key}>
                    {gatesStatusDom}
                </div>
            </div>
        );
    }
    
    public getAdditionalStatusElement(index?: number): JSX.Element {
        return null;
    }

    public getAriaLabel(): string {
        if (this._gatesInfo.stabilizationMessage && this._gatesInfo.stabilizationAriaLabel) {
            return this._gatesInfo.stabilizationAriaLabel;
        }
        else {
            let ariaLabelTexts: string[] = [];

            if (this._gatesInfo.succeededGatesCount) {
                ariaLabelTexts.push(this._gatesInfo.succeededGatesCount);
                ariaLabelTexts.push(this._gatesInfo.succeededGatesCountSubText);
            }
            else {
                if (this._gatesInfo.failedGatesCount) {
                    ariaLabelTexts.push(this._gatesInfo.failedGatesCount);
                }
                ariaLabelTexts.push(this._gatesInfo.failedGatesCountSubText);
            }
            ariaLabelTexts.push(this._gatesInfo.nextSampleAriaLabel);
            if (this._gatesInfo.timeoutMessage && this._gatesInfo.timeoutMessageAriaLabel) {
                ariaLabelTexts.push(this._gatesInfo.timeoutMessageAriaLabel);
            }

            const concatenated = ariaLabelTexts.join(" ");
            let plainText = HtmlNormalizer.convertToPlainText(concatenated);
            return plainText.replace(newLine, empty);
        }
    }

    public getRendererType(): NodeDetailsInfoType {
        return NodeDetailsInfoType.gatesRenderer;
    }

    private _getPhaseHeaderDetails(): JSX.Element {
        let headerContent: JSX.Element = null;
        if (this._isPhaseType) {
            const phaseInfo = this._gatesInfo as INodeDetailsReleaseGatesPhaseInfo;
            if (phaseInfo && phaseInfo.inProgressStatusData) {
                const phaseCount = phaseInfo.inProgressStatusData.phaseCount;
                // show label like, 1/2 phases, when more than one phase exist
                if (phaseCount && phaseCount > 1) {
                    const { phaseStatus, phaseIndex } = ReleaseEnvironmentHelper.getInProgressPhase(phaseInfo.inProgressStatusData);
                    headerContent = <PhaseIndexWithCountLabel phaseIndex={phaseIndex} phaseCount={phaseCount} />;
                }
            }
        }

        return headerContent;
    }

    private _gatesInfo: INodeDetailsGatesInfo;
    private _commonRendererConfig: ICommonRendererConfig;
    private _isPhaseType: boolean;
}