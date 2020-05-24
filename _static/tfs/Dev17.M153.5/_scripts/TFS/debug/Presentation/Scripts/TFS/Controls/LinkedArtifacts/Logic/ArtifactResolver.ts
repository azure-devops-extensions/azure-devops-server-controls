import * as Q from "q";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import * as VSSError from "VSS/Error";
import { MessageAreaType } from "VSS/Controls/Notifications";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ILinkedArtifactsDataProvider } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/DataProvider/DataProvider";
import { RequestCache } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/DataProvider/RequestCache";
import {
    getLinkedArtifactProvider,
    ERROR_NODATAPROVIDERREGISTERED_TYPE
} from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/DataProvider/DataProvider.Registration";
import { IInternalLinkedArtifactDisplayData, ILinkedArtifactsCache, IColumn, IHostArtifact, ILinkedArtifactSubtypeFilterConfiguration, InternalKnownColumns }
    from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { ILinkedArtifact } from "TFS/WorkItemTracking/ExtensionContracts";
import { ILinkedArtifactGroup, IMessage } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Interfaces";
import * as PresentationResource from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import { ProgressAnnouncer } from "VSS/Utils/Accessibility";

export interface IArtifactResult {
    resolvedArtifacts: IInternalLinkedArtifactDisplayData[];
    messages?: IMessage[];
}

// Number of ms the request cache waits before issuing a request
const RequestCacheDelayInMs = 4;

export class ArtifactResolver {
    private static _instance: ArtifactResolver;

    public static getInstance(): ArtifactResolver {
        if (!ArtifactResolver._instance) {
            ArtifactResolver._instance = new ArtifactResolver();
        }

        return ArtifactResolver._instance;
    }

    private _requestCaches: IDictionaryStringTo<RequestCache> = {};

    public static invalidateArtifactCacheEntry(cache: ILinkedArtifactsCache, linkedArtifact: ILinkedArtifact, columns?: IColumn[]) {
        cache.invalidate(ArtifactResolver._getWriteArtifactCacheKey(linkedArtifact, columns));
    }

