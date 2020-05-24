/// <reference types="jquery" />

import ko = require("knockout");
import Q = require("q");

import BuildDetails = require("Build/Scripts/BuildDetails");
import BuildDetailsViewModel = require("Build/Scripts/Models.BuildDetailsViewModel");
import BuildRealtime = require("Build/Scripts/Realtime");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import Context = require("Build/Scripts/Context");
import { loadSignalR } from "Build/Scripts/SignalR";
import DistributedTaskRealtime = require("Build/Scripts/TFS.DistributedTask.AgentPool.Realtime");
import { DurationHelper } from "Build/Scripts/Utilities/DurationHelper";
import PlanGroupsQueueUtils = require("Build/Scripts/Utilities/PlanGroupsQueueUtils");
import BuildUtils = require("Build/Scripts/Utilities/Utils");

import { BuildActions } from "Build.Common/Scripts/Linking";

import BuildContracts = require("TFS/Build/Contracts");
import DistributedTask = require("TFS/DistributedTask/Contracts");
import DistributedTaskApi = require("TFS/DistributedTask/TaskAgentRestClient");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import Knockout_Adapters = require("VSS/Adapters/Knockout");
import Navigation_Services = require("VSS/Navigation/Services");
import Service = require("VSS/Service");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Clipboard = require("VSS/Utils/Clipboard");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import VSS_Context = require("VSS/Context");
import VSS_Events = require("VSS/Events/Services");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

var domElem = Utils_UI.domElem;
var lineExpression: RegExp = /^\#*\[([^|\s\]]+).*?\](.*)/;
var consoleLineMarking = "******************************************************************************";

export class BuildConsoleTab extends BuildDetails.BuildDetailsTab {
    constructor() {
        super(BuildActions.Console, BuildResources.BuildDetailConsoleTitle, BuildConsoleControl.TemplateName);

        this.showCopyButton(true);
    }
}

export class BuildConsoleViewModel extends Knockout_Adapters.TemplateViewModel {
    private _recordsWithLines: IDictionaryStringTo<boolean> = {};
    public planId: string = null;
    public poolId: number = null;
    public build: BuildDetailsViewModel.BuildDetailsViewModel = null;

    public tab: BuildConsoleTab;
    public newRecordWithLinesEvent: KnockoutObservable<string> = ko.observable("");

    public jobs: IDictionaryStringTo<JobStatusViewModel> = {};
    public selectedJob: KnockoutObservable<JobStatusViewModel> = ko.observable(null);
    public pipelineQueueViewModel: PipelineQueueViewModel = null;

    constructor(context: BuildConsoleTab) {
        super();
        this.tab = context;

        this.tab._addDisposable(this);
        this.pipelineQueueViewModel = new PipelineQueueViewModel(context);

        // This is computed because the current build doesn't change once set, but it's not initialized when this
        // control is instantiated.
        this.computed(() => {
            this.build = context.currentBuild();
            if (this.build && this.build.definitionType.peek() === BuildContracts.DefinitionType.Build) {
                this.planId = this.build.planId.peek();
                let queue = this.build.queue.peek();
                if (queue && queue.pool) {
                    this.poolId = queue.pool.id;
                }
            }
        });

        // compute visibility
        this.computed(() => {
            this.tab.visible(this.isVisible());
        });
    }

    public dispose(): void {
        if (!!this.pipelineQueueViewModel) {
            this.pipelineQueueViewModel.dispose();
        }
    }

    public agentConnected(agentId: number): void {
        for (var jobId in this.jobs) {
            this.jobs[jobId].agentConnected(agentId);
        }
    }

    public agentDisconnected(agentId: number): void {
        for (var jobId in this.jobs) {
            this.jobs[jobId].agentDisconnected(agentId);
        }
    }

    public agentUpdated(agent: DistributedTask.TaskAgent): void {
        for (var jobId in this.jobs) {
            this.jobs[jobId].agentUpdated(agent);
        }
    }

    public requestAssigned(request: DistributedTask.TaskAgentJobRequest): void {
        if (request.planId === this.planId) {
            this.addJob(request);
        }

        for (var jobId in this.jobs) {
            this.jobs[jobId].requestAssigned(request);
        }

        if (!!this.selectedJob() && this.selectedJob().jobId === request.jobId) {
            if (!!this.pipelineQueueViewModel) {
                this.pipelineQueueViewModel.showPipelineQueue(false);
            }
        }
    }

    public requestCompleted(request: DistributedTask.TaskAgentJobRequest): void {
        for (var jobId in this.jobs) {
            this.jobs[jobId].requestCompleted(request);
        }
    }

    public requestQueued(request: DistributedTask.TaskAgentJobRequest): void {
        if (request.planId === this.planId) {
            this.addJob(request);
        }

        for (var jobId in this.jobs) {
            this.jobs[jobId].requestQueued(request);
        }
    }

    public requestStarted(request: DistributedTask.TaskAgentJobRequest): void {
        for (var jobId in this.jobs) {
            this.jobs[jobId].requestStarted(request);
        }
    }

    public addJob(request: DistributedTask.TaskAgentJobRequest): void {
        var jobStatusModel: JobStatusViewModel = this.jobs[request.jobId];
        if (!jobStatusModel) {
            jobStatusModel = new JobStatusViewModel(Context.viewContext, Context.buildDetailsContext, this.poolId, request.jobId, request);
            this.jobs[request.jobId] = jobStatusModel;
        }

        // See if this is the currently selected node and, if so, set the selected job to populate the UI
        // control once the server calls have finished
        const currentTimelineRecord = Context.buildDetailsContext.currentTimelineRecord();
        if (currentTimelineRecord && (jobStatusModel.jobId === currentTimelineRecord.id())) {
            this.selectedJob(jobStatusModel);
        }
    }

    protected isVisible(): boolean {
        // react to new console lines coming in. this will cause the tab to appear if lines arrive for the current record
        var timelineRecordId = this.newRecordWithLinesEvent();
        if (timelineRecordId) {
            this._recordsWithLines[timelineRecordId] = true;
        }

        var currentTimelineRecord = Context.buildDetailsContext.currentTimelineRecord();

        // if there's no build, or no timeline record (i.e. XAML builds), we don't show the console tab
        if (!this.build || !currentTimelineRecord) {
            return false;
        }

        // if the current record has lines, we'll show the tab
        var visible = !!this._recordsWithLines[currentTimelineRecord.id.peek()];

        // we'll also show the tab for Job nodes or phase nodes that don't have console lines yet (unless the build is finished)
        if (!visible && currentTimelineRecord.isJobOrPhaseNode()) {
            visible = this.build.status() !== BuildContracts.BuildStatus.Completed;
        }

        return visible;
    }
}

