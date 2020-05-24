/// <reference types="react" />
/// <reference types="react-dom" />
import * as Q from "q";

import { definitionUpdated } from "Build/Scripts/Actions/Definitions";
import { getMetricData } from "Build/Scripts/BuildMetrics";
import { StoreChangedEvents } from "Build/Scripts/Constants";
import { FavoriteDefinitionInfo } from "Build/Scripts/Favorites";
import { getDefinitionLink } from "Build/Scripts/Linking";
import { allDefinitionsUpdated } from "Build/Scenarios/Definitions/All2/Actions/AllDefinitions";
import { BuildStore, getBuildStore } from "Build/Scripts/Stores/Builds";
import { DefinitionStore, getDefinitionStore } from "Build/Scripts/Stores/Definitions";
import { DefinitionFavoriteStore, getDefinitionFavoriteStore } from "Build/Scripts/Stores/DefinitionFavorites";
import { DefinitionMetricStore, getDefinitionMetricStore } from "Build/Scripts/Stores/DefinitionMetrics";
import { FolderStore, getFolderStore } from "Build/Scripts/Stores/Folders";
import { QueryResult } from "Build/Scripts/QueryResult";

import { BuildClientService } from "Build.Common/Scripts/ClientServices";
import { GetDefinitionsOptions, StoredDefinition } from "Build.Common/Scripts/ClientContracts";
import { RootPath } from "Build.Common/Scripts/Security";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { IStoreOptions as ITfsReactStoreOptions, Store as TfsReactStore } from "Presentation/Scripts/TFS/TFS.React";

import { BuildReference, BuildDefinitionReference, BuildDefinition, Folder } from "TFS/Build/Contracts";

import { arrayEquals, contains, unique } from "VSS/Utils/Array";

export enum IItemType {
    Definition,
    Folder
}

export interface IDefinitionRow {
    name: string;
    id: number;
    isMyFavorite: boolean;
    isTeamFavorite: boolean;
    favoriteInfo: FavoriteDefinitionInfo;
    queuedMetric: number;
    runningMetric: number;
    parentFolderId: number;
    folderId: number;
    url: string;
    latestBuild: BuildReference;
    path: string;
    reference: BuildDefinitionReference;
}

export interface IFolderRow {
    id: number;
    path: string;
    description: string;
    hasMoreChildItems: boolean;
    continuationToken: string;
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

    private _canLoadMore: boolean = false;
    private _definitionIds: number[] = [];
    private _continuationToken: string = "";
    private _filter: GetDefinitionsOptions = {};
    private _folderIds: number[] = [];
    private _idsToFolderRows: IDictionaryNumberTo<IFolderRow> = {};

