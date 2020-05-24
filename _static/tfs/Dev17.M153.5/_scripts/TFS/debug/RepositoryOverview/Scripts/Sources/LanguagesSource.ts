import * as Q from "q";
import { WebPageDataService } from "VSS/Contributions/Services";
import { getScenarioManager } from "VSS/Performance";
import { getService } from "VSS/Service";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";

import { PerfConstants } from "RepositoryOverview/Scripts/Constants";

import { RepositoryOverviewConstants, RepositoryOverviewCIConstants } from "RepositoryOverview/Scripts/Generated/Constants";
import { RepositoryLanguageInfo } from "RepositoryOverview/Scripts/Generated/Contracts";

export class LanguagesSource {
    constructor(
        private _dataProviderId: string
    ){}

    public fetchLanguages(): IPromise<RepositoryLanguageInfo[]> {
        const perfScenario = getScenarioManager().startScenario(
            RepositoryOverviewCIConstants.Area, 
            PerfConstants.LanguagesFetchTime);

        const webPageDataService = getService(WebPageDataService);
        const contribution = this._getContribution();
        const properties = {
            [RepositoryOverviewConstants.Scope]: RepositoryOverviewConstants.LanguagesDataProviderScope,
        };

        return webPageDataService.ensureDataProvidersResolved([contribution], true, properties).then(
            () => {
                const pageData = webPageDataService.getPageData(this._dataProviderId) || {};
                const languages = pageData[RepositoryOverviewConstants.LanguagesInfoKey] || [] as RepositoryLanguageInfo[];
                perfScenario.end();
                return languages;
            }, (error: Error) => {
                perfScenario.abort();
                throw error;
            });
    }

    private _getContribution(): Contribution {
        const contribution = {
            id: this._dataProviderId,
            properties: {
                serviceInstanceType: ServiceInstanceTypes.TFS,
            },
        } as Contribution;

        return contribution;
    }
}
