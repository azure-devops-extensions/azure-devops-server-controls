/// <reference types="jquery" />

import ko = require("knockout");
import Q = require("q");

import KnockoutExtensions = require("Build/Scripts/KnockoutExtensions");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import DistributedTaskRealtime = require("Build/Scripts/TFS.DistributedTask.AgentPool.Realtime");
import { handleError } from "Build/Scripts/PlatformMessageHandlers";

import BuildCommonResources = require("Build.Common/Scripts/Resources/TFS.Resources.Build.Common");

import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");

import Marked = require("Presentation/Scripts/marked");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");

import DistributedTask = require("TFS/DistributedTask/Contracts");
import DistributedTaskApi = require("TFS/DistributedTask/TaskAgentRestClient");

import Controls = require("VSS/Controls");
import Grids = require("VSS/Controls/Grids");
import Navigation = require("VSS/Controls/Navigation");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import Service = require("VSS/Service");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Date = require("VSS/Utils/Date");
import Utils_Number = require("VSS/Utils/Number");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import VSS_Events = require("VSS/Events/Services");

const TfsContext = TFS_Host_TfsContext.TfsContext;
KnockoutExtensions.KnockoutCustomHandlers.initializeKnockoutHandlers();

class Actions {
    public static Requests = "requests";
    public static Capabilities = "capabilities";
}

export class BuildAdminAgentsTab extends Navigation.NavigationViewTab {
    // this tab uses knockout
    private _template: JQuery = null;
    private _viewModel: AdminAgentsViewModel;
    private _selectedAgentId: number;
    private _poolHub: DistributedTaskRealtime.TaskAgentPoolHub;
    private _pivotView: Navigation.PivotView;

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
            var tfsContext = TfsContext.getDefault();
            this._viewModel = new AdminAgentsViewModel(tfsContext);

            // BuildAdminAgentsTab.html
            this._template = TFS_Knockout.loadHtmlTemplate("buildvnext_admin_agents_tab").appendTo(this._element);

            ko.applyBindings(this._viewModel, this._template[0]);

            let pivotHolder = this._element.find(".admin-agents-pivot-holder");
            let pivotItems: Navigation.IPivotViewItem[] = [
                {
                    id: Actions.Requests,
                    text: BuildResources.RequestsText
                },
                {
                    id: Actions.Capabilities,
                    text: BuildResources.CapabilitiesText
                }
            ];

            // create pivot tabs
            this._pivotView = <Navigation.PivotView>Controls.BaseControl.create(Navigation.PivotView, pivotHolder, {
                items: pivotItems,
                cssClass: "enhance buildvnext-admin-agents-tabs"
            });

            this._pivotView._bind("changed", this._onPivotChanged);

            // Note: This should be called after loading ko template
            this._viewModel.initAgentsGrid(this._element);
            this._viewModel.initRequestsGrid(this._element);

            // Start the hub connection
            this._poolHub = new DistributedTaskRealtime.TaskAgentPoolHub(tfsContext);

            this._viewModel.poolId.subscribe((newValue: number) => {
                this._poolHub.subscribe(newValue);
            });
        }

        // If the view constructed us with an intial agent id then respect it on load
        if (parsedState.agentId) {
            this._viewModel.selectedAgentId(Utils_Number.parseInvariant(parsedState.agentId));
        }

        if (parsedState.pool || (parsedState.queue && parsedState.queue.pool)) {
            this._viewModel.poolId((parsedState.pool || parsedState.queue.pool).id);
            title = Utils_String.format(BuildResources.PoolAgentsTitleFormat, (parsedState.pool || parsedState.queue.pool).name);
        }

        this._options.navigationView.setViewTitle(title);
    }

    private _onPivotChanged = (event, item: Navigation.IPivotViewItem) => {
        switch (item.id) {
            case Actions.Requests:
                this._viewModel.showRequests();
                break;
            case Actions.Capabilities:
                this._viewModel.showCapabilities();
                break;
        }
    }
}

class AdminAgentsViewModel {
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _pool: DistributedTask.TaskAgentPool;
    private _poolClient: DistributedTaskApi.TaskAgentHttpClient;
    private _eventManager: VSS_Events.EventService;

    public pool: KnockoutObservable<DistributedTask.TaskAgentPool> = ko.observable(null);

    public poolId: KnockoutObservable<number> = ko.observable(0);

    public requestsLoaded: KnockoutComputed<boolean>;

    public requestsSelected: KnockoutObservable<boolean> = ko.observable(true);

    public capabilitiesLoaded: KnockoutComputed<boolean>;

    public capabilitiesSelected: KnockoutObservable<boolean> = ko.observable(false);

    public systemCapabilitiesVisible: KnockoutComputed<boolean>;

    public completedRequests: KnockoutComputed<TaskAgentRequestViewModel[]>;

    // Agents
    public agents: KnockoutObservableArray<TaskAgentViewModel> = ko.observableArray([]);

    // Agents web access grid
    private _agentsGrid: Grids.Grid;
    private _agentsGridCss: string = "agents-grid";
    private _agentsGridColumns: Grids.IGridColumn[];
    private _agentsMap: IDictionaryNumberTo<TaskAgentViewModel> = {};
    private _agentSubscriptions: KnockoutSubscription<boolean>[] = [];

    private _requestsGrid: Grids.Grid;
    private _requestsGridCss: string = "agent-requests-grid";
    private _requestsGridColumns: Grids.IGridColumn[];
    private _animationCount: number = 0;

    private _eventsAttached: boolean;
    private _agentAddedHandler: (sender, args) => void;
    private _agentUpdatedHandler: (sender, args) => void;
    private _agentConnectedHandler: (sender, args) => void;
    private _agentDisconnectedHandler: (sender, args) => void;
    private _agentDeletedHandler: (sender, args) => void;
    private _agentRequestQueuedHandler: (sender, args) => void;
    private _agentRequestAssignedHandler: (sender, args) => void;
    private _agentRequestStartedHandler: (sender, args) => void;
    private _agentRequestCompletedHandler: (sender, args) => void;

    // Currently selected agent 
    public selectedAgentId: KnockoutObservable<number> = ko.observable(null);
    public selectedAgent: KnockoutObservable<TaskAgentViewModel> = ko.observable(null);

    // To toggle "save"/"undo" buttons
    public userCapabilitiesDirty: KnockoutComputed<any>;
    public userCapabilitiesInvalid: KnockoutComputed<any>;