    constructor(options?: IStoreOptions) {
        super(StoreChangedEvents.AllDefinitionsStoreUpdated, options);

        this._buildStore = (options && options.buildStore) ? options.buildStore : getBuildStore();
        this._definitionStore = (options && options.definitionStore) ? options.definitionStore : getDefinitionStore();
        this._definitionFavoriteStore = (options && options.definitionFavoriteStore) ? options.definitionFavoriteStore : getDefinitionFavoriteStore();
        this._definitionMetricStore = (options && options.definitionMetricStore) ? options.definitionMetricStore : getDefinitionMetricStore();
        this._folderStore = (options && options.folderStore) ? options.folderStore : getFolderStore();

        allDefinitionsUpdated.addListener((payload) => {
            this._initializing = false;

            let path = payload.filter ? payload.filter.path : null;
            let id = this._folderStore.getId(path);

            //if updating folders at root level, update variables used to load more on scroll
            if (!path || path === RootPath) {
                this._continuationToken = payload.continuationToken;
                this._canLoadMore = !!this._continuationToken;
            }
            //if not at root level, update folder attributes used to load more in folder
            else {
                let id = this._folderStore.getId(path);
                let folder = this._idsToFolderRows[id];
                folder.continuationToken = payload.continuationToken;
                folder.hasMoreChildItems = !!payload.continuationToken;
                this._idsToFolderRows[id] = folder;
            }

            if (payload.append) {
                if (payload.definitionIds.length > 0) {
                    this._definitionIds = unique(this._definitionIds.concat(payload.definitionIds));
                }
            }
            else {
                this._refreshFolders();
                this._definitionIds = payload.definitionIds;
            }

            this.emitChanged();
        });

        definitionUpdated.addListener((payload) => {
            let folderId = this._folderStore.getId(payload.definition.path);
            if (folderId) {
                this._definitionStore.setFolderId(payload.definitionId, folderId);
                this._triggerChange();
            }
        });

        this._definitionStore.addChangedListener(this._triggerChange);

        this._folderStore.addChangedListener(() => {
            let folders = this._folderStore.getFolders();
            let newFolders: IDictionaryNumberTo<IFolderRow> = {};
            let newIds: number[] = [];
            folders.forEach((storedFolder) => {
                if (!storedFolder.pending) {
                    let token: string = null;
                    let hasMore: boolean = true;
                    const path = storedFolder.result.folder.path;
                    const id = storedFolder.result.id;
                    const description = storedFolder.result.folder.description;
                    let oldFolder = this._idsToFolderRows[id];
                    if (oldFolder) {
                        token = oldFolder.continuationToken;
                        hasMore = oldFolder.hasMoreChildItems;
                    }
                    const newFolder = {
                        id: id,
                        path: path,
                        description: description,
                        continuationToken: token,
                        hasMoreChildItems: hasMore
                    } as IFolderRow;
                    newFolders[id] = newFolder;
                    newIds.push(id);
                }
            });
            this._folderIds = newIds;
            this._idsToFolderRows = newFolders;
            this._triggerChange();
            
        });

        this._definitionMetricStore.addChangedListener((store: DefinitionMetricStore, isSignalRUpdate: boolean) => {
            this._triggerChange();
        });

        this._definitionFavoriteStore.addChangedListener(() => {
            this._triggerChange();
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

    public getDefinitionRows(folderPath: string): IDefinitionRow[] {
        let definitionRows: IDefinitionRow[] = [];
        let queryResults = this._definitionStore.getDefinitionsById(this._definitionIds);
        if (queryResults) {
            queryResults.forEach((queryResult) => {
                const definition: StoredDefinition = queryResult.result;
                if (definition) {
                    let aggregatedMetrics = this._definitionMetricStore.getAggregatedDefinitionMetrics(definition.id, null, false);
                    let metricData = getMetricData(aggregatedMetrics);
                    let folderId: number;
                    if (definition.folderId) {
                        folderId = definition.folderId;
                    }
                    else if (definition.path === RootPath) {
                        folderId = 1;
                    }
                    else {
                        folderId = this._folderStore.getId(definition.path);
                        this._definitionStore.setFolderId(definition.id, folderId);
                    }
                    if (folderId) {
                        let latestBuild = this._getLatestBuild(definition.id, definition.latestBuild);
                        let row = {
                            name: definition.name,
                            id: definition.id,
                            isMyFavorite: this._definitionFavoriteStore.isMyFavoriteDefinition(definition.id),
                            isTeamFavorite: this._definitionFavoriteStore.isTeamFavoriteDefinition(definition.id),
                            favoriteInfo: this._definitionFavoriteStore.getFavoriteInfo(definition.id),
                            queuedMetric: metricData.queuedMetric,
                            runningMetric: metricData.runningMetric,
                            parentFolderId: folderId,
                            folderId: folderId,
                            url: getDefinitionLink(definition, false),
                            latestBuild: latestBuild,
                            path: definition.path,
                            reference: definition as BuildDefinitionReference
                        };
                        definitionRows.push(row);
                    }
                }
            });
        }
        return definitionRows;
    }

    public getFolderRows(folderPath: string, isSearchActive?: boolean): IFolderRow[] {
        let folders: IFolderRow[] = [];
         if (!!isSearchActive) {
            return folders;
        }
        
        folders.push({
            id: 1,
            path: RootPath,
            description: null,
            hasMoreChildItems: true,
            continuationToken: null
        });

        this._folderIds.forEach((id: number) => {
            folders.push(this._idsToFolderRows[id]);
            
        });
        return folders;
    }

    public hasDefinitions(): boolean {
        return this._definitionStore.hasDefinitions();
    }

    public hasFolders(): boolean {
        return this._folderStore.hasFolders();
    }

    public canLoadMore(): boolean {
        return this._canLoadMore;
    }

    public setCanLoadMore(load: boolean) {
        this._canLoadMore = load;
    }

    public getTokenForFolder(id:number): string {
        let folder = this._idsToFolderRows[id];
        if (folder) {
            return folder.continuationToken;
        }
        return null;
    }

    protected getDefinitionIds(): number[] {
        return this._definitionIds;
    }

    private _refreshFolders() {
        for (const id in this._idsToFolderRows) {
            this._idsToFolderRows[id].hasMoreChildItems = true;
            this._idsToFolderRows[id].continuationToken = null;
        }
    }
            

    private _getLatestBuild(definitionId: number, currentLatestBuild: BuildReference): BuildReference {
        let latestBuildCandidate = this._buildStore.getLatestBuildForDefinition(definitionId);
        if (!latestBuildCandidate) {
            return currentLatestBuild;
        }
        else if (!currentLatestBuild) {
            return latestBuildCandidate;
        }
        else {
            if (currentLatestBuild.finishTime > latestBuildCandidate.finishTime) {
                return currentLatestBuild;
            }
            return latestBuildCandidate;
        }
    }

    private _triggerChange = () => {
        this.emitChanged();
    }
}

var _store: Store = null;

export function getStore(): Store {
    if (!_store) {
        _store = new Store();
    }
    return _store;
}
