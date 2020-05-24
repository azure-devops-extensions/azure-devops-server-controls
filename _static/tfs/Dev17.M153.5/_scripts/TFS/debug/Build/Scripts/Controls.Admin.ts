/// <reference types="jquery" />

import ko = require("knockout");
import Q = require("q");

import { handleError } from "Build/Scripts/PlatformMessageHandlers";
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");

import DistributedTask = require("TFS/DistributedTask/Contracts");
import DistributedTaskApi = require("TFS/DistributedTask/TaskAgentRestClient");

import Dialogs = require("VSS/Controls/Dialogs");
import Service = require("VSS/Service");
import TreeView = require("VSS/Controls/TreeView");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { getHistoryService } from "VSS/Navigation/Services";
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

var TfsContext = TFS_Host_TfsContext.TfsContext;
var delegate = Utils_Core.delegate;
var domElem = Utils_UI.domElem;

export module BuildAdminActionIds {
    export var Agents = "agents";
    export var Roles = "roles";
    export var PoolDetails = "details";
    export var PoolMaintenance = "maintenance";
    export var PoolPolicies = "policies";
    export var PoolSettings = "poolsettings";
    export var Settings = "settings";
    export var ResourceLimits = "resourceLimits";
}

export class AgentUtilities {
    public static formatGroupDisplayName(name: string): string {
        // remove "[ ]\" from the front of the string
        return name.replace(/^\[.+\]\\/, "");
    }
}

export interface BuildAdminTreeOptions extends TreeView.ITreeOptions {
    tfsContext: TFS_Host_TfsContext.TfsContext;
}

