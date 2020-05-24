// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as React from 'react';
import * as VSS from 'VSS/VSS';
import * as Utils_String from 'VSS/Utils/String';
import * as Events_Services from 'VSS/Events/Services';
import { Component as BaseComponent, Props as IProps, State as IState } from "VSS/Flux/Component";
import Component_Base = require('VSS/Flux/Component');
import RMContracts = require('ReleaseManagement/Core/Contracts');
import { VssDetailsListTitleCell } from 'VSSUI/VssDetailsList';
import { VssIcon, VssIconType } from "VSSUI/VssIcon";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { TooltipHost, TooltipDelay,ITooltipHostProps, TooltipOverflowMode } from "VSSUI/Tooltip";
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import * as DGUtils from "ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.Common.Utils";
import "VSS/LoaderPlugins/Css!RM:ReleasePipeline/Scripts/Common/Components/ReleaseInfoTitleCell";
import { KeyboardAccesibleComponent } from "ReleasePipeline/Scripts/Common/Components/KeyboardAccessible";

export interface ReleaseInfoTitleCellProps extends Component_Base.Props{
    releaseName: string;
    releaseLink: string;
    releaseDefinition: string;
    releaseDefinitionLink: string;
    artifacts: RMContracts.Artifact[];
    iconName?: string;
    iconClassName?: string;
    iconType?: number;
    error?: string;
}

export class ReleaseInfoTitleCell extends Component_Base.Component<ReleaseInfoTitleCellProps, any> {
    public render(): JSX.Element {
        let titleCell: JSX.Element = <VssDetailsListTitleCell 
            onRenderPrimaryText = {this._getPrimaryText}
            onRenderSecondaryText= {this._getSecondaryText}
            iconProps = {{
                ariaLabel: "",
                name: 'None',
                iconName: this.props.iconName,
                iconType: this.props.iconType,
                className: this.props.iconClassName
            }}
        />

        return titleCell;
    }

    private _getPrimaryText = () : JSX.Element => {
        return <div className="releaseInfoTitleCellPrimaryText">
            <TooltipHost
                content={ Utils_String.format(Resources.ViewReleases, this.props.releaseDefinition)}
                directionalHint={DirectionalHint.bottomLeftEdge}>
                    <a href={this.props.releaseDefinitionLink} target="_blank" rel="noopener noreferrer" aria-label={Utils_String.format(Resources.ViewReleases, this.props.releaseDefinition)}>{this.props.releaseDefinition}</a>
            </TooltipHost>
            <VssIcon className="releaseInfoSeparator" iconName="ChevronRight" iconType={VssIconType.fabric} />
            <TooltipHost
                content={Utils_String.format(Resources.ViewReleaseSummaryText, this.props.releaseName)}
                directionalHint={DirectionalHint.bottomLeftEdge}>
                    <a href={this.props.releaseLink} target="_blank" rel="noopener noreferrer" aria-label={Utils_String.format(Resources.ViewReleaseSummaryText, this.props.releaseName)}>{this.props.releaseName}</a>
            </TooltipHost>
        </div>;
    }

    private _getArtifactComponent = (): JSX.Element => {
        var artifact = this._getPrimaryArtifacts(this.props.artifacts);
        var artifactComponent = (<span className="no-artifacts-with-release">{Resources.NoReleaseArtifactsDisplayMessage}</span>)
        if(artifact) {
            var branchSeparator = artifact.definitionReference.branch? <span className="artifact-details-separator">&middot;</span> : null;
            var branchDetails = artifact.definitionReference.branch ? (
                    <span aria-label={Utils_String.format(Resources.BranchName, this._getFormattedBranchName(artifact.definitionReference.branch.name))}>
                        <i className="branch-icon bowtie-icon bowtie-tfvc-branch"></i> {this._getFormattedBranchName(artifact.definitionReference.branch.name)}
                    </span>
            ): null;
            var artifactType = artifact.type;
            if(artifactType == DGUtils.artifactType.build) {
                artifactComponent = (<div className="build-artifact">
                    <i aria-label={artifact.type} className="artifact-primary-icon bowtie-icon bowtie-build"></i>
                    <span className="build-artifact-build-details">
                        <TooltipHost content={Utils_String.format(Resources.ViewBuildSummary, artifact.definitionReference.version.name)}
                            directionalHint={DirectionalHint.bottomLeftEdge}>
                                <a href={artifact.definitionReference.artifactSourceVersionUrl.id} target="_blank" rel="noopener noreferrer" 
                                                className="build-artifact-link" aria-label={Utils_String.format(Resources.ViewBuildResultText, artifact.definitionReference.version.name)}>
                                    {artifact.definitionReference.version.name}
                                </a>
                        </TooltipHost>
                    </span>
                    {branchSeparator}
                    {branchDetails}
                </div>);
            }
            else if(artifactType == DGUtils.artifactType.git || artifactType == DGUtils.artifactType.github || 
                artifactType == DGUtils.artifactType.jenkins || artifactType == DGUtils.artifactType.tfvc) {
                // using bowtie icon as the icons are unavailable in officefabric
                var artifactIconClass = DGUtils.artifactType.artifactIconClass[artifactType];
                artifactComponent = <div>
                    <i aria-label={artifact.type} className={"artifact-primary-icon " + artifactIconClass}></i>
                    <span aria-label={artifact.definitionReference.definition.name}>{artifact.definitionReference.definition.name} / {artifact.definitionReference.version.name}</span>
                    {branchSeparator}
                    {branchDetails}
                </div>;
            }
            else {
                artifactComponent = (<span>({artifact.type})  {artifact.definitionReference.definition.name}</span>);
            }
        }

        return artifactComponent;
    }

    private _getFormattedBranchName(branchName: string) {
        const refHeader = "refs/heads/";
        return branchName.indexOf(refHeader) == 0 ? branchName.substring(refHeader.length) : branchName;
    }

    private _getSecondaryText = () : JSX.Element => {
        var errorElement: JSX.Element = null;
        if(this.props.error) {
            errorElement = <KeyboardAccesibleComponent className="release-error-display" toolTip={this.props.error} onClick = {()=>{}}>
                {this.props.error}
            </KeyboardAccesibleComponent>
        }
        return <div className="releaseInfoTitleCellSecondaryText">
            {this._getArtifactComponent()}
            {errorElement}
        </div>;
    }

    private _getPrimaryArtifacts(artifacts: RMContracts.Artifact[]): RMContracts.Artifact {
        for(var artifact of artifacts) {
            if(artifact.isPrimary) {
                return artifact;
            }
        }

        return null;
    }
}