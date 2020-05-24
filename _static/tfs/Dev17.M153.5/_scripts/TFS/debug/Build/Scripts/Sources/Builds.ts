import * as Q from "q";

import * as BuildActions from "Build/Scripts/Actions/Actions";
import { BuildSearchActionHub } from "Build/Scripts/Actions/SearchBuilds";
import { getBuildsUpdatedActionHub, BuildsUpdatedActionHub } from "Build/Scripts/Actions/BuildsUpdated";
import { DefaultClientPageSizeMax } from "Build/Scripts/Constants";
import { histogramsUpdated } from "Build/Scripts/Actions/HistogramsUpdated";
import { raiseTfsError, raiseTfsErrors } from "Build/Scripts/Events/MessageBarEvents";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";

import * as BuildClient from "Build.Common/Scripts/ClientServices";
import { IBuildFilter, IBuildFilterBase, GetBuildsResult } from "Build.Common/Scripts/ClientContracts";

import * as TFS_Service from "Presentation/Scripts/TFS/TFS.Service";

import { Build, BuildQueryOrder } from "TFS/Build/Contracts";

import * as Service from "VSS/Service";
import { format } from "VSS/Utils/String";

export interface IRetainBuildState {
    buildId: number;
    newState: boolean;
}

export class BuildsSource extends TFS_Service.TfsService {
    private _buildService: BuildClient.BuildClientService;

    private _cancelOperations: IDictionaryNumberTo<boolean> = {};
    private _deleteOperations: IDictionaryNumberTo<boolean> = {};
    private _retainOperations: IDictionaryNumberTo<boolean> = {};

    private _actionHub: BuildsUpdatedActionHub = null;

    public initializeConnection(connection: Service.VssConnection) {
        super.initializeConnection(connection);

        this._buildService = this.getConnection().getService(BuildClient.BuildClientService);
        this._actionHub = getBuildsUpdatedActionHub();
    }

    public getBuild(buildId: number, ignore404?: boolean): void {
        this._buildService.getBuild(buildId)
            .then((result) => {
                if (result && !result.deleted) {
                    this._actionHub.buildsUpdated.invoke({
                        builds: [result]
                    });
                }
            },
            (err) => {
                if (!ignore404 || err.status !== 404) {
                    raiseTfsError(err);
                }
                this._actionHub.buildsUpdated.invoke({
                    builds: []
                });
            });
    }

    public searchBuilds(hub: BuildSearchActionHub, buildNumber: string): void {
        let filter: IBuildFilter = {
            buildNumber: buildNumber.trim(),
            $top: DefaultClientPageSizeMax
        };

        this._buildService.getBuilds(filter)
            .then((getBuildsResults) => {
                if (getBuildsResults.builds.length == 0) {
                    hub.searchFailed.invoke({
                        errorMessage: format(BuildResources.BuildNotFound, buildNumber)
                    });
                }
                else {
                    hub.searchSucceeded.invoke({
                        builds: getBuildsResults.builds
                    });
                }
            },
            (err: Error) => {
                hub.searchFailed.invoke({
                    errorMessage: err.message
                });
            });
    }

    public getHistograms(definitionIds: number[], barCount: number): void {
        if (definitionIds && definitionIds.length > 0 && barCount > 0) {
            let filter: IBuildFilter = {
                definitions: definitionIds.join(","),
                maxBuildsPerDefinition: barCount,
                queryOrder: BuildQueryOrder.FinishTimeDescending
            };

            this._buildService.getBuilds(filter)
                .then((result) => {
                    this._actionHub.buildsUpdated.invoke({
                        builds: result.builds
                    });

                    histogramsUpdated.invoke({
                        definitionIds: definitionIds
                    });
                },
                (err) => {
                    // for histograms, we ignore 404s.
                    if (err.status !== 404) {
                        raiseTfsError(err);
                    }
                    // call failed, no need to invoke an action
                });
        }
    }

    /**
     * Fetches a new set of builds. Invokes the buildsRefreshed action.
     * @param filter
     * @param ignore404
     */
    public getBuilds(filter: IBuildFilter, ignore404?: boolean): IPromise<GetBuildsResult> {
        return this._buildService.getBuilds(filter)
            .then((result) => {
                this._actionHub.buildsUpdated.invoke({
                    builds: result.builds
                });

                return result;
            },
            (err) => {
                this._handleGetBuildsError(err, ignore404);
            });
    }

    /**
   * Fetches a new set of builds. Invokes the buildsRefreshed action.
   * @param filter
   * @param ignore404
   */
    public getAllBuilds(filter: IBuildFilterBase, ignore404?: boolean): IPromise<GetBuildsResult> {
        return this._buildService.getAllBuilds(filter)
            .then((result) => {
                this._actionHub.buildsUpdated.invoke({
                    builds: result.builds
                });

                return result;
            },
            (err) => {
                this._handleGetBuildsError(err, ignore404);
            });
    }

    /**
    * Fetches a new set of completed builds. Invokes the buildsRefreshed action.
    * @param filter
    * @param ignore404
    */
    public getCompletedBuilds(filter: IBuildFilterBase, ignore404?: boolean): IPromise<GetBuildsResult> {
        return this._buildService.getCompletedBuilds(filter)
            .then((result) => {
                this._actionHub.buildsUpdated.invoke({
                    builds: result.builds
                });

                return result;
            },
            (err) => {
                this._handleGetBuildsError(err, ignore404);
            });
    }

