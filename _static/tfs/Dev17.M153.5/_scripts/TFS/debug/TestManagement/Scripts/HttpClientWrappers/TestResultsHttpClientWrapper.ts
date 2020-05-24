import { TestResultsHttpClient } from "TFS/TestManagement/VSS.TestResults.WebApi";
import Contracts = require("TFS/TestManagement/Contracts");
import TCM_Types = require("TestManagement/Scripts/TFS.TestManagement.Types");

export class TestResultsHttpClientWrapper extends TestResultsHttpClient {
    
    /**
     * @internal
     * [Preview API]
     *
     * @param {string} project - Project ID or project name
     * @param {number} buildId
     * @param {Contracts.TestLogType} type
     * @param {string} directoryPath
     * @param {string} fileNamePrefix
     * @param {boolean} fetchMetaData
     * @param {number} top
     * @param {String} continuationToken - Header to pass the continuationToken
     * @return IPromise<Contracts.TestLog[]>
     */
    public getTestLogsForBuild(
        project: string,
        buildId: number,
        type: Contracts.TestLogType,
        directoryPath?: string,
        fileNamePrefix?: string,
        fetchMetaData?: boolean,
        top?: number,
        continuationToken?: String
        ): IPromise<TCM_Types.ITestLogWithContinuationToken> {

        const queryValues: any = {
            buildId: buildId,
            type: type,
            directoryPath: directoryPath,
            fileNamePrefix: fileNamePrefix,
            fetchMetaData: fetchMetaData,
            top: top
        };

        return this._beginRequestWithAjaxResult<Contracts.TestLog[]>({
            httpMethod: "GET",
            area: "testresults",
            locationId: "dff8ce3a-e539-4817-a405-d968491a88f1",
            resource: "testlog",
            routeTemplate: "{project}/_apis/{area}/{resource}",
            responseType: Contracts.TypeInfo.TestLog,
            responseIsCollection: true,
            routeValues: {
                project: project
            },
            customHeaders: {
                "x-ms-continuationtoken": continuationToken,
            },
            queryParams: queryValues,
            apiVersion: "5.0-preview.1"
        }).spread((results: Contracts.TestLog[], textStatus: string, jqXhr: JQueryXHR) => {
            return {
                results: results,
                continuationToken: jqXhr.getResponseHeader("x-ms-continuationtoken") as string /* should be string? */
                }
            });
    }

    /**
     * @internal
     * [Preview API]
     *
     * @param {string} project - Project ID or project name
     * @param {number} runId
     * @param {number} resultId
     * @param {Contracts.TestLogType} type
     * @param {string} directoryPath
     * @param {string} fileNamePrefix
     * @param {boolean} fetchMetaData
     * @param {number} top
     * @param {String} continuationToken - Header to pass the continuationToken
     * @return IPromise<Contracts.TestLog[]>
     */
    public getTestResultLogs(
        project: string,
        runId: number,
        resultId: number,
        type: Contracts.TestLogType,
        directoryPath?: string,
        fileNamePrefix?: string,
        fetchMetaData?: boolean,
        top?: number,
        continuationToken?: String
        ): IPromise<TCM_Types.ITestLogWithContinuationToken> {

        const queryValues: any = {
            type: type,
            directoryPath: directoryPath,
            fileNamePrefix: fileNamePrefix,
            fetchMetaData: fetchMetaData,
            top: top
        };

        return this._beginRequestWithAjaxResult<Contracts.TestLog[]>({
            httpMethod: "GET",
            area: "testresults",
            locationId: "714caaac-ae1e-4869-8323-9bc0f5120dbf",
            resource: "testlog",
            routeTemplate: "{project}/_apis/{area}/runs/{runId}/results/{resultId}/{resource}",
            responseType: Contracts.TypeInfo.TestLog,
            responseIsCollection: true,
            routeValues: {
                project: project,
                runId: runId,
                resultId: resultId
            },
            customHeaders: {
                "x-ms-continuationtoken": continuationToken,
            },
            queryParams: queryValues,
            apiVersion: "5.0-preview.1"
        }).spread((results: Contracts.TestLog[], textStatus: string, jqXhr: JQueryXHR) => {
            return {
                results: results,
                continuationToken: jqXhr.getResponseHeader("x-ms-continuationtoken") as string /* should be string? */
                }
            });
    }

