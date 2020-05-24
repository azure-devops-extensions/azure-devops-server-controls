import * as Q from "q";
import { DataProviderResult, DataProviderQuery, ResolvedDataProvider } from "VSS/Contributions/Contracts";
import * as Contributions_Services from "VSS/Contributions/Services";
import * as Service from "VSS/Service";

export function getDataProvidersResult<T>(contributionDataResult: DataProviderResult, dataProviderId: string): IPromise<T> {
    const pageData = contributionDataResult.data[dataProviderId] || {};
    const deferred = Q.defer<T>();

    if (Object.keys(pageData).length > 0) {
        deferred.resolve(pageData as T);
    } else {
        const fetchError = _getFetchErrorIfAny(contributionDataResult, dataProviderId);
        if (!!fetchError) {
            deferred.reject(fetchError);
        } else {
            // Empty state returned from server
            deferred.resolve(<T>{});
        }
    }

    return deferred.promise;
}

function _getFetchErrorIfAny(contributionDataResult: DataProviderResult, dataProviderId: string): Error {
    let fetchError: Error = null;

    const providersArray = contributionDataResult.resolvedProviders;
    if (!!providersArray) {
        for (let i = 0; i < providersArray.length; i++) {
            const provider = providersArray[i];
            if (provider.id === dataProviderId && !!provider.error) {
                fetchError = new Error();
                fetchError.message = provider.error;
                break;
            }
        }
    }

    return fetchError;
}
