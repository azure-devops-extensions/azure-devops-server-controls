import * as Q from "q";
import { DataProviderResult, DataProviderQuery} from "VSS/Contributions/Contracts";
import { ContributionsHttpClient } from "VSS/Contributions/RestClient";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";

import { getDataProvidersResult } from "MyExperiences/Scenarios/Shared/ContributionsSourceHelper";

export class ContributionsSource {

    constructor(
        private _serviceInstanceId?: string,
        private _contributionsClient?: ContributionsHttpClient
        ) {
    }

    public queryDataProviders(query: DataProviderQuery): IPromise<DataProviderResult> {
        return this.contributionsClient.queryDataProviders(query);
    }

    public getDataForContribution<T>(contributionId: string, properties?: any): IPromise<T> {
        const query = _getDataProviderQuery(contributionId, properties);

        return this.queryDataProviders(query).then((dataProviderResult: DataProviderResult) => {
            return getDataProvidersResult<T>(dataProviderResult, contributionId);
        });
    }

    public getDataWithDefaultQueryForContribution<T>(contributionId: string): IPromise<T> {
        const query = _getDataProviderQuery(contributionId);

        return this.queryDataProviders(query).then((dataProviderResult: DataProviderResult) => {
            return getDataProvidersResult<T>(dataProviderResult, contributionId);
        });
    }

    private get contributionsClient(): ContributionsHttpClient {
        if (!this._contributionsClient) {
            this._contributionsClient = ProjectCollection.getConnection().getHttpClient(ContributionsHttpClient, this._serviceInstanceId);
        }

        return this._contributionsClient;
    }
}

export function _getDataProviderQuery(dataProviderId: string, properties?: any): DataProviderQuery {

    return {
        context: {
            properties: !!properties ? properties : { }
        },
        contributionIds: [dataProviderId]
    };
}
