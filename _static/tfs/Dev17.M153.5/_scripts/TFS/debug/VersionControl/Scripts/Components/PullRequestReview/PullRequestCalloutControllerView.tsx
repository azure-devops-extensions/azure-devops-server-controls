import * as React from "react";

// used to fire actions from our UI components
import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";

// the component that contains our react-ish dialog box
import * as Activity from "VersionControl/Scripts/Components/PullRequestReview/Activities/Activity";

// stores
import { IPullRequest } from "VersionControl/Scripts/Stores/PullRequestReview/PullRequestDetailStore";

// contracts
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as IdentityImage from "Presentation/Scripts/TFS/Components/IdentityImage";
import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import * as VCContracts from "TFS/VersionControl/Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { Parser } from "VersionControl/Scripts/CommentParser";

// components
import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { PullRequestRollupStatus } from "VersionControl/Scenarios/Shared/PullRequest/PullRequestRollupStatus";
import { AutoCompleteCalloutContainer } from "VersionControl/Scripts/Components/PullRequestReview/AutoCompleteCallout";
import { ConflictList } from "VersionControl/Scripts/Components/PullRequestReview/ConflictList";
import { PullRequestCallout } from "VersionControl/Scripts/Components/PullRequestReview/PullRequestCallout";

import { PullRequestPermissions } from "VersionControl/Scenarios/PullRequestDetail/Stores/PullRequestPermissionsStore";
import * as AsyncRefOperationActionCreator from "VersionControl/Scripts/Actions/AsyncGitOperation/AsyncRefOperationActionCreator";
import { AsyncRefOperationType } from "VersionControl/Scripts/Actions/AsyncGitOperationActions";
import * as  VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as VCDateUtils from "VersionControl/Scripts/Utils/VersionControlDateUtils";

import { autobind, css } from "OfficeFabric/Utilities";
import { FormattedComponent } from "VersionControl/Scripts/Utils/Format";

import { FpsLink } from "VersionControl/Scenarios/Shared/FpsLink";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";

import "VSS/LoaderPlugins/Css!VersionControl/PullRequestRollupStatus";
import { IdentityRef } from "VSS/WebApi/Contracts";

export interface IPullRequestCalloutState {
    tfsContext: TfsContext;
    repositoryContext: GitRepositoryContext;
    pullRequest: IPullRequest;
    cherryPickFeatureIsEnabled: boolean;
    revertFeatureIsEnabled: boolean;
    conflictList: VCContracts.GitConflict[];
    conflictsOverflowed: boolean;
    has2ndOrderConflicts: boolean;
    isLoading: boolean;
    permissions: PullRequestPermissions;
}

/**
 * Top callout that tells you what action to take next.
 */
export class PullRequestCalloutControllerView extends React.Component<React.Props<void>, IPullRequestCalloutState> {
    private _mergeSetTimeoutHandle: number = null;

    constructor(props: React.Props<void>) {
        super(props);

        this.state = this._getStateFromStores();
    }

    public componentDidMount(): void {
        Flux.instance().storesHub.contextStore.addChangedListener(this._changeDelegate);
        Flux.instance().storesHub.pullRequestDetailStore.addChangedListener(this._changeDelegate);
        Flux.instance().storesHub.featureAvailabilityStore.addChangedListener(this._changeDelegate);
        Flux.instance().storesHub.conflictStore.addChangedListener(this._changeDelegate);
        Flux.instance().storesHub.permissionsStore.addChangedListener(this._changeDelegate);
    }

    public componentWillUnmount(): void {
        if (this._mergeSetTimeoutHandle) {
            clearTimeout(this._mergeSetTimeoutHandle);
        }

        Flux.instance().storesHub.conflictStore.removeChangedListener(this._changeDelegate);
        Flux.instance().storesHub.featureAvailabilityStore.removeChangedListener(this._changeDelegate);
        Flux.instance().storesHub.pullRequestDetailStore.removeChangedListener(this._changeDelegate);
        Flux.instance().storesHub.contextStore.removeChangedListener(this._changeDelegate);
        Flux.instance().storesHub.permissionsStore.removeChangedListener(this._changeDelegate);
    }

