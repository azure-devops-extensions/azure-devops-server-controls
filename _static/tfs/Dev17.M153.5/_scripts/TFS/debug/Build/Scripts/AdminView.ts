/// <reference types="jquery" />
import ko = require("knockout");
import Q = require("q");

import AdminSettings = require("Build/Scripts/Admin.Settings");
import AdminResourceLimits = require("Build/Scripts/Admin.ResourceLimits");
import Agents = require("Build/Scripts/Admin.Agents");
import BuildAdminControls = require("Build/Scripts/Controls.Admin");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import Maintenance = require("Build/Scripts/Admin.Maintenance");
import PoolDetails = require("Build/Scripts/Admin.PoolDetails");
import PoolPolicies = require("Build/Scripts/Admin.PoolPolicies");
import PoolSettings = require("Build/Scripts/Admin.PoolSettings");
import Roles = require("Build/Scripts/Admin.Roles");

import BuildClient = require("Build.Common/Scripts/Api2.2/ClientServices");

import AgentAcquisitionDialog = require("DistributedTaskControls/Components/AgentAcquisitionDialog");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");
import { LicenseFeatureIds, FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import TFS_FeatureLicenseService = require("Presentation/Scripts/TFS/TFS.FeatureLicenseService");
import TFS_OM_Common_TypeOnly = require("Presentation/Scripts/TFS/TFS.OM.Common");

import BuildCommon = require("TFS/Build/Contracts");
import DistributedTask = require("TFS/DistributedTask/Contracts");
import DistributedTaskApi = require("TFS/DistributedTask/TaskAgentRestClient");

import VSS_Platform_TypeOnly = require("VSS/Common/Contracts/Platform");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Splitter = require("VSS/Controls/Splitter");
import { logError } from "VSS/Diag";
import Events_Action = require("VSS/Events/Action");
import Menus = require("VSS/Controls/Menus");
import Navigation = require("VSS/Controls/Navigation");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import Navigation_Services = require("VSS/Navigation/Services");
import Security_RestClient_TypeOnly = require("VSS/Security/RestClient");
import Service = require("VSS/Service");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import VSS_WebApi_Constants_TypeOnly = require("VSS/WebApi/Constants");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");

const delegate = Utils_Core.delegate;
const TfsContext = TFS_Host_TfsContext.TfsContext;
const agentDownloadButtonClass = "agent-download-button";

export class BuildAdminSettingsTab extends Navigation.NavigationViewTab {
    private _template: JQuery = null;
    private _viewModel: AdminSettings.AdminSettingsViewModel;
    private _settings: BuildCommon.BuildSettings;

    public initialize() {
        super.initialize();
        var tfsContext = TfsContext.getDefault();

        // grab build settings object and pass to VM
        var tfsConnection: Service.VssConnection = new Service.VssConnection(tfsContext.contextData);
        var buildClient = tfsConnection.getService<BuildClient.BuildClientService>(BuildClient.BuildClientService);

        buildClient.beginGetBuildSettings().then(
            (settings: BuildCommon.BuildSettings) => {
                this._settings = settings;
                this._initialize(tfsContext);
            },
            (error) => {
                alert(error.message || error);
            });
    }

    private _initialize(tfsContext: TFS_Host_TfsContext.TfsContext) {
        this._viewModel = new AdminSettings.AdminSettingsViewModel(tfsContext, this._settings);
        if (!this._template) {
            this._template = TFS_Knockout.loadHtmlTemplate("buildvnext_admin_settings_tab").appendTo(this._element);
            ko.applyBindings(this._viewModel, this._template[0]);
        }
    }

    /**
     * Called whenever navigation occurs with this tab as the selected tab
     * @param rawState The raw/unprocessed hash/url state parameters (string key/value pairs)
     * @param parsedState Resolved state objects parsed by the view
     */
    public onNavigate(rawState: any, parsedState: any) {
    }
}

export class AdminResourceLimitsTab extends Navigation.NavigationViewTab {
    public initialize() {
        super.initialize();

        this._tfsContext = TfsContext.getDefault();
        var tfsConnection: Service.VssConnection = new Service.VssConnection(this._tfsContext.contextData);
        var taskHubLicenseClient: DistributedTaskApi.TaskAgentHttpClient = tfsConnection.getHttpClient<DistributedTaskApi.TaskAgentHttpClient>(DistributedTaskApi.TaskAgentHttpClient);

        Q.all([this._hasOnPremManageUsersPermission(), taskHubLicenseClient.getTaskHubLicenseDetails("Release", true, true)]).spread(
            (canManageOnPremUsers: boolean, licenseDetails: DistributedTask.TaskHubLicenseDetails) => {
                this._licenseDetails = licenseDetails;
                this._canManageOnPremUsers = canManageOnPremUsers;
                this._initialize();
            },
            (error) => {
                if (!!error) {
                    Dialogs.show(AdminResourceLimits.OneButtonModalDialog, {
                        title: BuildResources.ErrorLabelText,
                        closeButtonText: BuildResources.CloseButtonText,
                        dialogClass: "r-get-license-error-dialog",
                        content: Utils_String.format("<div>{0}</div>", error.message || error)
                    });
                }
            });
    }

    /**
     * Called whenever navigation occurs with this tab as the selected tab
     * @param rawState The raw/unprocessed hash/url state parameters (string key/value pairs)
     * @param parsedState Resolved state objects parsed by the view
     */
    public onNavigate(rawState: any, parsedState: any) {
    }

    public dispose(): void {
        super.dispose();
    }

    private _initialize() {
        this._viewModel = new AdminResourceLimits.AdminResourceLimitsViewModel(this._tfsContext, this._licenseDetails, this._canManageOnPremUsers);
        if (!this._template) {
            this._template = TFS_Knockout.loadHtmlTemplate("br_admin_resourcelimits_tab").appendTo(this._element);
            ko.applyBindings(this._viewModel, this._template[0]);
        }
    }

    private _hasOnPremManageUsersPermission(): Q.Promise<boolean> {
        let hasManageOnPremUsers: boolean = false;
        let hasManagePromise: Q.Deferred<boolean> = Q.defer<boolean>();

        if (!this._tfsContext.isHosted) {
            VSS.using(["Presentation/Scripts/TFS/TFS.OM.Common", "VSS/Common/Contracts/Platform", "VSS/Security/RestClient", "VSS/WebApi/Constants"],
                (TFS_OM_Common: typeof TFS_OM_Common_TypeOnly,
                    VSS_Platform: typeof VSS_Platform_TypeOnly,
                    Security_RestClient: typeof Security_RestClient_TypeOnly,
                    VSS_WebApi_Constants: typeof VSS_WebApi_Constants_TypeOnly) => {

                    let frameworkNamespaceId = "1f4179b3-6bac-4d01-b421-71ea09171400";
                    let frameworkPermissionsGenericWrite = 2;
                    let frameworkNamespaceToken = "FrameworkGlobalSecurity";
                    let deploymentHostConnection = TFS_OM_Common.Deployment.getDefaultConnection();

                    deploymentHostConnection.beginGetServiceUrl(VSS_WebApi_Constants.ServiceInstanceTypes.TFS, VSS_Platform.ContextHostType.Deployment)
                        .then((rootUrl: string) => {

                            let securityClient = new Security_RestClient.SecurityHttpClient2(rootUrl);
                            let securityPromise = <Q.Promise<boolean>>securityClient.hasPermission(frameworkNamespaceId, frameworkPermissionsGenericWrite, frameworkNamespaceToken);

                            securityPromise.then((hasPermission: boolean) => {
                                hasManageOnPremUsers = hasPermission;
                            }).fin(() => {
                                hasManagePromise.resolve(hasManageOnPremUsers);
                            });
                        },
                        (error) => {
                            hasManagePromise.resolve(hasManageOnPremUsers);
                        });
                },
                (error) => {
                    hasManagePromise.resolve(hasManageOnPremUsers);
                });
        }
        else {
            hasManagePromise.resolve(hasManageOnPremUsers);
        }

        return hasManagePromise.promise;
    }

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _template: JQuery = null;
    private _viewModel: AdminResourceLimits.AdminResourceLimitsViewModel;
    private _licenseDetails: DistributedTask.TaskHubLicenseDetails;
    private _canManageOnPremUsers: boolean;
}

export class DownloadXplatAgentDialog extends Dialogs.ModalDialog {

    constructor(options?: any) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            title: BuildResources.XplatAgentDialogTitle,
            width: 500,
            height: 150,
            resizable: false,
            hasProgressElement: false,
            allowMultiSelect: false,
            buttons: {
                "close": {
                    id: "close",
                    text: VSS_Resources_Platform.CloseButtonLabelText,
                    click: delegate(this, this._close),
                }
            }
        }, options));
    }

    public initialize() {
        super.initialize();
        var wrapper = $('<div>')
            .addClass('xplat-agent-download');
        var msgDiv = $("<div />")
            .text(BuildResources.XplatAgentDownloadInfo)
            .appendTo(wrapper);
        var linkDiv = $("<div />")
            .appendTo(msgDiv);
        $("<a />")
            .attr("href", BuildResources.XplatAgentGitHubRepo)
            .attr("target", "_blank")
            .text(BuildResources.XplatAgentDownloadLinkText)
            .attr("title", BuildResources.XplatAgentDownloadLinkText)
            .appendTo(linkDiv);
        this.getElement().append(wrapper);
    }

    private _close() {
        this.close();
        this.dispose();
    }
}

