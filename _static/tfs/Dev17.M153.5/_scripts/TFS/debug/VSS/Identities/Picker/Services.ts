/// <reference types="jquery" />
import Context = require("VSS/Context");
import Locations = require("VSS/Locations");
import Performance = require("VSS/Performance");
import Service = require("VSS/Service");
import Telemetry = require("VSS/Telemetry/Services");
import User_Services = require("VSS/User/Services");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");

import Identities_Picker_RestClient = require("VSS/Identities/Picker/RestClient");
import Identities_Picker_Cache = require("VSS/Identities/Picker/Cache");
import Identities_Picker_Common = require("VSS/Identities/Picker/Common");
import Identities_Picker_Constants = require("VSS/Identities/Picker/Constants");

import Q = require("q");

var delegate = Utils_Core.delegate;

/**
 * @exemptedapi
 */
interface IArgumentException {
    parameter: string;
    message: string;
    source?: string;
    details?: any;
}

/**
*   Maps to static Directory in the DirectoryDiscoveryService
**/
export interface IOperationScope {
    /**
    *   Search the applicable source directory - AAD tenant-level for AAD-backed accounts or IMS account-level for MSA accounts/on-premise TFS
    **/
    Source?: boolean;
    /**
    *   Search IMS (Identity service)
    **/
    IMS?: boolean;
    /**
    *   Search the Azure Active Directory
    **/
    AAD?: boolean;
    /**
    *   Search Active Directory
    **/
    AD?: boolean;
    /**
    *   Search Windows Machine Directory
    **/
    WMD?: boolean;
}

/**
*   Suggest that the query need not be treated as a prefix
**/
export interface IQueryTypeHint {
    UID?: boolean;
}

/**
*   Maps to static DirectoryObjectType in the DirectoryDiscoveryService
**/
export interface IEntityType {
    User?: boolean;
    Group?: boolean;
}

/**
*  The kinds of edges in the identity directed graph that you want to traverse
**/
export interface IConnectionType {
    successors?: boolean;
    managers?: boolean;
    directReports?: boolean;
}

/**
 * @exemptedapi
 * These client service helpers are meant to be used only by the framework identity picker controls and services and should not be used elsewhere.
 */
export class ServiceHelpers {

    //default list of properties for AAD/AD/WMD/VSTS Users/Groups (almost all of them)
    public static _defaultProperties = ["DisplayName", "IsMru", "ScopeName", "SamAccountName", "Active", "SubjectDescriptor"];
    public static _defaultUserProperties = ["Department", "JobTitle", "Mail", "MailNickname", "PhysicalDeliveryOfficeName", "SignInAddress", "Surname", "Guest", "TelephoneNumber"];
    public static _defaultGroupProperties = ["Description"];

    public static DefaultUserImage = Locations.urlHelper.getVersionedContentUrl("ip-content-user-default.png");
    public static DefaultVsoGroupImage = Locations.urlHelper.getVersionedContentUrl("ip-content-vso-group-default.png");
    public static DefaultRemoteGroupImage = Locations.urlHelper.getVersionedContentUrl("ip-content-aad-group-default.png");

    //Directory service directories
    public static VisualStudioDirectory = "vsd";
    public static AzureActiveDirectory = "aad";
    public static ActiveDirectory = "ad";
    public static WindowsMachineDirectory = "wmd";
    public static SourceDirectory = "src";

    //EntityTypes
    public static UserEntity = "user";
    public static GroupEntity = "group";

    //Options
    public static OptionsMinResultsKey = "MinResults";
    public static OptionsMaxResultsKey = "MaxResults";

    //Extension data constants
    public static ExtensionData_ExtensionIdKey = "ExtensionId";
    public static ExtensionData_ProjectScopeNameKey = "ProjectScopeName";
    public static ExtensionData_CollectionScopeNameKey = "CollectionScopeName";
    public static ExtensionData_ConstraintListKey = "Constraints";
    public static ExtensionData_NoServiceIdentities = "NoServiceIdentities";

    public static GetIdentities_Prefix_Separator = ';';

    /**
    *   Currently supports only AAD, IMS, Source, AD and WMD (AAD for AAD-backed accounts, IMS for MSA accounts/on-premise TFS and AD and WMD for on-premise TFS)
    **/
    public static getOperationScopeList(operationScope: IOperationScope): string[] {
        var queryScopes = [];
        if (operationScope.IMS) {
            queryScopes.push("ims");
        }
        if (operationScope.Source) {
            queryScopes.push("source");
        }
        if (operationScope.AAD) {
            queryScopes.push("aad");
        }
        if (operationScope.AD) {
            queryScopes.push("ad");
        }
        if (operationScope.WMD) {
            queryScopes.push("wmd");
        }
        return queryScopes;
    }

    public static getQueryTypeHint(queryTypeHint: IQueryTypeHint): string {
        var queryTypeHintString: string = void 0;
        if (!queryTypeHint) {
            return queryTypeHintString;
        }
        if (queryTypeHint.UID) {
            queryTypeHintString = "uid";
        }

        return queryTypeHintString;
    }

    /**
    *   Currently supports only Users and Groups
    **/
    public static getIdentityTypeList(identityType: IEntityType): string[] {
        var queryTypes = [];
        if (identityType.User) {
            queryTypes.push(ServiceHelpers.UserEntity);
        }
        if (identityType.Group) {
            queryTypes.push(ServiceHelpers.GroupEntity);
        }
        return queryTypes;
    }

    /**
    *   Currently supports only Successors, Managers, and Direct Reports
    **/
    public static getConnectionTypeList(connectionType: IConnectionType): string[] {
        var queryTypes = [];
        if (connectionType.successors) {
            queryTypes.push("successors");
        }
        else if (connectionType.successors) {
            queryTypes.push("predecessors");
        }
        if (connectionType.managers) {
            queryTypes.push("managers");
        }
        if (connectionType.directReports) {
            queryTypes.push("directReports");
        }
        return queryTypes;
    }

    public static getDefaultIdentityImage(identity: Identities_Picker_RestClient.IEntity): string {
        if (identity.entityType.toLowerCase().trim() == ServiceHelpers.GroupEntity) {
            if (identity.originDirectory.toLowerCase().trim() == ServiceHelpers.VisualStudioDirectory) {
                return ServiceHelpers.DefaultVsoGroupImage;
            }
            return ServiceHelpers.DefaultRemoteGroupImage;
        } else {
            return ServiceHelpers.DefaultUserImage;
        }
    }

