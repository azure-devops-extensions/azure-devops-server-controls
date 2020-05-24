import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Menus = require("VSS/Controls/Menus");

import Artifacts_Constants = require("VSS/Artifacts/Constants");
import Artifacts_Services = require("VSS/Artifacts/Services");
import MenuCommandState = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.TestSuite.MenuCommandState");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TCMConstants = require("Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants");
import TCMLite = require("TestManagement/Scripts/TFS.TestManagement.Lite");
import TCMPlanSelector = require("TestManagement/Scripts/TFS.TestManagement.TestPlanSelector");
import TCMSuiteTree = require("TestManagement/Scripts/TFS.TestManagement.TestSuitesTree");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMUtilHelper = require("TestManagement/Scripts/TFS.TestManagement.TestLiteView.Utils");
import TCMShowChildSuitesHelper = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.ShowChildSuitesHelper");
import TCMTestRunHelper = require("TestManagement/Scripts/TFS.TestManagement.TestRunHelper");
import { LicenseAndFeatureFlagUtils } from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";

import Service = require("VSS/Service");
import Events_Services = require("VSS/Events/Services");
import { RecycleBinConstants } from "WorkItemTracking/Scripts/RecycleBinConstants";

import { Build } from "TFS/Build/Contracts";

import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WorkItemManager_LAZY_LOAD = require("WorkItemTracking/Scripts/OM/WorkItemManager");

import Dialogs_LAZY_LOAD = require("VSS/Controls/Dialogs");
import Events_Action_LAZY_LOAD = require("VSS/Events/Action");
import EventsHandlers_LAZY_LOAD = require("VSS/Events/Handlers");
import ExportHtml_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.HtmlDocumentGenerator");
import Menus_LAZY_LOAD = require("VSS/Controls/Menus");
import RunWithOptions_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.RunTestsWithOptions");
import RunWithOptionsHelper_LAZY_LOAD = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.RunWithOptionsHelper");
import RunWithDTRHelper_LAZY_LOAD = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.RunWithDTRHelper");
import SelectWorkItemView_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.SelectWorkItemView");
import TestAssignConfig_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.AssignConfigurationsToSuite");
import OutcomePropagation_LAZY_LOAD = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.TestOutcomePropagationHelper");
import TCMTestPlanSettingsHelper_LAZY_LOAD = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.TestPlanSettingsHelper");
import TFS_OM_Common_LAZY_LOAD = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TMControls_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.Controls");
import TMUtils_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TestsOM_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement");
import WITOM_LAZY_LOAD = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WITControls_LAZY_LOAD = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls");
import TestAssignTester_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.AssignTestersToSuite");

import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Url_LAZY_LOAD = require("VSS/Utils/Url");
import VSS = require("VSS/VSS");
import { autobind } from "OfficeFabric/Utilities";
import { TestPlanActionsCreator } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Actions/TestPlanActionsCreator";
import { TestPlan } from "TFS/TestManagement/Contracts";

let TelemetryService = TCMTelemetry.TelemetryService;
let TfsContext = TFS_Host_TfsContext.TfsContext;
let delegate = Utils_Core.delegate;
let WITUtils = TMUtils_LAZY_LOAD.WorkItemUtils;
let eventService = Service.getLocalService(Events_Services.EventService);
let LinkingUtilities = Artifacts_Services.LinkingUtilities;

export class TestSuiteToolbar {
    private _refreshTestSuitesForPlanCallback: (suiteId: number, makeEditable?: boolean, skipPointsCountRefresh?: boolean, skipPointsRefresh?: boolean) => void;
    private _refreshTestPointsForSuiteCallback: (suiteId: number) => void;
    private _onErrorCallback: (errorMessage: string) => void;
    private _setTitle: (title: string) => void;
    private _testPlanManager: TestsOM.TestPlanManager;
    private _testSuitesTree: TCMSuiteTree.TestSuitesTree;
    private _plansSelector: TCMPlanSelector.TestPlanSelectorMenu;
    private _element: JQuery;
    private _currentPlan: any;
    private _bugCategoryTypeName: string;
    private _savedColumns: TCMLite.ITestPointGridDisplayColumn[] = [];
    private _showChildSuitesHelper: TCMShowChildSuitesHelper.ShowChildSuitesHelper;
    private _assignTesterToSuite: any;
    public getTestPointsDelegate: (testPointsResponse: any) => void;
    private _editInProgress: boolean = false;
    private _hideGridView: () => boolean;
    private _testPlanSettingsHelper: TCMTestPlanSettingsHelper_LAZY_LOAD.TestPlanSettingsHelper;
    private _runWithOptionsHelper: RunWithOptionsHelper_LAZY_LOAD.RunWithOptionsHelper;
    private _runWithDTRHelper: RunWithDTRHelper_LAZY_LOAD.RunWithDTRHelper;