export class AgentPoolAdminView extends Navigation.TabbedNavigationView {
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _navigating: boolean = false;
    private _poolClient: DistributedTaskApi.TaskAgentHttpClient2_2;
    private _poolsTree: BuildAdminControls.AgentPoolsAdminTree;
    private _initialLoad: boolean = true;

    private _pools: DistributedTask.TaskAgentPool[];

    private _agentClouds: DistributedTask.TaskAgentCloud[];
    private _buildtabs : string[];

    public initializeOptions(options?: any) {
        var tabs = {};
        
        this._tfsContext = options.tfsContext || TfsContext.getDefault();

        this._buildtabs = [];
        this._buildtabs.push(BuildAdminControls.BuildAdminActionIds.Agents);
        this._buildtabs.push(BuildAdminControls.BuildAdminActionIds.Roles);
        this._buildtabs.push(BuildAdminControls.BuildAdminActionIds.PoolDetails);
        this._buildtabs.push(BuildAdminControls.BuildAdminActionIds.PoolMaintenance);
        this._buildtabs.push(BuildAdminControls.BuildAdminActionIds.PoolSettings);

        tabs[BuildAdminControls.BuildAdminActionIds.Agents] = Agents.BuildAdminAgentsTab;
        tabs[BuildAdminControls.BuildAdminActionIds.Roles] = Roles.AdminRolesTab;
        tabs[BuildAdminControls.BuildAdminActionIds.PoolDetails] = PoolDetails.AdminPoolDetailsTab;
        tabs[BuildAdminControls.BuildAdminActionIds.PoolMaintenance] = Maintenance.AdminMaintenanceTab;
        tabs[BuildAdminControls.BuildAdminActionIds.PoolSettings] = PoolSettings.AdminPoolSettingsTab;

        this._poolClient = Service.getApplicationClient(DistributedTaskApi.TaskAgentHttpClient2_2, this._tfsContext.contextData);

        super.initializeOptions($.extend({
            tabs: tabs,
            titleElementSelector: ".hub-title .label",
            hubContentSelector: ".buildvnext-admin-right-pane",
            pivotTabsSelector: ".buildvnext-admin-tabs"
        }, options));
    }

