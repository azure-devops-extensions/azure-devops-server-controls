/// <reference types="jquery" />

import WebApi_RestClient = require("VSS/WebApi/RestClient");

export class IdentityMruHttpClient extends WebApi_RestClient.VssHttpClient {
    public static IdentityMruArea = "core";
    public static IdentityMruLocationId = "5EAD0B70-2572-4697-97E9-F341069A783A";

    public beginGetMru(mruName: string) {
        return this._beginRequest({
            area: IdentityMruHttpClient.IdentityMruArea,
            locationId: IdentityMruHttpClient.IdentityMruLocationId,
            httpMethod: 'GET',
            responseIsCollection: true,
            routeValues: {
                mruName: mruName
            }
        });
    }

    public beginPostMruIdentity(mruName: string, identityIds: string[]) {
        return this._beginRequest({
            area: IdentityMruHttpClient.IdentityMruArea,
            locationId: IdentityMruHttpClient.IdentityMruLocationId,
            httpMethod: 'POST',
            routeValues: {
                mruName: mruName
            },
            data: {
                identityIds: identityIds
            }
        });
    }

    public beginDeleteMruIdentity(mruName: string, identityIds: string[]) {
        return this._beginRequest({
            area: IdentityMruHttpClient.IdentityMruArea,
            locationId: IdentityMruHttpClient.IdentityMruLocationId,
            httpMethod: 'DELETE',
            routeValues: {
                mruName: mruName
            },
            data: {
                identityIds: identityIds
            }
        });
    }
}

export interface ITemporaryDataResponse extends ITemporaryDataRequest {
    id: string;
    url: string;
    expirationDate?: Date;
}

export interface ITemporaryDataRequest {
    value: any;  // required value to be in json format due to the constraint from Temporary Data Service.
}

export class TemporaryDataHttpClient extends WebApi_RestClient.VssHttpClient {
    public static TemporaryDataArea = "properties";
    public static TemporaryDataLocationId = "B4B570EF-1775-4093-9218-AFB7E4C8AEF6";

    public beginGetTemporaryData(id: string): IPromise<ITemporaryDataResponse> {
        return this._beginRequest({
            area: TemporaryDataHttpClient.TemporaryDataArea,
            locationId: TemporaryDataHttpClient.TemporaryDataLocationId,
            httpMethod: 'GET',
            routeValues: {
                id: id
            }
        });
    }

    public beginCreateTemporaryData(temporaryData: ITemporaryDataRequest): IPromise<ITemporaryDataResponse> {
        return this._beginRequest({
            area: TemporaryDataHttpClient.TemporaryDataArea,
            locationId: TemporaryDataHttpClient.TemporaryDataLocationId,
            httpMethod: 'POST',
            data: temporaryData
        });
    }
}
