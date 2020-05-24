/// <reference types="knockout" />
/// <reference types="jquery" />



import Q = require("q");
import ko = require("knockout");
import React = require("react");
import ReactDOM = require("react-dom");
import VSS = require("VSS/VSS");
import Controls = require("VSS/Controls");
import AdminDialogs = require("Admin/Scripts/TFS.Admin.Dialogs");
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import AdminHttpClient = require("Admin/Scripts/TFS.Admin.WebApi");
import AdminCommon = require("Admin/Scripts/TFS.Admin.Common");
import TFS_Admin_Controls = require("Admin/Scripts/TFS.Admin.Controls");
import ExternalGitEndpointsManageDialog = require("Admin/Scripts/TFS.Admin.Controls.ExternalGitEndpointsManageDialog");
import AzureEndpointsManageDialog = require("Admin/Scripts/TFS.Admin.Controls.AzureEndpointsManageDialog");
import AzureRMEndpointsDeleteDialog = require("Admin/Scripts/TFS.Admin.Controls.AzureRMEndpointsDeleteDialog");
import GenericEndpointsManageDialog = require("Admin/Scripts/TFS.Admin.Controls.GenericEndpointsManageDialog");
import GcpEndpointsManageDialog = require("Admin/Scripts/TFS.Admin.Controls.GcpEndpointsManageDialog");
import GitHubEndpointsManageDialog = require("Admin/Scripts/TFS.Admin.Controls.GitHubEndpointsManageDialog");
import BitbucketEndpointsManageDialog = require("Admin/Scripts/TFS.Admin.Controls.BitbucketEndpointsManageDialog");
import SshEndpointsManageDialog = require("Admin/Scripts/TFS.Admin.Controls.SshEndpointsManageDialog");
import SvnEndpointsManageDialog = require("Admin/Scripts/TFS.Admin.Controls.SvnEndpointsManageDialog");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Navigation = require("VSS/Controls/Navigation");
import { AddAzureRmEndpointsModel, AddAzureRmEndpointsDialog } from "DistributedTasksCommon/ServiceEndpoints/AzureRMEndpointsManageDialog";
import { AddDockerRegistryEndpointModel, AddDockerRegistryEndpointsDialog } from "DistributedTasksCommon/ServiceEndpoints/DockerRegistryManageDialog";
import { AddCustomConnectionsModel, AddCustomConnectionsDialog, EndpointData } from "DistributedTasksCommon/ServiceEndpoints/CustomEndpointsManageDialog";
import { AddServiceEndpointUIContributionConnectionModel, AddServiceEndpointUIContributionDialog } from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpointUIContributionManageDialog";
import { AddKubernetesEndpointModel, AddKubernetesEndpointsDialog } from "DistributedTasksCommon/ServiceEndpoints/KubernetesEndpointManageDialog";
import { AddServiceEndpointModel } from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Controls";
import ResourceAdminTreeView = require("DistributedTasksCommon/TFS.Tasks.ResourceAdminTreeView");
import TaskUtils = require("DistributedTasksCommon/TFS.Tasks.Utils");
import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");
import Dialogs = require("VSS/Controls/Dialogs");
import Menus = require("VSS/Controls/Menus");
import TFS_Admin_ServiceEndpoints = require("Admin/Scripts/TFS.Admin.ServiceEndpoints");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Service = require("VSS/Service");
import Diag = require("VSS/Diag");
import VSS_WebApi_Constants = require("VSS/WebApi/Constants");
import { RoleAssignmentControl } from "VSSPreview/Flux/Components/RoleAssignmentControl";

import CoreContracts = require("TFS/Core/Contracts");
import DistributedTaskExtension_Contracts = require("TFS/DistributedTask/ServiceEndpoint/ExtensionContracts");
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");

import TFS_Admin_ConnectedServices = require("Admin/Scripts/TFS.Admin.ConnectedServices");
import AzureLegacyDeploymentsManageDialog = require("Admin/Scripts/TFS.Admin.Controls.AzureLegacyDeploymentsManageDialog");

import KnockoutAdapter = require("VSS/Adapters/Knockout");

import Utils_UI = require("VSS/Utils/UI");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import { ServiceEndpointExecutionHistory } from "Admin/Scripts/ServiceEndpoint/Components/ServiceEndpointExecutionHistory";
import { ServiceEndpointExecutionHistoryActionCreator } from "Admin/Scripts/ServiceEndpoint/Actions/ServiceEndpointExecutionHistoryActions";
import { ServiceEndpointPolicyView, IServiceEndpointPolicyViewProps } from "Admin/Scripts/ServiceEndpoint/Components/ServiceEndpointPolicyView";
import { ServiceEndpointPolicyActions, ServiceEndpointPolicyActionCreator } from "Admin/Scripts/ServiceEndpoint/Actions/ServiceEndpointPolicyActions";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import Contributions_Services = require("VSS/Contributions/Services");
import Contributions_Contracts = require("VSS/Contributions/Contracts");
import ServiceEndpointContracts = require("TFS/ServiceEndpoint/Contracts");
import { EndpointAuthorizationSchemes, EndpointAuthorizationParameters } from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Common";
import { TeamProjectPickListPanel, TeamProjectPickListPanelProps } from "Admin/Scripts/ServiceEndpoint/Components/TeamProjectPickListPanel";

var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
var delegate = Utils_Core.delegate;

export function createCaseInsensitiveKeyMapDict(objectDict: any) {
    var objectDictKeys = Object.getOwnPropertyNames(objectDict);
    var caseInsensitiveKeyMapDict = {};
    objectDictKeys.forEach(function (key) {
        caseInsensitiveKeyMapDict[key.toLowerCase()] = key;
    });

    return caseInsensitiveKeyMapDict;
}

export class ServiceResourceObservables {
    public static selectedResourceId: KnockoutObservable<string> = ko.observable("");

    public static endPointDisconnected: KnockoutObservable<boolean> = ko.observable(false);
    public static createdEndpoint: KnockoutObservable<ServiceEndpointContracts.ServiceEndpoint> = ko.observable(null);
    public static elementToFocus: KnockoutObservable<string> = ko.observable(null);

    public static connectedServiceDisconnected: KnockoutObservable<boolean> = ko.observable(false);
    public static connectedServiceCreatedId: KnockoutObservable<string> = ko.observable("");
}

export function endpointCreatedsuccessCallBack(serviceEndpoint: ServiceEndpointContracts.ServiceEndpoint, isUpdate?: boolean) {
    if (!!isUpdate) {
        ServiceResourceObservables.elementToFocus(".update-service-action");
    }
    else {
        ServiceResourceObservables.elementToFocus(null);
    }
    ServiceResourceObservables.createdEndpoint(serviceEndpoint);
}

export function connectedServiceCreatedSuccessCallBack(id: string) {
    ServiceResourceObservables.connectedServiceCreatedId.notifySubscribers(id);
}

// Main Tabbed navigation view
export class ResourceAdminView extends ResourceAdminTreeView.CommonResourceAdminView {
    public contributions: KnockoutObservableArray<Contributions_Contracts.Contribution>;
    public contributionsPromise: any;
    private _serviceEndpointTypesPromise: IPromise<ServiceEndpointContracts.ServiceEndpointType[]>;

    public initializeOptions(options?: any): void {
        var tabs = {};
        tabs[ResourceAdminTreeView.CommonAdminActionIds.Resources] = ServicesAdminViewTab;
        tabs[AdminCommon.CommonServicesActionIds.ConnectedServices] = ConnectedServicesTab;

        var tfsConnection = new Service.VssConnection(tfsContext.contextData);
        var TaskAgentHttpClient = tfsConnection.getService<TFS_Admin_ServiceEndpoints.ServiceEndPointService>(TFS_Admin_ServiceEndpoints.ServiceEndPointService);
        this._serviceEndpointTypesPromise = TaskAgentHttpClient.beginGetServiceEndpointTypes();
        this.contributions = ko.observableArray([]);

        $.extend(options, {
            tabs: tabs,
            hubContentSelector: ".resources-right-pane",
            pivotTabsSelector: ".endpoints-tab",
            leftPaneSelector: ".resources-left-pane",
            menuBarSelector: ".resources-left-pane-toolbar",
            noResourceTitle: AdminResources.NoServiceTitle,
            noResourceDescription: AdminResources.NoServiceDescription,
            selectedResourceId: ServiceResourceObservables.selectedResourceId,
            tfsContext: tfsContext,
            searchWaterMarkText: AdminResources.SearchServicesText,
            resourceName: ResourceAdminTreeView.CommonAdminActionIds.Resources,
            detailsView: ".connected-service-details",
            menuBarItems: this.getMenuBarItems(),
            serviceEndpointTypesPromise: this._serviceEndpointTypesPromise
        });

        super.initializeOptions(options);
    }

    public getMenuBarItems(action?: string): Menus.IMenuItemSpec[] {
        switch (action) {
            case AdminCommon.CommonServicesActionIds.ConnectedServices:
                return this._getConnectedServiceMenuItems();
            case ResourceAdminTreeView.CommonAdminActionIds.Resources:
            default:
                return this._getServiceEndPointMenuItems();
        }
    }

    public getAdminTreeView(): ResourceAdminTreeView.CommonAdminTree {
        return <ResourceAdminTreeView.CommonAdminTree>Controls.Enhancement.enhance(ResourceTree, this.$leftPane.find(".resources"), this._options);
    }

    onNavigate(state: any): void {
        super.onNavigate(state);
    }

    private _getServiceEndPointMenuItems(): Menus.IMenuItemSpec[] {
        var enabledEndpointTypes: Menus.IMenuItemSpec[] = [];

        enabledEndpointTypes.push({
            id: "generic-connection",
            text: AdminResources.GenericConnectionType,
            title: AdminResources.GenericConnectionType,
            showText: true,
            noIcon: true,
            action: () => {
                var dialogModel = new AddServiceEndpointModel(endpointCreatedsuccessCallBack);
                dialogModel.dialogTemplate = "add_generic_connections_dialog";
                Dialogs.show(GenericEndpointsManageDialog.AddGenericEndpointsDialog, dialogModel);
            }
        });

        enabledEndpointTypes.push({
            id: "git-connection",
            text: AdminResources.ExternalGitConnectionType,
            title: AdminResources.ExternalGitConnectionType,
            showText: true,
            noIcon: true,
            action: () => {
                var dialogModel = new AddServiceEndpointModel(endpointCreatedsuccessCallBack);
                dialogModel.dialogTemplate = "add_git_connections_dialog";
                Dialogs.show(ExternalGitEndpointsManageDialog.AddExternalGitEndpointsDialog, dialogModel);
            }
        });
        enabledEndpointTypes.push({
            id: "github-connection",
            text: AdminResources.GitHubConnectionType,
            title: AdminResources.GitHubConnectionType,
            showText: true,
            noIcon: true,
            action: () => {
                var dialogModel = new GitHubEndpointsManageDialog.AddGitHubConnectionsModel(endpointCreatedsuccessCallBack);
                dialogModel.dialogTemplate = "add_github_connections_dialog";
                Dialogs.show(GitHubEndpointsManageDialog.AddGitHubEndpointsDialog, dialogModel);
            }
        });
        enabledEndpointTypes.push({
            id: "bitbucket-connection",
            text: AdminResources.BitbucketConnectionType,
            title: AdminResources.BitbucketConnectionType,
            showText: true,
            noIcon: true,
            action: () => {
                var dialogModel = new BitbucketEndpointsManageDialog.AddBitbucketConnectionsModel(endpointCreatedsuccessCallBack);
                dialogModel.dialogTemplate = "add_bitbucket_connections_dialog";
                Dialogs.show(BitbucketEndpointsManageDialog.AddBitbucketEndpointsDialog, dialogModel);
            }
        });
        enabledEndpointTypes.push({
            id: "ssh-connection",
            text: AdminResources.SshConnectionType,
            title: AdminResources.SshConnectionType,
            showText: true,
            noIcon: true,
            action: () => {
                var dialogModel = new SshEndpointsManageDialog.AddSshConnectionsModel(endpointCreatedsuccessCallBack);
                dialogModel.dialogTemplate = "add_ssh_connections_dialog";
                Dialogs.show(SshEndpointsManageDialog.AddSshEndpointsDialog, dialogModel);
            }
        });

        var svnEndpointsEnabled = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessBuildvNextSvnRepository, false);

        if (svnEndpointsEnabled) {
            enabledEndpointTypes = enabledEndpointTypes.concat(
                {
                    id: "svn-connection",
                    text: AdminResources.SvnConnectionType,
                    title: AdminResources.SvnConnectionType,
                    showText: true,
                    noIcon: true,
                    action: () => {
                        var dialogModel = new SvnEndpointsManageDialog.AddSvnConnectionsModel(endpointCreatedsuccessCallBack);
                        dialogModel.dialogTemplate = "add_svn_connections_dialog";
                        Dialogs.show(SvnEndpointsManageDialog.AddSvnEndpointsDialog, dialogModel);
                    }
                }
            );
        }

        enabledEndpointTypes.sort((a: Menus.IMenuItemSpec, b: Menus.IMenuItemSpec): number => {
            return (Utils_String.ignoreCaseComparer(a.text, b.text));
        });

        this._serviceEndpointTypesPromise.then((endpointTypes) => {
            this.contributionsPromise = Service.getService(Contributions_Services.ExtensionService).getContributionsForTarget("ms.vss-endpoint.endpoint-ui-catalog");
            this.contributionsPromise.then((contributions) => {
                this.contributions(contributions);
                for (var i = 0; i < endpointTypes.length; i++) {
                    var endpointType = endpointTypes[i];
                    if ((endpointType.uiContributionId) && this.contributions()) {
                        var uiContribution: Contributions_Contracts.Contribution[];
                        uiContribution = this.contributions().filter((contribution) => contribution.id.toLowerCase().endsWith(endpointType.uiContributionId.toLowerCase()));
                        if (uiContribution) {
                            enabledEndpointTypes.push({
                                id: endpointType.name,
                                text: endpointType.displayName,
                                title: endpointType.displayName,
                                showText: true,
                                noIcon: true,
                                action: (serviceEndpointType: ServiceEndpointContracts.ServiceEndpointType) => {
                                    uiContribution = this.contributions().filter((contribution) => contribution.id.toLowerCase().endsWith(serviceEndpointType.uiContributionId.toLowerCase()));
                                    var dialogModel = new AddServiceEndpointUIContributionConnectionModel(endpointCreatedsuccessCallBack, serviceEndpointType.dataSources, uiContribution[0], serviceEndpointType.name, serviceEndpointType.displayName);
                                    Dialogs.show(AddServiceEndpointUIContributionDialog, dialogModel);
                                },
                                arguments: endpointType
                            });
                        }
                        else {
                            Diag.logError(Utils_String.format(AdminResources.FailedToFindEndpointUIContribution, endpointType.uiContributionId));
                        }
                    }
                    else {
                        switch (endpointType.name) {
                            case AdminCommon.ServiceEndpointType.AzureRM:
                                enabledEndpointTypes.push({
                                    id: "azurerm-connection",
                                    text: AdminResources.AzureRMConnectionType,
                                    title: AdminResources.AzureRMConnectionType,
                                    showText: true,
                                    noIcon: true,
                                    action: () => {
                                        var dialogModel = new AddAzureRmEndpointsModel(endpointCreatedsuccessCallBack);
                                        Dialogs.show(AddAzureRmEndpointsDialog, dialogModel);
                                    }
                                });
                                break;

                            case AdminCommon.ServiceEndpointType.Docker:
                                enabledEndpointTypes.push({
                                    id: endpointType.name,
                                    text: endpointType.displayName,
                                    title: endpointType.displayName,
                                    showText: true,
                                    noIcon: true,
                                    action: (type: ServiceEndpointContracts.ServiceEndpointType) => {
                                        var dialogModel = new AddDockerRegistryEndpointModel(endpointCreatedsuccessCallBack);
                                        Dialogs.show(AddDockerRegistryEndpointsDialog, dialogModel);
                                    }
                                });
                                break;

                            case AdminCommon.ServiceEndpointType.Kubernetes:
                                enabledEndpointTypes.push({
                                    id: endpointType.name,
                                    text: endpointType.displayName,
                                    title: endpointType.displayName,
                                    showText: true,
                                    noIcon: true,
                                    action: (type: ServiceEndpointContracts.ServiceEndpointType) => {
                                        var dialogModel = new AddKubernetesEndpointModel(endpointCreatedsuccessCallBack);
                                        Dialogs.show(AddKubernetesEndpointsDialog, dialogModel);
                                    }
                                });
                                break;

                            case AdminCommon.ServiceEndpointType.Gcp:
                                enabledEndpointTypes.push({
                                    id: "gcp-connection",
                                    text: AdminResources.GcpConnectionType,
                                    title: AdminResources.GcpConnectionType,
                                    showText: true,
                                    noIcon: true,
                                    action: () => {
                                        var dialogModel = new GcpEndpointsManageDialog.AddGcpConnectionsModel(endpointCreatedsuccessCallBack);
                                        dialogModel.dialogTemplate = "add_gcp_connections_dialog";
                                        Dialogs.show(GcpEndpointsManageDialog.AddGcpEndpointsDialog, dialogModel);
                                    }
                                });
                                break;

                            case AdminCommon.ServiceEndpointType.Bitbucket:
                                break;

                            default:
                                enabledEndpointTypes.push({
                                    id: endpointType.name,
                                    text: endpointType.displayName,
                                    title: endpointType.displayName,
                                    showText: true,
                                    noIcon: true,
                                    action: (type: ServiceEndpointContracts.ServiceEndpointType) => {
                                        var dialogModel = new AddCustomConnectionsModel(type, "", null, type.authenticationSchemes[0].scheme, false, endpointCreatedsuccessCallBack);
                                        Dialogs.show(AddCustomConnectionsDialog, dialogModel);
                                    },
                                    arguments: endpointType
                                });
                        }
                    }
                }

                enabledEndpointTypes.sort((a: Menus.IMenuItemSpec, b: Menus.IMenuItemSpec): number => {
                    return (Utils_String.ignoreCaseComparer(a.text, b.text));
                });
            });
        },
            (reason) => {
                Diag.logError(reason);
                VSS.handleError({ name: "", message: AdminResources.CouldNotFetchEndpointTypes });
            });


        return [
            {
                id: "new-service-endpoint",
                text: AdminResources.NewServiceEndpoint,
                icon: "bowtie-icon bowtie-math-plus",
                childItems: enabledEndpointTypes,
                cssClass: "new-service-endpoint-title"
            }
        ]
    }

    private _getConnectedServiceMenuItems(): Menus.IMenuItemSpec[] {
        return [
            {
                id: "new-connected-service",
                text: AdminResources.NewConnectedService,
                icon: "icon-add",
                childItems: [
                    {
                        id: "azure-connection",
                        text: AdminResources.AzureConnectionType,
                        title: AdminResources.AzureConnectionType,
                        showText: true,
                        noIcon: true,
                        action: () => {
                            var dialogModel = new AzureLegacyDeploymentsManageDialog.AddLegacyDeploymentEnvironmentsModel(connectedServiceCreatedSuccessCallBack);
                            Dialogs.show(AzureLegacyDeploymentsManageDialog.AddLegacyDeploymentEnvironmentsDialog, dialogModel);
                        }
                    }
                ]
            }
        ]
    }
}

// Main Resource tree
export class ResourceTree extends ResourceAdminTreeView.CommonAdminTree {

    private _TaskAgentHttpClient: TFS_Admin_ServiceEndpoints.ServiceEndPointService;
    private _connectedServiceHttpClient: TFS_Admin_ConnectedServices.ConnectedServicesService;

    private _serviceEndpointTypesPromise: IPromise<ServiceEndpointContracts.ServiceEndpointType[]>;
    private _serviceEndpointPromise: IPromise<ServiceEndpointResource[]>;
    private _connectedServicePromise: Q.Deferred<ResourceAdminTreeView.IResource[]>;

    private _disposables: IDisposable[] = [];

    public initializeOptions(options?: any): void {
        $.extend(options, {
            resourceMenuItems: [],
            resourceNodeCss: "",
            identityImageCss: "endpoint-admin-identity-image",
            contextMenu: null
        });

        this._serviceEndpointTypesPromise = options.serviceEndpointTypesPromise;

        super.initializeOptions(options);
    }

    public initialize() {
        super.initialize();
        var tfsConnection = new Service.VssConnection(tfsContext.contextData);
        this._TaskAgentHttpClient = tfsConnection.getService<TFS_Admin_ServiceEndpoints.ServiceEndPointService>(TFS_Admin_ServiceEndpoints.ServiceEndPointService);
        this._connectedServiceHttpClient = tfsConnection.getService<TFS_Admin_ConnectedServices.ConnectedServicesService>(TFS_Admin_ConnectedServices.ConnectedServicesService);

        this._disposables.push(ServiceResourceObservables.endPointDisconnected.subscribe((value) => {
            if (value) {
                this._fire("resource-deleted", {
                    action: ResourceAdminTreeView.CommonAdminActionIds.Resources
                });
            }
        }));

        this._disposables.push(ServiceResourceObservables.createdEndpoint.subscribe((endpoint) => {
            if (endpoint && endpoint.id) {
                this._fire("resource-created", {
                    action: ResourceAdminTreeView.CommonAdminActionIds.Resources,
                    id: endpoint.id,
                    elementToFocus: ServiceResourceObservables.elementToFocus()
                });
            }
        }));

        this._disposables.push(ServiceResourceObservables.connectedServiceDisconnected.subscribe((value) => {
            if (value) {
                this._fire("resource-deleted", {
                    action: AdminCommon.CommonServicesActionIds.ConnectedServices
                });
            }
        }));

        this._disposables.push(ServiceResourceObservables.connectedServiceCreatedId.subscribe((id) => {
            if (id) {
                this._fire("resource-created", {
                    action: AdminCommon.CommonServicesActionIds.ConnectedServices,
                    id: id,
                    elementToFocus: ServiceResourceObservables.elementToFocus()
                });
            }
        }));

    }

    public beginGetResources(action?: string, refresh: boolean = true): IPromise<ResourceAdminTreeView.IResource[]> {
        switch (action) {
            case AdminCommon.CommonServicesActionIds.ConnectedServices:
                if (refresh || !this._connectedServicePromise) {
                    this._connectedServicePromise = Q.defer<ResourceAdminTreeView.IResource[]>();
                    this._connectedServiceHttpClient.beginGetConnectedServices().then((connectedServices) => {
                        var resources: ResourceAdminTreeView.IResource[] = [];
                        connectedServices.forEach((connectedService) => {
                            var resource: ResourceAdminTreeView.IResource = {
                                name: connectedService.friendlyName,
                                id: connectedService.id,
                                administratorsGroup: null,
                                readersGroup: null
                            };
                            // Filtering off connections which doesn't have valid friendly names to display
                            if (resource.name) {
                                resources.push(resource);
                            }
                        });

                        this._connectedServicePromise.resolve(resources);
                    }, (error) => {
                        VSS.handleError(error);
                        this._connectedServicePromise.resolve([]);
                    });
                }

                return this._connectedServicePromise.promise;
            case ResourceAdminTreeView.CommonAdminActionIds.Resources:
            default:
                if (refresh || !this._serviceEndpointPromise) {
                    var serviceEndpointsPromise = this._TaskAgentHttpClient.beginGetServiceEndPoints(null, true);
                    this._serviceEndpointPromise = Q.all([this._serviceEndpointTypesPromise, serviceEndpointsPromise])
                        .spread((endpointTypes: ServiceEndpointContracts.ServiceEndpointType[], endpoints: ServiceEndpointContracts.ServiceEndpoint[]) => {
                            if (!!ServiceResourceObservables.createdEndpoint()) {
                                var createdEndpointPresent = endpoints.some((endpoint: ServiceEndpointContracts.ServiceEndpoint) => {
                                    return endpoint.id === ServiceResourceObservables.createdEndpoint().id;
                                });

                                if (!createdEndpointPresent) {
                                    endpoints.push(ServiceResourceObservables.createdEndpoint());
                                }

                                ServiceResourceObservables.createdEndpoint(null);
                            }

                            var serviceEndpointResources: ServiceEndpointResource[] = endpoints;
                            serviceEndpointResources.forEach((endpoint: ServiceEndpointResource) => {
                                var endpointType = endpointTypes.filter((endpointType) => Utils_String.equals(endpointType.name, endpoint.type, true))[0];
                                if (!!endpointType) {
                                    endpoint.iconUrl = endpointType.iconUrl;
                                }

                                endpoint.administratorsGroup = null;
                                endpoint.readersGroup = null;
                            });

                            return serviceEndpointResources;
                        }, (error) => {
                            VSS.handleError(error);
                            return [];
                        });

                }
                return this._serviceEndpointPromise;
        }

    }

