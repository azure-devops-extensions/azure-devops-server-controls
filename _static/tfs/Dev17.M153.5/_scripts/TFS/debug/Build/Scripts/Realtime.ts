/// <reference types="jquery" />

import * as Q from "q";

import { projectid } from "Admin/Scripts/Resources/TFS.Resources.Admin";

import { realtimeConnectionUpdated } from "Build/Scripts/Actions/Realtime";
import { buildDetailsContext } from "Build/Scripts/Context";
import { RefreshFunction } from "Build/Scripts/Refresh";
import { getSignalRConnectionUrl } from "Build/Scripts/SignalR";
import { publishEvent, Sources, Features, Properties } from "Build/Scripts/Telemetry";

import { BuildClientService } from "Build.Common/Scripts/ClientServices";
import { InformationNodesUpdatedEvent, IBuildFilter } from "Build.Common/Scripts/ClientContracts";
import { IBuildClient } from "Build.Common/Scripts/IBuildClient";

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { Hub, ConnectionActivity } from "SignalR/Hubs";

import * as BuildContracts from "TFS/Build/Contracts";

import { EventService, getService as getEventService } from "VSS/Events/Services";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { ContractSerializer } from "VSS/Serialization";
import { getCollectionService } from "VSS/Service";
import { SignalROperation } from "VSS/SignalR/Contracts";
import * as Utils_Array from "VSS/Utils/Array";
import { using, handleError } from "VSS/VSS";

export class BuildRealtimeEvent {
    public static CONNECTION_SUCCESS: string = "Build.Realtime.ConnectionSuccess";                  // Fired when connection to signalR hub is successful
    public static CONNECTION_FAILURE: string = "Build.Realtime.ConnectionFailure";                  // Fired when connection to signalR hub fails
    public static LOG_CONSOLE_LINES: string = "Build.Realtime.LogConsoleLines";                     // Fired when console lines are received
    public static TIMELINE_RECORDS_UPDATED: string = "Build.Realtime.TimelineRecordsUpdated";       // Fired when timeline records are updated
    public static BUILD_UPDATED: string = "Build.Realtime.BuildUpdated";                            // Fired when a build is updated
    public static INFORMATION_NODES_UPDATED: string = "Build.Realtime.InformationNodesUpdated";     // Fired when information nodes are updated
    public static ARTIFACT_ADDED: string = "Build.Realtime.ArtifactAdded";                          // Fired when a build is updated
    public static CHANGES_CALCULATED: string = "Build.Realtime.ChangesCalculated";                  // Fired when changes are calculated for a build
    public static PLANGROUPS_STARTED: string = "Build.Realtime.PlanGroupsStartd";                   // Fired when plan groups started
}

export interface BuildEvent {
    buildId: number;
}

export interface ArtifactAddedEvent extends BuildEvent {
    artifactName: string;
}

export interface BuildUpdatedEvent extends BuildEvent {
    build: BuildContracts.Build;
}

export class HubFactory {
    public static createRealTimeHub(buildClient: IBuildClient): HubBase {
        return new BuildDetailHub(buildClient);
    }
}

/**
 * Manages a SignalR connection for build details
 */
export abstract class HubBase extends Hub {
    private static TimerDelayMilliseconds: number = 5000;

    private _buildClient: IBuildClient;
    private _eventManager: EventService;

    // subscriptions
    protected _buildId: number;
    protected _buildProjectId: string = null;
    private _isXamlBuild: boolean = false;
    private _projectId: string = null;
    private _watchingCollection: boolean = false;

    // timer
    private _buildRefreshTimer: RefreshFunction<number>;

    // batch build updates and request them all at once
    protected _batchBuildUpdates: boolean = false;
    private _pendingBuildUpdates: number[] = [];
    private _pendingBuildUpdateTimer: RefreshFunction<number[]>;
    private readonly PendingBuildUpdateInterval: number = 500;
    private readonly PendingBuildMaxBatchSize: number = 100;

    /**
     * Creates a new hub
     * @param buildClient The build HTTP client
     */
    constructor(buildClient: IBuildClient, hubName: string, connection?: any) {
        super(TfsContext.getDefault().contextData.collection, TfsContext.getDefault().contextData.collection, hubName, connection);

        this._batchBuildUpdates = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.Build2BatchRealtimeUpdates, false);
        this._eventManager = getEventService();
        this._buildClient = buildClient;
        this._initializeHub(this.hub);