    /**
     * @internal
     * [Preview API]
     *
     * @param {string} project - Project ID or project name
     * @param {number} runId
     * @param {number} resultId
     * @param {number} subResultId
     * @param {Contracts.TestLogType} type
     * @param {string} directoryPath
     * @param {string} fileNamePrefix
     * @param {boolean} fetchMetaData
     * @param {number} top
     * @param {String} continuationToken - Header to pass the continuationToken
     * @return IPromise<Contracts.TestLog[]>
     */
    public getTestSubResultLogs(
        project: string,
        runId: number,
        resultId: number,
        subResultId: number,
        type: Contracts.TestLogType,
        directoryPath?: string,
        fileNamePrefix?: string,
        fetchMetaData?: boolean,
        top?: number,
        continuationToken?: String
        ): IPromise<TCM_Types.ITestLogWithContinuationToken> {

        const queryValues: any = {
            subResultId: subResultId,
            type: type,
            directoryPath: directoryPath,
            fileNamePrefix: fileNamePrefix,
            fetchMetaData: fetchMetaData,
            top: top
        };

        return this._beginRequestWithAjaxResult<Contracts.TestLog[]>({
            httpMethod: "GET",
            area: "testresults",
            locationId: "714caaac-ae1e-4869-8323-9bc0f5120dbf",
            resource: "testlog",
            routeTemplate: "{project}/_apis/{area}/runs/{runId}/results/{resultId}/{resource}",
            responseType: Contracts.TypeInfo.TestLog,
            responseIsCollection: true,
            routeValues: {
                project: project,
                runId: runId,
                resultId: resultId
            },
            customHeaders: {
                "x-ms-continuationtoken": continuationToken,
            },
            queryParams: queryValues,
            apiVersion: "5.0-preview.1"
        }).spread((results: Contracts.TestLog[], textStatus: string, jqXhr: JQueryXHR) => {
            return {
                results: results,
                continuationToken: jqXhr.getResponseHeader("x-ms-continuationtoken") as string /* should be string? */
                }
            });
    }

    /**
     * @internal
     * [Preview API]
     *
     * @param {string} project - Project ID or project name
     * @param {number} runId
     * @param {Contracts.TestLogType} type
     * @param {string} directoryPath
     * @param {string} fileNamePrefix
     * @param {boolean} fetchMetaData
     * @param {number} top
     * @param {String} continuationToken - Header to pass the continuationToken
     * @return IPromise<Contracts.TestLog[]>
     */
    public getTestRunLogs(
        project: string,
        runId: number,
        type: Contracts.TestLogType,
        directoryPath?: string,
        fileNamePrefix?: string,
        fetchMetaData?: boolean,
        top?: number,
        continuationToken?: String
        ): IPromise<TCM_Types.ITestLogWithContinuationToken> {

        const queryValues: any = {
            type: type,
            directoryPath: directoryPath,
            fileNamePrefix: fileNamePrefix,
            fetchMetaData: fetchMetaData,
            top: top
        };

        return this._beginRequestWithAjaxResult<Contracts.TestLog[]>({
            httpMethod: "GET",
            area: "testresults",
            locationId: "5b47b946-e875-4c9a-acdc-2a20996caebe",
            resource: "testlog",
            routeTemplate: "{project}/_apis/{area}/runs/{runId}/{resource}",
            responseType: Contracts.TypeInfo.TestLog,
            responseIsCollection: true,
            routeValues: {
                project: project,
                runId: runId
            },
            customHeaders: {
                "x-ms-continuationtoken": continuationToken,
            },
            queryParams: queryValues,
            apiVersion: "5.0-preview.1"
        }).spread((results: Contracts.TestLog[], textStatus: string, jqXhr: JQueryXHR) => {
            return {
                results: results,
                continuationToken: jqXhr.getResponseHeader("x-ms-continuationtoken") as string /* should be string? */
                }
            });
    }

