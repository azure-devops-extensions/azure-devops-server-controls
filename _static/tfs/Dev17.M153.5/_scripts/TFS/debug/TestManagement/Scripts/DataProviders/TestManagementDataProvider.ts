import * as LinkedArtifacts from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import * as DataProvider from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/DataProvider/DataProvider";
import PresentationResource = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import * as Q from "q";
import TCMResources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import ResultHistoryCommon = require("TestManagement/Scripts/TestReporting/TestResultHistory/Common");
import { ITestResultsService, ServiceManager as TMServiceManager } from "TestManagement/Scripts/TFS.TestManagement.Service";
import TCMHandler = require("TestManagement/Scripts/TFS.TestManagement.TestManagementHandler");
import TCMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");
import { UriHelper } from "TestManagement/Scripts/TFS.TestManagement";
import TCMContracts = require("TFS/TestManagement/Contracts");
import { ArtifactIconType, ILinkedArtifact, ILinkedArtifactAdditionalData } from "TFS/WorkItemTracking/ExtensionContracts";
import Artifacts_Constants = require("VSS/Artifacts/Constants");
import Diag = require("VSS/Diag");
import * as UserClaimsService from "VSS/User/Services";
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import { getService } from "VSS/Service";
import { FeatureManagementService } from "VSS/FeatureManagement/Services";
import { TestManagementMigrationService } from "TestManagement/Scripts/TestManagementMigrationService";

export interface IParam {
    parameter: string;
    value: string;
}

export default class TestManagementDataProvider implements DataProvider.ILinkedArtifactsDataProvider {
    private static testResultIconClass: string = "bowtie-test-fill";
    private static testCaseRefIconClass: string = "bowtie-test-fill";
    
    /** Tool the plugin supports e.g. git, build, workitemtracking */
    public supportedTool: string;

