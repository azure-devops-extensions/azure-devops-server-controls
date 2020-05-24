import q = require("q");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import EngagementDispatcher_NO_REQUIRE = require("Engagement/Dispatcher");
import EngagementRegistrations_NO_REQUIRE = require("TestManagement/Scripts/TFS.TestManagement.Engagement.Registrations");
import TFS_EngagementRegistrations_NO_REQUIRE = require("Presentation/Scripts/TFS/TFS.Engagement.Registrations");


import Controls = require("VSS/Controls");
import Splitter = require("VSS/Controls/Splitter");
import TCMLite = require("TestManagement/Scripts/TFS.TestManagement.Lite");
import TCMSuiteTree = require("TestManagement/Scripts/TFS.TestManagement.TestSuitesTree");
import TCMPointGrid = require("TestManagement/Scripts/TFS.TestManagement.TestPointsGrid");
import TCMPlanFilterHelper = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.PlansFilterHelper");
import TCMPlanSelector = require("TestManagement/Scripts/TFS.TestManagement.TestPlanSelector");
import TCMMenuItems = require("TestManagement/Scripts/TFS.TestManagement.MenuItem");
import TCMFilterHelper = require("TestManagement/Scripts/TFS.TestManagement.FilterHelper");
import TCMUtilHelper = require("TestManagement/Scripts/TFS.TestManagement.TestLiteView.Utils");
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");
import TCMShowChildSuitesHelper = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.ShowChildSuitesHelper");
import KeyboardShortcuts = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.KeyboardShortcutHelper");

import Navigation = require("VSS/Controls/Navigation");
import Menus = require("VSS/Controls/Menus");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import TCMConstants = require("Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants");

import EventsHandlers_LAZY_LOAD = require("VSS/Events/Handlers");
import TCMFilterBarProvider_LAZY_LOAD = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.FilterBarProvider");
import TCMBulkEditHelper_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.BulkEditHelper");
import TCMIterationHelper_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.IterationHelper");
import TCMControlsCharts_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.Controls.Charts");
import TMControls_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.Controls");
import TFS_OM_Common_LAZY_LOAD = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TMUtils_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TestPointGridToolbar_LAZY_LOAD = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.TestPointGrid.Toolbar");
import TestsOM_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement");
import TestSuiteToolbar_LAZY_LOAD = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.TestSuite.Toolbar");
import TCMPaneGrid_LAZY_LOAD = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.TestPaneGrid");
import TFS_WebSettingsService_LAZY_LOAD = require("Presentation/Scripts/TFS/TFS.WebSettingsService");
import TFS_UI_Controls_Identities_LAZY_LOAD = require("Presentation/Scripts/TFS/TFS.UI.Controls.Identities");
import TFS_UI_Tags_LAZY_LOAD = require("WorkItemTracking/Scripts/TFS.UI.Tags");
import TFS_OM_Identities_LAZY_LOAD = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import WorkItemManager_LAZY_LOAD = require("WorkItemTracking/Scripts/OM/WorkItemManager");
import TCMTelemetry_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import WITOM_LAZY_LOAD = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import TestWorkItemDeleteDialog_Async = require("WorkItemTracking/Scripts/TestWorkItemDelete/TFS.TestWorkItemDelete.Dialog");

import Navigation_Services = require("VSS/Navigation/Services");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Performance = require("VSS/Performance");
let delegate = Utils_Core.delegate;
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");

