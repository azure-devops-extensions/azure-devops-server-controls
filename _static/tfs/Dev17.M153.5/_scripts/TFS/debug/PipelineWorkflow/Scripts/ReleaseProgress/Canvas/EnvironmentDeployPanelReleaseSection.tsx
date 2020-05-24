/// <reference types="react" />

import * as React from "react";

import * as Utils_String from "VSS/Utils/String";

import { css, Async, autobind } from "OfficeFabric/Utilities";
import { Link } from "OfficeFabric/Link";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";

import * as Base from "DistributedTaskControls/Common/Components/Base";

import { ReleaseUrlUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Utilities/ReleaseUrlUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ICurrentlyDeployedRelease } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeployEnvironmentsPanelActions";
import { ToBeDeployed } from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { Status, StatusSize } from "VSSUI/Status";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/EnvironmentDeployPanelReleaseSection";

export interface IReleaseEnvironmentNodeActionsCommandBarProps extends Base.IProps {
    releaseToCompare: ICurrentlyDeployedRelease;
    toBeDeployedReleaseId: number;
    toBeDeployedReleaseName: string;
    showDetailedReleaseSection: boolean;
}

export class EnvironmentDeployPanelReleaseSection extends Base.Component<IReleaseEnvironmentNodeActionsCommandBarProps, Base.IStateless> {
    public render(): JSX.Element {
        const releaseToCompare = this.props.releaseToCompare;
        const showDetailed = this.props.showDetailedReleaseSection && releaseToCompare && releaseToCompare.id !== 0;
        let element = showDetailed ? this._getDetailedReleaseSections() : this._getSimpleReleaseSection();
        return element;
    }

    private _getSimpleReleaseSection(): JSX.Element {
        let toBeDeployedReleaseId = this.props.toBeDeployedReleaseId;
        let toBeDeployedReleaseName = this.props.toBeDeployedReleaseName;
        return (
            <div className="deploy-panel release-section">
                <div className="to-be-deployed">
                    <div className="release-header to-be-deployed-header">
                        <div className="header-text to-be-deployed-header-text">{Resources.ToBeDeployed}</div>
                        <div className="header-info to-be-deployed-header-info">{Resources.FirstTimeDeployment}</div>
                    </div>
                    <div className="release-content-simple to-be-deployed-content">
                        {toBeDeployedReleaseName}
                    </div>
                </div>
            </div>
        );
    }

    private _getDetailedReleaseSections(): JSX.Element {
        let releaseToCompare = this.props.releaseToCompare;
        let toBeDeployedReleaseId = this.props.toBeDeployedReleaseId;
        let toBeDeployedReleaseName = this.props.toBeDeployedReleaseName;
        const isCurrentlyDeployed = releaseToCompare && releaseToCompare.id !== 0;
        const isReDeployment = toBeDeployedReleaseId === releaseToCompare.id ;
        return (
            <div className="deploy-panel release-section">
                {isCurrentlyDeployed &&
                    <div className="currently-deployed">
                        <div className="release-header currently-deployed-header">
                            {this._getBowtieIcon("header-icon currently-deployed-header-icon", "bowtie-radio-button-empty")}
                            <div className="header-text currently-deployed-header-text">{Resources.CurrentlyDeployed}</div>
                        </div>
                        <div className="release-content currently-deployed-content">
                            {isReDeployment && releaseToCompare.name}
                            {!isReDeployment && this._getLink(releaseToCompare.id, releaseToCompare.name)}
                            {this._getBowtieIcon("seperator-icon", "bowtie-dot")}
                            <div className="description-text currently-deployed-description-text">
                                <span className="deployment-status">
                                    <Status {...releaseToCompare.deploymentStatusIconProps} size={StatusSize.s}/>
                                </span>
                                <div>{Utils_String.format(Resources.OldDeploymentStatus, releaseToCompare.deploymentStatus.toString(), releaseToCompare.completedOn)}</div>
                            </div>
                        </div>
                    </div>
                }
                <div className="to-be-deployed">
                    <div className="release-header to-be-deployed-header">
                        {this._getBowtieIcon("header-icon to-be-deployed-header-icon", "bowtie-dot")}
                        <div className="header-text to-be-deployed-header-text">{Resources.ToBeDeployed}</div>
                        {!isCurrentlyDeployed && <div className="header-info to-be-deployed-header-info">{Resources.FirstTimeDeployment}</div>}
                    </div>
                    <div className="release-content to-be-deployed-content">
                        {toBeDeployedReleaseName}
                    </div>
                </div>
            </div>
        );
    }

    private _getBowtieIcon(className: string, bowtieIcon: string): JSX.Element {
        return <div className={css(className, "bowtie-icon", bowtieIcon)} />;
    }

    private _getLink(releaseId: number, releaseName: string): JSX.Element {
        let releaseLink = ReleaseUrlUtils.getReleaseProgressUrl(releaseId);
        return (
            <TooltipIfOverflow tooltip={releaseName} targetElementClassName="link-element" >
                <SafeLink className="release-link" href={releaseLink} target="_blank" allowRelative={true}>
                    {releaseName}
                </SafeLink>
            </TooltipIfOverflow>
        );
    }
}