/// <reference types="jquery" />

import ko = require("knockout");
import Q = require("q");

import BaseDefinitionModel = require("Build/Scripts/BaseDefinitionModel");
import BuildDefinitionModel = require("Build/Scripts/BuildDefinitionModel");
import BuildDefinitionViewModel = require("Build/Scripts/BuildDefinitionViewModel");
import BuildVariables = require("Build/Scripts/Common.Variables");
import * as Constants from "Build/Scripts/Constants";
import QueueDefinitionDialog = require("Build/Scripts/Controls.QueueDefinitionDialog");
import XamlBuildControls = require("Build/Scripts/Controls.Xaml");
import DefinitionManager = require("Build/Scripts/DefinitionManager");
import DemandViewModel = require("Build/Scripts/DemandViewModel");
import HostedImagesCache = require("Build/Scripts/HostedImagesCache");
import SourceOptions = require("Build/Scripts/IQueueDialogSourceOptions");
import BuildDetailsViewModel = require("Build/Scripts/Models.BuildDetailsViewModel");
import TimelineRecordViewModel = require("Build/Scripts/Models.TimelineRecordViewModel");
import TimelineViewModel = require("Build/Scripts/Models.TimelineViewModel");
import SourceProviderManager = require("Build/Scripts/SourceProviderManager");
import { TestManagementClient } from "Build/Scripts/TestManagementClient";
import * as Utils from "Build/Scripts/Utilities/Utils";
import ViewsCommon = require("Build/Scripts/Views.Common");
import XamlDefinitionModel = require("Build/Scripts/XamlDefinitionModel");

import BuildClient = require("Build.Common/Scripts/Api2.2/ClientServices");
import { BuildHttpClient as XamlBuildHttpClient } from "Build.Common/Scripts/Generated/TFS.Build.Xaml.WebApi";
import { IBuildClient } from "Build.Common/Scripts/IBuildClient";
import { BuildActions, BuildLinks, DesignerActions, ExplorerActions } from "Build.Common/Scripts/Linking";

import KnockoutPivot = require("DistributedTasksCommon/TFS.Knockout.HubPageExplorerPivot");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Service = require("Presentation/Scripts/TFS/TFS.Service");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

import BuildContracts = require("TFS/Build/Contracts");
import DistributedTask = require("TFS/DistributedTask/Contracts");
import { TaskAgentHttpClient } from "TFS/DistributedTask/TaskAgentRestClient";
import { TaskHttpClient } from "TFS/DistributedTask/TaskRestClient";

import Dialogs = require("VSS/Controls/Dialogs");
import Events_Action = require("VSS/Events/Action");
import FeatureAvailability = require("VSS/FeatureAvailability/Services");
import Navigation_Services = require("VSS/Navigation/Services");
import Performance = require("VSS/Performance");
import Service = require("VSS/Service");
import Utils_Core = require("VSS/Utils/Core");
import VSS = require("VSS/VSS");

export interface IHideSectionEventPayload {
    id: string;
    value: boolean;
}

export class BuildSummaryViewEvents {
    public static HideSection: string = "hideSection";
}

export class BuildExplorerActionIds {
    public static Queued: string = "queued";
    public static Completed: string = "completed";
    public static Deleted: string = "deleted";
}

export class BuildExplorerTreeIds {
    public static Definitions: string = "definitions";
    public static Nodes: string = "nodes";
}

export let vssLWPPageContext: Object = null;
export function setVssLWPPageContext(context: Object) {
    vssLWPPageContext = context;
}

export class ViewContext {
    /**
     * The TfsContext
     */
    public tfsContext: TFS_Host_TfsContext.TfsContext;

    /**
     * The build definition manager
     */
    public buildDefinitionManager: DefinitionManager.BuildDefinitionManager;

    /**
     * The Build client service
     */
    public buildClient: IBuildClient;

    /**
     * The application-level task agent client
     */
    public applicationTaskAgentClient: TaskAgentHttpClient;

