import { autobind } from "OfficeFabric/Utilities";
import { RemoteStore } from "VSS/Flux/Store";
import { format } from "VSS/Utils/String";
import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { ISquashPolicySetting } from "VersionControl/Scenarios/PullRequestDetail/Stores/ClientPolicyEvaluationStore";
import { IPullRequest } from "VersionControl/Scripts/Stores/PullRequestReview/PullRequestDetailStore";
import { GitPullRequest, GitPullRequestCompletionOptions } from "TFS/VersionControl/Contracts";

export class PullRequestCompleteMergeStore extends RemoteStore {
    private _completionOptions: GitPullRequestCompletionOptions;
    private _pullRequest: GitPullRequest;
    private _pullRequestDetail: IPullRequest;
    private _mergeTitle: string;
    private _mergeDescription: string;
    private _relatedWorkItemIds: number[];
    private _initialMergeDescription;
    private _initialMergeTitle;
    private _mergeDescriptionError: string;
    private _shouldBypass: boolean;
    private _canBypassPolicy: boolean;
    private _canTransitionWorkItems: boolean;
    private _squashPolicySetting: ISquashPolicySetting;

    private static readonly MERGE_MESSAGE_SEPARATOR = "\n\n";
    private static readonly MERGEMESSAGE_SINGLE_SEPARATOR = "\n";
    private static readonly WORKITEM_SEPARATOR = ", ";
    private static readonly MAX_COMMIT_MESSAGE_LENGTH: number = 3710;
    private static readonly MAX_COMPLETION_OPTIONS_JSON_LENGTH: number = 4000;

    // Action handlers
    @autobind
    public onDialogOpened(payload: Actions.IOpenCompletionDialogPayload): void {
        if (!this._pullRequestDetail){
            this._pullRequestDetail = payload.pullRequestDetail;
            this._pullRequest = this._pullRequestDetail.pullRequestContract();
        }
        this._squashPolicySetting = payload.squashPolicySetting;

        // permissions
        this._canTransitionWorkItems = payload.canTransitionWorkItems;
        this._canBypassPolicy = payload.canBypassPolicy;

        // work items
        this._relatedWorkItemIds = payload.associatedWorkItemIds;

        // Always reset bypass, bypass reason, delete source, transition workitems and squash options when dialog opens
        this._completionOptions = {
            mergeCommitMessage: "",
            bypassReason: "",
            bypassPolicy: false,
            deleteSourceBranch: payload.shouldDeleteSourceBranch && this._pullRequestDetail.canDeleteSourceBranch,
            squashMerge: this._calculateShouldSquashMerge(payload.shouldSquashMerge),
            transitionWorkItems: this._calculateCompleteWorkItemsOptionEnabled(payload.shouldTransitionWorkItems),
        } as GitPullRequestCompletionOptions;

        this._mergeTitle = this._getMergeTitle();
        this._mergeDescription = this._getMergeDescription();

        // this will allow components that use this store to hold off on allowing actions until this action handler is
        // invoked at least once
        this._loading = false;

        this._updateCommitMessage();
        this.emitChanged();
    }

    @autobind
    public onPullRequestDetailUpdated(payload: Actions.IPullRequestDetailPayload): void {
        this._pullRequestDetail = payload.pullRequestDetail;
        this._pullRequest = this._pullRequestDetail.pullRequestContract();
        if (!this._loading) {
            this._recalculateJsonLength();
            this.emitChanged();
        }
    }

    @autobind
    public onMergeTitleChanged(payload: Actions.IMergeTitlePayload): void {
        this._mergeTitle = payload.mergeTitle;
        this._updateCommitMessage();
        this.emitChanged();
    }

    @autobind
    public onMergeDescriptionChanged(payload: Actions.IMergeDescriptionPayload): void {
        this._mergeDescription = payload.mergeDescription;
        this._updateCommitMessage();
        this.emitChanged();
    }

    @autobind
    public onBypassChanged(payload: Actions.ICompletionOptionPayload): void {
        this._shouldBypass =  (this._canBypassPolicy) ? payload.shouldEnable : false;

        if (!this._shouldBypass) {
            // bypass is explicitly disabled so upadate options and clear bypass reason
            this._completionOptions.bypassReason = "";
            this._completionOptions.bypassPolicy = false;
            this._completionOptions.squashMerge = this._calculateShouldSquashMerge(this._completionOptions.squashMerge);
        }
        this._recalculateJsonLength();
        this.emitChanged();
    }

    @autobind
    public onBypassReasonChanged(payload: Actions.IBypassReasonPayload): void {
        if (!payload.bypassReason || payload.bypassReason === "" || !this._canBypassPolicy || !this._shouldBypass) {
            this._completionOptions.bypassReason = "";
            this._completionOptions.bypassPolicy = false;
        }
        else {
            this._completionOptions.bypassReason = payload.bypassReason;
            this._completionOptions.bypassPolicy = true;
        }
        this._recalculateJsonLength();
        this.emitChanged();
    }

