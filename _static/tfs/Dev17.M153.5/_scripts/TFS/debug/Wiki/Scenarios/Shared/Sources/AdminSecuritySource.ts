import * as Q from "q";
import { Contribution } from "VSS/Contributions/Contracts";
import { WebPageDataService } from "VSS/Contributions/Services";
import * as Service from "VSS/Service";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";

import { ContributionKeys } from "Wiki/Scripts/CommonConstants";

interface ProjectWikiAdminPayload {
    wikiRepoId: string;
}

export interface IPageDataService {
    getPageData<T>(key: string, contractMetadata?: any);
    ensureDataProvidersResolved(contributions: Contribution[], refreshIfExpired?: boolean, properties?: any): IPromise<any>;
}

export class AdminSecuritySource {
    
    constructor(private _webPageDataService?: IPageDataService) {
        if (!this._webPageDataService) {
            this._webPageDataService = Service.getService(WebPageDataService) as IPageDataService;
        }
    }

    public getProjectWikiRepoId(): IPromise<string> {
        const deferred = Q.defer<string>();
        
        this._webPageDataService.ensureDataProvidersResolved([
            {
                id: ContributionKeys.WikiAdminSecuriytDataProvider,
                properties: {
                    serviceInstanceType: ServiceInstanceTypes.TFS
                }
            } as Contribution]
        ).then(
            () => {
                const data = this._webPageDataService.getPageData<ProjectWikiAdminPayload>(ContributionKeys.WikiAdminSecuriytDataProvider);

                deferred.resolve(data.wikiRepoId);
            }, deferred.reject,
        );

        return deferred.promise;
    }
}