    public static getDistinct(array: string[]): string[] {
        var arrayDistinctValues = array.filter((value: string, index: number, arr: string[]) => {
            return arr.indexOf(value) == index;
        });

        return arrayDistinctValues;
    }

    public static isAuthenticatedMember() {
        return User_Services.getService().hasClaim(User_Services.UserClaims.Member);
    }

    public static getPrefixTypeForTelemetry(prefix: string) {
        if (Utils_String.isGuid(prefix)) {
            return Identities_Picker_Constants.PrefixType.Vsid;
        }

        let atPosition = prefix.indexOf("@");
        if (atPosition && prefix.indexOf(".", atPosition)) {
            return Identities_Picker_Constants.PrefixType.SignInAddress;
        }

        let backslashPosition = prefix.indexOf("\\");
        if (backslashPosition && backslashPosition == prefix.lastIndexOf("\\")) {
            return Context.getPageContext().webAccessConfiguration.isHosted
                ? Identities_Picker_Constants.PrefixType.ScopedPrefix
                : Identities_Picker_Constants.PrefixType.DomainSamAccountName;
        }

        if (prefix.startsWith("vss.ds.v1")) {
            return Identities_Picker_Constants.PrefixType.EntityId;
        }

        return Identities_Picker_Constants.PrefixType.StringPrefix;
    }

    public static addScenarioProperties(
        service: Service.VssService,
        scenarioProperties: IDictionaryStringTo<any>,
        operationScope?: IOperationScope,
        identityType?: IEntityType,
        options?: IIdentityServiceOptions,
        extensionOptions?: IIdentityPickerExtensionOptions) {
        if (identityType) {
            scenarioProperties[Identities_Picker_Constants.TelemetryProperties.identityTypes] = ServiceHelpers.getIdentityTypeList(identityType);
        }
        if (operationScope) {
            scenarioProperties[Identities_Picker_Constants.TelemetryProperties.operationScopes] = ServiceHelpers.getOperationScopeList(operationScope);
        }
        if (options) {
            scenarioProperties[Identities_Picker_Constants.TelemetryProperties.maxResults] = options.maxResults;
            scenarioProperties[Identities_Picker_Constants.TelemetryProperties.minResults] = options.minResults;
        }

        scenarioProperties[Identities_Picker_Constants.TelemetryProperties.consumerId] = extensionOptions ? extensionOptions.consumerId : Identities_Picker_Constants.ConsumerId.UnknownConsumer;

        scenarioProperties[Identities_Picker_Constants.TelemetryProperties.userId] = service && service.getWebContext() && service.getWebContext().user ? service.getWebContext().user.id : "";
        scenarioProperties[Identities_Picker_Constants.TelemetryProperties.accountProjectCollectionTeam] = ServiceHelpers._getHostMetadata(service);
        return scenarioProperties;
    }

    private static _getHostMetadata(service: Service.VssService) {
        var accountName: string = "";
        var collectionName: string = "";
        var projectName: string = "";
        var teamName: string = "";
        if (service && service.getWebContext()) {
            accountName = service.getWebContext().account ? service.getWebContext().account.name : "";
            collectionName = service.getWebContext().collection ? service.getWebContext().collection.name : "";
            projectName = service.getWebContext().project ? service.getWebContext().project.name : "";
            teamName = service.getWebContext().team ? service.getWebContext().team.name : "";
        }
        return "account[" + accountName + "]/collection[" + collectionName + "]/project[" + projectName + "]/team[" + teamName + "]";
    }
}

/**
 * @exemptedapi
 * This interface provides data for the identity picker service extension
 */
export interface IExtensionData {
    extensionId: string;
    //tentative params
    projectScopeName?: string;
    collectionScopeName?: string;
    constraints?: string[];
}

/**
 * @exemptedapi
 */
export interface IIdentityPickerExtensionOptions {
    /**
    *   The source of the request - please update the Common Identity Picker wiki with your consumer GUID
    **/
    consumerId: string;
}

/**
 * @exemptedapi
 */
export interface IIdentityServiceOptions {
    /**
    *   The httpClient that should be used instead of the CommonIdentityPickerHttpClient
    **/
    httpClient?: Identities_Picker_RestClient.AbstractIdentityPickerHttpClient;

    /**
    *   The minimum results that need to be fetched
    **/
    minResults?: number;
    /**
    *   The maximum results that need to be fetched
    **/
    maxResults?: number;
    /**
    *   Details about the control's current environment that might help an IEntityOperationsExtension in modifying requests.
    **/
    extensionData?: IExtensionData;
    /**
    *   type of identities - one or more of User or Group
    **/
    identityType?: IEntityType;
    /**
    *   scope - one or more of AAD, IMS, Source, AD, WMD
    **/
    operationScope?: IOperationScope;
    /**
    *   The scope over which the search and MRU results are filtered by.
    *   A consumer must pass a delegate that returns a FilterByScope instance, which can be constructed by passing two arrays of strings
    *   corresponding to Entity Ids and Ancestor Entity Ids
    *   over which the scope is restricted.
    *   Default null.
    *   NOTE: Null scope and an empty scope (a scope which is not null but whose internal arrays are empty) are treated differently.
    *         Null scope means no filtering will take place on entities, whereas empty scope means no entities would be returned.
    *         So an empty FilterByScope will result in no search being issued.
    **/
    getFilterByScope?: () => Identities_Picker_Common.FilterByScope;
}

/**
 * @exemptedapi
 */
export interface IIdentityService {
    getIdentities(
        prefix: string,
        operationScope: IOperationScope,
        identityType: IEntityType,
        options?: IIdentityServiceOptions,
        queryTypeHint?: IQueryTypeHint,
        extensionOptions?: IIdentityPickerExtensionOptions): IDictionaryStringTo<IPromise<Identities_Picker_RestClient.QueryTokenResultModel>>;
    getIdentityImages(
        identities: Identities_Picker_RestClient.IEntity[],
        options?: IIdentityServiceOptions): IDictionaryStringTo<IPromise<IDictionaryStringTo<string>>>;
    getIdentityConnections(
        identity: Identities_Picker_RestClient.IEntity,
        operationScope: IOperationScope,
        identityType: IEntityType,
        connectionType: IConnectionType,
        options?: IIdentityServiceOptions,
        extensionOptions?: IIdentityPickerExtensionOptions,
        depth?: number): IPromise<Identities_Picker_RestClient.IdentitiesGetConnectionsResponseModel>;
}

/**
 * @exemptedapi
 * This client service is meant to be used only by the framework identity picker controls and should not be used elsewhere.
 */