    public render(): JSX.Element {
        return <div className="vc-pullrequest-callout-component" aria-live="polite">
            {this._renderContent()}
        </div>;
    }

    private _renderContent(): JSX.Element {
        /* Basic priority list:
         *
         * PR is completed
         * PR is abandoned
         * Branch(es) deleted
         * Merge is not successful (running / conflicts / exception / etc)
         * Policies failing
         */

        const pullRequest = this.state.pullRequest;

        if (this.state.isLoading) {
            return <PullRequestCallout />;
        }

        if (pullRequest.status === VCContracts.PullRequestStatus.Completed) {
            return this._renderComplete();
        }

        if (pullRequest.status === VCContracts.PullRequestStatus.Active && pullRequest.completionQueueTime) {
            return this._renderCompletionQueue();
        }

        if (pullRequest.status === VCContracts.PullRequestStatus.Abandoned) {
            return this._renderAbandoned();
        }

        const sourceDeleted = pullRequest.branchStatusContract().sourceBranchStatus.isDeleted;
        const targetDeleted = pullRequest.branchStatusContract().targetBranchStatus.isDeleted;

        if (sourceDeleted || targetDeleted) {
            return this._renderSourceOrTargetDeleted(sourceDeleted, targetDeleted);
        }

        if (pullRequest.externallyMerged) {
            return this._renderExternallyMerged();
        }

        let content: JSX.Element;

        switch (pullRequest.mergeStatus) {
            case VCContracts.PullRequestAsyncStatus.Conflicts:
                return this._renderConflicts();

            case VCContracts.PullRequestAsyncStatus.Failure:
            case VCContracts.PullRequestAsyncStatus.RejectedByPolicy:
                return this._renderFailure();

            case VCContracts.PullRequestAsyncStatus.Succeeded:
                content = <PullRequestCallout />;
                break; // ready to complete

            case VCContracts.PullRequestAsyncStatus.NotSet:
            case VCContracts.PullRequestAsyncStatus.Queued:
            default:
                content = this._renderQueued();
                break;
        }

        const autoCompleter: IdentityRef = pullRequest.autoCompleteSetBy;
        if (pullRequest.status === VCContracts.PullRequestStatus.Active
            && autoCompleter && autoCompleter.id && autoCompleter.id !== "00000000-0000-0000-0000-000000000000") {

            return <AutoCompleteCalloutContainer
                autoCompleter={autoCompleter}
                pullRequest={pullRequest}
                tfsContext={this.state.tfsContext}
                hasPermissionToCancelAutoComplete={this.state.permissions.cancelAutoComplete}
                cancelAutoComplete={this._cancelAutoComplete} />;
        }

        return content;
    }

    @autobind
    private _changeDelegate(): void {
        this.setState(this._getStateFromStores());
    }

    private _getStateFromStores(): IPullRequestCalloutState {
        return {
            tfsContext: Flux.instance().storesHub.contextStore.getTfsContext(),
            repositoryContext: Flux.instance().storesHub.contextStore.getRepositoryContext() as GitRepositoryContext,
            pullRequest: Flux.instance().storesHub.pullRequestDetailStore.getPullRequestDetail(),
            cherryPickFeatureIsEnabled: Flux.instance().storesHub.featureAvailabilityStore.getCherryPickFeatureIsEnabled(),
            revertFeatureIsEnabled: Flux.instance().storesHub.featureAvailabilityStore.getRevertFeatureIsEnabled(),
            conflictList: Flux.instance().storesHub.conflictStore.isLoading() ? [] : Flux.instance().storesHub.conflictStore.getConflicts(),
            conflictsOverflowed: Flux.instance().storesHub.conflictStore.isLoading() ? false : Flux.instance().storesHub.conflictStore.getOverflow(),
            has2ndOrderConflicts: Flux.instance().storesHub.conflictStore.isLoading() ? false : Flux.instance().storesHub.conflictStore.has2ndOrderConlicts(),
            permissions: Flux.instance().storesHub.permissionsStore.getPermissions(),
            isLoading:
                Flux.instance().storesHub.pullRequestDetailStore.isLoading()
                || Flux.instance().storesHub.contextStore.isLoading()
                || Flux.instance().storesHub.featureAvailabilityStore.isLoading()
                || Flux.instance().storesHub.permissionsStore.isLoading(),
        };
    }

