import * as React from "react";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { Async, autobind, KeyCodes } from "OfficeFabric/Utilities";
import { DisableAutoCompleteDialog } from "VersionControl/Scenarios/PullRequestDetail/Components/DisableAutoCompleteDialog";

import { ClientPolicyEvaluation, PullRequestPolicyTypeIds } from "VersionControl/Scenarios/PullRequestDetail/Policy/ClientPolicyEvaluation";
import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";

import { getMenuIcon } from "VersionControl/Scenarios/Shared/DropdownButton";
import { ReviewerImage } from "VersionControl/Scenarios/Shared/Reviewers/ReviewerImage";

import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { PullRequestVoteStatus } from "VersionControl/Scripts/PullRequestTypes";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { IPullRequest } from "VersionControl/Scripts/Stores/PullRequestReview/PullRequestDetailStore";
import { ReviewerItem } from "VersionControl/Scripts/Utils/ReviewerUtils";

import * as VSS_Telemetry from "VSS/Telemetry/Services";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!VersionControl/VoteControl";

export interface IVoteControlProps {
    pullRequest: IPullRequest;
    isCTA: boolean;
}

export interface IVoteControlState {
    unsavedCommentCount: number;
    currentUserWithVote: ReviewerItem;
    isDisableAutoCompleteDialogOpen: boolean;
    preventUnintentionalAutoComplete: boolean;
    hasPermissionToVote: boolean;
    hasPermissionToCancelAutoComplete: boolean;
}

interface IVoteItem {
    id: string;
    isSeparator: boolean;
    text?: string;
    icon?: string;
    action?: number;
}

/**
 * Vote control is a control that allows a user to vote on the current pull request.
 */
export class VoteControl extends React.Component<IVoteControlProps, IVoteControlState> {
    private static _voteItems: IVoteItem[] = [
        {
            id: "pull-request-vote-approved",
            isSeparator: false,
            text: VCResources.PullRequest_Vote_Approve,
            icon: "bowtie-icon bowtie-status-success custom-icon-color",
            action: PullRequestVoteStatus.APPROVE
        },
        {
            id: "pull-request-vote-approved-with-comment",
            isSeparator: false,
            text: VCResources.PullRequest_Vote_ApproveWithComment,
            icon: "bowtie-icon bowtie-status-success custom-icon-color",
            action: PullRequestVoteStatus.APPROVE_WITH_COMMENT
        },
        {
            id: "pull-request-vote-not-ready",
            isSeparator: false,
            text: VCResources.PullRequest_Vote_NotReady,
            icon: "bowtie-icon bowtie-status-waiting-fill custom-icon-color",
            action: PullRequestVoteStatus.NOT_READY
        },
        {
            id: "pull-request-vote-reject",
            isSeparator: false,
            text: VCResources.PullRequest_Vote_Reject,
            icon: "bowtie-icon  bowtie-status-failure custom-icon-color",
            action: PullRequestVoteStatus.REJECT
        },
        {
            id: "separator-1",
            isSeparator: true,
        },
        {
            id: "pull-request-vote-no-response",
            isSeparator: false,
            text: VCResources.PullRequest_Vote_ResetFeedback,
            icon: "bowtie-icon bowtie-status-waiting",
            action: PullRequestVoteStatus.NONE
        },
    ];

    private _async: Async;

    constructor(props: IVoteControlProps) {
        super(props);

        this.state = this._getStateFromStores();
        this.state = {...this.state, isDisableAutoCompleteDialogOpen: false};

        this._async = new Async();
        this._mainActionButtonClick = this._async.throttle(this._mainActionButtonClick, 2000, { leading: true })
    }

    public componentDidMount() {
        Flux.instance().storesHub.discussionsStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.reviewersStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.clientPolicyEvaluationStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.permissionsStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        Flux.instance().storesHub.discussionsStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.reviewersStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.clientPolicyEvaluationStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.permissionsStore.removeChangedListener(this._onChange);

        this._async && this._async.dispose();
    }

    private _onChange = (): void => {
        this.setState(this._getStateFromStores());
    }