export class IdentityService extends Service.VssService implements IIdentityService {
    public static MIN_RESULTS = 40;
    public static MAX_RESULTS = 40;

    constructor() {
        super();

        var qtrCacheConfig: Identities_Picker_Cache.ITwoLayerCacheConfiguration<Identities_Picker_RestClient.QueryTokenResultModel> = {
            //ensure only a qtr with one entity is added
            getUniqueIdentifier: (qtr: Identities_Picker_RestClient.QueryTokenResultModel) => {
                if (qtr && qtr.identities && qtr.identities.length == 1) {
                    return qtr.identities[0].entityId;
                }

                return null;
            }
        }

        this._qtrCache = new Identities_Picker_Cache.TwoLayerCache<Identities_Picker_RestClient.QueryTokenResultModel>(qtrCacheConfig);
        this._qtrCache.addRedirector(Identities_Picker_Cache.CacheableTypes.Email);
        this._qtrCache.addRedirector(Identities_Picker_Cache.CacheableTypes.Guid);

        this._qtrRequestAggregator = new Identities_Picker_Cache.RequestCache<Identities_Picker_RestClient.QueryTokenResultModel>();

        this._entityImageRequestAggregator = new Identities_Picker_Cache.RequestCache<IDictionaryStringTo<string>>();
    }