    constructor(tfsContext: TFS_Host_TfsContext.TfsContext) {
        this._tfsContext = tfsContext;
        this._eventManager = Service.getLocalService(VSS_Events.EventService);
        this._poolClient = Service.getApplicationClient(DistributedTaskApi.TaskAgentHttpClient, tfsContext.contextData);

        this._agentAddedHandler = (sender, args) => {
            var agent: DistributedTask.TaskAgent = <DistributedTask.TaskAgent>args;

            if (!this._agentsMap[agent.id]) {
                this.agents.push(new TaskAgentViewModel(this._tfsContext, this._pool, agent));
            }
        };

        this._agentUpdatedHandler = (sender, args) => {
            var agent: DistributedTask.TaskAgent = <DistributedTask.TaskAgent>args;
            var agentVM: TaskAgentViewModel = this._agentsMap[agent.id];

            if (agentVM) {
                // The update event doesn't return the user capabilities
                this._refillUserCapabilities(agent, agentVM.userCapabilities.peek());
                // The update event doesn't return the system capabilities
                this._refillSystemCapabilities(agent, agentVM.systemCapabilities.peek());
                agentVM.update(agent);
            }
        };

        this._agentConnectedHandler = (sender, args) => {
            var agentId: number = <number>args;
            var agent: TaskAgentViewModel = this._agentsMap[agentId];

            if (agent) {
                agent.status(DistributedTask.TaskAgentStatus.Online);
            }
        };

        this._agentDisconnectedHandler = (sender, args) => {
            var agentId: number = <number>args;
            var agent: TaskAgentViewModel = this._agentsMap[agentId];

            if (agent) {
                agent.status(DistributedTask.TaskAgentStatus.Offline);
            }
        };

        this._agentDeletedHandler = (sender, args) => {
            var agentId: number = <number>args;
            var agent: TaskAgentViewModel = this._agentsMap[agentId];

            if (agent) {
                this.agents.remove(agent);
            }
        };

        this._agentRequestQueuedHandler = (sender, args) => {
            var request: DistributedTask.TaskAgentJobRequest = <DistributedTask.TaskAgentJobRequest>args;
            if (request.matchedAgents) {
                request.matchedAgents.forEach((value, index, array) => {
                    var agent: TaskAgentViewModel = this._agentsMap[value.id];
                    if (agent) {
                        agent.requests.push(new TaskAgentRequestViewModel(request));
                    }
                });
            }
        };

        this._agentRequestAssignedHandler = (sender, args) => {
            var request: DistributedTask.TaskAgentJobRequest = <DistributedTask.TaskAgentJobRequest>args;
            var reservedAgent: TaskAgentViewModel = this._agentsMap[request.reservedAgent.id];

            if (reservedAgent) {
                reservedAgent.requestAssigned(request);

                this.agents().forEach((value, index, array) => {
                    if (value.id() === reservedAgent.id()) {
                        return;
                    }

                    var animating = value.requestUnassigned(request, () => {
                        this._animationCount--;
                    });

                    if (animating) {
                        this._animationCount++;
                    }
                });
            }
        };

        this._agentRequestStartedHandler = (sender, args) => {
            var request: DistributedTask.TaskAgentJobRequest = <DistributedTask.TaskAgentJobRequest>args;
            var reservedAgent: TaskAgentViewModel = this._agentsMap[request.reservedAgent.id];

            if (reservedAgent) {
                reservedAgent.requestStarted(request);
            }
        };

        this._agentRequestCompletedHandler = (sender, args) => {
            var request: DistributedTask.TaskAgentJobRequest = <DistributedTask.TaskAgentJobRequest>args;
            var reservedAgent: TaskAgentViewModel = this._agentsMap[request.reservedAgent.id];

            if (reservedAgent) {
                reservedAgent.requestCompleted(request);
            }
        };

        this._attachRealtimeEvents();

        // React to changes in poolId
        this.poolId.subscribe((currentPoolId: number) => {
            if (!!currentPoolId && currentPoolId > 0) {
                // get pool so we can show agents online if pool is hosted
                this._poolClient.getAgentPool(currentPoolId)
                    .then((pool: DistributedTask.TaskAgentPool) => {
                        if (!!pool && pool.id > 0) {
                            this.pool(pool);
                            this._pool = pool;
                            this._loadAgents(pool);
                        }
                        else {
                            this.pool(null);
                            this._pool = null;
                            this.agents([]);
                            this.selectedAgent(null);
                        }
                    }, (error) => {
                        if (error.status !== 404) {
                            handleError(error);
                        }

                        //empty agents
                        this.agents([]);
                        this.selectedAgent(null);
                    });
            }
        });

        this.userCapabilitiesDirty = ko.computed({
            read: () => {
                return this.selectedAgent() && this.selectedAgent()._isDirty();
            },
            write: (newValue: boolean) => {
                return newValue;
            }
        });

        this.userCapabilitiesInvalid = ko.computed(() => {
            return this.selectedAgent() && this.selectedAgent()._isInvalid();
        });

        this.capabilitiesLoaded = ko.computed(() => {
            return this.selectedAgent() && this.selectedAgent().capabilitiesLoaded();
        });

        this.systemCapabilitiesVisible = ko.computed(() => {
            // Hosted Agent system capabilities are located on the Details tab. Hide the table here.
            return this.pool() && !this.pool().isHosted;
        });

        this.requestsLoaded = ko.computed(() => {
            return this.selectedAgent() && this.selectedAgent().requestsLoaded();
        });

        this.completedRequests = ko.computed(() => {
            var selectedAgent = this.selectedAgent();
            if (selectedAgent) {
                return selectedAgent.requests();
            }
            else {
                return <TaskAgentRequestViewModel[]>[];
            }
        });

        // Deactive the previous agent 
        this.selectedAgent.subscribe((oldAgent: TaskAgentViewModel) => {
            if (oldAgent) {
                oldAgent.deactivate();
            }
        }, this, "beforeChange");

        this.selectedAgent.subscribe((newAgent: TaskAgentViewModel) => {
            if (newAgent) {
                this.userCapabilitiesDirty(false);
                this.selectedAgentId(newAgent.id());

                if (this.capabilitiesSelected()) {
                    newAgent.showCapabilities();
                }
                else {
                    newAgent.showRequests();
                }
            }
        });

        this.agents.subscribe((newValue: TaskAgentViewModel[]) => {
            if (newValue) {
                this._agentsMap = {};
                newValue.forEach((agent, index, array) => {
                    this._agentsMap[agent.id()] = agent;
                });

                this._updateAgentsGridSource(newValue);
            }
        });

        // React to the underlying request list changing for the selected agent
        this.completedRequests.subscribe((newValue: TaskAgentRequestViewModel[]) => {
            if (newValue) {
                this._updateRequestsGridSource(newValue);
            }
        });
    }

    public dispose() {
        this._clearSubscriptions();
        this._detachRealtimeEvents();
    }

    public saveButtonEnabled(): boolean {
        return this.userCapabilitiesDirty() && !this.userCapabilitiesInvalid();
    }

    public showRequests(): void {
        this.requestsSelected(true);
        this.capabilitiesSelected(false);

        var selectedAgent = this.selectedAgent();
        if (!!selectedAgent) {
            selectedAgent.showRequests();
        }
    }

    public showCapabilities(): void {
        this.requestsSelected(false);
        this.capabilitiesSelected(true);

        var selectedAgent = this.selectedAgent();
        if (!!selectedAgent) {
            selectedAgent.showCapabilities();
        }
    }

