import * as Q from "q";
import { WebPageDataService } from "VSS/Contributions/Services";
import { getScenarioManager } from "VSS/Performance";
import { getService, VssConnection } from "VSS/Service";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import { WebApiProject } from "TFS/Core/Contracts";
import { ProjectLanguageAnalytics, LanguageStatistics } from "TFS/ProjectAnalysis/Contracts";
import { ProjectAnalysisHttpClient } from "TFS/ProjectAnalysis/RestClient";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { ProjectLanguageMetricsData } from "ProjectOverview/Scripts/ActionsHub";
import { Constants, RMConstants, PerformanceConstants } from "ProjectOverview/Scripts/Constants";
import { ProjectOverviewConstants, ProjectOverviewCIConstants } from "ProjectOverview/Scripts/Generated/Constants";

export class ProjectLanguagesSource {
    public fetchProjectLanguages(): IPromise<ProjectLanguageMetricsData[]> {
        const deferred = Q.defer<ProjectLanguageMetricsData[]>();
        const perfScenario = getScenarioManager().startScenario(ProjectOverviewCIConstants.Area, PerformanceConstants.ProjectLanguagesFetchTime);
        const webPageDataService = getService(WebPageDataService);
        const contribution = this._getContribution();
        const properties = {
            [ProjectOverviewConstants.Scope]: ProjectOverviewConstants.ProjectLanguageMetrics,
        };

        webPageDataService.ensureDataProvidersResolved([contribution], true, properties).then(() => {
            const pageData = webPageDataService.getPageData(Constants.ProjectOverviewDataProviderId) || {};
            const projectLanguages = pageData[ProjectOverviewConstants.ProjectLanguageMetrics] || {};

            perfScenario.end();
            deferred.resolve(projectLanguages.tags || []);
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
