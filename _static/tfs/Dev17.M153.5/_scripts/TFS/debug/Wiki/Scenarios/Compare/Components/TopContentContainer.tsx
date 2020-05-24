import * as React from "react";
import { IBreadcrumbItem } from "OfficeFabric/Breadcrumb";
import { PrimaryButton } from "OfficeFabric/Button";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { autobind } from "OfficeFabric/Utilities";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as  Utils_String from "VSS/Utils/String";

import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { WikiType } from "TFS/Wiki/Contracts";
import { DiffLineCountContainer } from "VersionControl/Scenarios/Shared/SourcePath";
import * as AsyncRefOperationActionCreator from "VersionControl/Scripts/Actions/AsyncGitOperation/AsyncRefOperationActionCreator";
import { AsyncRefOperationType } from "VersionControl/Scripts/Actions/AsyncGitOperationActions";
import { AsyncRefOperationControllerView } from "VersionControl/Scripts/Components/AsyncGitOperation/AsyncRefOperationControllerView";
import { OperationCompletedProps } from "VersionControl/Scripts/Components/AsyncGitOperation/AsyncGitOperationTracker";
import { ChangeType } from "VersionControl/Scripts/TFS.VersionControl";
import { GitObjectId, VersionControlChangeType } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as GitItemUtils from "VersionControl/Scripts/GitItemUtils";
import { getRefFriendlyName } from "VersionControl/Scripts/GitRefUtility";
import { GitDiffItem } from "VersionControl/Scripts/Stores/PullRequestReview/ChangeTransformer";
import { GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { CompareModuleFluxProps } from "Wiki/Scenarios/Compare/Components/CompareContainer";
import { CompareStoresHub } from "Wiki/Scenarios/Compare/Stores/CompareStoresHub";
import { PageMetadataBar } from "Wiki/Scenarios/Integration/PageMetadataBar/PageMetadataBarContainer";
import { Header } from "Wiki/Scenarios/Shared/Components/Header";
import { WikiBreadCrumb } from "Wiki/Scenarios/Shared/Components/WikiBreadCrumb";
import { CompareViews, VersionControlConstants, WikiActionIds } from "Wiki/Scripts/CommonConstants";
import { Areas } from "Wiki/Scripts/CustomerIntelligenceConstants";
import { getPageNameFromPath } from "Wiki/Scripts/Helpers";
import { getWikiPageHistoryUrl, getWikiPageViewUrl, linkOnClickEventHelper } from "Wiki/Scripts/WikiUrls";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";

export interface TopContentContainerState {
    title: string;
    linesAdded: number;
    linesDeleted: number;
    itemChangeType: VersionControlChangeType;
}

enum LinesChangedType {
    linesAddded,
    linesDeleted,
}

export class TopContentContainer extends React.Component<CompareModuleFluxProps, TopContentContainerState> {
    constructor(props: CompareModuleFluxProps) {
        super(props);

        this.state = {
            title: "",
            linesAdded: 0,
            linesDeleted: 0,
            itemChangeType: null,
        };
    }

    public render(): JSX.Element {
        const state = this.props.storesHub.state;
        const pageName = getPageNameFromPath(this._getLatestPagePath());
        const isCompareView = this._isCurrentView(CompareViews.Compare);

        return (
            <div className={"top-content-container"}>
                <div className={"first-line"}>
                    <div className={"breadcrumb"}>
                        <WikiBreadCrumb
                            currentAction={WikiActionIds.Compare}
                            currentWiki={state.sharedState.commonState.wiki}
                            currentWikiVersion={state.sharedState.commonState.wikiVersion}
                            currentPagePath={this._getLatestPagePath()} />
                    </div>
                </div>
                <Header
                    title={this.state.title}
                    commandBarProps={{
                        items: [],
                        farItems: this._getFarItems(),
                    }}
                />
                <PageMetadataBar
                    author={state.comparePageState.author}
                    authoredDate={state.comparePageState.authoredDate}
                    showDetailDate={true} />
                <DiffLineCountContainer
                    linesAdded={isCompareView ? this.state.linesAdded : 0}
                    linesDeleted={isCompareView ? this.state.linesDeleted : 0} />
            </div>
        );
    }

    private _getFarItems(): IContextualMenuItem[] {
        if (!this.state.itemChangeType
            || !FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.SourceControlRevert)) {
            return null;
        }

        const items: IContextualMenuItem[] = [{
            key: "revert",
            onRender: this._renderRevertButton,
        }]

        return items;
    }

    @autobind
    private _revertCommit(): void {
        const commitId = this._getCommidId().short;
        AsyncRefOperationActionCreator.ActionCreator.startDesigningAsyncRefOperation(
            this.props.storesHub.state.sharedState.commonState.repositoryContext,
            commitId,
            Utils_String.format(WikiResources.RevisionDetailsRevertDialogTitle, commitId),
            AsyncRefOperationType.Revert,
            this._getDefaultBranch(),
            WikiResources.RevisionDetailsRevertDialogSubtitle,
            true,
        );
    }

    @autobind
    private _renderRevertButton(): JSX.Element {
        if (!this.props.storesHub.state.sharedState.permissionState.hasContributePermission) {
            return null;
        }

        const revertCompletedDialogProps: OperationCompletedProps = {
            message: WikiResources.RevisionDetailsRevertCompletionMessage,
            primaryButtonText: WikiResources.BrowsePage,
            primaryButtonUrl: this._getViewPageUrl(),
            defaultButtonText: WikiResources.CloseButtonText,
        };

        const changeType: VersionControlChangeType = this.state.itemChangeType;
        let disabledReason = "";
        let isRevertButtonDisabled = false;

        if (this.props.storesHub.state.sharedState.commonState.wiki.type === WikiType.CodeWiki) {
            isRevertButtonDisabled = true;
        } else if (ChangeType.hasChangeFlag(changeType, VersionControlChangeType.Add)) {
            disabledReason = WikiResources.RevertDisabledPageAddDescription;
            isRevertButtonDisabled = true;
        } else if (ChangeType.hasChangeFlag(changeType, VersionControlChangeType.Rename)) {
            disabledReason = WikiResources.RevertDisabledRenameDescription;
            isRevertButtonDisabled = true;
        } else if (ChangeType.hasChangeFlag(changeType, VersionControlChangeType.Delete)) {
            disabledReason = WikiResources.RevertDisabledDeleteDescription;
            isRevertButtonDisabled = true;
        }

        const calloutContent: ICalloutContentProps = {
            calloutHeader: WikiResources.RevertDisabledCalloutHeader,
            calloutDescription: disabledReason,
        }

        return (
            <div className={"revert-container"}>
                <PrimaryButton
                    className={"revert-button"}
                    onClick={this._revertCommit}
                    disabled={isRevertButtonDisabled}>
                    {WikiResources.RevisionDetailsRevertButton}
                </PrimaryButton>
                <AsyncRefOperationControllerView
                    repositoryContext={this.props.storesHub.state.sharedState.commonState.repositoryContext}
                    comment={this.state.title}
                    commitId={this._getCommidId()}
                    simplifiedMode={true}
                    operationCompletedProps={revertCompletedDialogProps}
                    ciArea={Areas.Wiki} />
                {isRevertButtonDisabled && disabledReason &&
                    <InfoButton cssClass={"revert-disabled-info"}
                        calloutContent={calloutContent}
                        isIconFocusable={true} />
                }
            </div>
        );
    }

    private _getViewPageUrl(): string {
        return getWikiPageViewUrl({
            pagePath: this._getLatestPagePath(),
            latestPagePath: null,
            version: null,
            view: null,
        });
    }

    private _getHistoryPageUrl(): string {
        return getWikiPageHistoryUrl({
            pagePath: this._getLatestPagePath(),
            latestPagePath: null,
            version: null,
            view: null,
        });
    }

    private _getCommidId(): GitObjectId {
        return GitItemUtils._toGitObjectId(this.props.storesHub.state.comparePageState.version);
    }

    private _getDefaultBranch(): GitBranchVersionSpec {
        const defaultBranch: string = this.props.storesHub.state.sharedState.commonState.repositoryContext.getRepository().defaultBranch;
        const defaultBranchFriendlyName = getRefFriendlyName(defaultBranch);
        return (new GitBranchVersionSpec(defaultBranchFriendlyName));
    }

    private _getLatestPagePath(): string {
        const urlState = this.props.storesHub.state.sharedState.urlState;
        return urlState.latestPagePath || urlState.pagePath;
    }

    private _isCurrentView = (expectedView: string): boolean => {
        return expectedView === this.props.storesHub.state.sharedState.urlState.view;
    }

    public componentDidMount(): void {
        this.props.storesHub.comparePageStore.addChangedListener(this._onComparePageStateChanged);
        this.props.storesHub.fileLineDiffCountStore.addChangedListener(this._onFileLineDiffCountStoreChanged);
    }

    public componentWillUnmount(): void {
        const storesHub = this.props.storesHub;
        if (!storesHub) {
            return;
        }

        if (storesHub.comparePageStore) {
            storesHub.comparePageStore.removeChangedListener(this._onComparePageStateChanged);
        }

        if (storesHub.fileLineDiffCountStore) {
            storesHub.fileLineDiffCountStore.removeChangedListener(this._onFileLineDiffCountStoreChanged);
        }
    }

    @autobind
    private _onComparePageStateChanged(): void {
        const comparePageState = this.props.storesHub.state.comparePageState;

        this.setState({
            title: comparePageState.comment,
            linesAdded: this._getLinesChangedCount(LinesChangedType.linesAddded),
            linesDeleted: this._getLinesChangedCount(LinesChangedType.linesDeleted),
            itemChangeType: comparePageState.itemChangeType,
        } as TopContentContainerState);
    }

    private _getLinesChangedCount(changeType: LinesChangedType): number {
        const storesHubState = this.props.storesHub.state;
        const selectedPath = storesHubState.comparePageState.gitItemPath;
        const selectedDiffItem = this._getSelectedDiffItem();
        const repoContext = storesHubState.sharedState.commonState.repositoryContext;

        if (this.state.itemChangeType === VersionControlChangeType.Edit
            && selectedDiffItem.mpath
            && selectedDiffItem.opath
            && selectedDiffItem.mversion
            && selectedDiffItem.oversion) {
            if (changeType === LinesChangedType.linesAddded) {
                return this.props.storesHub.fileLineDiffCountStore.getLinesAdded(selectedPath, selectedDiffItem, repoContext);
            } else {
                return this.props.storesHub.fileLineDiffCountStore.getLinesDeleted(selectedPath, selectedDiffItem, repoContext);
            }
        }

        return 0;
    }

    @autobind
    private _getSelectedDiffItem(): GitDiffItem {
        const gitItemPath = this.props.storesHub.state.comparePageState.gitItemPath;
        return {
            mpath: gitItemPath,
            opath: gitItemPath,
            mversion: this._getVersion(VersionControlConstants.MCommitVersionPrefix),
            oversion: this._getVersion(VersionControlConstants.OCommitVersionPrefix),
        } as GitDiffItem;
    }

    @autobind
    private _onFileLineDiffCountStoreChanged(): void {
        this.setState({
            linesAdded: this._getLinesChangedCount(LinesChangedType.linesAddded),
            linesDeleted: this._getLinesChangedCount(LinesChangedType.linesDeleted),
        } as TopContentContainerState);
    }

    private _getVersion(versionPrefix: string): string {
        const version = this.props.storesHub.state.comparePageState.version;
        return version ? (versionPrefix + version) : null;
    }
}