interface Lines {
    formatted: JQuery[];
    raw: string[];
}

export class BuildConsoleControl extends Knockout_Adapters.TemplateControl<BuildConsoleViewModel> {
    private static ConsoleBufferSize: number = 1000;
    private static SectionCssClass = "buildvnext-logs-console-line-section";
    private static PlaceholderCssClass = "buildvnext-logs-console-line-warning";
    private static LineCssClass = "buildvnext-logs-console-line";
    private static TaggedLineCssClassPrefix = "buildvnext-logs-console-line-";
    public static TemplateName = "buildvnext_details_console_tab2";

    private _eventsAttached: boolean = false;
    private _eventManager: VSS_Events.EventService;
    private _logConsoleLinesHandler: (sender, args) => void;
    private _$logsContainer: JQuery;

    private _recordIdsToPlaceholderLines: IDictionaryStringTo<boolean> = {};
    private _recordIdsToLines: IDictionaryStringTo<Lines> = {};

    private _poolHub: DistributedTaskRealtime.TaskAgentPoolHub;
    private _poolClient: DistributedTaskApi.TaskAgentHttpClient;
    private _agentConnected: (sender: any, args: number) => void;
    private _agentDisconnected: (sender: any, args: number) => void;
    private _agentUpdated: (sender: any, args: DistributedTask.TaskAgent) => void;
    private _agentRequestAssigned: (sender: any, args: DistributedTask.TaskAgentJobRequest) => void;
    private _agentRequestCompleted: (sender: any, args: DistributedTask.TaskAgentJobRequest) => void;
    private _agentRequestQueued: (sender: any, args: DistributedTask.TaskAgentJobRequest) => void;
    private _agentRequestStarted: (sender: any, args: DistributedTask.TaskAgentJobRequest) => void;
    private _planGroupsStarted: (sender: any, args: BuildContracts.TaskOrchestrationPlanGroupsStartedEvent) => void;

    private _currentBuildId = -1;

    constructor(viewModel: BuildConsoleViewModel, options?: any) {
        super(viewModel, options);

        this._logConsoleLinesHandler = (sender, args) => {
            this._handleConsoleLogEvent(<BuildContracts.ConsoleLogEvent>args);
        };

        this._agentConnected = (sender, agentId: number): void => {
            this.getViewModel().agentConnected(agentId);
        }

        this._agentDisconnected = (sender, agentId: number): void => {
            this.getViewModel().agentDisconnected(agentId);
        }

        this._agentUpdated = (sender, agent: DistributedTask.TaskAgent): void => {
            this.getViewModel().agentUpdated(agent);
        };

        this._agentRequestAssigned = (sender, request: DistributedTask.TaskAgentJobRequest): void => {
            this.getViewModel().requestAssigned(request);
        };

        this._agentRequestCompleted = (sender, request: DistributedTask.TaskAgentJobRequest): void => {
            this.getViewModel().requestCompleted(request);
        };

        this._agentRequestQueued = (sender, request: DistributedTask.TaskAgentJobRequest): void => {
            this.getViewModel().requestQueued(request);
        };

        this._agentRequestStarted = (sender, request: DistributedTask.TaskAgentJobRequest): void => {
            this.getViewModel().requestStarted(request);
        };

        this._planGroupsStarted = (sender, event: BuildContracts.TaskOrchestrationPlanGroupsStartedEvent): void => {
            this._handlePlanGroupsStarted(event);
        };

        this._eventManager = VSS_Events.getService();
        this._attachRealtimeEvents();

        this._eventManager.attachEvent(BuildDetails.BuildDetailsTab.CopyButtonClicked, () => {
            let currentTimelineRecord = Context.buildDetailsContext.currentTimelineRecord.peek();
            if (currentTimelineRecord) {
                let lines = this._getLines(currentTimelineRecord.id.peek());
                if (lines) {
                    let data = (lines.raw || []).join("\r\n");
                    Utils_Clipboard.copyToClipboard(data);
                }
            }
        });
    }

    initialize(): void {
        super.initialize();

        this._$logsContainer = $(domElem("div", "buildvnext-logs-console")).appendTo(this.getElement());

        // Setup a computed to stop the hub when the selected build becomes null.
        this.computed(() => {
            var currentBuild = Context.buildDetailsContext.currentBuild();
            if ((!currentBuild || currentBuild.status() === BuildContracts.BuildStatus.Completed)) {
                if (this._poolHub) {
                    this._poolHub.stop();
                }
                this.getViewModel().jobs = {};
                this.getViewModel().selectedJob(null);
            }

            if (!!currentBuild) {
                const buildId = currentBuild.id();
                // We might have hooked up to events already though we didn't set current Id yet, so let's not clear then
                // If the build changes, that's when we clear
                if (this._currentBuildId != -1 && this._currentBuildId !== buildId) {
                    this._clear();
                }

                this._currentBuildId = buildId;
            }
        });

        this.computed(() => {
            // show the lines for the selected timeline record
            var currentTimelineRecord = Context.buildDetailsContext.currentTimelineRecord();
            this._$logsContainer.empty();
            if (currentTimelineRecord) {
                var timelineRecordId = currentTimelineRecord.id.peek();
                var lines = this._getLines(timelineRecordId);
                if (lines) {
                    this._$logsContainer.append(lines.formatted);
                    this._$logsContainer.toggle(true);
                }
                else if (currentTimelineRecord.isPhaseNode()) {
                    this._appendPlaceholderLine(timelineRecordId, BuildResources.JobNodesToViewProgressText);
                }
                else {
                    // display a message if the build or job has not started yet
                    var currentBuild = Context.buildDetailsContext.currentBuild.peek();
                    if (currentBuild) {
                        // If the record state is not pending then we should show the console which means there
                        // is no reason to connect to the pool for events on this job.
                        if (currentTimelineRecord.state.peek() === BuildContracts.TimelineRecordState.Pending) {
                            var planId: string = currentBuild.planId.peek();
                            var queue: DistributedTask.TaskAgentQueue = currentBuild.queue.peek();
                            if (queue && queue.pool) {
                                this._$logsContainer.toggle(false);

                                var currentTimeline = Context.buildDetailsContext.currentTimeline.peek();
                                var initialViewModels = currentTimeline.records.peek().filter(x => (x.isJobOrPhaseNode.peek())).map((value) => {
                                    return new JobStatusViewModel(Context.viewContext, Context.buildDetailsContext, queue.pool.id, value.id.peek(), null);
                                });

                                loadSignalR().then(() => {
                                    if (!this._poolHub) {
                                        this._poolClient = Service.getCollectionClient(DistributedTaskApi.TaskAgentHttpClient, Context.viewContext.tfsContext.contextData);
                                        this._poolHub = new DistributedTaskRealtime.TaskAgentPoolHub(Context.viewContext.tfsContext);
                                    }

                                    // It's possible we have already received events from our subscription about jobs in
                                    // this plan, and if so we use the already constructed object. We do the queries in
                                    // this order to avoid a race where we query the requests for the plan before available,
                                    // but at the same time subscribe to the hub after the queued event has already been fired.
                                    this._poolHub.subscribe(queue.pool.id).then(() => {
                                        this._poolClient.getAgentRequestsForPlan(queue.pool.id, planId).then((requests: DistributedTask.TaskAgentJobRequest[]) => {
                                            var viewModel = this.getViewModel();
                                            requests.forEach((value: DistributedTask.TaskAgentJobRequest) => {
                                                viewModel.addJob(value);
                                            });

                                            initialViewModels.forEach((jobStatus: JobStatusViewModel) => {
                                                if (!viewModel.jobs[jobStatus.jobId]) {
                                                    viewModel.jobs[jobStatus.jobId] = jobStatus;
                                                }
                                            });

                                            // We hide the job request view if it has started, so we need to show
                                            // the console to avoid a blank screen and confusion.
                                            var selectedJob: JobStatusViewModel = viewModel.jobs[currentTimelineRecord.id.peek()];
                                            if (selectedJob && !selectedJob.started()) {
                                                viewModel.selectedJob(selectedJob);
                                            } else {
                                                this._$logsContainer.toggle(true);
                                                viewModel.selectedJob(null);
                                            }
                                        });
                                    });
                                }, (err: any) => {
                                    console.log(err);
                                });
                            }
                        } else {
                            // If the record is in progress then we should show the console
                            this._$logsContainer.toggle(true);
                            this.getViewModel().selectedJob(null);
                        }

                        var buildStatus = currentBuild.status();

                        if (buildStatus === BuildContracts.BuildStatus.NotStarted) {
                            this._appendPlaceholderLine(timelineRecordId, BuildResources.BuildDetailConsoleNotStartedText);
                        }
                        else if (buildStatus === BuildContracts.BuildStatus.InProgress) {
                            this._appendPlaceholderLine(timelineRecordId, BuildResources.BuildDetailConsoleWaitingForAgent);
                        }
                    }
                }
            }
        });
    }