    public formatGroupDisplayName(name: string): string {
        return name.replace(/^\[.+\]\\/, "");
    }

    public getResouceNodeIcon(resource: any): string {
        if (resource.iconUrl && resource.iconUrl !== "") {
            return `url ${resource.iconUrl}`;
        }

        var icon = "icon ";
        if (resource.type) {
            switch (resource.type.toLowerCase()) {
                case AdminCommon.ServiceEndpointType.Azure:
                    icon += "icon-azure-endpoint";
                    break;

                case AdminCommon.ServiceEndpointType.AzureRM:
                    icon = "bowtie-icon bowtie-azure-api-management azure-endpoint-blue";
                    break;

                case AdminCommon.ServiceEndpointType.Gcp:
                    icon = "icon-gcp-endpoint";
                    break;

                case AdminCommon.ServiceEndpointType.Chef:
                    icon += "icon-chef-endpoint";
                    break;

                case AdminCommon.ServiceEndpointType.Generic:
                    icon += "icon-generic-endpoint";
                    break;

                case AdminCommon.ServiceEndpointType.GitHub:
                    icon += "icon-git-endpoint";
                    break;

                case AdminCommon.ServiceEndpointType.GitHubEnterprise:
                    icon += "icon-git-endpoint";
                    break;

                case AdminCommon.ServiceEndpointType.Bitbucket:
                    icon += "icon-git-endpoint";
                    break;

                case AdminCommon.ServiceEndpointType.SSH:
                    icon += "icon-ssh-endpoint";
                    break;

                case AdminCommon.ServiceEndpointType.Subversion:
                    icon += "icon-svn-endpoint";
                    break;

                default:
                    icon += "icon-generic-endpoint";
                    break;
            }
        }
        else {
            // no type => legacy connected service
            icon += "icon-azure-endpoint";
        }

        return icon;
    }

    dispose(): void {
        super.dispose();
        $.each(this._disposables, (index, disposable) => {
            disposable.dispose();
        });
    }
}

// Details View on right pane for end points - base & azure
class ServicesDetailsView extends KnockoutAdapter.TemplateControl<ServicesDetailsViewModel> {
    constructor(viewModel: ServicesDetailsViewModel) {
        super(viewModel, {
            templateId: "connected-service-details"
        });
    }

    initialize(): void {
        super.initialize();
        this._performBinding(this._element, this._options);
    }
}

// Details View Model on right pane for end points - base
class ServicesDetailsViewModel extends KnockoutAdapter.TemplateViewModel {
    public deploymentEnvironments: KnockoutObservableArray<string> = ko.observableArray([]);
    public name: KnockoutObservable<string> = ko.observable("");
    public connectionType: KnockoutObservable<string> = ko.observable("");
    public detailsId: KnockoutObservable<string> = ko.observable("");
    public serviceUri: KnockoutObservable<string> = ko.observable("");
    public description: KnockoutObservable<string> = ko.observable("");
    public createdBy: KnockoutObservable<string> = ko.observable("");
    public connectedUsing: KnockoutObservable<string> = ko.observable("");
    public warning: KnockoutObservable<string> = ko.observable("");
    public data: KnockoutObservable<EndpointData> = ko.observable(null);
    public endpointDetails: KnockoutObservable<DistributedTaskExtension_Contracts.ServiceEndpointUiExtensionDetails> = ko.observable(null);
    public environment: KnockoutObservable<string> = ko.observable(null);
    public showDeploymentEnvironment: KnockoutObservable<boolean> = ko.observable(false);
    public authorizationScheme: string = "";
    public isReady: boolean = true;
    public operationStatus = { "state": "Ready", "statusMessage": "" };
    public successCallBack: (serviceEndpoint: ServiceEndpointContracts.ServiceEndpoint) => void;
    public shareAcrossProjectsEnabled: KnockoutObservable<boolean> = ko.observable(FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled("WebAccess.ServiceEndpoints.ShareAcrossProjects", false));

    constructor(successCallback: (serviceEndpoint: ServiceEndpointContracts.ServiceEndpoint) => void) {
        super();
        this.successCallBack = successCallback;
        var tfsConnection = new Service.VssConnection(tfsContext.contextData);
        this._TaskAgentHttpClient = tfsConnection.getService<TFS_Admin_ServiceEndpoints.ServiceEndPointService>(TFS_Admin_ServiceEndpoints.ServiceEndPointService);
    }

    public disconnectService(): void {
        this._TaskAgentHttpClient.beginGetServiceEndPoint(this.detailsId.peek() || ServiceResourceObservables.selectedResourceId.peek())
            .then((endpoint) => {
                if (endpoint) {
                    Dialogs.show(AdminDialogs.DeleteServiceEndpointConfirmationDialog, {
                        tfsContext: tfsContext,
                        successCallback: () => {
                            ServiceResourceObservables.endPointDisconnected.notifySubscribers(true);
                            this.name("");
                        },
                        connectedService: endpoint
                    });
                }
                else {
                    VSS.handleError({ name: "", message: AdminResources.EndpointDoesnotExist });
                }
            },
                (reason) => {
                    Diag.logError(reason);
                    VSS.handleError({ name: "", message: AdminResources.EndpointDoesnotExist });
                });
    }

    public shareAcrossProjects(): void {
        let endpointId: string = this.detailsId.peek() || ServiceResourceObservables.selectedResourceId.peek();
        const props: TeamProjectPickListPanelProps = {
            endpointId: endpointId,
            onClose: this.onClose
        };

        var uniqid = "ShareEndpointsToProjects" + Date.now().toString();
        if (!document.getElementById(uniqid)) {
            var div = document.createElement("div");
            div.id = uniqid;
            document.body.appendChild(div);
        }

        ReactDOM.render(React.createElement(TeamProjectPickListPanel, props), document.getElementById(uniqid));
    }

    private onClose = (isUpdated: boolean): void => {
        if (isUpdated) {
            this._TaskAgentHttpClient.beginGetServiceEndPoint(this.detailsId.peek() || ServiceResourceObservables.selectedResourceId.peek())
                .then((endpoint) => {
                    this.successCallBack(endpoint);
                },
                    (reason) => {
                        Diag.logError(reason);
                        VSS.handleError({ name: "", message: AdminResources.EndpointDoesnotExist });
                    });
        }
    }

    public updateServiceDetails(endpoint: ServiceEndpointContracts.ServiceEndpoint) {
        this.name(endpoint.name);
        this.description(endpoint.description);
        this.authorizationScheme = endpoint.authorization.scheme;
        this.serviceUri(endpoint.url);

        // Extract endpoint data, as well as the authorization parameters data...
        var endpointData: EndpointData = endpoint.data;
        if (endpoint.authorization && endpoint.authorization.parameters) {
            Object.keys(endpoint.authorization.parameters).forEach(key => endpointData[key] = endpoint.authorization.parameters[key]);
        }

        this.data(endpointData);

        var serviceEndpointUIExtensionDetails: DistributedTaskExtension_Contracts.ServiceEndpointUiExtensionDetails =
            {
                authorization: endpoint.authorization,
                data: endpoint.data,
                name: endpoint.name,
                type: endpoint.type,
                url: endpoint.url
            }

        this.endpointDetails(serviceEndpointUIExtensionDetails);
        this.isReady = endpoint.isReady;
        this.operationStatus = endpoint.operationStatus;
        if (Utils_String.equals(endpoint.authorization.scheme, EndpointAuthorizationSchemes.OAuth2, false)
            && !this.isReady && this.operationStatus && this.operationStatus.state === "OAuthConfigurationDeleted") {
            this.warning(this.operationStatus.statusMessage);
        } else {
            this.warning("");
        }

        this.detailsId(endpoint.id);
        var connectionType = endpoint.type.charAt(0).toUpperCase() + endpoint.type.substr(1).toLowerCase();
        this.connectionType(connectionType);
        this.createdBy(endpoint.createdBy.displayName);
        var connectingUsing = AdminResources.ConnectionTypeCredentials;
        if (Utils_String.equals(endpoint.authorization.scheme, AdminCommon.EndpointAuthorizationSchemes.UsernamePassword, true)) {
            connectingUsing = AdminResources.ConnectionTypeCredentials;
        }
        else if (Utils_String.equals(endpoint.authorization.scheme, AdminCommon.EndpointAuthorizationSchemes.Certificate, true)) {
            connectingUsing = AdminResources.ConnectionTypeCertificate;
        }
        else if (Utils_String.equals(endpoint.authorization.scheme, AdminCommon.EndpointAuthorizationSchemes.ServicePrincipal, true)) {
            connectingUsing = AdminResources.ConnectionTypeServicePrincipal;
        }
        else if (Utils_String.equals(endpoint.authorization.scheme, AdminCommon.EndpointAuthorizationSchemes.OAuth, true)) {
            connectingUsing = AdminResources.ConnectionTypeOauth;
        }
        else if (Utils_String.equals(endpoint.authorization.scheme, AdminCommon.EndpointAuthorizationSchemes.OAuth2, true)) {
            connectingUsing = AdminResources.ConnectionTypeOauth2;
        }
        else if (Utils_String.equals(endpoint.authorization.scheme, AdminCommon.EndpointAuthorizationSchemes.PersonalAccessToken, true)) {
            connectingUsing = AdminResources.ConnectionTypePersonalAccessToken;
        }
        else if (Utils_String.equals(endpoint.authorization.scheme, AdminCommon.EndpointAuthorizationSchemes.Token, true)) {
            connectingUsing = AdminResources.ConnectionTypeToken;
        }
        else if (Utils_String.equals(endpoint.authorization.scheme, AdminCommon.EndpointAuthorizationSchemes.ManagedServiceIdentity, true)) {
            connectingUsing = AdminResources.ConnectionTypeManagedServiceIdentity;
        }

        this.connectedUsing(connectingUsing);
        this.deploymentEnvironments([]);
    }

    public onKeyDown(data: any, event: JQueryEventObject): boolean {
        var currentElement: JQuery = $(event.target);

        switch (event.keyCode) {
            case Utils_UI.KeyCode.ENTER:
                currentElement.click();
                return false;

            case Utils_UI.KeyCode.SPACE:
                currentElement.click();
                return false;

            default:
                return true;
        }
    }

    protected _TaskAgentHttpClient: TFS_Admin_ServiceEndpoints.ServiceEndPointService;
}

// Details View on right pane for end points - external
class ServicesDetailsViewExternalGit extends KnockoutAdapter.TemplateControl<ExternalGitServicesDetailsViewModel> {
    constructor(viewModel: ExternalGitServicesDetailsViewModel) {
        super(viewModel, {
            // external git shares the same template as generic
            templateId: "generic-connected-service-details"
        });
    }

    initialize(): void {
        super.initialize();
        this._performBinding(this._element, this._options);
    }
}

// Details View Model on right pane for end points - external
class ExternalGitServicesDetailsViewModel extends ServicesDetailsViewModel {
    constructor(successCallback: (serviceEndpoint: ServiceEndpointContracts.ServiceEndpoint) => void) {
        super(successCallback);
    }

    public updateConnection(): void {
        var connectionModel = new AddServiceEndpointModel(this.successCallBack);
        // external git looks just like generic for now
        connectionModel.dialogTemplate = "add_generic_connections_dialog";
        connectionModel.id(this.detailsId());
        connectionModel.serverUrl(this.serviceUri());
        connectionModel.name(this.name());
        connectionModel.title = Utils_String.format(AdminResources.UpdateAuthenticationDialogTitle, this.name());
        connectionModel.isUpdate(true);
        if (this.data() != null) {
            connectionModel.userName(this.data()["username"]);
        }

        connectionModel.disconnectService = true;
        Dialogs.show(ExternalGitEndpointsManageDialog.AddExternalGitEndpointsDialog, connectionModel);
    }
}

// Details View Model on right pane for end points - azure
class AzureServicesDetailsViewModel extends ServicesDetailsViewModel {
    constructor(successCallback: (serviceEndpoint: ServiceEndpointContracts.ServiceEndpoint) => void) {
        super(successCallback);
    }

