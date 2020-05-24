/// <reference types="q" />
/// <reference path='../../VSS/References/VSS.SDK.Interfaces.d.ts' />

/// Imports of 3rd Party ///
import Q = require("q");
/// Imports of VSS ///
import Ajax = require("VSS/Ajax");
import Constants_Platform = require("VSS/Common/Constants/Platform");
import Constants_WebApi = require("VSS/WebApi/Constants");
import Context = require("VSS/Context");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Contributions_Contracts = require("VSS/Contributions/Contracts");
import Diag = require("VSS/Diag");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import LocalPageData = require("VSS/Contributions/LocalPageData");
import Locations = require("VSS/Locations");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Serialization = require("VSS/Serialization");
import Service = require("VSS/Service");
import Telemetry_Services = require("VSS/Telemetry/Services");
import Utils_Core = require("VSS/Utils/Core");
import Utils_File = require("VSS/Utils/File");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import { HubsService } from "VSS/Navigation/HubsService";
import { getNavigationHistoryService } from "VSS/Navigation/NavigationHistoryService";

import Contributions_RestClient_NoRequire = require("VSS/Contributions/RestClient");

export module CustomerIntelligenceConstants {
    export var CONTRIBUTIONS_AREA = "Microsoft.VisualStudio.Services.Contributions";
    export var CONTRIBUTIONS_USAGE_FEATURE = "ContributionUsage";
    export var CONTRIBUTIONS_ACTION = "Action";
    export var CONTRIBUTIONS_ACTION_EXECUTE = "Execute";
}

export module ContributionReservedProperties {
    export var ServiceInstanceTypeProperty = "::ServiceInstanceType";
    export var AttributesProperty = "::Attributes";
    export var BaseUriProperty = "::BaseUri";
    export var FallbackBaseUriProperty = "::FallbackBaseUri";
    export var VersionProperty = "::Version";
    export var RegistrationIdProperty = "::RegistrationId";
}

export enum ContributionReservedAttributeValue {
    BuiltIn = 1,
    MultiVersion = 2,
    Paid = 4,
    Preview = 8,
    Public = 16,
    System = 32,
    Trusted = 64
}

/**
* Information about an individual contribution that contributes one or more services registered by id.
*/
export interface IServiceContribution extends Contributions_Contracts.Contribution {

    /**
    * Get the instance of an object registered by this contribution
    *
    * @param objectId Id of the registered object (defaults to the id property of the contribution)
    * @param context Optional context to use when getting the object.
    */
    getInstance<T>(objectId?: string, context?: any): IPromise<T>;
}

/**
* Optional flags for querying contributions
*/
export enum ContributionQueryOptions {
    /*
    * Include the contribution(s) that have the ids being queried
    */
    IncludeRoot = 1,

    /*
    * Include the contributions that directly target the queried contribution id(s)
    */
    IncludeDirectTargets = 2,

    /*
    * Include contributions that target other contributions that target the queried contribution id(s) (recursively)
    */
    IncludeRecursiveTargets = 4,

    /*
    * Include the contribution being queried as well as all contributions that target it recursively
    */
    IncludeAll = 7,

    /**
    * This flag indicates to only query contributions that are already cached by the local service - through
    * the contributions sent down in the page via JSON island data, or already fetched by a REST request. No
    * REST call will be made when this flag is specified.
    */
    LocalOnly = 8
}

/**
* Method used to filter contributions as part of a contribution query call
*/
export interface ContributionQueryCallback {
    (contribution: Contributions_Contracts.Contribution): ContributionQueryCallbackResult
}

/*
* Result returned by a ContributionQueryCallback that indicates which contributions to include
*/
export enum ContributionQueryCallbackResult {
    /*
    * Don't include the contribution and don't query for other contributions that target this one
    */
    None = 0,

    /*
    * Include the contribution. If not combined with other flags, then don't query for other contributions that target this one.
    */
    Include = 1,

    /*
    * Query contributions that target the contribution.
    /// When this flag is used by itself, it means to NOT include the current contribution but keep traversing contributions that target it.
    */
    Recurse = 2,

    /*
    * Include this contributions and query for other contributions that target this one.
    */
    IncludeAndRecurse = 3
}

function getContributionClient(connection: Service.VssConnection, serviceInstanceId?: string, useNewPlatformSerialization?: boolean, authTokenManager?: IAuthTokenManager<any>): IPromise<Contributions_RestClient_NoRequire.ContributionsHttpClient> {
    return VSS.requireModules(["VSS/Contributions/RestClient"]).spread((_ContributionsClient: typeof Contributions_RestClient_NoRequire) => {
        return connection.getHttpClient(_ContributionsClient.ContributionsHttpClient, serviceInstanceId, authTokenManager, { useNewPlatformSerialization });
    });
}

function getSourcePage(): any {

    const pageContext = Context.getPageContext();
    const navHistoryService = getNavigationHistoryService();

    return {
        url: window.location.href,
        routeId: pageContext.navigation.routeId,
        routeValues: navHistoryService.getCurrentRouteValues()
    };
}

/**
 * Manages all RegisteredExtension instances and their contributions.
 */
export class ExtensionService extends Service.VssService {
    private static _testExecutionFeatureFlag: string = "VisualStudio.Services.Contribution.TestExecution";

    private _webPageDataService: WebPageDataService;
    private _contributionsById: { [id: string]: Contributions_Contracts.Contribution };
    private _contributionsByTargetId: { [targetId: string]: Contributions_Contracts.Contribution[] };
    private _targetsByUnresolvedContributionId: { [includedContributionId: string]: string[] };
    private _loadedContributionTargets: { [targetId: string]: boolean };
    private _contributionQueryPromises: { [targetId: string]: IPromise<Contributions_Contracts.Contribution[]> };
    private _contributionProviderDetailsMap: { [contributionId: string]: PageContributionProviderDetails };

    /**
     * Private constructor - do not call.
     */
    constructor() {
        super();
        this._clearCachedContributionData();
    }

    /**
     * Clear out the cached contribution hierarchy
     */
    private _clearCachedContributionData() {
        this._contributionsById = {};
        this._contributionsByTargetId = {};
        this._targetsByUnresolvedContributionId = {};
        this._loadedContributionTargets = {};
        this._contributionQueryPromises = {};
    }

    /**
     * Ensures the page's Json Island has been processed if web context is the default
     * Should be called by the Service factory.
     * @param connection Service.VssConnection
     */
    public initializeConnection(connection: Service.VssConnection) {
        super.initializeConnection(connection);

        this._webPageDataService = this.getConnection().getService(WebPageDataService);

        if (Context.getDefaultWebContext() === connection.getWebContext()) {
            this._processJsonIsland();
        }
    }

