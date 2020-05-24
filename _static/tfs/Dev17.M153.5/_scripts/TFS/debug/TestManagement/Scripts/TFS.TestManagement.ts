//Auto converted from TestManagement/Scripts/TFS.TestManagement.debug.js

/// <reference types="jquery" />

import q = require("q");

import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import TCMConstants = require("Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Service = require("Presentation/Scripts/TFS/TFS.Service");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WitContracts = require("TFS/WorkItemTracking/Contracts");

import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import { TestManagementHttpClient } from "TestManagement/Scripts/TFS.TestManagement.WebApi";
import { TcmHttpClientWrapper as TcmHttpClient } from "TestManagement/Scripts/HttpClientWrappers/TcmHttpClientWrapper";
import UCD = require("TestManagement/Scripts/TFS.TestManagement.Utils.UnicodeGeneralCategoryData");
import TCM_Types = require("TestManagement/Scripts/TFS.TestManagement.Types");

import Build_Client = require("TFS/Build/RestClient");
import BuildContracts = require("TFS/Build/Contracts");
import TCM_Client = require("TFS/TestManagement/RestClient");
import TIA_Client = require("TFS/TestImpact/RestClient");
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import TCMContracts = require("TFS/TestManagement/Contracts");
import TIAContracts = require("TFS/TestImpact/Contracts");
import WorkItem_Client = require("TFS/WorkItemTracking/RestClient");
import WorkItemContracts = require("TFS/WorkItemTracking/Contracts");
import TFS_AgileCommon = require("Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon");

import Artifacts_Constants = require("VSS/Artifacts/Constants");
import Artifacts_Services = require("VSS/Artifacts/Services");
import Diag = require("VSS/Diag");
import Events_Handlers = require("VSS/Events/Handlers");
import Service = require("VSS/Service");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Culture = require("VSS/Utils/Culture");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Html = require("VSS/Utils/Html");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { FieldFlags } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { IResourceLink } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { LicenseAndFeatureFlagUtils } from "./Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import { DesktopTestRunConstants } from "./TFS.TestManagement.DesktopTestRunHelper";

let LinkingUtilities = Artifacts_Services.LinkingUtilities;
let ExternalLink = WITOM.ExternalLink;
let HtmlNormalizer = Utils_Html.HtmlNormalizer;
let queueRequest = VSS.queueRequest;

export interface ITestResultCreationRequestModel {
    testCaseId: number;
    configurationId: number;
    configurationName: string;
    testPointId: number;
    owner: string;
}

export interface ITestRunnerOptions {
    verifyBugInfo?: VerifyBugInfo;
    teamId?: string;
}

export interface VerifyBugInfo {
    id: number;
    title: string;
}

export interface IResultAttachment {
    actionPath: string;
    attachment: ITestResultAttachmentModel;
}

export class ReferencedTestCaseModel {
    id: number;
    title: string;
}

export class IdAndRevision {
    public id: number;
    public revision: number;

    constructor(id: number, revision: number) {
        this.id = id;
        this.revision = revision;
    }
}

export class ITeamFieldModel {
    public ownerId: number;
    public teamFieldRefName: string;
    public teamFieldValue: string;
}

export class TeamFieldModel {
    public refName: string;
    public value: string;
    public isConfigured: boolean;

    constructor(refName: string, value: string, isConfigured: boolean) {
        this.refName = refName;
        this.value = value;
        this.isConfigured = isConfigured;
    }
}

export class ITesterModel {
    public id: string;
    public displayName: string;
    public uniqueName: string;
    public filterValue: string;

    constructor(id: string, displayName: string, uniqueName: string, filterValue?: string) {
        this.id = id;
        this.displayName = displayName;
        this.uniqueName = uniqueName;
        this.filterValue = filterValue || displayName;
    }
}

export class ISharedParameterDataSetModel {
    public id: number;
    public title: string;
    public assignedTo: string;
    public sharedParameterDataSet: SharedParameterDataSet;
}

export class DAUtils {
    public static trackAction(eventName: string, eventPath: string, data?: any) {
        if ((<any>window).__da) {
            eventPath = "/TestMangement" + eventPath;
            (<any>window).__da.trackAction(eventName, eventPath, data);
        }
    }
}

export class FieldUtils {
    public static isFieldEditable(fieldDefinition: WITOM.FieldDefinition): boolean {
        let nonEditableFieldNames = [WITConstants.CoreFieldRefNames.AreaId,
        WITConstants.CoreFieldRefNames.ChangedBy,
        WITConstants.CoreFieldRefNames.History,
        WITConstants.CoreFieldRefNames.IterationId,
        WITConstants.CoreFieldRefNames.Reason,
        TCMConstants.WorkItemFieldNames.Actions,
        TCMConstants.WorkItemFieldNames.DataField,
        TCMConstants.WorkItemFieldNames.Parameters,
        TCMConstants.WorkItemFieldNames.TestId,
        TCMConstants.WorkItemFieldNames.Storage,
        TCMConstants.WorkItemFieldNames.TestType,
        TCMConstants.WorkItemFieldNames.TestName,
        TCMConstants.WorkItemFieldNames.ActivatedBy,
        TCMConstants.WorkItemFieldNames.ClosedBy];

        return fieldDefinition.isEditable() &&
            (!fieldDefinition.checkFlag(FieldFlags.Ignored)) &&
            fieldDefinition.type !== WITConstants.FieldType.DateTime &&
            ($.inArray(fieldDefinition.referenceName, nonEditableFieldNames) === -1);
    }
}

export class TestCaseResultIdentifier {

    public testRunId: number;
    public testResultId: number;

    constructor(testRunId: number, testResultId: number) {
        this.testRunId = testRunId;
        this.testResultId = testResultId;
    }

    public equals(resultIdentifier: TestCaseResultIdentifier) {
        if (!this.testRunId || !this.testResultId || !resultIdentifier) {
            return false;
        }

        return this.testRunId === resultIdentifier.testRunId && this.testResultId === resultIdentifier.testResultId;
    }

    public toString(): string {
        let idBuilder: Utils_String.StringBuilder = new Utils_String.StringBuilder();

        idBuilder.append(this.testRunId.toString());
        idBuilder.append(":");
        idBuilder.append(this.testResultId.toString());

        return idBuilder.toString();
    }
}

export class TestCaseResultIdentifierWithDuration {

    public testRunId: number;
    public testResultId: number;
    public durationInMs: number;

    constructor(testRunId: number, testResultId: number, durationInMs: number) {
        this.testRunId = testRunId;
        this.testResultId = testResultId;
        this.durationInMs = durationInMs;
    }

    public toString(): string {
        let idBuilder: Utils_String.StringBuilder = new Utils_String.StringBuilder();

        idBuilder.append(this.testRunId.toString());
        idBuilder.append(":");
        idBuilder.append(this.testResultId.toString());

        return idBuilder.toString();
    }
}

VSS.initClassPrototype(TestCaseResultIdentifier, {
    testRunId: 0,
    testResultId: 0
});

export interface ITestResultCreationResponseModel {
    id: TestCaseResultIdentifier;
    testCaseTitle: string;
    testPointId: number;
    dataRowCount: number;
    testCaseRevision: number;
    priority: number;
}

export interface ITestSuiteCreationRequestModel {
    title: string;
    startIndex: number;
    parentSuiteId: number;
    parentSuiteRevision: number;
}

export interface ITestConfigurationModel {
    name: string;
    id: number;
    variables: Array<{ name: string; value: string; }>;
}
export interface IQueryBasedSuiteCreationRequestModel extends ITestSuiteCreationRequestModel {
    queryText: string;
}

export interface ITestSuiteModel {
    id: number;
    revision: number;
    title: string;
    childSuiteIds: number[];
    // Filtered/Visible points in a suite
    pointCount: number;
    type: TCMConstants.TestSuiteType;
    requirementId: number;
    parentSuiteId: number;
    queryText: string;
    status: string;
    //Total Points in a suite
    totalPointCount: number;
    configurations: number[];
}

export interface ITestCaseResultModel {
    id: number;
    outcome: number;
    errorMessage: string;
    comment: string;
    dateStarted: Date;
    dateCompleted: Date;
    duration: number;
    testCaseId: number;
    configurationId: number;
    configurationName: string;
    testPointId: number;
    state: number;
    computerName: string;
    owner: number;
    runBy: number;
    runByName: string;
    testCaseTitle: string;
    revision: number;
    dataRowCount: number;
    testCaseRevision: number;
    testRunId: number;
    testResultId: number;
    planId: number;
    planName: string;
    suiteId: number;
    suiteName: string;
}

export interface ITestRunModel {
    title: string;
    owner: string;
    buildUri: string;
    buildNumber: string;
    startDate: Date;
    completedDate: Date;
    testPlanId: number;
    testSettingsId: number;
    publicTestSettingsId: number;
    testEnvironmentId: string;
    testRunId: number;
    iteration: string;
    isAutomated: boolean;
    state: TCMConstants.TestRunState;
}

export interface ITestRunAndResultResponseModel {
    testRun: ITestRunModel;
    testResultCreationResponseModels: ITestResultCreationResponseModel[];
}

export interface ITestPointModel {
    testPointId: number;
    testCaseId: number;
    title: string;
    tester: string;
    priority: number;
    configurationId: number;
    configurationName: string;
    automated: boolean;
    outcome: TCMConstants.TestOutcome;
    state: TCMConstants.TestPointState;
    mostRecentRunId: number;
    mostRecentResultOutcome: TCMConstants.TestOutcome;
    lastResultState: TCMConstants.TestResultState;
    assignedTo: string;
    sequenceNumber: number;
}

export interface ITestPlanDetails {
    name: string;
    areaPath: string;
    iteration: string;
    startDate: Date;
    endDate: Date;
    owner: number;
}

export interface IBugWITFields {
    id: number;
    title: string;
    url: string;
    assignedTo: string;
    state: string;

}

export interface ITestRunDetails {
    testRunId: number;
    owner: number;
    title: string;
    iteration: string;
    buildUri: string;
    state: TCMConstants.TestRunState;
    isAutomated: boolean;
    testPlanId: number;
    startDate: Date;
    completeDate: Date;
    testSettingsId: number;
}

export interface ITestActionResultModel {
    id: TestCaseResultIdentifier;
    outcome: TCMConstants.TestOutcome;
    errorMessage: string;
    comment: string;
    dateStarted: Date;
    dateCompleted: Date;
    duration: number;
    actionPath: string;
    sharedStepId: number;
    iterationId: number;
    sharedStepRevision: number;
}

export interface ITestResultParameterModel {
    testRunId: number;
    testResultId: number;
    iterationId: number;
    actionPath: string;
    parameterName: string;
    dataType: number;
    expected: string;
    actual: string;
}

export interface ITestResultAttachmentModel {
    testRunId: number;
    testResultId: number;
    iterationId: number;
    actionPath: string;
    fileName: string;
    size: number;
    id: number;
    comment: string;
}

export interface IColumnSettingModel {
    refName: string;
    width: number;
}

export interface IColumnSortOrderModel {
    index: string;
    order: string;
}

export interface ITestPointGridDisplayColumn {
    name: string;
    text: string;
    fieldId: number;
    canSortBy: boolean;
    width: number;
    index: string;
    type: string;
    isIdentity: boolean;
}

export interface ITestPointQueryResultModel {
    testPoints: ITestPointModel[];
    columnOptions: ITestPointGridDisplayColumn[];
    columnSortOrder: IColumnSortOrderModel;
    sortedPointIds: number[];
    testCaseIds: number[];
    totalPointsCount: number;
    configurations: ITestConfigurationModel[];
}

export interface ITestSuiteQueryResultModel {
    testSuites: ITestSuiteModel[];
    selectedTester: ITesterModel;
    selectedOutcome: string;
    selectedConfiguration: ITestConfigurationModel;
    testers: ITesterModel[];
    configurations: ITestConfigurationModel[];
}

export interface ITestResultAssociatedBugs {
    testResultId: number;
    bugId: number;
    bugTitle: string;
}

export interface ITestActionResultDetailsModel {
    actionResults: ITestActionResultModel[];
    parameters: ITestResultParameterModel[];
    attachments: ITestResultAttachmentModel[];
    associatedBugs: ITestResultAssociatedBugs[];
}

export interface ITestCaseResultWithActionResultModel {
    testCaseResult: TestCaseResult;
    testActionResultDetails: ITestActionResultDetailsModel;
}

export class SuitesPaneColumnIds {
    public static SuiteTitle: string = "suiteTitle";
    public static TestPlan: string = "testPlan";
    public static TeamProject: string = "teamProject";
    public static Link: string = "link";
    public static SuiteType: string = "suiteType";
    public static OpenInNewTab: string = "openInNewTab";
    public static SuiteStatus: string = "suiteStatus";
}

export class ResultsPaneColumnIds {
    public static Outcome: string = "outcome";
    public static Configuration: string = "configurationName";
    public static Link: string = "link";
    public static RunBy: string = "runBy";
    public static ResultDate: string = "resultDate";
    public static Duration: string = "duration";
    public static OpenInNewTab: string = "openInNewTab";
    public static PlanId: string = "planId";
    public static PlanName: string = "planName";
    public static SuiteId: string = "suiteId";
    public static SuiteName: string = "suiteName";
}

export class LatestTestOutcomeColumnIds {
    public static Outcome: string = "outcome";
    public static Configuration: string = "configurationName";
    public static RunBy: string = "runBy";
    public static ResultDate: string = "resultDate";
    public static Duration: string = "duration";
    public static BuildNumber: string = "buildNumber";
    public static Tester: string = "tester";
}

export module Exceptions {
    export let TestObjectNotFoundException = "Microsoft.TeamFoundation.TestManagement.Server.TestObjectNotFoundException";
    export let WiqlSyntaxException = "Microsoft.TeamFoundation.WorkItemTracking.Client.Wiql.SyntaxException";
}

export module BugWITFields {
    export let SystemInfo = "Microsoft.VSTS.TCM.SystemInfo";
    export let ReproSteps = "Microsoft.VSTS.TCM.ReproSteps";
    export let BuildFoundIn = "Microsoft.VSTS.Build.FoundIn";
}

export class WIQLConstants {
    public static SelectClause: string = "SELECT {0} FROM WorkItems";
    public static WhereClause: string = "WHERE {0}";
    public static CategoryBaseClause: string = "WHERE [System.TeamProject] = @project AND [System.WorkItemType] IN GROUP '{0}' ";
}

export class WorkItemCategories {
    public static TestCase: string = "Microsoft.TestCaseCategory";
    public static SharedStep: string = "Microsoft.SharedStepCategory";
    public static Requirement: string = "Microsoft.RequirementCategory";
    public static ParameterSet: string = "Microsoft.SharedParameterCategory";
    public static Bug: string = "Microsoft.BugCategory";
    public static Feature: string = "Microsoft.FeatureCategory";
    public static Epic: string = "Microsoft.EpicCategory";
    public static TestPlan: string = "Microsoft.TestPlanCategory";
}

export interface ITestConfiguration {
    name: string;
    id: number;
    values: string;
    isActive: boolean;
    isAssigned: boolean;
}

export interface ITestCaseWithParentSuite {
    id: number;
    suiteId: number;
    suiteName: string;
}

export class TestCaseAndSuiteId {
    public static testCaseId: number;
    public static suiteId: number;

    public static getTestCases(testCaseAndSuiteList: ITestCaseWithParentSuite[]) {
        let testCases: TestCaseAndSuiteId[] = [];

        if (testCaseAndSuiteList) {
            for (let i = 0, length = testCaseAndSuiteList.length; i < length; i++) {
                testCases.push({
                    testCaseId: testCaseAndSuiteList[i].id,
                    suiteId: testCaseAndSuiteList[i].suiteId
                });
            }
        }

        return testCases;
    }
}

export class TestPointManager extends TFS_Service.TfsService {

    constructor() {
        super();
    }

    public _httpClient: TestManagementHttpClient;
    private _buildHttpClient: Build_Client.BuildHttpClient;

    public initializeConnection(tfsConnection: Service.VssConnection) {
        super.initializeConnection(tfsConnection);
        this._httpClient = tfsConnection.getHttpClient<TestManagementHttpClient>(TestManagementHttpClient);
    }

    public getTestPointsInSuiteWithResults(planId: number, suiteId: number, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        this._httpClient.getPointsForSuite(TFS_Host_TfsContext.TfsContext.getDefault().navigation.project, planId, suiteId).then(
            (testPoint: TCMContracts.TestPoint) => {
                callback.call(this, testPoint, suiteId);
            },
            (e) => errorCallback.call(e));
    }
}

export class OrderTestCaseManager extends TFS_Service.TfsService {
    private _httpClient: TCM_Client.TestHttpClient;

    /**
    * Initializes the TFS service with a connection
    * @param tfsConnection The connection
    */
    public initializeConnection(connection: Service.VssConnection) {
        super.initializeConnection(connection);
        this._httpClient = this.getConnection().getHttpClient(TCM_Client.TestHttpClient);
    }

    public getSuiteEntries(suiteId: number): IPromise<TCMContracts.SuiteEntry[]> {
        return this._httpClient.getSuiteEntries(this.getTfsContext().contextData.project.name, suiteId);
    }

    public reorderSuiteEntries(suiteId: number, suiteEntries: TCMContracts.SuiteEntryUpdateModel[]): IPromise<TCMContracts.SuiteEntry[]> {
        return this._httpClient.reorderSuiteEntries(suiteEntries, this.getTfsContext().contextData.project.name, suiteId);
    }

}


export class WorkItemTrackingManager extends TFS_Service.TfsService {
    private _httpClient: WorkItem_Client.WorkItemTrackingHttpClient3;

    /**
    * Initializes the TFS service with a connection
    * @param tfsConnection The connection
    */
    public initializeConnection(connection: Service.VssConnection) {
        super.initializeConnection(connection);
        this._httpClient = this.getConnection().getHttpClient(WorkItem_Client.WorkItemTrackingHttpClient3);
    }

    public addResultAttachmentToWorkItem(attachmentIdString: string, workItemId: number): IPromise<WorkItemContracts.WorkItem> {
        let data = [];

        let addAttachmentLink: any = {};
        addAttachmentLink.op = "add";
        addAttachmentLink.path = "/relations/-";
        let attachmentLink: any = {};
        attachmentLink.rel = "ArtifactLink";
        attachmentLink.url = attachmentIdString;
        attachmentLink.attributes = { name: "Result Attachment" };
        addAttachmentLink.value = attachmentLink;
        data.push(addAttachmentLink);
        return this._httpClient.updateWorkItem(data, workItemId);
    }

    public getWorkItems(ids: number[],
        fields?: string[],
        asOf?: Date,
        expand?: WorkItemContracts.WorkItemExpand): IPromise<WorkItemContracts.WorkItem[]> {
        return this._httpClient.getWorkItems(ids, fields, asOf, expand);
    }

    public getWorkItemsByWiqlQuery(wiqlQuery: WitContracts.Wiql, project: string, top?: number) {
        return this._httpClient.queryByWiql(wiqlQuery, project, undefined, undefined, top);
    }

    public getWorkItemTypeCategories(): IPromise<WorkItemContracts.WorkItemTypeCategory[]> {
        return this._httpClient.getWorkItemTypeCategories(this.getTfsContext().contextData.project.name);
    }
}

export class TestPlanSelectionHelper {
    public static getTestPlanSelectionSettingKey(): string {
        let webContext = TFS_Host_TfsContext.TfsContext.getDefault().contextData;
        return ("/TestManagement" + "/" + webContext.project.id + "/" + webContext.team.id + "/TestPlanSelection");
    }

    public static getDefaultQuery(): string {
        let data = Utils_Core.parseJsonIsland($(document), ".__defaultPlanQuery", false);
        if (!data) {
            data = TestPlanSelectionHelper._defaultTestPlanQuery;
        }
        if (!data) {
            // Putting some default query in case data got from json island is null, this could happen when
            // you get exception while storing data in json island on service side
            data = this._select + Utils_String.format(this._whereClauseQuery, TFS_Host_TfsContext.TfsContext.getDefault().contextData.project.name);
        }

        return TestPlanSelectionHelper.convertPlanQuery(data);
    }

    public static convertPlanQuery(data: string): string {
        let regex = /SELECT \* FROM/i;
        let updatedDefaultQuery = data.replace(regex, this._select);
        return updatedDefaultQuery;
    }

    public static setDefaultTestPlanQuery(defaultTestPlanQuery: string) {
        TestPlanSelectionHelper._defaultTestPlanQuery = defaultTestPlanQuery;
    }

    private static _defaultTestPlanQuery;
    private static _select: string = "SELECT [System.Id], [System.WorkItemType], [System.Title], [System.AssignedTo], [System.AreaPath], [System.IterationPath] FROM";
    private static _whereClauseQuery: string = " WorkItems WHERE ([System.TeamProject] = @project AND [System.WorkItemType] IN GROUP 'Microsoft.TestPlanCategory' AND [System.AreaPath] UNDER '{0}')";
}

export module PageConstants {
    export let maxPageSize: number = 2147483646;
    export let defaultPageSize: number = 1000;
    export let defaultTestResultPageSize: number = 10000;
}

export class TestPlanManager extends TFS_Service.TfsService {

    constructor() {
        super();
    }
    public _httpClient: TestManagementHttpClient;
    private _buildHttpClient: Build_Client.BuildHttpClient;
    private _buildHttpClient2_2: Build_Client.BuildHttpClient2_2;

    public initializeConnection(tfsConnection: Service.VssConnection) {
        super.initializeConnection(tfsConnection);
        this._httpClient = tfsConnection.getHttpClient<TestManagementHttpClient>(TestManagementHttpClient);
    }

    /**
     * Gets the url for the action
     * @action type="string" optional="true"  the action to be invoked
     * @params type="any" optional="true" addition params to construct url such as project, area etc
     */
    public getApiLocation(action?: string, params?: any) {
        return this.getTfsContext().getActionUrl(action || "", "testManagement", $.extend({ area: "api" }, params));
    }

    public createStaticTestSuite(newSuiteCreationModel: ITestSuiteCreationRequestModel, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxPost("CreateStaticSuite",
            {
                suiteCreationRequestModel: Utils_Core.stringifyMSJSON(newSuiteCreationModel)
            },
            callback,
            errorCallback);
    }

    public createRequirementSuites(parentSuiteIdAndRevision: IdAndRevision, requirementIds: number[], callback?: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxPost("CreateRequirementSuites",
            {
                parentSuiteId: parentSuiteIdAndRevision.id,
                parentSuiteRevision: parentSuiteIdAndRevision.revision,
                requirementIds: requirementIds
            },
            callback,
            errorCallback);
    }

    public createQueryBasedSuite(newSuiteCreationModel: IQueryBasedSuiteCreationRequestModel, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxPost("CreateQueryBasedSuite",
            {
                suiteCreationRequestModel: Utils_Core.stringifyMSJSON(newSuiteCreationModel)
            },
            callback,
            errorCallback);
    }

    public updateQueryBasedSuite(suite: ITestSuiteModel, queryText: string, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxPost("UpdateQueryBasedSuite",
            {
                suiteId: suite.id,
                suiteRevision: suite.revision,
                queryText: queryText
            },
            callback,
            errorCallback);
    }

    public renameTestSuite(suite: ITestSuiteModel, title: string, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxPost("RenameTestSuite",
            {
                suiteId: suite.id,
                suiteRevision: suite.revision,
                title: title
            },
            callback,
            errorCallback);
    }

    public deleteTestSuite(parentTestSuiteId: number, parentTestSuiteRevision: number, suiteIdToDelete: number, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxPost("DeleteTestSuite",
            {
                parentTestSuiteId: parentTestSuiteId,
                parentSuiteRevision: parentTestSuiteRevision,
                suiteIdToDelete: suiteIdToDelete
            },
            callback,
            errorCallback);
    }

    public moveTestSuiteEntry(planId: number, fromSuiteId: number, fromSuiteRevision: number, toSuiteId: number, toSuiteRevision: number, suiteEntriesToMoveIds: number[], isTestCaseEntry: boolean, position: number, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxPost("MoveTestSuiteEntryAtPosition",
            {
                planId: planId,
                fromSuiteId: fromSuiteId,
                fromSuiteRevision: fromSuiteRevision,
                toSuiteId: toSuiteId,
                toSuiteRevision: toSuiteRevision,
                suiteEntriesToMoveIds: suiteEntriesToMoveIds,
                isTestCaseEntry: isTestCaseEntry,
                position: position
            },
            callback,
            errorCallback);
    }

    public createTestPlan(testPlanDetails: ITestPlanDetails, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Creates a new test plan with given name in the current project under given area , iteration path</summary>
        /// <param name="testPlanDetails" type="string" optional="false" />
        /// <param name="callback" type="IResultCallback" optional="true" />
        /// <param name="errorCallback" type="IErrorCallback" optional="true">the function to be invoked in case of error</param>
        this._ajaxPost("CreateTestPlan",
            {
                planCreateRequestModel: Utils_Core.stringifyMSJSON(testPlanDetails)
            },
            callback,
            errorCallback);
    }

    public beginCreateTestPlanFromWorkItem(workItemId: number, callback: IResultCallback, errorCallback: IErrorCallback) {
        this._ajaxPost("CreateTestPlanFromWorkItem",
            {
                workItemId: workItemId
            },
            callback,
            errorCallback);
    }

    public getTestPlansById(ids: number[], callback?: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Gets test plans in the current project by ids.</summary>
        /// <param name="ids" type="Number[]">the plans ids.</param>
        /// <param name="callback" type="IResultCallback" optional="true" />
        /// <param name="errorCallback" type="IErrorCallback" optional="true">the function to be invoked in case of error</param>
        this._ajaxJson("GetTestPlansById", { planIds: ids }, callback, errorCallback);
    }

    public fetchTestPlansIncludingSpecifiedPlan(planIdToSelect: any, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        let data = Utils_Core.parseJsonIsland($(document), ".__allTestPlans", true);
        let parsedPlanId = parseInt(planIdToSelect, 10);
        // Assign invalid plan id if planId to select is NaN
        if (isNaN(parsedPlanId)) {
            parsedPlanId = 0;
        }
        if (data && callback && (parsedPlanId === 0 || data.testPlans.filter((plan) => parsedPlanId === plan.id).length !== 0)) {
            callback(data);
        }
        /// <summary>Gets the filtered test plans in the current project as per persisted filter query, get all test plans in case no persistent query</summary>
        /// <param name="planIdToSelect" type="Number">the plans id to select.</param>
        /// <param name="callback" type="IResultCallback" optional="true" />
        /// <param name="errorCallback" type="IErrorCallback" optional="true">the function to be invoked in case of error</param>
        else {
            // invalidate the suite and points if plans are not valid
            Utils_Core.parseJsonIsland($(document), ".__allSuitesOfSelectedPlan", true);
            Utils_Core.parseJsonIsland($(document), ".__allTestPointsOfSelectedSuite", true);
            this._ajaxJson("FetchTestPlansIncludingSpecifiedPlan", { planIdToSelect: parsedPlanId }, callback, errorCallback);
        }
    }

    public saveAndFetchTestPlansByQueryFilter(queryText: string, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Gets all the test plans in the current project as per filter and persist the filter query (converted all names to Ids) in registry</summary>
        /// <param name="callback" type="IResultCallback" optional="true" />
        /// <param name="errorCallback" type="IErrorCallback" optional="true">the function to be invoked in case of error</param>
        this._ajaxPost("SaveAndFetchTestPlansByQueryFilter", { planQuery: queryText }, callback, errorCallback);
    }

    public getConvertedFilteredTestPlanQueryFromRegistry(defaultPlanQuery: string, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Get persisted Plan query converted from Ids to Name</summary>
        /// <param name="callback" type="IResultCallback" optional="true" />
        /// <param name="errorCallback" type="IErrorCallback" optional="true">the function to be invoked in case of error</param>
        let data = Utils_Core.parseJsonIsland($(document), ".__testPlanQueryFromRegistry", true);
        if (data && callback) {
            data = TestPlanSelectionHelper.convertPlanQuery(data);
            callback(data);
        }
        else {
            this._ajaxPost("GetConvertedFilteredTestPlanQueryFromRegistry", { defaultPlanQuery: defaultPlanQuery }, callback, errorCallback);
        }
    }

    public getTeamFieldForTestPlans(ids: number[], callback?: IResultCallback, errorCallback?: IErrorCallback) {
        let data = Utils_Core.parseJsonIsland($(document), ".__allTeamFieldForLastSelectedTestPlan", true);
        if (data && callback) {
            callback(data);
        }
        /// <summary>Gets team fields for all the specified test plans</summary>
        /// <param name="callback" type="IResultCallback" optional="true" />
        /// <param name="errorCallback" type="IErrorCallback" optional="true">the function to be invoked in case of error</param>
        else {
            this._ajaxJson("GetTeamFieldForTestPlans", { testPlanIds: ids }, callback, errorCallback);
        }

    }

    public beginGetPlanBuildDetails(plan: any, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        if (!this._buildHttpClient) {
            this._buildHttpClient = this.tfsConnection.getHttpClient<Build_Client.BuildHttpClient>(Build_Client.BuildHttpClient);
        }
        if (!plan.build) {
            callback.call(this, null);
        }
        else {
            this._buildHttpClient.getBuild(plan.build.id, TFS_Host_TfsContext.TfsContext.getDefault().navigation.project).then(
                (build: BuildContracts.Build) => {
                    callback.call(this, build);
                }, (e) => {
                    // If an exception occurs while getting build it will come to this fallback method where we try to get build using 2_2 build client.
                    // This fallback is mainly to handle XMAL builds.
                    if (!this._buildHttpClient2_2) {
                        this._buildHttpClient2_2 = this.tfsConnection.getHttpClient<Build_Client.BuildHttpClient2_2>(Build_Client.BuildHttpClient2_2);
                    }
                    this._buildHttpClient2_2.getBuild(plan.build.id, TFS_Host_TfsContext.TfsContext.getDefault().navigation.project).then(
                        (build: BuildContracts.Build) => {
                            callback.call(this, build);
                        }, (e) => {
                            errorCallback.call(e);
                        });
                });
        }

    }

    public getTestSuitesForPlan(planId, suiteIdToSelect, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        let data = Utils_Core.parseJsonIsland($(document), ".__allSuitesOfSelectedPlan", true);
        let parsedSuiteId = parseInt(suiteIdToSelect, 10);
        if (isNaN(parsedSuiteId)) {
            parsedSuiteId = 0;
        }
        if (data && callback && (parsedSuiteId === 0 || data.testSuites.filter((suite) => suite.id === parsedSuiteId).length !== 0)) {
            callback(data);
        }
        else {
            //invalidate the points if suite data is not valid
            Utils_Core.parseJsonIsland($(document), ".__allTestPointsOfSelectedSuite", true);
            /// <summary>Gets all the test suites recursilvely for the plan with given rootsuiteId</summary>
            /// <param name="rootSuiteId" type="Number">the rootsuiteIf of the plan</param>
            /// <param name="callback" type="IResultCallback" optional="true" />
            /// <param name="errorCallback" type="IErrorCallback" optional="true">the function to be invoked in case of error</param>
            this._ajaxJson("GetTestSuitesForPlan", { planId: planId }, callback, errorCallback);
        }
    }

    public deleteTestPlan(planId, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        this._httpClient.deleteTestPlan(TFS_Host_TfsContext.TfsContext.getDefault().navigation.project, planId).then(
            () => {
                callback.call(this);
            },
            (e) => errorCallback(e));
    }

    public getXsltTemplate(callback?: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxJson("GetXsltTemplate", null, callback, errorCallback);
    }

    public getPlan(planId, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        // this._ajaxJson("GetPlan", { planId: planId }, callback, errorCallback);
        this._httpClient.beginGetTestPlan(TFS_Host_TfsContext.TfsContext.getDefault().navigation.project, planId).then(
            (testPlan: TCMContracts.TestPlan) => {
                callback.call(this, testPlan);
            },
            (e) => errorCallback.call(e));
    }

    public getTestConfigurationsDetail(ids: number[], planId: number, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxJson("GetTestConfigurationsDetail",
            {
                configIds: ids,
                planId: planId
            }, callback, errorCallback);
    }

    public getTestSuite(planId: number, suiteId: number, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        this._httpClient.getSuite(TFS_Host_TfsContext.TfsContext.getDefault().navigation.project, planId, suiteId).then(
            (testSuite: TCMContracts.TestSuite) => {
                callback.call(this, testSuite);
            },
            (e) => errorCallback.call(e));
    }

    public getSuitesForTestCase(testCaseId: number, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        this._httpClient.getSuitesForTestCase(testCaseId).then(
            (testSuite: TCMContracts.TestSuite) => {
                callback.call(this, testSuite);
            },
            (e) => errorCallback.call(e));
    }

    public getWorkItemTypeNamesForCategories(categoryNames: string[], callback?: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxJson("GetWorkItemTypeNamesForCategories",
            {
                categoryNames: categoryNames
            }, callback, errorCallback);
    }

    public getWorkItemTypeNameForCategoreisForSpecificProject(categoryNames: string[], projectId: string, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        if (projectId) {
            this._ajaxJsonForSpecificProject("GetWorkItemTypeNamesForCategories", projectId,
                {
                    categoryNames: categoryNames
                }, callback, errorCallback);
        }
    }

    public validateQueryContainsCategory(queryText: string, categoryName: string, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxPost("ValidateQueryContainsCategory",
            {
                queryText: queryText,
                categoryName: categoryName
            }, callback, errorCallback);
    }

    public _updateFilterRegistryValues(configuration: number, outcome: string, tester: string, callback: IResultCallback) {
        this._ajaxPost("UpdateRegistrySettings", {
            outcome: outcome,
            tester: tester,
            configuration: configuration
        }, callback);
    }

    public getTestPointsForSuite(planId: number, suiteId: number, repopulateSuite: boolean, columns: ITestPointGridDisplayColumn[], outcomeFilter: string, testerFilter: string, configurationFilter: number, callback: IResultCallback, errorCallback?: IErrorCallback,
        top: number = PageConstants.maxPageSize,
        recursive: boolean = false) {
        let data = Utils_Core.parseJsonIsland($(document), ".__allTestPointsOfSelectedSuite", true);
        if (data && callback) {
            callback(data);
        }
        else {
            this._ajaxPost("GetTestPointsForSuite",
                {
                    testPlanId: planId,
                    testSuiteId: suiteId,
                    repopulateSuite: repopulateSuite,
                    columns: Utils_Core.stringifyMSJSON(columns),
                    top: top,
                    recursive: recursive,
                    outcomeFilter: outcomeFilter,
                    testerFilter: testerFilter,
                    configurationFilter: configurationFilter
                }, callback, errorCallback);
        }
    }

    public getTestCaseIdsInTestSuite(testSuiteId: number, callback: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxJson("GetTestCaseIdsInTestSuite",
            {
                testSuiteId: testSuiteId,
            }, callback, errorCallback);
    }

    public getTestCaseColumnsFromUserSettings(callback: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxJson("GetTestCaseColumnsFromUserSettings",
            {}, callback, errorCallback);
    }

    public getTestSuitesData(testSuitesId: number, includeChildSuite: boolean, callback: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxJson("GetTestSuitesData",
            {
                testSuitesId: testSuitesId,
                includeChildSuite: includeChildSuite
            }, callback, errorCallback);
    }

    public fetchTestPoints(planId: number, testPointIds: number[], columns: ITestPointGridDisplayColumn[], callback, errorCallback?) {
        this._ajaxPost("FetchTestPoints",
            {
                testPlanId: planId,
                testPointIds: testPointIds,
                columns: Utils_Core.stringifyMSJSON(columns)
            }, callback, errorCallback);
    }

    public resetTestPoints(planId, testPointIds, callback, errorCallback?) {
        this._ajaxPost("ResetTestPoints", { planId: planId, testPointIds: testPointIds }, callback, errorCallback);
    }

    public assignTester(planId, testPointIds, tester, callback, errorCallback?) {
        this._ajaxPost("AssignTester", { planId: planId, testPointIds: testPointIds, tester: tester }, callback, errorCallback);
    }

    public assignTestersToSuite(suiteId: number, testers, callback: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxPost("AssignTestersToSuite", { suiteId: suiteId, testers: testers }, callback, errorCallback);
    }

    public assignTestersToSuiteWithAad(suiteId: number, testers, newUsersJson, callback: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxPost("AssignTestersToSuiteWithAad", { suiteId: suiteId, testers: testers, newUsersJson: newUsersJson }, callback, errorCallback);
    }

    public getTestersAssignedToSuite(suiteId: number, callback: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxJson("GetTestersAssignedToSuite", { suiteId: suiteId }, callback, errorCallback);
    }

    public assignConfigurationsToSuite(suiteId: number, configurations: number[], callback: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxPost("AssignConfigurationsToSuite", { suiteId: suiteId, configurations: configurations }, callback, errorCallback);
    }

    public assignConfigurationsToTestCases(testCaseAndSuiteIdList: TestCaseAndSuiteId[], configurations: number[], callback: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxPost("AssignConfigurationsToTestCases", { testCases: Utils_Core.stringifyMSJSON(testCaseAndSuiteIdList), configurations: configurations }, callback, errorCallback);
    }

    public getAvailableConfigurationsForSuite(suiteId: number, callback: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxJson("GetAvailableConfigurationsForSuite", { suiteId: suiteId }, callback, errorCallback);
    }

    public getAvailableConfigurationsForTestCases(testCaseAndSuiteIdList: TestCaseAndSuiteId[], callback: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxPost("GetAvailableConfigurationsForTestCases", { testCases: Utils_Core.stringifyMSJSON(testCaseAndSuiteIdList) }, callback, errorCallback);
    }

    public fetchFilteredSuitesTestPointCountInPlan(planId, outcome, tester, configuration, callback, errorCallback?) {
        this._ajaxPost("FetchSuitesTestPointCountInPlan", { planId: planId, outcome: outcome, tester: tester, configuration: configuration }, callback, errorCallback);
    }

    // TODO: Remove it after couple of sprints. Have retained this mainly for forward compat.
    public addTestCaseToSuite(testSuiteId: number, testSuiteRevision: number, testCaseId, linkedRequirementsIds: number[], callback: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxPost("AddTestCaseToTestSuite", { testSuiteId: testSuiteId, testSuiteRevision: testSuiteRevision, testCaseId: testCaseId, linkedRequirementsIds: linkedRequirementsIds }, callback, errorCallback);
    }

    public addTestCasesToSuite(testSuiteId: number, testSuiteRevision: number, testCaseIds: number[], callback: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxPost("AddTestCasesToTestSuite", { testSuiteId: testSuiteId, testSuiteRevision: testSuiteRevision, testCaseIds: testCaseIds }, callback, errorCallback);
    }

    public removeTestCasesFromSuite(testSuiteId: number, testSuiteRevision: number, testCaseIds, callback, errorCallback?) {
        this._ajaxPost("RemoveTestCasesFromSuite", { testSuiteId: testSuiteId, testSuiteRevision: testSuiteRevision, testCaseIds: testCaseIds }, callback, errorCallback);
    }

    public bulkMarkTestPoints(testPlanId, testSuiteId, testPointIds, outcome, callback, errorCallback?) {
        this._ajaxPost("BulkMarkTestPoints", { planId: testPlanId, suiteId: testSuiteId, testPointIds: testPointIds, outcome: outcome }, callback, errorCallback);
    }

    public updateColumnOptions(columnOptions: IColumnSettingModel[], removeExisting: boolean, callback?, errorCallback?) {
        this._ajaxPost("UpdateColumnOptions", { columnOptions: Utils_Core.stringifyMSJSON(columnOptions), removeExisting: removeExisting }, callback, errorCallback);
    }

    public updateColumnSortOrder(columnSortOrder: IColumnSortOrderModel, callback?, errorCallback?) {
        this._ajaxPost("UpdateColumnSortOrder", { columnSortOrder: Utils_Core.stringifyMSJSON(columnSortOrder) }, callback, errorCallback);
    }

    public updateSqmPoint(property: TCMConstants.TcmProperty, incrementBy: number, callback?, errorCallback?) {
        this._ajaxPost("UpdateSqmPoint", { property: property, incrementBy: incrementBy }, callback, errorCallback);
    }

    public fetchTcmPlanIds(witPlanIds: number[], callback: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxPost("FetchTcmPlanIds", { witPlanIds: witPlanIds }, callback, errorCallback);
    }

    private _ajaxJson(method: string, requestParams?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any) {
        /// <param name="method" type="string" />
        /// <param name="requestParams" type="any" optional="true" />
        /// <param name="callback" type="IResultCallback" optional="true" />
        /// <param name="errorCallback" type="IErrorCallback" optional="true" />
        /// <param name="ajaxOptions" type="any" optional="true" />

        Ajax.getMSJSON(this.getApiLocation(method), requestParams, callback, errorCallback, ajaxOptions);
    }

    private _ajaxJsonForSpecificProject(method: string, projectId: string, requestParams?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any) {
        Ajax.getMSJSON(this.getApiLocation(method, { project: projectId }), requestParams, callback, errorCallback, ajaxOptions);
    }

    private _ajaxPost(method: string, requestParams?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any) {
        /// <param name="method" type="string" />
        /// <param name="requestParams" type="any" optional="true" />
        /// <param name="callback" type="IResultCallback" optional="true" />
        /// <param name="errorCallback" type="IErrorCallback" optional="true" />
        /// <param name="ajaxOptions" type="any" optional="true" />

        Ajax.postMSJSON(this.getApiLocation(method), requestParams, callback, errorCallback, ajaxOptions);
    }
}

export module ParameterConstants {
    export let nameCharacters = "[" + UCD.unicodeCategory.Nd + UCD.unicodeCategory.Mn + UCD.unicodeCategory.Mc + UCD.unicodeCategory.Ll + UCD.unicodeCategory.Lo + UCD.unicodeCategory.Lu + UCD.unicodeCategory.Lt + "_-]";
    export let letterCharacters = "[" + UCD.unicodeCategory.Ll + UCD.unicodeCategory.Lo + UCD.unicodeCategory.Lu + UCD.unicodeCategory.Lt + "]";
    export let parameterCharacters = "[" + UCD.unicodeCategory.Lu + UCD.unicodeCategory.Ll + UCD.unicodeCategory.Lt + UCD.unicodeCategory.Lm + UCD.unicodeCategory.Lo + UCD.unicodeCategory.Nl + UCD.unicodeCategory.Nd + UCD.unicodeCategory.Mn + UCD.unicodeCategory.Pd + UCD.unicodeCategory.Pc + UCD.unicodeCategory.Mc + UCD.unicodeCategory.Cf + "_@]";
    export let nonParameterCharacters = "[^" + UCD.unicodeCategory.Lu + UCD.unicodeCategory.Ll + UCD.unicodeCategory.Lt + UCD.unicodeCategory.Lm + UCD.unicodeCategory.Lo + UCD.unicodeCategory.Nl + UCD.unicodeCategory.Nd + UCD.unicodeCategory.Mn + UCD.unicodeCategory.Pd + UCD.unicodeCategory.Pc + UCD.unicodeCategory.Mc + UCD.unicodeCategory.Cf + "_@]";
    // RegEx for parameter: 1) First char "@" followed by an optional "?" followed by nonwhitespace and non-punc characters
    // OR 2) Whitespace or punctuation characters followed by "@" followed by an optional "?" followed by  nonwhitespace and non-punc characters
    export let paramRegEx = new RegExp("(^@[\?]?" + parameterCharacters + "{1,})|(" + nonParameterCharacters + "{1,}@[\?]?" + parameterCharacters + "{1,})");
    export let encodeCharPattern = /_[Xx]([0-9a-fA-F]{4})_/;
    export let xml4eLetterPattern = "[" + UCD.unicodeCategory.LetterXml4e + "]";
    export let xml4eNameCharacterPattern = "[" + UCD.unicodeCategory.NcNameXml4e + "]";
}

export class ParameterCommonUtils {

    public static getParameters(parameterizedString: string): string[] {
        /// <summary>Parses the string to find parameters and returns the list of parameters</summary>
        /// <param name="parameterizedString" type="string">The string which is to be parsed</param>
        let currentParameter,
            found = true,
            arr,
            lines = HtmlUtils.getPlainTextLines(parameterizedString),
            res = [];

        $.each(lines, (i: number, parsedString: string) => {
            while ((arr = ParameterConstants.paramRegEx.exec(parsedString)) !== null) {
                currentParameter = arr[0].substr(arr[0].indexOf("@") + 1);
                // Remove the option "?" from the starting of the param name
                if (currentParameter[0] === "?") {
                    currentParameter = currentParameter.substr(1);
                }
                if ($.inArray(currentParameter, res) === -1) {
                    res.push(currentParameter);
                }
                parsedString = parsedString.substr(arr.index + arr[0].length);
            }
        });

        return res;
    }

    public static convertCharToHex(char: string): string {
        let hexValue = char.charCodeAt(0).toString(16).toUpperCase();

        while (hexValue.length < 4) {
            hexValue = "0" + hexValue;
        }
        hexValue = "_x" + hexValue + "_";

        return hexValue;
    }

    public static updateEncodedParameters(parameterNames: string[]): TFS_Core_Utils.Dictionary<string> {
        let i = 0,
            paramCount: number = parameterNames.length,
            paramName: string,
            encodedParams = new TFS_Core_Utils.Dictionary<string>();

        for (i = 0; i < paramCount; i++) {
            paramName = parameterNames[i];
            if (!encodedParams.containsKey(paramName)) {
                encodedParams.set(paramName, ParameterCommonUtils.encodeName(paramName));
            }
        }

        return encodedParams;
    }

    public static encodeName(paramName: string) {
        let result = "",
            length = paramName.length,
            startIndex: number,
            specialCharIndex = 0,
            encodeCharPattern = ParameterConstants.encodeCharPattern,
            matches,
            charPatternIndex = -1,
            matchResult,
            i = 0,
            matchCount = 0,
            indexInParamName = 0,
            charPatternIndexList: number[] = [],
            matchedString: string;

        if (!paramName || paramName === "") {
            return paramName;
        }
        startIndex = 0;
        if (paramName.indexOf("_") >= 0) {
            matchedString = paramName;
            //Store the indexes for all matches for patterns of type encodeCharPattern
            while ((matchResult = encodeCharPattern.exec(matchedString)) != null) {
                charPatternIndexList[i++] = matchResult.index + indexInParamName;
                indexInParamName = indexInParamName + matchResult.index + matchResult[0].length - 1;
                matchedString = matchedString.substr(matchResult.index + matchResult[0].length - 1);
            }
            matches = encodeCharPattern.exec(paramName);
        }
        if ((matches != null)) {
            charPatternIndex = charPatternIndexList[matchCount++];
            matchedString = paramName.substr(matches.index + matches[0].length - 1);
        }
        if ((!ParameterCommonUtils.IsLetterOrUnderscore(paramName[0]) && (paramName[0] !== ":")) || (charPatternIndex === 0)) {
            result += ParameterCommonUtils.convertCharToHex(paramName[0]);
            startIndex = 1;
            specialCharIndex++;
            if (charPatternIndex === 0) {
                matches = encodeCharPattern.exec(matchedString);
                if (matches) {
                    charPatternIndex = charPatternIndexList[matchCount++];
                    matchedString = matchedString.substr(matches.index + matches[0].length - 1);
                }
            }
        }
        while (specialCharIndex < length) {
            if (!ParameterCommonUtils.IsNameCharacterOrColon(paramName[specialCharIndex]) || (charPatternIndex === specialCharIndex)) {
                if (charPatternIndex === specialCharIndex) {
                    matches = encodeCharPattern.exec(matchedString);
                    if (matches) {
                        charPatternIndex = charPatternIndexList[matchCount++];
                        matchedString = matchedString.substr(matches.index + matches[0].length - 1);
                    }
                }

                result = result + paramName.substr(startIndex, specialCharIndex - startIndex);
                result = result + ParameterCommonUtils.convertCharToHex(paramName[specialCharIndex]);
                startIndex = specialCharIndex + 1;
            }
            specialCharIndex++;
        }

        if (startIndex === 0) {
            return paramName;
        }
        if (startIndex < length) {
            result = result + paramName.substr(startIndex, length - startIndex);
        }
        return result;
    }

    public static decodeName(paramName: string): string {
        let result = "",
            length = paramName.length,
            matchResult,
            i = 0,
            indexInParamName = 0,
            matches,
            startIndex = 0,
            combinedChar: number,
            c_encodedCharLength = 7,
            decodeCharPattern = ParameterConstants.encodeCharPattern,
            charPatternIndex = -1,
            charPatternIndexList: number[] = [],
            matchedString: string,
            matchCount = 0,
            index: number;

        if (!paramName || paramName === "") {
            return paramName;
        }

        index = paramName.indexOf("_");
        if (index < 0) {
            return paramName;
        }
        matchedString = paramName;
        //Store the indexes for all matches for patterns of type encodeCharPattern
        while ((matchResult = decodeCharPattern.exec(matchedString)) != null) {
            charPatternIndexList[i++] = matchResult.index + indexInParamName;
            indexInParamName = indexInParamName + matchResult.index + matchResult[0].length;
            matchedString = matchedString.substr(matchResult.index + matchResult[0].length);
        }
        if (charPatternIndexList[matchCount] !== undefined) {
            charPatternIndex = charPatternIndexList[matchCount++];
        }
        for (i = 0; i < ((length - c_encodedCharLength) + 1); i++) {
            if (i === charPatternIndex) {
                if (charPatternIndexList[matchCount] !== undefined) {
                    charPatternIndex = charPatternIndexList[matchCount++];
                }
                result = result + paramName.substr(startIndex, i - startIndex);
                if (paramName[i + c_encodedCharLength - 1] !== "_") {
                    combinedChar = this.getCombinedCharCodeForSurrogatePattern(paramName, i);
                    if (combinedChar < parseInt("10000", 16)) {
                        startIndex = (i + c_encodedCharLength) + 4;
                        result = result + String.fromCharCode(combinedChar);
                    }
                    i += (c_encodedCharLength - 1) + 4;
                }
                else {
                    startIndex = i + c_encodedCharLength;
                    combinedChar = (((parseInt(paramName[i + 2], 16) * 4096) + (parseInt(paramName[i + 3], 16) * 256)) + (parseInt(paramName[i + 4], 16) * 16)) + parseInt(paramName[i + 5], 16);
                    result = result + String.fromCharCode(combinedChar);
                    i += c_encodedCharLength - 1;
                }
            }
        }
        if (startIndex === 0) {
            return paramName;
        }
        if (startIndex < length) {
            result = result + paramName.substr(startIndex, length - startIndex);
        }
        return result;
    }

    private static getCombinedCharCodeForSurrogatePattern(paramName: string, index: number) {
        return (((((((parseInt(paramName[index + 2], 16) * 268435456) + (parseInt(paramName[index + 3], 16) * 16777216)) + (parseInt(paramName[index + 4], 16) * 1048576)) + (parseInt(paramName[index + 5], 16) * 65536)) + (parseInt(paramName[index + 6], 16) * 4096)) + (parseInt(paramName[index + 7], 16) * 256)) + (parseInt(paramName[index + 8], 16) * 16)) + parseInt(paramName[index + 9], 16);
    }

    public static isLetter(character: string) {
        let paramRegEx = new RegExp("(" + ParameterConstants.xml4eLetterPattern + "{1})"),
            result = paramRegEx.exec(character);
        if (result === null) {
            return false;
        }
        return true;
    }

    public static IsLetterOrUnderscore(char: string) {
        if (!ParameterCommonUtils.isLetter(char)) {
            return (char === "_");
        }
        return true;
    }

    public static IsNameCharacterOrColon(char: string) {
        if (!ParameterCommonUtils.isNameCharacter(char)) {
            return (char === ":");
        }
        return true;
    }

    public static isNameCharacter(character: string) {
        let paramRegEx = new RegExp("(" + ParameterConstants.xml4eNameCharacterPattern + "{1})"),
            result = paramRegEx.exec(character);
        if (result === null) {
            return false;
        }
        return true;
    }

    public static hasParameters(content: string): boolean {
        let dataWithoutAhref, paramName, paramRegEx;

        if (content) {
            // We do not need to search the parameters in the attributes of the Anchor tags. In case of the anchor tags we need to check only the display text of the link.
            // So removing the starting anchor tag from the string so that we dont get a false parameter (some text in anchor tag href attribute starting with @)
            // Regular expression used here: <a > tag with anything after a, but used ? for the shortest match.
            dataWithoutAhref = content.replace(/<a((\s|\S)*?)>/i, "");

            paramName = ParameterConstants.paramRegEx.exec(dataWithoutAhref);
            if (paramName === null) {
                //Try with plain text also
                paramName = ParameterConstants.paramRegEx.exec($(HtmlUtils.wrapInDiv(content)).text());
                if (paramName === null) {
                    return false;
                }
            }

            return true;
        }
        return false;
    }

    public static isValidParameterString(paramName: string): boolean {
        let paramRegEx = new RegExp("(" + ParameterConstants.parameterCharacters + "{1,})"),
            result = paramRegEx.exec(paramName);
        if (result === null || result[0] !== paramName) {
            return false;
        }
        return true;
    }

    public static createParamRegExForString(paramName: string) {
        return new RegExp("(^@[\?]?" + paramName + ")|(" + ParameterConstants.nonParameterCharacters + "{1}@[\?]?" + paramName + ")", "ig");
    }

    public static getParametersDataRow($parametersXml: JQuery) {
        let that = this, paramName, paramValue, params = [], parameterDataRow = {};

        //loop through each param and only add ones that are not already in the list
        $parametersXml.find("parameters").children().each(function () {
            paramName = $(this).attr("name");
            paramValue = $(this).find("value").text();
            if ($.inArray(paramName, params) === -1) {
                params.push(paramName);
                parameterDataRow[paramName] = paramValue;
            }
        });
        return parameterDataRow;
    }

    public static parseParameters($parameters: JQuery): string[] {
        let paramName, params: string[] = [];

        //loop through each param and only add ones that are not already in the list
        $parameters.find("parameters").children().each(function () {
            paramName = $(this).attr("name");
            if (($.inArray(paramName, params) === -1)) {
                params.push(paramName);
            }
        });

        return params;
    }

    public static getParameterCountInString(targetString: string, paramName: string): number {
        /// <summary>Parses the string to find the count of parameters with the name paramName</summary>

        let currentParameter: string,
            found = true,
            arr,
            lines = HtmlUtils.getPlainTextLines(targetString),
            paramCount = 0;

        $.each(lines, (i: number, parsedString: string) => {
            while ((arr = ParameterConstants.paramRegEx.exec(parsedString)) !== null) {
                currentParameter = arr[0].substr(arr[0].indexOf("@") + 1);
                // Remove the optional "?" from the starting of the param name
                if (currentParameter[0] === "?") {
                    currentParameter = currentParameter.substr(1);
                }
                if (Utils_String.localeIgnoreCaseComparer(currentParameter, paramName) === 0) {
                    paramCount++;
                }
                parsedString = parsedString.substr(arr.index + arr[0].length);
            }
        });

        return paramCount;
    }

    public static renameParameterInPlainString(targetString: string, paramName: string, newParamName: string): string {
        /// <summary>Renames parameter in plain text</summary>

        let result = "",
            lines = HtmlUtils.getPlainTextLines(targetString);

        $.each(lines, (i: number, parsedString: string) => {
            parsedString = this.renameParameterInString(parsedString, paramName, newParamName);

            if (parsedString !== "") {
                result = result + "<p>" + parsedString + "</p>";
            }
        });

        return result;
    }

    public static renameParameterInString(targetString: string, paramName: string, newParamName: string): string {
        // If the newParamName is empty, then the parameter "paramName" will be removed.
        let arr, result,
            paramsRenamed = 0,
            count = this.getParameterCountInString(targetString, paramName),
            paramRegEx: RegExp = ParameterCommonUtils.createParamRegExForString(paramName),
            originalString = targetString,
            matchLength: number,
            matchIndex: number;

        if (paramName === newParamName) {
            return targetString;
        }

        while ((arr = paramRegEx.exec(targetString)) !== null) {
            matchLength = arr[0].length;
            matchIndex = arr.index;
            // If the string starts with @, the regEx match would start from '@' else it would start from the non-param character before '@'
            if (targetString.substring(arr.index, 1) === "@") {
                matchIndex = matchIndex - 1;
                matchLength = matchLength + 1;
            }
            if (this._isNonParamCharacter(targetString, matchIndex + matchLength)) {
                if (newParamName && newParamName !== "") {
                    targetString = targetString.substring(0, matchIndex + 2) + newParamName + targetString.substring(matchIndex + matchLength);
                    paramRegEx.lastIndex = matchIndex + 2 + newParamName.length;
                }
                else { //Remove the parameter
                    // Remove all the "@"s in the beginning of the parameter so that the remaining string is not a parameter.
                    result = /^@{1,}/.exec(targetString.substring(matchIndex + 1));
                    targetString = targetString.substring(0, matchIndex + 1) + targetString.substring(matchIndex + 1 + result[0].length);
                    paramRegEx.lastIndex = matchIndex + 1 + result[0].length;
                }
                paramsRenamed++;
            }
            else {
                paramRegEx.lastIndex = matchIndex + matchLength;
            }
        }
        if (paramsRenamed === count && this.getParameterCountInString(targetString, paramName) === 0) {
            return targetString;
        }
        else { // If all the parameters were not renamed in the rich text, try with plain text
            return ParameterCommonUtils.renameParameterInPlainString(originalString, paramName, newParamName);
        }
    }

    private static _isNonParamCharacter(targetString: string, index: number): boolean {
        if (index >= 0 && index < targetString.length) {
            if (targetString[index].match(ParameterConstants.nonParameterCharacters)) {
                return true;
            }
        }
        else if (index === targetString.length) {
            // In case the preceeding character was the last character we can return true as it is the end of the string and non-param char is not required to end the param name
            return true;
        }
        return false;
    }
}

export class HtmlUtils {

    public static wrapInDiv(content: string): string {
        return "<div>" + content + "</div>";
    }

    public static isEmptyText(content: string): boolean {
        let text = $(HtmlUtils.wrapInDiv(content)).text();
        return $.trim(text) === "";
    }

    public static replaceNewLineWithBr(paramString: string): string {
        if (!paramString || $.trim(paramString) === "") {
            return paramString;
        }

        paramString = paramString.replace(/\r?\n/g, "<br />");
        return paramString;
    }

    public static getPlainTextLines(htmlString: string): string[] {
        //Before getting the plain text from html preserve the new lines with \n, so that we can split on the base of \n after converting to plain text.
        if (htmlString !== undefined && htmlString !== null) {
            htmlString = htmlString.replace(/<\/p><p>|<p>|<\/p>|<br>|<br\/>|<br \/>/ig, "\n");

            return $(HtmlUtils.wrapInDiv(htmlString)).text().split("\n");
        }
        else {
            return [];
        }
    }

    public static replaceEmptyParagraphTagsWithNbsp($lines: JQuery): JQuery {
        let length = $lines.length,
            index = 0,
            $line: JQuery;

        for (index = 0; index < length; index++) {
            $line = $($lines[index]);
            if ($.trim($line.text()) === "") {
                $line.html("&nbsp;");
            }
        }

        return $lines;
    }
}

export class WorkItemPageDataUtils {

    public static getWitFieldIndex(fieldName: string, pageColumns: string[]): number {
        let i = 0, len = pageColumns.length;
        for (i = 0; i < len; i++) {
            if (Utils_String.ignoreCaseComparer(fieldName, pageColumns[i]) === 0) {
                return i;
            }
        }

        return -1;
    }
}

export class WitLinkingHelper {

    public static TESTED_BY_LINKTYPE_FORWARD: string = "Microsoft.VSTS.Common.TestedBy-Forward";
    public static TESTED_BY_LINKTYPE_REVERSE: string = "Microsoft.VSTS.Common.TestedBy-Reverse";
    public static SHAREDSTEPS_LINKTYPE_REVERSE: string = "Microsoft.VSTS.TestCase.SharedStepReferencedBy-Reverse";
    public static SHAREDSTEPS_LINKTYPE_FORWARD: string = "Microsoft.VSTS.TestCase.SharedStepReferencedBy-Forward";
    public static SHAREDPARAMETER_LINKTYPE_FORWARD: string = "Microsoft.VSTS.TestCase.SharedParameterReferencedBy-Forward";
    public static SHAREDPARAMETER_LINKTYPE_REVERSE: string = "Microsoft.VSTS.TestCase.SharedParameterReferencedBy-Reverse";
    public static RELATED_LINKTYPE_FORWARD: string = "System.LinkTypes.Related-Forward";
    public static PARENT_LINK_TYPE = "System.LinkTypes.Hierarchy-Reverse";

    public static linkTestCaseToBug(bug: WITOM.WorkItem, testCaseId: number, isUpdate?: boolean, comments?: string) {
        if (isUpdate) {
            let link = WitLinkingHelper.getLink(bug, testCaseId, this.TESTED_BY_LINKTYPE_FORWARD);
            if (link) {
                return;
            }
        }
        WitLinkingHelper._addLinkToWorkItem(bug, testCaseId, this.TESTED_BY_LINKTYPE_FORWARD, comments);
    }

    public static linkTestCasesToBug(bug: WITOM.WorkItem, testCaseIds: number[], comments?: string) {
        WitLinkingHelper._tryAddLinksToWorkItem(bug, testCaseIds, this.TESTED_BY_LINKTYPE_FORWARD, comments);
    }

    public static linkRequirementSuiteToBugWithParentLink(bug: WITOM.WorkItem, requirementId: number, isUpdate?: boolean, comments?: string) {
        if (isUpdate) {
            let parentLinks = WitLinkingHelper.getLinks(bug, this.PARENT_LINK_TYPE);
            if (parentLinks && parentLinks.length > 0) {
                this.linkRequirementSuiteToBugWithRelatedLink(bug, requirementId, isUpdate, comments);
                return;
            }
        }
        WitLinkingHelper._addLinkToWorkItem(bug, requirementId, this.PARENT_LINK_TYPE, comments);
    }

    public static linkRequirementSuiteToBugWithRelatedLink(bug: WITOM.WorkItem, requirementId: number, isUpdate?: boolean, comments?: string) {
        if (isUpdate) {
            let relatedLink = WitLinkingHelper.getLink(bug, requirementId, this.RELATED_LINKTYPE_FORWARD);
            if (relatedLink) {
                return;
            }
        }
        WitLinkingHelper._addLinkToWorkItem(bug, requirementId, this.RELATED_LINKTYPE_FORWARD, comments);
    }

    public static linkTestCasesToRequirement(requirement: WITOM.WorkItem, testCaseIds: number[], comments?: string) {
        WitLinkingHelper._tryAddLinksToWorkItem(requirement, testCaseIds, this.TESTED_BY_LINKTYPE_FORWARD, comments);
    }

    public static linkTestCaseToSharedSteps(testCase: WITOM.WorkItem, sharedStepIds: number[], comments?: string) {
        WitLinkingHelper._tryAddLinksToWorkItem(testCase, sharedStepIds, this.SHAREDSTEPS_LINKTYPE_REVERSE, comments);
    }

    public static linkTestCaseToSharedParameterDataSet(testCase: WITOM.WorkItem, sharedParamDataSetId: number, comments?: string) {
        WitLinkingHelper._addLinkToWorkItem(testCase, sharedParamDataSetId, this.SHAREDPARAMETER_LINKTYPE_REVERSE, comments);
    }

    public static unlinkSharedParameterDataSetFromTestCase(testCase: WITOM.WorkItem, sharedParamDataSetId: number) {
        let sharedParamLink: WITOM.WorkItemLink;
        sharedParamLink = WitLinkingHelper.getLink(testCase, sharedParamDataSetId, this.SHAREDPARAMETER_LINKTYPE_REVERSE);
        if (sharedParamLink) {
            testCase.removeLinks([sharedParamLink]);
        }
    }

    public static unlinkSharedStepsFromTestCase(testCase: WITOM.WorkItem, sharedStepIds: number[], comments?: string) {
        let i = 0,
            len = sharedStepIds.length,
            workItemLinks: WITOM.WorkItemLink[] = [],
            sharedStepLink: WITOM.WorkItemLink;

        for (i = 0; i < len; i++) {
            sharedStepLink = WitLinkingHelper.getLink(testCase, sharedStepIds[i], this.SHAREDSTEPS_LINKTYPE_REVERSE);
            if (sharedStepLink) {
                workItemLinks.push(sharedStepLink);
            }
        }

        testCase.removeLinks(workItemLinks);
    }

    public static getLink(workItem: WITOM.WorkItem, linkId: number, linkType: string): WITOM.WorkItemLink {
        let i = 0,
            len = workItem.getLinks().length,
            wiLink: WITOM.WorkItemLink;

        for (i = 0; i < len; i++) {
            if (workItem.getLinks()[i] instanceof WITOM.WorkItemLink) {
                wiLink = <WITOM.WorkItemLink>workItem.getLinks()[i];
                if (wiLink.getTargetId() === linkId && wiLink.getLinkTypeEnd().immutableName === linkType) {
                    return wiLink;
                }
            }
        }

        return null;
    }

    public static getLinks(workItem: WITOM.WorkItem, linkType: string): WITOM.WorkItemLink[] {
        let i = 0,
            len = workItem.getLinks().length,
            wiLink: WITOM.WorkItemLink,
            witLinks: WITOM.WorkItemLink[] = [];
        for (i = 0; i < len; i++) {
            if (workItem.getLinks()[i] instanceof WITOM.WorkItemLink) {
                wiLink = <WITOM.WorkItemLink>workItem.getLinks()[i];
                if (wiLink.getLinkTypeEnd().immutableName === linkType) {
                    witLinks.push(wiLink);
                }
            }
        }
        return witLinks;
    }

    private static _tryAddLinksToWorkItem(workItem: WITOM.WorkItem, linkIds: number[], linkType: string, comment?: string) {
        let i = 0,
            len = linkIds.length,
            linksToAdd: number[] = [];

        for (i = 0; i < len; i++) {
            if (!WitLinkingHelper.getLink(workItem, linkIds[i], linkType)) {
                linksToAdd.push(linkIds[i]);
            }
        }

        for (i = 0, len = linksToAdd.length; i < len; i++) {
            WitLinkingHelper._addLinkToWorkItem(workItem, linksToAdd[i], linkType, comment);
        }
    }

    private static _addLinkToWorkItem(workItem: WITOM.WorkItem, linkId: number, linkType: string, comment?: string) {
        let workItemLink = WITOM.WorkItemLink.create(workItem, linkType, linkId, comment);
        workItem.addLink(workItemLink);
    }
}

export class TestActionTypes {
    public static Step: string = "Step";
    public static SharedSteps: string = "SharedSteps";
}

export class TestStepTypes {
    public static Action: string = "ActionStep";
    public static Validate: string = "ValidateStep";
}

export class TestAction {

    private _isDirty: boolean;

    public id: number;
    public actionType: string;
    public action: string;
    public index: number;
    public owner: any;

    constructor(id, actionType) {
        this.id = id;
        this.actionType = actionType;
        this._isDirty = false;
        this.owner = null;
    }

    public setIndex(index) {
        this.index = index;
    }

    public getIsDirty() {
        return this._isDirty;
    }

    public setIsDirty(isDirty: boolean) {
        this._isDirty = isDirty;
    }

    public hasError() {
        return false;
    }

    public appendTo($stepsXmlDom: JQuery): JQuery {
        return $stepsXmlDom;
    }

    public getAttachmentCount() {
        return 0;
    }

    public getAttachments() {
        return null;
    }

    public processTestAttachments(attachmentList): boolean {
        return false;
    }

}

VSS.initClassPrototype(TestAction, {
    id: null,
    actionType: null,
    action: null,
    index: null,
    _attachments: null,
    owner: null
});

export class ResourceLink implements IResourceLink {
    public AddedDate: Date;
    public AreaId: number;
    public Comment: string;
    public CreationDate: Date;
    public ExtId: number;
    public FilePath: string;
    public FilePathHash: number;
    public FldId: number;
    public LastWriteDate: Date;
    public Length: number;
    public OriginalName: string;
    public RemovedDate: Date;
    public WorkItemId: number;
}

export class TestStepAttachmentMetadata {
    private resource: ResourceLink;
    private uri: string;

    public getUri(): string {
        return this.uri;
    }

    public setUri(uri: string): void {
        this.uri = uri;
    }

    public getComment(): string {
        return this.resource.Comment;
    }

    public getOriginalName(): string {
        return this.resource.OriginalName;
    }

    public getFilePath(): string {
        return this.resource.FilePath;
    }

    public getLength(): number {
        return this.resource.Length;
    }

    public getWorkItemId(): number {
        return this.resource.WorkItemId;
    }

    public updateMetadatafromAttachment(attachment: WITOM.Attachment) {
        this.resource.AddedDate = attachment.getAddedDate();
        this.resource.Comment = attachment.getComment();
        this.resource.FilePath = attachment.getFilePath();
        this.resource.FldId = attachment.getFieldId();
        this.resource.WorkItemId = attachment.workItem.id;
        this.resource.Length = attachment.getLength();
        this.resource.OriginalName = attachment.getName();
        this.uri = attachment.getUri(true);
    }

    public updateMetadatafromResourceLink(resource: IResourceLink) {
        this.resource = resource;
    }

    constructor() {
        this.resource = new ResourceLink();
    }
}

VSS.initClassPrototype(TestStepAttachmentMetadata, {
    resource: null,
    uri: null
});

export class TestStep extends TestAction {

    public static createStep(id, stepType, action, expectedResult, isFormatted?: boolean) {
        /// <param name="isFormatted" type="boolean" optional="true" />

        let testStep = new TestStep(id, stepType, action, expectedResult, isFormatted);
        return testStep;
    }

    public stepType: string;
    public expectedResult: string;
    public isFormatted: boolean;
    private _hasActionError: boolean;
    private _updateOwner: boolean;
    private _hasExpectedResultError: boolean;
    private _actionParameters: string[];
    private _expectedParameters: string[];
    private _attachments: WITOM.Attachment[];
    private _attachmentsMetadata: TestStepAttachmentMetadata[];

    constructor(id, stepType, action, expectedResult, isFormatted?: boolean) {
        /// <param name="isFormatted" type="boolean" optional="true" />
        let parameters: string[];
        super(id, TestActionTypes.Step);
        this._actionParameters = [];
        this._expectedParameters = [];
        this.stepType = stepType;

        this.action = action;
        this._updateParameters(ParameterCommonUtils.getParameters(action), this._actionParameters);

        this.expectedResult = expectedResult;
        this._updateParameters(ParameterCommonUtils.getParameters(expectedResult), this._expectedParameters);

        this.isFormatted = isFormatted;
        this._hasActionError = false;
        this._hasExpectedResultError = false;
        this._attachments = [];
        this._attachmentsMetadata = [];
        this._updateOwner = true;
    }

    public setAction(action: string): boolean {
        let parameters;
        if (this.action !== action) {
            parameters = ParameterCommonUtils.getParameters(action);
            this._hasActionError = parameters.length > 0;
            if (this._updateParameters(parameters, this._actionParameters)) {
                // If the user does not confirm in case of deletion of the last reference of a parameter, the changes done by the user should be undone.
                // This can be done by not setting the action in this case.
                this.action = action;
                this.setIsDirty(true);
                return true;
            }
        }
        return false;
    }

    public setExpectedResult(expectedResult: string): boolean {
        let parameters;
        if (this.expectedResult !== expectedResult) {
            parameters = ParameterCommonUtils.getParameters(expectedResult);
            this._hasExpectedResultError = parameters.length > 0;
            if (this._updateParameters(parameters, this._expectedParameters)) {
                this.expectedResult = expectedResult;
                this.setIsDirty(true);
                if (!this._isExpectedResultEmpty()) {
                    this.stepType = TestStepTypes.Validate;
                }
                else {
                    this.stepType = TestStepTypes.Action;
                }
                return true;
            }
        }
        return false;
    }

    public hasError() {
        return this._hasActionError || this._hasExpectedResultError;
    }

    public hasActionError() {
        return this._hasActionError;
    }

    public hasExpectedResultError() {
        return this._hasExpectedResultError;
    }

    public getActionParameters(): string[] {
        return this._actionParameters;
    }

    public getExpectedParameters(): string[] {
        return this._expectedParameters;
    }

    public appendTo($stepsXmlDom: JQuery): JQuery {
        let stepXml = $.parseXML("<step></step>"),
            $stepXml = $(stepXml).find("step"),
            descriptionXml = $.parseXML("<description></description>"),
            $descriptionXml = $(descriptionXml).find("description");

        $stepXml.attr("id", this.id);
        if (!this._isExpectedResultEmpty()) {
            $stepXml.attr("type", TestStepTypes.Validate);
        }
        else {
            $stepXml.attr("type", TestStepTypes.Action);
        }

        this._addParameterizedString($stepXml, this.action);
        this._addParameterizedString($stepXml, this.expectedResult);
        $stepXml.append($descriptionXml);

        $stepsXmlDom.append($stepXml);
        return $stepsXmlDom;
    }

    public processTestAttachments(attachmentList: WITOM.Link[]): boolean {
        let metaTag = Utils_String.format("[teststep={0}]", this.id),
            i,
            comment,
            commentMetaTag,
            attachment,
            attachmentFound = false,
            length: number;

        // If there are attachements, look for ones that belong to this test step.
        // To figure out if it belongs to the step, look at the comment for the
        // attachment and see if it starts with something like [TestStep=1].
        if (attachmentList) {
            length = attachmentList.length;
            for (i = 0; i < length; i++) {
                comment = attachmentList[i].linkData.Comment;
                if (comment && comment.length > metaTag.length) {
                    commentMetaTag = comment.substr(0, metaTag.length).toLowerCase();
                    if (commentMetaTag === metaTag) {
                        if (attachmentList[i] instanceof WITOM.Attachment) {
                            this.addAttachment(<WITOM.Attachment>attachmentList[i]);
                            attachmentFound = true;
                        }
                    }
                }
            }
        }

        return attachmentFound;
    }

    public getAttachmentCount(): number {
        return this._attachments ? this._attachments.length : 0;
    }

    public getAttachments(): WITOM.Attachment[] {
        return this._attachments;
    }

    public getAttachmentsMetadataList(): TestStepAttachmentMetadata[] {
        return this._attachmentsMetadata;
    }

    public deleteAttachment(attachment: WITOM.Attachment): boolean {
        let isItemRemoved: boolean;
        if (attachment) {
            isItemRemoved = Utils_Array.remove(this.getAttachments(), attachment);
            if (isItemRemoved) {
                attachment.remove();
            }
        }
        return isItemRemoved;
    }

    public clearAttachments(): void {
        let stepAttachments: WITOM.Attachment[] = Utils_Array.clone(this.getAttachments()),
            i: number,
            stepAttachmentCount: number = stepAttachments.length;

        for (i = 0; i < stepAttachmentCount; i++) {
            this.deleteAttachment(stepAttachments[i]);
        }
    }

    public addAttachment(attachment: WITOM.Attachment) {
        this._attachments.push(attachment);
        this._addAttachmentMetadata(attachment);
    }

    private _addAttachmentMetadata(attachment: WITOM.Attachment) {
        let attachmentMetadata: TestStepAttachmentMetadata = new TestStepAttachmentMetadata();

        attachmentMetadata.updateMetadatafromAttachment(attachment);
        this._attachmentsMetadata.push(attachmentMetadata);
    }

    public updateAttachmentsMetadataList(attachmentMetadata: TestStepAttachmentMetadata) {
        this._attachmentsMetadata.push(attachmentMetadata);
    }

    private _addParameterizedString($stepXml: JQuery, paramString: string) {
        let contentToWrite: string,
            paramStringXml: string,
            xmlString: string,
            $paramStringXml: JQuery;

        contentToWrite = HtmlNormalizer.normalize(paramString);
        if (!this.isFormatted) {
            contentToWrite = HtmlUtils.replaceNewLineWithBr(contentToWrite);
        }
        xmlString = Utils_String.htmlEncode(contentToWrite).replace(/&nbsp;/g, "&amp;nbsp;");
        paramStringXml = <any>$.parseXML(Utils_String.format("<parameterizedString>{0}</parameterizedString>", xmlString));
        $paramStringXml = $(paramStringXml).find("parameterizedString");
        $paramStringXml.attr("isformatted", "true");
        $stepXml.append($paramStringXml);
    }

    private _getContentToWrite(paramString: string) {
        let contentToWrite = HtmlNormalizer.normalize(paramString),
            innerHtml = /<div>([\S\s]*?)<\/div>/i.exec(paramString);

        if (innerHtml === null) {
            return "<div>" + paramString + "</div>";
        }
        else {
            return paramString;
        }
    }

    private _isExpectedResultEmpty(): boolean {
        let expectedResultText: string;
        if (!this.expectedResult) {
            return true;
        }

        expectedResultText = $(HtmlUtils.wrapInDiv(this.expectedResult)).text();
        return $.trim(expectedResultText) === "";
    }

    private _updateParameters(newParamList: string[], targetParamList: string[]): boolean {
        // Updates the targetParamList according to the new paramList. And for all the updates(adds/deletes), fires the changes in the testcase.
        // Returns true if the update was successful. The update could be unsuccessful if on deletion of the last reference of a parameter, the user does not confirm.
        let i: number,
            deletedItems: string[] = [],
            addedItems: string[] = [],
            length: number;

        $.each(targetParamList, function (i, item) {
            if (!Utils_Array.contains(newParamList, item, Utils_String.localeIgnoreCaseComparer)) {
                deletedItems.push(item);
            }
        });

        $.each(newParamList, function (i, item) {
            if (!Utils_Array.contains(targetParamList, item, Utils_String.localeIgnoreCaseComparer)) {
                addedItems.push(item);
            }
        });

        // Delete items present in deletedItems from the targetParamList
        if (deletedItems.length > 0 && this.owner) {
            if (!this.owner.fireParamDeleteEvent(deletedItems)) {
                return false;
            }
        }

        this._deleteParametersFromList(deletedItems, targetParamList);

        // Add the new items to the targetParamList
        this._addParametersToList(addedItems, targetParamList);
        return true;
    }

    private _addParametersToList(paramNames: string[], paramList: string[]) {
        let length = paramNames.length,
            i: number;

        for (i = 0; i < length; i++) {
            if (!Utils_Array.contains(paramList, paramNames[i], Utils_String.localeIgnoreCaseComparer)) {
                paramList.push(paramNames[i]);
                // Update the parameter in testcase.
                if (this.owner && this._updateOwner) {
                    this.owner.onAddParameterInSteps(paramNames[i]);
                }
            }
        }
    }

    private _deleteParametersFromList(paramNames: string[], paramList: string[]) {
        let index: number,
            i: number, j: number,
            paramListLength = paramList.length,
            length = paramNames.length;

        for (i = 0; i < length; i++) {
            for (j = 0; j < paramListLength; j++) {
                if (Utils_String.localeIgnoreCaseComparer(paramNames[i], paramList[j]) === 0) {
                    paramList.splice(j, 1);
                    j++;
                    // Update the parameter in testcase.
                    if (this.owner && this._updateOwner) {
                        this.owner.onDeleteParameterInSteps(paramNames[i]);
                    }
                }
            }
        }
    }

    public deleteParameter(paramName: string) {
        let action = ParameterCommonUtils.renameParameterInString(this.action, paramName, ""),
            expected = ParameterCommonUtils.renameParameterInString(this.expectedResult, paramName, "");
        // setAction and setExpectedResult will update the parameter arrays for the step.
        this.setAction(action);
        this.setExpectedResult(expected);
    }

    public renameParameter(paramName: string, newParamName: string) {
        let action = ParameterCommonUtils.renameParameterInString(this.action, paramName, newParamName),
            expected = ParameterCommonUtils.renameParameterInString(this.expectedResult, paramName, newParamName);
        // In case of rename there is no need to update owner's refCounts. The refCounts will remain same in case of rename.
        this._updateOwner = false;
        this.setAction(action);
        this.setExpectedResult(expected);
        this._updateOwner = true;
    }
}

VSS.initClassPrototype(TestStep, {
    stepType: null,
    expectedResult: null,
    isFormatted: false,
    _updateOwner: true,
    _actionParameters: null,
    _expectedParameters: null
});

export class WorkItemWrapper {
    constructor(workItem?: WITOM.WorkItem) {
        this._workItem = workItem;
    }

    public getWorkItem() {
        return this._workItem;
    }

    public isDirty(): boolean {
        return this._workItem.isDirty();
    }

    public getId() {
        return this._workItem.id;
    }

    public getRevision() {
        return this._workItem.revision;
    }

    public getTitle(orig?: boolean) {
        return this._workItem.getField(WITConstants.CoreField.Title).getValue(orig);
    }

    public setTitle(value: string) {
        this._workItem.getField(WITConstants.CoreField.Title).setValue(value);
    }

    public getLinks() {
        return this._workItem.getLinks();
    }

    public getFieldValue(refName: string, revision?: number) {
        let field = this._workItem.getField(refName);
        if (field) {
            let fieldId = field.fieldDefinition.id;
            if (revision) {
                return this._workItem.getFieldValueByRevision(fieldId, revision);
            }
            else {
                return this._workItem.getField(refName).getValue();
            }
        }
        return null;
    }

    public setFieldValue(field: string, value: string) {
        this._workItem.setFieldValue(field, value);
    }

    public isInvalid() {
        return (!this._workItem.isValid() || this._workItem.hasError());
    }

    public getError(): Error {
        return this._workItem.getError();
    }

    public reset() {
        this._workItem.reset();
    }

    private _workItem: WITOM.WorkItem;
}

export class TestBase {

    public static TestCaseCoreFields = [
        WITConstants.CoreFieldRefNames.Id,
        WITConstants.CoreFieldRefNames.Rev,
        WITConstants.CoreFieldRefNames.Title,
        WITConstants.CoreFieldRefNames.Description,
        TCMConstants.WorkItemFieldNames.Actions,
        TCMConstants.WorkItemFieldNames.Parameters,
        TCMConstants.WorkItemFieldNames.DataField
    ];

    public static SharedStepCoreFields = [WITConstants.CoreFieldRefNames.Id,
    WITConstants.CoreFieldRefNames.Rev,
    WITConstants.CoreFieldRefNames.Title,
    TCMConstants.WorkItemFieldNames.Actions,
    TCMConstants.WorkItemFieldNames.Parameters
    ];

    public static TestCaseIdAndTitleFields = [
        WITConstants.CoreFieldRefNames.Id,
        WITConstants.CoreFieldRefNames.Title
    ];

    constructor(id: number, revision: number, title: string, testSteps: TestAction[], parameters: string[], properties?: any, project?: any) {
        this._id = id;
        this._title = title;
        this.setTestSteps(testSteps);
        this._parameters = new Parameters(parameters);
        this._isDirty = false;
        this._revision = revision;
        this._isStepsFieldModified = false;
        this._attachmentProcessed = false;
        this._properties = properties || {};
        this._project = project;
    }

    public paramDeleteEvent: (paramsToBeDeleted: string[], testCase: TestBase) => boolean;

    public getId() {
        return this._workItemWrapper ? this._workItemWrapper.getId() : this._id;
    }

    public getProperties(): any {
        return this._properties;
    }

    public getProperty(fieldRefName: string): string {
        if (this._properties && this._properties.hasOwnProperty(fieldRefName)) {
            return this._properties[fieldRefName];
        }

        return "";
    }

    public setProperty(fieldRefName: string, value: string): boolean {
        if (this._properties) {
            if (this._properties[fieldRefName] !== value) {
                this._properties[fieldRefName] = value;
                this.setIsDirty(true);
                return true;
            }
        }

        return false;
    }

    public setProperties(propertyNames: string[]): boolean {
        let len: number, index: number,
            workItemWrapper = this.getWorkItemWrapper();
        if (workItemWrapper) {
            this._properties = {};
            for (index = 0, len = propertyNames.length; index < len; index++) {
                this._properties[propertyNames[index]] = workItemWrapper.getFieldValue(propertyNames[index]);
            }
            return true;
        }
        return false;
    }

    public getTitle() {
        return this._title;
    }

    public setTitle(title: string): boolean {
        if (this._title !== title) {
            this._title = title;
            this._isDirty = true;
            if (this._workItemWrapper) {
                this._workItemWrapper.setTitle(title);
            }

            return true;
        }
        else {
            return false;
        }
    }

    public intializeParameters(parameters: string[]) {
        this._parameters = new Parameters(parameters);
        this._calculateParameterRefCountsFromSteps();
    }

    public resetTitle(title: string) {
        this._title = title;
    }

    public updateLocalRevision() {
        if (this._workItemWrapper) {
            this._revision = this._workItemWrapper.getRevision();
        }
    }

    public isLatestRevision(): boolean {
        if (this._workItemWrapper && this._revision) {
            return this._workItemWrapper.getRevision() === this._revision;
        }
        return true;
    }

    public getRevision() {
        return this._workItemWrapper ? this._workItemWrapper.getRevision() : this._revision;
    }

    public getParameters(): any[] {
        return this._parameters.getParameters();
    }

    public getParameterByName(paramName: string): string {
        let parameters = this.getParameters(),
            length = parameters.length,
            i: number;

        for (i = 0; i < length; i++) {
            if (Utils_String.localeIgnoreCaseComparer(paramName, parameters[i]) === 0) {
                return parameters[i];
            }
        }

        return "";
    }

    public setParameters(parameters: string[]) {
        this._parameters.setParameters(parameters);
        this._calculateParameterRefCountsFromSteps();
    }

    public hasParameters() {
        return this._parameters && this._parameters.count() > 0;
    }

    public setTestSteps(testSteps: TestAction[]) {
        let i: number,
            length: number;
        this._testSteps = testSteps;
        length = this._testSteps.length;

        for (i = 0; i < length; i++) {
            this._testSteps[i].owner = this;
        }
    }

    public getTestSteps() {
        return this._testSteps;
    }

    public getTestStep(id: number): TestAction {
        let i: number;
        for (i = 0; i < this._testSteps.length; i++) {
            if (id === this._testSteps[i].id) {
                return this._testSteps[i];
            }
        }
    }

    public getWorkItemWrapper() {
        return this._workItemWrapper;
    }

    public setWorkItemWrapper(workItemWrapper: WorkItemWrapper, pin?: boolean) {
        let witStore;
        this._workItemWrapper = workItemWrapper;
        if (pin) {
            witStore = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
            WorkItemManager.get(witStore).setWorkItem(workItemWrapper.getWorkItem());
        }
    }

    public getIsDirty() {
        let i = 0, length = this._testSteps.length;
        return this._isDirty || this._areStepsDirty() || this._parameters.getIsDirty();
    }

    public setIsDirty(isDirty: boolean) {
        let i = 0, length = this._testSteps.length;
        this._isDirty = isDirty;
        if (!isDirty) {
            this._isStepsFieldModified = false;
            this._parameters.setIsDirty(false);
            for (i = 0; i < length; i++) {
                this._testSteps[i].setIsDirty(isDirty);
            }
        }
    }

    public isInvalid(): boolean {
        if (this._workItemWrapper) {
            return this._workItemWrapper.isInvalid();
        }
        else {
            return false;
        }
    }

    public getError(): Error {
        if (this._workItemWrapper) {
            return this._workItemWrapper.getError();
        }
        else {
            return null;
        }
    }

    public removeStep(id: number, parentId: number, preserveParamData?: boolean): boolean {
        let testSteps: TestAction[] = this.getTestSteps(),
            length = testSteps.length,
            index = this.getIndexForActionId(id),
            step: TestAction;

        if (index >= 0 && index < length) {
            step = testSteps[index];
            if (step instanceof TestStep && !preserveParamData) {
                // Fire param delete event for the parameters whose last reference will be removed to get a confirmation from the user through the UI layer(in case of authoring).
                // If the user does not confirm then dont remove the step.
                // If the deleteEvent was not registered e.g. in case of testRunner, fireParamDeleteEventForStepRemoval return true and the step is removed.
                if (!this.fireParamDeleteEventForStepRemoval((<TestStep>step).getActionParameters(), (<TestStep>step).getExpectedParameters())) {
                    return false;
                }
            }
            if (step instanceof TestStep) {
                this._updateParametersRefCountOnRemovingStep(<TestStep>step, preserveParamData);
                (<TestStep>testSteps[index]).clearAttachments();
            }
            testSteps.splice(index, 1);
            this._updateTestStepIndices();

            this._isStepsFieldModified = true;
            return true;
        }
        return false;
    }

    public fireParamDeleteEventForStepRemoval(actionParams: string[], expectedParams: string[]): boolean {
        // For the parameters whose last reference will be deleted, fire paramDeleteEvent so that the UI layer can use this to show the warning
        // Return false if the user did not confirm the deletion.
        let paramsToBeDeleted: string[];

        paramsToBeDeleted = this._parameters.getParamsToBeDeletedOnStepRemoval(actionParams, expectedParams);
        if (paramsToBeDeleted.length > 0) {
            if (this.paramDeleteEvent) {
                return this.paramDeleteEvent(paramsToBeDeleted, this);
            }
        }
        return true;
    }

    public getIndexForActionId(id: number) {
        let i = 0,
            testSteps = this.getTestSteps(),
            length = testSteps.length;

        if (length <= 0) {
            return 0;
        }

        if (id === -1) {
            return length;
        }

        for (i = 0; i < length; i++) {
            if (testSteps[i].id === id) {
                return i;
            }
        }

        return length;
    }

    public insertStep(id: number, parentId: number, after?: boolean): number {
        //Inserts a new step before(by default and after if the flag is set) the step with id in the parameter.
        let index = this.getIndexForActionId(id);
        Diag.Debug.assert(index >= 0);

        return this.insertStepAt(index);
    }

    public addNewStep(): number {
        let testSteps = this.getTestSteps(),
            length = testSteps.length;

        return this.insertStepAt(length);
    }

    public getLastActionId(): number {
        let testSteps = this.getTestSteps(),
            length = testSteps.length,
            lastIndex: number,
            i = 0;

        if (length === 0) {
            return 1;
        }

        lastIndex = testSteps[0].id;
        for (i = 0; i < length; i++) {
            if (lastIndex < testSteps[i].id) {
                lastIndex = testSteps[i].id;
            }
        }

        return lastIndex;
    }

    public insertStepAt(index: number): number {
        let i = 0,
            lastIndex = this.getLastActionId(),
            testSteps = this.getTestSteps(),
            testStep: TestStep;

        testStep = TestStep.createStep(lastIndex + 1, TestStepTypes.Action, "", "", true);
        testStep.owner = this;
        testStep.setIsDirty(true);
        testSteps.splice(index, 0, testStep);
        this._updateTestStepIndices();
        return lastIndex + 1;
    }

    public replaceStep(actionId: number): number {
        let index = this.getIndexForActionId(actionId);

        this.removeStep(actionId, 0);

        return this.insertStepAt(index);
    }

    public willParametersBeDeletedOnDeletingSteps(testStepActionIds: number[]): boolean {
        let testSteps = this.getTestSteps(),
            length = testStepActionIds.length,
            index: number,
            i: number,
            parameters: string[] = this.getParameters(),
            paramName: string,
            parametersLength: number = parameters.length,
            parameterToRefCountMap = new TFS_Core_Utils.Dictionary<number>(),
            testStep: TestStep,
            paramsToBeDeleted: string[];

        for (i = 0; i < parametersLength; i++) {
            parameterToRefCountMap.set(parameters[i], this._parameters.getRefCount(parameters[i]));
        }

        for (i = 0; i < length; i++) {
            index = this.getIndexForActionId(testStepActionIds[i]);

            if (testSteps[index] instanceof TestStep) {
                testStep = <TestStep>testSteps[index];
                if (this._willParametersBeDeleted(testStep.getActionParameters(), parameterToRefCountMap)) {
                    return true;
                }

                if (this._willParametersBeDeleted(testStep.getExpectedParameters(), parameterToRefCountMap)) {
                    return true;
                }
            }
        }
        return false;
    }

    private _willParametersBeDeleted(paramNames: string[], parameterToRefCountMap: TFS_Core_Utils.Dictionary<number>): boolean {
        let length = paramNames.length,
            i: number,
            refCount: number;

        for (i = 0; i < length; i++) {
            refCount = parameterToRefCountMap.get(paramNames[i]);
            if (refCount > 0) {
                parameterToRefCountMap.set(paramNames[i], refCount - 1);

                if (refCount - 1 === 0) {
                    return true;
                }
            }
            else {
                Diag.logVerbose("Error occurred. Parameter ref count mapping is incorrect");
            }
        }

        return false;
    }

    public _updateTestStepIndices() {

        let i = 0,
            testSteps = this.getTestSteps(),
            length = testSteps.length;

        for (i = 0; i < length; i++) {
            testSteps[i].setIndex(i + 1);
        }
    }

    public addStep(step: TestStep) {
        // When a step is added to the testcase, the owner of the step should be set as the testcase.
        step.owner = this;
        this.getTestSteps().push(step);
        this._updateParametersRefCountOnAddingStep(step);
        this._isStepsFieldModified = true;
        this._isDirty = true;
    }

    private _updateParametersRefCountOnAddingStep(step: TestStep) {
        // Update the refCounts of the testCase parameters on adding a step to the testCase
        $.each(step.getActionParameters(), (i, parameter) => {
            this.onAddParameterInSteps(parameter);
        });
        $.each(step.getExpectedParameters(), (i, parameter) => {
            this.onAddParameterInSteps(parameter);
        });
    }

    private _updateParametersRefCountOnRemovingStep(step: TestStep, preserveParamData?: boolean) {
        // Update the refCounts of the testCase parameters on removing a step to the testCase
        $.each(step.getActionParameters(), (i, parameter) => {
            this.onDeleteParameterInSteps(parameter, preserveParamData);
        });
        $.each(step.getExpectedParameters(), (i, parameter) => {
            this.onDeleteParameterInSteps(parameter, preserveParamData);
        });
    }

    public onAddParameterInSteps(paramName: string) {
        this._parameters.onAddParameterInSteps(paramName);
    }

    public onDeleteParameterInSteps(paramName: string, preserveParamData?: boolean, isSharedStepParam?: boolean): boolean {
        return this._parameters.onDeleteParameterInSteps(paramName, preserveParamData, isSharedStepParam);
    }

    public deleteParameter(paramName: string) {
        let i: number,
            testSteps = this.getTestSteps(),
            length = testSteps.length;

        this._parameters.deleteParameter(paramName);
        for (i = 0; i < length; i++) {
            if (testSteps[i] instanceof TestStep) {
                (<TestStep>testSteps[i]).deleteParameter(paramName);
            }
        }
    }

    public renameParameter(paramName: string, newParamName: string) {
        let i: number,
            testSteps = this.getTestSteps(),
            length = testSteps.length;

        this._parameters.renameParameter(paramName, newParamName);
        for (i = 0; i < length; i++) {
            if (testSteps[i] instanceof TestStep) {
                (<TestStep>testSteps[i]).renameParameter(paramName, newParamName);
            }
        }
    }

    private _calculateParameterRefCountsFromSteps() {
        let i: number,
            testSteps = this.getTestSteps(),
            length = testSteps.length;

        for (i = 0; i < length; i++) {
            if (testSteps[i] instanceof TestStep) {
                this._updateParametersRefCountOnAddingStep(<TestStep>testSteps[i]);
            }
        }
    }

    public fireParamDeleteEvent(removedParams: string[]): boolean {
        // For the parameters whose last reference will be deleted, fire paramDeleteEvent so that the UI layer can use this to show the warning
        // Return false if the user did not confirm the deletion.
        let paramsToBeDeleted: string[];

        paramsToBeDeleted = this._parameters.getParamsToBeDeleted(removedParams);
        if (paramsToBeDeleted.length > 0) {
            if (this.paramDeleteEvent) {
                return this.paramDeleteEvent(paramsToBeDeleted, this);
            }
        }
        return true;
    }

    public hasError() {
        let i = 0,
            testSteps = this.getTestSteps(),
            length = testSteps.length;

        for (i = 0; i < length; i++) {
            if (testSteps[i].hasError()) {
                return true;
            }
        }

        return false;
    }

    public reset() {
        // TODO: Currently this is just doing the underlying work item reset. This has to be
        // enhanced to handle resetting any local copy of test case fields.
        if (this._workItemWrapper) {
            this._workItemWrapper.reset();
        }
    }

    public processTestStepAttachments(): boolean {
        let i = 0,
            testSteps = this.getTestSteps(),
            length = testSteps.length,
            attachmentFound = false;

        if (!this._attachmentProcessed) {
            for (i = 0; i < length; i++) {
                if (testSteps[i].processTestAttachments(this._workItemWrapper.getLinks())) {
                    attachmentFound = true;
                }
            }

            this._attachmentProcessed = true;
            return attachmentFound;
        }
        else {
            return false;
        }
    }

    public preSave() {
        if (!this.getIsDirty()) {
            return;
        }

        this._setStepsField();
        this._setParameterField();
        this._setProperties();
    }

    public _setIsStepFieldModified(value: boolean) {
        this._isStepsFieldModified = value;
    }

    private _setProperties(): void {
        let fieldName: string,
            field: WITOM.Field,
            witStore = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService(WITOM.WorkItemStore);

        for (fieldName in this._properties) {
            if (this._isAdditionalField(fieldName)) {
                field = this._workItemWrapper.getWorkItem().getField(fieldName);
                if (field && FieldUtils.isFieldEditable(field.fieldDefinition)) {
                    this._workItemWrapper.setFieldValue(fieldName, this._properties[fieldName]);
                }
            }
        }
    }

    private _isAdditionalField(fieldName: string): boolean {
        let fields = TestBase.TestCaseCoreFields;

        if ($.inArray(fieldName, fields) < 0) {
            return true;
        }

        return false;
    }

    private _setStepsField() {
        let stepsXmlDom = $.parseXML("<steps></steps>"),
            $stepsXmlDom: JQuery = $(stepsXmlDom).find("steps"),
            i: number = 0,
            testAction: TestAction,
            lastIndex: number = 0,
            stepsXml: string,
            length = this._testSteps.length,
            $currentDom: JQuery = $stepsXmlDom;

        if (this._areStepsDirty()) {

            // Append all the steps info.
            for (i = 0; i < length; i++) {

                testAction = this._testSteps[i];
                if (testAction instanceof SharedSteps) {
                    $currentDom = testAction.appendTo($currentDom);
                }
                else {
                    testAction.appendTo($currentDom);
                }

                if (testAction.id > lastIndex) {
                    lastIndex = testAction.id;
                }
            }

            // Append last step index.
            $stepsXmlDom.attr("id", "0");
            $stepsXmlDom.attr("last", lastIndex);

            // Save the xml into the work item.
            stepsXml = Utils_Core.domToXml(stepsXmlDom);
            this._workItemWrapper.setFieldValue(TCMConstants.WorkItemFieldNames.Actions, stepsXml);
        }
    }

    public _setParameterField() {
        let paramXml: string;

        if (this._parameters.getIsDirty()) {
            paramXml = this._parameters.getParametersXml();
            this._workItemWrapper.setFieldValue(TCMConstants.WorkItemFieldNames.Parameters, paramXml);
        }
    }
    public static parseTestSteps($steps) {

        function readParameterizedString(parameterizedString) {
            let stringParts = [];
            if ($(parameterizedString).children().length > 0) {
                $(parameterizedString).children().each(function () {
                    switch (this.nodeName.toLowerCase()) {
                        case "parameter":
                            stringParts.push(Utils_String.format("@{0}", $(this).text()));
                            break;
                        case "outputparameter":
                            stringParts.push(Utils_String.format("@?{0}", $(this).text()));
                            break;
                        case "text":
                            stringParts.push($(this).text());
                            break;
                    }
                });
            }
            else {
                stringParts.push($(parameterizedString).text());
            }

            return stringParts.join("");
        }

        function readStep(step) {

            let id = $(step).attr("id"),
                stepType = $(step).attr("type"),
                action,
                expectedResult,
                count = 0,
                testStep,
                isFormatted = false,
                isActionFormatted = false,
                isExpectedResultFormatted = false;

            //The first string is the action and second is the expected result
            $(step).children("parameterizedString").each(function () {
                if (count === 0) {
                    action = readParameterizedString(this);
                    isActionFormatted = ($(this).attr("isformatted") === "true");
                }
                else {
                    expectedResult = readParameterizedString(this);
                    isExpectedResultFormatted = ($(this).attr("isformatted") === "true");
                }
                count++;
            });

            if (isActionFormatted && isExpectedResultFormatted) {
                isFormatted = true;
            }

            if (!action && !expectedResult) {
                // It might be a test case created with the pre Dev10 Beta 1 format.
                // Try loading it.
                $(step).children().each(function () {
                    switch (this.nodeName.toLowerCase()) {
                        case "action":
                            action = $(this).text();
                            break;
                        case "expected":
                            expectedResult = $(this).text();
                            break;
                    }
                });
            }

            //create the test step
            testStep = TestStep.createStep(parseInt(id, 10), stepType, action, expectedResult, isFormatted);

            return testStep;
        }

        function readSharedSteps(step) {
            let id = $(step).attr("id"),
                ref = $(step).attr("ref"),
                steps = [],
                innerStep,
                innerSteps = [];

            steps.push(SharedSteps.createSharedStep(parseInt(id, 10), parseInt(ref, 10)));
            //duplicating this part of code since jslint is not allowing
            //mutualling recursive function and giving build error
            $(step).children().each(function () {
                switch (this.nodeName.toLowerCase()) {
                    case "step":
                        innerStep = readStep(this);
                        innerSteps.push(innerStep);
                        break;
                    case "compref":
                        innerStep = readSharedSteps(this);
                        //can be many steps
                        innerSteps = innerSteps.concat(innerStep);
                        break;
                }
            });

            if (innerSteps && innerSteps.length > 0) {
                steps = steps.concat(innerSteps);
            }
            return steps;
        }

        function _parseSteps($steps) {
            let step,
                steps = [];
            $steps.children().each(function () {
                switch (this.nodeName.toLowerCase()) {
                    case "step":
                        step = readStep(this);
                        steps.push(step);
                        break;
                    case "compref":
                        step = readSharedSteps(this);
                        //can be many steps
                        steps = steps.concat(step);
                        break;
                }

            });
            return steps;
        }

        return _parseSteps($steps);
    }

    public getTestStepsInternal() {
        let testStepsXml = this._workItemWrapper.getFieldValue(TCMConstants.WorkItemFieldNames.Actions, this._workItemWrapper.getRevision()),
            testStepsHtml,
            testStepsArray;

        testStepsHtml = Utils_Core.parseXml(testStepsXml || "");
        testStepsArray = TestBase.parseTestSteps($(testStepsHtml).find("steps"));
        return testStepsArray;
    }

    public swapTestSteps(index1: number, index2: number, parentId: number): boolean {
        let testSteps: TestAction[],
            stepsSwapped: boolean = false;

        testSteps = this.getTestSteps();

        if ((index1 !== -1) && (index2 !== -1)) {
            ArrayUtils.swap(testSteps, index1, index2);
            this._isStepsFieldModified = true;
            stepsSwapped = true;
        }
        this._updateTestStepIndices();
        return stepsSwapped;
    }

    private _areStepsDirty(): boolean {
        let i = 0, length = this._testSteps.length;
        if (this._isStepsFieldModified) {
            return true;
        }

        for (i = 0; i < length; i++) {
            if (this._testSteps[i].getIsDirty()) {
                return true;
            }
        }

        return false;
    }

    public refreshTestStepsFromWorkItem() {
        this._attachmentProcessed = false;
        this.setIsDirty(false);
    }

    public getProjectId(): string {
        let id: string = this._project ? this._project.guid : undefined;
        if (!id || id === "" || id === "00000000-0000-0000-0000-000000000000") {
            let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
            id = tfsContext.navigation.projectId;
        }

        return id;
    }

    private static _pseudoText: string = "MakeDirty";

    private _id: number;
    private _title: string;
    private _parameters: Parameters;
    private _workItemWrapper: WorkItemWrapper;
    private _testSteps: TestAction[];
    private _properties: { [key: string]: string; };
    private _isDirty: boolean;
    public _isStepsFieldModified: boolean;
    private _project: WITOM.Project;
    private _revision: number;
    private _attachmentProcessed: boolean;
}

export class Parameters {
    private _parameters: TFS_Core_Utils.Dictionary<number>;
    private _isDirty: boolean;

    constructor(parameters: string[]) {
        this.setParameters(parameters);
        this._isDirty = false;
    }

    public getParameters(): any[] {
        return this._parameters.keys();
    }

    public getRefCount(paramName: string): number {
        if (this._parameters.containsKey(paramName)) {
            return this._parameters.get(paramName);
        }
        return -1;
    }

    public setParameters(parameters: string[]) {
        let i: number,
            length = parameters.length;

        this._parameters = new TFS_Core_Utils.Dictionary<number>();
        for (i = 0; i < parameters.length; i++) {
            this._parameters.add(parameters[i], 0);
        }
    }

    public count(): number {
        return this._parameters.count();
    }

    public getIsDirty(): boolean {
        return this._isDirty;
    }

    public setIsDirty(isDirty: boolean) {
        this._isDirty = isDirty;
    }

    public getParametersXml(): string {
        let paramXmlDom = $.parseXML("<parameters></parameters>"),
            $paramXmlDom: JQuery = $(paramXmlDom).find("parameters"),
            i: number = 0,
            paramString: string,
            paramNode: JQuery,
            length = this._parameters.count(),
            parameters: string[],
            paramValues: number[];

        parameters = this._parameters.keys();
        paramValues = this._parameters.values();
        for (i = 0; i < length; i++) {
            // The parameters which are present in the testcase(and not the ones which are present only in sharedsteps) should be written to parameterXml
            if (paramValues[i] > 0) {
                paramString = "<param name='" + parameters[i] + "' bind='default'></param>";
                paramNode = $($.parseXML(paramString)).find("param");
                $paramXmlDom.append(paramNode);
            }
        }
        return Utils_Core.domToXml(paramXmlDom);
    }

    public onAddParameterInSteps(paramName: string) {
        let refCount: number, i: number,
            parameters: string[] = this.getParameters(),
            parametersLength: number = parameters.length,
            exists = false;

        for (i = 0; i < parametersLength; i++) {
            if (Utils_String.localeIgnoreCaseComparer(paramName, parameters[i]) === 0) {
                refCount = this._parameters.get(parameters[i]);
                this._parameters.set(parameters[i], refCount + 1);
                exists = true;
                break;
            }
        }
        if (!exists) {
            this._parameters.add(paramName, 1);
            this._isDirty = true;
        }
    }

    public getParamsToBeDeleted(removedParams: string[]): string[] {
        // For the parameters whose last reference is  being removed, the parameter will be deleted from the testcase. Return the list of those params.
        let refCount: number, i: number, j: number,
            parameters: string[] = this.getParameters(),
            parametersLength: number = parameters.length,
            removedParamsLength: number = removedParams.length,
            paramsToBeDeleted: string[] = [],
            exists = false;

        for (j = 0; j < removedParamsLength; j++) {
            for (i = 0; i < parametersLength; i++) {
                if (Utils_String.localeIgnoreCaseComparer(removedParams[j], parameters[i]) === 0) {
                    refCount = this._parameters.get(parameters[i]);
                    if (refCount === 1) {
                        paramsToBeDeleted.push(parameters[i]);
                    }
                    break;
                }
            }
        }
        return paramsToBeDeleted;
    }

    public getParamsToBeDeletedOnStepRemoval(actionParams: string[], expectedParams: string[]): string[] {
        // For the parameters whose last reference is  being removed, the parameter will be deleted from the testcase. Return the list of those params.
        let refCount: number, i: number, j: number,
            parameters: string[] = this.getParameters(),
            parametersLength: number = parameters.length,
            length: number,
            commonRemovedParams: string[] = [],
            paramsToBeDeleted: string[] = [];

        commonRemovedParams = Utils_Array.intersect(actionParams, expectedParams, Utils_String.localeIgnoreCaseComparer);
        length = commonRemovedParams.length;
        for (j = 0; j < length; j++) {
            for (i = 0; i < parametersLength; i++) {
                if (Utils_String.localeIgnoreCaseComparer(commonRemovedParams[j], parameters[i]) === 0) {
                    refCount = this._parameters.get(parameters[i]);
                    if (refCount === 2) {
                        paramsToBeDeleted.push(parameters[i]);
                    }
                    break;
                }
            }
        }

        paramsToBeDeleted = Utils_Array.union(this.getParamsToBeDeleted(actionParams), paramsToBeDeleted, Utils_String.localeIgnoreCaseComparer);
        paramsToBeDeleted = Utils_Array.union(this.getParamsToBeDeleted(expectedParams), paramsToBeDeleted, Utils_String.localeIgnoreCaseComparer);
        return paramsToBeDeleted;
    }

    public onDeleteParameterInSteps(paramName: string, preserveParamData?: boolean, isSharedStepParam?: boolean) {
        let refCount: number, i: number,
            parameters: string[] = this.getParameters(),
            parametersLength: number = parameters.length,
            exists = false;

        for (i = 0; i < parametersLength; i++) {
            if (Utils_String.localeIgnoreCaseComparer(paramName, parameters[i]) === 0) {
                refCount = this._parameters.get(parameters[i]);
                if (refCount > 1) {
                    this._parameters.set(parameters[i], refCount - 1);
                    return false;
                }
                else if (refCount === 1) {
                    if (isSharedStepParam) {
                        this._parameters.set(parameters[i], 0);
                        this._isDirty = true;
                        return false;
                    }
                    else {
                        this._parameters.remove(parameters[i]);
                        this._isDirty = true;
                        return true;
                    }
                }
            }
        }
    }

    public deleteParameter(paramName: string) {
        this._parameters.remove(paramName);
        this._isDirty = true;
    }

    public renameParameter(paramName: string, newParamName: string) {
        // In order to maintain the order of the parameters in the dictionary even after rename, we need to remove all items and add them again.
        // Using Dictionary(which uses javascript object) we have optimized finding of a key or its value as compared to using an array but in rename operation, we are iterating over the keys/values.
        // Rename operation from the param grid should not be a frequent operation. And also we wont require to refresh the parameter grid if we maintain the order.
        let i: number,
            length = this._parameters.count(),
            values = this._parameters.values(),
            keys = this._parameters.keys();

        if (Utils_Array.contains(keys, newParamName, Utils_String.localeIgnoreCaseComparer)) {
            // If the new param already exists then just remove the paramName and there is no need to insert a new key.
            this._parameters.remove(paramName);
        }
        else {
            this._parameters.clear();
            for (i = 0; i < length; i++) {
                if (keys[i] === paramName) {
                    keys[i] = newParamName;
                }
                this._parameters.add(keys[i], values[i]);
            }
        }

        this._isDirty = true;
    }
}

export class SharedParameterDataSet {
    private static _elementNameFormat = "<{0}/>";
    private static _paramNamesElement = "paramNames";
    public static _paramElement = "param";
    public static _paramSetElement = "parameterSet";
    //paramNames represnts the order of parameters
    private _parameterNames: string[];
    private _parameterData: SharedParameterData;
    private _commandQueue: CommandQueue;

    constructor(paramNames?: string[], paramData?: SharedParameterData) {
        if (!paramNames) {
            paramNames = [];
        }
        if (!paramData) {
            paramData = new SharedParameterData();
        }
        this._parameterData = paramData;
        this._parameterNames = paramNames;
        this._commandQueue = new CommandQueue();
    }

    public setSharedParameterDataSetAndData(paramNames: string[], paramData: SharedParameterData) {
        this._parameterData = paramData;
        this._parameterNames = paramNames;
    }

    public executeCommands(testCaseParamDataInfo: TestCaseParameterDataInfo): boolean {
        return this._commandQueue.execute(new SharedParamDataSetCommandArgs(testCaseParamDataInfo));
    }

    public clearCommandQueue() {
        this._commandQueue.clear();
    }

    public getCommandQueue(): CommandQueue {
        return this._commandQueue;
    }

    public getParameters(): string[] {
        return this._parameterNames;
    }

    public getParamCount(): number {
        return this.getParameters().length;
    }

    public getParamData(): SharedParameterData {
        return this._parameterData;
    }

    public getParamDataRowCount(): number {
        return this._parameterData.getDataCount();
    }

    public getParameterValueForRow(rowIndex: number, paramName: string): string {
        if (!Utils_Array.contains(this._parameterNames, paramName, Utils_String.localeIgnoreCaseComparer)) {
            return "";
        }

        return this._parameterData.getParameterValueForRow(rowIndex, paramName);
    }

    public renameParameter(paramName: string, newParamName: string): boolean {
        if (paramName === newParamName) {
            return true;
        }
        let index: number = this._parameterNames.indexOf(paramName),
            doesNewParamNameExists: boolean = this._parameterNames.indexOf(newParamName) !== -1;

        if (index !== -1 && !doesNewParamNameExists) {
            this._parameterNames[index] = paramName;
            this._parameterData.renameParameter(paramName, newParamName);
            return true;
        }
        return false;
    }

    public deleteParameter(paramName: string): boolean {
        let index: number = this._parameterNames.indexOf(paramName);

        if (index !== -1) {
            this._parameterNames.splice(index, 1);
            this._parameterData.deleteParameter(paramName);
            return true;
        }
        return false;
    }

    public addParameter(paramName: string): boolean {
        let index: number = this._parameterNames.indexOf(paramName);

        if (index === -1) {
            this._parameterNames.push(paramName);
            this._parameterData.addParameter(paramName);
            return true;
        }
        return false;
    }

    public updateParameterValueForRow(rowIndex: number, paramName: string, paramValue: string): boolean {
        if (this._parameterNames.indexOf(paramName) !== -1) {
            return this._parameterData.updateParamValueAtIndex(paramName, paramValue, rowIndex);
        }
        return false;
    }

    public moveParameter(paramName: string, toIndex: number): boolean {
        let currentIndex = this._parameterNames.indexOf(paramName);

        if (currentIndex !== -1 && currentIndex !== toIndex && toIndex >= 0 && toIndex < this.getParamCount()) {
            this._parameterNames.splice(currentIndex, 1);
            this._parameterNames.splice(toIndex, 0, paramName);
            return true;
        }
        return false;
    }

    public getXML(): string {
        let xml = $.parseXML(Utils_String.format(SharedParameterDataSet._elementNameFormat, SharedParameterDataSet._paramSetElement)),
            $xml = $(xml).find(SharedParameterDataSet._paramSetElement),
            parametersDataXML = $.parseXML(this._parameterData.getXml()),
            $parametersData = $(parametersDataXML).contents(),
            paramNameXml,
            paramNamesXml = $.parseXML(Utils_String.format(SharedParameterDataSet._elementNameFormat, SharedParameterDataSet._paramNamesElement)),
            $paramNames = $(paramNamesXml).find(SharedParameterDataSet._paramNamesElement),
            l = this._parameterNames.length,
            i: number,
            $paramName: JQuery,
            paramName: string;

        for (i = 0; i < l; i++) {
            paramNameXml = $.parseXML(Utils_String.format(SharedParameterDataSet._elementNameFormat, SharedParameterDataSet._paramElement)),
                $paramName = $(paramNameXml).find(SharedParameterDataSet._paramElement);
            paramName = ParameterCommonUtils.encodeName(this._parameterNames[i]);
            $paramName.text(paramName);
            $paramNames.append($paramName);
        }

        $xml.append($paramNames).append($parametersData);

        return Utils_Core.domToXml(xml);
    }

}

export class BaseParametersData {
    private _data: Array<{ [index: string]: string; }>;

    constructor(data: Array<{ [index: string]: string; }>) {
        if (!data) {
            data = [];
        }
        this.setData(data);
    }

    public getData(): Array<{ [index: string]: string; }> {
        return this._data;
    }

    public getDataCount(): number {
        return this._data.length;
    }

    public setData(data: Array<{ [index: string]: string; }>) {
        this._data = data;
    }

    public deleteParameter(paramName: string) {
        /// <summary> Deletes the entry with paramName from data</summary>
        let data: any[] = this.getData(),
            dataLength = data.length,
            paramValue: string,
            i: number;

        for (i = 0; i < dataLength; i++) {
            if (paramName in data[i]) {
                delete data[i][paramName];
            }
        }

        if (dataLength > 0) {
            let paramNamesCount = Object.keys(data[0]).length;
            if (paramNamesCount === 0) {
                this.setData([]);
            }
        }
    }
    public getParameterValueForRow(rowIndex: number, paramName: string) {
        if (rowIndex < 0 || rowIndex >= this._data.length) {
            return "";
        }
        return this.getParameterValueFromDataRow(this._data[rowIndex], paramName) || "";
    }

    public getParameterValueFromDataRow(dataRow: any, paramName: string) {
        let paramKeys: string[],
            i: number,
            len: number,
            paramValue: string = "",
            paramKey: string;

        paramKeys = Object.keys(dataRow);
        for (i = 0, len = paramKeys.length; i < len; i++) {
            paramKey = paramKeys[i];
            if (Utils_String.localeIgnoreCaseComparer(paramName, paramKey) === 0) {
                return dataRow[paramKeys[i]];
            }
        }
        return paramValue;
    }

    public renameParameter(paramName: string, newParamName: string, isConflicting?: boolean) {
        /// <summary> Renames the key value pair of paramName in the parameter data table with newParamName
        // if it is not conflicting.Else adds a new key value pair with key newParamName </summary>
        let data: any[] = this.getData(),
            dataLength = data.length,
            paramValue: string,
            i: number;

        for (i = 0; i < dataLength; i++) {
            if (paramName in data[i]) {
                if (!isConflicting) {
                    paramValue = data[i][paramName];
                    data[i][newParamName] = paramValue;
                    delete data[i][paramName];
                }
                else {
                    data[i][newParamName] = "";
                }
            }
        }
    }

    public addParameter(paramName: string) {
        let data = this.getData(), length = data.length, i: number;
        for (i = 0; i < length; i++) {
            data[i][paramName] = "";
        }
    }

    public updateParamValueAtIndex(paramName: string, paramValue: string, rowIndex: number): boolean {
        let data = this.getData();
        if (rowIndex >= 0 && rowIndex < this.getDataCount()) {
            data[rowIndex][paramName] = paramValue;
            return true;
        }
        return false;
    }

    public _getEncodedParamName(paramName: string, encodedParams?: TFS_Core_Utils.Dictionary<string>): string {
        let encodedParamName: string;
        if (!encodedParams || !encodedParams.containsKey(paramName)) {
            encodedParamName = ParameterCommonUtils.encodeName(paramName);
        }
        else {
            encodedParamName = encodedParams.get(paramName);
        }
        return encodedParamName;
    }
}

export class SharedParameterData extends BaseParametersData {
    //Xml generation elements
    private static _elementNameFormat = "<{0}/>";
    public static _dataRowElement = "dataRow";
    public static _paramDataElement = "paramData";
    public static _lastIdAttribute = "lastId";
    public static _idAttribute = "id";
    public static _keyValuePairElement = "kvp";
    public static _keyAttribute = "key";
    public static _valueAttribute = "value";

    private _rowIds: number[];
    private _lastId: number;

    constructor(data?: Array<{ [index: string]: string; }>, lastId?: number, rowIds?: number[]) {
        super(data);
        if (!lastId) {
            lastId = 0;
        }
        if (!rowIds) {
            rowIds = [];
        }

        this._lastId = lastId;
        this._rowIds = rowIds;
    }

    public getRowIds(): number[] {
        return this._rowIds;
    }

    public getLastId(): number {
        return this._lastId;
    }

    public addParameterRowWithRowId(paramNames: string[], paramValues: string[], index: number, rowId: number) {
        let paramRow: { [index: string]: string; } = {}, i: number, l: number;
        if (paramNames.length < paramValues.length) {
            Diag.logError("[SharedParameterData/addParameterRow] Length of paramValues is greater then paramNames. There should be a paramName for each paramValue");
            return;
        }
        for (i = 0, l = paramNames.length; i < l; i++) {
            if (paramValues[i]) {
                paramRow[paramNames[i]] = paramValues[i];
            }
            else {
                paramRow[paramNames[i]] = "";
            }
        }
        this.getData().splice(index, 0, paramRow);
        this._rowIds.splice(index, 0, rowId);

    }

    public deleteParameterRow(index: number) {
        if (index >= 0 && index < this.getDataCount()) {
            this.getData().splice(index, 1);
            this._rowIds.splice(index, 1);
        }
    }

    public deleteAllParameterRows() {
        Utils_Array.clear(this.getData());
        Utils_Array.clear(this._rowIds);
    }

    public addParameterRow(paramNames: string[], paramValues: string[], index: number): number {
        this.addParameterRowWithRowId(paramNames, paramValues, index, ++this._lastId);
        return this._lastId;
    }

    public getXml(): string {

        let data = this.getData(),
            paramDataXml = $.parseXML(Utils_String.format(SharedParameterData._elementNameFormat, SharedParameterData._paramDataElement)),
            $paramData = $(paramDataXml).find(SharedParameterData._paramDataElement),
            kvpXML,
            i: number,
            l = data.length,
            dataRowXML,
            $dataRow: JQuery,
            paramName: string,
            paramValue: string,
            $kvp: JQuery;

        $paramData.attr(SharedParameterData._lastIdAttribute, this.getLastId().toString());
        for (i = 0; i < l; i++) {
            dataRowXML = $.parseXML(Utils_String.format(SharedParameterData._elementNameFormat, SharedParameterData._dataRowElement)),
                $dataRow = $(dataRowXML).find(SharedParameterData._dataRowElement);
            $dataRow.attr(SharedParameterData._idAttribute, this._rowIds[i].toString());

            for (paramName in data[i]) {
                paramValue = data[i][paramName];

                if (data[i].hasOwnProperty(paramName) && paramValue) {
                    paramValue = Utils_String.htmlEncode(paramValue);
                    paramName = this._getEncodedParamName(paramName);
                    kvpXML = $.parseXML(Utils_String.format(SharedParameterData._elementNameFormat, SharedParameterData._keyValuePairElement));
                    $kvp = $(kvpXML).find(SharedParameterData._keyValuePairElement);
                    $kvp.attr(SharedParameterData._keyAttribute, paramName).attr(SharedParameterData._valueAttribute, paramValue);
                    $dataRow.append($kvp);
                }
            }
            $paramData.append($dataRow);
        }
        return Utils_Core.domToXml(paramDataXml);
    }
}

export class ParametersData extends BaseParametersData {

    private static _xmlFormat = "<NewDataSet>{0}{1}</NewDataSet>";
    private static _schemaElement1 = "<xs:schema id='NewDataSet' xmlns:xs='http://www.w3.org/2001/XMLSchema' xmlns:msdata='urn:schemas-microsoft-com:xml-msdata'><xs:element name='NewDataSet' msdata:IsDataSet='true' msdata:Locale=''><xs:complexType> <xs:choice minOccurs='0' maxOccurs = 'unbounded'><xs:element name='Table1'><xs:complexType><xs:sequence>";
    private static _schemaElement2 = "</xs:sequence></xs:complexType></xs:element></xs:choice></xs:complexType></xs:element></xs:schema>";
    private static _schemaFormat = "{0}{1}{2}";
    private static _parameterNodeFormatString = "<xs:element name='{0}' type='xs:string' minOccurs='0' />";
    private static _tableNodeFormat = "<Table1>{0}</Table1>";
    private static _parameterNodeFormat = "<{0}>{1}</{0}>";

    constructor(data: Array<{ [index: string]: string; }>) {
        super(data);
    }

    public getXML(encodedParamNames?: TFS_Core_Utils.Dictionary<string>): string {
        let i = 0,
            j = 0,
            data: any[] = this.getData(),
            parameterNames: string[] = [],
            paramName: string,
            encodedParamName: string,
            paramValue: string,
            paramNamesCount = 0,
            schemaNodeString: string,
            tableNodeString: string = "",
            paramString: string = "",
            tableNode: any,
            parameterNode: any,
            parameterValueNode: any,
            length = data.length;

        if (data.length > 0) {
            parameterNames = Object.keys(data[0]);
            paramNamesCount = parameterNames.length;

            schemaNodeString = this._generateSchema(parameterNames, encodedParamNames);

            for (i = 0; i < length; i++) {
                paramString = "";
                for (j = 0; j < paramNamesCount; j++) {
                    paramName = parameterNames[j];
                    paramValue = data[i][paramName];
                    if (paramValue) {
                        paramValue = Utils_String.htmlEncode(paramValue);
                    }
                    encodedParamName = this._getEncodedParamName(paramName, encodedParamNames);
                    paramString = paramString + Utils_String.format(ParametersData._parameterNodeFormat, encodedParamName, paramValue);
                }
                tableNodeString = tableNodeString + Utils_String.format(ParametersData._tableNodeFormat, paramString);
            }
            return Utils_String.format(ParametersData._xmlFormat, schemaNodeString, tableNodeString);
        }

        return "";
    }

    private _generateSchema(paramNames: string[], encodedParamNames?: TFS_Core_Utils.Dictionary<string>): any {
        let parameterNodes: string = "",
            paramName: string,
            encodedParamName: string,
            paramNamesCount: number = paramNames.length,
            i: number;

        for (i = 0; i < paramNamesCount; i++) {
            paramName = paramNames[i];
            encodedParamName = this._getEncodedParamName(paramName, encodedParamNames);
            parameterNodes = parameterNodes + Utils_String.format(ParametersData._parameterNodeFormatString, encodedParamName);
        }
        return Utils_String.format(ParametersData._schemaFormat, ParametersData._schemaElement1, parameterNodes, ParametersData._schemaElement2);
    }

}

export class SharedStepParametersData extends ParametersData {

    private _deletedParams: any[];
    private _renamedParameters: TFS_Core_Utils.Dictionary<string>;
    private _sharedStepsParameterXml: string;
    private static _keyValueFormat = "<param name='{0}'><value>{1}</value></param>";
    private static _parametersFormat = "<parameters>{0}</parameters>";
    private _commandQueue: CommandQueue;

    constructor(data: any[]) {
        super(data);
        this._commandQueue = new CommandQueue();
    }

    public deleteParam(paramName: string) {
        this._commandQueue.insert(new DeleteParameterCommand(paramName));
        this.deleteParameter(paramName);
    }

    public renameParam(paramName: string, newParamName: string) {
        this._commandQueue.insert(new RenameParameterCommand(paramName, newParamName));
        this.renameParameter(paramName, newParamName);
    }

    public addParameter(paramName: string) {
        this._commandQueue.insert(new AddParameterCommand(paramName));
    }

    public executeCommands(paramDataInfo?: TestCaseParameterDataInfo, conflictingParameters?: string[]): boolean {
        return this._commandQueue.execute(new SharedStepParameterCommandArgs(this, paramDataInfo, conflictingParameters));
    }

    public getParameterXml(): string {
        return this._sharedStepsParameterXml;
    }

    public setParameterXml(xmlValue: string) {
        this._sharedStepsParameterXml = xmlValue;
    }

    public clearCommandQueue() {
        this._commandQueue.clear();
    }

    public getParametersXML(paramNames: string[]): string {
        let data: any[] = this.getData(),
            i: number,
            paramString = "",
            paramName: string,
            paramValue: string,
            paramNamesCount: number;

        if (data.length > 0) {
            paramNamesCount = paramNames.length;
            for (i = 0; i < paramNamesCount; i++) {
                paramValue = data[0][paramNames[i]];
                if (paramValue === undefined) {
                    paramValue = "";
                }
                else {
                    paramValue = Utils_String.htmlEncode(paramValue);
                }
                paramString = paramString + Utils_String.format(SharedStepParametersData._keyValueFormat, paramNames[i], paramValue);
            }
        }
        return Utils_String.format(SharedStepParametersData._parametersFormat, paramString);
    }
}

export class SharedStepWorkItem extends TestBase {

    constructor(id: number, revision: number, title: string, testSteps: TestStep[], parameters: string[], project?: WITOM.Project) {
        super(id, revision, title, testSteps, parameters, project);
    }

    public getStep(id: number): TestStep {
        let i = 0,
            testSteps = this.getTestSteps(),
            length = testSteps.length;

        for (i = 0; i < length; i++) {
            if (testSteps[i].id === id) {
                return <TestStep>testSteps[i];
            }
        }
    }

    public refreshTestStepsFromWorkItem() {
        let testSteps = this.getTestSteps();

        // passing original=true, so that we get the saved value and not the updated value which has not yet been saved,
        // as we want to refresh the title from the workItem
        this.resetTitle(this.getWorkItemWrapper().getTitle(true));
        this.setTestSteps(this.getTestStepsInternal());
        super.refreshTestStepsFromWorkItem();
    }

    public swapTestSteps(index1: number, index2: number, parentId: number): boolean {
        return super.swapTestSteps(index1, index2, parentId);
    }

    public beginSave(callback: IResultCallback, error: IErrorCallback) {
        let i: number = 0,
            workItemToSave: WITOM.WorkItem;

        this.preSave();
        workItemToSave = this.getWorkItemWrapper().getWorkItem();

        workItemToSave.beginSave(() => {
            this.setIsDirty(false);

            if (callback) {
                callback(this);
            }
        },
            error);
    }

    public preSave() {
        super.preSave();
        if (this.getIsDirty()) {
            this.getWorkItemWrapper().setFieldValue(WITConstants.CoreFieldRefNames.Title, this.getTitle());
        }
    }

    public copyStep(step: TestStep, lastActionId: number) {
        let testStep: TestStep = TestStep.createStep(lastActionId, step.stepType, step.action, step.expectedResult, true),
            stepAttachments: WITOM.Attachment[] = step.getAttachments(),
            newStepAttachment: WITOM.Attachment,
            i: number,
            stepAttachmentCount: number = stepAttachments.length;

        // link the attachments
        for (i = 0; i < stepAttachmentCount; i++) {
            newStepAttachment = WITOM.Attachment.create(this.getWorkItemWrapper().getWorkItem(),
                stepAttachments[i].getName(),
                stepAttachments[i].getFilePath(),
                Utils_String.format("[TestStep={0}]:", testStep.id),
                stepAttachments[i].getLength());

            this.getWorkItemWrapper().getWorkItem().addLink(newStepAttachment);
            testStep.addAttachment(newStepAttachment);
        }

        this.addStep(testStep);
    }

    public addTestStepAttachmentsMetadata(attachmentMetadata: TestStepAttachmentMetadata): boolean {
        let testSteps = this.getTestSteps(),
            j: number,
            len: number,
            comment: string;

        for (j = 0, len = testSteps.length; j < len; j++) {
            comment = Utils_String.format("[TestStep={0}]:", testSteps[j].id);
            if (Utils_String.caseInsensitiveContains(attachmentMetadata.getComment(), comment)) {
                (<TestStep>testSteps[j]).updateAttachmentsMetadataList(attachmentMetadata);
                return true;
            }
        }
        return false;
    }
}

export class SharedSteps extends TestAction {

    public static createSharedStep(id: number, ref: number) {
        let sharedStep = new SharedSteps(id, ref);
        return sharedStep;
    }

    public ref: number;

    constructor(id: number, ref: number) {
        super(id, TestActionTypes.SharedSteps);
        this.ref = ref;
        this._sharedStepWorkItem = null;
    }

    public setSharedStepWorkItem(sharedStepWorkItem: SharedStepWorkItem) {
        this._sharedStepWorkItem = sharedStepWorkItem;
    }

    public preSave() {
        this._sharedStepWorkItem.preSave();
    }

    public appendTo($stepsXmlDom: JQuery): JQuery {
        let sharedStepRefXml = $.parseXML("<compref></compref>"),
            $sharedStepRefXml = $(sharedStepRefXml).find("compref");

        $sharedStepRefXml.attr("id", this.id);
        $sharedStepRefXml.attr("ref", this.ref);

        $stepsXmlDom.append($sharedStepRefXml);
        return $sharedStepRefXml;
    }

    public getStep(id): TestStep {
        return this._sharedStepWorkItem.getStep(id);
    }

    public getTestSteps(): TestAction[] {
        return this._sharedStepWorkItem.getTestSteps();
    }

    public removeStep(id, parentId): boolean {
        return this._sharedStepWorkItem.removeStep(id, parentId);
    }

    public insertStep(id, parentId): number {
        return this._sharedStepWorkItem.insertStep(id, parentId);
    }

    public getIsDirty() {
        if (this._sharedStepWorkItem) {
            return this._sharedStepWorkItem.getIsDirty();
        }
        return false;
    }

    public setIsDirty(isDirty: boolean) {
        if (this._sharedStepWorkItem) {
            this._sharedStepWorkItem.setIsDirty(isDirty);
        }
    }

    public getSharedStep() {
        return this._sharedStepWorkItem;
    }

    public getTitle() {
        if (this._sharedStepWorkItem) {
            return this._sharedStepWorkItem.getTitle();
        }
    }

    public setTitle(title: string): boolean {
        if (this._sharedStepWorkItem) {
            return this._sharedStepWorkItem.setTitle(title);
        }
    }

    public hasError(): boolean {
        if (this._sharedStepWorkItem) {
            return this._sharedStepWorkItem.hasError();
        }
        return false;
    }

    public refreshTestStepsFromWorkItem() {
        if (this._sharedStepWorkItem) {
            this._sharedStepWorkItem.refreshTestStepsFromWorkItem();
        }
    }

    public processTestAttachments(attachmentList): boolean {
        if (this._sharedStepWorkItem) {
            return this._sharedStepWorkItem.processTestStepAttachments();
        }
    }

    private _sharedStepWorkItem: SharedStepWorkItem;
}

VSS.initClassPrototype(SharedSteps, {
    ref: null
});

export class TestCase extends TestBase {

    constructor(id: number,
        revision: number,
        title: string,
        testSteps: TestAction[],
        parameters: string[],
        data: any[],
        parametersDataFieldValue,
        areaPath?: string,
        properties?: any,
        testCaseDescriptionHtml?: string,
        project?: WITOM.Project) {

        super(id, revision, title, testSteps, parameters, properties, project);
        this.areaPath = areaPath;
        this._description = testCaseDescriptionHtml || "";
        this._parametersData = new ParametersData(data);
        this._sharedStepParametersData = new SharedStepParametersData(data);
        this._parametersDataFieldValue = parametersDataFieldValue;
        this._parametersDataInfo = null;
    }

    public getAreaPath() {
        return this.areaPath;
    }

    public getDescription() {
        return this._description;
    }

    public getData(isSharedStepWorkItem?: boolean) {
        if (!isSharedStepWorkItem) {
            return this._parametersData.getData();
        }
        else {
            return this._sharedStepParametersData.getData();
        }
    }

    public setData(value: any[], isSharedStepWorkItem?: boolean) {
        if (!isSharedStepWorkItem) {
            return this._parametersData.setData(value);
        }
        else {
            this._sharedStepParametersData.setData(value);
        }
    }

    public setParametersDataInfo(paramData: Array<{ [index: string]: string; }>, parametersDataInfo: TestCaseParameterDataInfo, sharedParameters: SharedParameterDataSet[], sharedParametersTitles: string[]) {
        this._sharedParameters = sharedParameters;
        this._sharedParametersTitles = sharedParametersTitles;
        this._parametersDataInfo = parametersDataInfo;
        this.setData(paramData);
    }

    public removeSharedParameterDataSet() {
        WitLinkingHelper.unlinkSharedParameterDataSetFromTestCase(this.getWorkItemWrapper().getWorkItem(), this._parametersDataInfo.getSharedParameterIdUsedByTestCase());
        this._sharedParameters = null;
        this._parametersDataInfo = null;
        this.setIsDirty(true);
    }

    public changeSharedParameterDataSetLinks(newSharedParamDataSetId: number) {
        let oldSharedParamDataSetId = this.getSharedParameterDataSetIdBeingUsed();
        if (newSharedParamDataSetId !== oldSharedParamDataSetId) {
            if (oldSharedParamDataSetId) {
                WitLinkingHelper.unlinkSharedParameterDataSetFromTestCase(this.getWorkItemWrapper().getWorkItem(), oldSharedParamDataSetId);
            }
            WitLinkingHelper.linkTestCaseToSharedParameterDataSet(this.getWorkItemWrapper().getWorkItem(), newSharedParamDataSetId);
        }
    }

    // This function is introduced to ensure that we have the flexibility to fetch additiona fields lazily for the work item
    // and then initialize those fields in the test case.
    public initializeParameterInfo(parameters: string[], data: any[], paramDataInfo: TestCaseParameterDataInfo, parametersDataFieldValue: string) {
        super.intializeParameters(parameters);
        this._parametersData = new ParametersData(data);
        this._parametersDataInfo = paramDataInfo;
        this._sharedStepParametersData = new SharedStepParametersData(data);
        this._parametersDataFieldValue = parametersDataFieldValue;
    }

    public getParametersData(): ParametersData {
        return this._parametersData;
    }

    public getParametersDataInfo(): TestCaseParameterDataInfo {
        return this._parametersDataInfo;
    }

    public getSharedParameterDataSetIdBeingUsed(): number {
        if (this._parametersDataInfo) {
            return this._parametersDataInfo.getSharedParameterIdUsedByTestCase();
        }
    }

    public isUsingSharedParameters(): boolean {
        return (this._parametersDataInfo !== null);
    }

    public updateParameterValue(paramName: string, paramValue: string, iterationIndex: number) {
        let paramData = this.getData(),
            parameterNames: string[],
            encodedParams: TFS_Core_Utils.Dictionary<string>;

        // update test case
        paramData[iterationIndex][paramName] = paramValue;
        this.setData(paramData, false);
        this.setIsDirty(true);

        parameterNames = this.getParameters().slice(0);
        encodedParams = ParameterCommonUtils.updateEncodedParameters(parameterNames);
        this.preSave(false, encodedParams);
    }

    public getSharedStepParametersData(): SharedStepParametersData {
        return this._sharedStepParametersData;
    }

    public mergeParameters(parametersToMerge: string[]) {
        let i = 0,
            parameters = this.getParameters();
        if (parametersToMerge) {
            if (!parameters) {
                parameters = parametersToMerge;
            }
            else {
                for (i = 0; i < parametersToMerge.length; i++) {
                    if (!Utils_Array.contains(parameters, parametersToMerge[i], Utils_String.localeIgnoreCaseComparer)) {
                        parameters.push(parametersToMerge[i]);
                    }
                }
            }
            this.setParameters(parameters);
        }
    }

    public mergeSharedStepParameters(sharedStepParameters: string[]) {
        this.sharedStepParameters = Utils_Array.union(this.sharedStepParameters, sharedStepParameters, Utils_String.localeIgnoreCaseComparer);
        this.mergeParameters(sharedStepParameters);
    }

    public isSharedStepParameter(paramName: string): boolean {
        return Utils_Array.contains(this.sharedStepParameters, paramName, Utils_String.localeIgnoreCaseComparer);
    }

    public setSharedStepParameters(sharedStepParameters: string[]) {
        this.sharedStepParameters = sharedStepParameters;
    }

    public getParametersDataFieldValue() {
        return this._parametersDataFieldValue;
    }

    public getTestAction(id: number, parentId: number): TestAction {
        let i = 0,
            testSteps = this.getTestSteps(),
            length = testSteps.length,
            sharedSteps: SharedSteps;

        if (parentId) {
            sharedSteps = this.getSharedSteps(parentId);
            return sharedSteps.getStep(id);
        }
        else {
            for (i = 0; i < length; i++) {
                if (testSteps[i].id === id) {
                    return testSteps[i];
                }
            }
        }
    }

    public setAction(id: number, parentId: number, content: string): boolean {
        let testAction = this.getTestAction(id, parentId);
        if (testAction) {
            if (testAction instanceof TestStep) {
                return (<TestStep>testAction).setAction(content);
            }
            else {
                return (<SharedSteps>testAction).setTitle($(HtmlUtils.wrapInDiv(content)).text());
            }
        }

        return false;
    }

    public onAddParameterInSteps(paramName: string) {
        super.onAddParameterInSteps(paramName);
        this._sharedStepParametersData.addParameter(paramName);
        if (this.isUsingSharedParameters()) {
            // Auto Mapping
            this._parametersDataInfo.autoMapIfParamNotExistsAlready(paramName);
        }
    }

    public preSave(isSharedStepWorkItem?: boolean, encodedParamNames?: TFS_Core_Utils.Dictionary<string>) {
        if (this.getIsDirty()) {
            super.preSave();
            this._setParameterField(isSharedStepWorkItem);
            if (this._parametersDataInfo) {
                this._setParameterDataJsonField();
            }
            else {
                this._setParameterDataXmlField(encodedParamNames);
            }
        }
    }

    public _setParameterField(isSharedStepWorkItem?: boolean) {
        let paramXml: string;
        if (!isSharedStepWorkItem || this.getData(isSharedStepWorkItem).length === 0) {
            super._setParameterField();
        }
        else {
            paramXml = this._sharedStepParametersData.getParametersXML(this.getParameters());
            this.getWorkItemWrapper().setFieldValue(TCMConstants.WorkItemFieldNames.Parameters, paramXml);
        }
    }

    public setExpectedResult(id: number, parentId: number, content: string): boolean {
        let testStep = <TestStep>this.getTestAction(id, parentId);
        if (testStep) {
            return testStep.setExpectedResult(content);
        }

        return false;
    }

    public insertStep(id: number, parentId: number): number {
        // Inserts a new step or sub step before the step or substep with id and parentid provided in the parameters.
        let sharedSteps: SharedSteps;
        if (parentId) {
            sharedSteps = this.getSharedSteps(parentId);
            return sharedSteps.insertStep(id, parentId);
        }
        else {
            return super.insertStep(id, parentId);
        }
    }

    public insertSharedStepsAtIndex(index: number, sharedStepIds: number[], stepsToReplace?: TestStep[]): number {
        let i: number,
            numSteps = stepsToReplace ? stepsToReplace.length : 0;

        WitLinkingHelper.linkTestCaseToSharedSteps(this.getWorkItemWrapper().getWorkItem(), sharedStepIds);

        if (numSteps > 0) {
            this._removeTestSteps(stepsToReplace);
        }

        return this._insertSharedStepsAtIndex(index, sharedStepIds);
    }

    private _removeTestSteps(stepsToReplace?: TestStep[]) {
        let i: number,
            numSteps = stepsToReplace.length,
            index: number;

        index = this.getIndexForActionId(stepsToReplace[0].id);

        // remove the test steps
        for (i = 0; i < numSteps; i++) {
            this.removeStep(stepsToReplace[i].id, 0, true);
        }
    }

    private _insertSharedStepsAtIndex(index: number, sharedStepIds: number[]): number {
        let i = 0,
            len = sharedStepIds.length,
            sharedStepAction: SharedSteps,
            lastActionId = this.getLastActionId(),
            testSteps = this.getTestSteps();

        for (i = 0; i < len; i++) {
            sharedStepAction = SharedSteps.createSharedStep(lastActionId + 1, sharedStepIds[i]);
            testSteps.splice(index, 0, sharedStepAction);
            lastActionId++;
            index++;
        }

        this._setIsStepFieldModified(true);
        this._updateTestStepIndices();
        return index;
    }

    public insertSharedSteps(id: number, sharedStepIds: number[]): number {
        let index = this.getIndexForActionId(id);
        return this.insertSharedStepsAtIndex(index, sharedStepIds);
    }

    public removeStep(id: number, parentId: number, preserveParamData?: boolean): boolean {
        let sharedSteps: SharedSteps,
            action: TestAction;

        if (parentId) {
            sharedSteps = this.getSharedSteps(parentId);
            return sharedSteps.removeStep(id, parentId);
        }
        else {
            action = this.getTestStep(id);
            if (action instanceof SharedSteps) {
                sharedSteps = <SharedSteps>action;
                if (this.getNumberOfSharedStepsWithId(sharedSteps.ref) === 1) {
                    WitLinkingHelper.unlinkSharedStepsFromTestCase(this.getWorkItemWrapper().getWorkItem(), [sharedSteps.ref]);
                }
            }
            return super.removeStep(id, parentId, preserveParamData);
        }
    }

    public onDeleteParameterInSteps(paramName: string, preserveParamData?: boolean): boolean {
        return super.onDeleteParameterInSteps(paramName, preserveParamData, this.isSharedStepParameter(paramName));
    }

    public deleteParameter(paramName: string) {
        if (this._parametersDataInfo) {
            this._parametersDataInfo.deleteParameter(paramName);
        }
        super.deleteParameter(paramName);
        if (!this.isSharedStepParameter(paramName)) {
            this._parametersData.deleteParameter(paramName);
        }
    }

    public renameParameter(paramName: string, newParamName: string) {
        if (this._parametersDataInfo) {
            this._parametersDataInfo.renameParameter(paramName, newParamName);
        }
        super.renameParameter(paramName, newParamName);
        this._parametersData.renameParameter(paramName, newParamName);
    }

    public save(callback?: IResultCallback, errorCallback?: IErrorCallback) {
        if (this.getWorkItemWrapper() === null) {
            // That means the work item has not been fetched for this test case.
            this.beginSetupWorkItemForTestCase(null, () => {
                // This means all the work items in the test case have been fetched.
                this._saveImpl(callback, errorCallback);
            }, errorCallback);
        }
        else {
            this._saveImpl(callback, errorCallback);
        }
    }

    public swapTestSteps(index1: number, index2: number, parentId: number): boolean {
        let sharedSteps: SharedSteps;

        if (parentId) {
            sharedSteps = this.getSharedSteps(parentId);
            return sharedSteps.getSharedStep().swapTestSteps(index1, index2, parentId);
        }
        else {
            return super.swapTestSteps(index1, index2, parentId);
        }
    }

    public getSharedSteps(id: number): SharedSteps {
        let i = 0,
            testSteps = this.getTestSteps(),
            length = testSteps.length,
            sharedSteps: SharedSteps;

        for (i = 0; i < length; i++) {
            if (testSteps[i] instanceof SharedSteps && testSteps[i].id === id) {
                return <SharedSteps>testSteps[i];
            }
        }
    }

    public getNumberOfSharedStepsWithId(sharedStepRef: number): number {
        let i = 0,
            num = 0,
            testSteps = this.getTestSteps(),
            length = testSteps.length;

        for (i = 0; i < length; i++) {
            if (testSteps[i] instanceof SharedSteps && (<SharedSteps>testSteps[i]).ref === sharedStepRef) {
                num++;
            }
        }

        return num;
    }

    private _saveImpl(callback?: IResultCallback, errorCallback?: IErrorCallback) {
        let i = 0,
            testSteps = this.getTestSteps(),
            length = testSteps.length,
            sharedSteps: SharedSteps,
            workItemsToSave: WITOM.WorkItem[] = [],
            workItem: WITOM.WorkItem = this.getWorkItemWrapper().getWorkItem(),
            sharedStepWi: WITOM.WorkItem;

        if (this.hasError()) {
            alert(Resources.InvalidStepsErrorString);
            return;
        }

        if (this.getIsDirty()) {
            this.preSave();
            workItemsToSave.push(workItem);
        }
        else {
            // Nothing to save. Just return.
            if (callback) {
                callback();
            }

            return;
        }

        // Pre save all dirty shared steps.
        for (i = 0; i < length; i++) {
            if (testSteps[i] instanceof SharedSteps) {
                sharedSteps = <SharedSteps>testSteps[i];
                if (!this._doesSharedStepExist(workItemsToSave, sharedSteps)) {
                    if (sharedSteps.getIsDirty()) {
                        sharedSteps.preSave();
                        sharedStepWi = sharedSteps.getSharedStep().getWorkItemWrapper().getWorkItem();
                        workItemsToSave.push(sharedStepWi);
                    }
                }
            }
        }

        // Save all work items in one batch.
        if (workItemsToSave.length > 0) {
            workItem.store.beginSaveWorkItemsBatch(workItemsToSave, () => {
                this.setIsDirty(false);
                if (callback) {
                    callback();
                }
            }, errorCallback);
        }
    }

    private _refreshAdditionPropertiesFromWorkItem() {
        let fieldName: string, fieldNames: string[] = [], properties = this.getProperties();
        for (fieldName in properties) {
            if (properties.hasOwnProperty(fieldName)) {
                fieldNames.push(fieldName);
            }
        }
        this.setProperties(fieldNames);
    }

    public beginRefresh(callback: IResultCallback, errorCallback: IErrorCallback) {
        this.resetTitle(this.getWorkItemWrapper().getTitle(true));
        this.refreshTestStepsFromWorkItem();
        this.setSharedStepWorkItemInTestCase();
        this._refreshAdditionPropertiesFromWorkItem();
        this.beginSetupWorkItemForTestCase(null, () => {
            this.setIsDirty(false);
            this.preSave();

            // Refresh test steps again to ensure that any new shared steps that are fetched have their steps setup properly.
            this.refreshTestStepsFromWorkItem();
            this.updateLocalRevision();
            if (callback) {
                callback();
            }
        }, errorCallback);
    }

    public refreshTestStepsFromWorkItem() {
        let testStepsArray,
            i,
            length,
            testSteps: TestAction[],
            sharedStep: SharedSteps;

        testStepsArray = this.getTestStepsInternal();
        length = testStepsArray.length;
        for (i = 0; i < length; i++) {
            if (testStepsArray[i] instanceof SharedSteps) {
                sharedStep = this.getSharedSteps(testStepsArray[i].id);
                if (sharedStep) {
                    testStepsArray[i] = sharedStep;
                }
            }
        }

        this.setTestSteps(testStepsArray);
        testSteps = this.getTestSteps();

        for (i = 0; i < length; i++) {
            if (testSteps[i] instanceof SharedSteps) {
                (<SharedSteps>testSteps[i]).refreshTestStepsFromWorkItem();
            }
        }
        super.refreshTestStepsFromWorkItem();
    }

    public setSharedStepWorkItemInTestCase(sharedStepCache?: { [id: number]: SharedStepWorkItem; }) {
        let i = 0,
            testSteps = this.getTestSteps(),
            length = testSteps.length,
            sharedSteps: SharedSteps,
            sharedStepWorkItem: SharedStepWorkItem;

        for (i = 0; i < length; i++) {
            if (testSteps[i] instanceof SharedSteps) {
                sharedSteps = <SharedSteps>testSteps[i];
                if (sharedStepCache && sharedStepCache[sharedSteps.ref]) {
                    sharedStepWorkItem = sharedStepCache[sharedSteps.ref];
                }
                else {
                    sharedStepWorkItem = new SharedStepWorkItem(sharedSteps.ref, 0, "", [], []);
                }

                sharedSteps.setSharedStepWorkItem(sharedStepWorkItem);
            }
        }
    }

    public beginSetupWorkItemForTestCase(sharedStepCache: { [id: number]: SharedStepWorkItem; }, callback: IResultCallback, errorCallback?: IErrorCallback) {

        let sharedStepIds = this._getSharedStepWorkItemsToFetch(sharedStepCache),
            idsToFetch = $.merge([this.getId()], sharedStepIds),
            witStore = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);

        witStore.beginGetWorkItems(idsToFetch, (workItems: WITOM.WorkItem[]) => {
            let testSteps = this.getTestSteps(),
                length = testSteps.length,
                i = 0,
                workItem = this._getWorkItem(this.getId(), workItems),
                sharedStepWi: WITOM.WorkItem,
                sharedStepId: number,
                sharedStepRef: SharedSteps,
                sharedStepWorkItem: SharedStepWorkItem;

            this.setWorkItemWrapper(new WorkItemWrapper(workItem), true);
            for (i = 0; i < length; i++) {
                if (testSteps[i] instanceof SharedSteps) {
                    sharedStepRef = (<SharedSteps>testSteps[i]);
                    sharedStepId = sharedStepRef.ref;
                    sharedStepWi = this._getWorkItem(sharedStepId, workItems);
                    sharedStepWorkItem = sharedStepRef.getSharedStep();
                    if (sharedStepWorkItem && !sharedStepWorkItem.getWorkItemWrapper()) {
                        sharedStepWorkItem.setWorkItemWrapper(new WorkItemWrapper(sharedStepWi));
                    }
                }
            }

            if (callback) {
                callback();
            }
        }, errorCallback);
    }

    private _doesSharedStepExist(workItems: WITOM.WorkItem[], sharedStepRef: SharedSteps) {
        let length = workItems.length,
            i = 0;

        for (i = 0; i < length; i++) {
            if (workItems[i].id === sharedStepRef.ref) {
                return true;
            }
        }

        return false;
    }

    private _getWorkItem(id: number, workItems: WITOM.WorkItem[]) {
        let length = workItems.length,
            i = 0;

        for (i = 0; i < length; i++) {
            if (workItems[i].id === id) {
                return workItems[i];
            }
        }
    }

    private _getSharedStepWorkItemsToFetch(sharedStepCache: { [id: number]: SharedStepWorkItem; }): number[] {
        let testSteps = this.getTestSteps(),
            length = testSteps.length,
            i = 0,
            sharedStepsToFetch: number[] = [],
            sharedStepWorkItem: SharedStepWorkItem,
            sharedStepRef,
            id;

        for (i = 0; i < length; i++) {
            if (testSteps[i] instanceof SharedSteps) {
                sharedStepRef = <SharedSteps>testSteps[i];
                id = parseInt(sharedStepRef.ref, 10);
                if (sharedStepCache) {
                    sharedStepWorkItem = sharedStepCache[id];
                    if (sharedStepWorkItem) {
                        if (!sharedStepWorkItem.getWorkItemWrapper()) {
                            sharedStepsToFetch.push(id);
                        }
                    }
                    else {
                        sharedStepsToFetch.push(id);
                    }
                }
                else {
                    sharedStepsToFetch.push(id);
                }
            }
        }

        return sharedStepsToFetch;
    }

    private _setParameterDataXmlField(encodedParams: TFS_Core_Utils.Dictionary<string>) {
        let paramXml: string;
        paramXml = this._parametersData.getXML(encodedParams);
        this.getWorkItemWrapper().setFieldValue(TCMConstants.WorkItemFieldNames.DataField, paramXml);
    }

    private _setParameterDataJsonField() {
        let paramJson: string;
        paramJson = this._parametersDataInfo.getJSON();
        this.getWorkItemWrapper().setFieldValue(TCMConstants.WorkItemFieldNames.DataField, paramJson);
    }

    public getSharedParameters(): SharedParameterDataSet[] {
        return this._sharedParameters;
    }

    public getSharedParameterBeingUsed(): SharedParameterDataSet {
        if (this._sharedParameters && this._sharedParameters.length > 0) {
            return this._sharedParameters[0];
        }
    }

    public getSharedParameterDataSetTitle(): string {
        if (this._sharedParametersTitles && this._sharedParametersTitles.length > 0) {
            return this._sharedParametersTitles[0];
        }
    }

    private id: number = 0;
    private _parametersData: ParametersData;
    private _parametersDataInfo: TestCaseParameterDataInfo;
    private _sharedParameters: SharedParameterDataSet[];
    private _sharedParametersTitles: string[];
    private _sharedStepParametersData: SharedStepParametersData;
    private title: string = "";
    private areaPath: string = "";
    private _description: string = "";
    private data: string[][] = [];
    private _parametersDataFieldValue: string;
    private sharedStepParameters: string[] = [];
}