import Service = require("VSS/Service");
import VSS = require("VSS/VSS");
import Contributions_Services = require("VSS/Contributions/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import * as React from "react";
import { mountBreadcrumb } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Components/TestPlanBreadcrumb";
import { TestPlanActionsCreator } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Actions/TestPlanActionsCreator";
import { TestPlan } from "TFS/TestManagement/Contracts";
import { TestPlanStore } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Stores/TestPlanStore";

let TfsContext = TFS_Host_TfsContext.TfsContext;
let LicenseAndFeatureFlagUtils = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils;

export class TestHubView extends Navigation.NavigationView {
    private _bugCategoryTypeName: string;
    private _currentPlan: any;
    private _plansSelector: TCMPlanSelector.TestPlanSelectorMenu;
    private _testSuitesTree: TCMSuiteTree.TestSuitesTree;
    private _testPlanAndSuitesMenubar: Menus.MenuBar;
    private _testPointsToolbar: Menus.MenuBar;
    private _$toolbar: JQuery;
    private _testPointList: TCMPointGrid.TestPointsGrid;
    private _selectedPlanIdAndSuiteId: any = {};
    private _wereColumnsChanged: boolean;
    private _testPlanManager: any;
    private _$errorDiv: JQuery;
    private _newTestCaseAddedToSuite: boolean = false;
    private _testPointOutcomeFilter: Navigation.PivotFilter;
    private _testerFilter: Navigation.PivotFilter;
    private _configurationFilter: Navigation.PivotFilter;
    private _viewFilter: Navigation.PivotFilter;
    private _positionFilter: Navigation.PivotFilter;
    private _paneFilter: Navigation.PivotFilter;
    public _filterHelper: TCMFilterHelper.FilterHelper;
    private _bulkEditHelper: any;
    private _iterationHelper: any;
    private _tabs: Navigation.PivotView;
    private _selectedPivot: string;
    private _historySvc: Navigation_Services.HistoryService;
    private _testViewRightPaneGrid: any;
    public _testManagementChartsView: any;
    private _testManagementChartsInfoBar: any;
    private _testPaneHelper: any;
    private _testPointsGridToolbar: any;
    private _testKeyboardShortcutHelper: KeyboardShortcuts.KeyboardShortcutHelper;
    private _showChildSuitesHelper: TCMShowChildSuitesHelper.ShowChildSuitesHelper;
    private _testPlanDefaultQuery: string;
    private _sortOrder: TCMLite.IColumnSortOrderModel;
    private _requirementId: number;
    private _$requirementToolBar: JQuery;
    private _inEditMode: boolean;
    private previousPlanId: number;
    private _isInitializationComplete: boolean = false;
    private _store: TestPlanStore = TestPlanStore.getInstance();

    public initialize() {
        super.initialize();

        // Starting the GotoTestHubLite PERF scenario
        Performance.getScenarioManager().startScenarioFromNavigation(TCMLite.TcmPerfScenarios.Area, TCMLite.TcmPerfScenarios.GotoTestHubLiteScenarioName, true);
        this._testViewRightPaneGrid = this._element.find(TCMLite.Constants.testManagementRightPane);

        // Hiding the third pane seperator.
        let splitter = <Splitter.Splitter>Controls.Enhancement.ensureEnhancement(Splitter.Splitter, this._element.find(TCMLite.Constants.testManagementSplitter));
        splitter.noSplit();

        // Create plans drop down
        this._createPlansDropDown();

        this._createSuitesSection();
        this._createPlansAndSuitesToolbar();
        this._testPointList = <TCMPointGrid.TestPointsGrid>Controls.BaseControl.createIn(TCMPointGrid.TestPointsGrid,
            this._element.find(TCMLite.GridAreaSelectors.viewGrid), {
                contextMenu: {
                    items: delegate(this, this.getContextMenuItems),
                    updateCommandStates: delegate(this, this._updateContextMenuCommandStates),
                    executeAction: delegate(this, this._onContextMenuItemClick),
                    contributionIds: ["ms.vss-test-web.test-run-grid-menu"],
                    contextInfo: {
                        item: { getContributionContext: this.getContributionContext.bind(this, false) }
                    }
                },
                onFetchMoreData: delegate(this, this._fetchMoreTestPoints)
            });
        this._createTestPointsToolbar();
        this._testPointsToolbar.showElement();
        this._createFilters();
        this._initializeKeyBoardShortcuts();
        this._showChildSuitesHelper = new TCMShowChildSuitesHelper.ShowChildSuitesHelper(this._testPlanAndSuitesMenubar);

        this._setupNavigation();
        this._initializeEvents();
        this._initializeEngagementControls();
    }

    private _initializeEngagementControls(): void {
        let isXtPromotionQuickStartEnabled: boolean = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.QuickStartXTPromotion2, false);
        if (isXtPromotionQuickStartEnabled) {
            let tfsContext: TFS_Host_TfsContext.TfsContext = this._options.tfsContext || TfsContext.getDefault();
            if (tfsContext.isHosted) {
                VSS.using(["Engagement/Dispatcher", "TestManagement/Scripts/TFS.TestManagement.Engagement.Registrations", "Presentation/Scripts/TFS/TFS.Engagement.Registrations"], (EngagementDispatcher: typeof EngagementDispatcher_NO_REQUIRE, EngagementRegistrations: typeof EngagementRegistrations_NO_REQUIRE, TFS_EngagementRegistrations: typeof TFS_EngagementRegistrations_NO_REQUIRE) => {
                    EngagementRegistrations.registerTestManagementQuickStart();
                    EngagementRegistrations.registerXtQuickStart();
                    TFS_EngagementRegistrations.registerNewFeature();
                    EngagementDispatcher.Dispatcher.getInstance().start("TestHub");
                });
            }
        }
    }

    /**
     * Get test point grid context menu items
     */
    public getContextMenuItems(): Menus.IMenuItemSpec[] {
        return TCMMenuItems.MenuItems.getTestPointGridContextMenuItems();
    }

    private _fetchMoreTestPoints(callback?: () => void) {
        this._getTestPointGridToolbarInstance().then((testPointGridToolbar) => {
            testPointGridToolbar.fetchMoreTestPoints(callback);
        });
    }

    private _setPageHelperValue(sortedTestPointIds) {
        this._getTestPointGridToolbarInstance().then((testPointGridToolbar) => {
            testPointGridToolbar.setPageHelperValue(sortedTestPointIds);
        });
    }

    /**
     * Updates context menu items list
     * @param menu
     */
    private _updateContextMenuCommandStates(menu: Menus.MenuItem) {
        this._getTestPointGridToolbarInstance().then((testPointGridToolbar) => {
            testPointGridToolbar.UpdateTestPointGridContextMenuCommandStates(menu);
        });
    }

    /**
     * This data is passed to contributing pivot.
     */
    private _getContributionData(): any {
        let selectedSuite = this._testSuitesTree.getSelectedSuite();
        let trimmedSelectedSuite = {};
        let trimmedSelectedPlan = {};
        if (selectedSuite) {
            trimmedSelectedSuite = {
                id: selectedSuite.id,
                name: selectedSuite.name,
                parentSuiteId: selectedSuite.parentSuiteId,
                pointCount: selectedSuite.pointCount,
                queryText: selectedSuite.queryText,
                requirementId: selectedSuite.requirementId,
                revision: selectedSuite.revision,
                status: selectedSuite.status,
                suiteType: selectedSuite.suiteType
            };
        }
        if (this._currentPlan && this._currentPlan.plan) {
            trimmedSelectedPlan = {
                areaPath: this._currentPlan.plan.areaPath,
                id: this._currentPlan.plan.id,
                iteration: this._currentPlan.plan.iteration,
                name: this._currentPlan.plan.name,
                owner: this._currentPlan.plan.owner,
                revision: this._currentPlan.plan.revision,
                rootSuiteId: this._currentPlan.plan.rootSuiteId,
                text: this._currentPlan.plan.text
            };
        }
        return {
            showChildSuites: this._showChildSuitesHelper.isShowChildSuitesEnabled(),
            selectedSuite: trimmedSelectedSuite,
            selectedPlan: trimmedSelectedPlan,
            selectedColumns: this._testPointList.savedColumns
        };
    }

    /**
     * Executes upon executing a right click command from the context menu
     * @param e
     */
    private _onContextMenuItemClick(e?: any) {
        this._getTestPointGridToolbarInstance().then((testPointGridToolbar) => {
            let command = e.get_commandName();
            testPointGridToolbar.onContextMenuItemClick(command);
        });
    }

    private _initializeEvents() {
        this._testPointList._bind("selectionchanged", delegate(this, this._onTestPointSelectionChanged))
            ._bind("deletekey", delegate(this, this._onRemoveTestPoints))
            ._bind("dirtytestcaseschanged", delegate(this, this._updateTestPointsToolbarCommandStates))
            ._bind("sortOrderChanged", delegate(this, this._onSortOrderChanged));

        this._testPointList.refreshTestPointsDelegate = (testPoints: TCMLite.ITestPointModel[]) => {
            this._refreshTestPoints(testPoints);
        };
        this._testPointList.refreshSuiteOnTestDeletionDelegate = () => {
            this._refreshTheTestPointsInSuite(this._testSuitesTree.getSelectedSuite().id, false);
        };
    }

    private _onSortOrderChanged(sender: any, sortOrder: TCMLite.IColumnSortOrderModel, forceRefresh: boolean) {
        let testPoint: TCMLite.ITestPointModel;
        let that = this;
        let oldSortOrder = this._sortOrder;

        // Return if sort order is not changed.
        if (!this._isSortOrderChanged(sortOrder, oldSortOrder) && !forceRefresh) {
            return;
        }

        this._testPointList._clearGrid();

        this._testPlanManager.updateColumnSortOrder({ index: sortOrder.index, order: sortOrder.order }, () => {
            this._refreshTheTestPointsInSuite(that._testSuitesTree.getSelectedSuite().id, true);
        });
        this._sortOrder = sortOrder;
        this._testPointList.sortOrder = sortOrder;
        testPoint = this._testPointList.getSelectedTestPoint();
    }

    private _isSortOrderChanged(sortOrder: TCMLite.IColumnSortOrderModel, oldSortOrder: TCMLite.IColumnSortOrderModel): boolean {
        if (!oldSortOrder || !sortOrder) {
            return false;
        }
        if (oldSortOrder.index === sortOrder.index && oldSortOrder.order === sortOrder.order) {
            return false;
        } else {
            return true;
        }
    }

    /**
     * Setup all of the navigation events and perform the initial navigation.
     */
    private _setupNavigation() {
        if (!this._historySvc) {
            this._historySvc = Navigation_Services.getHistoryService();
        }
        let state = this._historySvc.getCurrentState();
        this._tabs = this._enhanceTestPivotView(TCMUtilHelper.TestLiteViewUtils.tabViewClass, this._selectedPivot, this._getContributionData());

        this._historySvc.attachNavigate(TCMLite.TestPivots.TESTS, (sender, state) => {
            this._navigate(TCMLite.TestPivots.TESTS, state, false);
        });

        // Attaching the navigate method for Test chart
        this._historySvc.attachNavigate(TCMLite.TestPivots.CHARTS, (sender, state) => {
            this._navigate(TCMLite.TestPivots.CHARTS, state, false);
        });

        // Attaching navigate for Contributions.
        this._historySvc.attachNavigate(TCMLite.TestPivots.CONTRIBUTION, (sender, state) => {
            this._navigate(TCMLite.TestPivots.CONTRIBUTION, state, false);
        });

        switch (state.action) {
            case TCMLite.TestPivots.CHARTS:
                this._navigate(TCMLite.TestPivots.CHARTS, state, true);
                break;
            case TCMLite.TestPivots.CONTRIBUTION:
                this._navigate(TCMLite.TestPivots.CONTRIBUTION, state, true);
                break;
            default:
                this._navigate(TCMLite.TestPivots.TESTS, state, true);
        }
    }

    private _navigate(action: string, state: any, isInitializing: boolean) {
        this._selectedPivot = action;
        this._clearContributions();
        let view;
        if (this._tabs) {
            view = this._tabs.getView(TCMLite.TestPivots.TESTS);
            if (view) {
                view.selected = (action === TCMLite.TestPivots.TESTS) ? true : false;
            }

            view = this._tabs.getView(TCMLite.TestPivots.CHARTS);
            if (view) {
                view.selected = (action === TCMLite.TestPivots.CHARTS) ? true : false;
            }

            if (isInitializing) {
                let response = this.getDataFromDataProvider();
                if (response) {
                    this._initializeTheTestPlanSuitesAndPointData(response);
                }

                this.reRegisterShortcutGroup(
                    this._selectedPivot === TCMLite.TestPivots.CHARTS ? TCMLite.KeyboardShortcutGroups.chartsGroupName : TCMLite.KeyboardShortcutGroups.listGroupName, true);

                // Ending the GotoTestHubLite PERF s()cenario
                Performance.getScenarioManager().endScenario(TCMLite.TcmPerfScenarios.Area, TCMLite.TcmPerfScenarios.GotoTestHubLiteScenarioName);
            }
            this._testSuitesTree.setSelectedSuite(Number(state.suiteId), false);
            this._loadAllTheTestPlanAndTestPointsDetails(state, isInitializing);
            if (action === TCMLite.TestPivots.CONTRIBUTION) {
                this._hideViewGrid();

                if (state && state.contributionId) {
                    view = this._tabs.getView(state.contributionId);
                    if (view) {
                        view.selected = true;
                    }
                    TCMUtilHelper.TestLiteViewUtils.displayContributedTab(state.contributionId, this._getContributionData());
                }
            } else {
                // In case of initializing try loading test plan and test suites from the data provider.
                if (isInitializing) {
                    this._delayInitializeBulkEditGrid();
                }
            }

            this._tabs.updateItems();
        }
    }

    /**
     * Enhance test pivot view, load contribution tabs if any.
     */
    private _enhanceTestPivotView(tabViewClass: string, selectedPivot: string, contributionContext): Navigation.PivotView {
        let $pivotView = $("." + tabViewClass);

        // object to create contribution link.
        let getLink = (contributionId) => {
            return this._historySvc.getFragmentActionLink("contribution", { "contributionId": contributionId });
        };

        // Create pivot view and enhance it.
        let pivotView = <Navigation.PivotView>Controls.Enhancement.enhance(Navigation.PivotView, $pivotView, {
            generatedContributionLink: (contributionId: string) => {
                return getLink(contributionId);
            },
            getEnabledState: (contributionId: string) => {
                return true;
            },
            getContributionContext: () => {
                return contributionContext;
            }
        });

        pivotView.refreshContributedItems(true).then(() => {
            pivotView.getItems().forEach((item) => {
                if (item.contributed) {
                    let link = getLink(item.id);
                    if (link) {
                        pivotView.setViewLink(item.id, link);
                        pivotView.setViewEnabled(item.id, true);
                    } else {
                        pivotView.setViewLink(item.id, "");
                        pivotView.setViewEnabled(item.id, false);
                    }
                }
            });
            pivotView.updateItems();
        });

        return pivotView;
    }

    /**
     * Get current test plan ID.
     */
    public getCurrentSuiteId() {
        return this._selectedPlanIdAndSuiteId.selectedSuite;
    }

    /**
     * Get current test suite ID.
     */
    public getCurrentPlanId() {
        return this._selectedPlanIdAndSuiteId.selectedPlan;
    }

    /**
     * Render the view based on the filter value.
     * @param value
     */
    public _handleViewFilter(value: string) {
        let testCases: number[] = [];

        if (!this._isInitializationComplete) {
            this._setViewFilter("list");
            return;
        }
        if (value === TCMLite.View.ListView) {
            this._selectedView = TCMLite.View.ListView;
            this._showViewGrid(true);
        }
        else if (value === TCMLite.View.GridView) {
            this._handleShowChildSuitesAndShowGridView();
        }
    }

    private _handleShowChildSuitesAndShowGridView() {
        this._testPointList.stopTrackingWorkItems();
        this._inEditMode = true;
        if (!this._showChildSuitesHelper.isShowChildSuitesEnabled()) {
            this._showGridView();
            return;
        }
        this._showChildSuitesHelper.clearShowChildSuites();
        this._testPlanManager.getTestPointsForSuite(this._selectedPlanIdAndSuiteId.selectedPlan, this._selectedPlanIdAndSuiteId.selectedSuite, true, this._createDisplayColumns(),
            null, null, null, (testPointResponse) => {
                this._testPointList.cachedTestPoints = testPointResponse.testPoints;
                this._testPointList.totalTestPoints = testPointResponse.sortedPointIds ? testPointResponse.sortedPointIds.length : testPointResponse.totalPointsCount;
                this._refreshTestPointsCount();
                this._showChildSuitesHelper.disableShowChildSuites(true);
                this._showGridView();

                let totalPointCount = 0;
                if (testPointResponse.sortedPointIds) {
                    totalPointCount = testPointResponse.sortedPointIds.length;
                }
                TCMUtilHelper.TestLiteViewUtils.showCount(testPointResponse.totalPointsCount, totalPointCount, this._filterHelper.isFilterApplied());
            }, (error) => {
                this.showError(VSS.getErrorMessage(error));
            }, TCMLite.Constants.maxPageSize, this._showChildSuitesHelper.isShowChildSuitesEnabled());
    }

    private _showGridView() {
        let testCases: number[] = [];
        this._selectedView = TCMLite.View.GridView;
        testCases = TCMPointGrid.TestPointsGrid.getTestCaseIdsFromTestPoints(this._testPointList.cachedTestPoints);
        this._hideViewGrid();
        this._bulkEditHelper.showGridView(testCases, true, this._testSuitesTree.getSelectedSuite(), this._currentPlan, this._testPointList.savedColumns, $.noop, () => { this._setViewFilter("list"); });
        this.reRegisterShortcutGroup(TCMLite.KeyboardShortcutGroups.gridGroupName);
    }

    private reRegisterShortcutGroup(groupName: string, initialization?: boolean) {
        this._testKeyboardShortcutHelper.reRegisterShortcutGroup(groupName, initialization);
    }

    private _initializeKeyBoardShortcuts() {
        this._testKeyboardShortcutHelper = new KeyboardShortcuts.KeyboardShortcutHelper(this._element, this);
    }

    public allowKeyboardShortcuts(currentView: string): boolean {
        let allowShortcut: boolean = true;

        if (currentView === TCMLite.KeyboardShortcutGroups.listGroupName || currentView === TCMLite.KeyboardShortcutGroups.chartsGroupName || !this._bulkEditHelper) {
            allowShortcut = true;
        }
        else if (currentView === TCMLite.KeyboardShortcutGroups.gridGroupName) {
            let currentEditRowIndex = this._bulkEditHelper.getCurrentEditRowIndex();
            if (currentEditRowIndex < 0) {
                allowShortcut = true;
            } else {
                allowShortcut = false;
            }
        }
        return allowShortcut;
    }

    /**
     * Fetches and displays all the plans inside the combobox, if not already fetched and displayed.
     * @param planId: The plan Id to be selected in the combobox.
     */
    public ensurePlansLoaded(planId: any, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        let that = this,
            errorCallback2: IErrorCallback = (e) => { this.showError(VSS.getErrorMessage(e)); };
        VSS.queueRequest(this, this, "_plansLoaded", callback, errorCallback2,
            function (succeeded, failed) {
                that._testPlanManager.fetchTestPlansIncludingSpecifiedPlan(planId, function (plansWithSelection) {

                    if (!planId) {
                        planId = plansWithSelection.selectedTestPlan;
                    }

                    let loadSelectedPlanData: any = {};
                    loadSelectedPlanData.selectedPlan = plansWithSelection.selectedTestPlan;
                    loadSelectedPlanData.selectedSuite = plansWithSelection.selectedTestSuite;
                    that._plansSelector.clearDropDown();
                    that._plansSelector.setData(plansWithSelection.testPlans, that._selectedPlanIdAndSuiteId.selectedPlan);
                    if ($.isFunction(succeeded)) {
                        succeeded(loadSelectedPlanData);
                    }
                },
                    function (e) {

                        if (e && e.type === "Microsoft.TeamFoundation.TestManagement.WebApi.AccessDeniedException") {
                            that.showErrorInHTML(Resources.TestPlanViewPermissionError);
                        }
                        else {
                            that.showError(VSS.getErrorMessage(e));
                        }
                    });
            });
    }

    private _addHistoryPoint(data: any, suppressNavigation: any = false) {
        if (!this._historySvc) {
            this._historySvc = Navigation_Services.getHistoryService();
        }
        if (suppressNavigation) {
            this._historySvc.addHistoryPoint(this._selectedPivot, data, null, suppressNavigation);
        } else {
            this._historySvc.addHistoryPoint(this._selectedPivot, data);
        }
    }

    private _assignTesters(testPointIds: number[], tester: any) {

        if (!testPointIds || testPointIds.length === 0) {
            testPointIds = this._testPointList.getSelectedTestPointIds();
        }

        this._testPlanManager.assignTester(this._currentPlan.plan.id, testPointIds, tester.id, () => {
            this._filterHelper._addToTestersInPlan(tester);
            this._refreshTheTestPointsInSuite(this._testSuitesTree.getSelectedSuite().id);
        }, (e) => {
            this.showError(VSS.getErrorMessage(e));
        });
    }

    /**
     * shows an error mesage
     * @param message : the message to be displayed
     */
    public showError(message: string) {
        if (!this._$errorDiv) {
            this._$errorDiv = $("<div class='inline-error' />").text(message).insertBefore(this._element.find(".hub-title")[0]);
            this._element.find(".hub-title, .right-hub-content").hide();
        }

        if (!this._isInitializationComplete) {
            this._isInitializationComplete = true;
        }
    }

    /**
     * shows an error mesage
     * @param message : the message to be displayed
     */
    public showErrorHtml(messageElement: JQuery) {
        if (!this._$errorDiv) {
            this._$errorDiv = $("<div class='inline-error' />").wrapInner(messageElement).insertBefore(this._element.find(".hub-title")[0]);
            this._element.find(".hub-title, .right-hub-content").hide();
        }

        if (!this._isInitializationComplete) {
            this._isInitializationComplete = true;
        }
    }

    /**
    * shows an error mesage.
    * @param message : the message to be displayed
    */
    // Use this function only if you are sure that message doesnt have user define string.
    private showErrorInHTML(message: string) {
        if (!this._$errorDiv) {
            this._$errorDiv = $("<div class='inline-error' />").html(message).insertBefore(this._element.find(".hub-title")[0]);
            this._element.find(".hub-title, .right-hub-content").hide();
        }

        if (!this._isInitializationComplete) {
            this._isInitializationComplete = true;
        }
    }

    private _delayInitializeBulkEditGrid() {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.BulkEditHelper"], (BulkEditHelperModule: typeof TCMBulkEditHelper_LAZY_LOAD) => {
            this._bulkEditHelper = new BulkEditHelperModule.BulkEditHelper(this._testSuitesTree, this._element, delegate(this, this._refreshTestPointsCount));
            if (!this._isViewFilterHiden()) {
                this._viewFilter.showElement();
            }
        });
    }

    private _initializeTheTestPlanSuitesAndPointData(response: TCMLite.IJsonResponse) {
        if (LicenseAndFeatureFlagUtils.isNewTestPlanHubExperienceEnabled()) {
            this._hideTestPlansSelector();
        }

        let testPlanHubData = response.testPlanHubData;
        this._testPlanDefaultQuery = response.testPlanDefaultQuery;
        this._testPointList.savedColumns = response.columnOptions;
        this._testPointList.pagedColumns = response.pagedColumns;
        this._sortOrder = response.columnSortOrder;

        if (!testPlanHubData || !testPlanHubData.testPlan) {
            // Having a test plan is critical for this window. so, if there are issues in retrieving the test plan, reject the request. 
            return;
        }
        this._testPointList.totalTestPoints = testPlanHubData.totalTestPoints;
        this._selectedPlanIdAndSuiteId = {};
        this._selectedPlanIdAndSuiteId.selectedPlan = testPlanHubData.testPlan.id;
        this._selectedPlanIdAndSuiteId.selectedSuite = testPlanHubData.selectedSuiteId;
        // Setting the plans data
        testPlanHubData.testPlan.areaPath = testPlanHubData.testPlan.area.name;
        let selectedPlan = testPlanHubData.testPlan;
        let plans = [selectedPlan];
        this._plansSelector.setData(plans, testPlanHubData.testPlan.id);

        if (LicenseAndFeatureFlagUtils.isNewTestPlanHubExperienceEnabled()) {
            this._renderBreadcrumb(testPlanHubData);
        }

        this._currentPlan = {};
        this._currentPlan.plan = this._plansSelector.selectPlanById(testPlanHubData.testPlan.id);
        if (testPlanHubData.testPlan.rootSuite) {
            this._currentPlan.plan.rootSuiteId = testPlanHubData.testPlan.rootSuite.id;
        }

        // Setting the suites data
        this._storeSuites(testPlanHubData.testSuites);
        this._testSuitesTree.setData(this._currentPlan);

        let suiteId = this._selectedPlanIdAndSuiteId.selectedSuite;
        let suiteTitle = this._testSuitesTree.setSelectedSuite(suiteId, false);
        this.setViewTitle(Utils_String.format(Resources.TestPointsGridSuiteHeader, suiteTitle, suiteId));

        // Setting the points data
        this._wereColumnsChanged = false;
        switch (this._selectedPivot) {
            case TCMLite.TestPivots.TESTS:
                if (this._testManagementChartsView) {
                    this._testManagementChartsView.hideElement();
                }
                this._testViewRightPaneGrid.show();
                let testPoints = testPlanHubData.testPoints;
                TCMPointGrid.TestPointsGrid.parseTestCaseFieldsInTestPoints(testPoints);
                this._testPointList.setSource(testPoints, this._testPointList.savedColumns, this._sortOrder, this._testPointList.pagedColumns);

                this._updateTestPointsToolbarCommandStates();
                this._updateSuitesToolbarItemsAndCommandStates();
                TCMUtilHelper.TestLiteViewUtils.hideContributedTab();
                break;
            case TCMLite.TestPivots.CHARTS:
                this._hideViewGrid();
                this._initializeAndShowTestCharts(true);
                TCMUtilHelper.TestLiteViewUtils.hideContributedTab();
                break;
            default:
                if (this._testManagementChartsView) {
                    this._testManagementChartsView.hideElement();
                }
                this._hideViewGrid();
        }
        this._bind("selectedSuiteChanged", delegate(this, this._onSelectedSuiteChanged));
        this._bind("selectedSuiteChanging", delegate(this, this._onSelectedSuiteChanging));
        this._bind("refreshSelectedSuite", delegate(this, this._onTestSuiteRefreshForPlan));
        this._testPointList._bind("selectedTestChanged", delegate(this, this.onSelectedTestCaseChanged));
    }

    private _hideTestPlansSelector() {
        $(".testmanagement-testplans-pane").addClass("hidden");
    }

    private _renderBreadcrumb(testPlanHubData: TCMLite.ITestPlanHubDataModel) {
        const breadcrumbContainer = document.createElement("div");
        $(".hub-content").addClass("hub-content-with-breadcrumb");
        $(".hub-content").prepend(breadcrumbContainer);
        
        const splitterContainer = document.createElement("div");
        $(splitterContainer).addClass("testplan-splitter-container");
        $(splitterContainer).addClass("hub-content");
        $(".test-hub-lite-view .splitter.horizontal.hub-splitter")
            .wrap(splitterContainer);

        const containerStyle: React.CSSProperties = { marginLeft: "15px", marginTop: "10px"};
        TestPlanActionsCreator.getInstance().navigateToPlan({ id: testPlanHubData.testPlan.id, name: testPlanHubData.testPlan.name } as TestPlan);
        mountBreadcrumb(breadcrumbContainer, containerStyle);
    }

    private _onSelectedSuiteChanging(e?: any, eventArgs?: any) {
        if (!this._isInitializationComplete) {
            return;
        }

        if (eventArgs && eventArgs.suite && this._currentPlan && eventArgs.suite.id !== this._currentPlan.selectedSuiteId) {
            eventArgs.canceled = this._shouldCancelPlanOrSuiteSelectionChange();
        }
    }

    private onSelectedTestCaseChanged(e?, id?) {
        if (this._testPaneHelper) {
            this._testPaneHelper.showWorkItemBasedOnSelection(id);
        }
    }

    private _clearContributions() {
        if (this._testManagementChartsView) {
            this._testManagementChartsView.hideElement();
        }
        this._hideTestGridAndToolbar();
        TCMUtilHelper.TestLiteViewUtils.hideContributedTab();
    }

    private _initializeAndShowTestCharts(isInitialization: boolean) {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.Controls.Charts"], (Module: typeof TCMControlsCharts_LAZY_LOAD) => {
            if (!this._testManagementChartsView) {
                let currentSuite = this._testSuitesTree.getSelectedSuite();
                if(currentSuite) { currentSuite.title = currentSuite.name; }
                this._testManagementChartsView = Controls.BaseControl.createIn(Module.TestManagementChartsView, this._element.find(".hub-pivot-content"), {
                    tfsContext: this._options.tfsContext,
                    suite: currentSuite,
                    plan: this._currentPlan.plan
                });
                this._testManagementChartsView.hideElement();
            } else {
                let currentSuite = this._testSuitesTree.getSelectedSuite();
                if(currentSuite) { currentSuite.title = currentSuite.name; }
                this._testManagementChartsView.setFilterContext(this._currentPlan.plan, currentSuite);
            }

            if (!this._testManagementChartsInfoBar) {
                this._element.find(".hub-title").empty();
                this._testManagementChartsInfoBar = Controls.BaseControl.createIn(Module.TestManagementChartsInfoBar, this._element.find(".hub-title").eq(0),
                    {
                        tfsContext: this._options.tfsContext
                    });
                this._testManagementChartsInfoBar.hideElement();
                this._testManagementChartsInfoBar.bind(this._testManagementChartsView);
            }

            this._showTestCharts(isInitialization);
        });
    }

    /**
     * Deletes the suite with given ID.
     */
    public deleteTestSuite(parentSuiteId: number, parentSuiteRevision: number, suiteId: number, suiteType: TCMConstants.TestSuiteType) {
        this.deleteTestSuiteV2(parentSuiteId, parentSuiteRevision, suiteId, suiteType);
        return;      
    }

    /**
     * Delete test plan
     */
    private _deleteTestPlan(): void {
        let deleteTestPlanConfirmation: string,
            shouldProceed: boolean = true;


     
        this._deleteTestPlanV2();
        return;

        if (shouldProceed) {
            deleteTestPlanConfirmation = Resources.DeletePlanConfirmation;
            if (confirm(deleteTestPlanConfirmation)) {
                if (shouldProceed) {
                    if (this._inEditMode && this._bulkEditHelper) {
                        shouldProceed = this._bulkEditHelper.hideBulkEditGrid();
                    }
                    this._testPlanManager.deleteTestPlan(this._currentPlan.plan.id,
                        () => {
                            let selectedPlan = this._plansSelector.removeDeletedPlanAndSetSelectedPlan(this._currentPlan.plan.id);

                            if (!selectedPlan) {
                                // No plan left after deletion. So reset currentPlan an selectedPlanAndSuiteId to indicate no selection and update the page 
                                this._currentPlan = {};
                                if (this._selectedPlanIdAndSuiteId) {
                                    this._selectedPlanIdAndSuiteId.selectedPlan = 0;
                                    this._selectedPlanIdAndSuiteId.selectedSuite = 0;
                                }
                                this._updatePage();
                            }
                        },
                        (e) => {
                            this.showError(VSS.getErrorMessage(e));
                        });
                }
            }
        }
    }

    /**
     * Delete the test suite, it will launch the test suite deletion dialog which cleans up suite
     * and its child suites
     * @param parentSuiteId
     * @param parentSuiteRevision
     * @param suiteId
     * @param suiteType
     */
    public deleteTestSuiteV2(parentSuiteId: number, parentSuiteRevision: number, suiteId: number, suiteType: TCMConstants.TestSuiteType) {
        let shouldProceed: boolean = true;

        VSS.using(["WorkItemTracking/Scripts/TestWorkItemDelete/TFS.TestWorkItemDelete.Dialog", "TestManagement/Scripts/TFS.TestManagement.Telemetry", "TestManagement/Scripts/TFS.TestManagement.Utils"],
            (dialog: typeof TestWorkItemDeleteDialog_Async, TCMTelemetry: typeof TCMTelemetry_LAZY_LOAD, TMUtils: typeof TMUtils_LAZY_LOAD) => {
                let tfsContext: TFS_Host_TfsContext.TfsContext = this._options.tfsContext || TfsContext.getDefault();
                let testSuiteDeleteDialog = new dialog.TestSuiteDeleteConfirmationDialog({projectId: tfsContext.navigation.projectId} as TestWorkItemDeleteDialog_Async.ITestDeleteConfirmationDialogOptions);
                let workItemId = suiteId;

                let successCallback = () => {
                    this._onTestSuiteDeletionSuccess(parentSuiteId, suiteId);
                };

                let errorCallback: IErrorCallback = (e) => { this._showErrorOnSuiteHeirarchyUpdated(parentSuiteId, e); };

                let store = TMUtils.WorkItemUtils.getWorkItemStore();

                store.beginGetWorkItem(workItemId, (workItem: WITOM_LAZY_LOAD.WorkItem) => {
                    testSuiteDeleteDialog.showDialog(workItemId, workItem.workItemType.name, () => {
                        if (this._inEditMode && this._bulkEditHelper) {
                            shouldProceed = this._bulkEditHelper.hideBulkEditGrid();
                        }
                        if (shouldProceed) {
                            testSuiteDeleteDialog.deleteTestWorkItem(
                                TCMTelemetry.TelemetryService.testHubPage,
                                TCMTelemetry.TelemetryService.areaTestManagement,
                                workItemId,
                                false,
                                successCallback,
                                errorCallback);
                        }
                    });
                });
            });
    }

    public isInitializationComplete() {
        return this._isInitializationComplete;
    }

    /**
     * This method will be called once deletion of suite successfully completed and need to refresh the
     * suite tree view
     */
    private _onTestSuiteDeletionSuccess(parentSuiteId: number, suiteId: number) {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.Telemetry"], (TCMTelemetry: typeof TCMTelemetry_LAZY_LOAD) => {
            this._refreshTheTestSuitesInPlan(parentSuiteId);
            // Since suite deletion is successful, delete charts for the suite, if any.
            if (this._testManagementChartsView) {
                this._testManagementChartsView.deleteChart(this._currentPlan.plan.id, suiteId);
            }

            //Adding telemetry for creating test plan workitem. Area: TestManagement, Feature: TestSuite. Property: DeleteSuite.
            TCMTelemetry.TelemetryService.publishEvent(TCMTelemetry.TelemetryService.featureTestSuite, TCMTelemetry.TelemetryService.deleteSuite, 1);
        });
    }

    /**
     * Delete the test plan, it will launch the test plan deletion dialog which cleans up plan
     * and its child suites
     */
    private _deleteTestPlanV2(): void {
        let deleteTestPlanConfirmation: string,
            shouldProceed: boolean = true;

        VSS.using(["WorkItemTracking/Scripts/TestWorkItemDelete/TFS.TestWorkItemDelete.Dialog", "TestManagement/Scripts/TFS.TestManagement.Telemetry", "TestManagement/Scripts/TFS.TestManagement.Utils"],
            (dialog: typeof TestWorkItemDeleteDialog_Async, TCMTelemetry: typeof TCMTelemetry_LAZY_LOAD, TMUtils: typeof TMUtils_LAZY_LOAD) => {
                let tfsContext: TFS_Host_TfsContext.TfsContext = this._options.tfsContext || TfsContext.getDefault();
                let testPlanDeleteDialog = new dialog.TestPlanDeleteConfirmationDialog({projectId: tfsContext.navigation.projectId} as TestWorkItemDeleteDialog_Async.ITestDeleteConfirmationDialogOptions);
                let workItemId = this._currentPlan.plan.id;

                let successCallback = Utils_Core.delegate(this, this._onPlanDeletionSuccess);

                let errorCallback: IErrorCallback = (e) => { this.showError(VSS.getErrorMessage(e)); };

                let store = TMUtils.WorkItemUtils.getWorkItemStore();
                store.beginGetWorkItem(workItemId, (workItem: WITOM_LAZY_LOAD.WorkItem) => {
                    testPlanDeleteDialog.showDialog(workItemId, workItem.workItemType.name, () => {
                        if (this._inEditMode && this._bulkEditHelper) {
                            shouldProceed = this._bulkEditHelper.hideBulkEditGrid();
                        }
                        if (shouldProceed) {
                            testPlanDeleteDialog.deleteTestWorkItem(
                                TCMTelemetry.TelemetryService.testHubPage,
                                TCMTelemetry.TelemetryService.areaTestManagement,
                                workItemId,
                                false,
                                successCallback,
                                errorCallback);
                        }
                    });
                });
            });
    }

    /**
     * This method will be called once deletion of plan successfully completed and need to cleanup the
     * plan selector and tree view
     */
    private _onPlanDeletionSuccess() {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.Telemetry"], (TCMTelemetry: typeof TCMTelemetry_LAZY_LOAD) => {
            let selectedPlan = this._plansSelector.removeDeletedPlanAndSetSelectedPlan(this._currentPlan.plan.id);

            if (!selectedPlan) {
                // No plan left after deletion. So reset currentPlan an selectedPlanAndSuiteId to indicate no selection and update the page 
                this._currentPlan = {};
                if (this._selectedPlanIdAndSuiteId) {
                    this._selectedPlanIdAndSuiteId.selectedPlan = 0;
                    this._selectedPlanIdAndSuiteId.selectedSuite = 0;
                }
                this._updatePage();
            }

            //Adding telemetry for deleting test plan workitem. Area: TestManagement, Feature: TestPlan. Property: DeleteTestPlan.
            TCMTelemetry.TelemetryService.publishEvent(TCMTelemetry.TelemetryService.featureDeleteTestPlan, TCMTelemetry.TelemetryService.deleteTestPlan, 1);
        });
    }

    private _HandleFailure(errorMessage: string) {
        this.showError(errorMessage);
    }

    /**
     * Rename the given suite.
     */
    public renameTestSuite(suite: any, title: string, errorCallback?: IErrorCallback) {
        this._testPlanManager.renameTestSuite(suite,
            title,
            (revision) => {
                this._refreshTheTestSuitesInPlan(suite.id, false, true, true);

                // Show alert message when could not rename due to conflict
                if (revision === TCMLite.Constants.ConflictRevisionNumber) {
                    alert(Resources.SuiteRenameErrorMessage);
                }
            },
            (e) => {
                if ($.isFunction(errorCallback)) {
                    errorCallback(e);
                }
                this._showErrorOnSuiteHeirarchyUpdated(suite.id, e);
            }
        );
    }

    private _showErrorOnSuiteHeirarchyUpdated(suiteId: number, e) {
        if (e.type === TCMLite.Exceptions.TestObjectNotFoundException) {
            this._refreshTheTestSuitesInPlan(suiteId);
            alert(Resources.SuiteRenameErrorMessage);
        }
        else {
            this.showError(VSS.getErrorMessage(e));
        }
    }

    private _showTestCharts(isInitialization: boolean) {
        this._selectedView = "charts";
        this._showChildSuitesHelper.clearShowChildSuites();
        if (isInitialization){
            this._refreshTestPointsCount();
        }
        let suite = this._testSuitesTree.getSelectedSuite();
        if (suite) {
            this.setViewTitle(Utils_String.format(Resources.TestPointsGridSuiteHeader, suite.title, suite.id));
        }

        this._hideTestGridAndToolbar();
        this._testManagementChartsInfoBar.showElement();
        this._testManagementChartsView.showElement();
        this.reRegisterShortcutGroup(TCMLite.KeyboardShortcutGroups.chartsGroupName);
    }

    private _hideTestGridAndToolbar() {
        let filters: TCMLite.Filters = new TCMLite.Filters(this._testPointOutcomeFilter, this._testerFilter, this._configurationFilter, this._viewFilter);
        TCMUtilHelper.TestLiteViewUtils.hideViewGridFilters(filters, this._testPaneHelper, true);
        if (this._bulkEditHelper) {
            this._bulkEditHelper.hideBulkEditGrid();  // Hide the bulk edit grid
        }
        this._testViewRightPaneGrid.hide();
    }

    /**
     * Loads all the test plan , test suite and test point data.
     * Also retreives the bug category name.
     * @returns {} 
     */
    private _loadAllTheTestPlanAndTestPointsDetails(state: any, isinitializing?: boolean) {
        let that = this;
        VSS.using(["Presentation/Scripts/TFS/TFS.OM.Common", "TestManagement/Scripts/TFS.TestManagement", "TestManagement/Scripts/TFS.TestManagement.Utils"],
            (TFS_OM_Common: typeof TFS_OM_Common_LAZY_LOAD, TestsOM: typeof TestsOM_LAZY_LOAD, TMUtils: typeof TMUtils_LAZY_LOAD) => {
                if (!this._testPlanManager) {
                    this._testPlanManager = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService(TestsOM.TestPlanManager);
                }
                if (!this._bugCategoryTypeName) {
                    TMUtils.WorkItemUtils.getDefaultWorkItemTypeNameForCategory("Microsoft.BugCategory", (bugCategoryTypeName) => {
                        if (bugCategoryTypeName) {
                            this._bugCategoryTypeName = bugCategoryTypeName;
                        }
                    });
                }

                this._testPointList.initializeAssignTesterDelegate(delegate(this, this._assignTesters));

                this._initializeTestPointsDelegate();

                if (isinitializing && this._testPlanDefaultQuery) {
                    let options: TCMLite.ITestPlanFilterOptions = {
                        parentElement: this._element,
                        planSelector: this._plansSelector,
                        defaultTestPlanQuery: this._testPlanDefaultQuery,
                        testPlanManager: this._testPlanManager,
                        currentPlan: this._currentPlan,
                        onError: delegate(this, this.showError),
                        updatePage: delegate(this, this._updatePage)
                    };
                    let planFilterHelper = new TCMPlanFilterHelper.PlanFilterHelper(options);
                    planFilterHelper.createTestPlansFilter();
                }

                this._fetchTestPlanData(isinitializing);


            });
    }

    private _fetchTestPlanData(isinitializing: boolean) {
        //If plan ID is not present in dataprovider, then use the ID in the URL.
        // If URL also does not planID pass null
        let state = Navigation_Services.getHistoryService().getCurrentState();
        let planIdInQuery = state.planId;
        let planId = this._selectedPlanIdAndSuiteId.selectedPlan;

        if (planIdInQuery) {
            planId = planIdInQuery;
        }

        this.ensurePlansLoaded(planId, (lastSelectedPlanAndSuite) => {
            if (isinitializing) {
                this._fetchAndShowIterationDates();
            }

            // If there is no plan ID in URL, and if there are no plans.
            if (!planIdInQuery) {
                if (!this._currentPlan || !this._currentPlan.plan) {
                    this.setViewTitle("");
                    this._showPlanHubTitle();
                    return;
                }
            }
            let plan = this._plansSelector.selectPlanById(planId);
            if (!plan) {
                if (LicenseAndFeatureFlagUtils.isNewTestPlanHubExperienceEnabled()) {
                    VSS.using([
                        "TestManagement/Scripts/TFS.TestManagement.Utils"
                    ], (
                        Utils: typeof TMUtils_LAZY_LOAD
                    ) => {
                        const url = Utils.UrlHelper.getMinePageUrl();
                        const message = Utils_String.format(Resources.NoPlanWithIdExistsGoToDirectory, planId, url);
                        const errorElement = $(`<div>${message}<div>`);
                        this.showErrorHtml(errorElement);
                    });
                } else {
                    this.showError(Utils_String.format(Resources.NoPlanWithIdExists, planId));
                }
                return;
            }

            this._selectedPlanIdAndSuiteId.planId = lastSelectedPlanAndSuite.planId;
            if (!state.suiteId && !this._selectedPlanIdAndSuiteId.selectedSuite) {
                this._selectedPlanIdAndSuiteId.selectedSuite = lastSelectedPlanAndSuite.selectedSuite;
            }

            if (plan && plan.rootSuiteId === 0) {
                // If the plan does not have roorSuiteID create a test plan from the given workitem.
                this._testPlanManager.beginCreateTestPlanFromWorkItem(plan.id, (promotedTestPlan) => {
                    this._currentPlan = { plan: promotedTestPlan };
                    this._currentPlan.plan.rootSuiteId = promotedTestPlan.rootSuiteId;
                    this._selectedPlanIdAndSuiteId.selectedSuite = promotedTestPlan.rootSuiteId;

                    this._fetchTestSuitesAndTestPoints(isinitializing);
                },
                    (e) => {
                        this.showError(VSS.getErrorMessage(e));
                    });
            } else {

                if (!this._currentPlan) {
                    this._currentPlan = { plan: plan };
                }

                //Adding additional properties of plan.
                //TODO: Add data contract for _currentPlan as part of code cleanup for types
                this._currentPlan.plan.buildUri = plan.buildUri;
                this._currentPlan.plan.buildDefinitionId = plan.buildDefinitionId;
                this._currentPlan.plan.releaseEnvironmentDefinition = plan.releaseEnvironmentDefinition;
                this._fetchTestSuitesAndTestPoints(isinitializing, state.suiteId);
            }

        });
    }

    private _fetchTestSuitesAndTestPoints(isinitializing: boolean, suiteIdInQuery?: string) {
        let suiteId: number = this._selectedPlanIdAndSuiteId.selectedSuite;
        if (suiteIdInQuery) {
            suiteId = parseInt(suiteIdInQuery);
            if (suiteId) {
                this._selectedPlanIdAndSuiteId.selectedSuite = suiteId;
            }
        } else {
            let planId = this._selectedPlanIdAndSuiteId.selectedPlan;
            if ((planId && planId !== 0) && (suiteId && suiteId !== 0) && !isinitializing) {
                this._addHistoryPoint({ planId: planId, suiteId: suiteId }, true);
            }
        }

        // If initialization or if the current plan is not same as the before plan , then call get test suites. Else skip test test suites call.
        if (this._currentPlan && this._currentPlan.suites && !isinitializing && this._currentPlan.plan.id === this.previousPlanId) {
            this._onSuitesLoaded(isinitializing, suiteId);
            return;
        }

        // We will cache the current plan id so that if we naviagate to this same plan, we can use the cached plan id. 
        this.previousPlanId = this._currentPlan.plan.id;

        this._testPlanManager.getTestSuitesForPlan(this._selectedPlanIdAndSuiteId.selectedPlan, this._selectedPlanIdAndSuiteId.selectedSuite, (data) => {
            let currentSuiteId = this._historySvc.getCurrentState().suiteId;
            if (currentSuiteId && currentSuiteId != 0 && currentSuiteId != this._selectedPlanIdAndSuiteId.selectedSuite) {
                return;
            }
            this._setSuiteDetailsInSuiteTree(data, suiteId);

            this._filterHelper = new TCMFilterHelper.FilterHelper(this._testPlanManager, this._testerFilter, this._testPointOutcomeFilter, this._configurationFilter);
            this._filterHelper.setFilterAppliedValues(data);
            this._filterHelper.loadFilters(data).then<void>(
                () => {
                    if (this._filterHelper.isFilterApplied()) {
                        this._refreshTestPointsCount(null);
                    }
                    this._onSuitesLoaded(isinitializing, suiteId);
                },
                (error: any) => { }
            );
        });
    }

    private _onSuitesLoaded(isinitializing: boolean, suiteId: number) {
        // If suite with given ID is not present throw error.
        let suite = this._testSuitesTree.getSelectedSuite();
        if (!suite || (suiteId != 0 && suite.id !== suiteId)) {
            this.showError(Utils_String.format(Resources.NoSuiteWithIdExists, suiteId));
            return;
        }
        this.setViewTitle(Utils_String.format(Resources.TestPointsGridSuiteHeader, suite.name, suite.id));

        if (this._selectedPivot === TCMLite.TestPivots.CHARTS) {
            if (!this._testManagementChartsView || !isinitializing) {
                this._initializeAndShowTestCharts(isinitializing);
            }
            return;
        }

        if (this._selectedPivot === TCMLite.TestPivots.TESTS) {
            if (isinitializing || !this._testPaneHelper) {
                this._initializePaneFilters();
            }

            if (this._testManagementChartsView) {
                this._testManagementChartsView.hideElement();
            }
            this._testViewRightPaneGrid.show();

            // Adjust the top of test-view-grid to show filter grid properly.
            const $filterBar = this._element.find(TCMLite.Constants.testManagementTestFilterBar);
            const filterBarHeight = $filterBar.height();
            const toolbarHeight = 45;
            const $testViewGrid = this._element.find(TCMLite.GridAreaSelectors.viewGrid);
            $testViewGrid.css("top", toolbarHeight + filterBarHeight);

            this._showRequirement();
        }
        //Updating the suites toolbar
        this._updateSuitesToolbarCommandStates();
        
        if (!this._filterHelper) {
            this._filterHelper = TCMFilterHelper.FilterHelper.getInstance();
        }
        if (!this._filterHelper) {
            this._fetchTestPoints("", "", -1, true);
        }
        else {
            this._fetchTestPoints(this._filterHelper.getOutcomeFilterValue(), this._filterHelper.getTesterFilterValue(), this._filterHelper.getConfigurationFilterValue(), isinitializing);
        }
    }

    private _fetchTestPoints(outcomeFilter: string, testerFilter: string, configurationFilter: number, isinitializing: boolean) {
        this._testPlanManager.getTestPointsForSuite(this._selectedPlanIdAndSuiteId.selectedPlan, this._selectedPlanIdAndSuiteId.selectedSuite, true, this._createDisplayColumns(),
            outcomeFilter, testerFilter, configurationFilter, (testPointResponse) => {
                this._testPointList.savedColumns = testPointResponse.columnOptions;
                this._testPointList.pagedColumns = testPointResponse.pagedColumns;
                this._testPointList.sortOrder = testPointResponse.columnSortOrder;
                this._testPointList.totalTestPoints = testPointResponse.sortedPointIds ? testPointResponse.sortedPointIds.length : testPointResponse.totalPointsCount;

                this._wereColumnsChanged = false;

                // Set the test page helper values.
                this._setPageHelperValue(testPointResponse.sortedPointIds);

                let totalPointCount = 0;
                if (testPointResponse.sortedPointIds) {
                    totalPointCount = testPointResponse.sortedPointIds.length;
                }
                TCMUtilHelper.TestLiteViewUtils.showCount(testPointResponse.totalPointsCount, totalPointCount, this._filterHelper.isFilterApplied());

                this._testPointsToolbar.showElement();
                this._testPointList.layout();
                let testPoints = testPointResponse.testPoints;
                TCMUtilHelper.TestLiteViewUtils.modifySequenceNumber(testPoints);
                TCMPointGrid.TestPointsGrid.parseTestCaseFieldsInTestPoints(testPoints);
                this._clearError();
                this._testPointList.setSource(testPoints, this._testPointList.savedColumns, this._testPointList.sortOrder, this._testPointList.pagedColumns);

                this._filterHelper.updateFilterValues(testPointResponse.testPoints, testPointResponse.configurations);
                this._testPointList.cachedTestPoints = testPointResponse.testPoints;
                this._showViewGrid(true, true);
                this._showViewGridFilters();
                this._updateFilterMenuOption();
                this._updateTesterFilterOnUrl();

                if (!this._isInitializationComplete) {
                    this._isInitializationComplete = true;
                    this._updateTestPointsToolbarCommandStates();
                }
            }, (error) => {
                this.showError(VSS.getErrorMessage(error));
            }, TCMLite.Constants.maxPageSize, this._showChildSuitesHelper.isShowChildSuitesEnabled());
    }

    private _initializeTestPointsDelegate() {
        VSS.using(["Presentation/Scripts/TFS/TFS.UI.Controls.Identities", "WorkItemTracking/Scripts/TFS.UI.Tags"], (Module: typeof TFS_UI_Controls_Identities_LAZY_LOAD, TFS_UI_Tags: typeof TFS_UI_Tags_LAZY_LOAD) => {
            this._testPointList.identityDelegate = Module.IdentityViewControl.renderIdentityCellContents;

            this._testPointList.tagProviderDelegate = TFS_UI_Tags.TagUtilities.renderTagCellContents;
        });
    }

    private _disposeOrderTestPointsControl() {
        if (this._testPointsGridToolbar) {
            this._testPointsGridToolbar.disposeOrderTestCasesControl(true);
        }
    }

    private _initializePaneFilters() {

        VSS.using(["TestManagement/Scripts/TestHubLite/TFS.TestManagement.TestPaneGrid", "Presentation/Scripts/TFS/TFS.WebSettingsService", "Presentation/Scripts/TFS/TFS.OM.Common"], (Module: typeof TCMPaneGrid_LAZY_LOAD, WebServicesModule: typeof TFS_WebSettingsService_LAZY_LOAD, TFS_OM_Common: typeof TFS_OM_Common_LAZY_LOAD) => {
            if (this._testPaneHelper) {
                return;
            }

            this._testPaneHelper = new Module.TestDetailsPaneHelper(this._paneFilter, this._positionFilter, this._testPointList, this._element, this._options, this._testPointsToolbar);
            this._testPaneHelper.createSuiteReferencePane();
            let webSettingsCollectionService = TFS_OM_Common.Application.getConnection(this._options.tfsContext).getService(WebServicesModule.WebSettingsService);
            webSettingsCollectionService.beginReadSetting("/PanePosition", WebServicesModule.WebSettingsScope.User, (data) => {
                let position = "off";
                if (data && data.value && data.value !== "") {
                    position = data.value;
                }
                this._testPaneHelper._consumerWorkitemForm(() => { this._testPaneHelper.showWorkItemPane(position, this._paneFilter.getSelectedItem().value); });
            });
        });
    }

    private _isTestPointBeingDragged(): boolean {
        let workItemIds = this._testPointList.getDraggingRowInfo();
        if (workItemIds && workItemIds.length > 0) {
            return true;
        }
        return false;
    }
    /**
     * moves a test suite from one position to another
     * @param fromSuite
     * @param toSuite
     * @param suite
     * @param position
     * @param errorCallback
     */
    private _moveTestSuite(fromSuite: TCMLite.ITestSuiteModel, toSuite: TCMLite.ITestSuiteModel, suite: TCMLite.ITestSuiteModel, position: number, errorCallback?: IErrorCallback) {
        VSS.using(["Presentation/Scripts/TFS/TFS.OM.Common", "TestManagement/Scripts/TFS.TestManagement"],
            (TFS_OM_Common: typeof TFS_OM_Common_LAZY_LOAD, TestsOM: typeof TestsOM_LAZY_LOAD) => {
                if (!this._testPlanManager) {
                    this._testPlanManager = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService(TestsOM.TestPlanManager);
                }
                this._testPlanManager.moveTestSuiteEntry(this._currentPlan.plan.id, fromSuite.id, fromSuite.revision, toSuite.id, toSuite.revision, [suite.id], false, position, (suiteId: number) => {
                    this._refreshTheTestSuitesInPlan(this.getCurrentSuiteId(), false, true, true);
                },
                    (e) => {
                        if ($.isFunction(errorCallback)) {
                            errorCallback(e);
                        }
                        this._showErrorOnSuiteHeirarchyUpdated(suite.id, e);
                    });
            });
    }

    //TODO: write proper function for this
    private _areTestCasesDirty(ids: number[]) {
        return false;
    }

    /**
     * Moves Test Cases to a suite
     * @param toSuite : the suite to which test cases be moved
     */
    private _moveTestCase(toSuite: TCMLite.ITestSuiteModel) {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.Utils", "Presentation/Scripts/TFS/TFS.OM.Common", "TestManagement/Scripts/TFS.TestManagement", "WorkItemTracking/Scripts/OM/WorkItemManager"],
            (TMUtils: typeof TMUtils_LAZY_LOAD, TFS_OM_Common: typeof TFS_OM_Common_LAZY_LOAD, TestsOM: typeof TestsOM_LAZY_LOAD, WorkItemManager: typeof WorkItemManager_LAZY_LOAD) => {
                let fromSuite = this._testSuitesTree.getSelectedSuite(),
                    idsOfTestCasesToMove = this._testPointList.getDraggingRowInfo(),
                    store = TMUtils.WorkItemUtils.getWorkItemStore();
                if (this._showChildSuitesHelper.isShowChildSuitesEnabled()) {
                    alert(Resources.CannotMoveTestCases);
                    return;
                }
                if (idsOfTestCasesToMove && idsOfTestCasesToMove.length > 0) {
                    if (this._areTestCasesDirty(idsOfTestCasesToMove)) {
                        alert(Resources.DragDirtyTestCases);
                        return;
                    }
                    if (!this._testPlanManager) {
                        this._testPlanManager = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService(TestsOM.TestPlanManager);
                    }
                    this._testPlanManager.moveTestSuiteEntry(this._currentPlan.plan.id, fromSuite.id, fromSuite.revision, toSuite.id, toSuite.revision, idsOfTestCasesToMove, true, 0, (updatedSuites: TCMLite.ITestSuiteModel[]) => {
                        let workItemManager = WorkItemManager.WorkItemManager.get(store);
                        this._testSuitesTree.updateSuitesRevisionAndPointCount(updatedSuites);
                        this._refreshTheTestPointsInSuite(this.getCurrentSuiteId());
                        if (fromSuite.SuiteType === TCMConstants.TestSuiteType.RequirementTestSuite.toString() ||
                            toSuite.suiteType === TCMConstants.TestSuiteType.RequirementTestSuite.toString()) {
                            workItemManager.invalidateCache(idsOfTestCasesToMove);
                        }
                        workItemManager.invalidateCache([fromSuite.requirementId, toSuite.requirementId]);
                    },
                        (e) => {
                            if (e.type === TCMLite.Exceptions.TestObjectNotFoundException) {
                                this._refreshTheTestPointsInSuite(this.getCurrentSuiteId());
                                alert(Resources.SuiteEntryMoveFailed);
                            }
                            else {
                                this.showError(VSS.getErrorMessage(e));
                            }
                        });
                }
            });

    }

    /**
     * store suites in the form of " id to suite " dictionary for quick lookup
     * @param suites : the list of suites
     */
    private _storeSuites(suites: any) {
        let that = this;
        this._currentPlan.suites = {};
        $.each(suites, function (i, suite) {
            if (!that._currentPlan.suites[suite.id]) {
                //This method gets called when we fetch all suites in a plan. So totalPointCount will be equal to point count as no filtering is applied in response from server.
                suite.totalPointCount = suite.pointCount;
                that._currentPlan.suites[suite.id] = suite;
            }
        });
    }

    /**
     * Create filters
     */
    private _createFilters() {
        this._testPointOutcomeFilter = this._createFilter(TCMLite.FilterSelectors.outcome);
        this._testerFilter = this._createFilter(TCMLite.FilterSelectors.tester);
        this._configurationFilter = this._createFilter(TCMLite.FilterSelectors.configuration);
        this._viewFilter = this._createFilter(TCMLite.FilterSelectors.view);
        if (this._viewFilter) {
            this._viewFilter.hideElement();
        }

        this._createTestPaneFilters();
    }

    private _createTestPaneFilters() {
        this._positionFilter = this._createFilter(TCMLite.FilterSelectors.workItemPanePosition);
        if (this._positionFilter) {
            RichContentTooltip.add(Resources.PanePositionToolTip, this._positionFilter.getElement(), { setAriaDescribedBy: true });
            this._positionFilter.showElement();
        }
        this._paneFilter = this._createFilter(TCMLite.FilterSelectors.pane);
        if (this._paneFilter) {
            RichContentTooltip.add(Resources.PaneToolTip, this._paneFilter.getElement(), { setAriaDescribedBy: true });
            this._paneFilter.showElement();
        }
    }

    private _createDisplayColumns(): TCMLite.ITestPointGridDisplayColumn[] {
        let displayColumns: TCMLite.ITestPointGridDisplayColumn[] = [],
            col: TCMLite.ITestPointGridDisplayColumn;

        if (!this._testPointList.savedColumns || this._testPointList.savedColumns.length === 0 || !this._wereColumnsChanged) {
            return displayColumns;
        }

        $.each(this._testPointList.savedColumns, function (index, entry: any) {
            displayColumns.push({
                name: entry.name,
                text: entry.text,
                fieldId: entry.id ? entry.id : entry.fieldId,
                canSortBy: entry.canSortBy ? entry.canSortBy : false,
                width: Math.round(entry.width),
                index: entry.index ? entry.index : "",
                type: "",
                isIdentity: entry.isIdentity
            });
        });

        return displayColumns;
    }

    private _createFilter(selector: string) {
        let filter = <Navigation.PivotFilter>Controls.Enhancement.ensureEnhancement(Navigation.PivotFilter, $(selector));
        this._bind(this._element.find(selector), "changed", (sender, item) => {
            this._filterValueChanged(selector, item.value);
        });
        return filter;
    }

    /**
     * This method is required for AssignTestersToSuite scenario
     * If URL contains action='filterByTesters', then update Tester filters
     */
    private _updateTesterFilterOnUrl() {
        let that = this;
        let state = Navigation_Services.getHistoryService().getCurrentState();
        let currentUserInAssignedTesterList = false;

        if (state.action === TCMLite.TestViewActions.FilterByTester) {
            VSS.using(["Presentation/Scripts/TFS/TFS.OM.Identities"], (TFS_OM_Identities: typeof TFS_OM_Identities_LAZY_LOAD) => {
                let currentIdentity = TfsContext.getDefault().currentIdentity;


                this._testPlanManager.getTestersAssignedToSuite(state.suiteId, (testersList: any[]) => {
                    for (let i = 0, len = testersList.length; i < len; i++) {
                        if (currentIdentity.id === testersList[i].id) {
                            currentUserInAssignedTesterList = true;
                            currentIdentity.uniqueName = testersList[i].uniqueName;
                            break;
                        }
                    }

                    if (currentUserInAssignedTesterList) {
                        // Filter by current user
                        that._filterHelper._updateFilterSelection(this._testerFilter, TCMLite.FilterSelectors.tester, TFS_OM_Identities.IdentityHelper.getUniquefiedIdentityName(currentIdentity));
                    }
                });
            });
        }
    }



    /**
     * Handle any change in the filter
     * Method to be called when the filter is changed
     */
    private _filterValueChanged(selector: string, value: string) {
        if (selector === TCMLite.FilterSelectors.view) {
            this._handleViewFilter(value);
        } else if (selector === TCMLite.FilterSelectors.workItemPanePosition) {
            this._testPaneHelper.showWorkItemPane(value, this._paneFilter.getSelectedItem().value);
        } else if (selector === TCMLite.FilterSelectors.pane) {
            this._testPaneHelper.showWorkItemPane(this._positionFilter.getSelectedItem().value, value);
        } else {
            let that = this;
            this._clearFilterBar();
            this._filterHelper.updateIsFilterApplied(selector, value, () => {
                that._refreshTheTestPointsInSuite(this._testSuitesTree.getSelectedSuite().id);
            });
        }
    }

    private _selectedView: string = TCMLite.View.ListView;

    private _hideViewGrid() {
        let filters: TCMLite.Filters = new TCMLite.Filters(this._testPointOutcomeFilter, this._testerFilter, this._configurationFilter, this._viewFilter);

        this._clearFilterBar();
        TCMUtilHelper.TestLiteViewUtils.hideViewGrid(filters,
            this._testPointsToolbar, this._iterationHelper, this._testPaneHelper, this._element);
    }

    private _fetchAndShowIterationDates() {
        if (!this._currentPlan || !this._currentPlan.plan) {
            return;
        }
        if (!this._iterationHelper) {
            VSS.using(["TestManagement/Scripts/TFS.TestManagement.IterationHelper"], (IterationHelperModule: typeof TCMIterationHelper_LAZY_LOAD) => {
                this._iterationHelper = new IterationHelperModule.IterationHelper();
                this._iterationHelper.fetchAndShowIterationDates(this._currentPlan.plan.iteration);
            });
        } else {
            this._iterationHelper.fetchAndShowIterationDates(this._currentPlan.plan.iteration);
        }
    }

    private _showViewGrid(setViewFilter: boolean, skipRefresh?: boolean) {
        if (this._bulkEditHelper && !this._bulkEditHelper.hideBulkEditGrid()) {
            this._selectedView = TCMLite.View.GridView;
            return;
        }

        this._inEditMode = true;
        this.reRegisterShortcutGroup(TCMLite.KeyboardShortcutGroups.listGroupName);
        this._testPointList.resetDirtyItems();
        this._testPointList.startTrackingWorkItems();
        this._showViewGridFilters();
        TCMUtilHelper.TestLiteViewUtils.setVisibility(TCMLite.GridAreaSelectors.viewGrid, true, this._element);
        this._testPointsToolbar.showElement();
        this._testPointList.layout();
        this._fetchAndShowIterationDates();

        if (setViewFilter) {
            this._setViewFilter("list");
        }

        if (!skipRefresh) {
            this._refreshTheTestPointsInSuite(this._testSuitesTree.getSelectedSuite().id);
        }

        this._showChildSuitesHelper.disableShowChildSuites(false);
    }

    private _showViewGridFilters() {
        if (this._selectedPivot === TCMLite.TestPivots.TESTS) {
            this._testPointOutcomeFilter.showElement();
            this._testerFilter.showElement();
            this._configurationFilter.showElement();
            this._updateViewFilterVisibility();
            if (this._testPaneHelper) {
                this._testPaneHelper.showPaneFilterFromSavedState();
            }
        }
    }

    private _setViewFilter(value: string) {
        let viewFilterItem = this._viewFilter.getItem(value);
        if (viewFilterItem) {
            this._viewFilter.setSelectedItem(viewFilterItem);
        }
    }

    /**
     * Creates the testPointsToolbar
     * @returns {} 
     */
    private _createTestPointsToolbar() {
        this._$toolbar = this._element.find(TCMLite.Constants.testManagementPointsToolbar);
        this._testPointsToolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, this._$toolbar, {
            items: TCMMenuItems.MenuItems.GetTestPointsToolbarItems(),
            executeAction: delegate(this, this._onTestPointsToolbarItemClick),
            cssClass: "testpoints-toolbar",
            contributionIds: ["ms.vss-test-web.test-run-toolbar-menu"],
            contextInfo: {
                item: { getContributionContext: this.getContributionContext.bind(this, false) }
            },
        });
        this._updateTestPointsToolbarCommandStates();
    }

    private getContributionContext(forSuites: boolean): any {
        if (forSuites && this._testSuitesTree && this._currentPlan) {
            let suite = this._testSuitesTree.getSelectedSuite();
            let plan = this._currentPlan.plan;
            return { suite: suite, plan: plan };
        } else {
            if (this._testPointList) {
                let data = this._testPointList.getSelectedTestPoints();
                return data ? data : [];
            } else {
                return [];
            }
        }
    }

    /**
     * Handles the execution of the toolbar items
     * @param e: the execution event. 
     */
    private _onTestPointsToolbarItemClick(e?: any) {
        let command = e.get_commandName();
        this.executeToolbarAction(command);
    }

    /**
     * Handles the execution of the toolbar items for a given command.
     */
    public executeToolbarAction(command: string) {
        this._getTestPointGridToolbarInstance().then((testPointGridToolbar) => {
            testPointGridToolbar.onTestPointsToolbarItemClick(command);
        });
    }

    /**
     * Event handler for selectionchanged event in test point list.
     * @param sender
     * @param e
     */
    private _onTestPointSelectionChanged(sender: any, e?: any) {
        this._updateTestPointsToolbarCommandStates();
    }

    /**
     * Event handler for delete key pressed event in test point list.
     * @param sender
     * @param e
     */
    private _onRemoveTestPoints(sender, e?: any) {
        this._getTestPointGridToolbarInstance().then((testPointGridToolbar) => {
            testPointGridToolbar.removeSelectedTestCases();
        });
    }
    /**
     * Create the suites treeview section.
       First creating the toolbar above suites and then the suites tree
     */
    private _createSuitesSection() {
        /// <summary>Create the suites treeview section.</summary>
        //first creating the toolbar above suites and then the suites tree
        let suitesTreeElement: JQuery;

        suitesTreeElement = this._element.find(".testmanagement-suites-tree");
        let contextMenu = {
            "arguments": (contextInfo) => {
                return {
                    item: contextInfo.item
                };
            },
            executeAction: delegate(this, this._onSuiteTreeContextMenuItemClick),
            updateCommandStates: delegate(this, this._updateSuiteTreeContextMenuCommandStates),
            contributionIds: ["ms.vss-test-web.test-plans-suites-context"]
        };

        this._testSuitesTree = <TCMSuiteTree.TestSuitesTree>Controls.Enhancement.enhance(TCMSuiteTree.TestSuitesTree, suitesTreeElement, { contextMenu: contextMenu });
        this._testSuitesTree.renameTestSuiteDelegate = (suite: any, title: string, errorCallback?: IErrorCallback) => {
            this.renameTestSuite(suite, title, errorCallback);
        };

        this._testSuitesTree.moveTestSuiteEntryDelegate = (toSuite: TCMLite.ITestSuiteModel, fromSuite?: TCMLite.ITestSuiteModel, suite?: TCMLite.ITestSuiteModel, position?: number, errorCallback?: IErrorCallback) => {
            if (fromSuite && suite) {
                this._moveTestSuite(fromSuite, toSuite, suite, position, errorCallback);
            }
            else {
                this._moveTestCase(toSuite);
            }
        };

        this._testSuitesTree.testPointDroppableAcceptDelegate = () => {
            return this._isTestPointBeingDragged();
        };

        this._testSuitesTree.deleteTestSuiteDelegate = (suite: any) => {
            this.deleteTestSuite(suite.parentSuiteId, 0, suite.id, suite.type);
        };
        this._testSuitesTree.deleteTestPlanDelegate = delegate(this, this._deleteTestPlan);
        this._testSuitesTree.onTestPlanDeletion = delegate(this, this._onPlanDeletionSuccess);
        this._testSuitesTree.onTestSuiteDeletion = (parentSuiteId: number, suiteId: number) => {
            this._onTestSuiteDeletionSuccess(parentSuiteId, suiteId);
        };
    }

    /**
     * Updates context menu items list
     * @param menu
     */
    private _updateSuiteTreeContextMenuCommandStates(menu: Menus.MenuItem) {
        this._getTestSuiteToolbarInstance().then((testSuiteToolbar) => {
            testSuiteToolbar.updateTestSuiteTreeContextMenuCommandStates(menu);
        });
    }

    /**
     * Executes upon executing a right click command from the context menu
     * @param e
     */
    private _onSuiteTreeContextMenuItemClick(e?: any) {
        this._getTestSuiteToolbarInstance().then((testSuiteToolbar) => {
            let command = e.get_commandName(),
                commandArgs = e.get_commandArgument(),
                node: any = commandArgs.item;
            testSuiteToolbar.OnContextMenuItemClick(command, node);
        });
    }

    private _clearFilterBar() {
        VSS.using(["TestManagement/Scripts/TestHubLite/TFS.TestManagement.FilterBarProvider"], (FilterBarProvider: typeof TCMFilterBarProvider_LAZY_LOAD) => {
            let filterBarProvider = FilterBarProvider.FilterBarProvider.getInstance();
            if (filterBarProvider) {
                filterBarProvider.clearAndHideFilterBar();
            }
        });
    }

    public toggleFilterBar() {
        VSS.using(["TestManagement/Scripts/TestHubLite/TFS.TestManagement.FilterBarProvider"], (FilterBarProvider: typeof TCMFilterBarProvider_LAZY_LOAD) => {
            let filterBarProvider = FilterBarProvider.FilterBarProvider.getInstance();
            if (filterBarProvider) {
                filterBarProvider.toggleFilterBar();
            }
        });
    }

    /**
     * Shows and focuses the filter bar.
     */
    public activateFilterBar() {
        VSS.using(["TestManagement/Scripts/TestHubLite/TFS.TestManagement.FilterBarProvider"], (FilterBarProvider: typeof TCMFilterBarProvider_LAZY_LOAD) => {
            let filterBarProvider = FilterBarProvider.FilterBarProvider.getInstance();
            if (filterBarProvider) {
                filterBarProvider.activateFilterBar();
            }
        });
    }

    private _updateFilterMenuOption() {
        this._getTestPointGridToolbarInstance().then((testPointGridToolbar) => {
            testPointGridToolbar.updateFilterMenuItem();
        });
    }

    /**
     * Takes care of maintaining state in the url on selected suite change
     * @param e : event related info
     * @param selectedItemInfo : has the information about the selected suite
     */
    private _onSelectedSuiteChanged(e?: any, selectedItemInfo?: any) {

        if (!this._isInitializationComplete) {
            return;
        }

        let suite = selectedItemInfo.suite;
        this._disposeOrderTestPointsControl();
        this._clearFilterBar();
        this.setViewTitle(Utils_String.format(Resources.TestPointsGridSuiteHeader, suite.name, suite.id));
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.Controls", "Presentation/Scripts/TFS/TFS.OM.Common", "TestManagement/Scripts/TFS.TestManagement.Utils", "TestManagement/Scripts/TFS.TestManagement"],
            (TMControls: typeof TMControls_LAZY_LOAD, TFS_OM_Common: typeof TFS_OM_Common_LAZY_LOAD, TMUtils: typeof TMUtils_LAZY_LOAD, TestsOM: typeof TestsOM_LAZY_LOAD) => {
                if (!this._testPlanManager) {
                    this._testPlanManager = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService(TestsOM.TestPlanManager);
                }
                if (suite) {
                    this.setViewTitle(Utils_String.format(Resources.TestPointsGridSuiteHeader, suite.name, suite.id));
                }

                this._addHistoryPoint({ planId: this._currentPlan.plan.id, suiteId: suite.id });
                this._updateSuitesToolbarItemsAndCommandStates();
                this._updateTestPointsToolbarCommandStates();
                this._updateViewFilterVisibility();
                if (this._selectedView == TCMLite.View.GridView) {
                    this._showViewGrid(true);
                }
            });
    }

    private _updateViewFilterVisibility() {
        let selectedSuite = this._testSuitesTree.getSelectedSuite();

        if (!this._bulkEditHelper || !selectedSuite) {
            return;
        }
        if (this._isViewFilterHiden()) {
            this._viewFilter.hideElement();
        } else {
            this._viewFilter.showElement();
        }
    }

    private _isViewFilterHiden() {
        let currentSuite = this._testSuitesTree.getSelectedSuite();
        let isDynamicSuite = currentSuite && currentSuite.suiteType === TCMConstants.TestSuiteType.DynamicTestSuite.toString();
        let isAdvancedLicense = LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled();

        return !isAdvancedLicense || isDynamicSuite;
    }

    private _refreshTheTestPointsInSuite(suiteId: number, skipRefreshTestPointsCount?: boolean) {
        this._getTestPointGridToolbarInstance().then((testPointGridToolbar) => {

            testPointGridToolbar.refreshTestPointsInSuite(suiteId, null, skipRefreshTestPointsCount);

            this._updateTestPointsToolbarCommandStates();
            this._updateSuitesToolbarItemsAndCommandStates();
        });
    }

    private _refreshTestPointsCount(suite?: any) {
        this._getTestPointGridToolbarInstance().then((testPointGridToolbar) => {
            testPointGridToolbar.refreshSuitePointCounts(suite);
        });
    }


    private _refreshTestPoints(testPoints: TCMLite.ITestPointModel[]) {
        this._getTestPointGridToolbarInstance().then((testPointGridToolbar) => {
            testPointGridToolbar.refreshTestPoints(testPoints);
        });
    }

    private _getTestPointGridToolbarInstance(): IPromise<TestPointGridToolbar_LAZY_LOAD.TestPointGridToolbar> {
        let deferred: Q.Deferred<TestPointGridToolbar_LAZY_LOAD.TestPointGridToolbar> = q.defer<TestPointGridToolbar_LAZY_LOAD.TestPointGridToolbar>();
        VSS.requireModules(["TestManagement/Scripts/TestHubLite/TFS.TestManagement.TestPointGrid.Toolbar"])
            .spread((TestPointGridToolbar: typeof TestPointGridToolbar_LAZY_LOAD) => {
                let options: TCMLite.ITestPointToolbarOptions = {
                    onError: delegate(this, this.showError),
                    clearError: delegate(this, this._clearError),
                    parentElement: this._element,
                    isInitializationComplete: delegate(this, this.isInitializationComplete),
                    currentPlan: this._currentPlan,
                    bugCategoryTypeName: this._bugCategoryTypeName,
                    parentOptions: this._options
                };
                this._testPointsGridToolbar = new TestPointGridToolbar.TestPointGridToolbar(options);             
                return deferred.resolve(this._testPointsGridToolbar);

            });

        return deferred.promise;
    }

    private _hideGridView(): boolean {
        if (this._inEditMode && this._bulkEditHelper) {
            return this._bulkEditHelper.hideBulkEditGrid();
        }
        return true;
    }

    private _getTestSuiteToolbarInstance(): IPromise<TestSuiteToolbar_LAZY_LOAD.TestSuiteToolbar> {
        let deferred: Q.Deferred<TestSuiteToolbar_LAZY_LOAD.TestSuiteToolbar> = q.defer<TestSuiteToolbar_LAZY_LOAD.TestSuiteToolbar>();
        VSS.requireModules(["TestManagement/Scripts/TestHubLite/TFS.TestManagement.TestSuite.Toolbar"])
            .spread((TestSuiteToolbar: typeof TestSuiteToolbar_LAZY_LOAD) => {
                let options: TCMLite.ISuiteToolbarOptions = {
                    refreshTestPointsForTestSuite: delegate(this, this._refreshTheTestPointsInSuite),
                    refreshTestSuitesForPlan: delegate(this, this._refreshTheTestSuitesInPlan),
                    onError: delegate(this, this.showError),
                    setTitle: delegate(this, this.setViewTitle),
                    parentElement: this._element,
                    currentPlan: this._currentPlan,
                    bugCategoryTypeName: this._bugCategoryTypeName,
                    savedColumns: this._testPointList.savedColumns,
                    hideGridView: delegate(this, this._hideGridView)
                };
                let testSuiteToolbar = new TestSuiteToolbar.TestSuiteToolbar(options);
                testSuiteToolbar.getTestPointsDelegate = delegate(this, this._getFilteredTestPoints);
                return deferred.resolve(testSuiteToolbar);
            });

        return deferred.promise;
    }

    private _getFilteredTestPoints(callback: (testPointResponse) => void) {
        this._testPlanManager.getTestPointsForSuite(this._selectedPlanIdAndSuiteId.selectedPlan, this._testSuitesTree.getSelectedSuite().id, true, this._createDisplayColumns(),
            this._filterHelper.getOutcomeFilterValue(), this._filterHelper.getTesterFilterValue(), this._filterHelper.getConfigurationFilterValue(), callback, this.showError, TCMLite.Constants.maxPageSize, this._showChildSuitesHelper.isShowChildSuitesEnabled());
    }

    /**
     * Create the requirement id link and show
     */
    private _showRequirement() {
        let suite = this._testSuitesTree.getSelectedSuite();
        this._requirementId = suite.requirementId;

        if (!this._requirementId) {
            this._hideRequirementToolbar();
            return;
        }
        if (!this._$requirementToolBar) {
            this._$requirementToolBar = this._createRequirementIdToolBar();
        }
        else {
            this._$requirementToolBar.show();
        }
    }

    private _hideRequirementToolbar() {
        if (this._$requirementToolBar) {
            this._$requirementToolBar.hide();
        }
    }

    private _createRequirementIdToolBar(): JQuery {
        let _$requirement = $("<span class='requirement-toolbar' />")
            .append("<div class='requirement-icon' />")
            .insertBefore(".hub-title");

        let items = [];
        items.push({ id: "show-requirement", title: Resources.OpenRequirement, showTitle: false, icon: "icon-tfs-query-flat" });
        let $requirementIcon = this._element.find(".requirement-icon");

        let _requirementToolBarControl = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $requirementIcon, {
            items: items,
            executeAction: delegate(this, this._launchRequirementWorkItem),
        });

        return _$requirement;
    }

    private _launchRequirementWorkItem() {
        if (this._requirementId) {
            VSS.using(["VSS/Events/Handlers"], (Events_Handlers: typeof EventsHandlers_LAZY_LOAD) => {
                Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs("open-work-item", {
                    id: this._requirementId,
                    tfsContext: this._options.tfsContext
                }, null));
            });
        }
    }

    /**
     * Create the plans combobox .
     */
    private _createPlansDropDown() {
        let planComboElement = this._element.find(".testmanagement-plans-combo");
        this._plansSelector = <TCMPlanSelector.TestPlanSelectorMenu>Controls.Enhancement.enhance(TCMPlanSelector.TestPlanSelectorMenu, planComboElement);

        planComboElement.attr("aria-label", Resources.TestPlanSelector);
        // labelledby is reading same content as the drop down. So overwritting it with label.
        planComboElement.removeAttr("aria-labelledby");
        planComboElement.attr("role", "combobox");
        planComboElement.attr("aria-expanded", "false");
        this._bind("itemSelected", delegate(this, this._onSelectedPlanChanged));
        this._bind("itemSelecting", delegate(this, this._onSelectedPlanChanging));
    }

    private _onSelectedPlanChanging(e?: any, eventArgs?: any) {
        if (!this._isInitializationComplete) {
            return;
        }

        if (eventArgs && this._currentPlan.plan && eventArgs.item.id !== this._currentPlan.plan.id) {
            eventArgs.canceled = this._shouldCancelPlanOrSuiteSelectionChange();
        }
    }

    /**
     * Takes care of maintaining state in the url on selected plan change
     * @param e : event related info
     * @param selectedItemInfo : has the information about the selected plan from the dropdown
     * @returns {} 
     */
    private _onSelectedPlanChanged(e?: any, selectedItemInfo?: any) {

        if (!this._hideGridView()) {
            return;
        }

        if (selectedItemInfo.item &&
            ((this._selectedPlanIdAndSuiteId && (!this._selectedPlanIdAndSuiteId.selectedPlan || this._selectedPlanIdAndSuiteId.selectedPlan === 0))
                || (this._currentPlan && this._currentPlan.plan && this._currentPlan.plan.id !== selectedItemInfo.item.id))) {

            VSS.using(["TestManagement/Scripts/TFS.TestManagement.Controls", "Presentation/Scripts/TFS/TFS.OM.Common", "TestManagement/Scripts/TFS.TestManagement.Utils", "TestManagement/Scripts/TFS.TestManagement"],
                (TMControls: typeof TMControls_LAZY_LOAD, TFS_OM_Common: typeof TFS_OM_Common_LAZY_LOAD, TMUtils: typeof TMUtils_LAZY_LOAD, TestsOM: typeof TestsOM_LAZY_LOAD) => {
                    this._selectedPlanIdAndSuiteId.selectedPlan = selectedItemInfo.item.id;
                    this._selectedPlanIdAndSuiteId.selectedSuite = selectedItemInfo.item.rootSuiteId;
                    if (!this._currentPlan) {
                        this._currentPlan = {};
                    }
                    this._currentPlan.plan = selectedItemInfo.item;

                    if (!this._testPlanManager) {
                        this._testPlanManager = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService(TestsOM.TestPlanManager);
                    }

                    this._showChildSuitesHelper.clearShowChildSuites();
                    this._clearFilterBar();
                    if (selectedItemInfo.item.id > 0 && selectedItemInfo.item.rootSuiteId > 0) {
                        this._addHistoryPoint({ planId: selectedItemInfo.item.id, suiteId: selectedItemInfo.item.rootSuiteId });
                    } else {
                        this._addHistoryPoint({ planId: selectedItemInfo.item.id });
                    }

                    if (this._iterationHelper) {
                        this._iterationHelper.clearAndShowIterationDates(this._currentPlan.plan.iteration);
                    }
                });
        }
    }

    /**
     * Converts the test points retrieved to the new object model
     * @param inputSuites 
     * @returns {} 
     */
    private _mapSuitesToLiteModel(inputSuites: any[]): TCMLite.ITestSuiteModel[] {
        let suites: TCMLite.ITestSuiteModel[] = [];
        inputSuites.forEach(suite => {
            let convertedSuite: TCMLite.ITestSuiteModel = {
                id: suite.id, revision: suite.revision, name: suite.title, pointCount: suite.pointCount, suiteType: suite.type.toString(),
                requirementId: suite.requirementId, parentSuiteId: suite.parentSuiteId, queryText: suite.queryText, status: suite.status,
                configurations: suite.configurations, childSuiteIds: suite.childSuiteIds, children: [], totalPointCount: suite.totalPointCount
            };
            suites.push(convertedSuite);
        });
        return suites;
    }

    private _shouldCancelPlanOrSuiteSelectionChange(): boolean {
        let shouldProceed = !this._hideGridView();

        return shouldProceed;
    }

    private _onTestSuiteRefreshForPlan(e?: any, selectedItemInfo?: any) {
        let selectedSuiteId = selectedItemInfo.selectedSuiteId;
        this._refreshTheTestSuitesInPlan(selectedSuiteId);
    }

    private _refreshTheTestSuitesInPlan(selectedSuiteId: number, makeEditable?: boolean, skipRefreshTestPointsCount?: boolean, skipRefreshTestPoints?: boolean) {
        this._testPlanManager.getTestSuitesForPlan(this._currentPlan.plan.id, selectedSuiteId, (data) => {
            this._setSuiteDetailsInSuiteTree(data, selectedSuiteId);
            this._showViewGrid(true, true);
            let suite = this._currentPlan.suites[selectedSuiteId];
            // Retrieves the suite title and sets the suite title in required format.
            if (suite) {
                this.setViewTitle(Utils_String.format(Resources.TestPointsGridSuiteHeader, suite.name, suite.id));
            }
            TCMFilterHelper.FilterHelper.loadFilters(this._filterHelper, data).then<void>(
                () => {
                    if (makeEditable) {
                        let currentNode = this._testSuitesTree.getSelectedNode();
                        this._testSuitesTree._makeEditable(currentNode);
                    }
                    this._updateSuitesToolbarItemsAndCommandStates();
                },
                (error: any) => { }
            );
        });
        if (!skipRefreshTestPoints) {
            this._refreshTheTestPointsInSuite(selectedSuiteId, skipRefreshTestPointsCount);
        }
    }

    private _setSuiteDetailsInSuiteTree(data: any, suiteId: number) {
        let suites = this._mapSuitesToLiteModel(data.testSuites);
        this._storeSuites(suites);
        this._testSuitesTree.setData(this._currentPlan, true);

        this._testSuitesTree.setSelectedSuite(suiteId, true);
    }

    /**
     * Create the plans and suites toolbar.
     */
    private _createPlansAndSuitesToolbar() {
        let toolbarElement = this._element.find(".test-plans-suites-toolbar");
        this._testPlanAndSuitesMenubar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, toolbarElement, {
            items: TCMMenuItems.MenuItems.getTestPlanAndSuitesMenubarItems(),
            executeAction: delegate(this, this._onPlansAndSuitesMenubarItemClick),
            contributionIds: ["ms.vss-test-web.test-plans-suites-toolbar"],
            contextInfo: {
                item: { getContributionContext: this.getContributionContext.bind(this, true) }
            }
        });
        this._updateSuitesToolbarItemsAndCommandStates();
    }

    private _updateSuitesToolbarItemsAndCommandStates() {
        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            this._updateSuitesToolBarItems();
            this._updateSuitesToolbarCommandStates();
        }
    }

    /**
     * Handles the execution of the suite toolbar items
     * @param e: the execution event. 
     */
    private _onPlansAndSuitesMenubarItemClick(e?: any) {
        this._getTestSuiteToolbarInstance().then((testSuiteToolbar) => {
            let command = e.get_commandName();
            testSuiteToolbar.onPlansAndSuitesMenubarItemClick(command);
        });
    }

    /**
     * clears the error mesage
     */
    private _clearError() {
        let $errorDiv = this._$errorDiv || this._element.find(".inline-error");
        if ($errorDiv) {
            $errorDiv.remove();
            this._$errorDiv = null;
        }
        this._element.find(".hub-title, .right-hub-content").show();
    }

    private _onClickCreateNewTestPlan() {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.Controls", "Presentation/Scripts/TFS/TFS.OM.Common", "TestManagement/Scripts/TFS.TestManagement.Utils", "TestManagement/Scripts/TFS.TestManagement"],
            (TMControls: typeof TMControls_LAZY_LOAD, TFS_OM_Common: typeof TFS_OM_Common_LAZY_LOAD, TMUtils: typeof TMUtils_LAZY_LOAD, TestsOM: typeof TestsOM_LAZY_LOAD) => {

                let testPlanCreationHelper = new TMUtils.PlanCreationHelper();
                if (!this._testPlanManager) {
                    this._testPlanManager = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService(TestsOM.TestPlanManager);
                }

                TMControls.TestDialogs.createTestPlan({
                    owner: this._options.tfsContext.currentIdentity.id,
                    planCreationHelper: testPlanCreationHelper,
                    onCreate: delegate(this._testPlanManager, this._testPlanManager.createTestPlan),
                    onSucceeded: delegate(this._plansSelector, this._plansSelector.updateData),
                    onFailed: (e) => {
                        this.showError(VSS.getErrorMessage(e));
                        this._plansSelector.updateData(null);
                    }
                });
            });
    }

    private _updateTestPointsToolbarCommandStates() {
        if (!this._isInitializationComplete) {
            return;
        }

        this._getTestPointGridToolbarInstance().then((testPointGridToolbar) => {
            testPointGridToolbar.UpdateTestPointsToolbarCommandStates();
        });
    }

    private _updateSuitesToolbarCommandStates() {
        let suite: TCMLite.ITestSuiteModel = this._testSuitesTree ? this._testSuitesTree.getSelectedSuite() : null;

        TCMMenuItems.MenuItems.UpdateSuitesToolbarCommandStates(this._testPlanAndSuitesMenubar, suite);
    }

    private _updateSuitesToolBarItems() {
        let suite: TCMLite.ITestSuiteModel = this._testSuitesTree ? this._testSuitesTree.getSelectedSuite() : null,
            menuItem = this._testPlanAndSuitesMenubar.getItem(TCMLite.TestPlanAndSuitesCommandIds.openTestPlanOrSelectedSuite);

        if (menuItem) {
            if (suite && suite.parentSuiteId > 0) {
                menuItem.updateTitle(Resources.OpenTestSuite);
            }
            else {
                menuItem.updateTitle(Resources.OpenTestPlan);
            }
        }
    }

    private getDataFromDataProvider() {
        return Service.getService(Contributions_Services.WebPageDataService).getPageData<TCMLite.IJsonResponse>("ms.vss-test-web.hub-testPlan-data-provider");
    }

    /**
     * Clears all the controls on the page as there is no test plan selected.
     */
    private _updatePage() {
        this._resetState();
        this._resetTreeViewPane();
        this._resetTestPointPane();
        this._resetChildSuiteSelection();
    }

    private _resetState() {
        this._showViewGrid(true, true);
        this._currentPlan = {};
        if (this._selectedPlanIdAndSuiteId) {
            this._selectedPlanIdAndSuiteId.selectedPlan = 0;
            this._selectedPlanIdAndSuiteId.selectedSuite = 0;
        }
    }

    private _resetTreeViewPane() {
        if (this._testSuitesTree) {
            this._testSuitesTree._selectedNode = null;
            this._testSuitesTree.clearTreeView();
        }

        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            this._updateSuitesToolbarCommandStates();
        }
    }

    private _resetChildSuiteSelection() {
        this._showChildSuitesHelper.clearShowChildSuites();
    }

    private _resetTestPointPane() {
        if (this._testManagementChartsView) {
            this._testManagementChartsView.hideElement();
        }
        TCMUtilHelper.TestLiteViewUtils.setVisibility(TCMLite.GridAreaSelectors.viewGrid, true, this._element);
        if (this._testPointList) {
            this._testPointList._clearGrid();
        }
        this._updateTestPointsToolbarCommandStates();
        let filters: TCMLite.Filters = new TCMLite.Filters(this._testPointOutcomeFilter, this._testerFilter, this._configurationFilter, this._viewFilter);
        TCMUtilHelper.TestLiteViewUtils.hideViewGridFilters(filters, this._testPaneHelper, true);
        if (this._iterationHelper){
            this._iterationHelper.clearIterationDatesSpan();
        }
        this._clearError();
        this._showPlanHubTitle();

        // Updating Tests and Charts tab url so that it doesn't point to any plan
        this._updateTabUrls(NaN, NaN);
    }

    private _showPlanHubTitle() {
        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            this.setViewTitleContent("", Resources.SelectPlanHubTitle);
            if (LicenseAndFeatureFlagUtils.isNewTestPlanHubExperienceEnabled()) {
                VSS.using([
                    "TestManagement/Scripts/TFS.TestManagement.Utils"
                ], (Utils: typeof TMUtils_LAZY_LOAD) => {
                    const url = Utils.UrlHelper.getNewPlanCreatorUrl();
                    this._element.find(".create-test-plan-hyperlink").attr("href", url);
                });
            } else {
                this._element.find(".create-test-plan-hyperlink").click(() => { this._onClickCreateNewTestPlan(); });
            }
            this._element.find(".hub-title").attr("style", "margin-right : 20px;");
        }
    }

    private _updateTabUrls(planId: number, suiteId: number) {
        let tabview,
            actionlink;

        if (this._tabs) {
            let historySvc = Navigation_Services.getHistoryService();
            actionlink = historySvc.getFragmentActionLink(TCMLite.TestPivots.TESTS);
            tabview = this._tabs.getView(TCMLite.TestPivots.TESTS);

            actionlink = historySvc.getFragmentActionLink(TCMLite.TestPivots.CHARTS);
            tabview = this._tabs.getView(TCMLite.TestPivots.CHARTS);

            this._tabs.updateItems();
        }
    }
}

