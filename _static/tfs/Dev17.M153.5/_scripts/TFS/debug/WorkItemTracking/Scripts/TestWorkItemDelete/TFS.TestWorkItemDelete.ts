// Copyright (c) Microsoft Corporation.  All rights reserved.
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Q = require("q");
import Events_Services = require("VSS/Events/Services");
import Telemetry = require("VSS/Telemetry/Services");
import TCM_WebApi = require("TFS/TestManagement/RestClient");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_String = require("VSS/Utils/String");
import { RecycleBinConstants } from "WorkItemTracking/Scripts/RecycleBinConstants";
import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { WorkItemCategoryConstants } from "WorkItemTracking/Scripts/OM/WorkItemConstants";

var eventSvc = Events_Services.getService();

/**
 * Deleting test work item implications
 * @interface ITestDeleteImplications
 */
export interface ITestDeleteImplications {
    SuitesCount?: number;
    TestResultsCount?: number;
    PointCount?: number;
    TestPlanId?: number;
}

/**
 * Handler for test work item deletion
 * @class TestWorkItemDelete
 */
export class TestWorkItemDelete {
    public static beginDeleteTestWorkItem(
        ciLaunchPoint: string,
        ciSourceAreaName: string,
        workItemId: number,
        testWorkItemReferenceType: string,
        suppressFailureNotification?: boolean,
        successCallback?: () => void,
        errorCallback?: (exception: Error) => void,
        projectId?: string,
        testPlanId?: number) {

        var handleSuccess = (deletedWorkItemIds) => {
            eventSvc.fire(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, this, { refreshRequired: true, workItemIds: [workItemId], deleteFromForm: suppressFailureNotification, projectId: projectId });
            this._publish(TestWorkItemDelete._featureName, ciLaunchPoint, ciSourceAreaName, testWorkItemReferenceType, true);
            if ($.isFunction(successCallback)) {
                successCallback();
            }
        };

        var handleException = (exception) => {
            let message: string;
            if (exception && exception.serverError && Utils_String.equals(exception.serverError.typeKey, "UnauthorizedAccessException", true)) {
                message = Utils_String.format(WITResources.WorkItemDeleteError, workItemId, WITResources.TestWorkItemDeletePermissionError);
            }
            else {
                message = Utils_String.format(WITResources.WorkItemDeleteError, workItemId, exception.message);
            }
            
            exception.message = Utils_String.htmlEncode(message);

            if (!suppressFailureNotification) {
                eventSvc.fire(RecycleBinConstants.EVENT_DELETE_FAILED, TestWorkItemDelete.createDeleteErrorMessageDom(exception.message));
            }

            this._publish(TestWorkItemDelete._featureName, ciLaunchPoint, ciSourceAreaName, testWorkItemReferenceType, false);

            if ($.isFunction(errorCallback)) {
                errorCallback(exception);
            }
        }

        var invokeTestWorkItemDelete = () => {
            var invokeWorkItemDelete: () => IPromise<void>;
            switch (testWorkItemReferenceType) {
                case WorkItemCategoryConstants.TEST_PLAN:
                    invokeWorkItemDelete = () => this.deleteTestPlan(projectId, workItemId);
                    break;
                case WorkItemCategoryConstants.TEST_SUITE:
                    invokeWorkItemDelete = () => this.deleteTestSuite(projectId, testPlanId, workItemId);
                    break;
                case WorkItemCategoryConstants.TEST_CASE:
                    invokeWorkItemDelete = () => this.deleteTestCase(projectId, workItemId);
                    break;
                case WorkItemCategoryConstants.TEST_SHAREDPARAMETER:
                    invokeWorkItemDelete = () => this.deleteSharedParameter(projectId, workItemId);
                    break;
                case WorkItemCategoryConstants.TEST_SHAREDSTEP:
                    invokeWorkItemDelete = () => this.deleteSharedStep(projectId, workItemId);
                    break;
                default:
                    handleException(new Error(WITResources.InvalidTestWorkItem));
                    break;
            }

            invokeWorkItemDelete().then(() => {
                handleSuccess(workItemId);
            },
                (error) => {
                    handleException(error)
                });
        }

        // notify listeners that delete operation started
        eventSvc.fire(RecycleBinConstants.EVENT_DELETE_STARTED, { workItemIds: [workItemId], deleteFromForm: suppressFailureNotification });

        invokeTestWorkItemDelete();
    }