    /** Called for retrieving artifact data
     * @param artifacts Raw artifacts
     * @param columns Set of columns to return data for
     * @param tfsContext The current tfs context (this can be used to generate correct href etc with the current team)
     * @param hostArtifact The host artifact, it will be falsy when the host artifact is new (e.g. New Work Item)
     * @returns Display data needed for rendering etc.
    */
    public beginGetDisplayData(
        artifacts: ILinkedArtifact[],
        columns: LinkedArtifacts.IColumn[],
        tfsContext: TFS_Host_TfsContext.TfsContext,
        hostArtifact?: LinkedArtifacts.IHostArtifact): IPromise<LinkedArtifacts.IInternalLinkedArtifactDisplayData[]> {

        let data: LinkedArtifacts.IInternalLinkedArtifactDisplayData;
        let artifactMap: IDictionaryStringTo<ILinkedArtifact> = {};
        let resultArtifactResolvedStateMap: IDictionaryStringTo<boolean> = {};
        let testCaseRefArtifactResolvedStateMap: IDictionaryStringTo<boolean> = {};
        
        // Note: The following are the default TestResultProperties
        // Some Fields are commented out since we do not need them currently
        let query: TCMContracts.TestResultsQuery = {
            fields: [
                "TestRunId",
                "TestResultId",
                "State",
                "Outcome",
                "LastUpdated",
                "Owner",
                "TestCaseTitle",
                "AutomatedTestType",
                "LastUpdatedBy",
                "BuildReference",
                "ReleaseReference"
            ], results: [], resultsFilter: undefined };        

        // So this is going to be an array of Artifacts that need to be resolved using the old 'ResolveArtifacts' mvc endpoint
        // Artifacts in here will be either Session Links or Attachment Links
        let artifactsToResolveViaMvcArtifactHandler: ILinkedArtifact[] = [];
        for (let artifact of artifacts) {
            if (Utils_String.equals(artifact.type, Artifacts_Constants.ArtifactTypeNames.TcmResult, true)) {
                let ids: string[] = artifact.id.split(".");
                if (ids.length === 2) {
                    let runId: string = ids[0];
                    let resultId: number = parseInt(ids[1]);
                    artifactMap[artifact.id] = artifact;
                    resultArtifactResolvedStateMap[artifact.id] = false;
                    query.results.push(<TCMContracts.TestCaseResult>{ id: resultId, testRun: <TCMContracts.ShallowReference>{ id: runId } });
                }
                else if (ids.length === 1) {
                    // If there is only 1 id, that means it's a session link. Sessions do not have a test run associated with it.
                    artifactsToResolveViaMvcArtifactHandler.push(artifact);
                }
            }
            else if (Utils_String.equals(artifact.type, Artifacts_Constants.ArtifactTypeNames.TcmResultAttachment, true)) {
                artifactsToResolveViaMvcArtifactHandler.push(artifact);
            }
            else if (Utils_String.equals(artifact.type, Artifacts_Constants.ArtifactTypeNames.TcmTest, true)) {
                artifactMap[artifact.id] = artifact;
                testCaseRefArtifactResolvedStateMap[artifact.id] = false;
            }
        } 

        let deferred = Q.defer<LinkedArtifacts.IInternalLinkedArtifactDisplayData[]>();
        let testCaserefDeferred = Q.defer<LinkedArtifacts.IInternalLinkedArtifactDisplayData[]>();
        let promises: IPromise<LinkedArtifacts.IInternalLinkedArtifactDisplayData[]>[] = [];

        if (query.results.length > 0) {
            let service: ITestResultsService = TMServiceManager.instance().testResultsService();
            promises.push(service.getTestResultsByQuery(query).then(
                (queryResults: TCMContracts.TestResultsQuery) => {

                    let displayData: LinkedArtifacts.IInternalLinkedArtifactDisplayData[] = [];
                    let results: TCMContracts.TestCaseResult[] = queryResults.results;

                    for (let result of results) {
                        let artifactId: string = this._getTestResultArtifactIdentifier(result);
                        resultArtifactResolvedStateMap[artifactId] = true;
                        if (artifactMap[artifactId]) {
                            //Process test result links.
                            data = $.extend({}, artifactMap[artifactId]);
                            data.primaryData = this._getPrimaryData(artifactMap[artifactId], tfsContext, result);
                            data.additionalData = this._getAdditionalData(result);
                            displayData.push(data);

                            //Process test case ref links.
                            if (result.testCaseReferenceId > 0 && artifactMap[result.testCaseReferenceId] && !testCaseRefArtifactResolvedStateMap[result.testCaseReferenceId]) {
                                let testCaseRefArtifact: ILinkedArtifact = artifactMap[result.testCaseReferenceId];
                                testCaseRefArtifactResolvedStateMap[result.testCaseReferenceId] = true;

                                data = $.extend({}, testCaseRefArtifact);
                                this._populateArtifactDisplayDataForTestCaseRef(data, result.testCaseTitle, testCaseRefArtifact.linkTypeDisplayName,
                                    this._getTestHistoryUrl(result));

                                displayData.push(data);
                            }
                        }
                        else {
                            Diag.Debug.fail("Unexpected Test Result was returned to the TestManagementDataProvider");
                        }
                    }

                    //Populate remaining test case ref links for which there is no test result link.
                    this._populateDefaultTestCaseRefLinks(tfsContext, artifactMap, testCaseRefArtifactResolvedStateMap, testCaserefDeferred);

                    return displayData.concat(this._processLinkResolution(artifactMap, resultArtifactResolvedStateMap));
                },
                (error) => {
                    Diag.logError(`An error occurred in resolving test results link by API. Error: ${(error.message || error)}`);

                    //Populate remaining test case ref links as there is error in fetching results.
                    this._populateDefaultTestCaseRefLinks(tfsContext, artifactMap, testCaseRefArtifactResolvedStateMap, testCaserefDeferred);

                    return this._processLinkResolution(artifactMap, resultArtifactResolvedStateMap);
                })
            );
        }
        else {
            //When no results then do default population of test case ref links
            this._populateDefaultTestCaseRefLinks(tfsContext, artifactMap, testCaseRefArtifactResolvedStateMap, testCaserefDeferred);
        }
			
        //Add test case ref links resolution deferred promise.        
        promises.push(testCaserefDeferred.promise);
           

        if (artifactsToResolveViaMvcArtifactHandler.length > 0) {
            promises.push(deferred.promise);
            if (!this._isMember()) {
                let displayData: LinkedArtifacts.IInternalLinkedArtifactDisplayData[] = [];

                for (let artifact of artifactsToResolveViaMvcArtifactHandler) {
                    displayData.push(this._getErrorDisplayData(artifact));
                }

                deferred.resolve(displayData);
            }
            else {
                TCMHandler.TestManagementArtifactHandler.beginResolve(
                    artifactsToResolveViaMvcArtifactHandler,
                    null,
                    (tcmArtifacts: { artifacts: TCMHandler.TestResultArtifact[], success: boolean }) => {
                        let linkedArtifact: ILinkedArtifact;
                        let displayData: LinkedArtifacts.IInternalLinkedArtifactDisplayData[] = [];
                        for (let artifact of tcmArtifacts.artifacts) {
                            linkedArtifact = artifact._data;
                            data = $.extend({}, linkedArtifact);

                            if (Utils_String.ignoreCaseComparer(linkedArtifact.type, Artifacts_Constants.ArtifactTypeNames.TcmResultAttachment) === 0) {
                                data.primaryData = {
                                    href: artifact.getUrl(tfsContext.contextData),
                                    title: artifact.getTitle(),
                                    typeIcon: { type: ArtifactIconType.icon, title: linkedArtifact.linkTypeDisplayName, descriptor: "bowtie-attach" }
                                };
                            }
                            else {
                                data.primaryData = {
                                    href: UriHelper.getTestResultUri(0, 0, parseInt(artifact.getId())),
                                    title: artifact.getTitle(),
                                    typeIcon: { type: ArtifactIconType.icon, title: linkedArtifact.linkTypeDisplayName, descriptor: TestManagementDataProvider.testResultIconClass },
                                };
                            }

                            displayData.push(data);
                        }

                        deferred.resolve(displayData);
                    },
                    () => {
                        let displayData: LinkedArtifacts.IInternalLinkedArtifactDisplayData[] = [];

                        for (let artifact of artifactsToResolveViaMvcArtifactHandler) {
                            displayData.push(this._getErrorDisplayData(artifact));
                        }

                        deferred.resolve(displayData);
                    });
            }
        }        

        return Q.all(promises).then(data => data.reduce((a, b) => a.concat(b), []));
    }