export class AgentPoolsAdminTree extends TreeView.TreeViewO<BuildAdminTreeOptions> {
    private _taskAgentPools: DistributedTask.TaskAgentPool[];
    private _taskAgentPoolMap: IDictionaryNumberTo<DistributedTask.TaskAgentPool>;
    private _taskAgentClouds: DistributedTask.TaskAgentCloud[];
    private _poolClient: DistributedTaskApi.TaskAgentHttpClient;
    private _selectedPoolIdId: number;
    private _allPoolsNode: TreeView.TreeNode;

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "buildvnext-agentpools-tree",
            contextMenu: {
                executeAction: delegate(this, this._onMenuItemClick),
                "arguments": (contextInfo) => {
                    return {
                        node: contextInfo.item
                    };
                }
            },
            useArrowKeysForNavigation: true,
            setTitleOnlyOnOverflow: true,
            useBowtieStyle: true
        }, options));
    }

    public initialize() {
        super.initialize();

        this._taskAgentPoolMap = {};

        var tfsContext: TFS_Host_TfsContext.TfsContext = this._options.tfsContext || TfsContext.getDefault();
        this._poolClient = Service.getClient(DistributedTaskApi.TaskAgentHttpClient, tfsContext.contextData);

        this._bind("selectionchanged", delegate(this, this._onSelectionChanged));
    }

    private _onSelectionChanged(e: JQueryEventObject) {
        var selectedNode: any = this.getSelectedNode();
        if (!selectedNode.tag) {
            this._selectedPoolIdId = null;
            return;
        }

        this._selectedPoolIdId = selectedNode.tag.id;
    }

    private _setTaskAgentPools(pools: DistributedTask.TaskAgentPool[], agentClouds?: DistributedTask.TaskAgentCloud[]) {
        // sort agent pools
        var sortedtaskAgentPools: DistributedTask.TaskAgentPool[] = [].concat(<any[]>pools);
        sortedtaskAgentPools.sort((a: DistributedTask.TaskAgentPool, b: DistributedTask.TaskAgentPool) => {
            return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
        });

        this._taskAgentPools = sortedtaskAgentPools;

        if(agentClouds)
        {
            var sortedTaskAgentClouds: DistributedTask.TaskAgentCloud[] = [].concat(<any[]>agentClouds);
            sortedTaskAgentClouds.sort((a: DistributedTask.TaskAgentCloud, b: DistributedTask.TaskAgentCloud) => {
                return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
            });

            this._taskAgentClouds = sortedTaskAgentClouds;
        }
        
        // map agent pools by id
        var taskAgentPoolMap: IDictionaryNumberTo<DistributedTask.TaskAgentPool> = {};
        $.each(pools, (index: number, taskAgentPool: DistributedTask.TaskAgentPool) => {
            taskAgentPoolMap[taskAgentPool.id] = taskAgentPool;
        });
        this._taskAgentPoolMap = taskAgentPoolMap;

        // Empty the root node children first
        this.rootNode.clear();

        this._allPoolsNode = this._createRootNode();
        this.rootNode.add(this._allPoolsNode);

        $.each(sortedtaskAgentPools, (index: number, pool: DistributedTask.TaskAgentPool) => {
            var taskAgentPool: DistributedTask.TaskAgentPool = taskAgentPoolMap[pool.id];
            if (!!taskAgentPool) {
                var poolNode = this._createAgentPoolNode(pool);
                this._allPoolsNode.add(poolNode);
            }
        });

        // handle selected pool
        if (!!this._selectedPoolIdId) {
            this.setSelectedNode(this._findNode(this._selectedPoolIdId));
        }

        this._draw();
    }

    /**
     * Refreshes the list of agent pools
     */
    public refreshPools(): IPromise<any> {
        
        const AgentCloudsEnabled : boolean = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.DistributedAgentClouds, false); 
        
        if(AgentCloudsEnabled)
        {
            // wait for both promises to complete. results are { result, status, xhr }
            return Q.all([this._poolClient.getAgentPools(), this._poolClient.getAgentClouds()])
            .spread((pools: DistributedTask.TaskAgentPool[], agentClouds : DistributedTask.TaskAgentCloud[]) => {
                this._setTaskAgentPools(pools, agentClouds);
            });
        }
        else {
            return this._poolClient.getAgentPools().then((pools: DistributedTask.TaskAgentPool[]) => {
                this._setTaskAgentPools(pools);
                return pools;
            });
        }
        
    }

    /**
     * Gets the agent pool map
     */
    public getTaskAgentPoolMap(): IDictionaryNumberTo<DistributedTask.TaskAgentPool> {
        return this._taskAgentPoolMap;
    }

    /**
     * Gets the list of agent pools
     */
    public getPools(): DistributedTask.TaskAgentPool[] {
        return this._taskAgentPools;
    }

    /**
     * Gets the list of agent clouds
     */
    public getAgentClouds(): DistributedTask.TaskAgentCloud[] {
        return this._taskAgentClouds;
    }

    /**
     * Gets the build queue represented by the selected node
     */
    public getSelectedBuildQueue(): DistributedTask.TaskAgentPool {
        var selectedNode = this.getSelectedNode();
        return selectedNode ? <DistributedTask.TaskAgentPool>selectedNode.tag : null;
    }

    /**
     * Sets the selected build queue or security group
     * @param buildQueue The build queue to select
     * @param group The security group to select
     */
    public setSelectedPool(pool: DistributedTask.TaskAgentPool) {
        var node: TreeView.TreeNode;
        var currentSelectedPool: DistributedTask.TaskAgentPool;

        if (!pool) {
            // no build queue specified. select the first one
            this.setSelectedNode(this._allPoolsNode);
        }
        else {
            currentSelectedPool = this.getSelectedBuildQueue();
            if (!currentSelectedPool || currentSelectedPool.id !== pool.id) {
                node = this._findNode(pool.id);
                if (!!node) {
                    this.setSelectedNode(node);
                    this._selectedPoolIdId = pool.id;
                }
            }
        }
    }

    private _findNode(buildQueueId: number): TreeView.TreeNode {
        var result: TreeView.TreeNode = null;

        Utils_UI.walkTree.call(this.rootNode, (treeNode: TreeView.TreeNode) => {
            var nodeInfo: DistributedTask.TaskAgentQueue;
            if (!result && treeNode.tag) {
                nodeInfo = <DistributedTask.TaskAgentQueue>treeNode.tag;
                if (!!buildQueueId) {
                    if (nodeInfo.id === buildQueueId) {
                        result = treeNode;
                    }
                }
                else {
                    // root
                    if (!treeNode.tag) {
                        result = treeNode;
                    }
                }
            }
        });

        return result;
    }

    private _createRootNode() {
        var tfsContext: TFS_Host_TfsContext.TfsContext = this._options.tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();
        var node = TreeView.TreeNode.create(BuildResources.AllPools);
        node.tag = {
            accountId: tfsContext.navigation.applicationServiceHost.instanceId
        };
        node.expanded = true;
        node.folder = false;
        node.noContextMenu = true;
        return node;
    }

    private _createAgentPoolNode(pool: DistributedTask.TaskAgentPool): TreeView.TreeNode {
        var node = TreeView.TreeNode.create(pool.name, {
            css: "agentpool-node"
        });

        node.tag = pool;

        // TODO: pool icon
        node.icon = "icon icon-tfs-build-status-queued";
        node.folder = false;

        return node;
    }

    public onShowPopupMenu(node, options?) {
        var menuItems: any[] = [];

        var tag = null;
        if (node.tag) {
            tag = node.tag;
        }
        // Currently, property - size is used to differentiate between pool and it's groups
        // push deletepool only for the pool node
        if (tag && typeof (tag.size) !== "undefined") {

            var currentPool: DistributedTask.TaskAgentPool = <DistributedTask.TaskAgentPool>tag;
            if (!currentPool.isHosted) {
                menuItems.push({
                    id: "refresh-pool",
                    icon: "icon-refresh",
                    text: BuildResources.RefreshPoolMenuItemText
                });
                menuItems.push({
                    id: "maintain-pool",
                    icon: "icon-queue-build",
                    text: BuildResources.PoolMaintenanceMenuItemText
                });
                menuItems.push({
                    id: "auto-provision-pool",
                    icon: currentPool.autoProvision ? "icon-tick" : null,
                    text: BuildResources.AutoProvisionMenuItemText
                });
                menuItems.push({
                    id: "delete-pool",
                    icon: "icon-delete",
                    text: BuildResources.DeleteQueueMenuItemText
                });
            }
        }
        super.onShowPopupMenu(node, $.extend({}, options, { items: menuItems }));
    }

    private _onMenuItemClick(e?: any): any {
        var command = e.get_commandName(),
            node = e.get_commandArgument().node;
        var pool: DistributedTask.TaskAgentPool = null;
        if (node.tag) {
            pool = node.tag;
        }

        switch (command) {
            case "delete-pool":
                if (pool) {
                    var title = Utils_String.localeFormat(BuildResources.ConfirmDeletePool, pool.name);
                    if (window.confirm(title)) {
                        this._poolClient.deleteAgentPool(pool.id).then(() => {
                            this._fire("pool-deleted");
                        }, handleError);
                    }
                }
                break;
            case "refresh-pool":
                if (pool) {
                    var title = Utils_String.localeFormat(BuildResources.ConfirmRefreshPool, pool.name);
                    if (window.confirm(title)) {
                        this._poolClient.refreshAgents(pool.id).then(() => {
                            this._fire("pool-refreshed");
                        }, handleError);
                    }
                }
                break;
            case "maintain-pool":
                if (pool) {
                    Dialogs.show(TaskAgentPoolMaintenanceConfirmationDialog, {
                        pool: pool,
                        successCallback: () => {
                            this._poolClient.getAgentPoolMaintenanceDefinitions(pool.id).
                                then((definitions: DistributedTask.TaskAgentPoolMaintenanceDefinition[]) => {
                                    if (definitions && definitions.length > 0) {
                                        let maintenanceJob = {
                                            pool: {
                                                id: pool.id
                                            },
                                            definitionId: definitions[0].id,
                                        } as DistributedTask.TaskAgentPoolMaintenanceJob;

                                        this._poolClient.queueAgentPoolMaintenanceJob(maintenanceJob, pool.id).then(() => {
                                            this._fire("pool-maintenanceJobQueued");
                                            let navigationService = getHistoryService();
                                            let currentState = navigationService.getCurrentState();
                                            if (currentState.action !== BuildAdminActionIds.PoolMaintenance) {
                                                navigationService.addHistoryPoint(BuildAdminActionIds.PoolMaintenance, currentState);
                                            }
                                        }, handleError);
                                    }
                                    else {
                                        handleError({ message: Utils_String.format(BuildResources.EnableMaintenanceSettingMessage, pool.name) } as TfsError);
                                    }
                                }, handleError)
                        }
                    });
                }
                break;
            case "auto-provision-pool":
                if (pool) {
                    var poolForUpdate = <DistributedTask.TaskAgentPool>{
                        id: pool.id,
                        name: pool.name,
                        autoProvision: !pool.autoProvision
                    };

                    this._poolClient.updateAgentPool(poolForUpdate, pool.id).then(() => {
                        pool.autoProvision = poolForUpdate.autoProvision;
                        this._fire("pool-auto-provision-changed");
                    }, handleError);
                }
                break;
        }
    }
}