VSS.initClassPrototype(TestHubView, {
    _currentPlan: null,

    _testDetailsPaneToolbarItemIds: {
        refreshTestDetailsPane: "refresh-test-details-pane-list",
        openTestDetailInNewTab: "open-test-detail-item"
    },

    _testPlansFilterIds: {
        testPlansFilter: "test-plans-filter"
    },

    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _testPointList: null,
    _plansSelector: null,
    _testPlanManager: null,
    _testRunManager: null,
    _testResultManager: null,
    _$errorDiv: null,
    _testSuitesTree: null,
    _testPointsToolbar: null,
    _testPointOutcomeFilter: null,
    _testerFilter: null,
    _splitter: null,
    _workItemForm: null,
    _viewPaneForm: null,
    _workItemPaneMode: null,
    _previousPaneOnPosition: null,
    _webSettingsService: null,
    _webSettingsCollectionService: null,
    _positionFilter: null,
    _paneFilter: null,
    _selectedPlanIdAndSuiteId: {},
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    currentWorkItemId: null,
    _inEditMode: false,
    _$farRightPaneHubPivot: null,
    _farRightPaneToolbar: null
});

VSS.classExtend(TestHubView, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(TestHubView, ".test-hub-lite-view");

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.TestManagement.TestLiteView", exports);