    protected _dispose() {
        super._dispose();

        this._detachRealtimeEvents();

        if (this._poolHub) {
            this._poolHub.stop();
        }
    }

    private _appendPlaceholderLine(timelineRecordId: string, line: string) {
        this._$logsContainer.append($(domElem("div", BuildConsoleControl.PlaceholderCssClass)).text(line));
        this._recordIdsToPlaceholderLines[timelineRecordId.toLowerCase()] = true;
    }

    private _removePlaceholderLines(timelineRecordId: string) {
        timelineRecordId = timelineRecordId.toLowerCase();
        if (this._recordIdsToPlaceholderLines[timelineRecordId]) {
            this._recordIdsToPlaceholderLines[timelineRecordId] = false;
            this._$logsContainer.empty();
        }
    }

    private _setLines(timelineRecordId: string, lines: Lines) {
        timelineRecordId = timelineRecordId.toLowerCase();
        if (!this._recordIdsToLines[timelineRecordId]) {
            this._recordIdsToLines[timelineRecordId] = lines;
            this.getViewModel().newRecordWithLinesEvent(timelineRecordId);
        }
        else {
            this._recordIdsToLines[timelineRecordId] = lines;
        }
    }

    private _clear() {
        this._recordIdsToLines = {};
        this._recordIdsToPlaceholderLines = {};
    }

    private _getLines(timelineRecordId: string): Lines {
        return this._recordIdsToLines[timelineRecordId.toLowerCase()];
    }

    private _handlePlanGroupsStarted(event: BuildContracts.TaskOrchestrationPlanGroupsStartedEvent) {
        if (!!event && !!event.planGroups && !!this.getViewModel().pipelineQueueViewModel) {
            this.getViewModel().pipelineQueueViewModel.handlePlanGroupsStartedEvent(event.planGroups);
        }
    }

    private _handleConsoleLogEvent(consoleEvent: BuildContracts.ConsoleLogEvent) {
        // create the lines to be added
        let lines: Lines = this._getLines(consoleEvent.timelineRecordId);
        if (!lines) {
            lines = {
                formatted: [],
                raw: []
            };
        }

        let formattedLines: JQuery[] = lines.formatted || [];

        $.each(consoleEvent.lines, (index: number, line: string) => {
            var matches: RegExpExecArray = lineExpression.exec(line);
            if (!!matches && matches.length > 2) {
                var tag: string = matches[1].toLowerCase();
                var text: string = matches[2];

                if (tag === "section") {
                    formattedLines.push($(domElem("div", BuildConsoleControl.SectionCssClass)).text(consoleLineMarking));
                    formattedLines.push($(domElem("div", BuildConsoleControl.SectionCssClass)).text(text));
                    formattedLines.push($(domElem("div", BuildConsoleControl.SectionCssClass)).text(consoleLineMarking));
                }
                else if ($.inArray(tag, _knownTags) != -1) {
                    formattedLines.push($(domElem("div", BuildConsoleControl.TaggedLineCssClassPrefix + tag)).text(text));
                }
                else {
                    // ignore unknown tags
                    formattedLines.push($(domElem("div", BuildConsoleControl.LineCssClass)).text(text));
                }
            }
            else {
                // no tag found
                formattedLines.push($(domElem("div", BuildConsoleControl.LineCssClass)).text(line));
            }
        });

        // if this record is selected, append lines to the container
        var currentTimelineRecord = Context.buildDetailsContext.currentTimelineRecord.peek();
        if (currentTimelineRecord && Utils_String.localeIgnoreCaseComparer(currentTimelineRecord.id.peek(), consoleEvent.timelineRecordId) === 0) {
            // remove placeholder lines
            this._removePlaceholderLines(consoleEvent.timelineRecordId);

            // append lines
            var viewModel = this.getViewModel();
            var selectedJob = viewModel.selectedJob();
            if (selectedJob && selectedJob.jobId === consoleEvent.timelineRecordId) {
                var statusContainer = this.getElement().find(".buildvnext-jobs-console");
                if (statusContainer) {
                    statusContainer.fadeOut(500, () => {
                        selectedJob.started(true);
                        if (viewModel.selectedJob() === selectedJob) {
                            viewModel.selectedJob(null);
                        }
                        this._$logsContainer.fadeIn(500);
                    });
                }
            } else {
                this._$logsContainer.toggle(true);
            }

            this._$logsContainer.append(formattedLines);

            // remove lines from the front, if necessary
            var lineCount = this._$logsContainer.children().length;
            if (lineCount > BuildConsoleControl.ConsoleBufferSize) {
                this._$logsContainer.find("div:lt(" + (lineCount - BuildConsoleControl.ConsoleBufferSize) + ")").remove();
            }

            // scroll to the bottom
            this._$logsContainer.scrollTop(this._$logsContainer[0].scrollHeight);

            // save the lines
            formattedLines = <any>this._$logsContainer.children().toArray();
        }
        else {
            // the record is not currently selected. just make sure the array isn't too big
            if (formattedLines.length > BuildConsoleControl.ConsoleBufferSize) {
                formattedLines = formattedLines.slice(formattedLines.length - BuildConsoleControl.ConsoleBufferSize, formattedLines.length - 1);
            }
        }
        lines.formatted = formattedLines;

        // raw lines
        let rawLines = lines.raw || [];
        rawLines = rawLines.concat(consoleEvent.lines);
        if (rawLines.length > BuildConsoleControl.ConsoleBufferSize) {
            rawLines = rawLines.slice(rawLines.length - BuildConsoleControl.ConsoleBufferSize, rawLines.length - 1);
        }
        lines.raw = rawLines;

        this._setLines(consoleEvent.timelineRecordId, lines);
    }

