/// <reference types="jquery" />


import ko = require("knockout");

import { handleError } from "Build/Scripts/PlatformMessageHandlers";
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import BuildCommonResources = require("Build.Common/Scripts/Resources/TFS.Resources.Build.Common");
import Marked = require("Presentation/Scripts/marked");
import Controls = require("VSS/Controls");
import Menus = require("VSS/Controls/Menus");
import DistributedTask = require("TFS/DistributedTask/Contracts");
import DistributedTaskApi = require("TFS/DistributedTask/TaskAgentRestClient");
import DistributedTaskRealtime = require("Build/Scripts/TFS.DistributedTask.AgentPool.Realtime");
import Dialogs = require("VSS/Controls/Dialogs");
import Grids = require("VSS/Controls/Grids");
import Controls_PopupContent = require("VSS/Controls/PopupContent");
import KnockoutCommon = require("DistributedTasksCommon/TFS.Knockout.CustomHandlers");
import Navigation = require("VSS/Controls/Navigation");
import Service = require("VSS/Service");
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import { getService as getEventActionService, CommonActions } from "VSS/Events/Action";
import VSS_Events = require("VSS/Events/Services");
import Utils_Core = require("VSS/Utils/Core");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");

var delegate = Utils_Core.delegate;

KnockoutCommon.initKnockoutHandlers(true);

export class AdminMaintenanceTab extends Navigation.NavigationViewTab {
    // this tab uses knockout
    private _template: JQuery = null;
    private _viewModel: AdminMaintenanceViewModel;
    private _poolHub: DistributedTaskRealtime.TaskAgentPoolHub;

    public initialize() {
        super.initialize();
    }

    public dispose() {
        super.dispose();

        if (this._poolHub) {
            this._poolHub.stop();
        }

        if (this._viewModel) {
            this._viewModel.dispose();
        }
    }

    /**
     * Called whenever navigation occurs with this tab as the selected tab
     * @param rawState The raw/unprocessed hash/url state parameters (string key/value pairs)
     * @param parsedState Resolved state objects parsed by the view
     */
    public onNavigate(rawState: any, parsedState: any) {
        var title: string = "";
        var roleType = <number>parsedState.roleType;

        if (!this._template) {
            let tfsContext = TfsContext.getDefault();
            this._viewModel = new AdminMaintenanceViewModel(tfsContext);

            // BuildAdminAgentsTab.html
            this._template = TFS_Knockout.loadHtmlTemplate("buildvnext_admin_maintenance_tab").appendTo(this._element);

            ko.applyBindings(this._viewModel, this._template[0]);

            // Note: This should be called after loading ko template
            this._viewModel.initMaintenanceHistoryGrid(this._element);

            // Start the hub connection
            this._poolHub = new DistributedTaskRealtime.TaskAgentPoolHub(tfsContext);

            this._viewModel.poolId.subscribe((newValue: number) => {
                this._poolHub.subscribe(newValue);
            });
        }

        if (parsedState.pool) {
            this._viewModel.poolId(parsedState.poolId);
            title = Utils_String.format(BuildResources.PoolAgentsTitleFormat, parsedState.pool.name);
        }

        this._options.navigationView.setViewTitle(title);
    }
}

/**
 * Maintenance grid history
 */
export class MaintenanceGrid extends Grids.GridO<any> {
    private _columnMap: { [index: string]: Grids.IGridColumn };
    private _poolClient: DistributedTaskApi.TaskAgentHttpClient;

    constructor(options?: Grids.IGridOptions) {
        super(options);
    }

    initializeOptions(options?) {
        this._columnMap = {};

        // Keep a reference to columns
        var columns = this._getInitialColumns();
        $.each(columns, (i: number, c: Grids.IGridColumn) => {
            this._columnMap[c.index] = c;
        });

        super.initializeOptions($.extend({
            asyncInit: false,
            sharedMeasurements: false,
            allowMoveColumns: false,
            allowMultiSelect: false,
            gutter: {
                contextMenu: true
            },
            contextMenu: {
                items: delegate(this, this._getContextMenuItems),
                updateCommandStates: delegate(this, this._updateCommandStates)
            },
            columns: columns
        }, options));
    }

    initialize(): void {
        super.initialize();
    }

