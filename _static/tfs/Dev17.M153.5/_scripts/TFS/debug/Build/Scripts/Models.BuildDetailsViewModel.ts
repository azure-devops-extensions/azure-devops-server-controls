import Q = require("q");
import ko = require("knockout");

import BuildRequestValidationResult = require("Build/Scripts/Models.BuildRequestValidationResult");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import ModelContext = require("Build/Scripts/ModelContext");
import { publishEvent, Sources, Features, Properties } from "Build/Scripts/Telemetry";

import * as BuildCommonResources from "Build.Common/Scripts/Resources/TFS.Resources.Build.Common";
import { BuildOrchestrationType } from "Build.Common/Scripts/Generated/TFS.Build2.Common";
import { BuildResult } from "Build.Common/Scripts/BuildResult";
import { BuildStatus } from "Build.Common/Scripts/BuildStatus";
import { getBuildDurationQueueText } from "Build.Common/Scripts/Duration";

import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");

import BuildContracts = require("TFS/Build/Contracts");
import DistributedTask = require("TFS/DistributedTask/Contracts");

import Utils_String = require("VSS/Utils/String");

/**
 * View model for build details
 */
export class BuildDetailsViewModel {
    private _build: BuildContracts.Build;

    // hacky promise for notifying when artifacts are retrieved for a build
    private _artifactsPromise: Q.Deferred<BuildContracts.BuildArtifact[]> = Q.defer<BuildContracts.BuildArtifact[]>();

    /**
     * The build number
     */
    public buildNumber: KnockoutObservable<string> = ko.observable("");

    /**
     * The build id
     */
    public id: KnockoutObservable<number> = ko.observable(0);

    /**
     * The build status
     */
    public status: KnockoutObservable<BuildContracts.BuildStatus> = ko.observable(null);

    /**
     * The build result
     */
    public result: KnockoutObservable<BuildContracts.BuildResult> = ko.observable(null);

    /**
     * The status text
     */
    public statusText: KnockoutComputed<string>;

    /**
     * The remaining cancellation time
     */
    public remainingCancellationTime: KnockoutObservable<string> = ko.observable("");

    /**
     * The definition type
     */
    public definitionType: KnockoutObservable<BuildContracts.DefinitionType> = ko.observable(null);

    /**
     * The plan id
     */
    public planId: KnockoutObservable<string> = ko.observable("");

    /**
     * The CSS class to use for the status icon
     */
    public statusIconClass: KnockoutComputed<string>;

    /**
     * The start time
     */
    public startTime: KnockoutObservable<Date> = TFS_Knockout.observableDate(null);

    /**
     * The finish time
     */
    public finishTime: KnockoutObservable<Date> = TFS_Knockout.observableDate(null);

    /**
     * The queue time
     */
    public queueTime: KnockoutObservable<Date> = TFS_Knockout.observableDate(null);

    /**
     * Indicates whether the build is finished
     */
    public finished: KnockoutComputed<boolean>;

    /**
     * The duration text
     */
    public durationText: KnockoutComputed<string>;

    /**
     * Whether the build has a drop artifact
     */
    public hasDrop: KnockoutComputed<boolean>;

    /**
     * The build drop
     */
    public drop: KnockoutComputed<BuildContracts.BuildArtifact>;

    /**
     * The build artifacts
     */
    public artifacts: KnockoutObservableArray<BuildContracts.BuildArtifact> = ko.observableArray(<BuildContracts.BuildArtifact[]>[]);

    /**
     * The build log
     */
    public log: KnockoutObservable<BuildContracts.BuildLogReference> = ko.observable(null);

    /**
     * The requestor
     */
    public requestedBy: KnockoutObservable<string> = ko.observable("");

    /**
     * The identity on whose behalf the build was requested
     */
    public requestedFor: KnockoutObservable<string> = ko.observable("");

    /**
     * The build number of the build that triggered this build
     */
    public triggeredBy: KnockoutObservable<string> = ko.observable("");

    /**
     * The id build that triggered this build
     */
    public triggeredById: KnockoutObservable<string> = ko.observable("");

    /**
     * The definition id
     */
    public definitionId: KnockoutObservable<number> = ko.observable(0);

    /**
     * The definition name
     */
    public definitionName: KnockoutObservable<string> = ko.observable("");

    /**
     * The definition path
     */
    public definitionPath: KnockoutObservable<string> = ko.observable("/");

    /**
     * The project name
     */
    public projectName: KnockoutObservable<string> = ko.observable("");

    /**
     * The project id
     */
    public projectId: KnockoutObservable<string> = ko.observable("");

    /**
     * Build retain bit
     */
    public keepForever: KnockoutObservable<boolean> = ko.observable(false);

    /**
     * Release retain bit
     */
    public retainedByRelease: KnockoutObservable<boolean> = ko.observable(false);

    /**
     * The repository type
     */
    public repositoryType: KnockoutObservable<string> = ko.observable(null);

