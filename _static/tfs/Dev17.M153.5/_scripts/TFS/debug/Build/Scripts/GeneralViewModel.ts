import ko = require("knockout");

import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import DemandViewModel = require("Build/Scripts/DemandViewModel");

import BuildClient = require("Build.Common/Scripts/Api2.2/ClientServices");
import BuildUtils = require("Build/Scripts/Utilities/Utils");

import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");
import TasksEditor = require("DistributedTasksCommon/TFS.Tasks.TasksEditor");

import Marked = require("Presentation/Scripts/marked");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import FeatureAvailability = require("VSS/FeatureAvailability/Services");

import BuildCommon = require("TFS/Build/Contracts");
import DistributedTask = require("TFS/DistributedTask/Contracts");
import DistributedTaskApi = require("TFS/DistributedTask/TaskAgentRestClient");
import MachineManagement = require("MachineManagement/Contracts")

import Service = require("VSS/Service");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Number = require("VSS/Utils/Number");
import Utils_String = require("VSS/Utils/String");

import Constants_Platform = require("VSS/Common/Constants/Platform");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { MarkdownRenderer } from "ContentRendering/Markdown";


/**
 * View model for handling general definition properties
 */
export class GeneralViewModel extends TaskModels.ChangeTrackerModel {
    private _defaultQueue: number;
    private _defaultImage: number;
    private _description: string;
    private _buildNumberFormat: string;
    private _jobTimeout: number;
    private _jobCancelTimeout: number;
    private _jobAuthorizationScope: BuildCommon.BuildAuthorizationScope = BuildCommon.BuildAuthorizationScope.ProjectCollection;
    private _demands: string[];
    private _badgeEnabled: boolean;
    private _originalQueue: DistributedTask.TaskAgentQueue;

    private _buildClient: BuildClient.BuildClientService;
    private _queueClient: DistributedTaskApi.TaskAgentHttpClient;

    /**
     * Default queue of the build definition
     */
    public defaultQueue: KnockoutObservable<number>;

    /**
     * Default image when hosted queue is selected
     */
    public defaultImage: KnockoutObservable<number>;

    /**
     * List of available queues
     */
    public queues: KnockoutObservableArray<DistributedTask.TaskAgentQueue>;

    /**
    * List of MMS images available within the hosted queue
    */
    public images: KnockoutObservableArray<MachineManagement.FriendlyImageName>;

    /**
     * List of readonly demands
     */
    public readonlyDemands: KnockoutObservableArray<DemandViewModel.DemandViewModel>;

    /**
     * List of custom demands
     */
    public demands: KnockoutObservableArray<DemandViewModel.DemandViewModel>;

    /**
     * The description of the build definition
     */
    public description: KnockoutObservable<string>;

    /**
     * Build number format of the build definition
     */
    public buildNumberFormat: KnockoutObservable<string>;

    /**
     * The job authorization scope for builds queued against the build definition
     */
    public jobAuthorizationScope: KnockoutObservable<BuildCommon.BuildAuthorizationScope>;

    /**
     * The help text markdown for job authorization scope
     */
    public jobAuthorizationScopeHelpMarkdown: string;

    /**
     * The help text markdown for job authorization scope
     */
    public buildNumberFormatHelpMarkdown: string;

    /**
     * The job timeout in minutes for the build definition
     */
    public jobTimeout: KnockoutObservable<number>;

    /**
     * The help text markdown for job timeout
     */
    public jobTimeoutHelpMarkdown: string;

    /**
     * The job cancel timeout in minutes for the build definition
     */
    public jobCancelTimeout: KnockoutObservable<number>;

    /**
     * The help text markdown for job cancel timeout
     */
    public jobCancelTimeoutHelpMarkdown: string;

    /**
     * Whether badges are enabled for the definition
     */
    public badgeEnabled: KnockoutObservable<boolean>;

    /**
     * The badge url
     */
    public badgeUrl: KnockoutObservable<string>;

    /**
     * Whether to show the badge link
     */
    public showBadgeLink: KnockoutComputed<boolean>;

    /**
    * Link to manage build queues
    */
    public queueManageLink: string;

	/**
    * Whether to show hosted imgae dropdown
    */
    public showHostedImages: KnockoutComputed<boolean>;