    constructor(options: TCMLite.ISuiteToolbarOptions) {
        this._refreshTestSuitesForPlanCallback = options.refreshTestSuitesForPlan;
        this._refreshTestPointsForSuiteCallback = options.refreshTestPointsForTestSuite;
        this._onErrorCallback = options.onError;
        this._setTitle = options.setTitle;
        this._element = options.parentElement;
        this._currentPlan = options.currentPlan;
        this._bugCategoryTypeName = options.bugCategoryTypeName;
        this._savedColumns = options.savedColumns;
        this._testPlanManager = TMUtils.getTestPlanManager();
        this._hideGridView = options.hideGridView;
        this._showChildSuitesHelper = TCMShowChildSuitesHelper.ShowChildSuitesHelper.getInstance();
        this._testSuitesTree = <TCMSuiteTree.TestSuitesTree>TCMSuiteTree.TestSuitesTree.getInstance(TCMSuiteTree.TestSuitesTree, this._element.find(TCMLite.Constants.testManagementSuiteTreeSelector));
        this._plansSelector = <TCMPlanSelector.TestPlanSelectorMenu>TCMPlanSelector.TestPlanSelectorMenu.getInstance(TCMPlanSelector.TestPlanSelectorMenu, this._element.find(TCMLite.Constants.planComboElementSelector));
    }

    public isSuiteValid(parentSuite: any) : boolean {
        if (parentSuite) {
            return true;
        }
        return false;
    }

    /**
     * Handles the execution of the suite toolbar items
     * @param command suite toolbar command
     */
    public onPlansAndSuitesMenubarItemClick(command: string) {
        let parentSuite = this._testSuitesTree.getSelectedSuite();
        parentSuite = TCMUtilHelper.TestLiteViewUtils.mapSuitesToLegacyModel(parentSuite);

        if (command === TCMLite.TestPlanAndSuitesCommandIds.expand) {
            this._testSuitesTree.expandAll();
        }
        else if (command === TCMLite.TestPlanAndSuitesCommandIds.collapse) {
            this._testSuitesTree.collapseAll();
        }
        else if (command === TCMLite.TestPlanAndSuitesCommandIds.newTestPlan) {
            this._onClickCreateNewTestPlan();
        }
        else if (command === TCMSuiteTree.NewSuiteCommandIds.newStaticSuite ||
            command === TCMSuiteTree.NewSuiteCommandIds.newRequirementSuite ||
            command === TCMSuiteTree.NewSuiteCommandIds.newQueryBasedSuite) {
            let areaPath: string = this._currentPlan.plan.areaPath;

            if (this._currentPlan.plan.area) {
                areaPath = this._currentPlan.plan.area.name;
            }
            this._createNewSuite(parentSuite, command, areaPath);
        }
        else if (command === TCMLite.TestPlanAndSuitesCommandIds.openInClient) {
            this._openTestPlanInClient();
        }
        else if (command === TCMLite.TestPlanAndSuitesCommandIds.exportHtml) {
            if (this.isSuiteValid(parentSuite)) {
                this._launchExportHtmlDialog(parentSuite);
            }
        }
        else if (command === TCMLite.TestPlanAndSuitesCommandIds.openTestPlanOrSelectedSuite) {
            if (this.isSuiteValid(parentSuite)) {
                this._openTestSuite(parentSuite);
            }
            else {
                this._openTestPlan(this._currentPlan.plan.id);
            }
        }
        else if (command === TCMLite.TestPlanAndSuitesCommandIds.showTestsFromChildSuites) {
            if (this.isSuiteValid(parentSuite)) { 
                this._showChildSuites(parentSuite.id); 
            }
        }
        else if (command === TCMLite.TestPlanAndSuitesCommandIds.newSharedStep) {
            this._createNewSharedStep();
        }
    }

    private runTestSuite(suite: any, runWithOptions: boolean, runWithDTR: boolean) {
        let that = this;
        this.getTestPointsDelegate((testPointsQueryResult: TestsOM.ITestPointQueryResultModel) => {
            // filter only the ready test points
            let filteredTestPoints: TestsOM.ITestPointModel[] = [];
            $.each(testPointsQueryResult.testPoints, (index, item: any) => {
                if (item.outcome === Resources.TestPointState_Ready) {
                    filteredTestPoints.push(item);
                }
            });

            if (filteredTestPoints.length > 0) {
                // run test points.
                if (runWithOptions) {
                    that._runTestPointsWithOptions(filteredTestPoints, suite.requirementId, parseInt(suite.suiteType) === TCMConstants.TestSuiteType.RequirementTestSuite);
                }
                else if (runWithDTR) {
                    that._runTestPointsWithDTR(filteredTestPoints, suite.requirementId, parseInt(suite.suiteType) === TCMConstants.TestSuiteType.RequirementTestSuite);
                }
                else {
                    that._runTestPoints(filteredTestPoints);
                }
            }
            else {
                confirm(Resources.NoActiveTestPointsInSuite);
            }
        });
    }

    private _runTestPoints(selectedTestPoints: TCMLite.ITestPointModel[]) {
        if (TCMTestRunHelper.TestRunHelper.areAllTestsAutomated(selectedTestPoints)) {
            TCMTestRunHelper.TestRunHelper.runAutomatedTestsUsingTestPlanSettings(
                selectedTestPoints,
                this._currentPlan.plan,
                () => {
                    this._refreshTestPointsForSuiteCallback(this._currentPlan.selectedSuiteId);
                });

            TelemetryService.publishEvents(TelemetryService.featureAutomatedRunTriggered, {});
        } else {
            // Check if the test cases can be run manually before running them
            TCMTestRunHelper.TestRunHelper.validateSelectedTestPointsforRunningManually(selectedTestPoints).then(() => {
                this._runTestPointsUsingWebRunner(selectedTestPoints);
            });
        }
    }

