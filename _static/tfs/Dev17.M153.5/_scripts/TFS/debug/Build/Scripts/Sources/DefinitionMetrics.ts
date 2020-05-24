import Q = require("q");

import { definitionMetricsRetrieved } from "Build/Scripts/Actions/DefinitionMetrics";
import { raiseTfsError } from "Build/Scripts/Events/MessageBarEvents";

import { BuildClientService } from "Build.Common/Scripts/ClientServices";

import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";

import { BuildMetric } from "TFS/Build/Contracts";

import { VssConnection } from "VSS/Service";
import * as Utils_Array from "VSS/Utils/Array";

export class DefinitionMetricsSource extends TfsService {
    private _buildService: BuildClientService;

    private _getOperations: IDictionaryNumberTo<IPromise<BuildMetric[]>> = {};
    private _deleteOperations: IDictionaryNumberTo<IPromise<any>> = {};

    public initializeConnection(connection: VssConnection): void {
        super.initializeConnection(connection);

        this._buildService = this.getConnection().getService(BuildClientService);
    }

    public getMetrics(definitionId: number, minMetricsTime?: Date): IPromise<BuildMetric[]> {
        return this._getMetrics(definitionId, minMetricsTime);
    }

    private _getMetrics(definitionId: number, minMetricsTime?: Date): IPromise<BuildMetric[]> {
        if (!this._getOperations[definitionId]) {
            let deferred = Q.defer<BuildMetric[]>();

            this._buildService.getDefinitionMetrics(definitionId, minMetricsTime)
                .then((metrics) => {
                    delete this._getOperations[definitionId];

                    definitionMetricsRetrieved.invoke({
                        metrics: [
                            {
                                definitionId: definitionId,
                                metrics: metrics
                            }
                        ]
                    });

                    deferred.resolve(metrics);
                }, (err) => {
                    delete this._getOperations[definitionId];

                    if (err.status !== 404) {
                        raiseTfsError(err);
                    }

                    definitionMetricsRetrieved.invoke({
                        metrics: [
                            {
                                definitionId: definitionId,
                                metrics: []
                            }
                        ]
                    });

                    deferred.reject(err);
                });

            this._getOperations[definitionId] = deferred.promise;
        }

        return this._getOperations[definitionId];
    }
}