import * as Q from "q";

import { HelpLinks } from "DistributedTaskControls/Common/Common";

import * as Context from "VSS/Context";
import * as Diag from "VSS/Diag";
import * as Service from "VSS/Service";
import { ContributionsHttpClient } from "VSS/Contributions/RestClient";
import { DataProviderQuery, DataProviderResult } from "VSS/Contributions/Contracts";

export interface IMarketplaceData {
    serverKey: string;
    marketplaceUrl: string;
}

export class MarketplaceLinkHelper {

    public static getMarketplaceLink(): IPromise<string> {
        let deferred = Q.defer<string>();
        let marketplaceUrl = HelpLinks.DefaultMarketplaceLink + "&utm_source=vstsproduct&utm_medium=TaskGallery";

        if (!Context.getPageContext().webAccessConfiguration.isHosted) {
            this.beginGetMarketPlaceData().then(
                (data: IMarketplaceData) => {
                    if (data) {
                        marketplaceUrl = marketplaceUrl + "&serverKey=" + encodeURIComponent(data.serverKey);
                    }
                    else {
                        Diag.logError("Marketplace data provider is returning null on onprem");
                    }
                    deferred.resolve(marketplaceUrl);
                },
                (error) => {
                    deferred.resolve(marketplaceUrl);
                });
        }
        else {
            deferred.resolve(marketplaceUrl);
        }

        return deferred.promise;
    }

    public static beginGetMarketPlaceData(): IPromise<IMarketplaceData> {
        let deferred = Q.defer<IMarketplaceData>();

        if (!this._dataPromise) {
            let contributionsClient = Service.VssConnection.getConnection().getHttpClient(ContributionsHttpClient);

            let query: DataProviderQuery = {
                context: {
                    properties: {}
                },
                contributionIds: ["ms.vss-tfs.marketplace-data-provider"]
            };

            contributionsClient.queryDataProviders(query).then((contributionDataResult: DataProviderResult) => {
                let pageData: any = contributionDataResult.data["ms.vss-tfs.marketplace-data-provider"];
                pageData ? deferred.resolve({serverKey: pageData.serverKey, marketplaceUrl: pageData.marketplaceUrl} as IMarketplaceData)
                    : deferred.resolve(null);
            }, (error) => {
                deferred.reject(error);
                this._dataPromise = null;
            });
            this._dataPromise = deferred.promise;
        }
        
        return this._dataPromise;
    }

    private static _dataPromise: IPromise<IMarketplaceData>;
}