    /**
     * The collection-level task agent client
     */
    public collectionTaskAgentClient: TaskAgentHttpClient;

    /**
     * The task client
     */
    public taskClient: TaskHttpClient;

    /**
     * The test management client
     */
    public testManagementClient: TestManagementClient;

    /**
     * The definition cache
     */
    public definitionCache: BuildClient.DefinitionCache;

    /**
     * The queue cache
     */
    public queueCache: BuildClient.QueueCache;

    /**
     * Available xaml qualities
     */
    public xamlQualities: KnockoutObservable<string[]> = ko.observable([]);

    /**
     * The source provider manager
     */
    public sourceProviderManager: SourceProviderManager.SourceProviderManager;

    /**
     * Flash message to display in the hub, keep the message simple and sweet :)
     * currently only 1-2 lines is supported
     */
    public flashMessage: KnockoutObservable<string> = ko.observable("");

    /**
     * Tags
     */
    public tags: KnockoutObservableArray<string> = ko.observableArray([]);

    /*
    * Hosted Image Cache
    */
    public hostedImagesCache: HostedImagesCache.HostedImagesCache;

    private _repoFactoriesPromise: IPromise<any>;
    private _queuesPromise: IPromise<any>;
    private _projectInfoPromise: IPromise<any>;
    private _poolsPromise: IPromise<any>;
    private _machineManagementImagesPromise: IPromise<any>;
    private _viewDefinitionAction: (definitionId: number) => void;
    private _editDefinitionAction: (definitionId: number) => void;
    private _showAddTaskDialog: (definitionId: number, addTask: string) => void;

    constructor(tfsContext: TFS_Host_TfsContext.TfsContext, sourceProviderManager: SourceProviderManager.SourceProviderManager, buildDefinitionManager: DefinitionManager.BuildDefinitionManager, buildClient: IBuildClient, xamlClient: XamlBuildHttpClient, viewDefinitionAction?: (definitionId: number) => void, editDefinitionAction?: (definitionId: number) => void, showAddTaskDialog?: (definitionId: number, addTask: string) => void) {
        this.tfsContext = tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();
        this.sourceProviderManager = sourceProviderManager;
        this.buildDefinitionManager = buildDefinitionManager;
        this.buildClient = buildClient;
        this.applicationTaskAgentClient = TFS_OM_Common.Application.getConnection(tfsContext).getHttpClient<TaskAgentHttpClient>(TaskAgentHttpClient);
        this.collectionTaskAgentClient = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getHttpClient<TaskAgentHttpClient>(TaskAgentHttpClient);
        this.taskClient = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getHttpClient<TaskHttpClient>(TaskHttpClient);
        this.definitionCache = buildDefinitionManager.definitionCache;
        this.queueCache = buildDefinitionManager.queueCache;
        this._viewDefinitionAction = viewDefinitionAction;
        this._editDefinitionAction = editDefinitionAction;
        this._showAddTaskDialog = showAddTaskDialog;
        this.hostedImagesCache = buildDefinitionManager.hostedImagesCache;

        this.testManagementClient = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<TestManagementClient>(TestManagementClient);

        if (xamlClient) {
            xamlClient.getQualities(this.tfsContext.contextData.project.id).then((qualities: any[]) => {
                this.xamlQualities(qualities);
            });
        }
    }

    public viewDefinition(definitionId: number): void {
        if ($.isFunction(this._viewDefinitionAction)) {
            this._viewDefinitionAction(definitionId);
        }
        else {
            let state = {
                definitionId: definitionId,
                buildId: null
            };

            Navigation_Services.getHistoryService().addHistoryPoint(BuildExplorerActionIds.Completed, state);
        }
    }

    public editDefinition(definitionId: number): void {
        const editDefinitionUrl = BuildLinks.getEditDefinitionUrl(definitionId);
        if (editDefinitionUrl) {
            Utils.openUrl(editDefinitionUrl);
        }
    }

