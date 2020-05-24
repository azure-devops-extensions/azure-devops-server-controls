/// <reference types="react" />
/// <reference types="react-dom" />

import Q = require("q");

import AgentExistenceStore_NO_REQUIRE = require("Build/Scripts/Stores/AgentExistence");
import Build_Actions = require("Build/Scripts/Actions/Actions");
import { definitionUpdated, definitionsUpdated, DefinitionUpdatedPayload, DefinitionsUpdatedPayload } from "Build/Scripts/Actions/Definitions";
import { BuildsSource } from "Build/Scripts/Sources/Builds";
import BuildStore = require("Build/Scripts/Stores/Builds");
import { getBuildsUpdatedActionHub } from "Build/Scripts/Actions/BuildsUpdated";
import ChangesStore = require("Build/Scripts/Stores/Changes");
import Constants = require("Build/Scripts/Constants");
import { FavoriteDefinitionInfo } from "Build/Scripts/Favorites";
import DefinitionFavoriteStore = require("Build/Scripts/Stores/DefinitionFavorites");
import { DefinitionStore, getDefinitionStore } from "Build/Scripts/Stores/Definitions";
import { MyBuildsSource } from "Build/Scenarios/Definitions/Mine/Sources/MyBuilds";
import { myBuildsUpdated } from "Build/Scenarios/Definitions/Mine/Actions/MyBuildsUpdated";
import { OneTimeActionCreator } from "Build/Scripts/OneTimeActionCreator";
import { QueryResult } from "Build/Scripts/QueryResult";

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_React = require("Presentation/Scripts/TFS/TFS.React");

import BuildContracts = require("TFS/Build/Contracts");

import { Action } from "VSS/Flux/Action";

import Performance = require("VSS/Performance");
import Service = require("VSS/Service");
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

export interface IStoreChangedPayload {
    noAutoFocus: boolean;
}

export interface IRow {
    definition: QueryResult<BuildContracts.BuildDefinitionReference>;
    build: BuildContracts.Build;
    history: QueryResult<BuildContracts.BuildReference[]>;
    change: QueryResult<BuildContracts.Change>;
    isMyFavorite: boolean;
    isTeamFavorite: boolean;
    favoriteInfo: FavoriteDefinitionInfo;
    key: string;
}

export interface IMyDefinitionsStoreOptions extends TFS_React.IStoreOptions {
    tfsContext?: TFS_Host_TfsContext.TfsContext;
    buildsSource?: BuildsSource;
    myBuildsSource?: MyBuildsSource;
    buildStore?: BuildStore.BuildStore;
    definitionFavoriteStore?: DefinitionFavoriteStore.DefinitionFavoriteStore;
    definitionStore?: DefinitionStore;
    changesStore?: ChangesStore.ChangesStore;
}

export interface InitializeMyDefinitionsStorePayload {
    hasMyBuilds: boolean;
    buildIds: number[];
}
var _initializeMyDefinitionsStore = new Action<InitializeMyDefinitionsStorePayload>();
export var initializeMyDefinitionsStore = new OneTimeActionCreator(_initializeMyDefinitionsStore);

interface ViewStateData {
    definitionids?: number[];
}

// We explictly mention the stores that this store is dependent on in the constructor so that all listeners for dependent stores are initialized first
export class MyDefinitionsStore extends TFS_React.Store {
    public static DefaultMaxBuilds = 10;

    private _initialized: Q.Deferred<any> = Q.defer();
    private static DefaultMaxFavoriteBuilds = Constants.DefaultServerPageSizeMax;
    private static MoreBuildsPageSize = Constants.DefaultPageSize;
    private static HistogramSize = 10;

    // either "my builds" or "recent builds"
    private _hasMyBuilds: boolean;
    private _buildIds: number[] = [];

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _buildsSource: BuildsSource;
    private _myBuildsSource: MyBuildsSource;
    private _agentExistenceStore: AgentExistenceStore_NO_REQUIRE.AgentExistenceStore;
    private _buildStore: BuildStore.BuildStore;
    private _definitionStore: DefinitionStore;
    private _definitionFavoriteStore: DefinitionFavoriteStore.DefinitionFavoriteStore;
    private _changesStore: ChangesStore.ChangesStore;