    /**
     * Register contributions 
     * @param extension Contributions_Contracts.InstalledExtension The extension to register.
     */
    public registerContributions(contributions: Contributions_Contracts.Contribution[]): void {
        if (contributions) {
            for (let contribution of contributions) {

                this._loadedContributionTargets[contribution.id] = true;
                // Build the lookup by Id for contributions.
                this._contributionsById[contribution.id] = contribution;

                // Check if this contribution was included in a previous contribution and it is pending to be resolved
                var targetsPending: string[] = this._targetsByUnresolvedContributionId[contribution.id];
                if (targetsPending && targetsPending.length > 0) {
                    targetsPending.forEach(targetPendingId => {
                        this._registerContributionTarget(contribution, targetPendingId);
                    });
                    delete this._targetsByUnresolvedContributionId[contribution.id];
                }

                // Build up the lookup for contributions by target.
                if (contribution.targets) {
                    contribution.targets.forEach((targetId) => {
                        this._registerContributionTarget(contribution, targetId);
                    });
                }

                // Process each of the included contribution to readjust targets structure
                if (contribution.includes) {
                    contribution.includes.forEach(includedContributionId => {
                        var includedContribution = this._contributionsById[includedContributionId];
                        // If the included contribution was registered before, then add it to the list.
                        if (includedContribution) {
                            this._registerContributionTarget(includedContribution, contribution.id);
                        }
                        else {
                            // Not registered yet - register it as pending to be revisited later when comes in
                            var targetsToBeUpdated = this._targetsByUnresolvedContributionId[includedContributionId];
                            if (!targetsToBeUpdated) {
                                targetsToBeUpdated = [];
                                this._targetsByUnresolvedContributionId[includedContributionId] = targetsToBeUpdated;
                            }

                            targetsToBeUpdated.push(contribution.id);
                        }
                    });
                }

                // Ensure contributions have a property bag even if it is empty.
                if (!contribution.properties) {
                    contribution.properties = {};
                }
            }
        }
    }

    /**
     * Get the contribution with the given id.
     *
     * @param id Full id of the contribution to fetch
     * @return IPromise<Contributions_Contracts.Contribution>
     */
    public getContribution(id: string): IPromise<Contributions_Contracts.Contribution> {

        return this.getContributions([id], true, false).then((contributions) => {
            if (contributions.length === 0) {
                throw Utils_String.format("Contribution with id '{0}' could not be found.", id);
            }
            else {
                return contributions[0];
            }
        });
    }

    /**
     * Gets the contributions that target the given contribution ids
     *
     * @param targetIds Ids of the targeted contribution(s)
     * @param contributionType Optional type of contribution to filter by
     * @return IPromise<Contributions_Contracts.Contribution[]> Promise that is resolved when contributions are available.
     */
    public getContributionsForTarget(targetId: string, contributionType?: string): IPromise<Contributions_Contracts.Contribution[]> {
        return this.getContributions([targetId], false, true, false, contributionType);
    }

    /**
     * Gets the **loaded** contributions that target the given contribution ids
     * 
     * @param targetId Ids of the targeted contribution(s)
     * @param contributionType Optional type of contribution to filter by
     */
    public getLoadedContributionsForTarget(targetId: string, contributionType?: string): Contributions_Contracts.Contribution[] {
        const contributions = this._contributionsByTargetId[targetId];
        if (contributions && contributionType) {
            return contributions.filter(c => ExtensionHelper.isContributionOfType(c, contributionType));
        } else {
            return contributions;
        }
    }

    /**
     * Gets the contributions that target the given contribution ids
     *
     * @param targetIds Ids of the targeted contribution(s)
     * @param contributionType Optional type of contribution to filter by
     * @return IPromise<Contributions_Contracts.Contribution[]> Promise that is resolved when contributions are available.
     */
    public getContributionsForTargets(targetIds: string[], contributionType?: string): IPromise<Contributions_Contracts.Contribution[]> {
        return this.getContributions(targetIds, false, true, false, contributionType);
    }

    /**
     * Gets contributions for the given contribution ids.
     *
     * @param ids Ids of the targeted contribution(s)
     * @param includeRootItems True to include the contributions with the specified ids
     * @param includeChildren True to include contributions that target the specified ids
     * @param recursive If true include targeting children recursively
     * @param contributionType Optional type of contribution to filter by
     * @return IPromise<Contributions_Contracts.Contribution[]> Promise that is resolved when contributions are available.
     */
    public getContributions(ids: string[], includeRootItems: boolean, includeChildren: boolean, recursive = false, contributionType: string = null): IPromise<Contributions_Contracts.Contribution[]> {
        var options: ContributionQueryOptions = 0;
        if (includeRootItems) {
            options |= ContributionQueryOptions.IncludeRoot;
        }
        if (includeChildren) {
            options |= ContributionQueryOptions.IncludeDirectTargets;
        }
        if (recursive) {
            options |= ContributionQueryOptions.IncludeRecursiveTargets;
        }
        return this.queryContributions(ids, options, contributionType);
    }


    /**
     * Gets contributions for the given contribution ids.
     *
     * @param ids Ids of the targeted contribution(s)
     * @param queryOptions Contribution query options
     * @param contributionType Optional type of contribution to filter by
     * @param queryCallback Optional method to filter contributions by
     * @return IPromise<Contributions_Contracts.Contribution[]> Promise that is resolved when contributions are available.
     */
    public queryContributions(
        ids: string[],
        queryOptions: ContributionQueryOptions,
        contributionType?: string,
        queryCallback?: ContributionQueryCallback): IPromise<Contributions_Contracts.Contribution[]> {

        if (FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ExtensionService._testExecutionFeatureFlag, false)) {
            return Q.resolve([]);
        }

        var targetIdsToFetch: string[];
        if ((queryOptions & ContributionQueryOptions.LocalOnly) !== 0) {
            targetIdsToFetch = [];
        }
        else {
            targetIdsToFetch = this._getUnqueriedContributions(ids);
        }

        var deferred = Q.defer<Contributions_Contracts.Contribution[]>();
        var pendingPromises: IPromise<any>[] = this._getPendingLoadPromises(ids);

        var resolvePromiseWithContributions = () => {
            if (pendingPromises.length > 0) {
                // wait on previous pending requests before returning
                Q.all(pendingPromises).then(() => {
                    this._resolveContributions(this._getLoadedContributions(ids, queryOptions, contributionType, queryCallback)).then(deferred.resolve, deferred.reject);
                }, deferred.reject);
            }
            else {
                this._resolveContributions(this._getLoadedContributions(ids, queryOptions, contributionType, queryCallback)).then(deferred.resolve, deferred.reject);
            }
        };

        // Remove contributions that are null or undefined
        targetIdsToFetch = targetIdsToFetch.filter(c => c !== undefined && c !== null);
        if (targetIdsToFetch.length > 0) {

            var queryPromise = getContributionClient(this.getConnection()).then(client => {
                const contributionNodeQuery: Contributions_Contracts.ContributionNodeQuery = {
                    contributionIds: targetIdsToFetch,
                    includeProviderDetails: true,
                    queryOptions: Contributions_Contracts.ContributionQueryOptions.IncludeAll,
                    dataProviderContext: {
                        properties: {
                            sourcePage: getSourcePage()
                        }
                    }
                };

                return client.queryContributionNodes(contributionNodeQuery).then((contributionNodes: Contributions_Contracts.ContributionNodeQueryResult) => {
                    var contributions: Contributions_Contracts.Contribution[] = [];
                    if (contributionNodes && contributionNodes.nodes) {
                        for (var nodeKey in contributionNodes.nodes) {
                            if (contributionNodes.nodes.hasOwnProperty(nodeKey)) {
                                contributions.push(contributionNodes.nodes[nodeKey].contribution as Contributions_Contracts.Contribution);
                            }
                        }
                    }

                    if (contributionNodes && contributionNodes.providerDetails) {
                        for (var providerKey in contributionNodes.providerDetails) {
                            if (contributionNodes.providerDetails.hasOwnProperty(providerKey)) {
                                this._registerContributionProviderDetails(contributionNodes.providerDetails[providerKey]);
                            }
                        }
                    }

                    return contributions;
                });
            });

            $.each(targetIdsToFetch, (index: number, targetId: string) => {
                this._contributionQueryPromises[targetId] = queryPromise;
            });
            queryPromise.then((contributions: Contributions_Contracts.Contribution[]) => {
                $.each(targetIdsToFetch, (index: number, targetId: string) => {
                    this._loadedContributionTargets[targetId] = true;
                });

                this.registerContributions(contributions);

                $.each(targetIdsToFetch, (index: number, targetId: string) => {
                    delete this._contributionQueryPromises[targetId];
                });
                resolvePromiseWithContributions();
            }, (e) => {
                $.each(targetIdsToFetch, (index: number, targetId: string) => {
                    delete this._contributionQueryPromises[targetId];
                });
                deferred.reject(e);
            });
        } else {
            resolvePromiseWithContributions();
        }

