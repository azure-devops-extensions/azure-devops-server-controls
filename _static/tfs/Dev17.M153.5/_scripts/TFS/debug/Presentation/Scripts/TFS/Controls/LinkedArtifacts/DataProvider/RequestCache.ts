import Q = require("q");

import Artifacts_Services = require("VSS/Artifacts/Services");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");

import { IHostArtifact, IInternalLinkedArtifactDisplayData , IColumn, ILinkedArtifactSubtypeFilterConfiguration } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { ILinkedArtifact } from "TFS/WorkItemTracking/ExtensionContracts";

/** @internal */
export enum CacheRequestStatus {
    Queued,
    Active
}

/** @internal */
export interface ICacheRequest {
    /** Requested linked artifacts */
    linkedArtifacts: ILinkedArtifact[];

    /** Requested columns */
    columns: IColumn[];

    /** Current status of this request */
    status: CacheRequestStatus;

    /** Promise if request has been issued */
    result: IPromise<IInternalLinkedArtifactDisplayData []>;
}

const _getArtifactId = (linkedArtifact: ILinkedArtifact): string => {
    return `${linkedArtifact.tool}/${linkedArtifact.type}/${linkedArtifact.id}`;
};

const artifactComparer = (a: ILinkedArtifact, b: ILinkedArtifact) => {
    if (!a && !b) {
        return 0;
    } else if (!a) {
        return -1;
    } else if (!b) {
        return 1;
    }

    let r = Utils_String.ignoreCaseComparer(_getArtifactId(a), _getArtifactId(b));
    if (r !== 0) {
        return r;
    }

    return Utils_String.ignoreCaseComparer(a.linkType, b.linkType);
};

const columnComparer = (a, b) => a && b && Utils_String.ignoreCaseComparer(a.refName, b.refName);

/**
 * Request Cache
 * This cache takes ids and columns into account and ensures that consumers, requesting the same
 * artifacts at the same time share requests.
 *
 * - When an artifact with id 1 and with column(s) C1 is requested, a request R1 is created and marked "queued". 
 * - A promise based on that request, that will eventually resolve to artifact 1, is returned to the caller
 * - The request is delayed by a configurable delay, until it's actually issues. While it's queued, more requests
 *   for artifacts contained within can be queued. 
 * - If artifact 1 is requested within the delay of R1, R1 is either reused as-is, or additional columns are added to the 
 *   request.
 * - Once a request has become active (after the delay) it cannot be changed, because it's actually in progress now
 */
export class RequestCache {
    private _delay: number;

    protected _cache: IDictionaryStringTo<ICacheRequest[]> = {};
    protected _queuedRequests: ICacheRequest[] = [];

    /**
     * @param delayInMs Number of milliseconds to wait before actually issuing a request
     */
    constructor(delayInMs: number) {
        this._delay = delayInMs;
    }

    /**
     * Get artifacts from cache. 
     * @param ids Requests to retrieve artifacts
     * @param columns Columns to retrieve for artifacts
     * @param resolveArtifacts Function to retrieve artifacts from an API
     * @returns Promise that will resolve to the requested artifacts
     */
    public getArtifacts(
        linkedArtifacts: ILinkedArtifact[],
        columns: IColumn[],
        resolveArtifacts: IFunctionPPR<ILinkedArtifact[], IColumn[], IPromise<IInternalLinkedArtifactDisplayData []>>): IPromise<IInternalLinkedArtifactDisplayData []> {
        // Clone input
        let artifactsToProcess = linkedArtifacts.slice(0);

        // Keep track of ids that have no ongoing request
        let artifactsToRetrieve: ILinkedArtifact[] = [];

        // Keep track of artifacts that were ADDED to an existing request so that we can update cache correctly
        let extendedArtifacts: ILinkedArtifact[] = [];

        let requests: IPromise<IInternalLinkedArtifactDisplayData []>[] = [];

        let extendedQueuedRequest: ICacheRequest = null;

        while (artifactsToProcess.length > 0) {
            let requestedArtifact = artifactsToProcess.shift();

            // See whether there is an active request for the given id
            let existingRequestsForId = this._cache[_getArtifactId(requestedArtifact)];
            if (existingRequestsForId) {
                // There are active requests, see whether any satisfies the column requirements
                let request = RequestCache._findOrExtendRequest(requestedArtifact, columns, existingRequestsForId);
                if (request) {
                    requests.push(request.result);

                    // Existing request has been found, try to see whether it might include other ids we need, try to find overlap
                    const matchingArtifacts = Utils_Array.intersect<ILinkedArtifact>([requestedArtifact].concat(artifactsToProcess), request.linkedArtifacts, artifactComparer);
                    // Remove fulfilled artifact requests
                    artifactsToProcess = Utils_Array.subtract(artifactsToProcess, matchingArtifacts, artifactComparer);

                    continue;
                }
            } else if (extendedQueuedRequest || this._queuedRequests.length > 0) {
                // There is no ongoing request for an artifact with that id, but there is a queued request that can be extended
                extendedQueuedRequest = extendedQueuedRequest || this._queuedRequests[0];
                RequestCache._extendRequest(requestedArtifact, columns, extendedQueuedRequest);

                extendedArtifacts.push(requestedArtifact);

                continue;
            }

            // There are no active requests for this id and no queued requests that we could extend, we need to queue a new one
            artifactsToRetrieve.push(requestedArtifact);
        }

        if (extendedQueuedRequest) {
            requests.push(extendedQueuedRequest.result);
            this._addToCache(extendedArtifacts, extendedQueuedRequest);
        }

        if (artifactsToRetrieve.length > 0) {
            // Create a new request
            let request = this._createNewRequest(artifactsToRetrieve, columns, resolveArtifacts);
            requests.push(request.result);

            // Add request to the cache
            this._addToCache(artifactsToRetrieve, request);
        }

        // Combine all promises to provide single promise for consumer
        return Q.all<IInternalLinkedArtifactDisplayData []>(requests).then(values => {
            return Utils_Array.unique([].concat.apply([], values).filter(r => Utils_Array.contains(linkedArtifacts, r, artifactComparer)), artifactComparer);
        });
    }