export class UriHelper {

    public static getClientMTRUri(testPointIds: number[], testPlanId: number) {
        let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault(),
            operation = Utils_String.format("run?planid={0}&testpointids={1}",
                testPlanId,
                testPointIds.join(",")),
            clientUrl = Utils_String.format("{0}/p:{1}/{2}/{3}/{4}",
                tfsContext.navigation.collection.uri,
                tfsContext.navigation.project,
                "testing",
                "testpoint",
                operation);

        return clientUrl.replace("http", "mtr");
    }

    public static getNewClientMTRUri(testRunId: number) {
        let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        let operation: string = Utils_String.format("run?runid={0}", testRunId);
        let clientUrl: string = Utils_String.format("{0}/p:{1}/{2}/{3}/{4}",
            tfsContext.navigation.collection.uri,
            tfsContext.navigation.project,
            "testing",
            "testpoint",
            operation);

        return clientUrl.replace("http", "mtr");
    }

    public static getTestRunnerUri(testRunId: number, suiteId: number, ) {
        let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        let uriProtocol = "test-runner";
        let locale = Utils_Culture.getCurrentCulture();
        let operation: string = Utils_String.format("run?runid={0},suiteid={1},protocolversion={2},isHosted={3},locale={4}",
            testRunId,
            suiteId,
            DesktopTestRunConstants.communicationProtocolVersion,
            tfsContext.isHosted,
            locale.name);
        let clientUrl: string = Utils_String.format("{0}://{1}/{2}/{3}",
            uriProtocol,
            tfsContext.navigation.collection.uri,
            tfsContext.navigation.project,
            operation);
        return clientUrl;
    }