    private _attachRealtimeEvents() {
        if (!this._eventsAttached) {
            this._eventManager.attachEvent(BuildRealtime.BuildRealtimeEvent.LOG_CONSOLE_LINES, this._logConsoleLinesHandler);
            this._eventManager.attachEvent(DistributedTaskRealtime.PoolEvents.AgentConnected, this._agentConnected);
            this._eventManager.attachEvent(DistributedTaskRealtime.PoolEvents.AgentDisconnected, this._agentDisconnected);
            this._eventManager.attachEvent(DistributedTaskRealtime.PoolEvents.AgentUpdated, this._agentUpdated);
            this._eventManager.attachEvent(DistributedTaskRealtime.PoolEvents.AgentRequestAssigned, this._agentRequestAssigned);
            this._eventManager.attachEvent(DistributedTaskRealtime.PoolEvents.AgentRequestCompleted, this._agentRequestCompleted);
            this._eventManager.attachEvent(DistributedTaskRealtime.PoolEvents.AgentRequestQueued, this._agentRequestQueued);
            this._eventManager.attachEvent(DistributedTaskRealtime.PoolEvents.AgentRequestStarted, this._agentRequestStarted);

            if (PipelineQueueViewModel.canShowPipelinePlanGroupsQueuePosition()) {
                this._eventManager.attachEvent(BuildRealtime.BuildRealtimeEvent.PLANGROUPS_STARTED, this._planGroupsStarted);
            }

            this._eventsAttached = true;
        }
    }

    private _detachRealtimeEvents() {
        if (this._eventsAttached) {
            this._eventManager.detachEvent(BuildRealtime.BuildRealtimeEvent.LOG_CONSOLE_LINES, this._logConsoleLinesHandler);
            this._eventManager.detachEvent(DistributedTaskRealtime.PoolEvents.AgentConnected, this._agentConnected);
            this._eventManager.detachEvent(DistributedTaskRealtime.PoolEvents.AgentDisconnected, this._agentDisconnected);
            this._eventManager.detachEvent(DistributedTaskRealtime.PoolEvents.AgentUpdated, this._agentUpdated);
            this._eventManager.detachEvent(DistributedTaskRealtime.PoolEvents.AgentRequestAssigned, this._agentRequestAssigned);
            this._eventManager.detachEvent(DistributedTaskRealtime.PoolEvents.AgentRequestCompleted, this._agentRequestCompleted);
            this._eventManager.detachEvent(DistributedTaskRealtime.PoolEvents.AgentRequestQueued, this._agentRequestQueued);
            this._eventManager.detachEvent(DistributedTaskRealtime.PoolEvents.AgentRequestStarted, this._agentRequestStarted);

            if (PipelineQueueViewModel.canShowPipelinePlanGroupsQueuePosition()) {
                this._eventManager.detachEvent(BuildRealtime.BuildRealtimeEvent.PLANGROUPS_STARTED, this._planGroupsStarted);
            }

            this._eventsAttached = false;
        }
    }
}

export class JobStatusViewModel {
    private _initPromise: IPromise<any> = null;
    private _loadPromise: IPromise<any> = null;
    private _poolClient: DistributedTaskApi.TaskAgentHttpClient;
    private _agents: IDictionaryNumberTo<TaskAgentViewModel> = {};
    private _build: KnockoutObservable<BuildDetailsViewModel.BuildDetailsViewModel> = ko.observable(null);

    public jobId: string = null;
    public poolId: number = null;
    public request: KnockoutObservable<DistributedTask.TaskAgentJobRequest> = ko.observable(null);
    public position: KnockoutComputed<number> = null;
    public title: KnockoutComputed<string> = null;
    public delayStatus: KnockoutComputed<string> = null;
    public loaded: KnockoutObservable<boolean> = ko.observable(false);
    public started: KnockoutObservable<boolean> = ko.observable(false);
    public enabledAgents: KnockoutObservableArray<TaskAgentViewModel> = ko.observableArray([]);
    public disabledAgents: KnockoutObservableArray<TaskAgentViewModel> = ko.observableArray([]);

    public isHostedPool: KnockoutObservable<boolean> = ko.observable(false);
    public manageLimitsLink: string = null;
    public waitingForLicense: KnockoutObservable<boolean> = ko.observable(false);
    public totalLicenseCount: KnockoutObservable<number> = ko.observable(0);
    public usedLicenseCount: KnockoutObservable<number> = ko.observable(0);

    private static ParallelTag = "ParallelismTag";

