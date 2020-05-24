import * as React from "react";

// OfficeFabric
import { autobind, css } from "OfficeFabric/Utilities";
import { ICalloutProps } from "OfficeFabric/Callout";
import { Link } from "OfficeFabric/Link";
import { TooltipDelay, TooltipHost, DirectionalHint, TooltipOverflowMode } from "VSSUI/Tooltip";

// VSS
import { getDefaultWebContext } from "VSS/Context";
import * as Utils_String from "VSS/Utils/String";
import { getLWPModule } from "VSS/LWP";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";
import { registerLWPComponent } from "VSS/LWP";

// DTC
import { AppContext } from "DistributedTaskControls/Common/AppContext";
import { Component, IProps, IState } from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import * as DtcResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import * as RMConstants from "ReleaseManagement/Core/Constants";

// ReleasePipeline
import * as RMUtils from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils";
import * as RMUtilsCore from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core";
import { Release, ReleaseReason, Artifact, ReleaseStatus } from "ReleaseManagement/Core/Contracts";

// PipelineWorkflow
import { PipelineRelease } from "PipelineWorkflow/Scripts/Common/Types";
import { ActiveReleasesMenuButton } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesMenuButton";
import { CommonDefinitionsStore } from "PipelineWorkflow/Scripts/Definitions/Stores/CommonDefinitionsStore";
import { IdentityHelper } from "PipelineWorkflow/Scripts/Shared/Utils/IdentityHelper";
import { DefinitionsUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/DefinitionsUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { IPermissionCollection } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { ReleaseManagementUISecurityPermissions } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleaseHeader";

const FPSLink = getLWPModule("VSS/Platform/Components/FPSLink");
const Location = getLWPModule("VSS/Platform/Location");

export interface IActiveReleaseNameProps extends IProps {
    release: Release;
    releaseClass: string;
    initiallyExpanded: boolean;
    isDeleted: boolean;
    columnWidth: number;
    artifactNameMaxWidth: number;
    branchNameMaxWidth: number;
    focusedRowReleaseId: number;
    hoveredRowReleaseId: number;
    onToggleExpansion: (releaseId: number, expanded: boolean) => void;
    onDesiredReleaseFound?: () => void;
}

export interface IActiveReleaseNameColumnState extends IState {
    isExpanded: boolean;
}

const avatarImageWidth: number = 50;
const actionButtonWidth: number = 36;

export class ActiveReleaseNameColumn extends Component<IActiveReleaseNameProps, IActiveReleaseNameColumnState> {

    public constructor(props: IActiveReleaseNameProps) {
        super(props);
        this._isExpanded = props.initiallyExpanded;
    }

    public componentWillUpdate(nextProps: IActiveReleaseNameProps, nextState: IActiveReleaseNameColumnState): void {
        // if the props go from false to true, then override state
        if (!this.props.initiallyExpanded && nextProps.initiallyExpanded) {
            this._isExpanded = nextProps.initiallyExpanded;
        }
        else {
            this._isExpanded = nextState.isExpanded;
        }
    }

    public componentWillMount(): void {
        this._commonDefinitionsStore = StoreManager.GetStore<CommonDefinitionsStore>(CommonDefinitionsStore);
        this._releaseDetailsContainerWidth = this.props.columnWidth > 100 ? this.props.columnWidth : 100;
        this._artifactNameMaxWidth = this.props.artifactNameMaxWidth > 0 ? this.props.artifactNameMaxWidth : 50;
        this._branchNameMaxWidth = this.props.branchNameMaxWidth > 0 ? this.props.branchNameMaxWidth : 50;
        this._releaseNameWidth = this._releaseDetailsContainerWidth - avatarImageWidth - actionButtonWidth;
    }

    public componentWillReceiveProps(nextProps: IActiveReleaseNameProps) {
        this._releaseDetailsContainerWidth = nextProps.columnWidth > 100 ? nextProps.columnWidth : 100;
        this._artifactNameMaxWidth = nextProps.artifactNameMaxWidth > 0 ? nextProps.artifactNameMaxWidth : 50;
        this._branchNameMaxWidth = nextProps.branchNameMaxWidth > 0 ? nextProps.branchNameMaxWidth : 50;
        this._releaseNameWidth = this._releaseDetailsContainerWidth - avatarImageWidth - actionButtonWidth;
    }

    public render(): JSX.Element {
        let release = this.props.release as Release;

        const containerStyle = {
            "width": this._releaseDetailsContainerWidth
        };

        return (
            <div className={"active-release-header"} >

                {this._getReleaseCreatorDetails(release)}

                <div className={css("active-release-details-container", this.props.releaseClass)} style={containerStyle}>
                    {this._getReleaseNameElement()}
                    {this._isExpanded && this._getReleaseTagsDescriptionElement()}
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

        this._adjustNameWidthToFitChevron();
        const releaseNameWidthStyle = {
            "maxWidth": this._releaseNameWidth
        };

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
            releaseName = (<Link
                href={releaseUrl}
                rel="noopener noreferrer"
                onClick={(e) => this._onReleaseNameClick(e, release)}
                onKeyDown={(e) => this._onReleaseNameKeydown(e, release)}
                className="active-release-name active-release-url">
                {release.name}
            </Link>);
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
                <div
                    ref={this._resolveRef("_releaseNameContainer")}
                    style={releaseNameWidthStyle}
                    className={"release-name-container overflow-text-container"}>
                    <TooltipHost
                        content={releaseNameTooltipText}
                        overflowMode={TooltipOverflowMode.Parent}
                        directionalHint={DirectionalHint.topAutoEdge}
                        delay={TooltipDelay.medium}
                        calloutProps={this._getCalloutProps()}
                        hostClassName={"release-name-container overflow-text-container"}>
                        {releaseName}
                        {releaseStatus}
                    </TooltipHost>
                </div>
                {this._getChevron()}
            </div>
        );
    }

    private _onReleaseNameClick(event: any, release: PipelineRelease): void {
        if (this.props.onDesiredReleaseFound) {
            this.props.onDesiredReleaseFound();
        }

        DefinitionsUtils.onReleaseNameClick(event, release);
    }

    private _onReleaseNameKeydown(event: any, release: PipelineRelease): void {
        if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
            DefinitionsUtils.onReleaseNameClick(event, release);
        }
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
        const chevronIcon: string = `chevron-${this._isExpanded ? "up" : "down"}-light`;
        const ariaLabel: string = this._isExpanded ? DtcResources.ExpandText : DtcResources.CollapseText;

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
        const subtextContainerWidthStyle = {
            "width": this._branchNameMaxWidth + this._artifactNameMaxWidth + 36 // +36 for ellipsis button
        };

        return (
            <div className="active-release-subtext-container" style={subtextContainerWidthStyle}>
                {this._getPrimaryArtifactBuild()}
                {this._getPrimaryArtifactBranch()}
            </div>
        );
    }

    private _getPrimaryArtifactBuild(): JSX.Element {
        let release: Release = this.props.release;
        let primaryArtifact: Artifact = RMUtils.ArtifactsHelper.getPrimaryArtifact(release.artifacts); // primaryArtifact could be null
        let artifactName: string = RMUtils.ArtifactsHelper.getArtifactBuildInfo(primaryArtifact);
        let artifactVersionUrl: string = RMUtils.ArtifactsHelper.getArtifactVersionUrl(primaryArtifact);

        // Handle build seperately. Treat it as a first class
        if (primaryArtifact && primaryArtifact.type === RMConstants.ArtifactTypes.BuildArtifactType) {
            const version = primaryArtifact.definitionReference[RMConstants.ArtifactDefinitionConstants.Version];
            if (!version || !version.id) {
                artifactVersionUrl = "";
            } else {

                const project = primaryArtifact.definitionReference[RMConstants.ArtifactDefinitionConstants.ProjectId] || getDefaultWebContext().project;

                const url = Location.routeUrl(AppContext.instance().PageContext, "ms.vss-build-web.ci-results-hub-route", {
                    "project": project.name,
                    "buildId": version.id
                });

                // The route based computation will be empty when only AT is upgraded
                if (url) {
                    artifactVersionUrl = url;
                }
            }
        }


        if (!artifactName) {
            return null;
        }

        const primaryArtifactBuildWidthStyle = {
            "maxWidth": this._artifactNameMaxWidth
        };

        return (
            <div className="active-release-subtext">

                {this._getArtifactIcon(primaryArtifact)}
                <div style={primaryArtifactBuildWidthStyle} className={"artifact-version-container overflow-text-container"}>
                    <TooltipHost
                        content={artifactName}
                        overflowMode={TooltipOverflowMode.Parent}
                        directionalHint={DirectionalHint.bottomCenter}
                        delay={TooltipDelay.medium}
                        calloutProps={this._getCalloutProps()}
                        hostClassName={"artifact-version-container overflow-text-container"}>

                        {this._getPrimaryArtifactNameElement(artifactName, artifactVersionUrl, primaryArtifact.type)}

                    </TooltipHost>
                </div>
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

    private _getPrimaryArtifactNameElement(artifactName: string, artifactVersionUrl: string, artifactType: string): JSX.Element {
        let elm: JSX.Element = null;
        if (artifactVersionUrl) {
            const LinkComponentClass: React.ComponentClass<React.AnchorHTMLAttributes<HTMLAnchorElement>> = artifactType === RMConstants.ArtifactTypes.BuildArtifactType ? FPSLink.FPSLinkComponent : Link;
            elm = (
                <LinkComponentClass
                    href={artifactVersionUrl}
                    rel="noopener noreferrer"
                    className="light-text active-release-artifact-url"
                    role={artifactVersionUrl ? "link" : "button"}
                    onClick={this._onArtifactClick}>

                    {artifactName}

                </LinkComponentClass>
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

    private _getPrimaryArtifactBranch(): JSX.Element {
        let release: Release = this.props.release;
        let branchName: string = RMUtils.ArtifactsHelper.getPrimaryArtifactBranchName(release.artifacts);
        let branchDisplayName: string = RMUtils.BranchHelper.toDisplayValue(branchName);

        if (!branchDisplayName) {
            return null;
        }

        const primaryArtifactBranchWidthStyle = {
            "maxWidth": this._branchNameMaxWidth
        };

        return (
            <div className="active-release-subtext">
                <VssIcon
                    iconName={"bowtie-tfvc-branch"}
                    iconType={VssIconType.bowtie}
                    aria-label={"Branch"}
                    className="active-release-branch-icon" />
                <div style={primaryArtifactBranchWidthStyle} className={"branch-name-container overflow-text-container"}>
                    <TooltipHost
                        content={branchDisplayName}
                        overflowMode={TooltipOverflowMode.Parent}
                        directionalHint={DirectionalHint.bottomCenter}
                        delay={TooltipDelay.medium}
                        calloutProps={this._getCalloutProps()}
                        hostClassName={"branch-name-container overflow-text-container"}>

                        <span className="light-text"> {branchDisplayName} </span>

                    </TooltipHost>
                </div>
            </div>
        );
    }

    private _getReleaseTagsDescriptionElement(): JSX.Element {
        let release: Release = this.props.release;
        return (
            <div className="active-release-tags-description-container">
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

            let release = this.props.release as Release;

            const toggledState: boolean = !this._isExpanded;
            this.setState({
                isExpanded: toggledState
            });

            this._isExpanded = toggledState;

            if (this.props.onToggleExpansion) {
                this.props.onToggleExpansion(release.id, toggledState);
            }
        }
    }

    @autobind
    private _onChevronClick(event: React.SyntheticEvent<HTMLElement>): void {
        event.stopPropagation();
        let release = this.props.release as Release;

        const toggledState: boolean = !this._isExpanded;
        this.setState({
            isExpanded: toggledState
        });

        this._isExpanded = toggledState;

        if (this.props.onToggleExpansion) {
            this.props.onToggleExpansion(release.id, toggledState);
        }
    }

    @autobind
    private _onChevronKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
        this._expandOrCollapseRowUsingKeyboard(event);
    }

    private _adjustNameWidthToFitChevron(): void {
        if (this._releaseNameContainer && (this.props.focusedRowReleaseId === this.props.release.id || this.props.hoveredRowReleaseId === this.props.release.id)) {
            const actualNameContainerWidth: number = this._releaseNameContainer.getBoundingClientRect().width;
            const actualNameWidth: number = this._releaseNameContainer.innerText.length * 8;
            const isReleaseNameOverflowing: boolean = actualNameWidth >= actualNameContainerWidth;
            if (isReleaseNameOverflowing) {
                this._releaseNameWidth = this._releaseNameWidth - 15;
            }
        }
    }

    private _commonDefinitionsStore: CommonDefinitionsStore;
    private _isExpanded: boolean;
    private _releaseNameWidth: number;
    private _releaseDetailsContainerWidth: number;
    private _artifactNameMaxWidth: number;
    private _branchNameMaxWidth: number;
    private _releaseNameContainer: HTMLDivElement;
}

registerLWPComponent("activeReleaseNameColumn", ActiveReleaseNameColumn);