    public resolveArtifacts(
        linkedArtifacts: ILinkedArtifact[],
        columns: IColumn[],
        hostArtifact: IHostArtifact,
        tfsContext: TfsContext,
        filter?: IFunctionPR<string, ILinkedArtifactSubtypeFilterConfiguration>,
        cache?: ILinkedArtifactsCache): IPromise<IArtifactResult> {
        let artifactsToResolve = linkedArtifacts.slice(0);

        let messages: IMessage[] = [];

        // Group artifacts by 'tool', and call the appropriate data provider for each tool with the set of work items
        const groupedLinkedArtifactsByTool = this._groupLinkedArtifactsByTool(artifactsToResolve);

        const tools = Object.keys(groupedLinkedArtifactsByTool);

        const dataProviderPromises = tools.map(tool => this._getDataProvider(tool).then(dataProvider => {
            if (!dataProvider) {
                // This is rare, possibly because we loaded a bad/empty data provider.
                messages.push({
                    type: MessageAreaType.Error,
                    text: Utils_String.format(PresentationResource.LinkedArtifacts_DataProvider_Null, tool)
                });
                return groupedLinkedArtifactsByTool[tool].map(artifact => { return this._defaultDisplayFromLinkedArtifact(artifact); });
            }

            let artifacts = groupedLinkedArtifactsByTool[tool];

            // Handle any artifact limits imposed by the provider
            if (dataProvider.artifactLimit && artifacts.length >= dataProvider.artifactLimit) {
                artifacts = ArtifactResolver._getLimitedNumberOfArtifacts(dataProvider.artifactLimit, artifacts);

                messages.push({
                    type: MessageAreaType.Warning,
                    text: PresentationResource.LinkedArtifacts_TooManyLinks
                });
            }

            const toolFilterConfig = filter && filter(tool);

            // When a cache is given, try to resolve any artifact from the cache first
            let resolvedArtifactsFromCache: IInternalLinkedArtifactDisplayData[] = [];
            if (cache) {
                let filteredOutArtifacts: ILinkedArtifact[] = [];
                resolvedArtifactsFromCache = artifacts.map(lA => {
                    let artifactFromCache = this._getArtifactFromCache(cache, lA, columns);

                    if (artifactFromCache) {
                        if (toolFilterConfig && (!dataProvider.filter || !dataProvider.filter(artifactFromCache, toolFilterConfig, hostArtifact))) {
                            // If a filter is given, and the data provider:
                            // - either provides no filter implementation, or
                            // - the filter returns false, so it should be filtered out
                            // we cannot use, and have to return null.
                            filteredOutArtifacts.push(lA);
                            return null;
                        }
                    }

                    return artifactFromCache;
                }).filter(ra => !!ra);

                // Remove any artifacts that could be resolved from the cache from the list of artifacts to resolve
                const comparer = (a, b) => ((Utils_String.equals(a.uri, b.uri, true) && Utils_String.equals(a.linkType, b.linkType, true)) ? 0 : 1);
                artifacts = Utils_Array.subtract<ILinkedArtifact | IInternalLinkedArtifactDisplayData>(
                    artifacts,
                    resolvedArtifactsFromCache,
                    comparer);

                // Also, remove any artifacts that were filtered out from the list of artifacts to retrieve
                artifacts = Utils_Array.subtract(artifacts, filteredOutArtifacts, comparer);
            }

            if (artifacts.length === 0) {
                // Every artifact could be resolved from cache
                return Q(resolvedArtifactsFromCache);
            }

            // Request artifacts by using the cache, to optimize for concurrent requests
            const requestCache = this._getRequestCacheForTool(tool);
            return requestCache.getArtifacts(artifacts, columns, this._retrieveItemsFromDataProvider.bind(this, dataProvider, tfsContext, toolFilterConfig, hostArtifact))
                .then(resolvedArtifactsFromProvider => {
                    // Add artifacts to cache, before client-side filtering is applied
                    for (const resolvedArtifact of resolvedArtifactsFromProvider) {
                        this._ensureCommentDataForArtifact(resolvedArtifact);

                        if (cache) {
                            cache.set(ArtifactResolver._getWriteArtifactCacheKey(resolvedArtifact, columns), resolvedArtifact);
                        }
                    }

                    // Filter artifacts, if a filter configuration is given and the data provider supports filtering
                    if (toolFilterConfig && dataProvider.filter) {
                        resolvedArtifactsFromProvider = resolvedArtifactsFromProvider.filter(ra => dataProvider.filter(ra, toolFilterConfig, hostArtifact));
                    }

                    // Concat results previously retrieved from cache and return
                    return resolvedArtifactsFromProvider.concat(resolvedArtifactsFromCache);
                });
        }, reason => {
            // No data provider was registered
            if (reason.type === ERROR_NODATAPROVIDERREGISTERED_TYPE) {
                messages.push({
                    type: MessageAreaType.Error,
                    text: Utils_String.format(PresentationResource.LinkedArtifacts_DataProvider_NotRegistered, tool)
                });

                return groupedLinkedArtifactsByTool[tool].map(artifact => { return this._defaultDisplayFromLinkedArtifact(artifact); });
            }
            else {
                // Handle other errors 
                messages.push({
                    type: MessageAreaType.Error,
                    text: PresentationResource.LinkedArtifacts_DataProvider_CouldNotBeResolved
                });
                // Record error to telemetry
                reason.name = "DataProviderNotResolvedError";
                VSSError.publishErrorToTelemetry(reason);
            }

            return [];
        }));

        let resolvedArtifacts: IInternalLinkedArtifactDisplayData[] = [];

        // Once all promises for all data providers have been resolved:
        // - update the cache (if one is given)
        // - update data store
        // - show messages if any have been generated
        return Q.allSettled(dataProviderPromises).then<IArtifactResult>(promiseStates => {
            for (let promiseState of promiseStates) {
                if (promiseState.state === "fulfilled") {
                    let cacheResult = promiseState.value;
                    resolvedArtifacts = resolvedArtifacts.concat(cacheResult);
                } else {
                    messages.push({
                        type: MessageAreaType.Error,
                        text: promiseState.reason
                    });
                }
            }

            return <IArtifactResult>{
                resolvedArtifacts: resolvedArtifacts,
                messages: messages
            };
        });
    }