export class TaskAgentPoolMaintenanceConfirmationDialog extends Dialogs.ConfirmationDialogO<TaskAgentPoolDialogOptions> {

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            title: Utils_String.localeFormat(BuildResources.ConfirmMaintainPool, options.pool.name),
            okText: "Ok",
            resizable: true,
            height: 150
        }, options));
    }

    public initialize() {
        var confirmationMessage = `<div id="confirmation-message"> <strong>` + Utils_String.localeFormat(BuildResources.ConfirmMaintainPool, this._options.pool.name) + `</strong> </div>`;
        this._element.html(Utils_String.format(confirmationMessage, Utils_String.htmlEncode(this._options.pool.name)));
        super.initialize();
    }

    public onOkClick(e?: JQueryEventObject): any {
        this._options.successCallback();
        super.close();
    }
}

export interface TaskAgentPoolDialogOptions extends Dialogs.IConfirmationDialogOptions {
    pool: DistributedTask.TaskAgentPool;
}

export class BuildQueuesAdminTree extends TreeView.TreeViewO<BuildAdminTreeOptions> {
    private _pools: DistributedTask.TaskAgentPool[];
    private _queues: DistributedTask.TaskAgentQueue[];
    private _poolClient: DistributedTaskApi.TaskAgentHttpClient;
    private _queueClient: DistributedTaskApi.TaskAgentHttpClient;
    private _selectedQueueId: number;
    private _allQueuesNode: TreeView.TreeNode;
    private _projectId: string;

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "buildvnext-agentpools-tree",
            contextMenu: {
                executeAction: delegate(this, this._onMenuItemClick),
                "arguments": (contextInfo) => {
                    return {
                        node: contextInfo.item
                    };
                }
            },
            useArrowKeysForNavigation: true,
            setTitleOnlyOnOverflow: true,
            useBowtieStyle: true
        }, options));
    }

    public initialize() {
        super.initialize();

        this._pools = [];
        this._queues = [];

        var tfsContext: TFS_Host_TfsContext.TfsContext = this._options.tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();
        this._poolClient = Service.getApplicationClient(DistributedTaskApi.TaskAgentHttpClient, tfsContext.contextData);
        this._queueClient = Service.getCollectionClient(DistributedTaskApi.TaskAgentHttpClient, tfsContext.contextData);
        if (tfsContext.contextData.project) {
            this._projectId = tfsContext.contextData.project.id;
        }

        this._bind("selectionchanged", delegate(this, this._onSelectionChanged));
    }

    private _onSelectionChanged(e: JQueryEventObject) {
        var selectedNode: any = this.getSelectedNode();
        if (!!selectedNode.tag.isContainer) {
            this._selectedQueueId = null;
        }
        else {
            this._selectedQueueId = selectedNode.tag.id;
        }
    }

    private _setQueues(queues: DistributedTask.TaskAgentQueue[], pools: DistributedTask.TaskAgentPool[]) {
        // sort agent pools
        var sortedPools: DistributedTask.TaskAgentPool[] = [].concat(<any[]>pools);
        sortedPools.sort((a: DistributedTask.TaskAgentPool, b: DistributedTask.TaskAgentPool) => {
            return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
        });

        // sort build queues
        var sortedQueues: DistributedTask.TaskAgentQueue[] = [].concat(<any[]>queues);
        sortedQueues.sort((a: DistributedTask.TaskAgentQueue, b: DistributedTask.TaskAgentQueue) => {
            return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
        });

        this._queues = sortedQueues;
        this._pools = sortedPools;

        this.rootNode.clear();
        this._allQueuesNode = this._createRootNode();
        this.rootNode.add(this._allQueuesNode);

        $.each(sortedQueues, (index: number, queue: DistributedTask.TaskAgentQueue) => {
            var queueNode = this._createQueueNode(queue);
            this._allQueuesNode.add(queueNode);
        });

        // handle selected queue
        if (!!this._selectedQueueId) {
            this.setSelectedNode(this._findNode(this._selectedQueueId));
        }

        this._draw();
    }

    private _createRootNode() {
        var tfsContext: TFS_Host_TfsContext.TfsContext = this._options.tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();
        var node = TreeView.TreeNode.create(BuildResources.AllQueues);
        node.tag = {
            collectionId: tfsContext.navigation.collection.instanceId
        };
        node.expanded = true;
        node.folder = false;
        node.noContextMenu = true;
        return node;
    }

    /**
     * Refreshes the list of agent pool queues
     */
    public refreshQueues(): IPromise<any> {
        // wait for both promises to complete. results are { result, status, xhr }
        return Q.all([this._queueClient.getAgentQueues(this._projectId), this._poolClient.getAgentPools()])
            .spread((queues: DistributedTask.TaskAgentQueue[], pools: DistributedTask.TaskAgentPool[]) => {
                this._setQueues(queues, pools);
            });
    }

    /**
     * Gets the list of agent pools
     */
    public getPools(): DistributedTask.TaskAgentPool[] {
        return this._pools;
    }

    /**
     * Gets the list of build queues
     */
    public getQueues(): DistributedTask.TaskAgentQueue[] {
        return this._queues;
    }

    /**
     * Gets the build queue represented by the selected node
     */
    public getSelectedQueue(): DistributedTask.TaskAgentQueue {
        var selectedNode = this.getSelectedNode();
        return selectedNode ? <DistributedTask.TaskAgentQueue>selectedNode.tag : null;
    }

    /**
     * Sets the selected build queue or security group
     * @param buildQueue The build queue to select
     * @param group The security group to select
     */
    public setSelectedQueue(queue: DistributedTask.TaskAgentQueue) {
        var node: TreeView.TreeNode;
        var currentSelectedQueue: DistributedTask.TaskAgentQueue;

        if (!queue) {
            // no build queue specified. select the first one
            this.setSelectedNode(this._allQueuesNode);
        }
        else {
            currentSelectedQueue = this.getSelectedQueue();
            if (!currentSelectedQueue || currentSelectedQueue.id !== queue.id) {
                node = this._findNode(queue.id);
                if (!!node) {
                    this.setSelectedNode(node);
                    this._selectedQueueId = queue.id;
                }
            }
        }
    }

    private _findNode(queueId: number): TreeView.TreeNode {
        var result: TreeView.TreeNode = null;

        Utils_UI.walkTree.call(this.rootNode, (treeNode: TreeView.TreeNode) => {
            var nodeInfo: DistributedTask.TaskAgentQueue;
            if (!result && treeNode.tag) {
                nodeInfo = <DistributedTask.TaskAgentQueue>treeNode.tag;
                if (!!queueId) {
                    if (nodeInfo.id === queueId) {
                        result = treeNode;
                    }
                }
                else {
                    // root
                    if (!treeNode.tag) {
                        result = treeNode;
                    }
                }
            }
        });

        return result;
    }

    private _createQueueNode(queue: DistributedTask.TaskAgentQueue): TreeView.TreeNode {
        var node = TreeView.TreeNode.create(Utils_String.format(BuildResources.AdminAgentPoolQueueNodeFormat, queue.name, queue.pool.name), {
            css: "agentpool-node"
        });

        node.tag = queue;
        node.icon = "icon icon-tfs-build-status-queued";
        node.folder = false;

        return node;
    }

    public onShowPopupMenu(node, options?) {
        var menuItems: any[] = [];

        menuItems.push({
            id: "refresh-queue",
            icon: "icon-refresh",
            text: BuildResources.RefreshQueueMenuItemText
        });
        menuItems.push({
            id: "delete-queue",
            icon: "icon-delete",
            text: BuildResources.DeleteQueueMenuItemText
        });
        super.onShowPopupMenu(node, $.extend({}, options, { items: menuItems }));
    }

    private _onMenuItemClick(e?: any): any {
        var command = e.get_commandName(),
            node = e.get_commandArgument().node;
        var queue: DistributedTask.TaskAgentQueue = null;
        if (node.tag) {
            queue = node.tag;
        }
        switch (command) {
            case "delete-queue":
                if (queue) {
                    var title = Utils_String.localeFormat(BuildResources.ConfirmDeleteQueue, queue.name);
                    if (window.confirm(title)) {
                        this._queueClient.deleteAgentQueue(queue.id, this._projectId).then(() => {
                            this._fire("queue-deleted");
                        }, handleError);
                    }
                }
                break;
            case "refresh-queue":
                if (queue) {
                    var title = Utils_String.localeFormat(BuildResources.ConfirmRefreshQueue, queue.name);
                    if (window.confirm(title)) {
                        this._poolClient.refreshAgents(queue.pool.id).then(() => {
                            this._fire("queue-refreshed");
                        }, handleError);
                    }
                }
                break;
        }
    }
}