    // Called by Admin.View by sending the enhanced element for the whole view
    public initAgentsGrid(element: JQuery) {

        var gridElement: JQuery = element.find("." + this._agentsGridCss);
        this._agentsGrid = <Grids.Grid>Controls.Enhancement.enhance(Grids.Grid, gridElement, this._getGridOptions());

        gridElement.on(Grids.GridO.EVENT_SELECTED_INDEX_CHANGED, (evt: JQueryEventObject, rowIndex?: number, dataIndex?: number) => {
            var task = <TaskAgentViewModel>this._agentsGrid.getRowData(dataIndex);

            // Do nothing if selected tasks are the same
            var selectedAgent = this.selectedAgent();
            if (task && selectedAgent && task.id() === selectedAgent.id()) {
                return;
            }

            this.selectedAgent(task);
        });

        gridElement.on("click", ".red-delete-icon-hover", (evt: JQueryEventObject) => {
            // Find the row and task to delete
            var row = $(evt.target).closest("div.grid-row")[0],
                task = <TaskAgentViewModel>ko.dataFor(row);
            // Remove the task with confirmation
            if (window.confirm(BuildResources.ConfirmDeleteAgent)) {
                var taskagentpoolid: number = this.poolId();
                var idtodelete: number = task.id();
                $.each(this.agents(), (index: number, item: TaskAgentViewModel) => {
                    if (item.id() === idtodelete) {
                        this._poolClient.deleteAgent(taskagentpoolid, idtodelete)
                            .then(() => {
                                // If the item was selected, unselect it
                                if (this.selectedAgent() === item) {
                                    this.selectedAgent(null);
                                }

                                // Remove the item from the grid
                                this.agents.remove(item);
                            }, handleError);
                        return false;
                    }
                });
            }
            return false;
        });
    }

    public initRequestsGrid(element: JQuery) {
        var gridElement: JQuery = element.find("." + this._requestsGridCss);
        this._requestsGrid = <Grids.Grid>Controls.Enhancement.enhance(Grids.Grid, gridElement, this._getGridOptions());
    }

    private _attachRealtimeEvents() {
        if (!this._eventsAttached) {
            this._eventManager.attachEvent(DistributedTaskRealtime.PoolEvents.AgentAdded, this._agentAddedHandler);
            this._eventManager.attachEvent(DistributedTaskRealtime.PoolEvents.AgentUpdated, this._agentUpdatedHandler);
            this._eventManager.attachEvent(DistributedTaskRealtime.PoolEvents.AgentConnected, this._agentConnectedHandler);
            this._eventManager.attachEvent(DistributedTaskRealtime.PoolEvents.AgentDisconnected, this._agentDisconnectedHandler);
            this._eventManager.attachEvent(DistributedTaskRealtime.PoolEvents.AgentDeleted, this._agentDeletedHandler);
            this._eventManager.attachEvent(DistributedTaskRealtime.PoolEvents.AgentRequestQueued, this._agentRequestQueuedHandler);
            this._eventManager.attachEvent(DistributedTaskRealtime.PoolEvents.AgentRequestAssigned, this._agentRequestAssignedHandler);
            this._eventManager.attachEvent(DistributedTaskRealtime.PoolEvents.AgentRequestStarted, this._agentRequestStartedHandler);
            this._eventManager.attachEvent(DistributedTaskRealtime.PoolEvents.AgentRequestCompleted, this._agentRequestCompletedHandler);
            this._eventsAttached = true;
        }
    }

    private _detachRealtimeEvents() {
        if (this._eventsAttached) {
            this._eventManager.detachEvent(DistributedTaskRealtime.PoolEvents.AgentAdded, this._agentAddedHandler);
            this._eventManager.detachEvent(DistributedTaskRealtime.PoolEvents.AgentUpdated, this._agentUpdatedHandler);
            this._eventManager.detachEvent(DistributedTaskRealtime.PoolEvents.AgentConnected, this._agentConnectedHandler);
            this._eventManager.detachEvent(DistributedTaskRealtime.PoolEvents.AgentDisconnected, this._agentDisconnectedHandler);
            this._eventManager.detachEvent(DistributedTaskRealtime.PoolEvents.AgentDeleted, this._agentDeletedHandler);
            this._eventManager.detachEvent(DistributedTaskRealtime.PoolEvents.AgentRequestQueued, this._agentRequestQueuedHandler);
            this._eventManager.detachEvent(DistributedTaskRealtime.PoolEvents.AgentRequestAssigned, this._agentRequestAssignedHandler);
            this._eventManager.detachEvent(DistributedTaskRealtime.PoolEvents.AgentRequestStarted, this._agentRequestStartedHandler);
            this._eventManager.detachEvent(DistributedTaskRealtime.PoolEvents.AgentRequestCompleted, this._agentRequestCompletedHandler);
            this._eventsAttached = false;
        }
    }

    private _clearSubscriptions() {
        if (this._agentSubscriptions && this._agentSubscriptions.length > 0) {
            this._agentSubscriptions.forEach((value, index, array) => {
                value.dispose();
            });

            this._agentSubscriptions = [];
        }
    }

    private _updateAgentsGridSource(agents: TaskAgentViewModel[]) {

        // Clear the existing subcriptions is we have already invoked this method previously
        this._clearSubscriptions();

        var sortedAgents = <TaskAgentViewModel[]>agents.sort((a, b) => {
            return Utils_String.defaultComparer(a.name(), b.name());
        });

        this._agentsGrid._rowHeight = 30;
        this._agentsGrid.setDataSource(sortedAgents, null, this._getAgentsGridColumns());

        // Grid selection
        if (sortedAgents.length > 0) {
            // Initially select first agent
            var selectedDataIndex: number = -1;
            var selectedAgent: TaskAgentViewModel = this.selectedAgent();

            if (selectedAgent) {
                selectedDataIndex = sortedAgents.indexOf(selectedAgent);
            }

            if (selectedAgent && selectedDataIndex >= 0) {
                this._agentsGrid.setSelectedDataIndex(selectedDataIndex);
                this.selectedAgent(selectedAgent);
            }
            else {
                var selectedIndex: number = 0;
                var selectedAgentId: number = this.selectedAgentId();
                if (selectedAgentId) {
                    var agentIndex = Utils_Array.findIndex(sortedAgents, (agent) => {
                        return agent.id() === selectedAgentId;
                    });

                    selectedIndex = agentIndex >= 0 ? agentIndex : 0;
                }

                // Store the selected agent for rednering below
                selectedAgent = sortedAgents[selectedIndex];

                this.selectedAgent(selectedAgent);
                this._agentsGrid.setSelectedDataIndex(selectedIndex);
            }

            // If we are currently looking at capabilities then we need to ensure they are up to date
            if (this.capabilitiesSelected()) {
                selectedAgent.showCapabilities();
            }
            else {
                selectedAgent.showRequests();
            }
        }
        else {
            this.selectedAgent(null);
        }
    }

    private _updateRequestsGridSource(requests: TaskAgentRequestViewModel[]): void {
        var queuedRequests: TaskAgentRequestViewModel[] = [];
        var assignedRequests: TaskAgentRequestViewModel[] = [];
        var completedRequests: TaskAgentRequestViewModel[] = [];

        if (this._animationCount > 0) {
            return;
        }

        requests.forEach((value, index, array) => {
            switch (value.getState()) {
                case TaskAgentRequestState.InProgress:
                    assignedRequests.push(value);
                    break;
                case TaskAgentRequestState.Queued:
                    queuedRequests.push(value);
                    break;
                case TaskAgentRequestState.Completed:
                    completedRequests.push(value);
                    break;
            }
        });

        var sortedRequests = assignedRequests.sort((a, b) => {
            return Utils_Date.defaultComparer(a.assignTime(), b.assignTime());
        }).concat(queuedRequests.sort((a, b) => {
            return Utils_Date.defaultComparer(a.queueTime(), b.queueTime());
        })).concat(completedRequests.sort((a, b) => {
            // For finished request, show them in desc order
            return Utils_Date.defaultComparer(b.finishTime(), a.finishTime());
        }).slice(0, 25));

        this._requestsGrid._rowHeight = 30;
        this._requestsGrid.setDataSource(sortedRequests, null, this._getRequestsGridColumns());
    }