    public static getNewXTClientUri(sessionId: number) {
        let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        let queryParam: string = Utils_String.format("run?id={0}", sessionId);
        let clientUrl: string = Utils_String.format("{0}/p:{1}/{2}/{3}/{4}",
            tfsContext.navigation.collection.uri,
            tfsContext.navigation.project,
            "testing",
            "session",
            queryParam);

        return clientUrl.replace("http", "mtm");
    }

    public static getTestResultUri(testRunId: number, testResultId: number, sessionId: number, isAutomatedRun: boolean = false) {
        let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault(),
            operation: string,
            artifactName: string,
            clientUrl: string;

        if (sessionId > 0) {
            return this._openSessionLinkInMTM(sessionId);
        }
        else {
            return this._openResultLinkInWeb(testRunId, testResultId);
        }
    }

    private static _openResultsLinkInMTM(testRunId: number, testResultId: number) {
        let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault(),
            operation: string,
            artifactName: string,
            clientUrl: string;

        operation = Utils_String.format("open?id={0}&runid={1}", testResultId, testRunId);
        artifactName = "testResult";

        clientUrl = Utils_String.format("{0}/p:{1}/{2}/{3}/{4}",
            tfsContext.navigation.collection.uri,
            tfsContext.navigation.project,
            "testing",
            artifactName,
            operation);

        return clientUrl.replace("http", "mtm");
    }

