import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import BulkEditTestsVM = require("TestManagement/Scripts/TFS.TestManagement.BulkEditTestsViewModel");
import ColumnOptionHelper = require("TestManagement/Scripts/TFS.TestManagement.ColumnOptionHelper");
import TCMLite = require("TestManagement/Scripts/TFS.TestManagement.Lite");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import WorkItemColumnHelper = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.WorkItem.ColumnHelper");
import Controls = require("VSS/Controls");

import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import TCMConstants = require("Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants");

let TestCaseCategoryUtils = TMUtils.TestCaseCategoryUtils;
let WITUtils = TMUtils.WorkItemUtils;

export class BulkEditHelper {

    private static _instance;
    

    constructor(testSuiteTree: any, element: any, refreshTestPointsCount: () => {}) {
        if (!BulkEditHelper._instance) {
            this._createBulkEditGrid(testSuiteTree, element);
            BulkEditHelper._instance = this;
            this._refreshTestPointsCountDelegate = refreshTestPointsCount;
        }
        return BulkEditHelper._instance;
    }

    public static getInstance() {
        return BulkEditHelper._instance;
    }

    /**
     * Hides the grid view.
     * @returns {} 
     */
    public hideBulkEditGrid(): boolean {
        let hideBulkEditGrid = this._bulkEditTestsViewModel.cleanup();
        if (hideBulkEditGrid) {
            this._bulkEditGrid.hide();
        }

        return hideBulkEditGrid;
    }

    /**
     * Shows the grid view.
     */
    public showGridView(testCaseIds: number[], isSuiteLevel: boolean, selectedSuite: TCMLite.ITestSuiteModel, currentPlan: any, savedColumns: any[], callback: IResultCallback, errorCallback: IErrorCallback): void {
        let witStore = WITUtils.getWorkItemStore();
        // Show bulkedit grid view
        this._bulkEditGrid.show();
        this._bulkEditGrid.showBusyOverlay();

        WorkItemColumnHelper.WorkItemColumnHelper.beginGetAdditionalWorkItemFields(savedColumns, (additionalFields: WITOM.FieldDefinition[]) => {
            if (selectedSuite && selectedSuite.suiteType === TCMConstants.TestSuiteType.RequirementTestSuite.toString()) {
                WorkItemManager.get(witStore).beginGetWorkItem(selectedSuite.requirementId, (requirementWorkItem: WITOM.WorkItem) => {
                    this._bulkEditTestsViewModel.initialize(testCaseIds,
                        currentPlan.plan,
                        null,
                        selectedSuite,
                        isSuiteLevel,
                        testCaseIds.length,
                        additionalFields);

                    this._bulkEditTestsViewModel.setRequirement(requirementWorkItem);
                    if (callback) {
                        callback(true);
                    }
                },
                    (error) => {
                        if (errorCallback) {
                            errorCallback(error);
                        }
                    });
            }
            else {
                this._bulkEditTestsViewModel.initialize(testCaseIds,
                    currentPlan.plan,
                    null,
                    selectedSuite,
                    isSuiteLevel,
                    testCaseIds.length,
                    additionalFields);

                this._bulkEditTestsViewModel.setRequirement(null);
                if (callback) {
                    callback(true);
                }
            }
        },
            (error) => {
                if (errorCallback) {
                    errorCallback(error);
                }
            });

    }

    /**
     * Get the current index of the bulk edit grid.
     */
    public getCurrentIndex() {
        return this._bulkEditGrid.getCurrentEditRowIndex();
    }

    private _getAvailableColumns(callback: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Gets the available columns based on the work item types that are displayed in the grid.</summary>
        /// <param name="callback" type="IResultCallback">The callback that will be fired when the column information is successfully retrieved</param>

        let additionalFields,
            fields,
            that = this;

        TestCaseCategoryUtils.getAllTestCaseCategoryWorkItemFields(function(witFields: WITOM.FieldDefinition[]) {
            additionalFields = ColumnOptionHelper.ColumnOptions.getRemovableTestPointFields(),
                fields = $.map(witFields, function(item: any) {
                    item.fieldId = item.id;
                    if (!ColumnOptionHelper.ColumnOptions.isFixedField(item) && !ColumnOptionHelper.ColumnOptions.isHiddenField(item)) {
                        return item;
                    }
                });
            fields = additionalFields.concat(fields);
            callback(fields);
        }, errorCallback);
    }

    private _createBulkEditGrid(testSuitesTree: any, element: any) {
        this._bulkEditTestsViewModel = new BulkEditTestsVM.BulkEditTestsViewModel();
        this._bulkEditTestsViewModel.testCasesAdded = (suiteUpdate: TestsOM.ITestSuiteModel) => {
            if (suiteUpdate) {
                testSuitesTree.updateSuitesRevisionAndPointCount([suiteUpdate]);
            }

            if (this._refreshTestPointsCountDelegate) {
                this._refreshTestPointsCountDelegate();
            }
        };
        
        this._bulkEditGrid = <BulkEditTestsVM.BulkEditTestsGrid>Controls.BaseControl.createIn(BulkEditTestsVM.BulkEditTestsGrid, element.find(TCMLite.GridAreaSelectors.editGrid), {
            bulkEditTestsViewModel: this._bulkEditTestsViewModel,
            parent: element,
            containerClassName: TCMLite.GridAreaSelectors.editGrid
        });

        this._bulkEditGrid.hide();
    }

    private _bulkEditGrid: BulkEditTestsVM.BulkEditTestsGrid;
    private _bulkEditTestsViewModel: any;
    private _refreshTestPointsCountDelegate: () => {};
}