    private _getAgentsGridColumns(): Grids.IGridColumn[] {
        if (!this._agentsGridColumns) {
            this._agentsGridColumns = <Grids.IGridColumn[]>[
                {
                    index: 0,
                    width: 8,
                    canSortBy: false,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        var template = "<div class=\"grid-cell\" role=\"gridcell\" data-bind=\"css: statusBackgroundClass, attr: { title: stateText, 'aria-label': stateText }\"></div>";
                        return $(template).css("width", column.width);
                    }
                },
                {
                    index: 1,
                    width: 55,
                    canSortBy: false,
                    text: BuildResources.EnabledText,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        let template = "<div class=\"grid-cell\" role=\"gridcell\"><input type=\"checkbox\" data-bind=\"checked: enabled, attr: {'aria-label': toggleAriaLabel}, disable: saving, click: toggleEnabled\" /></div>";
                        return $(template).css("width", column.width);
                    }
                },
                {
                    index: 2,
                    width: 125,
                    canSortBy: false,
                    text: BuildResources.NameLabel,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        var template = "<div class=\"grid-cell\" role=\"gridcell\" data-bind=\"text: name\"></div>";
                        return $(template).css("width", column.width);
                    }
                },
                {
                    index: 3,
                    width: 60,
                    canSortBy: false,
                    text: BuildResources.CurrentStateLabel,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        var template = "<div class=\"grid-cell\" role=\"gridcell\" data-bind=\"text: stateText\"></div>";
                        return $(template).css("width", column.width);
                    }
                },
                {
                    index: 4,
                    width: 250,
                    canSortBy: false,
                    text: BuildResources.CurrentStatusLabel,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        var template = "<div class=\"grid-cell agent-activity-text\" role=\"gridcell\" data-bind=\"html: activityText\"></div>";
                        return $(template).css("width", column.width);
                    }
                },
                {
                    index: 5, // Inivisible cell for knockout binding
                    width: 0, // This should be the last cell because templates for visible cells need to be set before this
                    canSortBy: false,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        var row = rowInfo.row[0],
                            grid = <Grids.Grid>this,
                            agent = <TaskAgentViewModel>grid.getRowData(dataIndex);

                        // Add delete icon
                        let label = Utils_String.format(BuildResources.AdminDeleteAgentLabel, agent.name.peek());
                        $("<button />")
                            .attr("aria-label", label)
                            .addClass("icon icon-delete-grey-f1-background red-delete-icon-hover").appendTo(row);

                        // This is an invisible cell to apply knockout binding
                        ko.applyBindings(agent, row);

                        // Do not return any content
                        return null;
                    }
                }
            ];
        }

        return this._agentsGridColumns;
    }

    private _getRequestsGridColumns(): Grids.IGridColumn[] {
        if (!this._requestsGridColumns) {
            this._requestsGridColumns = <Grids.IGridColumn[]>[
                {
                    index: 0,
                    width: 30,
                    canSortBy: false,
                    text: BuildResources.TaskAgentRequestIdColumn,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        var template = "<div class=\"grid-cell\" role=\"gridcell\" data-bind=\"text: requestId\"></div>";
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
                        var cell = $("<div class=\"grid-cell build-list-icon\" data-no-tooltip=\"true\" role=\"gridcell\"  style=\"margin-top: 2px\"></div>");
                        cell.append($("<span data-bind=\"css: statusIconClass, attr: {'aria-label': statusIconText}\" />"));
                        return cell.width(column.width);
                    }
                },
                {
                    index: 2,
                    width: 50,
                    canSortBy: false,
                    text: BuildResources.TaskAgentRequestTypeColumn,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        var template = "<div class=\"grid-cell\" role=\"gridcell\" data-bind=\"text: requestType\"></div>";
                        return $(template).width(column.width);
                    }
                },
                {
                    index: 3,
                    width: 150,
                    canSortBy: false,
                    text: BuildResources.TaskAgentRequestDefinitionColumn,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        var template = `<div class=\"grid-cell\" role=\"gridcell\">
                                            <a data-bind="visible: definitionLink, text: definitionName, attr: { href: definitionLink }" target="_blank" />
                                            <span data-bind="visible: !definitionLink(), text: definitionName" />
                                        </div>`;
                        return $(template).width(column.width);
                    }
                },
                {
                    index: 4,
                    width: 125,
                    canSortBy: false,
                    text: BuildResources.TaskAgentRequestNameColumn,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        var template = `<div class="grid-cell" role=\"gridcell\">
                                            <a data-bind="visible: ownerLink, text: ownerName, attr: { href: ownerLink }" target="_blank" />
                                            <span data-bind="visible: !ownerLink(), text: ownerName" />
                                        </div>`;
                        return $(template).width(column.width);
                    }
                },
                {
                    index: 5,
                    width: 125,
                    canSortBy: false,
                    text: BuildResources.TaskAgentRequestDateQueuedColumn,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        const grid = <Grids.Grid>this;
                        const request = <TaskAgentRequestViewModel>grid.getRowData(dataIndex);
                        let template = "<div class=\"grid-cell\" role=\"gridcell\" data-bind=\"text: queueTimeText\"></div>";
                        return $(template).attr("aria-label", BuildResources.TaskAgentRequestDateQueuedColumn + " " + request.queueTimeText.peek()).width(column.width);
                    }
                },
                {
                    index: 6,
                    width: 125,
                    canSortBy: false,
                    text: BuildResources.TaskAgentRequestDateAssignedColumn,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        const grid = <Grids.Grid>this;
                        const request = <TaskAgentRequestViewModel>grid.getRowData(dataIndex);
                        let template = "<div class=\"grid-cell\" role=\"gridcell\" data-bind=\"text: assignTimeText\"></div>";
                        return $(template).attr("aria-label", BuildResources.TaskAgentRequestDateAssignedColumn + " " + request.assignTimeText.peek()).width(column.width);
                    }
                },
                {
                    index: 7,
                    width: 125,
                    canSortBy: false,
                    text: BuildResources.TaskAgentRequestDateStartedColumn,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        const grid = <Grids.Grid>this;
                        const request = <TaskAgentRequestViewModel>grid.getRowData(dataIndex);
                        let template = "<div class=\"grid-cell\" role=\"gridcell\" data-bind=\"text: startTimeText\"></div>";
                        return $(template).attr("aria-label", BuildResources.TaskAgentRequestDateStartedColumn + " " + request.startTimeText.peek()).width(column.width);
                    }
                },
                {
                    index: 8,
                    width: 125,
                    canSortBy: false,
                    text: BuildResources.TaskAgentRequestDateCompletedColumn,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        const grid = <Grids.Grid>this;
                        const request = <TaskAgentRequestViewModel>grid.getRowData(dataIndex);
                        let template = "<div class=\"grid-cell\" role=\"gridcell\" data-bind=\"text: finishTimeText\"></div>";
                        return $(template).attr("aria-label", BuildResources.TaskAgentRequestDateCompletedColumn + " " + request.finishTimeText.peek()).width(column.width);
                    }
                },
                {
                    index: 9,
                    width: 125,
                    canSortBy: false,
                    text: BuildResources.TaskAgentRequestDemandsColumn,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        const grid = <Grids.Grid>this;
                        const request = <TaskAgentRequestViewModel>grid.getRowData(dataIndex);
                        let template = "<div class=\"grid-cell\" role=\"gridcell\" data-bind=\"text: demands\"></div>";
                        return $(template).attr("aria-label", BuildResources.TaskAgentRequestDemandsColumn + " " + request.demands.peek()).width(column.width);
                    }
                },
                {
                    index: 10,
                    width: 125,
                    canSortBy: false,
                    text: BuildResources.TaskAgentRequestDurationColumn,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        const grid = <Grids.Grid>this;
                        const request = <TaskAgentRequestViewModel>grid.getRowData(dataIndex);
                        let template = "<div class=\"grid-cell\" role=\"gridcell\" data-bind=\"text: durationText\"></div>";
                        return $(template).attr("aria-label", BuildResources.TaskAgentRequestDurationColumn + " " + request.durationText.peek()).width(column.width);
                    }
                },
                {
                    index: 11, // Inivisible cell for knockout binding
                    width: 0, // This should be the last cell because templates for visible cells need to be set before this
                    canSortBy: false,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        var row = rowInfo.row[0];
                        var grid = <Grids.Grid>this;
                        var request = <TaskAgentRequestViewModel>grid.getRowData(dataIndex);

                        // This is an invisible cell to apply knockout binding
                        ko.applyBindings(request, row);

                        request.element = rowInfo.row;

                        // Do not return any content
                        return null;
                    }
                }
            ];
        }

        return this._requestsGridColumns;
    }

    private _getGridOptions(): Grids.IGridOptions {
        // Initial options for the grid. It will be populated by _updateGridSource
        return <Grids.IGridOptions>{
            source: [],
            columns: [],
            sharedMeasurements: true,
            allowMoveColumns: false
        };
    }

    private _loadAgents(taskAgentPool: DistributedTask.TaskAgentPool) {
        // Include capabilities
        this._poolClient.getAgents(taskAgentPool.id, null, false, true)
            .then((agents: DistributedTask.TaskAgent[]) => {
                // Sort
                agents.sort((a: DistributedTask.TaskAgent, b: DistributedTask.TaskAgent) => {
                    return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
                });

                // Map to viewmodels
                this.agents($.map(agents, (agent: DistributedTask.TaskAgent, index: number) => {
                    return new TaskAgentViewModel(this._tfsContext, this._pool, agent);
                }));
            });
    }

    public saveUserCapabilities() {
        var selectedAgent: TaskAgentViewModel = this.selectedAgent();
        this._poolClient.updateAgentUserCapabilities(selectedAgent.getUserCapabilities(), this.poolId(), selectedAgent.id())
            .then((updatedAgent: DistributedTask.TaskAgent) => {
                // The update call doesn't return the system capabilities
                this._refillSystemCapabilities(updatedAgent, selectedAgent.systemCapabilities.peek());
                selectedAgent.update(updatedAgent);
            }, handleError);
    }

    public undoUserCapabilities() {
        this.selectedAgent().revert();
    }

    private _refillUserCapabilities(agent: DistributedTask.TaskAgent, originalUserCapabilities: TaskAgentCapabilityModel[]) {
        originalUserCapabilities.forEach((userCapability) => {
            const keyValuePair = userCapability.getKeyValuePair();
            agent.userCapabilities[keyValuePair.key] = keyValuePair.value;
        });
    }

    private _refillSystemCapabilities(agent: DistributedTask.TaskAgent, originalSystemCapabilities: TaskAgentCapabilityModel[]) {
        originalSystemCapabilities.forEach((systemCapability) => {
            const keyValuePair = systemCapability.getKeyValuePair();
            agent.systemCapabilities[keyValuePair.key] = keyValuePair.value;
        });
    }
}

