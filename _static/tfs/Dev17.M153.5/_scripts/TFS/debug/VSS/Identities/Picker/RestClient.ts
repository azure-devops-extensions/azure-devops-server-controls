/// <reference types="jquery" />
import WebApi_Constants = require("VSS/WebApi/Constants");
import WebApi_Contracts = require("VSS/WebApi/Contracts");
import WebApi_RestClient = require("VSS/WebApi/RestClient");

/**
 * @exemptedapi
 */
export class AbstractIdentityPickerHttpClient extends WebApi_RestClient.VssHttpClient {
    public beginGetIdentities(identitiesRequest: IdentitiesSearchRequestModel): IPromise<IdentitiesSearchResponseModel> {
        //re-implement in sub-classes
        throw {
            source: "AbstractIdentityPickerHttpClient",
            message: "A concrete httpclient should extend AbstractIdentityPickerHttpClient and implement beginGetIdentities"
        };
    }


    public beginGetIdentityImageLocation(objectId: string): IPromise<string> {
        //re-implement in sub-classes
        throw {
            source: "AbstractIdentityPickerHttpClient",
            message: "A concrete httpclient should extend AbstractIdentityPickerHttpClient and implement beginGetImageLocation"
        };
    }

    public beginGetConnections(objectId: string, getRequestParams: IdentitiesGetConnectionsRequestModel): IPromise<IdentitiesGetConnectionsResponseModel> {
        //re-implement in sub-classes
        throw {
            source: "AbstractIdentityPickerHttpClient",
            message: "A concrete httpclient should extend AbstractIdentityPickerHttpClient and implement beginGetConnections"
        };
    }

    public beginGetIdentityFeatureMru(identityId: string, featureId: string, getRequestParams: IdentitiesGetMruRequestModel): IPromise<IdentitiesGetMruResponseModel> {
        //re-implement in sub-classes
        throw {
            source: "AbstractIdentityPickerHttpClient",
            message: "A concrete httpclient should extend AbstractIdentityPickerHttpClient and implement beginGetMru"
        };
    }

    public beginPatchIdentityFeatureMru(identityId: string, featureId: string, patchRequestBody: IdentitiesPatchMruAction[]): IPromise<IdentitiesPatchMruResponseModel> {
        //re-implement in sub-classes
        throw {
            source: "AbstractIdentityPickerHttpClient",
            message: "A concrete httpclient should extend AbstractIdentityPickerHttpClient and implement beginPatchMru"
        };
    }
}

/**
 * @exemptedapi
 */
export class CommonIdentityPickerHttpClient extends AbstractIdentityPickerHttpClient {
    private static _identityImageLocation: IPromise<WebApi_Contracts.ApiResourceLocation> = null;
    public beginGetIdentities(identitiesRequest: IdentitiesSearchRequestModel): IPromise<IdentitiesSearchResponseModel> {
        return this._beginRequest<IdentitiesSearchResponseModel>({
            area: WebApi_Constants.CommonIdentityPickerResourceIds.ServiceArea,
            locationId: WebApi_Constants.CommonIdentityPickerResourceIds.IdentitiesLocationId,
            httpMethod: 'POST',
            data: identitiesRequest
        });
    }

    public beginGetIdentityImageLocation(objectId: string): IPromise<string> {
        var routeValues = {
            objectId: objectId
        };

        if (!CommonIdentityPickerHttpClient._identityImageLocation) {
            CommonIdentityPickerHttpClient._identityImageLocation = this._beginGetLocation(
                WebApi_Constants.CommonIdentityPickerResourceIds.ServiceArea,
                WebApi_Constants.CommonIdentityPickerResourceIds.IdentityAvatarLocationId);
        }

        return CommonIdentityPickerHttpClient._identityImageLocation.then(
            (location: WebApi_Contracts.ApiResourceLocation) => {
                var avatarUrl = this.getRequestUrl(location.routeTemplate, location.area, location.resourceName, routeValues, {});
                return avatarUrl;
            });
    }

    public beginGetConnections(objectId: string, getRequestParams: IdentitiesGetConnectionsRequestModel): IPromise<IdentitiesGetConnectionsResponseModel> {
        return this._beginRequest<IdentitiesGetConnectionsResponseModel>({
            area: WebApi_Constants.CommonIdentityPickerResourceIds.ServiceArea,
            locationId: WebApi_Constants.CommonIdentityPickerResourceIds.IdentityConnectionsLocationId,
            httpMethod: 'GET',
            routeValues: {
                objectId: objectId,
            },
            data: getRequestParams
        });
    }