VSS.classExtend(BuildQueuesAdminTree, TfsContext.ControlExtensions);

class AdminOption {
    public text: string;
    public value: boolean;
    public originalValue: boolean;
    public key: string;

    constructor(context: any) {
        this.text = context.text;
        this.value = context.value;
        this.originalValue = context.value;
        this.key = context.key;
    }
}

export class CreateAgentPoolDialogModel {
    public tfsContext: TFS_Host_TfsContext.TfsContext;
    public dialogTemplate: string = "create_agent_pool_dialog";
    public okCallback: (newPool: DistributedTask.TaskAgentPool) => void;
    public useAgentCloud: KnockoutComputed<boolean>;
    public createMode: KnockoutObservable<string> = ko.observable("private");
    public agentClouds: KnockoutObservableArray<DistributedTask.TaskAgentCloud> = ko.observableArray(<DistributedTask.TaskAgentCloud[]>[]);
    public selectedAgentCloud: KnockoutObservable<DistributedTask.TaskAgentCloud> = ko.observable(null);
    public authorizeAllPipelines: KnockoutObservable<boolean> = ko.observable(true);
    public showPipelineAuthorization: KnockoutComputed<boolean>;

    public poolName: KnockoutObservable<string> = ko.observable("");
    public autoProvision: KnockoutObservable<boolean> = ko.observable(true);

