import ko = require("knockout");

import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import DateUtility = require("Build/Scripts/Utilities/DateUtility");
import ModelContext = require("Build/Scripts/ModelContext");
import { publishEvent, Sources, Features, Properties } from "Build/Scripts/Telemetry";
import TaskLogReferenceViewModel = require("Build/Scripts/Models.TaskLogReferenceViewModel");
import TimelineReferenceViewModel = require("Build/Scripts/Models.TimelineReferenceViewModel");

import BuildCommonResources = require("Build.Common/Scripts/Resources/TFS.Resources.Build.Common");
import { getDurationText } from "Build.Common/Scripts/Duration";
import { getTimelineRecordStateIconClass } from "Build.Common/Scripts/TimelineRecord";

import KoTree = require("DistributedTasksCommon/TFS.Knockout.Tree");
import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");

import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");

import BuildContracts = require("TFS/Build/Contracts");

import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");

/**
 * Viewmodel for a timeline record
 */
export class TimelineRecordViewModel extends KoTree.BaseTreeNode implements KoTree.ITreeNode, TaskModels.IDirty {
    private _timelineRecord: BuildContracts.TimelineRecord;

    /**
     * The build id
     */
    public buildId: KnockoutObservable<number> = ko.observable(0);

    /**
     * The plan id
     */
    public planId: KnockoutObservable<string> = ko.observable("");

    /**
     * The latest change id
     */
    public changeId: KnockoutObservable<number> = ko.observable(0);

    /**
     * The current operation
     */
    public currentOperation: KnockoutObservable<string> = ko.observable("");

    /**
     * The details timeline
     */
    public details: KnockoutObservable<TimelineReferenceViewModel.TimelineReferenceViewModel> = ko.observable(null);

    /**
     * The finish time
     */
    public finishTime: KnockoutObservable<Date> = TFS_Knockout.observableDate(null);

    /**
     * The timeline record id
     */
    public id: KnockoutObservable<string> = ko.observable("");

    /**
     * The last modified date
     */
    public lastModified: KnockoutObservable<Date> = TFS_Knockout.observableDate(null);

    /**
     * The location
     */
    public location: KnockoutObservable<string> = ko.observable("");

    /**
     * The log
     */
    public log: KnockoutObservable<TaskLogReferenceViewModel.TaskLogReferenceViewModel> = ko.observable(null);

    /**
     * The name
     */
    public name: KnockoutObservable<string> = ko.observable("");

    /**
     * The id of the parent node
     */
    public parentId: KnockoutObservable<string> = ko.observable("");

    /**
     * The completion percentage
     */
    public percentComplete: KnockoutObservable<number> = ko.observable(0);

    /**
     * The result
     */
    public result: KnockoutObservable<BuildContracts.TaskResult> = ko.observable(null);

    /**
     * The result code
     */
    public resultCode: KnockoutObservable<string> = ko.observable("");

    /**
     * The start time
     */
    public startTime: KnockoutObservable<Date> = TFS_Knockout.observableDate(null);

    /**
     * The current state
     */
    public state: KnockoutObservable<BuildContracts.TimelineRecordState> = ko.observable(null);

    /**
     * The record type
     */
    public type: KnockoutObservable<string> = ko.observable("");

    /**
     * The worker name
     */
    public workerName: KnockoutObservable<string> = ko.observable("");

    /**
     * The defined sort order
     */
    public order: KnockoutObservable<number> = ko.observable(0);

    /**
     * The duration, in a sortable format
     */
    public sortableDuration: KnockoutComputed<number>;

    /**
     * The duration
     */
    public duration: KnockoutComputed<string>;

    /**
     * The CSS class to use for the state icon
     */
    public stateIconClass: KnockoutComputed<string>;

    /**
     * Human-readable state string
     */
    public stateString: KnockoutComputed<string>;

    /**
     * Human-readable result string
     */
    public resultString: KnockoutComputed<string>;

    /**
     * The status text
     */
    public statusText: KnockoutComputed<string>;

    /**
     * Indicates whether this node represents a Phase
     */
    public isPhaseNode: KnockoutComputed<boolean>;

    /**
     * Indicates whether this node represents a Job
     */
    public isJobNode: KnockoutComputed<boolean>;

    /**
     * Indicates whether this node represents a Job or Phase
     */
    public isJobOrPhaseNode: KnockoutComputed<boolean>;

    /**
     * A verbose description of the duration
     */
    public durationDescription: KnockoutComputed<string>;

    /**
     * The text to display in the tree
     */
    public text: KnockoutComputed<string>;

    /**
     * The label for the tree node that tells the status as well
     */
    public ariaLabel: KnockoutComputed<string>;

    /**
     * The CSS class for the tree node
     */
    public cssClass: KnockoutObservable<string> = ko.observable("");

