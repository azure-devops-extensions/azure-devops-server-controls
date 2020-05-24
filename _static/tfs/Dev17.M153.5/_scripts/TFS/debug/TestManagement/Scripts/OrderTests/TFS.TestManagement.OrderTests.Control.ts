// Copyright (c) Microsoft Corporation.  All rights reserved.

import q = require("q");
import Controls = require("VSS/Controls");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");

import PageHelper = require("TestManagement/Scripts/TFS.TestManagement.PageHelper");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TCMContracts = require("TFS/TestManagement/Contracts");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");

import OrderTestsCommon = require("TestManagement/Scripts/OrderTests/TFS.TestManagement.OrderTests.Common");
import OrderTestsGrid = require("TestManagement/Scripts/OrderTests/TFS.TestManagement.OrderTestsGrid");
import OrderTestsViewModel = require("TestManagement/Scripts/OrderTests/TFS.TestManagement.OrderTestsViewModel");

let delegate = Utils_Core.delegate;
let TelemetryService = TCMTelemetry.TelemetryService;

export class OrderTestsConstants {
    public static orderTestsClass = "order-testcase";
    public static orderTestsSelector = ".order-testcase";
    public static orderTestsGridClass = "order-testcases-grid-area";
    public static orderTestsGridSelector = ".order-testcases-grid-area";
    public static orderTestsLoadingPanelClass = "order-testcases-panel-loading";
    public static orderTestsLoadingPanelSelector = ".order-testcases-panel-loading";
    public static orderTestsPanelTextClass = "order-testcases-panel-text";
    public static orderTestsPanelTextSelector = ".order-testcases-panel-text";
    public static orderTestsDoneButtonClass = "order-tests-done-panel-button";
    public static orderTestsDoneButtonSelector = ".order-tests-done-panel-button";
    public static orderTestsCancelButtonClass = "order-tests-cancel-panel-button";
    public static orderTestsCancelButtonSelector = ".order-tests-cancel-panel-button";
    public static orderTestsButtonsClass = "order-tests-buttons";
    public static orderTestsButtonsSelector = ".order-tests-buttons";
    public static orderTestsDoneClass = "order-tests-done";
    public static orderTestsCancelClass = "order-tests-cancel";
    public static orderTestsPanelClass = "order-tests-panel";
    public static orderTestsPanelSelector = ".order-tests-panel";
}

export interface IOrderTestsControlOptions {
    container: JQuery;
    suiteId: number;
    orderTestControlDispose: (refreshGrid: boolean) => void;
    onError: (error) => void;
}

export class OrderTestsControl {
    private _parentElement: JQuery;
    private _orderTestsElement: JQuery;
    private _suiteId: number;
    private _sequenceIds: number[] = [];
    private _orderTestCasesGrid: OrderTestsGrid.OrderTestsGrid;
    private _orderTestViewModel: OrderTestsViewModel.OrderTestsViewModel;
    private _pageHelper: PageHelper.PageHelper;
    private _pagingInProgress: boolean = false;
    private _totalTestsCount: number;

    private pageFetched: () => void;
    private _orderTestControlDispose: (refreshGrid: boolean) => void;
    private _onError: (error) => void;

    /**
     * Creates a new OrderTestsControl
     * @param options order test control options
     */
    constructor(options: IOrderTestsControlOptions) {
        this._parentElement = options.container;
        this._suiteId = options.suiteId;
        this._orderTestControlDispose = options.orderTestControlDispose;
        this._onError = options.onError;
    }

    /**
     * Initializes OrderTestsControl
     * @param container
     */
    public _initialize(additionalWitFields?: WITOM.FieldDefinition[]) {
        if (this._orderTestsElement) {
            this.dispose();
        }

        // While initializing the ordertests control we will show Loading text until we fetch all test data and populate the grid
        let $loadingPanelDiv = $("<div/>")
            .addClass(OrderTestsConstants.orderTestsLoadingPanelClass)
            .text(Resources.LoadingImageText);

        let $orderTestsControlDiv = $("<div/>")
            .addClass(OrderTestsConstants.orderTestsClass)
            .append($("<span/>")
                .addClass(OrderTestsConstants.orderTestsPanelClass)
                .append($loadingPanelDiv))
            .append($("<div/>")
                .addClass(OrderTestsConstants.orderTestsGridClass));

        this._parentElement.append($orderTestsControlDiv);

        this._orderTestsElement = this._parentElement.find(OrderTestsConstants.orderTestsSelector);

        // Create Ordertests grid control
        this._orderTestViewModel = new OrderTestsViewModel.OrderTestsViewModel();

        this._orderTestCasesGrid = <OrderTestsGrid.OrderTestsGrid>Controls.BaseControl.createIn
            (
            OrderTestsGrid.OrderTestsGrid, this._orderTestsElement.find(OrderTestsConstants.orderTestsGridSelector), {
                orderTestsViewModel: this._orderTestViewModel,
                parent: this._orderTestsElement,
                containerClassName: OrderTestsConstants.orderTestsGridSelector,
                onMiddleRowVisible: delegate(this, this._fetchMoreTestCases),
                additionalWitFields: additionalWitFields ? additionalWitFields : []
            });
    }