    constructor(tfsContext: TFS_Host_TfsContext.TfsContext, agentClouds: DistributedTask.TaskAgentCloud[], okCallback?: (newPool: DistributedTask.TaskAgentPool) => void) {
        this.tfsContext = tfsContext;
        this.okCallback = okCallback;

        this.useAgentCloud = ko.computed({
            read: () => {
                return this.createMode() === "agentcloud";
            }
        });

        this.showPipelineAuthorization = ko.computed(() => {
            const autoProvision: boolean = this.autoProvision();
            if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.ResourceAuthorizationExperience, false)) {
                return autoProvision;
            }
            else {
                return false;
            }
        });

        this.agentClouds(agentClouds);
    }
}

export class TaskAgentPoolQueueModel {
    public queues: DistributedTask.TaskAgentQueue[];
    public pool: DistributedTask.TaskAgentPool;
    public displayName: String;
    public hasQueues: Boolean;

    constructor(pool: DistributedTask.TaskAgentPool, queues: DistributedTask.TaskAgentQueue[]) {
        this.pool = pool;
        this.queues = queues;
        this.hasQueues = !!this.queues && this.queues.length > 0;

        if (!this.queues || this.queues.length == 0) {
            this.displayName = this.pool.name;
        } else if (this.queues.length == 1) {
            this.displayName = Utils_String.format(BuildResources.TaskAgentPoolDisplayNameFormat, pool.name, queues[0].name);
        } else {
            this.displayName = Utils_String.format(BuildResources.TaskAgentPoolDisplayNameMultiFormat, pool.name, queues[0].name, queues.length - 1);
        }
    }
}