    constructor(viewContext: Context.ViewContext, buildContext: Context.BuildDetailsContext, poolId: number, jobId: string, request: DistributedTask.TaskAgentJobRequest) {
        this._poolClient = Service.getCollectionClient(DistributedTaskApi.TaskAgentHttpClient, viewContext.tfsContext.contextData);

        this.jobId = jobId;
        this.poolId = poolId;

        this.manageLimitsLink = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl("", "buildQueue", { area: "admin", project: "" }) + Navigation_Services.getHistoryService().getFragmentActionLink("concurrentJobs");

        this._build(buildContext.currentBuild());

        this.position = ko.computed(() => {
            var position = Number.MAX_VALUE;
            this.enabledAgents().forEach((value) => {
                var positionInAgent = value.position();
                if (positionInAgent < position) {
                    position = positionInAgent;
                }
            });
            return position;
        });

        this.title = ko.computed(() => {
            var request = this.request();
            const build = this._build();
            if (build && build.queueStatus() === BuildContracts.DefinitionQueueStatus.Paused) {
                return BuildResources.DefinitionPausedResume;
            }
            if (!request) {
                return BuildResources.WaitingForAgentRequest;
            } else {
                var enabledCount: number = this.enabledAgents().length;
                if (enabledCount > 0) {
                    var position = this.position();
                    if (position !== Number.MAX_VALUE) {
                        return Utils_String.format(BuildResources.WaitingForAvailableAgentWithPositionFormat, position);
                    } else {
                        return BuildResources.WaitingForAvailableAgent;
                    }
                } else {
                    return BuildResources.WaitingForEnabledAgent;
                }
            }
        });

        this.delayStatus = ko.computed(() => {
            // we want to recalculate this value when queue position changes
            let myPosition = this.position();
            if (!myPosition || myPosition == Number.MAX_VALUE) {
                return "";
            }

            let request = this.request();
            if (!request || !request.agentDelays || request.agentDelays.length == 0) {
                return "";
            }

            let bestAgentDelay = request.agentDelays[0];
            let bestAgentDelayTime = bestAgentDelay.delays.map(DurationHelper.fromTimeSpanString).reduce(DurationHelper.add);

            for (let i = 1; i != request.agentDelays.length; ++i) {
                let sum = request.agentDelays[i].delays.map(DurationHelper.fromTimeSpanString).reduce(DurationHelper.add);
                if (sum < bestAgentDelayTime) {
                    bestAgentDelay = request.agentDelays[i];
                    bestAgentDelayTime = sum;
                }
            }

            return Utils_String.format(BuildResources.WaitingForAvailableAgentExpectedTimeWithTimeFormat, bestAgentDelayTime.toHumanizedString());
        });

        // If we have no request then start a delayed timer to mark it loaded. If no request is found we will at least
        // render a title instead of leaving a completely blank page that looks like we failed to load.
        if (!request) {
            this._loadPromise = Q.delay(3000).then(() => {
                this.loaded(true);
            });
        } else {
            this._initialize(request);
        }
    }

    public agentConnected(agentId: number): void {
        if (this._agents[agentId]) {
            this._agents[agentId].online(true);
        }
    }

    public agentDisconnected(agentId: number): void {
        if (this._agents[agentId]) {
            this._agents[agentId].online(false);
        }
    }

    public agentUpdated(agent: DistributedTask.TaskAgent): void {
        if (this._agents[agent.id]) {
            var agentModel: TaskAgentViewModel = this._agents[agent.id];
            var oldEnabled: boolean = agentModel.enabled();

            agentModel.update(agent);

            if (oldEnabled !== agent.enabled) {
                var sourceArray: KnockoutObservableArray<TaskAgentViewModel> = null;
                var targetArray: KnockoutObservableArray<TaskAgentViewModel> = null;
                if (oldEnabled) {
                    sourceArray = this.enabledAgents;
                    targetArray = this.disabledAgents;
                } else {
                    sourceArray = this.disabledAgents;
                    targetArray = this.enabledAgents;
                }

                var removed: TaskAgentViewModel = null;
                sourceArray.remove((item: TaskAgentViewModel) => {
                    if (item.id === agent.id) {
                        removed = item;
                        return true;
                    }
                    return false;
                });

                if (removed) {
                    targetArray.push(removed);
                }
            }
        }
    }

    public requestAssigned(request: DistributedTask.TaskAgentJobRequest): void {
        if (request.jobId === this.jobId && this.request() == null) {
            this._initialize(request);
        } else {
            for (var agentId in this._agents) {
                if (request.reservedAgent.id == Number(agentId)) {
                    this._agents[agentId].updateRequest(request);
                } else {
                    this._agents[agentId].removeRequest(request);
                }
            }
        }
    }

    public requestCompleted(request: DistributedTask.TaskAgentJobRequest): void {
        for (var agentId in this._agents) {
            this._agents[agentId].removeRequest(request);
        }
    }

    public requestQueued(request: DistributedTask.TaskAgentJobRequest): void {
        if (request.jobId === this.jobId && this.request() == null) {
            this._initialize(request);
        } else {
            request.matchedAgents.forEach((value: DistributedTask.TaskAgentReference) => {
                var agent: TaskAgentViewModel = this._agents[value.id];
                if (agent) {
                    agent.updateRequest(request);
                }
            });
        }
    }

    public requestStarted(request: DistributedTask.TaskAgentJobRequest): void {
        for (var agentId in this._agents) {
            if (request.reservedAgent.id == Number(agentId)) {
                this._agents[agentId].updateRequest(request);
            } else {
                this._agents[agentId].removeRequest(request);
            }
        }
    }

    private _initialize(currentRequest: DistributedTask.TaskAgentJobRequest) {
        this.request(currentRequest);
        if (currentRequest) {
            Context.viewContext.getPool(currentRequest.poolId).then((pool) => {
                this.isHostedPool(pool && pool.isHosted);
                const isConcurrentJob = !currentRequest.reservedAgent && currentRequest.data && currentRequest.data[JobStatusViewModel.ParallelTag];
                if (isConcurrentJob) {
                    this._poolClient.getResourceUsage(currentRequest.data[JobStatusViewModel.ParallelTag], pool ? pool.isHosted : false)
                        .then((resourceUsage: DistributedTask.ResourceUsage) => {
                            const isWaitingForLicense = resourceUsage && resourceUsage.resourceLimit && resourceUsage.resourceLimit.totalCount === resourceUsage.usedCount;
                            if (isWaitingForLicense) {
                                this.waitingForLicense(true);
                                this.totalLicenseCount(resourceUsage.resourceLimit.totalCount);
                                this.usedLicenseCount(resourceUsage.usedCount);
                                this.loaded(true);
                            }
                            else {
                                this.waitingForLicense(false);
                                this._initializeAgentRequest(currentRequest);
                            }
                        });
                }
                else {
                    this._initializeAgentRequest(currentRequest);
                }
            });
        }
    }

