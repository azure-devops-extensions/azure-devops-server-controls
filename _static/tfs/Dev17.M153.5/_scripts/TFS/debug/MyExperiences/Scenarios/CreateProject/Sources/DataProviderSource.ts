import * as Q from "q";
import { DataProviderQuery } from "VSS/Contributions/Contracts";
import * as Contribution_Services from "VSS/Contributions/Services";
import { ContributionsHttpClient } from "VSS/Contributions/RestClient";
import * as VSS_Error from "VSS/Error";
import * as Performance from "VSS/Performance";
import * as Serialization from "VSS/Serialization";
import * as VSS_Service from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import {
    TypeInfo,
    IProjectCreationMetadata
} from "MyExperiences/Scenarios/CreateProject/Contracts";
import { Constants } from "MyExperiences/Scenarios/CreateProject/Constants";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";

export interface IPageDataService {
    getPageData<T>(key: string, contractMetadata?: any);
}

export class DataProviderSource {
    private _perfScenarioManager: Performance.IScenarioManager;

    constructor(
        private _webPageDataService?: IPageDataService,
        private _contributionClient?: ContributionsHttpClient
    ) {
        this._perfScenarioManager = Performance.getScenarioManager() as Performance.IScenarioManager;

        if (!this._webPageDataService) {
            this._webPageDataService = VSS_Service.getService(Contribution_Services.WebPageDataService) as IPageDataService;
        }

        if (!this._contributionClient) {
            this._contributionClient = ProjectCollection.getConnection().getHttpClient<ContributionsHttpClient>(ContributionsHttpClient);
        }
    }

    /**
     * Fetches, deserializes and constructs the project creation metadata from the data provider
     */
    public getData(): IPromise<IProjectCreationMetadata> {
        let deferred = Q.defer<IProjectCreationMetadata>();
        let pageData: any = null;
        let projectCreationMetadata: IProjectCreationMetadata = null;

        Performance.getScenarioManager().split("ProjectCreationDataProvider.GetData.Start");

        let handlePageData = (pageData: any): void => {
            const projectCreationMetadata = this._deserializePageData(pageData);
            if (projectCreationMetadata) {
                deferred.resolve(projectCreationMetadata);
            } else {
                deferred.reject(new Error(MyExperiencesResources.CreateProjectGenericServerErrorText));
            }
        }

        // Check if data is present in JSON island
        pageData = this._webPageDataService.getPageData<any>(Constants.DataProvider);

        if (pageData) {
            // If data is present in the JSON island, deserialize it
            handlePageData(pageData);
            Performance.getScenarioManager().split("ProjectCreationDataProvider.GetData.End");
        } else {
            // If data is not present in the JSON island, query the data provider
            const query: DataProviderQuery = this._getDataProviderQuery();
            this._contributionClient.queryDataProviders(query).then(
                (contributionDataResult: DataProviderResult) => {
                    pageData = contributionDataResult.data[Constants.DataProvider];

                    if (pageData) {
                        handlePageData(pageData);
                    } else {
                        VSS_Error.publishErrorToTelemetry(
                            {
                                name: "MyExperiences.DataProviderSource.GetData.NullPagedata",
                                message: "Page data is not loaded by the data provider"
                            } as TfsError);

                        deferred.reject(new Error(MyExperiencesResources.CreateProjectGenericServerErrorText));
                    }
                    Performance.getScenarioManager().split("ProjectCreationDataProvider.GetData.End");
                },
                (error: Error) => {
                    VSS_Error.publishErrorToTelemetry(
                        {
                            name: "MyExperiences.DataProviderSource.GetData.Failed",
                            message: error.message
                        } as TfsError);

                    deferred.reject(new Error(MyExperiencesResources.CreateProjectGenericServerErrorText));
                    Performance.getScenarioManager().split("ProjectCreationDataProvider.GetData.Failed");
                });
        }        

        return deferred.promise;
    }

    private _deserializePageData(pageData: any): IProjectCreationMetadata {
        let collectionId = Serialization.ContractSerializer.deserialize(pageData["collectionId"], String as any);
        let collectionName = Serialization.ContractSerializer.deserialize(pageData["collectionName"], String as any);
        let canUserCreateProject = Serialization.ContractSerializer.deserialize(pageData["canUserCreateProject"], Boolean as any);
        let existingProjectNames = Serialization.ContractSerializer.deserialize(pageData["existingProjectNames"], String as any);
        let projectVisibilityMetadata = Serialization.ContractSerializer.deserialize(pageData["projectVisibilityOptions"], TypeInfo.IProjectCreationMetadataItemDescriptor);
        let versionControlMetadata = Serialization.ContractSerializer.deserialize(pageData["versionControlTypes"], TypeInfo.IProjectCreationMetadataItemDescriptor);
        let processTemplatesMetadata = Serialization.ContractSerializer.deserialize(pageData["processTemplates"], TypeInfo.IProcessTemplateDescriptor);
        let isReportingConfigured = Serialization.ContractSerializer.deserialize(pageData["isReportingConfigured"], Boolean as any);

        if (collectionId
            && collectionName
            && existingProjectNames
            && versionControlMetadata
            && processTemplatesMetadata) {

            return {
                collectionId: collectionId,
                collectionName: collectionName,
                canUserCreateProject: canUserCreateProject,
                existingProjectNames: existingProjectNames,
                projectVisibilityMetadata: projectVisibilityMetadata,
                versionControlMetadata: versionControlMetadata,
                processTemplatesMetadata: processTemplatesMetadata,
                isReportingConfigured: isReportingConfigured
            } as IProjectCreationMetadata;
        } else {
            return null;
        }
    }

    private _getDataProviderQuery(): DataProviderQuery {
        const query: DataProviderQuery = {
            context: {
                properties: {
                    "_a": "new",
                },
            },
            contributionIds: [Constants.DataProvider],
        };

        return query;
    }
}