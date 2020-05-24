import Diag = require("VSS/Diag");
import * as CoreRestClient from "TFS/Core/RestClient";
import TFS_Admin_ServiceEndpoints = require("Admin/Scripts/TFS.Admin.ServiceEndpoints");
import Service = require("VSS/Service");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Model = require("Admin/Scripts/ServiceEndpoint/EnpointSharedProjectsData")
import Endpoint_Actions = require("Admin/Scripts/ServiceEndpoint/Actions/EndpointActions");
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import Contracts = require("TFS/DistributedTask/Contracts");

export class EndpointActionCreator {
    constructor() {
        this.tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        let tfsConnection = new Service.VssConnection(this.tfsContext.contextData);
        this.ServiceEndpointHttpClient = tfsConnection.getService<TFS_Admin_ServiceEndpoints.ServiceEndPointService>(TFS_Admin_ServiceEndpoints.ServiceEndPointService);
    }

    public static getInstance(): EndpointActionCreator {
        if (!EndpointActionCreator.EndpointActionCreator) {
            EndpointActionCreator.EndpointActionCreator = new EndpointActionCreator();
        }

        return EndpointActionCreator.EndpointActionCreator;
    }

    public getSharedProjectsData(endpointId: string) {
        CoreRestClient.getClient().getProjects("WellFormed", 1000, null).then((projects) => {
            this.ServiceEndpointHttpClient.beginQuerySharedProjects(endpointId)
                .then((sharedProjects) => {
                    if (sharedProjects) {
                        let allProjects: Contracts.ProjectReference[] = [];
                        let currentProjectId = TFS_Host_TfsContext.TfsContext.getDefault().navigation.projectId;
                        projects.forEach(project => {
                            if (project.id !== currentProjectId){
                                let projectreference: Contracts.ProjectReference = {
                                    id: project.id,
                                    name: project.name
                                };

                                allProjects.push(projectreference);
                            }
                        });

                        let data: Model.EnpointSharedProjectsData = {
                            allProjects: allProjects,
                            sharedProjects: sharedProjects
                        };

                        Endpoint_Actions.sharedEndpointProjectsData.invoke(data);
                    }
                    else {
                        Endpoint_Actions.updateError.invoke(AdminResources.EndpointDoesnotExist);
                    }
                }, (reason) => {
                    Diag.logError(reason);
                    Endpoint_Actions.updateError.invoke(reason.message);
                });
        }, (reason) => {
            Diag.logError(reason);
            Endpoint_Actions.updateError.invoke(reason.message);
        });
    }

    public updateSharedProjects(projects: Contracts.ProjectReference[]) {
        Endpoint_Actions.updateSharedProjects.invoke(projects);
    }

    public updateError(errorMessage: string) {
        Endpoint_Actions.updateError.invoke(errorMessage);
    }

    public shareEndpointWithProjects(endpointId: string, projects: Contracts.ProjectReference[]) {
        projects.forEach(project => {
            this.ServiceEndpointHttpClient.beginShareEndpointWithProject(endpointId, project.id)
                .then(() => {
                    Endpoint_Actions.addedSharedProject.invoke(project);
                }, (reason) => {
                    Diag.logError(reason);
                    Endpoint_Actions.updateError.invoke(reason.message);
                });
        });
    }

    public unShareEndpointWithProjects(endpointId: string, projects: Contracts.ProjectReference[]) {
        projects.forEach(project => {
            this.ServiceEndpointHttpClient.beginDisconnectForSharedProject(endpointId, project.id)
                .then(() => {
                    Endpoint_Actions.removedSharedProject.invoke(project);
                }, (reason) => {
                    Diag.logError(reason);
                    Endpoint_Actions.updateError.invoke(reason.message);
                });
        });
    }

    private static EndpointActionCreator: EndpointActionCreator = null;
    private ServiceEndpointHttpClient: TFS_Admin_ServiceEndpoints.ServiceEndPointService;
    private tfsContext: TFS_Host_TfsContext.TfsContext;
}