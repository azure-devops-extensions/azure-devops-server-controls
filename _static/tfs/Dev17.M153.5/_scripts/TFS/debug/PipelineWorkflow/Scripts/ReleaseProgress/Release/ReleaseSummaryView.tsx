import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ContributionComponent } from "DistributedTaskControls/Components/ContributionComponent";
import { OverlayPanelHeading } from "DistributedTaskControls/Components/OverlayPanelHeading";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import { TagPickerComponent } from "DistributedTaskControls/Components/TagPicker";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";
import { Collapsible } from "DistributedTaskControls/SharedControls/Collapsible/Collapsible";
import { MultiLineInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/MultilineInputComponent";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";

import { ITag } from "OfficeFabric/Pickers";
import { Async, css } from "OfficeFabric/Utilities";
import { TextField } from "OfficeFabric/TextField";
import { TooltipHost, DirectionalHint } from "VSSUI/Tooltip";

import { ContributionIds, CommonConstants } from "PipelineWorkflow/Scripts/Common/Constants";
import { ReleaseActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseActionCreator";
import { ReleaseStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseStore";
import {
    IReleaseSummaryArtifact,
    IReleaseSummaryViewState,
    ISaveProgressStatus,
    ReleaseSummaryViewStore,
} from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseSummaryViewStore";
import { ReleaseArtifactsView } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseArtifactsView";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { AutoSaveStatus } from "PipelineWorkflow/Scripts/SharedComponents/AutoSaveStatus/AutoSaveStatus";

import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";
import * as ReleaseExtensionContracts from "ReleaseManagement/Core/ExtensionContracts";

import { VssPersona } from "VSSUI/VssPersona";
import { IContributionHostBehavior } from "VSS/Contributions/Controls";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";
import * as CoreUtils from "VSS/Utils/Core";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseSummaryView";

export class ReleaseSummaryView extends Base.Component<Base.IProps, IReleaseSummaryViewState> {

    constructor(props: Base.IProps) {
        super(props);
        this._releaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);
        this._releaseSummaryViewStore = StoreManager.GetStore<ReleaseSummaryViewStore>(ReleaseSummaryViewStore);
        this._releaseActionCreator = ActionCreatorManager.GetActionCreator<ReleaseActionCreator>(ReleaseActionCreator);
    }

    public componentWillMount() {
        this._async = new Async();
        this._delayedDescriptionChanged = this._async.debounce(this._onReleaseDescriptionChange, ReleaseSummaryView.c_defaultDeferredOnChangeTime);

        this._releaseStore.addChangedListener(this._onReleaseStoreChanged);
        this._releaseSummaryViewStore.addChangedListener(this._onStoreChanged);

        this.setState(this._releaseSummaryViewStore.getState());
    }

    public componentDidMount() {
        this._releaseActionCreator.updateContributions(ContributionIds.ReleaseDetailsSummaryTabContributionId);
    }

    public componentWillUnmount(): void {
        this._publishTelemetry();
        this._releaseSummaryViewStore.removeChangedListener(this._onStoreChanged);
        this._releaseStore.removeChangedListener(this._onReleaseStoreChanged);

        this._async.dispose();
    }

    public render(): JSX.Element {

        return (
            <div className="release-summary-view-container">
                {this._getTriggerDescriptionSection()}
                {this._getDescriptionSection()}
                {this._getTagComponent()}
                {this._getArtifactSection()}
                {this._getContributionsSection()}
            </div>
        );

    }

    private _getTriggerDescriptionSection(): JSX.Element {
        let state: IReleaseSummaryViewState = this.state;
        let isScheduledRelease: boolean = state.releaseReason === ReleaseContracts.ReleaseReason.Schedule;
        let isAutoTriggeredRelease: boolean = state.releaseReason === ReleaseContracts.ReleaseReason.ContinuousIntegration || state.releaseReason === ReleaseContracts.ReleaseReason.PullRequest;

        return (
            <div
                className="release-summary-panel-trigger-details-section release-summary-panel-section">
                {this._getHeader(Resources.ReleaseSummaryPanelTriggerHeader)}

                <div className="release-summary-panel-trigger-details-text">
                    <div className="release-summary-trigger-details-text">
                        <div className="trigger-reason">{state.triggerReasonText}</div>
                        {isAutoTriggeredRelease && this._getTriggeringArtifactSection()}
                        {!isScheduledRelease && this._getTriggeredBySection()}
                    </div>
                    <TooltipHost content={state.startDateTooltip} directionalHint={DirectionalHint.bottomCenter}>
                        <div className="trigger-time">{state.friendlyStartDate}</div>
                    </TooltipHost>
                </div>
            </div>
        );
    }

    private _getTriggeringArtifactSection(): JSX.Element {
        let triggeringArtifact = this._getReleaseTriggerArtifact();
        if (triggeringArtifact) {
            return (
                <div className={"triggering-artifact-section"}>
                    {this._getArtifactSourceAndVersion(triggeringArtifact)}
                    <div className="user-trigger-separator">{Resources.ReleaseSummaryContinuousIntegrationForWord}</div>
                </div>
            );
        } else {
            return null;
        }
    }

    private _getReleaseTriggerArtifact(): IReleaseSummaryArtifact {
        let triggeringArtifact: IReleaseSummaryArtifact;
        if (this.state.artifacts && this.state.artifacts.length > 0) {
            for (let artifact of this.state.artifacts) {
                if (artifact.isTriggeringArtifact) {
                    triggeringArtifact = artifact;
                    break;
                }
            }
        }
        return triggeringArtifact;
    }

    private _getTriggeredBySection(): JSX.Element {
        return (
            <div className="triggered-by-section">
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

    private _getDescriptionSection(): JSX.Element {
        return (
            <div className="release-summary-panel-description-section release-summary-panel-section">
                <div className="description-header-section">
                    {this._getHeader(Resources.ReleaseDescriptionText)}
                    {this._getAutoSaveSection(this.state.descriptionAutoSaveProgress, this._saveDescription)}
                </div>
                <div className="release-summary-panel-input-container" onBlur={this._onDescriptionSectionBlur}>
                    <TextField
                        ariaLabel={Resources.ReleaseDescriptionText}
                        className="create-release-description-input"
                        inputClassName={this._isErrorVisible(this.state.descriptionAutoSaveProgress) ? "create-release-description-error" : Utils_String.empty}
                        disabled={this.state.editDescriptionDisabled}
                        value={this.state.description}
                        onChanged={this._delayedDescriptionChanged}
                        multiline={true}
                        resizable={true}
                        maxLength={CommonConstants.ReleaseDescriptionLengthLimit}
                    />
                </div>
            </div>
        );
    }

    private _getTagComponent(): JSX.Element {
        let selectedItems: string[] = this.state.tags;
        let selectedTags: ITag[] = selectedItems ? selectedItems.map(item => ({ key: item, name: item })) : [];
        let allTags: ITag[] = [];
        if (this.state.allTags) {
            this.state.allTags.forEach((tag: string) => {
                allTags.push({ key: tag, name: tag });
            });
        }
        return (
            <div className="release-summary-panel-section release-summary-panel-tags-section">
                <div className="tag-header-section">
                    {this._getHeader(Resources.ReleaseSummaryTagsLabel)}
                    {this._getAutoSaveSection(this.state.tagsAutoSaveProgress)}
                </div>
                <div className="release-summary-tag-picker-component">
                    <TagPickerComponent
                        className={css("release-summary-tag-picker", this._isErrorVisible(this.state.tagsAutoSaveProgress) ? "release-summary-tag-picker-error" : Utils_String.empty)}
                        selectedItems={selectedTags}
                        items={allTags}
                        includeUserEnteredTextInSuggestedTags={true}
                        getTagForText={(text) => { return { key: text, name: text }; }}
                        onChange={this._onTagsChanged}
                        disabled={this.state.editTagsDisabled}
                        inputProps={{
                            "aria-label": Resources.ReleaseSummaryTagsLabel,
                            disabled: this.state.editTagsDisabled
                        }}>
                    </TagPickerComponent>
                </div>
            </div>
        );
    }

    private _getArtifactSection(): JSX.Element {
        return (
            <div className="release-summary-panel-section release-summary-panel-artifacts-section">
                {this._getHeader(Resources.Artifacts)}
                <div className="release-summary-panel-artifacts-list">
                    <ReleaseArtifactsView artifacts={this.state.artifacts} />
                </div>
            </div>
        );
    }

    private _getArtifactSourceAndVersion(artifact: IReleaseSummaryArtifact): JSX.Element {
        return (
            <div className="artifact-source-and-version">
                <div className="artifact-first-row-text artifact-version-source">{this._getLink(artifact.alias, artifact.artifactSourceUrl)}</div>
                <div className="artifact-first-row-text artifact-version-seperator">{this._getTextElement(Resources.ArtifactVersionSeperator, "artifact-version-seperator")}</div>
                <div className="artifact-first-row-text artifact-version">{this._getLink(artifact.artifactVersionText, artifact.artifactVersionUrl)}</div>
            </div>
        );
    }

    private _getLink(text: string, url?: string, ): JSX.Element {
        if (!url) {
            return this._getTextElement(text);
        } else {
            return (
                <TooltipIfOverflow tooltip={text} targetElementClassName="release-summary-panel-link-element" >
                    <SafeLink href={url}
                        className="release-summary-panel-link-element"
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
                <TooltipIfOverflow tooltip={text} targetElementClassName="release-summary-panel-text-element" >
                    <div className={css("release-summary-panel-text-element", className)}>{text}</div>
                </TooltipIfOverflow>
            );
        } else {
            return null;
        }
    }

    private _onReleaseDescriptionChange = (description: string): void => {
        /* React expects setState to be called in synchronous way. If it is asynchronous, react real DOM and virtual DOM are not in sync and when setState happens,
           react thinks that it is a tottaly different value and updates the filed making the cursor to jump at the end.
           Doing setState synchronously so that virtual DOM and real DOM are same.
        */
        this.setState({
            description: description
        });

        this._releaseActionCreator.updateDescription(description);
    }

    private _onTagsChanged = (items: ITag[]): void => {
        let oldTags: string[] = this.state.tags ? this.state.tags : [];
        let currentTags: string[] = [];

        if (items) {
            items.forEach((item: ITag) => {
                currentTags.push(item.name);
            });
        }

        if (items.length > oldTags.length) {
            let newTagAdded = this._findAddedTag(oldTags, currentTags);
            this._addTagCount++;
            this._releaseActionCreator.addTag(this.state.release.id, newTagAdded, currentTags);

        } else {
            let deletedTag = this._findDeletedTag(oldTags, currentTags);
            if (deletedTag) {
                this._deleteTagCount++;
                this._releaseActionCreator.deleteTag(this.state.release.id, deletedTag, currentTags);
            }
        }
    }

    private _findAddedTag(oldTags: string[], currentTags: string[]): string {
        let addedTag: string;
        if (currentTags && currentTags.length > 0) {
            for (let i: number = currentTags.length - 1; i >= 0; i--) {
                if (!Utils_Array.contains(oldTags, currentTags[i])) {
                    addedTag = currentTags[i];
                    break;
                }
            }
        }
        return addedTag;
    }

    private _findDeletedTag(oldTags: string[], currentTags: string[]): string {
        let deletedTag: string;
        for (let tag of oldTags) {
            if (!Utils_Array.contains(currentTags, tag)) {
                deletedTag = tag;
                break;
            }
        }
        return deletedTag;
    }

    private _onDescriptionSectionBlur = (): void => {
        // We need to add delay here since stringInput component works on debounce
        CoreUtils.delay(this, ReleaseSummaryView.c_defaultDeferredOnChangeTime, () => {
            if (this.state.isDescriptionDirty && !this._isErrorVisible(this.state.descriptionAutoSaveProgress)) {
                this._saveDescription();
            }
        });
    }

    private _onStoreChanged = (): void => {
        this.setState(this._releaseSummaryViewStore.getState());
    }

    private _onReleaseStoreChanged = (): void => {
        let release: ReleaseContracts.Release = this._releaseStore.getRelease();
        let releaseChangedContributionCallback: IDictionaryStringTo<(release: ReleaseContracts.Release) => void> = this._releaseSummaryViewStore.getContributionCallBack();

        for (const contributionId in releaseChangedContributionCallback) {
            if (releaseChangedContributionCallback.hasOwnProperty(contributionId)) {
                if (releaseChangedContributionCallback[contributionId]) {
                    releaseChangedContributionCallback[contributionId](release);
                }
            }
        }
    }

    private _getHeader(text: string): JSX.Element {
        return (
            <div className="release-summary-panel-header-container" role="heading" aria-level={3}>
                <div className="release-summary-panel-header-text">{text}</div>
            </div>
        );
    }

    private _saveDescription = (): void => {
        let release = JQueryWrapper.extendDeep({}, this.state.release) as ReleaseContracts.Release;
        release.description = this.state.description;
        release.comment = Resources.DescriptionChangedReleaseStatus;
        this._autoSaveDescriptionCount++;
        this._releaseActionCreator.autoSaveDescription(release);
    }

    private _getAutoSaveSection(autoSaveStatus: ISaveProgressStatus, onRetryClick?: (event: React.MouseEvent<HTMLButtonElement>) => void): JSX.Element {
        if (autoSaveStatus) {
            return (
                <AutoSaveStatus
                    cssClass={"release-summary-auto-save-container"}
                    isSaveInProgress={autoSaveStatus.isSaveInProgress}
                    errorMessage={autoSaveStatus.errorMessage}
                    onRetryClick={onRetryClick}
                />
            );
        } else {
            return null;
        }
    }

    private _isErrorVisible(autoSaveStatus: ISaveProgressStatus): boolean {
        let isErrorVisible: boolean = false;
        if (autoSaveStatus) {
            let isSaveInProgress: boolean = !!autoSaveStatus.isSaveInProgress;
            let isErrorMessagePresent: boolean = !!autoSaveStatus.errorMessage;
            if (!isSaveInProgress && isErrorMessagePresent) {
                isErrorVisible = true;
            }
        }
        return isErrorVisible;
    }

    private _publishTelemetry() {
        let feature: string = Feature.ReleaseSummaryView;
        let eventProperties: IDictionaryStringTo<any> = {};

        eventProperties[Properties.autoSaveDescriptionCount] = this._autoSaveDescriptionCount;
        eventProperties[Properties.addTagCount] = this._addTagCount;
        eventProperties[Properties.deleteTagCount] = this._deleteTagCount;

        Telemetry.instance().publishEvent(feature, eventProperties);
    }

    private _getContributionsSection(): JSX.Element {

        let contributions: Contribution[] = this.state.contributions || [];

        return (<div className="cd-release-progress-contributions-section">
            {
                contributions.map((contribution: Contribution) => {
                    // This looks ugly, but exists for supporting legacy contract.
                    let options: ReleaseExtensionContracts.IReleaseViewExtensionConfig = {
                        onReleaseChanged: (releaseCallBack) => {
                            releaseCallBack(this.state.release);
                            this._releaseActionCreator.updateReleaseSummaryContributionCallBack(contribution.id, releaseCallBack);
                        },
                        // This is required only for details view, adding here to avoid null ref
                        onViewDisplayed: (onDisplayedCallBack) => {
                        },
                        // TODO: implement selectTab
                        selectTab: (tabId: string) => {
                        }
                    } as ReleaseExtensionContracts.IReleaseViewExtensionConfig;

                    return !!contribution.properties.name ? (
                        <div key={contribution.id} className="cd-release-progress-release-summary-contribution">
                            <Collapsible
                                label={contribution.properties.name}
                                initiallyExpanded={false}
                                headingLevel={2}
                                addSeparator={false}
                                addSectionHeaderLine={true}>

                                <ContributionComponent
                                    contribution={contribution}
                                    initialOptions={options}
                                    instanceId={contribution.id}
                                    contributionHostBehavior={this._getContributionHostBehavior()} />

                            </Collapsible>
                        </div>
                    ) : null;
                })
            }
        </div>);
    }

    private _getContributionHostBehavior(): IContributionHostBehavior {
        return {
            showLoadingIndicator: true,
            showErrorIndicator: true,
            slowWarningDurationMs: 0
        };
    }

    private _releaseSummaryViewStore: ReleaseSummaryViewStore;
    private _releaseStore: ReleaseStore;
    private _releaseActionCreator: ReleaseActionCreator;
    private _autoSaveDescriptionCount: number = 0;
    private _addTagCount: number = 0;
    private _deleteTagCount: number = 0;
    private _async: Async;
    private _delayedDescriptionChanged: (string) => void;
    private static readonly c_defaultDeferredOnChangeTime = 500;
}