    private _getStateFromStores(): IVoteControlState {
        const permissions = Flux.instance().storesHub.permissionsStore.getPermissions();

        const preventUnintentionalAutoComplete = shouldPreventUnintentionalAutoComplete(
                Flux.instance().storesHub.clientPolicyEvaluationStore.state.clientPolicyEvaluations,
                this.props.pullRequest);

        return {
            unsavedCommentCount: Flux.instance().storesHub.discussionsStore.getUnsavedCommentCount(),
            currentUserWithVote: Flux.instance().storesHub.reviewersStore.getCurrentUserWithVote(),
            preventUnintentionalAutoComplete,
            hasPermissionToVote: permissions.vote,
            hasPermissionToCancelAutoComplete: permissions.cancelAutoComplete,
        } as IVoteControlState;
    }

    public shouldComponentUpdate(nextProps: IVoteControlProps, nextState: IVoteControlState): boolean {
        const nextVote = nextState.currentUserWithVote && nextState.currentUserWithVote.identity && nextState.currentUserWithVote.identity.vote;
        const vote = this.state.currentUserWithVote && this.state.currentUserWithVote.identity && this.state.currentUserWithVote.identity.vote;

        return  nextState.unsavedCommentCount !== this.state.unsavedCommentCount
            || nextState.preventUnintentionalAutoComplete !== this.state.preventUnintentionalAutoComplete
            || (nextState.currentUserWithVote !== this.state.currentUserWithVote && nextVote !== vote)
            || nextState.isDisableAutoCompleteDialogOpen !== this.state.isDisableAutoCompleteDialogOpen
            || nextState.hasPermissionToVote !== this.state.hasPermissionToVote
            || nextState.hasPermissionToCancelAutoComplete !== this.state.hasPermissionToCancelAutoComplete
            || nextProps.isCTA !== this.props.isCTA;
    }

    public render(): JSX.Element {
        const reviewerImageWithVote = this._reviewerImageWithVote();
        const buttonCssClass = reviewerImageWithVote === null ? "no-reviewer-image " : "";

        let items: IContextualMenuItem[] = [];

        // add unsaved comments
        const unsaved = this._createUnsavedCommentsMenuItem();
        if (unsaved) {
            items.push(unsaved);
        }

        // now push static items
        items = items.concat(VoteControl._voteItems.map(this._createDropDownMenuItem));

        return (
            // .vote-control-container is referenced by the quickstart (see PullRequestQuickStart)
            // If this className changes, the quick start will need to be updated
            <div className="vote-control-container">
                {
                    this.state.hasPermissionToVote && reviewerImageWithVote
                }
                {
                    this.state.hasPermissionToVote &&
                    <DefaultButton
                        id="pull-request-vote-button"
                        className="pull-request-vote-button"
                        primary={this.props.isCTA}
                        split={true}
                        menuTriggerKeyCode={KeyCodes.down}
                        menuProps={{
                            items,
                            directionalHint: DirectionalHint.bottomRightEdge,
                        }}
                        onClick={this._mainActionButtonClick}
                        iconProps={buttonCssClass ? getMenuIcon(buttonCssClass) : undefined}
                        splitButtonAriaLabel={VCResources.PullRequest_VoteActions}>
                        {VCResources.PullRequest_ApproveButtonLabel}
                    </DefaultButton>
                }
                {
                    this.state.isDisableAutoCompleteDialogOpen &&
                    <DisableAutoCompleteDialog
                        isDialogOpen={this.state.isDisableAutoCompleteDialogOpen}
                        onDisableAutoComplete={this._disableAutoComplete}
                        onKeepAutoComplete={() => this._closeDisablAutoCompleteDialog(true)}
                        onDismiss={() => this._closeDisablAutoCompleteDialog(false)}
                        />
                }
            </div>
        );
    }

    private _createUnsavedCommentsMenuItem(): IContextualMenuItem {

        // no unsaved comments means no menu item
        if (this.state.unsavedCommentCount === 0) {
            return null;
        }

        const resource = this.state.unsavedCommentCount === 1 ?
            VCResources.PullRequest_UnsavedCommentsSingle :
            VCResources.PullRequest_UnsavedComments;
        const text = Utils_String.format(resource, this.state.unsavedCommentCount);

        return {
            key: "unsaved-comments-warning",
            name: text,
            ariaLabel: text,
        } as IContextualMenuItem;
    }