    private _maxBuilds: number = MyDefinitionsStore.DefaultMaxBuilds;
    private _maxMyFavorites: number = MyDefinitionsStore.DefaultMaxFavoriteBuilds;
    private _maxTeamFavorites: number = MyDefinitionsStore.DefaultMaxFavoriteBuilds;

    private _buildStoreGetBuildsByMeReady = false;
    private _buildStoreGetRecentBuildsReady = false;
    private _favDefStoreReadyToGetDefinitions = false;
    private _storeInitialized = false;

    private _statesCompleted = 0;

    constructor(options?: IMyDefinitionsStoreOptions) {
        super(Constants.StoreChangedEvents.MyDefinitionsStoreUpdated, options);

        this._tfsContext = (options && options.tfsContext) ? options.tfsContext : TFS_Host_TfsContext.TfsContext.getDefault();
        this._buildStore = (options && options.buildStore) ? options.buildStore : BuildStore.getBuildStore();
        this._definitionStore = (options && options.definitionStore) ? options.definitionStore : getDefinitionStore();
        this._definitionFavoriteStore = (options && options.definitionFavoriteStore) ? options.definitionFavoriteStore : DefinitionFavoriteStore.getDefinitionFavoriteStore();
        this._changesStore = (options && options.changesStore) ? options.changesStore : ChangesStore.getChangesStore();
        this._buildsSource = (options && options.buildsSource) ? options.buildsSource : Service.getCollectionService(BuildsSource);
        this._myBuildsSource = (options && options.myBuildsSource) ? options.myBuildsSource : Service.getCollectionService(MyBuildsSource);

        var currentIdentityId = this._tfsContext.currentIdentity.id;

        _initializeMyDefinitionsStore.addListener((payload: InitializeMyDefinitionsStorePayload) => {
            this._hasMyBuilds = payload.hasMyBuilds;
            this._buildIds = payload.buildIds || [];

            this._initialized.resolve(null);

            this.emitChanged();
        });

        definitionUpdated.addListener((payload: DefinitionUpdatedPayload) => {
            this.emitChanged();
        });

        definitionsUpdated.addListener((payload: DefinitionsUpdatedPayload) => {
            this.emitChanged();
        });

        getBuildsUpdatedActionHub().buildsUpdated.addListener((payload) => {
            let builds = payload.builds || [];
            let changed: boolean = false;
            builds.forEach((build: BuildContracts.Build) => {
                if (!build.deleted) {
                    if (!this._hasMyBuilds || Utils_String.localeIgnoreCaseComparer(build.requestedFor.id, currentIdentityId) === 0) {
                        this._updateBuildList(this._buildIds, build, this._maxBuilds);
                        changed = true;
                    }
                }
            });

            if (changed) {
                this.emitChanged({
                    noAutoFocus: true
                } as IStoreChangedPayload);
            }
        });

        myBuildsUpdated.addListener((payload) => {
            let builds = payload.builds || [];

            this._buildIds = builds.map((build: BuildContracts.Build) => {
                return build.id;
            });
            this._hasMyBuilds = this._buildIds.length > 0;

            this._initialized.resolve(null);

            this.emitChanged();
        });

        Build_Actions.changesRetrieved.addListener((payload: Build_Actions.ChangesRetrievedPayload) => {
            this.emitChanged();
        });

        this._definitionFavoriteStore.addChangedListener(() => {
            this.emitChanged();
        });

        Build_Actions.buildDeleted.addListener((build: BuildContracts.Build) => {
            // if it was one of My builds, fetch a new set
            let buildsPromise: IPromise<BuildContracts.Build[]> = null;
            if (Utils_Array.contains(this._buildIds, build.id)) {
                this._myBuildsSource.getBuilds(this._tfsContext.currentIdentity.id, MyDefinitionsStore.DefaultMaxBuilds, 1);
            }
        });

        Build_Actions.moreMyFavoritesRequested.addListener(() => {
            this._maxMyFavorites += MyDefinitionsStore.MoreBuildsPageSize;
            this.emitChanged();
        });

        Build_Actions.moreTeamFavoritesRequested.addListener(() => {
            this._maxTeamFavorites += MyDefinitionsStore.MoreBuildsPageSize;
            this.emitChanged();
        });
    }

    public hasMyBuilds(): boolean {
        return this._hasMyBuilds;
    }

