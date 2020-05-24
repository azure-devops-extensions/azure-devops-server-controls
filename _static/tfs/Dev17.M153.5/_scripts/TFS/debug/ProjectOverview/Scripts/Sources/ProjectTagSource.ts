import * as Q from "q";
import { WebPageDataService } from "VSS/Contributions/Services";
import { getScenarioManager } from "VSS/Performance";
import { getService, VssConnection } from "VSS/Service";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import { JsonPatchDocument, JsonPatchOperation, Operation } from "VSS/WebApi/Contracts";
import { ProjectProperty } from "TFS/Core/Contracts";
import { CoreHttpClient } from "TFS/Core/RestClient";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectOverviewConstants, ProjectOverviewCIConstants } from "ProjectOverview/Scripts/Generated/Constants";
import { Constants, PerformanceConstants } from "ProjectOverview/Scripts/Constants";
import * as  ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";

// Task 1059607
export class ProjectTagSource {
    private _coreHttpClient: CoreHttpClient;

    public saveProjectTag(addedTags: string[], removedTags: string[], projectId: string): IPromise<void> {

        let deferred = Q.defer<void>();
        let createPatchDocument = (): JsonPatchDocument => {

            let operations: JsonPatchOperation[] = [];

            addedTags.forEach(function (tag: string) {
                operations.push(
                    {
                        from: "",
                        op: Operation.Add,
                        path: "/" + ProjectOverviewConstants.ProjectTagsPropertyPrefix + tag,
                        value: "true",
                    } as JsonPatchOperation);
            });
            removedTags.forEach(function (tag: string) {
                operations.push(
                    {
                        from: "",
                        op: Operation.Remove,
                        path: "/" + ProjectOverviewConstants.ProjectTagsPropertyPrefix + tag,
                        value: null,
                    } as JsonPatchOperation);
            });
            return operations as JsonPatchDocument;
        }

        this._getCoreHttpClient().setProjectProperties(projectId, createPatchDocument()).then(
            () => {
                 deferred.resolve(null);
            },
            deferred.reject
        );

        return deferred.promise;
    }

    public fetchProjectTags(projectId: string): IPromise<string[]> {
        const deferred = Q.defer<string[]>();
        const client = this._getCoreHttpClient();
        
        client.getProjectProperties(
            projectId,
            [ProjectOverviewConstants.ProjectTagsPropertyPrefix + "*"]).then(
            (projectProperties: ProjectProperty[]) => {
                if (projectProperties == null) {
                    deferred.resolve(null);
                }

                let tags = [];

                projectProperties.forEach(function (property) {
                    let tag = property.name.slice(ProjectOverviewConstants.ProjectTagsPropertyPrefix.length);
                    if (!!tag) {
                        tags.push(tag);
                    }
                });
                deferred.resolve(tags);
            },
            (error) => {
                deferred.reject(ProjectOverviewResources.ProjectTags_ErrorLoadingTags);
            }
        );

        return deferred.promise;
    }

    public fetchAllProjectTags(): IPromise<string[]> {
        const deferred = Q.defer<string[]>();
        const perfScenario = getScenarioManager().startScenario(ProjectOverviewCIConstants.Area, PerformanceConstants.AllProjectTagsFetchTime);
        const webPageDataService = getService(WebPageDataService);
        const contribution = this._getContribution();
        const properties = {
            [ProjectOverviewConstants.Scope]: ProjectOverviewConstants.AllProjectTags,
        };

        webPageDataService.ensureDataProvidersResolved([contribution], true, properties).then(() => {
            const pageData = webPageDataService.getPageData(Constants.ProjectOverviewDataProviderId) || {};
            const allProjectTags = pageData[ProjectOverviewConstants.AllProjectTags];
            const sanitizedTags: string[] = [];

            allProjectTags.tags.forEach(function (eachTag) {
                var tag = eachTag.slice(ProjectOverviewConstants.ProjectTagsPropertyPrefix.length);
                if (!!tag) {
                    sanitizedTags.push(tag);
                }
            });

            perfScenario.end();
            deferred.resolve(sanitizedTags);
        }, (error: Error) => {
            perfScenario.abort();
            deferred.reject(error);
        });

        return deferred.promise;
    }

    private _getCoreHttpClient(): CoreHttpClient {
        if (this._coreHttpClient == null) {
            const tfsContext: TfsContext = TfsContext.getDefault();
            const tfsConnection: VssConnection = new VssConnection(tfsContext.contextData);
            this._coreHttpClient = tfsConnection.getHttpClient<CoreHttpClient>(CoreHttpClient);
        }

        return this._coreHttpClient;
    }

    private _getContribution(): Contribution {
        const contribution = {
            id: Constants.ProjectOverviewDataProviderId,
            properties: {
                serviceInstanceType: ServiceInstanceTypes.TFS,
            },
        } as Contribution;

        return contribution;
    }
}