    private static _openResultLinkInWeb(testRunId: number, testResultId: number) {
        let teamProjectUrl: string;
        let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

        //if existing url is opened in context of team then open new url in same team.
        if (tfsContext.navigation.team) {
            teamProjectUrl = Utils_String.format("{0}/{1}/{2}", tfsContext.navigation.collection.uri, tfsContext.navigation.project, tfsContext.navigation.team);
        }
        else {
            teamProjectUrl = Utils_String.format("{0}/{1}", tfsContext.navigation.collection.uri, tfsContext.navigation.project);
        }

        return Utils_String.format("{0}/_testManagement/runs/?_a=resultSummary&runId={1}&resultId={2}",
            teamProjectUrl, testRunId, testResultId);
    }

    private static _openSessionLinkInMTM(sessionId: number) {
        let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault(),
            operation: string,
            artifactName: string,
            clientUrl: string;
        operation = Utils_String.format("open?id={0}", sessionId);
        artifactName = "session";
        clientUrl = Utils_String.format("{0}/p:{1}/{2}/{3}/{4}",
            tfsContext.navigation.collection.uri,
            tfsContext.navigation.project,
            "testing",
            artifactName,
            operation);

        return clientUrl.replace("http", "mtm");
    }
}

export class ClientObject {

    private isDirty: boolean;
    private existsOnServer: boolean;