    @autobind
    public onSquashMergeUpdated(payload: Actions.ICompletionOptionPayload): void {
        if (this._loading) {
            return;
        }

        this._completionOptions.squashMerge = this._calculateShouldSquashMerge(payload.shouldEnable);
        this._recalculateJsonLength();
        this.emitChanged();
    }

    @autobind
    public onDeleteSourceBranchUpdated(payload: Actions.ICompletionOptionPayload): void {
        if (this._loading) {
            return;
        }
        this._completionOptions.deleteSourceBranch = payload.shouldEnable && this._pullRequestDetail.canDeleteSourceBranch;
        this._recalculateJsonLength();
        this.emitChanged();
    }

    @autobind
    public onTransitionWorkItemsUpdated(payload: Actions.ICompletionOptionPayload): void {
        if (this._loading) {
            return;
        }
        this._completionOptions.transitionWorkItems = this._calculateCompleteWorkItemsOptionEnabled(payload.shouldEnable);
        this._recalculateJsonLength();
        this.emitChanged();
    }

    // Store Property accessors
    public getCompletionOptions(): GitPullRequestCompletionOptions {
        return this._completionOptions;
    }

    public getMergeTitle(): string {
        return this._mergeTitle;
    }

    public getMergeDescription(): string {
        return this._mergeDescription;
    }

    public getMergeDescriptionError(): string {
        return this._mergeDescriptionError;
    }

    public getInitialMergeTitle(): string {
        return this._initialMergeTitle;
    }

    public getInitialMergeDescription(): string {
        return this._initialMergeDescription;
    }

    public getSquashPolicySetting(): ISquashPolicySetting {
        return this._squashPolicySetting;
    }

    public canTransitionWorkItems(): boolean {
        return this._canTransitionWorkItems && this._relatedWorkItemIds && this._relatedWorkItemIds.length > 0;
    }

    public shouldBypassPolicy(): boolean {
        return this._shouldBypass;
    }

    public canBypassPolicy(): boolean {
        return this._canBypassPolicy;
    }

    public getBypassReason(): string {
        return this._completionOptions && this._canBypassPolicy ? this._completionOptions.bypassReason : "";
    }

    public canDeleteSourceBranch(): boolean {
        return this._pullRequestDetail.canDeleteSourceBranch;
    }

    public getCannotDeleteReasonHint(): string {
        if (!this._pullRequestDetail.canDeleteSourceBranch) {
            return this._pullRequestDetail.cannotDeleteReasonHint;
        }

        return null;
    }

    public getSourceFriendlyName(): string {
        return this._pullRequestDetail.sourceFriendlyName;
    }

    public getSquashMergeWarning(): string {
        if (this._completionOptions.squashMerge &&
            !this._completionOptions.deleteSourceBranch &&
            this._pullRequestDetail.canDeleteSourceBranch) {
            return VCResources.PullRequest_CompleteMergeDialog_SquashMergeWarning;
        }

        return null;
    }

    // helper functions
    private _updateCommitMessage(): void {
        const mergeCommitMessage = this._mergeTitle.trim() + PullRequestCompleteMergeStore.MERGE_MESSAGE_SEPARATOR + this._mergeDescription.trim();
        this._completionOptions.mergeCommitMessage = mergeCommitMessage;
        this._recalculateJsonLength();
    }

    private _recalculateJsonLength(): void {
        // limit the calculation to the string fields (bypass reason and commitMessage) in completion options
        const tempOptions = {
            ...this._completionOptions,
            bypassPolicy: false,
            deleteSourceBranch: false,
            squashMerge: false,
            transitionWorkItems: false,
        } as GitPullRequestCompletionOptions;

        this._mergeDescriptionError = (JSON.stringify(tempOptions).length > PullRequestCompleteMergeStore.MAX_COMPLETION_OPTIONS_JSON_LENGTH) ?  
            VCResources.PullRequest_CompleteMergeDialog_DescriptionTextTooLong : "";
    }

    private _calculateShouldSquashMerge(value: boolean): boolean {
        // over-write if the merge policy requires a specific value
        let shouldSquashMerge = this._squashPolicySetting.isEnabled ? this._squashPolicySetting.useSquashMerge : value;

        // if user has chosen to bypass policies and there is a squash Policy use payload value
        shouldSquashMerge = this._canBypassPolicy && this._shouldBypass && this._squashPolicySetting.isEnabled ? value : shouldSquashMerge;

        return shouldSquashMerge;
    }

    private _calculateCompleteWorkItemsOptionEnabled(shouldTransitionWorkItems: boolean): boolean {
        return shouldTransitionWorkItems &&
            this._relatedWorkItemIds &&
            this._relatedWorkItemIds.length > 0 &&
            this._canTransitionWorkItems;
    }

    private _getMergeTitle(): string {
        if (this._pullRequest
            && this._pullRequest.completionOptions
            && this._pullRequest.completionOptions.mergeCommitMessage) {
            const mergeMessageSplit = this._pullRequest.completionOptions.mergeCommitMessage.split(PullRequestCompleteMergeStore.MERGE_MESSAGE_SEPARATOR);
            return mergeMessageSplit[0];
        }

        const mergeTitle = format(
            VCResources.PullRequest_CompleteMergeDialog_MergeTitle,
            this._pullRequest.pullRequestId,
            this._pullRequest.title
        );

        this._initialMergeTitle = mergeTitle;

        return mergeTitle;
    }