    public initialize() {
        var $leftPane: JQuery = this._element.find(".buildvnext-admin-left-pane");

        this._poolsTree = <BuildAdminControls.AgentPoolsAdminTree>Controls.Enhancement.enhance(BuildAdminControls.AgentPoolsAdminTree, $leftPane.find(".buildvnext-admin-left-pane-agentpools"), this._options);

        this._poolsTree._bind("selectionchanged", (e: JQueryEventObject) => {
            var selectedNode: any = this._poolsTree.getSelectedNode();
            if (!!selectedNode && !!selectedNode.tag) {
                this._navigateToPool(selectedNode.tag.id);
            }
        });

        this._poolsTree._bind("pool-deleted", (e: JQueryEventObject) => {
            this._refreshAgentPools().then(() => {
                var pools = this._pools;
                var id = null;
                if (pools.length > 0) {
                    id = pools[0].id;
                }
                this._navigateToPool(id);
            });
        });

        Controls.BaseControl.createIn(Menus.MenuBar, $leftPane.find(".buildvnext-admin-left-pane-toolbar"), {
            items: [
                {
                    id: "new-agent-pool-queue",
                    text: BuildResources.NewAgentPool,
                    noIcon: true,
                    action: () => {
                        var dialogModel: BuildAdminControls.CreateAgentPoolDialogModel = new BuildAdminControls.CreateAgentPoolDialogModel(
                            this._tfsContext,
                            this._agentClouds,
                            (newPool: DistributedTask.TaskAgentPool) => {
                                this._refreshAgentPools()
                                    .then(() => {
                                        this._navigateToPool(newPool.id);
                                    });
                            });

                        Dialogs.show(BuildAdminControls.CreateAgentPoolDialog, dialogModel);
                    }
                }
            ]
        });

        this._refreshAgentPools().then(() => {
            super.initialize();
        });

        hookupAgentDownloadButtonOnClickHandler(this._element[0]);
    }