    @autobind
    private _cherryPick(): void {
        AsyncRefOperationActionCreator.ActionCreator.startDesigningAsyncRefOperation(
            this.state.repositoryContext,
            this.state.pullRequest.sourceFriendlyName,
            Utils_String.format(VCResources.CherryPick_Dialog_Title_PullRequest, this.state.pullRequest.pullRequestId),
            AsyncRefOperationType.CherryPick);
    }

    @autobind
    private _revert(): void {
        AsyncRefOperationActionCreator.ActionCreator.startDesigningAsyncRefOperation(
            this.state.repositoryContext,
            this.state.pullRequest.sourceFriendlyName,
            Utils_String.format(VCResources.Revert_Dialog_Title_PullRequest, this.state.pullRequest.pullRequestId),
            AsyncRefOperationType.Revert,
            new VCSpecs.GitBranchVersionSpec(this.state.pullRequest.targetFriendlyName));
    }

    @autobind
    private _cancelAutoComplete(): void {
        const completionOptions = this.state.pullRequest.pullRequestContract().completionOptions;

        Flux.instance().actionCreator.pullRequestActionCreator.updatePullRequestAutoCompletion(
            this.state.pullRequest.pullRequestId,
            false,
            completionOptions);
    }

    @autobind
    private _deleteSourceBranch(): void {
        Flux.instance().actionCreator.pullRequestActionCreator.deleteSourceRef(this.state.pullRequest.pullRequestContract());
    }

    @autobind
    private _publish(): void {
        Flux.instance().actionCreator.pullRequestActionCreator.publishPullRequest(this.state.pullRequest.pullRequestId);
    }

    @autobind
    private _abandon(): void {
        Flux.instance().actionCreator.pullRequestActionCreator.abandonPullRequest(this.state.pullRequest.pullRequestId);
    }

    @autobind
    private _retryMerge(): void {
        Flux.instance().actionCreator.pullRequestActionCreator.retryMergePullRequest(this.state.pullRequest.pullRequestId);
    }

    @autobind
    private _reactivate(): void {
        Flux.instance().actionCreator.pullRequestActionCreator.reactivatePullRequest(this.state.pullRequest.pullRequestId);
    }

    @autobind
    private _close(): void {
        Flux.instance().actionCreator.pullRequestActionCreator.completePullRequest(
            this.state.pullRequest.pullRequestContract(),
            {} as VCContracts.GitPullRequestCompletionOptions);
    }

    private _deleteSourceBranchButton(): JSX.Element {
        const pullRequest = this.state.pullRequest;

        return this.state.permissions.deleteSourceBranch &&
            <DefaultButton
                className="callout-button"
                key="deleteSourceBranch"
                disabled={!pullRequest.canDeleteSourceBranch}
                title={!pullRequest.canDeleteSourceBranch ? this.state.pullRequest.cannotDeleteReasonHint : null}
                onClick={this._deleteSourceBranch}>
                {VCResources.PullRequest_DeleteSourceBranch}
            </DefaultButton>;
    }

    private _revertButton(): JSX.Element {
        if (this.state.revertFeatureIsEnabled && this.state.permissions.cherryPickRevert) {
            return (
                <DefaultButton
                    className="callout-button"
                    key="revert"
                    onClick={this._revert}>
                    {VCResources.PullRequest_Revert_Button}
                </DefaultButton>
            );
        }
        return null;
    }

