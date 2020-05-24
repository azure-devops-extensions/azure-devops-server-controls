import * as Q from "q";
import { autobind } from "OfficeFabric/Utilities";
import * as VCContracts from "TFS/VersionControl/Contracts";
import { Hub, ConnectionActivity, HubConnectionOptions } from "SignalR/Hubs";
import { ContractSerializer } from "VSS/Serialization";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { NotificationType } from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import { ActionsHub } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { PullRequestReviewActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/PullRequestReviewActionCreator";
import { NotificationSpecialTypes } from "VersionControl/Scripts/Stores/PullRequestReview/NotificationStore";
import { StoresHub } from "VersionControl/Scripts/Stores/PullRequestReview/StoresHub";
import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as Telemetry from "VSS/Telemetry/Services";
import { PersonMentionTranslator } from "VersionControl/Scripts/Utils/DiscussionUtils";

/**
 * Methods invoked on subscribed clients from the server when a real time event is received.
 * PullRequestDetailHub.cs defines the server-side version of this.
 */
export interface IPullRequestDetailClient {
    onAutoCompleteUpdated(autoCompleteUpdatedEvent: VCContracts.AutoCompleteUpdatedEvent);
    onBranchUpdated(branchUpdatedEvent: VCContracts.BranchUpdatedEvent);
    onCompletionErrors(completionErrorsEvent: VCContracts.CompletionErrorsEvent);
    onDiscussionsUpdated(discussionsUpdatedEvent: VCContracts.DiscussionsUpdatedEvent);
    onIsDraftUpdated(isDraftUpdatedEvent: VCContracts.IsDraftUpdatedEvent);
    onLabelsUpdated(labelsUpdatedEvent: VCContracts.LabelsUpdatedEvent);
    onMergeCompleted(mergeCompletedEvent: VCContracts.MergeCompletedEvent);
    onPolicyEvaluationUpdated(policyEvaluationUpdatedEvent: VCContracts.PolicyEvaluationUpdatedEvent);
    onReviewersUpdated(reviewersUpdatedEvent: VCContracts.ReviewersUpdatedEvent);
    onReviewersVotesReset(reviewersVotesResetEvent: VCContracts.ReviewersVotesResetEvent);
    onReviewerVoteUpdated(reviewerVoteUpdatedEvent: VCContracts.ReviewerVoteUpdatedEvent);
    onStatusAdded(statusAddedEvent: VCContracts.StatusAddedEvent);
    onStatusesDeleted(statusesDeletedEvent: VCContracts.StatusesDeletedEvent);
    onStatusUpdated(statusUpdatedEvent: VCContracts.StatusUpdatedEvent);
    onTitleDescriptionUpdated(titleDescriptionUpdatedEvent: VCContracts.TitleDescriptionUpdatedEvent);
    onRealTimePullRequestUpdated(realTimePullRequestEvent: VCContracts.RealTimePullRequestEvent);
    onTargetChanged(retargetEvent: VCContracts.RetargetEvent);
}

/**
 * Methods that can be invoked from clients to the server to handle pull request subscription.
 * PullRequestDetailHub.cs defines the server-side version of this.
 */
export interface IPullRequestDetailServer {
    subscribe(pullRequestId: number, repositoryId: string): IPromise<VCContracts.GitPullRequest>;
    unsubscribe(pullRequestId: number): void;
}

/**
 * Strong typing for the signalR hub object client/server.
 */
export interface IPullRequestDetailHub {
    server: IPullRequestDetailServer;
    client: IPullRequestDetailClient;
}

/**
 * Manages signalR hub connection for pull request details page.
 */
export abstract class PullRequestDetailHubBase extends Hub {
    protected _pullRequestId: number;
    protected _repositoryId: string;

    constructor(hubName: string, connection?: any) {
        const hostContext = TfsContext.getDefault().contextData.collection;
        const connectionOptions: HubConnectionOptions = {};

        super(hostContext, hostContext, hubName, connection, connectionOptions);
        this.initializeHub(this.hub);
    }

    /**
     * Subscribe to receive events related to a particular pull request.
     */
    public subscribe(pullRequestId: number, repositoryId: string): Q.Promise<VCContracts.GitPullRequest> {
        if (this._pullRequestId === pullRequestId) {
            return Q.resolve(null);
        }

        const unsubscribeIfApplicablePromise: Q.Promise<any> = this._pullRequestId
            ? this.unsubscribe(this._pullRequestId)
            : Q.resolve();

        return unsubscribeIfApplicablePromise
            .then(() => this.connection.start())
            .then(() => this.pullRequestDetailHub.server.subscribe(pullRequestId, repositoryId))
            .then(null, (error: Error) => {
                this.onSubscriptionError(error);
                return Q.reject(error);
            })
            .then(pullRequest => {
                this._pullRequestId = pullRequestId;
                const pullRequestSerialized = <VCContracts.GitPullRequest>ContractSerializer.deserialize(pullRequest, VCContracts.TypeInfo.GitPullRequest);
                return pullRequestSerialized;
            })
            .then(pullrequestToTranslate => {
                //It's critical that we translate here otherwise signalR events will override the already translated display names in the PR description from the page load
                //and when the user tries to edit the description, he/she will see the hideous storage keys in place of display names
                return pullrequestToTranslate &&
                    PersonMentionTranslator.getDefault().translateStorageKeyToDisplayNameInText(pullrequestToTranslate.description)
                        .then(translatedDescription => {
                            pullrequestToTranslate.description = translatedDescription;
                            return pullrequestToTranslate;
                        });
            })
            .then(null, (error: Error) => {
                error && console.error(error.message);
                return null;
            });
    }

    /**
     * Unsubscribe from receiving events related to a particular pull request.
     */
    public unsubscribe(pullRequestId: number): Q.Promise<any> {
        if (this._pullRequestId !== pullRequestId) {
            return Q.resolve();
        }

        return Q(this.hub.server.unsubscribe(pullRequestId)).then(() => {
            this._pullRequestId = 0;
        });
    }

    public stop(notifyServer?: boolean): void {
        this._pullRequestId = 0;
        super.stop(notifyServer);
    }

    public dispose(): void {
        this._pullRequestId = 0;
        super.dispose();
    }

    @autobind
    protected onReconnect(): Q.Promise<any> {
        const resubscribeIfApplicablePromise: Q.Promise<any> = this._pullRequestId
            ? Q(this.pullRequestDetailHub.server.subscribe(this._pullRequestId, this._repositoryId))
            : Q.resolve();

        return resubscribeIfApplicablePromise.then(() => super.onReconnect());
    }

    @autobind
    protected getActivityData(activity: ConnectionActivity): IDictionaryStringTo<any> {
        return {
            prSubscriptions: this._pullRequestId || null,
            userId: TfsContext.getDefault().currentIdentity.id,
            location: window.location.href,
        };
    }

    protected get pullRequestId(): number {
        return this._pullRequestId;
    }

    protected get pullRequestDetailHub(): IPullRequestDetailHub {
        return this.hub;
    }

    /**
     * Allow inherited classes to initialize the signalR hub after creation (used to fill out client callbacks)
     */
    protected abstract initializeHub(hub: IPullRequestDetailHub): void;

    protected abstract onSubscriptionError(error: Error): void;
}

/**
 * Handles reaction to subscribed pull request events.
 */
export class PullRequestDetailHub extends PullRequestDetailHubBase {
    private _disconnectTimer: number = 0;
    private _connectTimer: number = 0;
    private _staleStateTimer: number = 0;
    private _isStaleState: boolean = false;

    // if a signalR disconnect occurs, a warning message will show up after this amount of time
    // unless a reconnection has happened - this number based on CI data here
    // https://mseng.visualstudio.com/DefaultCollection/VSOnline/VC%20Workflows/_git/VCWorkflows.Scripts?path=%2FKusto%2FSignalR&version=GBmaster&_a=contents
    private readonly _disconnectTimeoutMs: number = 15000;

    // the minimum amount of time to show a connection issues warning
    private readonly _minWarningTimeoutMs: number = 15000;

    // the amount of time to be disconnected before a stale state message is shown
    // we only buffer 30 seconds of signalR messages so after this point the user could have missed something
    private readonly _staleStateTimeoutMs: number = 30000;

    // throttled functions will only be called once per this milliseconds
    private readonly _throttleIntervalMs: number = 5000;

    // leading means we will call the throttled function once immediately when it is invoked
    // trailing means we will also call the throttled function after the wait period is over IF it has been invoked more than once during the wait period
    private readonly _throttleOptions = { leading: true, trailing: true };

    // throttled callbacks
    // we are going with throttle and not debounce here because throttle will call the function at most once per X milliseconds,
    // but debounce will wait until X milliseconds have passed since the last call
    private _throttledRefreshBasicData: () => void;
    private _throttledRefreshDiscussions: () => void;
    private _throttledRefreshPolicies: () => void;
    private _throttledRefreshStatuses: () => void;
    private _throttledRefreshLabels: () => void;
    private _throttledRefreshSourceBranch: () => void;
    private _throttledRefreshTargetBranch: () => void;

    constructor(connectionUrl: string, pullRequestId: number, repositoryId: string) {
        super("pullRequestDetailHub", connectionUrl);

        // pull request detail has a UI banner to warn the user of issues with the live update connection
        // so don't try to reconnect automatically to avoid creating reconnection spikes on server when ATs are
        // unresponsive
        this.disableHardReconnect();

        // attempt to subscribe to this pull request
        this.subscribe(pullRequestId, repositoryId)
            .then(pullRequest => {
                // update the page with the latest PR data once we have connected
                if (pullRequest && Flux.instance() && Flux.instance().actionCreator) {
                    Flux.instance().actionCreator.pullRequestActionCreator.publishPullRequestDetail(this.pullRequestId, pullRequest, false);
                }
            });

        // setup throttled callbacks
        this._throttledRefreshBasicData = this.async.throttle(this._refreshBasicData, this._throttleIntervalMs, this._throttleOptions);
        this._throttledRefreshDiscussions = this.async.throttle(this._refreshDiscussions, this._throttleIntervalMs, this._throttleOptions);
        this._throttledRefreshPolicies = this.async.throttle(this._refreshPolicies, this._throttleIntervalMs, this._throttleOptions);
        this._throttledRefreshStatuses = this.async.throttle(this._refreshStatuses, this._throttleIntervalMs, this._throttleOptions);
        this._throttledRefreshLabels = this.async.throttle(this._refreshLabels, this._throttleIntervalMs, this._throttleOptions);
        this._throttledRefreshSourceBranch = this.async.throttle(this._refreshSourceBranch, this._throttleIntervalMs, this._throttleOptions);
        this._throttledRefreshTargetBranch = this.async.throttle(this._refreshTargetBranch, this._throttleIntervalMs, this._throttleOptions);
    }

    protected onSubscriptionError(error: Error): void {
        if (Flux.instance() && Flux.instance().actionCreator) {
            Flux.instance().actionCreator.displayWarningNotification(VCResources.PullRequest_SignalR_StaleState);
        }
        this._logSignalRBannerShown(ConnectionActivity.Error);
    }

    protected initializeHub(hub: IPullRequestDetailHub): void {
        hub.client.onAutoCompleteUpdated = this._onAutoCompleteUpdated;
        hub.client.onBranchUpdated = this._onBranchUpdated;
        hub.client.onCompletionErrors = this._onCompletionErrors;
        hub.client.onDiscussionsUpdated = this._onDiscussionsUpdated;
        hub.client.onIsDraftUpdated = this._onIsDraftUpdatedEvent;
        hub.client.onLabelsUpdated = this._onLabelsUpdated;
        hub.client.onMergeCompleted = this._onMergeCompleted;
        hub.client.onPolicyEvaluationUpdated = this._onPolicyEvaluationUpdated;
        hub.client.onRealTimePullRequestUpdated = this._onRealTimePullRequestUpdated;
        hub.client.onReviewersUpdated = this._onReviewersUpdated;
        hub.client.onReviewersVotesReset = this._onReviewersVotesReset;
        hub.client.onReviewerVoteUpdated = this._onReviewerVoteUpdated;
        hub.client.onStatusAdded = this._onStatusAdded;
        hub.client.onStatusesDeleted = this._onStatusesDeleted;
        hub.client.onStatusUpdated = this._onStatusUpdated;
        hub.client.onTitleDescriptionUpdated = this._onTitleDescriptionUpdated;
        hub.client.onTargetChanged = this._onTargetChanged;
    }

    @autobind
    private _onAutoCompleteUpdated(autoCompleteUpdatedEvent: VCContracts.AutoCompleteUpdatedEvent): void {
        if (!this._realtimeUpdatesEnabled(autoCompleteUpdatedEvent)) {
            return;
        }

        this._throttledRefreshBasicData();
    }

    @autobind
    private _onBranchUpdated(branchUpdatedEvent: VCContracts.BranchUpdatedEvent): void {
        if (!this._realtimeUpdatesEnabled(branchUpdatedEvent)) {
            return;
        }

        if (branchUpdatedEvent.isSourceUpdate) {
            this._throttledRefreshSourceBranch();
        }
        else {
            this._throttledRefreshTargetBranch();
        }
    }

    @autobind
    private _onCompletionErrors(completionErrorsEvent: VCContracts.CompletionErrorsEvent): void {
        if (!this._realtimeUpdatesEnabled(completionErrorsEvent)) {
            return;
        }

        Flux.instance().actionCreator.displayErrorNotification(completionErrorsEvent.errorMessage);
        this._throttledRefreshBasicData(); // reloads PR fields since CompletionAuthority will have been cleared
    }

    @autobind
    private _onDiscussionsUpdated(discussionsUpdatedEvent: VCContracts.DiscussionsUpdatedEvent): void {
        if (!this._realtimeUpdatesEnabled(discussionsUpdatedEvent)) {
            return;
        }

        if (Flux.instance().storesHub.codeExplorerStore.isLoading()) {
            return;
        }

        this._throttledRefreshDiscussions();
    }

    @autobind
    private _onIsDraftUpdatedEvent(isDraftUpdatedEvent: VCContracts.IsDraftUpdatedEvent): void {
        if (!this._realtimeUpdatesEnabled(isDraftUpdatedEvent)) {
            return;
        }

        this._throttledRefreshBasicData();
    }

    @autobind
    private _onLabelsUpdated(labelsUpdatedEvent: VCContracts.LabelsUpdatedEvent): void {
        if (!this._realtimeUpdatesEnabled(labelsUpdatedEvent)) {
            return;
        }

        this._throttledRefreshLabels();
    }

    @autobind
    private _onMergeCompleted(mergeCompletedEvent: VCContracts.MergeCompletedEvent): void {
        if (!this._realtimeUpdatesEnabled(mergeCompletedEvent)) {
            return;
        }

        this._throttledRefreshBasicData();
    }

    @autobind
    private _onPolicyEvaluationUpdated(policyEvaluationUpdatedEvent: VCContracts.PolicyEvaluationUpdatedEvent): void {
        if (!this._realtimeUpdatesEnabled(policyEvaluationUpdatedEvent)) {
            return;
        }

        this._throttledRefreshPolicies();
    }

    @autobind
    private _onReviewersUpdated(reviewersUpdatedEvent: VCContracts.ReviewersUpdatedEvent): void {
        if (!this._realtimeUpdatesEnabled(reviewersUpdatedEvent)) {
            return;
        }

        this._throttledRefreshBasicData();
    }

    @autobind
    private _onReviewersVotesReset(reviewersVotesResetEvent: VCContracts.ReviewersVotesResetEvent): void {
        if (!this._realtimeUpdatesEnabled(reviewersVotesResetEvent)) {
            return;
        }

        this._throttledRefreshBasicData();
    }

    @autobind
    private _onReviewerVoteUpdated(reviewerVoteUpdatedEvent: VCContracts.ReviewerVoteUpdatedEvent): void {
        if (!this._realtimeUpdatesEnabled(reviewerVoteUpdatedEvent)) {
            return;
        }

        this._throttledRefreshBasicData();
    }

    @autobind
    private _onStatusAdded(statusAddedEvent: VCContracts.StatusAddedEvent): void {
        if (!this._realtimeUpdatesEnabled(statusAddedEvent)) {
            return;
        }

        this._throttledRefreshStatuses();
    }

    @autobind
    private _onStatusesDeleted(statusesDeletedEvent: VCContracts.StatusesDeletedEvent): void {
        if (!this._realtimeUpdatesEnabled(statusesDeletedEvent)) {
            return;
        }

        this._throttledRefreshStatuses();
    }

    @autobind
    private _onStatusUpdated(statusUpdatedEvent: VCContracts.StatusUpdatedEvent): void {
        if (!this._realtimeUpdatesEnabled(statusUpdatedEvent)) {
            return;
        }

        this._throttledRefreshBasicData();
    }

    @autobind
    private _onTitleDescriptionUpdated(titleDescriptionUpdatedEvent: VCContracts.TitleDescriptionUpdatedEvent): void {
        if (!this._realtimeUpdatesEnabled(titleDescriptionUpdatedEvent)) {
            return;
        }

        this._throttledRefreshBasicData();
    }

    @autobind
    private _onTargetChanged(retargetEvent: VCContracts.RetargetEvent): void {
        if (!this._realtimeUpdatesEnabled(retargetEvent)) {
            return;
        }

        this._throttledRefreshBasicData();
        this._throttledRefreshStatuses(); // this refreshes policies as well

        Flux.instance().actionCreator.refreshDataIslandIterations().then(() => {
            // raise the notification that a retarget came in after we've retrieved the latest iterations
            Flux.instance().actionCreator.retargetNotificationReceived();
        });
    }

    @autobind
    private _onRealTimePullRequestUpdated(realTimePullRequestEvent: VCContracts.RealTimePullRequestEvent): void {
        // we didn't recognize this event, don't do anything right now
        return;
    }

    private _refreshBasicData = (): void => {
        Flux.instance().actionCreator.refreshDataIslandPullRequest(this.pullRequestId);
        Flux.instance().actionCreator.navigationActionCreator.dismissLastVisitBanner();
    }

    private _refreshDiscussions = (): void => {
        Flux.instance().actionCreator.discussionActionCreator.queryDiscussionThreads(
            Flux.instance().storesHub.codeExplorerStore.getSelectedIterationId(), 
            Flux.instance().storesHub.codeExplorerStore.getSelectedBaseIterationId());
        Flux.instance().actionCreator.navigationActionCreator.dismissLastVisitBanner();
    }

    private _refreshPolicies = (): void => {
        Flux.instance().actionCreator.autoCompleteActionCreator.getBlockingAutoCompletePolicies();
        Flux.instance().actionCreator.clientPoliciesActionCreator.queryPolicyEvaluations();
    }

    private _refreshStatuses = (): void => {
        // potentially conditional policies started to apply, to avoid UX blips refresh policy evaluations before statuses
        Flux.instance().actionCreator.clientPoliciesActionCreator.queryPolicyEvaluations();

        Flux.instance().actionCreator.statusActionCreator.queryPolicyStatusesAsync(this._pullRequestId);

        // potentially new status have been added to support proper actions we need to refresh contributions
        Flux.instance().actionCreator.statusActionCreator.queryStatusesContributions();
    }

    private _refreshLabels = (): void => {
        Flux.instance().actionCreator.labelsActionCreator.queryLabelsAsync(this._pullRequestId);
    }

    private _refreshSourceBranch = (): void => {
        Flux.instance().actionCreator.refreshDataIslandIterations();

        // raise the notification that a new change came in
        Flux.instance().actionCreator.changeNotificationReceived();
    }

    private _refreshTargetBranch = (): void => {
        // build policies need to evaluate expiration when target is updated
        Flux.instance().actionCreator.clientPoliciesActionCreator.queryPolicyEvaluations();
    }

    private _realtimeUpdatesEnabled(event: VCContracts.RealTimePullRequestEvent): boolean {
        // if updates are turned off, we will short circuit here
        if (!Flux.instance() || 
            !Flux.instance().storesHub || 
            !Flux.instance().storesHub.navigationStore ||
            !Flux.instance().storesHub.navigationStore.getIsLiveUpdateEnabled()) {
            return false;
        }

        // we already subscribed to this pull request, but if an update happens to come in that
        // doesn't match our pull request then ignore it
        if (event.pullRequestId !== this.pullRequestId) {
            return false;
        }

        return true;
    }

    @autobind
    protected onReconnect(): Q.Promise<any> {
        this._startTimer(ConnectionActivity.Connect);

        return super.onReconnect();
    }

    @autobind
    protected onSoftReconnect(): Q.Promise<Hub> {
        this._startTimer(ConnectionActivity.Connect);

        return super.onSoftReconnect();
    }

    @autobind
    protected onDisconnect(): void {
        this._startTimer(ConnectionActivity.Disconnect);

        super.onDisconnect();
    }

    @autobind
    protected onSoftDisconnect(): void {
        this._startTimer(ConnectionActivity.Disconnect);

        super.onSoftDisconnect();
    }

    @autobind
    private _onConnectTimeout(): void {
        if (Flux.instance() && Flux.instance().actionCreator) {
            Flux.instance().actionCreator.flushNotifications(NotificationType.warning, NotificationSpecialTypes.signalRConnectionWarning);
            this._logSignalRBannerShown(ConnectionActivity.Connect);
        }
    }

    @autobind
    private _onDisconnectTimeout(): void {
        if (Flux.instance() && Flux.instance().actionCreator) {
            Flux.instance().actionCreator.displayWarningNotification(VCResources.PullRequest_SignalR_Reconnecting, NotificationSpecialTypes.signalRConnectionWarning);
            this._logSignalRBannerShown(ConnectionActivity.SoftDisconnect);
        }
    }

    @autobind
    private _onStaleStateTimeout(): void {
        if (Flux.instance() && Flux.instance().actionCreator) {
            this._isStaleState = true;
            Flux.instance().actionCreator.flushNotifications(NotificationType.warning);
            Flux.instance().actionCreator.displayWarningNotification(VCResources.PullRequest_SignalR_StaleState);
            this._logSignalRBannerShown(ConnectionActivity.Disconnect);
        }

        // if we're telling the user they are out of date, there's no point in keeping an active connection going any longer
        // stop the connection, but don't notify the server because the server likely won't be able to process requests at this time
        this.stop(false);
    }

    @autobind
    private _clearTimers(): void {
        this.async.clearTimeout(this._connectTimer);
        this.async.clearTimeout(this._disconnectTimer);
        this.async.clearTimeout(this._staleStateTimer);

        this._connectTimer = 0;
        this._disconnectTimer = 0;
        this._staleStateTimer = 0;
    }

    @autobind
    private _startTimer(activity: ConnectionActivity): void {
        this._clearTimers();

        // don't start any more timers for messages if the state is already announced as stale
        // since no amount of reconnects will fix that state
        if (this._isStaleState) {
            return;
        }

        if (activity === ConnectionActivity.Connect) {
            this._connectTimer = this.async.setTimeout(this._onConnectTimeout, this._minWarningTimeoutMs);
        }
        else if (activity === ConnectionActivity.Disconnect) {
            this._disconnectTimer = this.async.setTimeout(this._onDisconnectTimeout, this._disconnectTimeoutMs);
            this._staleStateTimer = this.async.setTimeout(this._onStaleStateTimeout, this._staleStateTimeoutMs);
        }
    }

    @autobind
    private _logSignalRBannerShown(activity: ConnectionActivity): void {
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.PULL_REQUEST_SIGNALR_BANNER_SHOWN, {
                activity: activity,
                connectionId: this.getConnectionId(),
            }));
    }
}