    public parseStateInfo(action: string, rawState: any, callback: IResultCallback) {
        if(action && this._buildtabs.indexOf(action) === -1) {
            action = undefined;
        }

        var state: any = {};

        this.setState(state);

        action = action || BuildAdminControls.BuildAdminActionIds.Agents;

        state.poolId = rawState.poolId;
        state.action = action;
        state.roleType = Roles.RoleType.Pool;
        state.agentId = rawState.agentId;

        if (this._pools.length === 0) {
            this.showInformationTab(BuildResources.AdminNoPoolsTitle, BuildResources.AdminNoPoolsDescription);
            this.setHubPivotVisibility(false);
        } else if (state.poolId) {
            $.each(this._pools, (index: number, pool: DistributedTask.TaskAgentPool) => {
                if (pool.id == state.poolId) {
                    state.pool = pool;
                    return false;
                }
            });

            if (!state.pool) {
                state.poolId = this._pools[0].id;
                state.pool = this._pools[0];
            }
        } else if (this._initialLoad) {
            state.poolId = this._pools[0].id;
            state.pool = this._pools[0];
        }

        this._initialLoad = false;

        callback(action, state);
    }

    public getTabVisibility(tabId: any, currentTabId: string, rawState: any, parsedState: any): boolean {
        switch (tabId) {
            case BuildAdminControls.BuildAdminActionIds.Agents:
                if (parsedState.poolId) {
                    return true;
                }
                break;
            case BuildAdminControls.BuildAdminActionIds.PoolDetails:
                if (parsedState.poolId) {
                    return true;
                }
                break;
            case BuildAdminControls.BuildAdminActionIds.PoolMaintenance:
                if (parsedState.poolId && !parsedState.pool.isHosted) {
                    return true;
                }
                break;
            case BuildAdminControls.BuildAdminActionIds.PoolSettings:
                if (parsedState.poolId && !parsedState.pool.isHosted) {
                    return true;
                }
                break;
            case BuildAdminControls.BuildAdminActionIds.Roles:
                return true;
        }

        return false;
    }

    public onNavigate(state: any) {
        this.setHubPivotVisibility(true);

        if (this._poolsTree) {
            var pool = <DistributedTask.TaskAgentPool>state.pool;
            this._poolsTree.setSelectedPool(pool);
        }

        let splitter = <Splitter.Splitter>Controls.Enhancement.getInstance(Splitter.Splitter, $(".hub-content > .splitter.horizontal"));
        if (splitter) {
            // by default fixedWidth is "left", setminWidth so that we display all the buttons all the time (like "New queue" and "Download agent" ) to avoid confusion
            splitter.setMinWidth(320);
        }

        // regain focus on tab for accessibility
        this.getElement().find("ul.buildvnext-admin-tabs").find("li.selected a").focus();
    }

        private _navigateToPool(poolId: number) {
        let replaceHistory = false;
        let action = this.getCurrentAction();
        let historyService = Navigation_Services.getHistoryService();
        let currentState = historyService.getCurrentState();
        let poolMap = this._poolsTree.getTaskAgentPoolMap();

        if (!poolId) {
            action = BuildAdminControls.BuildAdminActionIds.Roles;
        }
        else if (poolMap[poolId] && poolMap[poolId].isHosted && (action === BuildAdminControls.BuildAdminActionIds.PoolMaintenance || action === BuildAdminControls.BuildAdminActionIds.PoolSettings)) {
            action = BuildAdminControls.BuildAdminActionIds.Agents;
            replaceHistory = true;
        }

        if (!currentState.action) {
            replaceHistory = true;
        }

        if (currentState.action != action || currentState.poolId != (poolId ? poolId.toString() : "")) {
            if (replaceHistory) {
                // no action, initial page nav, don't add to history
                historyService.replaceHistoryPoint(action, {
                    action: action,
                    poolId: poolId
                });
            }
            else {
                // time to add to navigation history, queue changed or action changed
                historyService.addHistoryPoint(action, {
                    poolId: poolId || null
                });
            }
        }
    }