    _getInitialColumns(): Grids.IGridColumn[] {
        let columns = <Grids.IGridColumn[]>[
            {
                index: 0,
                width: 30,
                canSortBy: false,
                text: BuildResources.TaskAgentRequestIdColumn,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    var template = "<div class=\"grid-cell\" role=\"gridcell\" data-bind=\"text: jobId\"></div>";
                    return $(template).width(column.width);
                }
            },
            {
                index: 1,
                width: 30,
                canSortBy: false,
                getHeaderCellContents: (column: Grids.IGridColumn): JQuery => {
                    var cell = $("<span class=\"icon icon-tfs-build-status-header\" style=\"margin-top: 8px\" />");
                    cell.append($("<div/>").text(BuildResources.BuildStatusText).addClass("title hidden"));
                    return cell;
                },
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    var cell = $("<div class=\"grid-cell build-list-icon\" data-no-tooltip=\"true\" role=\"gridcell\" style=\"margin-top: 2px\"></div>");
                    cell.append($("<span data-bind=\"css: statusIconClass, attr: {'aria-label': statusIconText}\" />"));
                    return cell.width(column.width);
                }
            },
            {
                index: 2,
                width: 150,
                canSortBy: false,
                text: BuildResources.ErrorsAndWarningsText,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    var template = "<div class=\"grid-cell\" role=\"gridcell\" data-bind=\"text: errorAndWarningCountText\"></div>";
                    return $(template).width(column.width);
                }
            },
            {
                index: 3,
                width: 150,
                canSortBy: false,
                text: BuildResources.TaskAgentRequestDateQueuedColumn,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    var template = "<div class=\"grid-cell\" role=\"gridcell\" data-bind=\"text: queueTimeText\"></div>";
                    return $(template).width(column.width);
                }
            },
            {
                index: 4,
                width: 150,
                canSortBy: false,
                text: BuildResources.TaskAgentRequestDateStartedColumn,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    var template = "<div class=\"grid-cell\" role=\"gridcell\" data-bind=\"text: startTimeText\"></div>";
                    return $(template).width(column.width);
                }
            },
            {
                index: 5,
                width: 150,
                canSortBy: false,
                text: BuildResources.TaskAgentRequestDateCompletedColumn,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    var template = "<div class=\"grid-cell\" role=\"gridcell\" data-bind=\"text: finishTimeText\"></div>";
                    return $(template).width(column.width);
                }
            },
            {
                index: 6,
                width: 125,
                canSortBy: false,
                text: BuildResources.TargetAgentsText,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    var button = $("<button class=\"bowtie-icon bowtie-view-list agent-details-icon\" data-bind=\"click: showTargetAgentsDetailDialog, aria-label: showDetailLabel\"></button>");
                    Controls_PopupContent.RichContentTooltip.add(BuildResources.ShowDetails, button);
                    var template = $("<div class=\"grid-cell\" role=\"gridcell\"><span class=\"agent-details-text\"  data-bind=\"text: targetAgentCount\"></span></div>");
                    template.append(button);
                    return template.width(column.width);
                }
            },
            {
                index: 7,
                width: 100,
                canSortBy: false,
                text: BuildResources.TaskAgentRequestDurationColumn,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    var template = "<div class=\"grid-cell\" role=\"gridcell\" data-bind=\"text: durationText\"></div>";
                    return $(template).width(column.width);
                }
            },
            {
                index: 8,
                width: 125,
                canSortBy: false,
                text: BuildResources.LogsText,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    var template = "<div class=\"grid-cell\" role=\"gridcell\"><a data-bind=\"attr: { href: logDownloadLink, title: logDownloadText }, text: logDownloadText\"/></div>";
                    return $(template).width(column.width);
                }
            },
            {
                index: 9, // Inivisible cell for knockout binding
                width: 0, // This should be the last cell because templates for visible cells need to be set before this
                canSortBy: false,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    var row = rowInfo.row[0];
                    var grid = <Grids.Grid>this;
                    var maintenanceJob = <TaskAgentPoolMaintenanceJobViewModel>grid.getRowData(dataIndex);

                    // This is an invisible cell to apply knockout binding
                    ko.applyBindings(maintenanceJob, row);

                    maintenanceJob.element = rowInfo.row;

                    // Do not return any content
                    return null;
                }
            }
        ];
        return columns;
    }

    _getInitialSortOrder(): Grids.IGridSortOrder[] {
        return [];
    }

    _getContextMenuItems(args?: any): Menus.IMenuItemSpec[] {
        console.log("context menu starting");
        var result: Menus.IMenuItemSpec[] = [];
        var job = <TaskAgentPoolMaintenanceJobViewModel>args.item;

        // cancel
        result.push({
            rank: 10, id: "cancel-selected-build", text: BuildResources.CancelBuild, icon: "icon-tfs-build-status-stopped",
            action: () => {
                // "Cancel {buildNumber}?" or "Cancel the selected build?"
                var message = job.jobId() ? Utils_String.format(BuildResources.ConfirmCancelBuild, job.jobId()) : BuildResources.ConfirmCancelSelectedBuild;
                if (confirm(message)) {
                    let maintenanceJob = {
                        pool: {
                            id: job.poolId()
                        },
                        jobId: job.jobId(),
                        status: DistributedTask.TaskAgentPoolMaintenanceJobStatus.Cancelling
                    } as DistributedTask.TaskAgentPoolMaintenanceJob;

                    if (!this._poolClient) {
                        this._poolClient = Service.getApplicationClient(DistributedTaskApi.TaskAgentHttpClient, TfsContext.getDefault().contextData);
                    }

                    this._poolClient.updateAgentPoolMaintenanceJob(maintenanceJob, maintenanceJob.pool.id, maintenanceJob.jobId)
                        .then(null, handleError);
                }
            }
        });

        // download logs
        result.push({
            rank: 20, id: "download-logs", text: BuildResources.BuildDetailViewDownloadLogs, icon: "bowtie-icon bowtie-transfer-download",
            action: () => {
                getEventActionService().performAction(CommonActions.ACTION_WINDOW_NAVIGATE, {
                    url: job.logDownloadLink.peek()
                });
            }
        });

        return result;
    }

    _updateCommandStates(menu: Menus.PopupMenu) {
        let job: TaskAgentPoolMaintenanceJobViewModel = this.getRowData(this.getSelectedRowIndex());
        if (job) {
            let status = job.status();
            menu.updateCommandStates(<Menus.ICommand[]>[
                {
                    id: "cancel-selected-build",
                    hidden: status === DistributedTask.TaskAgentPoolMaintenanceJobStatus.Completed || status === DistributedTask.TaskAgentPoolMaintenanceJobStatus.Cancelling
                },
                {
                    id: "download-logs",
                    hidden: status !== DistributedTask.TaskAgentPoolMaintenanceJobStatus.Completed
                }
            ]);
        }
    }

    _updateSource(source: any[]): void {
        this.setDataSource(source, null, this.getColumns(), this.getSortOrder());
    }

    _onContextMenuClick(e?: any): any {

    }
}

