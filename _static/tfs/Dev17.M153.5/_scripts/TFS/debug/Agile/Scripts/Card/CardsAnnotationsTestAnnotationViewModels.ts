import Q = require("q");
import ko = require("knockout");
import Agile_Boards = require("Agile/Scripts/TFS.Agile.Boards");
import Agile_Controls_Resources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import AgileResources = require("Agile/Scripts/Resources/TFS.Resources.Agile");

import VSS = require("VSS/VSS");
import Events_Action = require("VSS/Events/Action");
import VSS_Core = require("VSS/Utils/Core");
import VSS_Utils_UI = require("VSS/Utils/UI");
import VSS_Utils_String = require("VSS/Utils/String");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Dialogs = require("VSS/Controls/Dialogs");

import WIT = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import TCM_Contracts = require("TFS/TestManagement/Contracts");
import Contracts = require("Agile/Scripts/Card/CardsAnnotationsTestAnnotationContracts");
import Models = require("Agile/Scripts/Card/CardsAnnotationsTestAnnotationModels");
import Source = require("Agile/Scripts/Card/CardsAnnotationsTestAnnotationSource");
import Telemetry = require("Agile/Scripts/Card/CardsAnnotationsTestAnnotationTelemetry");

import WITDialogShim = require("WorkItemTracking/SharedScripts/WorkItemDialogShim");

import Events_Services_LAZY_LOAD = require("VSS/Events/Services");
import Service_LAZY_LOAD = require("VSS/Service");
import WITControls_RecycleBin_LAZY_LOAD = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin");
import { RecycleBinConstants } from "WorkItemTracking/Scripts/RecycleBinConstants";
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");

TFS_Knockout.overrideDefaultBindings()

var sourceType = Source.TestSuiteSource.sourceType;
var delegate = VSS_Core.delegate;

// Test Suite View Model
export interface ITestSuiteViewModelOptions {
    source: Agile_Boards.WorkItemItemAdapter;
    testCaseWorkItemType: string;
    refreshBadge: () => void;
    removeTestPointCallback: () => void;
    removeTestSuiteControl: () => void;
    onMenuClick: (e: JQueryEventObject, testPoint: TestPointViewModel) => void;
}

export interface DraggableViewModel {
    isDraggable: () => any;
}

export interface DroppableViewModel {

    droppableAcceptHandler: (draggableViewModel: DraggableViewModel, sourceViewModel: DroppableViewModel) => any;
    dropHandler: (draggableViewModel: DraggableViewModel, sourceViewModel: DroppableViewModel, removeExistingLink: boolean, droppedIndex: number) => any;
}

export class TestSuiteViewModel implements DroppableViewModel {
    private _source: Agile_Boards.WorkItemItemAdapter;
    private _testCaseWorkItemType: string;
    private _handleMenuClick: (e: JQueryEventObject, testPoint: TestPointViewModel) => void;
    private _refreshBadgeCallback: () => void;
    private _removeTestSuiteControlCallback: () => void;
    private _removeTestPointCallback: () => void;

    public testPointCollection: KnockoutObservableArray<TestPointViewModel> = ko.observableArray([]);
    public scrolledItem: KnockoutObservable<TestPointViewModel> = ko.observable(<any>{});

    constructor(options: ITestSuiteViewModelOptions) {
        this._source = options.source;
        this._testCaseWorkItemType = options.testCaseWorkItemType;
        this._populateTestPointCollection();
        this._handleMenuClick = options.onMenuClick;
        this._refreshBadgeCallback = options.refreshBadge;
        this._removeTestSuiteControlCallback = options.removeTestSuiteControl;
        this._removeTestPointCallback = options.removeTestPointCallback;
    }

    public onAddTestClick() {
        this.addTestPoint();
        Telemetry.TelemeteryHelper.publishFeatureTelemetry(Telemetry.FeatureScenarios.AddTest, { "Source": "AddAnnotationButton" });
    }

