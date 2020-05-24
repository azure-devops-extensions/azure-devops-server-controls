import Q = require("q");

import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";

import TMClient_NO_REQUIRE = require("TFS/TestManagement/RestClient");
import TMContracts = require("TFS/TestManagement/Contracts");

import VSS = require("VSS/VSS");

export class TestManagementClient extends TfsService {
    private _collectionHttpTmLazyClient: TMClient_NO_REQUIRE.TestHttpClient;

    /**
     * Gets Test run by Id
     * @param runId Id of the test run
     */
    public getTestRunById(runId: number): IPromise<TMContracts.TestRun> {
        let deferred = Q.defer<TMContracts.TestRun>();
        let projectId = this.getTfsContext().contextData.project.id;
        VSS.using(["TFS/TestManagement/RestClient"], (TMClient: typeof TMClient_NO_REQUIRE) => {
            if (!this._collectionHttpTmLazyClient) {
                this._collectionHttpTmLazyClient = this.getConnection().getHttpClient(TMClient.TestHttpClient);
            }

            this._collectionHttpTmLazyClient.getTestRunById(projectId, runId).then((value: TMContracts.TestRun) => {
                deferred.resolve(value);
            }, (err: any) => {
                deferred.reject(err);
            })
        });

        return deferred.promise;
    }

    /**
     * Gets Build coverage data
     * @param projectId Id of the project
     * @param buildUri URI of the build
     * @param includeRunDetails Whether to include run details or not
     */
    public getBuildCoverage(buildId: number): IPromise<TMContracts.BuildCoverage[]> {
        let deferred = Q.defer<TMContracts.BuildCoverage[]>();

        let projectId = this.getTfsContext().contextData.project.id;
        VSS.using(["TFS/TestManagement/RestClient"], (TMClient: typeof TMClient_NO_REQUIRE) => {
            if (!this._collectionHttpTmLazyClient) {
                this._collectionHttpTmLazyClient = this.getConnection().getHttpClient(TMClient.TestHttpClient);
            }

            let flags = TMContracts.CoverageQueryFlags.Modules;

            this._collectionHttpTmLazyClient.getBuildCodeCoverage(projectId, buildId, flags).then((value: TMContracts.BuildCoverage[]) => {
                deferred.resolve(value);
            }, (err: any) => {
                deferred.reject(err);
            })
        });

        return deferred.promise;
    }

    /**
     * Gets Build coverage data
     * @param projectId Id of the project
     * @param buildId Id of the build
     */
    public getCodeCoverageSummary(buildId: number): IPromise<TMContracts.CodeCoverageSummary> {
        let deferred = Q.defer<TMContracts.CodeCoverageSummary>();

        let projectId = this.getTfsContext().contextData.project.id;
        VSS.using(["TFS/TestManagement/RestClient"], (TMClient: typeof TMClient_NO_REQUIRE) => {
            if (!this._collectionHttpTmLazyClient) {
                this._collectionHttpTmLazyClient = this.getConnection().getHttpClient(TMClient.TestHttpClient);
            }

            this._collectionHttpTmLazyClient.getCodeCoverageSummary(projectId, buildId, -1).then((value: TMContracts.CodeCoverageSummary) => {
                deferred.resolve(value);
            }, (err: any) => {
                deferred.reject(err);
            })
        });

        return deferred.promise;
    }
}