    /**
     * The repository id
     */
    public repositoryId: KnockoutObservable<string> = ko.observable("");

    /**
     * The source branch
     */
    public sourceBranch: KnockoutObservable<string> = ko.observable("");

    /**
     * The source version
     */
    public sourceVersion: KnockoutObservable<string> = ko.observable("");

    /**
     * Tags
     */
    public tags: KnockoutObservableArray<string> = ko.observableArray([]);

    /**
     * Uri
     */
    public uri: KnockoutObservable<string> = ko.observable("");

    /**
     * Validation results
     */
    public validationResults: KnockoutObservableArray<BuildRequestValidationResult.BuildRequestValidationResult> = ko.observableArray([]);

    /**
     * Last changed
     */
    public lastChanged: KnockoutObservable<Date> = TFS_Knockout.observableDate(null);

    /**
     * Information nodes (XAML builds only)
     */
    public informationNodes: KnockoutObservableArray<BuildContracts.InformationNode> = ko.observableArray([]);

    /**
      * Build Quality (XAML builds only)
     */
    public quality: KnockoutObservable<string> = ko.observable("");

    /**
      * The queue to which the build was sent
     */
    public queue: KnockoutObservable<DistributedTask.TaskAgentQueue> = ko.observable(null);

    /**
      * The queue status of the definition associated with this build
     */
    public queueStatus: KnockoutObservable<BuildContracts.DefinitionQueueStatus> = ko.observable(BuildContracts.DefinitionQueueStatus.Enabled);

    /**
      * Cleanup Plan id associated with the build
      */
    public cleanupPlanId: KnockoutObservable<string> = ko.observable("");

    /**
      * The build record is marked deleted or not
     */
    public deleted: KnockoutObservable<boolean> = ko.observable(false);

    /**
     * Date deleted
     */
    public dateDeleted: KnockoutObservable<Date> = TFS_Knockout.observableDate(null);

    /**
     * The identity on whose behalf the build was requested
     */
    public deletedBy: KnockoutObservable<string> = ko.observable("");

    /**
     * The reason why build was deleted
     */
    public deletedReason: KnockoutObservable<string> = ko.observable("");

    /**
     * Indicates whether the build is waiting for a pipline to be available or not.
     */
    public isWaitingForPipeline: KnockoutObservable<boolean> = ko.observable(false);

    /**
     * Creates a view model from a data contract
     * @param build The data contract
     */
    constructor(build: BuildContracts.Build) {
        this.update(build);

        this.statusIconClass = ko.computed({
            read: () => {
                return BuildStatus.getIconClassName(this.status(), this.result());
            }
        });

        this.statusText = ko.computed({
            read: () => {
                let status: BuildContracts.BuildStatus = this.status();
                switch (status) {
                    case BuildContracts.BuildStatus.Completed:
                        return Utils_String.format(BuildResources.BuildDetailViewStatusText, BuildResult.getDisplayText(this.result()));
                    case BuildContracts.BuildStatus.InProgress:
                        return BuildResources.BuildDetailViewStatusTextBuildInProgress;
                    case BuildContracts.BuildStatus.Cancelling:
                        return Utils_String.format(BuildResources.BuildDetailViewStatusTextBuildCancelling, this.remainingCancellationTime());
                    case BuildContracts.BuildStatus.Postponed:
                        return BuildResources.BuildDetailViewStatusTextBuildPostPoned;
                    case BuildContracts.BuildStatus.None:
                    case BuildContracts.BuildStatus.NotStarted:
                    default:
                        return BuildResources.BuildDetailViewStatusTextBuildNotStarted;
                }
            }
        });

        this.finished = ko.computed({
            read: () => {
                var finishTime: Date = this.finishTime();
                var status: BuildContracts.BuildStatus = this.status();

                return !!this._build && BuildStatus.isFinished(status, finishTime);
            }
        });

        this.durationText = ko.computed({
            read: () => {
                var status: BuildContracts.BuildStatus = this.status();
                var startTime: Date = this.startTime();
                var finishTime: Date = this.finishTime();
                var finished: boolean = this.finished();
                var currentDate: Date = ModelContext.ModelContext.currentDate();

                if (!startTime) {
                    startTime = new Date();
                }

                var queueName: string = build.queue ? build.queue.name : BuildCommonResources.BuildDurationNoQueueName;
                if (this.definitionType() === BuildContracts.DefinitionType.Xaml) {
                    if (build.controller) {
                        queueName = build.controller.name;
                    }
                }

                return getBuildDurationQueueText(status, startTime, finishTime, queueName);
            }
        });

        this.drop = ko.computed({
            read: () => {
                var dropArtifacts: BuildContracts.BuildArtifact[] = $.grep(this.artifacts(), (artifact: BuildContracts.BuildArtifact, index: number) => {
                    return Utils_String.localeIgnoreCaseComparer(artifact.name, "drop") === 0;
                });

                if (dropArtifacts.length > 0) {
                    return dropArtifacts[0];
                }
                else {
                    return null;
                }
            }
        });

        this.hasDrop = ko.computed({
            read: () => {
                return !!this.drop();
            }
        });

        this.artifacts.subscribe((artifacts: BuildContracts.BuildArtifact[]) => {
            if (this._artifactsPromise) {
                this._artifactsPromise.resolve(artifacts);
            }
        });
    }