    private _initializeAgentRequest(currentRequest: DistributedTask.TaskAgentJobRequest) {
        if (currentRequest.matchedAgents) {
            const agentIds: number[] = (currentRequest.matchedAgents || []).map((value) => {
                return value.id;
            });

            // Read all requests for the matched agents so we can build the agent view models
            this._initPromise = this._poolClient.getAgentRequestsForAgents(this.poolId, agentIds, 0).then((requests: DistributedTask.TaskAgentJobRequest[]) => {
                this._initializeAgents(requests);
                this.loaded(true);
            });
        } else {
            // Initialize the view model with the single reserved agent if we have already been assigned
            this._initializeAgents([currentRequest]);
            this.loaded(true);
            this.started(currentRequest.receiveTime != null || currentRequest.finishTime != null);
        }
    }

    private _initializeAgents(requests: DistributedTask.TaskAgentJobRequest[]): void {
        var requestsByAgent: IDictionaryNumberTo<DistributedTask.TaskAgentJobRequest[]> = {};
        requests.forEach((value: DistributedTask.TaskAgentJobRequest) => {
            if (value.matchedAgents) {
                value.matchedAgents.forEach((matchedAgent: DistributedTask.TaskAgentReference) => {
                    this._initializeAgent(value, matchedAgent, requestsByAgent);
                });
            } else if (value.reservedAgent) {
                this._initializeAgent(value, value.reservedAgent, requestsByAgent);
            }
        });

        for (var agentId in this._agents) {
            var agentViewModel: TaskAgentViewModel = this._agents[agentId];
            if (requestsByAgent[agentId]) {
                agentViewModel.requests(requestsByAgent[agentId]);
            }

            if (agentViewModel.enabled()) {
                this.enabledAgents.push(agentViewModel);
            } else {
                this.disabledAgents.push(agentViewModel);
            }
        }
    }

    private _initializeAgent(request: DistributedTask.TaskAgentJobRequest, agent: DistributedTask.TaskAgentReference, requestsByAgent: IDictionaryNumberTo<DistributedTask.TaskAgentJobRequest[]>): void {
        var agentViewModel: TaskAgentViewModel = this._agents[agent.id];
        if (!agentViewModel) {
            agentViewModel = new TaskAgentViewModel(agent, this.request());
            this._agents[agent.id] = agentViewModel;
        }

        if (!requestsByAgent[agent.id]) {
            requestsByAgent[agent.id] = [];
        }

        requestsByAgent[agent.id].push(request);
    }
}

/**
 * Provides a view model for viewing the queue of a particular agent
 */
export class TaskAgentViewModel {
    private _agent: DistributedTask.TaskAgentReference;
    private _request: DistributedTask.TaskAgentJobRequest;
    public id: number;
    public name: KnockoutObservable<string> = ko.observable(null);
    public position: KnockoutComputed<number> = null;
    public enabled: KnockoutObservable<boolean> = ko.observable(true);
    public online: KnockoutObservable<boolean> = ko.observable(true);
    public manageLink: KnockoutObservable<string> = ko.observable(null);
    public statusText: KnockoutComputed<string> = null;
    public statusLink: KnockoutComputed<string> = null;
    public startTime: KnockoutComputed<string> = null;
    public startTimeRaw: KnockoutComputed<Date> = null;
    public eta: KnockoutComputed<string> = null;
    public etaRaw: KnockoutComputed<Date> = null;
    public itemCss: KnockoutComputed<string> = null;
    public active: KnockoutComputed<boolean> = null;
    public activeRequest: KnockoutComputed<DistributedTask.TaskAgentJobRequest> = null;
    public requests: KnockoutObservableArray<DistributedTask.TaskAgentJobRequest> = ko.observableArray([]);

    private static ItemClass: string = "buildvnext-jobs-console__item";
    private static ItemClassOffline: string = TaskAgentViewModel.ItemClass + " buildvnext-jobs-console__item--offline";
    private static ItemClassDisabled: string = TaskAgentViewModel.ItemClass + " buildvnext-jobs-console__item--disabled";

    constructor(agent: DistributedTask.TaskAgentReference, request: DistributedTask.TaskAgentJobRequest) {
        this.update(agent);
        this._request = request;
        this.itemCss = ko.computed(() => {
            if (this.enabled()) {
                return this.online() ? TaskAgentViewModel.ItemClass : TaskAgentViewModel.ItemClassOffline;
            } else {
                return TaskAgentViewModel.ItemClassDisabled;
            }
        });

        this.position = ko.computed(() => {
            if (!this.enabled()) {
                return 0;
            }

            var requests = this.requests();
            var seedRequest: DistributedTask.TaskAgentJobRequest = null;
            var queuedRequests: DistributedTask.TaskAgentJobRequest[] = [];
            var assignedRequests: DistributedTask.TaskAgentJobRequest[] = [];
            requests.forEach((value, index, array) => {
                if (!value.finishTime) {
                    if (value.assignTime) {
                        assignedRequests.push(value);
                    } else {
                        queuedRequests.push(value);
                    }
                }

                if (value.requestId === this._request.requestId) {
                    seedRequest = value;
                }
            });

            var sortedRequests = assignedRequests.sort((a, b) => {
                return Utils_Date.defaultComparer(a.assignTime, b.assignTime);
            }).concat(queuedRequests.sort((a, b) => {
                return Utils_Date.defaultComparer(a.queueTime, b.queueTime);
            }));

            return sortedRequests.indexOf(seedRequest) + 1;
        });

        this.activeRequest = ko.computed(() => {
            var activeRequests = this.requests().filter((value: DistributedTask.TaskAgentJobRequest) => {
                return value.receiveTime && !value.finishTime;
            });

            if (activeRequests.length > 0) {
                return activeRequests[0];
            } else {
                return null;
            }
        });

        this.active = ko.computed(() => {
            return this.activeRequest() != null;
        });

        this.statusLink = ko.computed(() => {
            var activeRequest: DistributedTask.TaskAgentJobRequest = this.activeRequest();
            if (activeRequest && activeRequest.owner && activeRequest.owner._links && activeRequest.owner._links.web) {
                return activeRequest.owner._links.web.href;
            } else {
                return null;
            }
        });

        this.statusText = ko.computed(() => {
            var activeRequest: DistributedTask.TaskAgentJobRequest = this.activeRequest();
            if (activeRequest) {
                if (activeRequest.requestId == this._request.requestId) {
                    return Utils_String.format(BuildResources.TaskAgentRunningYourActivityFormat, activeRequest.planType.toLowerCase(), activeRequest.owner.name);
                }
                return Utils_String.format(BuildResources.TaskAgentActivityFormat, activeRequest.planType.toLowerCase(), activeRequest.owner.name);
            } else if (this.enabled()) {
                return BuildResources.TaskAgentActivityIdle;
            } else {
                return BuildResources.TaskAgentActivityDisabled;
            }
        });

        this.startTimeRaw = ko.computed(() => {
            let position = this.position();
            if (position <= 1) {
                return Utils_Date.getNowInUserTimeZone();
            }

            let ar = this.activeRequest();
            if (ar) {
                return ar.receiveTime;
            }

            return undefined;
        });

        let tick = ko.observable(0);
        this.startTime = ko.computed(() => {
            let t = tick();
            let position = this.position();
            if (position <= 1) {
                return BuildResources.TaskAgentStartedNow;
            }

            let startTimeRaw = this.startTimeRaw();
            if (startTimeRaw) {
                setTimeout(function () { tick(t + 1); }, 60000);

                return Utils_String.format(
                    BuildResources.TaskAgentStartedFormat,
                    Utils_Date.friendly(startTimeRaw));
            }

            return "";
        });

        this.etaRaw = ko.computed(() => {
            let position = this.position();
            if (position <= 1) {
                return Utils_Date.getNowInUserTimeZone();
            }

            let activeRequest = this.activeRequest();
            if (activeRequest && activeRequest.expectedDuration) {
                let duration = new DurationHelper(activeRequest.expectedDuration);
                return Utils_Date.addHours(activeRequest.receiveTime, duration.totalMilliseconds / 3600000.0);
            }

            return undefined;
        })

        this.eta = ko.computed(() => {
            let position = this.position();
            if (position <= 1) {
                return BuildResources.TaskAgentPreparingYourActivity;
            }

            let etaRaw = this.etaRaw();
            if (etaRaw) {
                return Utils_String.format(BuildResources.TaskAgentActivityEtaFormat, etaRaw.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            }

            return BuildResources.WaitingForAgentExpectedBuildDurationUnknown;
        });
    }

    public update(agent: DistributedTask.TaskAgentReference): void {
        this._agent = agent;

        this.id = agent.id;
        this.name(agent.name);
        this.enabled(agent.enabled);
        this.online(agent.status === DistributedTask.TaskAgentStatus.Online);

        if (agent._links && agent._links.web && agent._links.web.href) {
            this.manageLink(agent._links.web.href);
        } else {
            this.manageLink(null);
        }
    }

    public updateRequest(request: DistributedTask.TaskAgentJobRequest): void {
        var requests = this.requests().filter((value) => {
            return value.requestId !== request.requestId;
        });

        requests.push(request);
        this.requests(requests);
    }

    public removeRequest(request: DistributedTask.TaskAgentJobRequest): void {
        this.requests.remove((item) => {
            return item.requestId === request.requestId;
        })
    }
}

export class PipelineQueueViewModel {
    public queuePosition: KnockoutObservable<string> = ko.observable("");
    public showPipelineQueue: KnockoutObservable<boolean> = ko.observable(false);
    public buyMoreLink: string;
    public licensingPipelineMessage: KnockoutObservable<string> = ko.observable(BuildResources.BuildWaitingForPipelineText);

