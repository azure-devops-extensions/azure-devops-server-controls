import Navigation = require("VSS/Controls/Navigation");

import TCMConstants = require("Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TCMPlanSelector = require("TestManagement/Scripts/TFS.TestManagement.TestPlanSelector");
import TreeView = require("VSS/Controls/TreeView");

export class GridAreaSelectors {
    public static viewGrid = ".test-view-grid-area";
    public static editGrid = ".test-edit-grid-area";
}

export class TestPaneGridValues {
    public static paneMode_suites: string = "referencedSuites";
    public static paneMode_results: string = "resultsPane";
}

export interface TreeNodeWithOrder extends TreeView.TreeNode {
    order: number;
}

export interface Offset {
    top: number;
}

export interface DragStartInfo extends Offset {
    nodeIndex: number;
}

export interface AdjacentTreeNodeInfo {
    previousNode: TreeNodeWithOrder;
    nextNode: TreeNodeWithOrder;
}

export interface DropTargetInfo {
    position: number;
    destNode: TreeView.TreeNode;
    overlap: boolean;
}

export class TcmPerfScenarios {
    public static GotoTestHubLiteScenarioName = "VSO.TFS.TCM.GotoTestHubLite";
    public static Area = "TestManagement";
}

/**
 * Contains the properties of a test suite. 
 */
export interface ITestSuiteModel {
    id: number;
    revision: number;
    childSuiteIds: number[];
    children: ITestSuiteModel[];
    name: string;
    // Filtered/Visible points in a suite
    pointCount: number;
    suiteType: string;
    requirementId: number;
    parentSuiteId: number;
    queryText: string;
    status: string;
    //Total Points in a suite
    totalPointCount: number;
    configurations: number[];
}

/**
 * Contains the properties required for creating a query based suite. 
 */
export interface IQueryBasedSuiteCreationRequestModel extends ITestSuiteCreationRequestModel {
    queryText: string;
}

/**
 * Contains the properties required for the suite creation.
 */
export interface ITestSuiteCreationRequestModel {
    title: string;
    startIndex: number;
    parentSuiteId: number;
    parentSuiteRevision: number;
}

/**
 * Contains test pivots in tabs.
 */
export class TestPivots {
    public static TESTS: string = "tests";
    public static CHARTS: string = "charts";
    public static CONTRIBUTION: string = "contribution";
}

/**
 * Contains the work item categories names. 
 */
export class WorkItemCategories {
    public static Epic: string = "Microsoft.EpicCategory";
    public static Feature: string = "Microsoft.FeatureCategory";
    public static Requirement: string = "Microsoft.RequirementCategory";
    public static Bug: string = "Microsoft.BugCategory";
    public static TestPlan: string = "Microsoft.TestPlanCategory";
    public static TestCase: string = "Microsoft.TestCaseCategory";
    public static SharedStep: string = "Microsoft.SharedStepCategory";
    public static ParameterSet: string = "Microsoft.SharedParameterCategory";
}

/**
 * Contains the object representaion for the id and revision. 
 */
export class IdAndRevision {
    public id: number;
    public revision: number;

    constructor(id: number, revision: number) {
        this.id = id;
        this.revision = revision;
    }
}

/**
 * Contains name of the exceptions that are thrown . 
 */
export class Exceptions {
    public static TestObjectNotFoundException: string = "Microsoft.TeamFoundation.TestManagement.Server.TestObjectNotFoundException";
}

/**
 * Contains the properties of test points 
 */
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

/**
 * Contains the properties of column order. 
 */
export interface IColumnSortOrderModel {
    index: string;
    order: string;
}

/**
 * Contains the properties of column settings. 
 */
export interface IColumnSettingModel {
    refName: string;
    width: number;
}

/**
 * Contains the properties of a test point. 
 */
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

/**
 * Contains the properties of a test plan hub data. 
 */
export interface ITestPlanHubDataModel {
    testPlan: ITestPlanModel;
    testSuites: ITestSuiteModel[];
    testPoints: ITestPointModel[];
    selectedSuiteId: number;
    totalTestPoints: number;
}

/**
 * Contains the properties of a response returned by the data provider. 
 */
export interface IJsonResponse {
    testPlanHubData: ITestPlanHubDataModel;
    columnSortOrder: IColumnSortOrderModel;
    testPlanDefaultQuery: string;
    columnOptions: ITestPointGridDisplayColumn[];
    pagedColumns: ITestPointGridDisplayColumn[];
    isAdvancedTestExtensionEnabled?: boolean;
}

/**
 * Contains the properties of a test plan. 
 */
export interface ITestPlanModel {
    id: number;
    name: string;
    rootSuite: ITestSuiteModel;
    area: IArea;
    areaPath: string;
}

export interface IArea {
    name: string;
    id : string;
}

/**
 * Contains the properties of a test case. 
 */
export interface ITestCaseWithParentSuite {
    id: number;
    suiteId: number;
    suiteName: string;
}

export interface ISuiteToolbarOptions {
    refreshTestPointsForTestSuite: (suiteId: number) => void;
    refreshTestSuitesForPlan: (suiteId: number) => void;
    onError: (errorMessage: string) => void;
    setTitle: (title: string) => void;
    parentElement: JQuery;
    currentPlan: any;
    bugCategoryTypeName: string;
    hideGridView: () => boolean;
    savedColumns: ITestPointGridDisplayColumn[];
}

export interface ITestPointToolbarOptions {
    onError: (errorMessage: string) => void;
    isInitializationComplete: () => void;
    clearError: () => void;
    parentElement: JQuery;
    currentPlan: any;
    parentOptions: any;
    bugCategoryTypeName: string;
}

export interface ITestPlanFilterOptions {
    parentElement: JQuery;
    currentPlan: any;
    planSelector: TCMPlanSelector.TestPlanSelectorMenu;
    defaultTestPlanQuery: string;
    testPlanManager: any;
    onError: (errorMessage: string) => void;
    updatePage: () => void;
}

export class FilterSelectors {
    public static tester = ".tester-filter";
    public static outcome = ".testpoint-outcome-filter";
    public static configuration = ".configuration-filter";
    public static workItemPanePosition = ".work-items-pane-filter";
    public static view = ".view-filter";
    public static pane = ".pane-filter";
}

export class TestCasePaneConstants {
    public static paneViewExplorer = ".far-right-pane-view-explorer";
    public static paneListContainer = ".far-right-pane-list-container";
    public static paneCssClass = "test-details-pane-grid";

    public static testPointIconClass = "testpoint-outcome-shade icon";
    public static outcomeContainer = "outcome-container";
    public static outcomeText = "outcome-text";

    public static testOutcomeColumnText = "test-outcome-column-text";
    public static outcomeColumnName = "outcome";
    public static suiteTitleColumnName = "suiteTitle";
}

export class Constants {
    public static testManagementTestFilterBar = ".test-view-filter-bar";
    public static testManagementPointsToolbar = ".hub-pivot-toolbar";
    public static testManagementRightPane = ".test-view-right-pane";
    public static testManagementSuiteTreeSelector = ".testmanagement-suites-tree";
    public static testManagementSplitter = ".right-hub-splitter";
    public static testManagementTestCasePane = ".test-case-details-pane";
    public static testManagementWorkItemForm = ".work-item-form";
    public static planComboElementSelector = ".testmanagement-plans-combo";
    public static planFilterSelector = ".testmanagement-testplans-filter";
    public static toggleTagFilterOption = "toggle-filter";
    public static testviewRightPane = ".test-view-right-pane .leftPane";
    public static runnerTestPointCountLimit = 100;
    public static maxPageSize: number = 500;
    public static editingNodeAnchorData = "nodeAnchor";
    public static editingNodeContextMenuData = "nodeContextMenu";
    public static editingSuiteIdData = "editSuiteId";
    public static editingSuiteOldNameData = "oldName";
    public static actualTreeNodeSelector: string = ".tree-children div.node-content";
    public static DragTileClass: string = "tree-drag-tile";
    public static DragSuiteLineClass: string = "drag-suite-line";
    public static DragSuiteLineSelector: string = ".drag-suite-line";
    public static DragSuiteTileClass: string = "drag-suite-tile";
    public static DragNotDroppableClass: string = "drag-not-droppable-icon";
    public static DragNotDroppableSelector: string = ".drag-not-droppable-icon";
    public static DragDroppableClass: string = "drag-droppable";
    public static DragDroppableSelector: string = ".drag-droppable";
    public static DragSuiteNoFillIcon: string = "bowtie-icon bowtie-status-no-fill";
    public static DropScope: string = "Suite";
    public static ConflictRevisionNumber = -1;
    public static HideDTRLaunchDialogCookieName = "HideDTRLaunchDialog";
}

export let TestOutcomes = [
    Resources.TestOutcome_Blocked,
    Resources.TestOutcome_Failed,
    Resources.TestOutcome_Passed,
    Resources.TestPointState_Ready,
    Resources.TestOutcome_NotApplicable,
    Resources.TestPointState_Paused,
    Resources.TestPointState_InProgress
];

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

export class TestDetailsPaneToolbarItemIds {
    public static refreshTestDetailsPane: string = "refresh-test-details-pane-list";
    public static openTestDetailInNewTab: string = "open-test-detail-item";
}

export class Filters {
    constructor(outcomeFilter: Navigation.PivotFilter, testFilter: Navigation.PivotFilter, configurationFilter: Navigation.PivotFilter, viewFilter: Navigation.PivotFilter) {
        this.outcomeFilter = outcomeFilter;
        this.testerFilter = testFilter;
        this.configurationFilter = configurationFilter;
        this.viewFilter = viewFilter;
    }

    public outcomeFilter: Navigation.PivotFilter;
    public testerFilter: Navigation.PivotFilter;
    public configurationFilter: Navigation.PivotFilter;
    public viewFilter: Navigation.PivotFilter;
}

export class KeyboardShortcutGroups {
    public static gridGroupName: string = "grid";
    public static listGroupName: string = "list";
    public static chartsGroupName: string = "charts";
}

export class Controllers {
    public static TestPlanLiteActionName = "plans";
    public static TestHubController = "testManagement";
}

export class View {
    public static ListView = "list";
    public static GridView = "grid";
    public static ChartsView = "charts";
}

export class TestPlanAndSuitesCommandIds {
    public static newTestPlan = "new-test-plan";
    public static newSharedStep = "new-shared-step";
    public static collapse = "collapse-all";
    public static expand = "expand-all";
    public static openInClient = "open-in-client";
    public static openTestPlanOrSelectedSuite = "open-test-plan-or-selected-suite";
    public static exportHtml = "export-to-html";
    public static showTestsFromChildSuites = "show-tests-from-child-suites";
}

export class TestPlansFilterIds {
    public static TestPlansFilter = "test-plans-filter";
}

export class TestViewActions {
    public static FilterByTester: string = "filterByTester";
}