    /** Resolve artifact type to category display name
      * @param artifactType Type of artifact to resolve
      * @returns Display name for category
      */
    public getArtifactTypeDisplayString(artifactType: string): string {
        return artifactType;
    }

    private _populateDefaultTestCaseRefLinks(tfsContext: TFS_Host_TfsContext.TfsContext,
        artifactMap: IDictionaryStringTo<ILinkedArtifact>,
        testCaseRefArtifactResolvedStateMap: IDictionaryStringTo<boolean>,
        testCaseRefDeferred: Q.Deferred<LinkedArtifacts.IInternalLinkedArtifactDisplayData[]>): void {
        
        let service: ITestResultsService = TMServiceManager.instance().testResultsService();
        let isQueryTestCaseRefInfoFFEnabled = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isQueryTestCaseRefInfoInWorkItemLinksIndependentlyEnabled();
        
        const { refsInTfs, refsInTcm } = TestManagementDataProvider._partitionTestCaseReferencesByService(testCaseRefArtifactResolvedStateMap);

        if (isQueryTestCaseRefInfoFFEnabled && refsInTcm.length + refsInTfs.length > 0) {
            const resultByQueryPromises = TestManagementDataProvider
                ._generateTestResultsQueries(refsInTcm, refsInTfs)
                .map(query => service.getTestResultsByQuery(query));
            
            Promise
                .all(resultByQueryPromises)
                .then((responses: TCMContracts.TestResultsQuery[]) => {
                    responses.forEach(queryResults => {
                        let refToResultMap: IDictionaryNumberTo<TCMContracts.TestCaseResult> = {};

                        if (queryResults && queryResults.results && queryResults.results.length > 0) {
                            queryResults.results.forEach(r => refToResultMap[r.testCaseReferenceId] = r);                        
                        }
    
                        let dataList: LinkedArtifacts.IInternalLinkedArtifactDisplayData[] = [];
                        const service = queryResults.resultsFilter.executedIn;
                        queryResults.resultsFilter.testCaseReferenceIds.forEach(tcRefId => {
                            let testCaseRefArtifact: ILinkedArtifact = artifactMap[getService(TestManagementMigrationService).getEncodedRefId(service, tcRefId)];
                            let data: LinkedArtifacts.IInternalLinkedArtifactDisplayData = $.extend({}, testCaseRefArtifact);
    
                            if (refToResultMap[tcRefId]) {
                                this._populateArtifactDisplayDataForTestCaseRef(data, refToResultMap[tcRefId].testCaseTitle, testCaseRefArtifact.linkTypeDisplayName,
                                    this._getTestHistoryUrl(refToResultMap[tcRefId]));                            
                            }
                            else {
                                this._populateArtifactDisplayDataForTestCaseRef(data, testCaseRefArtifact.uri, testCaseRefArtifact.linkTypeDisplayName, Utils_String.empty);
                            }
    
                            dataList.push(data);
                        });
    
                        testCaseRefDeferred.resolve(dataList);    
                    });
                    
                },
                (error) => {
                    Diag.Debug.fail(`There is error when invoking GetTestResultByQuery API. Error: ${(error.message || error)}`);
                    testCaseRefDeferred.resolve(this._getDefaultArtifactDisplayDataForTestCaseRef(artifactMap, [...refsInTcm, ...refsInTfs]));
                });
        }
        else {
            testCaseRefDeferred.resolve(this._getDefaultArtifactDisplayDataForTestCaseRef(artifactMap, [...refsInTcm, ...refsInTfs]));
        }
    }