    /**
    *   Get all users with specific properties starting with the prefix.
    **/
    public getIdentities(prefix: string,
        operationScope: IOperationScope,
        identityType: IEntityType,
        options?: IIdentityServiceOptions,
        queryTypeHint?: IQueryTypeHint,
        extensionOptions?: IIdentityPickerExtensionOptions): IDictionaryStringTo<IPromise<Identities_Picker_RestClient.QueryTokenResultModel>> {
        if (!operationScope) {
            var exp: IArgumentException = {
                source: "IdentityService",
                parameter: "operationScope",
                message: "operationScope null or undefined"
            };
            throw exp;
        }
        if (!identityType) {
            var exp: IArgumentException = {
                source: "IdentityService",
                parameter: "identityType",
                message: "identityType null or undefined"
            };
            throw exp;
        }

        //start scenario
        var perfScenario = Performance.getScenarioManager().startScenario(Identities_Picker_Constants.Telemetry.Area, Identities_Picker_Constants.Telemetry.Scenario_GetDirectory_Rtt);
        var perfScenarioProperties: IDictionaryStringTo<any> = {};
        perfScenarioProperties = ServiceHelpers.addScenarioProperties(this,
            perfScenarioProperties,
            operationScope,
            identityType,
            options,
            extensionOptions);
        perfScenarioProperties[Identities_Picker_Constants.TelemetryProperties.prefixType] = ServiceHelpers.getPrefixTypeForTelemetry(prefix);
        perfScenarioProperties[Identities_Picker_Constants.TelemetryProperties.prefixLength] = prefix.length;
        perfScenarioProperties[Identities_Picker_Constants.TelemetryProperties.isDirSearchUid] = Boolean(queryTypeHint && queryTypeHint.UID);

        var deferreds: IDictionaryStringTo<Q.Deferred<Identities_Picker_RestClient.QueryTokenResultModel>> = {};
        var promises: IDictionaryStringTo<IPromise<Identities_Picker_RestClient.QueryTokenResultModel>> = {};

        if (!prefix) {
            return promises;
        }

        var queryTokens: string[] = [];
        var candidateQueryTokens = prefix
            .split(ServiceHelpers.GetIdentities_Prefix_Separator);

        for (var qtIndex in candidateQueryTokens) {
            var filteredQt = candidateQueryTokens[qtIndex].trim();
            if (filteredQt) {
                queryTokens.push(filteredQt);
            }
        }

        queryTokens = ServiceHelpers.getDistinct(queryTokens);

        queryTokens.forEach((queryToken: string, index: number, array: string[]) => {
            deferreds[queryToken.toLowerCase()] = Q.defer<Identities_Picker_RestClient.QueryTokenResultModel>();
            promises[queryToken.toLowerCase()] = deferreds[queryToken.toLowerCase()].promise;
        });

        for (var deferredsKey in deferreds) {
            var cacheKey = IdentityService.getUniqueRequestString(
                deferredsKey, operationScope, identityType, options ? options.extensionData : null, options ? options.getFilterByScope() : null);
            var qtr = this._qtrCache.get(cacheKey);
            if (qtr) {
                qtr.queryToken = deferredsKey;
                deferreds[deferredsKey].resolve(qtr);
                var queryTokens = IdentityService._removeQueryToken(deferredsKey, queryTokens);
                continue;
            }
            var existingQtrPromise = this._qtrRequestAggregator.getPromise(cacheKey);
            if (existingQtrPromise) {
                var existingQtrPromiseDelegate = delegate(this, (promiseActionKey) => {
                    existingQtrPromise.then(
                        delegate(this, (qtrResult: Identities_Picker_RestClient.QueryTokenResultModel) => {
                            if (deferreds && deferreds[promiseActionKey]) {
                                deferreds[promiseActionKey].resolve(qtrResult);
                            }
                        }),
                        delegate(this, (errorData: any) => {
                            if (deferreds && deferreds[promiseActionKey]) {
                                deferreds[promiseActionKey].reject(errorData);
                            }
                        })
                    );
                });
                existingQtrPromiseDelegate(deferredsKey);
                var queryTokens = IdentityService._removeQueryToken(deferredsKey, queryTokens);
                continue;
            }
        }

        if (queryTokens.length == 0) {
            return promises;
        }

        for (var qtrIndex in queryTokens) {
            this._qtrRequestAggregator.setPromise(
                IdentityService.getUniqueRequestString(
                    queryTokens[qtrIndex], operationScope, identityType, options ? options.extensionData : null, options ? options.getFilterByScope() : null),
                deferreds[queryTokens[qtrIndex].toLowerCase()].promise);
        }

        prefix = queryTokens.join(ServiceHelpers.GetIdentities_Prefix_Separator);

        var identityTypeList = ServiceHelpers.getIdentityTypeList(identityType);
        var operationScopeList = ServiceHelpers.getOperationScopeList(operationScope);
        var queryTypeHintString: string = ServiceHelpers.getQueryTypeHint(queryTypeHint);
        if (identityTypeList.length == 0 || operationScopeList.length == 0) {
            var exp: IArgumentException = {
                source: "IdentityService",
                parameter: "identityType or operationScope",
                message: "queried identityType or operationScope is/are unsupported"
            };
            throw exp;
        }

        var httpClient: Identities_Picker_RestClient.AbstractIdentityPickerHttpClient;
        if (options && options.httpClient) {
            httpClient = options.httpClient;
        }
        else {
            var commonIdentityPickerHttpClient = this.getConnection().getHttpClient(Identities_Picker_RestClient.CommonIdentityPickerHttpClient);
            httpClient = commonIdentityPickerHttpClient;
        }

        var queryIdentityTypes = identityTypeList;
        var queryOperationScopes = operationScopeList;
        var queryOptions = {};
        if (options && options.minResults) {
            queryOptions[ServiceHelpers.OptionsMinResultsKey] = options.minResults;
        }
        if (options && options.maxResults) {
            queryOptions[ServiceHelpers.OptionsMaxResultsKey] = options.maxResults;
        }
        if (options && options.extensionData) {
            queryOptions[ServiceHelpers.ExtensionData_ExtensionIdKey] = options.extensionData.extensionId;
            queryOptions[ServiceHelpers.ExtensionData_ProjectScopeNameKey] = options.extensionData.projectScopeName;
            queryOptions[ServiceHelpers.ExtensionData_CollectionScopeNameKey] = options.extensionData.collectionScopeName;
            queryOptions[ServiceHelpers.ExtensionData_ConstraintListKey] = options.extensionData.constraints;
        }
        //Requests additional properties based on entity type
        var queryProperties = ServiceHelpers._defaultProperties;
        if (identityType.User) {
            queryProperties = queryProperties.concat(ServiceHelpers._defaultUserProperties);
        }
        if (identityType.Group) {
            queryProperties = queryProperties.concat(ServiceHelpers._defaultGroupProperties);
        }

        var unpagedSuccessCallback = (searchResponse: Identities_Picker_RestClient.IdentitiesSearchResponseModel) => {
            if (searchResponse.results.length < 1) {
                return promises;
            }

            var pagedSucessCallback = (searchResponse: Identities_Picker_RestClient.IdentitiesSearchResponseModel) => {
                if (perfScenario) {
                    perfScenario.addSplitTiming(
                        Identities_Picker_Constants.Telemetry.Scenario_PagingQuerySplit + "_End_"
                            + searchResponse && searchResponse.results[0] ? Identities_Picker_Common.CommonHelpers.GetStringHashCode(searchResponse.results[0].queryToken).toString() : "");
                }
                if (!searchResponse || searchResponse.results.length == 0) {
                    return;
                }

                //set their default image if there isn't any
                searchResponse.results[0].identities.forEach((identity: Identities_Picker_RestClient.IEntity, index: number, array: Identities_Picker_RestClient.IEntity[]) => {
                    if (!identity.image) {
                        identity.image = ServiceHelpers.getDefaultIdentityImage(identity);
                    }
                });

                this._cacheQueryTokenResult(searchResponse.results[0],
                    IdentityService.getUniqueRequestString(
                        searchResponse.results[0].queryToken.trim(), operationScope, identityType, options ? options.extensionData : null, options ? options.getFilterByScope() : null));

                var searchResponseQueryToken = searchResponse.results[0].queryToken;
                if (searchResponseQueryToken && deferreds[searchResponseQueryToken.toLowerCase().trim()]) {
                    deferreds[searchResponseQueryToken.toLowerCase().trim()].resolve(searchResponse.results[0]);
                }
            };
            var pagedErrorCallback = (data?: any) => {
                for (var key in deferreds) {
                    deferreds[key].reject(data);
                }

                perfScenarioProperties[Identities_Picker_Constants.TelemetryProperties.exceptionData] = data;
                Telemetry.publishEvent(
                    new Telemetry.TelemetryEventData(
                        Identities_Picker_Constants.Telemetry.Area,
                        Identities_Picker_Constants.Telemetry.Feature_ApiExceptions,
                        perfScenarioProperties));
            };

            var promises: IPromise<void>[];
            var pagedPrefixQuery = (prefixMap: Identities_Picker_RestClient.QueryTokenResultModel, index: number, array: Identities_Picker_RestClient.QueryTokenResultModel[]) => {
                if (prefixMap.identities && prefixMap.identities.length == 0 && prefixMap.pagingToken) {
                    const filterByScope = options && options.getFilterByScope();
                    var pagedPrefixSearchRequest: Identities_Picker_RestClient.IdentitiesSearchRequestModel = {
                        query: prefixMap.queryToken,
                        identityTypes: queryIdentityTypes,
                        operationScopes: queryOperationScopes,
                        properties: queryProperties,
                        filterByAncestorEntityIds: filterByScope ? filterByScope.filterByAncestorEntityIds : [],
                        filterByEntityIds: filterByScope ? filterByScope.filterByEntityIds : [],
                        pagingToken: prefixMap.pagingToken,
                        options: queryOptions,
                    };

                    if (queryTypeHintString) {
                        pagedPrefixSearchRequest.queryTypeHint = queryTypeHintString;
                    }

                    perfScenario.addSplitTiming(
                        Identities_Picker_Constants.Telemetry.Scenario_PagingQuerySplit + "_Start_" + Identities_Picker_Common.CommonHelpers.GetStringHashCode(prefixMap.queryToken).toString());
                    var promise = httpClient.beginGetIdentities(pagedPrefixSearchRequest).then(pagedSucessCallback, pagedErrorCallback);
                    if (promises) {
                        promises.push(promise);
                    }
                }
                else if (prefixMap.identities && prefixMap.identities.length >= 0) {
                    //there are identities, hence no paging token
                    //set their default image if there isn't any
                    prefixMap.identities.forEach((identity: Identities_Picker_RestClient.IEntity, index: number, array: Identities_Picker_RestClient.IEntity[]) => {
                        if (!identity.image) {
                            identity.image = ServiceHelpers.getDefaultIdentityImage(identity);
                        }
                    });

                    this._cacheQueryTokenResult(prefixMap,
                        IdentityService.getUniqueRequestString(
                            prefixMap.queryToken.trim(), operationScope, identityType, options ? options.extensionData : null, options ? options.getFilterByScope() : null));

                    if (prefixMap.queryToken && deferreds[prefixMap.queryToken.toLowerCase().trim()]) {
                        deferreds[prefixMap.queryToken.toLowerCase().trim()].resolve(prefixMap);
                    }
                }
                else {
                    pagedErrorCallback();
                }
            };
            //if multiple prefixes in Results are supported
            searchResponse.results.forEach(pagedPrefixQuery, this);
            if (promises && promises.length > 0) {
                Q.allSettled(promises).then(
                    () => {
                        perfScenario.addData(perfScenarioProperties);
                        perfScenario.end();
                    },
                    (data?: any) => {
                        perfScenario.addData(perfScenarioProperties);
                        perfScenario.end();
                    }
                );
            }
            else {
                perfScenario.addData(perfScenarioProperties);
                perfScenario.end();
            }
        };
        var unpagedErrorCallback = (data?: any) => {
            for (var key in deferreds) {
                deferreds[key].reject(data);
            }

            perfScenarioProperties[Identities_Picker_Constants.TelemetryProperties.exceptionData] = data;
            Telemetry.publishEvent(
                new Telemetry.TelemetryEventData(
                    Identities_Picker_Constants.Telemetry.Area,
                    Identities_Picker_Constants.Telemetry.Feature_ApiExceptions,
                    perfScenarioProperties));

            perfScenario.end();
        };
        const filterByScope = options && options.getFilterByScope();
        var prefixSearchRequest: Identities_Picker_RestClient.IdentitiesSearchRequestModel = {
            query: prefix,
            identityTypes: queryIdentityTypes,
            operationScopes: queryOperationScopes,
            properties: queryProperties,
            filterByAncestorEntityIds: filterByScope ? filterByScope.filterByAncestorEntityIds : [],
            filterByEntityIds: filterByScope ? filterByScope.filterByEntityIds : [],
            options: queryOptions,
        };

        if (queryTypeHintString) {
            prefixSearchRequest.queryTypeHint = queryTypeHintString;
        }

        httpClient.beginGetIdentities(prefixSearchRequest).then(unpagedSuccessCallback, unpagedErrorCallback);

        return promises;
    }