class AdminMaintenanceViewModel {
    private _poolClient: DistributedTaskApi.TaskAgentHttpClient;
    private _eventManager: VSS_Events.EventService;
    private _maintenanceJobsGrid: MaintenanceGrid;
    private _maintenanceJobsGridClass: string = "maintenance-history-grid";
    private _maintenanceJobsGridColumns: Grids.IGridColumn[];
    private _eventsAttached: boolean;
    private _maintenanceJobUpdatedHandler: (sender, args) => void;

    public poolId: KnockoutObservable<number> = ko.observable(0);
    public maintenanceJobs: KnockoutObservableArray<TaskAgentPoolMaintenanceJobViewModel> = ko.observableArray(<TaskAgentPoolMaintenanceJobViewModel[]>[]);

    constructor(tfsContext: TfsContext) {
        this._eventManager = Service.getLocalService(VSS_Events.EventService);
        this._poolClient = Service.getApplicationClient(DistributedTaskApi.TaskAgentHttpClient, tfsContext.contextData);

        this._maintenanceJobUpdatedHandler = (sender, args) => {
            var maintenanceJob: DistributedTask.TaskAgentPoolMaintenanceJob = <DistributedTask.TaskAgentPoolMaintenanceJob>args;
            let jobs = this.maintenanceJobs();
            let existingJobs = jobs.filter((value, index, array) => {
                return value.jobId() === maintenanceJob.jobId;
            });

            if (existingJobs.length == 0) {
                jobs.push(new TaskAgentPoolMaintenanceJobViewModel(maintenanceJob));
            }
            else {
                existingJobs[0].update(maintenanceJob);
            }

            this.maintenanceJobs(jobs);
        };

        this._attachRealtimeEvents();

        // React to changes in poolId
        this.poolId.subscribe((currentPoolId: number) => {
            if (!!currentPoolId && currentPoolId > 0) {
                // get pool so we can show agents online if pool is hosted
                this._poolClient.getAgentPool(currentPoolId)
                    .then((pool: DistributedTask.TaskAgentPool) => {
                        this._loadMaintenanceJobs(pool);
                    }, (error) => {
                        if (error.status !== 404) {
                            handleError(error);
                        }

                        //empty jobs
                        this.maintenanceJobs([]);
                    });
            }
        });

        // React to the underlying request list changing for the selected agent
        this.maintenanceJobs.subscribe((newValue: TaskAgentPoolMaintenanceJobViewModel[]) => {
            if (newValue) {
                this._updateMaintenanceJobsGridSource(newValue);
            }
        });
    }