    private _cherryPickButton(): JSX.Element {
        if (this.state.cherryPickFeatureIsEnabled && this.state.permissions.cherryPickRevert) {
            return <DefaultButton
                className="callout-button"
                key="cherryPick"
                onClick={this._cherryPick}>
                {VCResources.PullRequest_CherryPick_CalloutButton}
            </DefaultButton>;
        }
        return null;
    }

    private _publishButton(): JSX.Element {
        if (!this.state.permissions.publishUnpublish) {
            return null;
        }

        return <PrimaryButton
            className="callout-button"
            key="publish"
            onClick={this._publish}>
            {VCResources.PullRequest_ClearIsDraft}
        </PrimaryButton>;
    }

    private _abandonButton(callToAction: boolean): JSX.Element {
        if (!this.state.permissions.abandonReactivate) {
            return null;
        }

        if (callToAction) {
            return <PrimaryButton
                className="callout-button"
                key="abandon"
                onClick={this._abandon}>
                {VCResources.PullRequest_AbandonPullRequest}
            </PrimaryButton>;
        }

        return <DefaultButton
            className="callout-button"
            key="abandon"
            onClick={this._abandon}>
            {VCResources.PullRequest_AbandonPullRequest}
        </DefaultButton>;
    }

    private _retryMergeButton(): JSX.Element {
        return this.state.permissions.restartMerge &&
            <DefaultButton
                className="callout-button"
                key="retryMerge"
                onClick={this._retryMerge}>
                {VCResources.RestartMerge}
            </DefaultButton>;
    }

    private _reactivateButton(): JSX.Element {
        return this.state.permissions.abandonReactivate && 
            <PrimaryButton
                className="callout-button"
                key="reactivate"
                onClick={this._reactivate}>
                {VCResources.PullRequest_ReactivatePullRequest}
            </PrimaryButton>;
    }

    private _closeButton(): JSX.Element {
        return this.state.permissions.complete &&
            <PrimaryButton
                className="callout-button"
                key="close"
                onClick={this._close}>
                {VCResources.PullRequest_ClosePullRequest}
            </PrimaryButton>;
    }

    // PR Completed callout
    private _renderComplete(): JSX.Element {

        const { pullRequest, tfsContext, repositoryContext } = this.state;

        const closedByDisplayName =
            (pullRequest.closedBy && pullRequest.closedBy.displayName)
            // This shouldn't happen
            || VCResources.PullRequest_PullRequestDetailsStatusUnKnown;

        const when: Date = pullRequest.closedDate || pullRequest.completionQueueTime;

        const whenSpanHtml: string = VCDateUtils.getDateStringWithFriendlyText(when);

        const lastMergeCommit = pullRequest.pullRequestContract().lastMergeCommit;

        const whatHappened: string = (lastMergeCommit && pullRequest.squashMerge) ?
            VCResources.PullRequest_CallToAction_CompletedWithSquash
            : VCResources.PullRequest_CallToAction_Completed;

        let closerImage: JSX.Element = null;

        if (pullRequest.closedBy && pullRequest.closedBy.id) {
            closerImage = Activity.tfIdImage(tfsContext, pullRequest.closedBy, IdentityImage.imageSizeXSmall);
        }

        let calloutContents = (
            <FormattedComponent
                className="vc-pullrequest-callout-text"
                key="callout"
                elementType="div"
                format={whatHappened}>
                {[
                    closedByDisplayName,
                    whenSpanHtml
                ]}
            </FormattedComponent>
        );

        if (lastMergeCommit) {
            // If there is a merge commit, put a link and description of it. This won't appear if the PR was merged externally.

            const commitUrl = VersionControlUrls.getCommitUrl(repositoryContext, lastMergeCommit.commitId);

            // truncate client side if needed
            let comment: string = Parser.getShortComment(lastMergeCommit.comment, null, true);
            const elide: number = comment.lastIndexOf("...");

            if (lastMergeCommit.commentTruncated && (elide < comment.length - 3)) {
                comment = comment + "...";
            }

            calloutContents = (
                <div key="callout" className="vc-pullrequest-callout-container">
                    <PullRequestRollupStatus
                        pullRequest={pullRequest.pullRequestContract()} />
                    {calloutContents}

                    <div key="commitInfo" className="callout-details">
                        <br />
                        <FpsLink className="space-right" href={commitUrl} targetHubId={CodeHubContributionIds.historyHub}>
                            {lastMergeCommit.commitId.substr(0, 8)}
                        </FpsLink>
                        <i className="bowtie-icon bowtie-tfvc-commit space-right" />
                        <span className="space-right">{closerImage}</span>
                        <span>{comment}</span>
                    </div>
                </div>
            );
        }
        else {
            // if the pr was externally merged, just say it was closed instead of tricking people into thinking anything was merged
            calloutContents =
                <FormattedComponent
                    className="vc-pullrequest-callout-text"
                    key="callout"
                    elementType="div"
                    format={VCResources.PullRequest_CallToAction_ExternallyCompleted}>
                    {[
                        closedByDisplayName,
                        whenSpanHtml,
                        pullRequest.targetFriendlyName
                    ]}
                </FormattedComponent>;
        }

        return (
            <PullRequestCallout
                className="completed"
                buttons={[
                    this._cherryPickButton(),
                    this._revertButton(),
                ]}>
                {calloutContents}
            </PullRequestCallout>
        );
    }

