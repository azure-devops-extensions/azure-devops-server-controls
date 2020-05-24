/// <reference types="jquery" />
import ko = require("knockout");

import Build = require("TFS/Build/Contracts");
import Build_Client = require("TFS/Build/RestClient");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import DistributedTask = require("TFS/DistributedTask/Contracts");
import { handleError } from "Build/Scripts/PlatformMessageHandlers";
import KnockoutCommon = require("DistributedTasksCommon/TFS.Knockout.CustomHandlers");
import Navigation = require("VSS/Controls/Navigation");
import Service = require("VSS/Service");
import TaskUtils = require("DistributedTasksCommon/TFS.Tasks.Utils");
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");
import Utils_String = require("VSS/Utils/String");
import VSS_WebApi = require("VSS/WebApi/RestClient");

const ManagePermission = 8;

KnockoutCommon.initKnockoutHandlers(true);

export class AdminPoolPoliciesTab extends Navigation.NavigationViewTab {
    private _template: JQuery = null;
    private _viewModel: AdminPoolPoliciesViewModel;

    public initialize() {
        super.initialize();
    }

    /**
     * Called whenever navigation occurs with this tab as the selected tab
     * @param rawState The raw/unprocessed hash/url state parameters (string key/value pairs)
     * @param parsedState Resolved state objects parsed by the view
     */
    public onNavigate(rawState: any, parsedState: any) {
        if (!this._template) {
            const tfsContext = TfsContext.getDefault();
            this._viewModel = new AdminPoolPoliciesViewModel(tfsContext);
            this._template = TFS_Knockout.loadHtmlTemplate("buildvnext_admin_pool_policies_tab").appendTo(this._element);
            ko.applyBindings(this._viewModel, this._template[0]);
        }

        let title: string = "";
        if (parsedState.queue) {
            title = Utils_String.format(BuildResources.PoolPoliciesTitleFormat, parsedState.queue.name);
        }
        this._options.navigationView.setViewTitle(title);

        this._viewModel.setQueue(parsedState.queue);
    }
}

class AdminPoolPoliciesViewModel {
    private _queue: DistributedTask.TaskAgentQueue | undefined;
    private _buildClient: DefinitionResourceReferenceBuildHttpClient;
    private _tfsContext: TfsContext;

    public savedAllowPipelineAccess: KnockoutObservable<boolean> = ko.observable<boolean>(false);
    public currentAllowPipelineAccess: KnockoutObservable<boolean> = ko.observable<boolean>(false);
    public hasQueueManagePermission: KnockoutObservable<boolean> = ko.observable<boolean>(false);
    public settingsDirty: KnockoutComputed<boolean>;

    constructor(tfsContext: TfsContext) {
        this._tfsContext = tfsContext;
        const tfsConnection: Service.VssConnection = new Service.VssConnection(tfsContext.contextData);
        this._buildClient = tfsConnection.getHttpClient(DefinitionResourceReferenceBuildHttpClient);

        this.settingsDirty = ko.computed(() => {
                return this.savedAllowPipelineAccess() !== this.currentAllowPipelineAccess();
        });
    }

    public setQueue(queue: DistributedTask.TaskAgentQueue | undefined) {
        this._queue = queue;
        if (queue) {
            this._resetState();
            this._requestData();
        }
        else {
            this._resetState();
        }
    }

    public saveSettings() {
        if (this._queue && this.settingsDirty.peek()) {
            const reference: Build.DefinitionResourceReference = {
                authorized: this.currentAllowPipelineAccess.peek(),
                id: this._queue.id.toString(),
                name: this._queue.name,
                type: "queue"
            };
            this._buildClient.authorizeProjectResources([reference], this._tfsContext.contextData.project.id).then(
                (resourceReferences: Build.DefinitionResourceReference[]) => {
                    this._handleResourceReferenceResponse(resourceReferences);
                },
                (error) => {
                    this._handleResourceReferenceRequestError(error);
                }
            );
        }
    }

    public undoSettings() {
        this.currentAllowPipelineAccess(this.savedAllowPipelineAccess.peek());
    }

    private _resetState() {
        this.savedAllowPipelineAccess(false);
        this.currentAllowPipelineAccess(false);
        this.hasQueueManagePermission(false);
    }

    private _requestData() {
        if (this._queue) {
            TaskUtils.SecurityHelper.hasAgentQueuePermission(this._tfsContext.contextData.project.id, this._queue.id, ManagePermission).then(
                (hasPermission: boolean) => {
                    this.hasQueueManagePermission(hasPermission);
                },
                (error) => {
                    handleError(error);
                    this.hasQueueManagePermission(false);
                }
            );

            this._buildClient.getProjectResources(this._tfsContext.contextData.project.id, "queue", this._queue.id.toString()).then(
                (resourceReferences: Build.DefinitionResourceReference[]) => {
                    this._handleResourceReferenceResponse(resourceReferences);
                },
                (error) => {
                    this._handleResourceReferenceRequestError(error);
                }
            );
        }
    }

    private _handleResourceReferenceResponse(resourceReferences: Build.DefinitionResourceReference[]) {
        const reference: Build.DefinitionResourceReference[] = resourceReferences.filter(resourceReference => resourceReference.id === this._queue.id.toString());
        if (reference[0]) {
            this.savedAllowPipelineAccess(resourceReferences[0].authorized);
            this.currentAllowPipelineAccess(resourceReferences[0].authorized);
        }
        else {
            this.savedAllowPipelineAccess(false);
            this.currentAllowPipelineAccess(false);
        }
    }

    private _handleResourceReferenceRequestError(error: TfsError) {
        handleError(error);
        this.savedAllowPipelineAccess(false);
        this.currentAllowPipelineAccess(false);
    }
}

/**
 * Creating a private extension of the legacy build http client. The legacy build http client is no longer generated
 * but this page depends on some newer APIs. Instead of creating potential S2S version issues by hand editing the legacy
 * client, the functionality will be added below.
 */
class DefinitionResourceReferenceBuildHttpClient extends Build_Client.BuildHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * @param resources - 
     * @param project - Project ID or project name
     */
    public async authorizeProjectResources(
        resources: Build.DefinitionResourceReference[],
        project: string
        ): Promise<Build.DefinitionResourceReference[]> {

        return this._beginRequest<Build.DefinitionResourceReference[]>({
            httpMethod: "PATCH",
            area: "build",
            locationId: "398c85bc-81aa-4822-947c-a194a05f0fef",
            apiVersion: "5.0-preview.1",
            routeTemplate: "{project}/_apis/build/authorizedresources",
            responseIsCollection: true,
            routeValues: {
                project: project
            },
            data: resources
        });
    }

    /**
     * @param project - Project ID or project name
     * @param type - 
     * @param id - 
     */
    public async getProjectResources(
        project: string,
        type?: string,
        id?: string
        ): Promise<Build.DefinitionResourceReference[]> {

        const queryValues: any = {
            type: type,
            id: id
        };

        return this._beginRequest<Build.DefinitionResourceReference[]>({
            httpMethod: "GET",
            area: "build",
            locationId: "398c85bc-81aa-4822-947c-a194a05f0fef",
            apiVersion: "5.0-preview.1",
            routeTemplate: "{project}/_apis/build/authorizedresources",
            responseIsCollection: true,
            routeValues: {
                project: project
            },
            queryParams: queryValues
        });
    }
}