    /**
    *   Get images of identities asynchronously, if available. Currently only supports AAD and profile images.
    *   @param  successCallback:    This is called once all the images have been loaded for the identities supplied
    *   @param  errorCallback:      This is called for each error received from either the controller or one of the federated services
    **/
    public getIdentityImages(
        identities: Identities_Picker_RestClient.IEntity[],
        options?: IIdentityServiceOptions): IDictionaryStringTo<IPromise<IDictionaryStringTo<string>>> {
        if (!identities || identities.length <= 0) {
            var exp: IArgumentException = {
                source: "IdentityService",
                parameter: "identities",
                message: "identities null or undefined or empty list"
            };
            throw exp;
        }

        var deferreds: IDictionaryStringTo<Q.Deferred<IDictionaryStringTo<string>>> = {};
        var promises: IDictionaryStringTo<IPromise<IDictionaryStringTo<string>>> = {};

        var httpClient: Identities_Picker_RestClient.AbstractIdentityPickerHttpClient;
        if (options && options.httpClient) {
            httpClient = options.httpClient;
        }
        else {
            var commonIdentityPickerHttpClient = this.getConnection().getHttpClient(Identities_Picker_RestClient.CommonIdentityPickerHttpClient);
            httpClient = commonIdentityPickerHttpClient;
        }

        var queryTokens = IdentityService._getEntityIdsAsQueryTokens(identities);

        queryTokens.forEach((entityId: string, index: number, array: string[]) => {
            deferreds[entityId] = Q.defer<IDictionaryStringTo<string>>();
            promises[entityId] = deferreds[entityId].promise;
        });

        for (var deferredsKey in deferreds) {
            var entityImagePromise = this._entityImageRequestAggregator.getPromise(deferredsKey);
            if (entityImagePromise) {
                var existingImagePromiseDelegate = delegate(this, (promiseActionKey) => {
                    entityImagePromise.then(
                        delegate(this, (entityImage: IDictionaryStringTo<string>) => {
                            if (deferreds && deferreds[promiseActionKey]) {
                                deferreds[promiseActionKey].resolve(entityImage);
                            }
                        }),
                        delegate(this, (errorData: any) => {
                            if (deferreds && deferreds[promiseActionKey]) {
                                deferreds[promiseActionKey].reject(errorData);
                            }
                        })
                    );
                });
                existingImagePromiseDelegate(deferredsKey);

                var queryTokens = IdentityService._removeQueryToken(deferredsKey, queryTokens);
                continue;
            }
            else {
                this._entityImageRequestAggregator.setPromise(deferredsKey, deferreds[deferredsKey].promise);
            }
        }

        if (queryTokens.length == 0) {
            return promises;
        }

        queryTokens.forEach((objectId: string, index: number, objectIds: string[]) => {
            var imagesSuccessCallback = (getAvatarUrl: string) => {
                var objectIdImageMap: IDictionaryStringTo<string> = {};
                if (getAvatarUrl && getAvatarUrl.trim()) {
                    var entityIdAvatarUrlMap: IDictionaryStringTo<string> = {};
                    entityIdAvatarUrlMap[objectId] = getAvatarUrl.trim();
                    deferreds[objectId].resolve(entityIdAvatarUrlMap);
                }
            };
            httpClient.beginGetIdentityImageLocation(objectId).then(imagesSuccessCallback);
        });

        return promises;
    }

