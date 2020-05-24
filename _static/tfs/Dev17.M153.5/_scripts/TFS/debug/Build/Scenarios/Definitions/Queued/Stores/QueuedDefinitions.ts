/// <reference types="react" />
/// <reference types="react-dom" />
import * as AgentExistenceStore_NO_REQUIRE from "Build/Scripts/Stores/AgentExistence";
import * as Build_Actions from "Build/Scripts/Actions/Actions";
import { definitionUpdated, definitionsUpdated, DefinitionUpdatedPayload, DefinitionsUpdatedPayload } from "Build/Scripts/Actions/Definitions";
import * as Constants from "Build/Scripts/Constants";

import * as BuildContracts from "TFS/Build/Contracts";
import { TaskAgentQueue, TaskAgentQueueActionFilter } from "TFS/DistributedTask/Contracts";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

import { getSortedBuilds } from "Build.Common/Scripts/BuildReference";

import { BuildStore, getBuildStore } from "Build/Scripts/Stores/Builds";
import { getBuildsUpdatedActionHub, Payload as BuildsUpdatedPayload } from "Build/Scripts/Actions/BuildsUpdated";
import { DefinitionStore, getDefinitionStore } from "Build/Scripts/Stores/Definitions";
import { searchDefinitionsUpdated, queuedDefinitionBuildsUpdated, QueuedDefinitionBuildsUpdatedPayload, QueuedDefinitionSearchDefinitionsUpdatedPayload } from "Build/Scenarios/Definitions/Queued/Actions/QueuedDefinitions";
import { queuesRetrieved } from "Build/Scripts/Actions/Actions";
import { QueuesStore, getQueuesStore } from "Build/Scripts/Stores/Queues";

import { IBuildFilter } from "Build.Common/Scripts/ClientContracts";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { EventService, getService as getEventService } from "VSS/Events/Services";
import { Store as BaseStore } from "VSS/Flux/Store";
import { using } from "VSS/VSS";

export interface IStoreOptions {
    tfsContext?: TfsContext;
    buildStore?: BuildStore;
    definitionStore?: DefinitionStore;
    queuesStore?: QueuesStore;
}

// We explictly mention the stores that this store is dependent on in the constructor so that all listeners for dependent stores are initialized first
export class Store extends BaseStore {
    private _tfsContext: TfsContext;

    private _buildIds: number[] = [];
    private _definitionIds: number[] = [];
    private _filter: IBuildFilter;

    private _agentExistenceStore: AgentExistenceStore_NO_REQUIRE.AgentExistenceStore;
    private _buildStore: BuildStore;
    private _definitionStore: DefinitionStore;
    private _queuesStore: QueuesStore;

    private _eventService: EventService;

    private _initializing: boolean = true;
    private _agentInitialized: boolean = false;

    constructor(options?: IStoreOptions) {
        super();

        this._tfsContext = (options && options.tfsContext) ? options.tfsContext : TfsContext.getDefault();
        this._eventService = getEventService();

        this._buildStore = (options && options.buildStore) ? options.buildStore : getBuildStore();
        this._definitionStore = (options && options.definitionStore) ? options.definitionStore : getDefinitionStore();
        this._queuesStore = (options && options.queuesStore) ? options.queuesStore : getQueuesStore();

        getBuildsUpdatedActionHub().buildsUpdated.addListener((payload: BuildsUpdatedPayload) => {
            let builds = payload.builds || [];

            // scope to current project
            builds = builds.filter((build) => {
                return build.project.id === this._tfsContext.navigation.projectId;
            });

            if (this._filter) {
                // scope to the filter
                builds = builds.filter((build) => {
                    return isBuildMatch(build, this._filter);
                });
            }
            // store by appending since there might be a new build
            let newBuildIds = getBuildIds(builds, this._buildIds);

            if (!Utils_Array.arrayEquals(this._buildIds, newBuildIds)) {
                this._buildIds = newBuildIds;
                this.emitChanged();
            }
        });

        Build_Actions.changesRetrieved.addListener((payload: Build_Actions.ChangesRetrievedPayload) => {
            this.emitChanged();
        });

        definitionUpdated.addListener((payload: DefinitionUpdatedPayload) => {
            this.emitChanged();
        });

        definitionsUpdated.addListener((payload: DefinitionsUpdatedPayload) => {
            this.emitChanged();
        });

        queuedDefinitionBuildsUpdated.addListener((payload: QueuedDefinitionBuildsUpdatedPayload) => {
            this._buildIds = payload.buildIds;
            this._filter = payload.filter;
            this._initializing = false;
            this.emitChanged();
        });

        searchDefinitionsUpdated.addListener((payload: QueuedDefinitionSearchDefinitionsUpdatedPayload) => {
            // we always append
            this._definitionIds = Utils_Array.unique(this._definitionIds.concat(payload.definitionIds));
            this.emitChanged();
        });

        queuesRetrieved.addListener((payload) => {
            this.emitChanged();
        });
    }

