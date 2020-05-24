
import VSS = require("VSS/VSS");
import Utils_String = require("VSS/Utils/String");
import SDK_Shim = require("VSS/SDK/Shim");
import TCMConstants = require("Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");

let DAUtils = TestsOM.DAUtils;
let TelemetryService = TCMTelemetry.TelemetryService;

(function () {
    let witTestRunMenu = {
        getMenuItems: (context) => {
            return [
                {
                    id: "wit-test-point-run-id",
                    rank: 10,
                    text: Resources.Run,
                    icon: "css://bowtie-icon bowtie-media-play-fill",
                    groupId: "execute",
                    action: (actionContext) => {
                        runTestPoint(actionContext);
                    }
                },
                {
                    id: "wit-test-point-resume-run-id",
                    rank: 20,
                    text: Resources.ResumeTestText,
                    icon: "css://bowtie-icon bowtie-play-resume-fill",
                    groupId: "execute",
                    disabled: !canResumeRun(context),
                    action: (actionContext) => {
                        resumeTestPointRun(actionContext);
                    }
                }
            ];
        }
    };

    // Fullqualified path for wit test run menu
    SDK_Shim.VSS.register("ms.vss-test-web.wit-test-point-run", witTestRunMenu);
} ());

function runTestPoint(actionContext) {
    let webRunner = new TMUtils.WebRunner();

    DAUtils.trackAction("RunTestUsingWitCard", "/Execution");
    if (webRunner._checkForExistingMtrWindow()) {

        let testPlanId = actionContext.testPlanId;
        TMUtils.getTestRunManager().CreateTestRunForTestPoints(actionContext.teamId,
            testPlanId,
            [actionContext.testPointId],
            (testRunAndResults) => {
                webRunner._openRunInNewWindow(testRunAndResults,
                    getSelectedSuite(actionContext),
                    { teamId: actionContext.teamId});
        },
            (error) => {
                if ($.isFunction(actionContext.onErrorDelegate)) {
                    actionContext.onErrorDelegate(Utils_String.format("{0} {1}", Resources.TestRunError, error.message));
                }
            });

        TelemetryService.publishEvents(TelemetryService.featureRunTestFromWitCard, {});
    }
}

function resumeTestPointRun(actionContext) {
    let webRunner = new TMUtils.WebRunner();

    DAUtils.trackAction("ResumeRunUsingWitCard", "/Execution");
    if (webRunner._checkForExistingMtrWindow()) {

        let testPlanId = actionContext.testPlanId;
        TMUtils.getTestRunManager().getTestRunForTestPoint(testPlanId, actionContext.testPointId, (testRunAndResults) => {
            testRunAndResults = TMUtils.TestCaseResultUtils.getIterationAndStepResultAttachments(testRunAndResults);
            webRunner._openRunInNewWindow(testRunAndResults,
                getSelectedSuite(actionContext),
                { teamId: actionContext.teamId });
        },
            (error) => {
                if ($.isFunction(actionContext.onErrorDelegate)) {
                    actionContext.onErrorDelegate(Utils_String.format("{0} {1}", Resources.TestRunnerStartResumeError, error.message));
                }
            });

        TelemetryService.publishEvents(TelemetryService.featureResumeRunTestFromWitCard, {});
    }
}

function getSelectedSuite(actionContext) {
    let selectedSuite = {
        id: actionContext.testSuiteId,
        requirementId: actionContext.requirementId,
        type: TCMConstants.TestSuiteType.RequirementTestSuite
    };

    return selectedSuite;
}

function canResumeRun(actionContext) {
    return actionContext.testPointOutCome === TCMConstants.TestOutcome.Paused;
}

VSS.tfsModuleLoaded("TFS.TestManagement.RunTestsContextMenu", exports);