    public showAddTaskDialog(definitionId: number, addTask: string): void {
        if ($.isFunction(this._showAddTaskDialog)) {
            this._showAddTaskDialog(definitionId, addTask);
        }
        else {
            var state = {
                definitionId: definitionId,
                buildId: null,
                addTask: addTask
            };
            Navigation_Services.getHistoryService().addHistoryPoint(DesignerActions.SimpleProcess, state);
        }
    }

    /**
     * View a build in a new tab
     * @param build The build
     * @param tab The initial tab to display
     */
    public viewBuildInNewTab(build: BuildContracts.Build, tab: string = BuildActions.Summary) {
        if (!build.definition) {
            return;
        }

        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
            target: "_blank",
            url: build._links.web.href
        });
    }

    /**
     * View a build
     * @param build The build
     * @param tab The initial tab to display
     */
    public viewBuild(build: BuildContracts.Build, tab: string = BuildActions.Summary) {
        if (!build.definition || !build.id) {
            return;
        }

        // un-set current build, only if this is a new build
        if (buildDetailsContext) {
            let currentBuild = buildDetailsContext.currentBuild.peek();
            if (!currentBuild || currentBuild.id.peek() !== build.id) {
                buildDetailsContext.currentBuild(null);
            }
        }

        Navigation_Services.getHistoryService().addHistoryPoint(tab, $.extend(ViewsCommon.BuildActionIds.getDefaultState(), { buildId: build.id }));
    }

    /**
     * Queues a build
     */
    public queueBuild(definition: BaseDefinitionModel.BaseDefinitionModel,
        performance: Performance.IScenarioDescriptor,
        telemetrySource?: string,
        queueTimeVariables?: QueueDefinitionDialog.QueueTimeBuildDefinitionVariableViewModel[]): Q.IPromise<any> {



        var dictionary: { [key: string]: QueueDefinitionDialog.QueueTimeBuildDefinitionVariableViewModel } = {};

        var definitionType = definition.definitionType.peek();

        var performanceData = {
            definitionType: definitionType,
            definitionId: definition.id.peek()
        };
        performance.addData(performanceData);

        if (definitionType === BuildContracts.DefinitionType.Build) {
            var queuesPromise = this.buildDefinitionManager.queueCache.getAgentQueues().then((queues: DistributedTask.TaskAgentQueue[]) => {
                performance.addSplitTiming("retrieved queues");
                return queues;
            });

            let definitionContract = definition.value as BuildContracts.BuildDefinition;
            let definitionPromise: IPromise<BuildContracts.BuildDefinition> = null;
            if (definitionContract.repository) {
                definitionPromise = Q(definitionContract);
            }
            else {
                // if some one just sends a definitionreference, retreive the full definition
                definitionPromise = this.buildDefinitionManager.getDefinition(definitionContract.id);
            }

            return Q.all([queuesPromise, definitionPromise]).spread(
                (queues: DistributedTask.TaskAgentQueue[], fullDefinition: BuildContracts.BuildDefinition) => {
                    let definitionModel = new BuildDefinitionModel.BuildDefinitionModel(fullDefinition);
                    this.sourceProviderManager.getQueueBuildDialogOptions(this.tfsContext, fullDefinition.repository)
                        .then((sourceOptions: SourceOptions.IQueueDialogSourceOptions) => {
                            performance.addSplitTiming("retrieved queue build dialog options from source provider");
                            var dialogModel: QueueDefinitionDialog.QueueDefinitionDialogModel = new QueueDefinitionDialog.QueueDefinitionDialogModel(this.tfsContext, definitionModel, queues, fullDefinition.repository.defaultBranch, sourceOptions,
                                (queuedBuild: BuildContracts.Build) => {
                                    this.viewBuild(queuedBuild);
                                });
                            dialogModel.telemetrySource = telemetrySource;

                            // Iterate the provided variables, if the same variable already exists update its values. Otherwise add the new variable.
                            if (queueTimeVariables) {
                                for (const variable of queueTimeVariables) {
                                    var existing: QueueDefinitionDialog.QueueTimeBuildDefinitionVariableViewModel = dialogModel.queueTimeVariables().variables().find(v => v.name() === variable.name());

                                    if (existing) {
                                        existing.value(variable.value());
                                        existing.isImplicit = variable.isImplicit;
                                    }
                                    else {
                                        dialogModel.queueTimeVariables().variables().push(variable);
                                    }
                                }
                            }

                            performance.addSplitTiming("created queue build dialog model");

                            Dialogs.show(QueueDefinitionDialog.QueueDefinitionDialog, dialogModel);
                        });
                });
        }
        else if (definitionType === BuildContracts.DefinitionType.Xaml) {
            var controllersPromise = this.queueCache.getBuildControllers().then((buildControllers: BuildContracts.BuildController[]) => {
                performance.addSplitTiming("retrieved controllers");
                return buildControllers;
            });

            var xamlDefinitionPromise = this.buildDefinitionManager.ensureFullXamlViewModel(<XamlDefinitionModel.XamlDefinitionModel>definition).then((xamlDefinition: XamlDefinitionModel.XamlDefinitionModel) => {
                performance.addSplitTiming("retrieved full definition");
                return xamlDefinition;
            });

            return Q.all([controllersPromise, xamlDefinitionPromise]).spread(
                (buildControllers: BuildContracts.BuildController[], xamlDefinition: XamlDefinitionModel.XamlDefinitionModel) => {
                    var options = {
                        buildClient: this.buildClient,
                        tfsContext: this.tfsContext,
                        controllers: buildControllers,
                        definition: xamlDefinition.value,
                        dropLocation: xamlDefinition.dropFolder(),
                        msbuildArgs: xamlDefinition.buildArgs(),
                        okCallback: (queuedRequest: BuildContracts.Build) => {
                            Navigation_Services.getHistoryService().addHistoryPoint(ExplorerActions.QueuedBuilds, $.extend(ViewsCommon.BuildActionIds.getDefaultState(), { definitionId: xamlDefinition.id(), refresh: 1 }));
                        }
                    };
                    performance.addSplitTiming("created XAML queue build dialog options");

                    XamlBuildControls.BuildDialogs.queueBuild(options);
                });
        }
    }

    private _getQueuesPromise(refresh: boolean = false) {
        if (!this._queuesPromise || refresh) {
            this._queuesPromise = this.queueCache.getAgentQueues(true);
        }
        return this._queuesPromise;
    }

    private _getPoolsPromise() {
        if (!this._poolsPromise) {
            this._poolsPromise = this.applicationTaskAgentClient.getAgentPools();
        }
        return this._poolsPromise;
    }

    private _getProjectInfoPromise() {
        if (!this._projectInfoPromise) {
            this._projectInfoPromise = this.buildDefinitionManager.getProjectInfo();
        }
        return this._projectInfoPromise;
    }

    private _getRepoFactoriesPromise() {
        if (!this._repoFactoriesPromise) {
            this._repoFactoriesPromise = this.sourceProviderManager.getRepositoryFactories();
        }
        return this._repoFactoriesPromise;
    }

    private _getMachineManagementImagesPromise() {
        if (!this._machineManagementImagesPromise) {
            this._machineManagementImagesPromise = this.hostedImagesCache.getPoolFriendlyImageNameList();
        }
        return this._machineManagementImagesPromise
    }

    public setUpBuildDefinitionPromises(forWizard: boolean = false): Q.Promise<any[]> {
        var promises = [];
        if (forWizard) {
            promises.push(this._getRepoFactoriesPromise(), this._getQueuesPromise(), this._getPoolsPromise(), this._getProjectInfoPromise(), this._getMachineManagementImagesPromise());
        }
        else {
            var tasksPromise = this.buildDefinitionManager.getTaskDefinitions();
            var optionsPromise = this.buildDefinitionManager.getBuildOptionDefinitions();
            promises.push(tasksPromise, optionsPromise, this._getPoolsPromise(), this._getProjectInfoPromise(), this._getRepoFactoriesPromise(), this._getQueuesPromise(), this._getMachineManagementImagesPromise());
        }

        return Q.all(promises);
    }

    public getQueues(refresh: boolean): IPromise<DistributedTask.TaskAgentQueue[]> {
        return this._getQueuesPromise(refresh);
    }

    public getPool(poolId: number): IPromise<DistributedTask.TaskAgentPool> {
        return this._getPoolsPromise().then((pools) => {
            pools = pools || [];
            let matchingPool = null;
            for (let i = 0; i < pools.length; i++) {
                const pool = pools[i];
                if (pool.id === poolId) {
                    matchingPool = pool;
                    break;
                }
            }

            return matchingPool;
        });
    }

}
export var viewContext: ViewContext;