    // PR in completion queue callout
    private _renderCompletionQueue(): JSX.Element {
        const { pullRequest, tfsContext } = this.state;
        const myId = tfsContext.currentIdentity.id;
        const closerId = pullRequest.closedBy && pullRequest.closedBy.id;

        let calloutText: string;

        if (myId === closerId) {
            calloutText = VCResources.PullRequest_CallToAction_Completing_Myself;
        }
        else {
            const closedByDisplayName =
                (pullRequest.closedBy && pullRequest.closedBy.displayName)
                // This shouldn't happen
                || VCResources.PullRequest_PullRequestDetailsStatusUnKnown;

            calloutText = Utils_String.format(VCResources.PullRequest_CallToAction_Completing_Other, closedByDisplayName);
        }

        let calloutContents = (
            <div className="vc-pullrequest-callout-text" key="callout">{calloutText}</div>
        );

        if (pullRequest.mergeStatus === VCContracts.PullRequestAsyncStatus.Queued) {
            calloutContents = (
                <div key="callout" className="vc-pullrequest-callout-container">
                    {calloutContents}

                    <div key="mergeInfo" className="callout-details">
                        <br />
                        <i className="bowtie-icon bowtie-play-fill space-right" />
                        <span>{VCResources.PullRequest_CallToAction_MergeRunning}</span>
                    </div>
                </div>
            );
        }

        return <PullRequestCallout>
            {calloutContents}
        </PullRequestCallout>;
    }

    // PR Abandoned callout
    private _renderAbandoned(): JSX.Element {
        const { pullRequest, tfsContext } = this.state;

        const closedDate = pullRequest.closedDate;

        const whenSpanHtml = closedDate && <span title={Utils_String.htmlEncodeJavascriptAttribute(Utils_Date.localeFormat(closedDate, "G"))}>
            {Utils_String.htmlEncode(Utils_Date.ago(closedDate))}
        </span>;

        const calloutContents = <FormattedComponent
            key="callout"
            className="vc-pullrequest-callout-text"
            elementType="div"
            format={VCResources.PullRequest_CallToAction_Reactivate}>
            {whenSpanHtml}
        </FormattedComponent>;

        const buttons = [this._deleteSourceBranchButton()];

        // Add reactivate button (if able)
        if (pullRequest.canReactivate) {
            buttons.push(this._reactivateButton());
        }

        return <PullRequestCallout buttons={buttons}>
            {calloutContents}
        </PullRequestCallout>;
    }