    public updateAuthentication(): void {
        var dialogModel = new AzureEndpointsManageDialog.AddAzureEndpointsModel(this.connectedUsing(), this.successCallBack);
        dialogModel.id(this.detailsId());
        dialogModel.subscriptionid(this.data()["subscriptionId"] || this.detailsId());
        dialogModel.name(this.name());
        dialogModel.title = Utils_String.format(AdminResources.UpdateAuthenticationDialogTitle, this.name());
        dialogModel.isUpdate(true);
        dialogModel.disconnectService = true;
        Dialogs.show(AzureEndpointsManageDialog.AddAzureEndpointsDialog, dialogModel);
    }
}

// Details View on right pane for end points - generic
class ServicesDetailsViewGcp extends KnockoutAdapter.TemplateControl<GcpServicesDetailsViewModel> {
    constructor(viewModel: GcpServicesDetailsViewModel) {
        super(viewModel, {
            templateId: "gcp-connected-service-details"
        });
    }

    initialize(): void {
        super.initialize();
        this._performBinding(this._element, this._options);
    }
}

// Details View Model on right pane for end points - generic
class GcpServicesDetailsViewModel extends ServicesDetailsViewModel {
    public certificate: KnockoutObservable<string> = ko.observable("");
    public audience: KnockoutObservable<string> = ko.observable("");
    constructor(successCallback: (serviceEndpoint: ServiceEndpointContracts.ServiceEndpoint) => void) {
        super(successCallback);
    }

    public updateConnection(): void {
        var connectionModel = new GcpEndpointsManageDialog.AddGcpConnectionsModel(this.successCallBack);
        connectionModel.dialogTemplate = "add_gcp_connections_dialog";
        connectionModel.id(this.detailsId());
        connectionModel.serverUrl(this.serviceUri());
        connectionModel.audience(this.data()["audience"]);
        connectionModel.issuer(this.data()["issuer"]);
        connectionModel.projectid(this.data()["projectid"]);
        connectionModel.serverUrl(this.serviceUri());
        connectionModel.name(this.name());
        connectionModel.title = Utils_String.format(AdminResources.UpdateAuthenticationDialogTitle, this.name());
        connectionModel.isUpdate(true);
        connectionModel.disconnectService = true;
        Dialogs.show(GcpEndpointsManageDialog.AddGcpEndpointsDialog, connectionModel);
    }
}

// Details View on right pane for end points - docker
class ServicesDetailsViewDockerRegistry extends KnockoutAdapter.TemplateControl<DockerRegistryServicesDetailsViewModel> {
    constructor(viewModel: DockerRegistryServicesDetailsViewModel) {
        super(viewModel, {
            templateId: "docker-connected-service-details"
        });
    }

    initialize(): void {
        super.initialize();
        this._performBinding(this._element, this._options);
    }
}


// Details View Model on right pane for end points - docker
class DockerRegistryServicesDetailsViewModel extends ServicesDetailsViewModel {
    public certificate: KnockoutObservable<string> = ko.observable("");
    public audience: KnockoutObservable<string> = ko.observable("");
    constructor(successCallback: (serviceEndpoint: ServiceEndpointContracts.ServiceEndpoint) => void) {
        super(successCallback);
    }

    public updateConnection(): void {
        var connectionModel = new AddDockerRegistryEndpointModel(this.successCallBack);
        connectionModel.dialogTemplate = "add_docker_connections_dialog";
        connectionModel.id(this.detailsId());
        connectionModel.serverUrl(this.serviceUri());
        connectionModel.registrytype(this.data()["registrytype"]);
        connectionModel.serverUrl(this.serviceUri());
        connectionModel.userName(this.data()["username"]);
        connectionModel.email(this.data()["email"]);
        connectionModel.registry(this.data()["registry"]);
        connectionModel.name(this.name());
        connectionModel.title = Utils_String.format(AdminResources.UpdateAuthenticationDialogTitle, this.name());
        connectionModel.isUpdate(true);
        connectionModel.disconnectService = true;
        Dialogs.show(AddDockerRegistryEndpointsDialog, connectionModel);
    }
}

// Details View on right pane for end points - kubernetes
class ServicesDetailsViewKubernetes extends KnockoutAdapter.TemplateControl<KubernetesServicesDetailsViewModel> {
    constructor(viewModel: KubernetesServicesDetailsViewModel) {
        super(viewModel, {
            templateId: "kubernetes-connected-service-details"
        });
    }

    initialize(): void {
        super.initialize();
        this._performBinding(this._element, this._options);
    }
}

// Details View Model on right pane for end points - kubernetes
class KubernetesServicesDetailsViewModel extends ServicesDetailsViewModel {
    public isExtensionDisabled: KnockoutObservable<boolean> = ko.observable(false);

    constructor(successCallback: (serviceEndpoint: ServiceEndpointContracts.ServiceEndpoint) => void) {
        super(successCallback);

    }

    public updateConnection(): void {
        var connectionModel = new AddKubernetesEndpointModel(this.successCallBack);
        connectionModel.dialogTemplate = "add_kubernetes_connections_dialog";
        connectionModel.id(this.detailsId());
        connectionModel.serverUrl(this.serviceUri());
        connectionModel.name(this.name());

        if (!!this.data()["authorizationType"])
        {
           connectionModel.authorizationType(this.data()["authorizationType"]);
		   if(connectionModel.authorizationType() == "Kubeconfig")
		   {
			 connectionModel.authenticationScheme(EndpointAuthorizationSchemes.Kubernetes);
		   }	   
        }
        else {
            connectionModel.authenticationScheme(EndpointAuthorizationSchemes.Kubernetes);
        }

        if (this.authorizationScheme) {
            connectionModel.authenticationScheme(this.authorizationScheme);
        }

        if (!!this.data()["acceptUntrustedCerts"])
        {
            connectionModel.acceptUntrustedCerts(JSON.parse(this.data()["acceptUntrustedCerts"]));
        }

        if (!!this.authorizationScheme && (Utils_String.equals(this.authorizationScheme, EndpointAuthorizationSchemes.None, true) || Utils_String.equals(this.authorizationScheme, EndpointAuthorizationSchemes.UsernamePassword, true)))
		{
			connectionModel.authenticationScheme(EndpointAuthorizationSchemes.Kubernetes);
		}
		 
        connectionModel.isUpdate(true);
        connectionModel.title = Utils_String.format(AdminResources.UpdateAuthenticationDialogTitle, this.name());
        connectionModel.disconnectService = true;
        Dialogs.show(AddKubernetesEndpointsDialog, connectionModel);
    }
}

// Details View on right pane for end points - generic
class ServicesDetailsViewGeneric extends KnockoutAdapter.TemplateControl<GenericServicesDetailsViewModel> {
    constructor(viewModel: GenericServicesDetailsViewModel) {
        super(viewModel, {
            templateId: "generic-connected-service-details"
        });
    }

    initialize(): void {
        super.initialize();
        this._performBinding(this._element, this._options);
    }
}

// Details View Model on right pane for end points - generic
class GenericServicesDetailsViewModel extends ServicesDetailsViewModel {
    constructor(successCallback: (serviceEndpoint: ServiceEndpointContracts.ServiceEndpoint) => void) {
        super(successCallback);
    }

    public updateConnection(): void {
        var connectionModel = new AddServiceEndpointModel(this.successCallBack);
        connectionModel.dialogTemplate = "add_generic_connections_dialog";
        connectionModel.id(this.detailsId());
        connectionModel.serverUrl(this.serviceUri());
        connectionModel.name(this.name());
        connectionModel.title = Utils_String.format(AdminResources.UpdateAuthenticationDialogTitle, this.name());
        connectionModel.isUpdate(true);
        if (this.data() != null) {
            connectionModel.userName(this.data()["username"]);
        }
        connectionModel.disconnectService = true;
        Dialogs.show(GenericEndpointsManageDialog.AddGenericEndpointsDialog, connectionModel);
    }
}

// Details View Model on right pane for end points - svn
class ServicesDetailsViewSvn extends KnockoutAdapter.TemplateControl<SvnServicesDetailsViewModel> {
    constructor(viewModel: SvnServicesDetailsViewModel) {
        super(viewModel, {
            templateId: "svn-connected-service-details"
        });
    }

    initialize(): void {
        super.initialize();
        this._performBinding(this._element, this._options);
    }
}

class ServicesDetailsViewSsh extends KnockoutAdapter.TemplateControl<SshServicesDetailsViewModel> {
    constructor(viewModel: SshServicesDetailsViewModel) {
        super(viewModel, {
            templateId: "ssh-connected-service-details"
        });
    }

    initialize(): void {
        super.initialize();
        this._performBinding(this._element, this._options);
    }
}

// Details View Model on right pane for end points - svn
class SvnServicesDetailsViewModel extends ServicesDetailsViewModel {
    constructor(successCallback: (serviceEndpoint: ServiceEndpointContracts.ServiceEndpoint) => void) {
        super(successCallback);
    }

    public updateConnection(): void {
        var connectionModel = new SvnEndpointsManageDialog.AddSvnConnectionsModel(this.successCallBack);
        connectionModel.dialogTemplate = "add_svn_connections_dialog";
        connectionModel.id(this.detailsId());
        connectionModel.serverUrl(this.serviceUri());
        connectionModel.name(this.name());
        connectionModel.title = Utils_String.format(AdminResources.UpdateAuthenticationDialogTitle, this.name());
        connectionModel.isUpdate(true);
        if (this.data() != null) {
            connectionModel.userName(this.data()["username"]);
        }

        connectionModel.disconnectService = true;
        connectionModel.realmName(this.data()["realmName"]);
        connectionModel.acceptUntrustedCerts(Utils_String.equals(this.data()["acceptUntrustedCerts"], "true", true));
        Dialogs.show(SvnEndpointsManageDialog.AddSvnEndpointsDialog, connectionModel);
    }
}

class SshServicesDetailsViewModel extends ServicesDetailsViewModel {
    constructor(successCallback: (serviceEndpoint: ServiceEndpointContracts.ServiceEndpoint) => void) {
        super(successCallback);
    }

    public updateConnection(): void {
        var connectionModel = new SshEndpointsManageDialog.AddSshConnectionsModel(this.successCallBack);
        connectionModel.dialogTemplate = "add_ssh_connections_dialog";
        connectionModel.id(this.detailsId());
        connectionModel.serverUrl(this.serviceUri());
        connectionModel.name(this.name());
        connectionModel.title = Utils_String.format(AdminResources.UpdateAuthenticationDialogTitle, this.name());
        connectionModel.isUpdate(true);
        connectionModel.disconnectService = true;
        connectionModel.host(this.data()["host"]);
        connectionModel.port(this.data()["port"]);
        connectionModel.privateKey(this.data()["privateKey"]);
        if (this.data() != null) {
            connectionModel.userName(this.data()["username"]);
        }

        Dialogs.show(SshEndpointsManageDialog.AddSshEndpointsDialog, connectionModel);
    }
}

// Details View on right pane for end points - github
class ServicesDetailsViewGitHub extends KnockoutAdapter.TemplateControl<GitHubServicesDetailsViewModel> {
    constructor(viewModel: GitHubServicesDetailsViewModel) {
        super(viewModel, {
            templateId: "github-connected-service-details"
        });
    }

    initialize(): void {
        super.initialize();
        this._performBinding(this._element, this._options);
    }
}

// Details View Model on right pane for end points - github
class GitHubServicesDetailsViewModel extends ServicesDetailsViewModel {
    constructor(successCallback: (serviceEndpoint: ServiceEndpointContracts.ServiceEndpoint) => void) {
        super(successCallback);
    }

    public updateConnection() {
        var connectionModel = new GitHubEndpointsManageDialog.AddGitHubConnectionsModel(this.successCallBack);
        connectionModel.dialogTemplate = "add_github_connections_dialog";
        connectionModel.id(this.detailsId());
        connectionModel.serverUrl(this.serviceUri());
        connectionModel.name(this.name());
        connectionModel.authorizationScheme = this.authorizationScheme;
        connectionModel.title = Utils_String.format(AdminResources.UpdateAuthenticationDialogTitle, this.name());
        connectionModel.isUpdate(true);
        connectionModel.disconnectService = true;
        Dialogs.show(GitHubEndpointsManageDialog.AddGitHubEndpointsDialog, connectionModel);
    }
}

// Details View on right pane for end points - bitbucket
class ServicesDetailsViewBitbucket extends KnockoutAdapter.TemplateControl<BitbucketServicesDetailsViewModel> {
    constructor(viewModel: BitbucketServicesDetailsViewModel) {
        super(viewModel, {
            templateId: "bitbucket-connected-service-details"
        });
    }