    /**
     * Indicates whether the record was abandoned
     */
    public abandoned: KnockoutComputed<boolean>;

    /**
     * Indicates whether to show the icon for the tree node
     */
    public showIcon: KnockoutComputed<boolean>;

    /**
     * The CSS class to use for the tree node
     */
    public nodeIconCssClass: KnockoutComputed<string>;

    /**
     * Indicates whether the model is dirty
     * This is required by the tree, and is always false in this model
     */
    public dirty: KnockoutComputed<boolean>;

    /**
     * The number of errors associated with this record
     */
    public errorCount: KnockoutObservable<number> = ko.observable(0);

    /**
     * The number of errors associated with this record
     */
    public warningCount: KnockoutObservable<number> = ko.observable(0);

    /**
     * Issues associated with this record
     */
    public issues: KnockoutObservableArray<BuildContracts.Issue> = ko.observableArray([]);

    constructor(buildId: number, planId: string, record: BuildContracts.TimelineRecord) {
        super();

        this.buildId(buildId);
        this.planId(planId);
        this.update(record);

        // dirty is required for the tree. this is a read-only model, so it's never dirty
        this.dirty = ko.computed({
            read: () => {
                return false;
            }
        });

        this.isPhaseNode = ko.computed({
            read: () => {
                return Utils_String.localeIgnoreCaseComparer(this.type(), "phase") === 0;
            }
        });

        this.isJobNode = ko.computed({
            read: () => {
                return Utils_String.localeIgnoreCaseComparer(this.type(), "job") === 0;
            }
        });

        this.isJobOrPhaseNode = ko.computed({
            read: () => {
                return this.isJobNode() || this.isPhaseNode();
            }
        });

        this.sortableDuration = ko.computed({
            read: () => {
                var startTime: Date = this.startTime();
                var finishTime: Date = this.finishTime();

                if (!!startTime && !!finishTime) {
                    return finishTime.valueOf() - startTime.valueOf();
                }
                else {
                    return 0.0;
                }
            }
        });

        this.duration = ko.computed({
            read: () => {
                return DateUtility.calculateDuration(this.startTime(), this.finishTime());
            }
        });

        this.durationDescription = ko.computed({
            read: () => {
                var startTime: Date = this.startTime();
                var finishTime: Date = this.finishTime();
                var workerName: string = this.workerName() || BuildResources.NoAgentText;
                var currentTime: Date = ModelContext.ModelContext.currentDate();

                if (!!startTime && !!finishTime) {
                    return Utils_String.format(BuildCommonResources.BuildDurationCompletedAgoQueueFormat, getDurationText(startTime, finishTime), workerName, getDurationText(finishTime, new Date()));
                }
                else if (!!startTime) {
                    return Utils_String.format(BuildCommonResources.BuildDurationInProgressFormat, getDurationText(startTime, new Date()), workerName);
                }
                else if (this.isJobOrPhaseNode.peek()) {
                    return BuildResources.WaitingForAvailableAgent;
                }
                else {
                    return BuildResources.BuildDetailViewNotStarted;
                }
            }
        });

        this.stateIconClass = ko.computed({
            read: () => {
                return getTimelineRecordStateIconClass(this.state(), this.result());
            }
        });

        this.stateString = ko.computed({
            read: () => {
                switch (this.state()) {
                    case BuildContracts.TimelineRecordState.Completed:
                        return BuildResources.BuildRecordStateCompleted;
                    case BuildContracts.TimelineRecordState.InProgress:
                        return BuildResources.BuildRecordStateInProgress;
                    case BuildContracts.TimelineRecordState.Pending:
                    default:
                        return BuildResources.BuildRecordStatePending;
                }
            }
        });

        this.resultString = ko.computed({
            read: () => {
                switch (this.result()) {
                    case BuildContracts.TaskResult.Canceled:
                        return BuildCommonResources.BuildResultCanceled;
                    case BuildContracts.TaskResult.Failed:
                        return BuildCommonResources.BuildResultFailed;
                    case BuildContracts.TaskResult.Succeeded:
                        return BuildCommonResources.BuildResultSucceeded;
                    case BuildContracts.TaskResult.SucceededWithIssues:
                        return BuildResources.BuildResultSucceededWithIssues;
                    case BuildContracts.TaskResult.Abandoned:
                        return BuildResources.BuildResultAbandoned;
                    case BuildContracts.TaskResult.Skipped:
                        return BuildResources.BuildResultSkipped;
                    default:
                        return "";
                }
            }
        });

        // TODO: All these subscriptions are not disposed... P.S: Change the UI to react please :D! 
        ko.computed(() => {
            if (this.state() === BuildContracts.TimelineRecordState.Completed && this.result() === BuildContracts.TaskResult.Abandoned) {
                let existingClass = this.cssClass.peek();
                this.cssClass(existingClass + " task-abandoned");
            }
        });

        this.showIcon = ko.computed({
            read: () => {
                return this.nodes().length > 0;
            }
        });

        this.nodeIconCssClass = ko.computed({
            read: () => {
                return this.stateIconClass();
            }
        });

        this.statusText = ko.computed({
            read: () => {
                var state: BuildContracts.TimelineRecordState = this.state();
                var percentComplete: number = this.percentComplete();

                if (state === BuildContracts.TimelineRecordState.InProgress && percentComplete > 0.0 && percentComplete < 100.0) {
                    return percentComplete + "%";
                }
                else {
                    return "";
                }
            }
        });

        this.abandoned = ko.computed(() => {
            return this.result() === BuildContracts.TaskResult.Abandoned;
        });

        // default expanded
        this.expanded(true);

        this.text = ko.computed({
            read: () => {
                return Utils_String.format("{0} {1}", this.name(), this.statusText());
            }
        });

        this.ariaLabel = ko.computed({
            read: () => {
                return Utils_String.format("{0} {1} {2}", this.text(), this.stateString(), this.resultString());
            }
        });
    }