        return deferred.promise;
    }

    /**
    * Determines whether or not the provided extension id is currently active - installed, licensed, and enabled.
    * @param extensionId The extension id (e.g. 'ms.vss-testmanager-web') to check
    */
    public isExtensionActive(extensionId: string): IPromise<boolean> {
        var idParts = extensionId.split(".");
        return getContributionClient(this.getConnection()).then(client => {
            return client.getInstalledExtensionByName(idParts[0], idParts[1]).then((value: Contributions_Contracts.InstalledExtension) => {
                return value !== null;
            }, (error: Error) => {
                return false;
            });
        });
    }

    private _getProviderIdentifier(contribution: Contributions_Contracts.Contribution): string {
        var idParts: string[] = contribution.id.split(".");
        return idParts[0] + '.' + idParts[1];
    }

    private _getProviderDetails(contribution: Contributions_Contracts.Contribution): PageContributionProviderDetails {
        var providerIdentifier: string = this._getProviderIdentifier(contribution);

        return this._contributionProviderDetailsMap ? this._contributionProviderDetailsMap[providerIdentifier] : null;
    }

    /**
     * Get the specified provider property for this contribution.
     *
     * @param contribution The contribution whose provider property is being requested
     * @param propertyName The property being requested
     */
    public getProviderProperty(contribution: Contributions_Contracts.Contribution, propertyName: string): string {
        var providerDetails = this._getProviderDetails(contribution);
        return providerDetails && providerDetails.properties ? providerDetails.properties[propertyName] : null;
    }

    /**
     * Get the version this contribution.
     *
     * @param contribution The contribution whose version is being requested
     */
    public getProviderDisplayName(contribution: Contributions_Contracts.Contribution): string {
        var providerDetails = this._getProviderDetails(contribution);
        return providerDetails ? providerDetails.displayName : null;
    }

    /**
     * Get the version this contribution.
     *
     * @param contribution The contribution whose version is being requested
     */
    public getVersion(contribution: Contributions_Contracts.Contribution): string {
        var providerDetails = this._getProviderDetails(contribution);
        return providerDetails && providerDetails.properties ? providerDetails.properties[ContributionReservedProperties.VersionProperty] : null;
    }

    /**
     * Get the registrationId this contribution.
     *
     * @param contribution The contribution whose registration is being requested
     */
    public getRegistrationId(contribution: Contributions_Contracts.Contribution): string {
        var providerDetails = this._getProviderDetails(contribution);
        return providerDetails && providerDetails.properties ? providerDetails.properties[ContributionReservedProperties.RegistrationIdProperty] : null;
    }

    /**
     * Get the baseUri this contribution.
     *
     * @param contribution The contribution whose baseUri is being requested
     */
    public getBaseUri(contribution: Contributions_Contracts.Contribution): string {
        var providerDetails = this._getProviderDetails(contribution);
        return providerDetails && providerDetails.properties ? providerDetails.properties[ContributionReservedProperties.BaseUriProperty] : null;
    }

    /**
     * Get the fallbackUri this contribution.
     *
     * @param contribution The contribution whose fallbackUri is being requested
     */
    public getFallbackUri(contribution: Contributions_Contracts.Contribution): string {
        var providerDetails = this._getProviderDetails(contribution);
        return providerDetails && providerDetails.properties ? providerDetails.properties[ContributionReservedProperties.FallbackBaseUriProperty] : null;
    }

    /**
     * Get the ServiceInstanceTypeProperty for this contribution.
     *
     * @param contribution The contribution whose fallbackUri is being requested
     */
    public getServiceInstanceType(contribution: Contributions_Contracts.Contribution): string {
        var providerDetails = this._getProviderDetails(contribution);
        return providerDetails && providerDetails.properties ? providerDetails.properties[ContributionReservedProperties.ServiceInstanceTypeProperty] : null;
    }

    private _resolveContributions(contributions: Contributions_Contracts.Contribution[]): IPromise<Contributions_Contracts.Contribution[]> {

        if (!contributions.length) {
            return Q.resolve(contributions);
        }

        var dataProviders = this._getLoadedContributions(
            contributions.map((contribution) => contribution.id),
            ContributionQueryOptions.IncludeAll,
            Constants_Platform.DataProviderConstants.DataProviderContributionTypeId
        );

        if (!dataProviders.length) {
            return Q.resolve(contributions);
        }
        else {
            return this._webPageDataService.ensureDataProvidersResolved(dataProviders).then(() => {
                return contributions;
            });
        }
    }

    private _getUnqueriedContributions(ids: string[]): string[] {
        return $.grep(ids, (id: string) => {
            if (this._loadedContributionTargets[id] || this._contributionQueryPromises[id]) {
                return false;
            }
            return true;
        });
    }

    private _getPendingLoadPromises(ids: string[]): IPromise<any>[] {
        var promises: IPromise<any>[] = [];
        $.each(ids, (index: number, id: string) => {
            var promise = this._contributionQueryPromises[id];
            if (promise) {
                promises.push(promise);
            }
        });
        return promises;
    }

    private _getLoadedContributions(ids: string[], queryOptions: ContributionQueryOptions, contributionType: string, queryCallback?: ContributionQueryCallback): Contributions_Contracts.Contribution[] {

        var contributions: Contributions_Contracts.Contribution[] = [];
        var processedContributionIds: IDictionaryStringTo<boolean> = {};
        var contributionIdsToQuery: string[] = [];

        $.each(ids, (index: number, id: string) => {
            var contribution = this._contributionsById[id];

            if (contribution && !processedContributionIds[id]) {

                var queryCallbackResult = ContributionQueryCallbackResult.None;
                if (queryCallback == null) {
                    if ((queryOptions & ContributionQueryOptions.IncludeRoot) !== 0) {
                        queryCallbackResult |= ContributionQueryCallbackResult.Include;
                    }
                    if ((queryOptions & ContributionQueryOptions.IncludeDirectTargets) !== 0 || (queryOptions & ContributionQueryOptions.IncludeRecursiveTargets) !== 0) {
                        queryCallbackResult |= ContributionQueryCallbackResult.Recurse;
                    }
                }
                else {
                    queryCallbackResult = queryCallback(contribution);
                }

                processedContributionIds[id] = true;

                if ((queryCallbackResult & ContributionQueryCallbackResult.Include) !== 0) {
                    if (!contributionType || ExtensionHelper.isContributionOfType(contribution, contributionType)) {
                        contributions.push(contribution);
                    }
                }
                if ((queryCallbackResult & ContributionQueryCallbackResult.Recurse) !== 0) {
                    contributionIdsToQuery.push(id);
                }
            }
        });

        var targetingCallback: ContributionQueryCallback;
        if (queryCallback == null) {
            if ((queryOptions & ContributionQueryOptions.IncludeRecursiveTargets) !== 0) {
                targetingCallback = (c: Contributions_Contracts.Contribution) => ContributionQueryCallbackResult.IncludeAndRecurse;
            }
            else {
                targetingCallback = (c: Contributions_Contracts.Contribution) => ContributionQueryCallbackResult.Include;
            }
        }
        else {
            targetingCallback = queryCallback;
        }

        $.each(contributionIdsToQuery, (i, contributionIdToQuery) => {
            this._fetchTargetingContributions(contributionIdToQuery, contributions, processedContributionIds, targetingCallback, contributionType);
        });

        return contributions;
    }

    private _fetchTargetingContributions(
        contributionId: string,
        results: Contributions_Contracts.Contribution[],
        includedContributionIds: IDictionaryStringTo<boolean>,
        queryCallback: ContributionQueryCallback,
        contributionType: string) {

        var children = this._contributionsByTargetId[contributionId];
        if (children) {
            $.each(children, (i, child) => {
                var id = child.id;
                if (!includedContributionIds[id]) {
                    includedContributionIds[id] = true;

                    var queryCallbackResult = queryCallback(child);
                    if ((queryCallbackResult & ContributionQueryCallbackResult.Include) !== 0) {
                        if (!contributionType || ExtensionHelper.isContributionOfType(child, contributionType)) {
                            results.push(child);
                        }
                    }
                    if ((queryCallbackResult & ContributionQueryCallbackResult.Recurse) !== 0) {
                        this._fetchTargetingContributions(id, results, includedContributionIds, queryCallback, contributionType);
                    }
                }
            });
        }
    }

    /**
     * Parse the extensions in the JSON island given by the selector
     * @param selector Selector to match a script tag containing JSON
     */
    private _processJsonIsland() {
        var contributionData = Serialization.deserializeJsonIsland<any>($(".vss-contribution-data"), null);
        if (contributionData) {
            this.registerContributionData(contributionData);
        }
    }

    /**
     * Register the given contributions with this service instance, avoiding an AJAX call for the specified contributions
     *
     * @param contributionData The contribution data to register
     * @param clearExisting If true, clear any existing contribution hierarchy. If false, add to it.
     */
    public registerContributionData(contributionData: Contracts_Platform.ContributionsPageData, clearExisting?: boolean) {

        if (clearExisting) {
            this._clearCachedContributionData();
        }

        if (contributionData.contributions && contributionData.contributions.length) {
            this.registerContributions(<any>contributionData.contributions);
        }

        if (contributionData.queriedContributionIds) {
            for (let contributionId of contributionData.queriedContributionIds) {
                this._loadedContributionTargets[contributionId] = true;
            }
        }

        if (contributionData.providerDetails) {
            this._contributionProviderDetailsMap = contributionData.providerDetails;
        }
    }

    /**
     * Register a target for the contribution
     * @param contribution
     * @param targetId
     */
    private _registerContributionTarget(contribution: Contributions_Contracts.Contribution, targetId: string) {
        var contributionsByTarget = this._contributionsByTargetId[targetId];
        if (!contributionsByTarget) {
            contributionsByTarget = [];
            this._contributionsByTargetId[targetId] = contributionsByTarget;
        }

        if (contributionsByTarget.indexOf(contribution) < 0) {
            contributionsByTarget.push(contribution);
        }
    }

    private _registerContributionProviderDetails(providerDetails: Contributions_Contracts.ContributionProviderDetails): void {
        if (!this._contributionProviderDetailsMap) {
            this._contributionProviderDetailsMap = {};
        }
        this._contributionProviderDetailsMap[providerDetails.name] = providerDetails;
    }

    /**
     * Get contributions of the specified type that have already been loaded and cached by this service.
     * This avoids a REST call to query contributions - only looking at contributions seeded on the page
     * via JSON island data or those already fetched by a prior REST call.
     *
     * @param contributionType The full id of the contribution type
     */
    public getLoadedContributionsOfType(contributionType: string): IPromise<Contributions_Contracts.Contribution[]> {
        var contributions: Contributions_Contracts.Contribution[] = [];
        for (let contributionId in this._contributionsById) {
            var contribution = this._contributionsById[contributionId];
            if (Utils_String.equals(contributionType, contribution.type)) {
                contributions.push(contribution);
            }
        }
        return this._resolveContributions(contributions);
    }
}