    public agents(): AgentExistenceStore_NO_REQUIRE.IAgents {
        let initialized = true;
        if (this._agentExistenceStore) {
            return this._agentExistenceStore.agents();
        }

        if (!this._tfsContext.isHosted && !this._tfsContext.isDevfabric) {
            // initialize only for onprem
            this._initializeAgentStore();
            initialized = false;
        }

        return {
            exists: true,
            initialized: initialized
        };
    }

    public initialized(): Q.Promise<any> {
        return this._initialized.promise;
    }

    public hasDefinitions(): boolean {
        return this._definitionStore.hasDefinitions();
    }

    public hasMoreMyFavoriteRows(): boolean {
        return this._definitionFavoriteStore.getMyFavoriteDefinitionIds().length > this._maxMyFavorites;
    }

    public hasMoreTeamFavoriteRows(): boolean {
        return this._definitionFavoriteStore.getTeamFavoriteDefinitionIds().length > this._maxTeamFavorites;
    }

    public getBuildRows(): IRow[] {
        var buildIds: number[] = this._buildIds.slice(0, this._maxBuilds);
        return this._getBuildRows(buildIds);
    }

    public getMyFavoriteDefinitionRows(): IRow[] {
        var definitionIds: number[] = this._definitionFavoriteStore.getMyFavoriteDefinitionIds();
        // since we get definitions from definitionIds, sort the rows so that we get definitions sorted
        return this._getDefinitionRows(definitionIds.slice(0, this._maxMyFavorites)).sort((a, b) => {
            if (a.definition.result && b.definition.result) {
                return Utils_String.ignoreCaseComparer(a.definition.result.name, b.definition.result.name);
            }
        });
    }

    public getTeamFavoriteDefinitionRows(): IRow[] {
        var definitionIds: number[] = this._definitionFavoriteStore.getTeamFavoriteDefinitionIds();
        // since we get definitions from definitionIds, sort the rows so that we get definitions sorted
        return this._getDefinitionRows(definitionIds.slice(0, this._maxTeamFavorites)).sort((a, b) => {
            if (a.definition.result && b.definition.result) {
                return Utils_String.ignoreCaseComparer(a.definition.result.name, b.definition.result.name);
            }
        });;
    }

    private _updateBuildList(buildList: number[], build: BuildContracts.Build, max: number): void {
        if (!Utils_Array.contains(buildList, build.id)) {
            // if there is already a build for the same definition, replace it
            var replaced: boolean = false;
            for (var i = 0; i < buildList.length; i++) {
                let existingBuildId = buildList[i];
                let existingBuild = this._buildStore.getBuild(existingBuildId);
                if (existingBuild && existingBuild.result && existingBuild.result.definition && existingBuild.result.definition.id === build.definition.id) {
                    buildList[i] = build.id;
                    replaced = true;
                    break;
                }
            }

            // otherwise, add the new build to the front and pop any extras out
            if (!replaced) {
                buildList.unshift(build.id);
                while (buildList.length > max) {
                    buildList.pop();
                }
            }
        }
    }

    private _getDefinitionRows(definitionIds: number[]): IRow[] {
        let definitions: QueryResult<BuildContracts.BuildDefinitionReference>[] = [];
        definitionIds.forEach((definitionId: number) => {
            let definition = this._definitionStore.getDefinition(definitionId);
            // the user might have View Builds but not View Definition
            // as this is the My Definitions store, we will not show rows if the user can't see the definition
            if (definition && definition.result) {
                definitions.push(definition);
            }
        });

        // get all the histograms in one call
        definitionIds = definitions.map((definition: QueryResult<BuildContracts.BuildDefinitionReference>) => {
            return definition.result.id;
        });
        let histories = this._buildStore.getDefinitionHistories(definitionIds, 10);

        let rows: IRow[] = [];
        definitions.forEach((definition: QueryResult<BuildContracts.BuildDefinitionReference>) => {
            if (definition.result) {
                rows.push(this._getDefinitionRow(definition, histories[definition.result.id]));
            }
        });

        return rows;
    }

