import * as q from "q";
import * as VSS from "VSS/VSS";

import * as TFS_RMService_LAZY_LOAD from "TestManagement/Scripts/Services/TFS.ReleaseManagement.Service";
import * as Services_LAZY_LOAD from "TestManagement/Scripts/Services/Services.Common";
import * as RMContracts from "ReleaseManagement/Core/Contracts";

export class ReleaseDataHelper {
    constructor() {
        this._cachedReleaseDefinitions = {};
        this._cachedReleaseEnvDefinitions = {};
        this._cachedReleaseIdToDefinitions = {};
    }

    public fetchAssociatedReleaseDefinitions(buildDefId: number, forceRefresh: boolean): IPromise<IKeyValuePair<number, string>[]> {
        if (!forceRefresh && this._cachedReleaseDefinitions.hasOwnProperty(buildDefId.toString())) {
            return q.resolve(this._cachedReleaseDefinitions[buildDefId]);
        } else {
            let defer = q.defer<IKeyValuePair<number, string>[]>();
            VSS.using(["TestManagement/Scripts/Services/TFS.ReleaseManagement.Service", "TestManagement/Scripts/Services/Services.Common"],
                (TFS_RMService: typeof TFS_RMService_LAZY_LOAD, Services: typeof Services_LAZY_LOAD) => {

                    Services.ServiceFactory.getService(Services.ServiceType.ReleaseManagement)
                        .then((service: TFS_RMService_LAZY_LOAD.ReleaseService) => service.getReleaseDefinitionsForBuildDefinition(buildDefId))
                        .then((releaseDefinitions: RMContracts.ReleaseDefinition[]) => {
                            let releaseDefinitionsKeyValPairs: IKeyValuePair<number, string>[] = [];
                            releaseDefinitions.forEach((releaseDefinition) => {
                                releaseDefinitionsKeyValPairs.push({
                                    key: releaseDefinition.id,
                                    value: releaseDefinition.name
                                });
                                this._cachedReleaseDefinitions[buildDefId] = releaseDefinitionsKeyValPairs;
                            });
                            defer.resolve(releaseDefinitionsKeyValPairs);
                        })
                        .then(null, (reason) => {
                            defer.reject(reason);
                        });
                }, (reason) => {
                    defer.reject(reason);
                });
            return defer.promise;
        }
    }

    public fetchAssociatedReleaseEnvDefinitions(releaseDefId: number): IPromise<IKeyValuePair<number, string>[]> {
        if (this._cachedReleaseEnvDefinitions.hasOwnProperty(releaseDefId.toString())) {
            return q.resolve(this._cachedReleaseEnvDefinitions[releaseDefId]);
        }
        else {
            let defer = q.defer<IKeyValuePair<number, string>[]>();
            VSS.using(["TestManagement/Scripts/Services/TFS.ReleaseManagement.Service", "TestManagement/Scripts/Services/Services.Common"],
                (TFS_RMService: typeof TFS_RMService_LAZY_LOAD, Services: typeof Services_LAZY_LOAD) => {

                    let releaseService = Services.ServiceFactory.getService(Services.ServiceType.ReleaseManagement);
                    releaseService
                        .then((service: TFS_RMService_LAZY_LOAD.ReleaseService) => service.getReleaseDefinition(releaseDefId))
                        .then((releaseDefinition: RMContracts.ReleaseDefinition) => {
                            let releaseEnvDefinitionsKeyValPairs: IKeyValuePair<number, string>[] = [];
                            if (releaseDefinition.environments && releaseDefinition.environments.length) {
                                releaseDefinition.environments.forEach((releaseEnvDefinition) => {
                                    releaseEnvDefinitionsKeyValPairs.push({
                                        key: releaseEnvDefinition.id,
                                        value: releaseEnvDefinition.name
                                    });
                                    
                                    this._cachedReleaseEnvDefinitions[releaseDefId] = releaseEnvDefinitionsKeyValPairs;
                                });
                            }
                            defer.resolve(releaseEnvDefinitionsKeyValPairs);
                        })
                        .then(null, (reason) => {
                            defer.reject(reason);
                        });
                }, (reason) => {
                    defer.reject(reason);
                });
            return defer.promise;
        }
    }

    public getReleaseDefinition(releaseDefId: number): IPromise<RMContracts.ReleaseDefinition> {
        if (this._cachedReleaseIdToDefinitions.hasOwnProperty(releaseDefId.toString())) {
            return q.resolve(this._cachedReleaseIdToDefinitions[releaseDefId]);
        }
        else {
            let defer = q.defer<RMContracts.ReleaseDefinition>();
            VSS.using(["TestManagement/Scripts/Services/TFS.ReleaseManagement.Service", "TestManagement/Scripts/Services/Services.Common"],
                (TFS_RMService: typeof TFS_RMService_LAZY_LOAD, Services: typeof Services_LAZY_LOAD) => {

                    let releaseService = Services.ServiceFactory.getService(Services.ServiceType.ReleaseManagement);
                    releaseService
                        .then((service: TFS_RMService_LAZY_LOAD.ReleaseService) => service.getReleaseDefinition(releaseDefId))
                        .then((releaseDefinition: RMContracts.ReleaseDefinition) => {
                            this._cachedReleaseIdToDefinitions[releaseDefId] = releaseDefinition;
                            defer.resolve(releaseDefinition);
                        })
                        .then(null, (reason) => {
                            defer.reject(reason);
                        });
                }, (reason) => {
                    defer.reject(reason);
                });
            return defer.promise;
        }
    }
    
    private _cachedReleaseEnvDefinitions: IDictionaryNumberTo<IKeyValuePair<number, string>[]>;
    private _cachedReleaseDefinitions: IDictionaryNumberTo<IKeyValuePair<number, string>[]>;
    private _cachedReleaseIdToDefinitions: IDictionaryNumberTo<RMContracts.ReleaseDefinition>;
}