/**
* Delegate for web page data resolution plugins. Allows plugins to be notified when
* web page data with a certain key is received
*/
export interface WebPageDataResolutionPlugin {
    /**
    * @param contributionId The contribution id of the data provider
    * @param value The new value of the data
    * @returns The value to store for this entry. undefined return value indicates to store the new value. Promises will be resolved before storing.
    */
    (contributionId: string, newValue: any): any;
}

/**
* Caching related properties for a data provider contribution
*/
interface IDataProviderCaching {
    /**
    * The caching mode. Currently 'localStorage' is supported.
    */
    mode?: string;

    /**
    * The scope for the storage. Can be: "collection", "project", or "team".
    */
    scope?: string;

    /**
    * The number of minutes data can be in cache before a refresh is needed
    */
    maxCacheLifetimeMinutes?: number;
}

/**
* A data-provider cache entry for a given scope
*/
interface IDataProviderCacheEntry {
    /**
    * Last accessed time for the scope's entry
    */
    lastAccess?: number;

    /**
    * Data provider data for the scope
    */
    data?: IDictionaryStringTo<any>;

    /**
    * Last accessted time for each contribution
    */
    dataLastAccessed?: IDictionaryStringTo<number>;
}

/**
* An enum representing the way that a data provider's data was populated
*/
export enum WebPageDataSource {
    /**
    * The data provider entry came from JSON island data in the page source
    */
    JsonIsland,

    /**
    * The data provider entry came from a REST call to resolve the provider
    */
    RestCall,

    /**
    * The data provider entry was cached from localStorage
    */
    LocalStorage
}

/**
 * Represents an error returned from a data provider resolved asynchronously
 */
export class WebPageDataProviderError extends Error {
    constructor(message: string, public exceptionDetails: DataProviderExceptionDetails) {
        super(message);
    }
}

/**
* Service for obtaining web page data from contributed data providers
*/
export class WebPageDataService extends Service.VssService {

    private static MAX_CACHE_SCOPES = 20;
    private static _resolveDataPlugins: IDictionaryStringTo<WebPageDataResolutionPlugin> = {};

    private _initializationPromise: IPromise<any>;
    private _localDataSource: IDictionaryStringTo<WebPageDataSource> = {};
    private _resolvedProviders: IDictionaryStringTo<Contributions_Contracts.ResolvedDataProvider> = {};
    private _contributionPromises: IDictionaryStringTo<Q.IPromise<any>> = {};
    private _contributionIdsByDataType: IDictionaryStringTo<string[]> = {};
    private _dataProviderInitialized: IDictionaryStringTo<boolean> = {};

    private _ensureInitialized(additionalContributions?: Contributions_Contracts.Contribution[]): IPromise<any> {
        let contributions: Contributions_Contracts.Contribution[] = additionalContributions ? [...additionalContributions] : [];
        contributions = contributions.filter(x => !this._dataProviderInitialized[x.id]);
        if (!this._initializationPromise || contributions.length > 0) {
            const result = LocalPageData.getDataProviderResults();
            if (result) {
                // Get the corresponding set of data-provider contributions from the JSON island data
                const contributionData = Serialization.deserializeJsonIsland<any>($(".vss-contribution-data"), null);
                const allContributions: Contributions_Contracts.Contribution[] = contributionData ? contributionData.contributions : [];
                allContributions.forEach((contribution) => {
                    if (Utils_String.equals(contribution.type, Constants_Platform.DataProviderConstants.DataProviderContributionTypeId, true)) {
                        contributions.push(contribution);
                    }
                });

                this._initializationPromise = this._handleDataProviderResult(result, contributions, WebPageDataSource.JsonIsland);
            }
            else {
                this._initializationPromise = Q.resolve(null);
            }
        }

        return this._initializationPromise;
    }

