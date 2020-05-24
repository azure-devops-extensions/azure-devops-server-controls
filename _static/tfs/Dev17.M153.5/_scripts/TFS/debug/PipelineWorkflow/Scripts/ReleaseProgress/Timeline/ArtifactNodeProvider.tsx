import * as React from "react";

import { Link } from "OfficeFabric/Link";

import { ReleaseArtifactsView } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseArtifactsView";
import { IReleaseSummaryArtifact } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseSummaryViewStore";
import { ReleaseDeploymentAttemptHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseDeploymentAttemptHelper";
import * as Types from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/Timeline.types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { curry } from "VSS/Utils/Core";
import { KeyCode } from "VSS/Utils/UI";
import { VssIconType, IVssIconProps } from "VSSUI/VssIcon";

import { FormatComponent } from "VSSPreview/Flux/Components/Format";

export class ArtifactNodeProvider implements Types.ITimelineSnapshotDetailsProvider {

    public constructor(
        private _snapshotMarkerDate: Date,
        private _artifactSummaryList?: IReleaseSummaryArtifact[],
        private _showCommitsDelegate?: (ev: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => void,
        private _showWorkItemsDelegate?: (ev: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => void
    ) {
    }

    public getKey(): string {
        return "artifacts-snapshot";
    }

    public getIconProps(): IVssIconProps {
        return {
            iconName: "bowtie-package",
            iconType: VssIconType.bowtie
        };
    }

    public getInitializeSnapshot(): Types.InitializeSnapshot {
        return this._initializeArtifactsSnapshot;
    }

    public getHeaderData(instanceId?: string): Types.ISnapshotHeaderData {
        return {
            name: Resources.AssociatedChangesText
        } as Types.ISnapshotHeaderData;
    }

    public getDescriptionData(): Types.SnapshotDescriptionDataType {
        return {
            descriptionElement: (
                <FormatComponent format={Resources.TimelineDescription_AssociatedChanges} elementType="div">
                    {this._getLinkElement(Resources.Commits, this._showCommitsDelegate)}
                    {this._getLinkElement(Resources.Workitems, this._showWorkItemsDelegate)}
                </FormatComponent>
            )
        } as Types.ISnapshotDescriptionData;
    }

    public getAdditionalContent(): JSX.Element {
        return (<ReleaseArtifactsView artifacts={this._artifactSummaryList} />);
    }

    private _getLinkElement(text: string, onClick?: (ev: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => void): JSX.Element {
        return (
            <Link
                onClick={(ev: React.MouseEvent<HTMLElement>) => onClick(ev)}
                onKeyDown={curry(this._handleKeyDownOnLink, onClick)}
                className="artifacts-description-link"
            >
                <span>{text.toLocaleLowerCase()}</span>
            </Link>
        );
    }

    private _handleKeyDownOnLink = (onClick: (ev: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => void, e: React.KeyboardEvent<HTMLElement>) => {
        if (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.SPACE) {
            onClick(e);
            e.stopPropagation();
            e.preventDefault();
        }
    }

    private _initializeArtifactsSnapshot = (resource: ReleaseDeploymentAttemptHelper, callback: (marker: Date) => void) => {
        callback(this._snapshotMarkerDate);
    }
}