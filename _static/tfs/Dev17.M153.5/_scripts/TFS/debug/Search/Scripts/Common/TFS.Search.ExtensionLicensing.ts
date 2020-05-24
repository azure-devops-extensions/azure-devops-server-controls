import Q = require("q");

import CommerceContracts = require("VSS/Commerce/Contracts");
import CommerceHttpClient = require("VSS/Commerce/RestClient");
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import Service = require("VSS/Service");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import ViewBuilder = require("Search/Scripts/Common/TFS.Search.ViewBuilder");
import WebApiConstants = require("VSS/WebApi/Constants");

export class ExtensionLicensing {

    private _commerceRestClient: CommerceHttpClient.CommerceHttpClient;

    get commerceRestClient(): CommerceHttpClient.CommerceHttpClient {
        if (!this._commerceRestClient) {
            this._commerceRestClient = Service.VssConnection.getConnection().getHttpClient(CommerceHttpClient.CommerceHttpClient, WebApiConstants.ServiceInstanceTypes.SPS);
        }
        return this._commerceRestClient;
    }

    public getOfferSubscription(galleryItemId: string): IPromise<CommerceContracts.IOfferSubscription> {
        var deferred = Q.defer<CommerceContracts.IOfferSubscription>();
        var handleError = (e: Error) => {
            TelemetryHelper.TelemetryHelper.traceLog({ "GetOfferSubscriptionCall": "GetOfferSubscription service call failed with exception" + e.message });
            deferred.reject(e);
        };

        this.commerceRestClient.getOfferSubscription(galleryItemId).then((offerSubscription: CommerceContracts.IOfferSubscription) => {
            deferred.resolve(offerSubscription);
        }, handleError);

        return deferred.promise;
    }
}