    public beginGetIdentityFeatureMru(identityId: string, featureId: string, getRequestParams: IdentitiesGetMruRequestModel): IPromise<IdentitiesGetMruResponseModel> {
        return this._beginRequest<IdentitiesGetMruResponseModel>({
            area: WebApi_Constants.CommonIdentityPickerResourceIds.ServiceArea,
            locationId: WebApi_Constants.CommonIdentityPickerResourceIds.IdentityFeatureMruLocationId,
            httpMethod: 'GET',
            routeValues: {
                objectId: identityId,
                featureId: featureId,
            },
            data: getRequestParams
        });
    }

    public beginPatchIdentityFeatureMru(identityId: string, featureId: string, patchRequestBody: IdentitiesPatchMruAction[]): IPromise<IdentitiesPatchMruResponseModel> {
        return this._beginRequest<IdentitiesPatchMruResponseModel>({
            area: WebApi_Constants.CommonIdentityPickerResourceIds.ServiceArea,
            locationId: WebApi_Constants.CommonIdentityPickerResourceIds.IdentityFeatureMruLocationId,
            httpMethod: 'PATCH',
            routeValues: {
                objectId: identityId,
                featureId: featureId,
            },
            data: patchRequestBody
        });
    }
}

/**
 *   Identity Picker Models
**/
export interface IEntity {
    /**
    *   Always set. Not to be parsed as any non-string type.
    **/
    entityId: string;
    /**
    *   Always set. e.g. user or group
    **/
    entityType: string;
    /**
    *   Always set. e.g. vsd or aad - aad for AAD-backed/linked accounts, vsd otherwise
    **/
    originDirectory: string;
    /**
    *   Always set. e.g. the objectId in case of AAD sourced entities (AAD-backed/linked accounts).
    **/
    originId: string;
    /**
    *   Set to the IMS vsid in case of non-AAD-backed/linked entities. 
    **/
    localDirectory?: string;
    localId?: string;
    displayName?: string;
    scopeName?: string;
    department?: string;
    jobTitle?: string;
    mail?: string;
    mailNickname?: string;
    physicalDeliveryOfficeName?: string;
    signInAddress?: string;
    subjectDescriptor?: string;
    surname?: string;
    guest?: boolean;
    active?: boolean;
    description?: string;
    image?: string;
    manager?: string;
    samAccountName?: string;
    telephoneNumber?: string;
    /**
    *   The isMru field denotes whether this identity was loaded via a MruService operation or an IdentityService operation. 
    *   Furthermore, this should not be set for identities that were constructed (for constants etc.)
    **/
    isMru?: boolean;
}

//Search API

export interface QueryTokenResultModel {
    queryToken: string;
    identities: IEntity[]
    pagingToken?: string;
}

/**
 * @exemptedapi
 */
export interface IdentitiesSearchRequestModel {
    query: string;
    identityTypes: string[];
    operationScopes: string[];
    queryTypeHint?: string;
    pagingToken?: string;
    properties?: string[];
    filterByAncestorEntityIds?: string[];
    filterByEntityIds?: string[];
    options?: any;
}

/**
 * @exemptedapi
 */
export interface IdentitiesSearchResponseModel {
    results: QueryTokenResultModel[];
}

//GetAvatar API

/**
 * @exemptedapi
 */
export interface IdentitiesGetAvatarResponseModel {
    avatar: string;
}

//GetConnections API

/**
 * @exemptedapi
 */
export interface IdentitiesGetConnectionsRequestModel {
    connectionTypes: string[];
    identityTypes: string[];
    operationScopes: string[];
    depth?: number;
    options?: any;
    pagingToken?: string;
    properties?: string[];
}

/**
 * @exemptedapi
 */
export interface IdentitiesGetConnectionsResponseModel {
    successors?: IEntity[];
    managers?: IEntity[];
    directReports?: IEntity[];
}

//GetMru API

/**
 * @exemptedapi
 */
export interface IdentitiesGetMruRequestModel {
    operationScopes: string[];
    properties?: string[];
    filterByAncestorEntityIds?: string[];
    filterByEntityIds?: string[];
}

/**
 * @exemptedapi
 */
export interface IdentitiesGetMruResponseModel {
    mruIdentities: IEntity[];
}

//PatchMru API

/**
 * @exemptedapi
 */
export interface IdentitiesPatchMruAction {
    op: string;
    value: string[];
    operationScopes: string[];
}

/**
 * @exemptedapi
 */
export interface IdentitiesPatchMruResponseModel {
    result: boolean;
}