export class CreateAgentPoolQueueDialogModel {
    public tfsContext: TFS_Host_TfsContext.TfsContext;
    public dialogTemplate: string = "create_agent_pool_queue_dialog";
    public okCallback: (newQueue: DistributedTask.TaskAgentQueue) => void;

    public useExistingPool: KnockoutComputed<boolean>;
    public pools: KnockoutObservableArray<TaskAgentPoolQueueModel> = ko.observableArray(<TaskAgentPoolQueueModel[]>[]);
    public hasUnassignedPools: KnockoutObservable<boolean> = ko.observable(true);
    public queueName: KnockoutObservable<string> = ko.observable(null);
    public createMode: KnockoutObservable<string> = ko.observable("existing");
    public selectedPool: KnockoutObservable<TaskAgentPoolQueueModel> = ko.observable(null);
    public authorizeAllPipelines: KnockoutObservable<boolean> = ko.observable(true);
    public resourceAuthorizationFeatureEnabled: KnockoutComputed<boolean>;

    constructor(tfsContext: TFS_Host_TfsContext.TfsContext, pools: TaskAgentPoolQueueModel[], okCallback?: (newQueue: DistributedTask.TaskAgentQueue) => void) {
        this.tfsContext = tfsContext;

        this.useExistingPool = ko.computed({
            read: () => {
                return this.createMode() === "existing";
            }
        });

        this.resourceAuthorizationFeatureEnabled = ko.computed(() => {
            return FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.ResourceAuthorizationExperience, false);
        });