    private _createDropDownMenuItem = (item: IVoteItem): IContextualMenuItem => {
        if (item.isSeparator) {
            return {
                key: item.id,
                name: "-",
            } as IContextualMenuItem;
        }

        return {
            key: item.id,
            name: item.text,
            iconProps: getMenuIcon(item.icon),
            onClick: () => this._dropdownRowClickedHandler(item.action),
            ariaLabel: item.text,
        } as IContextualMenuItem;
    }

    private _reviewerImageWithVote() {
        if (this.state.currentUserWithVote) {
            return <ReviewerImage
                reviewer={this.state.currentUserWithVote}
                pullRequestId={this.props.pullRequest.pullRequestId}
                tfsContext={null}
                hideVoteOverlay={this.state.currentUserWithVote.identity.vote === 0}
                showProfileCardOnClick={true} />;
        }

        return null;
    }

    private _mainActionButtonClick = () => {
        let currentVote = null;
        if (this.state.currentUserWithVote && this.state.currentUserWithVote.identity) {
            currentVote = this.state.currentUserWithVote.identity.vote;
        }

        const telemetryProperties: { [x: string]: number } = {
            source: CustomerIntelligenceConstants.PullRequestVoteActionSource.defaultButton,
            NewVote: PullRequestVoteStatus.APPROVE,
            CurrentVote: currentVote
        };

        VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.PULL_REQUEST_VOTE_BUTTON_ACTION,
            telemetryProperties));

        this._updateVote(PullRequestVoteStatus.APPROVE);
    }

    private _dropdownRowClickedHandler = (action: number) => {
        let currentVote = null;
        if (this.state.currentUserWithVote && this.state.currentUserWithVote.identity) {
            currentVote = this.state.currentUserWithVote.identity.vote;
        }

        const telemetryProperties: { [x: string]: number } = {
            source: CustomerIntelligenceConstants.PullRequestVoteActionSource.dropdown,
            NewVote: action,
            CurrentVote: currentVote
        };

        VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.PULL_REQUEST_VOTE_BUTTON_ACTION,
            telemetryProperties));

        if (action === PullRequestVoteStatus.APPROVE_WITH_COMMENT
            && this.state.preventUnintentionalAutoComplete
            && this.state.hasPermissionToCancelAutoComplete) {
                this.setState({
                    isDisableAutoCompleteDialogOpen: true,
                } as IVoteControlState);
        }
        else {
            this._updateVote(action);
        }
    }

    @autobind
    private _closeDisablAutoCompleteDialog(shouldUpdateVote: boolean) {
         if (shouldUpdateVote) {
            this._updateVote(PullRequestVoteStatus.APPROVE_WITH_COMMENT);
         }

         this.setState({isDisableAutoCompleteDialogOpen: false} as IVoteControlState);
    }

    @autobind
    private _disableAutoComplete() {

        Flux.instance().actionCreator.pullRequestActionCreator.updatePullRequestAutoCompletion(
            this.props.pullRequest.pullRequestId,
            false,
            null,
            null,
            (result) => this._closeDisablAutoCompleteDialog(true));
    }

    private _updateVote(vote: number) {
        if (this.props.pullRequest.pullRequestId > 0) {
            Flux.instance().actionCreator.reviewerActionCreator.updateVote(this.props.pullRequest.pullRequestId, vote);
            Flux.instance().actionCreator.discussionActionCreator.commitAllComments();
        }
    }
}

export function shouldPreventUnintentionalAutoComplete(clientPolicyEvaluations: ClientPolicyEvaluation[], pullRequest: IPullRequest): boolean {
    const hasBlockingCommentsPolicy = clientPolicyEvaluations && clientPolicyEvaluations.some(x =>
        x.policyEvaluation.policyType.id === PullRequestPolicyTypeIds.CommentRequirementsPolicy && x.policyEvaluation.isBlocking);

    return !hasBlockingCommentsPolicy && pullRequest.autoCompleteSetBy && !Utils_String.isEmptyGuid(pullRequest.autoCompleteSetBy.id);
}