    /**
     * Gets the data contract associated with this view model
     */
    public value(): BuildContracts.Build {
        return this._build;
    }

    /**
     * Updates the view model from a data contract
     * @param build The data contract
     */
    public update(build: BuildContracts.Build) {
        // ignore old updates. this is safe because updates include all fields, not just the changed fields
        var lastChanged = this.lastChanged.peek();
        if (lastChanged && lastChanged > build.lastChangedDate) {
            console.log('Ignoring build update with lastchanged: ' + build.lastChangedDate + ' ...since we already have newer data with lastchanged: ' + lastChanged);
            let timelineProperties = {};
            timelineProperties[Properties.BuildRecordOldEvent] = `For build ${build.id}, we got lastChangedDate ${build.lastChangedDate}, but previous lastChangedDate was ${lastChanged}`;
            publishEvent(Features.SignalR, Sources.ResultView, timelineProperties);
            return;
        }

        this._build = build;

        if (this.id.peek() !== build.id) {
            this._artifactsPromise = Q.defer<BuildContracts.BuildArtifact[]>();
        }

        if (!!build) {
            this.buildNumber(Utils_String.format("Build {0}", build.buildNumber));
            this.id(build.id);
            this.status(build.status);
            this.result(build.result);
            this.definitionType(build.definition.type);
            this.startTime(build.startTime);
            this.finishTime(build.finishTime);
            this.queueTime(build.queueTime);
            this.uri(build.uri);

            this.sourceBranch(build.sourceBranch || "");
            this.sourceVersion(build.sourceVersion || "");

            this.requestedFor(build.requestedFor ? (build.requestedFor.displayName || "") : "");
            this.requestedBy(build.requestedBy ? (build.requestedBy.displayName || "") : "");
            this.definitionId(build.definition ? build.definition.id : 0);
            this.definitionName(build.definition ? (build.definition.name || "") : "");
            this.definitionPath(build.definition ? (build.definition.path || "/"): "/");
            this.queueStatus(build.definition ? build.definition.queueStatus : BuildContracts.DefinitionQueueStatus.Enabled);
            this.planId(build.orchestrationPlan ? (build.orchestrationPlan.planId || "") : "");
            this.projectName(build.project ? (build.project.name || "") : "");
            this.projectId(build.project ? (build.project.id || "") : "");
            this.triggeredBy(build.triggeredByBuild ? (build.triggeredByBuild.buildNumber ? Utils_String.format("Build {0}", build.triggeredByBuild.buildNumber) : "") : "");
            this.triggeredById(build.triggeredByBuild ? (build.triggeredByBuild.id.toString() || "") : "");

            if (build.repository) {
                this.repositoryId(build.repository.id || "");
                this.repositoryType(build.repository.type);
            }

            this.log(build.logs);

            this.tags(build.tags);

            if (build.validationResults) {
                this.validationResults($.map(build.validationResults, (validationResult: BuildContracts.BuildRequestValidationResult) => {
                    // ignore non-issues
                    if (validationResult.result !== BuildContracts.ValidationResult.OK) {
                        return new BuildRequestValidationResult.BuildRequestValidationResult(validationResult);
                    }
                }));
            }

            if (build.queue) {
                let queue = <DistributedTask.TaskAgentQueue>{
                    id: build.queue.id,
                    name: build.queue.name
                };

                if (build.queue.pool) {
                    queue.pool = <DistributedTask.TaskAgentPoolReference>{
                        id: build.queue.pool.id,
                        name: build.queue.pool.name
                    }
                }

                this.queue(queue);
            }

            this.quality(build.quality || "");

            if (build.deleted && build.plans) {
                for (var count = 0; count < build.plans.length; count++) {
                    if (build.plans[count].orchestrationType === BuildOrchestrationType.Cleanup) {
                        this.cleanupPlanId(build.plans[count].planId);
                    }
                }

                this.dateDeleted(build.deletedDate ? build.deletedDate : null);
                this.deletedBy(build.deletedBy ? (build.deletedBy.displayName || "") : "");
                this.deletedReason(build.deletedReason ? (build.deletedReason || "") : "");
            }
            this.deleted(build.deleted);

            this.keepForever(build.keepForever);

            this.retainedByRelease(build.retainedByRelease);

            this.lastChanged(build.lastChangedDate);
        }
    }

    public waitForArtifacts(): Q.Promise<BuildContracts.BuildArtifact[]> {
        if (this._artifactsPromise) {
            return this._artifactsPromise.promise;
        }
        else {
            return Q.resolve([]);
        }
    }
}
