
import Q = require("q");

import TCMCommon = require("TestManagement/Scripts/Generated/TFS.TestManagement.Common");
import TCM_Types = require("TestManagement/Scripts/TFS.TestManagement.Types");
import TCMContracts = require("TFS/TestManagement/Contracts");
import TCM_Client = require("TFS/TestManagement/RestClient");

import Utils_Array = require("VSS/Utils/Array");

export class TestManagementHttpClient extends TCM_Client.TestHttpClient {

    constructor(rootRequestPath: string) {
        super(rootRequestPath);
    }

    public beginGetTestPlan(projectName: string, planId: number): IPromise<any> {
        return this._beginRequest({
            area: TCMCommon.TestManagementResourceIds.AreaName,
            locationId: TCMCommon.TestManagementResourceIds.TestPlan,
            responseType: TCMContracts.TypeInfo.TestPlan,
            responseIsCollection: false,
            routeValues: {
                projectId: projectName,
                planId: planId
            }
        });
    }

    public getSuitesForPlan(projectName: string, planId: number): IPromise<any> {
        return this._beginRequest({
            area: TCMCommon.TestManagementResourceIds.AreaName,
            locationId: TCMCommon.TestManagementResourceIds.TestSuite,
            responseType: TCMContracts.TypeInfo.TestSuite,
            responseIsCollection: false,
            routeValues: {
                projectId: projectName,
                planId: planId
            }
        });
    }

    public getPointsForSuite(projectName: string, planId: number, suiteId: number): IPromise<any> {
        return this._beginRequest({
            area: TCMCommon.TestManagementResourceIds.AreaName,
            locationId: TCMCommon.TestManagementResourceIds.TestPoint,
            responseType: TCMContracts.TypeInfo.TestPoint,
            responseIsCollection: true,
            routeValues: {
                projectId: projectName,
                planId: planId,
                suiteId: suiteId
            }
        });
    }

    public getSuite(projectName: string, planId: number, suiteId: number): IPromise<any> {
       return this._beginRequest({
           area: TCMCommon.TestManagementResourceIds.AreaName,
           locationId: TCMCommon.TestManagementResourceIds.TestSuite,
           responseType: TCMContracts.TypeInfo.TestSuite,
           responseIsCollection: false,
           routeValues: {
               projectId: projectName,
               planId: planId,
               suiteId: suiteId
           }
       });
    }

    public getSuitesForTestCase(testCaseId: number): IPromise<any> {
        return this._beginRequest({
            area: TCMCommon.TestManagementResourceIds.AreaName,
            locationId: "09a6167b-e969-4775-9247-b94cf3819caf",
            responseType: TCMContracts.TypeInfo.TestSuite,
            responseIsCollection: true,
            data: {
                testCaseId: testCaseId
            }
        });
    }

