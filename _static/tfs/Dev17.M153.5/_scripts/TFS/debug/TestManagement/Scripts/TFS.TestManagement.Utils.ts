//Auto converted from TestManagement/Scripts/TFS.TestManagement.Utils.debug.js

/// <reference types="jquery" />

import q = require("q");

import TFS_Admin_AreaIterations_DataModels = require("Agile/Scripts/Admin/AreaIterations.DataModels");

import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TCMConstants = require("Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants");
import TFS_TeamAwarenessService = require("Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import TFS_Grid_DataAdapters = require("Presentation/Scripts/TFS/TFS.UI.Controls.Grid.DataAdapters");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import TFS_AgileCommon = require("Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon");
import * as Common from "TestManagement/Scripts/TestReporting/Common/Common";
import { TestAnalyticsRouteParameters, NavigationConstants } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Constants";

import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TS = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import CoreContracts = require("TFS/Core/Contracts");
import CoreRestClient = require("TFS/Core/RestClient");
import * as Service from "VSS/Service";
import WITContracts = require("TFS/WorkItemTracking/Contracts");
import WIT_WebApi = require("TFS/WorkItemTracking/RestClient");

import Diag = require("VSS/Diag");
import { MessageDialog } from "VSS/Controls/Dialogs";
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import Navigation_Services = require("VSS/Navigation/Services");
import { HubsService } from "VSS/Navigation/HubsService";
import Utils_Array = require("VSS/Utils/Array");
import VSS_Context = require("VSS/Context");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import { Uri } from "VSS/Utils/Url";
import VSS = require("VSS/VSS");

import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { Exceptions } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { IQueryResult } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import { IResourceLink } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { PageSizes } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");

let _testPlanManager: TestsOM.TestPlanManager = null;
let _testRunManager: TestsOM.TestRunManager = null;
let _testImpactManager: TestsOM.TestImpactManager = null;
let _testResultManager: TestsOM.TestResultManager = null;
let _workItemTrackingManager: TestsOM.WorkItemTrackingManager = null;
let _testConfigurationManager: TestsOM.TestConfigurationManager = null;
let _codeCoverageManager: TestsOM.CodeCoverageManager = null;
let _buildManager: TestsOM.BuildManager = null;
let _workitemStore: WITOM.WorkItemStore = null;
let _testSessionManager: TestsOM.TestSessionManager = null;
let _teamAwarenessService = TFS_TeamAwarenessService.TeamAwarenessService;
let domElem = Utils_UI.domElem;
let LicenseAndFeatureFlagUtils = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils;

export let TestOutcomes = [
    Resources.TestOutcome_Blocked,
    Resources.TestOutcome_Failed,
    Resources.TestOutcome_Passed,
    Resources.TestPointState_Ready,
    Resources.TestOutcome_NotApplicable,
    Resources.TestPointState_Paused,
    Resources.TestPointState_InProgress
];

export interface IParam {
    parameter: string;
    value: string;
}

export class UrlHelper {

    private static getTestManagementRouteUrl(publicUrl: boolean = false, projectName?: string) {
        let url: string;
        let routeData: any = projectName ? { project: projectName, team: "" } : {};

        if (publicUrl) {
            url = TFS_Host_TfsContext.TfsContext.getDefault().getPublicActionUrl("", "testManagement", routeData);
        }
        else {
            url = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl("", "testManagement", routeData);
        }
        return url;
    }

    public static getMinePageUrl(publicUrl: boolean = false, projectName?: string): string {
        const url = this.getTestManagementRouteUrl(publicUrl, projectName);
        return url + "/mine";
    }

    public static getAllPageUrl(publicUrl: boolean = false, projectName?: string): string {
        const url = this.getTestManagementRouteUrl(publicUrl, projectName);
        return url + "/all";
    }

    public static getNewPlanCreatorUrl(publicUrl: boolean = false, projectName?: string): string {
        const url = this.getTestManagementRouteUrl(publicUrl, projectName);
        return url + "/new";
    }

    public static getSuiteUrl(planId: number, suiteId: number, publicUrl: boolean = false, projectName?: string): string {
        let url = this.getTestManagementRouteUrl(publicUrl, projectName);
        return url + "?" + $.param({ planId: planId, suiteId: suiteId });
    }

    public static getWorkItemUrlInTestPlanView(planId: number, suiteId: number, testCaseId: number, publicUrl: boolean = false, projectName?: string): string {
        let url = this.getTestManagementRouteUrl(publicUrl, projectName);
        return url + "?" + $.param({ planId: planId, suiteId: suiteId, testCaseId: testCaseId });
    }

    public static getPlanUrl(planId: number): string {
        let url = this.getTestManagementUrl();
        return url + "?" + "planId=" + planId.toString();
    }

    public static getTestManagementUrl(): string {
        return TFS_Host_TfsContext.TfsContext.getDefault().getPublicActionUrl("", "testManagement");
    }

    public static getWorkItemUrl(id: number): string {
        return TFS_Host_TfsContext.TfsContext.getDefault().getPublicActionUrl("edit", "workitems", {
            parameters: id
        });
    }

    public static getTestPlanHubUrl(hubName: string, planId: string, suiteId: string) {
        let url = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl("", "testManagement");
        return url + "?" + $.param({ _a: hubName, planId: planId, suiteId: suiteId });
    }

    public static getTestPlanLiteHubUrl(hubName: string, planId: number, suiteId: number) {
        return this.getTestPlanHubUrl(hubName, planId.toString(), suiteId.toString());
    }

    public static getSharedParametersUrl(id: number, publicUrl: boolean = false, projectName?: string, action: string = "values"): string {
        let url: string;
        let routeData: any = (projectName === undefined) ? {} : { project: projectName };
        if (publicUrl) {
            url = TFS_Host_TfsContext.TfsContext.getDefault().getPublicActionUrl("sharedParameters", "testManagement", routeData);
        }
        else {
            url = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl("sharedParameters", "testManagement", routeData);
        }
        return url + "?" + $.param({ sharedParameterId: id, _a: action });
    }

    public static getTestConfigurationsHubUrl(configurationId: number, publicUrl: boolean = false, projectName?: string, action: string = "values"): string {
        let url: string;
        let routeData: any = (projectName === undefined) ? {} : { project: projectName };
        if (publicUrl) {
            url = TFS_Host_TfsContext.TfsContext.getDefault().getPublicActionUrl("configurations", "testManagement", routeData);
        }
        else {
            url = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl("configurations", "testManagement", routeData);
        }
        return url + "?" + $.param({ testConfigurationId: configurationId, _a: action });
    }

    public static getPivotUrl(actionlink: string, planId: number, suiteId: number): string {
        let url: string;

        url = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl("", "testManagement");
        if (isNaN(planId) && isNaN(suiteId)) {
            return url + actionlink;
        }

        return url + actionlink + "&" + $.param({ planId: planId, suiteId: suiteId });
    }

    public static getActionUrlForSuite(action: string, planId: number, suiteId: number, publicUrl: boolean = false, projectName?: string): string {
        let url: string;
        let routeData: any = projectName ? { project: projectName, team: "" } : {};

        let actionLink = Navigation_Services.getHistoryService().getFragmentActionLink(action, { planId: planId, suiteId: suiteId });
        if (publicUrl) {
            url = TFS_Host_TfsContext.TfsContext.getDefault().getPublicActionUrl("", "testManagement", routeData);
        }
        else {
            url = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl("", "testManagement", routeData);
        }
        return url + actionLink;
    }

    public static getRunsUrl(action: string, params: IParam[], showPublicUrl: boolean = false): string {
        return UrlHelper._getActionUrl("Runs", "TestManagement", action, params, showPublicUrl);
    }

    public static getBuildSummaryUrl(buildId: number): string {
        return UrlHelper._getActionUrl("", "Build", "summary", [{ parameter: "buildId", value: buildId.toString() }]);
    }

    public static getBuildSummaryTestTabUrl(buildId: number): string {
        return UrlHelper._getActionUrl("", "Build", "summary",
            [{ parameter: "buildId", value: buildId.toString() },
            { parameter: "tab", value: "ms.vss-test-web.test-result-details" }]);
    }

    public static getReleaseSummaryUrl(releaseId: number): string {
        return UrlHelper._getActionUrl("", "apps/hub/ms.vss-releaseManagement-web.hub-explorer", "release-summary", [{ parameter: "releaseId", value: releaseId.toString() }]);
    }

    public static getReleaseLogsUrl(releaseId: number): string {
        return UrlHelper._getActionUrl("", "apps/hub/ms.vss-releaseManagement-web.hub-explorer", "release-logs", [{ parameter: "releaseId", value: releaseId.toString() }]);
    }

    public static getReleaseSummaryTestTabUrl(releaseId: number): string {
        return UrlHelper._getActionUrl("", "apps/hub/ms.vss-releaseManagement-web.hub-explorer", "release-contribution-tab-ms.vss-test-web.test-result-in-release-management", [{ parameter: "releaseId", value: releaseId.toString() }]);
    }

    public static getNewBuildSummaryTestResultUrl(buildId: number, runId: number, resultId: number, paneView?: string): string {
        if (paneView) {
            return UrlHelper.getNewBuildSummaryTestTabUrl(buildId, {
                "runId": runId.toString(),
                "resultId": resultId.toString(),
                "paneView": paneView
            });
        } else {
            return UrlHelper.getNewBuildSummaryTestTabUrl(buildId, {
                "runId": runId.toString(),
                "resultId": resultId.toString()
            });
        }
    }


    public static getBuildAnalyticsUrl(buildDefinitionId: number): string {
        return UrlHelper._getActionUrl("", "build/analytics", "", [{ parameter: TestAnalyticsRouteParameters.BuildDefinitionId, value: buildDefinitionId.toString() }], true);
    }

    public static getReleaseAnalyticsUrl(releaseDefinitionId: number): string {
        return UrlHelper._getActionUrl("", "release/analytics", "", [{ parameter: TestAnalyticsRouteParameters.ReleaseDefinitionId, value: releaseDefinitionId.toString() }], true);
    }

    public static getBuildDefinitionUrl(buildDefinitionId: number, view: string): string {
        const buildDefinitionHubId: string = NavigationConstants.BuildHub;
        const hubsService: HubsService = new HubsService();
        const hub: Hub = hubsService.getHubById(buildDefinitionHubId);
        const relativeUrl: string = hub ? hub.uri : Utils_String.empty;

        let urlCreator: Uri = new Uri(relativeUrl);
        urlCreator.addQueryParam("definitionId", buildDefinitionId.toString());
        urlCreator.addQueryParam("view", view);

        return urlCreator.absoluteUri;
    }

    public static getReleaseDefinitionUrl(definitionId: number, action: string): string {
        return UrlHelper._getActionUrl("", "release", action, [{ parameter: "definitionId", value: definitionId.toString() }], true);
    }

    public static getReleaseSummaryTestResultUrl(releaseId: number, releaseEnvironmentId: number, runId: number, resultId: number, paneView?: string): string {
        if (paneView) {
            return UrlHelper.getNewReleaseSummaryTestTabUrl(releaseId, {
                "environmentId": releaseEnvironmentId.toString(),
                "runId": runId.toString(),
                "resultId": resultId.toString(),
                "paneView": paneView
            });
        } else {
            return UrlHelper.getNewReleaseSummaryTestTabUrl(releaseId, {
                "environmentId": releaseEnvironmentId.toString(),
                "runId": runId.toString(),
                "resultId": resultId.toString()
            });
        }
    }

    public static getNewBuildSummaryTestTabUrl(buildId: number, additionalRouteValues?: IDictionaryStringTo<string>): string {
        const buildHubId: string = this.newBuildTestResultsHubId;
        const testTabExtensionId: string = "ms.vss-test-web.test-result-details";
        const newLWPTestTabExtensionId: string = "ms.vss-test-web.build-test-results-tab";
        const hubsService: HubsService = new HubsService();
        const hub: Hub = hubsService.getHubById(buildHubId);
        const relativeUrl: string = hub ? hub.uri : Utils_String.empty;

        let urlCreator: Uri = new Uri(relativeUrl);
        urlCreator.addQueryParam("buildId", buildId.toString());
        if (!LicenseAndFeatureFlagUtils.isLWPTestTabIsEnabled()) {
            urlCreator.addQueryParam("view", testTabExtensionId);
        } else {
            urlCreator.addQueryParam("view", newLWPTestTabExtensionId);
        }

        if (additionalRouteValues) {
            Object.keys(additionalRouteValues).forEach((key) => {
                const value = additionalRouteValues[key];
                if (value) {
                    urlCreator.addQueryParam(key, value);
                }
            });
        }

        return urlCreator.absoluteUri;
    }

    public static getNewReleaseSummaryTestTabUrl(releaseId: number, additionalRouteValues?: IDictionaryStringTo<string>): string {
        const releaseHubId: string = "ms.vss-releaseManagement-web.cd-release-progress";
        const testTabExtensionId: string = "ms.vss-test-web.test-result-in-release-environment-editor-tab";
        const releaseEnvironmentExtension: string = "release-environment-extension";
        const hubsService: HubsService = new HubsService();
        const hub: Hub = hubsService.getHubById(releaseHubId);
        const relativeUrl: string = hub ? hub.uri : Utils_String.empty;

        let urlCreator: Uri = new Uri(relativeUrl);
        urlCreator.addQueryParam("releaseId", releaseId.toString());
        urlCreator.addQueryParam("extensionId", testTabExtensionId);
        urlCreator.addQueryParam("_a", releaseEnvironmentExtension);

        if (additionalRouteValues) {
            Object.keys(additionalRouteValues).forEach((key) => {
                const value = additionalRouteValues[key];
                if (value) {
                    urlCreator.addQueryParam(key, value);
                }
            });
        }

        return urlCreator.absoluteUri;
    }

    public static getReleaseSummaryTestTabWithEnvironmentUrl(releaseId: number, releaseEnvironmentDefinitionId: number, releaseEnvironmentId: number): string {
        return UrlHelper._getActionUrl("", "apps/hub/ms.vss-releaseManagement-web.hub-explorer", "release-contribution-tab-ms.vss-test-web.test-result-in-release-management", [{ parameter: "releaseId", value: releaseId.toString() }, { parameter: "definitionId", value: releaseEnvironmentDefinitionId.toString() }, { parameter: "selectedEnvironmentId", value: releaseEnvironmentId.toString() }]);
    }

    public static getReleaseDefinitionEnvironmentEditorUrl(releaseDefinitionId: number): string {
        return UrlHelper._getActionUrl("", "release", "environments-editor", [{ parameter: "definitionId", value: releaseDefinitionId.toString() }], true);
    }

    public static getNewReleaseDefinitionEnvironmentEditorUrl(templateId: string, buildDefinitionId?: number, buildDefinitionName?: string): string {
        if (buildDefinitionId) {
            return UrlHelper._getActionUrl("", "release", "environments-editor", [
                { parameter: "definitionId", value: "0" },
                { parameter: "templateId", value: templateId },
                { parameter: "buildDefinitionId", value: buildDefinitionId.toString() },
                { parameter: "buildDefinitionName", value: buildDefinitionName },
                { parameter: "source", value: "Test" }], true);
        } else {
            return UrlHelper._getActionUrl("", "release", "environments-editor", [
                { parameter: "definitionId", value: "0" },
                { parameter: "templateId", value: templateId }], true);
        }
    }

    public static getTestResultHistoryUrl(params: IParam[]): string {
        params.push({
            parameter: "contributionId",
            value: Common.ExtensionNames.TestResultHistoryId
        });
        return UrlHelper._getActionUrl("Runs", "TestManagement", "contribution", params);
    }

    public static getManageExtensionsPath(): string {
        let relativeAdminUrl = "_admin/_extensions";
        return `${TFS_Host_TfsContext.TfsContext.getDefault().navigation.serviceHost.uri}/${relativeAdminUrl}`;
    }

    private static _getActionUrl(actionName: string, controllerName: string, tabName: string, params: IParam[], showPublicUrl: boolean = false): string {
        let sb = new Utils_String.StringBuilder();
        let url: string;

        if (showPublicUrl) {
            url = TFS_Host_TfsContext.TfsContext.getDefault().getPublicActionUrl(actionName, controllerName);
        }
        else {
            url = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl(actionName, controllerName);
        }

        sb.append(url);
        sb.append(Utils_String.format("?_a={0}", tabName));

        if (params) {
            for (let i = 0; i < params.length; i++) {
                sb.append(Utils_String.format("&{0}={1}", params[i].parameter, params[i].value));
            }
        }
        return sb.toString();
    }

    public static newBuildTestResultsHubId = "ms.vss-build-web.ci-results-hub";
}

export let conflictRevisionNumber = -1;
export let maxPageSize: number = TestsOM.PageConstants.maxPageSize;

export module workItemAction {
    export let New = "new";
    export let Edit = "edit";
}

export module TestSuiteTypes {
    export let StaticTestSuite = "StaticTestSuite";
    export let RequirementTestSuite = "RequirementTestSuite";
    export let DynamicTestSuite = "DynamicTestSuite";
}

export function getSuiteIcon(suiteType: string): string {
    if (suiteType === TestSuiteTypes.RequirementTestSuite) {
        return "bowtie-icon bowtie-tfvc-change-list";
    }
    else if (suiteType === TestSuiteTypes.DynamicTestSuite) {
        return "bowtie-icon bowtie-folder-query";
    }
    else {
        return "bowtie-icon bowtie-folder";
    }
}

export function getTestPlanManager(): TestsOM.TestPlanManager {
    if (!_testPlanManager) {
        _testPlanManager = TFS_OM_Common.ProjectCollection.getConnection(TFS_Host_TfsContext.TfsContext.getDefault()).getService<TestsOM.TestPlanManager>(TestsOM.TestPlanManager);
    }

    return _testPlanManager;
}

export function getTestRunManager(): TestsOM.TestRunManager {
    /// <summary>Initialize testRunManager if not yet initialized and return it</summary>
    if (!_testRunManager) {
        _testRunManager = TFS_OM_Common.ProjectCollection.getConnection(TFS_Host_TfsContext.TfsContext.getDefault()).getService<TestsOM.TestRunManager>(TestsOM.TestRunManager);
    }

    return _testRunManager;
}

export function getTestImpactManager(): TestsOM.TestImpactManager {
    /// <summary>Initialize TestResultManager if not yet initialized and return it</summary>
    if (!_testImpactManager) {
        _testImpactManager = TFS_OM_Common.ProjectCollection.getConnection(TFS_Host_TfsContext.TfsContext.getDefault()).getService<TestsOM.TestImpactManager>(TestsOM.TestImpactManager);
    }

    return _testImpactManager;
}

export function getTestResultManager(): TestsOM.TestResultManager {
    /// <summary>Initialize TestResultManager if not yet initialized and return it</summary>
    if (!_testResultManager) {
        _testResultManager = TFS_OM_Common.ProjectCollection.getConnection(TFS_Host_TfsContext.TfsContext.getDefault()).getService<TestsOM.TestResultManager>(TestsOM.TestResultManager);
    }

    return _testResultManager;
}

export function getWorkItemTrackingManager(): TestsOM.WorkItemTrackingManager {
    /// <summary>Initialize WorkItemTrackingManager if not yet initialized and return it</summary>
    if (!_workItemTrackingManager) {
        _workItemTrackingManager = TFS_OM_Common.ProjectCollection.getConnection(TFS_Host_TfsContext.TfsContext.getDefault()).getService<TestsOM.WorkItemTrackingManager>(TestsOM.WorkItemTrackingManager);
    }

    return _workItemTrackingManager;
}

export function getTestConfigurationManager(): TestsOM.TestConfigurationManager {
    /// <summary>Initialize TestConfigurationManager if not yet initialized and return it</summary>
    if (!_testConfigurationManager) {
        _testConfigurationManager = TFS_OM_Common.ProjectCollection.getConnection(TFS_Host_TfsContext.TfsContext.getDefault()).getService<TestsOM.TestConfigurationManager>(TestsOM.TestConfigurationManager);
    }

    return _testConfigurationManager;
}

export function getCodeCoverageManager(): TestsOM.CodeCoverageManager {
    if (!_codeCoverageManager) {
        _codeCoverageManager = TFS_OM_Common.ProjectCollection.getConnection(TFS_Host_TfsContext.TfsContext.getDefault()).getService<TestsOM.CodeCoverageManager>(TestsOM.CodeCoverageManager);
    }

    return _codeCoverageManager;
}

export function getBuildManager(): TestsOM.BuildManager {
    if (!_buildManager) {
        _buildManager = TFS_OM_Common.ProjectCollection.getConnection(TFS_Host_TfsContext.TfsContext.getDefault()).getService<TestsOM.BuildManager>(TestsOM.BuildManager);
    }

    return _buildManager;
}

export function getTestSessionManager(): TestsOM.TestSessionManager {
    if (!_testSessionManager) {
        _testSessionManager = TFS_OM_Common.ProjectCollection.getConnection(TFS_Host_TfsContext.TfsContext.getDefault()).getService<TestsOM.TestSessionManager>(TestsOM.TestSessionManager);
    }

    return _testSessionManager;
}

export function setTextSelection(input: any, selectionStart: number, selectionEnd: number) {
    ///<summary> Selects the text for a text box or textarea for a given start and end index
    ///<param name="input" type="Object">Control for which selection is to be set</param>
    /// <param name="selectionStart" type="int">Selection start index</param>
    /// <param name="selectionEnd" type="int">Selection end index</param>
    let range;

    if (input.setSelectionRange) {
        input.setSelectionRange(selectionStart, selectionEnd);
    }
    else if (input.createTextRange) {
        range = input.createTextRange();
        range.moveStart("character", selectionStart);
        range.moveEnd("character", selectionEnd);
        range.select();
    }
}

// Remove selections from the current window.
export function removeAllSelections() {
    let currentSelectedElement = window.getSelection();
    if (currentSelectedElement) {
        currentSelectedElement.removeAllRanges();
    }
}

export function setCaretPosition(element, offset) {
    try {
        let range, sel;
        if (element) {
            if (document.createRange) {
                range = document.createRange();
                sel = window.getSelection();
                range.setStart(element, offset);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }
            else if (Utils_Core.documentSelection && Utils_Core.documentSelection.createRange) { //For IE8
                Utils_Core.documentSelection.empty();
                range = Utils_Core.documentSelection.createRange();
                range.moveToElementText(element);
                range.moveStart("character", offset);
                range.collapse(true);
                range.select();
            }
        }
    }
    catch (ex) { //An exception is thrown by range.setStart in case the element is not visible on the screen
        //This error is thrown intermittently in IE10 "Could not complete the operation due to error 800a025e" - fail silently in this case
        if (!(ex instanceof DOMException) && !(ex.message && ex.message.indexOf("800a025e") >= 0)) {
            throw ex;
        }
    }
}

export function getResourcesFile(filename: string): string {
    return VSS_Context.getPageContext().webAccessConfiguration.paths.resourcesPath + encodeURIComponent(filename);
}

export module AttachmentSource {
    export const testRun: string = "Test Run";
    export const testResult: string = "Test Result";
}

export class HtmlHelper {
    // &gt; &lt; etc are converted back to HTML form (<, > etc)
    public static htmlDecode(value: string): string {
        return $("<div/>").html(value).text();
    }
}

export class ImageHelper {
    public static getImageExtensionRegex(): RegExp {
        let image_extensions: RegExp;
        if (Utils_UI.BrowserCheckUtils.isIE()) {
            image_extensions = /(\.jpg|\.jpeg|\.gif|\.png|\.bmp|\.tiff|\.tif)$/i;
        }
        else {
            // Chrome and firefox cannot show tiff images.
            image_extensions = /(\.jpg|\.jpeg|\.gif|\.png|\.bmp)$/i;
        }

        return image_extensions;
    }
}

export class ParametersHelper {

    public static beginUpdateSharedParamMappingsInLinkedTestCases(sharedParamDataSet: TestsOM.SharedParameterDataSet, sharedParamDataSetId: number, callback: IResultCallback) {
        let workItem: WITOM.WorkItem,
            workItemCount = 0,
            i = 0,
            j = 0,
            paramDataJson: string,
            paramDataInfo: TestsOM.TestCaseParameterDataInfo,
            witStore = WorkItemUtils.getWorkItemStore();

        this.beginGetLinkedTestCasesForSharedParamDataSet(sharedParamDataSetId, (workItems: WITOM.WorkItem[]) => {
            let workItemsToSave: WITOM.WorkItem[] = [];
            workItemCount = workItems.length;
            for (i = 0; i < workItemCount; i++) {
                workItem = workItems[i];
                paramDataJson = workItem.getField(TCMConstants.WorkItemFieldNames.DataField).getValue();
                paramDataInfo = TestsOM.TestCaseParameterDataInfo.parseTestCaseParametersData(paramDataJson);
                if (sharedParamDataSet.executeCommands(paramDataInfo)) {
                    workItem.setFieldValue(TCMConstants.WorkItemFieldNames.DataField, paramDataInfo.getJSON());
                    workItemsToSave.push(workItem);
                }
            }

            if (workItemsToSave.length > 0) {
                witStore.beginSaveWorkItemsBatch(workItemsToSave, () => {
                    if ($.isFunction(callback)) {
                        callback();
                    }
                },
                    (error) => {
                        let errorHtml = getBulkSaveErrorMessageHtml(error, workItemsToSave.length);
                        if (errorHtml) {
                            MessageDialog.showMessageDialog(errorHtml, {
                                title: WITResources.TriageViewSaveErrorTitle,
                                buttons: [MessageDialog.buttons.ok]
                            });
                        }
                        else {
                            alert(VSS.getErrorMessage(error));
                        }
                    });
            }
            else {
                if (callback) {
                    callback();
                }
            }
        });
    }

    public static beginGetLinkedTestCasesForSharedParamDataSet(sharedParamDataSetId: number, callback: IResultCallback) {
        let witStore = WorkItemUtils.getWorkItemStore(),
            i: number,
            links: WITOM.WorkItemLink[],
            linksCount: number,
            testCaseIds: number[] = [],
            workItems: WITOM.WorkItem[] = [],
            workItemManager = WorkItemManager.get(witStore);

        //Make sure we get the latest revision of the shared param dataset
        workItemManager.invalidateCache([sharedParamDataSetId]);
        workItemManager.beginGetWorkItem(sharedParamDataSetId, (sharedParamdataSet: WITOM.WorkItem) => {
            links = TestsOM.WitLinkingHelper.getLinks(sharedParamdataSet, TestsOM.WitLinkingHelper.SHAREDPARAMETER_LINKTYPE_FORWARD);
            linksCount = links.length;
            for (i = 0; i < linksCount; i++) {
                testCaseIds.push(links[i].linkData.ID);
            }
            workItemManager.invalidateCache(testCaseIds);
            workItemManager.beginGetWorkItems(testCaseIds, (workItems: WITOM.WorkItem[]) => {
                if ($.isFunction(callback)) {
                    callback(workItems);
                }
            },
                (error) => {
                    alert(VSS.getErrorMessage(error));
                });
        });
    }

    public static beginUpdateParameterDataInLinkedTestCases(parametersData: TestsOM.SharedStepParametersData, sharedStepParams: string[], sharedStepId: number, callback: IResultCallback) {
        let conflictingParams: string[],
            testCaseParams: string[],
            workItem: WITOM.WorkItem,
            workItemCount = 0,
            i = 0,
            j = 0,
            errorText: string,
            witStore = WorkItemUtils.getWorkItemStore();

        this.beginGetLinkedTestCasesForSharedStep(sharedStepId, (workItems: WITOM.WorkItem[]) => {
            let workItemsToSave: WITOM.WorkItem[] = [];
            workItemCount = workItems.length;
            for (i = 0; i < workItemCount; i++) {
                workItem = workItems[i];
                testCaseParams = this.getParameters(workItem);
                conflictingParams = Utils_Array.intersect(testCaseParams, sharedStepParams, Utils_String.localeIgnoreCaseComparer);
                if (this._updateParameterDataInTestCaseWorkItem(workItem, parametersData, conflictingParams)) {
                    workItemsToSave.push(workItem);
                }
            }

            if (workItemsToSave.length > 0) {
                witStore.beginSaveWorkItemsBatch(workItemsToSave, () => {
                    if ($.isFunction(callback)) {
                        callback();
                    }
                },
                    (error) => {
                        let errorText = getBulkSaveErrorMessageHtml(error, workItemsToSave.length);
                        if (errorText) {
                            MessageDialog.showMessageDialog(errorText, {
                                title: WITResources.TriageViewSaveErrorTitle,
                                buttons: [MessageDialog.buttons.ok]
                            });
                        }
                        else {
                            alert(VSS.getErrorMessage(error));
                        }
                    });
            }
            else {
                if (callback) {
                    callback();
                }
            }
        });
    }

    private static _updateParameterDataInTestCaseWorkItem(workItem: WITOM.WorkItem, parametersData: TestsOM.SharedStepParametersData, conflictingParams): boolean {
        let paramDataInfo: TestsOM.TestCaseParameterDataInfo = TestsOM.TestCaseParameterDataInfo.parseTestCaseParametersData(workItem.getField(TCMConstants.WorkItemFieldNames.DataField).getValue()),
            originalParamData: any[],
            paramDataFieldValue: string;

        if (!paramDataInfo) {
            originalParamData = this.getParameterData(workItem);
            parametersData.setData(originalParamData);
        }
        if (parametersData.executeCommands(paramDataInfo, conflictingParams)) {
            if (paramDataInfo) {
                paramDataFieldValue = paramDataInfo.getJSON();
            }
            else {
                paramDataFieldValue = parametersData.getXML();
            }
            workItem.setFieldValue(TCMConstants.WorkItemFieldNames.DataField, paramDataFieldValue);
            return true;
        }
        return false;
    }

    public static _isParamConflicting(paramName: string, conflictingParameters: string[]): boolean {
        return Utils_Array.contains(conflictingParameters, paramName, Utils_String.localeIgnoreCaseComparer);
    }

    public static beginGetLinkedTestCasesForSharedStep(sharedStepId: number, callback: IResultCallback) {
        let witStore = WorkItemUtils.getWorkItemStore(),
            i: number,
            links: WITOM.WorkItemLink[],
            linksCount: number,
            testCaseIds: number[] = [],
            workItems: WITOM.WorkItem[] = [],
            workItemManager = WorkItemManager.get(witStore);

        //Make sure we get the latest revision of the shared step
        workItemManager.invalidateCache([sharedStepId]);
        workItemManager.beginGetWorkItem(sharedStepId, (sharedStep: WITOM.WorkItem) => {
            links = TestsOM.WitLinkingHelper.getLinks(sharedStep, TestsOM.WitLinkingHelper.SHAREDSTEPS_LINKTYPE_FORWARD);
            linksCount = links.length;
            for (i = 0; i < linksCount; i++) {
                testCaseIds.push(links[i].linkData.ID);
            }
            workItemManager.invalidateCache(testCaseIds);
            workItemManager.beginGetWorkItems(testCaseIds, (workItems: WITOM.WorkItem[]) => {
                if ($.isFunction(callback)) {
                    callback(workItems);
                }
            },
                (error) => {
                    alert(VSS.getErrorMessage(error));
                });
        });
    }

    private static getParameterData(workItem: WITOM.WorkItem): any[] {
        let parametersDataXml = workItem.getField(TCMConstants.WorkItemFieldNames.DataField).getValue(),
            parameterNames: string[] = this.parseParameterNamesFromParameterData(parametersDataXml),
            paramData: any[];

        paramData = this.parseParametersData($(Utils_Core.parseXml(parametersDataXml || "")), parameterNames);
        return paramData;
    }

    public static parseParameterNamesFromParameterData(parameterDataXml: string): string[] {
        let decodedParameterNames: string[] = [],
            paramName: string,
            decodedParamName: string;
        $(parameterDataXml).find("xs\\:sequence").children().each((i, item) => {
            paramName = $(item).attr("name");
            decodedParamName = TestsOM.ParameterCommonUtils.decodeName(paramName);
            decodedParameterNames.push(decodedParamName);
        });
        return decodedParameterNames;
    }

    private static getParameters(workItem: WITOM.WorkItem): string[] {
        let parametersXml = workItem.getField(TCMConstants.WorkItemFieldNames.Parameters).getValue(),
            parameters: string[];

        parameters = TestsOM.ParameterCommonUtils.parseParameters($(Utils_Core.parseXml(parametersXml || "")));
        return parameters;

    }

    public static updateParamValuesInStepResult(stepResult: TestsOM.TestStepResult,
        paramName: string,
        paramValue: string,
        paramData: any,
        iterationIndex: number,
        doNotSetIsDirty?: boolean) {
        Diag.logVerbose("[updateParamValuesInStepResult]Updating parameter values in shared step result.");
        let parameters = TestsOM.ParameterCommonUtils.getParameters(stepResult.getAction()),
            parameterIndex: number,
            stepResultParameters: TestsOM.TestResultParameter[] = stepResult.parameters.getItems();

        stepResult.actionParameters = getParameterNameValueMap(parameters, paramData, iterationIndex);

        parameters = TestsOM.ParameterCommonUtils.getParameters(stepResult.getExpectedResult());
        stepResult.expectedResultParameters = getParameterNameValueMap(parameters, paramData, iterationIndex);

        parameterIndex = stepResult.parameters.getIndexFromCollection(paramName);
        if (parameterIndex >= 0 && parameterIndex < stepResultParameters.length) {
            Diag.logVerbose("[updateParamValuesInStepResult] @" + paramName + " = " + paramValue);
            stepResultParameters[parameterIndex].expected = paramValue;
            stepResultParameters[parameterIndex].setIsDirty(true);
        }

        if (!doNotSetIsDirty && stepResult.doesExistOnServer()) {
            Diag.logVerbose("[updateParamValuesInStepResult] Step result is dirtied");
            stepResult.setIsDirty(true);
        }
    }

    public static parseSharedParameterPayload(payload: any): TestsOM.ISharedParameterDataSetModel[] {
        let parameterSets: TestsOM.ISharedParameterDataSetModel[] = [],
            idIndex: number,
            titleIndex: number,
            parameterSet: TestsOM.ISharedParameterDataSetModel,
            i: number, l: number,
            paramDataIndex: number,
            assignedToIndex: number,
            dataXml: string;

        if (payload) {
            idIndex = $.inArray(WITConstants.CoreFieldRefNames.Id, payload.columns);
            titleIndex = $.inArray(WITConstants.CoreFieldRefNames.Title, payload.columns),
                assignedToIndex = $.inArray(WITConstants.CoreFieldRefNames.AssignedTo, payload.columns);
            paramDataIndex = $.inArray(TCMConstants.WorkItemFieldNames.Parameters, payload.columns);

            for (i = 0, l = payload.rows.length; i < l; i++) {
                parameterSet = new TestsOM.ISharedParameterDataSetModel();
                parameterSet.id = payload.rows[i][idIndex];
                parameterSet.title = payload.rows[i][titleIndex];
                if (assignedToIndex > 0) {
                    parameterSet.assignedTo = payload.rows[i][assignedToIndex];
                }
                if (paramDataIndex > 0) {
                    dataXml = payload.rows[i][paramDataIndex];
                    parameterSet.sharedParameterDataSet = ParametersHelper.parseSharedParameterDataSet($($.parseXML(dataXml)));
                }
                parameterSets.push(parameterSet);
            }
        }
        return parameterSets;
    }

    private static _getSharedParamSearchQueryForId(id: number): string {
        return Utils_String.format("Select [{0}], [{1}], [{2}], [{3}] FROM WorkItems where {4} = '{5}'",
            WITConstants.CoreFieldRefNames.Id,
            WITConstants.CoreFieldRefNames.Title,
            WITConstants.CoreFieldRefNames.AssignedTo,
            TCMConstants.WorkItemFieldNames.Parameters,
            WITConstants.CoreFieldRefNames.Id,
            id);
    }

    private static _beginGetSharedParameter(id: number, invalidateCache?: boolean, callback?: IResultCallback, errorCallback?: IErrorCallback, project?: string) {
        let query = this._getSharedParamSearchQueryForId(id),
            paramSetModels: TestsOM.ISharedParameterDataSetModel[];

        Diag.logTracePoint("Getting Shared Parameter started");
        if (invalidateCache) {
            WorkItemManager.get(WorkItemUtils.getWorkItemStore()).invalidateCache([id]);
        }
        WorkItemUtils.beginQuery(query, (data) => {
            Diag.logTracePoint("Getting Shared Parameter compeleted");
            paramSetModels = ParametersHelper.parseSharedParameterPayload(data.payload);
            if (paramSetModels && paramSetModels.length > 0) {
                if (callback) {
                    callback(paramSetModels[0]);
                }
            }
        },
            (error) => {
                alert(VSS.getErrorMessage(error));
                if (errorCallback) {
                    errorCallback(error);
                }
            }, project);
    }

    private static _getParameterNamesFomData(xml: string): string[] {
        let sharedParameterDataSet = ParametersHelper.parseSharedParameterDataSet($($.parseXML(xml)));
        return sharedParameterDataSet.getParameters();
    }

    public static setTestCaseParametersDataFromXml(testCase: TestsOM.TestCase, parametersDataXml: JQuery, isSharedStepWorkItem: boolean) {
        let parameterData: any[] = [],
            parameterDataRow: any = {},
            parameterValue: string,
            paramName: string,
            parameterNames: string[],
            paramNamesCount: number,
            parametersNormalizedTable: any = {},
            i: number;

        if (parametersDataXml) {
            if (isSharedStepWorkItem) {
                parameterDataRow = TestsOM.ParameterCommonUtils.getParametersDataRow(parametersDataXml);
                parameterData.push(parameterDataRow);
            }
            else {
                parametersDataXml.find("Table1").each((i, item) => {
                    parameterDataRow = {};
                    parameterNames = testCase.getParameters();
                    paramNamesCount = parameterNames.length;
                    parametersNormalizedTable = ParametersHelper.normalizeParameterDataTable(item);
                    for (i = 0; i < paramNamesCount; i++) {
                        paramName = ParametersHelper.toHexValues(parameterNames[i]);
                        parameterValue = parametersNormalizedTable[paramName];
                        parameterDataRow[parameterNames[i]] = parameterValue;
                    }
                    parameterData.push(parameterDataRow);
                });
            }
        } else {
            parameterData.push(parameterDataRow);
        }

        testCase.setData(parameterData, isSharedStepWorkItem);
    }

    public static beginPopulateTestCaseDataFromJson(testCase: TestsOM.TestCase, parametersDataJson: string, callback?: () => void, errorCallback?: IErrorCallback): boolean {
        let parameterDataInfo: TestsOM.TestCaseParameterDataInfo = TestsOM.TestCaseParameterDataInfo.parseTestCaseParametersData(parametersDataJson);
        if (parameterDataInfo) {
            Diag.logVerbose("ParametersHelper.beginPopulateTestCaseDataFromJSON: Reading the parameter data field which is of the type JSON. The testcase uses Shared parameters");
            this.beginPopulateTestCaseDataFromParamDataInfo(parameterDataInfo, testCase, callback, errorCallback);
            return true;
        }
        return false;
    }

    public static beginPopulateTestCaseDataFromParamDataInfo(parameterDataInfo: TestsOM.TestCaseParameterDataInfo, testCase: TestsOM.TestCase, callback?: () => void, errorCallback?: IErrorCallback) {
        let paramMap: TestsOM.TestCaseParameterDefinitionBase[] = parameterDataInfo.parameterMap,
            sharedParamDef: TestsOM.SharedParameterDefinition,
            sharedParam: TestsOM.SharedParameterDataSet,
            sharedParamNames: string[] = [],
            localParamNames: string[] = [],
            paramCount: number = paramMap.length,
            sharedParamId: number,
            rowCount: number,
            i: number,
            j: number,
            dataRow: { [index: string]: string },
            paramData: Array<{ [index: string]: string; }> = [],
            project: string = testCase ? testCase.getProjectId() : undefined;

        for (i = 0; i < paramCount; i++) {
            sharedParamDef = <TestsOM.SharedParameterDefinition>paramMap[i];
            localParamNames.push(sharedParamDef.localParamName);
            sharedParamNames.push(sharedParamDef.sharedParameterName);
        }

        this._beginGetSharedParameter(parameterDataInfo.getSharedParameterIdUsedByTestCase(), true, (sharedParamModel: TestsOM.ISharedParameterDataSetModel) => {
            this.populateTestCaseDataFromParamDataInfo(parameterDataInfo, testCase, sharedParamModel.sharedParameterDataSet, sharedParamModel.title);
            if (callback) {
                callback();
            }
        },
            errorCallback, project);
    }

    public static populateTestCaseDataFromParamDataInfo(parameterDataInfo: TestsOM.TestCaseParameterDataInfo, testCase: TestsOM.TestCase, sharedParam: TestsOM.SharedParameterDataSet, sharedParamDataSetTitle: string) {
        let paramMap: TestsOM.TestCaseParameterDefinitionBase[] = parameterDataInfo.parameterMap,
            sharedParamDef: TestsOM.SharedParameterDefinition,
            sharedParamNames: string[] = [],
            localParamNames: string[] = [],
            paramCount: number = paramMap.length,
            rowCount: number,
            i: number,
            j: number,
            dataRow: { [index: string]: string },
            paramData: Array<{ [index: string]: string; }> = [];

        for (i = 0; i < paramCount; i++) {
            sharedParamDef = <TestsOM.SharedParameterDefinition>paramMap[i];
            localParamNames.push(sharedParamDef.localParamName);
            sharedParamNames.push(sharedParamDef.sharedParameterName);
        }

        if (parameterDataInfo.isMappingAllRows()) {
            Diag.logVerbose("The row mapping in the tescase is of the type MapAllRows, so all the rows from the shared parameter for mapped columns will be used in testcase");
            rowCount = sharedParam.getParamDataRowCount();

            for (i = 0; i < rowCount; i++) {
                dataRow = {};
                for (j = 0; j < paramCount; j++) {
                    dataRow[localParamNames[j]] = sharedParam.getParameterValueForRow(i, sharedParamNames[j]);
                }
                paramData.push(dataRow);
            }
            ParametersHelper._removeTrailingEmptyRows(paramData, localParamNames);
        }
        else {
            Diag.logVerbose("The row mapping in the tescase is not of the type MapAllRows. As there is no support for MappingSelective rows, so no data rows will be used in testcase");
        }
        testCase.setParametersDataInfo(paramData, parameterDataInfo, [sharedParam], [sharedParamDataSetTitle]);
    }

    private static _removeTrailingEmptyRows(paramData: Array<{ [index: string]: string; }>, paramNames: string[]) {
        let rowCount: number = paramData.length,
            i: number;

        for (i = rowCount - 1; i >= 0; i--) {
            if (ParametersHelper.isEmptyRow(paramData[i], paramNames)) {
                paramData.splice(i, 1);
            }
            else {
                break;
            }
        }
    }

    public static isEmptyRow(dataRow: { [index: string]: string }, paramNames: string[]) {
        let i: number,
            count = 0;

        if (paramNames) {
            count = paramNames.length;
        }

        for (i = 0; i < count; i++) {
            if (dataRow[paramNames[i]]) {
                return false;
            }
        }
        return true;
    }

    public static toHexValues(str: string): string {
        /// <summary> Replace the chars with their unicode hex values </summary>
        /// <param name="str" type="String">String to be parsed</param>
        /// <returns type="String">The output string in which the chars are replaced by _x%UnicodeValue%_ where %UnicodeValue% is the unicode code point of the character in hexadecimal</returns>
        let outString: string = "",
            hexValue: string,
            i: number;

        for (i = 0; i < str.length; i++) {
            hexValue = TestsOM.ParameterCommonUtils.convertCharToHex(str[i]);
            outString = outString + hexValue;

        }
        return outString;
    }

    public static getHexStringAtPosition(str: string, pos: number): string {
        /// <summary> Get the hex string of the format _xFFFF_ if present at position pos </summary>
        /// <param name="str" type="String">String to be parsed</param>
        /// <param name="pos" type="Number">Position in the string to check</param>
        /// <returns type="String">The string of the for _xFFFF_ if present at pos. Else return null</returns>
        let hexStringAtCurrPosArr, stringAtCurrPos, hexStringAtCurrPos = null,
            regEx = TestsOM.ParameterConstants.encodeCharPattern, // string of the type _x02AF_
            lenOfHexString = "_xFFFF_".length;

        stringAtCurrPos = str.substr(pos, lenOfHexString);
        hexStringAtCurrPosArr = regEx.exec(stringAtCurrPos);
        if (hexStringAtCurrPosArr) {
            hexStringAtCurrPos = hexStringAtCurrPosArr[0];
        }
        return hexStringAtCurrPos;
    }

    public static convertParamNameToHex(paramName: string): string {
        let outString: string = "",
            i: number,
            str, hexStringAtCurrPos, hexStringNeedsConversion = false;
        for (i = 0; i < paramName.length; i++) {
            // Check whether "_x005F" is present at ith position.
            if (paramName.substr(i, 6).toLowerCase() === "_x005f") {
                // If it is present, it means it can be followed be a string of the form "_xFFFF_" which was input by the user and is not the hex representation of any char.
                if (this.getHexStringAtPosition(paramName, i + 6)) {
                    // It means we need to remove "_x005F" and the following characters(of the form %_xFFFF_%) need to be converted into Hexadecimal representations
                    i = i + 6;
                }
                // If _x005F is not followed by _xFFFF_ format string, then we need to convert _x005F to Hex.
                hexStringNeedsConversion = true;
            }

            hexStringAtCurrPos = this.getHexStringAtPosition(paramName, i);
            if (hexStringAtCurrPos && !hexStringNeedsConversion) {
                // we should copy this hex string as such and move forward. This string is already a hex represenattion of a char and we dont need any coversion here.
                outString = outString + hexStringAtCurrPos;
                i = i + hexStringAtCurrPos.length - 1;
            }
            else {
                // If it is not the hex representation, then convert the char into hex and append to output string.
                outString = outString + TestsOM.ParameterCommonUtils.convertCharToHex(paramName[i]);
            }
            hexStringNeedsConversion = false;
        }
        return outString;
    }

    public static normalizeParameterDataTable(table): { [index: string]: string; } {
        /// <summary> Normalizes the tag names in the table by converting all the chars (which are not already represented in hex )to hexadecimal form _xFFFF_ where FFFF is the unicode point of the char</summary>
        /// <param name="table" type="Object">String to be parsed</param>
        let i = 0,
            elementName: string,
            elementValue: string,
            parametersTable: { [index: string]: string; } = {};

        for (i = 0; i < $(table).children().length; i++) {
            elementName = $(table).children()[i].tagName;
            elementValue = $($(table).children()[i]).text();
            elementName = this.convertParamNameToHex(elementName);
            parametersTable[elementName] = elementValue;
        }
        return parametersTable;
    }

    public static parseSharedParameterDataSet($sharedParamDataSet): TestsOM.SharedParameterDataSet {
        let paramNames: string[] = [],
            parameterDataRow: { [index: string]: string; } = {},
            parametersData: Array<{ [index: string]: string; }> = [],
            sharedParameterData: TestsOM.SharedParameterData,
            sharedParameterDataSet: TestsOM.SharedParameterDataSet,
            lastId: number,
            rowIds: number[] = [],
            paramName: string,
            paramValue: string;

        $sharedParamDataSet.find(TestsOM.SharedParameterDataSet._paramElement).each((i, item) => {
            paramNames.push(TestsOM.ParameterCommonUtils.decodeName($(item).text()));
        });

        lastId = parseInt($sharedParamDataSet.find(TestsOM.SharedParameterData._paramDataElement).eq(0).attr(TestsOM.SharedParameterData._lastIdAttribute));
        $sharedParamDataSet.find(TestsOM.SharedParameterData._dataRowElement).each((i, item) => {
            rowIds.push(parseInt($(item).attr(TestsOM.SharedParameterData._idAttribute)));
            parameterDataRow = {};

            $(item).find(TestsOM.SharedParameterData._keyValuePairElement).each((index, keyValuePair) => {
                paramName = TestsOM.ParameterCommonUtils.decodeName($(keyValuePair).attr(TestsOM.SharedParameterData._keyAttribute));
                paramValue = $(keyValuePair).attr(TestsOM.SharedParameterData._valueAttribute);
                parameterDataRow[paramName] = HtmlHelper.htmlDecode(paramValue);
            });
            parametersData.push(parameterDataRow);

        });

        sharedParameterData = new TestsOM.SharedParameterData(parametersData, lastId, rowIds);

        sharedParameterDataSet = new TestsOM.SharedParameterDataSet(paramNames, sharedParameterData);

        return sharedParameterDataSet;
    }

    public static parseParametersData($parametersData, params): Array<{ [index: string]: string; }> {
        let parameterDataRow: { [index: string]: string; } = {},
            parametersData: Array<typeof parameterDataRow> = [],
            i: number,
            parameterValue: string,
            paramName: string,
            parametersNormalizedTable: { [index: string]: string; };

        if ($parametersData) {
            $parametersData.find("Table1").each((i, item) => {
                parameterDataRow = {};
                // In the parameter data table, convert all the chars in the param names to unicode hex equivalents.
                // These param names were originally name encoded before storing in the XML form.
                parametersNormalizedTable = this.normalizeParameterDataTable(item);

                for (i = 0; i < params.length; i++) {
                    paramName = params[i];
                    // For the characters replace the chars with their unicode hex values.
                    paramName = this.toHexValues(paramName);
                    parameterValue = parametersNormalizedTable[paramName];
                    if (parameterValue === undefined) {
                        parameterValue = "";
                    }
                    parameterDataRow[params[i]] = parameterValue;
                }
                parametersData.push(parameterDataRow);
            });
        }
        return parametersData;
    }

    public static confirmParamsDelete(paramsToBeDeleted: string[], testCase: TestsOM.TestCase, confirmationMessage: string, showParamDetails: boolean): boolean {
        let paramsToConfirm: string[] = [],
            length = paramsToBeDeleted.length,
            i: number,
            finalConfirmationMessage = confirmationMessage;

        for (i = 0; i < length; i++) {
            // In case of conflicting parameters between test case and shared steps we do not need to give warning.
            if (!testCase.isSharedStepParameter(paramsToBeDeleted[i])) {
                paramsToConfirm.push(paramsToBeDeleted[i]);
            }
        }

        if (paramsToConfirm.length > 0) {
            if (showParamDetails) {
                finalConfirmationMessage = Utils_String.format(confirmationMessage, paramsToConfirm.join("\n"));
            }

            return confirm(finalConfirmationMessage);
        }

        return true;
    }

    public static deleteParametersData(paramsToBeDeleted: string[], testCase: TestsOM.TestCase, isSharedStepWorkItem: boolean) {
        let paramName: string,
            i: number,
            length = paramsToBeDeleted.length;

        for (i = 0; i < length; i++) {
            paramName = paramsToBeDeleted[i];
            if (isSharedStepWorkItem) {
                testCase.getSharedStepParametersData().deleteParam(paramName);
            }
            else {
                if (!testCase.isSharedStepParameter(paramName)) {
                    testCase.deleteParameter(paramName);
                }
            }
        }
    }
}

export function insertAndSelectTextAtCurrentCaretPosition(text: string) {
    try {
        let endRange = 0,
            content: string,
            selection: Selection,
            node: Node,
            lastNode: Node,
            range: Range,
            frag = document.createDocumentFragment(),
            elem = document.createElement("div");

        if (window.getSelection) {
            selection = window.getSelection();
            range = selection.getRangeAt(0);
            if (range) {
                elem.innerHTML = text;
                node = elem.firstChild;
                lastNode = frag.appendChild(node);
                range.collapse(false);
                range.insertNode(frag);
                if (lastNode) {
                    // Create the new selection range. If " @Parameter3 " was inserted, "Parameter3" should be selected so that the user can eneter teh custom name.
                    range = range.cloneRange();
                    range.setStart(lastNode, 2);
                    range.setEnd(lastNode, text.length - 1);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
        }
        else if (Utils_Core.documentSelection && Utils_Core.documentSelection.type !== "Control") { // IE 8 and lower
            Utils_Core.documentSelection.createRange().pasteHTML(text);
        }
    }
    catch (ex) { //An exception is thrown by range.setStart in case the element is not visible on the screen
        if (!(ex instanceof DOMException)) {
            throw ex;
        }
    }
}

export function setResultOutcome(testCaseResults: any, outCome: any, callback?: IResultCallback, errorCallback?: IErrorCallback, options?) {
    /// <summary>Sets the outcome for the testCaseResults and save the results</summary>
    /// <param name="testCaseResults" type="Object">testCaseResults list on which the outCome needs to be set</param>
    /// <param name="outCome" type="Object">the outCome to be set: e.g. TCMConstants.TestOutcome.Passed</param>
    /// <param name="callback" type="IResultCallback" optional="true" >Callback function</param>
    /// <param name="errorCallback" type="IErrorCallback" optional="true">Error callback function</param>
    let index,
        result;

    // Set the out come of all resuls.
    for (index = 0; index < testCaseResults.length; index++) {
        result = testCaseResults[index];
        result.outcome = outCome;
        if (outCome === TCMConstants.TestOutcome.Paused) {
            result.state = TCMConstants.TestResultState.Paused;
        }
    }

    // Save all results.
    getTestResultManager().update(testCaseResults, callback, errorCallback, options);
}

export function getParameterNameValueMap(parameterNames: string[], parameterData: Array<{ [index: string]: string; }>, iterationIndex: number): {} {
    /// <summary>Validates each of the parameters to check if it is present in the test case and returns a name value map of the parameter name and value</summary>
    /// <param name="paramNames" type="string[]">The list of parameter names</param>
    /// <param name="parameterData" type="object">The parameter data for the test case</param>
    /// <param name="parameterData" type="number">The iteration index</param>
    let paramName: string;
    let res = {};
    $.each(parameterNames, function (i, paramName) {
        if (paramName &&
            parameterData[iterationIndex] &&
            !res[paramName]) {
            res[paramName] = getParameterValueFromDataRow(parameterData[iterationIndex], paramName);
        }
    });
    return res;
}

export function getParameterValueFromDataRow(dataRow: any, paramName: string) {
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

export class TestCaseResultUtils {

    public static prepareStepResults(testCaseResult: TestsOM.TestCaseResult, testCase: TestsOM.TestCase, iterationIndex: number, sharedStepCache: { [id: number]: TestsOM.SharedStepWorkItem }, callBack?: IResultCallback) {
        let step,
            i: number,
            steps = testCase.getTestSteps(),
            iterationResult,
            stepResults,
            stepResultsCollection,
            stepResultIndex,
            iterationResults = testCaseResult.iterations.getItems(),
            testCaseData = testCase.getData();

        if (iterationResults[iterationIndex] && iterationResults[iterationIndex].actionResults) {
            iterationResult = iterationResults[iterationIndex];
            stepResults = iterationResult.actionResults;
            stepResultsCollection = iterationResult.actionResults.getItems();
            if (steps) {
                for (i = 0; i < steps.length; i++) {
                    step = steps[i];
                    stepResultIndex = stepResults.indexOf(step.id);

                    if (!stepResultsCollection[stepResultIndex]) {
                        break;
                    }
                    if (i !== stepResultIndex) {
                        stepResults.swap(i, stepResultIndex);
                        stepResultIndex = i;
                    }
                    if (step instanceof TestsOM.TestStep) {
                        stepResultsCollection[stepResultIndex].indexString = (i + 1).toString() + ".";
                        stepResultsCollection[stepResultIndex].setTestStep(step);
                        if (testCaseResult.isDataDriven()) {
                            TestCaseResultUtils.addParametersToStepResult(stepResultsCollection[stepResultIndex], testCaseData, iterationIndex);
                        }
                    }
                    else {
                        stepResultsCollection[stepResultIndex].indexString = (i + 1).toString() + ".";
                        TestCaseResultUtils.populateSharedStepResult(stepResultsCollection[stepResultIndex], iterationResult, testCaseData, iterationIndex, sharedStepCache, callBack);
                    }
                }
            }
        }
    }

    public static populateSharedStepResult(sharedStepResult: TestsOM.SharedStepResult, iterationResult: TestsOM.TestIterationResult, testCaseData: Array<{ [index: string]: string; }>, iterationIndex: number, sharedStepCache: { [id: number]: TestsOM.SharedStepWorkItem }, callBack?: IResultCallback) {
        let index,
            subStep,
            subStepResult,
            sharedStepIndexString,
            sharedStepWorkItem = sharedStepCache[sharedStepResult.sharedStepId];

        sharedStepIndexString = sharedStepResult.indexString;
        sharedStepResult.setSharedStep(sharedStepWorkItem);
        if (!sharedStepResult.getIsLatestRevision()) {
            if (callBack) {
                callBack(false);
            }
        }

        let steps = sharedStepWorkItem.getTestSteps();
        let stepResults = sharedStepResult.actionResults;
        for (index = 0; index < steps.length; index++) {

            subStep = steps[index];

            //Getting the index of test action for the corresponding test step
            let stepResultIndex = stepResults.indexOf(subStep.id);

            if (stepResultIndex === null || stepResultIndex === undefined) {
                stepResultIndex = index;
            }

            if (!sharedStepResult.actionResults.getItems()[stepResultIndex]) {
                subStepResult = iterationResult.createStepResult(subStep.id);
                sharedStepResult.actionResults.add(subStepResult);
            }

            subStepResult = sharedStepResult.actionResults.getItems()[stepResultIndex];
            subStepResult.indexString = sharedStepIndexString + (index + 1).toString(); // Have deliberately hardcoded to ensure that the format does not get localized.
            subStepResult.parentId = sharedStepResult.actionId;
            subStepResult.isSubStep = true;
            subStepResult.setTestStep(subStep);
            TestCaseResultUtils.addParametersToStepResult(subStepResult, testCaseData, iterationIndex);
        }

        //reordering the test action in the order of index string to show them in proper order on test run window
        reOrderArray(sharedStepResult.actionResults.getItems(), (step: any) => {
            //Getting the postion of step where it will be place in  sorted array
            let decimalStringPosition: number = step.indexString.indexOf(".");
            let currentstepDecimalIndex: number = parseInt(step.indexString.slice(decimalStringPosition + 1));
            return currentstepDecimalIndex - 1;
        });
    }

    public static addParametersToStepResult(stepResult: TestsOM.TestStepResult, parameterData: Array<{ [index: string]: string; }>, iterationIndex: number) {
        ///<summary>Parses the test step title and expected result for parameters and adds the parameters to the test step result</summary>
        let parameters,
            stepParameterData = {},
            paramName,
            stepParameter;

        parameters = TestsOM.ParameterCommonUtils.getParameters(stepResult.getAction());
        stepResult.actionParameters = getParameterNameValueMap(parameters, parameterData, iterationIndex);

        parameters = TestsOM.ParameterCommonUtils.getParameters(stepResult.getExpectedResult());
        stepResult.expectedResultParameters = getParameterNameValueMap(parameters, parameterData, iterationIndex);

        stepParameterData = $.extend({}, stepResult.actionParameters, stepResult.expectedResultParameters);

        for (paramName in stepParameterData) {
            if (stepResult.parameters.getIndexFromCollection(paramName) === -1) {
                stepParameter = new TestsOM.TestResultParameter(paramName);
                stepParameter.expected = stepParameterData[paramName];
                stepParameter.dataType = 0;
                stepResult.parameters.add(stepParameter);
            }
        }
    }

    public static getSharedStepIdAndRevs(testCase: TestsOM.TestCase, testCaseResult: TestsOM.TestCaseResult): TestsOM.IdAndRevision[] {
        let i: number,
            testAction,
            sharedStepIdAndRevs: TestsOM.IdAndRevision[] = [],
            sharedStepId: number,
            sharedStepIds: number[] = [],
            sharedStepResult,
            sharedStepIndex,
            idAndRev: TestsOM.IdAndRevision,
            sharedStepRevision: number,
            doIterationsExist: boolean = testCaseResult.iterations.getItems().length > 0,
            iterations = testCaseResult.iterations.getItems(),
            testCaseId: number = testCase.getId();

        if (testCase.getTestSteps()) {
            for (i = 0; i < testCase.getTestSteps().length; i++) {
                testAction = testCase.getTestSteps()[i];
                if (testAction instanceof TestsOM.SharedSteps) {
                    sharedStepId = parseInt(String(testAction.ref), 10);

                    if (doIterationsExist) {
                        sharedStepIndex = iterations[0].actionResults.indexOf(testAction.id);
                        sharedStepResult = iterations[0].actionResults.getItems()[sharedStepIndex];
                        sharedStepRevision = sharedStepResult.sharedStepRevision;
                    }
                    else {
                        sharedStepRevision = -1;
                    }

                    idAndRev = new TestsOM.IdAndRevision(sharedStepId, sharedStepRevision);
                    if ($.inArray(sharedStepId, sharedStepIds) === -1) {
                        sharedStepIds.push(sharedStepId);
                        sharedStepIdAndRevs.push(idAndRev);
                    }
                }
            }
        }

        return sharedStepIdAndRevs;
    }

    public static getIterationAndStepResultAttachments(testRunAndResults) {
        let resultAttachments = [];
        if (testRunAndResults.testActionResults.attachments && testRunAndResults.testActionResults.actionResults) {
            let attachments = testRunAndResults.testActionResults.attachments;

            if (attachments) {
                for (let i = 0; i < attachments.length; i++) {
                    // if the attachment has an action path, it is a step result attachment and not a test result attachment
                    if (attachments[i].actionPath) {
                        let indexes = $.map(testRunAndResults.testActionResults.actionResults, function (obj, index) {
                            if (obj.actionPath == attachments[i].actionPath) {
                                return index;
                            }
                        });

                        if (indexes && indexes.length > 0) {
                            let firstIndex = indexes[0];

                            if (!testRunAndResults.testActionResults.actionResults[firstIndex].attachments) {
                                testRunAndResults.testActionResults.actionResults[firstIndex].attachments = [];
                            }

                            testRunAndResults.testActionResults.actionResults[firstIndex].attachments.push({
                                Id: attachments[i].id,
                                Name: attachments[i].fileName,
                                Size: attachments[i].size
                            });
                        }
                    }
                    else {
                        resultAttachments.push(attachments[i]);
                    }
                }

                testRunAndResults.testActionResults.attachments = resultAttachments;
            }
        }

        return testRunAndResults;
    }
}

export function getIdsFromIdAndRevs(idAndRevs: TestsOM.IdAndRevision[]): number[] {
    let ids: number[] = [];
    if (idAndRevs.length > 0) {
        ids = $.map(idAndRevs, function (val, index) {
            return val.id;
        });
    }
    return ids;
}

export function getRevisionsFromIdAndRevs(idAndRevs: TestsOM.IdAndRevision[]): number[] {
    let revs: number[] = [];
    if (idAndRevs.length > 0) {
        revs = $.map(idAndRevs, function (val, index) {
            return val.revision;
        });
    }
    return revs;
}

export function reOrderArray(array: any[], indexFinder: (element: any) => number) {
    //Algo: indexFinder finds the correct index in array. Insert the element at the correct index
    // This algo is efficent as the complexity is O(n + number of swaps) as compared to javascript sort which is O(n*logn)
    let index: number = 0;
    if (array) {

        for (index = 0; index < array.length; index++) {
            let arrayElement = array[index];
            let elementIndexInArray = indexFinder(arrayElement);

            //Loop until we place current element and all the elements that will be
            //swapped to move this element to right place, into their correct postion in array .
            while (elementIndexInArray !== index) {
                let element = array[index];
                array[index] = array[elementIndexInArray];
                array[elementIndexInArray] = element;

                elementIndexInArray = indexFinder(array[index]);
            }
        }
    }
}

export function setIterationAndTestResultOutcomeLocally(iteration: TestsOM.TestIterationResult, iterationOutcome: TCMConstants.TestOutcome, testCaseResult: TestsOM.TestCaseResult, testResultOutcome) {

    setIterationResultOutcomeLocally(iteration, iterationOutcome);
    setTestResultOutcomeLocally(testCaseResult, testResultOutcome);
}

export function setIterationResultOutcomeLocally(iteration: TestsOM.TestIterationResult, iterationOutcome: TCMConstants.TestOutcome) {
    iteration.outcome = iterationOutcome;
    iteration.dateCompleted = new Date();
    iteration.duration = (iteration.dateCompleted.getTime() - iteration.dateStarted.getTime()) * 10000;

    // Find a better way to handle dirty i.e. whenever the property changes.
    iteration.setIsDirty(true);
}

export function setTestResultOutcomeLocally(testCaseResult: TestsOM.TestCaseResult, testResultOutcome: TCMConstants.TestOutcome) {
    if (testResultOutcome === TCMConstants.TestOutcome.Paused) {
        testCaseResult.state = TCMConstants.TestResultState.Paused;
    }
    else if (testResultOutcome === TCMConstants.TestOutcome.Unspecified) {
        testCaseResult.state = TCMConstants.TestResultState.InProgress;
    }
    testCaseResult.outcome = testResultOutcome;
    testCaseResult.dateCompleted = new Date();
    testCaseResult.setDuration();
    testCaseResult.setIsDirty(true);
}

export function getDefaultSizeForTestRunWindow() {
    let size = {
        width: window.screen.availWidth / 5,
        height: window.screen.availHeight
    };

    return size;
}

export function handleEnterKey(e: JQueryEventObject, onEnterKey: () => {}) {
    if (e.keyCode === Utils_UI.KeyCode.ENTER &&
        !e.shiftKey && !e.ctrlKey && !e.altKey) {
            onEnterKey();
    }
}

export function handleSpaceKey(e: JQueryEventObject, onSpaceKey: () => {}) {
    if (e.keyCode === Utils_UI.KeyCode.SPACE &&
        !e.shiftKey && !e.ctrlKey && !e.altKey) {
            onSpaceKey();
    }
}

export function getCssClassNameForOutcomeIcon(outcome: TCMConstants.TestOutcome): string {

    if (outcome === TCMConstants.TestOutcome.Passed) {
        return "bowtie-icon bowtie-status-success";
    }
    else if (outcome === TCMConstants.TestOutcome.Failed) {
        return "bowtie-icon bowtie-status-failure";
    }
    else if (outcome === TCMConstants.TestOutcome.Blocked) {
        return "bowtie-icon bowtie-math-minus-circle";
    }
    else if (outcome === TCMConstants.TestOutcome.NotApplicable) {
        return "bowtie-icon bowtie-status-no-fill bowtie-no-fill-not-applicable";
    }
    else if (outcome === TCMConstants.TestOutcome.Paused) {
        return "bowtie-icon bowtie-status-pause";
    }

    return "";
}

export function setResultOutcomeText(outcome: TCMConstants.TestOutcome, state: TCMConstants.TestResultState): string {

    if (outcome === TCMConstants.TestOutcome.Passed) {
        return Resources.TestOutcome_Passed;
    }
    else if (outcome === TCMConstants.TestOutcome.Failed) {
        return Resources.TestOutcome_Failed;
    }
    else if (outcome === TCMConstants.TestOutcome.Blocked) {
        return Resources.TestOutcome_Blocked;
    }
    else if (outcome === TCMConstants.TestOutcome.NotApplicable) {
        return Resources.TestOutcome_NotApplicable;
    }
    else if (outcome === TCMConstants.TestOutcome.Paused) {
        return Resources.TestPointState_Paused;
    }
    else if (outcome === TCMConstants.TestOutcome.Aborted) {
        return Resources.TestOutcome_Aborted;
    }
    else if (outcome === TCMConstants.TestOutcome.Error) {
        return Resources.TestOutcome_Error;
    }
    else if (outcome === TCMConstants.TestOutcome.NotExecuted) {
        return Resources.TestOutcome_NotExecuted;
    }
    else if (outcome === TCMConstants.TestOutcome.Timeout) {
        return Resources.TestOutcome_Timeout;
    }
    else if (outcome === TCMConstants.TestOutcome.Warning) {
        return Resources.TestOutcome_Warning;
    }
    else if (outcome === TCMConstants.TestOutcome.Inconclusive) {
        return Resources.TestOutcome_Inconclusive;
    }
    else if (outcome === TCMConstants.TestOutcome.None) {
        return Resources.TestOutcome_None;
    }
    return "";
}

export function getFlatSteps(source: TestsOM.TestActionResult[],
    populateSharedStepResult?: (sharedStepResult: TestsOM.SharedStepResult) => any) {

    let i, ithStep, subStepIndex,
        subStep,
        flatSteps = [];

    for (i = 0; i < source.length; i++) {
        ithStep = source[i];
        ithStep.indexString = (i + 1).toString() + ".";
        if (ithStep instanceof TestsOM.SharedStepResult) {

            if (populateSharedStepResult) {
                // Populate substep results if not already created for this shared step.
                populateSharedStepResult(ithStep);
            }
            // Add the shared step first.
            flatSteps.push(ithStep);

            // Add the substeps of the shared steps.
            for (subStepIndex = 0; subStepIndex < ithStep.actionResults.getItems().length; subStepIndex++) {
                subStep = ithStep.actionResults.getItems()[subStepIndex];
                subStep.indexString = ithStep.indexString + (subStepIndex + 1).toString();
                flatSteps.push(subStep);
            }
        }
        else {
            flatSteps.push(ithStep);
        }
    }

    return flatSteps;
}

export function getTestActionResult(iterationResult: TestsOM.TestIterationResult, actionId: number, parentId?: number): TestsOM.TestActionResult {
    let actionPath: string = "";

    actionPath = TestsOM.ActionPathHelper.prepend(actionPath, actionId);
    if (parentId) {
        actionPath = TestsOM.ActionPathHelper.prepend(actionPath, parentId);
    }

    return iterationResult.findActionResultFromPath(actionPath);
}

export function getRefreshMenuItem($parentDocument: JQuery) {
    return $parentDocument.find("li[command=\"refresh-test-points\"]");
}

export function getWarningMessageForTestCaseDeletion(suiteType: number): string {
    let warningMessage: string;

    if (suiteType === TCMConstants.TestSuiteType.RequirementTestSuite) {
        warningMessage = Utils_String.format(Resources.DeleteTestCaseFromSuiteFormat,
            Utils_String.format(Resources.DeleteTestCaseFromSuiteFormat,
                Resources.RemoveTestCaseWarningMessage,
                Resources.RemoveTestCaseFromRequirementSuiteMessage),
            Resources.ConfirmDeletionText);
    }
    else {
        warningMessage = Utils_String.format(Resources.DeleteTestCaseFromSuiteFormat,
            Resources.RemoveTestCaseWarningMessage,
            Resources.ConfirmDeletionText);
    }
    return warningMessage;
}

export function removeSelectedTestCases(testCaseIds: number[], testPlanManager: TestsOM.TestPlanManager, suite: TestsOM.ITestSuiteModel, callback, errorCallback?): boolean {
    if (!testCaseIds || testCaseIds.length === 0) {
        // if test point list is empty then return
        return;
    }

    let warningMessage: string = getWarningMessageForTestCaseDeletion(suite.type);

    if (confirm(warningMessage)) {
        let requirementId;

        testPlanManager.removeTestCasesFromSuite(suite.id, suite.revision, testCaseIds, callback, errorCallback);

        if (suite.type === TCMConstants.TestSuiteType.RequirementTestSuite) {
            requirementId = suite.requirementId;
            WorkItemManager.get(WorkItemUtils.getWorkItemStore()).invalidateCache([requirementId]);
        }
        return true;
    }
    return false;
}

export interface IBulkWorkItemUpdateError {
    name: string;
    results: {
        error?: Error
        workItem: { id: number }
    }[];
}
/**
 * If the error contains a bulk error exception generate the message html.
 * @param error
 * @param dirtyWorkItemCount
 */
export function getBulkSaveErrorMessageHtml(error: IBulkWorkItemUpdateError, dirtyWorkItemCount: number): JQuery {
    if (error && error.name === Exceptions.WorkItemBulkSaveException) {
        let errorHeader, errorBody = $("<div/>");
        $.each(error.results, function (i, result) {
            if (result.error) {
                errorBody.append($("<div/>").append(
                    $("<div/>").text(Utils_String.format(WITResources.TriageViewWorkItemSaveError, result.workItem.id))
                ).append(
                    $("<div/>").text(VSS.getErrorMessage(result.error))
                ));
            }
        });

        if (errorBody.children().length > 0) {
            if (dirtyWorkItemCount === errorBody.children().length) {
                errorHeader = $("<div/>").append(
                    $("<div/>").text(Utils_String.format(WITResources.FailedToSaveNWorkItems, errorBody.children().length))
                ).append($("<br>"));
            }
            else {
                let successfullySaved = dirtyWorkItemCount - errorBody.children().length;
                errorHeader = $("<div/>").append(
                    $("<div/>").text(Utils_String.format(WITResources.SucessfullySavedNWisButFailedToSave, successfullySaved, errorBody.children().length))
                ).append(
                    $("<br>")
                ).append(
                    $("<div/>").text(WITResources.FollowingWisCouldNotBeSaved)
                ).append($("<br>"));
            }

            errorBody.append($("<br>")).append($("<div/>").text(WITResources.CorrectWisAndTryAgain));
            return $("<div/>").append(errorHeader).append(errorBody);
        }
    }
    return null;
}


export class SharedStepUtils {

    public static getSharedStep(sharedStepWorkItem: WITOM.WorkItem, revision: number): TestsOM.SharedStepWorkItem {
        let sharedStepId = sharedStepWorkItem.id,
            sharedStepTitle = sharedStepWorkItem.getFieldValueByRevision(WITConstants.CoreField.Title, revision),
            testStepFieldId = sharedStepWorkItem.getField(TCMConstants.WorkItemFieldNames.Actions).fieldDefinition.id,
            parametersXmlFieldId = sharedStepWorkItem.getField(TCMConstants.WorkItemFieldNames.Parameters).fieldDefinition.id,
            testStepsXml = sharedStepWorkItem.getFieldValueByRevision(testStepFieldId, revision),
            parametersXml = sharedStepWorkItem.getFieldValueByRevision(parametersXmlFieldId, revision);
        revision = revision === -1 ? sharedStepWorkItem.revision - 1 : revision - 1;
        return TestCaseUtils._createSharedStep(sharedStepId, revision, sharedStepTitle, testStepsXml, parametersXml, sharedStepWorkItem);
    }

    public static mergeSharedStepParametersAndData(testCase: TestsOM.TestCase, wits: TestsOM.SharedStepWorkItem[]) {
        let testCaseId,
            i = 0,
            parametersData,
            sharedStep;

        // For each test case that has shared step with parameters, merge the shared step
        // parameters with test case parameters and reparse the parameter data.
        if (wits) {
            for (i = 0; i < wits.length; i++) {
                SharedStepUtils.mergeSharedStepParamDataWithTestCase(testCase, wits[i]);
            }
        }
    }

    public static beginGetSharedStepsIdToTitleMap(sharedStepWorkItemIds: number[], callback?: (sharedStepIdToTitleMap: TFS_Core_Utils.Dictionary<string>) => void, errorCallback?: IErrorCallback) {
        let fields = [
            WITConstants.CoreFieldRefNames.Id,
            WITConstants.CoreFieldRefNames.Title
        ],
            sharedStepIdToTitleMap = new TFS_Core_Utils.Dictionary<string>();

        if (sharedStepWorkItemIds && sharedStepWorkItemIds.length > 0) {
            WorkItemUtils.getWorkItemStore().beginPageWorkItems(sharedStepWorkItemIds, fields, (payload) => {
                sharedStepIdToTitleMap = SharedStepUtils._parseSharedStepIdToTitleMapFromPayload(payload.rows);

                if (callback) {
                    callback(sharedStepIdToTitleMap);
                }
            },
                errorCallback);
        }
        else {
            callback(sharedStepIdToTitleMap);
        }
    }

    public static mergeSharedStepParamDataWithTestCase(testCase: TestsOM.TestCase, sharedStep: TestsOM.SharedStepWorkItem): void {
        let parametersData;
        if (sharedStep.hasParameters()) {

            // Merge shared step parameters with test case.
            testCase.mergeSharedStepParameters(sharedStep.getParameters());

            if (!testCase.isUsingSharedParameters()) { // In case the testcase is using sharedParameters, we have already parsed the mappings and created the data. We dont need to re-parse.
                // Reparse the test case parameters data with the new set of parameters.
                parametersData = ParametersHelper.parseParametersData($(Utils_Core.parseXml(testCase.getParametersDataFieldValue())), testCase.getParameters());

                // Set the new data on the test case.
                testCase.setData(parametersData);
            }
        }
    }

    public static parseSharedStepDataFromPayload(payload: any, fields: string[]): TestsOM.SharedStepWorkItem[] {
        let sharedSteps: TestsOM.SharedStepWorkItem[] = [];

        if (payload && payload.length > 0) {
            let length = payload.length;
            for (let i = 0; i < length; i++) {

                let data: any,
                    dataLength: number,
                    sharedStep: TestsOM.SharedStepWorkItem,
                    sharedStepData = {};

                data = payload[i];
                dataLength = data.length;

                for (let j = 0; j < dataLength; j++) {
                    sharedStepData[fields[j]] = data[j];
                }

                let sharedStepId = sharedStepData[WITConstants.CoreFieldRefNames.Id],
                    sharedStepRevision = sharedStepData[WITConstants.CoreFieldRefNames.Rev],
                    sharedStepTitle = sharedStepData[WITConstants.CoreFieldRefNames.Title],
                    sharedStepActions = sharedStepData[TCMConstants.WorkItemFieldNames.Actions] || "",
                    sharedStepParameters = sharedStepData[TCMConstants.WorkItemFieldNames.Parameters] || "";

                sharedStep = TestCaseUtils._createSharedStep(sharedStepId, sharedStepRevision, sharedStepTitle, sharedStepActions, sharedStepParameters);
                sharedSteps.push(sharedStep);
            }
        }
        return sharedSteps;
    }

    private static _parseSharedStepIdToTitleMapFromPayload(payload: any): TFS_Core_Utils.Dictionary<string> {
        let i: number,
            length: number,
            data: any,
            sharedStepIdToTitleMap = new TFS_Core_Utils.Dictionary<string>();

        if (payload && payload.length > 0) {
            length = payload.length;
            for (i = 0; i < length; i++) {
                data = payload[i];
                sharedStepIdToTitleMap.set(data[0], data[1]);
            }
        }

        return sharedStepIdToTitleMap;
    }
}

export class TestCaseUtils {

    public static beginCreateTestCase(testCaseId: number,
        testCaseRevision: number,
        testCaseTitle: string,
        testCaseAreaPath: string,
        testCaseDescriptionXml: string,
        testStepsXml: string,
        parametersXml: string,
        parametersDataXml: string,
        workItem?: WITOM.WorkItem,
        properties?: any, callback?: (testCase: TestsOM.TestCase) => void, errorCallback?: IErrorCallback) {

        let testCaseDescriptionHtml,
            testStepsHtml,
            testStepsArray,
            parameters,
            parametersData: Array<{ [index: string]: string; }> = [],
            testCase, i,
            parameterDataInfo: TestsOM.TestCaseParameterDataInfo;

        testStepsHtml = Utils_Core.parseXml(testStepsXml || "");
        testStepsArray = TestsOM.TestBase.parseTestSteps($(testStepsHtml).find("steps"));
        parameters = TestsOM.ParameterCommonUtils.parseParameters($(Utils_Core.parseXml(parametersXml || "")));
        parameterDataInfo = TestsOM.TestCaseParameterDataInfo.parseTestCaseParametersData(parametersDataXml);

        if (!parameterDataInfo) {
            parametersData = ParametersHelper.parseParametersData($(Utils_Core.parseXml(parametersDataXml || "")), parameters);
        }
        testCase = new TestsOM.TestCase(testCaseId,
            testCaseRevision,
            testCaseTitle,
            testStepsArray,
            parameters,
            parametersData,
            parametersDataXml,
            testCaseAreaPath,
            properties,
            testCaseDescriptionXml);

        if (workItem) {
            testCase.setWorkItemWrapper(new TestsOM.WorkItemWrapper(workItem));
        }

        if (parameterDataInfo) {
            ParametersHelper.beginPopulateTestCaseDataFromParamDataInfo(parameterDataInfo, testCase, () => {
                if (callback) {
                    callback(testCase);
                }
            },
                errorCallback);
        }
        else {
            if (callback) {
                callback(testCase);
            }
        }
    }

    public static beginPageWorkItems(ids: number[], fields: any[], callback: (payload: any) => void, errorCallback?: IErrorCallback, options?: any): void {
        let idsToGet: number[],
            allPayload: any,
            pageOperationCallback = options ? options.pageOperationCallback : null,
            cancellable = options ? options.cancelable : null;
        ids = Utils_Array.unique(ids);
        if (ids.length > 0 && !(cancellable && cancellable.canceled)) {
            TestCaseUtils._beginPageWorkItems(ids, fields, (payload) => {
                if (!allPayload) {
                    allPayload = payload;
                }
                else if (payload) {
                    allPayload.rows = allPayload.rows.concat(payload.rows);
                }
                if (pageOperationCallback && payload) {
                    pageOperationCallback(payload);
                }
                if (!payload) {
                    callback(allPayload);
                }
            }, errorCallback, options);
        }
    }

    private static _beginPageWorkItems(ids: number[], fields: any[], callback: (payload: any) => void, errorCallback?: IErrorCallback, options?: any): void {
        let cancellable = options ? options.cancelable : null,
            idsToGet: number[];

        idsToGet = ids.splice(0, PageSizes.QUERY);
        if (idsToGet.length > 0 && !(cancellable && cancellable.canceled)) {
            WorkItemUtils.getWorkItemStore().beginPageWorkItems(idsToGet, fields, (payload) => {
                callback(payload);
                if (ids.length > 0 && !cancellable.canceled) {
                    TestCaseUtils._beginPageWorkItems(ids, fields, callback, errorCallback, options);
                }
                else {
                    callback(null);
                }
            },
                errorCallback);
        }
        else {
            callback(null);
        }
    }

    public static beginGetSharedSteps(ids: number[], callback?: (sharedStepWits: TestsOM.SharedStepWorkItem[]) => void, errorCallback?: IErrorCallback, options?: any) {
        let i: number,
            row,
            len: number,
            sharedStepWits: TestsOM.SharedStepWorkItem[] = [],
            requiredColumns = TestsOM.TestBase.SharedStepCoreFields;

        if (ids && ids.length > 0) {
            TestCaseUtils.beginPageWorkItems(ids, requiredColumns, (payload) => {

                for (i = 0, len = payload.rows.length; i < len; i++) {
                    row = payload.rows[i];
                    sharedStepWits.push(TestCaseUtils._getSharedStepFromPayload(row));
                }
                TestCaseUtils._insertAttachmentsMetadataToSharedStepWits(sharedStepWits, () => {
                    callback(sharedStepWits);
                }, errorCallback);
            }, errorCallback, options);
        }
        else {
            callback(sharedStepWits);
        }
    }

    // Inserts Attachments to ShareStep Wits after fetching them from tfs.
    private static _insertAttachmentsMetadataToSharedStepWits(sharedStepWits: TestsOM.SharedStepWorkItem[], callback?: IResultCallback, errorCallback?: IErrorCallback): void {
        let i: number,
            j: number,
            sharedStepWitsCount: number,
            resouceCount: number,
            sharedStepIds: number[] = [],
            attachmentsMetadata: TestsOM.TestStepAttachmentMetadata[] = [];

        // generate id array.
        for (i = 0, sharedStepWitsCount = sharedStepWits.length; i < sharedStepWitsCount; i++) {
            sharedStepIds.push(sharedStepWits[i].getId());
        }

        TestCaseUtils._beginGetTestStepResources(sharedStepIds, (resources: IResourceLink[]) => {
            let attachmentMetadata: TestsOM.TestStepAttachmentMetadata,
                attachmentUri: string;

            for (i = 0, resouceCount = resources.length; i < resouceCount; i++) {
                attachmentMetadata = new TestsOM.TestStepAttachmentMetadata();
                attachmentMetadata.updateMetadatafromResourceLink(resources[i]);

                attachmentUri = WorkItemUtils.getWorkItemStore().getApiLocation("DownloadAttachment", {
                    filename: attachmentMetadata.getOriginalName(),
                    fileGuid: attachmentMetadata.getFilePath(),
                    contentOnly: true
                });
                attachmentMetadata.setUri(attachmentUri);

                for (j = 0, sharedStepWitsCount = sharedStepWits.length; j < sharedStepWitsCount; j++) {
                    if (sharedStepWits[j].getId() === attachmentMetadata.getWorkItemId()) {
                        sharedStepWits[j].addTestStepAttachmentsMetadata(attachmentMetadata);
                        break;
                    }
                }
            }
            callback();
        }, errorCallback);
    }

    private static _beginGetTestStepResources(ids: number[], callback?: (attachments: IResourceLink[]) => void, errorCallback?: IErrorCallback): void {
        if (ids.length > 0) {
            // putting restriction on long url generation by using batching to get total attachments
            let batchSize = 100;
            let numberOfBatch = Math.ceil(ids.length / batchSize);
            let j = 0, count = 0;
            let totalAttachments: IResourceLink[] = [];
            for (let i = 1; i <= numberOfBatch; i++) {
                WorkItemUtils.getWorkItemStore().beginGetWorkItemResources(ids.slice(j, j + batchSize), (attachments) => {
                    Utils_Array.addRange(totalAttachments, attachments);
                    count++;
                    if (count === numberOfBatch) {
                        callback(totalAttachments);
                    }
                }, errorCallback);
                j += batchSize;
            }
        }
    }

    private static _getSharedStepFromPayload(payLoadRow): TestsOM.SharedStepWorkItem {
        let sharedStepId = payLoadRow[0],
            sharedStepRevision = payLoadRow[1],
            sharedStepTitle = payLoadRow[2],
            testStepsXml = payLoadRow[3] || "",
            parametersXml = payLoadRow[4] || "";

        return TestCaseUtils._createSharedStep(sharedStepId, sharedStepRevision, sharedStepTitle, testStepsXml, parametersXml);
    }

    public static _createSharedStep(sharedStepId: number,
        sharedStepRevision: number,
        sharedStepTitle: string,
        testStepsXml: string,
        parametersXml: string,
        workItem?: WITOM.WorkItem): TestsOM.SharedStepWorkItem {

        let parameters,
            parametersData,
            testStepsHtml,
            testStepsArray,
            sharedStep, i: number;

        testStepsHtml = Utils_Core.parseXml(testStepsXml || "");
        testStepsArray = TestsOM.TestBase.parseTestSteps($(testStepsHtml).find("steps"));
        parameters = TestsOM.ParameterCommonUtils.parseParameters($(Utils_Core.parseXml(parametersXml || "")));
        sharedStep = new TestsOM.SharedStepWorkItem(sharedStepId, sharedStepRevision, sharedStepTitle, testStepsArray, parameters);
        if (workItem) {
            sharedStep.setWorkItemWrapper(new TestsOM.WorkItemWrapper(workItem));
        }

        return sharedStep;
    }

    public static beginGetTestCases(testCaseIds: number[], fields: string[], callback?: (testCases: TestsOM.TestCase[]) => void, errorCallback?: IErrorCallback) {
        if (!fields || fields.length === 0) {
            fields = TestsOM.TestBase.TestCaseCoreFields;
            fields.push(WITConstants.CoreFieldRefNames.AreaPath);
        }

        if (testCaseIds && testCaseIds.length > 0) {
            WorkItemUtils.getWorkItemStore().beginPageWorkItems(testCaseIds, fields, (payload) => {
                TestCaseUtils.beginParseTestCaseDataFromPayload(payload.rows, fields, (testCases) => {
                    let idPositionMap = {};
                    for (let i = 0; i < testCaseIds.length; i++) {
                        idPositionMap[testCaseIds[i]] = i;
                    }
                    if (callback) {
                        callback(testCases.sort((a, b) => idPositionMap[a.getId()] - idPositionMap[b.getId()]));
                    }
                },
                    errorCallback);
            });
        }
        else {
            callback([]);
        }
    }

    public static beginParseTestCaseData(workItem: WITOM.WorkItem, revision?: number, callback?: (testCase: TestsOM.TestCase) => void, errorCallback?: IErrorCallback) {

        let testCaseId = workItem.id,
            testCaseTitle = revision ? workItem.getFieldValueByRevision(WITConstants.CoreField.Title, revision - 1) : workItem.getField(WITConstants.CoreField.Title).getValue(),
            testCaseAreaPath = revision ? workItem.getFieldValueByRevision(WITConstants.CoreField.AreaPath, revision - 1) : workItem.getField(WITConstants.CoreField.AreaPath),
            testStepFieldId = workItem.getField(TCMConstants.WorkItemFieldNames.Actions).fieldDefinition.id,
            testCaseDescriptionXml = revision ? workItem.getFieldValueByRevision(WITConstants.CoreField.Description, revision - 1) : workItem.getField(WITConstants.CoreField.Description).getValue(),
            parametersXmlFieldId = workItem.getField(TCMConstants.WorkItemFieldNames.Parameters).fieldDefinition.id,
            parametersDataXmlFieldId = workItem.getField(TCMConstants.WorkItemFieldNames.DataField).fieldDefinition.id,
            testStepsXml = (revision ? workItem.getFieldValueByRevision(testStepFieldId, revision - 1) : workItem.getField(testStepFieldId).getValue()) || "",
            parametersXml = (revision ? workItem.getFieldValueByRevision(parametersXmlFieldId, revision - 1) : workItem.getField(parametersXmlFieldId).getValue()) || "",
            parametersDataXml = (revision ? workItem.getFieldValueByRevision(parametersDataXmlFieldId, revision - 1) : workItem.getField(parametersDataXmlFieldId).getValue()) || "";

        TestCaseUtils.beginCreateTestCase(testCaseId, revision, testCaseTitle, testCaseAreaPath, testCaseDescriptionXml, testStepsXml, parametersXml, parametersDataXml, workItem, {}, callback, errorCallback);
    }

    public static beginParseTestCaseDataFromPayload(payload: any, fields: string[], callback?: (testCases: TestsOM.TestCase[]) => void, errorCallback?: IErrorCallback) {
        let testCases: TestsOM.TestCase[] = [],
            testCase: TestsOM.TestCase,
            length: number,
            dataLength: number,
            data: any,
            i: number,
            j: number,
            testCaseId: number,
            testCaseTitle: string,
            testCaseAreaPath: string,
            testCaseRevision: number,
            testCaseDescriptionXml: string,
            testStepsXml: string,
            parametersXml: string,
            parametersDataXml: string,
            testCaseData = {},
            testCasesCached: number = 0;

        if (payload && payload.length > 0) {
            length = payload.length;
            for (i = 0; i < length; i++) {
                data = payload[i];
                dataLength = data.length;

                for (j = 0; j < dataLength; j++) {
                    testCaseData[fields[j]] = data[j];
                }
                testCaseId = testCaseData[WITConstants.CoreFieldRefNames.Id],
                    testCaseRevision = testCaseData[WITConstants.CoreFieldRefNames.Rev],
                    testCaseDescriptionXml = testCaseData[WITConstants.CoreFieldRefNames.Description] || "",
                    testCaseTitle = testCaseData[WITConstants.CoreFieldRefNames.Title],
                    testCaseAreaPath = testCaseData[WITConstants.CoreFieldRefNames.AreaPath] || "",
                    testStepsXml = testCaseData[TCMConstants.WorkItemFieldNames.Actions] || "",
                    parametersXml = testCaseData[TCMConstants.WorkItemFieldNames.Parameters] || "",
                    parametersDataXml = testCaseData[TCMConstants.WorkItemFieldNames.DataField] || "";

                TestCaseUtils.beginCreateTestCase(testCaseId, testCaseRevision, testCaseTitle, testCaseAreaPath, testCaseDescriptionXml, testStepsXml, parametersXml, parametersDataXml, null, $.extend({}, testCaseData), (testCase) => {
                    testCases.push(testCase);
                    testCasesCached++;
                    if (testCasesCached === length) {
                        if (callback) {
                            callback(testCases);
                        }
                    }
                });
            }
        }
    }
}

export class WorkItemUtils {

    //TODO: Make ProjectId Parameter manadatory in all methods. It should be responsibilty of caller to pass Project to this util.
    //We need to pass project to this method if we may call this method at collection context otherwise we cann use TFS navigation context to get Project here.

    public static beginQuery(query: string, callback: IFunctionPR<IQueryResult, void>, errorCallback?: IErrorCallback, projectId?: string) {
        let witStore = WorkItemUtils.getWorkItemStore(),
            workItemTypeName: string;
        projectId = ProjectUtil.validateAndGetProjectId(projectId);
        witStore.beginGetProject(projectId, function (project: WITOM.Project) {
            witStore.beginQuery(project.guid, query, callback, errorCallback);
        });
    }

    public static getWorkItemStore(): WITOM.WorkItemStore {
        if (!_workitemStore) {
            _workitemStore = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        }

        return _workitemStore;
    }

    public static beginValidateQueryContainsCategory(queryText: string, categoryName: string, callback: IResultCallback, errorCallback: IErrorCallback) {
        getTestPlanManager().validateQueryContainsCategory(queryText, categoryName, callback, errorCallback);
    }

    public static beginGetWorkItemCategory(categoryName: string, callback: (category: any) => any, projectId?: string) {
        const project = projectId ? ProjectUtil.validateAndGetProjectId(projectId) : TFS_Host_TfsContext.TfsContext.getDefault().contextData.project.name;

        const witClient = WIT_WebApi.getClient();
        witClient.getWorkItemTypeCategory(project, categoryName).then((workItemTypeCategory: WITContracts.WorkItemTypeCategory) => {
            callback(workItemTypeCategory);
        });
    }

    public static getDefaultWorkItemTypeNameForCategory(categoryName: string, callback: (workItemTypeName: string) => any, projectId?: string) {
        WorkItemUtils.beginGetWorkItemCategory(categoryName, function (category: WITContracts.WorkItemTypeCategory) {
            callback(category.defaultWorkItemType.name);
        }, projectId);
    }

    public static setAreaAndIterationPaths(workItem, areaPath, iterationPath) {
        workItem.setFieldValue(WITConstants.CoreField.AreaPath, areaPath);
        workItem.setFieldValue(WITConstants.CoreField.IterationPath, iterationPath);
    }

    public static setReproSteps(workItem: WITOM.WorkItem, reproSteps: string) {
        workItem.setFieldValue(TestsOM.BugWITFields.ReproSteps, reproSteps);
    }

    public static setTitle(workItem: WITOM.WorkItem, title: string) {
        workItem.setFieldValue(WITConstants.CoreField.Title, title);
    }

    public static getAllWorkItemTypeNamesForCategory(categoryName: string, callback: (workItemTypeName: string[]) => any, errorCallback?: IErrorCallback, projectId?: string) {
        WorkItemUtils.beginGetWorkItemCategory(categoryName, function (category) {
            let workItemTypes = category.workItemTypes;
            let names = workItemTypes.map(type => type.name);
            callback(names);
        }, projectId);
    }

    public static getAllWorkItemTypeNamesForCategoryForAllProjects(categoryNames: string[], callback: (workItemTypeName: string[]) => any, projectId?: any) {
        if (ProjectUtil.isProjectIdValid(projectId)) {
            getTestPlanManager().getWorkItemTypeNameForCategoreisForSpecificProject(categoryNames, projectId, (workItemTypeNames: string[]) => {
                callback(workItemTypeNames);
            });
        } else {
            getTestPlanManager().getWorkItemTypeNamesForCategories(categoryNames, (workItemTypeNames: string[]) => {
                callback(workItemTypeNames);
            });
        }
    }

    public static getDefaultWorkItemTypeInfoForWorkItemCategory(category: string, callback: IResultCallback, projectId?: string) {
        let TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        projectId = ProjectUtil.validateAndGetProjectId(projectId);
        WorkItemUtils.getDefaultWorkItemTypeNameForCategory(category, function (workItemTypeName) {
            let witStore = WorkItemUtils.getWorkItemStore();
            Diag.Debug.assertIsNotNull(witStore);
            witStore.beginGetProject(projectId, function (project: WITOM.Project) {

                let workItemType: WITOM.WorkItemType;
                let node: TFS_AgileCommon.INode;

                let tryFinish = () => {
                    if (workItemType && node) {
                        callback(workItemType);
                    }
                };

                project.beginGetWorkItemType(
                    workItemTypeName,
                    (workItemTypeData) => {
                        workItemType = workItemTypeData;
                        tryFinish();
                    });

                project.nodesCacheManager.beginGetNodes().then(
                    (nodeData) => {
                        node = nodeData;
                        tryFinish();
                    });
            });
        }, projectId);
    }

    public static beginGetTeamSettingsData(callback?: IResultCallback, errorCallback?: IErrorCallback) {

        const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

        if (_teamAwarenessService.contextSupports(tfsContext)) {
            const teamId = tfsContext.currentTeam.identity.id;
            WorkItemUtils.beginGetTeamSettingsDataWithTeamId(teamId, callback, errorCallback);
        } else {
            // in no team context scenario get project's default team settings
            this.getDefaultTeam(tfsContext.contextData.project.id).then((teamId) => {
                WorkItemUtils.beginGetTeamSettingsDataWithTeamId(teamId, callback, errorCallback);
            }, (error) => {
                errorCallback(error);
            });
        }
    }

    /**
     * 
     * @param projectId
     * @return default team Id
     */
    public static getDefaultTeam(projectId: string): IPromise<string> {
        return new Promise((resolve, reject) => {
            Service.getClient(CoreRestClient.CoreHttpClient).getProject(projectId).then((project: CoreContracts.TeamProject) => {
                return resolve(project.defaultTeam.id);
            }, (error) => {
                reject(error);
            });
        });
    }

    public static beginGetTeamSettingsDataWithTeamId(teamId: string, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        if (teamId) {
            const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
            const witStore = WorkItemUtils.getWorkItemStore();
            witStore.beginGetTeamSettings(teamId).then(
                (teamSettings: TFS_AgileCommon.ITeamSettings) => {
                    let area: string,
                        teamAreas: any[] = [],
                        iteration: string;

                    let iterationVal: TFS_AgileCommon.IIterationData;
                    iterationVal = teamSettings.defaultIteration || teamSettings.currentIteration || teamSettings.backlogIteration;
                    iteration = iterationVal ? iterationVal.friendlyPath : Utils_String.empty;

                    if (teamSettings.teamFieldName && teamSettings.teamFieldName === WITConstants.CoreFieldRefNames.AreaPath) {
                        area = teamSettings.teamFieldDefaultValue;

                        teamAreas = $.map(teamSettings.teamFieldValues, (item, i) => {
                            return item;
                        });
                    } else if (tfsContext.navigation.project) {
                        area = tfsContext.navigation.project;
                        teamAreas.push({ value: area });
                    }

                    let teamSettingsData = new TestsOM.TeamSettingsData(iteration, area, teamAreas, teamSettings.bugsBehavior);

                    if (callback) {
                        callback(teamSettingsData);
                    }
                },
                errorCallback);
        }
    }

    public static GetTeamSettingsData(): IPromise<TestsOM.TeamSettingsData> {
        let deferred: Q.Deferred<TestsOM.TeamSettingsData> = q.defer<TestsOM.TeamSettingsData>();

        //Get team settings
        this.beginGetTeamSettingsData((teamSettingsData: TestsOM.TeamSettingsData) => {
            deferred.resolve(teamSettingsData);
        }, (error) => {
            deferred.reject(error);
        });

        return deferred.promise;
    }

    public static EscapeWiqlFieldValue(fieldValue: string): string {
        /// <summary>
        /// Ensures that a string used for the field value (RHS) of a Wiql clause is escaped correctly.
        /// </summary>
        /// <param name="fieldValue">The literal field value</param>
        /// <returns>The escaped field value for use in Wiql query</returns>
        /// <remarks>If a field value has a single quote it will terminate the clause early and cause Wiql errors</remarks>
        return fieldValue.replace(/'/g, "''");
    }
}

export class SharedStepCreationHelper {
    private _sharedStepWorkItemType: WITOM.WorkItemType;
    private _project: WITOM.Project;

    constructor(project?: WITOM.Project) {
        this._project = project;
        SharedStepCreationHelper.getDefaultWorkItemTypeInfoForSharedStepCategory((wit) => {
            this._sharedStepWorkItemType = wit;
        }, this._getProjectId());
    }

    public static getDefaultWorkItemTypeInfoForSharedStepCategory(callback: IResultCallback, project?: string) {
        WorkItemUtils.getDefaultWorkItemTypeInfoForWorkItemCategory(TestsOM.WorkItemCategories.SharedStep, callback, project);
    }

    public createSharedStep(title: string, steps: TestsOM.TestStep[], testCase: TestsOM.TestCase, callback: IResultCallback, errorCallback: IErrorCallback) {
        if (this._sharedStepWorkItemType) {
            this._processCreateSharedStepOkCallback(title, steps, testCase, callback, errorCallback);
        }
        else {
            SharedStepCreationHelper.getDefaultWorkItemTypeInfoForSharedStepCategory((wit) => {
                this._sharedStepWorkItemType = wit;
                this._processCreateSharedStepOkCallback(title, steps, testCase, callback, errorCallback);
            }, this._getProjectId());
        }
    }

    private _processCreateSharedStepOkCallback(title: string, steps: TestsOM.TestStep[], testCase: TestsOM.TestCase, callback: IResultCallback, errorCallback: IErrorCallback) {
        let sharedStep: TestsOM.SharedStepWorkItem,
            witStore = WorkItemUtils.getWorkItemStore(),
            workItem = WorkItemManager.get(witStore).createWorkItem(this._sharedStepWorkItemType);

        // set area path and iteration
        WorkItemUtils.setAreaAndIterationPaths(workItem, testCase.getWorkItemWrapper().getFieldValue(WITConstants.CoreFieldRefNames.AreaPath),
            testCase.getWorkItemWrapper().getFieldValue(WITConstants.CoreFieldRefNames.IterationPath));

        // Create a shared step with the work item.
        sharedStep = new TestsOM.SharedStepWorkItem(0, 0, title, [], []);
        sharedStep.setWorkItemWrapper(new TestsOM.WorkItemWrapper(workItem));
        sharedStep.setIsDirty(true);

        // Add steps
        this._addSteps(sharedStep, steps);

        // save the shared step
        sharedStep.beginSave(callback, errorCallback);
    }

    private _addSteps(sharedStep: TestsOM.SharedStepWorkItem, steps: TestsOM.TestStep[]) {
        let lastActionId: number = 1,
            numSteps: number = steps.length,
            i: number;

        for (i = 0; i < numSteps; i++) {
            sharedStep.copyStep(steps[i], lastActionId);
            lastActionId++;
        }
    }

    private _getProjectId(): string {
        return ProjectUtil.validateAndGetProjectIdFromProject(this._project);
    }
}

export class ProjectUtil {

    public static validateAndGetProjectId(projectId: string): string {
        let id: string = projectId;
        if (!this.isProjectIdValid(id)) {
            id = this.getProjectIdFromContext();
        }

        return id;
    }

    public static validateAndGetProjectIdFromProject(project: WITOM.Project): string {
        let id: string = project ? project.guid : undefined;
        return ProjectUtil.validateAndGetProjectId(id);
    }

    public static isProjectIdValid(projectId: string) {
        let isValid: boolean = true;
        if (!projectId || projectId === "" || projectId === "00000000-0000-0000-0000-000000000000") {
            isValid = false;
        }

        return isValid;
    }

    public static getProjectIdFromContext(): string {
        let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        return tfsContext.navigation.projectId;
    }
}

export class SharedParameterHelper {
    public static beginGetReferencedTestCases(sharedParamDataSetId: number, testCaseFieldsToGet: string[], callback?: (testCases: TestsOM.ReferencedTestCaseModel[]) => void, errorCallback?: IErrorCallback) {
        let testCases: TestsOM.ReferencedTestCaseModel[] = [],
            witStore = WorkItemUtils.getWorkItemStore(),
            i: number,
            links: WITOM.WorkItemLink[],
            linksCount: number,
            testCaseIds: number[] = [],
            workItemManager = WorkItemManager.get(witStore);

        if (!testCaseFieldsToGet || testCaseFieldsToGet.length === 0) {
            testCaseFieldsToGet = TestsOM.TestBase.TestCaseIdAndTitleFields;
        }

        workItemManager.invalidateCache([sharedParamDataSetId]);
        workItemManager.beginGetWorkItem(sharedParamDataSetId, (sharedParamDataSet: WITOM.WorkItem) => {
            links = TestsOM.WitLinkingHelper.getLinks(sharedParamDataSet, TestsOM.WitLinkingHelper.SHAREDPARAMETER_LINKTYPE_FORWARD);
            linksCount = links.length;
            for (i = 0; i < linksCount; i++) {
                testCaseIds.push(links[i].linkData.ID);
            }
            workItemManager.invalidateCache(testCaseIds);

            if (testCaseIds && testCaseIds.length > 0) {
                WorkItemUtils.getWorkItemStore().beginPageWorkItems(testCaseIds, testCaseFieldsToGet, (payload) => {
                    testCases = SharedParameterHelper._parseReferencedTestCaseDataFromPayload(payload.rows, testCaseFieldsToGet);

                    if (callback) {
                        callback(testCases);
                    }
                },
                    errorCallback);
            }
            else {
                callback(testCases);
            }
        },
            errorCallback);
    }

    private static _parseReferencedTestCaseDataFromPayload(payload: any, fields: string[]): TestsOM.ReferencedTestCaseModel[] {
        let testCases: TestsOM.ReferencedTestCaseModel[] = [],
            testCase: TestsOM.ReferencedTestCaseModel,
            length: number,
            dataLength: number,
            data: any,
            i: number,
            j: number,
            testCaseId: number,
            testCaseTitle: string,
            testCaseData = {};

        if (payload && payload.length > 0) {
            length = payload.length;
            for (i = 0; i < length; i++) {
                data = payload[i];
                dataLength = data.length;

                for (j = 0; j < dataLength; j++) {
                    testCaseData[fields[j]] = data[j];
                }

                testCaseId = testCaseData[WITConstants.CoreFieldRefNames.Id],
                    testCaseTitle = testCaseData[WITConstants.CoreFieldRefNames.Title];
                testCase = new TestsOM.ReferencedTestCaseModel();
                testCase.id = testCaseId;
                testCase.title = testCaseTitle;
                testCases.push(testCase);
            }
        }

        return testCases;
    }
}

export class SharedParameterCreationHelper {
    private _sharedParameterWorkItemType: WITOM.WorkItemType;
    private _projectId: string;

    constructor(projectId?: string) {
        this._projectId = projectId;
        SharedParameterCreationHelper.beginGetDefaultWorkItemTypeInfoForSharedParameterCategory((wit: WITOM.WorkItemType) => {
            this._sharedParameterWorkItemType = wit;
        }, projectId);
    }

    public static beginGetDefaultWorkItemTypeInfoForSharedParameterCategory(callback: IResultCallback, projectId?: string) {
        Diag.logVerbose("[beginGetDefaultWorkItemTypeInfoForSharedParameterCategory] Getting default work item type for Shared Parameter");
        WorkItemUtils.getDefaultWorkItemTypeInfoForWorkItemCategory(TestsOM.WorkItemCategories.ParameterSet, callback, projectId);
    }

    public createSharedParameter(title: string,
        parametersName: string[],
        parameterValues: Array<{ [index: string]: string; }>,
        testCase: TestsOM.TestCase,
        teamId: string,
        callback: IResultCallback, errorCallback?: IErrorCallback) {
        Diag.logVerbose("[createSharedParameter] Creating Shared Parameter");
        if (this._sharedParameterWorkItemType) {
            this._createSharedParameter(title, parametersName, parameterValues, testCase, teamId, callback, errorCallback);
        }
        else {
            SharedParameterCreationHelper.beginGetDefaultWorkItemTypeInfoForSharedParameterCategory((wit: WITOM.WorkItemType) => {
                this._sharedParameterWorkItemType = wit;
                this._createSharedParameter(title, parametersName, parameterValues, testCase, teamId, callback, errorCallback);
            }, this._projectId);
        }

        TS.TelemetryService.publishEvents(TS.TelemetryService.featureAddParameterSet, {});
    }

    private _createSharedParameter(title: string,
        parametersName: string[],
        parameterValues: Array<{ [index: string]: string; }>,
        testCase: TestsOM.TestCase,
        teamId: string,
        callback: IResultCallback,
        errorCallback?: IErrorCallback) {
        let witStore: WITOM.WorkItemStore = WorkItemUtils.getWorkItemStore(),
            workItem: WITOM.WorkItem = WorkItemManager.get(witStore).createWorkItem(this._sharedParameterWorkItemType);

        Diag.Debug.assertIsNotNull(workItem);

        // Set Title
        workItem.setFieldValue(WITConstants.CoreFieldRefNames.Title, title);
        // Add parameter data
        this._addParametersData(workItem, parametersName, parameterValues);
        // Set Area Path and Iteration
        if (testCase) {
            WorkItemUtils.setAreaAndIterationPaths(workItem, testCase.getWorkItemWrapper().getFieldValue(WITConstants.CoreFieldRefNames.AreaPath),
                testCase.getWorkItemWrapper().getFieldValue(WITConstants.CoreFieldRefNames.IterationPath));
            this._saveSharedStep(workItem, callback, errorCallback);
        } else {
            WorkItemUtils.beginGetTeamSettingsDataWithTeamId(teamId, (teamSettings) => {
                WorkItemUtils.setAreaAndIterationPaths(workItem, teamSettings.getDefaultArea(), teamSettings.getDefaultIteration());
                this._saveSharedStep(workItem, callback, errorCallback);
            }, errorCallback);

        }
    }

    private _saveSharedStep(sharedStep: WITOM.WorkItem, callback: IResultCallback, errorCallback?: IErrorCallback): void {
        sharedStep.beginSave((workItems: any) => { callback(workItems["workItems"][0]); }, errorCallback);
    }

    private _addParametersData(sharedParameter: WITOM.WorkItem, parametersName: string[], parameterValues: Array<{ [index: string]: string; }>) {
        let sharedParameterData: TestsOM.SharedParameterData = new TestsOM.SharedParameterData(),
            rowId: number = 1,
            sharedParameterDataSet: TestsOM.SharedParameterDataSet;
        Diag.logVerbose("[_addParametersData] Adding parameter values to shared parameter work item");
        parameterValues.forEach((row) => {
            let parameterValues: string[] = [];
            parametersName.forEach((parameter) => {
                parameterValues.push(row[parameter]);
            });
            sharedParameterData.addParameterRow(parametersName, parameterValues, ++rowId);
        });
        sharedParameterDataSet = new TestsOM.SharedParameterDataSet(parametersName, sharedParameterData);
        sharedParameter.setFieldValue(TCMConstants.WorkItemFieldNames.Parameters, sharedParameterDataSet.getXML());
    }
}

export class TestCaseCategoryUtils {

    public static getAllWorkItemTypeForTestCaseCategory(callback: (workItemTypeName: string[]) => any, errorCallback?: IErrorCallback, projectId?: string) {
        WorkItemUtils.getAllWorkItemTypeNamesForCategory(TestsOM.WorkItemCategories.TestCase, callback, errorCallback, projectId);
    }

    public static getAllTestCaseCategoryWorkItemFields(callback: IResultCallback, errorCallback?: IErrorCallback) {
        let store,
            fieldHash = {},
            fields = [],
            tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

        let getFieldsForWits = (wits: WITOM.WorkItemType[]) => {
            $.each(wits, (index, wit) => {
                $.each(wit.fields, (index, field) => {
                    if (!fieldHash[field.name]) { // We dont want duplicate fields so dont add it if its already in the map
                        fieldHash[field.name] = true;
                        fields.push(field);
                    }
                });
            });

            callback(fields);
        };

        let handleError = (error: TfsError) => {
            if ($.isFunction(errorCallback)) {
                errorCallback(error);
            }
        };

        WorkItemUtils.getWorkItemStore().beginGetProject(tfsContext.navigation.project, (project) => {
            TestCaseCategoryUtils.getAllWorkItemTypeForTestCaseCategory((witNames) => {
                project.beginGetWorkItemTypes(witNames, getFieldsForWits, handleError);
            }, handleError, project.guid);
        });
    }

    public static getDefaultWorkItemTypeInfoForTestCaseCategory(callback: IResultCallback) {
        WorkItemUtils.getDefaultWorkItemTypeInfoForWorkItemCategory(TestsOM.WorkItemCategories.TestCase, callback);
    }
}

export class PlanCreationHelper {
    private _areaPathsData: any;
    private _iterationsData: any;
    private _teamSettingsData: TestsOM.TeamSettingsData;

    constructor() {
    }

    public invalidate() {
        this._areaPathsData = null;
        this._iterationsData = null;
        this._teamSettingsData = null;
    }

    public beginGetAreaPathsData(callback?: IResultCallback, errorCallback?: IErrorCallback) {
        let witStore;

        if (this._areaPathsData) {
            if (callback) {
                callback(this._areaPathsData);
            }
            return;
        }

        witStore = WorkItemUtils.getWorkItemStore();
        witStore.beginGetProject(TFS_Host_TfsContext.TfsContext.getDefault().navigation.projectId, (project: WITOM.Project) => {
            project.nodesCacheManager.beginGetNodes().then(() => {
                this._areaPathsData = project.nodesCacheManager.getAreaNode(true);
                if (callback) {
                    callback(this._areaPathsData);
                }
            }, errorCallback);

        });
    }

    public beginGetTeamSettingsData(callback?: IResultCallback, errorCallback?: IErrorCallback) {
        if (this._teamSettingsData) {
            if (callback) {
                callback(this._teamSettingsData);
            }
        } else {
            WorkItemUtils.beginGetTeamSettingsData((teamSettingsData) => {
                this._teamSettingsData = teamSettingsData;
                if (callback) {
                    callback(teamSettingsData);

                }
            }, errorCallback);
        }
    }

    public areaPathIncludedInTeam(areaPath: string) {
        let included: boolean = false,
            areas: any[],
            i: number,
            totalAreasInTeam: number;

        if (this._teamSettingsData) {
            areas = this._teamSettingsData.getAreas();

            if ($.isArray(areas)) {
                totalAreasInTeam = areas.length;
                for (i = 0; i < totalAreasInTeam; i++) {
                    if (areas[i].includeChildren) {
                        if (Utils_String.startsWith(areaPath, areas[i].value)) {
                            included = true;
                        }
                    }
                    else {
                        if (Utils_String.localeIgnoreCaseComparer(areas[i].value, areaPath) === 0) {
                            included = true;
                        }
                    }
                }
            }
        }

        return included;
    }

    public beginGetIterationsData(callback?: IResultCallback, errorCallback?: IErrorCallback) {
        if (this._iterationsData) {
            if (callback) {
                callback(this._iterationsData);
            }

            return;
        }

        this._beginGetIterations((data) => {
            this._iterationsData = data;

            if (callback) {
                callback(this._iterationsData);
            }
        },
            errorCallback);
    }

    public getIterationDates(iterationName: string) {
        if (!iterationName || !this._iterationsData) {
            return new TestsOM.IterationDates(null, null);
        }
        let CssNode = TFS_Admin_AreaIterations_DataModels.CssNode,
            iterationsDataProvider = new TFS_Grid_DataAdapters.FieldDataProvider(this._iterationsData),
            node = iterationsDataProvider.getNode(iterationName),
            cssNode: TFS_Admin_AreaIterations_DataModels.CssNode,
            startDate: Date,
            endDate: Date;

        cssNode = CssNode.create(node, iterationsDataProvider);
        startDate = cssNode.getStartDate();
        endDate = cssNode.getEndDate();

        if (startDate && endDate) {
            return new TestsOM.IterationDates(Utils_Date.shiftToUTC(startDate), Utils_Date.shiftToUTC(endDate));
        }

        return new TestsOM.IterationDates(null, null);
    }

    public getIterationId(iterationName: string) {
        if (!iterationName || !this._iterationsData) {
            return;
        }
        let CssNode = TFS_Admin_AreaIterations_DataModels.CssNode,
            iterationsDataProvider = new TFS_Grid_DataAdapters.FieldDataProvider(this._iterationsData),
            node = iterationsDataProvider.getNode(iterationName),
            cssNode: TFS_Admin_AreaIterations_DataModels.CssNode;

        cssNode = CssNode.create(node, iterationsDataProvider);

        return cssNode.getId();
    }

    private _beginGetIterations(callback?: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Get project's iteration data from the Classification API controller</summary>
        let actionUrl = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl("GetIterations", "classification", { area: "api" });

        Ajax.getMSJSON(actionUrl, null, function (data) {
            callback(data);
        }, errorCallback);
    }
}

export class TestSuiteUtils {

    public static getSuiteTypeString(type: TCMConstants.TestSuiteType): string {
        let suiteTypes = TCMConstants.TestSuiteType;
        if (type === suiteTypes.StaticTestSuite) {
            return Resources.StaticSuiteTitle;
        }
        else if (type === suiteTypes.RequirementTestSuite) {
            return Resources.RequirementBasedSuiteTitle;
        }
        else if (type === suiteTypes.DynamicTestSuite) {
            return Resources.QueryBasedSuiteTitle;
        }
    }

    public static beginAddTestCasesToSuite(testCaseIds: number[],
        planId: number,
        suite: any,
        callback: IResultCallback,
        error: IErrorCallback) {

        let index = 0,
            requirementId: number,
            workItemIds: number[] = [],
            workItemId: number,
            store = WorkItemUtils.getWorkItemStore(),
            len = testCaseIds.length;

        getTestPlanManager().addTestCasesToSuite(suite.id, suite.revision, testCaseIds, (updatedSuite: TestsOM.ITestSuiteModel) => {
            if (suite.type === TCMConstants.TestSuiteType.RequirementTestSuite) {
                requirementId = suite.requirementId;

                store.beginGetWorkItems([requirementId], (workItems: WITOM.WorkItem[]) => {
                    // Link testcases to requirement.
                    TestsOM.WitLinkingHelper.linkTestCasesToRequirement(workItems[0], testCaseIds);

                    // When a test case is added to requirement based suite, invalidate the entries in the workitem manager cache so that
                    // a new version of those with updated links are fetched from server.
                    workItems[0].beginSave(() => {
                        if (callback) {
                            callback(updatedSuite);
                        }

                        let workItemManager = WorkItemManager.get(store);
                        workItemManager.invalidateCache(testCaseIds);
                        workItemManager.invalidateCache([requirementId]);
                    }, error);

                }, error);
            }
            else {
                if (callback) {
                    callback(updatedSuite);
                }
            }
        },
            error);
    }
}

export function isClickOrEnterKeyDownEvent(e: JQueryEventObject): boolean {
    if (!e) {
        return false;
    }
    if ((e.type === "keydown" && e.which === Utils_UI.KeyCode.ENTER) ||
        e.type === "click") {
        return true;
    }
    return false;
}

export function isDataCollectionEnabled(): boolean {
    return Utils_UI.BrowserCheckUtils.isChrome() || enableXtOnFirefox() || enableXtOnEdge();
}

export function enableXtOnFirefox(): boolean {
    return Utils_UI.BrowserCheckUtils.isFirefox();
}

export function enableXtOnEdge(): boolean {
    return Utils_UI.BrowserCheckUtils.isEdge() && LicenseAndFeatureFlagUtils.isEnableXtForEdgeFeatureEnabled();
}

export class ImageZoomUtil {
    private _maxZoomDimensionAllowed: number = 350;
    private _minZoomDimensionAllowed: number = 200;
    private _zoomedImageMargin: number = 20;

    private _referenceObject: JQuery;
    private _zoomDimension: number;
    private _thumbnailImageContainerSelector: string;

    constructor(refObject: JQuery, imgParentSelector: string) {
        this._referenceObject = refObject;
        this._zoomDimension = this._minZoomDimensionAllowed;
        this._thumbnailImageContainerSelector = imgParentSelector;
    }

    public initializeImageForZoom(image: HTMLImageElement) {
        let $containerElement = $(image).closest(this._thumbnailImageContainerSelector);

        $containerElement.hover((event: JQueryEventObject) => {
            return this._getSourceImage(event, $(image));
        },
            (event: JQueryEventObject) => {
                return this._handlerOut(event);
            });
    }

    private _getSourceImage(event: JQueryEventObject, $thumbnailImage: JQuery) {
        let $containerElement = $(event.currentTarget),
            thumbnailHeight = $thumbnailImage.height(),
            thumbnailWidth = $thumbnailImage.width(),
            thumbnailOffset = $thumbnailImage.offset(),
            relativeThumbnailOffsetTop = thumbnailOffset.top,
            relativeThumbnailOffsetLeft = thumbnailOffset.left,
            image = new Image(),
            imgSrc = $thumbnailImage.attr("src");

        // override the zoom dimension if applicable. Zoom dimension is based on width only
        // This is done here so that we take into account all the window resize that we do in Test Runner initialization
        this._zoomDimension = Math.min
            (Math.max(this._referenceObject.width() - 2 * this._zoomedImageMargin, this._minZoomDimensionAllowed),
            this._maxZoomDimensionAllowed);

        let zoomedImageDiv = $("<div class=\"test-step-attachment-zoomedImageDiv\"><div class=\"test-step-attachment-zoom-placeholder\">" + Resources.LoadingImageText + "</div></div>");

        $containerElement.append(zoomedImageDiv)
            .append("<div class=\"test-step-attachment-image-zoomedArea\"></div>");

        let top = relativeThumbnailOffsetTop >= (this._zoomDimension + 2 * this._zoomedImageMargin) ?
            thumbnailOffset.top - (this._zoomDimension + 2 * this._zoomedImageMargin) : thumbnailOffset.top + thumbnailHeight;

        $containerElement.find(".test-step-attachment-zoomedImageDiv").css({
            "left": 0,
            "top": top,
            "width": this._zoomDimension,
            "height": this._zoomDimension
        });

        let _onImageLoaded = (e: JQueryEventObject) => {
            this._handlerIn($(image), $thumbnailImage, $containerElement);
        };

        image.onload = _onImageLoaded;

        $(image).attr("src", imgSrc);
    }

    private _handlerIn($image: JQuery, $thumbnailImage: JQuery, $containerElement: JQuery) {
        // perform all one time calculations inside on hover (in) event
        // so as to avoid these inside on mouse move which is called multiple times
        $containerElement.find(".test-step-attachment-zoom-placeholder").replaceWith($image);

        // reset image width / height
        this._setZoomImageSize($image.width(), $image.height());

        let highlightAreaWidth = $image.width() <= this._zoomDimension ? $thumbnailImage.width() :
            ($thumbnailImage.width() * this._zoomDimension) / $image.width(),
            highlightAreaHeight = $image.height() <= this._zoomDimension ? $thumbnailImage.height() :
                ($thumbnailImage.height() * this._zoomDimension) / $image.height(),
            xRatio = Math.max($image.width(), 0) / $thumbnailImage.width(),
            yRatio = Math.max($image.height(), 0) / $thumbnailImage.height(),
            parentElement = $thumbnailImage.parent(),
            offset = $thumbnailImage.offset();

        $containerElement.find(".test-step-attachment-image-zoomedArea").css({
            "left": offset.left - parentElement.offset().left,
            "top": offset.top - parentElement.offset().top,
            "width": Math.round(highlightAreaWidth),
            "height": Math.round(highlightAreaHeight)
        });

        return $containerElement.bind("mousemove", (event: JQueryEventObject) => {
            return this._onMouseMove(event,
                $thumbnailImage,
                xRatio,
                yRatio,
                Math.round(highlightAreaHeight), Math.round(highlightAreaWidth), $(parentElement));
        });
    }

    private _handlerOut(event: JQueryEventObject) {
        $(".test-step-attachment-zoomedImageDiv").remove();
        $(".test-step-attachment-image-zoomedArea").remove();
        return $(event.currentTarget).unbind("mousemove");
    }

    private _onMouseMove(event: JQueryEventObject, $thumbnailImage: JQuery,
        xRatio: number, yRatio: number, highlightAreaHeight: number, highlightAreaWidth: number, parentElement: JQuery) {
        let $zoomedArea = $(".test-step-attachment-image-zoomedArea"),
            thumbnailOffset = $thumbnailImage.offset(),
            parentOffset = parentElement.offset(),

            highlightAreaTop = this._calculateHighlightPosition(event.pageY - thumbnailOffset.top,
                thumbnailOffset.top - parentOffset.top,
                $thumbnailImage.height(),
                highlightAreaHeight),
            highlightAreaLeft = this._calculateHighlightPosition(event.pageX - thumbnailOffset.left,
                thumbnailOffset.left - parentOffset.left,
                $thumbnailImage.width(),
                highlightAreaWidth),
            zoomedImgLeft = (highlightAreaLeft - thumbnailOffset.left + parentOffset.left) * -xRatio,
            zoomedImgTop = (highlightAreaTop - thumbnailOffset.top + parentOffset.top) * -yRatio;

        $(".test-step-attachment-image-zoomedArea").css({
            "left": highlightAreaLeft,
            "top": highlightAreaTop
        });

        return $(".test-step-attachment-zoomedImageDiv img").css({
            "left": zoomedImgLeft,
            "top": zoomedImgTop
        });
    }

    private _setZoomImageSize(width: number, height: number) {
        let zoomHeight = height,
            zoomWidth = width;

        if (width < height) {
            if (width < this._zoomDimension) {
                zoomWidth = this._zoomDimension;
                zoomHeight = (this._zoomDimension * height) / width;
            }
        }
        else {
            if (height < this._zoomDimension) {
                zoomHeight = this._zoomDimension;
                zoomWidth = (this._zoomDimension * width) / height;
            }
        }

        $(".test-step-attachment-zoomedImageDiv img").css({
            "width": zoomWidth,
            "height": zoomHeight
        });
    }

    private _calculateHighlightPosition(currentPos: number,
        adjustDimension: number,
        referenceDimension: number,
        highlightDimension: number) {
        let highlightPos = Math.min(Math.max(currentPos - (highlightDimension / 2), 0), referenceDimension - highlightDimension);

        return highlightPos + adjustDimension;
    }
}

//Use this class only in ATDT and not in main line scenario
//DON'T use this function unless you have changed the license version of TestManagement service version XML.
export class ATDTValidationUtil {
    public static IsDataTierUpdated(successCallBack: IResultCallback, errorCallBack: IErrorCallback): void {
        let apiLocation: string,
            action: string;

        apiLocation = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl("IsDataTierUpdated", "testManagement", { area: "api" });
        Ajax.getMSJSON(apiLocation, {}, successCallBack, errorCallBack);
    }

    public static TestManagementExportLatestOutcomeFeatureEnabled(): boolean {
        return LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled();
    }
}

export class TcmPerfScenarios {
    public static Area = "TestManagement";

    public static GotoTestHub = "VSO.TFS.TCM.GotoTestHub";
    public static LoadManualTests = "VSO.TFS.TCM.LoadManualTests";

    public static LoadTestPlans = TcmPerfScenarios.GotoTestHub + ".LoadTestPlans";
    public static AllPlansLoaded = TcmPerfScenarios.GotoTestHub + ".AllPlansLoaded";
    public static AllSuitesLoadedForPlan = TcmPerfScenarios.GotoTestHub + ".AllSuitesLoadedForPlan";

    public static LoadManualTestsPerfMarkerClass = "load-manual-tests-perf-marker";

    public static GotoRecentExploratorySessions = "VSO.TFS.TCM.GotoRecentExploratorySessions";
    public static QueryRecentExploratorySessions = "VSO.TFS.TCM.QueryRecentExploratorySessions";
    public static LoadExploratorySessionHeaderCharts = TcmPerfScenarios.GotoRecentExploratorySessions + ".LoadHeaderCharts";
    public static LoadExploratorySessionGridData = TcmPerfScenarios.GotoRecentExploratorySessions + ".LoadGridData";
    public static LoadTestPlansMine = "VSO.TFS.TRA.LoadTestPlans.Mine";
    public static LoadTestPlansAll = "VSO.TFS.TRA.LoadTestPlans.All";
    public static FetchTestPlansMetadata = "VSO.TFS.TRA.LoadTestPlans.FetchTestPlansMetadata";
    public static FetchTestPlansAllPageData = "VSO.TFS.TRA.LoadTestPlans.FetchTestPlansAllPageData";
    public static FetchTestPlansAllInitialPageData = "VSO.TFS.TRA.LoadTestPlans.FetchTestPlansAllInitialPageData";
    public static FetchTestPlansMinePageData = "VSO.TFS.TRA.LoadTestPlans.FetchTestPlansMinePageData";

    public static TestAX_FailuresReport = "VSO.TFS.TCM.TestAX_FailuresReport";
    public static TestAX_PassRateCard = "VSO.TFS.TCM.TestAX_PassRateCard";
    public static TestAX_FailedTestsCard = "VSO.TFS.TCM.TestAX_FailedTestsCard";
    public static TestAX_AggregateTrendChart = "VSO.TFS.TCM.TestAX_AggregateTrendChart";
    public static TestAX_ResultsGrid = "VSO.TFS.TCM.TestAX_ResultsGrid";
    public static TestAX_ResultsGridElement = "VSO.TFS.TCM.TestAX_ResultsGridElement";
    public static TestAX_ResultsGridLoadMore = "VSO.TFS.TCM.TestAX_ResultsGridLoadMore";
    public static TestAX_TestInsightsReport = "VSO.TFS.TCM.TestAX_TestInsightsReport";
    public static TestAX_TestTrendChart = "VSO.TFS.TCM.TestAX_TestTrendChart";
    public static TestAX_TestHistoryGrid = "VSO.TFS.TCM.TestAX_TestHistoryGrid";
    public static TestAX_TestHistoryGridLoadMore = "VSO.TFS.TCM.TestHistoryGridLoadMore";
    public static TestAX_TestDetailsView = "VSO.TFS.TCM.TestAX_TestDetailsView";
    public static TextAX_FiltersMetaData_Branch = "VSO.TFS.TCM.TextAX_FiltersMetaData_Branch";
    public static TextAX_FiltersMetaData_Environment = "VSO.TFS.TCM.TestAX_FiltersMetaData_Environment";
    public static TextAX_FiltersMetaData_TestRun = "VSO.TFS.TCM.TestAX_FiltersMetaData_TestRun";
    public static TextAX_FiltersMetaData_Container = "VSO.TFS.TCM.TestAX_FiltersMetaData_Container";
    public static TextAX_FiltersMetaData_Owner = "VSO.TFS.TCM.TestAX_FiltersMetaData_Owner";
    public static TestAX_FiltersMetaData_ReleaseDefinition = "VSO.TFS.TCM.TestAX_FiltersMetaData_ReleaseDefinition";
    public static TestAX_FiltersMetaData_ReleaseDefinitionFromBuildArtifact = "VSO.TFS.TCM.TestAX_ReleaseDefinitionFromBuildArtifact";
}

export class TRAPerfScenarios {
    public static Area = "TestResults";

    public static BuildTestResultDetailsExtension = "ms.vss-test-web.test-result-details";
    public static TestResultsInTestTab_WithResultDetails = "VSO.TFS.TRA.TestResultsInTestTab.WithResultDetails";
    public static TestResultsInBuildTimeLine_SummaryDetails = "VSO.TFS.TRA.TestResultInBuildTimeLine_SummaryDetails";
    public static TestResultsInTestTab_NavigateResultDetails = "VSO.TFS.TRA.TestResultsInTestTab.NavigateResultDetails";
    public static TestResultsInBuild_NoResultDetails = "VSO.TFS.TRA.TestResultsInBuild.NoResultDetails";
    public static TestResultsInBuild_WithResultDetails = "VSO.TFS.TRA.TestResultsInBuild.WithResultDetails";
    public static TestResultsInBuild_NavigateResultDetails = "VSO.TFS.TRA.TestResultsInBuild.NavigateResultDetails";
    public static TestResultsInBuild_FullyLoadedView = "VSO.TFS.TRA.TestResultsInBuild.FullyLoadedView";
    public static TestResultsInBuild_PopulateResultsInGrid = "VSO.TFS.TRA.TestResultsInBuild.PopulateResultsInGrid";
    public static TestResultsInBuild_PagedResultsFetchInGrid = "VSO.TFS.TRA.TestResultsInBuild.PagedResultsFetchInGrid";
    public static TestResultsInBuild_GetGroupByDetails = TRAPerfScenarios.TestResultsInBuild_WithResultDetails + ".GetGroupByDetails";
    public static TestResultsInBuild_BeginFetchSummaryData = TRAPerfScenarios.TestResultsInBuild_NoResultDetails + ".BeginFetchSummaryData";
    public static TestResultsInBuild_EndFetchSummaryData = TRAPerfScenarios.TestResultsInBuild_NoResultDetails + ".EndFetchSummaryData";
    public static TestResultsInBuild_GetResultGroupsByBuild = "VSO.TFS.TRA.TestResultsInBuild.getResultGroupsByBuild";
    public static TestResultsInRelease_GetResultGroupsByRelease = "VSO.TFS.TRA.TestResultsInRelease.getResultGroupsByRelease";
    public static TestResultsInBuild_PopulateResultsCacheForFilter = "VSO.TFS.TRA.TestResultsInBuild.populateResultsCacheForFilter";
    public static TestResultsInBuild_FilteringUsingClientSideCache = "VSO.TFS.TRA.TestResultsInBuild.filteringUsingClientSideCache";
    public static TRA_CreateBug = "VSO.TFS.TRA.CreateBug";
    public static TRA_CreateBug_BeginGetProject = "VSO.TFS.TRA.CreateBug.BeginGetProject";
    public static TRA_CreateBug_EndGetProject = "VSO.TFS.TRA.CreateBug.EndGetProject";
    public static TRA_CreateBug_BeginGetDefaultWorkItemTypeNameForCategory = "VSO.TFS.TRA.BeginGetDefaultWorkItemTypeNameForCategory";
    public static TRA_CreateBug_EndGetDefaultWorkItemTypeNameForCategory = "VSO.TFS.TRA.EndGetDefaultWorkItemTypeNameForCategory";
    public static TRA_CreateBug_BeginGetCreateWorkItem = "VSO.TFS.TRA.CreateBug.BeginGetCreateWorkItem";
    public static TRA_CreateBug_EndCreateWorkItem = "VSO.TFS.TRA.CreateBug.EndCreateWorkItem";
    public static TRA_CreateBug_BeginPopulateWorkItem = "VSO.TFS.TRA.CreateBug.BeginPopulateWorkItem";
    public static TRA_CreateBug_ResultLinksPopulated = "VSO.TFS.TRA.CreateBug.ResultLinksPopulated";
    public static TRA_CreateBug_EndPopulateWorkItem = "VSO.TFS.TRA.CreateBug.EndPopulateWorkItem";
    public static TRA_CreateBug_BeginGetTestResults = "VSO.TFS.TRA.CreateBug.BeginGetTestResults";
    public static TRA_CreateBug_EndGetTestResults = "VSO.TFS.TRA.CreateBug.EndGetTestResults";

    public static LoadRunsHub = "VSO.TFS.TRA.LoadRunsHub";
    public static OpenTestRunSummary = "VSO.TFS.TRA.OpenTestRunSummary";
    public static OpenTestRunSummary_BeginGetTestRunDetails = "VSO.TFS.TRA.OpenTestRunSummary.BeginGetTestRunDetails";
    public static OpenTestRunSummary_EndGetTestRunDetails = "VSO.TFS.TRA.OpenTestRunSummary.EndGetTestRunDetails";
    public static OpenTestRunSummary_RunSummaryViewRendered = "VSO.TFS.TRA.OpenTestRunSummary.RunSummaryViewRendered";
    public static LoadTestResultsForARun = "VSO.TFS.TRA.LoadTestResultsForARun";
    public static OpenTestResultDetails = "VSO.TFS.TRA.OpenTestResultDetails";
    public static GetTestResultDetails = "VSO.TFS.TRA.GetTestResultDetails";
    public static Begin_GetTestResultDetailsFromServer = "VSO.TFS.TRA.Begin_GetTestResultDetailsFromServer";
    public static End_GetTestResultDetailsFromServer = "VSO.TFS.TRA.End_GetTestResultDetailsFromServer";
    public static GetTestFailureAndResolutionStates = "VSO.TFS.TRA.GetTestFailureAndResolutionStates";
    public static BeginGetTestFailureStates = "VSO.TFS.TRA.BeginGetTestFailureStates";
    public static EndGetTestFailureStates = "VSO.TFS.TRA.EndGetTestFailureStates";
    public static BeginGetTestResolutionStates = "VSO.TFS.TRA.BeginGetTestResolutionStates";
    public static EndGetTestResolutionStates = "VSO.TFS.TRA.EndGetTestResolutionStates";
    public static PopulateBugsSectionWithRecentBugsForResult = "VSO.TFS.TRA.PopulateBugsSectionWithRecentBugsForResult";
    public static GetAssociatedBugsForResult = "VSO.TFS.TRA.GetAssociatedBugsForResult";
    public static PopulateAttachmentsSectionForResult = "VSO.TFS.TRA.PopulateAttachmentsSectionForResult";
    public static PopulateLinkedRequirementsSectionForResult = "VSO.TFS.TRA.PopulateLinkedRequirementsSectionForResult";
    public static TestResultHistory = "VSO.TFS.TRA.TestResultHistory";
    public static TestResultHistory_BeginGetTestResult = TRAPerfScenarios.TestResultHistory + ".BeginGetTestResult";
    public static TestResultHistory_EndGetTestResult = TRAPerfScenarios.TestResultHistory + ".EndGetTestResult";
    public static TestResultHistory_BeginGetTestCaseHistory = TRAPerfScenarios.TestResultHistory + ".BeginGetTestCaseHistory";
    public static TestResultHistory_EndGetTestCaseHistory = TRAPerfScenarios.TestResultHistory + ".EndGetTestCaseHistory";
    public static TestResultHistory_FetchHistogramTrendReportForResult = TRAPerfScenarios.TestResultHistory + ".FetchHistogramTrendReportForResult";
    public static TestResultHistory_GotResultTrendData = TRAPerfScenarios.TestResultHistory + ".GotResultTrendData";

    public static TestResultSummary_SummaryUpdateStarted = "SummaryUpdateStarted";
    public static TestResultSummary_SummaryUpdateEnded = "SummaryUpdateEnded";
    public static TestResultGrid_GridUpdateStarted = "GridUpdateStarted";
    public static TestResultGrid_GridUpdateEnded = "GridUpdateEnded";
}

export class AccessibilityHelper {

    public static onEnterPress(element: JQuery, ignoreShiftEnter: boolean = true, action?: () => void): void {
        element.keydown((event: JQueryEventObject) => {
            let keycode = (event.keyCode) ? event.keyCode : event.which;
            if (keycode === Utils_UI.KeyCode.ENTER && !(ignoreShiftEnter && event.shiftKey)) {
                if (action) {
                    action();
                }
                else {
                    $(event.target).click();
                }
                event.preventDefault();
                return false;
            }
            return true;
        });
    }

    public static onWindowCtrlShortcut(keyCode: number, action: () => void) {
        $(window).bind("keydown", event => {
            if (Utils_UI.KeyUtils.isExclusivelyCtrl(event) && (event.keyCode === keyCode)) {
                event.preventDefault();
                action();
            }
        });
    }
}

export class DelayedExecutionHelper {

    constructor(maxRetries?: number) {
        if (maxRetries > 0) {
            this._maxRetries = maxRetries;
        }
    }

    public executeAfterLoadComplete(instance: any, action: Function): void {

        if (this._retries > 0) {
            throw new Error("Create a new instance of this class before every invocation");
        }

        this._executeAfterLoadComplete(instance, action);
    }

    private _executeAfterLoadComplete(instance: any, action: Function): void {

        let invokeFunction = false;

        if (window.performance &&
            window.performance.timing) {
            if (window.performance.timing.loadEventEnd && window.performance.timing.loadEventEnd > 0) {
                invokeFunction = true;
            }
        }
        else {
            Utils_Core.delay(instance, this._retryInterval, action);
        }

        this._retries++;
        if (this._retries > this._maxRetries || invokeFunction) {
            if (action) {
                Utils_Core.delay(instance, this._retryInterval, action);
            }
        }
        else {
            Utils_Core.delay(this, this._retryInterval, () => {
                this._executeAfterLoadComplete(instance, action);
            });
        }
    }

    private _delayFunction: Utils_Core.DelayedFunction;
    private _maxRetries = 10;
    private _retries = 0;
    private _retryInterval = 500;
}

export class CommonIdentityPickerHelper {
    public static featureFlagEnabled: boolean;

    public static getFeatureFlagState() {
        let isFeatureEnabled = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.TCMUseNewIdentityPicker);
        CommonIdentityPickerHelper.featureFlagEnabled = isFeatureEnabled;
    }
}

export class WebRunner {

    public _checkForExistingMtrWindow(): boolean {
        let isIE9: boolean = Utils_UI.BrowserCheckUtils.isLessThanOrEqualToIE9();

        if (window.sessionStorage["testRun"] && !isIE9) {
            return confirm(Resources.ExistingMTRInstanceError);
        }
        return true;
    }

    public _checkForExistingTestRunnerForVerify(): boolean {
        if (window.sessionStorage["testRun"]) {
            alert(Resources.AlertAlreadyInVerifyMode);
            return false;
        }
        return true;
    }

    public _openRunInNewWindow(testRunAndResults: any,
        seletectedTestSuite: any,
        options?: TestsOM.ITestRunnerOptions) {

        let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault(),
            testRunnerWindowSettings = this._getDefaultSettingsForTestRunWindow(),
            isResumeFlow: boolean = testRunAndResults.testPointToResume ? true : false,
            // Opens the default (Index) action of TestExecution controller in a new window.
            url = tfsContext.getActionUrl("Index", "testExecution"),
            testRunnerWindow;

        // Store the TestRun in DOM's sessionStorage so that the RunAndResult object can be passed on to the new window.
        // Store the TestSuite in DOM's sessionStorage as it will be used to associate bugs filed from web runner with Requirement based Suite
        // For each Run created a different sessionStorage is used, so the test run window has its own run object in the sessionStorage.
        // If verifyBugInfo is passed, that means the runner is being opened from verify.
        window.sessionStorage["testRun"] = JSON.stringify(testRunAndResults);
        window.sessionStorage["testSuite"] = JSON.stringify(seletectedTestSuite);
        if (options) {
            if (options.verifyBugInfo) {
                window.sessionStorage["verifyBugInfo"] = JSON.stringify(options.verifyBugInfo);
            }
            if (options.teamId) {
                window.sessionStorage["teamId"] = options.teamId;
            }
        }

        testRunnerWindow = window.open(url, "", testRunnerWindowSettings);
        TS.TelemetryService.publishEvents(TS.TelemetryService.featureLoadWebTestRunner, {});

        if (testRunnerWindow) {
            testRunnerWindow.focus();
            // The height and width passed to window.open is content height/width and not the window's height/width in case of some browsers.
            // So resize will be required for the window. But resize can't happen for Chrome because of an issue in Chrome on using window.resizeTo, so providing an initial size here too.
            this._resizeTestRunnerWindowToDefaultSize(testRunnerWindow, testRunAndResults.testRun, isResumeFlow);
        }
        else {
            // Test runner window did not open. The most possible cause could be due to a pop-up blocker. Delete the test run.
            if (!isResumeFlow) {
                this._deleteTestRun(testRunAndResults.testRun);
            }
            window.sessionStorage.removeItem("testRun");
            window.sessionStorage.removeItem("verifyBugInfo");
            window.sessionStorage.removeItem("teamId");
        }
    }

    private _getDefaultSettingsForTestRunWindow() {
        /// <summary> Returns the window settings string required for opening the new window </summary>

        // There should be no title bar and status bar on the new window.
        // The new window will be resizable and will have scrollbars when the content does not fit the size.
        // '60' is hardcoded in width because of the bug in chrome due to which the window.resize cannot be used in Chrome and there is a need to set an approprite size here itself in window.open
        // TODO : See whether it is possibel to calculate the header height of the new window so that it can be subtracted from the available screen height
        // In IE initially the window cameup in center so set the top and left as 0. And subtracted 20 from width to avoid a flicker that appears due to width cahnge when calling resize on this window.
        // Decreasing the height of the window by 1.1 times due to the bug in the EDGE.

        return "location=0,status=0,scrollbars=1,top=0,left=0,width=" + (window.screen.availWidth / 5 - 20) + ",height=" + (window.screen.availHeight / 1.1 - 60) + ",resizable=yes";
    }

    private _deleteTestRun(testRun: TestsOM.ITestRunModel) {
        let testRunManager = this._getTestRunManager();
        if (testRunManager) {
            this._testRunManager.abort(testRun, $.noop);
        }
    }

    private _resizeTestRunnerWindowToDefaultSize(testRunnerWindow: Window, testRun: TestsOM.ITestRunModel, isResumeFlow: boolean) {
        /// <summary> Resizes the test runner window to the default size. </summary>
        /// <param name="testRunnerWindow" type="Window">The window that we want to resize to the default size</param>
        let userAgent = window.navigator.userAgent.toLowerCase();

        // In Chrome there is an issue: on resizing or moving a window it minimizes and is visible only in taskbar. So for Chrome resizing should not be done.
        if (userAgent.indexOf("chrome") === -1) {
            if (testRunnerWindow) {
                try {
                    testRunnerWindow.moveTo(window.screen.width - window.screen.availWidth, 0);
                    testRunnerWindow.focus();
                }
                catch (e) { }
            }
        }
        else {
            // Here delay is required in case of Edge browser
            Utils_Core.delay(this, 3000, function () {
                if (testRunnerWindow && testRunnerWindow.outerHeight === 0 && testRunnerWindow.outerWidth === 0) {
                    // The popup has been blocked.
                    if (!isResumeFlow) {
                        this._deleteTestRun(testRun);
                    }
                    window.sessionStorage.removeItem("testRun");
                    window.sessionStorage.removeItem("verifyBugInfo");
                    window.sessionStorage.removeItem("teamId");
                }
            });
        }
    }

    private _getTestRunManager() {
        let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        if (!this._testRunManager) {
            this._testRunManager = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<TestsOM.TestRunManager>(TestsOM.TestRunManager);
        }

        return this._testRunManager;
    }

    private _testRunManager: any;
}


export enum TestPointFieldIds {
    TestPointId = 300,
    TestCaseId = 301,
    Tester = 302,
    AssignedTo = 303,
    ConfigurationId = 304,
    ConfigurationName = 305,
    Outcome = 306,
    SuiteName = 307,
    LastRunDuration = 308,
    LastRunBy = 309,
    Build = 310,
    SuiteId = 311,
    Order = 312
}


export class TestPointReferenceNames {
    public static TestPointId: string = "TCM.TestPointId";
    public static TestCaseId: string = "TCM.TestPointTestCaseId";
    public static Tester: string = "TCM.TestPointTester";
    public static AssignedTo: string = "TCM.TestPointAssignedTo";
    public static ConfigurationId: string = "TCM.TestPointConfigurationId";
    public static ConfigurationName: string = "TCM.TestPointConfigurationName";
    public static SuiteName = "TCM.TestPointSuiteName";
    public static SuiteId = "TCM.TestPointSuiteId";
    public static Outcome: string = "TCM.TestPointOutcome";
    public static LastRunDuration = "TCM.LastRunDuration";
    public static LastRunBy = "TCM.LastRunBy";
    public static Build = "TCM.Build";
    public static Order = "TCM.TestPointOrder";
}


export class TestHubColumnOption {
    public static _testPointConfigurationField = {
        id: TestPointFieldIds.ConfigurationName,
        text: Resources.TestPointGridColumnConfiguration,
        name: Resources.TestPointGridColumnConfiguration,
        refName: TestPointReferenceNames.ConfigurationName,
        isQueryable: () => {
            return true;
        }
    };

    public static _testPointSuiteNameField = {
        id: TestPointFieldIds.SuiteName,
        text: Resources.TestPointGridColumnSuiteName,
        name: Resources.TestPointGridColumnSuiteName,
        refName: TestPointReferenceNames.SuiteName,
        isQueryable: () => {
            return true;
        }
    };

    public static _testPointSuiteIdField = {
        id: TestPointFieldIds.SuiteId,
        text: Resources.TestPointGridColumnSuiteId,
        name: Resources.TestPointGridColumnSuiteId,
        refName: TestPointReferenceNames.SuiteId,
        isQueryable: () => {
            return true;
        }
    };

    public static _testPointLastRunByField = {
        id: TestPointFieldIds.LastRunBy,
        text: Resources.TestPointGridColumnLastRunBy,
        name: Resources.TestPointGridColumnLastRunBy,
        refName: TestPointReferenceNames.LastRunBy,
        isQueryable: () => {
            return true;
        }
    };

    public static _testPointLastRunDurationField = {
        id: TestPointFieldIds.LastRunDuration,
        text: Resources.TestPointGridColumnLastRunDuration,
        name: Resources.TestPointGridColumnLastRunDuration,
        refName: TestPointReferenceNames.LastRunDuration,
        isQueryable: () => {
            return true;
        }
    };

    public static _testPointBuildField = {
        id: TestPointFieldIds.Build,
        text: Resources.TestPointGridColumnBuild,
        name: Resources.TestPointGridColumnBuild,
        refName: TestPointReferenceNames.Build,
        isQueryable: () => {
            return true;
        }
    };

    public static _testPointTesterField = {
        id: TestPointFieldIds.Tester,
        text: Resources.TestPointGridColumnTester,
        name: Resources.TestPointGridColumnTester,
        refName: TestPointReferenceNames.Tester,
        isQueryable: () => {
            return true;
        }
    };

    public static _testPointOutcomeField = {
        id: TestPointFieldIds.Outcome,
        text: Resources.TestPointGridColumnOutcome,
        name: Resources.TestPointGridColumnOutcome,
        refName: TestPointReferenceNames.Outcome,
        isQueryable: () => {
            return true;
        }
    };

    public static _testPointOrderField = {
        id: TestPointFieldIds.Order,
        text: Resources.TestPointGridColumnOrder,
        name: Resources.TestPointGridColumnOrder,
        refName: TestPointReferenceNames.Order,
        isQueryable: () => {
            return true;
        }
    };

}

export class DateUtils {

    // sometime for Date  = 01/01/0001 , date.getTime() shows -62135596800000 and -62135616600000
    // adding offset of 5 days (-62135616600000 + 432000000)
    private static DATETIME_MINDATE_UTC_MS = -62135184600000;

    public static isMinDate(date: Date): boolean {
        let utcTime: number = date.getTime() - date.getTimezoneOffset() * 60000;
        return utcTime <= DateUtils.DATETIME_MINDATE_UTC_MS; // this constant is utc min date value
    }

    public static dateCompare(v1: Date, v2: Date): number {
        if (v1 && v2) {
            return v1.getTime() - v2.getTime();
        }
        else {
            return 0;
        }
    }

    /**
    * Serialized in the following format: dd.hh:min:s.ms
    *
    */
    public static convertMiliSecondsToDurationFormat(duration: number): string {
        // here duration in ms

        let msInSec: number = 1000;
        let msInMin: number = 60 * msInSec;
        let msInHr: number = 60 * msInMin;
        let msInDay: number = 24 * msInHr;

        let result: string = "";

        let days: number = 0;
        if (duration >= msInDay) {
            days = parseInt((duration / msInDay).toString());
            result = result + days + ".";
            duration = duration % msInDay;
        }

        let hours: number = 0;
        if (duration >= msInHr) {
            hours = parseInt((duration / msInHr).toString());
        }
        result = result + hours + ":";
        duration = duration % msInHr;

        let minutes: number = 0;
        if (duration >= msInMin) {
            minutes = parseInt((duration / msInMin).toString());
        }
        result = result + minutes + ":";
        duration = duration % msInMin;

        let seconds: number = 0;
        if (duration >= msInSec) {
            seconds = parseInt((duration / msInSec).toString());
        }
        result = result + seconds + ".";
        duration = duration % msInSec;

        let miliSeconds: string = "0";
        miliSeconds = duration.toString();
        result = result + miliSeconds;

        return result;
    }

}

export class ArrayUtils {
    // Utils_Array.addRange internally uses apply on push for concatinating array.
    // Apply flattens the argument list, so for long lists, the maximum stack size of function parameters exceeeds
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply
    public static addRange(array1, array2) {
        let QUANTUM = 32768;

        for (let i = 0, len = array2.length; i < len; i += QUANTUM) {
            Utils_Array.addRange(array1, array2.slice(i, Math.min(i + QUANTUM, len)));
        }
    }
}

export enum BrowserType {
    Chrome,
    Firefox,
    Edge,
    IE,
    None
}

//Resource string helper. Provides Different resource based on browser
export class BrowserResourceStringHelper {

    public static GetResourceXTMessageDialogHeadingText(): string {
        return this.GetBrowserSpecificString(Resources.XTMessageDialogHeadingText, Resources.XTFFMessageDialogHeadingText, Resources.XTEdgeMessageDialogHeadingText);
    }

    public static GetResourceXTMessageDialogExtensionDisabledText(): string {
        return this.GetBrowserSpecificString(Resources.XTMessageDialogExtensionDisabledText, Resources.XTFFMessageDialogExtensionDisabledText, Resources.XTEdgeMessageDialogExtensionDisabledText);
    }

    public static GetResourceExtensionAbsentInfo5(): string {
        return this.GetBrowserSpecificString(Resources.ExtensionAbsentInfo5Chrome, Resources.ExtensionAbsentInfo5Firefox, Resources.ExtensionAbsentInfo5Edge);
    }

    public static GetFeedbackSucceess1Image(): string {
        return this.GetBrowserSpecificString("chrome-start-feedback-success-1.png", "ff-start-feedback-success-1.png", "edge-start-feedback-success-1.png");
    }

    public static GetFeedbackSucceess2Image(): string {
        return this.GetBrowserSpecificString("chrome-start-feedback-success-2.png", "ff-start-feedback-success-2.png", "edge-start-feedback-success-2.png");
    }

    public static GetSessionInProgressImage(): string {
        return this.GetBrowserSpecificString("chrome-stop-session.png", "ff-stop-session.png", "edge-stop-session.png");
    }

    public static GetResourceBrowserIncompatibleLabel(): string {
        let isEdgeFeatureEnabled = LicenseAndFeatureFlagUtils.isEnableXtForEdgeFeatureEnabled();
        let browserIncompatibleLabel: string = Utils_String.empty;

        if (isEdgeFeatureEnabled) {
            browserIncompatibleLabel = Resources.BrowserIncompatibleLabelWithEdge;
        } else {
            browserIncompatibleLabel = Resources.BrowserIncompatibleLabelWithFirefox;
        }

        return browserIncompatibleLabel;
    }

    public static GetResourceBrowserIncompatibleInfo(): string {
        let isEdgeFeatureEnabled = LicenseAndFeatureFlagUtils.isEnableXtForEdgeFeatureEnabled();
        let browserIncompatibleInfo: string = Utils_String.empty;

        if (isEdgeFeatureEnabled) {
            browserIncompatibleInfo = Resources.BrowserIncompatibleInfoWithEdge;
        } else {
            browserIncompatibleInfo = Resources.BrowserIncompatibleInfoWithFirefox;
        }

        return browserIncompatibleInfo;
    }

    public static GetXtInstallPath(): string {
        let installPath: string = BrowserResourceStringHelper._chromeXtInstallUrl;

        if (Utils_UI.BrowserCheckUtils.isFirefox()) {
            installPath = BrowserResourceStringHelper._firefoxInstallUrl;
        }
        else if (Utils_UI.BrowserCheckUtils.isEdge()) {
            installPath = BrowserResourceStringHelper._edgeInstallUrl;
        }
        return installPath;
    }

    public static GetBrowserType(): BrowserType {

        let isChrome: boolean = Utils_UI.BrowserCheckUtils.isChrome();
        let isFirefox: boolean = Utils_UI.BrowserCheckUtils.isFirefox();
        let isEdge: boolean = Utils_UI.BrowserCheckUtils.isEdge();
        let isIE: boolean = Utils_UI.BrowserCheckUtils.isIE();

        if (isChrome) {
            return BrowserType.Chrome;
        }
        if (isFirefox) {
            return BrowserType.Firefox;
        }
        if (isEdge) {
            return BrowserType.Edge;
        }
        if (isIE) {
            return BrowserType.IE;
        }
        return BrowserType.None;
    }

    private static GetBrowserSpecificString(chromeString: string, firefoxString: string, edgeString: string): string {
        let text: string = "";
        let browser: BrowserType = BrowserResourceStringHelper.GetBrowserType();

        switch (browser) {
            case BrowserType.Chrome:
                text = chromeString;
                break;
            case BrowserType.Firefox:
                text = firefoxString;
                break;
            case BrowserType.Edge:
                text = edgeString;
                break;
            default:
                break;
        }
        return text;
    }

    private static _chromeXtInstallUrl: string = "https://aka.ms/chrome-xtinstall";
    private static _firefoxInstallUrl: string = "https://aka.ms/ffxtinstall";
    private static _edgeInstallUrl: string = "https://aka.ms/edgextinstall";

}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.TestManagement.Utils", exports);