    /**
     * Register the given data provider data with this instance of the contribution service
     *
     * @param result Data provider result to merge-in
     * @param contributions Contributions to leverage when resolving provider data
     * @param clearExisting If true, clear any existing data providers. If false, add to it.
     */
    public registerProviderData(result: Contributions_Contracts.DataProviderResult, contributions: Contributions_Contracts.Contribution[], clearExisting?: boolean): IPromise<any> {
        let dataProviderContributions: Contributions_Contracts.Contribution[] = [];
        if (contributions) {
            for (let contribution of contributions) {
                if (Utils_String.equals(contribution.type, Constants_Platform.DataProviderConstants.DataProviderContributionTypeId, true)) {
                    dataProviderContributions.push(contribution);
                }
            }
        }

        if (clearExisting) {
            this._clearCachedDataProviders();
        }

        LocalPageData.addDataProviderResults(result);
        return this._handleDataProviderResult(result, dataProviderContributions, WebPageDataSource.JsonIsland);
    }

    private _clearCachedDataProviders(): void {
        this._resolvedProviders = {};
        this._localDataSource = {};
        this._contributionIdsByDataType = {};
        this._contributionPromises = {};
        this._dataProviderInitialized = {};
        LocalPageData.clearDataProviderResults();
    }

    private _handleDataProviderResult(result: Contributions_Contracts.DataProviderResult, contributions: Contributions_Contracts.Contribution[], source: WebPageDataSource): IPromise<any> {

        if (result.data) {
            if (result.resolvedProviders) {
                result.resolvedProviders.forEach((provider) => {
                    this._resolvedProviders[provider.id] = provider;
                    if (provider.error) {
                        Diag.logWarning(Utils_String.format(Resources_Platform.DataProviderFailureMessageFormat, provider.id, provider.error));
                    }
                });
            }
            else {
                for (let contributionId in result.data) {
                    this._resolvedProviders[contributionId] = result.data[contributionId];
                }
            }
        }

        var promises: IPromise<any>[] = [];
        if (result.data) {

            // Map contribution ids to contributions
            var idsToDataTypes: IDictionaryStringTo<Contributions_Contracts.Contribution> = {};
            for (let contribution of contributions) {
                this._dataProviderInitialized[contribution.id] = true;
                idsToDataTypes[contribution.id] = contribution;
            };

            $.each(result.data, (key: string, value: any) => {

                var plugin: WebPageDataResolutionPlugin;
                var pluginResult: any;

                var dataType: string;
                var caching: IDataProviderCaching;

                var contribution = idsToDataTypes[key];
                if (contribution && contribution.properties) {
                    dataType = contribution.properties[Constants_Platform.DataProviderConstants.ContributionDataTypeProperty];
                    caching = contribution.properties["caching"];
                }

                if (dataType) {
                    var idsByType = this._contributionIdsByDataType[dataType];
                    if (!idsByType) {
                        idsByType = [];
                        this._contributionIdsByDataType[dataType] = idsByType;
                    }
                    idsByType.push(key);

                    plugin = WebPageDataService._resolveDataPlugins[dataType];
                }

                this._localDataSource[key] = source;

                if (plugin) {
                    pluginResult = plugin(key, value);
                }

                if (Q.isPromise(pluginResult)) {
                    let promise = (<IPromise<any>>pluginResult).then((asyncResultValue) => {
                        this._storeDataProviderData(key, value, asyncResultValue, caching);
                    });
                    promises.push(promise);
                }
                else {
                    this._storeDataProviderData(key, value, pluginResult, caching);
                }
            });
        }

        return Q.allSettled(promises);
    }

    private _storeDataProviderData(contributionId: string, originalResult: any, pluginResult: any, caching: IDataProviderCaching) {
        var result = typeof pluginResult === "undefined" ? originalResult : pluginResult;

        if (caching) {
            this._setCachedDataProviderValue(contributionId, result, caching);
        }
    }

    private _getLocalStorageCacheScope(caching: IDataProviderCaching): { scopeId: string; storageEntryName: string; } {

        if (caching && caching.mode === "localStorage") {

            var webContext = this.getWebContext();
            var scopeId = "";

            // Get the id of the given scope (collection, project, or team)
            switch (caching.scope) {
                case "team":
                    scopeId = webContext.team ? webContext.team.id : "";
                    break;

                case "project":
                    scopeId = webContext.project ? webContext.project.id : "";
                    break;

                case "collection":
                    scopeId = webContext.collection ? webContext.collection.id : "";
                    break;
            }

            if (scopeId) {
                return {
                    scopeId: scopeId,
                    storageEntryName: "dataProviderCache-" + caching.scope
                };
            }
        }

        return null;
    }

    private _getLocalStorageCacheEntry(storageEntryName: string): IDictionaryStringTo<IDataProviderCacheEntry> {
        var storageEntry: IDictionaryStringTo<IDataProviderCacheEntry>;

        try {
            var scopeEntryString = window.localStorage.getItem(storageEntryName);
            if (scopeEntryString) {
                storageEntry = JSON.parse(scopeEntryString);
            }
        }
        catch (ex) {
            Diag.logWarning(`Could not parse DataProvider localStorage entry "${scopeEntryString}": ${ex.message}`);
        }
        return storageEntry;
    }

    private _isDataExpired(contribution: Contributions_Contracts.Contribution): boolean {

        var caching: IDataProviderCaching = contribution.properties["caching"];
        if (caching) {
            var maxCacheLifetime: number = (caching.maxCacheLifetimeMinutes || 0);
            if (maxCacheLifetime > 0) {
                maxCacheLifetime = maxCacheLifetime * 60 * 1000;
                var localStorageScope = this._getLocalStorageCacheScope(caching);
                if (localStorageScope) {

                    var storageEntry = this._getLocalStorageCacheEntry(localStorageScope.storageEntryName);
                    if (storageEntry) {
                        var entry = storageEntry[localStorageScope.scopeId];
                        if (entry && entry.dataLastAccessed) {
                            const lastAccessed = entry.dataLastAccessed[contribution.id];
                            if (lastAccessed) {
                                var currentTime = new Date().getTime();
                                return (currentTime - lastAccessed) > maxCacheLifetime;
                            }
                        }
                    }
                }
            }
        }

        return true;
    }

    private _getCachedDataProviderValue(contribution: Contributions_Contracts.Contribution): any {

        var caching: IDataProviderCaching = contribution.properties["caching"];
        if (caching) {
            var localStorageScope = this._getLocalStorageCacheScope(caching);
            if (localStorageScope) {

                var storageEntry = this._getLocalStorageCacheEntry(localStorageScope.storageEntryName);
                if (storageEntry) {
                    var entry = storageEntry[localStorageScope.scopeId];
                    if (entry && entry.data) {
                        return entry.data[contribution.id];
                    }
                }
            }
        }

        return null;
    }