/**
 * Task agent capability types
 */
enum TaskAgentCapabilityType {
    System = 1,
    User = 2
}

/**
 * Viewmodel for task agent capabilities
 */
class TaskAgentCapabilityModel extends TaskModels.ChangeTrackerModel {
    /**
     * The capability type
     */
    public capabilityType: KnockoutObservable<TaskAgentCapabilityType> = ko.observable(null);

    /**
     * Initial capability to determine "dirty" status
     */
    private _originalCapability: TaskModels.SimpleKeyValuePair;

    public key: KnockoutObservable<string>;

    public value: KnockoutObservable<string>;

    public triggerFocus: KnockoutObservable<boolean> = ko.observable(false);

    /**
     * Create a TaskAgentCapabilityModel
     * @param capability The key,value pair
     * @param capabilityType The capability type
     */
    constructor(capability: TaskModels.SimpleKeyValuePair, capabilityType: TaskAgentCapabilityType) {
        super();
        // It is important for a key to have no trailing space
        var key = capability.key;
        if (key) {
            key = key.trim();
        }
        this.key(key);
        this.value(capability.value);
        this._originalCapability = capability;
        this.capabilityType(capabilityType);
    }

    _initializeObservables(): void {
        super._initializeObservables();
        this.key = ko.observable("");
        this.value = ko.observable("");
        this.capabilityType = ko.observable(null);
    }

    _isInvalid(): boolean {
        return this.isKeyInvalid() || this.isValueInvalid();
    }

    public isKeyInvalid(): boolean {
        var key = this.key().trim();
        return key.length === 0 ||
            key.indexOf(" ") >= 0;
    }

    public isValueInvalid(): boolean {
        return this.value().trim().length === 0;
    }

    _isDirty(): boolean {
        if (!this._originalCapability) {
            return false;
        }
        if (Utils_String.localeIgnoreCaseComparer(this.key(), this._originalCapability.key) !== 0 ||
            Utils_String.localeIgnoreCaseComparer(this.value(), this._originalCapability.value) !== 0) {
            return true;
        }
        return false;
    }

    public getKeyValuePair(): TaskModels.SimpleKeyValuePair {
        return new TaskModels.SimpleKeyValuePair(this.key(), this.value());
    }
}

class UnassignRequestOperation {
    public model: TaskAgentRequestViewModel;
    public request: DistributedTask.TaskAgentJobRequest;
    public callback: (operation: UnassignRequestOperation) => void;

    private _isComplete: boolean = false;

    constructor(model: TaskAgentRequestViewModel, request: DistributedTask.TaskAgentJobRequest, callback: (operation: UnassignRequestOperation) => void) {
        this.model = model;
        this.request = request;
        this.callback = callback;
    }