    constructor() {
        this.isDirty = false;
        this.existsOnServer = false;
    }

    public postLoad() {
        this.isDirty = false;
        this.existsOnServer = true;
    }

    public postSave() {
        this.isDirty = false;
        this.existsOnServer = true;
    }

    public getIsDirty() {
        return this.isDirty;
    }

    public setIsDirty(value) {
        this.isDirty = value;
    }

    public doesExistOnServer() {
        return this.existsOnServer;
    }

    public setDoesExistOnServer(value: boolean) {
        this.existsOnServer = value;
    }
}

VSS.initClassPrototype(ClientObject, {
    isDirty: false,
    existsOnServer: false
});

export class Collection {

    private _key: string;
    private _items: any[];
    private _deletedItems: { [key: string]: boolean; };

    constructor(key: string) {
        this._key = key;
        this._items = [];
        this._deletedItems = {};
    }

    public getKey() {
        return this._key;
    }

    public getItems() {
        return this._items;
    }

    public getDeletedItems() {
        return this._deletedItems;
    }

    public add(item: any) {
        return this.insert.call(this, this.getItems().length, item);
    }

    public insert(index: number, item: any) {
        if (index >= 0 && index <= this.getItems().length) {
            this.getItems().splice(index, 0, item);
            if (item.owner) {
                // TODO: Define exception throwing mechanism here.
                return false;
            }

            item.owner = this;
            return true;
        }
        else {
            return false;
        }
    }

    public remove(index: number) {
        let item;
        if (index >= 0 && index < this.getItems().length) {
            item = this.getItems()[index];
            item.owner = null;
            this.getDeletedItems()[item[this.getKey()]] = true;
            this.getItems().splice(index, 1);
            return true;
        }
        else {
            return false;
        }
    }

    public set(index: number, item: any) {
        if (index >= 0 && index < this.getItems().length) {
            let oldItem = this.getItems()[index];

            if (item !== oldItem) {
                if (item.owner) {
                    // TODO: Define exception handling mechanism here.
                }

                item.owner = this;
                oldItem.owner = null;
                this.getDeletedItems()[oldItem[this.getKey()]] = true;
                this.getItems()[index] = item;
            }

            return true;
        }
        else {
            return false;
        }
    }

    public clear() {
        let index = 0,
            item;
        for (index = 0; index < this.getItems().length; index++) {
            item = this.getItems()[index];
            item.owner = null;
            this.getDeletedItems()[item[this.getKey()]] = true;
        }

        this._items = [];
    }

    public indexOf(id: number) {
        let index = 0, item;
        for (index = 0; index < this.getItems().length; index++) {
            item = this.getItems()[index];
            if (item.equals) {
                if (item.equals(id)) {
                    return index;
                }
            }
            else if (item[this.getKey()] === id) {
                return index;
            }
        }
    }

    public swap(index1: number, index2: number) {
        if (index1 >= 0 && index1 < this.getItems().length &&
            index2 >= 0 && index2 < this.getItems().length &&
            index1 !== index2) {
            let item1 = this.getItems()[index1],
                item2 = this.getItems()[index2];

            this.getItems()[index1] = item2;
            this.getItems()[index2] = item1;
        }
    }

    public postSave() {
        let index = 0;
        this._deletedItems = {};
        for (index = 0; index < this.getItems().length; index++) {
            this.getItems()[index].postSave();
        }
    }
}

VSS.initClassPrototype(Collection, {
    _key: "",
    _items: null,
    _deletedItems: null
});

export class ServerObjectConversionHelper {

    public static commonPropertiesToExclude: string[] = ["base", "_base", "baseConstructor"];

    public static fromServerObject(serverObject: any, clientObject: any) {
        let prop,
            dateTime: Date;
        // Note that we are just doing a shallow copy here. That is, if there is are any
        // objects, nested within, only the references are copied. So if these properties are
        // changed in the source server object, it will be affected in the target object also.
        // Since new server object gets created wheneve we query data from the server, we should
        // be fine here as we would not change the source server object on the client side.
        for (prop in serverObject) {
            if (serverObject.hasOwnProperty(prop)) {
                if (clientObject[prop] && clientObject[prop] instanceof Date) {
                    dateTime = new Date(serverObject[prop].toString());
                    if (dateTime && dateTime instanceof Date) {
                        clientObject[prop] = dateTime;
                    }
                }
                else {
                    clientObject[prop] = serverObject[prop];
                }
            }
        }

        return clientObject;
    }

    public static toServerObject(clientObject: any, propertiesToExclude: string[]) {
        let serverObject = {},
            property,
            value;
        for (property in clientObject) {
            if (clientObject.hasOwnProperty(property)) {
                if (Utils_Array.contains(propertiesToExclude, property) || Utils_Array.contains(this.commonPropertiesToExclude, property)) {
                    continue;
                }

                value = clientObject[property];
                if (value && (typeof value === "string") && isNaN(Number(value))) {
                    serverObject[property] = value;
                }
                else {
                    serverObject[property] = value;
                }
            }
        }

        return serverObject;
    }

    constructor() {
    }
}

export class TestResultIdentity {

    public static defaultRunId: number = 0;
    public static defaultResultId: number = 0;
    public static defaultIterationid: number = 0;
    public static defaultActionPath: string = "";
    public static defaultSessionId: number = 0;

    public static getIdentity(result) {
        return new TestResultIdentity(result.id.testRunId,
            result.id.testResultId,
            result.iterationId,
            result.actionPath,
            TestResultIdentity.defaultSessionId);
    }

    public testRunId: number;
    public testResultId: number;
    public iterationId: number;
    public actionPath: string;
    public sessionId: number;

    constructor(testRunId: number, testResultId: number, iterationId: number, actionPath: string, sessionId: number) {
        this.testRunId = testRunId;
        this.testResultId = testResultId;
        this.iterationId = iterationId;
        this.actionPath = actionPath;
        this.sessionId = sessionId;
    }
}