    constructor(context: BuildConsoleTab) {
        this.buyMoreLink = PipelineQueueViewModel.getResourceLimitAdminUrl();

        if (TFS_Host_TfsContext.TfsContext.getDefault().isHosted) {
            this._getPlanQueues();

            this._planGroupsSubscription = this._planGroups.subscribe((planGroups: DistributedTask.TaskOrchestrationQueuedPlanGroup[]) => {
                this._updateQueuePosition();
            });

            this._showPipelineQueueSubscription = this.showPipelineQueue.subscribe((showPipelineQueue: boolean) => {
                if (!!context.currentBuild.peek()) {
                    context.currentBuild().isWaitingForPipeline(showPipelineQueue);
                }
            });

            Context.buildDetailsContext.currentBuild.subscribe((build: BuildDetailsViewModel.BuildDetailsViewModel) => {
                this._getPlanQueues();
            });
        }

    }

    public onLinkKeyDown(viewModel: any, event: JQueryEventObject): boolean {
        return BuildUtils.AccessibilityHelper.triggerClickOnEnterOrSpaceKeyPress(event)
    }

    public showPlanGroupsQueueDialog(viewModel: any, event: JQueryEventObject): void {
        PlanGroupsQueueUtils.showPlanGroupsQueueDialogHelper(event);
    }

    public static canShowPipelinePlanGroupsQueuePosition(): boolean {
        return FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.BuildAndReleaseResourceLimits, false)
            && TFS_Host_TfsContext.TfsContext.getDefault().isHosted;
    }

    public dispose(): void {
        if (!!this._showPipelineQueueSubscription) {
            this._showPipelineQueueSubscription.dispose();
        }

        if (!!this._planGroupsSubscription) {
            this._planGroupsSubscription.dispose();
        }
    }

    public handlePlanGroupsStartedEvent(startedPlanGroups: BuildContracts.TaskOrchestrationPlanGroupReference[]): void {
        if (!startedPlanGroups ||
            startedPlanGroups.length == 0 ||
            !this._planGroups.peek() ||
            this._planGroups.peek().length == 0) {

            return;
        }

        if (this._containsCurrentPlanGroup(startedPlanGroups)) {
            this.showPipelineQueue(false);
        }

        var filteredPlanGroups = this._planGroups().filter((planGroup: DistributedTask.TaskOrchestrationQueuedPlanGroup) => {
            var matchedPlanGroup = Utils_Array.first(startedPlanGroups, (startedPlanGroup: BuildContracts.TaskOrchestrationPlanGroupReference) => {
                return planGroup.project.id === startedPlanGroup.projectId && planGroup.planGroup === startedPlanGroup.planGroup;
            });

            return !matchedPlanGroup;
        });

        this._planGroups(filteredPlanGroups);
    }

    private _containsCurrentPlanGroup(startedPlanGroups: BuildContracts.TaskOrchestrationPlanGroupReference[]) {
        var projectId = VSS_Context.getDefaultWebContext().project.id;
        var planGroupName = Context.buildDetailsContext.currentBuild() != null ? Context.buildDetailsContext.currentBuild().id() : "0";

        var currentPlanGroup = Utils_Array.first(startedPlanGroups, (planGroup: BuildContracts.TaskOrchestrationPlanGroupReference) => { return planGroup.projectId === projectId && planGroup.planGroup === planGroupName });

        return !!currentPlanGroup;
    }

    private _getPlanQueues(): void {
        if (!PipelineQueueViewModel.canShowPipelinePlanGroupsQueuePosition()) {
            return;
        }

        Context.viewContext.taskClient.getQueuedPlanGroups(Context.viewContext.tfsContext.contextData.project.id, "Build", DistributedTask.PlanGroupStatus.Queued, this._maximumPlanGroupsSize)
            .then((planGroups: DistributedTask.TaskOrchestrationQueuedPlanGroup[]) => {
                if (!!planGroups) {
                    this._planGroups(planGroups);
                }
                else {
                    this._planGroups([]);
                }

                this._updateQueuePosition();
            }, (err) => {
                console.log(err);
            });
    }

