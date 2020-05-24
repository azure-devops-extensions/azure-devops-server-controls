export enum PullRequestStatusState {
    Success, // Good!
    Pending, // In progress
    Failure, // Bad
    Waiting,  // Waiting on author
    Info,
}

export enum PullRequestVoteStatus {
    APPROVE = 10,
    APPROVE_WITH_COMMENT = 5,
    NONE = 0,
    NOT_READY = -5,
    REJECT = -10
}