    private static _partitionTestCaseReferencesByService(testCaseRefArtifactResolvedStateMap: IDictionaryStringTo<boolean>) {
        let refsInTcm: number[] = [];
        let refsInTfs: number[] = [];
        for (let key in testCaseRefArtifactResolvedStateMap) {
            if (!testCaseRefArtifactResolvedStateMap[key]) {
                const { service, id } = getService(TestManagementMigrationService).decodeTestCaseRefId(key);
                if (service === TCMContracts.Service.Tcm) {
                    refsInTcm.push(id);
                } else {
                    refsInTfs.push(id);
                }
            }
        }
        return { refsInTcm, refsInTfs };
    }

    private static _generateTestResultsQueries(refsInTcm: number[], refsInTfs: number[]): TCMContracts.TestResultsQuery[] {
        let queries: TCMContracts.TestResultsQuery[] = [];
        if (refsInTcm.length > 0) {
            queries.push(<TCMContracts.TestResultsQuery> { 
                resultsFilter: TestManagementDataProvider._generateResultsFilter(refsInTcm, TCMContracts.Service.Tcm) 
            });
        }
        if (refsInTfs.length > 0) {
            queries.push(<TCMContracts.TestResultsQuery> { 
                resultsFilter: TestManagementDataProvider._generateResultsFilter(refsInTfs, TCMContracts.Service.Tfs) 
            });
        }
        return queries;
    }

    private static _generateResultsFilter(testCaseReferenceIds: number[], executedIn: TCMContracts.Service): TCMContracts.ResultsFilter {
        return <TCMContracts.ResultsFilter> {
            testCaseReferenceIds: testCaseReferenceIds,
            executedIn: executedIn,
            resultsCount: 1,
            automatedTestName: Math.random().toString(),
            testResultsContext: {}
        };
    }

    private _getDefaultArtifactDisplayDataForTestCaseRef(artifactMap: IDictionaryStringTo<ILinkedArtifact>,
        testCaseRefsToFetch: number[]): LinkedArtifacts.IInternalLinkedArtifactDisplayData[] {

        let dataList: LinkedArtifacts.IInternalLinkedArtifactDisplayData[] = [];
        testCaseRefsToFetch.forEach(refId => {
            let testCaseRefArtifact: ILinkedArtifact = artifactMap[refId];
            let data: LinkedArtifacts.IInternalLinkedArtifactDisplayData = $.extend({}, testCaseRefArtifact);

            this._populateArtifactDisplayDataForTestCaseRef(data, testCaseRefArtifact.uri, testCaseRefArtifact.linkTypeDisplayName, Utils_String.empty);

            dataList.push(data);
        });

        return dataList;
    }