    /**
     * @internal
     * [Preview API]
     *
     * @param {string} project - Project ID or project name
     * @param {number} build
     * @param {Contracts.TestLogType} type
     * @param {string} filePath
     * @return IPromise<Contracts.TestLogStoreEndpointDetails>
     */
    public getTestLogStoreEndpointDetailsForBuildLog(
        project: string,
        build: number,
        type: Contracts.TestLogType,
        filePath: string
        ): IPromise<Contracts.TestLogStoreEndpointDetails> {

        const queryValues: any = {
            build: build,
            type: type,
            filePath: filePath
        };

        return this._beginRequest<Contracts.TestLogStoreEndpointDetails>({
            httpMethod: "GET",
            area: "testresults",
            locationId: "39b09be7-f0c9-4a83-a513-9ae31b45c56f",
            resource: "testlogstoreendpoint",
            routeTemplate: "{project}/_apis/testresults/{resource}",
            responseType: Contracts.TypeInfo.TestLogStoreEndpointDetails,
            routeValues: {
                project: project
            },
            queryParams: queryValues,
            apiVersion: "5.0-preview.1"
        });
    }

    /**
     * @internal
     * [Preview API]
     *
     * @param {string} project - Project ID or project name
     * @param {number} buildId
     * @param {Contracts.TestLogStoreOperationType} testLogStoreOperationType
     * @return IPromise<Contracts.TestLogStoreEndpointDetails>
     */
    public testLogStoreEndpointDetailsForBuild(
        project: string,
        buildId: number,
        testLogStoreOperationType: Contracts.TestLogStoreOperationType
        ): IPromise<Contracts.TestLogStoreEndpointDetails> {

        const queryValues: any = {
            buildId: buildId,
            testLogStoreOperationType: testLogStoreOperationType
        };

        return this._beginRequest<Contracts.TestLogStoreEndpointDetails>({
            httpMethod: "POST",
            area: "testresults",
            locationId: "39b09be7-f0c9-4a83-a513-9ae31b45c56f",
            resource: "testlogstoreendpoint",
            routeTemplate: "{project}/_apis/testresults/{resource}",
            responseType: Contracts.TypeInfo.TestLogStoreEndpointDetails,
            routeValues: {
                project: project
            },
            queryParams: queryValues,
            apiVersion: "5.0-preview.1"
        });
    }

    /**
     * @internal
     * [Preview API]
     *
     * @param {string} project - Project ID or project name
     * @param {number} runId
     * @param {number} resultId
     * @param {Contracts.TestLogType} type
     * @param {string} filePath
     * @return IPromise<Contracts.TestLogStoreEndpointDetails>
     */
    public getTestLogStoreEndpointDetailsForResultLog(
        project: string,
        runId: number,
        resultId: number,
        type: Contracts.TestLogType,
        filePath: string
        ): IPromise<Contracts.TestLogStoreEndpointDetails> {

        const queryValues: any = {
            type: type,
            filePath: filePath
        };

        return this._beginRequest<Contracts.TestLogStoreEndpointDetails>({
            httpMethod: "GET",
            area: "testresults",
            locationId: "da630b37-1236-45b5-945e-1d7bdb673850",
            resource: "testlogstoreendpoint",
            routeTemplate: "{project}/_apis/{area}/runs/{runId}/results/{resultId}/{resource}",
            responseType: Contracts.TypeInfo.TestLogStoreEndpointDetails,
            routeValues: {
                project: project,
                runId: runId,
                resultId: resultId
            },
            queryParams: queryValues,
            apiVersion: "5.0-preview.1"
        });
    }

