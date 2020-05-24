
import Controls = require("VSS/Controls");
import Menus = require("VSS/Controls/Menus");
import Utils_Core = require("VSS/Utils/Core");
import VSS = require("VSS/VSS");

import Dialogs_LAZY_LOAD = require("VSS/Controls/Dialogs");
import SelectWorkItemView_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.SelectWorkItemView");
import TestsOM_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement");

import TCMLite = require("TestManagement/Scripts/TFS.TestManagement.Lite");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TCMPlanSelector = require("TestManagement/Scripts/TFS.TestManagement.TestPlanSelector");

let delegate = Utils_Core.delegate;

export class PlanFilterHelper {

    private _element: JQuery;
    private _currentPlan: any;
    private _testPlanFilterMenubar: Menus.MenuBar;
    private _$errorDiv: JQuery;
    private _plansSelector: TCMPlanSelector.TestPlanSelectorMenu;
    private _testPlanManager: any;
    private _defaultTestPlanQuery: string;
    private _updatePageDelegate: () => void;
    private _errorCallbackDelegate: (string) => void;

    public constructor(options: TCMLite.ITestPlanFilterOptions) {
        this._element = options.parentElement;
        this._currentPlan = options.currentPlan;
        this._testPlanManager = options.testPlanManager;
        this._plansSelector = options.planSelector;
        this._defaultTestPlanQuery = options.defaultTestPlanQuery;
        this._errorCallbackDelegate = options.onError;
        this._updatePageDelegate = options.updatePage;
    }

    /**
     * Create the test plans filter.
     */
    public createTestPlansFilter() {
        let testPlansFilterElement = this._element.find(TCMLite.Constants.planFilterSelector);

        this._testPlanFilterMenubar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, testPlansFilterElement, {
            items: this._createFilterMenubarItems(),
            executeAction: delegate(this, this._testPlansFilterQuery)
        });

        this._updateTestPlanFilterButton();
    }

    private _createFilterMenubarItems(): Menus.IMenuItemSpec[] {
        let items: Menus.IMenuItemSpec[] = [];
        items.push({
            id: TCMLite.TestPlansFilterIds.TestPlansFilter,
            title: Resources.FilterTestPlans,
            showText: false,
            icon: "bowtie-icon bowtie-search-filter-fill",
            cssClass: "right-align testplan-filter"
        });

        return items;
    }

    private _testPlansFilterQuery() {
        let areaPath;
        if (this._currentPlan && this._currentPlan.plan) {
            areaPath = this._currentPlan.plan.areaPath;
        }

        VSS.using(["TestManagement/Scripts/TFS.TestManagement.SelectWorkItemView", "VSS/Controls/Dialogs", "TestManagement/Scripts/TFS.TestManagement"], (Module: typeof SelectWorkItemView_LAZY_LOAD, Dialogs: typeof Dialogs_LAZY_LOAD, TestsOM: typeof TestsOM_LAZY_LOAD) => {
            TestsOM.TestPlanSelectionHelper.setDefaultTestPlanQuery(this._defaultTestPlanQuery);
            Dialogs.show(Module.FilterTestPlansDialog, {
                width: $(window).width() * 0.8,
                height: $(window).height() * 0.8,
                attachResize: true,
                okText: Resources.OkText,
                okCallback: (queryText: string) => {
                    this._filterPlans(queryText);
                },
                title: Resources.FilterTestPlans.toLocaleUpperCase(),
                workItemCategories: [TCMLite.WorkItemCategories.TestPlan],
                hideQueryType: true,
                persistenceId: Module.PersistenceIds.SELECT_TEST_PLANS_ID,
                supportWorkItemOpen: true,
                areaPath: areaPath,
                callback: () => {
                    this._resetTestPlansFilter();
                }
            });
        });
    }

    private _filterPlans(queryText: string) {
        this.setTestPlanFilterStateAndPopulateDropDown(queryText);
    }

    private _resetTestPlansFilter() {
        // TODO: add a telemetry point for feature TestPlansResetFilter
    }

    private setTestPlanFilterStateAndPopulateDropDown(queryText: string) {
        let that = this;
        this._testPlanManager.saveAndFetchTestPlansByQueryFilter(queryText, (plansWithSelection) => {
            this._plansSelector.clearDropDown();
            this._plansSelector.setData(plansWithSelection.testPlans, plansWithSelection.selectedTestPlan);
            this._updateTestPlanFilterButton();
            if (plansWithSelection.testPlans.length < 1) {
                this._updatePageDelegate();
            }
        },
            function (e) {
                that._errorCallbackDelegate(VSS.getErrorMessage(e));
            });
    }

    private _updateTestPlanFilterButton() {
        let defaultQuery = TestPlanSelectionHelper.convertPlanQuery(this._defaultTestPlanQuery);

        this._testPlanManager.getConvertedFilteredTestPlanQueryFromRegistry(defaultQuery, (filterQuery) => {
        if (filterQuery && filterQuery.toUpperCase() !== defaultQuery.toUpperCase()) {
                this._setTestPlanFilterState(true);
            } else {
                this._setTestPlanFilterState(false);
            }
        }, delegate(this, this._errorCallbackForGetTestPlanFromRegistry));
    }

    private _setTestPlanFilterState(state: any) {
        this._testPlanFilterMenubar.updateCommandStates([{ id: TCMLite.TestPlansFilterIds.TestPlansFilter, toggled: state }]);
        this._plansSelector.setIsFilterApplied(state);
    }

    private _errorCallbackForGetTestPlanFromRegistry(e: any){
        this._setTestPlanFilterState(false);
        this._errorCallbackDelegate(VSS.getErrorMessage(e));
    }
}

export class TestPlanSelectionHelper {
    public static convertPlanQuery(data: string): string {
        let regex = /SELECT \* FROM/i;
        let updatedDefaultQuery = data.replace(regex, this._select);
        return updatedDefaultQuery;
    }

    private static _select: string = "SELECT [System.Id], [System.WorkItemType], [System.Title], [System.AssignedTo], [System.AreaPath], [System.IterationPath] FROM";
}