    private _retrieveItemsFromDataProvider(
        dataProvider: ILinkedArtifactsDataProvider, tfsContext: TfsContext, toolFilterConfig: ILinkedArtifactSubtypeFilterConfiguration, hostArtifact: IHostArtifact, artifactsFromCache: ILinkedArtifact[], columns: IColumn[]) {
        // Invoke data provider to resolve linked artifacts
        const itemPromise = dataProvider.beginGetDisplayData(
            artifactsFromCache,
            columns,
            tfsContext,
            hostArtifact).then(resolvedArtifacts => {
                if (!toolFilterConfig) {
                    // When the data provider did not filter, we will see whether some artifacts could not be resolved
                    this._reportErrorsForUnresolvedArtifacts(dataProvider.supportedTool, artifactsFromCache, resolvedArtifacts);
                }

                return resolvedArtifacts;
            });
        ProgressAnnouncer.forPromise(itemPromise, {
            announceStartMessage: PresentationResource.LinkedArtifacts_LoadingStart,
            announceEndMessage: PresentationResource.LinkedArtifacts_LoadingEnd,
            announceErrorMessage: PresentationResource.LinkedArtifacts_LoadingError
        });
        return itemPromise;
    }

    /**
     * Used when we have no data provider. Turn the linked artifact into display data the renderer will recognize
     * @param artifact
     */
    private _defaultDisplayFromLinkedArtifact(artifact: ILinkedArtifact): IInternalLinkedArtifactDisplayData {
        return {
            id: artifact.id,
            linkType: artifact.linkType,
            linkTypeDisplayName: artifact.linkTypeDisplayName,
            primaryData: {
                displayId: artifact.id,
                href: null,
                title: artifact.uri,
                typeIcon: null,
            },
            tool: artifact.tool,
            type: artifact.type
        };
    }

    private _ensureCommentDataForArtifact(resolvedArtifact: IInternalLinkedArtifactDisplayData) {
        if (resolvedArtifact.comment) {
            if (!resolvedArtifact.additionalData) {
                resolvedArtifact.additionalData = {};
            }

            if (!resolvedArtifact.additionalData[InternalKnownColumns.Comment.refName]) {
                resolvedArtifact.additionalData[InternalKnownColumns.Comment.refName] = {
                    styledText: { text: resolvedArtifact.comment },
                    title: resolvedArtifact.comment
                };
            }
        }
    }

    protected _getDataProvider(tool: string): IPromise<ILinkedArtifactsDataProvider> {
        return getLinkedArtifactProvider(tool);
    }

    /**
     * Group the given artifacts by tool
     * @param linkedArtifacts Artifacts to group
     */
    protected _groupLinkedArtifactsByTool(linkedArtifacts: ILinkedArtifact[]): IDictionaryStringTo<ILinkedArtifact[]> {
        const groupedLinkedArtifacts: IDictionaryStringTo<ILinkedArtifact[]> = {};

        for (const linkedArtifact of linkedArtifacts) {
            groupedLinkedArtifacts[linkedArtifact.tool] = (groupedLinkedArtifacts[linkedArtifact.tool] || []).concat([linkedArtifact]);
        }

        return groupedLinkedArtifacts;
    }

    private _getArtifactFromCache(cache: ILinkedArtifactsCache, linkedArtifact: ILinkedArtifact, columns: IColumn[]): IInternalLinkedArtifactDisplayData {
        // Try to get 
        let cacheKey = ArtifactResolver._getArtifactCacheKey(linkedArtifact);
        let resolvedArtifactWithoutColumns = cache.get(cacheKey);
        if (resolvedArtifactWithoutColumns) {
            return resolvedArtifactWithoutColumns;
        }

        // Try to resolve with columns
        cacheKey = ArtifactResolver._getArtifactCacheKey(linkedArtifact, columns);
        return cache.get(cacheKey);
    }

    private _getRequestCacheForTool(tool: string): RequestCache {
        if (!this._requestCaches[tool]) {
            this._requestCaches[tool] = new RequestCache(RequestCacheDelayInMs);
        }

        return this._requestCaches[tool];
    }