    /**
     * Called when the node is clicked
     * @param target The node
     * @param args Event args
     */
    public _onClick(target: KoTree.ITreeNode, args: JQueryEventObject) {
        if (!this.abandoned()) {
            super._onClick(target, args);
        }
    }

    /**
     * Determines if the build is in progress, so that special padding can be applied
     * @param target The node
     * @param args Event args
     */
    public inProgress(): boolean {
        return this.state() === BuildContracts.TimelineRecordState.InProgress;
    }

    /**
     * Updates the model from a data contract
     * @param record The data contract
     */
    public update(record: BuildContracts.TimelineRecord) {
        // if the change id is earlier, ignore it
        // even though the changeId is scoped to the timeline, this is safe because 
        //   a) only changed timeline records are included in a change batch and
        //   b) all fields are include in the change, not just the changed fields
        var previousChangeId = this.changeId.peek();
        if (previousChangeId && previousChangeId > record.changeId) {
            console.log('Ignoring timeline record update with changeId: ' + record.changeId + ' ...since we already have newer data with lastchanged: ' + previousChangeId);
            let timelineProperties = {};
            timelineProperties[Properties.TimelineRecordOldEvent] = `For Record ${record.id}, we got changeId ${record.changeId}, but previous changeId was ${previousChangeId}`;
            publishEvent(Features.SignalR, Sources.ResultView, timelineProperties);

            return;
        }

        this._timelineRecord = record;

        this.changeId(record.changeId);
        this.currentOperation(record.currentOperation);

        if (!!record.details) {
            if (!this.details()) {
                this.details(new TimelineReferenceViewModel.TimelineReferenceViewModel(this.buildId(), this.planId(), record.details));
            }
            else {
                this.details().update(record.details);
            }
        }

        this.finishTime(record.finishTime);
        this.id(record.id);
        this.lastModified(record.lastModified)
        this.location(record.url);

        if (!!record.log) {
            if (!this.log()) {
                this.log(new TaskLogReferenceViewModel.TaskLogReferenceViewModel(this.buildId(), record.log));
            }
            else {
                this.log().update(record.log);
            }
        }

        this.name(record.name);
        this.parentId(record.parentId);
        this.percentComplete(record.percentComplete);
        this.result(record.result);
        this.resultCode(record.resultCode);
        this.startTime(record.startTime);
        this.state(record.state);
        this.type(record.type);
        this.workerName(record.workerName);
        this.order(record.order);
        this.errorCount(record.errorCount);
        this.warningCount(record.warningCount);

        this.issues(record.issues || []);
    }
}

/**
 * Compares two potentially undefined dates to determine order
 * Undefined and null are considered to be "later" than actual date values
 */
export function orderDates(a: Date, b: Date): number {
    if (a && b) {
        return Utils_Date.defaultComparer(a, b);
    }
    else if (a) {
        return -1;
    }
    else if (b) {
        return 1;
    }
    else {
        return 0;
    }
}

/**
 * Compares the start times of two timeline records to determine order
 * Records without start times are considered to be "later" than records with start times
 */
export function orderTimelineRecords(a: TimelineRecordViewModel, b: TimelineRecordViewModel): number {
    if (!!a && !!b) {
        var aOrder = a.order();
        var bOrder = b.order();

        if (!!aOrder && !!bOrder && aOrder != bOrder) {
            return aOrder - bOrder;
        } else {
            var aStart = a.startTime();
            var bStart = b.startTime();

            return orderDates(aStart, bStart);
        }
    }
    else {
        return 0;
    }
}
