import * as React from "react";

import { List } from "OfficeFabric/List";
import { css } from "OfficeFabric/Utilities";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";

import {
    IReleaseSummaryArtifact
} from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseSummaryViewStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { clone } from "VSS/Utils/Array";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseArtifactsView";

export interface IReleaseArtifactsViewProps extends Base.IProps {
    artifacts: IReleaseSummaryArtifact[];
}

export class ReleaseArtifactsView extends Base.Component<IReleaseArtifactsViewProps, Base.IStateless> {

    public render() {
        if (this.props.artifacts && this.props.artifacts.length > 0) {
            return (
                <List
                    items={clone(this.props.artifacts)}
                    onRenderCell={this._getArtifactView}
                />
            );
        }
        else {
            return this._getNoArtifactMessage();
        }
    }

    private _getArtifactView = (artifact: IReleaseSummaryArtifact, index: number) => {
        const showSeparator: boolean = index < this.props.artifacts.length - 1;

        return (
            <div className="panel-artifact-view">
                <div className="panel-artifact-view-content">
                    <div className={css("panel-artifact-icon", "bowtie-icon", artifact.icon)} />
                    <div className="release-summary-artifact-details-container">
                        <div className="artifact-details-first-row">
                            {this._getArtifactSourceAndVersion(artifact)}
                        </div>
                        <div className="artifact-details-second-row">
                            {
                                artifact.sourceBranchText &&
                                <div className="artifact-branch-section">
                                    <div className={css("panel-artifact-branch-icon", "artifact-second-row-text", "bowtie-icon", "bowtie-tfvc-branch")} />
                                    <div className="artifact-second-row-text panel-artifact-branch-text">{this._getTextElement(artifact.sourceBranchText)}</div>
                                </div>
                            }
                        </div>
                    </div>
                </div>
                {showSeparator && <div className="panel-artifact-separator" />}
            </div>
        );
    }

    private _getArtifactSourceAndVersion(artifact: IReleaseSummaryArtifact): JSX.Element {
        return (
            <div className="artifact-source-and-version">
                <div className="artifact-first-row-text artifact-version-source">{this._getLink(artifact.alias, artifact.artifactSourceUrl)}</div>
                <span className="artifact-first-row-text artifact-version-seperator">{Resources.ArtifactVersionSeperator}</span>
                <div className="artifact-first-row-text artifact-version">{this._getLink(artifact.artifactVersionText, artifact.artifactVersionUrl)}</div>
            </div>
        );
    }

    private _getLink(text: string, url?: string, ): JSX.Element {
        if (!url) {
            return this._getTextElement(text);
        } else {
            return (
                <TooltipIfOverflow tooltip={text} targetElementClassName="panel-link-element" >
                    <SafeLink href={url}
                        className="panel-link-element"
                        target="_blank">
                        {text}
                    </SafeLink>
                </TooltipIfOverflow>
            );
        }
    }

    private _getTextElement(text: string, className?: string): JSX.Element {
        if (text) {
            return (
                <TooltipIfOverflow tooltip={text} targetElementClassName="panel-text-element" >
                    <div className={css("panel-text-element", className)}>{text}</div>
                </TooltipIfOverflow>
            );
        } else {
            return null;
        }
    }

    private _getNoArtifactMessage(): JSX.Element {
        return (
            <div className="release-summary-panel-no-artifact-message">
                <div className={css("release-summary-panel-no-artifact-icon", "bowtie-icon", "bowtie-status-info-outline")} />
                <div className="release-summary-panel-no-artifact-branch-text">{Resources.ReleaseSummaryPanelNoArtifactsText}</div>
            </div>
        );
    }
}