    public start(): void {
        var matchingElement: JQuery = this.model.element;
        matchingElement.fadeOut(500, () => {
            var rowHeight: number = matchingElement.height();
            var firstColumnWidth: number = matchingElement.children().first().outerWidth();

            // Remove all children after we have caculated the width/height
            matchingElement.empty();

            // Now add some text informing the view that the request has been re-assigned
            var newNode = $("<span />");
            newNode.css("line-height", Utils_String.format("{0}px", rowHeight)).css("margin-left", Utils_String.format("{0}px", firstColumnWidth));
            newNode.text(Utils_String.format(BuildResources.TaskAgentRequestAssignedFormat, this.request.requestId, this.request.reservedAgent.name));
            newNode.appendTo(matchingElement);
        }).fadeIn(500).delay(1000).animate({ height: "0px" }, 500, () => {
            this.complete();
        });
    }

    public complete(): void {
        if (this._isComplete) {
            return;
        }

        this._isComplete = true;

        if (this.callback) {
            this.callback(this);
        }
    }
}

/**
 * Viewmodel for task agents
 */
class TaskAgentViewModel extends TaskModels.ChangeTrackerModel {
    private _owner: AdminAgentsViewModel;
    private _agent: DistributedTask.TaskAgent;
    private _pool: DistributedTask.TaskAgentPool;
    private _capabilitiesLoaded: boolean = false;
    private _activated: boolean;
    private _requestsLoading: boolean;
    private _requestsShowing: boolean;
    private _capabilitiesLoading: boolean;
    private _capabilitiesShowing: boolean;
    private _unassignOperations: UnassignRequestOperation[] = [];
    private _poolClient: DistributedTaskApi.TaskAgentHttpClient;

    /**
     * The user capabilities
     */
    public userCapabilities: KnockoutObservableArray<TaskAgentCapabilityModel> = ko.observableArray(<TaskAgentCapabilityModel[]>[]);

    /**
    * Initial user capabilities to determine "dirty" status
    */
    private _userCapabilities: TaskAgentCapabilityModel[] = [];

    /**
     * The system capabilities
     */
    public systemCapabilities: KnockoutObservableArray<TaskAgentCapabilityModel> = ko.observableArray(<TaskAgentCapabilityModel[]>[]);

    /**
     * Date the agent was created
     */
    public createdOn: KnockoutObservable<Date> = TFS_Knockout.observableDate(null);

    /**
     * The agent id
     */
    public id: KnockoutObservable<number> = ko.observable(0);

    /**
     * The maximum parallelism supported by the agent
     */
    public maxParallelism: KnockoutObservable<number> = ko.observable(0);

    /**
     * A value indicating whether or not this agent accepts new work
     */
    public enabled: KnockoutObservable<boolean> = ko.observable(true);

	/**
	 * A value indicating whether or not the agent data is currently being saved
	 */
    public saving: KnockoutObservable<boolean> = ko.observable(false);

    /**
     * Gets the date/time which this agent last connected to the server
     */
    public lastConnectedOn: KnockoutObservable<Date> = TFS_Knockout.observableDate(null);

    /**
     * The agent name
     */
    public name: KnockoutObservable<string> = ko.observable("");

    /**
     * The agent properties
     */
    public properties: KnockoutObservableArray<TaskModels.KeyValuePair> = ko.observableArray(<TaskModels.KeyValuePair[]>[]);

    /**
     * The request which is currently active for this agent, if any 
     */
    public activeRequest: KnockoutObservable<TaskAgentRequestViewModel> = ko.observable(null);

    /**
     * The list of requests which have run for this agent and completed
     */
    public requests: KnockoutObservableArray<TaskAgentRequestViewModel> = ko.observableArray(<TaskAgentRequestViewModel[]>[]);

    /**
     * The status of the agent 
     */
    public status: KnockoutObservable<DistributedTask.TaskAgentStatus> = ko.observable(DistributedTask.TaskAgentStatus.Offline);

    public stateText: KnockoutComputed<string>;

    public toggleAriaLabel: KnockoutComputed<string>;

    public statusBackgroundClass: KnockoutComputed<string>;

    public capabilitiesLoaded: KnockoutObservable<boolean> = ko.observable(false);

    public requestsLoaded: KnockoutObservable<boolean> = ko.observable(false);

    public activityText: KnockoutComputed<string>;

    public pendingUpgrading: KnockoutObservable<DistributedTask.TaskAgentUpdate> = ko.observable(null);

    /**
     * Create a new TaskAgentViewModel
     * @param taskAgent the data contract
     */
    constructor(tfsContext: TFS_Host_TfsContext.TfsContext, pool: DistributedTask.TaskAgentPool, agent: DistributedTask.TaskAgent) {
        super();

        this._pool = pool;
        this._poolClient = Service.getApplicationClient(DistributedTaskApi.TaskAgentHttpClient, tfsContext.contextData);

        this.statusBackgroundClass = ko.computed<string>(() => {
            if (this._pool.isHosted || this.status() === DistributedTask.TaskAgentStatus.Online) {
                return "buildvnext-admin-agent-status-online";
            } else {
                return "buildvnext-admin-agent-status-offline";
            }
        });

        this.stateText = ko.computed<string>(() => {
            if (this._pool.isHosted || this.status() === DistributedTask.TaskAgentStatus.Online) {
                return BuildResources.AgentStatusOnline;
            } else {
                return BuildResources.AgentStatusOffline;
            }
        });

        this.activityText = ko.computed<string>(() => {
            let activeRequest: TaskAgentRequestViewModel = this.activeRequest();
            let pendingUpgrading = this.pendingUpgrading();
            let status = this.status();
            let requests = this.requests();
            let enabled = this.enabled();

            // always prefer active request message, since pending update may out of sync with agent.
            if (activeRequest) {
                return Utils_String.format(BuildResources.TaskAgentActivityFormat, activeRequest.requestType().toLowerCase(), activeRequest.ownerName());
            }
            else if (pendingUpgrading && pendingUpgrading.currentState) {
                return pendingUpgrading.currentState;
            }
            else if (!this._pool.isHosted &&
                this._agent &&
                this._agent.version &&
                this._agent.version.search(/^1\.\d+/) >= 0) {

                return Marked(BuildResources.TaskAgentDeprecated);
            }
            else if (enabled && this._pool.isHosted) {
                const queuedRequests = requests.filter((value, index, array) => {
                    return value.getState() === TaskAgentRequestState.Queued
                        && !value.assignTime();
                });

                const assignedRequests = requests.filter((value, index, array) => {
                    return value.getState() === TaskAgentRequestState.Queued
                        && value.assignTime();
                });

                // Throttling within DT is turned on when this feature flag is off
                const infiniteResourceLimits: boolean =
                    FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(
                        ServerConstants.FeatureAvailabilityFlags.PipelineBillingModel2SelfHostedInfiniteResourceLimits, false);

                if (infiniteResourceLimits) {
                    // DT is not throttling, MMS will be handling it post assignment
                    if (assignedRequests.length > 0) {
                        return BuildResources.TaskAgentActivityWaitingForPipeline;
                    }
                }
                else {
                    // DT is handling throttling
                    if (assignedRequests.length > 0) {
                        return BuildResources.TaskAgentActivityWaitingForMachine;
                    }

                    if (queuedRequests.length > 0) {
                        return BuildResources.TaskAgentActivityWaitingForPipeline;
                    }
                }
            }

            return BuildResources.TaskAgentActivityIdle;
        });

        if (agent.assignedRequest && agent.assignedRequest.receiveTime) {
            this.activeRequest(new TaskAgentRequestViewModel(agent.assignedRequest));
        }

        this.toggleAriaLabel = ko.computed<string>(() => {
            return Utils_String.format(BuildResources.AdminEnableCheckboxLabel, this.enabled() ? BuildResources.EnabledText : BuildResources.DisabledText);
        });

        this.update(agent);
    }