    /**
     * @internal
     * [Preview API]
     *
     * @param {string} project - Project ID or project name
     * @param {number} runId
     * @param {number} resultId
     * @param {number} subResultId
     * @param {Contracts.TestLogType} type
     * @param {string} filePath
     * @return IPromise<Contracts.TestLogStoreEndpointDetails>
     */
    public getTestLogStoreEndpointDetailsForSubResultLog(
        project: string,
        runId: number,
        resultId: number,
        subResultId: number,
        type: Contracts.TestLogType,
        filePath: string
        ): IPromise<Contracts.TestLogStoreEndpointDetails> {

        const queryValues: any = {
            subResultId: subResultId,
            type: type,
            filePath: filePath
        };

        return this._beginRequest<Contracts.TestLogStoreEndpointDetails>({
            httpMethod: "GET",
            area: "testresults",
            locationId: "da630b37-1236-45b5-945e-1d7bdb673850",
            resource: "testlogstoreendpoint",
            routeTemplate: "{project}/_apis/{area}/runs/{runId}/results/{resultId}/{resource}",
            responseType: Contracts.TypeInfo.TestLogStoreEndpointDetails,
            routeValues: {
                project: project,
                runId: runId,
                resultId: resultId
            },
            queryParams: queryValues,
            apiVersion: "5.0-preview.1"
        });
    }

    /**
     * @internal
     * [Preview API]
     *
     * @param {string} project - Project ID or project name
     * @param {number} runId
     * @param {Contracts.TestLogType} type
     * @param {string} filePath
     * @return IPromise<Contracts.TestLogStoreEndpointDetails>
     */
    public getTestLogStoreEndpointDetailsForRunLog(
        project: string,
        runId: number,
        type: Contracts.TestLogType,
        filePath: string
        ): IPromise<Contracts.TestLogStoreEndpointDetails> {

        const queryValues: any = {
            type: type,
            filePath: filePath
        };

        return this._beginRequest<Contracts.TestLogStoreEndpointDetails>({
            httpMethod: "GET",
            area: "testresults",
            locationId: "67eb3f92-6c97-4fd9-8b63-6cbdc7e526ea",
            resource: "testlogstoreendpoint",
            routeTemplate: "{project}/_apis/{area}/runs/{runId}/{resource}",
            responseType: Contracts.TypeInfo.TestLogStoreEndpointDetails,
            routeValues: {
                project: project,
                runId: runId
            },
            queryParams: queryValues,
            apiVersion: "5.0-preview.1"
        });
    }

    /**
     * @internal
     * [Preview API]
     *
     * @param {string} project - Project ID or project name
     * @param {number} runId
     * @param {Contracts.TestLogStoreOperationType} testLogStoreOperationType
     * @return IPromise<Contracts.TestLogStoreEndpointDetails>
     */
    public testLogStoreEndpointDetailsForRun(
        project: string,
        runId: number,
        testLogStoreOperationType: Contracts.TestLogStoreOperationType
        ): IPromise<Contracts.TestLogStoreEndpointDetails> {

        const queryValues: any = {
            testLogStoreOperationType: testLogStoreOperationType
        };

        return this._beginRequest<Contracts.TestLogStoreEndpointDetails>({
            httpMethod: "POST",
            area: "testresults",
            locationId: "67eb3f92-6c97-4fd9-8b63-6cbdc7e526ea",
            resource: "testlogstoreendpoint",
            routeTemplate: "{project}/_apis/{area}/runs/{runId}/{resource}",
            responseType: Contracts.TypeInfo.TestLogStoreEndpointDetails,
            routeValues: {
                project: project,
                runId: runId
            },
            queryParams: queryValues,
            apiVersion: "5.0-preview.1"
        });
    }
}