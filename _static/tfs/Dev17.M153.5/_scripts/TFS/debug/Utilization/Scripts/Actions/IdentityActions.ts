import Action_Base = require("VSS/Flux/Action");

import Identities_Picker_RestClient = require("VSS/Identities/Picker/RestClient");
import VSS_Service = require("VSS/Service");

export var StartDataFetch = new Action_Base.Action<any>();
export var DataLoad = new Action_Base.Action<any>();
export var DataLoadError = new Action_Base.Action<any>();

export class IdentityActionCreatorClass {

    protected _getIdentityDisplayName: (id: string) => IPromise<string>;

    constructor(getIdentityDisplayName: (id: string) => IPromise<string>) {
        this._getIdentityDisplayName = getIdentityDisplayName;
    }

    public getIdentityDisplayName(id: string): void {
        let payloadPromise: IPromise<string> = this._getIdentityDisplayName(id);

        if (payloadPromise) {
            StartDataFetch.invoke(id);
            payloadPromise.then((displayName: string) => {
                DataLoad.invoke({ identityId: id, displayName: displayName });
            }, (reason: any) => {
                DataLoadError.invoke(reason);
            });
        }
    }
}

export var IdentityActionCreator = new IdentityActionCreatorClass((id: string): IPromise<string> => {
    // start a query into what the display name is of an arbitrary VSID
    const identitySearchRequest: Identities_Picker_RestClient.IdentitiesSearchRequestModel = {
        query: id,
        identityTypes: ["user"],
        operationScopes: ["ims"],
        properties: ["DisplayName"],
        queryTypeHint: "uid",
    };

    let identityPickerClient: Identities_Picker_RestClient.AbstractIdentityPickerHttpClient = VSS_Service.getClient<Identities_Picker_RestClient.CommonIdentityPickerHttpClient>(Identities_Picker_RestClient.CommonIdentityPickerHttpClient);
    return identityPickerClient.beginGetIdentities(identitySearchRequest).then((searchResponse: Identities_Picker_RestClient.IdentitiesSearchResponseModel) => {
        return (searchResponse.results.length > 0 && searchResponse.results[0].identities.length > 0) ? searchResponse.results[0].identities[0].displayName : "";
    }, (reason: any) => {
        return reason;
    });
});