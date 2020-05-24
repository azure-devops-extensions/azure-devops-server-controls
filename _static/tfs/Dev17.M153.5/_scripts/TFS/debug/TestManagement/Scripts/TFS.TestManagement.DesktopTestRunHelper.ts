import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import TFS_Core_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import * as Diag from "VSS/Diag";

export class DesktopTestRunConstants {
    public static getTestRunDataSuccessfulEvent = "get-test-run-data-successful-v1";
    public static errorFromRunnerEvent = "error-from-runner-v1";
    public static pageUnloadConfirmationFromRunnerEvent = "page-unload-confirmation-from-runner-v1";
    public static windowCloseResponseEvent = "window-close-response-v1";
    public static forceWindowCloseFromDtr = "force-window-close-from-runner-v1";
    public static windowCloseFromDtr = "window-close-from-runner-v1";
    public static testRunnerSignout = "test-runner-signout-v1";
    public static testRunnerResize = "test-runner-resize-v1";
    public static message = "message";
    public static stopLoading = "stop-loading";
    public static test_suite_or_testRun_error_code = "TEST_SUITE_OR_TEST_RUN_ERROR";
    public static communicationProtocolVersion = "1.0";
}

export class DesktopTestRunHelper {
    public static validateAndGetTestRunData(): IPromise<void> {
        return new Promise((resolveMainPromise, rejectMainPromise) => {
            if (!DesktopTestRunHelper.isRequestFromDtr()) {
                resolveMainPromise();
            } else {
                let testRunDataMap = {};

                //get test run data
                let getTestRunData = new Promise((resolve, reject) => {
                    DesktopTestRunHelper.createPromise(DesktopTestRunHelper.getTestRunDetailsUrl()).then((testRunData) => {
                        let testRunDataFromServer = {
                            testRun: testRunData.testRun,
                            testCaseResults: testRunData.testResults,
                            testActionResults: testRunData.testActionResults,
                            testPointToResume: null
                        };
                        testRunDataMap["testRunDataFromServer"] = testRunDataFromServer;
                        DesktopTestRunHelper.createPromise(DesktopTestRunHelper.getTestSuiteUrl(testRunData.testRun)).then((suiteData) => {
                            testRunDataMap["testSuiteDataFromServer"] = DesktopTestRunHelper.convertSuiteData(suiteData);
                            resolve()
                        }, (error) => {
                            DesktopTestRunHelper.logAndSendError(error, DesktopTestRunConstants.stopLoading, DesktopTestRunConstants.test_suite_or_testRun_error_code, "testSuiteDataFromServer");
                            reject(error);
                        })
                    }, (error) => {
                        DesktopTestRunHelper.logAndSendError(error, DesktopTestRunConstants.stopLoading, DesktopTestRunConstants.test_suite_or_testRun_error_code, "testRunDataPromise");
                        reject(error);
                    });
                })

                // get bugs data
                let getBugsData = new Promise((resolve, reject) => {
                    DesktopTestRunHelper.createPromise(DesktopTestRunHelper.bugCategoryDataUrl()).then((bugData) => {
                        testRunDataMap["BugCategory"] = DesktopTestRunHelper.getDefaultBugCategory(bugData['value']);
                        resolve();
                    }, (error) => {
                        DesktopTestRunHelper.logAndSendError(error, DesktopTestRunConstants.stopLoading, DesktopTestRunConstants.test_suite_or_testRun_error_code, "BugCategoryPromise");
                        reject(error);
                    });
                });
                Promise.all([getTestRunData, getBugsData]).then((results) => {
                    DesktopTestRunHelper.createSessionDataForTestRun(testRunDataMap);
                    resolveMainPromise();
                    window.postMessage({
                        communicationProtocolVersion: DesktopTestRunConstants.communicationProtocolVersion,
                        type: DesktopTestRunConstants.getTestRunDataSuccessfulEvent
                    }, "*");
                }, (error) => {
                    DesktopTestRunHelper.logAndSendError(error, DesktopTestRunConstants.stopLoading, DesktopTestRunConstants.test_suite_or_testRun_error_code, "intial load promises");
                }).catch((error) => {
                    DesktopTestRunHelper.logAndSendError(error, DesktopTestRunConstants.stopLoading, DesktopTestRunConstants.test_suite_or_testRun_error_code, "intial load promises");
                });
            }
        });
    }

    public static convertSuiteData(suiteData: any): any {
        if (!suiteData) {
            return {};
        }

        return {
            id: suiteData.id,
            requirementId: suiteData.requirementId ? suiteData.requirementId : 0,
            type: DesktopTestRunHelper.getSuiteTypeId(suiteData.suiteType)
        };
    }

    public static isRequestFromDtr(): boolean {
        let sessionStore;
        if (Utils_UI.BrowserCheckUtils.isLessThanOrEqualToIE9()) {
            sessionStore = window.sessionStorage;
        }
        else {
            sessionStore = window.opener.sessionStorage;
        }
        return sessionStore && sessionStore["requestFrom"] === "dtr";
    }