    /* 
     * Should be fired 
     */
    public deactivate(): void {
        this._unassignOperations.forEach((value, index, array) => {
            value.complete();
        });

        this._requestsShowing = false;
        this._capabilitiesShowing = false;
        this._unassignOperations = [];
    }

    public showCapabilities(): void {
        if (this._capabilitiesLoading || this.capabilitiesLoaded()) {
            this._capabilitiesShowing = true;
            return;
        }

        // Keep track of the fact that we're loading to avoid multiple server calls
        this._capabilitiesLoading = true;

        // Refresh the agent but this time include the capabilities
        this._poolClient.getAgent(this._pool.id, this._agent.id, true).then((agent: DistributedTask.TaskAgent) => {
            this.update(agent);
            this.capabilitiesLoaded(true);
            this._capabilitiesShowing = true;
            this._capabilitiesLoading = false;
        });
    }

    public showRequests(): void {
        if (this._requestsLoading || this.requestsLoaded()) {
            // Notify listeners that the value has mutated. If we don't do this there is interesting partial rendering
            // behavior from the grid until you interact with it (something like resize a column).
            this._requestsShowing = true;
            this.requests.valueHasMutated();
            return;
        }

        // Keep track of the fact that we're loading to avoid multiple server calls
        this._requestsLoading = true;

        this._poolClient.getAgentRequestsForAgent(this._pool.id, this._agent.id, 25).then((requests: DistributedTask.TaskAgentJobRequest[]) => {
            var requestModels: TaskAgentRequestViewModel[] = $.map(requests, (request: DistributedTask.TaskAgentJobRequest) => {
                return new TaskAgentRequestViewModel(request);
            });

            this._requestsShowing = true;
            this._requestsLoading = false;
            this.requests(requestModels);
            this.requestsLoaded(true);
        });
    }

    public requestAssigned(request: DistributedTask.TaskAgentJobRequest): void {

        var requests = this.requests();
        var filteredRequests = requests.filter((value, index, array) => {
            return value.requestId() === request.requestId;
        });

        if (filteredRequests.length == 0) {
            requests.push(new TaskAgentRequestViewModel(request));
        }
        else {
            filteredRequests[0].update(request);
        }

        // Update the list so our listeners can react to the update
        this.requests(requests);
    }

    public requestUnassigned(request: DistributedTask.TaskAgentJobRequest, completedCallback: () => void): boolean {
        var matchingRequests: TaskAgentRequestViewModel[] = this.requests().filter((value, index, array) => {
            return value.requestId() === request.requestId;
        });

        if (matchingRequests.length === 1) {
            var matchingRequest: TaskAgentRequestViewModel = matchingRequests[0];
            if (matchingRequest.element && this._requestsShowing) {
                // Keep track of the in-progress animations so we can clear them out if the agent is unselected
                var operation = new UnassignRequestOperation(matchingRequest, request, (operation: UnassignRequestOperation) => {
                    try {
                        if (completedCallback) {
                            completedCallback();
                        }
                    }
                    finally {
                        Utils_Array.remove(this._unassignOperations, operation);
                        this.requests.remove(operation.model);
                    }
                });

                this._unassignOperations.push(operation);
                operation.start();
                return true;
            }
            else {
                this.requests.remove(matchingRequest);
            }
        }

        return false;
    }

    public requestStarted(request: DistributedTask.TaskAgentJobRequest): void {
        this.activeRequest(new TaskAgentRequestViewModel(request));
        var requests = this.requests();
        var filteredRequests = requests.filter((value, index, array) => {
            return value.requestId() === request.requestId;
        });

        if (filteredRequests.length == 0) {
            requests.push(new TaskAgentRequestViewModel(request));
        }
        else {
            filteredRequests[0].update(request);
        }

        this.requests(requests);
    }

    public requestCompleted(request: DistributedTask.TaskAgentJobRequest): void {
        let activeRequest: TaskAgentRequestViewModel = this.activeRequest();
        if (activeRequest && activeRequest.requestId() === request.requestId) {
            this.activeRequest(null);
        }

        var requests = this.requests();
        var filteredRequests = requests.filter((value, index, array) => {
            return value.requestId() === request.requestId;
        });

        if (filteredRequests.length == 0) {
            requests.push(new TaskAgentRequestViewModel(request));
        }
        else {
            filteredRequests[0].update(request);
        }

        this.requests(requests);
    }

    public toggleEnabled = () => {
        this.saving(true);
        let agent = this.getValue();
        let promise = <Q.Promise<any>>this._poolClient.updateAgent(agent, this._pool.id, agent.id).then(null, (error: TfsError) => {
            if (error && error.status == "400") {
                this.enabled(false);
                alert(error.message);
            } else {
                handleError(error);
            }
        });

        promise.fin(() => {
            this.saving(false);
        });
    }

    /**
     * Update the model with a data contract
     * @param taskAgent the data contract
     */
    public update(agent: DistributedTask.TaskAgent) {
        this._agent = agent;

        if (!!agent) {
            this._userCapabilities = [];
            this.userCapabilities($.map(agent.userCapabilities || {}, (value: string, key: string) => {

                // The order of these are important, since _isDirty() works on this order
                this._userCapabilities.push(new TaskAgentCapabilityModel(new TaskModels.SimpleKeyValuePair(key, value), TaskAgentCapabilityType.User));
                return new TaskAgentCapabilityModel(new TaskModels.SimpleKeyValuePair(key, value), TaskAgentCapabilityType.User);
            }));

            var systemCapabilities: TaskAgentCapabilityModel[] = $.map(agent.systemCapabilities || {}, (value: string, key: string) => {
                return new TaskAgentCapabilityModel(new TaskModels.SimpleKeyValuePair(key, value), TaskAgentCapabilityType.System);
            });

            this.systemCapabilities(systemCapabilities.sort((a, b) => {
                return Utils_String.localeIgnoreCaseComparer(a.key(), b.key());
            }));

            this.createdOn(agent.createdOn);
            this.id(agent.id);
            this.maxParallelism(agent.maxParallelism);
            this.name(agent.name);
            this.enabled(agent.enabled);
            this.status(agent.status);
            this.properties($.map(agent.properties || {}, (value: string, key: string) => {
                return new TaskModels.KeyValuePair(key, value);
            }));

            this.pendingUpgrading(agent.pendingUpdate);
        }
    }

    public addUserCapability(variables: TaskAgentViewModel, evt: JQueryEventObject): void {
        const capability = new TaskAgentCapabilityModel(new TaskModels.SimpleKeyValuePair(), TaskAgentCapabilityType.User);
        variables.userCapabilities.push(capability);
        capability.triggerFocus(true);
    }