    /**
    * Opens the test hub in new tab with selected suite
    */
    public onNavigateToSuiteClick() {
        var url: string = this._getTestSuiteUrl();
        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
            url: url,
            target: "_blank"
        });
    }

    // Prevent default action from happening when clicking on the tests "tab" on the card
    public onClickTestDiv() {
        return false;
    }

    public addTestPoint() {
        var testCase: Models.ITestCaseModel = new Models.TestCaseModel();
        var testPoint: Models.ITestPointModel = new Models.TestPointModel();
        testPoint.outcome(Contracts.TestOutcome.Active);
        testPoint.testCase(testCase);

        var testPointViewModel: TestPointViewModel = new TestPointViewModel({
            testPoint: testPoint,
            beginSave: delegate(this, this._onEditEnd),
            onMoreMenu: delegate(this, this._openMoreMenu),
            onDiscard: delegate(this, delegate(this, this._onDiscard)),
            refreshBadge: delegate(this, this._refreshBadge),
            quickAdd: delegate(this, delegate(this, this._onQuickAdd)),
            onTestCaseRemove: delegate(this, this._onTestcaseRemove),
            onTestCaseDeletion: delegate(this, this.onTestcaseDeletion)
        });

        this.testPointCollection.push(testPointViewModel);

        this._onEditStart(testPointViewModel);
    }

    public addDroppedTestPoint(testPointViewModel: TestPointViewModel, droppedIndex: number) {
        var droppedTestCaseId = testPointViewModel.testPoint().testCase().id;
        var testCaseAlreadyExists: boolean = false;
        var testPointCollection = this.testPointCollection();
        var oldIndex: number = -1;
        if (testPointCollection) {
            var pointCount: number = testPointCollection.length;
            for (var i: number = 0; i < pointCount; i++) {
                var currentPointTestCaseId = testPointCollection[i].testPoint().testCase().id;
                if (droppedTestCaseId === currentPointTestCaseId) {
                    oldIndex = i;
                    testCaseAlreadyExists = true;
                    break;
                }
            }

            var lastTestPoint = testPointCollection[pointCount - 1];
            //remove the add test case row
            if (lastTestPoint.testPoint().id() === 0) {
                this.testPointCollection.remove(lastTestPoint);
            }
            if (testCaseAlreadyExists) {
                var oldPoint = this.testPointCollection()[oldIndex];
                this.testPointCollection.remove(oldPoint);
            }
            this.testPointCollection.splice(droppedIndex, 0, testPointViewModel);
        }
    }

    public getSuiteModel(): Models.ITestSuiteModel {
        return (<Source.TestSuiteSource>this._source.getAnnotationItemSource(sourceType)).getItem(this._source.id());
    }

    public getTeamId(): string {
        return (this._source.getAnnotationItemSource(sourceType) as Source.TestSuiteSource).teamId;
    }

    public dispose() {
        this._handleMenuClick = null;
        this._refreshBadgeCallback = null;
        this._removeTestSuiteControlCallback = null;
        this._removeTestPointCallback = null;

        $.each(this.testPointCollection(), (i, testPoint: TestPointViewModel) => {
            testPoint.dispose();
        });

        this.testPointCollection = null;
    }

    public refreshSuite(): IPromise<void> {
        // refreshes test suite on the server - this creates/removes test points
        // on the suite - keeping it in sync with the tested by links on a requirement
        const suite = this.getSuiteModel();

        return suite.refresh(this.getTeamId(), this._source.id())
            .then(delegate(this, this.updateTestPointCollection),
                (error: TfsError) => {
                    this._setErrorMessageForPoint(this.testPointCollection(), error.message);
                })
            .then(delegate(this, this._refreshBadge))
            .then(() => {
                if (this.testPointCollection().length < 1) {
                    this._removeTestSuiteControl();
                }
            });
    }

    public getRequirementId(): number {
        var requirementId: number = -1;
        if (this._source && this._source.id()) {
            requirementId = this._source.id();
        }
        return requirementId;
    }

    public droppableAcceptHandler(testPointViewModel: TestPointViewModel, sourceSuite: TestSuiteViewModel): any {
        if (testPointViewModel && sourceSuite) {
            var sourcerequirementId = sourceSuite.getRequirementId();
            var targetRequirementId = this.getRequirementId();
            if (sourcerequirementId === targetRequirementId) {
                return false;
            }
            return true;
        }
        return false;
    }

    public dropHandler(testPointViewModel: TestPointViewModel, sourceSuite: TestSuiteViewModel, removeExistingLink: boolean, droppedIndex: number): any {
        var targetRequirementId = this.getRequirementId();
        var sourceRequirementId = sourceSuite.getRequirementId();

        this.addDroppedTestPoint(testPointViewModel, droppedIndex);

        if (targetRequirementId === sourceRequirementId) {
            //Only Reorder operation has taken place
            //  Mark the test as saving (it's order is changing) to prevent another reorder operation until it completes.
            //  Note: this doesn't happen below because this is primarily to prevent the focus being list after the reorder using hotkeys completes which is not supported across work items.
            testPointViewModel.isSaving(true);
            this._reorderTestcases(droppedIndex, () => {
                Q(this.refreshSuite()).done(
                    () => { testPointViewModel.isSaving(false); }
                );
                Telemetry.TelemeteryHelper.publishFeatureTelemetry(Telemetry.FeatureScenarios.DragDropComplete, { "Copy": (!removeExistingLink).toString() });
            });
        } else {
            //Move test case + Reorder operations have taken place
            if (targetRequirementId > 0 && testPointViewModel) {
                this.onTestPointDrop(testPointViewModel, sourceRequirementId, targetRequirementId, removeExistingLink).then(() => {
                    this._reorderTestcases(droppedIndex, () => {
                        sourceSuite.refreshSuite();
                        this.refreshSuite();
                        Telemetry.TelemeteryHelper.publishFeatureTelemetry(Telemetry.FeatureScenarios.DragDropComplete, { "Copy": (!removeExistingLink).toString() });
                    });
                });
            }
        }
    }

    public updateTestPointCollection(): void {
        let collectionUpdated = false;
        var suite = this.getSuiteModel();
        var testCaseIdToTestPointMap: IDictionaryNumberTo<TestPointViewModel> = {};
        var testcaseIds: number[] = [];

        $.each(suite.testPoints(), (index, testPoint: Models.ITestPointModel) => {
            var viewModel = new TestPointViewModel({
                testPoint: testPoint,
                onMoreMenu: delegate(this, this._openMoreMenu),
                beginSave: delegate(this, this._onEditEnd),
                onDiscard: delegate(this, this._onDiscard),
                refreshBadge: delegate(this, this._refreshBadge),
                quickAdd: delegate(this, delegate(this, this._onQuickAdd)),
                onTestCaseRemove: delegate(this, this._onTestcaseRemove),
                onTestCaseDeletion: delegate(this, this.onTestcaseDeletion)
            });
            testCaseIdToTestPointMap[testPoint.testCase().id] = viewModel;
            testcaseIds.push(testPoint.testCase().id);
        });

        var testPointsToRemove: TestPointViewModel[] = [];
        $.each(this.testPointCollection(), (index, testPointViewModel: TestPointViewModel) => {
            testPointsToRemove.push(testPointViewModel);
            var updatedViewModel = testCaseIdToTestPointMap[testPointViewModel.testPoint().testCase().id];
            if (updatedViewModel) {
                var indexofTestCase = testcaseIds.indexOf(testPointViewModel.testPoint().testCase().id);
                testcaseIds.splice(indexofTestCase, 1);

                // If something changed update the collection otherwise just leave it as it is. If you update the collection it will remove focus.
                if (updatedViewModel.testPoint().sequenceNumber() !== testPointViewModel.testPoint().sequenceNumber() ||
                    updatedViewModel.testPoint().testCase().name() !== testPointViewModel.testPoint().testCase().name()) {

                    var isEditing = testPointViewModel.isEditing();
                    this.testPointCollection.replace(testPointViewModel, updatedViewModel);
                    updatedViewModel.isEditing(isEditing);
                    collectionUpdated = true;
                }

                testPointsToRemove.pop();
            }
        });

        //Remove the point which have been removed in background
        $.each(testPointsToRemove, (index, testPointViewModel: TestPointViewModel) => {
            //We will not remove add test text box is present
            if (testPointViewModel.testPoint().id() !== 0) {
                this.testPointCollection.remove(testPointViewModel);
                collectionUpdated = true;
            }
        });

        //Add new points which got addded in background
        $.each(testcaseIds, (index, testCaseId: number) => {
            var viewModel = testCaseIdToTestPointMap[testCaseId];
            this.testPointCollection().push(viewModel);
            collectionUpdated = true;
        });

        this.testPointCollection.sort(function (point1, point2) {
            return point1.testPoint().sequenceNumber() - point2.testPoint().sequenceNumber();
        });

        if (collectionUpdated) {
            this.testPointCollection.valueHasMutated();
        }
    }

    public onTestPointDrop(testPointViewModel: TestPointViewModel, sourceRequirementId: number, targetRequirementId: number, isClone: boolean): IPromise<any> {
        var testCase = testPointViewModel.testPoint().testCase();
        if (testCase.id > 0) {
            return testCase.beginUpdateRequirementId(targetRequirementId, sourceRequirementId, isClone);
        } else {
            return Q(undefined);
        }
    }

    public onTestcaseDeletion(testPointViewModel: TestPointViewModel): void {
        var suite = this.getSuiteModel();
        suite.testPoints.remove(testPointViewModel.testPoint());
        if ($.isFunction(this._refreshBadge)) {
            this._refreshBadge();
        }
        this._onDiscard(testPointViewModel);
    }

    private _setErrorMessageForPoint(testPoints: TestPointViewModel[], errorMessage: string) {
        for (let i = 0, length = testPoints.length; i < length; i++) {
            if (testPoints[i].testPoint().id() === 0 && testPoints[i].testPoint().testCase().id !== 0) {
                testPoints[i].testPoint().errorMessage(errorMessage);
            }
        }
    }

    private _reorderTestcases(droppedIndex: number, callback: any): IPromise<any> {
        var testCasesOrder: TCM_Contracts.SuiteEntryUpdateModel[] = this._getTestCasesOrder();
        const suite = this.getSuiteModel();

        return suite.refresh(this.getTeamId(), this._source.id()).then(
            () => {
                suite.updateTestCasesOrder(testCasesOrder).then(
                    () => { callback(); },
                    (error: TfsError) => {
                        this._onReorderFailed(error, droppedIndex);
                    });
            });
    }

    private _getTestSuiteUrl(): string {
        var url: string;
        var suite = this.getSuiteModel();

        url = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl("", this.testManagementControllerName);
        return url + "?" + $.param({ planId: suite.testPlanId, suiteId: suite.testSuiteId });
    }

    private _onReorderFailed(error: TfsError, droppedIndex: number) {
        //Find the testcase in target suite and associate error message with it.
        var testPoints = this.testPointCollection();
        if (testPoints && testPoints.length > droppedIndex) {
            var firstTestPoint = testPoints[droppedIndex];
            this.refreshSuite().then(() => {
                var i: number;
                var newLength: number = this.testPointCollection().length;
                for (i = 0; i < newLength; i++) {
                    if (this.testPointCollection()[i].testPoint().testCase().id === firstTestPoint.testPoint().testCase().id) {
                        firstTestPoint = this.testPointCollection()[i];
                        break;
                    }
                }
                firstTestPoint.testPoint().errorMessage(error.message);
                // This is required to show error message icon in badge also
                this._refreshBadge();
            });
        }
    }

    private _getTestCasesOrder(): TCM_Contracts.SuiteEntryUpdateModel[] {
        var testCasesOrder: TCM_Contracts.SuiteEntryUpdateModel[] = [];
        var testPoints = this.testPointCollection();
        if (testPoints) {
            var pointCount: number = testPoints.length;
            for (var i: number = 0; i < pointCount; i++) {
                var testCase: Models.ITestCaseModel = testPoints[i].testPoint().testCase();
                var testcaseOrder: TCM_Contracts.SuiteEntryUpdateModel = {
                    childSuiteId: 0,
                    testCaseId: testCase.id,
                    sequenceNumber: i + 1
                };
                testCasesOrder.push(testcaseOrder);
            }
        }
        return testCasesOrder;
    }

    private _onEditStart(testPointViewModel: TestPointViewModel) {
        VSS_Core.delay(this, 0, () => {
            testPointViewModel.isEditing(true);
            this.scrolledItem(testPointViewModel);
        });
    }

    private _onDiscard(testPointViewModel: TestPointViewModel) {
        var removedTestPoints: TestPointViewModel[] = this.testPointCollection.remove(testPointViewModel);

        $.each(removedTestPoints, (index, testPointViewModel: TestPointViewModel) => {
            testPointViewModel.dispose();
        });

        if (this.testPointCollection().length < 1) {
            this._removeTestSuiteControl();
        }
    }

    private _onTestcaseRemove(testPointViewModel: TestPointViewModel): IPromise<any> {
        var testCase = testPointViewModel.testPoint().testCase();
        var suite = this.getSuiteModel();
        suite.testPoints.remove((testPoint) => { return testPoint.id() == testPointViewModel.testPoint().id() });
        if ($.isFunction(this._refreshBadge)) {
            this._refreshBadge();
        }
        this._onDiscard(testPointViewModel);
        this._removeTestPoint();
        if (testCase.id > 0) {
            var requirementId = this.getRequirementId();
            return testCase.beginRemove(requirementId);
        } else {
            return Q(undefined);
        }
    }

    private _onQuickAdd() {
        this.addTestPoint();
    }

    private _onEditEnd(testPointViewModel: TestPointViewModel): IPromise<any> {
        var testCase = testPointViewModel.testPoint().testCase();

        var requirement: Models.IRequirementModel = {
            id: this._source.id(),
            areaPath: this._source.fieldValue("System.AreaPath"),
            iterationPath: this._source.fieldValue("System.IterationPath")
        }

        if (testCase.id === 0) {
            return testCase.beginCreate(requirement, this._testCaseWorkItemType)
                .then(delegate(this, this.refreshSuite),
                    (error: TfsError) => {
                        testPointViewModel.testPoint().errorMessage(error.message);
                    });
        } else {
            return testCase.beginUpdate().then(
                () => {
                },
                (error: TfsError) => {
                    testPointViewModel.testPoint().errorMessage(error.message);
                }
            );
        }
    }

    private _populateTestPointCollection() {
        var suite = this.getSuiteModel();

        if (suite) {
            $.each(suite.testPoints(), (index, testPoint: Models.ITestPointModel) => {
                var viewModel = new TestPointViewModel({
                    testPoint: testPoint,
                    onMoreMenu: delegate(this, this._openMoreMenu),
                    beginSave: delegate(this, this._onEditEnd),
                    onDiscard: delegate(this, this._onDiscard),
                    refreshBadge: delegate(this, this._refreshBadge),
                    quickAdd: delegate(this, delegate(this, this._onQuickAdd)),
                    onTestCaseRemove: delegate(this, this._onTestcaseRemove),
                    onTestCaseDeletion: delegate(this, this.onTestcaseDeletion)
                });
                this.testPointCollection().push(viewModel);
            });
            this.testPointCollection.sort(function (point1, point2) {
                return point1.testPoint().sequenceNumber() - point2.testPoint().sequenceNumber();
            });
            this.testPointCollection.valueHasMutated();
        }
    }

    private _openMoreMenu(e: JQueryEventObject, testPoint: TestPointViewModel) {
        if ($.isFunction(this._handleMenuClick))
            this._handleMenuClick(e, testPoint);
    }

    private _refreshBadge() {
        if ($.isFunction(this._refreshBadgeCallback)) {
            this._refreshBadgeCallback();
        }
    }

    private _removeTestSuiteControl() {
        if ($.isFunction(this._removeTestSuiteControlCallback)) {
            this._removeTestSuiteControlCallback();
        }
    }

    private _removeTestPoint() {
        if ($.isFunction(this._removeTestPointCallback)) {
            this._removeTestPointCallback();
        }
    }

    private testManagementControllerName = "testManagement";
}