    private _refreshAgentPools(): IPromise<any> {
        return this._poolsTree.refreshPools()
            .then(() => {
                this._pools = this._poolsTree.getPools();
                this._agentClouds = this._poolsTree.getAgentClouds();
            });
    }
}
VSS.classExtend(AgentPoolAdminView, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(AgentPoolAdminView, ".agentpool-admin-view");

export class BuildAdminView extends Navigation.TabbedNavigationView {
    private _tfsContext: TFS_Host_TfsContext.TfsContext;

    public initializeOptions(options?: any) {
        var tabs = {};
            
        this._tfsContext = options.tfsContext || TfsContext.getDefault();

        tabs[BuildAdminControls.BuildAdminActionIds.Settings] = BuildAdminSettingsTab;

        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.BuildAndReleaseResourceLimits, false)) {
            tabs[BuildAdminControls.BuildAdminActionIds.ResourceLimits] = AdminResourceLimitsTab;
        }

        super.initializeOptions($.extend({
            tabs: tabs,
            hubContentSelector: ".buildvnext-admin-content",
            pivotTabsSelector: ".buildvnext-admin-tabs"
        }, options));
    }

    public parseStateInfo(action: string, rawState: any, callback: IResultCallback) {
        var state: any = {};

        this.setState(state);

        action = action || BuildAdminControls.BuildAdminActionIds.Settings;

        callback(action, state);
    }
}
VSS.classExtend(BuildAdminView, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(BuildAdminView, ".buildvnext-admin-view");

export class AgentQueuesAdminView extends Navigation.TabbedNavigationView {
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _navigating: boolean = false;
    private _queuesControl: BuildAdminControls.BuildQueuesAdminTree;
    private _initialLoad: boolean = true;

    private _queues: DistributedTask.TaskAgentQueue[];
    private _pools: DistributedTask.TaskAgentPoolReference[];

    private _queuesClient: DistributedTaskApi.TaskAgentHttpClient2_2;
    private _buildtabs : string[];

    public initializeOptions(options?: any) {
        var tabs = {};
        this._buildtabs = [];

        this._tfsContext = options.tfsContext || TfsContext.getDefault();

        tabs[BuildAdminControls.BuildAdminActionIds.Agents] = Agents.BuildAdminAgentsTab;
        tabs[BuildAdminControls.BuildAdminActionIds.PoolDetails] = PoolDetails.AdminPoolDetailsTab;
        tabs[BuildAdminControls.BuildAdminActionIds.PoolPolicies] = PoolPolicies.AdminPoolPoliciesTab;
        tabs[BuildAdminControls.BuildAdminActionIds.Roles] = Roles.AdminRolesTab;

        this._buildtabs.push(BuildAdminControls.BuildAdminActionIds.Agents);
        this._buildtabs.push(BuildAdminControls.BuildAdminActionIds.PoolDetails);
        this._buildtabs.push(BuildAdminControls.BuildAdminActionIds.PoolPolicies);
        this._buildtabs.push(BuildAdminControls.BuildAdminActionIds.Roles);

        super.initializeOptions($.extend({
            tabs: tabs,
            titleElementSelector: ".hub-title .label",
            hubContentSelector: ".buildvnext-admin-right-pane",
            pivotTabsSelector: ".buildvnext-admin-tabs"
        }, options));
    }

    public initialize() {
        var $leftPane: JQuery = this._element.find(".buildvnext-admin-left-pane");

        this._queuesControl = <BuildAdminControls.BuildQueuesAdminTree>Controls.Enhancement.enhance(BuildAdminControls.BuildQueuesAdminTree, $leftPane.find(".buildvnext-admin-left-pane-agentqueues"), this._options);
        this._queuesClient = Service.getApplicationClient(DistributedTaskApi.TaskAgentHttpClient2_2, this._tfsContext.contextData);

        // Set link for pool Managemenet
        this.getElement().find(".manage-pool-link").attr("href", this._tfsContext.getActionUrl("", "AgentPool", { area: "admin", project: null }));

        this._queuesControl._bind("selectionchanged", (e: JQueryEventObject) => {
            var selectedNode: any = this._queuesControl.getSelectedNode();
            if (!!selectedNode) {
                this._navigateToQueue(selectedNode.tag.id);
            }
        });

        this._queuesControl._bind("queue-deleted", (e: JQueryEventObject) => {
            this._queuesControl.refreshQueues().then(() => {
                var queues = this._queuesControl.getQueues();
                var id = null;
                if (queues.length > 0) {
                    id = queues[0].id
                }
                this._navigateToQueue(id);
            });
        });

        Controls.BaseControl.createIn(Menus.MenuBar, $leftPane.find(".buildvnext-admin-left-pane-toolbar"), {
            items: [
                {
                    id: "new-agent-pool-queue",
                    text: BuildResources.NewBuildQueue,
                    noIcon: true,
                    action: () => {

                        // Only show pools which do not already have a queue in this collection
                        var queueMap: IDictionaryNumberTo<DistributedTask.TaskAgentQueue[]> = {};
                        $.each(this._queues, (index: number, queue: DistributedTask.TaskAgentQueue) => {
                            var queues: DistributedTask.TaskAgentQueue[] = queueMap[queue.pool.id];
                            if (!queues) {
                                queues = <DistributedTask.TaskAgentQueue[]>[];
                                queueMap[queue.pool.id] = queues;
                            }

                            queues.push(queue);
                        });

                        var filteredPools: BuildAdminControls.TaskAgentPoolQueueModel[] = this._pools.map((value: DistributedTask.TaskAgentPool) => {
                            var queues: DistributedTask.TaskAgentQueue[] = queueMap[value.id];
                            return new BuildAdminControls.TaskAgentPoolQueueModel(value, queues);
                        });

                        var dialogModel: BuildAdminControls.CreateAgentPoolQueueDialogModel = new BuildAdminControls.CreateAgentPoolQueueDialogModel(
                            this._tfsContext,
                            filteredPools,
                            (newQueue: DistributedTask.TaskAgentQueue) => {
                                this._refreshBuildQueues()
                                    .then(() => {
                                        this._navigateToQueue(newQueue.id);
                                    });
                            });

                        Dialogs.show(BuildAdminControls.CreateAgentPoolQueueDialog, dialogModel);
                    }
                }
            ]
        });

        this._refreshBuildQueues().then(() => {
            super.initialize();
        });

        hookupAgentDownloadButtonOnClickHandler(this._element[0]);
    }

    public parseStateInfo(action: string, rawState: any, callback: IResultCallback) {
        if(action && this._buildtabs.indexOf(action) === -1) {
            action = undefined;
        }

        var state: any = {};

        this.setState(state);

        state.queueId = rawState.queueId;
        state.roleType = Roles.RoleType.Queue;
        state.agentId = rawState.agentId;

        if (this._queues.length === 0) {
            this.showInformationTab(BuildResources.AdminNoQueuesTitle, BuildResources.AdminNoQueuesDescription);
        }
        else if (state.queueId) {
            $.each(this._queues, (index: number, queue: DistributedTask.TaskAgentQueue) => {
                if (queue.id == state.queueId) {
                    state.queue = queue;
                    state.pool = queue.pool;
                    return false;
                }
            });

            if (!state.queue) {
                state.queueId = this._queues[0].id;
                state.queue = this._queues[0];
                state.pool = this._queues[0].pool;
            }
        } else if (this._initialLoad) {
            state.queueId = this._queues[0].id;
            state.queue = this._queues[0];
            state.pool = this._queues[0].pool;
        }

        state.action = action || BuildAdminControls.BuildAdminActionIds.Agents;

        this._initialLoad = false;

        callback(state.action, state);
    }

    public getTabVisibility(tabId: any, currentTabId: string, rawState: any, parsedState: any): boolean {
        switch (tabId) {
            case BuildAdminControls.BuildAdminActionIds.Agents:
                if (parsedState.queueId) {
                    return true;
                }
                break;
            case BuildAdminControls.BuildAdminActionIds.PoolDetails:
                if (parsedState.queueId) {
                    return true;
                }
                break;
            case BuildAdminControls.BuildAdminActionIds.PoolPolicies:
                if (parsedState.queueId) {
                    return true;
                }
                break;
            case BuildAdminControls.BuildAdminActionIds.Roles:
                return true;
        }

        return false;
    }

    public onNavigate(state: any) {
        if (this._queuesControl) {
            this._queuesControl.setSelectedQueue(state.queue);
        }

        let splitter = <Splitter.Splitter>Controls.Enhancement.getInstance(Splitter.Splitter, $(".hub-content > .splitter.horizontal"));
        if (splitter) {
            // by default fixedWidth is "left", setminWidth so that we display all the buttons all the time (like "New queue" and "Download agent" ) to avoid confusion
            splitter.setMinWidth(320);
        }

        this.setHubPivotVisibility(true);

        // regain focus on tab for accessibility
        this.getElement().find("ul.buildvnext-admin-tabs").find("li.selected a").focus();
    }

    private _navigateToQueue(queueId: number) {
        let action = this.getCurrentAction();
        let historyService = Navigation_Services.getHistoryService();
        let currentState = historyService.getCurrentState();

        if (!currentState.action) {
            // no action, initial page nav, don't add to history
            historyService.replaceHistoryPoint(action, {
                action: action,
                queueId: queueId
            });
        }
        else if (!queueId) {
            // if queueId doesn't exist, this is the root node
            action = BuildAdminControls.BuildAdminActionIds.Roles;
        }

        if (currentState.action != action || currentState.queueId != (queueId ? queueId.toString() : "")) {
            // time to add to navigation history, queue changed or action changed
            historyService.addHistoryPoint(action, {
                queueId: queueId || null
            });
        }
    }

    private _refreshBuildQueues(): IPromise<any> {
        return this._queuesControl.refreshQueues()
            .then(() => {
                this._queues = this._queuesControl.getQueues();
                this._pools = this._queuesControl.getPools();
            });
    }
}

VSS.classExtend(AgentQueuesAdminView, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(AgentQueuesAdminView, ".agentqueue-admin-view");

function getAgentPlatforms(): IDictionaryStringTo<AgentAcquisitionDialog.IAgentAcquisitionGuidance> {
    let platforms: IDictionaryStringTo<AgentAcquisitionDialog.IAgentAcquisitionGuidance> = {};
    platforms[AgentAcquisitionDialog.PackagePlatforms.Windows] = { prerequisites: "https://aka.ms/vstsagentwinsystem", createAgentScript: BuildResources.AgentAcquisitionWindowsCreateAgentMarkdownFormat, configureAgentScript: BuildResources.AgentAcquisitionWindowsConfigureAgentMarkdownFormat, runAgentScript: BuildResources.AgentAcquisitionWindowsRunAgentMarkdown, detailedInstructionsLink: "http://go.microsoft.com/fwlink/?LinkID=825113" };
    platforms[AgentAcquisitionDialog.PackagePlatforms.Linux] = { prerequisites: "https://aka.ms/vstsagentlinuxsystem", createAgentScript: BuildResources.AgentAcquisitionLinuxCreateAgentMarkdownFormat, configureAgentScript: BuildResources.AgentAcquisitionLinuxConfigureAgentMarkdownFormat, runAgentScript: BuildResources.AgentAcquisitionLinuxRunAgentMarkdown, detailedInstructionsLink: "http://go.microsoft.com/fwlink/?LinkID=825115" };
    platforms[AgentAcquisitionDialog.PackagePlatforms.Darwin] = { prerequisites: "https://aka.ms/vstsagentosxsystem", createAgentScript: BuildResources.AgentAcquisitionDarwinCreateAgentMarkdownFormat, configureAgentScript: BuildResources.AgentAcquisitionDarwinConfigureAgentMarkdownFormat, runAgentScript: BuildResources.AgentAcquisitionDarwinRunAgentMarkdown, detailedInstructionsLink: "http://go.microsoft.com/fwlink/?LinkID=825114" };

    return platforms;
}

function agentDownloadButtonEventHandler() {
    const options: AgentAcquisitionDialog.IAgentAcquisitionDialogOptions = {
        agentAcquisitionGuidances: getAgentPlatforms()
    };

    Dialogs.show(AgentAcquisitionDialog.AgentAcquisitionDialog, options);
};

function hookupAgentDownloadButtonOnClickHandler(element: HTMLElement) {
    // hook up onclick handler to button element
    const button = element.querySelector("." + agentDownloadButtonClass);
    if (!button) {
        logError(agentDownloadButtonClass + " button class is not found! Clicking Download agent button won't have onclick handler!");
        return;
    }

    button.removeEventListener("click", agentDownloadButtonEventHandler);
    button.addEventListener("click", agentDownloadButtonEventHandler);
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("AdminView", exports);