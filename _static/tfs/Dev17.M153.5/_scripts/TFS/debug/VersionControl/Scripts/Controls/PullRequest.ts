import Controls = require("VSS/Controls");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import VCPullRequestSearchAdapter = require("VersionControl/Scripts/Controls/PullRequestSearchAdapter");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import {PullRequestVoteStatus} from "VersionControl/Scripts/PullRequestTypes";
export let MAX_CHANGES_TO_FETCH: number = 1000;
export let MAX_COMMITS_TO_DISPLAY: number = 3;

/* Modules */

export module PullRequestsActions {
    export let ACTIVE = "active";
    export let COMPLETED = "completed";
    export let ABANDONED = "abandoned";
    export let CREATENEW = "createnew";
    export let MINE = "mine";
    export let ALL = "all";

    export function isActionValid(action: string): boolean {
        const lowerAction = action.toLowerCase();
        return lowerAction === MINE
            || lowerAction === ACTIVE
            || lowerAction === COMPLETED
            || lowerAction === ABANDONED
            || lowerAction === ALL
            || lowerAction === CREATENEW;
    }
}

export module PullRequestDetailsViews {
    export let DISCUSSION = "discussion";
    export let COMMITS = "commits";
    export let FILES = "files";
    export let CODE = "code";
    export let COMPARE = "compare";
    export let CONTENT = "content";
}

export module PullRequestsRouteConstants {
    export let PULLREQUEST = "pullrequest";
    export let PULLREQUESTS = "pullrequests";
    export let PULLREQUESTCREATE = "pullrequestcreate";
    export let PULLREQUESTREVIEW = "pullrequestreview";
}

// Used by the team rooms 
export module PullRequestsNotificationEventTypes {
    export let CREATED = "PullRequestCreatedNotification";
    export let STATUS = "StatusUpdateNotification";
    export let VOTE = "ReviewerVoteNotification";
}

export module PullRequestsStatusConstants {
    export let ACTIVE = "Active";
    export let ABANDONED = "Abandoned";
    export let COMPLETED = "Completed";
}
/* Enums */

export enum PullRequestAsyncStatusExtended {
    NotSet = 0,
    Queued = 1,
    Conflicts = 2,
    Succeeded = 3,
    RejectedByPolicy = 4,
    Failure = 5,

    // web only state, means the Pull Request is queued for merge, and we stopped polling for its status
    InProgess = 100
}

export enum PullRequestStatusFilter {
    ACTIVE,
    COMPLETED,
    ABANDONED,
}

export enum PullRequestViewMode {
    RESULTS,
    MINE
}

export class PullRequestVoteStatusUtils {
    public static voteDescription(vote : number) {
        switch (vote) {
            case PullRequestVoteStatus.APPROVE:
                return VCResources.PullRequest_Approve;
            case PullRequestVoteStatus.APPROVE_WITH_COMMENT:
                return VCResources.PullRequest_ApproveWithComment;
            case PullRequestVoteStatus.NONE:
                return VCResources.PullRequest_ReviewerFeedback_NoResponse;
            case PullRequestVoteStatus.NOT_READY:
                return VCResources.PullRequest_NotReady;
            case PullRequestVoteStatus.REJECT:
                return VCResources.PullRequest_Reject;
        }
    }
}

/* SignalR Manager */

export class MessageTypes {
    public static PullRequest: string = "pullrequest";
}

export class PullRequestMessageTypes {
    public static BasicData = "basic_data";
    public static MergeComplete = "merge";
    public static Push = "push";
    public static Vote = "vote";
    public static Reviewers = "reviewers";
    public static Status = "status";
    public static Discussion = "discussion";
    public static Policies = "policies";
    public static CompletionErrors = "completionErr";
    public static PullRequestStatus = "pullRequestStatus";
    public static PullRequestLabels = "pullRequestLabels";
}

export class PullRequestPushMessageParamTypes {
    public static Source = "source";
    public static Target = "target";
}

export interface IMessageCallback {
    /// <summary>Interface for the callback for a particular message type.</summary>
    (tfsContext: TFS_Host_TfsContext.TfsContext, message: IMessage): void;
}

export interface IMessageProperty {
    /// <summary>Interface for the a property returned with message</summary>
    name: string;
    value: string;
}

export interface IMessage {
    /// <summary>Interface for the Message JSON object retrieved from server.</summary>
    accountId: string;
    messageType: string;
    properties: IMessageProperty[];
}

/* Controls */
Controls.Enhancement.registerEnhancement(VCPullRequestSearchAdapter.SearchAdapter, ".vc-search-adapter-pull-requests");