export class FieldEditorViewModel {
    private _lastIsEditingValue = false;
    private _subscription: KnockoutSubscription<boolean>;

    public isEditing: KnockoutObservable<boolean> = ko.observable(false);
    public isSaving: KnockoutObservable<boolean> = ko.observable(false);

    constructor() {
        this._subscription = this.isEditing.subscribe((newValue: boolean) => {
            if (this._lastIsEditingValue && newValue === false && !this.isSaving()) {
                this.commit();
            }
            this._lastIsEditingValue = newValue;
        });
    }

    public beginEdit() {
        this.isEditing(true);
    }

    public commit() {
    }

    public dispose() {
        this._subscription.dispose();
    }
}

export interface ITestPointViewModelOptions {
    testPoint: Models.ITestPointModel;
    onMoreMenu: (e: JQueryEventObject, testPoint: TestPointViewModel) => void;
    quickAdd: () => void;
    refreshBadge: () => void;
    beginSave: (testPoint: TestPointViewModel) => IPromise<any>;
    onDiscard: (testPoint: TestPointViewModel) => IPromise<any>;
    onTestCaseRemove: (testPoint: TestPointViewModel) => IPromise<any>;
    onTestCaseDeletion: (testPoint: TestPointViewModel) => IPromise<any>;
}