VSS.initClassPrototype(TestResultIdentity, {
    testRunId: 0,
    testResultId: 0,
    iterationId: 0,
    actionPath: null,
    sessionId: 0
});

export class TestResult extends ClientObject {

    public id: TestCaseResultIdentifier;
    public outcome: TCMConstants.TestOutcome;
    public errorMessage: string;
    public comment: string;
    public dateStarted: Date;
    public dateCompleted: Date;
    public duration: number;

    constructor() {
        super();
        this.outcome = TCMConstants.TestOutcome.Unspecified;
        this.errorMessage = "";
        this.comment = "";
        this.dateStarted = new Date();
        this.dateCompleted = new Date();
        this.duration = 0;
    }

}

VSS.initClassPrototype(TestResult, {
    id: null,
    outcome: TCMConstants.TestOutcome.Unspecified,
    errorMessage: "",
    comment: "",
    dateStarted: null,
    dateCompleted: null,
    duration: 0
});

export class ActionPathHelper {

    public static charsPerElement: number = 8;

    public static getHexString(number) {
        // number: Number with radix 10 in Int or String form.
        let hexString = parseInt(number, 10).toString(16),
            prePendArray = [],
            prePendArrayLength = this.charsPerElement - hexString.length + 1;

        if (number >= 0 && prePendArrayLength >= 0) {
            prePendArray = new Array(prePendArrayLength);
            return prePendArray.join("0") + hexString;
        }
        else {
            // TODO: Throw exception here.
        }
    }

    public static prepend(child: string, actionId: number) {
        let actionIdString = this.getHexString(actionId);
        if (!child) {
            return actionIdString;
        }
        else {
            return actionIdString + child;
        }
    }

    public static combine(parent: string, actionId: number) {
        let actionIdString = this.getHexString(actionId);
        if (!parent) {
            return actionIdString;
        }
        else {
            return parent + actionIdString;
        }
    }

    public static lastElementOf(path: string) {
        if (path) {
            let startPos = path.length - this.charsPerElement,
                element = path.substr(startPos);

            return parseInt(element, 16);
        }
        else {
            return 0;
        }
    }

    public static lengthOf(path: string) {
        if (!path) {
            return 0;
        }
        else {
            return Math.round(path.length / this.charsPerElement);
        }
    }

    public static isDescendant(parent: string, child: string) {
        // TODO: What is the comparison type used here? It has to be ordinal ignorecase.
        if (child) {
            return child.indexOf(parent) === 0;
        }
        else {
            return false;
        }
    }

    public static elementsOf(path: string) {
        let elements = [], pos;
        if (path) {
            for (pos = 0; pos < path.length; pos += this.charsPerElement) {
                elements.push(parseInt(path.substr(pos, this.charsPerElement), 16));
            }
        }

        return elements;
    }

    constructor() {
    }
}

export class TestActionResult extends TestResult {

    public actionId: number;
    public actionPath: string;
    public parent: any;
    public owner: any;
    public isSubStep: boolean;
    public indexString: string;
    public parentId: number;
    public actionLogTimeStamp: Date;

    constructor(actionId: number, parentId?: number) {
        super();
        this.actionId = actionId;
        this.parentId = parentId;
        this.actionPath = "";
        this.parent = null;
        this.owner = null;
        if (parentId) {
            this.isSubStep = true;
        }
        else {
            this.isSubStep = false;
        }
        this.indexString = "";
    }

    public postLoad() {
        if (ActionPathHelper.lengthOf(this.actionPath) > 0) {
            this.actionId = ActionPathHelper.lastElementOf(this.actionPath);
        }

        super.postLoad();
    }

    public getAction(): string {
        return "";
    }

    public getExpectedResult(): string {
        return "";
    }

    public canEditAction(): boolean {
        return false;
    }

    public canEditExpectedResult(): boolean {
        return false;
    }

    public hasError(): boolean {
        return false;
    }

    public hasActionError(): boolean {
        return false;
    }

    public hasExpectedResultError(): boolean {
        return false;
    }

    public getError(): string {
        return "";
    }

    public hasParameters(): boolean {
        return false;
    }

    public canDelete(): boolean {
        return true;
    }

    public isFormatted(): boolean {
        return false;
    }
}

VSS.initClassPrototype(TestActionResult, {
    actionId: 0,
    actionPath: null,
    parent: null,
    owner: null,
    isSubStep: false,
    indexString: ""
});

export class TestResultParameter extends ClientObject {

    public static propertiesToExclude: string[] = ["isDirty", "existsOnServer", "owner"];

    public static fromServerObject(serverObject): TestResultParameter {
        let testResultParameter = new TestResultParameter();
        return ServerObjectConversionHelper.fromServerObject(serverObject, testResultParameter);
    }

    public static toServerObject(testResultParameter: TestResultParameter) {
        return ServerObjectConversionHelper.toServerObject(testResultParameter, this.propertiesToExclude);
    }

    public parameterName: string;
    public dataType: number;
    public actual: string;
    public expected: string;
    public testRunId: number;
    public testResultId: number;
    public actionPath: string;
    public iterationId: number;
    public owner: any;

    constructor(name?: string, resultIdentity?: TestResultIdentity) {
        /// <param name="name" type="string" optional="true" />
        /// <param name="resultIdentity" optional="true" />
        super();
        this.parameterName = name;
        this.updateIdentity(resultIdentity);
        this.dataType = null;
        this.actual = null;
        this.expected = null;
    }

    public updateIdentity(identity: TestResultIdentity) {
        if (identity) {
            this.testRunId = identity.testRunId;
            this.testResultId = identity.testResultId;
            this.actionPath = identity.actionPath;
            this.iterationId = identity.iterationId;
        }
    }

    public preSave(subResults: SubResults, parentIdentity: TestResultIdentity) {
        this.updateIdentity(parentIdentity);
        if (this.getIsDirty() || !this.doesExistOnServer()) {
            subResults.parameters.push(TestResultParameter.toServerObject(this));
        }
    }
}

VSS.initClassPrototype(TestResultParameter, {
    name: "",
    dataType: null,
    actual: "",
    expected: "",
    testRunId: 0,
    testResultId: 0,
    actionPath: "",
    iterationId: 0,
    owner: null
});

export class TestParameterCollection extends Collection {

    constructor() {
        super("parameterName");
    }

    public removeParam(name: string) {
        let parameterIndex = this.getIndexFromCollection(name);
        if (parameterIndex >= 0 && parameterIndex < this.getItems().length) {
            this.remove(parameterIndex);
        }
    }

    public getIndexFromCollection(name: string) {
        let index = 0, item;
        for (index = 0; index < this.getItems().length; index++) {
            item = this.getItems()[index];
            if (Utils_String.ignoreCaseComparer(name, item[this.getKey()]) === 0) {
                return index;
            }
        }
        return -1;
    }

    public preSave(subResults: SubResults, ownerIdentity: TestResultIdentity) {
        let index = 0,
            parameter,
            resultParameter;
        for (index = 0; index < this.getItems().length; index++) {
            this.getItems()[index].preSave(subResults, ownerIdentity);
        }

        for (parameter in this.getDeletedItems()) {
            if (this.getDeletedItems().hasOwnProperty(parameter)) {
                resultParameter = new TestResultParameter(parameter, ownerIdentity);
                subResults.parameterDeletes.push(TestResultParameter.toServerObject(resultParameter));
            }
        }
    }
}

export class TestStepResult extends TestActionResult {

    public static propertiesToExclude: string[] = ["isFromServer", "parameters", "isDirty", "owner", "action", "expectedResult", "stepType", "existsOnServer", "actionParameters", "expectedResultParameters", "attachments", "parentId", "_testStep"];

    public static fromServerObject(serverObject): TestStepResult {
        let testStepResult = new TestStepResult();
        return ServerObjectConversionHelper.fromServerObject(serverObject, testStepResult);
    }

    public static toServerObject(testStepResult: TestStepResult) {
        return ServerObjectConversionHelper.toServerObject(testStepResult, this.propertiesToExclude);
    }

    public parameters: TestParameterCollection;
    public iterationId: number;
    public stepType: string;
    public actionParameters: {};
    public expectedResultParameters: {};
    public attachments: WITOM.Attachment[];

    constructor(actionId?: number, parentId?: number) {
        super(actionId, parentId);
        this.parameters = new TestParameterCollection();
        this.iterationId = 0;
        this.attachments = [];
    }

    public preSave(subResults: SubResults, parentIdentity: TestResultIdentity) {
        this.id = new TestCaseResultIdentifier(parentIdentity.testRunId, parentIdentity.testResultId);
        this.iterationId = parentIdentity.iterationId;
        this.actionPath = ActionPathHelper.combine(parentIdentity.actionPath, this.actionId);

        if (this.getIsDirty() || !this.doesExistOnServer()) {
            subResults.actionResults.push(TestStepResult.toServerObject(this));
        }

        if (this.parameters) {
            this.parameters.preSave(subResults, TestResultIdentity.getIdentity(this));
        }
    }

    public postSave() {
        super.postSave();
        if (this.parameters) {
            this.parameters.postSave();
        }
    }

    public getAction(): string {
        return this._testStep.action;
    }

    public getExpectedResult(): string {
        return this._testStep.expectedResult;
    }

    public getStepType() {
        return this._testStep.stepType;
    }

    public getAttachments() {
        return this._testStep.getAttachments();
    }

    public setTestStep(testStep: TestStep) {
        this._testStep = testStep;
    }

    public canEditAction(): boolean {
        return this._canEditString(this._testStep.action);
    }

    public canEditExpectedResult(): boolean {
        return this._canEditString(this._testStep.expectedResult);
    }

    public hasError(): boolean {
        return this._testStep.hasError();
    }

    public hasActionError(): boolean {
        return this._testStep.hasActionError();
    }

    public hasExpectedResultError(): boolean {
        return this._testStep.hasExpectedResultError();
    }

    public getError(): string {
        return Resources.ParameterEditingError;
    }

    public hasParameters(): boolean {
        return !this.canEditAction() || !this.canEditExpectedResult();
    }

    public canDelete(): boolean {
        if (this.hasActionError() && !ParameterCommonUtils.hasParameters(this.getExpectedResult()) ||
            this.hasExpectedResultError() && !ParameterCommonUtils.hasParameters(this.getAction()) ||
            this.hasActionError() && this.hasExpectedResultError()) {
            return true;
        }
        return !this.hasParameters();
    }

    private _canEditString(content: string): boolean {
        return !ParameterCommonUtils.hasParameters(content);
    }

    public isFormatted(): boolean {
        return this._testStep.isFormatted;
    }

    public isTestStepPresent(): boolean {
        if (this._testStep) {
            return true;
        }

        return false;
    }

    private _testStep: TestStep;
}

VSS.initClassPrototype(TestStepResult, {
    parameters: null,
    iterationId: 0,
    expectedResult: "",
    stepType: "",
    action: "",
    attachments: null
});

export class TestActionResultCollection extends Collection {

    constructor() {
        super("actionId");
    }

    public preSave(subResults: SubResults, parentItentity: TestResultIdentity) {
        let index = 0,
            deletedId;

        for (index = 0; index < this.getItems().length; index++) {
            this.getItems()[index].preSave(subResults, parentItentity);
        }

        for (deletedId in this.getDeletedItems()) {
            if (this.getDeletedItems().hasOwnProperty(deletedId)) {
                subResults.actionDeletes.push({
                    id: new TestCaseResultIdentifier(parentItentity.testRunId, parentItentity.testResultId),
                    iterationId: parentItentity.iterationId,
                    actionPath: ActionPathHelper.combine(parentItentity.actionPath, deletedId),
                    actionId: deletedId
                });
            }
        }
    }

    public getIsDirty(): boolean {
        let i, actionResult, isDirty = false;
        for (i = 0; i < this.getItems().length; i++) {
            actionResult = this.getItems()[i];
            isDirty = isDirty || actionResult.getIsDirty();
            if (isDirty) {
                break;
            }
        }

        return isDirty;
    }

    public setIsDirty(value: boolean) {
        let i, actionResult;
        for (i = 0; i < this.getItems().length; i++) {
            actionResult = this.getItems()[i];
            actionResult.setIsDirty(value);
        }
    }

    public getStepResultIndex(stepResult: TestActionResult): number {
        let sharedStepResult: SharedStepResult,
            sharedStepResultIndex: number,
            subResults: TestActionResultCollection;

        if (stepResult.parentId) {
            sharedStepResultIndex = this.indexOf(stepResult.parentId);
            sharedStepResult = this.getItems()[sharedStepResultIndex];
            return sharedStepResult.getStepResultIndex(stepResult.actionId);
        }

        return this.indexOf(stepResult.actionId);
    }

}
export class SharedStepResult extends TestActionResult {

    public static propertiesToExclude: string[] = ["actionResults", "isDirty", "owner", "title", "existsOnServer", "parentId", "_sharedStepWorkItem", "isLatestRevision"];

    public static fromServerObject(serverObject: ITestActionResultModel) {
        let sharedStepResult = new SharedStepResult(ActionPathHelper.lastElementOf(serverObject.actionPath), serverObject.sharedStepId);
        return ServerObjectConversionHelper.fromServerObject(serverObject, sharedStepResult);
    }

    public static toServerObject(sharedStepResult) {
        return ServerObjectConversionHelper.toServerObject(sharedStepResult, this.propertiesToExclude);
    }

    public actionResults: TestActionResultCollection;
    public sharedStepId: number;
    public revision: number;
    public iterationId: number;
    public title: string;
    public sharedStepRevision: number;
    private isLatestRevision: boolean;

    constructor(actionId: number, sharedStepId: number) {
        super(actionId);
        this.actionResults = new TestActionResultCollection();
        this.sharedStepId = sharedStepId;
        this.revision = 0;
        this.iterationId = 0;
        this.title = null;
        this.sharedStepRevision = 0;
        this.isLatestRevision = true;
    }

    public getSharedStep(): SharedStepWorkItem {
        return this._sharedStepWorkItem;
    }

    public getAction(): string {
        return this._sharedStepWorkItem.getTitle();
    }

    public getIsLatestRevision() {
        return this.isLatestRevision;
    }

    public canEditAction(): boolean {
        return true;
    }

    public setSharedStep(sharedStep: SharedStepWorkItem) {
        this._sharedStepWorkItem = sharedStep;

        if (this.sharedStepRevision === 0) {
            this.sharedStepRevision = sharedStep.getRevision();
        }
        else if (this.sharedStepRevision !== sharedStep.getRevision()) {
            this.isLatestRevision = false;
        }
    }

    public preSave(subResults: SubResults, parentIdentity: TestResultIdentity) {
        this.id = new TestCaseResultIdentifier(parentIdentity.testRunId, parentIdentity.testResultId);
        this.iterationId = parentIdentity.iterationId;
        this.actionPath = ActionPathHelper.combine(parentIdentity.actionPath, this.actionId);

        if (this.isLatestRevision) {
            this.sharedStepRevision = this._sharedStepWorkItem ? this._sharedStepWorkItem.getRevision() : this.sharedStepRevision;
        }

        if (this.getIsDirty() || !this.doesExistOnServer()) {
            subResults.actionResults.push(SharedStepResult.toServerObject(this));
        }

        if (this.actionResults) {
            this.actionResults.preSave(subResults, TestResultIdentity.getIdentity(this));
        }
    }

    public postSave() {
        super.postSave();
        if (this.actionResults) {
            this.actionResults.postSave();
        }
    }

    public getIsDirty(): boolean {
        let isDirty = super.getIsDirty();
        if (this.actionResults) {
            isDirty = isDirty || this.actionResults.getIsDirty();
        }

        return isDirty;
    }

    public setIsDirty(value: boolean) {
        super.setIsDirty(value);
        if (!value && this.actionResults) {
            this.actionResults.setIsDirty(value);
        }
    }

    public getStepResultIndex(actionId: number) {
        return this.actionResults.indexOf(actionId);
    }

    public getTestActionResult(actionId): TestActionResult {
        let actionResultIndex: number = this.getStepResultIndex(actionId),
            actionResult: TestActionResult = null;
        if (actionResultIndex >= 0) {
            actionResult = this.actionResults.getItems()[actionResultIndex];
        }
        return actionResult;
    }

    public swapTestSteps(index1: number, index2: number) {
        let stepResults: TestActionResultCollection = this.actionResults;
        ArrayUtils.swap(stepResults.getItems(), index1, index2);
        if (this.doesExistOnServer()) {
            this.setIsDirty(true);
        }
    }

    public hasParameters(): boolean {
        let stepResult: TestStepResult,
            stepResults: TestActionResultCollection = this.actionResults,
            stepResultsCount = stepResults.getItems().length,
            i: number;
        for (i = 0; i < stepResultsCount; i++) {
            stepResult = stepResults.getItems()[i];
            if (stepResult.hasParameters()) {
                return true;
            }
        }
        return false;
    }

    public canDelete(): boolean {
        let stepResult: TestStepResult,
            stepResults: TestActionResultCollection = this.actionResults,
            stepResultsCount = stepResults.getItems().length,
            i: number;
        for (i = 0; i < stepResultsCount; i++) {
            stepResult = stepResults.getItems()[i];
            if (!stepResult.canDelete()) {
                return false;
            }
        }
        return true;
    }

    public getError(): string {
        return Resources.SharedStepParameterEditingError;
    }

    public removeStepResult(actionId: number) {
        let stepResultsCollection: TestActionResultCollection = this.actionResults,
            stepResultIndex: number = stepResultsCollection.indexOf(actionId);

        if (stepResultIndex >= 0) {
            stepResultsCollection.remove(stepResultIndex);
            if (this.doesExistOnServer()) {
                this.setIsDirty(true);
            }
        }
    }

    public insertStepResult(stepResult: TestStepResult, actionId: number, newStepId: number) {
        let stepResultsCollection: TestActionResultCollection = this.actionResults,
            stepResultIndex: number = stepResultsCollection.indexOf(actionId),
            testStep: TestStep = this.getSharedStep().getStep(newStepId);

        if (stepResultIndex >= 0) {
            stepResult.setTestStep(<TestStep>testStep);
            stepResultsCollection.insert(stepResultIndex, stepResult);
            if (this.doesExistOnServer()) {
                this.setIsDirty(true);
            }
        }
    }

    public handleStepChanged() {
        if (this.doesExistOnServer()) {
            this.setIsDirty(true);
        }
    }

    private _sharedStepWorkItem: SharedStepWorkItem;
}

VSS.initClassPrototype(SharedStepResult, {
    actionResults: null,
    sharedStepId: 0,
    iterationId: 0,
    title: "",
    revision: 0
});

export class BugInfo {
    constructor(id: number, title: string) {
        this._id = id;
        this._title = title;
    }

    public getId() {
        return this._id;
    }

    public getTitle() {
        return this._title;
    }

    public setTitle(title: string) {
        this._title = title;
    }

    private _id: number;
    private _title: string;
}

export class AttachmentInfo {
    constructor(id: number, name: string, size: number, comment: string, attachmentType?: string) {
        this._id = id;
        this._name = name;
        this._size = size;
        this._comment = comment;
        this._type = attachmentType ? attachmentType : Utils_String.empty;
    }

    public getType(): string {
        return this._type;
    }

    public getId() {
        return this._id;
    }

    public getName() {
        return this._name;
    }

    public getSize() {
        return this._size;
    }

    public getComment() {
        return Utils_String.htmlEncode(this._comment);
    }

    private _type: string;
    private _id: number;
    private _name: string;
    private _size: number;
    private _comment: string;
}

export class TestIterationResult extends TestActionResult {

    public static propertiesToExclude: string[] = ["isFromServer", "actionResults", "parameters", "isDirty", "owner", "existsOnServer", "isOutComeAutoComputed", "_bugs", "_attachments", "parentId"];

    public static fromServerObject(serverObject) {
        let testIterationResult = new TestIterationResult(serverObject.id.testRunId, serverObject.id.testResultId, serverObject.iterationId);
        return ServerObjectConversionHelper.fromServerObject(serverObject, testIterationResult);
    }

    public static toServerObject(testIterationResult) {
        return ServerObjectConversionHelper.toServerObject(testIterationResult, this.propertiesToExclude);
    }

    public iterationId: number;
    public actionResults: TestActionResultCollection;
    public parameters: TestParameterCollection;
    public revision: number;
    public isOutComeAutoComputed: boolean;
    private _bugs: BugInfo[];
    private _attachments: AttachmentInfo[];

    constructor(testRunId: number, testResultId: number, iterationId: number) {
        super(0);
        this.id = new TestCaseResultIdentifier(testRunId, testResultId);
        this.iterationId = iterationId;
        this.actionResults = new TestActionResultCollection();
        this.parameters = new TestParameterCollection();
        this.revision = 0;
        this.isOutComeAutoComputed = false;
        this._bugs = [];
        this._attachments = [];
    }

    public getIsDirty(): boolean {
        let isDirty = super.getIsDirty();
        if (this.actionResults) {
            isDirty = isDirty || this.actionResults.getIsDirty();
        }

        return isDirty;
    }

    public setIsDirty(value: boolean) {
        super.setIsDirty(value);
        if (!value && this.actionResults) {
            this.actionResults.setIsDirty(value);
        }
    }

    public areBugsFiled(): boolean {
        return this._bugs.length > 0;
    }

    public getBugs(): BugInfo[] {
        return this._bugs;
    }

    public setBugs(bugs: BugInfo[]) {
        this._bugs = bugs;
    }

    public addBug(bugInfo: BugInfo, suppressDirty?: boolean) {
        if (this._bugs.some(bug => bug.getId() === bugInfo.getId())) {
            return;
        }
        this._bugs.push(bugInfo);
        if (!suppressDirty) {
            this.setIsDirty(true);
        }
    }

    public getAttachments(): AttachmentInfo[] {
        return this._attachments;
    }

    public setAttachments(attachments: AttachmentInfo[]) {
        this._attachments = attachments;
    }

    public addAttachment(attachmentInfo: AttachmentInfo, makeDirty?: boolean) {
        this._attachments.push(attachmentInfo);
        if (makeDirty) {
            this.setIsDirty(true);
        }
    }

    public createStepResult(actionId: number, parentId?: number): TestStepResult {
        return new TestStepResult(actionId, parentId);
    }

    public createSharedStepResult(actionId: number, sharedStepId: number) {
        return new SharedStepResult(actionId, sharedStepId);
    }

    public getStepResultIndex(actionId: number) {
        return this.actionResults.indexOf(actionId);
    }

    public getTestActionResult(actionId): TestActionResult {
        let actionResultIndex: number = this.getStepResultIndex(actionId),
            actionResult: TestActionResult = null;
        if (actionResultIndex >= 0) {
            actionResult = this.actionResults.getItems()[actionResultIndex];
        }
        return actionResult;
    }

    public findActionResult(action: TestActionResult) {
        let actionPath = "";
        while (action !== null) {
            actionPath = ActionPathHelper.prepend(actionPath, action.actionId);
            action = action.parent;
        }

        return this.findActionResultFromPath(actionPath);
    }

    public findActionResultFromPath(actionPath: string): TestActionResult {
        let index: number = 0,
            actionElements = ActionPathHelper.elementsOf(actionPath),
            actionElementsCount: number = actionElements.length,
            result: TestActionResult = null,
            parent: SharedStepResult,
            actionId: number,
            actionIndex: number;

        for (index = 0; index < actionElementsCount; index++) {
            actionId = actionElements[index];
            if (result === null) {
                result = this.getTestActionResult(actionId);
                if (result === null) {
                    break;
                }
            }
            else {
                if (result instanceof SharedStepResult) {
                    parent = <SharedStepResult>result;
                    result = parent.getTestActionResult(actionId);
                    if (result === null) {
                        break;
                    }
                }
                else {
                    break;
                }
            }
        }

        return result;
    }

    public preSave(subResults: SubResults, parentIdentity: TestResultIdentity) {
        let identity = TestResultIdentity.getIdentity(this);
        this.id = new TestCaseResultIdentifier(parentIdentity.testRunId, parentIdentity.testResultId);
        if (this.getIsDirty() || !this.doesExistOnServer()) {
            subResults.actionResults.push(TestIterationResult.toServerObject(this));
        }

        if (this.actionResults) {
            this.actionResults.preSave(subResults, identity);
        }

        if (this.parameters) {
            this.parameters.preSave(subResults, identity);
        }
    }

    public postSave() {
        super.postSave();
        if (this.actionResults) {
            this.actionResults.postSave();
        }

        if (this.parameters) {
            this.parameters.postSave();
        }
    }

    public addResultAttachmentLinkToWorkItem(attachment: AttachmentInfo, workItem: WITOM.WorkItem) {
        let testCaseResultMonikor,
            externalLink: WITOM.ExternalLink;

        testCaseResultMonikor = LinkingUtilities.encodeUri({
            tool: Artifacts_Constants.ToolNames.TestManagement,
            type: Artifacts_Constants.ArtifactTypeNames.TcmResultAttachment,
            id: Utils_String.format("{0}.{1}.{2}", this.id.testRunId, this.id.testResultId, attachment.getId())
        });

        externalLink = ExternalLink.create(workItem, TCMConstants.WitLinkTypes.TestResultAttachment, testCaseResultMonikor, attachment.getName());
        workItem.addLink(externalLink);
    }
}

VSS.initClassPrototype(TestIterationResult, {
    iterationId: null,
    actionResults: null,
    parameters: null,
    revision: 0,
    owner: null,
    isOutComeAutoComputed: false
});

export class TestIterationCollection extends Collection {

    constructor() {
        super("iterationId");
    }

    public removeIteration(iterationId: number) {
        let index = this.indexOf(iterationId);
        if (index >= 0 && index < this.getItems().length) {
            return this.remove(index);
        }
        else {
            return false;
        }
    }

    public getIteration(iterationId: number) {
        let index = this.indexOf(iterationId);
        if (index >= 0 && index < this.getItems().length) {
            return this.getItems()[index];
        }
    }

    public preSave(subResults: SubResults, parent: TestResultIdentity) {
        let index = 0,
            item,
            iterationResult;
        for (index = 0; index < this.getItems().length; index++) {
            this.getItems()[index].preSave(subResults, parent);
        }

        for (item in this.getDeletedItems()) {
            if (this.getDeletedItems().hasOwnProperty(item)) {
                iterationResult = new TestIterationResult(parent.testRunId, parent.testResultId, item);
                subResults.actionDeletes.push(TestIterationResult.toServerObject(iterationResult));
            }
        }
    }
}

export class TestCaseResult extends TestResult {

    public static EVENT_DIRTY_CHANGED: string = "dirty-changed";
    public static propertiesToExclude: string[] = ["isDirty", "buildNumber", "iterations", "isFromServer", "existsOnServer", "linkedBugs", "_testCase", "isReady", "isLatestRevision"];

    public static fromServerObject(serverObject) {
        let testCaseResult = new TestCaseResult();
        return ServerObjectConversionHelper.fromServerObject(serverObject, testCaseResult);
    }

    public static toServerObject(testCaseResult: TestCaseResult) {
        return ServerObjectConversionHelper.toServerObject(testCaseResult, this.propertiesToExclude);
    }

    private _events: Events_Handlers.NamedEventCollection<TestCaseResult, any>;
    private _testCase: TestCase;

    public testCaseId: number;
    public configurationId: number;
    public configurationName: string;
    public testPointId: number;
    public revision: number;
    public state: TCMConstants.TestResultState;
    public owner: string;
    public runBy: string;
    public testCaseTitle: string;
    public buildNumber: number;
    public iterations: TestIterationCollection;
    public testCaseArea: string;
    public linkedBugs: number[];
    public isFromServer: boolean;
    public dataRowCount: number;
    public testCaseRevision: number;
    public priority: number;
    private isLatestRevision: boolean;

    public isReady: boolean;
    constructor(testResultInfo?) {
        super();
        /// <param name="testResultInfo" optional="true" />

        if (testResultInfo) {
            this.id = new TestCaseResultIdentifier(testResultInfo.testRunId, testResultInfo.testResultId);
            this.testCaseId = testResultInfo.testCaseId;
            this.configurationId = testResultInfo.configurationId;
            this.configurationName = testResultInfo.configurationName;
            this.testPointId = testResultInfo.testPointId;
        }
        else {
            this.id = null;
            this.testCaseId = 0;
            this.configurationId = 0;
            this.configurationName = "";
            this.testPointId = 0;
        }
        this.revision = 0;
        this.state = TCMConstants.TestResultState.InProgress;
        this.owner = null;
        this.runBy = null;
        this.testCaseTitle = "";
        this.buildNumber = 0;
        this.iterations = null;
        this.isFromServer = false;
        this.isReady = false;
        this.testCaseArea = "";
        this.linkedBugs = [];
        this.dataRowCount = 0;
        this.testCaseRevision = 0;
        this.isLatestRevision = true;
        this.priority = 255;
        this._testCase = null;
    }

    public setTestCase(testCase: TestCase) {
        this._testCase = testCase;
        if (this.testCaseRevision !== testCase.getRevision()) {
            this.isLatestRevision = false;
        }
    }

    public getTestCase(): TestCase {
        return this._testCase;
    }

    public getIsLatestRevision(): boolean {
        return this.isLatestRevision;
    }

    public getIsDirty(): boolean {
        let i, iteration,
            isDirty = super.getIsDirty();
        if (this.iterations) {
            for (i = 0; i < this.iterations.getItems().length; i++) {
                iteration = this.iterations.getItems()[i];
                isDirty = isDirty || iteration.getIsDirty();
                if (isDirty) {
                    break;
                }
            }
        }

        return isDirty;
    }

    public setIsDirty(value: boolean) {
        let i, iteration;
        super.setIsDirty(value);
        if (!value && this.iterations) {
            for (i = 0; i < this.iterations.getItems().length; i++) {
                iteration = this.iterations.getItems()[i];
                iteration.setIsDirty(value);
            }
        }

        this._fireEvent(TestCaseResult.EVENT_DIRTY_CHANGED);
    }

    public isDataDriven(): boolean {
        return this.dataRowCount > 0;
    }

    public createIteration(iterationId: number) {
        return new TestIterationResult(this.id.testRunId, this.id.testResultId, iterationId);
    }

    public getIterationCount() {
        return this.dataRowCount === 0 ? 1 : this.dataRowCount;
    }

    public setDuration() {
        let duration: number;
        duration = 0;

        if (this.iterations && this.iterations.getItems().length > 0) {
            $.each(this.iterations.getItems(), function (index, item) {
                duration += item.duration;
            });
        }
        else {
            if (this.dateStarted && this.dateCompleted) {
                /*Calculating duration as diff of complete date-startdate and then multiplying by 10000. Copying this from Tfs.Testmanagement.Utils.ts from
                  method setIterationResultOutcomeLocally()
                  10000 ticks in 1 miliseconds */
                duration = (this.dateCompleted.getTime() - this.dateStarted.getTime()) * 10000;
            }
        }

        this.duration = duration;
    }

    // TODO: Define interfaces for the parameters below and use them.
    private populateIterations(results: ITestActionResultModel[], parameters: ITestResultParameterModel[], attachments: ITestResultAttachmentModel[], associatedBugs: ITestResultAssociatedBugs[]) {
        let index = 0,
            iterations = new TestIterationCollection(),
            iterationAndNewIndex = null,
            parameter,
            attachment,
            iteration,
            stepResult,
            i: number,
            lengthAssociatedBugs = associatedBugs ? associatedBugs.length : 0;

        if (!results) {
            return null;
        }

        for (index = 0; index < results.length; index++) {
            iterationAndNewIndex = this.readIteration(results, index);
            iterations.add(iterationAndNewIndex.iteration);
            index = iterationAndNewIndex.index;
        }

        if (iterations.getItems().length > 0 && lengthAssociatedBugs > 0) {
            iteration = iterations.getItems()[0];
            for (i = 0; i < lengthAssociatedBugs; i++) {
                iteration.addBug(new BugInfo(associatedBugs[i].bugId, associatedBugs[i].bugTitle), true);
            }
        }

        if (parameters) {
            for (index = 0; index < parameters.length; index++) {
                parameter = TestResultParameter.fromServerObject(parameters[index]);
                iteration = iterations.getIteration(parameter.iterationId);
                if (ActionPathHelper.lengthOf(parameter.actionPath) === 0) {
                    iteration.parameters.add(parameter);
                }
                else {
                    stepResult = iteration.findActionResultFromPath(parameter.actionPath);
                    if (stepResult) {
                        stepResult.parameters.add(parameter);
                    }
                }
            }
        }

        if (attachments) {
            for (index = 0; index < attachments.length; index++) {
                attachment = new AttachmentInfo(attachments[index].id, attachments[index].fileName, attachments[index].size, attachments[index].comment);
                iteration = iterations.getIteration(attachments[index].iterationId);
                if (ActionPathHelper.lengthOf(attachment.actionPath) === 0) {
                    iteration.addAttachment(attachment);
                }
            }
        }

        return iterations;
    }

    public areBugsFiled(): boolean {
        return this.linkedBugs && this.linkedBugs.length > 0;
    }