    public dispose() {
        this._detachRealtimeEvents();
    }

    public initMaintenanceHistoryGrid(element: JQuery) {
        var gridElement: JQuery = element.find("." + this._maintenanceJobsGridClass);
        this._maintenanceJobsGrid = <MaintenanceGrid>Controls.Enhancement.enhance(MaintenanceGrid, gridElement);
    }

    private _loadMaintenanceJobs(taskAgentPool: DistributedTask.TaskAgentPool) {
        if (taskAgentPool) {
            this._poolClient.getAgentPoolMaintenanceJobs(taskAgentPool.id)
                .then((jobs: DistributedTask.TaskAgentPoolMaintenanceJob[]) => {
                    // Sort
                    jobs.sort((a: DistributedTask.TaskAgentPoolMaintenanceJob, b: DistributedTask.TaskAgentPoolMaintenanceJob) => {
                        return Utils_Date.defaultComparer(a.queueTime, b.queueTime);
                    });

                    // Map to viewmodels
                    this.maintenanceJobs($.map(jobs, (job: DistributedTask.TaskAgentPoolMaintenanceJob, index: number) => {
                        return new TaskAgentPoolMaintenanceJobViewModel(job);
                    }));
                });
        } else {
            this.maintenanceJobs([]);
        }
    }

    private _attachRealtimeEvents() {
        if (!this._eventsAttached) {
            this._eventManager.attachEvent(DistributedTaskRealtime.PoolEvents.PoolMaintenanceQueued, this._maintenanceJobUpdatedHandler);
            this._eventManager.attachEvent(DistributedTaskRealtime.PoolEvents.PoolMaintenanceStarted, this._maintenanceJobUpdatedHandler);
            this._eventManager.attachEvent(DistributedTaskRealtime.PoolEvents.PoolMaintenanceCompleted, this._maintenanceJobUpdatedHandler);
            this._eventManager.attachEvent(DistributedTaskRealtime.PoolEvents.PoolMaintenanceDetailUpdated, this._maintenanceJobUpdatedHandler);
            this._eventsAttached = true;
        }
    }

    private _detachRealtimeEvents() {
        if (this._eventsAttached) {
            this._eventManager.detachEvent(DistributedTaskRealtime.PoolEvents.PoolMaintenanceQueued, this._maintenanceJobUpdatedHandler);
            this._eventManager.detachEvent(DistributedTaskRealtime.PoolEvents.PoolMaintenanceStarted, this._maintenanceJobUpdatedHandler);
            this._eventManager.detachEvent(DistributedTaskRealtime.PoolEvents.PoolMaintenanceCompleted, this._maintenanceJobUpdatedHandler);
            this._eventManager.detachEvent(DistributedTaskRealtime.PoolEvents.PoolMaintenanceDetailUpdated, this._maintenanceJobUpdatedHandler);
            this._eventsAttached = false;
        }
    }

