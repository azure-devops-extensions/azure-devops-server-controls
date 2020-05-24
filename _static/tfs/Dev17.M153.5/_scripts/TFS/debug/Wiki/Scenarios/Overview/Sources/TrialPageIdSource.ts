import * as Q from "q";
import { Contribution } from "VSS/Contributions/Contracts";
import { WebPageDataService } from "VSS/Contributions/Services";
import * as Service from "VSS/Service";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";

import { ContributionKeys } from "Wiki/Scripts/CommonConstants";

interface WikiPageIdPayload {
    wikiId: string;
    wikiVersion: string;
    pagePath: string;
}

export interface IPageDataService {
    getPageData<T>(key: string, contractMetadata?: any);
    ensureDataProvidersResolved(contributions: Contribution[], refreshIfExpired?: boolean, properties?: any): IPromise<any>;
}

// Do NOT Productize
// This is only used for testing purpose
// This should be removed when we get feature UX
export class TrialPageIdSource {

    constructor(private _webPageDataService?: IPageDataService) {
        if (!this._webPageDataService) {
            this._webPageDataService = Service.getService(WebPageDataService) as IPageDataService;
        }
    }

    public getWikiPageIds(wikiId: string, wikiVersion: string, pagePath: string): IPromise<any> {
        const deferred = Q.defer<any>();
        const properties = { wikiId, wikiVersion, pagePath };

        this._webPageDataService.ensureDataProvidersResolved([
            {
                id: ContributionKeys.WikiPageIdDataProvider,
                properties: {
                    serviceInstanceType: ServiceInstanceTypes.TFS
                }
            } as Contribution],
            true,
            properties,
        ).then(
            () => {
                const data = this._webPageDataService.getPageData<WikiPageIdPayload>(ContributionKeys.WikiPageIdDataProvider);
                deferred.resolve(data);
            }, deferred.reject,
        );

        return deferred.promise;
    }
}