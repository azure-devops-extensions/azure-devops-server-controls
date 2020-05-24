import * as Q from "q";

import TCMConstants = require("Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants");
import WITControls = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");

import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");

import Diag = require("VSS/Diag");
import Utils_String = require("VSS/Utils/String");


let WITUtils = TMUtils.WorkItemUtils;
let TestCaseCategoryUtils = TMUtils.TestCaseCategoryUtils;

export class TestCaseHelper {
    /**
     * Create a new test case.
     * @param currentPlan: deptails of current plan. 
     * @param selectedSuite 
     * @param testPlanManager 
     * @param options 
     */
    public static createNewTestCase(currentPlan: any, selectedSuite: any, testPlanManager: any, options: any) {
        TestCaseSettings.instance(currentPlan, testPlanManager).then((settings: TestCaseSettings) =>
        {
            let witStore = WITUtils.getWorkItemStore();
            let workItem = WorkItemManager.get(witStore).createWorkItem(settings.getTestCaseType());
            Diag.Debug.assertIsNotNull(workItem);
            let plan = currentPlan.plan;
            if (settings.hasTestCaseTeamField())
            {
                let currentTeamFieldInfo = settings.getCurrentTeamFieldInfo();
                Diag.Debug.assertIsNotNull(currentTeamFieldInfo);
                workItem.setFieldValue(currentTeamFieldInfo.refName, currentTeamFieldInfo.value);
            }
            this._populateAreaPath(currentPlan, plan, selectedSuite, witStore, workItem);
            WITControls.WorkItemFormDialog.showWorkItem(workItem, options);
        });
    }
    
    private  static _populateAreaPath(currentPlan: any, plan: TestsOM.ITestPlanDetails, selectedSuite: TestsOM.ITestSuiteModel, witStore: WITOM.WorkItemStore, workItem: WITOM.WorkItem) {
        // For a RBS, set the test case's area path and iteration path from the requirement
        if (selectedSuite && selectedSuite.type === TCMConstants.TestSuiteType.RequirementTestSuite) {
            WorkItemManager.get(witStore).beginGetWorkItem(selectedSuite.requirementId, function (requirementWorkItem) {
                Diag.Debug.assertIsNotNull(requirementWorkItem);
                WITUtils.setAreaAndIterationPaths(workItem, requirementWorkItem.getFieldValue(WITConstants.CoreField.AreaPath), requirementWorkItem.getFieldValue(WITConstants.CoreField.IterationPath));
            });
        }
        else {
            // For static suite populate area and iteration path from the test plan.
            Diag.Debug.assertIsNotNull(plan);
            WITUtils.setAreaAndIterationPaths(workItem, plan.areaPath, plan.iteration);
        }
	}
}

// Settings cached to create a test case. In case of customization, we need to know if the team field needs to be updated 
// The cache is invalidated if we switch to a new plan
export class TestCaseSettings
{

    public static instance(currentPlan: any, testPlanManager: any): IPromise<TestCaseSettings>
    {
        if (!TestCaseSettings.s_instance || 
            !TestCaseSettings.s_instance._testcaseType ||
            !TestCaseSettings.s_instance._currentPlan ||
            !TestCaseSettings.s_instance._currentPlan.plan ||
            TestCaseSettings.s_instance._currentPlan.plan.id != currentPlan.plan.id
        )
        {
            TestCaseSettings.s_instance = new TestCaseSettings();
            return TestCaseSettings.s_instance._init(currentPlan, testPlanManager);
        } 
        else
        {
            return Q.resolve(TestCaseSettings.s_instance);
        }
    }

    public static clear()
    {
        TestCaseSettings.s_instance = null;
    }

    public getTestCaseType(): any
    {
        return this._testcaseType;
    }

    public hasTestCaseTeamField(): boolean
    {
        return this._testCaseHasTeamField;
    }
    
    public getCurrentTeamFieldInfo(): any
    {
        return this._currentTeamFieldInfo;
    }

    private _init(currentPlan: any, testPlanManager: any): IPromise<TestCaseSettings>
    {
        let deferred = Q.defer<TestCaseSettings>();
        this._currentPlan = currentPlan;
        TestCaseCategoryUtils.getDefaultWorkItemTypeInfoForTestCaseCategory((wit) => {
            this._testcaseType = wit;
            testPlanManager.getTeamFieldForTestPlans([currentPlan.plan.id], (teamFields: TestsOM.ITeamFieldModel[]) => {
                this._testCaseHasTeamField = false;
                if (teamFields && teamFields.length === 1 && teamFields[0].ownerId === this._currentPlan.plan.id) {
                    let teamFieldRefName = teamFields[0].teamFieldRefName;
                    let teamFieldValue = teamFields[0].teamFieldValue;
                    TestCaseCategoryUtils.getAllTestCaseCategoryWorkItemFields((witFields: WITOM.FieldDefinition[]) => {
                        let length: number;
                        let i: number;
                        Diag.Debug.assertIsNotNull(witFields);
                        length = witFields.length;
                        for (i = 0; i < length; i++) {
                            if (Utils_String.ignoreCaseComparer(witFields[i].referenceName, teamFieldRefName) === 0) {
                                this._currentTeamFieldInfo = new TestsOM.TeamFieldModel(teamFieldRefName, teamFieldValue, true);
                                this._testCaseHasTeamField = true;
                                break;
                            }
                        }
                         deferred.resolve(this);
                    }, (error: any) => {deferred.reject(error); });
                }
                deferred.resolve(this);
            }, (error: any) => {deferred.reject(error); });
        });
        return deferred.promise;
    }

    private static s_instance: TestCaseSettings;
    private  _testCaseHasTeamField: boolean;
    private  _currentTeamFieldInfo: any;
    private _testcaseType : any;
    private _currentPlan : any;
}