    /**
    *   Get an identity's connections in the overlay of the AD graph on the VSTS Identity graph
    **/
    public getIdentityConnections(
        identity: Identities_Picker_RestClient.IEntity,
        operationScope: IOperationScope,
        identityType: IEntityType,
        connectionType: IConnectionType,
        options?: IIdentityServiceOptions,
        extensionOptions?: IIdentityPickerExtensionOptions,
        depth?: number): IPromise<Identities_Picker_RestClient.IdentitiesGetConnectionsResponseModel> {

        if (!ServiceHelpers.isAuthenticatedMember()) {
            return null;
        }

        if (!identity) {
            var exp: IArgumentException = {
                source: "IdentityService",
                parameter: "identity",
                message: "identity null or undefined or empty list"
            };
            throw exp;
        }
        if (!operationScope) {
            var exp: IArgumentException = {
                source: "IdentityService",
                parameter: "operationScope",
                message: "operationScope null or undefined"
            };
            throw exp;
        }
        if (!identityType) {
            var exp: IArgumentException = {
                source: "IdentityService",
                parameter: "identityType",
                message: "identityType null or undefined"
            };
            throw exp;
        }
        if (!connectionType) {
            var exp: IArgumentException = {
                source: "IdentityService",
                parameter: "connectionType",
                message: "connectionType null or undefined"
            };
            throw exp;
        }

        var safeDepth = (!depth) ? 1 : depth;

        var identityTypeList = ServiceHelpers.getIdentityTypeList(identityType);
        var operationScopeList = ServiceHelpers.getOperationScopeList(operationScope);
        var connectionTypeList = ServiceHelpers.getConnectionTypeList(connectionType);
        if (identityTypeList.length == 0 || operationScopeList.length == 0 || connectionTypeList.length == 0) {
            var exp: IArgumentException = {
                source: "IdentityService",
                parameter: "identityType or operationScope or connectionType",
                message: "queried identityType or operationScope or connectionType is/are unsupported"
            };
            throw exp;
        }

        //start scenario
        var perfScenario = Performance.getScenarioManager().startScenario(Identities_Picker_Constants.Telemetry.Area, Identities_Picker_Constants.Telemetry.Scenario_GetConnections_Rtt);
        var perfScenarioProperties: IDictionaryStringTo<any> = {};
        perfScenarioProperties = ServiceHelpers.addScenarioProperties(
            this,
            perfScenarioProperties,
            operationScope,
            identityType,
            options,
            extensionOptions);
        perfScenarioProperties[Identities_Picker_Constants.TelemetryProperties.entityId] = identity.entityId;

        var deferred = Q.defer<Identities_Picker_RestClient.IdentitiesGetConnectionsResponseModel>();
        var promise = deferred.promise;

        var httpClient: Identities_Picker_RestClient.AbstractIdentityPickerHttpClient;
        if (options && options.httpClient) {
            httpClient = options.httpClient;
        }
        else {
            var commonIdentityPickerHttpClient = this.getConnection().getHttpClient(Identities_Picker_RestClient.CommonIdentityPickerHttpClient);
            httpClient = commonIdentityPickerHttpClient;
        }

        var queryProperties = ServiceHelpers._defaultProperties.concat(ServiceHelpers._defaultUserProperties).concat(ServiceHelpers._defaultGroupProperties).concat("Manager");

        var getConnectionsRequestParams: Identities_Picker_RestClient.IdentitiesGetConnectionsRequestModel = {
            identityTypes: identityTypeList,
            operationScopes: operationScopeList,
            connectionTypes: connectionTypeList,
            depth: safeDepth,
            properties: queryProperties,
        };
        var getConnectionsSuccessCallback = (getConnectionsResponse: Identities_Picker_RestClient.IdentitiesGetConnectionsResponseModel) => {
            if (getConnectionsResponse && getConnectionsResponse.successors) {
                getConnectionsResponse.successors.forEach((identity: Identities_Picker_RestClient.IEntity, index: number, array: Identities_Picker_RestClient.IEntity[]) => {
                    if (!identity.image) {
                        identity.image = ServiceHelpers.getDefaultIdentityImage(identity);
                    }
                });
            }

            perfScenario.addData(perfScenarioProperties);
            perfScenario.end();
            deferred.resolve(getConnectionsResponse);
        };

        var errorCallback = (errorData?: any) => {
            perfScenarioProperties[Identities_Picker_Constants.TelemetryProperties.exceptionData] = errorData;
            perfScenario.addData(perfScenarioProperties);
            Telemetry.publishEvent(
                new Telemetry.TelemetryEventData(
                    Identities_Picker_Constants.Telemetry.Area,
                    Identities_Picker_Constants.Telemetry.Feature_ApiExceptions,
                    perfScenarioProperties));
            perfScenario.end();
            deferred.reject(errorData);
        };

        //todo: ideally shouldn't return a response model
        httpClient.beginGetConnections(identity.entityId, getConnectionsRequestParams).then(getConnectionsSuccessCallback, errorCallback);

        return promise
    }

    private static _getEntityIdsAsQueryTokens(identities: Identities_Picker_RestClient.IEntity[]) {
        var queryTokens: string[] = [];
        identities.forEach((identity: Identities_Picker_RestClient.IEntity, index: number, array: Identities_Picker_RestClient.IEntity[]) => {
            if (identity.entityType.trim().toLowerCase() == ServiceHelpers.UserEntity || identity.entityType.trim().toLowerCase() == ServiceHelpers.GroupEntity) {
                queryTokens.push(identity.entityId);
            }
        });
        return queryTokens;
    }

    private _cacheQueryTokenResult(queryTokenResult: Identities_Picker_RestClient.QueryTokenResultModel, cacheKey: string): void {
        if (queryTokenResult.queryToken && queryTokenResult.queryToken.trim() &&
            queryTokenResult.identities && queryTokenResult.identities.length == 1 && cacheKey) {
            //optimistic
            this._qtrCache.set(cacheKey, queryTokenResult);
        }
    }

    private static _removeQueryToken(queryToken: string, queryTokens: string[]) {
        let qtrKeyIndex = -1;
        queryTokens.some((element, i) => {
            if (queryToken == element.toLowerCase()) {
                qtrKeyIndex = i;
                return true;
            }
        });

        if (qtrKeyIndex >= 0) {
            queryTokens.splice(qtrKeyIndex, 1);
        }

        return queryTokens;
    }

    private static getUniqueRequestString(queryToken: string,
        operationScope: IOperationScope,
        identityType: IEntityType,
        extensionOptions: IExtensionData,
        filterOptions: Identities_Picker_Common.FilterByScope) {
        var identityTypeList = ServiceHelpers.getIdentityTypeList(identityType).join(",");
        var operationScopeList = ServiceHelpers.getOperationScopeList(operationScope).join(",");
        return (queryToken + ";" +
            operationScopeList + ";" +
            identityTypeList + ";" +
            IdentityService.getExtensionUniqueRequestString(extensionOptions) + ";" +
            Identities_Picker_Common.FilterByScope.GetHashCode(filterOptions).toString()
        ).trim().toLowerCase();
    }

    private static getExtensionUniqueRequestString(extensionOptions: IExtensionData) {
        if (!extensionOptions) {
            return "";
        }
        return Identities_Picker_Common.CommonHelpers.GetStringHashCode(extensionOptions.collectionScopeName).toString() +
            Identities_Picker_Common.CommonHelpers.GetStringHashCode(extensionOptions.projectScopeName).toString() +
            Identities_Picker_Common.CommonHelpers.GetStringHashCode(extensionOptions.extensionId).toString() +
            Identities_Picker_Common.CommonHelpers.GetStringListHashCode(extensionOptions.constraints).toString();
    }

    private _qtrCache: Identities_Picker_Cache.ITwoLayerCache<Identities_Picker_RestClient.QueryTokenResultModel>;
    private _qtrRequestAggregator: Identities_Picker_Cache.IRequestCache<Identities_Picker_RestClient.QueryTokenResultModel>;
    private _entityImageRequestAggregator: Identities_Picker_Cache.IRequestCache<IDictionaryStringTo<string>>;
}

/**
 * @exemptedapi
 */