    private _getMergeDescription(): string {
        const pullRequest = this._pullRequest;

        if (pullRequest
            && pullRequest.completionOptions
            && pullRequest.completionOptions.mergeCommitMessage) {
            const mergeMessageSplit = pullRequest.completionOptions.mergeCommitMessage.split(PullRequestCompleteMergeStore.MERGE_MESSAGE_SEPARATOR);
            if (mergeMessageSplit.length > 1) {

                // parse out work items and add any new ones
                // use the previous completion description, if we have one
                return PullRequestCompleteMergeStore._parseRelatedWorkItems(mergeMessageSplit, this._relatedWorkItemIds);
            }
        }

        let description = (pullRequest && pullRequest.description) ? pullRequest.description : "";

        // add related work items, if needed
        const relatedWorkItems = PullRequestCompleteMergeStore._computeRelatedWorkItems(this._relatedWorkItemIds);
        if (relatedWorkItems) {
            description = description
                + PullRequestCompleteMergeStore.MERGE_MESSAGE_SEPARATOR
                + relatedWorkItems;
        }

        this._initialMergeDescription = description;

        return description;
    }

    private static _computeRelatedWorkItems(relatedWorkItemIds?: number[]): string {
        if (!relatedWorkItemIds) {
            return null;
        }

        let workItemsString = null;

        if (relatedWorkItemIds.length > 0) {
            workItemsString = VCResources.PullRequest_RelatedWorkItems
                + format(VCResources.PullRequest_MentionWorkItems, relatedWorkItemIds[0])

            for (let index = 1; index < relatedWorkItemIds.length; index++) {
                workItemsString = workItemsString
                    + PullRequestCompleteMergeStore.WORKITEM_SEPARATOR
                    + format(VCResources.PullRequest_MentionWorkItems, relatedWorkItemIds[index]);
            }
        }
        return workItemsString;
    }

    private static _parseRelatedWorkItems(mergeMessageSplit: string[], relatedWorkItemIds?: number[]): string {
        let mergeDetailsInput = null;
        let workItemsHaveBeenSet = false;

        // extract the details portion from the previous merge message
        for (let i = 1; i < mergeMessageSplit.length; i++) {

            // split the merge details message by single separator to cover the case when user typed something in middle of lines
            const mergeMessageLine = mergeMessageSplit[i].split(PullRequestCompleteMergeStore.MERGEMESSAGE_SINGLE_SEPARATOR);

            // extract each line from details portion
            for (let j = 0; j < mergeMessageLine.length; j++) {
                const relatedWITStringLength = VCResources.PullRequest_RelatedWorkItems.length;

                // if line's length is greater than "Related work items: " string length
                if (mergeMessageLine[j].length > relatedWITStringLength) {

                    if (mergeMessageLine[j].slice(0, relatedWITStringLength) !== VCResources.PullRequest_RelatedWorkItems) {
                        mergeDetailsInput = (mergeDetailsInput == null) ? mergeMessageLine[j] : (mergeDetailsInput + PullRequestCompleteMergeStore.MERGEMESSAGE_SINGLE_SEPARATOR + mergeMessageLine[j]);
                    }
                    // if line does start with "Related work items: " string, then override the related work-items with current linked work-items
                    else if (relatedWorkItemIds != null) {
                        const relatedWorkItems = PullRequestCompleteMergeStore._computeRelatedWorkItems(relatedWorkItemIds);
                        if (relatedWorkItems) {
                            mergeDetailsInput = mergeDetailsInput === null ? relatedWorkItems : (mergeDetailsInput + PullRequestCompleteMergeStore.MERGEMESSAGE_SINGLE_SEPARATOR + relatedWorkItems);
                        }
                        workItemsHaveBeenSet = true;
                    }
                }
                else {
                    mergeDetailsInput = mergeDetailsInput === null ? mergeMessageLine[j] : (mergeDetailsInput + PullRequestCompleteMergeStore.MERGEMESSAGE_SINGLE_SEPARATOR + mergeMessageLine[j]);
                }
            }

            if (i !== mergeMessageSplit.length - 1) {
                // add a line to let the message appear as typed by user
                mergeDetailsInput = mergeDetailsInput === null ? mergeDetailsInput : (mergeDetailsInput + PullRequestCompleteMergeStore.MERGEMESSAGE_SINGLE_SEPARATOR);
            }
        }

        if (!workItemsHaveBeenSet) {
            const relatedWorkItems = PullRequestCompleteMergeStore._computeRelatedWorkItems(relatedWorkItemIds);
            if (relatedWorkItems) {
                mergeDetailsInput = mergeDetailsInput === null ? PullRequestCompleteMergeStore._computeRelatedWorkItems(relatedWorkItemIds) : (mergeDetailsInput + PullRequestCompleteMergeStore.MERGEMESSAGE_SINGLE_SEPARATOR + PullRequestCompleteMergeStore._computeRelatedWorkItems(relatedWorkItemIds));
            }
        }

        return mergeDetailsInput;
    }
}