    public revert(): void {
        // Update using original capabilities
        this.userCapabilities($.map(this._userCapabilities || {}, (vm: TaskAgentCapabilityModel) => {
            return new TaskAgentCapabilityModel(new TaskModels.SimpleKeyValuePair(vm.key(), vm.value()), TaskAgentCapabilityType.User);
        }));
    }

    _isDirty(): boolean {
        if (!this.userCapabilities) {
            return false;
        }

        var capabilities = this.userCapabilities();
        var atleastOneDirty: boolean = false;
        // Check every capability for dirtiness
        for (var i = 0, len = capabilities.length; i < len; i++) {
            if (capabilities[i]._isDirty()) {
                atleastOneDirty = true;
                break;
            }
        }

        // Also if number of rows changed
        return atleastOneDirty || this._userCapabilities.length != capabilities.length;
    }

    _isInvalid(): boolean {
        if (!this.userCapabilities) {
            return false;
        }

        var capabilities = this.userCapabilities();
        var atLeastOneInvalid: boolean = false;
        // Check every capability for invalid items
        for (var i = 0, len = capabilities.length; i < len; i++) {
            if (capabilities[i]._isInvalid()) {
                atLeastOneInvalid = true;
                break;
            }
        }

        return atLeastOneInvalid;
    }

    public removeUserCapability(variable: TaskAgentCapabilityModel, evt: JQueryEventObject): void {
        variable.dispose();
        var context = <TaskAgentViewModel>(<KnockoutBindingContext>ko.contextFor(evt.target)).$parent;
        context.userCapabilities.remove(variable);
    }

    public getUserCapabilities(): { [key: string]: string; } {
        var capabilities: { [key: string]: string; } = {};
        $.map(this.userCapabilities(), (capability: TaskAgentCapabilityModel) => {
            capabilities[capability.key().trim()] = capability.value();
        });
        return capabilities;
    }

    public getValue(): DistributedTask.TaskAgent {
        return <DistributedTask.TaskAgent>{
            enabled: this.enabled(),
            id: this.id(),
            maxParallelism: this.maxParallelism(),
            name: this.name()
        };
    }
}

enum TaskAgentRequestState {
    InProgress = 1,
    Queued = 2,
    Completed = 4
}

interface ITaskAgentResultData {
    className: string;
    text: string;
}

/**
 * ViewModel for task agent requests
 */
class TaskAgentRequestViewModel {
    public requestId: KnockoutObservable<number> = ko.observable(0);

    public requestType: KnockoutObservable<string> = ko.observable(null);

    public queueTime: KnockoutObservable<Date> = ko.observable(null);

    public queueTimeText: KnockoutComputed<string>;

    public assignTime: KnockoutObservable<Date> = ko.observable(null);

    public assignTimeText: KnockoutComputed<string>;

    public startTime: KnockoutObservable<Date> = ko.observable(null);

    public startTimeText: KnockoutComputed<string>;

    public finishTime: KnockoutObservable<Date> = ko.observable(null);

    public finishTimeText: KnockoutComputed<string>;

    public demands: KnockoutObservable<string> = ko.observable("");

    public durationText: KnockoutComputed<string>;

    public result: KnockoutObservable<DistributedTask.TaskResult> = ko.observable(null);

    public statusIconClass: KnockoutObservable<string> = ko.observable(null);

    public statusIconText: KnockoutObservable<string> = ko.observable(null);

    public definitionName: KnockoutObservable<string> = ko.observable(null);

    public definitionLink: KnockoutObservable<string> = ko.observable(null);

    public ownerName: KnockoutObservable<string> = ko.observable(null);

    public ownerLink: KnockoutObservable<string> = ko.observable(null);

    public request: DistributedTask.TaskAgentJobRequest;

    public element: JQuery;

    constructor(request: DistributedTask.TaskAgentJobRequest) {
        this.request = request;
        this.queueTimeText = ko.computed(() => {
            var queueTime = this.queueTime();
            return queueTime != null ? Utils_Date.localeFormat(this.queueTime(), "G") : null;
        });

        this.assignTimeText = ko.computed(() => {
            var assignTime = this.assignTime();
            return assignTime != null ? Utils_Date.localeFormat(this.assignTime(), "G") : null;
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

        this.update(request);
    }

    public getState(): number {
        if (this.request.finishTime) {
            return TaskAgentRequestState.Completed;
        }
        else if (this.request.receiveTime) {
            return TaskAgentRequestState.InProgress;
        }
        else {
            return TaskAgentRequestState.Queued;
        }
    }

    public update(request: DistributedTask.TaskAgentJobRequest): void {
        if (this.request.requestId !== request.requestId) {
            return;
        }

        this.request = request;
        this.requestId(request.requestId);
        this.requestType(request.planType);
        this.queueTime(request.queueTime);
        this.assignTime(request.assignTime);
        this.startTime(request.receiveTime);
        this.finishTime(request.finishTime);
        this.demands(this._getDemands(request.demands));
        this.result(request.result);
        let resultData = this._getTaskAgentResultData();
        this.statusIconClass("icon icon-tfs-build-status-" + resultData.className.toLowerCase());
        this.statusIconText(resultData.text);

        if (request.definition) {
            this.definitionName(request.definition.name);

            if (request.definition._links && request.definition._links.web) {
                this.definitionLink(request.definition._links.web.href);
            }
            else {
                this.ownerLink(null);
            }
        }
        else {
            this.definitionLink(null);
            this.definitionName(BuildResources.TaskAgentRequestUnknown);
        }

        if (request.owner) {
            if (!request.jobName) {
                this.ownerName(request.owner.name);
            }
            else {
                this.ownerName(Utils_String.format(BuildResources.TaskAgentJobNameFormat, request.owner.name, request.jobName));
            }

            if (request.owner._links && request.owner._links.web) {
                this.ownerLink(request.owner._links.web.href);
            }
            else {
                this.ownerLink(null);
            }
        }
        else {
            this.ownerLink(null);
            this.ownerName(BuildResources.TaskAgentRequestUnknown);
        }
    }

    private _getDemands(demands: string[]) {
        return (demands && demands.length > 0) ? demands.join(",") : "";
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

    private _getTaskAgentResultData(): ITaskAgentResultData {
        var state: TaskAgentRequestState = this.getState();
        if (state === TaskAgentRequestState.Completed) {
            switch (this.request.result) {
                case DistributedTask.TaskResult.Succeeded:
                    return {
                        className: "succeeded",
                        text: BuildCommonResources.BuildResultSucceeded
                    };

                case DistributedTask.TaskResult.SucceededWithIssues:
                    return {
                        className: "partiallysucceeded",
                        text: BuildCommonResources.BuildResultPartiallySucceeded
                    };

                case DistributedTask.TaskResult.Abandoned:
                case DistributedTask.TaskResult.Canceled:
                    return {
                        className: "canceled",
                        text: BuildCommonResources.BuildResultCanceled
                    };

                case DistributedTask.TaskResult.Failed:
                    return {
                        className: "failed",
                        text: BuildCommonResources.BuildResultFailed
                    };
            }
        }
        else if (state === TaskAgentRequestState.InProgress) {
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