    private _runTestPointsUsingWebRunner(testPoints: TCMLite.ITestPointModel[], selectedBuildUri?: string) {
        TCMTestRunHelper.TestRunHelper.runTestPointsUsingWebRunner(
            testPoints,
            this._testSuitesTree.getSelectedSuite(),
            this._currentPlan.plan,
            this._bugCategoryTypeName,
            TfsContext.getDefault().currentIdentity.id,
            this._onErrorCallback,
            selectedBuildUri);
   }

   private _runTestPointsWithOptions(testPoints: TestsOM.ITestPointModel[], requirementId: number = -1, showXTRunner: boolean = false) {
       if (LicenseAndFeatureFlagUtils.isReactBasedRunWithOptionsEnabled()) {
           VSS.using(["TestManagement/Scripts/TestHubLite/TFS.TestManagement.RunWithOptionsHelper"], (
               RunWithOptionsHelperModule: typeof RunWithOptionsHelper_LAZY_LOAD
           ) => {
               if (!this._runWithOptionsHelper) {
                   this._runWithOptionsHelper = new RunWithOptionsHelperModule.RunWithOptionsHelper();
               }
               this._runWithOptionsHelper.openRunWithOptionsDialog({
                   requirementId: requirementId,
                   showXTRunner: showXTRunner,
                   testPoints: testPoints,
                   oldmtrCallBack: delegate(this, this._launchOldMtrWithOptions),
                   dtrCallBack: delegate(this, this._launchDtrWithOptions),
                   newmtrCallBack: delegate(this, this._launchNewMtrWithOptions),
                   webRunnerCallBack: delegate(this, this._launchWebRunnerWithOptions),
                   xtRunnerCallBack: delegate(this, this._launchXTRunnerWithOptions),
                   automatedTestRunnerCallBack: delegate(this, this._launchAutomatedTestRunnerWithOptions)
               });
           });
       } else {
           VSS.using(["TestManagement/Scripts/TFS.TestManagement.RunTestsWithOptions"], (
               RunWithOptionsModule: typeof RunWithOptions_LAZY_LOAD
           ) => {
               Dialogs.show(RunWithOptionsModule.RunWithOptionsDialog, {
                   requirementId: requirementId,
                   showXTRunner: showXTRunner,
                   testPoints: testPoints,
                   oldmtrCallBack: delegate(this, this._launchOldMtrWithOptions),
                   dtrCallBack: delegate(this, this._launchDtrWithOptions),
                   newmtrCallBack: delegate(this, this._launchNewMtrWithOptions),
                   webRunnerCallBack: delegate(this, this._launchWebRunnerWithOptions),
                   xtRunnerCallBack: delegate(this, this._launchXTRunnerWithOptions),
                   automatedTestRunnerCallBack: delegate(this, this._launchAutomatedTestRunnerWithOptions),
                   minWidth: 533,
                   minHeight: 542
               });
           });
       }
   }

    private _runTestPointsWithDTR(testPoints: TestsOM.ITestPointModel[], requirementId: number = -1, showXTRunner: boolean = false) {
        // Launch the DTR Dialog

        VSS.using(["TestManagement/Scripts/TestHubLite/TFS.TestManagement.RunWithDTRHelper"], (
            RunWithDTRHelperModule: typeof RunWithDTRHelper_LAZY_LOAD
        ) => {
            if (!this._runWithDTRHelper) {
                this._runWithDTRHelper = new RunWithDTRHelperModule.RunWithDTRHelper();
            }
            this._runWithDTRHelper.runWithDTR({
                requirementId: requirementId,
                showXTRunner: showXTRunner,
                dtrCallBack: delegate(this, () => {this._launchDTR(testPoints)})
            });
        });
    }

   private _launchAutomatedTestRunnerWithOptions(dialogViewModel: RunWithOptions_LAZY_LOAD.RunWithOptionsDialogViewModel) {
       TCMTestRunHelper.TestRunHelper.startValidationAndRunAutomatedTestPoints(
           dialogViewModel.testPoints,
           dialogViewModel.getSelectedBuild(),
           dialogViewModel.getSelectedReleaseDefinition(),
           dialogViewModel.getSelectedReleaseEnvironment().id,
           this._currentPlan.plan,
           () => {
               this._refreshTestPointsForSuiteCallback(this._currentPlan.selectedSuiteId);
           });

       TelemetryService.publishEvents(TelemetryService.featureAutomatedRunTriggeredFromRunWithOptions, {});
   }

   private _launchXTRunnerWithOptions(dialogViewModel: any) {
       let requirementId = dialogViewModel.getRequirementId();
       let selectedDataCollectors = dialogViewModel.getEnabledDataCollectors();
       TCMTestRunHelper.TestRunHelper.runXT(this._testSuitesTree.getSelectedSuite(), requirementId, selectedDataCollectors, this._currentPlan.plan, this._onErrorCallback);
   }

   private _launchWebRunnerWithOptions(dialogViewModel: any) {
       let selectedBuild = dialogViewModel.getBuildUri();
       let selectedPoints: TCMLite.ITestPointModel[] = dialogViewModel.testPoints;
       this._runTestPointsUsingWebRunner(selectedPoints, selectedBuild);
   }

   private _launchOldMtrWithOptions(dialogViewModel: any) {
       let selectedPoints: TCMLite.ITestPointModel[] = dialogViewModel.testPoints;
       this._runTestPointsUsingClient(selectedPoints);
   }