    private _updateMaintenanceJobsGridSource(jobs: TaskAgentPoolMaintenanceJobViewModel[]): void {
        var queuedJobs: TaskAgentPoolMaintenanceJobViewModel[] = [];
        var inProgressedJobs: TaskAgentPoolMaintenanceJobViewModel[] = [];
        var completedJobs: TaskAgentPoolMaintenanceJobViewModel[] = [];

        jobs.forEach((value, index, array) => {
            switch (value.status()) {
                case DistributedTask.TaskAgentPoolMaintenanceJobStatus.InProgress:
                    inProgressedJobs.push(value);
                    break;
                case DistributedTask.TaskAgentPoolMaintenanceJobStatus.Queued:
                    queuedJobs.push(value);
                    break;
                case DistributedTask.TaskAgentPoolMaintenanceJobStatus.Completed:
                    completedJobs.push(value);
                    break;
            }
        });

        var sortedRequests = inProgressedJobs.sort((a, b) => {
            return Utils_Date.defaultComparer(a.startTime(), b.startTime());
        }).concat(queuedJobs.sort((a, b) => {
            return Utils_Date.defaultComparer(a.queueTime(), b.queueTime());
        })).concat(completedJobs.sort((a, b) => {
            // For finished request, show them in desc order
            return Utils_Date.defaultComparer(b.finishTime(), a.finishTime());
        }).slice(0, 25));

        this._maintenanceJobsGrid._rowHeight = 30;
        this._maintenanceJobsGrid._updateSource(sortedRequests);
    }
}

interface ITaskAgentResultData {
    className: string;
    text: string;
}

/**
 * ViewModel for pool maintenance jobs
 */
export class TaskAgentPoolMaintenanceJobViewModel {
    public poolId: KnockoutObservable<number> = ko.observable(0);

    public jobId: KnockoutObservable<number> = ko.observable(0);

    public queueTime: KnockoutObservable<Date> = ko.observable(null);

    public queueTimeText: KnockoutComputed<string>;

    public startTime: KnockoutObservable<Date> = ko.observable(null);

    public startTimeText: KnockoutComputed<string>;

    public finishTime: KnockoutObservable<Date> = ko.observable(null);

    public finishTimeText: KnockoutComputed<string>;

    public targetAgentCount: KnockoutObservable<string> = ko.observable("");

    public durationText: KnockoutComputed<string>;

    public result: KnockoutObservable<DistributedTask.TaskAgentPoolMaintenanceJobResult> = ko.observable(null);

    public status: KnockoutObservable<DistributedTask.TaskAgentPoolMaintenanceJobStatus> = ko.observable(null);

    public statusIconClass: KnockoutObservable<string> = ko.observable("");

    public statusIconText: KnockoutObservable<string> = ko.observable("");

    public errorAndWarningCountText: KnockoutObservable<string> = ko.observable("");

    public logDownloadText: KnockoutObservable<string> = ko.observable("");

    public logDownloadLink: KnockoutObservable<string> = ko.observable("");

    public maintenanceJob: DistributedTask.TaskAgentPoolMaintenanceJob;

    public showDetailLabel: string = BuildResources.ShowDetails;

    public element: JQuery;

    private _detailDialogModel: TaskAgentPoolMaintenanceJobTargetAgentDialogModel;

    constructor(maintenanceJob: DistributedTask.TaskAgentPoolMaintenanceJob) {
        this.maintenanceJob = maintenanceJob;
        this.queueTimeText = ko.computed(() => {
            var queueTime = this.queueTime();
            return queueTime != null ? Utils_Date.localeFormat(this.queueTime(), "G") : null;
        });

        this.startTimeText = ko.computed(() => {
            var startTime = this.startTime();
            return startTime != null ? Utils_Date.localeFormat(this.startTime(), "G") : null;
        });

        this.finishTimeText = ko.computed(() => {
            var finishTime = this.finishTime();
            return finishTime != null ? Utils_Date.localeFormat(this.finishTime(), "G") : null;
        });

        this.durationText = ko.computed(() => {
            return this._getDurationString(this.startTime(), this.finishTime());
        });

        this.update(maintenanceJob);
    }

    public update(maintenanceJob: DistributedTask.TaskAgentPoolMaintenanceJob): void {
        if (this.maintenanceJob.jobId !== maintenanceJob.jobId) {
            return;
        }

        this.maintenanceJob = maintenanceJob;
        this.poolId(maintenanceJob.pool.id);
        this.jobId(maintenanceJob.jobId);
        this.queueTime(maintenanceJob.queueTime);
        this.startTime(maintenanceJob.startTime);
        this.finishTime(maintenanceJob.finishTime);

        this.result(maintenanceJob.result);
        this.status(maintenanceJob.status);
        let resultData = this._getTaskAgentResultData(this.status(), this.result());
        this.statusIconClass("icon icon-tfs-build-status-" + resultData.className.toLowerCase());
        this.statusIconText(resultData.text);
        this.errorAndWarningCountText(this._getErrorWarningCount(maintenanceJob.errorCount, maintenanceJob.warningCount));

        if (maintenanceJob.status === DistributedTask.TaskAgentPoolMaintenanceJobStatus.Completed) {
            this.logDownloadText(BuildResources.DownloadLogs);
            this.logDownloadLink(maintenanceJob.logsDownloadUrl);
        }

        const agents = maintenanceJob.targetAgents || [];
        this.targetAgentCount(Utils_String.format(BuildResources.TargetAgentCount, agents.length));

        if (this._detailDialogModel) {
            maintenanceJob.targetAgents.forEach((value) => {
                let agentViewModel = this._detailDialogModel.targetAgentsMap[value.agent.id];
                if (agentViewModel) {
                    agentViewModel.update(value);
                }
            });
        }
    }