    public static getTestRunnerVersion(): string {
        let sessionStore = window.opener.sessionStorage;
        return sessionStore["testRunnerVersion"] ? sessionStore["testRunnerVersion"] : "";
    }

    private static logAndSendError(error: any, actionExpected: string, error_code: string, sender: string) {
        Diag.logWarning(error);
        window.postMessage({
            communicationProtocolVersion: DesktopTestRunConstants.communicationProtocolVersion,
            type: DesktopTestRunConstants.errorFromRunnerEvent,
            error: error,
            sender: sender,
            actionExpected: actionExpected,
            error_code: error_code
        }, "*");
    }

    private static getSuiteTypeId(suiteType: string): number {
        switch (suiteType) {
            case "DynamicTestSuite":
                return 1;
            case "StaticTestSuite":
                return 2;
            case "RequirementTestSuite":
                return 3;
            default:
                return 0;
        }
    }

    private static createPromise(url: string): IPromise<any> {

        return new Promise((resolve, reject) => {
            TFS_Core_Ajax.getMSJSON(url, {}, (data) => {
                resolve(data);
            }, (error) => {
                reject(error);
            })
        });
    }

    private static getTestRunDetailsUrl(): string {
        return window.sessionStorage["projectUrl"] + "_api/_testrun/GetTestRun?__v=5&testRunId=" + window.sessionStorage["runId"];
    }

    private static getTestSuiteUrl(testRun): string {
        return window.sessionStorage["projectUrl"] + "_apis/test/Plans/" + testRun.testPlanId + "/suites/" + window.sessionStorage["suiteId"];
        //"_api/_testmanagement/GetTestSuitesData?includeChildSuite=false&testSuitesId=" + window.sessionStorage["suiteId"];
    }

    private static bugCategoryDataUrl(): string {
        return window.sessionStorage["projectUrl"] + "_apis/wit/workItemTypeCategories";
    }

    private static createSessionDataForTestRun(testRunDataMap: any) {
        testRunDataMap["testRunDataFromServer"].bugCategoryName = testRunDataMap["BugCategory"];
        if (Utils_UI.BrowserCheckUtils.isLessThanOrEqualToIE9()) {
            window.sessionStorage["testRun"] = JSON.stringify(testRunDataMap["testRunDataFromServer"]);
            window.sessionStorage["testSuite"] = JSON.stringify(testRunDataMap["testSuiteDataFromServer"]);
        }
        else {
            window.opener.sessionStorage["testRun"] = JSON.stringify(testRunDataMap["testRunDataFromServer"]);
            window.opener.sessionStorage["testSuite"] = JSON.stringify(testRunDataMap["testSuiteDataFromServer"]);
        }
    }

    private static getDefaultBugCategory(categories: any) {
        let categoryName: string;
        categories.map((category: any) => {
            if (category.referenceName.includes('Microsoft.BugCategory')) {
                categoryName = category['defaultWorkItemType']['name'];
            }
        })
        return categoryName;
    }

    public static triggerSignoutFromTestRunner() {
        window.postMessage({
            communicationProtocolVersion: DesktopTestRunConstants.communicationProtocolVersion,
            type: DesktopTestRunConstants.testRunnerSignout
        }, "*");
    }

    public static testRunnerResize(bugFormPresent: boolean, width: number, height: number) {
        window.postMessage({
            communicationProtocolVersion: DesktopTestRunConstants.communicationProtocolVersion,
            type: DesktopTestRunConstants.testRunnerResize,
            bugFormPresent: bugFormPresent,
            width: width,
            height: height
        }, "*");
    }
}

export class DTRCloseEventHandler {
    public static registerForCloseEvent(callback: any) {
        function handleWindowUnloadFromDTR(event: any) {
            if (event && event.data && event.data.type && event.data.type === DesktopTestRunConstants.windowCloseFromDtr) {
                callback();
            }
        }
        window.removeEventListener("message", handleWindowUnloadFromDTR);
        window.addEventListener("message", handleWindowUnloadFromDTR);
    }

    public static registerForceCloseEvent(callback: any) {
        function handleForceWindowCloseFromDTR(event: any) {
            if (event && event.data && event.data.type && event.data.type === DesktopTestRunConstants.forceWindowCloseFromDtr) {
                callback();
                DTRCloseEventHandler.triggerCloseFromTestRunner(() => { }, true);
            }
        }
        window.removeEventListener("message", handleForceWindowCloseFromDTR);
        window.addEventListener("message", handleForceWindowCloseFromDTR);
    }

    public static triggerCloseFromTestRunner(callback: any, continueWindowClose: boolean) {
        callback();
        window.postMessage({
            communicationProtocolVersion: DesktopTestRunConstants.communicationProtocolVersion,
            type: DesktopTestRunConstants.windowCloseResponseEvent,
            continue: continueWindowClose
        }, "*");
    }

    public static triggerBeforePageUnloadConfirmation(confirmationMessage: string) {
        window.postMessage({
            communicationProtocolVersion: DesktopTestRunConstants.communicationProtocolVersion,
            type: DesktopTestRunConstants.pageUnloadConfirmationFromRunnerEvent,
            message: confirmationMessage
        }, "*");
    }
}