    /**
     * Render the Ordertests control, as part of this it will populate grid and then show panel with done and cancel button
     */
    public render(): IPromise<void> {
        let deferred: Q.Deferred<void> = q.defer<void>();
        this._orderTestCasesGrid.show();
        this._orderTestCasesGrid.clearGrid();
        let orderTestCaseManager: TestsOM.OrderTestCaseManager = OrderTestsCommon.getOrderTestCaseManager();

        // Fetch the suite entries in the persisted ordered list, so when user click on the order tests button
        // grid will populate test case entries by persisted ordered list irrespective of sorting applied on the
        // test point grid
        orderTestCaseManager.getSuiteEntries(this._suiteId).then((suiteEntries: TCMContracts.SuiteEntry[]) => {
            let testCaseIds: number[] = [];
            let length: number = suiteEntries.length;

            for (let i = 0; i < length; i++) {
                // Above API returns child suite information also, excluding by checking testcaseId value
                if (suiteEntries[i].testCaseId > 0) {
                    testCaseIds.push(suiteEntries[i].testCaseId);
                    // Maintaining the map for existing test case sequenceIds
                    this._sequenceIds.push(suiteEntries[i].sequenceNumber);
                }
            }

            this._pageHelper = new PageHelper.PageHelper(testCaseIds, OrderTestsCommon.Constants.initPageSize, OrderTestsCommon.Constants.pageSize);
            this._totalTestsCount = testCaseIds.length;

            this._beginPageTestCases().then(() => {
                this._finishRender();
                this._orderTestCasesGrid._selectRow(0);
                this._orderTestCasesGrid.getSelectedRowIntoView();
                deferred.resolve(null);
            },
                (error) => {
                    deferred.reject(error);
                });
        },
            (error) => {
                deferred.reject(error);
            });

        return deferred.promise;
    }

    /**
     * Dispose the ordertests control
     */
    public dispose() {
        this._orderTestCasesGrid.dispose();
        this._parentElement.find(OrderTestsConstants.orderTestsSelector).remove();
        this._orderTestCasesGrid = null;
        this._orderTestViewModel = null;
        this._orderTestsElement = null;
        this._pageHelper = null;
    }

    /**
     * Return if order test grid is dirty or not
     */
    public isDirty(): boolean {
        return this._orderTestCasesGrid.isDirty;
    }

    /**
     * Reset the order test grid dirty state
     */
    public resetDirtyState() {
        this._orderTestCasesGrid.isDirty = false;
    }

    /**
     * Notify user for unsaved change
     */
    public continueAndLoseOrderTestsGridChange(): boolean {
        let status: boolean = false;
        let continueAndLoseChange = window.confirm(Resources.UnsavedChangesLoseWarning);
        if (continueAndLoseChange) {
            this.resetDirtyState();
            status = true;
        }

        return status;
    }

    /**
     * Finish the rendeing of the order tests control - here we remove loading panel text and add new panel text
     * with done and cancel button
     */
    private _finishRender() {
        let $doneButton = $("<button type='button' />")
            .text(Resources.Done)
            .click(delegate(this, this._raiseDoneEvent))
            .attr("disabled", "true")
            .addClass(OrderTestsConstants.orderTestsDoneButtonClass);

        let $cancelButton = $("<button type='button' />")
            .text(Resources.CancelText)
            .click(delegate(this, this._raiseCancelEvent))
            .addClass(OrderTestsConstants.orderTestsCancelButtonClass);

        let $buttonsDiv = $("<div/>")
            .addClass(OrderTestsConstants.orderTestsButtonsClass)
            .append($("<div/>").addClass(OrderTestsConstants.orderTestsDoneClass).append($doneButton))
            .append($("<div/>").addClass(OrderTestsConstants.orderTestsCancelClass).append($cancelButton));

        // By this time grid populate with the payloa, now remove the loading text from panel
        let $orderTestsPanel = this._orderTestsElement.find(OrderTestsConstants.orderTestsPanelSelector);
        $(OrderTestsConstants.orderTestsLoadingPanelSelector, $orderTestsPanel).remove();

        let firstPageTestCaseCount = this._orderTestViewModel.getDataSource().length;
        let panelText: string;
        if (firstPageTestCaseCount === this._totalTestsCount) {
            panelText = Utils_String.format(Resources.OrderTestsLabel, this._orderTestViewModel.getDataSource().length);
        }
        else {
            panelText = Utils_String.format(Resources.OrderTestsLabelWithPagination, this._orderTestViewModel.getDataSource().length, this._totalTestsCount);
        }
        let $panelTextDiv = $("<span/>")
            .addClass(OrderTestsConstants.orderTestsPanelTextClass)
            .text(panelText);

        // Add panel text and buttons in the panel
        $orderTestsPanel
            .append($panelTextDiv)
            .append($buttonsDiv);
        
    }

