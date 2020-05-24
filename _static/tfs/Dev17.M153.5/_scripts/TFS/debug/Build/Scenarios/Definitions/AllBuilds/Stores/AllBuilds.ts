import { getBuildsUpdatedActionHub, BuildsUpdatedActionHub, Payload as BuildsUpdatedPayload } from "Build/Scripts/Actions/BuildsUpdated";
import { AllBuildsActionHub, AllBuildsUpdatedPayload, getAllBuildsActionHub } from "Build/Scenarios/Definitions/AllBuilds/Actions/AllBuilds";
import { AllBuildsEventManager, getAllBuildsEventManager, AllBuildsEvents } from "Build/Scenarios/Definitions/AllBuilds/Events/AllBuildsEventManager";
import {
    IFilterData,
    isAscendingOrder,
    updateNavigationStateHistory,
    isBuildMatch
} from "Build/Scenarios/Definitions/AllBuilds/Common";
import * as AgentExistenceStore_NO_REQUIRE from "Build/Scripts/Stores/AgentExistence";
import { BuildStore, getBuildStore } from "Build/Scripts/Stores/Builds";
import { DefinitionStore, getDefinitionStore } from "Build/Scripts/Stores/Definitions";

import { getSortedBuildsByTime, getBuildDateFunctionType } from "Build.Common/Scripts/BuildReference";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { Build, BuildStatus, BuildReference } from "TFS/Build/Contracts";

import { Store as BaseStore } from "VSS/Flux/Store";
import { arrayEquals, unique, subtract } from "VSS/Utils/Array";
import { using } from "VSS/VSS";

export interface IStoreOptions {
    tfsContext?: TfsContext;
    buildStore?: BuildStore;
    definitionStore?: DefinitionStore;
    actionHub?: AllBuildsActionHub;
    buildsUpdatedActionHub?: BuildsUpdatedActionHub;
    eventManager?: AllBuildsEventManager;
}

// We explictly mention the stores that this store is dependent on in the constructor so that all listeners for dependent stores are initialized first
export class AllBuilds extends BaseStore {
    private _tfsContext: TfsContext;

    protected _buildIds: number[] = [];

    private _agentExistenceStore: AgentExistenceStore_NO_REQUIRE.AgentExistenceStore;
    private _buildStore: BuildStore;
    private _definitionStore: DefinitionStore;

    private _actionsHub: AllBuildsActionHub;
    private _buildsUpdatedActionHub: BuildsUpdatedActionHub;

    private _eventManager: AllBuildsEventManager;

    private _agentInitialized: boolean = false;
    private _initializing: boolean = true;

    private _appliedFilter: IFilterData = {} as IFilterData;

    constructor(options?: IStoreOptions) {
        super();

        this._tfsContext = (options && options.tfsContext) ? options.tfsContext : TfsContext.getDefault();
        this._buildStore = (options && options.buildStore) ? options.buildStore : getBuildStore();
        this._definitionStore = (options && options.definitionStore) ? options.definitionStore : getDefinitionStore();

        this._actionsHub = (options && options.actionHub) ? options.actionHub : getAllBuildsActionHub();
        this._buildsUpdatedActionHub = (options && options.buildsUpdatedActionHub) ? options.buildsUpdatedActionHub : getBuildsUpdatedActionHub();

        this._eventManager = (options && options.eventManager) ? options.eventManager : getAllBuildsEventManager();

        this._buildsUpdatedActionHub.buildsUpdated.addListener((payload: BuildsUpdatedPayload) => {
            // build store has new data now, let's update ourselves to make sure we get latest data
            this.emitChanged();
        });

        this._buildsUpdatedActionHub.buildStateUpdated.addListener((build: Build) => {
            // scope to current project
            if (build.project.id === this._tfsContext.navigation.projectId) {
                if (this._buildIds.indexOf(build.id) > -1) {
                    // existing build status update
                    this.emitChanged();
                }
                else {
                    // new build, scope to filter
                    if (isBuildMatch(build, this._appliedFilter)) {
                        this._buildIds = this._buildIds.concat(build.id);
                        this.emitChanged();
                    }
                }
            }
        });

        this._actionsHub.allBuildsUpdated.addListener((payload: AllBuildsUpdatedPayload) => {
            if (payload.append) {
                if (payload.buildIds.length > 0) {
                    this._buildIds = unique(this._buildIds.concat(payload.buildIds));
                }
            }
            else if (!!payload.buildIds && !arrayEquals(payload.buildIds, this._buildIds)) {
                this._buildIds = payload.buildIds.slice(0);
            }

            this._initializing = false;
            if (payload.filter) {
                this._appliedFilter = payload.filter;
                updateNavigationStateHistory(this._appliedFilter);
            }

            this.emitChanged();
            this.emit(AllBuildsEvents.ResultsAvailable, this);
        });

        this._eventManager.addNavigationStateChangedListener(() => {
            this.emitChanged();
        });
    }

    public getBuilds(): Build[] {
        let builds = this._buildStore.getBuildsById(this._buildIds) || [];
        return this._getSortedBuilds(builds);
    }

    public getAppliedFilter() {
        return this._appliedFilter;
    }

    public hasDefinitions(): boolean {
        return this._definitionStore.hasDefinitions();
    }

    public isInitializing(): boolean {
        return this._initializing;
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

    private _getSortedBuilds(builds: Build[]): Build[] {
        let getBuildDateFunction: getBuildDateFunctionType = null;
        switch (this._appliedFilter.status) {
            case BuildStatus.Completed:
                getBuildDateFunction = (build: BuildReference) => { return build.finishTime };
                break;
            case BuildStatus.InProgress:
                getBuildDateFunction = (build: BuildReference) => { return build.startTime };
                break;
            default:
                getBuildDateFunction = (build: BuildReference) => { return build.queueTime };
                break;
        }

        return getSortedBuildsByTime(builds, getBuildDateFunction, isAscendingOrder(this._appliedFilter.order)) as Build[];
    }
}

var _store: AllBuilds = null;

export function getAllBuildsStore(): AllBuilds {
    if (!_store) {
        _store = new AllBuilds();
    }
    return _store;
}