    private _setCachedDataProviderValue(contributionId: string, value: any, caching: IDataProviderCaching) {

        var localStorageScope = this._getLocalStorageCacheScope(caching);

        if (localStorageScope) {

            // Get the local storage entry (maps scope ids to entries)
            var storageEntry = this._getLocalStorageCacheEntry(localStorageScope.storageEntryName);
            if (!storageEntry) {
                storageEntry = {};
            }

            // Get an existing entry for this scope
            var entry = storageEntry[localStorageScope.scopeId];
            if (!entry) {
                entry = {};

                // We're adding a new scope entry. If this will exceed the maximum number of
                // scopes that we will storage at one time, then evict the last accessed one
                // localStorage size is pretty limited (per domain).
                var allScopeIds = Object.keys(storageEntry);
                if (allScopeIds.length >= WebPageDataService.MAX_CACHE_SCOPES) {
                    var entries = allScopeIds.map(id => { return { id: id, value: storageEntry[id] || {} } });
                    entries.sort((a, b) => { return (b.value.lastAccess || 0) - (a.value.lastAccess || 0); });
                    var sortedEntries = entries.slice(0, WebPageDataService.MAX_CACHE_SCOPES - 1);

                    storageEntry = {};
                    for (var sortedEntry of sortedEntries) {
                        storageEntry[sortedEntry.id] = sortedEntry.value;
                    }
                }

                storageEntry[localStorageScope.scopeId] = entry;
            }
            if (!entry.data) {
                entry.data = {};
            }

            // Update the last-access time for this scope and store the new data
            const accessTime = new Date().getTime();
            entry.lastAccess = accessTime;
            entry.data[contributionId] = value;

            if (caching && caching.maxCacheLifetimeMinutes) {

                if (!entry.dataLastAccessed) {
                    entry.dataLastAccessed = {};
                }

                if (typeof value === "undefined") {
                    delete entry.dataLastAccessed[contributionId];
                }
                else {
                    entry.dataLastAccessed[contributionId] = accessTime;
                }
            }

            // Write the result back to local storage
            try {
                window.localStorage.setItem(localStorageScope.storageEntryName, JSON.stringify(storageEntry));
            }
            catch (ex) {
                Diag.logWarning(`Could not write to localStorage. Key=${localStorageScope.storageEntryName}. Error=${ex}.`);
            }
        }
    }

    /**
    * Add a plugin handler that gets called when data with the given key has been sent from the server
    *
    * @param dataType The data type property as set in the data provider's contribution
    * @param handler Function called whenever data with the given key has been provided
    */
    public static addResolutionPlugin(dataType: string, handler: WebPageDataResolutionPlugin) {
        WebPageDataService._resolveDataPlugins[dataType] = handler;
    }

    /**
    * Remove the plugin handler that gets called when data with the given key
    *
    * @param dataType The data type property as set in the data provider's contribution
    */
    public static removeResolutionPlugin(dataType: string) {
        delete WebPageDataService._resolveDataPlugins[dataType];
    }

    /**
    * Get web page data that was contributed from the given contribution
    *
    * @param contributionId The data provider key
    * @param contractMetadata Optional contract metadata to use to deserialize the object
    */
    public getPageData<T>(contributionId: string, contractMetadata?: Serialization.ContractMetadata): T {

        // Ensure that the local data island processing has been initiated
        this._ensureInitialized();

        return LocalPageData.getData<T>(contributionId, contractMetadata);
    }

    /**
    * Removes web page data that was contributed from the given contribution
    *
    * @param contributionId The data provider key
    */
    public removePageData(contributionId: string) {
        const dataTypes = Object.keys(this._contributionIdsByDataType);
        for (let dataType of dataTypes) {
            const idsByType = this._contributionIdsByDataType[dataType];
            const index = idsByType.indexOf(contributionId);
            if (index >= 0) {
                idsByType.splice(index, 1);
            }
        }

        delete this._localDataSource[contributionId];
        delete this._contributionPromises[contributionId];
        delete this._resolvedProviders[contributionId];

        LocalPageData.removeData(contributionId);
    }

    /**
     * Gets the source from which a data provider's data was populated (JSON island data, REST call, localStorage, etc.)
     *
     * @param key The data provider key (contribution id)
     */
    public getPageDataSource(contributionId: string): WebPageDataSource {
        return this._localDataSource[contributionId];
    }

    /**
     * Get the page data entries from all data provider contributions with the given dataType property.
     *
     * @param dataType Value of the dataType property in the data provider contribution's properties
     * @param contractMetadata Optional contract metadata to use to deserialize the returned values.
     */
    public getPageDataByDataType<T>(dataType: string, contractMetadata?: Serialization.ContractMetadata): IDictionaryStringTo<T> {
        var result: IDictionaryStringTo<T> = {};

        // Ensure that the local data island processing has been initiated
        this._ensureInitialized();

        var idsByType = this._contributionIdsByDataType[dataType];
        if (idsByType) {
            for (var id of idsByType) {
                result[id] = this.getPageData<T>(id, contractMetadata);
            }
        }

        return result;
    }

    /**
     * getRemoteDataAsync is used to retrieve remote organization data via a data-provider through a promise.
     * This is to be used only to call a remote/cross org dataprovider.
     * @param contributionId The contributionId of the data provider.
     * @param dataProviderScope Remote data provider scope
     * @param authTokenManager Auth token manager for WebSessionTokens
     * @param serviceInstanceId Id of the service instance, the current one will be used if not given
     * @param requestParameters Parameters to use when fetching data.
     */
    public async getRemoteDataAsync<T>(contributionId: string,
        dataProviderScope: { name: string, value: string },
        authTokenManager: IAuthTokenManager<any>,
        serviceInstanceId?: string,
        requestParameters?: any): Promise<T | undefined> {
        // Determine service instance type, fall back to current one if not passed
        serviceInstanceId = serviceInstanceId || Context.getPageContext().serviceInstanceId;

        const client = await getContributionClient(this.getConnection(), serviceInstanceId, !!(window as any).LWL, authTokenManager);

        const result = await client.queryDataProviders({
            contributionIds: [contributionId],
            context: {
                properties: requestParameters
            } as Contributions_Contracts.DataProviderContext
        }, dataProviderScope.name, dataProviderScope.value);

        if (result && result.exceptions && result.exceptions[contributionId]) {
            const exception = result.exceptions[contributionId];
            throw new WebPageDataProviderError(exception.message, exception);
        }

        return result && result.data[contributionId] as T;
    }

    /**
     * getDataAsync is used to retrieve data via a data-provider through a promise. In contrast to `ensureDataProvidersResolved` 
     * nothing is cached every time `getDataAsync` is called a request is made. If you make multiple calls at the same time, multiple 
     * requests will be sent.
     *
     * @param contributionId The contributionId of the data provider.
     * @param serviceInstanceId Id of the service instance, the current one will be used if not given
     * @param requestParameters Parameters to use when fetching data.
     */
    public async getDataAsync<T>(contributionId: string, serviceInstanceId?: string, requestParameters?: any): Promise<T | undefined> {
        // Determine service instance type, fall back to current one if not passed
        serviceInstanceId = serviceInstanceId || Context.getPageContext().serviceInstanceId;

        const client = await getContributionClient(this.getConnection(), serviceInstanceId, !!(window as any).LWL);
            
        /**
         * Confusing names between getPageSource and getSourcePage. getPageSource is for the existing "pageSource" information
         * used by the legacy platform. getSourcePage gives the simpler "sourcePage" information used by the LWP platform.
         */
        const properties = {
            ...requestParameters,
            pageSource: this.getPageSource(),
            sourcePage: getSourcePage()
        };

        const dataProviderScope = LocalPageData.getDataProviderScope();
        const result = await client.queryDataProviders({
            contributionIds: [contributionId],
            context: {
                properties
            } as Contributions_Contracts.DataProviderContext
        }, dataProviderScope.name, dataProviderScope.value);

        if (result && result.exceptions && result.exceptions[contributionId]) {
            const exception = result.exceptions[contributionId];

            throw new WebPageDataProviderError(exception.message, exception);
        }

        return result && result.data[contributionId] as T;
    }