    private _replacePanelText() {
        let updatedPanelText: string;
        if (this._orderTestsElement) {
            let $orderTestsPanelText = this._orderTestsElement.find(OrderTestsConstants.orderTestsPanelTextSelector);
            let firstPageTestCaseCount = this._orderTestViewModel.getDataSource().length;

            if ($orderTestsPanelText) {
                if (firstPageTestCaseCount !== this._totalTestsCount) {
                    updatedPanelText = Utils_String.format(Resources.OrderTestsLabelWithPagination, this._orderTestViewModel.getDataSource().length, this._totalTestsCount);
                }
                else {
                    updatedPanelText = Utils_String.format(Resources.OrderTestsLabel, this._orderTestViewModel.getDataSource().length);
                }
                $orderTestsPanelText.text(updatedPanelText);
            }
        }
    }

    private _raiseCancelEvent(sender: any) {
        // Ask for the confirmation before cancel if order test case grid is dirty, else dispose the control
        if (this.isDirty() && !this.continueAndLoseOrderTestsGridChange()) {
            return;
        }

        TelemetryService.publishEvents(TelemetryService.featureOrderTestCasesCancel, {});

        this._orderTestControlDispose(false);
    }

    private _raiseDoneEvent(sender: any) {
        let suiteEntries: TCMContracts.SuiteEntryUpdateModel[] = [];
        if (this._orderTestViewModel) {
            let testCases = this._orderTestViewModel.getDataSource();
            // Sort the sequenceIds map in ascendending order and use that to assign sequence number while sending reorder request.
            this._sequenceIds.sort(function (a, b) { return a - b; });
            for (let i = 0; i < testCases.length; i++) {
                suiteEntries.push({
                    sequenceNumber: this._sequenceIds[i],
                    testCaseId: testCases[i].getId(),
                    childSuiteId: 0
                });
            }
        }

        let orderTestCaseManager: TestsOM.OrderTestCaseManager = OrderTestsCommon.getOrderTestCaseManager();

        orderTestCaseManager.reorderSuiteEntries(this._suiteId, suiteEntries).then(() => {
            this.resetDirtyState();
            this._orderTestControlDispose(true);
            TelemetryService.publishEvents(TelemetryService.featureOrderTestCasesDone, { "SuiteId": this._suiteId, "SuiteEntriesLength": suiteEntries.length });
        },
            (error) => {
                this._onError(error);
            });
    }

    private _beginPageTestCases(): IPromise<any> {
        let deferred: Q.Deferred<void> = q.defer<void>();
        let testCaseIdsToFetch: number[];

        if (this._pagingInProgress) {
            return q(null);
        }

        if (!this._pageHelper || !this._pageHelper.canPage()) {
            return q(null);
        }

        testCaseIdsToFetch = this._pageHelper.getIdsToFetch();
        this._pagingInProgress = true;
        let columnsName = this._orderTestCasesGrid.getColumnsToDisplayName();
        let that = this;

        this._orderTestViewModel.getPageTestCases(testCaseIdsToFetch, columnsName).then(() => {
            if (this._orderTestCasesGrid) {
                let visibleRange = this._orderTestCasesGrid._getVisibleRowIndices();
                that._orderTestCasesGrid.populateGridData();
                this._orderTestCasesGrid._getRowIntoView(visibleRange.first + 10, true);
                that._orderTestCasesGrid.focus();
                that._pagingInProgress = false;
                if (that._pageHelper) {
                    that._pageHelper.pageFetchComplete();
                }
                if (that.pageFetched) {
                    that.pageFetched();
                }
                deferred.resolve(null);
            }
        }, (error) => {
                deferred.reject(error);
            });

        return deferred.promise;
    }

    private _fetchMoreTestCases() {
        if (this._pagingInProgress) {
            this.pageFetched = () => {
                this.pageFetched = null;
                this._fetchTestCases();
            };
        } else {
            this._fetchTestCases();
        }
    }

    private _fetchTestCases() {
        this._beginPageTestCases().then(() => {
            this._replacePanelText();
        },
            (error) => {
                this._onError(error);
            });
    }
}