    // Source and/or target deleted callout
    private _renderSourceOrTargetDeleted(sourceDeleted: boolean, targetDeleted: boolean): JSX.Element {
        let text: string;

        if (sourceDeleted && targetDeleted) {
            text = VCResources.PullRequest_SourceAndTargetBranchDeleted;
        }
        else if (sourceDeleted) {
            text = VCResources.PullRequest_SourceBranchDeleted;
        }
        else {
            text = VCResources.PullRequest_TargetBranchDeleted;
        }

        return <PullRequestCallout
            className="blocked"
            buttons={[this._deleteSourceBranchButton(), this._abandonButton(true)]}>
            <div key="callout" className="vc-pullrequest-callout-text">
                {text}
            </div>
        </PullRequestCallout>;
    }

    // User merged changes externally and pushed; suggest that they "Close" pull request
    private _renderExternallyMerged(): JSX.Element {
        const { pullRequest, tfsContext } = this.state;

        const calloutContents =
            <div key="callout" className="vc-pullrequest-callout-text">
                {Utils_String.format(VCResources.PullRequest_CallToAction_ExternallyMerged, pullRequest.targetFriendlyName)}
            </div>;

        const buttons = [this._abandonButton(true)];

        if (this.state.permissions.complete) {
            buttons.push(this._closeButton());
        }

        return <PullRequestCallout className="completed" buttons={buttons}>
            {calloutContents}
        </PullRequestCallout>;
    }

    // Conflicts callout
    private _renderConflicts(): JSX.Element {
        return <PullRequestCallout className="conflict-list" buttons={[this._abandonButton(true)]}>
            <ConflictList key="callout"
                conflictList={this.state.conflictList}
                conflictsOverflowed={this.state.conflictsOverflowed}
                has2ndOrderConlicts={this.state.has2ndOrderConflicts} />
        </PullRequestCallout>;
    }

    // Merge failed callout
    private _renderFailure(): JSX.Element {
        const { pullRequest, tfsContext } = this.state;

        const failureInfo = (
            <div key="failureInfo" className="callout-details">
                <br />
                {pullRequest.mergeFailureMessage}
            </div>);

        const calloutContents = (
            <div key="callout" className="vc-pullrequest-callout-container">
                <div className="vc-pullrequest-callout-text" key="callout">
                    {VCResources.PullRequest_CallToAction_SystemMergeFailed}
                </div>
                {pullRequest.mergeFailureMessage ? failureInfo : null}
            </div>);

        return <PullRequestCallout
            className="blocked"
            buttons={[this._abandonButton(false), this._retryMergeButton()]}>
            {calloutContents}
        </PullRequestCallout>;
    }

    // Queued callout
    private _renderQueued(): JSX.Element {
        const mergeStaleTime = Flux.instance().storesHub.pullRequestDetailStore.getMergeStaleTime();
        let showMergeCallout = false;

        if (mergeStaleTime) {
            const showMergeCalloutInMs = mergeStaleTime - Date.now();

            if (showMergeCalloutInMs <= 0) {
                showMergeCallout = true;
            }
            else {
                if (this._mergeSetTimeoutHandle) {
                    clearTimeout(this._mergeSetTimeoutHandle);
                }

                this._mergeSetTimeoutHandle = setTimeout(() => this.forceUpdate(), showMergeCalloutInMs);
            }
        }

        if (showMergeCallout) {
            return <PullRequestCallout buttons={[this._abandonButton(false), this._retryMergeButton()]}>
                <div key="callout" className="vc-pullrequest-callout-text">
                    <i className="bowtie-icon bowtie-play-fill space-right" />
                    <span>{VCResources.PullRequest_CallToAction_MergeRunning}</span>
                </div>
            </PullRequestCallout>;
        }

        // render empty
        return <PullRequestCallout />;
    }
}
