import * as React from "react";

// OfficeFabric
import { autobind, css } from "OfficeFabric/Utilities";
import { ICalloutProps } from "OfficeFabric/Callout";
import { TooltipDelay, TooltipHost, DirectionalHint, TooltipOverflowMode } from "VSSUI/Tooltip";

// VSS
import * as Diag from "VSS/Diag";
import { KeyCode } from "VSS/Utils/UI";
import * as Utils_String from "VSS/Utils/String";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";

// DTC
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import { FriendlyDate, PastDateMode } from "DistributedTaskControls/Common/FriendlyDate";
import { Component, IProps, IStateless } from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import * as DtcResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

// ReleasePipeline
import * as RMUtils from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils";
import * as RMUtilsCore from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core";
import { Release, ReleaseReason, Artifact, ArtifactSourceReference, ReleaseStatus } from "ReleaseManagement/Core/Contracts";

// PipelineWorkflow
import { NavigationConstants } from "PipelineWorkflow/Scripts/Common/Constants";
import { PipelineArtifactDefinitionConstants, PipelineRelease } from "PipelineWorkflow/Scripts/Common/Types";
import { CommonDefinitionsStore } from "PipelineWorkflow/Scripts/Definitions/Stores/CommonDefinitionsStore";
import { IdentityHelper } from "PipelineWorkflow/Scripts/Shared/Utils/IdentityHelper";
import { DefinitionsUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/DefinitionsUtils";
import { ArtifactTypeListStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeListStore";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { IPermissionCollection } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { ReleaseManagementUISecurityPermissions } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleaseHeader";

export interface IActiveReleaseHeaderProps extends IProps {
    release: Release;
    releaseClass: string;
    isExpanded: boolean;
    isDeleted: boolean;
    onToggle: () => void;
    onReleaseDelete: (release: Release) => void;
    onReleaseFound?: () => void;
}

export class ActiveReleaseHeader extends Component<IActiveReleaseHeaderProps, IStateless> {

    public componentWillMount(): void {
        this._commonDefinitionsStore = StoreManager.GetStore<CommonDefinitionsStore>(CommonDefinitionsStore);
    }

    public render(): JSX.Element {
        let release = this.props.release as Release;
        Diag.logVerbose(`ActiveReleaseHeader render Release ID ${release.id} isExpanded ${this.props.isExpanded}`);

        return (
            <div className={"active-release-header"}>

                <div>
                    {this._getReleaseCreatorDetails(release)}
                </div>

                <div className={css("active-release-details-container", this.props.releaseClass)}>
                    {this._getReleaseNameElement()}
                    {this.props.isExpanded && this._getReleaseCreatedElement()}
                    {this.props.isExpanded && this._getReleaseTagsDescriptionElement()}
                </div>

            </div>
        );
    }

    private _getReleaseCreatorDetails(release: Release): JSX.Element {
        let reasonIcon: string = RMUtils.ReleaseReasonIcon.DisplayIconMap[release.reason];

        return (
            <TooltipHost
                hostClassName="active-releases-user-icon-tooltip"
                content={release.createdBy.displayName}
                directionalHint={DirectionalHint.bottomLeftEdge}>
                <div className="active-release-user-container" data-is-focusable={true}>
                    <img
                        src={IdentityHelper.getIdentityAvatarUrl(release.createdBy)}
                        className="active-release-identity-image"
                        alt={Utils_String.empty} />
                </div>
            </TooltipHost>
        );
    }

    private _getReleaseNameElement(): JSX.Element {
        const releaseUrl: string = DefinitionsUtils.getReleaseUrl(this.props.release);
        return (
            <div className="release-name-element">
                {this._getReleaseName(releaseUrl)}
                {this._getReleaseSubtext(releaseUrl)}
            </div>
        );
    }

    private _getReleaseName(releaseUrl: string): JSX.Element {
        let release: Release = this.props.release;
        let releaseNameTooltipText = release.name;
        let releaseName: JSX.Element;
        let releaseStatus: JSX.Element;
        if (this.props.isDeleted) {
            releaseName =
                (<span className="active-release-name releases-isdeleted">{release.name}
                </span>
                );
        }
        else if (release.status === ReleaseStatus.Draft && !this._canViewDraftRelease()) {
            releaseName =
                (<span className="active-release-name">{release.name}
                </span>
                );
        }
        else {
            releaseName = (<SafeLink
                href={releaseUrl}
                allowRelative={true}
                onClick={(e) => this._onReleaseNameClick(e, release)}
                onKeyDown={(e) => this._onReleaseNameClick(e, release)}
                className="active-release-name active-release-url">
                {release.name}
            </SafeLink>);
        }

        let releaseStatusText: string = null;
        if (release.status === ReleaseStatus.Draft) {
            releaseStatusText = Resources.ActiveReleasesNameDraftStatusText;
        }
        else if (release.status === ReleaseStatus.Abandoned) {
            releaseStatusText = Resources.ActiveReleasesNameAbandonedStatusText;
        }

        if (!!releaseStatusText) {
            releaseStatus = <span className="active-release-status-text">{releaseStatusText}</span>;
            releaseNameTooltipText = Utils_String.localeFormat("{0} {1}", release.name, releaseStatusText);
        }

        return (
            <div className={"release-name-with-menu"}>
                {
                    this.props.release.keepForever &&
                    <TooltipHost
                        content={Resources.RetainIndefinitelyIconTooltip}
                        hostClassName={"retention-icon"}
                    >
                        <span
                            className={"bowtie-icon bowtie-security-lock-fill"}
                            aria-label={Resources.RetainIndefinitelyIconTooltip} />
                    </TooltipHost>
                }
                <TooltipHost
                    content={releaseNameTooltipText}
                    overflowMode={TooltipOverflowMode.Self}
                    directionalHint={DirectionalHint.topAutoEdge}
                    delay={TooltipDelay.medium}
                    calloutProps={this._getCalloutProps()}
                    hostClassName={"release-name-container overflow-text-container"}>
                    {releaseName}
                    {releaseStatus}
                </TooltipHost>
                {this._getChevron()}
            </div>
        );
    }

    private _onReleaseNameClick(event: React.SyntheticEvent<HTMLElement>, release: PipelineRelease): void {
        if (this.props.onReleaseFound) {
            this.props.onReleaseFound();
        }

        DefinitionsUtils.onReleaseNameClick(event, release);
    }

    private _canViewDraftRelease(): boolean {
        const permissionCollection: IPermissionCollection = this._commonDefinitionsStore.getPermissions();
        if (!permissionCollection) {
            return false;
        }

        const canViewDraftRelease = DefinitionsUtils.readUIPermissionFromCollection(permissionCollection, ReleaseManagementUISecurityPermissions.ViewLegacyUI);
        return canViewDraftRelease;
    }

    private _getCalloutProps(): ICalloutProps {
        let calloutProps: ICalloutProps = {
            isBeakVisible: true,
            setInitialFocus: false
        } as ICalloutProps;

        return calloutProps;
    }

    private _getChevron(): JSX.Element {
        const chevronIcon: string = `chevron-${this.props.isExpanded ? "up" : "down"}-light`;
        const ariaLabel: string = this.props.isExpanded ? DtcResources.ExpandText : DtcResources.CollapseText;

        return (
            <div tabIndex={0} data-is-focusable={true} className="active-release-chevron-container" onKeyDown={this._onChevronKeyDown}>
                <VssIcon
                    className="active-release-chevron"
                    role={"button"}
                    iconName={chevronIcon}
                    iconType={VssIconType.bowtie}
                    aria-label={ariaLabel}
                    onClick={this._onChevronClick} />
            </div>
        );
    }

    private _getReleaseSubtext(releaseUrl: string): JSX.Element {

        return (
            <div className="active-release-subtext-container">
                {this._getPrimaryArtifactBuild()}
                {this._getPrimaryArtifactBranch()}
            </div>
        );
    }

    @autobind
    private _onReleaseDelete(release: Release): void {
        this.props.onReleaseDelete(release);
    }

    private _getPrimaryArtifactBuild(): JSX.Element {
        let release: Release = this.props.release;
        let primaryArtifact: Artifact = RMUtils.ArtifactsHelper.getPrimaryArtifact(release.artifacts); // primaryArtifact could be null
        let artifactName: string = RMUtils.ArtifactsHelper.getArtifactBuildInfo(primaryArtifact);
        let artifactVersionUrl: string = RMUtils.ArtifactsHelper.getArtifactVersionUrl(primaryArtifact);

        if (!artifactName) {
            return null;
        }

        return (
            <div className="active-release-subtext">

                {this._getArtifactIcon(primaryArtifact)}

                <TooltipHost
                    content={artifactName}
                    overflowMode={TooltipOverflowMode.Self}
                    directionalHint={DirectionalHint.bottomCenter}
                    delay={TooltipDelay.medium}
                    calloutProps={this._getCalloutProps()}
                    hostClassName={"artifact-version-container overflow-text-container"}>

                    {this._getPrimaryArtifactNameElement(artifactName, artifactVersionUrl)}

                </TooltipHost>

            </div>
        );
    }

    private _getArtifactIcon(artifact: Artifact) {
        if (!artifact) {
            return null;
        }

        let artifactIcon: string = RMUtils.ReleaseArtifactsHelper.getArtifactBowtieIcon(artifact.type);

        return (
            <VssIcon iconName={artifactIcon} iconType={VssIconType.bowtie} aria-label={artifact.type} className="artifact-type-icon" />
        );
    }

    private _getPrimaryArtifactNameElement(artifactName: string, artifactVersionUrl: string): JSX.Element {
        let elm: JSX.Element = null;
        if (artifactVersionUrl) {
            elm = (
                <SafeLink
                    href={artifactVersionUrl}
                    allowRelative={true}
                    className="light-text active-release-artifact-url"
                    onClick={this._onArtifactClick}>

                    {artifactName}

                </SafeLink>
            );
        }
        else {
            elm = (
                <span className="light-text"> {artifactName} </span>
            );
        }

        return elm;
    }

    @autobind
    private _onArtifactClick(e: React.MouseEvent<HTMLElement>): void {
        e.stopPropagation();
        e.preventDefault();

        let release: Release = this.props.release;
        let primaryArtifact: Artifact = RMUtils.ArtifactsHelper.getPrimaryArtifact(release.artifacts); // primaryArtifact could be null;
        let artifactUrl: string = RMUtils.ArtifactsHelper.getArtifactVersionUrl(primaryArtifact);

        RMUtilsCore.History.openUrlInNewTab(artifactUrl);
    }

    private _getPrimaryArtifactName(artifact: Artifact): string {
        let artifactVersion: ArtifactSourceReference = artifact.definitionReference[PipelineArtifactDefinitionConstants.Version];
        return artifactVersion && artifactVersion.name ? artifactVersion.name : Utils_String.empty;
    }

    private _getPrimaryArtifactUrl(artifact: Artifact): string {
        let artifactVersion: ArtifactSourceReference = artifact.definitionReference[PipelineArtifactDefinitionConstants.Version];
        return artifactVersion && artifactVersion.name ? artifactVersion.name : Utils_String.empty;
    }

    private _getPrimaryArtifactBranch(): JSX.Element {
        let release: Release = this.props.release;
        let branchName: string = RMUtils.ArtifactsHelper.getPrimaryArtifactBranchName(release.artifacts);
        let branchDisplayName: string = RMUtils.BranchHelper.toDisplayValue(branchName);

        if (!branchDisplayName) {
            return null;
        }

        return (
            <div className="active-release-subtext">
                <VssIcon
                    iconName={"bowtie-tfvc-branch"}
                    iconType={VssIconType.bowtie}
                    aria-label={"Branch"}
                    className="active-release-branch-icon" />
                <TooltipHost
                    content={branchDisplayName}
                    overflowMode={TooltipOverflowMode.Self}
                    directionalHint={DirectionalHint.bottomCenter}
                    delay={TooltipDelay.medium}
                    calloutProps={this._getCalloutProps()}
                    hostClassName={"branch-name-container overflow-text-container"}>

                    <span className="light-text"> {branchDisplayName} </span>

                </TooltipHost>
            </div>
        );
    }

    private _getReleaseCreatedElement(): JSX.Element {
        const release: Release = this.props.release;
        const triggerDescription: string = this._getTriggeTypeText(release.reason);
        const createdDateString: string = this._getFriendlyCreatedOnDate(release.createdOn);
        const createdDateTooltipText: string = release.createdOn ? release.createdOn.toDateString() : Utils_String.empty;

        return (
            <div className="active-release-trigger-details light-text">
                <TooltipHost content={triggerDescription} directionalHint={DirectionalHint.bottomCenter} hostClassName="active-release-trigger-description" overflowMode={TooltipOverflowMode.Self}>
                    {triggerDescription}
                </TooltipHost>
                <TooltipHost content={createdDateTooltipText} directionalHint={DirectionalHint.bottomCenter} hostClassName="active-release-trigger-date">
                    {createdDateString}
                </TooltipHost>
            </div>
        );
    }

    private _getFriendlyCreatedOnDate(createdOnDate: Date): string {
        return createdOnDate ? new FriendlyDate(new Date(createdOnDate), PastDateMode.ago, true).toString() : Utils_String.empty;
    }

    private _getReleaseTagsDescriptionElement(): JSX.Element {
        let release: Release = this.props.release;
        const releaseDescription: string = release.description;
        return (
            <div className="active-release-tags-description-container">
                {
                    releaseDescription && (
                        <div className="active-rel-description-container">
                            <TooltipHost hostClassName={"active-rel-description-tooltip overflow-text-container"} content={releaseDescription} directionalHint={DirectionalHint.bottomCenter} overflowMode={TooltipOverflowMode.Self}>
                                <span className="active-rel-description light-text"> {releaseDescription} </span>
                            </TooltipHost>
                        </div>
                    )
                }
                <div className="active-rel-tags-container"> {release.tags.map((tag: string, index: number) => { return this._getReleaseTagElement(tag, index); })} </div>
            </div>
        );
    }

    private _getReleaseTagElement(tag: string, index: number): JSX.Element {
        return (<div className="active-rel-tag-container" key={index}>
            <TooltipHost hostClassName={"active-rel-tag-tooltip overflow-text-container"} content={tag} directionalHint={DirectionalHint.bottomCenter} overflowMode={TooltipOverflowMode.Self}>
                <span className="active-rel-tag light-text" >
                    {tag}
                </span>
            </TooltipHost>
        </div>);
    }

    @autobind
    private _expandOrCollapseRowUsingKeyboard(event: React.KeyboardEvent<HTMLDivElement>): void {
        if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
            event.preventDefault();
            event.stopPropagation();

            if (this.props.onToggle) {
                this.props.onToggle();
            }
        }
    }

    @autobind
    private _onChevronClick(event: React.SyntheticEvent<HTMLElement>): void {
        event.stopPropagation();
        if (this.props.onToggle) {
            this.props.onToggle();
        }
    }

    @autobind _onChevronKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
        this._expandOrCollapseRowUsingKeyboard(event);
    }

    @autobind
    private _onArtifactsUpdated(): void {
        this.setState({});
    }

    private _getTriggeTypeText(releaseReason: ReleaseReason): string {
        let triggerText: string;
        switch (releaseReason) {
            case ReleaseReason.ContinuousIntegration:
                triggerText = Resources.ContinuousIntegrationTriggerHeaderText;
                break;
            case ReleaseReason.PullRequest:
                triggerText = Resources.PullRequestTriggerHeaderText;
                break;
            case ReleaseReason.Schedule:
                triggerText = Resources.ScheduledTriggerHeaderText;
                break;
            default:
                triggerText = Resources.ManualTriggerHeaderText;
                break;
        }
        return triggerText;
    }

    private _commonDefinitionsStore: CommonDefinitionsStore;
}