    public static getTestPlanAssociatedTestArtifacts(testPlanId: number, projectId: string): IPromise<ITestDeleteImplications> {
        return this._ajaxJson<ITestDeleteImplications>("QueryTestPlanAssociatedTestArtifacts", {
            testPlanId: testPlanId,
            projectId: projectId
        });
    }

    public static getTestSuiteAssociatedTestArtifacts(testSuiteId: number, projectId: string): IPromise<ITestDeleteImplications> {
        return this._ajaxJson<ITestDeleteImplications>("QueryTestSuiteAssociatedTestArtifacts", {
            testSuiteId: testSuiteId,
            projectId: projectId
        });
    }

    public static getTestCaseAssociatedTestArtifacts(testCaseId: number, projectId: string): IPromise<ITestDeleteImplications> {
        return this._ajaxJson<ITestDeleteImplications>("QueryTestCaseAssociatedTestArtifacts", {
            testCaseId: testCaseId,
            projectId: projectId
        });
    }

    public static createDeleteErrorMessageDom(deleteErrorMessage: string): JQuery {
        var $div = $("<div>");
        $div.append($("<span>").text(deleteErrorMessage + " "))
            .append($("<a>").attr("href", TestWorkItemDelete._fwlink).attr("target", "_blank").attr("rel", "noopener noreferrer")
                .text(WITResources.DeleteWorkItemDialogConfirmationTextLearnMoreLink)
                .click((e) => {
                    e.stopPropagation();
                }));
        return $div;
    }

    private static deleteTestPlan(projectNameOrId: string, testPlanId: number): IPromise<void> {
        return this._tcmClient.deleteTestPlan(projectNameOrId, testPlanId);
    }

    private static deleteTestSuite(projectNameOrId: string, testPlanId: number, testSuiteId: number): IPromise<void> {
        return this._tcmClient.deleteTestSuite(projectNameOrId, testPlanId, testSuiteId);
    }

    private static deleteTestCase(projectNameOrId: string, testCaseId: number) {
        return this._tcmClient.deleteTestCase(projectNameOrId, testCaseId);
    }

    private static deleteSharedParameter(projectNameOrId: string, sharedParameterId: number) {
        return this._tcmClient.deleteSharedParameter(projectNameOrId, sharedParameterId);
    }

    private static deleteSharedStep(projectNameOrId: string, sharedStepId: number) {
        return this._tcmClient.deleteSharedStep(projectNameOrId, sharedStepId);
    }

    private static _ajaxJson<T>(method: string, requestParams?: any, ajaxOptions?: any): IPromise<T> {
        var d = Q.defer<T>();
        Ajax.getMSJSON(this._getApiLocation(method, requestParams), requestParams, d.resolve, d.reject, ajaxOptions);
        return d.promise;
    }

    private static _getApiLocation(action?: string, requestParams?: any) {
        return TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl(action || "", TestWorkItemDelete._areaTestManagement, { area: "api", project: requestParams.projectId });
    }

    private static _publish(featureName: string, launchPoint: string, sourceArea: string, workItemType: string, succeeded?: boolean) {
        var ciData: IDictionaryStringTo<any> = {
            "LaunchPoint": launchPoint,
            "SourceArea": sourceArea,
            "WorkItemType": "[NonEmail: " + workItemType + "]",
            "Success": succeeded
        };

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            TestWorkItemDelete._areaTestManagement,
            featureName,
            ciData));
    }

    private static _tcmClient = TCM_WebApi.getClient();
    private static _areaTestManagement: string = "TestManagement";
    private static _featureName: string = "DeleteTestWorkItem";
    private static _fwlink = "https://go.microsoft.com/fwlink/?LinkId=723407";
}