    private _launchNewMtrWithOptions(dialogViewModel: any) {
        this._getPointDataAndRunTestpointsUsingNewClient(dialogViewModel, false)
    }

    private _launchDtrWithOptions(dialogViewModel: any) {
        this._getPointDataAndRunTestpointsUsingNewClient(dialogViewModel, true)
    }

    private _launchDTR(testPoints: TestsOM.ITestPointModel[]) {
        // The selection of Build and data collectors should come from test settings. Have to confirm this behavior.
        let selectedBuild: string = "";
        let selectedPoints: TCMLite.ITestPointModel[] = testPoints;
        let selectedDataCollectors: string[] = [];
        this._runTestPointsUsingNewClient(selectedPoints, selectedDataCollectors, true, selectedBuild);
    }

    private _getPointDataAndRunTestpointsUsingNewClient(dialogViewModel: any, isDTR: boolean) {
        let selectedBuild: string = dialogViewModel.getBuildUri();
        let selectedPoints: TCMLite.ITestPointModel[] = dialogViewModel.testPoints;
        let selectedDataCollectors = dialogViewModel.getEnabledDataCollectors();
        this._runTestPointsUsingNewClient(selectedPoints, selectedDataCollectors, isDTR, selectedBuild);
    }

    private _runTestPointsUsingClient(testPoints: TCMLite.ITestPointModel[]) {
        TCMTestRunHelper.TestRunHelper.runTestPointsUsingClient(this._currentPlan.plan.id, testPoints);
    }

    private _runTestPointsUsingNewClient(testPoints: TCMLite.ITestPointModel[], selectedDataCollectors: any, isDTR: boolean, selectedBuildUri?: string) {
        TCMTestRunHelper.TestRunHelper.runTestPointsUsingNewClient(testPoints,
            this._testSuitesTree.getSelectedSuite(), this._currentPlan.plan, TfsContext.getDefault().currentIdentity.id, selectedBuildUri, selectedDataCollectors, isDTR, this._onErrorCallback);
    }

    /**
     * Executes upon executing a right click command from the context menu
     * @param command
     */
   public OnContextMenuItemClick(command: string, node: any) {
       let currentSelectedSuite = TCMUtilHelper.TestLiteViewUtils.mapSuitesToLegacyModel(node.suite);

        if (command === TCMSuiteTree.TestSuitesTree.TestSuitesTreeCommands.CMD_RENAME) {
            this._testSuitesTree._makeEditable(node);
        }
        else if (command === TCMSuiteTree.TestSuitesTree.TestSuitesTreeCommands.CMD_DELETE) {
            this._testSuitesTree.deleteTestSuiteDelegate(node.suite);
        }
        else if (command === TCMSuiteTree.TestSuitesTree.TestSuitesTreeCommands.CMD_DELETE_PLAN) {
            this._testSuitesTree.deleteTestPlanDelegate();
        }
        else if (command === TCMSuiteTree.TestSuitesTree.TestSuitesTreeCommands.CMD_RUN) {
            this.runTestSuite(currentSelectedSuite, false, false);
        }
        else if (command === TCMSuiteTree.TestSuitesTree.TestSuitesTreeCommands.CMD_RUN_WITH_OPTIONS) {
            this.runTestSuite(currentSelectedSuite, true, false);
        }
        else if (command === TCMSuiteTree.TestSuitesTree.TestSuitesTreeCommands.CMD_RUN_WITH_DTR) {
            this.runTestSuite(currentSelectedSuite, false, true);
        }
        else if (command === TCMSuiteTree.TestSuitesTree.TestSuitesTreeCommands.CMD_OPENINCLIENT) {
            this._openTestPlanInClient();
        }
        else if (command === TCMSuiteTree.TestSuitesTree.TestSuitesTreeCommands.CMD_EXPORT) {
            this._launchExportHtmlDialog(currentSelectedSuite);
        }
        else if (command === TCMSuiteTree.NewSuiteCommandIds.newStaticSuite ||
            command === TCMSuiteTree.NewSuiteCommandIds.newRequirementSuite ||
            command === TCMSuiteTree.NewSuiteCommandIds.newQueryBasedSuite) {

            this._createNewSuite(currentSelectedSuite, command, this._currentPlan.plan.areaPath);
        }
        else if (command === TCMSuiteTree.TestSuitesTree.TestSuitesTreeCommands.CMD_OPENPLAN) {
            this._openTestPlan(this._currentPlan.plan.id);
        }
        else if (command === TCMSuiteTree.TestSuitesTree.TestSuitesTreeCommands.CMD_OPENSUITE) {
            this._openTestSuite(node.suite);
        }
        else if (command === TCMSuiteTree.TestSuitesTree.TestSuitesTreeCommands.CMD_ASSIGN_TESTERS_TO_SUITE) {
            this._openAssignTesterToSuiteDialog(currentSelectedSuite);
        }
        else if (command === TCMSuiteTree.TestSuitesTree.TestSuitesTreeCommands.CMD_ASSIGN_CONFIGURATIONS_TO_SUITE) {
            this._assignConfigurationsToSuite(currentSelectedSuite);
        }
        else if (command === TCMSuiteTree.TestSuitesTree.TestSuitesTreeCommands.CMD_SET_TESTOUTCOME_SETTINGS) {
           this._launchTestOutcomeSettingsDialog(node);
       } if (command === TCMSuiteTree.TestSuitesTree.TestSuitesTreeCommands.CMD_SET_TEST_PLAN_SETTINGS) {
           this._launchTestPlanSettingsDialog();
       }
    }

