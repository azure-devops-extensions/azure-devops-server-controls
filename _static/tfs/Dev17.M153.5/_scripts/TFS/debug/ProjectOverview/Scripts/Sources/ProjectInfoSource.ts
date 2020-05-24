import * as Q from "q";
import { Identity, QueryMembership } from "VSS/Identities/Contracts";
import { IdentitiesHttpClient } from "VSS/Identities/RestClient";
import { getScenarioManager } from "VSS/Performance"
import { VssConnection } from "VSS/Service";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import { WebApiProject, WebApiTeamRef } from "TFS/Core/Contracts";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectHttpClient } from "Presentation/Scripts/TFS/TFS.Project.WebApi";
import { ProjectOverviewCIConstants, ProjectOverviewConstants } from "ProjectOverview/Scripts/Generated/Constants";
import { JobMonitorSource } from "ProjectOverview/Scripts/Sources/JobMonitorSource";

export class ProjectInfoSource {
    private _identitiesHttpClient: IdentitiesHttpClient;
    private _projHttpClient: ProjectHttpClient;
    private _jobMonitorSource: JobMonitorSource;
    private _tfsContext: TfsContext;
    private _tfsConnection: VssConnection;

    constructor() {
        this._tfsContext = TfsContext.getDefault();
        this._tfsConnection = new VssConnection(this._tfsContext.contextData);
    }

    public saveProjectDescription(newDescription: string, projectId: string): IPromise<string> {
        let project = <WebApiProject>{
            description: newDescription
        };

        let deferred = Q.defer<string>();

        this._getProjectHttpClient().beginUpdateProject(projectId, project).then(
            (data) => {
                this._getJobMonitorSource().pollJobResult(data.id).then(
                    () => {
                        deferred.resolve(newDescription);
                    },
                    deferred.reject
                );
            },
            deferred.reject
        );

        return deferred.promise;
    }

    public getIsProjectImageSet(): IPromise<boolean> {
        const perfScenario = getScenarioManager().startScenario(ProjectOverviewCIConstants.Area, "IsProjectImageSetFetchTime");
        const teamId = this._tfsContext.currentTeam.identity.id;

        return this._getIdentitiesHttpClient().readIdentity(teamId, QueryMembership.None, ProjectOverviewConstants.ImageIdProperty).then((response: Identity) => {
            perfScenario.end();
            return !!response.properties && !!response.properties[ProjectOverviewConstants.ImageIdProperty];
        });
    }

    public getDefaultTeam(projectId: string): IPromise<WebApiTeamRef> {
        const deferred = Q.defer<WebApiTeamRef>();
        const perfScenario = getScenarioManager().startScenario(ProjectOverviewCIConstants.Area, "AsyncTeamIdFetchTime");

        this._getProjectHttpClient().beginGetProject(projectId).then(
            (project: WebApiProject) => {
                perfScenario.end();
                deferred.resolve(project.defaultTeam);
            },
            (error: Error) => {
                perfScenario.abort();
                deferred.reject(error);
            });

        return deferred.promise;
    }

    private _getIdentitiesHttpClient(): IdentitiesHttpClient {
        if (!this._identitiesHttpClient) {
            this._identitiesHttpClient = this._tfsConnection.getHttpClient<IdentitiesHttpClient>(IdentitiesHttpClient, ServiceInstanceTypes.SPS);
        }

        return this._identitiesHttpClient;
    }

    private _getProjectHttpClient(): ProjectHttpClient {
        if (this._projHttpClient == null) {
            this._projHttpClient = this._tfsConnection.getHttpClient<ProjectHttpClient>(ProjectHttpClient);
        }

        return this._projHttpClient;
    }

    private _getJobMonitorSource(): JobMonitorSource {
        if (this._jobMonitorSource == null) {
            this._jobMonitorSource = new JobMonitorSource();
        }

        return this._jobMonitorSource;
    }
}