    initialize(): void {
        super.initialize();
        this._performBinding(this._element, this._options);
    }
}

// Details View Model on right pane for end points - bitbucket
class BitbucketServicesDetailsViewModel extends ServicesDetailsViewModel {
    constructor(successCallback: (serviceEndpoint: ServiceEndpointContracts.ServiceEndpoint) => void) {
        super(successCallback);
    }

    public updateConnection() {
        var connectionModel = new BitbucketEndpointsManageDialog.AddBitbucketConnectionsModel(this.successCallBack);
        connectionModel.dialogTemplate = "add_bitbucket_connections_dialog";
        connectionModel.id(this.detailsId());
        connectionModel.serverUrl(this.serviceUri());
        connectionModel.name(this.name());
        connectionModel.authorizationScheme = this.authorizationScheme;
        connectionModel.title = Utils_String.format(AdminResources.UpdateAuthenticationDialogTitle, this.name());
        connectionModel.isUpdate(true);
        if (this.data() != null) {
            connectionModel.userName(this.data()["username"]);
        }

        connectionModel.disconnectService = true;
        Dialogs.show(BitbucketEndpointsManageDialog.AddBitbucketEndpointsDialog, connectionModel);
    }
}

// Details View on right pane for end points - custom
class ServicesDetailsViewCustom extends KnockoutAdapter.TemplateControl<CustomServicesDetailsViewModel> {
    constructor(viewModel: CustomServicesDetailsViewModel) {
        super(viewModel, {
            templateId: "custom-connected-service-details"
        });
    }

    initialize(): void {
        super.initialize();
        this._performBinding(this._element, this._options);
    }
}

// Details View Model on right pane for end points - custom
class CustomServicesDetailsViewModel extends ServicesDetailsViewModel {

    public isExtensionDisabled: KnockoutObservable<boolean> = ko.observable(false);

    constructor(endpointType: ServiceEndpointContracts.ServiceEndpointType, selectedScheme: string, successCallback: (serviceEndpoint: ServiceEndpointContracts.ServiceEndpoint) => void) {
        super(successCallback);

        if (!endpointType) {
            this.isExtensionDisabled(true);
        }

        this._endpointType = endpointType;
        this._selectedAuthScheme = selectedScheme;
    }

    public updateConnection() {
        var connectionModel = new AddCustomConnectionsModel(this._endpointType, this.serviceUri(), this.data(), this._selectedAuthScheme, true, this.successCallBack);
        connectionModel.id(this.detailsId());
        connectionModel.name(this.name());
        connectionModel.description(this.description());
        connectionModel.title = Utils_String.format(AdminResources.UpdateAuthenticationDialogTitle, this.name());
        connectionModel.disconnectService = true;
        connectionModel.isReady = this.isReady;
        connectionModel.operationStatus = this.operationStatus;
        Dialogs.show(AddCustomConnectionsDialog, connectionModel);

        if (!this.isReady && this.operationStatus && this.operationStatus.state === "OAuthConfigurationDeleted") {
            connectionModel.errors([]);
            connectionModel.errors.push(this.operationStatus.statusMessage);
        }
    }

    public updateServiceDetails(endpoint: ServiceEndpointContracts.ServiceEndpoint) {
        super.updateServiceDetails(endpoint);
        this._selectedAuthScheme = endpoint.authorization.scheme;

        if (this._endpointType) {
            this.connectionType(this._endpointType.displayName);
        }
        else {
            this.connectionType(Utils_String.format(AdminResources.EndpointTypeNotFound, endpoint.type));
        }
    }

    _endpointType: ServiceEndpointContracts.ServiceEndpointType;
    _selectedAuthScheme: string;
}

class ServicesDetailsViewUIContribution extends KnockoutAdapter.TemplateControl<UIContributionDetailsViewModel> {
    constructor(viewModel: UIContributionDetailsViewModel) {
        super(viewModel, {
            templateId: "custom-connected-service-details"
        });
    }

    initialize(): void {
        super.initialize();
        this._performBinding(this._element, this._options);
    }
}

// Details View Model on right pane for end points containing ui contribution
class UIContributionDetailsViewModel extends ServicesDetailsViewModel {
    public isExtensionDisabled: KnockoutObservable<boolean> = ko.observable(false);
    public contributionsPromise: any;
    public endpointType: ServiceEndpointContracts.ServiceEndpointType;
    constructor(endpointType: ServiceEndpointContracts.ServiceEndpointType, successCallback: (serviceEndpoint: ServiceEndpointContracts.ServiceEndpoint) => void) {
        super(successCallback);
        if (!endpointType) {
            this.isExtensionDisabled(true);
        }
        else {
            this.endpointType = endpointType;
        }
    }

    public updateConnection(): void {
        var endpointContribution;
        this.contributionsPromise = Service.getService(Contributions_Services.ExtensionService).getContributionsForTarget("ms.vss-endpoint.endpoint-ui-catalog");
        this.contributionsPromise.then((contributions) => {
            endpointContribution = contributions.filter((contribution) => contribution.id.endsWith(this.endpointType.uiContributionId));

            var endpointDetails: DistributedTaskExtension_Contracts.ServiceEndpointUiExtensionDetails = this.endpointDetails();
            var endpointId: string = this.detailsId();

            if (endpointContribution) {
                var connectionModel = new AddServiceEndpointUIContributionConnectionModel(this.successCallBack, this.endpointType.dataSources, endpointContribution[0], this.endpointType.name, this.endpointType.displayName, endpointDetails, endpointId, true);
                Dialogs.show(AddServiceEndpointUIContributionDialog, connectionModel);
            }
        });

        this.contributionsPromise.catch(() => {
            Diag.logError(Utils_String.format(AdminResources.FailedToFindEndpointUIContribution, this.endpointType.uiContributionId));
        });
    }
}

// Details View on right pane for end points - azurerm
class ServicesDetailsViewAzureRM extends KnockoutAdapter.TemplateControl<AzureRMServicesDetailsViewModel> {
    constructor(viewModel: AzureRMServicesDetailsViewModel) {
        super(viewModel, {
            templateId: "azurerm-connected-service-details"
        });
    }

    initialize(): void {
        super.initialize();
        this._performBinding(this._element, this._options);
    }
}

// Details View Model on right pane for end points - azurerm
class AzureRMServicesDetailsViewModel extends ServicesDetailsViewModel {

    public environmentManagementPortalUrlMap: Object = {};
    private _DEFAULT_SELECTED_ENVIRONMENT: string = "AzureCloud";
    private _DEFAULT_SELECTED_SCOPE: string = "Subscription";
    private _AZURE_STACK_ENVIRONMENT: string = "AzureStack";
    private shouldEnableManageServicePrincipal: KnockoutObservable<boolean> = ko.observable(true);
    private shouldEnableManageEndpointRoles: KnockoutObservable<boolean> = ko.observable(true);

    private _distributedTaskClient: TaskModels.ConnectedServicesClientService;

