import * as React from "react";

import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";

import { INodeDetailsInfo,
    IEnvironmentSubStatusInfo,
    NodeDetailsInfoType } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";

import { INodeDetailsRenderer, ICommonRendererConfig } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/NodeDetailsRendererFactory";
import { IEnvironmentNodeSubStatusTextProps, EnvironmentNodeSubStatusText } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/EnvironmentNodeSubStatusText";
import { ReleaseEnvironmentIssuesHelper } from "PipelineWorkflow/Scripts/Shared/Environment/ReleaseEnvironmentIssuesHelper";

import { HtmlNormalizer } from "VSS/Utils/Html";
import { empty, newLine } from "VSS/Utils/String";

export class NodeDetailsSubStatusRenderer implements INodeDetailsRenderer {
    
    constructor(subStatusInfo: IEnvironmentSubStatusInfo, commonRendererConfig: ICommonRendererConfig) {
        this._subStatusInfo = subStatusInfo;
        this._commonRendererConfig = commonRendererConfig;
    }

    public getSubStatusElement(className?: string, index?: number): JSX.Element {
        if (!this._subStatusInfo || !this._subStatusInfo.data) {
            return null;
        }
        
        let childElements: JSX.Element[] = [];
        this._subStatusInfo.data.forEach((subStatus: string, index1: number) => {
            if (subStatus) {
                let subStatusProps: IEnvironmentNodeSubStatusTextProps = {
                    text: subStatus,
                    className: "cd-deployment-sub-status-text"
                };
                childElements.push(<div key={this._commonRendererConfig.instanceId + index1}>
                    <EnvironmentNodeSubStatusText {...subStatusProps} />
                </div>);
            }
        });

        let key = this._commonRendererConfig.instanceId + "-NodeDetailsSubStatusRenderer-" + (index ? index : "");
        const marginTop = (childElements.length > 1 || this._getIssuesCount() === 0) ? 15 : 0;
        let elementToReturn: JSX.Element = <div className="cd-deployment-sub-status-container" key={key} style={{marginTop: marginTop}}>
            {childElements}
        </div>;

        return elementToReturn;
    }

    public getAdditionalStatusElement(index?: number): JSX.Element {
        return null;
    }

    public getAriaLabel(): string {
       return this._subStatusInfo && this._subStatusInfo.ariaLabel;
     }

    public getRendererType(): NodeDetailsInfoType {
        return NodeDetailsInfoType.subStatusRenderer;
    }

    private _getIssuesCount(): number {
        let issuesCount: number = 0;
        if (this._commonRendererConfig.deploymentIssues) {
            const issues = ReleaseEnvironmentIssuesHelper.combineIssuesCount(this._commonRendererConfig.deploymentIssues.deploymentLevelIssues, this._commonRendererConfig.deploymentIssues.phaseLevelIssues.completedPhaseIssues);
            issuesCount = issues.errorsCount + issues.warningsCount;
        }

        return issuesCount;
    }

    private _subStatusInfo: IEnvironmentSubStatusInfo;
    private _commonRendererConfig: ICommonRendererConfig;
}