    public showTargetAgentsDetailDialog = () => {
        if (!this._detailDialogModel) {
            this._detailDialogModel = new TaskAgentPoolMaintenanceJobTargetAgentDialogModel(this.maintenanceJob);
        }

        Dialogs.show(TargetAgentsDialog, this._detailDialogModel);
    }

    private _getErrorWarningCount(errors: number, warnings: number) {
        return Utils_String.format(BuildResources.ErrorWarningCount, errors, warnings);
    }

    private _getDurationString(startDate: Date, endDate: Date): string {
        if (!startDate || !endDate) {
            return null;
        }

        let msecPerSecond = 1000;
        let msecPerMinute = 60000;
        let msecPerHour = 3600000;

        let msecs: number = endDate.valueOf() - startDate.valueOf();

        let seconds = Math.floor(msecs / msecPerSecond) % 60;
        let minutes = Math.floor(msecs / msecPerMinute) % 60;
        let hours = Math.floor(msecs / msecPerHour);

        let hoursValue = hours < 10 ? "0" + hours : hours;
        let minutesValue = minutes < 10 ? "0" + minutes : minutes;
        let secondsValue = seconds < 10 ? "0" + seconds : seconds;
        return Utils_String.format("{0}:{1}:{2}", hoursValue, minutesValue, secondsValue);
    }

    private _getTaskAgentResultData(status: DistributedTask.TaskAgentPoolMaintenanceJobStatus, result: DistributedTask.TaskAgentPoolMaintenanceJobResult): ITaskAgentResultData {
        if (status === DistributedTask.TaskAgentPoolMaintenanceJobStatus.Completed) {
            switch (result) {
                case DistributedTask.TaskAgentPoolMaintenanceJobResult.Succeeded:
                    return {
                        className: "succeeded",
                        text: BuildCommonResources.BuildResultSucceeded
                    };

                case DistributedTask.TaskAgentPoolMaintenanceJobResult.Canceled:
                    return {
                        className: "canceled",
                        text: BuildCommonResources.BuildResultCanceled
                    };

                case DistributedTask.TaskAgentPoolMaintenanceJobResult.Failed:
                    return {
                        className: "failed",
                        text: BuildCommonResources.BuildResultFailed
                    };
            }
        }
        else if (status === DistributedTask.TaskAgentPoolMaintenanceJobStatus.InProgress) {
            return {
                className: "inprogress",
                text: BuildCommonResources.BuildStatusInProgress
            };
        }
        else {
            return {
                className: "queued",
                text: BuildResources.QueuedLabel
            };
        }
    }
}

export class TaskAgentPoolMaintenanceJobTargetAgentDialogModel {
    public dialogTemplate: string = "maintenancejob_target_agents_dialog";
    public targetAgents: KnockoutObservableArray<TaskAgentPoolMaintenanceJobTargetAgentViewModel> = ko.observableArray(<TaskAgentPoolMaintenanceJobTargetAgentViewModel[]>[]);
    public targetAgentsMap: IDictionaryNumberTo<TaskAgentPoolMaintenanceJobTargetAgentViewModel> = {};
    public showStatus: KnockoutObservable<boolean> = ko.observable(true);

    constructor(maintenanceJob: DistributedTask.TaskAgentPoolMaintenanceJob) {
        const sortedAgents = maintenanceJob.targetAgents.sort((a, b) => {
            return Utils_String.ignoreCaseComparer(a.agent.name, b.agent.name);
        });

        this.targetAgents($.map(sortedAgents, (targetAgent: DistributedTask.TaskAgentPoolMaintenanceJobTargetAgent, index: number) => {
            if (this.showStatus() && !targetAgent.status) {
                this.showStatus(false);
            }

            this.targetAgentsMap[targetAgent.agent.id] = new TaskAgentPoolMaintenanceJobTargetAgentViewModel(targetAgent);
            return this.targetAgentsMap[targetAgent.agent.id];
        }));
    }
}