    private _addToCache(linkedArtifacts: ILinkedArtifact[], request: ICacheRequest) {
        for (let linkedArtifact of linkedArtifacts) {
            const key = _getArtifactId(linkedArtifact);
            let requests = this._cache[key];
            if (!requests) {
                requests = [];
                this._cache[key] = requests;
            }

            if (requests.length === 0 || !Utils_Array.contains(requests, request)) {
                requests.push(request);
            }
        }
    }

    protected _createNewRequest(
        artifactsToRetrieve: ILinkedArtifact[],
        columns: IColumn[],
        resolveArtifacts: IFunctionPPR<ILinkedArtifact[], IColumn[], IPromise<IInternalLinkedArtifactDisplayData []>>): ICacheRequest {
        // Introduce a delay here, this allows us to wait for more requests for the same ids but with (potentially) different columns
        let request: ICacheRequest = {
            linkedArtifacts: artifactsToRetrieve.slice(0), // Make a copy as this can be changed later and we don't want to affect consumers
            columns: columns,
            status: CacheRequestStatus.Queued, // Start a request as queued, to allow columns to be added
            result: Q.delay(this._delay).then(() => {
                // Request is now active and request parameters cannot be changed
                request.status = CacheRequestStatus.Active;
                Utils_Array.remove(this._queuedRequests, request);

                return resolveArtifacts(request.linkedArtifacts, request.columns).then(resolvedArtifacts => {
                    // Request has been fulfilled, remove from cache
                    for (let linkedArtifact of request.linkedArtifacts) {
                        delete this._cache[_getArtifactId(linkedArtifact)];
                    }

                    return resolvedArtifacts;
                });
            })
        };

        this._queuedRequests.push(request);

        return request;
    }

    protected static _extendRequest<TValue>(linkedArtifact: ILinkedArtifact, columns: IColumn[], request: ICacheRequest) {
        if (!Utils_Array.contains(request.linkedArtifacts, linkedArtifact, artifactComparer)) {
            request.linkedArtifacts.push(linkedArtifact);
        }

        request.columns = Utils_Array.union(request.columns, columns, columnComparer);
    }

    /** Returns true when the given columns can be satisfied byt the given request */
    protected static _requestContainsRequestedColumns<TValue>(columns: IColumn[], request: ICacheRequest): boolean {
        return Utils_Array.intersect(columns, request.columns, columnComparer).length === columns.length;
    }

    /** Attempts to find an active (i.e., not queued) request for the given id with the requested columns. */
    protected static _findOrExtendRequest<TValue>(
        linkedArtifact: ILinkedArtifact,
        columns: IColumn[],
        existingRequests: ICacheRequest[]): ICacheRequest {
        // Try to find an existing request that satisfies the column requirements
        for (let existingRequest of existingRequests) {
            if (RequestCache._requestContainsRequestedColumns<TValue>(columns, existingRequest)) {
                // Existing request satisfies required columns, return this
                return existingRequest;
            }
        }

        // No request satisfied column requirements. Now try to find a queued request that has *not started* yet,
        // and add the columns
        for (let existingRequest of existingRequests) {
            if (existingRequest.status === CacheRequestStatus.Queued) {
                RequestCache._extendRequest(linkedArtifact, columns, existingRequest);

                return existingRequest;
            }
        }

        // No match found
        return null;
    }

    protected static _getArtifactIdsForRequest<TValue>(request: ICacheRequest): string[] {
        return request.linkedArtifacts.map(la => _getArtifactId(la));
    }
}
