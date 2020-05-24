/// <reference types="react" />
/// <reference types="react-dom" />
import * as Q from "q";

import { allDefinitionsUpdated } from "Build/Scenarios/Definitions/All/Actions/AllDefinitions";
import { definitionUpdated } from "Build/Scripts/Actions/Definitions";
import { histogramsUpdated } from "Build/Scripts/Actions/HistogramsUpdated";
import { IDefinitionsBehavior } from "Build/Scripts/Behaviors";
import { getMetricData } from "Build/Scripts/BuildMetrics";
import { StoreChangedEvents } from "Build/Scripts/Constants";
import { FavoriteDefinitionInfo } from "Build/Scripts/Favorites";
import { BuildStore, getBuildStore } from "Build/Scripts/Stores/Builds";
import { DefinitionFavoriteStore, getDefinitionFavoriteStore } from "Build/Scripts/Stores/DefinitionFavorites";
import { DefinitionMetricStore, getDefinitionMetricStore } from "Build/Scripts/Stores/DefinitionMetrics";
import { DefinitionStore, getDefinitionStore } from "Build/Scripts/Stores/Definitions";
import { FolderStore, getFolderStore } from "Build/Scripts/Stores/Folders";
import { QueryResult } from "Build/Scripts/QueryResult";

import { BuildClientService } from "Build.Common/Scripts/ClientServices";
import { GetDefinitionsOptions } from "Build.Common/Scripts/ClientContracts";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { IStoreOptions as ITfsReactStoreOptions, Store as TfsReactStore } from "Presentation/Scripts/TFS/TFS.React";

import { Build, BuildReference, BuildDefinitionReference, BuildMetric, DefinitionQueryOrder, Folder } from "TFS/Build/Contracts";

import { IdentityRef } from "VSS/WebApi/Contracts";
import { arrayEquals, contains } from "VSS/Utils/Array";
import { localeIgnoreCaseComparer } from "VSS/Utils/String";

export enum IItemType {
    Definition,
    Folder,
    FolderUpButton,
    ShowMoreButton
}

export interface IDefinitionData {
    build: Build;
    recentRequestors: IdentityRef[];
    isMyFavorite: boolean;
    isTeamFavorite: boolean;
    favoriteInfo: FavoriteDefinitionInfo;
    metrics: BuildMetric[];
    aggregatedMetrics: BuildMetric[];
    queuedMetric: number;
    runningMetric: number;
}

export interface IRow {
    key: string;
    itemType: IItemType;
    item: BuildDefinitionReference | Folder | string | null;
    isPending: boolean;
    data: IDefinitionData;
}

export interface IStoreOptions extends ITfsReactStoreOptions {
    tfsContext?: TfsContext;
    buildClient?: BuildClientService;
    buildStore?: BuildStore;
    definitionStore?: DefinitionStore;
    definitionFavoriteStore?: DefinitionFavoriteStore;
    definitionMetricStore?: DefinitionMetricStore;
    folderStore?: FolderStore;
}

export class Store extends TfsReactStore {
    private static RequestorsSize = 1;

    private _initializing: boolean = true;
    private _buildStore: BuildStore;
    private _definitionStore: DefinitionStore;
    private _definitionFavoriteStore: DefinitionFavoriteStore;
    private _definitionMetricStore: DefinitionMetricStore;
    private _folderStore: FolderStore;

    private _definitionIds: number[] = [];
    private _continuationToken: string = "";
    private _filter: GetDefinitionsOptions = {};

    constructor(options?: IStoreOptions) {
        super(StoreChangedEvents.AllDefinitionsStoreUpdated, options);

        this._buildStore = (options && options.buildStore) ? options.buildStore : getBuildStore();
        this._definitionStore = (options && options.definitionStore) ? options.definitionStore : getDefinitionStore();
        this._definitionFavoriteStore = (options && options.definitionFavoriteStore) ? options.definitionFavoriteStore : getDefinitionFavoriteStore();
        this._definitionMetricStore = (options && options.definitionMetricStore) ? options.definitionMetricStore : getDefinitionMetricStore();
        this._folderStore = (options && options.folderStore) ? options.folderStore : getFolderStore();

        allDefinitionsUpdated.addListener((payload) => {
            this._initializing = false;

            this._filter = payload.filter;
            this._continuationToken = payload.continuationToken;

            if (payload.append) {
                if (payload.definitionIds.length > 0) {
                    this._definitionIds = this._definitionIds.concat(payload.definitionIds);
                }
            }
            else if (!!payload.definitionIds && !!this._definitionIds && !arrayEquals(payload.definitionIds, this._definitionIds)) {
                this._definitionIds = payload.definitionIds.slice(0);
            }

            this.emitChanged(payload.behavior);
        });

        definitionUpdated.addListener((payload) => {
            if (!this._filter.name) {
                let index = this._definitionIds.indexOf(payload.definitionId);
                if (index > -1) {
                    let path = this._filter.path || "\\";
                    // if the path changed, remove it from this._definitionIds
                    if (path !== payload.definition.path) {
                        this._definitionIds.splice(index, 1);
                        this._triggerChangeWithFocus(true);
                    }
                }
            }
        });

        histogramsUpdated.addListener(this._triggerChange);

        this._definitionStore.addChangedListener(this._triggerChange);

        this._folderStore.addChangedListener(this._triggerChange);

        this._definitionMetricStore.addChangedListener((store: DefinitionMetricStore, isSignalRUpdate: boolean) => {
            this._triggerChangeWithFocus(isSignalRUpdate);
        });

        this._definitionFavoriteStore.addChangedListener(() => {
            this._triggerChangeWithFocus(true);
        });
    }

    public isInitializing(): boolean {
        return this._initializing;
    }