        var anyUnassignedPools = pools.some((value: TaskAgentPoolQueueModel, index: number, array: TaskAgentPoolQueueModel[]) => {
            return !value.hasQueues;
        });

        if (!anyUnassignedPools) {
            this.createMode("new");
            this.hasUnassignedPools(false);
        }

        var sortedPools = pools.sort((a, b) => {
            if (a.hasQueues && !b.hasQueues) {
                return 1;
            } else if (!a.hasQueues && b.hasQueues) {
                return -1;
            } else {
                return Utils_String.ignoreCaseComparer(a.pool.name, b.pool.name);
            }
        });

        this.pools(sortedPools);
        this.okCallback = okCallback;
    }
}

export class BuildAdminDialog extends Dialogs.ModalDialog {
    private _$errorContainer: JQuery;

    constructor(model: any) {
        super(model);
    }

    public initialize(): void {
        super.initialize();

        this._$errorContainer = $(domElem('div')).addClass('confirmation-dialog-error').prependTo(this.getElement()).hide();
    }

    protected setError(message: string): void {
        if (message) {
            this._$errorContainer.text(message).show();
        }
        else {
            this._$errorContainer.hide();
        }
    }
}

export class CreateAgentPoolDialog extends BuildAdminDialog {
    private _model: CreateAgentPoolDialogModel;
    private _poolClient: DistributedTaskApi.TaskAgentHttpClient;

    private _$template: JQuery;
    private _$poolName: JQuery;

    constructor(model: CreateAgentPoolDialogModel) {
        super(model);

        this._model = model;
        this._model.poolName.subscribe((newValue: string) => {
            this.updateOkButton(!!newValue);
        });
    }

    public initialize() {
        super.initialize();

        this._poolClient = Service.getApplicationClient(DistributedTaskApi.TaskAgentHttpClient, this._model.tfsContext.contextData);

        this._$template = TFS_Knockout.loadHtmlTemplate(this._model.dialogTemplate);

        this._element.append(this._$template);

        ko.applyBindings(this._model, this._$template[0]);

        this._$poolName = this._$template.find("#poolName");

        this.updateOkButton(!!this._$poolName.val());
    }

    public getTitle(): string {
        return BuildResources.CreatePoolDialogTitle;
    }