    public static createTestCaseResultObject(serverTestCaseResult: TestCaseResult, actionResults: ITestActionResultDetailsModel): TestCaseResult {
        let index = 0,
            i = 0,
            localTestCaseResult,
            actionResultDetailForTestResult: ITestActionResultDetailsModel = { actionResults: [], parameters: [], attachments: [], associatedBugs: [] };

        if (actionResults) {

            for (i = 0; i < actionResults.actionResults.length; i++) {
                if (actionResults.actionResults[i].id.testResultId === serverTestCaseResult.id.testResultId) {
                    actionResultDetailForTestResult.actionResults.push(actionResults.actionResults[i]);
                }
            }

            for (i = 0; i < actionResults.parameters.length; i++) {
                if (actionResults.parameters[i].testResultId === serverTestCaseResult.id.testResultId) {
                    actionResultDetailForTestResult.parameters.push(actionResults.parameters[i]);
                }
            }
            for (i = 0; i < actionResults.attachments.length; i++) {
                if (actionResults.attachments[i].testResultId === serverTestCaseResult.id.testResultId) {
                    actionResultDetailForTestResult.attachments.push(actionResults.attachments[i]);
                }
            }
            if (actionResults.associatedBugs) {
                for (i = 0; i < actionResults.associatedBugs.length; i++) {
                    if (actionResults.associatedBugs[i].testResultId === serverTestCaseResult.id.testResultId) {
                        actionResultDetailForTestResult.associatedBugs.push(actionResults.associatedBugs[i]);
                    }
                }
            }
        }

        localTestCaseResult = TestCaseResult.fromServerObject(serverTestCaseResult);

        if (actionResultDetailForTestResult &&
            actionResultDetailForTestResult.actionResults &&
            actionResultDetailForTestResult.actionResults.length > 0) {

            localTestCaseResult.iterations = localTestCaseResult.populateIterations(actionResultDetailForTestResult.actionResults,
                actionResultDetailForTestResult.parameters,
                actionResultDetailForTestResult.attachments,
                actionResultDetailForTestResult.associatedBugs);
            localTestCaseResult.setDoesExistOnServer(true);
        }
        else {
            localTestCaseResult.iterations = new TestIterationCollection();
        }

        return localTestCaseResult;
    }

    private readIteration(results: ITestActionResultModel[], index: number) {
        let iterationId = results[index].iterationId,
            iteration = TestIterationResult.fromServerObject(results[index]),
            childIndex = index + 1,
            actionResultAndIndex;

        iteration.postLoad();
        while (childIndex < results.length && results[childIndex].iterationId === iterationId) {
            if (ActionPathHelper.lengthOf(results[childIndex].actionPath) === 1) {

                // This is a test action result.
                actionResultAndIndex = this.readActionResult(results, childIndex);
                iteration.actionResults.add(actionResultAndIndex.actionResult);
                childIndex = actionResultAndIndex.index;
            }

            childIndex++;
        }

        index = childIndex - 1;
        return { iteration: iteration, index: index };
    }

    private readActionResult(results: ITestActionResultModel[], index: number) {
        let actionPath = results[index].actionPath,
            pathLength = ActionPathHelper.lengthOf(actionPath),
            iterationId = results[index].iterationId,
            actionResult = results[index],
            isSharedStepResult = actionResult.sharedStepId > 0,
            childIndex = index + 1,
            actionResultAndIndex,
            actionResultObject;

        if (!isSharedStepResult) {
            actionResultObject = TestStepResult.fromServerObject(results[index]);
        }
        else {
            actionResultObject = SharedStepResult.fromServerObject(results[index]);
        }

        actionResultObject.postLoad();
        while (childIndex < results.length &&
            results[childIndex].iterationId === iterationId &&
            ActionPathHelper.isDescendant(actionPath, results[childIndex].actionPath)) {

            if (ActionPathHelper.lengthOf(results[childIndex].actionPath) === pathLength + 1) {
                if (isSharedStepResult) {
                    actionResultAndIndex = this.readActionResult(results, childIndex);
                    actionResultObject.actionResults.add(actionResultAndIndex.actionResult);
                    childIndex = actionResultAndIndex.index;
                }
            }

            childIndex++;
        }

        index = childIndex - 1;
        return { actionResult: actionResultObject, index: index };
    }

    public preSave(subResults: SubResults) {
        if (this.iterations) {
            this.iterations.preSave(subResults, TestResultIdentity.getIdentity(this));
        }

        if (this.getIsDirty() ||
            !this.doesExistOnServer() ||
            subResults.actionResults.length !== 0 ||
            subResults.actionDeletes.length !== 0 ||
            subResults.parameters.length !== 0 ||
            subResults.parameterDeletes.length !== 0) {
            if (this.isLatestRevision) {
                this.testCaseRevision = this._testCase ? this._testCase.getRevision() : this.testCaseRevision;
            }

            subResults.testCaseResult = this;
        }
    }

    public postSaveResult(resultUpdateResponse) {
        super.postSave();
        this.revision = resultUpdateResponse.revision;

        if (this.iterations) {
            this.iterations.postSave();
        }
    }

    public associateWorkItem(testResultManager: TestResultManager, workItem: WITOM.WorkItem, callback: () => any, errorCallback?: () => any) {
        // Track the bugs that are added. The linked bugs are used to track the bugs that are already added and the bugs that are
        // being added. This is to prevent a bunch of timing issues if the user tries to save the bug continuosly.
        this.linkedBugs.push(workItem.id);

        // Associate work item with test case result.
        testResultManager.associateWorkItems([this.id], [workItem.id],
            () => {

                // Mark the iteration as dirty.
                this.setIsDirty(true);

                if (callback) {
                    callback();
                }

            },
            () => {

                // Remove the bug since it could not be added.
                let index = $.inArray(workItem.id, this.linkedBugs);
                if (index > -1) {
                    this.linkedBugs.splice(index, 1);
                }

                if (errorCallback) {
                    errorCallback();
                }
            });
    }

    public fire(eventName, sender, eventArgs) {
        // Notifying all the subscribers
        return this._fireEvent(eventName, sender, eventArgs);
    }

    public _fireEvent(eventName: string, sender?: any, args?: any) {
        /// <summary>Invoke the specified event passing the specified arguments.</summary>
        /// <param name="eventName" type="String">The event to invoke.</param>
        /// <param name="sender" type="Object" optional="true">The sender of the event.</param>
        /// <param name="args" type="Object" optional="true">The arguments to pass through to the specified event.</param>
        if (this._events) {
            // Invoke handlers until a handler returns false to cancel handler chain.
            let eventBubbleCancelled;
            this._events.invokeHandlers(eventName, sender, args, (result) => {
                if (result === false) {
                    eventBubbleCancelled = true;
                    return true;
                }
            });
            if (eventBubbleCancelled) {
                return false;
            }
        }
    }

    public attachEvent(eventName: string, handler: IEventHandler) {
        /// <summary>Attatch a handler to an event.</summary>
        /// <param name="eventName" type="String">The event name.</param>
        /// <param name="handler" type="IEventHandler">The handler to attach.</param>
        if (!this._events) {
            this._events = new Events_Handlers.NamedEventCollection();
        }

        this._events.subscribe(eventName, <any>handler);
    }

    public detachEvent(eventName: string, handler: IEventHandler) {
        /// <summary>Detatch a handler from an event.</summary>
        /// <param name="eventName" type="String">The event name.</param>
        /// <param name="handler" type="IEventHandler">The handler to attach.</param>
        if (this._events) {
            this._events.unsubscribe(eventName, <any>handler);
        }
    }

    public addResultLinkToWorkItem(workItem: WITOM.WorkItem) {
        let testCaseResultMonikor,
            externalLink;

        testCaseResultMonikor = LinkingUtilities.encodeUri({
            tool: Artifacts_Constants.ToolNames.TestManagement,
            type: Artifacts_Constants.ArtifactTypeNames.TcmResult,
            id: Utils_String.format("{0}.{1}", this.id.testRunId, this.id.testResultId)
        });

        externalLink = ExternalLink.create(workItem, TCMConstants.WitLinkTypes.TestResult, testCaseResultMonikor);
        let links = workItem.getLinks();
        let isLinkPresent = links.some((link) => link.getArtifactLinkType() === TCMConstants.WitLinkTypes.TestResult && link.linkData.FilePath === testCaseResultMonikor);
        if (!isLinkPresent) {
            workItem.addLink(externalLink);
        }

    }

    private _getActionResultCollection(iterationId: number, parentId: number) {
        let stepResultIndex: number,
            sharedStepResultIndex: number,
            sharedStepResult: SharedStepResult,
            actionResultsCollection: TestActionResultCollection,
            iteration: TestIterationResult = this.iterations.getIteration(iterationId);

        if (iteration) {
            actionResultsCollection = iteration.actionResults;

            if (parentId) {
                sharedStepResultIndex = actionResultsCollection.indexOf(parentId);
                sharedStepResult = actionResultsCollection.getItems()[sharedStepResultIndex];
                return sharedStepResult.actionResults;
            }
            else {
                return actionResultsCollection;
            }
        }
    }

    public removeStepResult(iterationId: number, actionId: number, parentId: number) {
        let iterationResult: TestIterationResult = this.iterations.getIteration(iterationId),
            sharedStepResult: SharedStepResult,
            sharedStepResultIndex: number,
            stepResultsCollection: TestActionResultCollection = iterationResult.actionResults,
            stepResultIndex: number;

        if (stepResultsCollection) {
            if (parentId) {
                sharedStepResultIndex = stepResultsCollection.indexOf(parentId);
                if (sharedStepResultIndex >= 0) {
                    sharedStepResult = stepResultsCollection.getItems()[sharedStepResultIndex];
                    if (sharedStepResult) {
                        sharedStepResult.removeStepResult(actionId);
                    }
                }
            }
            else {
                stepResultIndex = stepResultsCollection.indexOf(actionId);
                if (stepResultIndex >= 0) {
                    stepResultsCollection.remove(stepResultIndex);
                    if (this.doesExistOnServer()) {
                        this.setIsDirty(true);
                        iterationResult.setIsDirty(true);
                    }
                }
            }
        }
    }

    public insertStepResult(iterationId: number, actionId: number, parentId: number, newStepId: number) {
        //insert new StepResult before stepResult with actionID,parentId provided. The new stepResult should have actionId -newStepId
        let iterationResult: TestIterationResult = this.iterations.getIteration(iterationId),
            stepResultsCollection: TestActionResultCollection = iterationResult.actionResults,
            sharedStepResult: SharedStepResult,
            sharedStepResultIndex: number,
            stepResultIndex: number,
            stepResult: TestStepResult,
            testStep: TestAction;

        if (iterationResult && stepResultsCollection) {
            stepResult = iterationResult.createStepResult(newStepId, parentId);

            if (parentId) {
                sharedStepResultIndex = stepResultsCollection.indexOf(parentId);
                if (sharedStepResultIndex >= 0) {
                    sharedStepResult = stepResultsCollection.getItems()[sharedStepResultIndex];
                    if (sharedStepResult) {
                        sharedStepResult.insertStepResult(stepResult, actionId, newStepId);
                    }
                }
            }
            else {
                testStep = this._testCase.getTestStep(newStepId);
                stepResult.setTestStep(<TestStep>testStep);
                stepResultIndex = stepResultsCollection.indexOf(actionId);
                if (stepResultIndex >= 0) {
                    stepResultsCollection.insert(stepResultIndex, stepResult);
                    if (this.doesExistOnServer()) {
                        this.setIsDirty(true);
                        iterationResult.setIsDirty(true);
                    }
                }
            }
        }
    }

    public swapTestSteps(index1: number, index2: number, parentId: number, iterationId: number) {
        let iterationResult: TestIterationResult = this.iterations.getIteration(iterationId),
            stepResults: TestActionResultCollection = iterationResult.actionResults,
            sharedStepResultIndex: number,
            sharedStepResult: SharedStepResult;

        if (parentId) {
            sharedStepResultIndex = stepResults.indexOf(parentId);
            if (sharedStepResultIndex >= 0) {
                sharedStepResult = stepResults.getItems()[sharedStepResultIndex];
                if (sharedStepResult) {
                    sharedStepResult.swapTestSteps(index1, index2);
                }
            }
        }
        else {
            ArrayUtils.swap(stepResults.getItems(), index1, index2);
            if (this.doesExistOnServer()) {
                this.setIsDirty(true);
                iterationResult.setIsDirty(true);
            }
        }
    }

    public handleStepChanged(id: number, parentId: number, iterationId: number) {
        let iterationResult: TestIterationResult = this.iterations.getIteration(iterationId),
            stepResults: TestActionResultCollection = iterationResult.actionResults,
            sharedStepResultIndex: number,
            sharedStepResult: SharedStepResult;

        if (!parentId) {
            return;
        }
        else {
            sharedStepResultIndex = stepResults.indexOf(parentId);
            if (sharedStepResultIndex >= 0) {
                sharedStepResult = stepResults.getItems()[sharedStepResultIndex];
                if (sharedStepResult) {
                    sharedStepResult.handleStepChanged();
                }
            }
        }
    }
}
VSS.initClassPrototype(TestCaseResult, {
    testCaseId: 0,
    configurationId: 0,
    configurationName: "",
    testPointId: 0,
    revision: 0,
    state: TCMConstants.TestResultState.InProgress,
    owner: null,
    runBy: null,
    testCaseTitle: "",
    buildNumber: 0,
    iterations: null,
    isFromServer: false,
    testCaseArea: "",
    linkedBugs: null,
    _events: null
});

export class Command {

    constructor() {
    }

    public equals(command: Command): number {
        return -1;
    }

    public execute(CommandArgs) {
    }
}

export class InlineEditCommand extends Command {
    public _parentId: number;

    constructor(parentId) {
        super();
        this._parentId = parentId;
    }

    public getParentId(): number {
        return this._parentId;
    }
}

export class ParameterCommand extends Command {
    private _paramName: string;

    constructor(parameterName) {
        super();
        this._paramName = parameterName;
    }

    public getParamName() {
        return this._paramName;
    }

    public _isConflictingParameter(args: SharedStepParameterCommandArgs): boolean {
        return Utils_Array.contains(args.getConflictingParameters(), this.getParamName(), Utils_String.localeIgnoreCaseComparer);
    }
}

export class RenameParameterCommand extends ParameterCommand {
    private _newParamName: string;

    constructor(parameterName, newParamName) {
        super(parameterName);
        this._newParamName = newParamName;
    }

    public execute(args: SharedStepParameterCommandArgs) {
        let testCaseParamDataInfo = args.getTestCaseParameterDataInfo();
        if (testCaseParamDataInfo) {
            testCaseParamDataInfo.renameParameter(this.getParamName(), this._newParamName, this._isConflictingParameter(args));
        }
        else {
            args.getParametersData().renameParameter(this.getParamName(), this._newParamName, this._isConflictingParameter(args));
        }
    }

    public getNewParamName() {
        return this._newParamName;
    }
}

export class DeleteParameterCommand extends ParameterCommand {
    constructor(parameterName) {
        super(parameterName);
    }

    public execute(args: SharedStepParameterCommandArgs) {
        if (!this._isConflictingParameter(args)) {
            let testCaseParamDataInfo = args.getTestCaseParameterDataInfo();
            if (testCaseParamDataInfo) {
                testCaseParamDataInfo.deleteParameter(this.getParamName());
            }
            else {
                args.getParametersData().deleteParameter(this.getParamName());
            }
        }
    }
}

export class AddParameterCommand extends ParameterCommand {
    constructor(parameterName) {
        super(parameterName);
    }

    public execute(args: SharedStepParameterCommandArgs) {
        if (!this._isConflictingParameter(args)) {
            let testCaseParamDataInfo = args.getTestCaseParameterDataInfo();
            if (testCaseParamDataInfo) {
                testCaseParamDataInfo.autoMapIfParamNotExistsAlready(this.getParamName());
            }
        }
    }
}

export class RenameSharedParameterCommand extends ParameterCommand {
    private _newParamName: string;

    constructor(parameterName, newParamName) {
        super(parameterName);
        this._newParamName = newParamName;
    }

    public execute(args: SharedParamDataSetCommandArgs) {
        let tcDataInfo: TestCaseParameterDataInfo = args.getTestCaseParamDataInfo();
        if (tcDataInfo) {
            if (this.getParamName()) { // If the old name is not "" then it is rename.
                tcDataInfo.changeParameterMappings(this.getParamName(), this.getNewParamName());
            }// else effectively it was add column in shared dataset
            // In both rename and add we need to try automapping in linked testcases.
            tcDataInfo.autoMapForParamWithoutMapping(this.getNewParamName());
        }
    }

    public getNewParamName() {
        return this._newParamName;
    }
}

export class DeleteSharedParameterCommand extends ParameterCommand {
    constructor(parameterName) {
        super(parameterName);
    }

    public execute(args: SharedParamDataSetCommandArgs) {
        let tcDataInfo: TestCaseParameterDataInfo = args.getTestCaseParamDataInfo();
        if (tcDataInfo) {
            tcDataInfo.removeParameterMappings(this.getParamName());
        }
    }
}

export class InsertCommand extends InlineEditCommand {
    private _newStepId: number;
    private _actionId: number;

    constructor(actionId, parentId, newStepId) {
        super(parentId);
        this._newStepId = newStepId;
        this._actionId = actionId;
    }

    public execute(commandArgs: InlineEditCommandArgs) {
        commandArgs.getTestCaseResult().insertStepResult(commandArgs.getIterationId(), this._actionId, this._parentId, this._newStepId);
    }
}

export class DeleteCommand extends InlineEditCommand {
    private _actionId: number;

    constructor(actionId, parentId) {
        super(parentId);
        this._actionId = actionId;
    }

    public execute(commandArgs: InlineEditCommandArgs) {
        commandArgs.getTestCaseResult().removeStepResult(commandArgs.getIterationId(), this._actionId, this._parentId);
    }
}

export class MoveCommand extends InlineEditCommand {
    private _index1: number;
    private _index2: number;

    constructor(index1, index2, parentId) {
        super(parentId);
        this._index1 = index1;
        this._index2 = index2;
    }

    public execute(commandArgs: InlineEditCommandArgs) {
        commandArgs.getTestCaseResult().swapTestSteps(this._index1, this._index2, this._parentId, commandArgs.getIterationId());
    }
}

export class EditSharedStepCommand extends InlineEditCommand {
    private _actionId: number;

    constructor(actionId, parentId) {
        super(parentId);
        this._actionId = actionId;
    }

    public getActionId() {
        return this._actionId;
    }

    public equals(command: EditSharedStepCommand): number {
        if (command instanceof EditSharedStepCommand) {
            if (this._actionId === command.getActionId() && this._parentId === command.getParentId()) {
                return 0;
            }
        }
        return -1;
    }

    public execute(commandArgs: InlineEditCommandArgs) {
        commandArgs.getTestCaseResult().handleStepChanged(this._actionId, this._parentId, commandArgs.getIterationId());
    }
}

export class CommandQueue {

    private _commands: Command[];

    constructor(commandsArray?: Command[]) {
        if (commandsArray) {
            this._commands = commandsArray;
        }
        else {
            this._commands = [];
        }
    }

    public insert(command: Command) {
        this._commands.splice(this._commands.length, 0, command);
    }

    public execute(commandArgs: CommandArgs): boolean {
        let i: number,
            length = this._commands.length;

        if (length === 0) {
            return false;
        }

        for (i = 0; i < length; i++) {
            this._commands[i].execute(commandArgs);
        }

        return true;
    }

    public clear() {
        Utils_Array.clear(this._commands);
    }

    public getLength(): number {
        return this._commands.length;
    }

    public contains(command: Command): boolean {
        let command1: Command,
            command2: Command;

        return Utils_Array.contains(this._commands, command, (command1, command2) => { return command1.equals(command2); });
    }
}

VSS.initClassPrototype(CommandQueue, {
    commands: null
});

export class CommandArgs {
    constructor() {
    }
}

export class InlineEditCommandArgs extends CommandArgs {
    private _testCaseResult: TestCaseResult;
    private _iterationId: number;

    constructor(testCaseResult: TestCaseResult, iterationId: number) {
        super();
        this._testCaseResult = testCaseResult;
        this._iterationId = iterationId;
    }

    public getTestCaseResult(): TestCaseResult {
        return this._testCaseResult;
    }

    public getIterationId(): number {
        return this._iterationId;
    }
}

export class SharedStepParameterCommandArgs extends CommandArgs {
    private _parametersData: SharedStepParametersData;
    private _testCaseParamDataInfo: TestCaseParameterDataInfo;
    private _conflictingParameters: string[];

    constructor(parametersData: SharedStepParametersData, testCaseParamDataInfo: TestCaseParameterDataInfo, conflictingParameters: string[]) {
        super();
        this._parametersData = parametersData;
        this._conflictingParameters = conflictingParameters;
        this._testCaseParamDataInfo = testCaseParamDataInfo;
    }

    public getParametersData(): SharedStepParametersData {
        return this._parametersData;
    }

    public getConflictingParameters(): string[] {
        return this._conflictingParameters;
    }

    public getTestCaseParameterDataInfo(): TestCaseParameterDataInfo {
        return this._testCaseParamDataInfo;
    }
}

export class SharedParamDataSetCommandArgs extends CommandArgs {
    private _testCaseParamDataInfo: TestCaseParameterDataInfo;

    constructor(testCaseParamDataInfo: TestCaseParameterDataInfo) {
        super();
        this._testCaseParamDataInfo = testCaseParamDataInfo;
    }

    public getTestCaseParamDataInfo(): TestCaseParameterDataInfo {
        return this._testCaseParamDataInfo;
    }
}

export module InlineEditCommands {
    export let insertStep = "insert-step";
    export let moveStepUp = "move-step-up";
    export let moveStepDown = "move-step-down";
    export let deleteStep = "delete-step";
}

export class SubResults {

    public actionResults: any;
    public actionDeletes: any;
    public parameters: any;
    public parameterDeletes: any;
    public testCaseResult: TestCaseResult;

    constructor() {
        this.actionResults = [];
        this.actionDeletes = [];
        this.parameters = [];
        this.parameterDeletes = [];
    }
}

VSS.initClassPrototype(SubResults, {
    actionResults: null,
    actionDeletes: null,
    parameters: null,
    parameterDeletes: null,
    testCaseResult: null
});

class ResultUpdateRequest {

    public static toServerObject(resultUpdateRequest: ResultUpdateRequest) {
        return {
            testResultId: resultUpdateRequest.testResultId,
            testRunId: resultUpdateRequest.testRunId,
            testCaseResult: TestCaseResult.toServerObject(resultUpdateRequest.testCaseResult),
            actionResults: resultUpdateRequest.actionResults,
            actionResultDeletes: resultUpdateRequest.actionResultDeletes,
            parameters: resultUpdateRequest.parameters,
            parameterDeletes: resultUpdateRequest.parameterDeletes
        };
    }

    public testRunId: number;
    public testResultId: number;
    public localTestCaseResult: TestCaseResult;
    public testCaseResult: TestCaseResult;
    public actionResults: any;
    public actionResultDeletes: any;
    public parameters: any;
    public parameterDeletes: any;

    constructor(testRunId, testResultId, result) {
        this.testRunId = testRunId;
        this.testResultId = testResultId;
        this.localTestCaseResult = result;
        this.testCaseResult = result;
        this.actionResults = [];
        this.actionResultDeletes = [];
        this.parameters = [];
        this.parameterDeletes = [];
    }
}

VSS.initClassPrototype(ResultUpdateRequest, {
    testRunId: 0,
    testResultId: 0,
    localTestCaseResult: null,
    testCaseResult: null,
    actionResults: null,
    actionResultDeletes: null,
    parameters: null,
    parameterDeletes: null
});

export interface ITestRunAndResults {
    testRun: ITestRunModel;
    testCaseResults: TestCaseResult[];
    bugCategoryName: string;
    testActionResults: ITestActionResultDetailsModel;
    testPointToResume: ITestPointModel;
}

export class BuildManager extends TFS_Service.TfsService {

    private _buildHttpClient: Build_Client.BuildHttpClient;

    constructor() {
        super();
    }

    public initializeConnection(connection: Service.VssConnection) {
        super.initializeConnection(connection);
        this._buildHttpClient = this.getConnection().getHttpClient(Build_Client.BuildHttpClient);
    }

    public beginGetBuildArtifacts(
        buildId: number)
        : IPromise<BuildContracts.BuildArtifact[]> {
        if (!this._buildHttpClient) {
            this._buildHttpClient = this.tfsConnection.getHttpClient<Build_Client.BuildHttpClient>(Build_Client.BuildHttpClient);
        }

        return this._buildHttpClient.getArtifacts(buildId, TFS_Host_TfsContext.TfsContext.getDefault().navigation.project);
    }
}

export class CodeCoverageManager extends TFS_Service.TfsService {
    private _collectionHttpTcmClient: TCM_Client.TestHttpClient;
    private _projectId: string;

    constructor() {
        super();
    }

    public initializeConnection(connection: Service.VssConnection) {
        super.initializeConnection(connection);
        this._collectionHttpTcmClient = this.getConnection().getHttpClient(TCM_Client.TestHttpClient);
        this._projectId = this.getTfsContext().contextData.project.id;
    }

    public beginGetCodeCoverageSummary(
        buildId: number)
        : IPromise<TCMContracts.CodeCoverageSummary> {

        return this._collectionHttpTcmClient.getCodeCoverageSummary(this._projectId, buildId);
    }

    public beginGetBuildCodeCoverage(
        buildId: number)
        : IPromise<TCMContracts.BuildCoverage[]> {

        return this._collectionHttpTcmClient.getBuildCodeCoverage(this._projectId, buildId, TCMContracts.CoverageQueryFlags.Modules);
    }
}

export class TestRunManager extends TFS_Service.TfsService {
    private _collectionHttpTcmClient: TCM_Client.TestHttpClient;
    private _projectId: string;

    constructor() {
        super();
    }

    /**
    * Initializes the TFS service with a connection
    * @param tfsConnection The connection
    */
    public initializeConnection(connection: Service.VssConnection) {
        super.initializeConnection(connection);
        this._collectionHttpTcmClient = this.getConnection().getHttpClient(TCM_Client.TestHttpClient);
        this._projectId = this.getTfsContext().contextData.project.id;
    }

    public static createLocalObject(testRunAndResults: ITestRunAndResults) {
        let index = 0,
            testCaseResults = testRunAndResults.testCaseResults,
            localTestCaseResults = [],
            localTestCaseResult,
            actionResults = testRunAndResults.testActionResults;

        for (index = 0; index < testCaseResults.length; index++) {
            localTestCaseResult = TestCaseResult.createTestCaseResultObject(testCaseResults[index], actionResults);
            localTestCaseResult.planId = testRunAndResults.testRun.testPlanId;
            localTestCaseResults.push(localTestCaseResult);
        }

        testRunAndResults.testCaseResults = localTestCaseResults;
        return testRunAndResults;
    }

    public getApiLocation(action?: string) {
        /// <summary>Gets the url for the action</summary>
        /// <param name="action" type="string" optional="true">the action to be invoked</param>
        return this.getTfsContext().getActionUrl(action || "", "testrun", { area: "api" });
    }

    public create(testRunDetails: ITestRunDetails, testPoints: ITestPointModel[], callback, errorCallback?) {
        let testResultCreationRequestModels = this._getTestCaseResultCreationRequestModels(testPoints);

        testRunDetails.testRunId = 0;
        this._ajaxPost("Create",
            {
                runModel: Utils_Core.stringifyMSJSON(testRunDetails),
                testResultCreationRequestModels: Utils_Core.stringifyMSJSON(testResultCreationRequestModels)
            },
            function (testRunAndResultResponses) {
                let testRunAndResults = TestRunManager.createLocalObjectFromResponses(testRunAndResultResponses, testPoints);
                if ($.isFunction(callback)) {
                    callback(testRunAndResults);
                }
            },
            errorCallback);
    }

    public createRun2(createRunModel: TCMContracts.RunCreateModel): IPromise<TCMContracts.TestRun> {
        return this._collectionHttpTcmClient.createTestRun(createRunModel, TFS_Host_TfsContext.TfsContext.getDefault().navigation.project);
    }

    public CreateTestRunForTestPoints(teamId: string,
        testPlanId: number,
        testPointIds: number[],
        callback, errorCallback?) {
        this._ajaxPost("CreateTestRunForTestPoints",
            {
                testPlanId: testPlanId,
                testPointIds: testPointIds
            },
            (testRunAndResultResponse) => {
                let testRunAndResults = {
                    testRun: testRunAndResultResponse.testRun,
                    testCaseResults: testRunAndResultResponse.testResults,
                    bugCategoryName: testRunAndResultResponse.bugCategoryTypeName,
                    testActionResults: null,
                    testPointToResume: null
                };
                $.each(testRunAndResults.testCaseResults, (index, results) => {
                    results.planId = testRunAndResultResponse.testRun.testPlanId;
                    results.useTeamSettings = !!teamId;
                });
                if ($.isFunction(callback)) {
                    callback(testRunAndResults);
                }
            },
            errorCallback);
    }

    public getTestRunForTestPoint(testPlanId: number, testPointId: number, callback, errorCallback?) {

        this._ajaxJson("GetTestRunForTestPoint",
            {
                testPlanId: testPlanId,
                testPointId: testPointId
            },
            function (testRunAndResults) {
                let argument = {
                    testRun: testRunAndResults.testRun,
                    testCaseResults: testRunAndResults.testResults,
                    testActionResults: testRunAndResults.testActionResults,
                    bugCategoryName: testRunAndResults.bugCategoryTypeName
                };
                if ($.isFunction(callback)) {
                    callback(argument);
                }
            },
            errorCallback);
    }


    /**
    * Gets Test run for Id
    * This API uses MVC end-point to fetch Test Run
    * It returns an object containing TestRun, TestCaseResults, TestActionResults and testPointToResume, thus, is an heavy API
    */
    public getTestRun(testRunId: number, testPointToResume: ITestPointModel, callback, errorCallback?) {

        this._ajaxJson("GetTestRun",
            {
                testRunId: testRunId
            },
            function (testRunAndResults) {
                let argument = {
                    testRun: testRunAndResults.testRun,
                    testCaseResults: testRunAndResults.testResults,
                    testActionResults: testRunAndResults.testActionResults,
                    testPointToResume: testPointToResume
                };
                if ($.isFunction(callback)) {
                    callback(argument);
                }
            },
            errorCallback);
    }

    /**
    * Gets Test run by Id
    * This API uses the Auto-generated REST client for fetching the run object via REST endPoint.
    * Also, this run object is much lighter as it contains shallow refrences and doesn't include TestResult objects in it.
    * @param runId Id of the test run
    */
    public beginGetTestRunById(
        runId: number)
        : IPromise<TCMContracts.TestRun> {
        return this._collectionHttpTcmClient.getTestRunById(this._projectId, runId);
    }

    public getTestRunAttachments(testRunId: number, callback, errorCallback?) {

        this._ajaxJson("GetTestRunAttachments",
            {
                testRunId: testRunId
            },
            function (testRunAttachment) {
                if ($.isFunction(callback)) {
                    callback(testRunAttachment);
                }
            },
            errorCallback);
    }

    // Once we will remove all mvc call then we will delete above getTestRunAttachments function
    // and renamed this below function to getTestRunAttachments
    public getTestRunAttachments2(testRunId: number): IPromise<TCMContracts.TestAttachment[]>
    {
        return this._collectionHttpTcmClient.getTestRunAttachments(this._projectId, testRunId);
    }

    public getTestRunAttachmentContent(testRunId: number, attachmentId: number): IPromise<ArrayBuffer> {
        ///<summary> Gets the stream of file content </summary>
        return this._collectionHttpTcmClient.getTestRunAttachmentContent(this._projectId, testRunId, attachmentId);
    }

    public update(testRun: ITestRunModel, callback, errorCallback?) {
        this._ajaxPost("Update",
            { runModel: Utils_Core.stringifyMSJSON(testRun) },
            callback, errorCallback);
    }

    public update2(runUpdateModel: TCMContracts.RunUpdateModel, runId: number): IPromise<TCMContracts.TestRun> {
        return this._collectionHttpTcmClient.updateTestRun(runUpdateModel, TFS_Host_TfsContext.TfsContext.getDefault().navigation.project, runId);
    }

    public abort(testRun: ITestRunModel, callback, errorCallback?, options?) {
        this._ajaxPost("Abort",
            { runModel: Utils_Core.stringifyMSJSON(testRun) },
            callback, errorCallback, options);
    }

    public end(testRun: ITestRunModel, callback, errorCallback?, options?) {
        this._ajaxPost("End",
            { runModel: Utils_Core.stringifyMSJSON(testRun) },
            callback, errorCallback, options);
    }

    private _ajaxJson(method, requestParams, callback, errorCallback?, options?) {
        Ajax.getMSJSON(this.getApiLocation(method), requestParams, callback, errorCallback, options);
    }

    private _ajaxPost(method: string, requestParams?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any) {
        /// <param name="method" type="string" />
        /// <param name="requestParams" type="any" optional="true" />
        /// <param name="callback" type="IResultCallback" optional="true" />
        /// <param name="errorCallback" type="IErrorCallback" optional="true" />
        /// <param name="ajaxOptions" type="any" optional="true" />

        Ajax.postMSJSON(this.getApiLocation(method), requestParams, callback, errorCallback, ajaxOptions);
    }