    /**
     * Updates test suite context menu items list
     * @param menu the menu to update
     */
    public updateTestSuiteTreeContextMenuCommandStates(menu: Menus.MenuItem) {
        MenuCommandState.TestSuiteMenuCommandState.UpdateTestSuiteTreeContextMenuCommandStates(menu);
    }
    
    private _openAssignTesterToSuiteDialog(suite: TestsOM.ITestSuiteModel): void {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.AssignTestersToSuite"], (Module: typeof TestAssignTester_LAZY_LOAD) => {
            if (!this._assignTesterToSuite) {
                this._assignTesterToSuite = new Module.AssignTestersToSuite();
            }
            this._assignTesterToSuite.AssignTesters(this._currentPlan.plan.id, suite, Utils_Core.delegate(this, this._assignTesterToSuiteDialogClosed), this._onErrorCallback);

            //Adding telemetry for creating test plan workitem. Area: TestManagement, Feature: AssignTester
            TelemetryService.publishEvent(TelemetryService.featureAssignTester, TelemetryService.assignTester, 1);
        });
    }

    private _assignTesterToSuiteDialogClosed() {
        this._refreshTestPointsForSuiteCallback(this._currentPlan.selectedSuiteId);
    }
    
    private _assignConfigurationsToSuite(parentSuite: any): void {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.AssignConfigurationsToSuite"], (Module: typeof TestAssignConfig_LAZY_LOAD) => {
            let assignConfigurationToSuite = new Module.AssignConfigurationsToSuite(this._currentPlan.id, parentSuite);

            assignConfigurationToSuite.AssignConfigurations(
                (assignedConfigurations: number[], changesSaved: boolean) => {

                    // refresh test points only when changes were saved
                    if (changesSaved) {
                        parentSuite.configurations = assignedConfigurations;
                        this._refreshTestPointsForSuiteCallback(this._currentPlan.selectedSuiteId);

                        //Adding telemetry for assigning Test Configuration. Area: TestManagement, Feature: AssignTestConfiguration
                        TelemetryService.publishEvent(TelemetryService.featureAssignConfiguration, TelemetryService.assignConfiguration, 1);
                    }
                },
                (e) => {
                    this._onErrorCallback(VSS.getErrorMessage(e));
                });
        });
    }

    private _launchTestOutcomeSettingsDialog(node: any): void{
        VSS.using(["TestManagement/Scripts/TestHubLite/TFS.TestManagement.TestOutcomePropagationHelper"], (Module: typeof OutcomePropagation_LAZY_LOAD) => {
            Module.TestOutcomePropagationHelper.launchTestOutcomeSettingsDialog(node);
        });
    }

    private _launchTestPlanSettingsDialog(): void {
        VSS.using(["TestManagement/Scripts/TestHubLite/TFS.TestManagement.TestPlanSettingsHelper"], (
            TestPlanSettingsHelperModule: typeof TCMTestPlanSettingsHelper_LAZY_LOAD
        ) => {
            if (!this._testPlanSettingsHelper) {
                this._testPlanSettingsHelper = new TestPlanSettingsHelperModule.TestPlanSettingsHelper();
            }
            this._testPlanSettingsHelper.openTestPlanSettingsDialog(this._currentPlan.plan, this._element, (testPlan) => {
                if (testPlan) {
                    if (testPlan.buildDefinition) {
                        this._currentPlan.plan.buildDefinitionId = parseInt(testPlan.buildDefinition.id);
                        if (testPlan.build) {
                            this._currentPlan.plan.buildUri = LinkingUtilities.encodeUri({
                                tool: Artifacts_Constants.ToolNames.TeamBuild,
                                type: Artifacts_Constants.ArtifactTypeNames.Build,
                                id: testPlan.build.id.toString()
                            });
                        } else {
                            // Setting this to Empty if latest build is selected
                            this._currentPlan.plan.buildUri = Utils_String.empty;
                        }
                        this._currentPlan.plan.releaseEnvironmentDefinition = testPlan.releaseEnvironmentDefinition;
                        this._plansSelector.updateData(this._currentPlan.plan);
                    }
                }
            });
        });
    }

    private _showChildSuites(suiteId: number) {
        this._showChildSuitesHelper.toogleShowChildSuites();
        this._refreshTestPointsForSuiteCallback(suiteId);
    }

    private _onClickCreateNewTestPlan() {
        let shouldProceed = this._hideGridView();
        if (!shouldProceed) {
            return;
        }
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.Controls", "Presentation/Scripts/TFS/TFS.OM.Common", "TestManagement/Scripts/TFS.TestManagement.Utils", "TestManagement/Scripts/TFS.TestManagement"],
            (TMControls: typeof TMControls_LAZY_LOAD, TFS_OM_Common: typeof TFS_OM_Common_LAZY_LOAD, TMUtils: typeof TMUtils_LAZY_LOAD, TestsOM: typeof TestsOM_LAZY_LOAD) => {
                let testPlanCreationHelper = new TMUtils.PlanCreationHelper();
                TMControls.TestDialogs.createTestPlan({
                    owner: TfsContext.getDefault().currentIdentity.id,
                    planCreationHelper: testPlanCreationHelper,
                    onCreate: delegate(this._testPlanManager, this._testPlanManager.createTestPlan),
                    onSucceeded: this._onSucceed,
                    onFailed: (e) => {
                        this._onErrorCallback(VSS.getErrorMessage(e));
                        this._plansSelector.updateData(null);
                    }
                });
            });
    }

    @autobind
    private _onSucceed(plan: TCMLite.ITestPlanModel, navigateToCreatedPlan: boolean): void {
        this._plansSelector.updateData(plan, navigateToCreatedPlan);
        if (LicenseAndFeatureFlagUtils.isNewTestPlanHubExperienceEnabled() && navigateToCreatedPlan) {
            TestPlanActionsCreator.getInstance().navigateToPlan({ id: plan.id, name: plan.name } as TestPlan);
        }
    }

    private _createNewSuite(suite: TCMLite.ITestSuiteModel, command: string, areaName: string) {
        let shouldProceed = this._hideGridView();
        if (!shouldProceed) {
            return;
        }

        VSS.using(["Presentation/Scripts/TFS/TFS.OM.Common", "TestManagement/Scripts/TFS.TestManagement"]
            , (TFS_OM_Common: typeof TFS_OM_Common_LAZY_LOAD, TestsOM: typeof TestsOM_LAZY_LOAD) => {
                if (command === TCMSuiteTree.NewSuiteCommandIds.newStaticSuite) {
                    this._createNewStaticSuite(this._testPlanManager, suite);
                }
                else if (command === TCMSuiteTree.NewSuiteCommandIds.newRequirementSuite) {
                    this._createNewRequirementSuite(suite, areaName);
                }
                else if (command === TCMSuiteTree.NewSuiteCommandIds.newQueryBasedSuite) {
                    this._createNewQueryBasedSuite(suite, areaName);
                }
            });

    }

    private _createNewStaticSuite(testPlanManager: any, parentSuite: TCMLite.ITestSuiteModel) {
        let newSuiteNameIndex = this._testSuitesTree.getUniqueNameIndexInCurrentSuite(Resources.NewSuite, Resources.NewSuiteDefaultFormat),
            suiteCreationModel = {
                startIndex: newSuiteNameIndex,
                title: Resources.NewSuite,
                parentSuiteId: parentSuite.id,
                parentSuiteRevision: parentSuite.revision
            };

        if (parentSuite.suiteType === TCMConstants.TestSuiteType.StaticTestSuite.toString()) {
            testPlanManager.createStaticTestSuite(suiteCreationModel, (suiteId: number) => {
                this._refreshTestSuitesForPlanCallback(suiteId, true, true, false);

            }, (e) => {
                this._onErrorCallback(VSS.getErrorMessage(e));
            });
        }
    }

    private _createNewRequirementSuite(parentSuite: TCMLite.ITestSuiteModel, areaPath: string) {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.SelectWorkItemView", "VSS/Controls/Dialogs"], (Module: typeof SelectWorkItemView_LAZY_LOAD, DialogsModule: typeof Dialogs_LAZY_LOAD) => {
            DialogsModule.show(Module.SelectWorkItemsDialog, {
                width: $(window).width() * 0.8,
                height: $(window).height() * 0.8,
                attachResize: true,
                okText: Resources.CreateSuites,
                okCallback: (requirementIds: number[]) => {
                    this._createRequirementSuites(new TCMLite.IdAndRevision(parentSuite.id, parentSuite.revision), requirementIds);
                },
                title: Resources.CreateRequirementSuite.toLocaleUpperCase(),
                workItemCategories: [TCMLite.WorkItemCategories.Requirement, TCMLite.WorkItemCategories.Bug, TCMLite.WorkItemCategories.Feature, TCMLite.WorkItemCategories.Epic],
                hideQueryType: false,
                persistenceId: Module.PersistenceIds.ADD_REQUIREMENTS_ID,
                supportWorkItemOpen: true,
                areaPath: areaPath
            });
        });
    }

    private _createNewQueryBasedSuite(parentSuite: TCMLite.ITestSuiteModel, areaPath: string) {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.SelectWorkItemView", "TestManagement/Scripts/TFS.TestManagement", "VSS/Controls/Dialogs"], (Module: typeof SelectWorkItemView_LAZY_LOAD, TestsOM: typeof TestsOM_LAZY_LOAD, DialogsModule: typeof Dialogs_LAZY_LOAD) => {
            DialogsModule.show(Module.CreateQueryBasedSuiteDialog, {
                width: $(window).width() * 0.8,
                height: $(window).height() * 0.8,
                attachResize: true,
                okText: Resources.CreateSuite,
                okCallback: (queryName: string, queryText: string) => {
                    this._createQueryBasedSuite(parentSuite, queryName, queryText);
                },
                title: Resources.CreateQueryBasedSuiteTitle.toLocaleUpperCase(),
                workItemCategories: [TCMLite.WorkItemCategories.TestCase],
                hideQueryType: false,
                persistenceId: Module.PersistenceIds.CREATE_QUERY_BASED_SUITE_ID,
                supportWorkItemOpen: true,
                newSuiteMode: true,
                areaPath: areaPath
            });
        });
    }

    private _createQueryBasedSuite(parentSuite: TCMLite.ITestSuiteModel, queryName: string, queryText: string) {
        let newSuiteNameIndex = this._testSuitesTree.getUniqueNameIndexInCurrentSuite(queryName, Resources.NewSuiteDefaultFormat),
            suiteCreationModel: TCMLite.IQueryBasedSuiteCreationRequestModel = {
                startIndex: newSuiteNameIndex,
                title: queryName,
                parentSuiteId: parentSuite.id,
                parentSuiteRevision: parentSuite.revision,
                queryText: queryText
            };
        if (parentSuite.suiteType === TCMConstants.TestSuiteType.StaticTestSuite.toString()) {
            this._testPlanManager.createQueryBasedSuite(suiteCreationModel, (suiteId: number) => {
                if (suiteId !== 0) {
                    this._refreshTestSuitesForPlanCallback(suiteId);
                }
            },
                (e) => {
                    this._onErrorCallback(VSS.getErrorMessage(e));
                });
        }
    }

    private _createRequirementSuites(parentSuiteIdAndRevision: TCMLite.IdAndRevision, requirementIds: number[]) {
        this._testPlanManager.createRequirementSuites(parentSuiteIdAndRevision, requirementIds, (suiteId: number) => {
            if (suiteId !== 0) {
                this._refreshTestSuitesForPlanCallback(suiteId);
            }
        },
            (e) => {
                this._onErrorCallback(VSS.getErrorMessage(e));
            });
    }

    private _createNewSharedStep() {

        VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls", "WorkItemTracking/Scripts/OM/WorkItemManager"],
            (Module: typeof WITControls_LAZY_LOAD, WorkItemManager: typeof WorkItemManager_LAZY_LOAD) => {
                let TfsContext = TFS_Host_TfsContext.TfsContext.getDefault(),
                    witStore = WITUtils.getWorkItemStore();

                TMUtils.SharedStepCreationHelper.getDefaultWorkItemTypeInfoForSharedStepCategory((wit) => {

                    let workItem = WorkItemManager.WorkItemManager.get(witStore).createWorkItem(wit),
                        plan: any;

                    // populate area and iteration path from the test plan.
                    plan = this._currentPlan.plan;
                    WITUtils.setAreaAndIterationPaths(workItem, plan.areaPath, plan.iteration);

                    Module.WorkItemFormDialog.showWorkItem(workItem, {
                        close: (workItem) => {
                            if (workItem.getUniqueId() > 0) {
                                this._showSharedStepLink(workItem);

                                TelemetryService.publishEvent(TelemetryService.featureSharedSteps, TelemetryService.addSharedSteps, 1);
                            }
                        }
                    });
                });
            });
    }

    private _showSharedStepLink(sharedStep: any): void {
        let $viewElement: JQuery = this._element.find(".views"),
            $sharedStepElement: JQuery,
            $sharedStepText1: JQuery,
            $sharedStepText2: JQuery,
            $sharedStepLink: JQuery;

        $viewElement.find("div.shared-step-link").remove();

        $sharedStepElement = $("<div>").addClass("shared-step-link");

        $sharedStepText1 = $("<span>").text(sharedStep.workItemType.name);

        $sharedStepLink = $("<a>").text(Utils_String.format(" {0} ", sharedStep.getField(WITConstants.CoreFieldRefNames.Title).getValue()))
            .attr("href", "#")
            .attr("Id", "shared-step-link")
            .click(delegate(this, this._workItemLinkClick, sharedStep.id));

        $sharedStepText2 = $("<span>").text(Resources.SharedStepCreatedText.toLowerCase());
        $sharedStepElement.append($sharedStepText1);
        $sharedStepElement.append($sharedStepLink);
        $sharedStepElement.append($sharedStepText2);

        $viewElement.append($sharedStepElement);
        $viewElement.find(".shared-step-link").fadeOut(10000);
    }

    /**
     * Handles the click event of the Find button.
     */
    private _workItemLinkClick(e?: any, requirementId?: number) {
        VSS.using(["VSS/Events/Handlers"], (Events_Handlers: typeof EventsHandlers_LAZY_LOAD) => {
            Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs("open-work-item", {
                id: requirementId,
                tfsContext: TfsContext.getDefault()
            }, null));
            return false;
          });
    }

    /**
     * Opens the selected test suite
     * @param suiteId
     */
    private _openTestSuite(suite: TCMLite.ITestSuiteModel): void {
        let onTestSuiteDeletionSuccess = () => {
            this._testSuitesTree.onTestSuiteDeletion(suite.parentSuiteId, suite.id);
        };
        eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, onTestSuiteDeletionSuccess);
        eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, this._HandleFailure);

        VSS.using(["VSS/Controls/Menus", "VSS/Events/Handlers", "WorkItemTracking/Scripts/TFS.WorkItemTracking"],
            (Menus: typeof Menus_LAZY_LOAD, Events_Handlers: typeof EventsHandlers_LAZY_LOAD, WITOM: typeof WITOM_LAZY_LOAD) => {
                let testSuiteModified = false;
                Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs("open-work-item", {
                    id: suite.id,
                    tfsContext: TfsContext.getDefault(),
                    options: {
                        save: (workItem: typeof WITOM_LAZY_LOAD.WorkItem) => {
                            testSuiteModified = true;
                        },

                        close: (workItem: typeof WITOM_LAZY_LOAD.WorkItem) => {
                            eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, onTestSuiteDeletionSuccess);
                            eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, this._HandleFailure);
                            if (testSuiteModified) {
                                this._refreshTestSuitesForPlanCallback(suite.id);
                            }

                            testSuiteModified = false;
                        }
                    }
                }, null));

                //Adding telemetry for open test suite workitem. Area: TestManagement, Feature: OpenTestSuiteWIT
                TelemetryService.publishEvents(TelemetryService.featureOpenTestSuiteWIT, {});
            });
    }

    /**
     * Opens the selected test plan
     * @param planId
     */
    private _openTestPlan(planId: number): void {
        let testPlanModified = false;
        let suiteData = {};
        let suiteTotalData = {};
        let rootNode: any;
        let currentSelectedSuite: any;
        eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, this._testSuitesTree.onTestPlanDeletion);
        eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, this._HandleFailure);

        VSS.using(["VSS/Controls/Menus", "VSS/Events/Handlers", "WorkItemTracking/Scripts/TFS.WorkItemTracking"],
            (Menus: typeof Menus_LAZY_LOAD, Events_Handlers: typeof EventsHandlers_LAZY_LOAD, WITOM: typeof WITOM_LAZY_LOAD) => {
                Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs("open-work-item", {
                    id: planId,
                    tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
                    options: {
                        save: (workItem: typeof WITOM_LAZY_LOAD.WorkItem) => {
                            testPlanModified = true;
                        },

                        close: (workItem: typeof WITOM_LAZY_LOAD.WorkItem) => {
                            eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, this._testSuitesTree.onTestPlanDeletion);
                            eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, this._HandleFailure);

                            if (testPlanModified) {
                                this._testPlanManager.getTestPlansById([planId], (fetchedTestPlans: any) => {
                                    if (fetchedTestPlans && fetchedTestPlans.length === 1) {

                                        let testPlan = fetchedTestPlans[0];

                                        //Update plan in combo-box                              
                                        this._plansSelector.updateData(fetchedTestPlans[0], true, testPlan);
                                        this._plansSelector.refreshFavorites();

                                        //update rootsuite name as plan name in suite tree.
                                        rootNode = this._testSuitesTree.rootNode.children[0];
                                        rootNode.suite.title = fetchedTestPlans[0].name;
                                        suiteData[rootNode.suite.id] = rootNode.suite.pointCount;
                                        suiteTotalData[rootNode.suite.id] = rootNode.suite.totalPointCount;
                                        rootNode.suite.name = fetchedTestPlans[0].name;
                                        this._testSuitesTree.updateNodes(suiteData, suiteTotalData);

                                        //update view title if root suite selected.
                                        currentSelectedSuite = this._testSuitesTree.getSelectedSuite();
                                        if (currentSelectedSuite.id === rootNode.suite.id) {
                                            this._setTitle(Utils_String.format(Resources.TestPointsGridSuiteHeader, rootNode.suite.title, rootNode.suite.id));
                                        }
                                    }
                                });
                            }

                            testPlanModified = false;
                        }
                    }
                }, null));

                //Adding telemetry for open test plan workitem. Area: TestManagement, Feature: OpenTestPlanWIT
                TelemetryService.publishEvents(TelemetryService.featureOpenTestPlanWIT, {});
            });
    }

    private _HandleFailure(errorMessage: string) {
        this._onErrorCallback(errorMessage);
    }

    /**
     * Launch the export Html Dialog
     * @param parentSuite
     */
    private _launchExportHtmlDialog(parentSuite) {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.HtmlDocumentGenerator"], (Module: typeof ExportHtml_LAZY_LOAD) => {
            let exportHtmlWindow = new Module.HtmlDocumentGenerator({ columnOptions: this._savedColumns, plan: this._currentPlan, suiteHierarchy: this._testSuitesTree.rootNode });
            let isChildSuitesCountExceededForExportFeature = this._testSuitesTree.checkIfThresholdExceededForExportFeature();

            exportHtmlWindow.launchExportHtmlDialog(parentSuite, isChildSuitesCountExceededForExportFeature);
        });
    }

    /**
     * Open selected test plan in MTM Client
     */
    private _openTestPlanInClient() {
        VSS.using(["VSS/Utils/Url", "VSS/Events/Action"], (Utils_Url: typeof Utils_Url_LAZY_LOAD, Events_Action: typeof Events_Action_LAZY_LOAD) => {
            let clientUrl = this._getClientUri(this._currentPlan.plan.id);
            if (Utils_Url.isSafeProtocol(clientUrl)) {
                //Adding telemetry for creating test plan workitem. Area: TestManagement, Feature: OpenInMTM.
                TelemetryService.publishEvents(TelemetryService.featureOpenInMTM, {});

                Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                    url: clientUrl,
                    target: "_self"
                });
            }
        });
    }

    private _getClientUri(testPlanId: number) {
        let tfsContext = TfsContext.getDefault(),
            operation = Utils_String.format("connect?id={0}",
                testPlanId),
            clientUrl = Utils_String.format("{0}/p:{1}/{2}/{3}/{4}",
                tfsContext.navigation.collection.uri,
                tfsContext.navigation.project,
                "testing",
                "testplan",
                operation);

        return clientUrl.replace("http", "mtr");
    }
}