// Test Point View Model
export class TestPointViewModel extends FieldEditorViewModel implements DraggableViewModel {
    private _onMoreMenu: (e: JQueryEventObject, testPoint: TestPointViewModel) => void;
    private _refreshBadge: () => void;
    private _quickAdd: () => void;
    private _beginSaveChanges: (testPoint: TestPointViewModel) => IPromise<any>;
    private _onDiscard: (testPoint: TestPointViewModel) => IPromise<any>;
    private _onTestCaseRemove: (testPoint: TestPointViewModel) => IPromise<any>;
    private _onTestCaseDeletion: (testPoint: TestPointViewModel) => IPromise<any>;

    public testPoint: KnockoutObservable<Models.ITestPointModel>;
    public isContextMenuOpen: KnockoutObservable<boolean>;
    public isNew: KnockoutComputed<boolean>;
    public lastValue: string;
    public clampedTitle: KnockoutComputed<string>;

    constructor(options: ITestPointViewModelOptions) {
        super();
        this.testPoint = ko.observable(options.testPoint);
        this._refreshBadge = options.refreshBadge;
        this._onMoreMenu = options.onMoreMenu;
        this._beginSaveChanges = options.beginSave;
        this._onDiscard = options.onDiscard;
        this._onTestCaseRemove = options.onTestCaseRemove;
        this._onTestCaseDeletion = options.onTestCaseDeletion;
        this._quickAdd = options.quickAdd;
        this.isContextMenuOpen = ko.observable(false);
        this.isNew = ko.computed(() => {
            return this.testPoint().id() === 0;
        });

        this.clampedTitle = ko.computed(() => {
            var name = this.testPoint().testCase().name();
            if (name.length > 65) {
                name = name.substring(0, 62) + "...";
            }

            return name;
        });
    }