    public agents(): AgentExistenceStore_NO_REQUIRE.IAgents {
        if (this._agentExistenceStore) {
            return this._agentExistenceStore.agents();
        }

        if (!this._tfsContext.isHosted && !this._tfsContext.isDevfabric) {
            // initialize only for onprem
            this._initializeAgentStore();
        }
        else {
            this._agentInitialized = true;
        }

        return {
            exists: true,
            initialized: this._agentInitialized
        };
    }

    public hasDefinitions(): boolean {
        return this._definitionStore.hasDefinitions();
    }

    public getCompletedBuilds(): BuildContracts.Build[] {
        return this._getBuildRows(true);
    }

    public getQueuedOrRunningBuilds(): BuildContracts.Build[] {
        return this._getBuildRows();
    }

    public getDefinitions(): BuildContracts.BuildDefinitionReference[] {
        let sources: BuildContracts.BuildDefinitionReference[] = [];
        let definitionsResult = this._definitionStore.getDefinitionsById(this._definitionIds);
        definitionsResult.forEach((definitionResult) => {
            if (definitionResult.result) {
                sources.push(definitionResult.result);
            }
        });

        sources = sources.sort((a, b) => {
            return Utils_String.ignoreCaseComparer(a.name, b.name);
        });

        return sources;
    }

    public getQueues(): TaskAgentQueue[] {
        return this._queuesStore.getQueues(TaskAgentQueueActionFilter.Use);
    }

    public isInitializing(): boolean {
        return this._initializing;
    }

    private _getBuildRows(completedBuilds: boolean = false): BuildContracts.Build[] {
        let builds = this._buildStore.getBuildsById(this._buildIds) || [];
        let sortedBuilds = getSortedBuilds(builds);
        if (completedBuilds) {
            builds = sortedBuilds.finishedBuilds as BuildContracts.Build[];
        }
        else {
            builds = sortedBuilds.runningBuilds.concat(sortedBuilds.queuedBuilds) as BuildContracts.Build[];
        }

        return builds.slice(0, completedBuilds ? Constants.DefaultPageSize : builds.length);
    }

    private _initializeAgentStore() {
        using(["Build/Scripts/Stores/AgentExistence"], (_AgentExistenceStore: typeof AgentExistenceStore_NO_REQUIRE) => {
            if (!this._agentExistenceStore) {
                this._agentExistenceStore = _AgentExistenceStore.getStore();
                this._agentExistenceStore.addChangedListener(() => {
                    this.emitChanged();
                });

                this._agentInitialized = true;
                this.emitChanged(); // trigger change since agentstore is available now for use
            }
        });
    }
}

var _store: Store = null;

export function getStore(): Store {
    if (!_store) {
        _store = new Store();
    }
    return _store;
}

export function isBuildMatch(build: BuildContracts.Build, filter: IBuildFilter): boolean {
    if (!build || !filter) {
        return false;
    }

    let queueMatch: boolean = true;
    if (filter.queues) {
        let queueIds = filter.queues.split(",").map(q => q.trim());
        queueMatch = build.queue ? queueIds.indexOf(build.queue.id + "") >= 0 : true;
    }

    let definitionMatch: boolean = true;
    if (filter.definitions) {
        let definitionIds = filter.definitions.split(",").map(d => d.trim());
        definitionMatch = build.definition ? definitionIds.indexOf(build.definition.id + "") >= 0 : true;
    }

    let requestedForMatch: boolean = true;
    if (filter.requestedFor) {
        requestedForMatch = build.requestedFor ? Utils_String.equals(filter.requestedFor, build.requestedFor.displayName, true) : true;
    }

    let repositoryMatch: boolean = true;
    if (filter.repositoryId) {
        repositoryMatch = build.repository ? Utils_String.equals(filter.repositoryId, build.repository.id, true) : true;
    }

    if (filter.repositoryType) {
        repositoryMatch = repositoryMatch && (build.repository ? Utils_String.equals(filter.repositoryType, build.repository.type, true) : true);
    }

    return queueMatch && definitionMatch && requestedForMatch && repositoryMatch;
}

export function getBuildIds(builds: BuildContracts.Build[], existingBuildIds: number[]): number[] {
    let newBuildIds = builds.map((build) => build.id);
    return Utils_Array.unique(existingBuildIds.concat(newBuildIds));
}