export interface IMruServiceOptions {
    /**
    *   The httpClient that should be used instead of the CommonIdentityPickerHttpClient
    **/
    httpClient?: Identities_Picker_RestClient.AbstractIdentityPickerHttpClient;
    /**
    *   The scope over which the MRU filters identities by.
    **/
    filterByScope?: Identities_Picker_Common.FilterByScope;
}

/**
 * @exemptedapi
 * Operations on the account-bound MRU identities (across all IdentityTypeFilters) of the querying user in its account
 */
export interface IMruService {
    getMruIdentities(
        operationScope: IOperationScope,
        identityId?: string,
        featureId?: string,
        options?: IMruServiceOptions,
        extensionOptions?: IIdentityPickerExtensionOptions): IPromise<Identities_Picker_RestClient.IEntity[]>;
    removeMruIdentities(
        objectIds: string[],
        operationScope: IOperationScope,
        identityId?: string,
        featureId?: string,
        options?: IMruServiceOptions,
        extensionOptions?: IIdentityPickerExtensionOptions): IPromise<boolean>;
    addMruIdentities(
        objectIds: string[],
        operationScope: IOperationScope,
        identityId?: string,
        featureId?: string,
        options?: IMruServiceOptions,
        extensionOptions?: IIdentityPickerExtensionOptions): IPromise<boolean>;
}

/**
 * @exemptedapi
 * This client service is meant to be used only by the framework identity picker controls and should not be used elsewhere.
 */
export class MruService extends Service.VssService implements IMruService {
    public static DEFAULT_IDENTITY_ID = "me";
    public static DEFAULT_FEATURE_ID = "common";

    public getMruIdentities(
        operationScope: IOperationScope,
        identityId?: string,
        featureId?: string,
        options?: IMruServiceOptions,
        extensionOptions?: IIdentityPickerExtensionOptions): IPromise<Identities_Picker_RestClient.IEntity[]> {

        if (!ServiceHelpers.isAuthenticatedMember()) {
            return null;
        }

        //validate
        if (!operationScope) {
            var exp: IArgumentException = {
                source: "IdentityService",
                parameter: "operationScope",
                message: "operationScope null or undefined"
            };
            throw exp;
        }
        if (identityId && identityId.trim().toLowerCase() != MruService.DEFAULT_IDENTITY_ID) {
            var exp: IArgumentException = {
                source: "IdentityService",
                parameter: "identityId",
                message: "identityId can only be 'me'"
            };
            throw exp;
        }
        identityId = "me";
        if (featureId && featureId.trim().toLowerCase() != MruService.DEFAULT_FEATURE_ID) {
            var exp: IArgumentException = {
                source: "IdentityService",
                parameter: "featureId",
                message: "featureId can only be 'common'"
            };
            throw exp;
        }
        featureId = "common";

        //start scenario
        var perfScenario = Performance.getScenarioManager().startScenario(Identities_Picker_Constants.Telemetry.Area, Identities_Picker_Constants.Telemetry.Scenario_GetMru_Rtt);
        var perfScenarioProperties: IDictionaryStringTo<any> = {};
        perfScenarioProperties = ServiceHelpers.addScenarioProperties(
            this,
            perfScenarioProperties,
            null,
            null,
            options,
            extensionOptions);

        var operationScopeList = ServiceHelpers.getOperationScopeList(operationScope);
        if (operationScopeList.length == 0) {
            var exp: IArgumentException = {
                source: "IdentityService",
                parameter: "operationScope",
                message: "queried operationScope is unsupported"
            };
            throw exp;
        }

        var deferred = Q.defer<Identities_Picker_RestClient.IEntity[]>();
        var promise = deferred.promise;

        var httpClient: Identities_Picker_RestClient.AbstractIdentityPickerHttpClient;
        if (options && options.httpClient) {
            httpClient = options.httpClient;
        }
        else {
            var commonIdentityPickerHttpClient = this.getConnection().getHttpClient(Identities_Picker_RestClient.CommonIdentityPickerHttpClient);
            httpClient = commonIdentityPickerHttpClient;
        }

        //query
        var queryProperties = ServiceHelpers._defaultProperties.concat(ServiceHelpers._defaultUserProperties).concat(ServiceHelpers._defaultGroupProperties);
        var getMruRequestParams: Identities_Picker_RestClient.IdentitiesGetMruRequestModel = {
            operationScopes: operationScopeList,
            properties: queryProperties,
            filterByAncestorEntityIds: options && options.filterByScope ? options.filterByScope.filterByAncestorEntityIds : [],
            filterByEntityIds: options && options.filterByScope ? options.filterByScope.filterByEntityIds : [],
        };

        var successCallback = (getMruResponse: Identities_Picker_RestClient.IdentitiesGetMruResponseModel) => {
            perfScenario.addData(perfScenarioProperties);
            perfScenario.end();
            deferred.resolve(getMruResponse.mruIdentities);
        };

        var errorCallback = (errorData?: any) => {
            perfScenarioProperties[Identities_Picker_Constants.TelemetryProperties.exceptionData] = errorData;
            perfScenario.addData(perfScenarioProperties);
            Telemetry.publishEvent(
                new Telemetry.TelemetryEventData(
                    Identities_Picker_Constants.Telemetry.Area,
                    Identities_Picker_Constants.Telemetry.Feature_ApiExceptions,
                    perfScenarioProperties));
            perfScenario.end();
            deferred.reject(errorData);
        };

        httpClient.beginGetIdentityFeatureMru(identityId, featureId, getMruRequestParams).then(successCallback, errorCallback);

        return promise;
    }