    private _getDefinitionRow(definition: QueryResult<BuildContracts.BuildDefinitionReference>, history: QueryResult<BuildContracts.BuildReference[]>): IRow {
        let definitionId: number = definition.result.id;
        let build: BuildContracts.Build = null;

        if (history && !history.pending && history.result.length > 0) {
            let pendingBuild = this._buildStore.getBuild(history.result[0].id);
            if (pendingBuild) {
                build = pendingBuild.result;
            }
        }

        let change: QueryResult<BuildContracts.Change> = {
            pending: false,
            result: null
        }

        if (build) {
            let changes = this._changesStore.getChangesForBuild(build, 1);
            change.pending = changes.pending;
            if (changes.result && changes.result.length > 0) {
                change.result = changes.result[0];
            }
        }

        return {
            definition: definition,
            history: history,
            build: build,
            change: change,
            isMyFavorite: this._definitionFavoriteStore.isMyFavoriteDefinition(definitionId),
            isTeamFavorite: this._definitionFavoriteStore.isTeamFavoriteDefinition(definitionId),
            favoriteInfo: this._definitionFavoriteStore.getFavoriteInfo(definitionId),
            key: build ? build.id.toString() : definitionId.toString()
        };
    }

    private _getBuildRows(buildIds: number[]): IRow[] {
        let rows: IRow[] = [];

        let builds: BuildContracts.Build[] = [];
        if (buildIds.length > 0) {
            // first, get the definitions
            let definitionIds: number[] = [];
            let definitions: IDictionaryNumberTo<QueryResult<BuildContracts.BuildDefinitionReference>> = {};
            buildIds.forEach((buildId: number) => {
                let build: BuildContracts.Build = this._buildStore.getBuild(buildId).result;
                // ignore deleted builds
                if (build && build.definition && !build.deleted) {
                    // if the definition couldn't be found, definition.result will be null
                    // this is the case when the user has View Builds but not View Definition permission
                    // as this is the My Definitions store, we will not show rows if the user can't see the definition
                    let definition = this._definitionStore.getDefinition(build.definition.id);
                    if (definition && definition.result) {
                        builds.push(build);
                        definitionIds.push(definition.result.id);
                        definitions[definition.result.id] = definition;
                    }
                }
            });

            // then get the definition histories
            let histories = this._buildStore.getDefinitionHistories(definitionIds, 10);

            // now we have enough information to build the row
            builds.forEach((build: BuildContracts.Build) => {
                let changes = this._changesStore.getChangesForBuild(build, 1);
                let change: QueryResult<BuildContracts.Change> = {
                    pending: changes.pending,
                    result: changes.result[0]
                }

                let definition = definitions[build.definition.id];
                if (definition && definition.result) {
                    rows.push({
                        definition: definition,
                        history: histories[definition.result.id],
                        build: build,
                        change: change,
                        isMyFavorite: this._definitionFavoriteStore.isMyFavoriteDefinition(build.definition.id),
                        isTeamFavorite: this._definitionFavoriteStore.isTeamFavoriteDefinition(build.definition.id),
                        favoriteInfo: this._definitionFavoriteStore.getFavoriteInfo(build.definition.id),
                        key: build.id.toString()
                    });
                }
            });
        }
        else {
            // no builds. show some empty definition rows
            let definitions = this._definitionStore.getDefinitions(DefinitionStore.exists, this._maxBuilds);

            // then get the definition histories
            let definitionIds: number[] = definitions.map((definition) => definition.result.id);
            let histories = this._buildStore.getDefinitionHistories(definitionIds, 10);

            definitions.forEach((definition) => {
                rows.push(this._getDefinitionRow(definition, histories[definition.result.id]));
            });
        }

        return rows;
    }

    private _initializeAgentStore() {
        VSS.using(["Build/Scripts/Stores/AgentExistence"], (_AgentExistenceStore: typeof AgentExistenceStore_NO_REQUIRE) => {
            if (!this._agentExistenceStore) {
                this._agentExistenceStore = _AgentExistenceStore.getStore();
                this._agentExistenceStore.addChangedListener(() => {
                    this.emitChanged();
                });
                this.emitChanged(); // trigger change since agentstore is available now for use
            }
        });
    }
}
var _myDefinitionsStore: MyDefinitionsStore = null;

export function getMyDefinitionsStore(): MyDefinitionsStore {
    if (!_myDefinitionsStore) {
        _myDefinitionsStore = new MyDefinitionsStore();
    }
    return _myDefinitionsStore;
}