    private _getCurrentPlanGroup(): IPromise<DistributedTask.TaskOrchestrationQueuedPlanGroup> {
        var projectId = VSS_Context.getDefaultWebContext().project.id;
        var buildId = Context.buildDetailsContext.currentBuild() != null ? Context.buildDetailsContext.currentBuild().id().toString() : "0";
        return Context.viewContext.taskClient.getQueuedPlanGroup(Context.viewContext.tfsContext.contextData.project.id, "Build", buildId);
    }


    private _getPlanGroupQueueTime(planGroup: DistributedTask.TaskOrchestrationQueuedPlanGroup) {
        var queueTime;
        if (!!planGroup && !!planGroup.plans && planGroup.plans.length > 0) {
            queueTime = planGroup.plans[0].queueTime;

            planGroup.plans.forEach((plan) => {
                if (Utils_Date.defaultComparer(queueTime, plan.queueTime) > 0) {
                    queueTime = plan.queueTime;
                }
            });
        }

        return queueTime;
    }

    private static getResourceLimitAdminUrl(): string {
        return TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl("", "buildQueue", { area: "admin", project: "" }) + Navigation_Services.getHistoryService().getFragmentActionLink("resourceLimits");
    }

    private _updateQueuePosition(): void {
        if (this._planGroups() && this._planGroups().length > 0) {
            var position = 0;
            if (!this._currentPlanGroup) {
                this._getCurrentPlanGroup().then(
                    (currentPlanGroup: DistributedTask.TaskOrchestrationQueuedPlanGroup) => {
                        if (currentPlanGroup) {
                            this._currentPlanGroup = currentPlanGroup;
                            position = this._currentPlanGroup.queuePosition + 1;
                            this.queuePosition(position.toString());
                            if (position > 1) {
                                this.showPipelineQueue(true);
                                this._showAppropriatePipelineMessage();
                            }
                        } else {
                            this.queuePosition(BuildResources.GreaterThan50);
                            this._showAppropriatePipelineMessage();
                        }
                    },
                    (error) => {
                        this.showPipelineQueue(false);
                    });
            } else {
                var queueTime = this._getPlanGroupQueueTime(this._currentPlanGroup);
                var countPrecedingPlanGroups: number = 0;

                this._planGroups().forEach((planGroup: DistributedTask.TaskOrchestrationQueuedPlanGroup,
                    index: number) => {
                    if (Utils_Date.defaultComparer(queueTime, this._getPlanGroupQueueTime(planGroup)) >=
                        0) {
                        countPrecedingPlanGroups++;
                    }
                });

                position = countPrecedingPlanGroups + 1;
                this.queuePosition(position.toString());
                if (position > 1) {
                    this.showPipelineQueue(true);
                    this._showAppropriatePipelineMessage();
                } else {
                    this.showPipelineQueue(false);
                }
            }
        } else {
            this.showPipelineQueue(false);
        }
    }

    private _showAppropriatePipelineMessage() {
        var licenseInfo: IPromise<number> = this._getLicensingCount();
        var queueMetrics: IPromise<DistributedTask.TaskOrchestrationPlanGroupsQueueMetrics[]> = this._getPlanQueueMetrics();
        Q.spread<any, void>([licenseInfo, queueMetrics],
            (licenseCount: number, metrics: DistributedTask.TaskOrchestrationPlanGroupsQueueMetrics[]) => {
                var runningPlanGroups = (Utils_Array.first(metrics, (queueMetric: DistributedTask.TaskOrchestrationPlanGroupsQueueMetrics) => {
                    return queueMetric.status === DistributedTask.PlanGroupStatus.Running;
                }));
                var queuePosition = parseInt(this.queuePosition());
                if (isNaN(queuePosition)) {
                    return;
                }
                if (runningPlanGroups.count + queuePosition <= licenseCount) {
                    if (queuePosition > this._maximumPlanGroupsSize) {
                        this.licensingPipelineMessage(BuildResources.WaitingForPipelineToBeAssignedRefreshToUpdate);
                    } else {
                        this.licensingPipelineMessage(BuildResources.WaitingForPipelineToBeAssigned);
                    }

                    this.showPipelineQueue(false);
                } else {
                    if (queuePosition > this._maximumPlanGroupsSize) {
                        this.licensingPipelineMessage(Utils_String.localeFormat(BuildResources.WaitForFreePipelineWithRefreshMessage, this.buyMoreLink));
                    } else {
                        this.licensingPipelineMessage(Utils_String.localeFormat(BuildResources.WaitForFreePipelineMessage, this.buyMoreLink));
                    }

                    this.showPipelineQueue(true);
                }
            }, () => { });
    }

    private _getPlanQueueMetrics(): IPromise<DistributedTask.TaskOrchestrationPlanGroupsQueueMetrics[]> {
        return Context.viewContext.taskClient.getPlanGroupsQueueMetrics(Context.viewContext.tfsContext.contextData.project.id, "Build");
    }

    private _getLicensingCount(): IPromise<number> {
        if (!this._licenseInfo) {
            this._licenseInfo = Context.viewContext.collectionTaskAgentClient.getTaskHubLicenseDetails("Build");
        }
        return this._licenseInfo.then((licenseInfo: DistributedTask.TaskHubLicenseDetails) => {
            return Q.resolve(licenseInfo.totalLicenseCount);
        }, (error) => {
            //We do not intend to surface licensing call error
            return Q.resolve(0);
        });
    }

    private _planGroups: KnockoutObservableArray<DistributedTask.TaskOrchestrationQueuedPlanGroup> = ko.observableArray([]);
    private _maximumPlanGroupsSize: number = 50;
    private _licenseInfo: IPromise<DistributedTask.TaskHubLicenseDetails> = null;
    private _currentPlanGroup: DistributedTask.TaskOrchestrationQueuedPlanGroup = null;
    private _planGroupsSubscription: KnockoutSubscription<DistributedTask.TaskOrchestrationQueuedPlanGroup[]> = null;
    private _showPipelineQueueSubscription: KnockoutSubscription<boolean> = null;
}

Knockout_Adapters.TemplateControl.registerBinding(BuildConsoleControl.TemplateName, BuildConsoleControl, (context?: any): BuildConsoleViewModel => {
    return new BuildConsoleViewModel(context);
});

const _knownTags = ["command", "debug", "error", "warning"];

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("BuildDetails.ConsoleTab", exports);