    /**
 * @param {string} project - Project ID or project name
 * @param {number} planId
 * @return IPromise<void>
 */
    public deleteTestPlan(
        project: string,
        planId: number
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "Test",
            locationId: "51712106-7278-4208-8563-1c96f40cf5e4",
            resource: "Plans",
            routeTemplate: "{project}/_apis/test/{resource}/{planId}",
            responseIsCollection: false,
            routeValues: {
                project: project,
                planId: planId,
            },
            apiVersion: "2.2-preview.2"
        });
    }

    /**
     * @exemptedapi
     * [Preview API]
     *
     * @param {string} project - Project ID or project name
     * @param {number} skip
     * @param {number} top
     * @param {string} continuationToken
     * @param {boolean} includeAllProperties
     * @return IPromise<Contracts.TestConfiguration[]>
     */
    public getTestConfigurations(
        project: string,
        skip?: number,
        top?: number,
        continuationToken?: string,
        includeAllProperties?: boolean
    ): IPromise<TCMContracts.TestConfiguration[]> {

        let queryValues: any = {
            "$skip": skip,
            "$top": top,
            continuationToken: continuationToken,
            includeAllProperties: includeAllProperties,
        };

        let that = this;
        return this._beginRequestWithAjaxResult<TCMContracts.TestConfiguration[]>({
            httpMethod: "GET",
            area: "Test",
            locationId: "d667591b-b9fd-4263-997a-9a084cca848f",
            resource: "Configurations",
            routeTemplate: "{project}/_apis/test/{resource}/{testConfigurationId}",
            responseType: TCMContracts.TypeInfo.TestConfiguration,
            responseIsCollection: true,
            routeValues: {
                project: project,
            },
            queryParams: queryValues,
            apiVersion: this.configurationsApiVersion
        }).spread((testConfigurations: TCMContracts.TestConfiguration[], textStatus: string, jqXhr: JQueryXHR) => {

            let continuationToken = jqXhr.getResponseHeader("x-ms-continuationtoken");
            if (testConfigurations && continuationToken) {
                return that.getTestConfigurations(project, skip, top, continuationToken, includeAllProperties)
                    .then((result: TCMContracts.TestConfiguration[]) => {
                        Utils_Array.addRange(testConfigurations, result);
                        return Q(testConfigurations);
                    });
            } else {
                return Q(testConfigurations);
            }
        });
    }

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
    ): IPromise<TCM_Types.ITestCaseResultsWithContinuationToken> {

        const queryValues: any = {
            buildId: buildId,
            publishContext: publishContext,
            "$top": top,
            continuationToken: continuationToken
        };

        return this._beginRequestWithAjaxResult<TCMContracts.ShallowTestCaseResult[]>({
            httpMethod: "GET",
            area: "Test",
            locationId: "3c191b88-615b-4be2-b7d9-5ff9141e91d4",
            resource: "ResultsByBuild",
            routeTemplate: "{project}/_apis/test/{resource}",
            responseIsCollection: true,
            routeValues: {
                project: project
            },
            queryParams: queryValues,
            apiVersion: "4.1-preview.1"
        }).spread((results: TCMContracts.ShallowTestCaseResult[], textStatus: string, jqXhr: JQueryXHR) => {
            return {
                results: results,
                continuationToken: jqXhr.getResponseHeader("x-ms-continuationtoken") as string /* should be string? */
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
    ): IPromise<TCM_Types.ITestCaseResultsWithContinuationToken> {

        const queryValues: any = {
            releaseId: releaseId,
            releaseEnvid: releaseEnvid,
            publishContext: publishContext,
            "$top": top,
            continuationToken: continuationToken
        };

        return this._beginRequestWithAjaxResult<TCMContracts.ShallowTestCaseResult[]>({
            httpMethod: "GET",
            area: "Test",
            locationId: "ce01820b-83f3-4c15-a583-697a43292c4e",
            resource: "ResultsByRelease",
            routeTemplate: "{project}/_apis/test/{resource}",
            responseIsCollection: true,
            routeValues: {
                project: project
            },
            queryParams: queryValues,
            apiVersion: "4.1-preview.1"
        }).spread((results: TCMContracts.ShallowTestCaseResult[], textStatus: string, jqXhr: JQueryXHR) => {
            return {
                results: results,
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
	public getResultGroupsByBuildWithContinuationToken(
		project: string,
		buildId: number,
		publishContext: string,
		fields?: string[],
		continuationToken?: string
	): IPromise<TCM_Types.ITestResultsFieldDetailsWithContinuationToken> {

		const queryValues: any = {
			buildId: buildId,
			publishContext: publishContext,
			fields: fields && fields.join(","),
			continuationToken: continuationToken
		};

		return this._beginRequestWithAjaxResult<TCMContracts.FieldDetailsForTestResults[]>({
			httpMethod: "GET",
			area: "Test",
			locationId: "d279d052-c55a-4204-b913-42f733b52958",
			resource: "ResultGroupsByBuild",
			routeTemplate: "{project}/_apis/test/{resource}",
			responseIsCollection: true,
			routeValues: {
				project: project
			},
			queryParams: queryValues,
			apiVersion: "5.0-preview.2"
		}).spread((fieldDetails: TCMContracts.FieldDetailsForTestResults[], textStatus: string, jqXhr: JQueryXHR) => {
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
	): IPromise<TCM_Types.ITestResultsFieldDetailsWithContinuationToken> {

		const queryValues: any = {
			releaseId: releaseId,
			publishContext: publishContext,
			releaseEnvId: releaseEnvId,
			fields: fields && fields.join(","),
			continuationToken: continuationToken
		};

		return this._beginRequestWithAjaxResult<TCMContracts.FieldDetailsForTestResults[]>({
			httpMethod: "GET",
			area: "Test",
			locationId: "ef5ce5d4-a4e5-47ee-804c-354518f8d03f",
			resource: "ResultGroupsByRelease",
			routeTemplate: "{project}/_apis/test/{resource}",
			responseIsCollection: true,
			routeValues: {
				project: project
			},
			queryParams: queryValues,
			apiVersion: "5.0-preview.2"
		}).spread((fieldDetails: TCMContracts.FieldDetailsForTestResults[], textStatus: string, jqXhr: JQueryXHR) => {
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
		fields?: string[],
		continuationToken?: string
	): IPromise<TCMContracts.TestResultsGroupsForBuild> {

		const queryValues: any = {
            buildId: buildId,
            publishContext: publishContext,
            fields: fields && fields.join(",")
        };

        return this._beginRequest<TCMContracts.TestResultsGroupsForBuild>({
            httpMethod: "GET",
            area: "Test",
            locationId: "d279d052-c55a-4204-b913-42f733b52958",
            resource: "ResultGroupsByBuild",
            routeTemplate: "{project}/_apis/test/{resource}",
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
	): IPromise<TCMContracts.TestResultsGroupsForRelease> {

		const queryValues: any = {
            releaseId: releaseId,
            publishContext: publishContext,
            releaseEnvId: releaseEnvId,
            fields: fields && fields.join(",")
        };

        return this._beginRequest<TCMContracts.TestResultsGroupsForRelease>({
            httpMethod: "GET",
            area: "Test",
            locationId: "ef5ce5d4-a4e5-47ee-804c-354518f8d03f",
            resource: "ResultGroupsByRelease",
            routeTemplate: "{project}/_apis/test/{resource}",
            routeValues: {
                project: project
            },
            queryParams: queryValues,
            apiVersion: "5.0-preview.1"
        });	}
}

export interface ITestPlanDetails {
    name: string;
    areaPath: string;
    iteration: string;
    startDate: Date;
    endDate: Date;
    owner: number;
}