        if (this._batchBuildUpdates) {
            this._pendingBuildUpdateTimer = new RefreshFunction<number[]>((arg: number[]) => {
                // single-threaded execution is great
                let pendingUpdates: number[] = this._pendingBuildUpdates;
                this._pendingBuildUpdates = [];

                if (pendingUpdates.length > 0) {
                    // cap the number of updates that we actually send. if the call is slow for some reason, we don't want it to grow indefinitely
                    if (pendingUpdates.length > this.PendingBuildMaxBatchSize) {
                        pendingUpdates = pendingUpdates.slice(pendingUpdates.length - this.PendingBuildMaxBatchSize);
                    }
                    console.log(`requesting ${pendingUpdates.length} batched updates`);

                    if (!this._buildClient) {
                        this._buildClient = getCollectionService(BuildClientService);
                    }

                    const filter: IBuildFilter = {
                        buildIds: pendingUpdates.join(",")
                    };
                    console.log(filter.buildIds);
                    return this._buildClient.getBuilds(filter)
                        .then((result) => {
                            result.builds.forEach((build) => {
                                this.refreshBuild({
                                    buildId: build.id,
                                    build: build
                                });
                            });

                            return true;
                        }, (err: any) => {
                            // eat the error. these builds won't be updated
                            return true;
                        });
                }
                else {
                    return Q(true);
                }
            }, this.PendingBuildUpdateInterval);
            this._pendingBuildUpdateTimer.start([]);
        }
    }

    /**
     * Called when console lines are received via the SignalR connection
     * @param logEvent The event
     */
    public appendConsoleLines(logEvent: BuildContracts.ConsoleLogEvent) {
        // console lines count as updates
        this._eventManager.fire(BuildRealtimeEvent.LOG_CONSOLE_LINES, this, logEvent);
    }

    /**
     * Called when timeline records are updated
     * @param timelineRecordEvent The event
     */
    public refreshTimelineRecords(timelineRecordsEvent: BuildContracts.TimelineRecordsUpdatedEvent) {
        this._eventManager.fire(BuildRealtimeEvent.TIMELINE_RECORDS_UPDATED, this, timelineRecordsEvent);
    }

    /**
     * Called when information nodes are updated
     * @param timelineRecordEvent The event
     */
    public refreshInformationNodes(informationNodesEvent: InformationNodesUpdatedEvent) {
        this._eventManager.fire(BuildRealtimeEvent.INFORMATION_NODES_UPDATED, this, informationNodesEvent);
    }

    /**
     * Called when a build is updated
     * @param buildEvent The event
     */
    public refreshBuild(buildEvent: BuildUpdatedEvent) {
        this._eventManager.fire(BuildRealtimeEvent.BUILD_UPDATED, this, buildEvent);
    }

    /**
     * Called when a build artifact is added
     * @param event The event
     */
    public artifactAdded(event: ArtifactAddedEvent) {
        this._eventManager.fire(BuildRealtimeEvent.ARTIFACT_ADDED, this, event);
    }

    /**
     * Called when a build is updated
     * @param event The event
     */
    public buildUpdated(event: BuildEvent) {
        // make sure this one is at the end
        const index = this._pendingBuildUpdates.indexOf(event.buildId);
        if (index > -1) {
            this._pendingBuildUpdates.splice(index, 1);
        }

        this._pendingBuildUpdates.push(event.buildId);
    }

    public timelineRecordsUpdated(buildId: number, planId: string, timelineId: string, changeId: number): void {
        if (!this._buildClient) {
            this._buildClient = getCollectionService(BuildClientService);
        }

        console.log(`loading timeline at changeid ${changeId}`);
        this._buildClient.getTimeline(buildId, timelineId, changeId, planId).then((timeline) => {
            console.log(`got timeline at changeid ${changeId}`);
            this.refreshTimelineRecords({
                buildId: buildId,
                timelineRecords: timeline.records
            });

            let telemetryProperties = {};
            telemetryProperties[Properties.TimelineRecordCount] = timeline.records.length;
            this._publishTelemetry(telemetryProperties);
        });
    }

    /**
     * Called when changes are calculated for a build
     * @param event The event
     */
    public changesCalculated(event: BuildEvent) {
        this._eventManager.fire(BuildRealtimeEvent.CHANGES_CALCULATED, this, event);
    }

    /**
     * Called when a plan group is started
     * @param projectId
     * @param planGroup
     */
    public planGroupStarted(projectId: string, planGroup: string) {
        const event: BuildContracts.TaskOrchestrationPlanGroupsStartedEvent = {
            planGroups: [
                {
                    planGroup: planGroup,
                    projectId: projectid
                }
            ]
        };
        this._eventManager.fire(BuildRealtimeEvent.PLANGROUPS_STARTED, this, event);
    }

    /**
     * Subscribes to build events, takes care of xaml too
     * @param projectId
     * @param buildId
     * @param isXamlBuild
     */
    public subscribeToBuild(projectId: string, buildId: number, isXamlBuild: boolean = false): IPromise<any> {
        if (this._buildId) {
            return this._unsubscribeFromBuild(this._buildProjectId, this._buildId).then(() => {
                return this._subscribeToBuild(projectId, buildId, isXamlBuild);
            });
        }
        else {
            return this._subscribeToBuild(projectId, buildId, isXamlBuild);
        }
    }

    /**
     * Subscribe to project signalR events
     * @param projectId
     */
    public subscribeToProject(projectId: string): IPromise<any> {
        if (this._projectId) {
            return this._unsubscribeFromProject(this._projectId).then(() => {
                return this._subscribeToProject(projectId);
            });
        }
        else {
            return this._subscribeToProject(projectId);
        }
    }

    /**
     * Subscribe to collection signalR events
     */
    public subscribeToCollection(): IPromise<any> {
        return this._unsubscribeFromCollection().then(() => {
            return this._subscribeToCollection();
        });
    }

    /**
     * To stop signalR connection and/or clear refresh timer if required
     */
    public stop() {
        this._buildId = null;
        this._buildProjectId = null;
        this._projectId = null;

        super.stop();

        this._disposeBuildRefreshTimer();

        this._disposeBuildUpdatedTimer();
    }

    protected abstract _initializeHub(hub: any);
    protected abstract _startWatchingBuild(projectId: string, id: number): Q.Promise<any>;
    protected abstract _stopWatchingBuild(projectId: string, id: number): Q.Promise<any>;
    protected abstract _onSoftReconnect(): Q.Promise<Hub>;

    // this returns a Q.Promise instead of an IPromise because that's how the base SignalR.Hub.onReconnect method is set up in Hub.d.ts
    protected onReconnect(): Q.Promise<Hub> {
        let promises: Q.Promise<any>[] = [];
        if (this._buildId) {
            promises.push(this._startWatchingBuild(this._buildProjectId, this._buildId));
        }

        if (this._projectId) {
            promises.push(this.hub.server.watchProject(this._projectId));
        }

        return Q.all(promises).then(() => {
            return super.onReconnect();
        });
    }

    protected getActivityData(activity: ConnectionActivity): IDictionaryStringTo<any> {
        return {
            buildId: this._buildId,
            isSubscribedToProject: !!this._projectId
        };
    }

    private _refresh(buildId: number): IPromise<boolean> {
        console.log('Realtime.BuildDetailHub: Refreshing build with id:' + buildId);

        let deferred = Q.defer<boolean>();

        this._buildClient.getBuild(buildId).then((build: BuildContracts.Build) => {
            this.refreshBuild({
                buildId: buildId,
                build: build
            });

            let result: boolean = build.status !== BuildContracts.BuildStatus.Completed;

            if (build && build.orchestrationPlan) {
                this._buildClient.getTimeline(buildId, "", 0, build.orchestrationPlan.planId).then((timeline: BuildContracts.Timeline) => {
                    this.refreshTimelineRecords({
                        buildId: buildId,
                        timelineRecords: timeline.records
                    });

                    deferred.resolve(result);
                }, (err: any) => {
                    // error refreshing timeline. best-effort
                    console.log(err);

                    deferred.resolve(result);
                });
            }
            else {
                deferred.resolve(result);
            }
        }, (err: any) => {
            // error refreshing build. give up
            deferred.resolve(false);
        });

        return deferred.promise;
    }

    private _unsubscribeFromCollection(): IPromise<any> {
        if (this._watchingCollection) {
            return Q(this.hub.server.stopWatchingCollection()).then(() => {
                this._watchingCollection = false;
            });
        }
        else {
            return Q.resolve(null);
        }
    }

    private _unsubscribeFromBuild(projectId: string, buildId: number): IPromise<any> {
        // note: currently there is no need to create refresh timers for multiple builds, hence we just kill the current timer irrespective of the buildId
        this._disposeBuildRefreshTimer();

        return Q(this._stopWatchingBuild(projectId, buildId)).then(() => {
            realtimeConnectionUpdated.invoke({
                isConnected: false,
                isErrorCondition: false
            });

            this._buildId = null;
            this._buildProjectId = null;
        });
    }

    private _disposeBuildRefreshTimer() {
        if (this._buildRefreshTimer) {
            this._buildRefreshTimer.cancel();
            this._buildRefreshTimer = null;
        }
    }

    private _disposeBuildUpdatedTimer() {
        if (this._pendingBuildUpdateTimer) {
            this._pendingBuildUpdateTimer.cancel();
            this._pendingBuildUpdateTimer = null;
        }
    }

    private _unsubscribeFromProject(projectId: string): IPromise<any> {
        return Q(this.hub.server.stopWatchingProject(projectId)).then(() => {
            this._projectId = null;
        });
    }

    private _startRefreshTimer(buildId: number): IPromise<any> {
        // if there's already a timer, there's nothing to do
        if (this._buildRefreshTimer) {
            return Q.resolve(null);
        }

        let deferred = Q.defer();
        this._buildRefreshTimer = new RefreshFunction<number>((buildId: number) => {
            return this._refresh(buildId).then(null, handleError);
        }, BuildDetailHub.TimerDelayMilliseconds);

        this._buildRefreshTimer.start(buildId);

        deferred.resolve(null);

        return deferred.promise;
    }

    private _subscribeToBuild(projectId: string, buildId: number, isXamlBuild: boolean = false): IPromise<any> {
        this._isXamlBuild = isXamlBuild;

        if (isXamlBuild) {
            return this._startRefreshTimer(buildId);
        }
        else {
            return this.connection.start().then(() => {
                this._buildId = buildId;
                this._buildProjectId = projectId;

                realtimeConnectionUpdated.invoke({
                    isConnected: true,
                    isErrorCondition: false
                });

                return Q(this._startWatchingBuild(projectId, buildId));
            }, (err: any) => {
                realtimeConnectionUpdated.invoke({
                    isConnected: false,
                    isErrorCondition: true
                });

                this._startRefreshTimer(buildId);
            });
        }
    }

    private _subscribeToProject(projectId: string): IPromise<any> {
        return this.connection.start().then(() => {
            this._projectId = projectId;

            realtimeConnectionUpdated.invoke({
                isConnected: true,
                isErrorCondition: false
            });

            return Q(this.hub.server.watchProject(projectId));
        }, (err: any) => {
            realtimeConnectionUpdated.invoke({
                isConnected: false,
                isErrorCondition: true
            });
        });
    }

    private _subscribeToCollection(): IPromise<any> {
        return this.connection.start().then(() => {
            this._watchingCollection = true;

            realtimeConnectionUpdated.invoke({
                isConnected: true,
                isErrorCondition: false
            });

            return Q(this.hub.server.watchCollection());
        }, (err: any) => {
            realtimeConnectionUpdated.invoke({
                isConnected: false,
                isErrorCondition: true
            });
        });
    }

    protected _publishTelemetry(properties: any) {
        publishEvent(Features.SignalR, Sources.ResultView, properties);
    }
}