    public removeMruIdentities(
        objectIds: string[],
        operationScope: IOperationScope,
        identityId?: string,
        featureId?: string,
        options?: IMruServiceOptions,
        extensionOptions?: IIdentityPickerExtensionOptions): IPromise<boolean> {

        if (!ServiceHelpers.isAuthenticatedMember()) {
            return null;
        }

        //validate
        if (!objectIds || objectIds.length == 0) {
            var exp: IArgumentException = {
                source: "IdentityService",
                parameter: "objectIds",
                message: "objectIds null or undefined or empty"
            };
            throw exp;
        }
        if (!operationScope) {
            var exp: IArgumentException = {
                source: "IdentityService",
                parameter: "operationScope",
                message: "operationScope null or undefined"
            };
            throw exp;
        }
        if (identityId && identityId.trim().toLowerCase() != MruService.DEFAULT_IDENTITY_ID) {
            var exp: IArgumentException = {
                source: "IdentityService",
                parameter: "identityId",
                message: "identityId can only be 'me'"
            };
            throw exp;
        }
        identityId = "me";
        if (featureId && featureId.trim().toLowerCase() != MruService.DEFAULT_FEATURE_ID) {
            var exp: IArgumentException = {
                source: "IdentityService",
                parameter: "featureId",
                message: "featureId can only be 'common'"
            };
            throw exp;
        }
        featureId = "common";

        //start scenario
        var perfScenario = Performance.getScenarioManager().startScenario(Identities_Picker_Constants.Telemetry.Area, Identities_Picker_Constants.Telemetry.Scenario_RemoveMru_Rtt);
        var perfScenarioProperties: IDictionaryStringTo<any> = {};
        perfScenarioProperties = ServiceHelpers.addScenarioProperties(
            this,
            perfScenarioProperties,
            null,
            null,
            options,
            extensionOptions);

        var operationScopeList = ServiceHelpers.getOperationScopeList(operationScope);
        if (operationScopeList.length == 0) {
            var exp: IArgumentException = {
                source: "IdentityService",
                parameter: "operationScope",
                message: "queried operationScope is unsupported"
            };
            throw exp;
        }

        var deferred = Q.defer<boolean>();
        var promise = deferred.promise;

        var httpClient: Identities_Picker_RestClient.AbstractIdentityPickerHttpClient;
        if (options && options.httpClient) {
            httpClient = options.httpClient;
        }
        else {
            var commonIdentityPickerHttpClient = this.getConnection().getHttpClient(Identities_Picker_RestClient.CommonIdentityPickerHttpClient);
            httpClient = commonIdentityPickerHttpClient;
        }

        //query
        var patchMruRequestBody: Identities_Picker_RestClient.IdentitiesPatchMruAction[] = [{
            op: "remove",
            value: objectIds,
            operationScopes: operationScopeList,
        }];

        var successCallback = (patchMruResponse: Identities_Picker_RestClient.IdentitiesPatchMruResponseModel) => {
            perfScenario.addData(perfScenarioProperties);
            perfScenario.end();
            deferred.resolve(patchMruResponse.result);
        };

        var errorCallback = (errorData?: any) => {
            perfScenarioProperties[Identities_Picker_Constants.TelemetryProperties.exceptionData] = errorData;
            perfScenario.addData(perfScenarioProperties);
            Telemetry.publishEvent(
                new Telemetry.TelemetryEventData(
                    Identities_Picker_Constants.Telemetry.Area,
                    Identities_Picker_Constants.Telemetry.Feature_ApiExceptions,
                    perfScenarioProperties));
            perfScenario.end();
            deferred.reject(errorData);
        };

        httpClient.beginPatchIdentityFeatureMru(identityId, featureId, patchMruRequestBody).then(successCallback, errorCallback);

        return promise;
    }

    public addMruIdentities(
        objectIds: string[],
        operationScope: IOperationScope,
        identityId?: string,
        featureId?: string,
        options?: IMruServiceOptions,
        extensionOptions?: IIdentityPickerExtensionOptions): IPromise<boolean> {

        if (!ServiceHelpers.isAuthenticatedMember()) {
            return null;
        }

        //validate
        if (!objectIds || objectIds.length == 0) {
            var exp: IArgumentException = {
                source: "IdentityService",
                parameter: "objectIds",
                message: "objectIds null or undefined or empty"
            };
            throw exp;
        }
        if (!operationScope) {
            var exp: IArgumentException = {
                source: "IdentityService",
                parameter: "operationScope",
                message: "operationScope null or undefined"
            };
            throw exp;
        }
        if (identityId && identityId.trim().toLowerCase() != MruService.DEFAULT_IDENTITY_ID) {
            var exp: IArgumentException = {
                source: "IdentityService",
                parameter: "identityId",
                message: "identityId can only be 'me'"
            };
            throw exp;
        }
        identityId = MruService.DEFAULT_IDENTITY_ID;
        if (featureId && featureId.trim().toLowerCase() != MruService.DEFAULT_FEATURE_ID) {
            var exp: IArgumentException = {
                source: "IdentityService",
                parameter: "featureId",
                message: "featureId can only be 'common'"
            };
            throw exp;
        }
        featureId = MruService.DEFAULT_FEATURE_ID;

        var operationScopeList = ServiceHelpers.getOperationScopeList(operationScope);
        if (operationScopeList.length == 0) {
            var exp: IArgumentException = {
                source: "IdentityService",
                parameter: "operationScope",
                message: "queried operationScope is unsupported"
            };
            throw exp;
        }

        //start scenario
        var perfScenario = Performance.getScenarioManager().startScenario(Identities_Picker_Constants.Telemetry.Area, Identities_Picker_Constants.Telemetry.Scenario_AddMru_Rtt);
        var perfScenarioProperties: IDictionaryStringTo<any> = {};
        perfScenarioProperties = ServiceHelpers.addScenarioProperties(
            this,
            perfScenarioProperties,
            null,
            null,
            options,
            extensionOptions);

        var deferred = Q.defer<boolean>();
        var promise = deferred.promise;

        var httpClient: Identities_Picker_RestClient.AbstractIdentityPickerHttpClient;
        if (options && options.httpClient) {
            httpClient = options.httpClient;
        }
        else {
            var commonIdentityPickerHttpClient = this.getConnection().getHttpClient(Identities_Picker_RestClient.CommonIdentityPickerHttpClient);
            httpClient = commonIdentityPickerHttpClient;
        }

        //query
        var patchMruRequestBody: Identities_Picker_RestClient.IdentitiesPatchMruAction[] = [{
            op: "add",
            value: objectIds,
            operationScopes: operationScopeList,
        }];

        var successCallback = (patchMruResponse: Identities_Picker_RestClient.IdentitiesPatchMruResponseModel) => {
            perfScenario.addData(perfScenarioProperties);
            perfScenario.end();
            deferred.resolve(patchMruResponse.result);
        };

        var errorCallback = (errorData?: any) => {
            perfScenarioProperties[Identities_Picker_Constants.TelemetryProperties.exceptionData] = errorData;
            perfScenario.addData(perfScenarioProperties);
            Telemetry.publishEvent(
                new Telemetry.TelemetryEventData(
                    Identities_Picker_Constants.Telemetry.Area,
                    Identities_Picker_Constants.Telemetry.Feature_ApiExceptions,
                    perfScenarioProperties));
            perfScenario.end();
            deferred.reject(errorData);
        };

        httpClient.beginPatchIdentityFeatureMru(identityId, featureId, patchMruRequestBody).then(successCallback, errorCallback);

        return promise;
    }
}