    /**
     * Ensure that all data providers have been resolved for all of the given data-provider contributions
     *
     * @param contributions The data provider contributions to resolve
     * @param refreshIfExpired If true, force a server request to re-populate the data provider data if the data has expired.  Default is it is always expired.
     */
    public ensureDataProvidersResolved(contributions: Contributions_Contracts.Contribution[], refreshIfExpired?: boolean, properties?: any): IPromise<any> {

        return this._ensureInitialized(contributions).then(() => {

            var serviceInstanceIds = <IDictionaryStringTo<Contributions_Contracts.Contribution[]>>{};

            if (!refreshIfExpired) {
                contributions = contributions.filter((contribution) => {
                    return !this._resolvedProviders[contribution.id];
                });
            }

            var promises = <Q.IPromise<any>[]>[];

            contributions.forEach((contribution) => {
                var refreshData: boolean = refreshIfExpired && this._isDataExpired(contribution);
                var existingPromise = !refreshData && this._contributionPromises[contribution.id];
                if (existingPromise) {
                    promises.push(existingPromise);
                }
                else {
                    var cachedValue = !refreshData && this._getCachedDataProviderValue(contribution);
                    if (cachedValue) {
                        LocalPageData.overrideData(contribution.id, cachedValue);
                        this._localDataSource[contribution.id] = WebPageDataSource.LocalStorage;
                        this._resolvedProviders[contribution.id] = <Contributions_Contracts.ResolvedDataProvider>{
                            id: contribution.id
                        };
                    }
                    else {
                        var instanceId = (<string>contribution.properties[Constants_Platform.DataProviderConstants.ContributionInstanceTypeProperty] || "").toLowerCase();
                        var existingContributions = serviceInstanceIds[instanceId];
                        if (!existingContributions) {
                            existingContributions = [];
                            serviceInstanceIds[instanceId] = existingContributions;
                        }
                        existingContributions.push(contribution);
                    }
                }
            });

            $.each(serviceInstanceIds, (serviceInstanceId: string, contributions: Contributions_Contracts.Contribution[]) => {
                var promise = this.fetchPageDataForService(serviceInstanceId, contributions, properties);
                contributions.forEach((contribution) => {
                    this._contributionPromises[contribution.id] = promise;
                });
                promises.push(promise);
            });

            return Q.allSettled(promises);
        });
    }

    private fetchPageDataForService(serviceInstanceId: string, contributions: Contributions_Contracts.Contribution[], properties?: any): IPromise<any> {
        properties = properties || {};
        properties.pageSource = this.getPageSource();
        properties.sourcePage = getSourcePage();

        const query: Contributions_Contracts.DataProviderQuery = {
            contributionIds: contributions.map(c => c.id),
            context: {
                properties
            } as Contributions_Contracts.DataProviderContext
        };

        const dataProviderScope = LocalPageData.getDataProviderScope();

        return getContributionClient(this.getConnection(), serviceInstanceId, !!(window as any).LWL).then(client => {
            return client.queryDataProviders(query, dataProviderScope.name, dataProviderScope.value).then((result) => {
                LocalPageData.addDataProviderResults(result);
                return this._handleDataProviderResult(result, contributions, WebPageDataSource.RestCall);
            });
        });
    }

    private getPageSource(): Contracts_Platform.WebPageDataProviderPageSource {
        const pageContext = Context.getPageContext();
        const hubsService = Service.getLocalService(HubsService);
        const navHistoryService = getNavigationHistoryService();

        return <Contracts_Platform.WebPageDataProviderPageSource>{
            contributionPaths: pageContext.moduleLoaderConfig.contributionPaths ? Object.keys(pageContext.moduleLoaderConfig.contributionPaths) : null,
            diagnostics: pageContext.diagnostics,
            navigation: { ...pageContext.navigation, routeValues: navHistoryService.getCurrentRouteValues() },
            project: pageContext.webContext.project,
            selectedHubGroupId: hubsService.getSelectedHubGroupId(),
            selectedHubId: hubsService.getSelectedHubId(),
            team: pageContext.webContext.team,
            url: window.location.href
        };
    }

    /**
     * Get page data from a data provider contribution that is cached, optionally queueing an update of the data
     * after reading from the cache
     *
     * @param cachedDataProviderContributionId Id of the data provider which caches data in localStorage
     * @param primaryDataProviderContributionId Optional contribution id of a data provider to use if it exists. The cached data will not be used or updated if this exists.
     * @param refreshCache If true and data was read from the cache, queue up a request to update it.
     * @param contractMetadata Optional contract metadata to use when deserializing the JSON island data
     */
    public getCachedPageData<T>(cachedDataProviderContributionId: string, primaryDataProviderContributionId?: string, refreshCache: boolean = true, contractMetadata?: Serialization.ContractMetadata, reloadCallback?: IResultCallback): T {

        let pageDataSource: WebPageDataSource;

        // Attempt to get the data from the primary data provider first
        let data: T;
        if (primaryDataProviderContributionId) {
            data = this.getPageData<T>(primaryDataProviderContributionId, contractMetadata);
            if (data) {
                pageDataSource = this.getPageDataSource(primaryDataProviderContributionId);
            }
        }

        // Load data from the cached data provider
        if (!data) {
            data = this.getPageData<T>(cachedDataProviderContributionId, contractMetadata);
            pageDataSource = this.getPageDataSource(cachedDataProviderContributionId);
        }

        // Queue a request to re-fetch the data if we used cached data in order to do the initial population
        if (refreshCache && pageDataSource === WebPageDataSource.LocalStorage) {
            this.reloadCachedProviderData(cachedDataProviderContributionId, reloadCallback);
        }

        return data;
    }

    /**
     * Always reloads provider data by queuing up a new request
     *
     * @param cachedDataProviderContributionId Id of the data provider
     * @param properties Additional properties to pass to the provider on reload as part of the context
     */
    public reloadCachedProviderData(cachedDataProviderContributionId: string, reloadCallback?: IResultCallback, properties?: any) {
        let extensionService = Service.getService(ExtensionService);

        const areDataIslandValuesEqual = (oldValue: any, newValue: any): boolean => {
            if (!oldValue && !newValue) {
                return true;
            }
            else if (!oldValue || !newValue) {
                return false;
            }
            else {
                try {
                    return JSON.stringify(oldValue) === JSON.stringify(newValue);
                }
                catch (ex) {
                    return false;
                }
            }
        }

        // Get the current value
        let currentValue = this.getPageData(cachedDataProviderContributionId);

        // Force reload the data provider data
        extensionService.getContribution(cachedDataProviderContributionId).then((contribution) => {
            this.ensureDataProvidersResolved([contribution], true, properties).then(() => {

                let newValue = this.getPageData(cachedDataProviderContributionId);

                // Invoke the refresh callback to reload the providers if the data provider value is now different
                if (reloadCallback && !areDataIslandValuesEqual(currentValue, newValue)) {
                    reloadCallback();
                }
            });
        });
    }