export class BuildDetailHub extends HubBase {
    private _buildCompletedSyncRetries = 0;
    private _prevTimelineWatermark: number = 0;

    constructor(buildClient: IBuildClient) {
        super(buildClient, "buildDetailHub", getSignalRConnectionUrl());
    }

    protected _startWatchingBuild(projectId: string, id: number): Q.Promise<any> {
        return this.hub.server.watchBuild(projectId, id);
    }

    protected _stopWatchingBuild(projectId: string, id: number): Q.Promise<any> {
        return this.hub.server.stopWatchingBuild(projectId, id);
    }

    protected _onSoftReconnect(): Q.Promise<Hub> {
        console.log('Realtime.BuildDetailHub: SignalR reconnected, triggering sync state...');

        let telemetryProperties = {};
        telemetryProperties[Properties.SignalRSoftReconnect] = 1;
        this._publishTelemetry(telemetryProperties);

        this._syncState();
        return Q.resolve(this);
    }

    protected _initializeHub(hub: any) {
        if (!hub) {
            return;
        }

        hub.client.logConsoleLines = (logEvent: BuildContracts.ConsoleLogEvent) => {
            if (logEvent.buildId === this._buildId) {
                ContractSerializer.deserialize(logEvent, null, false);
                this.appendConsoleLines(logEvent);
            }
        };

        hub.client.timelineRecordsUpdated = (buildId: number, planId: string, timelineId: string, changeId: number) => {
            console.log(`Realtime.BuildDetailHub: timeline records updated for build ${buildId}, changeId = ${changeId}`);

            if (this._prevTimelineWatermark !== 0 && this._prevTimelineWatermark < changeId - 1) {
                console.log(`Realtime.BuildDetailHub: Looks like some events are missed, things can go out of sync, lastChangeId is ${this._prevTimelineWatermark}, currentChangeId is ${changeId}`);
            }

            this._prevTimelineWatermark = changeId;

            if (buildId === this._buildId) {
                this.timelineRecordsUpdated(buildId, planId, timelineId, changeId);
            }
        };

        hub.client.buildUpdated2 = (definitionId: number, buildId: number) => {
            if (this._batchBuildUpdates) {
                console.log('Realtime.BuildDetailHub: buildUpdated2. build id = ' + buildId);
                const telemetryProperties = {};
                telemetryProperties[Properties.BuildRecordEvent] = buildId;
                this._publishTelemetry(telemetryProperties);

                this.buildUpdated({
                    buildId: buildId
                });
            }
        };

        hub.client.buildUpdated = (event: BuildContracts.BuildUpdatedEvent) => {
            if (!this._batchBuildUpdates) {
                console.log('Realtime.BuildDetailHub: buildUpdated. build id = ' + event.buildId);
                const telemetryProperties = {};
                telemetryProperties[Properties.BuildRecordEvent] = event.buildId;
                this._publishTelemetry(telemetryProperties);

                ContractSerializer.deserialize(event, BuildContracts.TypeInfo.BuildUpdatedEvent, false);
                this.refreshBuild(event);
            }
        };

        hub.client.buildArtifactAdded = (buildId: number, artifactName: string) => {
            console.log('Realtime.BuildDetailHub: build artifact added. build id = ' + buildId + ', new artifact = ' + artifactName);
            if (buildId === this._buildId) {
                this.artifactAdded({
                    buildId: buildId,
                    artifactName: artifactName
                });
            }
        };

        hub.client.changesCalculated = (buildId: number) => {
            console.log('Realtime.BuildDetailHub: build changes calculated. build id = ' + buildId);
            if (buildId === this._buildId) {
                this.changesCalculated({
                    buildId: buildId
                });
            }
        };

        hub.client.taskOrchestrationPlanGroupStarted = (projectId: string, planGroup: string) => {
            console.log('Realtime.BuildDetailHub: build task orchestration plan group started event has been received');
            this.planGroupStarted(projectId, planGroup);
        };

        hub.client.triggerSyncState = (message) => {
            console.log('Realtime.BuildDetailHub:' + message);
            this._syncState();
        }
    }

    private _syncState() {
        if (this._buildId && this._buildProjectId) {
            const currentBuild = buildDetailsContext.currentBuild();
            if (currentBuild && currentBuild.status() === BuildContracts.BuildStatus.Completed) {
                if (++this._buildCompletedSyncRetries <= 1) {
                    console.log('Realtime.BuildDetailHub: Invoking syncState even for completed build to make sure we have accurate data, trying count - ' + this._buildCompletedSyncRetries);

                    let telemetryProperties = {};
                    telemetryProperties[Properties.SignalRSyncEventCalledForBuild] = this._buildId;
                    this._publishTelemetry(telemetryProperties);

                    this.hub.server.syncState(this._buildProjectId, this._buildId);
                }
                else {
                    console.log('Realtime.BuildDetailHub: We already initiated sync few times even for completed build, stopping more tries');
                }
            }
            else {
                console.log('Realtime.BuildDetailHub: Invoking syncState');
                this.hub.server.syncState(this._buildProjectId, this._buildId);
            }
        }
        else {
            console.log('Realtime.BuildDetailHub: There is no buildId, projectId combination yet to sync build state from');
        }
    }
}