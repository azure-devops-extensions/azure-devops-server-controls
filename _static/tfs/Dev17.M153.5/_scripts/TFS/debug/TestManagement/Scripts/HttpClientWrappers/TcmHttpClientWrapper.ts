import { ITestCaseResultsWithContinuationToken, ITestResultsFieldDetailsWithContinuationToken } from "TestManagement/Scripts/TFS.TestManagement.Types";
import { ShallowTestCaseResult, FieldDetailsForTestResults, TestResultsGroupsForRelease, TestResultsGroupsForBuild } from "TFS/TestManagement/Contracts";
import { TcmHttpClient } from "TFS/TestManagement/VSS.Tcm.WebApi";

export class TcmHttpClientWrapper extends TcmHttpClient {
    /**
     * [Preview API]
     *
     * @param {string} project - Project ID or project name
     * @param {number} buildId
     * @param {string} publishContext
     * @param {number} top
     * @param {string} continuationToken
     * @return IPromise<Contracts.ITestCaseResultsWithContinuationToken[]>
     */
    public getTestResultsByBuildWithContinuationToken(
        project: string,
        buildId: number,
        publishContext?: string,
        top?: number,
        continuationToken?: string
    ): IPromise<ITestCaseResultsWithContinuationToken> {

        const queryValues: IDictionaryStringTo<any> = {
            buildId: buildId,
            publishContext: publishContext,
            "$top": top,
            continuationToken: continuationToken
        };

        return this._beginRequestWithAjaxResult<ShallowTestCaseResult[]>({
            httpMethod: "GET",
            area: "tcm",
            locationId: "DC342339-9BF3-480F-8C41-A867CAF3CD1E",
            resource: "ResultsByBuild",
            routeTemplate: "{project}/_apis/tcm/{resource}",
            responseIsCollection: true,
            routeValues: {
                project: project
            },
            queryParams: queryValues,
            apiVersion: "4.1-preview.1"
        }).spread((results: ShallowTestCaseResult[], textStatus: string, jqXhr: JQueryXHR) => {
            return {
                results: results,
                continuationToken: jqXhr.getResponseHeader("x-ms-continuationtoken")
            };
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} project - Project ID or project name
     * @param {number} releaseId
     * @param {number} releaseEnvid
     * @param {string} publishContext
     * @param {number} top
     * @param {string} continuationToken
     * @return IPromise<Contracts.ITestCaseResultsWithContinuationToken[]>
     */
    public getTestResultsByReleaseWithContinuationToken(
        project: string,
        releaseId: number,
        releaseEnvid?: number,
        publishContext?: string,
        top?: number,
        continuationToken?: string
    ): IPromise<ITestCaseResultsWithContinuationToken> {

        const queryValues: IDictionaryStringTo<any> = {
            releaseId: releaseId,
            releaseEnvid: releaseEnvid,
            publishContext: publishContext,
            "$top": top,
            continuationToken: continuationToken
        };

        return this._beginRequestWithAjaxResult<ShallowTestCaseResult[]>({
            httpMethod: "GET",
            area: "tcm",
            locationId: "8FC27F1B-12DB-4C69-BF06-7EC026688C2D",
            resource: "ResultsByRelease",
            routeTemplate: "{project}/_apis/tcm/{resource}",
            responseIsCollection: true,
            routeValues: {
                project: project
            },
            queryParams: queryValues,
            apiVersion: "4.1-preview.1"
        }).spread((results: ShallowTestCaseResult[], textStatus: string, jqXhr: JQueryXHR) => {
            return {
                results: results,
                continuationToken: jqXhr.getResponseHeader("x-ms-continuationtoken")
            };
        });
    }

    /**
     * @internal
     * [Preview API]
     *
     * @param {string} project - Project ID or project name
     * @param {number} buildId
     * @param {string} publishContext
     * @param {string[]} fields
     * @param {string} continuationToken
     * @return IPromise<TCM_Types.ITestResultsFieldDetailsWithContinuationToken[]>
     */
	public getResultGroupsByBuildWithContinuationToken(
		project: string,
		buildId: number,
		publishContext: string,
		fields?: string[],
		continuationToken?: string
	): IPromise<ITestResultsFieldDetailsWithContinuationToken> {

		const queryValues: any = {
			buildId: buildId,
			publishContext: publishContext,
			fields: fields && fields.join(","),
			continuationToken: continuationToken
		};

		return this._beginRequestWithAjaxResult<FieldDetailsForTestResults[]>({
			httpMethod: "GET",
			area: "tcm",
			locationId: "af70663f-e385-4d73-9d59-3f44a5d9e066",
			resource: "ResultGroupsByBuild",
			routeTemplate: "{project}/_apis/tcm/{resource}",
			responseIsCollection: true,
			routeValues: {
				project: project
			},
			queryParams: queryValues,
			apiVersion: "5.0-preview.2"
		}).spread((fieldDetails: FieldDetailsForTestResults[], textStatus: string, jqXhr: JQueryXHR) => {
			return {
				fieldDetails: fieldDetails,
				continuationToken: jqXhr.getResponseHeader("x-ms-continuationtoken") as string /* should be string? */
			};
		});
    }
    
    /**
     * @internal
     * [Preview API]
     *
     * @param {string} project - Project ID or project name
     * @param {number} buildId
     * @param {string} publishContext
     * @param {string[]} fields
     * @param {string} continuationToken
     * @return IPromise<TCM_Types.ITestResultsFieldDetailsWithContinuationToken[]>
     */
	public getResultGroupsByBuildV1(
		project: string,
		buildId: number,
		publishContext: string,
		fields?: string[]
	): IPromise<TestResultsGroupsForBuild> {

		const queryValues: any = {
            buildId: buildId,
            publishContext: publishContext,
            fields: fields && fields.join(",")
        };

        return this._beginRequest<TestResultsGroupsForBuild>({
            httpMethod: "GET",
            area: "tcm",
			locationId: "af70663f-e385-4d73-9d59-3f44a5d9e066",
            resource: "ResultGroupsByBuild",
			routeTemplate: "{project}/_apis/tcm/{resource}",
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
     * @param {number} releaseId
     * @param {string} publishContext
     * @param {number} releaseEnvId
     * @param {string[]} fields
     * @param {string} continuationToken
     * @return IPromise<TCM_Types.ITestResultsFieldDetailsWithContinuationToken>
     */
	public getResultGroupsByReleaseV1(
		project: string,
		releaseId: number,
		publishContext: string,
		releaseEnvId?: number,
		fields?: string[]
	): IPromise<TestResultsGroupsForRelease> {

		const queryValues: any = {
			releaseId: releaseId,
			publishContext: publishContext,
			releaseEnvId: releaseEnvId,
			fields: fields && fields.join(",")
		};

		return this._beginRequest<TestResultsGroupsForRelease>({
			httpMethod: "GET",
			area: "tcm",
			locationId: "5e746c5c-4fb7-46f7-bc6c-913110a98fbf",
			resource: "ResultGroupsByRelease",
			routeTemplate: "{project}/_apis/tcm/{resource}",
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
     * @param {number} releaseId
     * @param {string} publishContext
     * @param {number} releaseEnvId
     * @param {string[]} fields
     * @param {string} continuationToken
     * @return IPromise<TCM_Types.ITestResultsFieldDetailsWithContinuationToken>
     */
	public getResultGroupsByReleaseWithContinuationToken(
		project: string,
		releaseId: number,
		publishContext: string,
		releaseEnvId?: number,
		fields?: string[],
		continuationToken?: string
	): IPromise<ITestResultsFieldDetailsWithContinuationToken> {

		const queryValues: any = {
			releaseId: releaseId,
			publishContext: publishContext,
			releaseEnvId: releaseEnvId,
			fields: fields && fields.join(","),
			continuationToken: continuationToken
		};

		return this._beginRequestWithAjaxResult<FieldDetailsForTestResults[]>({
			httpMethod: "GET",
			area: "tcm",
			locationId: "5e746c5c-4fb7-46f7-bc6c-913110a98fbf",
			resource: "ResultGroupsByRelease",
			routeTemplate: "{project}/_apis/tcm/{resource}",
			responseIsCollection: true,
			routeValues: {
				project: project
			},
			queryParams: queryValues,
			apiVersion: "5.0-preview.2"
		}).spread((fieldDetails: FieldDetailsForTestResults[], textStatus: string, jqXhr: JQueryXHR) => {
			return {
				fieldDetails: fieldDetails,
				continuationToken: jqXhr.getResponseHeader("x-ms-continuationtoken") as string /* should be string? */
			};
		});
	}
}