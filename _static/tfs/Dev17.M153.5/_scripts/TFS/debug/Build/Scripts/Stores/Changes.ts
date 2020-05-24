
import Build_Actions = require("Build/Scripts/Actions/Actions");
import BuildModelsCommon = require("Build/Scripts/Constants");
import { raiseTfsError } from "Build/Scripts/Events/MessageBarEvents";
import {OneTimeActionCreator} from "Build/Scripts/OneTimeActionCreator";
import {QueryResult} from "Build/Scripts/QueryResult";

import BuildClient = require("Build.Common/Scripts/ClientServices");

import TFS_React = require("Presentation/Scripts/TFS/TFS.React");

import BuildContracts = require("TFS/Build/Contracts");

import {Action} from "VSS/Flux/Action";

import Service = require("VSS/Service");
import VSS = require("VSS/VSS");

export interface BuildChange {
    buildId: number;
    change: BuildContracts.Change;
}
export var buildChangeTypeInfo = {
    fields: <any>{
        change: BuildContracts.TypeInfo.Change
    }
};

export interface ChangesUpdatedPayload {
    buildId: number;
    changes: BuildContracts.Change[];
}

export interface IChangesStoreOptions extends TFS_React.IStoreOptions {
    buildClient?: BuildClient.BuildClientService;
}

export interface InitializeChangesStorePayload {
    allChanges: BuildChange[];
}
export var _initializeChangesStore = new Action<InitializeChangesStorePayload>();
export var initializeChangesStore = new OneTimeActionCreator(_initializeChangesStore);

export class ChangesStore extends TFS_React.Store {
    private _buildClient: BuildClient.BuildClientService;
    private _changesByBuildId: IDictionaryNumberTo<QueryResult<BuildContracts.Change[]>> = {};
    private _timeOut: number = 500;

    constructor(options?: IChangesStoreOptions) {
        super(BuildModelsCommon.StoreChangedEvents.ChangesStoreUpdated, options);
        this._buildClient = (options && options.buildClient) ? options.buildClient : Service.getCollectionService(BuildClient.BuildClientService);

        _initializeChangesStore.addListener((payload: InitializeChangesStorePayload) => {
            let allChanges = payload.allChanges || [];

            allChanges.forEach((change: BuildChange) => {
                this._changesByBuildId[change.buildId] = {
                    pending: false,
                    result: [change.change]
                };
            });

            this.emitChanged();
        });

        Build_Actions.changesRetrieved.addListener((payload: Build_Actions.ChangesRetrievedPayload) => {
            this._changesByBuildId[payload.buildId] = {
                pending: false,
                result: payload.changes
            };

            this.emitChanged();
        });
    }

    public getAllChanges(): IDictionaryNumberTo<BuildContracts.Change[]> {
        return this.extractCompletedDictionary(this._changesByBuildId);
    }

    public getChangesForBuild(build: BuildContracts.Build, count: number, queueRequestsWithDelay: boolean = false): QueryResult<BuildContracts.Change[]> {
        var result = this._changesByBuildId[build.id];
        let timeOut = queueRequestsWithDelay ? this._timeOut : 0;

        if (result) {
            var slice: BuildContracts.Change[] = [];
            if (result.result) {
                slice = result.result.slice(0, count)
            }

            result = {
                pending: result.pending,
                result: slice
            };
        }
        else if (build.sourceVersion) {
            result = {
                pending: true,
                result: []
            };
            this._changesByBuildId[build.id] = result;

            // viewing changes are not criticial to be shown immediately, if there are many requests, we don't want to block browser render loop
            // default setTime out to 0, unless asked for delay, so that UI runs smoothly

            setTimeout(() => {
                // IMPORTANT: always update through an action
                this._buildClient.getBuildChanges(build.id, count, true).then((changes: BuildContracts.Change[]) => {
                    Build_Actions.changesRetrieved.invoke({
                        buildId: build.id,
                        changes: changes
                    });
                }, (err: any) => {
                    // the build may have been deleted. in this case, the endpoint retuns a 404
                    // we just won't show any changes in this case
                    if (err.status !== 404) {
                        raiseTfsError(err);
                    }
                    Build_Actions.changesRetrieved.invoke({
                        buildId: build.id,
                        changes: []
                    });
                });
            }, timeOut);
        }
        else {
            result = {
                pending: false,
                result: []
            };
        }

        return result;
    }

    private extractCompletedDictionary<T>(sourceDictionary: IDictionaryNumberTo<QueryResult<T>>): IDictionaryNumberTo<T> {
        var results: IDictionaryNumberTo<T> = {};

        for (var key in sourceDictionary) {
            if (sourceDictionary.hasOwnProperty(key)) {
                var pendingResult = sourceDictionary[key];
                if (!pendingResult.pending) {
                    results[key] = pendingResult.result;
                }
            }
        }

        return results;
    }
}
var _changesStore: ChangesStore = null;

export function getChangesStore(options?: IChangesStoreOptions): ChangesStore {
    if (!_changesStore) {
        _changesStore = new ChangesStore(options);
    }
    return _changesStore;
}