    private _reportErrorsForUnresolvedArtifacts(tool: string, artifactsBeingResolved: ILinkedArtifact[], resolvedArtifacts: IInternalLinkedArtifactDisplayData[]) {
        let unresolvedArtifacts = Utils_Array.subtract(artifactsBeingResolved, resolvedArtifacts, (a, b) => Utils_String.ignoreCaseComparer(a.uri, b.uri));

        if (unresolvedArtifacts.length !== artifactsBeingResolved.length) {
            let unresolvedArtifactsByTool = this._groupLinkedArtifactsByTool(unresolvedArtifacts);
            let tools = Object.keys(unresolvedArtifactsByTool);
            for (let tool of tools) {
                VSSError.publishErrorToTelemetry({
                    message: Utils_String.localeFormat("'{0}' dataprovider did not resolve following artifacts '{1}'", tool, JSON.stringify(unresolvedArtifactsByTool[tool])),
                    name: "ToolDidNotResolveArtifacts"
                });
            }
        }
    }

    /**
     * Get a limited number of artifacts
     *
     * The algorithm works as follows:
     *   1. Group given artifacts by link type
     *   2. Sort groups by the number of artifacts in each group, ascending
     *   3. Take up to {limit} artifacts from these groups, starting with the groups with the smallest number of artifacts
     * 
     * @param limit Maximum number of artifacts to return
     * @param linkedArtifacts Linked artifacts to return limited number from
     */
    protected static _getLimitedNumberOfArtifacts(limit: number, linkedArtifacts: ILinkedArtifact[]): ILinkedArtifact[] {
        // Group artifacts by link type
        let groups = ArtifactResolver.groupLinkedArtifactsByLinkType(linkedArtifacts);

        // Sort by number of artifacts in each group, ascending
        groups.sort((a, b) => a.linkedArtifacts.length - b.linkedArtifacts.length);

        // Fill bucket of up to {limit} artifacts starting with the group with the fewest artifacts
        let result: ILinkedArtifact[] = [];
        for (let group of groups) {
            for (let i = 0; i < group.linkedArtifacts.length && result.length < limit; ++i) {
                result.push(group.linkedArtifacts[i]);
            }

            if (result.length === limit) {
                break;
            }
        }

        return result;
    }

    /**
     * Group the given artifacts by link type into linked artifact groups
     * @param linkedArtifacts Artifacts to group
     */
    public static groupLinkedArtifactsByLinkType(linkedArtifacts: IInternalLinkedArtifactDisplayData[]): ILinkedArtifactGroup[] {
        let groupMap: IDictionaryStringTo<ILinkedArtifactGroup> = {};
        let groups: ILinkedArtifactGroup[] = [];

        for (let linkedArtifact of linkedArtifacts) {
            // Group artifact either by link type name, or move artifacts into default group (empty)
            let linkTypeName = linkedArtifact.linkType || "";

            let group = groupMap[linkTypeName];
            if (!group) {
                group = {
                    displayName: linkedArtifact.linkTypeDisplayName,
                    linkType: linkTypeName,
                    linkedArtifacts: []
                };

                groupMap[linkTypeName] = group;
                groups.push(group);
            }

            group.linkedArtifacts.push(linkedArtifact);
        }

        return groups;
    }

    /** Generate cache key for artifact and columns */
    protected static _getArtifactCacheKey(linkedArtifact: ILinkedArtifact, columns?: IColumn[]): string {
        const baseKey = `${linkedArtifact.uri || linkedArtifact.id}-${linkedArtifact.linkType}`;

        if (columns) {
            const columnRefNames = columns.map(c => c.refName).join();
            return `${baseKey}-${columnRefNames}`;
        }

        return baseKey;
    }

    /** Generate key for storing data */
    protected static _getWriteArtifactCacheKey(linkedArtifact: IInternalLinkedArtifactDisplayData, columns?: IColumn[]): string {
        if (linkedArtifact.isColumnDependent) {
            // Generate key with columns
            return this._getArtifactCacheKey(linkedArtifact, columns);
        }

        // Generate key without columns
        return this._getArtifactCacheKey(linkedArtifact);
    }
}