/**
 * Holds maps of definition Ids to it's draft info if they have drafts, used to restrict only one draft per definition
 */
export var definitionIdsAndDraftInfo: { [id: number]: DefinitionInfo } = {};

export interface DefinitionInfo {
    id: number;
    rev: number;
}

export class DefinitionContext {
    /**
     * The currently selected definition
     */
    public selectedDefinition: KnockoutObservable<BaseDefinitionModel.BaseDefinitionModel> = ko.observable(null);

    /**
     * The currently selected definition type
     */
    public selectedDefinitionType: KnockoutObservable<BuildContracts.DefinitionType> = ko.observable(null);
}
export var definitionContext: DefinitionContext = new DefinitionContext();

export class BuildDetailsContext {
    /**
     * The currently selected build
     */
    public currentBuild: KnockoutObservable<BuildDetailsViewModel.BuildDetailsViewModel> = ko.observable(null);

    /**
     * The currently selected timeline record
     */
    public currentTimelineRecord: KnockoutObservable<TimelineRecordViewModel.TimelineRecordViewModel> = ko.observable(null);

    /**
     * The currently selected timeline
     */
    public currentTimeline: KnockoutObservable<TimelineViewModel.TimelineViewModel> = ko.observable(null);

    constructor() {
        this.currentBuild.subscribe((newValue: BuildDetailsViewModel.BuildDetailsViewModel) => {
            this.currentTimeline(null);
            this.currentTimelineRecord(null);
        });
    }
}
export var buildDetailsContext: BuildDetailsContext = new BuildDetailsContext();