    public getContinuationToken(): string {
        return this._continuationToken;
    }

    public getFilter(): GetDefinitionsOptions {
        return this._filter;
    }

    public getRows(folderPath: string, favoritesFirst: boolean = false, showFolders: boolean = true, queryOrder: DefinitionQueryOrder = DefinitionQueryOrder.DefinitionNameAscending): IRow[] {
        let definitionResults: QueryResult<BuildDefinitionReference>[] = this._definitionStore.getDefinitionsById(this._definitionIds);

        let definitionIds: number[] = [];
        definitionResults.forEach((definitionResult) => {
            if (definitionResult.result) {
                definitionIds.push(definitionResult.result.id);
            }
        });

        let favoriteDefinitionResults: QueryResult<BuildDefinitionReference>[] = [];
        if (favoritesFirst) {
            let favoriteDefinitionIds = this._definitionFavoriteStore.getAllFavoriteDefinitionIds();
            if (favoriteDefinitionIds.length > 0) {
                // separate favorites
                let i = 0;
                while (i < definitionResults.length) {
                    let definitionResult = definitionResults[i];
                    if (contains(favoriteDefinitionIds, definitionResult.result.id)) {
                        definitionResults.splice(i, 1);
                        favoriteDefinitionResults.push(definitionResult);
                    }
                    else {
                        ++i;
                    }
                }

                favoriteDefinitionResults = favoriteDefinitionResults.sort((a, b) => {
                    return localeIgnoreCaseComparer(a.result.name, b.result.name);
                });

                if (queryOrder === DefinitionQueryOrder.DefinitionNameDescending) {
                    favoriteDefinitionResults = favoriteDefinitionResults.reverse();
                }
            }

            definitionResults = favoriteDefinitionResults.concat(definitionResults);
        }

        let definitionHistories = this._buildStore.getDefinitionHistories(definitionIds.concat(favoriteDefinitionResults.map((item) => item.result.id)), Store.RequestorsSize);

        let definitionRows = this._getDefinitionRows(definitionResults, definitionHistories);
        let folderRows: IRow[] = [];
        if (showFolders && folderPath) {
            folderRows = this._getFolderRows(folderPath);
        }

        // folders always come first
        return folderRows.concat(definitionRows);
    }

    public hasDefinitions(): boolean {
        return this._definitionStore.hasDefinitions();
    }

    public hasFolders(): boolean {
        return this._folderStore.hasFolders();
    }

    protected getDefinitionIds(): number[] {
        return this._definitionIds;
    }

    private _getDefinitionRows(definitions: QueryResult<BuildDefinitionReference>[], buildHistory: IDictionaryNumberTo<QueryResult<BuildReference[]>>): IRow[] {
        let rows: IRow[] = [];

        definitions.forEach((definition, index) => {
            if (definition.result) {
                let definitionId = definition.result.id;
                let recentRequestors: IdentityRef[] = [];
                let build: Build = null;

                let historyResult = buildHistory[definitionId];
                if (historyResult && !historyResult.pending) {
                    recentRequestors = historyResult.result.map((buildRef) => {
                        return buildRef.requestedFor
                    });
                    if (historyResult.result.length > 0) {
                        let pendingBuild = this._buildStore.getBuild(historyResult.result[0].id);
                        if (pendingBuild) {
                            build = pendingBuild.result;
                        }
                    }
                }

                let aggregatedMetrics = this._definitionMetricStore.getAggregatedDefinitionMetrics(definitionId, null, false);
                let metricData = getMetricData(aggregatedMetrics);

                let key = getDefinitionKey(definition.result);

                let row: IRow = {
                    key: key,
                    itemType: IItemType.Definition,
                    item: definition.result,
                    isPending: definition.pending,
                    data: {
                        recentRequestors: recentRequestors,
                        isMyFavorite: this._definitionFavoriteStore.isMyFavoriteDefinition(definitionId),
                        isTeamFavorite: this._definitionFavoriteStore.isTeamFavoriteDefinition(definitionId),
                        favoriteInfo: this._definitionFavoriteStore.getFavoriteInfo(definitionId),
                        metrics: this._definitionMetricStore.getDefinitionMetrics(definitionId),
                        aggregatedMetrics: this._definitionMetricStore.getAggregatedDefinitionMetrics(definitionId, null, false),
                        build: build,
                        queuedMetric: metricData.queuedMetric,
                        runningMetric: metricData.runningMetric
                    }
                };

                rows.push(row);
            }
        });

        return rows;
    }

    private _getFolderRows(folderPath: string): IRow[] {
        let folders = this._folderStore.getFolders(folderPath);
        let rows: IRow[] = [];
        folders.forEach((storedFolder) => {
            if (storedFolder.result) {
                rows.push({
                    key: getFolderKey(storedFolder.result.folder),
                    itemType: IItemType.Folder,
                    item: storedFolder.result.folder,
                    isPending: storedFolder.pending,
                    data: null
                });
            }
        });

        return rows;
    }

    private _triggerChange = (sender?: any, behavior?: IDefinitionsBehavior) => {
        this.emitChanged(behavior);
    }

    private _triggerChangeWithFocus = (preventAutoFocus?: boolean) => {
        this.emitChanged({
            preventAutoFocus: !!preventAutoFocus
        } as IDefinitionsBehavior);
    }
}

function getDefinitionKey(item: BuildDefinitionReference): string {
    if (!item) {
        return "";
    }

    return "definition-" + item.id + item.quality;
}

function getFolderKey(item: Folder): string {
    if (!item) {
        return "";
    }

    return "folder-" + item.path;
}

var _store: Store = null;

export function getStore(): Store {
    if (!_store) {
        _store = new Store();
    }
    return _store;
}
