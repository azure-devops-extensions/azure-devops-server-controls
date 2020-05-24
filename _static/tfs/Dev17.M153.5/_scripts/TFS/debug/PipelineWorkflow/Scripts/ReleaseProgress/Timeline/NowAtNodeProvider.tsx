import * as React from "react";

import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";

import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { SpinnerSize } from "OfficeFabric/Spinner";

import { ReleaseDeploymentAttemptHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseDeploymentAttemptHelper";
import { EnvironmentTimelineSnapshot } from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/EnvironmentTimelineSnapshot";
import * as Types from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/Timeline.types";
import { ReleaseUrlUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Utilities/ReleaseUrlUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { VssIconType, IVssIconProps } from "VSSUI/VssIcon";

import { FormatComponent } from "VSSPreview/Flux/Components/Format";

export class NowAtNodeProvider implements Types.ITimelineSnapshotDetailsProvider {

    public constructor(
        private _snapshotMarkerDate: Date,
        private _releaseId: number,
        private _releaseDefinitionId: number,
        private _environmentDefinitionId: number,
        private _nowAtReleaseId: number,
        private _nowAtReleaseName: string,
        private _nowAtReleaseError: string
    ) {
    }

    public getKey(): string {
        return "now-at-snapshot";
    }

    public getIconProps(): IVssIconProps {
        return {
            iconName: "bowtie-dot now-at-node-icon",
            iconType: VssIconType.bowtie
        };
    }


    public getInitializeSnapshot(): Types.InitializeSnapshot {
        return this._initializeNowAtSnapshot;
    }

    public getSnapshotContent(instanceId?: string, environmentTimelineSnapshotProps?: Types.IEnvironmentTimelineSnapshotProps): JSX.Element {
        if (this._nowAtReleaseError) {
            return (
                <MessageBar
                    messageBarType={MessageBarType.warning}
                    truncated={true}
                    isMultiline={true}>
                    {Resources.Timeline_NowAtNode_LoadingFailText}
                </MessageBar>
            );
        }
        else if (this._nowAtReleaseId >= 0) {
            return (<EnvironmentTimelineSnapshot {...environmentTimelineSnapshotProps} />);
        }
        else {
            return (
                <LoadingComponent
                    className="now-at-loading"
                    label={Resources.Timeline_NowAtNode_LoadingText}
                    size={SpinnerSize.large}
                />
            );
        }
    }

    public getHeaderData(instanceId?: string): Types.ISnapshotHeaderData {
        if (this._nowAtReleaseId === 0) {
            return {
                name: Resources.Timeline_NowAtNode_NoPreviousDeploymentText
            } as Types.ISnapshotHeaderData;
        }

        const releaseLink = ReleaseUrlUtils.getReleaseProgressUrl(this._nowAtReleaseId);
        return {
            headerElement: (
                <FormatComponent format={Resources.TimelineHeader_NowAtNode} elementType="div" className="snapshot-header now-at-header">
                    {this._getLinkElement(this._nowAtReleaseName, releaseLink)}
                </FormatComponent>
            )
        } as Types.ISnapshotHeaderData;
    }

    public getDescriptionData(): Types.SnapshotDescriptionDataType {
        if (this._nowAtReleaseId === 0) {
            return null;
        }

        const deploymentQueueUrl: string = ReleaseUrlUtils.getDeploymentQueueUrl(this._releaseId, this._releaseDefinitionId, this._environmentDefinitionId);
        return {
            descriptionElement: (
                <FormatComponent format={Resources.TimelineDescription_NowAtNode} elementType="div" className="now-at-description">
                    {this._getLinkElement(Resources.Timeline_AllDeploymentsText, deploymentQueueUrl)}
                </FormatComponent>
            )
        } as Types.ISnapshotDescriptionData;
    }

    public getAdditionalContent(): JSX.Element {
        return null;
    }

    private _getLinkElement(text: string, href?: string): JSX.Element {
        return (
            <TooltipIfOverflow tooltip={text} targetElementClassName="link-element" >
                <SafeLink className="now-at-message-link" href={href} target="_blank" allowRelative={true}>
                    {text}
                </SafeLink>
            </TooltipIfOverflow>
        );
    }

    private _initializeNowAtSnapshot = (resource: ReleaseDeploymentAttemptHelper, callback: (marker: Date) => void) => {
        callback(this._snapshotMarkerDate);
    }
}