import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";

import { IssueType } from "DistributedTaskUI/Logs/Logs.Types";

import { ReleaseDeploymentAttemptHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseDeploymentAttemptHelper";
import { IReleaseEnvironmentActionInfo } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { ArtifactNodeProvider } from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/ArtifactNodeProvider";
import { NowAtNodeProvider } from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/NowAtNodeProvider";
import { TriggerDefinitionNodeProvider } from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/TriggerDefinitionNodeProvider";

import { Artifact, EnvironmentExecutionPolicy, ReleaseEnvironment, ReleaseReason } from "ReleaseManagement/Core/Contracts";

import { VssIconType, IVssIconProps } from "VSSUI/VssIcon";

/*
 ****************************************************************************************
 * The types in this file should be kept in sync with build timeline shared control types
 ****************************************************************************************
 */

export interface ITimelineProps {
    /**
     * Resource that has to be sent to all snapshots.
     * Snapshots can use this resource to determine the marker (Date) they belong to, there by allowing Timeline to position snapshots.
     */
    resource: ReleaseDeploymentAttemptHelper;

    /**
     * If specified, components targetting this region will be grabbed and displayed as snapshots.
     * Note that this will be considered when the component mounts, subsequent changes won't be honored.
     */
    regionForSnapshots?: string;

    className?: string;
}

export type SnapshotCallBack = (marker: Date) => void;
export type InitializeSnapshot = (resource: ReleaseDeploymentAttemptHelper, callback: SnapshotCallBack) => void;

export interface ITimelineIconProps {
    /**
     * Icon name that will be displayed to the left of the snapshot.
     * Ensure that css responsible for loading the icon is loaded with the component.
     */
    name: string;
    /**
     * The type of the icon.
     * This determines what font-family to load
     */
    type: VssIconType;
    /**
     * Class name for the icon.
     * This determines the style for the icon
     */
    className: string;
}

export interface ITimelineSnapshotWrapperProps extends Base.IProps {
    /**
     * Unique key given for this snapshot.
     * This must be supplied, snapshot will not be rendered with out the key.
     */
    snapshotKey: string;
}

export interface ITimelineSnapshotProps extends ITimelineSnapshotWrapperProps {
    /**
     * The callback sent must be called for the component to render.
     * The callback is how Timeline determines where to order the current snapshot with the rest of them.
     */
    initializeSnapshot: InitializeSnapshot;

    /**
     * Icon class name to be displayed to the left of the snapshot.
     * Ensure that css responsible for loading the icon is loaded with the component.
     * If onRenderIcon callback is not provided only then this icon will be rendered.
     */
    iconProps?: ITimelineIconProps;
    /**
     * The callback determines what to render to the left of the snapshot.
     * If it is not defined then iconProps will be used to render icon.
     */
    onRenderIcon?: () => JSX.Element;
    
    className?: string;
}

export interface ISnapshotHeaderData {
    name: string;
    tooltip?: string;
    onClick?: () => void;
    headerElement?: JSX.Element;
    role?: string;
}

export interface IDescriptionIcon {
    iconName: string;
    type: VssIconType;
    class?: string;
}

export interface IDescriptionUser {
    displayName?: string;
    imageUrl?: string;
}

export interface ISnapshotDescriptionData {
    icon?: IDescriptionIcon;
    descriptionElement?: JSX.Element; // this is given max precedence
    duration?: string;

    text?: string; // only applicable if description element is not provided

    // below fields will only be applicable if both description element and text are not provided
    format?: string;
    timeStampDescriptionPrefix?: string;
    timeStamp?: string | Date;
    users?: IDescriptionUser[];
    timeStampDescriptionSuffix?: string;
}

export type SnapshotDescriptionDataType = ISnapshotDescriptionData | Array<ISnapshotDescriptionData>;

export interface IEnvironmentTimelineSnapshotProps extends Base.IProps {
    headerData: ISnapshotHeaderData;
    descriptionData: SnapshotDescriptionDataType;
}

export interface IEnvironmentTimelineSnapshotState extends Base.IState {
    imageError: boolean;
}

export interface IEnvironmentOverviewProps extends Base.IProps {
    environment: ReleaseEnvironment;
    environmentExecutionPolicy: EnvironmentExecutionPolicy;
    artifacts?: Artifact[];
    deploymentActionsMap?: IDictionaryStringTo<IReleaseEnvironmentActionInfo>;
    releaseReason?: ReleaseReason;
    showCommitsDelegate?: (ev: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => void;
    showWorkItemsDelegate?: (ev: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => void;
    releaseId?: number;
    releaseDefinitionId?: number;
    nowAtReleaseId?: number;
    nowAtReleaseName?: string;
    nowAtReleaseError?: string;
    isEnvironmentInEndState?: boolean;
}

export interface IEnvironmentDeploymentAttemptTimelineProps extends Base.IProps {
    deploymentAttemptHelper: ReleaseDeploymentAttemptHelper;
    environmentExecutionPolicy: EnvironmentExecutionPolicy;
    deploymentActionsMap?: IDictionaryStringTo<IReleaseEnvironmentActionInfo>;
    nowAtNodeProvider?: NowAtNodeProvider;
    artifactNodeProvider?: ArtifactNodeProvider;
    triggerDefinitionNodeProvider?: TriggerDefinitionNodeProvider;
}

export interface ITimelineSnapshotDetails {
    key: string;
    initializeSnapshot: InitializeSnapshot;
    contentProps: IEnvironmentTimelineSnapshotProps;
    iconProps?: IVssIconProps;
    onRenderIcon?: () =>  JSX.Element;
}

export interface ITimelineSnapshotDetailsProvider {
    getKey: () => string;
    getInitializeSnapshot: () => InitializeSnapshot;
    getHeaderData: (instanceId?: string) => ISnapshotHeaderData;
    getDescriptionData: () => SnapshotDescriptionDataType;
    getAdditionalContent: (instanceId?: string) => JSX.Element;
    getSnapshotContent?: (instanceId?: string, environmentTimelineSnapshotProps?: IEnvironmentTimelineSnapshotProps) => JSX.Element; // override the content provided by the above three methods
    getIconProps?: () => IVssIconProps;
    onRenderIcon?: () => JSX.Element;
}

export interface IDeploymentCanceledMessageBarProps extends Base.IProps {
    deploymentAttemptHelper: ReleaseDeploymentAttemptHelper;
    deploymentActionsMap?: IDictionaryStringTo<IReleaseEnvironmentActionInfo>;
}

export interface IDeploymentCanceledMessageBarState extends Base.IState {
    imageError: boolean;
}

export interface IIssueDetails {
    taskIndex: number;
    jobTimelineRecordId: string;
    issueType: IssueType;
    message: string;
}