    private _populateArtifactDisplayDataForTestCaseRef(data: LinkedArtifacts.IInternalLinkedArtifactDisplayData, title: string, linkTitle: string, href: string): void {
        data.primaryData = {
            href: href,
            title: title,
            typeIcon: { type: ArtifactIconType.icon, title: linkTitle, descriptor: TestManagementDataProvider.testCaseRefIconClass }
        };
    }

    private _getTestHistoryUrl(result: TCMContracts.TestCaseResult): string {
        let params: IParam[] = [
            {
                parameter: "runId",
                value: result.testRun.id
            },
            {
                parameter: "resultId",
                value: result.id.toString()
            },
            {
                parameter: "selectedGroupBy",
                value: ResultHistoryCommon.ResultHistoryCommands.GroupByBranch
            }];
        
        const paneView = "history";
        let isNewTestResultLinkInCICDFFEnabled = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isNewTestResultLinkInCICDEnabled();
        let href = null;
        if (isNewTestResultLinkInCICDFFEnabled && !!result.automatedTestType) {
            // If automated test, take to the new release or build page
            if (!!result.releaseReference) {
                href = TCMUtils.UrlHelper.getReleaseSummaryTestResultUrl(result.releaseReference.id, result.releaseReference.environmentId, parseInt(result.testRun.id, 10), result.id, paneView);
            } else if (!!result.buildReference && this._isNewTestTabEnabled()) {
                href = TCMUtils.UrlHelper.getNewBuildSummaryTestResultUrl(result.buildReference.id, parseInt(result.testRun.id, 10), result.id, paneView);
            } else {
                href = TCMUtils.UrlHelper.getTestResultHistoryUrl(params)
            }
        } else {
            href = TCMUtils.UrlHelper.getTestResultHistoryUrl(params)
        }

        return href;
    }

    private _getTestResultArtifactIdentifier(result: TCMContracts.TestCaseResult): string {
        return `${result.testRun.id}.${result.id}`;
    }

    private _processLinkResolution(artifacts: IDictionaryStringTo<ILinkedArtifact>, artifactResolvedStateMap: IDictionaryStringTo<boolean>): LinkedArtifacts.IInternalLinkedArtifactDisplayData[] {
        let displayData: LinkedArtifacts.IInternalLinkedArtifactDisplayData[] = [];

        for (let artifactId of Object.keys(artifactResolvedStateMap)) {
            if (!artifactResolvedStateMap[artifactId]) {
                displayData.push(this._getErrorDisplayData(artifacts[artifactId]));
            }
        }

        return displayData;
    }

    private _getErrorDisplayData(artifact: ILinkedArtifact): LinkedArtifacts.IInternalLinkedArtifactDisplayData {
        let data: LinkedArtifacts.IInternalLinkedArtifactDisplayData;
        let primaryData = <LinkedArtifacts.IInternalLinkedArtifactPrimaryData>{};

        primaryData.displayId = artifact.id;
        data = $.extend({}, artifact);
        data.primaryData = primaryData;
        data.error = new Error(Utils_String.format(PresentationResource.LinkedArtifacts_ResolutionFailed, artifact.linkTypeDisplayName));

        return data;
    }

