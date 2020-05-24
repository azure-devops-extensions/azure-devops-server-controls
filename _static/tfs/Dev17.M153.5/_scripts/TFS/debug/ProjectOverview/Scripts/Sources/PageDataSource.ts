import * as Q from "q";
import { WebPageDataService } from "VSS/Contributions/Services";
import { getScenarioManager } from "VSS/Performance";
import { ContractSerializer } from "VSS/Serialization";
import { getService } from "VSS/Service";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import { Constants } from "ProjectOverview/Scripts/Constants";
import { ProjectOverviewCIConstants, ProjectOverviewConstants } from "ProjectOverview/Scripts/Generated/Constants";
import { ProjectOverviewData, TypeInfo } from "ProjectOverview/Scripts/Generated/Contracts";

export class PageDataSource {
    public fetchPageData(): IPromise<ProjectOverviewData> {
        const deferred = Q.defer<ProjectOverviewData>();
        const perfScenario = getScenarioManager().startScenario(ProjectOverviewCIConstants.Area, "AsyncProjectOverviewPageDataFetchTime");
        const webPageDataService = getService(WebPageDataService);
        const contribution = this._getContribution();

        webPageDataService.ensureDataProvidersResolved([contribution], true).then(() => {
            const pageData = webPageDataService.getPageData(Constants.ProjectOverviewDataProviderId) || {};
            const projectOverviewData = ContractSerializer.deserialize(
                pageData[ProjectOverviewConstants.ProjectOverviewData],
                TypeInfo.ProjectOverviewData,
                false);
            perfScenario.end();
            deferred.resolve(projectOverviewData);
        }, (error: Error) => {
            perfScenario.abort();
            deferred.reject(error);
        });

        return deferred.promise;
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