    constructor(successCallback: (serviceEndpoint: ServiceEndpointContracts.ServiceEndpoint) => void) {
        super(successCallback);

        var tfsConnection = new Service.VssConnection(tfsContext.contextData);
        this._distributedTaskClient = tfsConnection.getService<TaskModels.ConnectedServicesClientService>(TaskModels.ConnectedServicesClientService);

        this._TaskAgentHttpClient.beginGetServiceEndpointTypes().then((endpointTypes) => {
            for (var endpointType of endpointTypes) {
                if (endpointType.name == AdminCommon.ServiceEndpointType.AzureRM) {
                    if (endpointType.dependencyData) {
                        for (var dependencyData of endpointType.dependencyData) {
                            if (dependencyData.input != null && dependencyData.input.toLowerCase() == "environment") {
                                for (var environment of dependencyData.map) {
                                    var portalUrls = {}
                                    for (var data of environment.value) {
                                        if (data.key == "managementPortalUrl" || data.key == "armManagementPortalUrl") {
                                            portalUrls[data.key] = data.value;
                                        }

                                    }
                                    this.environmentManagementPortalUrlMap[environment.key] = portalUrls;
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    private getValidEnvironmentName(environmentName): string {
        return (environmentName) ? environmentName : this._DEFAULT_SELECTED_ENVIRONMENT;
    }

    public fetchAzureRMPortalUrl(): IPromise<string> {
        var azureRMPortalUrlPromise = Q.defer<string>();

        this._TaskAgentHttpClient.beginGetServiceEndPoint(this.detailsId.peek() || ServiceResourceObservables.selectedResourceId.peek())
            .then((endpoint) => {
                if (endpoint) {
                    var dataSourceDetails: ServiceEndpointContracts.DataSourceDetails = {
                        dataSourceName: "AzureRMDependencyData",
                        dataSourceUrl: "",
                        headers: null,
                        requestContent: null,
                        requestVerb: null,
                        resourceUrl: "",
                        parameters: null,
                        resultSelector: "",
                        initialContextTemplate: null
                    };
                    var resultTransformationDetails: ServiceEndpointContracts.ResultTransformationDetails = {
                        resultTemplate: "",
                        callbackContextTemplate: "",
                        callbackRequiredTemplate: ""
                    };
                    var serviceEndpointRequest: ServiceEndpointContracts.ServiceEndpointRequest = {
                        dataSourceDetails: dataSourceDetails,
                        resultTransformationDetails: resultTransformationDetails,
                        serviceEndpointDetails: endpoint
                    };
                    var azureRMDependencyDataPromise: IPromise<ServiceEndpointContracts.ServiceEndpointRequestResult> = this.getAzureRMDependencyDataService(serviceEndpointRequest, endpoint.id);

                    azureRMDependencyDataPromise.then((result: ServiceEndpointContracts.ServiceEndpointRequestResult) => {
                        if (result != null && result.result != null && result.result.length > 0) {
                            try {
                                var azurermDependencyDataString = result.result[0];
                                var azurermDependencyData = JSON.parse(azurermDependencyDataString);
                                azureRMPortalUrlPromise.resolve(azurermDependencyData['portalEndpoint']);
                            } catch (error) {
                                azureRMPortalUrlPromise.reject(error);
                            }
                        } else {
                            azureRMPortalUrlPromise.reject(new Error(result.errorMessage));
                        }
                    }, (error) => {
                        azureRMPortalUrlPromise.reject(error);
                    });
                }
                else {
                    azureRMPortalUrlPromise.reject(AdminResources.EndpointDoesnotExist);
                }
            },
                (reason) => {
                    Diag.logError(reason);
                    azureRMPortalUrlPromise.reject(AdminResources.EndpointDoesnotExist);
                });

        return azureRMPortalUrlPromise.promise;
    }

    public getAzureRMDependencyDataService(serviceEndpointRequest: ServiceEndpointContracts.ServiceEndpointRequest, serviceEndpointId: string): IPromise<ServiceEndpointContracts.ServiceEndpointRequestResult> {
        var endpointPromise: Q.Deferred<ServiceEndpointContracts.ServiceEndpointRequestResult> = Q.defer<ServiceEndpointContracts.ServiceEndpointRequestResult>();
        var azureRmDependencyDataPromise = this._distributedTaskClient.beginExecuteServiceEndpointRequest(serviceEndpointRequest, serviceEndpointId);

        azureRmDependencyDataPromise.then((result: ServiceEndpointContracts.ServiceEndpointRequestResult) => {
            if ((Utils_String.equals(result.statusCode, "ok", true)) && ((result.errorMessage === undefined) || (Utils_String.equals(result.errorMessage, "", true)))) {
                endpointPromise.resolve(result);
            } else {
                endpointPromise.reject(new Error(result.errorMessage));
            }

        }, (error) => {
            var errorMsg = error;
            if (!!error && !!error.serverError && !!error.serverError.innerException) {
                errorMsg = errorMsg + Utils_String.newLine + error.serverError.innerException.message;
            }
            endpointPromise.reject(errorMsg);
        });

        return endpointPromise.promise;
    }

    public manageServicePrincipal(): void {
        var keyMapDict = createCaseInsensitiveKeyMapDict(this.data());
        var applicationId = this.data()[keyMapDict["serviceprincipalid"]];
        var applicationObjectId = this.data()[keyMapDict["appobjectid"]];
        var tenantId = this.data()[keyMapDict["tenantid"]];
        var environmentName = this.getValidEnvironmentName(this.data()[keyMapDict["environment"]]);
        var scopeLevel = this.data()[keyMapDict["ScopeLevel"]];

        var managementPortalUrl = "https://portal.azure.com/";
        if (this.environmentManagementPortalUrlMap[environmentName] && this.environmentManagementPortalUrlMap[environmentName].armManagementPortalUrl != null) {
            managementPortalUrl = this.environmentManagementPortalUrlMap[environmentName].armManagementPortalUrl;
        }

        var activeDirectoryBaseUrl = `${managementPortalUrl}#blade/Microsoft_AAD_IAM/`;
        var activeDirectoryUrl;

        if (AdminCommon.isGuid(tenantId)) {
            activeDirectoryBaseUrl = `${managementPortalUrl}${tenantId}/#blade/Microsoft_AAD_IAM/`;
        }

        if (AdminCommon.isGuid(applicationId) && AdminCommon.isGuid(applicationObjectId)) {
            activeDirectoryUrl = `${activeDirectoryBaseUrl}ApplicationBlade/objectId/${applicationObjectId}/appId/${applicationId}`;
        }
        else {
            activeDirectoryUrl = `${activeDirectoryBaseUrl}ActiveDirectoryMenuBlade/RegisteredApps`;
        }

        window.open(activeDirectoryUrl, '_blank');
    }

    public manageEndpointRoles(): void {
        var keyMapDict = createCaseInsensitiveKeyMapDict(this.data());
        var environmentName = this.getValidEnvironmentName(this.data()[keyMapDict["environment"]]);

        if (environmentName == this._AZURE_STACK_ENVIRONMENT) {
            this.fetchAzureRMPortalUrl().then((result) => {
                this.redirectToManageEndpointRoles(result);
            }, (error) => {
                throw new Error(error);
            });
        } else {
            var armManagementPortalUrl = "https://portal.azure.com";
            if (this.environmentManagementPortalUrlMap[environmentName] && this.environmentManagementPortalUrlMap[environmentName].armManagementPortalUrl != null) {
                armManagementPortalUrl = this.environmentManagementPortalUrlMap[environmentName].armManagementPortalUrl;
            }
            this.redirectToManageEndpointRoles(armManagementPortalUrl);
        }
    }

    public redirectToManageEndpointRoles(armManagementPortalUrl) {
        var keyMapDict = createCaseInsensitiveKeyMapDict(this.data());
        var subscriptionId = this.data()[keyMapDict["subscriptionid"]];
        var managementgroupid = this.data()[keyMapDict["managementgroupid"]];
        var selectedScope = this.data()[keyMapDict["scopelevel"]];
        var azureSpnRoleAssignmentId = this.data()[keyMapDict["azurespnroleassignmentid"]];
        // Need to change the dictionary to ignore casing for all these keys

        if (selectedScope === this._DEFAULT_SELECTED_SCOPE) {
            var authorizationScope = this.data()[keyMapDict["scope"]] || ("/subscriptions/" + subscriptionId);
            var manageRolesUrl = armManagementPortalUrl + "?resourceMenuPerf=true#blade/Microsoft_Azure_AD/";
        }
        else {
            var authorizationScope = this.data()[keyMapDict["scope"]] || ("/managementGroups/" + managementgroupid);
            var manageRolesUrl = armManagementPortalUrl + "?resourceMenuPerf=true#blade/Microsoft_Azure_ManagementGroups/";
        }
        var navigationUrl;

        if (AdminCommon.isGuid(azureSpnRoleAssignmentId)) {
            // Trim any leading/trailing slashes from the scope
            authorizationScope = authorizationScope.replace(/^\/+|\/+$/g, '');
            var urlEncodedScope = encodeURIComponent("/" + authorizationScope);

            var fullyQualifiedRoleAssignmentId = "/" + authorizationScope + "/providers/Microsoft.Authorization/roleAssignments/" + azureSpnRoleAssignmentId;
            var urlEncodedFullyQualifiedRoleAssignmentId = encodeURIComponent(fullyQualifiedRoleAssignmentId);
            navigationUrl = manageRolesUrl +
                "RoleMemberAssignmentPropertiesBlade/roleAssignmentId/" + urlEncodedFullyQualifiedRoleAssignmentId + "/scope/" + urlEncodedScope;
        }
        else {
            if (selectedScope === this._DEFAULT_SELECTED_SCOPE)
                navigationUrl = manageRolesUrl + "UserAssignmentsBlade/scope/%2Fsubscriptions%2F" + subscriptionId;
            else
                navigationUrl = manageRolesUrl + "MenuBlade/iam/id/%2Fproviders%2FMicrosoft.Management%2FmanagementGroups%2F" + managementgroupid;
        }
        window.open(navigationUrl, '_blank');
    }

    public disconnectService(): void {
        this._TaskAgentHttpClient.beginGetServiceEndPoint(this.detailsId.peek() || ServiceResourceObservables.selectedResourceId.peek())
            .then((endpoint) => {
                if (endpoint) {
                    Dialogs.show(AzureRMEndpointsDeleteDialog.DeleteAzureRmServiceEndpointConfirmationDialog, {
                        tfsContext: tfsContext,
                        successCallback: () => {
                            ServiceResourceObservables.endPointDisconnected.notifySubscribers(true);
                            this.name("");
                        },
                        connectedService: endpoint
                    });
                }
                else {
                    VSS.handleError({ name: "", message: AdminResources.EndpointDoesnotExist });
                }
            },
                (reason) => {
                    Diag.logError(reason);
                    VSS.handleError({ name: "", message: AdminResources.EndpointDoesnotExist });
                });
    }

    public updateAuthentication(): void {
        var dialogModel = new AddAzureRmEndpointsModel(this.successCallBack);
        var keyMapDict = createCaseInsensitiveKeyMapDict(this.data());

        dialogModel.id(this.detailsId());
        dialogModel.name(this.name());
        dialogModel.selectedAuthenticationScheme(this.authorizationScheme);
        dialogModel.tenantId(this.data()[keyMapDict["tenantid"]]);
        dialogModel.spnClientId(this.data()[keyMapDict["serviceprincipalid"]]);
        dialogModel.subscriptionId(this.data()[keyMapDict["subscriptionid"]]);
        dialogModel.subscriptionName(this.data()[keyMapDict["subscriptionname"]]);
        dialogModel.managementGroupName(this.data()[keyMapDict["managementgroupname"]]);
        dialogModel.managementGroupId(this.data()[keyMapDict["managementgroupid"]]);
        dialogModel.spnAuthenticationType(this.data()[keyMapDict["authenticationtype"]] || "spnKey");

        // currently the scope is limited to resource group, so the below approach will work
        let authorizationScope = this.data()[keyMapDict["scope"]] || Utils_String.empty;
        if (!!authorizationScope) {
            let authorizationScopeSplit = authorizationScope.split("/");
            if (Utils_String.equals(authorizationScopeSplit[3], "resourcegroups", true)) {
                authorizationScope = authorizationScopeSplit[4];
            }
        }
        dialogModel.selectedScope(this.data()[keyMapDict["scopelevel"]]);
        dialogModel.selectedResourceGroup(authorizationScope);

        if (this.data()[keyMapDict["creationmode"]] !== null && this.data()[keyMapDict["creationmode"]] !== undefined) {
            dialogModel.azureSpnRoleAssignmentId = this.data()[keyMapDict["azurespnroleassignmentid"]];
            dialogModel.azureSpnPermissions = this.data()[keyMapDict["azurespnpermissions"]];
            dialogModel.spnObjectId = this.data()[keyMapDict["spnobjectid"]];
            dialogModel.appObjectId = this.data()[keyMapDict["appobjectid"]];
            dialogModel.spnCreationMode(this.data()[keyMapDict["creationmode"]]);
        }

        dialogModel.environmentName = this.getValidEnvironmentName(this.data()[keyMapDict["environment"]]);
        dialogModel.environmentUrl = this.serviceUri();
        dialogModel.isReady = this.isReady;
        dialogModel.operationStatus = this.operationStatus;

        dialogModel.title = Utils_String.format(AdminResources.UpdateAuthenticationDialogTitle, this.name());
        dialogModel.isUpdate(true);
        dialogModel.disconnectService = true;

        Dialogs.show(AddAzureRmEndpointsDialog, dialogModel);

        if (dialogModel.operationStatus && dialogModel.operationStatus.state === "Failed") {
            dialogModel.errors([]);
            dialogModel.errors.push(dialogModel.operationStatus.statusMessage);
        }
    }

    public updateServiceDetails(endpoint: ServiceEndpointContracts.ServiceEndpoint) {
        super.updateServiceDetails(endpoint);
        this.connectionType(AdminResources.AzureRMConnectionType);
        var environmentName = this.getValidEnvironmentName(this.data()['environment']);
        this.shouldEnableManageServicePrincipal(!Utils_String.equals(this.authorizationScheme, AdminCommon.EndpointAuthorizationSchemes.ManagedServiceIdentity, true)) || this._AZURE_STACK_ENVIRONMENT.toLowerCase() != environmentName.toLocaleLowerCase();
        this.shouldEnableManageEndpointRoles(!Utils_String.equals(this.authorizationScheme, AdminCommon.EndpointAuthorizationSchemes.ManagedServiceIdentity, true));
    }
}

export class ServicesAdminViewTab extends Navigation.NavigationViewTab {
    private _template: JQuery = null;
    private _detailsElement: JQuery = null;
    private _rolesElement: JQuery = null;
    private _executionHistoryElement: JQuery = null;
    private _policyElement: JQuery = null;

    private _viewModel: ServiceEndpointsViewModel;
    private _selectedResourceId: any;
    private _selectedResourceName: any;

    private _serviceEndPointsDetailsTab: ServiceEndPointsDetailsTab;
    private _serviceEndpointsRolesTab: ServiceEndpointsRolesTab;
    private _serviceEndpointsExecutionHistoryTab: ServiceEndpointsExecutionHistoryTab;
    private _serviceEndpointsPolicyViewTab: ServiceEndpointsPolicyViewTab;

    public initialize() {
        super.initialize();

        this._serviceEndPointsDetailsTab = new ServiceEndPointsDetailsTab();
        this._serviceEndPointsDetailsTab.initialize();

        this._serviceEndpointsRolesTab = new ServiceEndpointsRolesTab();
        this._serviceEndpointsRolesTab.initialize();

        this._serviceEndpointsExecutionHistoryTab = new ServiceEndpointsExecutionHistoryTab();
        this._serviceEndpointsExecutionHistoryTab.initialize("ADMIN_SERVICE_ENDPOINT_EXECUTION_HISTORY");

        if (FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.ResourceAuthorizationforVGEndpoint)) {
            this._serviceEndpointsPolicyViewTab = new ServiceEndpointsPolicyViewTab();
            this._serviceEndpointsPolicyViewTab.initialize("ADMIN_SERVICE_ENDPOINT_POLICY");
        }
    }

    public dispose() {
        super.dispose();
    }

    public onNavigate(rawState: any, parsedState: any) {
        var title: string = "";
        var resourceId = null;
        var isShared: boolean = false;
        var resourceName = null;

        if (!!parsedState.resource) {
            resourceId = parsedState.resource.id;
            resourceName = parsedState.resource.name;
            title = Utils_String.format(AdminResources.EndpointViewTitle, resourceName);
            isShared = parsedState.resource.isShared;
        }

        if (!resourceId) {
            resourceId = parsedState.resourceId;
        }

        if (resourceId) {
            this._selectedResourceId = resourceId;
            this._selectedResourceName = resourceName;
            this.initView();
            if (isShared) {
                let titleContent = "<div>" + title + "<span class=\"share-endpoint-badge\">" + AdminResources.SharedText + "</span> </div>";
                this._options.navigationView.setViewTitleContent(title, titleContent);
            } else {
                this._options.navigationView.setViewTitle(title);
            }
        }
        else {
            this._element.hide();
        }
    }

    public initView(): void {
        if (!this._template) {
            this._viewModel = new ServiceEndpointsViewModel();

            this._template = TFS_Knockout.loadHtmlTemplate("service_endpoint_admin_tab").appendTo(this._element);
            ko.applyBindings(this._viewModel, this._template[0]);

            this._viewModel.currentTab.subscribe((currentTab: ServiceEndpointViewTab) => {
                this._showCurrentTabView(currentTab);
            });

            this._detailsElement = this._element.find(".hub-pivot-content .details");
            this._rolesElement = this._element.find(".hub-pivot-content .roles");
            this._executionHistoryElement = this._element.find(".hub-pivot-content .execution-history");

            if (FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.ResourceAuthorizationforVGEndpoint)) {
                this._policyElement = this._element.find(".hub-pivot-content .policy");
            }
        }

        this._element.show();
        this._showCurrentTabView(this._viewModel.currentTab());
    }

    private _showCurrentTabView(currentTab: ServiceEndpointViewTab): void {
        switch (currentTab) {
            case ServiceEndpointViewTab.Details:
                this._showServiceEndpointDetails();
                break;

            case ServiceEndpointViewTab.Roles:
                this._showServiceEndpointRoles();
                break;

            case ServiceEndpointViewTab.ExecutionHistory:
                this._showServiceEndpointExecutionHistory();
                break;

            case ServiceEndpointViewTab.Policy:
                this._showServiceEndpointPolicy();
                break;

            default:
                break;
        }
    }

    private _showServiceEndpointDetails(): void {
        this._serviceEndPointsDetailsTab.initElement(this._detailsElement);
        this._serviceEndPointsDetailsTab.initView(this._selectedResourceId);
    }

    private _showServiceEndpointRoles(): void {
        this._serviceEndpointsRolesTab.initializeView(this._selectedResourceId, this._rolesElement);
    }

    private _showServiceEndpointExecutionHistory(): void {
        this._serviceEndpointsExecutionHistoryTab.initializeView(this._selectedResourceId, this._executionHistoryElement);
    }

    private _showServiceEndpointPolicy(): void {
        this._serviceEndpointsPolicyViewTab.initializeView(this._selectedResourceId, this._selectedResourceName, this._policyElement);
    }
}

class ServiceEndpointsViewModel {
    public currentTab: KnockoutObservable<ServiceEndpointViewTab> = ko.observable(ServiceEndpointViewTab.Details);

    public onShowDetails(): void {
        this.currentTab(ServiceEndpointViewTab.Details);
    }

    public onShowRoles(): void {
        this.currentTab(ServiceEndpointViewTab.Roles);
    }

    public onShowExecutionHistory(): void {
        this.currentTab(ServiceEndpointViewTab.ExecutionHistory);
    }

    public onShowPolicy(): void {
        this.currentTab(ServiceEndpointViewTab.Policy);
    }

    public showDetails(): boolean {
        return this.currentTab() === ServiceEndpointViewTab.Details;
    }

    public showRoles(): boolean {
        return this.currentTab() === ServiceEndpointViewTab.Roles;
    }

    public showExecutionHistory(): boolean {
        return this.currentTab() === ServiceEndpointViewTab.ExecutionHistory;
    }

    public showPolicy(): boolean {
        return this.currentTab() === ServiceEndpointViewTab.Policy;
    }

    public showPolicyTab: boolean = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.ResourceAuthorizationforVGEndpoint);

    public onMenuKeyDown(data: any, event: JQueryEventObject): boolean {
        var nextFocusable: JQuery;
        var previousFocusable: JQuery;
        var currentElement: JQuery = $(event.target);

        switch (event.keyCode) {

            case Utils_UI.KeyCode.RIGHT:
                event.preventDefault();
                if (currentElement.next() && currentElement.next().length > 0) {
                    nextFocusable = currentElement.next();
                }
                else {
                    //If current focus is on the last element, then shift it to the first element on right keypress
                    nextFocusable = currentElement.parent().children().first();
                }

                nextFocusable.focus();
                nextFocusable.click();
                return false;

            case Utils_UI.KeyCode.LEFT:
                event.preventDefault();
                if (currentElement.prev() && currentElement.prev().length > 0) {
                    previousFocusable = currentElement.prev();
                }
                else {
                    //If current focus is on the first element, then shift it to the last element on left keypress
                    previousFocusable = currentElement.parent().children().last();
                }

                previousFocusable.focus();
                previousFocusable.click();
                return false;

            case Utils_UI.KeyCode.ENTER:
                currentElement.click();
                return false;

            default:
                return true;
        }
    }
}

export class ServiceEndPointsDetailsTab extends Navigation.NavigationViewTab {
    private _endpointMap: IDictionaryStringTo<ServiceEndpointContracts.ServiceEndpoint> = {};
    private _endpointCreatedSubscription: IDisposable;

    private _promisesMap: IDictionaryStringTo<IPromise<ServiceEndpointContracts.ServiceEndpoint>> = {};
    private _prevErrorMessage = "";

    public initialize() {
        super.initialize();

        this._tfsContext = tfsContext;

        var tfsConnection = new Service.VssConnection(this._tfsContext.contextData);
        this._TaskAgentHttpClient = tfsConnection.getService<TFS_Admin_ServiceEndpoints.ServiceEndPointService>(TFS_Admin_ServiceEndpoints.ServiceEndPointService);

        this.viewModelMap[AdminCommon.ServiceEndpointType.ExternalGit] = new ExternalGitServicesDetailsViewModel(endpointCreatedsuccessCallBack);
        this.viewModelMap[AdminCommon.ServiceEndpointType.Generic] = new GenericServicesDetailsViewModel(endpointCreatedsuccessCallBack);
        this.viewModelMap[AdminCommon.ServiceEndpointType.GitHub] = new GitHubServicesDetailsViewModel(endpointCreatedsuccessCallBack);
        this.viewModelMap[AdminCommon.ServiceEndpointType.Bitbucket] = new BitbucketServicesDetailsViewModel(endpointCreatedsuccessCallBack);
        this.viewModelMap[AdminCommon.ServiceEndpointType.SSH] = new SshServicesDetailsViewModel(endpointCreatedsuccessCallBack);
        this.viewModelMap[AdminCommon.ServiceEndpointType.Subversion] = new SvnServicesDetailsViewModel(endpointCreatedsuccessCallBack);
        this.viewModelMap[AdminCommon.ServiceEndpointType.AzureRM] = new AzureRMServicesDetailsViewModel(endpointCreatedsuccessCallBack);
        this.viewModelMap[AdminCommon.ServiceEndpointType.Docker] = new DockerRegistryServicesDetailsViewModel(endpointCreatedsuccessCallBack);
        this.viewModelMap[AdminCommon.ServiceEndpointType.Kubernetes] = new KubernetesServicesDetailsViewModel(endpointCreatedsuccessCallBack);

        this.viewMap[AdminCommon.ServiceEndpointType.ExternalGit] = ServicesDetailsViewExternalGit;
        this.viewMap[AdminCommon.ServiceEndpointType.Generic] = ServicesDetailsViewGeneric;
        this.viewMap[AdminCommon.ServiceEndpointType.GitHub] = ServicesDetailsViewGitHub;
        this.viewMap[AdminCommon.ServiceEndpointType.Bitbucket] = ServicesDetailsViewBitbucket;
        this.viewMap[AdminCommon.ServiceEndpointType.SSH] = ServicesDetailsViewSsh;
        this.viewMap[AdminCommon.ServiceEndpointType.Subversion] = ServicesDetailsViewSvn;
        this.viewMap[AdminCommon.ServiceEndpointType.AzureRM] = ServicesDetailsViewAzureRM;
        this.viewMap[AdminCommon.ServiceEndpointType.Docker] = ServicesDetailsViewDockerRegistry;
        this.viewMap[AdminCommon.ServiceEndpointType.Kubernetes] = ServicesDetailsViewKubernetes;

        // Azure and others would be considered as "Custom" types

        this._endpointCreatedSubscription = ServiceResourceObservables.createdEndpoint.subscribe((endpoint) => {
            if (!!endpoint) {
                // add the created/updated endpoint to the map right away
                this._endpointMap[endpoint.id] = endpoint;
                this._promisesMap[endpoint.id] = null;
            }
        });
    }

    public initElement(element: JQuery): void {
        this._element = element;
    }

    public initView(resourceId: string): void {
        if (this._endpointMap[resourceId]) {
            var endpoint = this._endpointMap[resourceId];
            this._updateViewModel(endpoint);
        }
        else {
            if (!this._promisesMap[resourceId]) {
                this._promisesMap[resourceId] = this._TaskAgentHttpClient.beginGetServiceEndPoint(resourceId);
            }
            this._promisesMap[resourceId].then((endpoint) => {
                this._endpointMap[resourceId] = endpoint;
                this._updateViewModel(endpoint);
            }, (error: TfsError) => {
                if (error.message !== this._prevErrorMessage) {
                    this._prevErrorMessage = error.message;
                    Diag.logError(error.message);
                    VSS.handleError(error);
                }
            });
        }
    }

    /**
     * Called whenever navigation occurs with this tab as the selected tab
     * @param rawState The raw/unprocessed hash/url state parameters (string key/value pairs)
     * @param parsedState Resolved state objects parsed by the view
     */
    public onNavigate(rawState: any, parsedState: any) {
        var title: string = "";
        var resourceId = null;
        if (!!parsedState.resource) {
            resourceId = parsedState.resource.id;
            title = Utils_String.format(AdminResources.EndpointViewTitle, parsedState.resource.name);
        }
        if (!resourceId) {
            resourceId = parsedState.resourceId;
        }
        if (resourceId) {
            this.initView(resourceId);
        }
        this._options.navigationView.setViewTitle(title);
    }

    dispose(): void {
        if (this._endpointCreatedSubscription) {
            this._endpointCreatedSubscription.dispose();
        }
    }

    private _updateViewModel(endpoint: ServiceEndpointContracts.ServiceEndpoint) {
        this._viewModel = this.viewModelMap[endpoint.type.toLowerCase()];
        if (!this._viewModel) {
            var type = endpoint.type;
            this._TaskAgentHttpClient.beginGetServiceEndpointTypes(type, "").then((endpointTypes) => {
                var endpointType: ServiceEndpointContracts.ServiceEndpointType;
                if (endpointTypes.length === 1) {
                    endpointType = endpointTypes.pop();
                }

                if ((endpoint) && (endpointType) && (endpointType.uiContributionId)) {
                    this._viewModel = new UIContributionDetailsViewModel(endpointType, endpointCreatedsuccessCallBack);
                    this.viewModelMap[endpoint.type.toLowerCase()] = this._viewModel;
                    this.createServicesDetailsViewForUIContribution(endpoint);
                }
                else {
                    this._viewModel = new CustomServicesDetailsViewModel(endpointType, endpoint.authorization.scheme, endpointCreatedsuccessCallBack);
                    this.viewModelMap[endpoint.type.toLowerCase()] = this._viewModel;
                    this.createServicesDetailsView(endpoint);
                }
            });
        } else {
            this.createServicesDetailsView(endpoint);
        }
    }

    private createServicesDetailsViewForUIContribution(endpoint: ServiceEndpointContracts.ServiceEndpoint) {
        this._viewModel.updateServiceDetails(endpoint);
        this._element.empty();

        var view = this.viewMap[endpoint.type.toLowerCase()];
        if (view === undefined) {
            view = ServicesDetailsViewUIContribution;
        }

        <ServicesDetailsView>Controls.BaseControl.createIn(view, this._element, this._viewModel);
    }

    private createServicesDetailsView(endpoint: ServiceEndpointContracts.ServiceEndpoint) {
        this._viewModel.updateServiceDetails(endpoint);
        this._element.empty();

        var view = this.viewMap[endpoint.type.toLowerCase()];
        if (view === undefined) {
            view = ServicesDetailsViewCustom;
        }

        <ServicesDetailsView>Controls.BaseControl.createIn(view, this._element, this._viewModel);
    }

    private _template: JQuery = null;
    private _viewModel: ServicesDetailsViewModel;
    private _TaskAgentHttpClient: TFS_Admin_ServiceEndpoints.ServiceEndPointService;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private viewModelMap: { [s: string]: ServicesDetailsViewModel; } = {};
    private viewMap: { [s: string]: Object; } = {};
}

export class ServiceEndpointsRolesTab {
    private static _managePermissions = 3;
    private static _serviceEndpointRoleScopeId = "distributedtask.serviceendpointrole";

    private _roleAssignmentControl: React.Component<any, any>;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;

    public initialize() {
        this._tfsContext = tfsContext;
    }

    public initializeView(resourceId: string, element: JQuery): void {
        if (this._roleAssignmentControl) {
            ReactDOM.unmountComponentAtNode(element[0]);
            this._roleAssignmentControl = null;
        }

        var gridWidth = element.innerWidth() - 5;

        TaskUtils.SecurityHelper.hasServiceEndpointPermission(tfsContext.contextData.project.id, resourceId, ServiceEndpointsRolesTab._managePermissions).then((hasPermission: boolean) => {
            this._roleAssignmentControl = ReactDOM.render(
                React.createElement(
                    RoleAssignmentControl,
                    {
                        serviceInstanceId: VSS_WebApi_Constants.ServiceInstanceTypes.TFS,
                        userId: this._tfsContext.currentIdentity.id,
                        resourceId: Utils_String.format("{0}_{1}", tfsContext.contextData.project.id, resourceId),
                        scopeId: ServiceEndpointsRolesTab._serviceEndpointRoleScopeId,
                        manageRolesPermission: ServiceEndpointsRolesTab._managePermissions,
                        noPermissionMessage: AdminResources.ServiceEndpointRoleAssignmentsPermissionDeniedMessage,
                        canEdit: hasPermission,
                        canInherit: resourceId ? true : false,
                        gridSizeSetting: {
                            userCellWidth: .32 * gridWidth,
                            roleCellWidth: .1 * gridWidth,
                            accessCellWidth: .1 * gridWidth,
                            removeCellWidth: .09 * gridWidth
                        },
                        showAvatars: true,
                        formAvatarUrl: (id: string) => {
                            return this._tfsContext.getActionUrl("GetDdsAvatar", "common", {
                                id: id,
                                area: "api",
                            } as TFS_Host_TfsContext.IRouteData);
                        }
                    }),
                element[0]);
        });
    }
}

export class ServiceEndpointsExecutionHistoryTab {
    public initialize(instanceId?: string) {
        this._instanceId = instanceId;
        this._actionCreator = ActionCreatorManager.GetActionCreator<ServiceEndpointExecutionHistoryActionCreator>(ServiceEndpointExecutionHistoryActionCreator, this._instanceId);
    }

    public initializeView(endpointId: string, element: JQuery) {
        ReactDOM.render(React.createElement(ServiceEndpointExecutionHistory, { instanceId: this._instanceId }), element[0]);
        this._actionCreator.loadServiceEndpointExecutionHistory(endpointId);
    }

    private _actionCreator: ServiceEndpointExecutionHistoryActionCreator;
    private _instanceId: string;
}

export class ServiceEndpointsPolicyViewTab {
    public initialize(instanceId?: string) {
        this._instanceId = instanceId;
        this._actionCreator = ActionCreatorManager.GetActionCreator<ServiceEndpointPolicyActionCreator>(ServiceEndpointPolicyActionCreator, this._instanceId);
    }

    public initializeView(endpointId: string, endpointName: string, element: JQuery) {
        ReactDOM.render(React.createElement(ServiceEndpointPolicyView, { instanceId: this._instanceId, endpointName: endpointName, endpointId: endpointId } as IServiceEndpointPolicyViewProps), element[0]);
        this._actionCreator.loadServiceEndpointPolicyData(endpointId);
    }

    private _actionCreator: ServiceEndpointPolicyActionCreator;
    private _instanceId: string;
}

export interface LegacyConnectedServiceDetails {
    value: CoreContracts.WebApiConnectedServiceDetails;
    deploymentEnvironments: AdminCommon.DeploymentEnvironmentMetadata[];
}

// Tab for connected services - "connected services" action ( Legacy )
export class ConnectedServicesTab extends Navigation.NavigationViewTab {
    private _connectedServiceMap: IDictionaryStringTo<LegacyConnectedServiceDetails> = {};
    private _connectedServiceCreatedSubscription: IDisposable;

    private _promisesMap: IDictionaryStringTo<IPromise<CoreContracts.WebApiConnectedServiceDetails>> = {};
    private _prevErrorMessage = "";

    public initialize() {
        super.initialize();

        this._tfsContext = tfsContext;

        var tfsConnection = new Service.VssConnection(this._tfsContext.contextData);
        this._adminHttpClient = tfsConnection.getHttpClient<AdminHttpClient.AdminHttpClient>(AdminHttpClient.AdminHttpClient);
        this._connectedServiceHttpClient = tfsConnection.getService<TFS_Admin_ConnectedServices.ConnectedServicesService>(TFS_Admin_ConnectedServices.ConnectedServicesService);

        this._connectedServiceCreatedSubscription = ServiceResourceObservables.connectedServiceCreatedId.subscribe((id) => {
            // invalidate map, as this could be called on updates to service as well
            this._connectedServiceMap[id] = null;
            this._promisesMap[id] = null;
        });
    }

    public initView(newValue: string): void {
        if (this._connectedServiceMap[newValue]) {
            var details = this._connectedServiceMap[newValue];
            this._updateViewModel(details.value, details.deploymentEnvironments);
        }
        else {
            if (!this._promisesMap[newValue]) {
                this._promisesMap[newValue] = this._connectedServiceHttpClient.beginGetConnectedService(newValue);
            }
            this._promisesMap[newValue].then((connectedService) => {
                this._viewModel = new ConnectedServicesDetailsViewModel();
                this._connectedServiceMap[newValue] = { value: connectedService, deploymentEnvironments: [] };
                this._adminHttpClient.beginGetDeploymentEnvironments(tfsContext.navigation.project, connectedService.connectedServiceMetaData.id).then((list: AdminCommon.DeploymentEnvironmentMetadata[]) => {
                    var serviceDetails = this._connectedServiceMap[newValue];
                    if (serviceDetails) {
                        serviceDetails.deploymentEnvironments = list;
                    }
                    this._updateViewModel(connectedService, list);
                }, (error) => {
                    // if there is any problem in getting environment list, fall back
                    this._updateViewModel(connectedService, []);
                    VSS.handleError(error);
                });
            },
                (error: TfsError) => {
                    if (error.message !== this._prevErrorMessage) {
                        this._prevErrorMessage = error.message;
                        Diag.logError(error.message);
                        VSS.handleError(error);
                    }
                });
        }
    }

    /**
     * Called whenever navigation occurs with this tab as the selected tab
     * @param rawState The raw/unprocessed hash/url state parameters (string key/value pairs)
     * @param parsedState Resolved state objects parsed by the view
     */
    public onNavigate(rawState: any, parsedState: any) {
        var title: string = "";
        var resourceId = null;
        if (!!parsedState.resource) {
            title = Utils_String.format(AdminResources.ConnectedServiceViewTitle, parsedState.resource.name);
        }
        if (!resourceId) {
            resourceId = parsedState.resourceId;
        }
        if (resourceId) {
            this.initView(resourceId);
        }
        this._options.navigationView.setViewTitle(title);
    }

    dispose(): void {
        if (this._connectedServiceCreatedSubscription) {
            this._connectedServiceCreatedSubscription.dispose();
        }
    }

    private _updateViewModel(service: CoreContracts.WebApiConnectedServiceDetails, list: AdminCommon.DeploymentEnvironmentMetadata[]) {
        this._viewModel = new ConnectedServicesDetailsViewModel();
        this._viewModel.name(service.connectedServiceMetaData.friendlyName);
        this._viewModel.description(service.connectedServiceMetaData.friendlyName);
        this._viewModel.serviceUri(service.connectedServiceMetaData.serviceUri);
        this._viewModel.detailsId(service.connectedServiceMetaData.id);
        this._viewModel.connectionType(service.connectedServiceMetaData.kind);
        this._viewModel.createdBy(service.connectedServiceMetaData.authenticatedBy.displayName);
        this._viewModel.setDeploymentEnvironments(list);
        var connectingUsing = AdminResources.ConnectionTypeCertificate;
        if (service.credentialsXml && Utils_String.caseInsensitiveContains(service.credentialsXml, "<credentials>")) {
            connectingUsing = AdminResources.ConnectionTypeCredentials;
        }
        this._viewModel.connectedUsing(connectingUsing);

        this._element.empty();

        <ConnectedServicesDetailsView>Controls.BaseControl.createIn(ConnectedServicesDetailsView, this._element, this._viewModel);
    }

    private _template: JQuery = null;
    private _viewModel: ConnectedServicesDetailsViewModel;
    private _adminHttpClient: AdminHttpClient.AdminHttpClient;
    private _connectedServiceHttpClient: TFS_Admin_ConnectedServices.ConnectedServicesService;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
}

// Connected Service Details View on right pane (legacy)
class ConnectedServicesDetailsView extends KnockoutAdapter.TemplateControl<ConnectedServicesDetailsViewModel> {
    constructor(viewModel: ConnectedServicesDetailsViewModel) {
        super(viewModel, {
            templateId: "connected-service-details"
        });
    }

    initialize(): void {
        super.initialize();
        this._performBinding(this._element, this._options);
    }
}

// Connected Service Details View Model on right pane (legacy)
class ConnectedServicesDetailsViewModel extends KnockoutAdapter.TemplateViewModel {
    public deploymentEnvironments: KnockoutObservableArray<string> = ko.observableArray([]);
    public name: KnockoutObservable<string> = ko.observable("");
    public connectionType: KnockoutObservable<string> = ko.observable("");
    public detailsId: KnockoutObservable<string> = ko.observable("");
    public serviceUri: KnockoutObservable<string> = ko.observable("");
    public description: KnockoutObservable<string> = ko.observable("");
    public createdBy: KnockoutObservable<string> = ko.observable("");
    public connectedUsing: KnockoutObservable<string> = ko.observable("");
    public showDeploymentEnvironment: KnockoutObservable<boolean> = ko.observable(true);

    constructor(disconnectedObservable?: KnockoutObservable<boolean>) {
        super();
        this._disconnectedObservable = disconnectedObservable || ko.observable(false);
        var tfsConnection = new Service.VssConnection(tfsContext.contextData);
        this._connectedServiceHttpClient = tfsConnection.getService<TFS_Admin_ConnectedServices.ConnectedServicesService>(TFS_Admin_ConnectedServices.ConnectedServicesService);
    }

    public disconnectService(): void {
        this._connectedServiceHttpClient.beginGetConnectedService(this.detailsId.peek() || ServiceResourceObservables.selectedResourceId.peek())
            .then((connectedService) => {
                if (connectedService && connectedService.connectedServiceMetaData) {
                    Dialogs.show(AdminDialogs.DeleteAzureConnectedServiceConfirmationDialog, {
                        tfsContext: tfsContext,
                        successCallback: () => {
                            ServiceResourceObservables.connectedServiceDisconnected.notifySubscribers(true);
                        },
                        connectedService: connectedService.connectedServiceMetaData
                    });
                }
                else {
                    VSS.handleError({ name: "", message: AdminResources.ConnectedServiceDoesnotExist });
                }
            },
                (reason) => {
                    Diag.logError(reason);
                    VSS.handleError({ name: "", message: AdminResources.ConnectedServiceDoesnotExist });
                });
    }

    public updateAuthentication(): void {
        var dialogModel = new AzureLegacyDeploymentsManageDialog.AddLegacyDeploymentEnvironmentsModel(connectedServiceCreatedSuccessCallBack);
        dialogModel.id(this.detailsId());
        dialogModel.subscriptionid(this.detailsId());
        dialogModel.name(this.name());
        dialogModel.title = Utils_String.format(AdminResources.UpdateAuthenticationDialogTitle, this.name());
        dialogModel.isUpdate(true);
        dialogModel.disconnectService = true;
        Dialogs.show(AzureLegacyDeploymentsManageDialog.AddLegacyDeploymentEnvironmentsDialog, dialogModel);
    }

    public setDeploymentEnvironments(list: AdminCommon.DeploymentEnvironmentMetadata[]): void {
        var names = [];
        list.forEach((value) => {
            names.push(value.name);
        });
        this.deploymentEnvironments(names);
    }

    public onKeyDown(data: any, event: JQueryEventObject): boolean {
        var currentElement: JQuery = $(event.target);

        switch (event.keyCode) {
            case Utils_UI.KeyCode.ENTER:
                currentElement.click();
                return false;

            case Utils_UI.KeyCode.SPACE:
                currentElement.click();
                return false;

            default:
                return true;
        }
    }

    private _disconnectedObservable: KnockoutObservable<boolean>;
    protected _connectedServiceHttpClient: TFS_Admin_ConnectedServices.ConnectedServicesService;
}

interface ServiceEndpointResource extends ServiceEndpointContracts.ServiceEndpoint {
    iconUrl?: string;
}

export enum ServiceEndpointViewTab {
    Details,
    Roles,
    ExecutionHistory,
    Policy
}

// Enhance Main view
Controls.Enhancement.registerEnhancement(ResourceAdminView, '.services-view');

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin.ServiceEndpoints.Controls", exports);