    private _getPrimaryData(linkedArtifact: ILinkedArtifact, tfsContext: TFS_Host_TfsContext.TfsContext, result: TCMContracts.TestCaseResult): LinkedArtifacts.IInternalLinkedArtifactPrimaryData {
        const lastUpdatedBy = result.lastUpdatedBy;
        const avatarUrl = (lastUpdatedBy._links && lastUpdatedBy._links.avatar && lastUpdatedBy._links.avatar.href) || lastUpdatedBy.imageUrl;
        const paneView = "debug";
        let isNewTestResultLinkInCICDFFEnabled = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isNewTestResultLinkInCICDEnabled();
        let href = null;
        if (isNewTestResultLinkInCICDFFEnabled && !!result.automatedTestType){
            // If automated test, take to the new release or build page
            if (!!result.releaseReference) {
                href = TCMUtils.UrlHelper.getReleaseSummaryTestResultUrl(result.releaseReference.id, result.releaseReference.environmentId, parseInt(result.testRun.id, 10), result.id, paneView);
            } else if (!!result.buildReference && this._isNewTestTabEnabled()) {
                href = TCMUtils.UrlHelper.getNewBuildSummaryTestResultUrl(result.buildReference.id, parseInt(result.testRun.id, 10), result.id, paneView);
            } else {
                href = UriHelper.getTestResultUri(parseInt(result.testRun.id, 10), result.id, 0);
            }
        } else {
            href = UriHelper.getTestResultUri(parseInt(result.testRun.id, 10), result.id, 0);
        }
        return {
            href: href,
            title: result.testCaseTitle,
            typeIcon: { type: ArtifactIconType.icon, title: linkedArtifact.linkTypeDisplayName, descriptor: TestManagementDataProvider.testResultIconClass },
            user: {
                displayName: lastUpdatedBy.displayName,
                id: lastUpdatedBy.id,
                uniqueName: lastUpdatedBy.uniqueName,
                imageUrl: avatarUrl
            }
        };
    }

    private _getAdditionalData(result: TCMContracts.TestCaseResult): IDictionaryStringTo<ILinkedArtifactAdditionalData> {
        let data: IDictionaryStringTo<ILinkedArtifactAdditionalData> = {};

        if (result.lastUpdatedDate) {
            data[LinkedArtifacts.InternalKnownColumns.LastUpdate.refName] = {
                styledText: { text: Utils_String.format(TCMResources.LinkedArtifactsTestResultPerformed, Utils_Date.friendly(result.lastUpdatedDate)) },
                title: Utils_Date.localeFormat(result.lastUpdatedDate, "F"),
                rawData: result.lastUpdatedDate
            };
        }
        if (result.state) {
            data[LinkedArtifacts.InternalKnownColumns.State.refName] = {
                icon: { type: ArtifactIconType.icon, title: result.outcome, descriptor: this._getTestResultOutcomeIconClass(result.outcome) },
                styledText: { text: result.outcome },
                title: result.outcome
            };
        }

        return data;
    }

    private _isMember(): boolean {
        const claimService: UserClaimsService.IUserClaimsService = UserClaimsService.getService();
        return claimService.hasClaim(UserClaimsService.UserClaims.Member);
    }

    private _isNewTestTabEnabled(): boolean {
        const buildCIResultContributedFeatureId = "ms.vss-build-web.ci-result";
        const isBuildCIResultEnabled = getService(FeatureManagementService).isFeatureEnabled(buildCIResultContributedFeatureId);
        return (isBuildCIResultEnabled || TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isNewTestTabEnabledInOldBuild());
    }


    private _getTestResultOutcomeIconClass(outcome: string): string {
        let iconClass: string;

        switch (outcome) {
            case TCMResources.TestOutcome_Blocked:
                iconClass = "bowtie-math-minus-circle";
                break;
            case TCMResources.TestOutcome_Passed:
            case TCMResources.TestPointState_Completed:
                iconClass = "bowtie-status-success";
                break;
            case TCMResources.TestOutcome_Failed:
            case TCMResources.TestOutcome_Aborted:
            case TCMResources.TestOutcome_Error:
            case TCMResources.TestOutcome_NotExecuted:
            case TCMResources.TestOutcome_Timeout:
            case TCMResources.TestOutcome_Warning:
                iconClass = "bowtie-status-failure";
                break;
            case TCMResources.TestPointState_Ready:
                iconClass = "bowtie-dot";
                break;
            case TCMResources.TestPointState_InProgress:
                iconClass = "bowtie-status-run";
                break;
            case TCMResources.TestOutcome_NotApplicable:
            case TCMResources.TestOutcome_Inconclusive:
                iconClass = "bowtie-status-no-fill";
                break;
            case TCMResources.TestPointState_Paused:
                iconClass = "bowtie-status-pause";
                break;
            default:
                iconClass = "bowtie-dot";
                break;
        }

        return iconClass;
    }
}