    /**
     * The help text markdown for hostedImage
     */
    public hostedImageHelpMarkdown: string;

    constructor(queues: DistributedTask.TaskAgentQueue[], images: MachineManagement.FriendlyImageName[]) {
        super();
        this.queues(queues || []);
        this.images(images || []);

        let renderer: (markdown: string) => string;
        if (FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.MarkdownRendering)) {
            renderer = (new MarkdownRenderer()).renderHtml;
        }
        else {
            renderer = Marked;
        }

        this.jobAuthorizationScopeHelpMarkdown = renderer(BuildResources.JobAuthorizationScopeHelpText);
        this.hostedImageHelpMarkdown = renderer(BuildResources.HostedImageHelpText);
        this.buildNumberFormatHelpMarkdown = renderer(BuildResources.BuildNumberFormatHelpText);
        this.jobTimeoutHelpMarkdown = renderer(BuildResources.JobTimeoutHelpText);
        this.jobCancelTimeoutHelpMarkdown = renderer(BuildResources.JobCancelTimeoutHelpText);

        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

        var tfsConnection: Service.VssConnection = new Service.VssConnection(tfsContext.contextData);
        this._buildClient = tfsConnection.getService<BuildClient.BuildClientService>(BuildClient.BuildClientService);
        this._queueClient = Service.getCollectionClient(DistributedTaskApi.TaskAgentHttpClient, tfsContext.contextData);
        var projectName = tfsContext.contextData.project.name;