    private _getTestCaseResultCreationRequestModels(testPoints: ITestPointModel[]): ITestResultCreationRequestModel[] {
        let testResultCreationRequestModels = [],
            index = 0,
            item;

        for (index = 0; index < testPoints.length; index++) {
            item = testPoints[index];
            testResultCreationRequestModels.push({
                testCaseId: item.testCaseId,
                configurationId: item.configurationId,
                configurationName: item.configurationName,
                testPointId: item.testPointId,
                owner: item.assignedTo
            });
        }

        return testResultCreationRequestModels;
    }

    public static createLocalObjectFromResponses(testRunAndResultResponses: ITestRunAndResultResponseModel, testPoints: ITestPointModel[]) {
        let index = 0,
            testCaseResultResponses = testRunAndResultResponses.testResultCreationResponseModels,
            localTestCaseResults = [],
            localTestCaseResult,
            testRunAndResults,
            testPointIdToTestPointMap = {},
            testPointId,
            testPoint,
            testCaseResultResponse;

        for (index = 0; index < testPoints.length; index++) {
            testPointId = testPoints[index].testPointId;
            testPointIdToTestPointMap[testPointId] = testPoints[index];
        }

        for (index = 0; index < testCaseResultResponses.length; index++) {
            testCaseResultResponse = testCaseResultResponses[index];
            testPoint = testPointIdToTestPointMap[testCaseResultResponse.testPointId];
            localTestCaseResults.push(TestRunManager.createTestCaseResult(testPoint, testCaseResultResponse, testRunAndResultResponses.testRun.owner));
        }

        testRunAndResults = {
            testRun: testRunAndResultResponses.testRun,
            testCaseResults: localTestCaseResults,
            testActionResults: null,
            testPointToResume: null
        };

        return testRunAndResults;
    }

    private static createTestCaseResult(testPointModel: ITestPointModel, testCaseResultResponse: ITestResultCreationResponseModel, runBy: string) {
        let localTestCaseResult = new TestCaseResult();
        localTestCaseResult.id = testCaseResultResponse.id;
        localTestCaseResult.testCaseId = testPointModel.testCaseId;
        localTestCaseResult.configurationId = testPointModel.configurationId;
        localTestCaseResult.configurationName = testPointModel.configurationName;
        localTestCaseResult.testPointId = testPointModel.testPointId;
        localTestCaseResult.owner = testPointModel.assignedTo;
        localTestCaseResult.runBy = runBy;
        localTestCaseResult.testCaseTitle = testCaseResultResponse.testCaseTitle;
        localTestCaseResult.dataRowCount = testCaseResultResponse.dataRowCount;
        localTestCaseResult.testCaseRevision = testCaseResultResponse.testCaseRevision;
        localTestCaseResult.priority = testCaseResultResponse.priority;
        return localTestCaseResult;
    }
}

export class TestImpactManager extends TFS_Service.TfsService {
    private _collectionHttpTiaClient: TIA_Client.TestHttpClient;
    private _projectId: string;

    constructor() {
        super();
    }

    /**
    * Initializes the TFS service with a connection
    * @param tfsConnection The connection
    */
    public initializeConnection(connection: Service.VssConnection) {
        super.initializeConnection(connection);
        this._collectionHttpTiaClient = this.getConnection().getHttpClient(TIA_Client.TestHttpClient);
        this._projectId = this.getTfsContext().contextData.project.id;
    }

    public beginGetTIAEnabledInfo(buildId: number): IPromise<TIAContracts.BuildType> {
        return this._collectionHttpTiaClient.queryBuildType(
            this._projectId,
            buildId);
    }

}

export class TestResultManager extends TFS_Service.TfsService {
    private _testManagementHttpClient: TestManagementHttpClient;
    private _tcmHttpClient: TcmHttpClient;
    private _projectId: string;

    constructor() {
        super();
    }

    /**
    * Initializes the TFS service with a connection
    * @param tfsConnection The connection
    */
    public initializeConnection(connection: Service.VssConnection) {
        super.initializeConnection(connection);
        this._testManagementHttpClient = this.getConnection().getHttpClient(TestManagementHttpClient);
        this._tcmHttpClient = LicenseAndFeatureFlagUtils.isDirectQueryFromTcmServiceEnabled() ? this.getConnection().getHttpClient(TcmHttpClient) : null;
        this._projectId = this.getTfsContext().contextData.project.id;
    }

    public createTestIterationResultAttachment(attachmentRequestModel: any, runId: number, testCaseResultId: number, iterationId: number, actionPath?: string,
                                               callback?: IResultCallback, errorCallback?: IErrorCallback) {
        this._testManagementHttpClient.createTestIterationResultAttachment(
            attachmentRequestModel,
            this._projectId,
            runId, testCaseResultId, iterationId, actionPath).then(
            (attachment: TCMContracts.TestAttachmentReference) => {
                callback.call(this, attachment);
            },
            (e) => errorCallback(e));
    }

    public createTestRunAttachments(attachmentRequestModels: TCMContracts.TestAttachmentRequestModel[], runId: number)
        : IPromise<TCMContracts.TestAttachmentReference[]> {
        let promises: IPromise<TCMContracts.TestAttachmentReference>[] = [];
        attachmentRequestModels.forEach((attachmentRequestModel: TCMContracts.TestAttachmentRequestModel) => {
            promises.push(this._testManagementHttpClient.createTestRunAttachment(
                attachmentRequestModel,
                this._projectId,
                runId));
        });
        return q.all(promises);
    }

    public createTestResultAttachment(attachmentRequestModels: TCMContracts.TestAttachmentRequestModel[], runId: number, resultId: number)
        : IPromise<TCMContracts.TestAttachmentReference[]> {
        let promises: IPromise<TCMContracts.TestAttachmentReference>[] = [];
        attachmentRequestModels.forEach((attachmentRequestModel: TCMContracts.TestAttachmentRequestModel) => {
            promises.push(this._testManagementHttpClient.createTestResultAttachment(
                attachmentRequestModel,
                this._projectId,
                runId,
                resultId));
        });
        return q.all(promises);
    }

    public getTestResultAttachments(testRunId: number, testResultId: number, callback, errorCallback?) {

        this._ajaxJson("GetTestResultAttachments",
            {
                testRunId: testRunId,
                testResultId: testResultId
            },
            function (testRunAttachment) {
                if ($.isFunction(callback)) {
                    callback(testRunAttachment);
                }
            },
            errorCallback);
    }

    // Once we will remove all mvc call then we will delete above getTestResultAttachments function
    // and renamed this below function to getTestResultAttachments
    public getTestResultAttachments2(testRunId: number, testResultId: number): IPromise<TCMContracts.TestAttachment[]>
    {
        if (this._tcmHttpClient) {
            return this._tcmHttpClient.getTestResultAttachments(this._projectId, testRunId, testResultId);
        }

        return this._testManagementHttpClient.getTestResultAttachments(this._projectId, testRunId, testResultId);
    }

    public getTestResultAttachmentContent(testRunId: number, testResultId: number, attachmentId: number): IPromise<ArrayBuffer> {
        if (this._tcmHttpClient) {
            return this._tcmHttpClient.getTestResultAttachmentContent(this._projectId, testRunId, testResultId, attachmentId);
        }

        return this._testManagementHttpClient.getTestResultAttachmentContent(this._projectId, testRunId, testResultId, attachmentId);
    }

    public getTestSubResultsAttachments(testRunId: number, testResultId: number, subResultId: number): IPromise<TCMContracts.TestAttachment[]>
    {
        if (this._tcmHttpClient) {
            return this._tcmHttpClient.getTestSubResultAttachments(this._projectId, testRunId, testResultId, subResultId);
        }

        return this._testManagementHttpClient.getTestSubResultAttachments(this._projectId, testRunId, testResultId, subResultId);
    }

    public getTestSubResultsAttachmentContent(testRunId: number, testResultId: number, attachmentId: number, subResultId: number): IPromise<ArrayBuffer> {
        if (this._tcmHttpClient) {
            return this._tcmHttpClient.getTestSubResultAttachmentContent(this._projectId, testRunId, testResultId, attachmentId, subResultId);
        }

        return this._testManagementHttpClient.getTestSubResultAttachmentContent(this._projectId, testRunId, testResultId, attachmentId, subResultId);
    }

    public isAttachmentPreviewable(fileName: string) {
        let fileNameExtension: string = Utils_String.empty;
        if (fileName.indexOf(".") !== -1) {
            fileNameExtension = fileName.substring(fileName.lastIndexOf("."));
        }
        let _allowedFileExtensions = [".txt", ".log"];
        return _allowedFileExtensions.indexOf(fileNameExtension.toLowerCase()) > -1;
    }

    public getApiLocation(action?: string, params?: any) {
        /// <summary>Gets the url for the action</summary>
        /// <param name="action" type="string" optional="true">the action to be invoked</param>
        return this.getTfsContext().getActionUrl(action || "", "testresult", $.extend({ area: "api" }, params));
    }

    public getPublicApiLocation(action?: string, params?: any) {
        /// <summary>Gets the absolute url for the action</summary>
        /// <param name="action" type="string" optional="true">the action to be invoked</param>
        return this.getTfsContext().getPublicActionUrl(action || "", "testresult", $.extend({ area: "api" }, params));
    }

    public update(testResults: TestCaseResult[], callback?: IResultCallback, errorCallback?: IErrorCallback, options?: any) {
        /// <summary>Function to update test results.</summary>
        /// <param name="testResults" type="Array">The test results that should be updated.</param>
        /// <param name="callback" type="IResultCallback" optional="true" >Function called back on successful update</param>
        /// <param name="errorCallback" type="IErrorCallback" optional="true">Function called back when there is an error in update.</param>
        /// <param name="options" type="Object">This is to send options that controls if the ajax call should be made in a sych or asynch manner.</param>
        let index = 0,
            testResult: TestCaseResult,
            resultUpdateRequests = [],
            subResults,
            resultUpdateRequest;

        for (index = 0; index < testResults.length; index++) {
            testResult = testResults[index];
            resultUpdateRequest = new ResultUpdateRequest(testResult.id.testRunId, testResult.id.testResultId, testResult);
            subResults = new SubResults();
            testResult.preSave(subResults);
            if (subResults.testCaseResult) {
                resultUpdateRequest.testCaseResult = resultUpdateRequest.localTestCaseResult;
                resultUpdateRequest.actionResults = subResults.actionResults;
                resultUpdateRequest.actionResultDeletes = subResults.actionDeletes;
                resultUpdateRequest.parameters = subResults.parameters;
                resultUpdateRequest.parameterDeletes = subResults.parameterDeletes;
            }

            resultUpdateRequests.push(ResultUpdateRequest.toServerObject(resultUpdateRequest));
        }

        this._ajaxPost("Update", { updateRequests: Utils_Core.stringifyMSJSON(resultUpdateRequests) }, function (resultUpdateResponses) {
            let i = 0,
                isError = false,
                updateResponse;
            for (i = 0; i < testResults.length; i++) {
                updateResponse = resultUpdateResponses[i];
                if (updateResponse.revision !== -1) {
                    testResults[i].postSaveResult(updateResponse);
                }
                else {
                    isError = true;
                }
            }

            if (isError) {
                if ($.isFunction(errorCallback)) {
                    errorCallback(Resources.TestResultUpdateConflict);
                }
            }
            else if ($.isFunction(callback)) {
                callback();
            }
        },
            errorCallback, options);
    }

    public associateWorkItems(testResultIds: TestCaseResultIdentifier[], workItemIds: number[], callback?: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Function to associate work items with test case results.</summary>
        /// <param name="testResultIds" type="Array">List of test result ids with which work items should be associated.</param>
        /// <param name="workItemIds" type="Array">List of work item ids with which test results should be associated.</param>
        /// <param name="callback" type="IResultCallback" optional="true" >Function called back on successful completion.</param>
        /// <param name="errorCallback" type="IErrorCallback" optional="true">Function called back when there is an error </param>
        let workItemUris = this._getWorkItemUris(workItemIds);
        this._ajaxPost("AssociateWorkItems",
            {
                testResultIdentifiers: Utils_Core.stringifyMSJSON(testResultIds),
                workItemUris: Utils_Core.stringifyMSJSON(workItemUris)
            }, callback, errorCallback);
    }

    public deleteAttachment(attachmentId: number, testRunId: number, testResultId: number, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxPost("DeleteAttachment", { attachmentId: attachmentId, testRunId: testRunId, testResultId: testResultId },
            callback, errorCallback);
    }

    /**
    * This API uses the MVC endPoint to fetch TestResults. It will return results for all the ResultIds.
    * The POST method is being used as list of testResultIds could be large and may surpass the URL limit of GET operation
    */
    public getTestCaseResults(testRunId: number, testResultIds: number[], callback?: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxPost("GetTestCaseResults", { testRunId: testRunId, testCaseResultIds: testResultIds }, callback, errorCallback);
    }

    /**
     * This API is used to fetch Test Results using pagination
     */
    public getTestResultsByBuildWithContinuationToken(
        buildId: number,
        publishContext?: string,
        top?: number,
        continuationToken?: string
    ): IPromise<TCM_Types.ITestCaseResultsWithContinuationToken> {
        return this._testManagementHttpClient.getTestResultsByBuildWithContinuationToken(TFS_Host_TfsContext.TfsContext.getDefault().navigation.project, buildId, publishContext, top, continuationToken);
    }

    /**
     * This API is used to fetch Test Results using pagination
     */
    public getTestResultsByReleaseWithContinuationToken(
        releaseId: number,
        releaseEnvId?: number,
        publishContext?: string,
        top?: number,
        continuationToken?: string
    ): IPromise<TCM_Types.ITestCaseResultsWithContinuationToken> {
        return this._testManagementHttpClient.getTestResultsByReleaseWithContinuationToken(TFS_Host_TfsContext.TfsContext.getDefault().navigation.project, releaseId, releaseEnvId, publishContext, top, continuationToken);
	}

	public getResultGroupsByReleaseWithContinuationToken(
		releaseId: number,
		publishContext: string,
		releaseEnvId?: number,
		fields?: string[],
		continuationToken?: string
	): IPromise<TCM_Types.ITestResultsFieldDetailsWithContinuationToken> {
		return this._testManagementHttpClient.getResultGroupsByReleaseWithContinuationToken(TFS_Host_TfsContext.TfsContext.getDefault().navigation.project, releaseId, publishContext, releaseEnvId, fields, continuationToken);
	}

	public getResultGroupsByBuildWithContinuationToken(
		buildId: number,
		publishContext: string,
		fields?: string[],
		continuationToken?: string
	): IPromise<TCM_Types.ITestResultsFieldDetailsWithContinuationToken> {
		return this._testManagementHttpClient.getResultGroupsByBuildWithContinuationToken(TFS_Host_TfsContext.TfsContext.getDefault().navigation.project, buildId, publishContext, fields, continuationToken);
	}

    /**
    * This API uses the Client REST API to fetch the Testcase Result based on its id
    * @param runId: Test RunId
    * @param testCaseResultId: Testcase Result Id
    * @param includeIterationDetails: bool flag to fetch iteration details
    */
    public beginGetTestCaseResultById(runId: number, testCaseResultId: number, detailsToInclude: TCMContracts.ResultDetails = TCMContracts.ResultDetails.None): IPromise<TCMContracts.TestCaseResult> {
        return this._testManagementHttpClient.getTestResultById(this._projectId, runId, testCaseResultId, detailsToInclude);
    }

    public getTestCaseResultForTestCaseId(testCaseId: number, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        this._ajaxJson("GetTestCaseResultForTestCaseId", { testCaseId: testCaseId }, callback, errorCallback);
    }

    /**
    * This API uses the Client REST API to fetch the test report for a build
    * @param build: build for which test report is needed
    * @param sourceWorkflow:
    * @param includeFailureDetails: bool flag to include details of failures
    * @param buildToCompare
    */
    public beginGetTestReportForBuild(build: TCMContracts.BuildReference, project: string, sourceWorkflow: string, includeFailureDetails: boolean, buildToCompare: TCMContracts.BuildReference): IPromise<TCMContracts.TestResultSummary> {
        return this._testManagementHttpClient.queryTestResultsReportForBuild(project, build.id, sourceWorkflow, includeFailureDetails, buildToCompare);
    }

    public getTestResolutionStates(callback, errorCallback?) {
        queueRequest(this, this, "_resolutionStates", callback, errorCallback,
            function (succeeded, failed) {
                this._ajaxJson("GetTestResolutionStates", {}, function (states) {
                    succeeded(states);
                }, failed);
            }
        );
    }

    public getTestFailureStates(callback, errorCallback?) {
        queueRequest(this, this, "_failureTypes", callback, errorCallback,
            function (succeeded, failed) {
                this._ajaxJson("GetTestFailureTypes", {}, function (states) {
                    succeeded(states);
                }, failed);
            }
        );
    }

    private _ajaxJson(method, requestParams, callback, errorCallback?) {
        Ajax.getMSJSON(this.getApiLocation(method), requestParams, callback, errorCallback);
    }

    private _ajaxPost(method: string, requestParams?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any) {
        /// <param name="method" type="string" />
        /// <param name="requestParams" type="any" optional="true" />
        /// <param name="callback" type="IResultCallback" optional="true" />
        /// <param name="errorCallback" type="IErrorCallback" optional="true" />
        /// <param name="ajaxOptions" type="any" optional="true" />

        Ajax.postMSJSON(this.getApiLocation(method, ajaxOptions), requestParams, callback, errorCallback, ajaxOptions);
    }

    private _getWorkItemUris(workItemIds) {
        let workItemUris = [],
            index,
            monikor;

        for (index = 0; index < workItemIds.length; index++) {
            monikor = LinkingUtilities.encodeUri({
                tool: Artifacts_Constants.ToolNames.WorkItemTracking,
                type: Artifacts_Constants.ArtifactTypeNames.WorkItem,
                id: workItemIds[index].toString()
            });

            workItemUris.push(monikor);
        }

        return workItemUris;
    }
}

export class TestConfigurationManager extends TFS_Service.TfsService {

    private _collectionHttpTcmClient: TCM_Client.TestHttpClient;
    private _testManagementHttpClient: TestManagementHttpClient;
    private _projectId: string;

    /**
    * Initializes the TFS service with a connection
    * @param tfsConnection The connection
    */
    public initializeConnection(connection: Service.VssConnection) {
        super.initializeConnection(connection);
        this._collectionHttpTcmClient = this.getConnection().getHttpClient(TCM_Client.TestHttpClient);
        this._testManagementHttpClient = this.getConnection().getHttpClient(TestManagementHttpClient);
        this._projectId = this.getTfsContext().contextData.project.id;
    }

    public beginGetTestConfigurations(): IPromise<TCMContracts.TestConfiguration[]> {

        return this._testManagementHttpClient.getTestConfigurations(this.getTfsContext().contextData.project.name);
    }

    public beginGetTestConfigurationById(testConfigurationId: number): IPromise<TCMContracts.TestConfiguration> {

        return this._collectionHttpTcmClient.getTestConfigurationById(this.getTfsContext().contextData.project.name, testConfigurationId);
    }

    public beginCreateTestConfiguration(testConfiguration: TCMContracts.TestConfiguration): IPromise<TCMContracts.TestConfiguration> {

        return this._collectionHttpTcmClient.createTestConfiguration(testConfiguration, this.getTfsContext().contextData.project.name);
    }

    public beginDeleteTestConfiguration(testConfigurationId: number): IPromise<void> {

        return this._collectionHttpTcmClient.deleteTestConfiguration(this.getTfsContext().contextData.project.name, testConfigurationId);
    }

    public beginUpdateTestConfiguration(testConfiguration: TCMContracts.TestConfiguration, configurationId: number): IPromise<TCMContracts.TestConfiguration> {

        return this._collectionHttpTcmClient.updateTestConfiguration(testConfiguration, this.getTfsContext().contextData.project.name, configurationId);
    }

    public beginDeleteTestVariable(variableId: number): IPromise<void> {

        return this._collectionHttpTcmClient.deleteTestVariable(this.getTfsContext().contextData.project.name, variableId);
    }

    public beginUpdateTestVariable(testVariable: TCMContracts.TestVariable, variableId: number): IPromise<TCMContracts.TestVariable> {

        return this._collectionHttpTcmClient.updateTestVariable(testVariable, this.getTfsContext().contextData.project.name, variableId);
    }

    public beginGetTestVariables(): IPromise<TCMContracts.TestVariable[]> {

        return this._collectionHttpTcmClient.getTestVariables(this.getTfsContext().contextData.project.name);
    }

    public beginGetTestVariableById(testVariableId: number): IPromise<TCMContracts.TestVariable> {
        //TODO: the API name should be getTestVariableById same as configuration in rest api for consistent purpose
        return this._collectionHttpTcmClient.getTestVariableById(this.getTfsContext().contextData.project.name, testVariableId);
    }

    public beginCreateTestVariable(testVariable: TCMContracts.TestVariable): IPromise<TCMContracts.TestVariable> {

        return this._collectionHttpTcmClient.createTestVariable(testVariable, this.getTfsContext().contextData.project.name);
    }
}

export class TestSessionManager extends TFS_Service.TfsService {
    private _collectionHttpTcmClient: TCM_Client.TestHttpClient;
    private _teamContext: TFS_Core_Contracts.TeamContext;
    constructor() {
        super();
    }

    /**
    * Initializes the TFS service with a connection
    * @param tfsConnection The connection
    */
    public initializeConnection(connection: Service.VssConnection) {
        super.initializeConnection(connection);
        this._collectionHttpTcmClient = this.getConnection().getHttpClient(TCM_Client.TestHttpClient);
        this._teamContext = {
            project: this.getTfsContext().contextData.project.name,
            team: this.getTfsContext().contextData.team ? this.getTfsContext().contextData.team.name: Utils_String.empty,
            projectId: null,
            teamId: null
        };
    }

    public getTestSessions(
        team: string,
        period?: number,
        allSessions?: boolean,
        includeAllProperties?: boolean
    ): IPromise<TCMContracts.TestSession[]> {
        return this._collectionHttpTcmClient.getTestSessions(this.getTeamContext(team), period, allSessions, includeAllProperties);
    }

    public createTestSession(
        testSession: TCMContracts.TestSession
    ): IPromise<TCMContracts.TestSession> {
        return this._collectionHttpTcmClient.createTestSession(testSession, this._teamContext);
    }

    private getTeamContext(team: string): TFS_Core_Contracts.TeamContext {
        return {
            project: this.getTfsContext().contextData.project.name,
            team: team,
            projectId: null,
            teamId: null
        };
    }
}

export class TeamSettingsData {
    private _defaultIteration: string;
    private _defaultArea: string;
    private _teamAreas: any[];
    private _bugsBehavior: TFS_AgileCommon.BugsBehavior;

    constructor(defaultIteration: string, defaultArea: string, teamAreas: string[], bugsBehavior: TFS_AgileCommon.BugsBehavior = TFS_AgileCommon.BugsBehavior.Off) {
        let i;

        this._defaultIteration = defaultIteration;
        this._defaultArea = defaultArea;
        this._teamAreas = [];
        this._bugsBehavior = bugsBehavior;

        for (i = 0; i < teamAreas.length; i++) {
            this._teamAreas[i] = teamAreas[i];
        }
    }

    public getDefaultIteration() {
        return this._defaultIteration;
    }

    public getDefaultArea() {
        return this._defaultArea;
    }

    public getAreas() {
        return this._teamAreas;
    }

    public getBugsBehavior(): TFS_AgileCommon.BugsBehavior {
        return this._bugsBehavior;
    }
}

export class IterationDates {
    private _startDate: Date;
    private _endDate: Date;

    constructor(startDate: Date, endDate: Date) {
        this._startDate = startDate;
        this._endDate = endDate;
    }

    public getStartDate() {
        return this._startDate;
    }

    public getEndDate() {
        return this._endDate;
    }
}

export enum TCParameterType {
    None = 0,
    String = 1,
    Int = 2,
    Double = 3
}

export class TestCaseParameterDefinitionBase {
    public localParamName: string;
    public paramType: TCParameterType;
    constructor(paramName: string, paramType?: TCParameterType) {
        this.localParamName = paramName;
        this.paramType = paramType;
    }

    public renameParameter(newParamName: string) {
        this.localParamName = newParamName;
    }
}

export class LocalParameterDefinition extends TestCaseParameterDefinitionBase {
    constructor(paramName: string, paramType?: TCParameterType) {
        super(paramName, paramType);
    }
}

export class SharedParameterDefinition extends TestCaseParameterDefinitionBase {
    public sharedParameterName: string;
    public sharedParameterDataSetId: number;

    constructor(paramName: string, sharedParameterName: string, sharedParameterDataSetId: number, paramType?: TCParameterType) {
        super(paramName, paramType);
        this.sharedParameterName = sharedParameterName;
        this.sharedParameterDataSetId = sharedParameterDataSetId;
    }

    public setParamMapping(sharedParameterName: string): void {
        this.sharedParameterName = sharedParameterName;
    }
}

export class TestCaseParameterValue {

}

export class TestCaseSharedParameterValue extends TestCaseParameterValue {

    public rowId: number;

    constructor(rowId: number) {
        super();
        this.rowId = rowId;
    }
}

export class TestCaseLocalParameterValue extends TestCaseParameterValue {

    public value: string;

    constructor(value: string) {
        super();
        this.value = value;
    }
}

export class TestCaseParameterDataRow {

    public parameterValues: { [index: string]: TestCaseParameterValue; };

    constructor(paramNameToValueMap: { [index: string]: TestCaseParameterValue; }) {
        this.parameterValues = paramNameToValueMap;
    }
}

export enum SharedParameterRowsMappingType {
    MapAllRows = 0,
    MapSelectiveRows = 1
}

export class TestCaseParameterDataInfo {
    public parameterMap: TestCaseParameterDefinitionBase[];
    public parameterDataRows: TestCaseParameterDataRow[];
    private sharedParameterDataSetIds: number[];
    private rowMappingType: SharedParameterRowsMappingType;

    constructor(parameterMap: TestCaseParameterDefinitionBase[], sharedParameterDataSetIds: number[], rowMappingType: SharedParameterRowsMappingType, parameterDataRows?: TestCaseParameterDataRow[]) {
        this.parameterMap = parameterMap;
        this.sharedParameterDataSetIds = sharedParameterDataSetIds;
        this.parameterDataRows = parameterDataRows;
        this.rowMappingType = rowMappingType;
    }

    public static parseTestCaseParametersData(parametersDataJson): TestCaseParameterDataInfo {
        let dataInfoJSObject: any,
            tcParamDataInfo: TestCaseParameterDataInfo = null,
            paramMapJSObject: any,
            i: number,
            length: number,
            paramMap: TestCaseParameterDefinitionBase[] = [];

        try {
            dataInfoJSObject = null;
            if (parametersDataJson) {
                dataInfoJSObject = <TestCaseParameterDataInfo>$.parseJSON(parametersDataJson);
            }
            paramMapJSObject = dataInfoJSObject.parameterMap;
            length = paramMapJSObject.length;
            for (i = 0; i < length; i++) {
                paramMap.push(new SharedParameterDefinition(paramMapJSObject[i].localParamName, paramMapJSObject[i].sharedParameterName, paramMapJSObject[i].sharedParameterDataSetId));
            }
            tcParamDataInfo = new TestCaseParameterDataInfo(paramMap, dataInfoJSObject.sharedParameterDataSetIds, dataInfoJSObject.rowMappingType, dataInfoJSObject.parameterDataRows);
        }
        catch (e) {
            return null;
        }
        return tcParamDataInfo;
    }

    public getJSON(): string {
        return JSON.stringify(this);
    }

    public isMappingAllRows(): boolean {
        if (this.rowMappingType === SharedParameterRowsMappingType.MapAllRows) {
            return true;
        }
        return false;
    }

    public setParameterMapping(paramName: string, sharedParamName: string): void {
        let paramDef: TestCaseParameterDefinitionBase = this.getParamDefinition(paramName);

        if (paramDef) {
            (<SharedParameterDefinition>paramDef).setParamMapping(sharedParamName);
        }
        else { // New mapping should be added if not already exists
            this.parameterMap.push(new SharedParameterDefinition(paramName, sharedParamName, this.getSharedParameterIdUsedByTestCase()));
        }
    }

    public autoMapIfParamNotExistsAlready(paramName: string): void {
        // If the param name does not exist already, then auto-map
        let paramDef: TestCaseParameterDefinitionBase = this.getParamDefinition(paramName);

        if (!paramDef) {
            this.parameterMap.push(new SharedParameterDefinition(paramName, paramName, this.getSharedParameterIdUsedByTestCase()));
        }
    }

    public autoMapForParamWithoutMapping(sharedParamMapping: string): void {
        //If a param name matching sharedParamMapping exists and has no mapping, then auto-map
        let paramDef: TestCaseParameterDefinitionBase = this.getParamDefinition(sharedParamMapping);

        if (paramDef && (<SharedParameterDefinition>paramDef).sharedParameterName === "") {
            (<SharedParameterDefinition>paramDef).sharedParameterName = sharedParamMapping;
        }
    }

    public changeParameterMappings(oldSharedParamMapping: string, newSharedParamMapping: string): void {
        //All the mappings to the shared param name 'oldSharedParamMapping', should be changed to 'newSharedParamMapping'
        let i: number,
            paramDef: TestCaseParameterDefinitionBase,
            length: number = this.parameterMap.length;

        if (oldSharedParamMapping) { //For changing a mapping name, oldSharedParamMapping should not be "".
            for (i = 0; i < length; i++) {
                paramDef = this.parameterMap[i];
                if (Utils_String.localeIgnoreCaseComparer(oldSharedParamMapping, (<SharedParameterDefinition>paramDef).sharedParameterName) === 0) {
                    (<SharedParameterDefinition>paramDef).sharedParameterName = newSharedParamMapping;
                }
            }
        }
    }

    public removeParameterMappings(sharedParamMapping: string): void {
        //Remove all the mappings to the shared param name 'sharedParamMapping'
        let i: number,
            paramDef: TestCaseParameterDefinitionBase,
            length: number = this.parameterMap.length;

        for (i = 0; i < length; i++) {
            paramDef = this.parameterMap[i];
            if (Utils_String.localeIgnoreCaseComparer(sharedParamMapping, (<SharedParameterDefinition>paramDef).sharedParameterName) === 0) {
                this.parameterMap.splice(i, 1);
                i--;
                length--;
            }
        }
    }

    public renameParameter(paramName: string, newParamName: string, isConflictingWithSharedStep?: boolean): void {
        let paramDef: TestCaseParameterDefinitionBase = this.getParamDefinition(paramName);

        if (paramDef && !isConflictingWithSharedStep) {
            paramDef.renameParameter(newParamName);
            // If the sharedParamter name is "", we should try auto-mapping with the new name, else the previous mapping should be maintained after renaming.
            if ((<SharedParameterDefinition>paramDef).sharedParameterName === "") {
                this.setParameterMapping(newParamName, newParamName);
            }
        }
        else {
            this.autoMapIfParamNotExistsAlready(newParamName);
        }
    }

    public deleteParameter(paramName: string): void {
        let i: number,
            length: number = this.parameterMap.length;
        for (i = 0; i < length; i++) {
            if (Utils_String.localeIgnoreCaseComparer(paramName, this.parameterMap[i].localParamName) === 0) {
                this.parameterMap.splice(i, 1);
                return;
            }
        }
    }

    public getParamDefinition(paramName: string): TestCaseParameterDefinitionBase {
        let i: number,
            length: number = this.parameterMap.length;

        for (i = 0; i < length; i++) {
            if (Utils_String.localeIgnoreCaseComparer(paramName, this.parameterMap[i].localParamName) === 0) {
                return this.parameterMap[i];
            }
        }
    }

    // This is applicable only when the UI allows to choose a common shared parameter for the complete testcase (even without having parameters).
    // The first Id (in the above case there will be only one id in the list) will be returned.
    public getSharedParameterIdUsedByTestCase(): number {
        if (this.sharedParameterDataSetIds && this.sharedParameterDataSetIds.length > 0) {
            return this.sharedParameterDataSetIds[0];
        }
    }

    // Returns the mappings of the params in the testcase to the columns in the sharedParam.
    public getParameterNameMappings(): { [index: string]: string } {
        let i: number,
            paramMappings: { [index: string]: string } = {},
            length: number = this.parameterMap.length;

        for (i = 0; i < length; i++) {
            paramMappings[this.parameterMap[i].localParamName] = (<SharedParameterDefinition>(this.parameterMap[i])).sharedParameterName;
        }
        return paramMappings;
    }

}

export class ArrayUtils {
    public static swap(array: any[], index1: number, index2: number) {
        if (index1 >= 0 && index1 < array.length &&
            index2 >= 0 && index2 < array.length &&
            index1 !== index2) {
            let item1 = array[index1],
                item2 = array[index2];

            array[index1] = item2;
            array[index2] = item1;
        }
    }
}

export class TestViewActions {
    public static FilterByTester: string = "filterByTester";
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.TestManagement", exports);
