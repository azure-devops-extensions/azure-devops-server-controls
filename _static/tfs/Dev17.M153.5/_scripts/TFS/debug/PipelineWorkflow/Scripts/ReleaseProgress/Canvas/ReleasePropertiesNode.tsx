import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { OverlayPanelSelectable } from "DistributedTaskControls/Components/OverlayPanelSelectable";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";
import { InnerFocusZone } from "DistributedTaskControls/Components/InnerFocusZone";
import { TagList } from "DistributedTaskControls/Components/TagList";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { CanvasSelectorConstants } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleasePropertiesItem } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleasePropertiesItem";
import { ReleaseSummaryLayoutConstants } from "PipelineWorkflow/Scripts/Common/Canvas/LayoutConstants";
import { ReleaseSummaryViewStore, IReleaseSummaryViewState, IReleaseSummaryArtifact } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseSummaryViewStore";
import { ReleaseProgressCanvasTelemetryHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseProgressCanvasTelemetryHelper";

import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";

import { List } from "OfficeFabric/List";
import { TooltipHost, DirectionalHint } from "VSSUI/Tooltip";
import { css } from "OfficeFabric/Utilities";

import { VssPersona } from "VSSUI/VssPersona";
import * as Utils_String from "VSS/Utils/String";
import * as ArrayUtils from "VSS/Utils/Array";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleasePropertiesNode";

export interface IReleasePropertiesNodeProps extends Base.IProps {
    isEditMode?: boolean;
}

export class ReleasePropertiesNode extends Base.Component<IReleasePropertiesNodeProps, IReleaseSummaryViewState> {

    constructor(props: IReleasePropertiesNodeProps) {
        super(props);
        this._store = StoreManager.GetStore<ReleaseSummaryViewStore>(ReleaseSummaryViewStore, this.props.instanceId);
        this._store.addChangedListener(this._handleStoreChange);
        this.state = this._store.getState();
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._handleStoreChange);
    }

    public render(): JSX.Element {

        const releasePropNodeStyle: React.CSSProperties = {
            minHeight: ReleaseSummaryLayoutConstants.releasePropertiesMinimumHeight,
            width: ReleaseSummaryLayoutConstants.releasePropertiesWidth
        };

        const tags: string[] = ArrayUtils.clone(this.state.tags || []);

        return (
            <InnerFocusZone tabIndex={0} ariaLabel={Resources.ReleaseText}>
                <OverlayPanelSelectable
                    instanceId={CanvasSelectorConstants.ReleaseCanvasSelectorInstance}
                    getItem={this._getItem}
                    cssClass={this.props.cssClass}
                    disabled={this.props.isEditMode}
                    ariaLabel={Resources.ReleasePropertiesNodeLabel}>

                    <div className={css("dtc-canvas-element-border", "release-properties-node-container", { "release-properties-node-container-disabled": this.props.isEditMode })} style={releasePropNodeStyle}   >
                        {this._getTriggerDescriptionSection()}
                        {this._getArtifactSection()}
                        {
                            tags.length > 0 &&
                            <div className="release-properties-node-tags-section-separator" />
                        }
                        {
                            tags.length > 0 &&
                            this._getTagsSection(tags)
                        }
                    </div>
                </OverlayPanelSelectable>
            </InnerFocusZone>
        );

    }

    public componentDidMount(): void {
        const tags: string[] = this.state.tags || [];
        const artifacts = this.state.artifacts || [];
        const releaseReason = this.state.releaseReason;
        ReleaseProgressCanvasTelemetryHelper.publishReleaseSummaryNodeTelemetry(artifacts.length, tags.length, releaseReason);
    }

    private _getTriggerDescriptionSection(): JSX.Element {
        let state: IReleaseSummaryViewState = this.state;
        let triggerReasonText: string = this._getTriggerReasonText(state.releaseReason);
        const triggerHeaderClassName = "trigger-details-text";
        const triggerHeader = this._getTriggerHeaderText(state.releaseReason);

        return (
            <div className={css("release-properties-node-trigger-details-section", { "release-properties-node-section-disabled": this.props.isEditMode })}>
                <TooltipIfOverflow tooltip={triggerHeader} targetElementClassName={triggerHeaderClassName} cssClass="trigger-details-text-container" >
                    <div className={triggerHeaderClassName}>{triggerHeader}</div>
                </TooltipIfOverflow>
                {
                    state.releaseReason !== ReleaseContracts.ReleaseReason.Schedule &&
                    this._getTriggeredBySection()
                }
                <TooltipHost content={state.startDateTooltip} directionalHint={DirectionalHint.bottomCenter}>
                    <div className="trigger-time">{state.friendlyStartDate}</div>
                </TooltipHost>
            </div>
        );
    }

    private _getTriggerReasonText(releaseReason: ReleaseContracts.ReleaseReason): string {
        let triggerText: string;
        switch (releaseReason) {
            case ReleaseContracts.ReleaseReason.ContinuousIntegration:
                triggerText = Resources.ReleaseSummaryContinuousIntegrationNodeText;
                break;
            case ReleaseContracts.ReleaseReason.PullRequest:
                triggerText = Resources.ReleaseSummaryPullRequestTriggerNodeText;
                break;
            default:
                triggerText = Utils_String.localeFormat(this.state.triggerReasonText, Utils_String.empty);
                break;
        }
        return triggerText;
    }

    private _getTriggerHeaderText(releaseReason: ReleaseContracts.ReleaseReason): string {
        let triggerText: string;
        switch (releaseReason) {
            case ReleaseContracts.ReleaseReason.ContinuousIntegration:
                triggerText = Resources.ContinuousIntegrationTriggerHeaderText;
                break;
            case ReleaseContracts.ReleaseReason.PullRequest:
                triggerText = Resources.PullRequestTriggerHeaderText;
                break;
            case ReleaseContracts.ReleaseReason.Schedule:
                triggerText = Resources.ScheduledTriggerHeaderText;
                break;
            default:
                triggerText = Resources.ManualTriggerHeaderText;
                break;
        }
        return triggerText;
    }

    private _getTriggeredBySection(): JSX.Element {
        const triggerHelpText: string = (this.state.releaseReason === ReleaseContracts.ReleaseReason.ContinuousIntegration || this.state.releaseReason === ReleaseContracts.ReleaseReason.PullRequest)
            ? Resources.ForText : Resources.ByText;
        return (
            <div className="triggered-by-section">
                <div className="trigger-by-help-text">{triggerHelpText}</div>
                {
                    !this.state.imageError && this.state.createdByAvatarUrl &&
                    <VssPersona
                    cssClass={"user-avatar-image"}
                    onImageError={this._onImageError}
                    identityDetailsProvider={{
                        getIdentityImageUrl: (size: number): string => {
                            return this.state.createdByAvatarUrl;
                        },
                        getDisplayName: (): string => {
                            return this.state.triggerCreatedBy;
                        }
                    }} />
                }
                <div className="triggered-by-text-container">
                    <TooltipIfOverflow tooltip={this.state.triggerCreatedBy} targetElementClassName="triggered-by-text" >
                        <div className="triggered-by-text">{this.state.triggerCreatedBy}</div>
                    </TooltipIfOverflow>
                </div>
            </div>
        );
    }

    private _onImageError = (): void => {
        this.setState({ imageError: true });
    }
    
    private _getArtifactSection(): JSX.Element {

        let artifactsList: JSX.Element[] = [];

        if (this.state.artifacts && this.state.artifacts.length > 0) {
            artifactsList = this.state.artifacts.map((artifact: IReleaseSummaryArtifact, index: number): JSX.Element => {
                return this._getArtifactView(artifact, index);
            });
        }
        return (
            <div className="release-properties-node-artifacts-section">
                <div className="release-properties-node-artifacts-section-header" role="heading" aria-level={3}>
                    {
                        Resources.Artifacts
                    }
                </div>
                {
                    artifactsList && artifactsList.length > 0 ?
                        <div className="release-summary-node-artifacts-list">
                            {artifactsList}
                        </div>
                        : this._getNoArtifactMessage()
                }
            </div>
        );
    }

    private _getNoArtifactMessage(): JSX.Element {
        return (
            <div className="release-summary-node-no-artifact-message">
                <div className={css("release-summary-node-no-artifact-icon", "bowtie-icon", "bowtie-status-info-outline")} />
                <div className="release-summary-node-no-artifact-branch-text">{Resources.ReleaseSummaryNodeNoArtifactsText}</div>
            </div>
        );
    }

    private _getArtifactView(artifact: IReleaseSummaryArtifact, index: number): JSX.Element {
        const artifactAliasContainerClasses = css("release-summary-node-artifact-alias-container", {
            "release-triggering-artifact-alias-container": artifact.isTriggeringArtifact
        });
        return (
            <div className="release-summary-node-artifact-view" key={index}>
                <div className={css("release-summary-node-artifact-icon", "bowtie-icon", artifact.icon)} />
                <div className={artifactAliasContainerClasses}>
                    <div className={css("release-summary-node-artifact-alias-text")}>{this._getTextElement(artifact.alias)}</div>
                    {
                        artifact.isTriggeringArtifact &&
                        (
                            <TooltipHost content={Resources.ArtifactIconTooltip} directionalHint={DirectionalHint.bottomCenter}>
                                <div tabIndex={0} data-is-focusable={true} className="release-triggering-artifact-icon-container">
                                    <span className="bowtie-icon bowtie-trigger release-triggering-artifact-icon"></span>
                                </div>
                            </TooltipHost>
                        )
                    }
                </div>
                <div className="release-summary-node-artifact-version-text">{this._getLink(artifact.artifactVersionText, artifact.artifactVersionUrl, "artifact-link")}</div>
                {
                    artifact.sourceBranchText &&
                    <div className="release-summary-node-artifact-branch-section">
                        <div className={css("release-summary-node-artifact-branch-icon", "bowtie-icon", "bowtie-tfvc-branch")} />
                        <div className="release-summary-node-artifact-branch-text">{this._getTextElement(artifact.sourceBranchText)}</div>
                    </div>
                }
            </div>
        );
    }
// role="heading" aria-level={3}>
    private _getTagsSection(tags: string[]): JSX.Element {

        return (
            <div className="release-properties-node-tags-section-container">
                <TagList
                    headerLabel={Resources.ReleaseSummaryTagsLabel}
                    tags={tags}
                    headerLabelClassName={"release-properties-node-tags-section-header"}
                    tagItemClassName={"release-propeties-node-tag-item"}
                    ariaLevel={3}
                />
            </div>
        );
    }

    private _getLink(text: string, url?: string, className?: string): JSX.Element {
        if (!url) {
            return this._getTextElement(text);
        } else {
            let safeLinkClassName: string = css("release-summary-node-link-element", className);
            return (
                <SafeLink href={url}
                    className={safeLinkClassName}
                    target="_blank">
                    {text}
                </SafeLink>
            );
        }
    }


    private _getTextElement(text: string): JSX.Element {
        if (text) {
            return (
                <TooltipIfOverflow tooltip={text} targetElementClassName="release-summary-node-text-element" >
                    <div className="release-summary-node-text-element">{text}</div>
                </TooltipIfOverflow>
            );
        } else {
            return null;
        }
    }

    private _handleStoreChange = () => {
        this.setState(this._store.getState());
    }

    private _getItem = (): ReleasePropertiesItem => {
        return new ReleasePropertiesItem();
    }

    private _store: ReleaseSummaryViewStore;
    private readonly _maxArtifactsToShow: number = 2;

}