        this.queueManageLink = tfsContext.getActionUrl(null, "AgentQueue", { project: projectName, area: "admin" });
    }

    /**
     * Updates properties and custom demands using the definition specified.
     */
    public update(buildDefinition: BuildCommon.BuildDefinition): void {
        if (buildDefinition.queue && buildDefinition.queue.name) {
            this._defaultQueue = buildDefinition.queue.id;
            this._originalQueue = this._convertFromBuildQueue(buildDefinition.queue);
            this._setQueues(this.queues(), this._originalQueue);
        } else {
            this._defaultQueue = 0;
        }

        this.defaultQueue(this._defaultQueue);
        var selectedQueue = this.getSelectedQueue();

        if (selectedQueue && selectedQueue.pool.isHosted) {
            this._defaultImage = BuildUtils.getHostedImageIdProperty(buildDefinition);
        }
        else {
            this._defaultImage = 0;
        }

        this.defaultImage(this._defaultImage);

        this._description = buildDefinition.description || "";
        this.description(this._description);

        this._buildNumberFormat = buildDefinition.buildNumberFormat || "";
        this.buildNumberFormat(this._buildNumberFormat);

        this._jobAuthorizationScope = buildDefinition.jobAuthorizationScope || BuildCommon.BuildAuthorizationScope.ProjectCollection;
        this.jobAuthorizationScope(this._jobAuthorizationScope);

        this._jobTimeout = buildDefinition.jobTimeoutInMinutes || 0;
        this.jobTimeout(this._jobTimeout);

        this._jobCancelTimeout = buildDefinition.jobCancelTimeoutInMinutes || 5;
        this.jobCancelTimeout(this._jobCancelTimeout);

        this._updateDemands(buildDefinition.demands);

        this._badgeEnabled = !!buildDefinition.badgeEnabled;
        this.badgeEnabled(this._badgeEnabled);

        var links = (<any>buildDefinition)._links;
        if (links && links.badge) {
            this.badgeUrl(links.badge.href);
        }
        else {
            this.badgeUrl("");
        }

        // Notify listeners about not being dirty anymore
        this.defaultQueue.valueHasMutated();
    }

    /**
     * Updates custom demands.
     */
    private _updateDemands(demands: string[]): void {
        this._demands = demands || [];
        $.each(this.demands(), (index: number, d: DemandViewModel.DemandViewModel) => {
            d.dispose();
        });

        this.demands($.map(this._demands, (d: string) => {
            return new DemandViewModel.DemandViewModel(d);
        }));
    }

    /**
     * Updates readonly demands using specified steps.
     */
    public updateReadOnlyDemands(steps: TasksEditor.TaskViewModel[]): void {
        $.each(this.readonlyDemands(), (index: number, d: DemandViewModel.DemandViewModel) => {
            d.dispose();
        });

        var map: { [id: string]: boolean } = {},
            demands: DemandViewModel.DemandViewModel[] = [];

        $.each(steps || [], (index: number, ds: TasksEditor.TaskViewModel) => {
            if (ds.taskDefinition) {
                $.each(ds.taskDefinition.demands, (i: number, name: string) => {
                    if (!map[name]) {
                        map[name] = true;
                        demands.push(new DemandViewModel.DemandViewModel(name));
                    }
                });
            }
        });

        this.readonlyDemands(demands);
    }

    /**
     * Adds an empty demand to the viewmodel.
     */
    public addDemand(general: GeneralViewModel, evt: JQueryEventObject): void {
        general.demands.push(new DemandViewModel.DemandViewModel(""));
    }

    /**
     * Removes the specified demand from the viewmodel.
     */
    public removeDemand(demand: DemandViewModel.DemandViewModel, evt: JQueryEventObject): void {
        demand.dispose();
        var context = <GeneralViewModel>(<KnockoutBindingContext>ko.contextFor(evt.target)).$parent;
        context.demands.remove(demand);
    }

    /**
     * See base.
     */
    public dispose(): void {
        $.each(this.readonlyDemands(), (index: number, d: DemandViewModel.DemandViewModel) => {
            d.dispose();
        });

        $.each(this.demands(), (index: number, d: DemandViewModel.DemandViewModel) => {
            d.dispose();
        });

        super.dispose();
    }

    /**
     * See base.
     */
    public getValue(): string[] {
        var demands = $.grep(this.demands(), (d: DemandViewModel.DemandViewModel) => {
            return !!$.trim(d.name());
        });

        return $.map(demands, (d: DemandViewModel.DemandViewModel) => {
            return d.getValue();
        });
    }

    /**
     * Gets the selected queue item.
     */
    public getSelectedQueue(): DistributedTask.TaskAgentQueue {
        return Utils_Array.first(this.queues(), (q: DistributedTask.TaskAgentQueue) => {
            return q.id === this.defaultQueue();
        });
    }

    /**
     * Gets the selected images item.
     */
    public getSelectedImage(): MachineManagement.FriendlyImageName {
        return Utils_Array.first(this.images(), (i: MachineManagement.FriendlyImageName) => {
            return i.id === this.defaultImage();
        });
    }

    /**
    * Refreshes Build queues
    */
    public refreshQueues() {
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var projectId = tfsContext.contextData.project.id;
        // Shouldn't this be using the cache so the list is refreshed everywhere in the build UI??
        this._queueClient.getAgentQueues(projectId, null, DistributedTask.TaskAgentQueueActionFilter.Use).then((queues: DistributedTask.TaskAgentQueue[]) => {
            queues = queues.sort((a, b) => {
                return Utils_String.ignoreCaseComparer(a.name, b.name);
            });

            if (!this._originalQueue) {
                if (queues && queues.length > 0) {
                    this.defaultQueue(queues[0].id);
                } else {
                    this._defaultQueue = 0;
                    this.defaultQueue(this._defaultQueue);
                }
            } else {
                // Make sure the currently selected queue is the original queue on a refresh call
                this.defaultQueue(this._originalQueue.id);
            }

            // Make sure if there was a queue originally configured that we preserve it across refreshes
            this._setQueues(queues, this._originalQueue);
        });
    }

    private _setQueues(queues: DistributedTask.TaskAgentQueue[], defaultQueue: DistributedTask.TaskAgentQueue): void {
        if (defaultQueue) {
            var configuredQueue = Utils_Array.first(queues, (q: DistributedTask.TaskAgentQueue) => {
                return q.id === defaultQueue.id;
            });

            // Just because the queue isn't returned in the list doesn't mean we shouldn't include it in the
            // drop-down if we have the information. This can occur because the queue configured on the definition
            // is not 'use'-able by the user making this call.
            if (!configuredQueue) {
                queues.push(defaultQueue);
            }
        }

        // Make sure the queues are consistently sorted for UI display
        queues.sort((a: DistributedTask.TaskAgentQueue, b: DistributedTask.TaskAgentQueue) => {
            return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
        });

        // Reset the list
        this.queues(queues);
    }

    private _convertFromBuildQueue(queue: BuildCommon.AgentPoolQueue): DistributedTask.TaskAgentQueue {
        if (!queue) {
            return null;
        } else {
            return <DistributedTask.TaskAgentQueue>{
                id: queue.id,
                name: queue.name,
                pool: <DistributedTask.TaskAgentPoolReference>{
                    id: queue.pool.id,
                    name: queue.pool.name,
                    isHosted: queue.pool.isHosted
                }
            };
        }
    }

    _initializeObservables(): void {
        super._initializeObservables();

        this._defaultQueue = 0;
        this.defaultQueue = ko.observable(this._defaultQueue);

        this._defaultImage = 0;
        this.defaultImage = ko.observable(this._defaultImage);
        this.queues = ko.observableArray([]);
        this.images = ko.observableArray([]);

        this._description = "";
        this.description = ko.observable(this._description);

        this._buildNumberFormat = "";
        this.buildNumberFormat = ko.observable(this._buildNumberFormat);

        this._jobAuthorizationScope = BuildCommon.BuildAuthorizationScope.ProjectCollection;
        this.jobAuthorizationScope = ko.observable(this._jobAuthorizationScope);

        this._jobTimeout = 0;
        this.jobTimeout = ko.observable(this._jobTimeout);

        this._jobCancelTimeout = 5;
        this.jobCancelTimeout = ko.observable(this._jobCancelTimeout);

        this._demands = [];
        this.demands = ko.observableArray([]);

        this.readonlyDemands = ko.observableArray([]);

        this._badgeEnabled = false;
        this.badgeEnabled = ko.observable(this._badgeEnabled);

        this.badgeUrl = ko.observable("");

        this.showBadgeLink = ko.computed(() => {
            return this.badgeEnabled() && !!this.badgeUrl();
        });
        this._addDisposable(this.showBadgeLink);

		this.showHostedImages = ko.computed(() => {
            return (FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.BuildHostedImage, false) && this.getSelectedQueue() && this.getSelectedQueue().pool.isHosted);
        });
    }

    _isDirty(): boolean {
        // Check any propery is dirty
        if (this._defaultQueue !== this.defaultQueue() ||
            this._jobTimeout != this.jobTimeout() ||
            this._jobCancelTimeout != this.jobCancelTimeout() ||
            this._jobAuthorizationScope != this.jobAuthorizationScope() ||
            Utils_String.localeComparer(this._description, this.description()) !== 0 ||
            Utils_String.localeComparer(this._buildNumberFormat, this.buildNumberFormat()) !== 0 ||
            this._badgeEnabled !== this.badgeEnabled() ||
            this._defaultImage != this.defaultImage()) {
            return true;
        }

        // Check any demand is dirty
        var dirtyDemand = Utils_Array.first(this.demands(), (d: DemandViewModel.DemandViewModel) => {
            return d._isDirty();
        });

        if (dirtyDemand) {
            return true;
        }

        // Check demand added or removed
        return !Utils_Array.arrayEquals(this._demands, this.demands(), (ds: string, d: DemandViewModel.DemandViewModel) => {
            return Utils_String.localeIgnoreCaseComparer(ds, d.getValue()) === 0;
        });
    }

    _isInvalid(): boolean {
        var rtn = false;

        this.demands().forEach((demand) => {
            if (demand._isInvalid()) {
                rtn = true;
            }
        });

        return rtn || this.jobTimeoutInvalid() || this.jobCancelTimeoutInvalid();
    }

    jobTimeoutInvalid(): boolean {
        let timeout = this.jobTimeout();

        // values 0 and empty represent an infinite timeout
        if (timeout == 0) {
            return false;
        }
        else if (timeout.toString().trim().length == 0) {
            return false;
        }

        return !Utils_Number.isPositiveNumber(timeout);
    }

    jobCancelTimeoutInvalid(): boolean {
        let cancelTimeout = this.jobCancelTimeout();
        return cancelTimeout.toString().trim().length == 0 ||
            cancelTimeout <= 0 ||
            cancelTimeout > 60;
    }
}