    /**
     * Invalidate any previously-cached data for the given data provider.
     *
     * @param cachedDataProviderContributionId Contribution id of the data provider
     * @param reloadDataNow If true, immediately make a request to repopulate the data provider's data
     */
    public invalidateCachedProviderData(cachedDataProviderContributionId: string, reloadDataNow: boolean = false): IPromise<any> {
        const extensionService = Service.getService(ExtensionService);
        return extensionService.getContribution(cachedDataProviderContributionId).then((contribution) => {

            const caching: IDataProviderCaching = contribution.properties["caching"];
            if (caching && caching.mode == "localStorage") {
                this._setCachedDataProviderValue(contribution.id, undefined, caching);
            }

            if (reloadDataNow) {
                return this.ensureDataProvidersResolved([contribution], true);
            }
            else {
                return null;
            }
        });
    }
}

WebPageDataService.addResolutionPlugin(Constants_Platform.ContributedServiceContextData.ContributedServiceDataProviderType, (contributionId: string, newValue: any) => {
    // Upon receiving contributed service contexts, register them with the Context module
    if (newValue) {
        var context: Contracts_Platform.ContributedServiceContext = Serialization.ContractSerializer.deserialize(newValue, Contracts_Platform.TypeInfo.ContributedServiceContext);
        return Context.processContributedServiceContext(context);
    }
});

/**
 * Provides helper functions for extensions-related types.
 */
export class ExtensionHelper {

    private static _httpUrlRegex: RegExp = /^[a-z][a-z0-9+.-]*:/i;

    /**
    * full contribution id for the given contribution.
    *
    * @param contribution The contribution to get the id of
    */
    public static getFullContributionId(contribution: Contributions_Contracts.Contribution) {
        return contribution.id;
    }

    /**
     * Get the identfier for the extension that published this contribution.
     *
     * @param contribution The contribution whose extension is being requested
     */
    public static getExtensionId(contribution: Contributions_Contracts.Contribution): string {
        return contribution.id.split(".")[1];
    }

    /**
     * Get the identfier for the publisher that published this contribution.
     *
     * @param contribution The contribution whose publisher is being requested
     */
    public static getPublisherId(contribution: Contributions_Contracts.Contribution): string {
        return contribution.id.split(".")[0];
    }

    /**
    * Is the contribution of the given contribution type
    *
    * @param contribution The contribution whose type to check
    * @param contributionType The full id of the contribution type to check for
    */
    public static isContributionOfType(contribution: Contributions_Contracts.Contribution, contributionType: string) {
        return Utils_String.equals(contribution.type, contributionType, true);
    }

    /**
     * Determines whether or not a contribution is from a trusted source.
     *
     * @param contribution The contribution whose trust to check
     */
    public static isContributionTrusted(contribution: Contributions_Contracts.Contribution): boolean {
        var attributesProperty = contribution.properties[ContributionReservedProperties.AttributesProperty];
        return attributesProperty && ((attributesProperty & ContributionReservedAttributeValue.Trusted) !== 0);
    }

    /**
    * Determine whether or not the given contribution is from a trusted extension and has internal content
    *
    * @param contribution The contribution whose properties to check
    */
    public static hasInternalContent(contribution: Contributions_Contracts.Contribution): boolean {
        return (ExtensionHelper.isContributionTrusted(contribution) && !!contribution.properties["content"]);
    }

    /**
    * Determine whether or not the given contribution provides hostable content
    *
    * @param contribution The contribution whose properties to check
    * @param uriProperty The property name which contains the content uri ("uri" by default)
    */
    public static hasContent(contribution: Contributions_Contracts.Contribution, uriProperty = "uri"): boolean {
        return !!contribution.properties[uriProperty] || ExtensionHelper.hasInternalContent(contribution);
    }

    /**
     * Processes a mustache template string with the given replacement object
     * @param string templateString The mustache template string
     * @param any replacementObject
     * @return string The template string with all replacements made
     */
    public static resolveTemplateString(templateString: string, replacementObject: any): IPromise<string> {
        var deferred = Q.defer<string>();

        if (!templateString) {
            return Q.resolve(templateString);
        }

        if (!replacementObject) {
            replacementObject = {};
        }

        if (replacementObject && templateString.indexOf("{{") >= 0) {

            // Use mustache.js to resolve the template
            VSS.using(["mustache"], (mustache: MustacheStatic) => {
                try {
                    templateString = mustache.render(templateString, replacementObject);
                }
                catch (ex) {
                    // Invalid template - just return the raw property value
                }
                deferred.resolve(templateString);
            });
        }
        else {
            deferred.resolve(templateString);
        }

        return deferred.promise;
    }

    /**
     * Processes a URI template string with the given replacement object and base URI
     * @param string templateString The mustache template string
     * @param any replacementObject
     * @param string baseUri
     * @return string The template string with all replacements made
     */
    public static resolveUriTemplate(templateString: string, replacementObject: any, baseUri: string): IPromise<string> {
        var deferred = Q.defer<string>();
        this.resolveTemplateString(templateString, replacementObject).then((uriPropertyValue: string) => {
            if (ExtensionHelper._httpUrlRegex.test(uriPropertyValue) || !baseUri) {
                deferred.resolve(uriPropertyValue);
            }
            else {
                ExtensionHelper.resolveTemplateString(baseUri, replacementObject).then((resolvedBaseUri: string) => {
                    deferred.resolve(Utils_File.combinePaths(resolvedBaseUri, uriPropertyValue));
                }, deferred.reject);
            }
        }, deferred.reject);

        return deferred.promise;
    }

    /**
     * Get an absolute URI for a given property on a contribution and a replacements object
     * @param
     */
    public static resolveUriTemplateProperty(contribution: Contributions_Contracts.Contribution, replacementObject: any, propertyName: string = "uri", baseUri: string = null): IPromise<string> {
        var template = contribution.properties[propertyName];
        if (typeof template === "undefined") {
            return Q.resolve(null);
        }
        else {
            var extensionService = Service.getService(ExtensionService);
            const serviceInstanceType = extensionService.getServiceInstanceType(contribution);
            const contributionBaseUri = extensionService.getBaseUri(contribution);

            if (serviceInstanceType) {
                replacementObject = replacementObject || {};
                replacementObject[Constants_WebApi.ExtensionTemplateContextItemNames.ServiceInstanceType] = serviceInstanceType;
            }

            return ExtensionHelper.resolveUriTemplate(template, replacementObject, baseUri || contributionBaseUri);
        }
    }

    /**
     * Publish tracing data for a given contribution
     * @param Contributions_Contracts.Contribution contribution
     * @param any data
     */
    public static publishTraceData(contribution: Contributions_Contracts.Contribution, data?: string, contributionId?: string) {
        if (contribution) {
            ExtensionHelper.publishData(contribution, data);
        } else if (contributionId) {
            Service.getService(ExtensionService).getContribution(contributionId).then((c: Contributions_Contracts.Contribution) => {
                if (c) {
                    ExtensionHelper.publishData(c, data);
                }
            });
        }
    }

    private static publishData(contribution: Contributions_Contracts.Contribution, data?: string) {
        var publisherId: string = ExtensionHelper.getPublisherId(contribution);
        var telemetryProperties: { [x: string]: string } = {
            "Action": CustomerIntelligenceConstants.CONTRIBUTIONS_ACTION_EXECUTE,
            "PublisherId": publisherId,
            "ExtensionId": publisherId + '.' + ExtensionHelper.getExtensionId(contribution),
            "ContributionId": contribution.id,
            "ContributionData": data,
            "Type": contribution.type
        };

        Telemetry_Services.publishEvent(new Telemetry_Services.TelemetryEventData(
            CustomerIntelligenceConstants.CONTRIBUTIONS_AREA,
            CustomerIntelligenceConstants.CONTRIBUTIONS_USAGE_FEATURE,
            telemetryProperties));
    }
}

VSS.tfsModuleLoaded("VSS.Contributions", exports);