    /**
    * Fetches a new set of running builds. Invokes the buildsRefreshed action.
    * @param filter
    * @param ignore404
    */
    public getRunningBuilds(filter: IBuildFilterBase, ignore404?: boolean): IPromise<GetBuildsResult> {
        return this._buildService.getRunningBuilds(filter)
            .then((result) => {
                this._actionHub.buildsUpdated.invoke({
                    builds: result.builds
                });

                return result;
            },
            (err) => {
                this._handleGetBuildsError(err, ignore404);
            });
    }

    /**
    * Fetches a new set of queued builds. Invokes the buildsRefreshed action.
    * @param filter
    * @param ignore404
    */
    public getQueuedBuilds(filter: IBuildFilterBase, ignore404?: boolean): IPromise<GetBuildsResult> {
        return this._buildService.getQueuedBuilds(filter)
            .then((result) => {
                this._actionHub.buildsUpdated.invoke({
                    builds: result.builds
                });

                return result;
            },
            (err) => {
                this._handleGetBuildsError(err, ignore404);
            });
    }

    public deleteBuild(build: Build): void {
        if (!this._deleteOperations[build.id]) {
            this._deleteOperations[build.id] = true;

            this._buildService.deleteBuild(build.id)
                .then(() => {
                    delete this._deleteOperations[build.id];
                    BuildActions.buildDeleted.invoke(build);
                },
                (err) => {
                    delete this._deleteOperations[build.id];
                    raiseTfsError(err);
                });
        }
    }

    public deleteBuilds(builds: Build[]): void {
        let promises: IPromise<Build>[] = [];
        builds.forEach((build) => {
            if (!this._deleteOperations[build.id]) {
                this._deleteOperations[build.id] = true;
                promises.push(this._buildService.deleteBuild(build.id).then(() => { return build; }));
            }
        });

        // it's fine if some fail, we don't reject all, so let's use allSettled instead of all
        Q.allSettled(promises).then((results) => {
            let errors: TfsError[] = [];

            builds.forEach((build) => {
                delete this._deleteOperations[build.id];
            });

            results.forEach((result) => {
                if (result.state === PromiseStateFulfilled) {
                    BuildActions.buildDeleted.invoke(result.value);
                }
                else {
                    errors.push(result.reason);
                }
            });

            raiseTfsErrors(errors);
        });
    }

    public retainBuild(buildId: number, newState: boolean): void {
        if (!this._retainOperations[buildId]) {
            this._retainOperations[buildId] = true;
            this._buildService.updateBuildRetainFlag(buildId, newState).then((updatedBuild: Build) => {
                delete this._retainOperations[buildId];
                this._actionHub.buildsUpdated.invoke({ builds: [updatedBuild] });
            }, (err: any) => {
                delete this._retainOperations[buildId];
                raiseTfsError(err);
            });
        }
    }

    public retainBuilds(buildStates: IRetainBuildState[]): void {
        let promises: IPromise<Build>[] = [];
        buildStates.forEach((state) => {
            if (!this._retainOperations[state.buildId]) {
                this._retainOperations[state.buildId] = true;
                promises.push(this._buildService.updateBuildRetainFlag(state.buildId, state.newState));
            }
        });

        // it's fine if some fail, we don't reject all, so let's use allSettled instead of all
        Q.allSettled(promises).then((results) => {
            let errors: TfsError[] = [];

            buildStates.forEach((state) => {
                delete this._retainOperations[state.buildId];
            });

            results.forEach((result) => {
                if (result.state === PromiseStateFulfilled) {
                    this._actionHub.buildsUpdated.invoke({ builds: [result.value] });
                }
                else {
                    errors.push(result.reason);
                }
            });

            raiseTfsErrors(errors);
        });
    }

    public cancelBuild(buildId: number): void {
        if (!this._cancelOperations[buildId]) {
            this._cancelOperations[buildId] = true;
            this._buildService.cancelBuild(buildId).then((updatedBuild: Build) => {
                delete this._cancelOperations[buildId];
                this._actionHub.buildsUpdated.invoke({ builds: [updatedBuild] });
            }, (err: any) => {
                delete this._cancelOperations[buildId];
                raiseTfsError(err);
            });
        }
    }

    public cancelBuilds(buildIds: number[]): void {
        let promises: IPromise<Build>[] = [];
        buildIds.forEach((buildId) => {
            if (!this._cancelOperations[buildId]) {
                this._cancelOperations[buildId] = true;
                promises.push(this._buildService.cancelBuild(buildId));
            }
        });

        // it's fine if some fail, we don't reject all, so let's use allSettled instead of all
        Q.allSettled(promises).then((results) => {
            let errors: TfsError[] = [];

            buildIds.forEach((buildId) => {
                delete this._cancelOperations[buildId];
            });

            results.forEach((result) => {
                if (result.state == PromiseStateFulfilled) {
                    this._actionHub.buildsUpdated.invoke({ builds: [result.value] });
                }
                else {
                    errors.push(result.reason);
                }
            });

            raiseTfsErrors(errors);
        });
    }

    private _handleGetBuildsError(err: TfsError, ignore404: boolean) {
        if (!ignore404 || parseInt(err.status) !== 404) {
            raiseTfsError(err);
        }
        this._actionHub.buildsUpdated.invoke({
            builds: []
        });
    }
}

const PromiseStateFulfilled = "fulfilled";