    public onOkClick() {
        this.updateOkButton(false);

        var newPool: DistributedTask.TaskAgentPool;
        if (this._model.createMode() === "private") {
            newPool = <DistributedTask.TaskAgentPool>{
                name: this._model.poolName(),
                autoProvision: this._model.autoProvision()
            };
        }
        else {
            newPool = <DistributedTask.TaskAgentPool>{
                name: this._model.poolName(),
                autoProvision: this._model.autoProvision(),
                agentCloudId: this._model.selectedAgentCloud().agentCloudId
            };
        }

        const authorizeAllPipelines: boolean = this._model.showPipelineAuthorization.peek() ? this._model.authorizeAllPipelines.peek() : false;
        if (authorizeAllPipelines) {
            newPool.properties = { "System.AutoAuthorize": true };
        }

        var promise = <Q.Promise<DistributedTask.TaskAgentPool>>this._poolClient.addAgentPool(newPool);

        promise.then(
            (createdPool: DistributedTask.TaskAgentPool) => {
                if ($.isFunction(this._options.okCallback)) {
                    this._options.okCallback(createdPool);
                }

                this.close();
            }, (err: Error) => {
                this.setError(err.message);
            });
    }

    public dispose() {
        super.dispose();
    }
}

// show with ControlsCommon.Dialog.show(CreateAgentPoolQueueDialog, model)
export class CreateAgentPoolQueueDialog extends BuildAdminDialog {
    private _model: CreateAgentPoolQueueDialogModel;
    private _queueClient: DistributedTaskApi.TaskAgentHttpClient;
    private _projectId: string;
    private _$template: JQuery;

    constructor(model: CreateAgentPoolQueueDialogModel) {
        super(model);

        this._model = model;

        this._model.queueName.subscribe((newValue: string) => {
            this.updateOkButton(newValue && newValue.length > 0);
        });

        this._model.selectedPool.subscribe((newValue: TaskAgentPoolQueueModel) => {
            this.updateOkButton(!!newValue && !newValue.hasQueues);
        });
    }

    public initialize() {
        super.initialize();

        this._queueClient = Service.getCollectionClient(DistributedTaskApi.TaskAgentHttpClient, this._model.tfsContext.contextData);
        if (this._model.tfsContext.contextData.project) {
            this._projectId = this._model.tfsContext.contextData.project.id;
        }
        this._$template = TFS_Knockout.loadHtmlTemplate(this._model.dialogTemplate);

        this._element.append(this._$template);

        ko.applyBindings(this._model, this._$template[0]);

        if (this._model.createMode() == "new") {
            var queueName = this._model.queueName();
            this.updateOkButton(queueName && queueName.length > 0);
        }
        else {
            var selectedPool = this._model.selectedPool();
            this.updateOkButton(selectedPool && !selectedPool.hasQueues);
        }
    }

    public getTitle(): string {
        return BuildResources.CreateQueueDialogTitle;
    }

    public onOkClick() {
        this.updateOkButton(false);

        var newQueue: DistributedTask.TaskAgentQueue;
        if (this._model.createMode() === "new") {
            newQueue = <DistributedTask.TaskAgentQueue>{
                name: this._model.queueName()
            };
        }
        else {
            newQueue = <DistributedTask.TaskAgentQueue>{
                name: this._model.selectedPool().pool.name,
                pool: <DistributedTask.TaskAgentPoolReference>{
                    id: this._model.selectedPool().pool.id
                },
            };
        }

        var authorizeAllPipelines: boolean = this._model.resourceAuthorizationFeatureEnabled.peek() ? this._model.authorizeAllPipelines.peek() : false;
        var promise = <Q.Promise<DistributedTask.TaskAgentQueue>>this._queueClient.addAgentQueue(newQueue, this._projectId, authorizeAllPipelines);

        promise.then(
            (createdQueue: DistributedTask.TaskAgentQueue) => {
                if ($.isFunction(this._options.okCallback)) {
                    this._options.okCallback(createdQueue);
                }

                this.close();
            }, (err: Error) => {
                this.setError(err.message);
            });
    }

    public dispose() {
        super.dispose();
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Controls.Admin", exports);