export class DisposableTab extends KnockoutPivot.BasicPivotTab {
    /**
     * Manager for disposables.
     */
    private _disposalManager: Utils_Core.DisposalManager;

    constructor(id: string, text: string, templateName: string) {
        super(id, text, templateName);

        this._disposalManager = new Utils_Core.DisposalManager();
    }

    /**
     * Disposes all disposables.
     */
    public dispose(): void {
        this._disposalManager.dispose();
    }

    /**
     * Proxy for a knockout subscription to keep track of it to ensure that when the control is disposed, subscription is also disposed.
     */
    public subscribe(subscribable: KnockoutSubscribable<any>, callback: (newValue: any) => void): KnockoutSubscription<any> {
        return this._disposalManager.addDisposable<KnockoutSubscription<any>>(subscribable.subscribe(callback));
    }

    /**
     * Proxy for a knockout computed to keep track of it to ensure that when the control is disposed, computed is also disposed.
     */
    public computed(func: () => any): KnockoutComputed<any> {
        return this._disposalManager.addDisposable<KnockoutComputed<any>>(ko.computed(func));
    }

    /**
     * Adds a disposable object to the list
     */
    public _addDisposable(disposable: IDisposable): IDisposable {
        return this._disposalManager.addDisposable(disposable);
    }
}

export class BuildTab<TFilter> extends DisposableTab {
    /**
     * Filters
     */
    public filters: KnockoutObservableArray<TFilter> = ko.observableArray([]);

    constructor(id: string, text: string, templateName: string) {
        super(id, text, templateName);
    }

    /**
     * Refreshes the tab
     */
    public refresh() {
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Context", exports);