/**
 * ViewModel for pool maintenance job target agent
*/
export class TaskAgentPoolMaintenanceJobTargetAgentViewModel {
    public agentId: KnockoutObservable<number> = ko.observable(null);
    public agentName: KnockoutObservable<string> = ko.observable(null);
    public statusIconClass: KnockoutObservable<string> = ko.observable(null);
    public statusIconText: KnockoutObservable<string> = ko.observable(null);
    public showStatus: KnockoutObservable<boolean> = ko.observable(false);
    public showHelpMarkdown: KnockoutObservable<boolean> = ko.observable(false);
    public queuedMaintenanceJobHelpMarkDown: string = Marked(BuildResources.QueuedMaintenanceJobTargetAgentHelpMarkDown);

    constructor(targetAgent: DistributedTask.TaskAgentPoolMaintenanceJobTargetAgent) {
        this.agentId(targetAgent.agent.id)
        this.agentName(targetAgent.agent.name);
        this.update(targetAgent);
    }

    public update(targetAgent: DistributedTask.TaskAgentPoolMaintenanceJobTargetAgent): void {
        if (targetAgent && targetAgent.agent.id === this.agentId()) {
            if (targetAgent.status == null) {
                this.showStatus(false);
                this.showHelpMarkdown(false);
            }
            else {
                this.showStatus(true);

                let resultData = this._getTargetAgentResultData(targetAgent.status, targetAgent.result);

                if (resultData.className.toLowerCase() === "queued") {
                    this.showHelpMarkdown(true);
                }
                else {
                    this.showHelpMarkdown(false);
                }

                this.statusIconClass("icon icon-tfs-build-status-" + resultData.className.toLowerCase());
                this.statusIconText(resultData.text);
            }
        }
    }

    private _getTargetAgentResultData(status: DistributedTask.TaskAgentPoolMaintenanceJobStatus, result: DistributedTask.TaskAgentPoolMaintenanceJobResult): ITaskAgentResultData {
        if (status === DistributedTask.TaskAgentPoolMaintenanceJobStatus.Completed) {
            switch (result) {
                case DistributedTask.TaskAgentPoolMaintenanceJobResult.Succeeded:
                    return {
                        className: "succeeded",
                        text: BuildCommonResources.BuildResultSucceeded
                    };

                case DistributedTask.TaskAgentPoolMaintenanceJobResult.Canceled:
                    return {
                        className: "canceled",
                        text: BuildCommonResources.BuildResultCanceled
                    };

                case DistributedTask.TaskAgentPoolMaintenanceJobResult.Failed:
                    return {
                        className: "failed",
                        text: BuildCommonResources.BuildResultFailed
                    };
            }
        }
        else if (status === DistributedTask.TaskAgentPoolMaintenanceJobStatus.InProgress) {
            return {
                className: "inprogress",
                text: BuildCommonResources.BuildStatusInProgress
            };
        }
        else {
            return {
                className: "queued",
                text: BuildResources.QueuedLabel
            };
        }
    }
}

export class TargetAgentsDialog extends Dialogs.ModalDialog {
    private _model: TaskAgentPoolMaintenanceJobTargetAgentDialogModel;

    private _$template: JQuery;

    constructor(model: TaskAgentPoolMaintenanceJobTargetAgentDialogModel) {
        super(model);

        let options = {
            minHeight: 500,
            buttons: {
                "close": {
                    id: "close",
                    text: VSS_Resources_Platform.CloseButtonLabelText,
                    click: this._close,
                }
            }
        } as Dialogs.IModalDialogOptions;

        super.initializeOptions({ ...model, ...options } as any);

        this._model = model;
    }

    public initialize(): void {
        super.initialize();

        this._$template = TFS_Knockout.loadHtmlTemplate(this._model.dialogTemplate);

        this._element.append(this._$template);

        ko.applyBindings(this._model, this._$template[0]);
    }


    public getTitle(): string {
        return BuildResources.TargetAgentDetail;
    }

    private _close = () => {
        this.close();
        this.dispose();
    }

    public dispose() {
        super.dispose();
    }
}