    public beginEdit() {
        super.beginEdit();
        this.lastValue = this.testPoint().testCase().name();
    }

    /**
     * Remove the tescase from suite
    */
    public removeTestCase() {

        let warningMessage: string = VSS_Utils_String.format(Agile_Controls_Resources.TestAnnotation_DeleteTestCaseFromSuiteFormat,
            VSS_Utils_String.format(Agile_Controls_Resources.TestAnnotation_DeleteTestCaseFromSuiteFormat,
                Agile_Controls_Resources.TestAnnotation_RemoveTestCaseWarningMessage,
                Agile_Controls_Resources.TestAnnotation_RemoveTestCaseFromRequirementSuiteMessage),
            Agile_Controls_Resources.TestAnnotation_ConfirmDeletionText);

        if (this._onTestCaseRemove) {
            let options: Dialogs.IModalDialogOptions = {
                title: AgileResources.ConfirmTestRemoval,
                contentText: warningMessage,
                okText: AgileResources.AdminWorkHub_Remove,
                okCallback: () => {
                    this._onTestCaseRemove(this);
                }
            };
            Dialogs.show(DeleteTestCaseConfirmationDialog, options);
        }
    }

    public open() {
        VSS.using(["VSS/Events/Services", "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin", "VSS/Service"],
            (Events_Services: typeof Events_Services_LAZY_LOAD, WITControls_RecycleBin: typeof WITControls_RecycleBin_LAZY_LOAD, Service: typeof Service_LAZY_LOAD) => {
                var handleFailure = (errorMessage: string) => {
                    this.testPoint().errorMessage(errorMessage);
                }
                var handleSuccess = () => {
                    if (this._onTestCaseDeletion) {
                        this._onTestCaseDeletion(this);
                    }
                }

                var eventService = Service.getLocalService(Events_Services.EventService);
                eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, handleSuccess);
                eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, handleFailure);

                var workItemId = this.testPoint().testCase().id;

                WITDialogShim.showWorkItemById(
                    workItemId,
                    {
                        save: (workItem: WIT.WorkItem) => {
                            //update title
                            this.testPoint().testCase().name(workItem.getTitle());
                        },
                        close: (workItem: WIT.WorkItem) => {
                            eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, handleSuccess);
                            eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, handleFailure);
                        }
                    });
            });
    }

    public setOutcome(teamId: string, testSuiteId: number, testPlanId: number, outcome: Contracts.TestOutcome) {
        this.testPoint().setOutcome(teamId, testSuiteId, testPlanId, outcome).then(() => {
        },
            (error: TfsError) => {
                this.testPoint().errorMessage(error.message);
            });

        if ($.isFunction(this._refreshBadge)) {
            this._refreshBadge();
        }
    }

    public openMoreMenu(data, event) {
        if ($.isFunction(this._onMoreMenu)) {
            this.isContextMenuOpen(true);
            this._onMoreMenu(event, this);
        }
    }

    public onClickHandler(data, event) {
        if (event) {
            event.stopPropagation();
        }
    }

    public refreshBadgeForError() {
        if ($.isFunction(this._refreshBadge)) {
            this._refreshBadge();
        }
    }

    public commit() {
        var newName = this.testPoint().testCase().name().trim();
        var isSame = (newName === this.lastValue);

        // if there is no change in name do nothing
        if (isSame) {
            return;
        }

        // if name is now empty discard if the test point is new else reset to previous name
        var isEmpty = (newName === "");

        if (isEmpty) {
            this.isNew() ? this._onDiscard(this) : this.testPoint().testCase().name(this.lastValue);
        }
        else {

            // hack: this will trigger recalc of use of ellipsis
            this.testPoint().testCase().name.valueHasMutated();

            // start saving
            this.isSaving(true);

            this._beginSaveChanges(this)
                .then(() => {

                    if ($.isFunction(this._refreshBadge)) {
                        this._refreshBadge();
                    }

                    this.isSaving(false);
                }, () => {

                    this.isSaving(false);
                });
        }
    }

    public onContextMenu(data: any, e: JQueryEventObject) {
        e.stopPropagation();
        return true;
    }

    public onKeyUp(data: any, e: JQueryKeyEventObject) {
        if (!this._onKeyUpAnyMode(data, e)) {
            return false;
        }

        if (this.isEditing()) {
            return this._onKeyUpInEditMode(data, e);
        } else {
            return this._onKeyUpInNonEditMode(data, e);
        }
    }

    /**
     * Handle keypress that should be reacted to in any (edit or non-edit) mode.
     */
    private _onKeyUpAnyMode(data: any, e: JQueryKeyEventObject): boolean {
        if ((e.keyCode === VSS_Utils_UI.KeyCode.F10) && e.shiftKey) {
            this.openMoreMenu(data, e);
            return false;
        }

        return true;
    }

    /**
     * Handle keypress while not in edit mode.
     *    Enter => Enter edit mode.
     */
    private _onKeyUpInNonEditMode(data: any, e: JQueryKeyEventObject): boolean {
        let continueBubbling = true;

        if (e.keyCode === VSS_Utils_UI.KeyCode.F2) {
            this.beginEdit();

            continueBubbling = false;
        }
        if (e.keyCode === VSS_Utils_UI.KeyCode.ENTER) {
            this.open();

            continueBubbling = false;
        }

        if (!continueBubbling) {
            e.preventDefault();
            e.stopPropagation();
        }

        return continueBubbling;
    }

    /**
     * Handle keypress while in edit mode.
     *   Enter, Esc, Tab => Exit from edit mode and "fix" focus.
     */
    private _onKeyUpInEditMode(data: any, e: JQueryKeyEventObject): boolean {
        let continueBubbling = true;

        // Keys that exit edit mode and require resetting focus
        if (e.keyCode === VSS_Utils_UI.KeyCode.ENTER || e.keyCode === VSS_Utils_UI.KeyCode.ESCAPE) {
            // Grab handles to this element's parents before it is removed from the dom so we can properly set focus.
            const $thisElement = $(e.target).parents(".test");
            const tabbableElements = $(document).find("[tabindex='0']");
            const testElementLength = $(e.target).parents(".test-list-container")[0].children.length;
            const thisElementIndex = tabbableElements.index($thisElement);
            const isNew = this.isNew && this.isNew();

            // Perform the operation for the key event
            if (e.keyCode === VSS_Utils_UI.KeyCode.ENTER) {
                this.isEditing(false);

                if (isNew) {
                    if ($.isFunction(this._quickAdd)) {
                        this._quickAdd();

                        // Note: focus is set to the new item that was added.
                    }
                    else { // Didn't create a new test
                        // Set the focus to the previous test if there is one - otherwise set it back to the previous item outside the annotation dropdown (usually the card).
                        if (testElementLength > 1) {
                            tabbableElements[thisElementIndex - 1].focus();
                        }
                        else {
                            tabbableElements[thisElementIndex - 3].focus();
                        }
                    }
                }
                else {
                    // Editing an existing test - reset focus there.
                    tabbableElements[thisElementIndex].focus();
                }
            }
            else {  // ESCAPE
                const isNew = this.isNew && this.isNew();

                this.testPoint().testCase().name("");
                this.isEditing(false);

                if (isNew) {   // A new item which was just removed because it was empty...
                    // Set the focus to the previous test if there is one - otherwise set it back to the previous item outside the annotation dropdown (usually the card).
                    if (testElementLength > 1) {
                        tabbableElements[thisElementIndex - 1].focus();
                    }
                    else {
                        tabbableElements[thisElementIndex - 3].focus();
                    }
                }
                else {  // An existing item... reset focus to that item.
                    tabbableElements[thisElementIndex].focus();
                }
            }

            continueBubbling = false;
        }
        // Keys that exit edit mode and don't require special handling of focus
        else if (e.keyCode === VSS_Utils_UI.KeyCode.TAB) {
            this.isEditing(false);
        }

        if (!continueBubbling) {
            e.preventDefault();
            e.stopPropagation();
        }

        return continueBubbling;
    }

    /**
    * Handles the selectStart event which gets fired when we start selection.
    *
    * @param data testCase Knockout view model
    * @param e selectStart Jquery event object
    * @return true to allow selection
    */
    public onSelectStart(data: any, e: JQueryKeyEventObject) {
        //IE was not allowing selection of text in textarea. The reason was selectStart Event was 
        //not getting fired or was not handled properly in framework. 
        e.stopPropagation();
        return true;
    }

    public isDraggable(): any {
        if (!this.isEditing()) {
            return true;
        }
        return false;
    }

    public dispose() {
        super.dispose();
        this.clampedTitle.dispose();
        this.clampedTitle = null;
        this.isNew.dispose();
        this.isNew = null;
        this._onMoreMenu = null;
        this._refreshBadge = null;
        this._quickAdd = null;
        this._beginSaveChanges = null;
        this._onDiscard = null;
    }
}

class DeleteTestCaseConfirmationDialog extends Dialogs.ConfirmationDialog {
    /**
     * Initialize options
     *
     * @param options options
     */
    public initializeOptions(options?: Dialogs.IConfirmationDialogOptions) {
        super.initializeOptions($.extend({
            width: 500,
            height: "auto",
        }, options));
    }

    /**
     * Gets the current dialog result which will be used when ok button is clicked.
     */
    public getDialogResult() {
        return true;
    }
}



