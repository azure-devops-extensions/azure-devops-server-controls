///<amd-dependency path="jQueryUI/droppable"/>
///<amd-dependency path="VSS/Utils/Draggable"/>
import ko = require("knockout");

import Agile_Boards = require("Agile/Scripts/TFS.Agile.Boards");
import Agile_Controls_Resources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import Agile_Annotations = require("Agile/Scripts/Card/CardsAnnotationsCommon");

import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");

import Utils_UI = require("VSS/Utils/UI");
import Utils_Card = require("Agile/Scripts/Card/CardUtils");

import VSS_Controls = require("VSS/Controls");
import VSS_Core = require("VSS/Utils/Core");
import VSS_Menus = require("VSS/Controls/Menus");

import Contracts = require("Agile/Scripts/Card/CardsAnnotationsTestAnnotationContracts");
import ViewModels = require("Agile/Scripts/Card/CardsAnnotationsTestAnnotationViewModels");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import { loadHtmlTemplate } from "Agile/Scripts/Board/Templates";

TFS_Knockout.overrideDefaultBindings()

var delegate = VSS_Core.delegate;

export interface ITestSuiteControlOptions {
    source: Agile_Boards.WorkItemItemAdapter;
    defaultTestWorkItemType: string;
    refreshBadge: () => void;
    removeTestSuiteControl: () => void;
}

export class TestSuiteControl extends VSS_Controls.Control<ITestSuiteControlOptions> {
    private static template = "test_list_template";
    private static templateClass = "test-list-template";
    private static testList = ".test-list";
    private static testItemContextMenu = ".test-point-context-menu";
    private static testCaseContainer = ".test-list-container .test";
    private static testError = ".test-list-container .error-message-icon";
    private static testState = ".test-list-container .test-state";

    private _menu: TestMenu;
    private _testListElement: JQuery;
    private _source: Agile_Boards.WorkItemItemAdapter;
    private _managedTitleTooltips: RichContentTooltip[];
    private _managedErrorStateTooltips: RichContentTooltip[];
    private _managedTestStateTooltips: RichContentTooltip[];
    private _subscriptions: any[];

    private _refreshBadge: () => void;
    private _removeTestSuiteControl: () => void;

    public viewModel: ViewModels.TestSuiteViewModel;

    constructor(options: ITestSuiteControlOptions) {
        super(options);
        this._refreshBadge = options.refreshBadge;
        this._source = options.source;
        this._removeTestSuiteControl = options.removeTestSuiteControl;
        this._managedTitleTooltips = [];
        this._managedErrorStateTooltips = [];
        this._managedTestStateTooltips = [];
        var testSuiteOptions: ViewModels.ITestSuiteViewModelOptions = {
            source: options.source,
            testCaseWorkItemType: options.defaultTestWorkItemType,
            onMenuClick: delegate(this, this._onMenuClick),
            refreshBadge: this._refreshBadge,
            removeTestSuiteControl: this._removeTestSuiteControl,
            removeTestPointCallback: () => { this.focus(); }
        }

        this.viewModel = new ViewModels.TestSuiteViewModel(testSuiteOptions);
    }

    public initialize() {
        super.initialize();

        var $element = loadHtmlTemplate(TestSuiteControl.template, TestSuiteControl.templateClass);
        if ($element) {
            ko.applyBindings(this.viewModel, $element[0]);
            this.getElement().append($element);
            this.enhanceTooltips();
        } else {
            throw Error("failed to load template: ");
        }

        this._initMenu();
        this._initializeEvent();
    }

    public refresh() {
        if (this.viewModel) {
            this.viewModel.updateTestPointCollection();
        }
    }

    public dispose() {
        super.dispose();
        if (this._testListElement) {
            this._testListElement.off("click");
        }
        if (this._menu) {
            this._menu.dispose();
        }
        this.viewModel.dispose();
        this._disposeManagedTooltips();
        this._refreshBadge = null;
        this._removeTestSuiteControl = null;

    }

    private _disposeManagedTooltips() {
        for (var i = 0; i < this._managedTitleTooltips.length; i++) {
            let titleTooltip = this._managedTitleTooltips[i];
            if (titleTooltip) {
                titleTooltip.dispose();
            }
        }
        for (var i = 0; i < this._managedErrorStateTooltips.length; i++) {
            this._managedErrorStateTooltips[i].dispose();
        }
        for (var i = 0; i < this._managedTestStateTooltips.length; i++) {
            this._managedTestStateTooltips[i].dispose();
        }
        this._managedTitleTooltips = [];
        this._managedErrorStateTooltips = [];
        this._managedTestStateTooltips = [];

        if (this._subscriptions) {
            for (var x = 0; x < this._subscriptions.length; x++) {
                const temp = this._subscriptions[x];
                temp.dispose();
            }
            this._subscriptions = null;
        }
    }

    /**
     * Set focus to this container - sets the focus to the first element in this container.
     */
    public focus(): void {
        const $element = this.getElement();
        const tabbableElements = $element.find("[tabindex='0']");
        if (tabbableElements) {
            tabbableElements[0].focus();
        }

        // Update tooltips now that they are visible for ellipsis calculation
        const testPointCollectionObservable = this.viewModel.testPointCollection;
        this._addTooltipsToItems(testPointCollectionObservable())
    }

    private enhanceTooltips() {
        this._addBaseTooltips();

        const testPointCollectionObservable = this.viewModel.testPointCollection;
        testPointCollectionObservable.subscribe(this._addTooltipsToItems);
        this._addTooltipsToItems(testPointCollectionObservable())
    }

    private _addBaseTooltips(): void {
        const $element = this.getElement();
        const $openSuiteContainer = $element.find(".navigate-to-suite-container .bowtie-arrow-open");
        if ($openSuiteContainer.length > 0) {
            RichContentTooltip.add(Agile_Controls_Resources.TestAnnotation_NavigateToSuiteTooltip, $openSuiteContainer, { setAriaDescribedBy: true });
        }
    }

    private _addTooltipsToItems = (newItems: ViewModels.TestPointViewModel[]): void => {
        this._disposeManagedTooltips();

        this._subscriptions = [];

        for (var x = 0; x < newItems.length; x++) {
            var item = newItems[x];
            const testPoint = item.testPoint();
            const nameObservable = testPoint.testCase().name;
            const outcomeObservable = testPoint.outcome;
            const errorMessageObservable = testPoint.errorMessage;
            this._titleChangedTooltipHandler(x, nameObservable());
            this._testStatusChangedTooltipHandler(x, outcomeObservable());
            this._errorStateChangedTooltipHandler(x, errorMessageObservable());

            const nameSubscription = nameObservable.subscribe(VSS_Core.curry(this._titleChangedTooltipHandler, x));
            const outcomeSubscription = outcomeObservable.subscribe(VSS_Core.curry(this._testStatusChangedTooltipHandler, x));
            const errorMsgSubscription = errorMessageObservable.subscribe(VSS_Core.curry(this._errorStateChangedTooltipHandler, x));

            this._subscriptions.push(nameSubscription);
            this._subscriptions.push(outcomeSubscription);
            this._subscriptions.push(errorMsgSubscription);
        }
    }

    private _titleChangedTooltipHandler = (index: number, newTitle: string): void => {
        var tooltip = this._managedTitleTooltips[index];
        const elements = this.getElement().find(TestSuiteControl.testCaseContainer);
        const element = $(elements[index]).find(".title");
        if (tooltip) {
            tooltip.setTextContent(newTitle);
            Utils_Card.applyEllipsis(element, element.children());
        }
        else {
            const tooltip = Utils_Card.applyEllipsis(element, element.children());
            if (this._managedTitleTooltips[index] != null) {
                this._managedTitleTooltips.push(tooltip);
            } else {
                this._managedTitleTooltips[index] = tooltip;
            }
        }
    }


    private _errorStateChangedTooltipHandler = (index: number, newErrorMessage: string): void => {
        if (newErrorMessage) {
            var tooltip = this._managedErrorStateTooltips[index];
            if (tooltip) {
                tooltip.setTextContent(newErrorMessage);
            }
            else {
                const elements = this.getElement().find(TestSuiteControl.testError);
                tooltip = RichContentTooltip.add(newErrorMessage, elements[index], { setAriaDescribedBy: true });
                this._managedErrorStateTooltips.push(tooltip);
            }

        }
    }

    private _testStatusChangedTooltipHandler = (index: number, newOutcome: number): void => {
        var outcometext = Contracts.TestOutcomeHelper.GetOutcomeText(newOutcome);
        if (outcometext) {
            var tooltip = this._managedTestStateTooltips[index];
            if (tooltip) {
                tooltip.setTextContent(outcometext);
            }
            else {
                const elements = this.getElement().find(TestSuiteControl.testState);
                var testStatusTooltip = RichContentTooltip.add(outcometext, elements[index], { setAriaDescribedBy: true });
                this._managedTestStateTooltips.push(testStatusTooltip);
            }

        }
    }

    private _initMenu() {
        this.getElement().click((e) => {

            if (!$(e.currentTarget).hasClass("test-menu")) {

                if (this._menu) {
                    this._menu.dispose();
                    this._menu = null;
                }
            }
        });
    }

    private _initializeEvent() {
        // Going with jquery approach until we support signalR which is planned user story
        // Here listening on click event (interstingly other custom event doesn't work here)
        // Handler will call refreshSuite which refreshes the test annotation
        this._testListElement = this.getElement().find(TestSuiteControl.testList);
        if (this._testListElement) {
            this._testListElement.on('click', delegate(this, this._testAnnotationRefreshHandler));
        }
    }

    private _testAnnotationRefreshHandler() {
        var requirementId = parseInt(window.sessionStorage["requirementId"], 10);
        if (this.viewModel.getRequirementId() === requirementId) {
            this.viewModel.refreshSuite();
            window.sessionStorage.removeItem("requirementId");
        }
    }

    private _onMenuClick(e: JQueryEventObject, testPoint: ViewModels.TestPointViewModel) {
        if (this._menu) {
            var testMenuOptions = <ITestMenuOptions>this._menu._options;
            testMenuOptions.testPoint.isContextMenuOpen(false);
            this._menu.dispose();
            this._menu = null;
        }

        var options: ITestMenuOptions = {
            align: "left-bottom",
            testPoint: testPoint,
            source: this._source,
            teamId: this.viewModel.getTeamId(),
            suiteId: this.viewModel.getSuiteModel().testSuiteId,
            planId: this.viewModel.getSuiteModel().testPlanId,
            onHide: () => { testPoint.isContextMenuOpen(false) }
        }

        this._menu = VSS_Controls.Control.create(TestMenu, this.getElement(), options);

        if (this._menu) {
            testPoint.isContextMenuOpen(true);
            var $anchor = $(e.currentTarget);
            var $container = $anchor.find(TestSuiteControl.testItemContextMenu);
            if ($container && $container.length > 0) {
                // case to handle right click on anywhere on the test annotation
                this._menu.popup($anchor, $container);
            }
            else {
                // default case to handle left click on the context menu icon
                this._menu.popup($anchor, $anchor);
            }
            this._menu.focus();
            e.stopPropagation();
        }
    }
}

export interface ITestMenuOptions extends VSS_Menus.PopupMenuOptions {
    testPoint: ViewModels.TestPointViewModel;
    source: Agile_Boards.WorkItemItemAdapter;
    teamId: string;
    suiteId: number;
    planId: number;
    onHide: () => void;
}

export class TestMenu extends VSS_Menus.PopupMenu {
    constructor(options: ITestMenuOptions) {
        super(options);
    }

    public initializeOptions(options?: ITestMenuOptions) {
        var items = this._createPopupMenuItems(options);
        $.extend(options, {
            align: "left-bottom",
            items: [{ childItems: items }],
            contributionIds: ["ms.vss-test-web.wit-test-point-context"],
            contextInfo: {
                item: { getContributionContext: this.getContributionContext.bind(this) }
            },
            onPopupEscaped: () => { this.dispose(); }
        });

        super.initializeOptions(options);
    }

    private getContributionContext(): any {
        var context =
            {
                id: this.getOptions().testPoint.testPoint().testCase().id,
                requirementId: this.getOptions().source.id(),
                testPointId: this.getOptions().testPoint.testPoint().id(),
                testPlanId: this.getOptions().planId,
                testSuiteId: this.getOptions().suiteId,
                testPointOutCome: Contracts.TestOutcomeHelper.toByte(this.getOptions().testPoint.testPoint().outcome()),
                onErrorDelegate: delegate(this, this._onError)
            };

        return context;
    }

    private _onError(errorMessage: string) {
        this.getOptions().testPoint.testPoint().errorMessage(errorMessage);

        // This is required to show error message icon in badge also
        this.getOptions().testPoint.refreshBadgeForError();
    }

    private getOptions(): ITestMenuOptions {
        return <ITestMenuOptions>this._options;
    }

    private _createPopupMenuItems(options: ITestMenuOptions): any[] {
        var menuItems = [];

        const { testPoint, suiteId, planId, teamId } = options;

        menuItems.push({
            id: "open-testcase",
            text: Agile_Controls_Resources.TestAnnotation_OpenTestTitle,
            cssClass: "inlinetest-menu-item",
            icon: "bowtie-icon bowtie-arrow-open",
            setTitleOnlyOnOverflow: true,
            argument: null,
            action: () => {
                testPoint.open();
            }
        });
        menuItems.push({
            separator: true
        });
        menuItems.push({
            id: "edit-title",
            text: Agile_Controls_Resources.TestAnnotation_EditTitle,
            cssClass: "inlinetest-menu-item",
            icon: "bowtie-icon bowtie-edit",
            setTitleOnlyOnOverflow: true,
            argument: null,
            action: () => {
                testPoint.beginEdit();
            }
        });
        menuItems.push({
            id: "remove-testcase",
            text: Agile_Controls_Resources.TestAnnotation_RemoveTestTitle,
            cssClass: "inlinetest-menu-item",
            icon: "bowtie-icon bowtie-edit-delete",
            setTitleOnlyOnOverflow: true,
            argument: null,
            action: () => {
                testPoint.removeTestCase();
            }
        });
        menuItems.push({
            separator: true
        });
        menuItems.push({
            id: "set-active",
            text: Agile_Controls_Resources.TestAnnotation_ResetToActive,
            cssClass: "inlinetest-menu-item",
            icon: "bowtie-icon bowtie-edit-redo",
            setTitleOnlyOnOverflow: true,
            argument: null,
            action: () => {
                testPoint.setOutcome(teamId, suiteId, planId, Contracts.TestOutcome.Active);
            }
        });
        menuItems.push({
            id: "set-passed",
            text: Agile_Controls_Resources.TestAnnotation_PassTest,
            cssClass: "inlinetest-menu-item",
            icon: "bowtie-icon bowtie-status-success",
            setTitleOnlyOnOverflow: true,
            argument: null,
            action: () => {
                testPoint.setOutcome(teamId, suiteId, planId, Contracts.TestOutcome.Passed);
            }
        });
        menuItems.push({
            id: "set-failed",
            text: Agile_Controls_Resources.TestAnnotation_FailTest,
            cssClass: "inlinetest-menu-item",
            icon: "bowtie-icon bowtie-status-failure",
            setTitleOnlyOnOverflow: true,
            argument: null,
            action: () => {
                testPoint.setOutcome(teamId, suiteId, planId, Contracts.TestOutcome.Failed);
            }
        });
        menuItems.push({
            id: "set-blocked",
            text: Agile_Controls_Resources.TestAnnotation_BlockTest,
            cssClass: "inlinetest-menu-item",
            icon: "bowtie-icon bowtie-math-minus-circle",
            setTitleOnlyOnOverflow: true,
            argument: null,
            action: () => {
                testPoint.setOutcome(teamId, suiteId, planId, Contracts.TestOutcome.Blocked);
            }
        });
        menuItems.push({
            id: "set-not-applicable",
            text: Agile_Controls_Resources.TestAnnotation_NotApplicableTest,
            cssClass: "inlinetest-menu-item",
            icon: "bowtie-icon bowtie-status-no-fill noFillColor",
            setTitleOnlyOnOverflow: true,
            argument: null,
            action: () => {
                testPoint.setOutcome(teamId, suiteId, planId, Contracts.TestOutcome.NotApplicable);
            }
        });

        return menuItems;
    }

    public dispose() {
        var options = <ITestMenuOptions>this._options;
        if (options && options.testPoint) {
            options.testPoint.isContextMenuOpen(false);
        }
        super.dispose();
    }
}



// TODO: the hasFocus binding seems to be missing in current version of knockout hence a custom implementation for the same
// bubble this to the platform team and request an upgrade to the knockout version if possible
// this binding sets/removes focus based on binding with an boolean observable property on the view model
// this is required for the editor control - we decided to not reuse the agile card control (jQuery control) for this since we intend to pull out the annotation code
// from agile and do not want such dependencies
class FocusBinding {
    public register() {
        (<any>ko.bindingHandlers).focusOn = {
            init: (element, valueAccessor) => {
                var handleElementFocusChange = (isFocused: boolean) => {
                    element[this._hasfocusUpdatingProperty] = true;
                    isFocused = $(element).is(":focus");
                    if (valueAccessor()() !== isFocused) {
                        valueAccessor()(isFocused);
                    }
                    element[this._hasfocusLastValue] = isFocused;
                    element[this._hasfocusUpdatingProperty] = false;
                }

                $(element).focus(() => {
                    handleElementFocusChange(true);
                });

                $(element).blur(() => {
                    handleElementFocusChange(false);
                });

            },
            update: (element, valueAccessor) => {
                var value = valueAccessor();
                if (!element[this._hasfocusUpdatingProperty] && element[this._hasfocusLastValue] !== value()) {
                    if (value()) {
                        $(element).focus();
                        if ($(element).is("textarea")) {
                            $(element).select();
                        }
                    }
                    else {
                        $(element).blur();
                    }
                }
            }
        };
    }

    private _hasfocusUpdatingProperty = "__ko_hasfocusUpdating";
    private _hasfocusLastValue = "__ko_hasfocusLastValue";
}

// binding to map test outcome icon to its enum value
class TestOutcomeBinding {
    public register() {
        (<any>ko.bindingHandlers).testOutcome = {
            init: (element, valueAccessor) => {
                var outcome = valueAccessor();
                $(element).addClass(this._getIcon(outcome()));
            },
            update: (element, valueAccessor) => {
                var outcome = valueAccessor();
                $(element).removeClass();
                $(element).addClass("test-state icon").addClass(this._getIcon(outcome()));
            }
        };
    }

    private _getIcon(outcome: Contracts.TestOutcome) {
        switch (outcome) {
            case Contracts.TestOutcome.Active:
                return "bowtie-icon bowtie-dot";
            case Contracts.TestOutcome.Passed:
                return "bowtie-icon bowtie-status-success";
            case Contracts.TestOutcome.Failed:
                return "bowtie-icon bowtie-status-failure";
            case Contracts.TestOutcome.Blocked:
                return "bowtie-icon bowtie-math-minus-circle";
            case Contracts.TestOutcome.NotApplicable:
                return "bowtie-icon bowtie-status-no-fill noFillColor";
            case Contracts.TestOutcome.Paused:
                return "bowtie-icon bowtie-status-pause";
            case Contracts.TestOutcome.InProgress:
                return "bowtie-icon bowtie-status-run";
        }

        return "";
    }
}

class DraggableTestPointBinding {

    public register() {
        var that = this;
        (<any>ko.bindingHandlers).draggableTestPointItem = {
            init: (element, valueAccessor) => {
                that._makeItemDraggable(element, valueAccessor);
            }
        };
    }

    private _makeItemDraggable(element, valueAccessor) {
        var options = valueAccessor();
        $(element).data(DragDropBindingConstants.DataKeyDraggableItem, options.item);
        $(element).data(DragDropBindingConstants.DataKeyDroppableItem, options.parentItem);
    }

}

class DroppableTestPointListBinding {

    public register() {
        var that = this;
        (<any>ko.bindingHandlers).droppableTestPointContainer = {
            init: (element, valueAccessor) => {
                that._makeItemSortable(element, valueAccessor);
                that._makeItemDroppable(element, valueAccessor);
            }
        };
    }

    private _makeItemSortable(element, valueAccessor) {

        $(element).data(DragDropBindingConstants.DataKeyDroppableItem, valueAccessor());

        VSS_Core.delay(this, 0, () => {
            $(element).data(DragDropBindingConstants.DataKeyItemList, valueAccessor());
            $(element).sortable(<JQueryUI.SortableOptions><any>{
                items: DragDropBindingConstants.TEST_POINT_SELECTOR,
                cancel: DragDropBindingConstants.EditModeClassSelector,
                tolerance: "pointer",
                opacity: 0.8,
                cursor: "move",
                refreshPositions: true,
                zIndex: 1000,
                appendTo: document.body,
                containment: ".agile-board",
                connectWith: DragDropBindingConstants.TEST_LIST_CONTAINER_SELECTOR,
                scope: Agile_Annotations.AnnotationAdapter.DRAG_SCOPE_ANNOTATION_ITEM,
                hoverClass: DragDropBindingConstants.DRAG_DROP_HOVER_CLASS,
                helper: (event: JQueryEventObject, ui) => {
                    if (event.ctrlKey || event.metaKey) {
                        return this._cloneHelper(ui, event);
                    }
                    else {
                        return this._moveHelper(ui, event);
                    }
                },
                start: (event: JQueryEventObject, ui) => {
                    $(".recycle-bin").droppable('option', 'disabled', true); // Test Case cannot be deleted
                    $(ui.item).data(DragDropBindingConstants.DataKeyOldIndex, ui.item.index()); // Remember old index
                    ui.helper.width(ui.placeholder.width());
                },
                beforeStop: (event: JQueryEventObject, ui) => {
                    $(element).sortable("enable");
                },
                stop: (event: JQueryEventObject, ui) => {
                    $(".recycle-bin").droppable('option', 'disabled', false);
                    this._onSortStop(event, ui, element);
                },
                sort: (event: JQueryEventObject, ui) => {
                    this._onSort(event, ui, $(element));
                },
                update: (event: JQueryEventObject, ui) => {
                    this._onUpdate(event, ui);
                }
            })
                .keydown((event: JQueryKeyEventObject) => {
                    return this._onKeyDown(event);
                })
        });
    }

    private _makeItemDroppable(element, valueAccessor) {
        // make the container droppable to track the dragged item.
        // we can't use sortable over/out events to track the dragged item in all scenarios with connected sortable containers.
        $(element).droppable({
            over: (event: JQueryEventObject, ui) => {
                this._onSortableOver(event, ui, element);
            },
            out: (event: JQueryEventObject, ui) => {
                this._onSortableOut(event, ui, element);
            },
            scope: Agile_Annotations.AnnotationAdapter.DRAG_SCOPE_ANNOTATION_ITEM,
            accept: DragDropBindingConstants.TEST_POINT_SELECTOR,
            tolerance: "pointer"
        });
    }

    private _onSortableOver(event: JQueryEventObject, ui: any, targetElement: any) {
        var sortableItemPlaceholderSelector = DragDropBindingConstants.TEST_POINT_SELECTOR + ".ui-sortable-placeholder";
        var isAccepted: boolean = true;

        var sourceDroppableViewModel: ViewModels.DroppableViewModel = ui.draggable.data(DragDropBindingConstants.DataKeyDroppableItem);
        var targetDroppableViewModel: ViewModels.DroppableViewModel = $(targetElement).data(DragDropBindingConstants.DataKeyDroppableItem);

        if ((event.ctrlKey || event.metaKey) && targetDroppableViewModel === sourceDroppableViewModel) {
            isAccepted = false;
        }

        $(targetElement).sortable("enable");
        if (!isAccepted) {
            $(targetElement).sortable("disable");
            $(ui.placeholder).css('display', 'none');
            $(sortableItemPlaceholderSelector).addClass(DragDropBindingConstants.HIDE_PLACEHOLDER_CLASS);
            ui.draggable.removeClass(DragDropBindingConstants.ORIGINAL_TESTPOINT_CLASS);
        }
        else {
            var $placeHolder = $(sortableItemPlaceholderSelector);
            $placeHolder.removeClass(DragDropBindingConstants.HIDE_PLACEHOLDER_CLASS);
            // remove original item only if it's over its original container
            if (ui.draggable.parent()[0] === $placeHolder.parent()[0]) {
                ui.draggable.removeClass(DragDropBindingConstants.ORIGINAL_TESTPOINT_CLASS);
            }
        }
    }

    private _onSortableOut(event: JQueryEventObject, ui: any, targetElement: any) {
        var sortableItemPlaceholderSelector = DragDropBindingConstants.TEST_POINT_SELECTOR + ".ui-sortable-placeholder";
        if (event.ctrlKey || event.metaKey) {
            //Hide the placeholder in case of clone
            $(ui.placeholder).css('display', 'none');
            ui.draggable.removeClass(DragDropBindingConstants.ORIGINAL_TESTPOINT_CLASS);
        } else {
            ui.draggable.addClass(DragDropBindingConstants.ORIGINAL_TESTPOINT_CLASS);
        }
        $(sortableItemPlaceholderSelector).addClass(DragDropBindingConstants.HIDE_PLACEHOLDER_CLASS);
    }

    private _isAccepted(event: JQueryEventObject, ui: any, source: any): boolean {
        var sourceDroppableViewModel: ViewModels.DroppableViewModel = ui.item.data(DragDropBindingConstants.DataKeyDroppableItem);
        var targetDroppableViewModel: ViewModels.DroppableViewModel = $(source).data(DragDropBindingConstants.DataKeyDroppableItem);

        if ((event.ctrlKey || event.metaKey) && targetDroppableViewModel === sourceDroppableViewModel) {
            return false;
        }
        return true;
    }

    private _moveHelper(draggableTestPoint: any, event: JQueryEventObject): JQuery {
        var $helper = draggableTestPoint.clone();
        $helper.find(".clickable-title").attr("title", "");
        $helper.data(DragDropBindingConstants.DataKeyId, ko.dataFor(draggableTestPoint[0]).testPoint().id());
        return $helper;
    }

    private _cloneHelper(draggableTestPoint: any, event: JQueryEventObject): JQuery {
        var $helper = draggableTestPoint.clone().insertAfter(draggableTestPoint);
        $helper.data(DragDropBindingConstants.DataKeyId, ko.dataFor(draggableTestPoint[0]).testPoint().id());
        $(this).data('copied', false);
        return draggableTestPoint.clone().insertAfter(draggableTestPoint);
    }

    private _dropHandler(event: JQueryEventObject, ui: any, target: any) {

        var draggableViewModel: ViewModels.DraggableViewModel = ui.item.data(DragDropBindingConstants.DataKeyDraggableItem);
        var sourceDroppableViewModel: ViewModels.DroppableViewModel = ui.item.data(DragDropBindingConstants.DataKeyDroppableItem);
        var droppableViewModel: ViewModels.DroppableViewModel = $(target).data(DragDropBindingConstants.DataKeyDroppableItem);
        var droppedIndex: number = ui.item.index();

        var removeExistingLink: boolean = !(event.ctrlKey || event.metaKey);

        ko.removeNode(ui.item[0]);

        if (draggableViewModel && droppableViewModel) {
            droppableViewModel.dropHandler(draggableViewModel, sourceDroppableViewModel, removeExistingLink, droppedIndex);
        }
    }

    private _onSortStop(event: JQueryEventObject, ui: any, droppableTestSuite: any) {

        // on cancellation/completion revert to the original style
        ui.item.removeClass(DragDropBindingConstants.ORIGINAL_TESTPOINT_CLASS);
        $(droppableTestSuite).sortable("enable");
        if (ui.item.data(DragDropBindingConstants.DataKeyItemDroppedOnTile)) {
            // if item was dropped on a tile && there was no update event (while dragging there was no DOM change),
            // delete the original item
            ko.removeNode(ui.item[0]);
        } else {
            var testPoint = ko.dataFor(ui.item[0]);
            var droppedIndex = ui.item.index();
            // if item was dropped outside of sortable containers move point to its original position.
            if (ui.placeholder.hasClass(DragDropBindingConstants.HIDE_PLACEHOLDER_CLASS)) {
                droppedIndex = ui.item.data(DragDropBindingConstants.DataKeyOldIndex);
            }
            var testPointList = $(event.target).data(DragDropBindingConstants.DataKeyItemList).testPointCollection;
            testPointList.remove(testPoint);
            if (droppedIndex >= 0) {
                testPointList.splice(droppedIndex, 0, testPoint);
            }
            ko.removeNode(ui.item[0]);
        }
    }

    private _onUpdate(event: JQueryEventObject, ui: any) {
        // update event may get fired twice (once for source and another for target) if there was DOM change.
        // ui.sender will be undefined when being called for source which is when we handle the event.
        // ui.sender will be source container when called for target and it will be ignored.
        if (!ui.sender) {

            if (ui.placeholder.hasClass(DragDropBindingConstants.HIDE_PLACEHOLDER_CLASS) ||
                ui.item.data(DragDropBindingConstants.DataKeyItemDroppedOnTile)) {
                // if item was dropped outside of sortable containers, cancel sort
                // default behavior of sortable is placing back to the last placeholder position in the last container,
                // but we want to revert back to the original placeholder position in that case
                return false;
            }

            var targetSuite = ui.item.parent();
            var isAccepted: boolean = this._isAccepted(event, ui, targetSuite);
            if (isAccepted) {
                this._dropHandler(event, ui, targetSuite);
            }
            else {
                targetSuite.sortable("cancel");
            }
        }
    }

    private _onSort(event: JQueryEventObject, ui: any, source: any) {
        //Code taken from ChecklistAnnotationView sortable bindings. 
        //They have done similar handling for for on Sort event hence doing the same. 

        ui.item.data(DragDropBindingConstants.DataKeyDraggableItem);
        var scrolled = false;
        var $scrollContainer = this._getScrollableContentContainer();
        // Handle the scroll across connected lists: http://stackoverflow.com/questions/24257746/sortable-scroll-issue-with-connected-lists
        // Also scroll the scrollable content container
        var scrollContainers: HTMLElement[] = [$scrollContainer[0], ui.placeholder[0].parentNode];
        for (var i = 0, len = scrollContainers.length; i < len; i++) {
            var scrollContainer = scrollContainers[i];
            if (typeof (scrollContainer) !== "undefined") {
                //The referenced scrollable container does not exist on this page
                var overflowOffset = $(scrollContainer).offset();
                if ((overflowOffset.top + scrollContainer.offsetHeight) - event.pageY < DragDropBindingConstants.ScrollingSensitivity) {
                    scrollContainer.scrollTop = scrollContainer.scrollTop + DragDropBindingConstants.ScrollingSpeed;
                    scrolled = true;
                }
                else if (event.pageY - overflowOffset.top < DragDropBindingConstants.ScrollingSensitivity) {
                    scrollContainer.scrollTop = scrollContainer.scrollTop - DragDropBindingConstants.ScrollingSpeed;
                    scrolled = true;
                }
                if ((overflowOffset.left + scrollContainer.offsetWidth) - event.pageX < DragDropBindingConstants.ScrollingSensitivity) {
                    scrollContainer.scrollLeft = scrollContainer.scrollLeft + DragDropBindingConstants.ScrollingSpeed;
                    scrolled = true;
                }
                else if (event.pageX - overflowOffset.left < DragDropBindingConstants.ScrollingSensitivity) {
                    scrollContainer.scrollLeft = scrollContainer.scrollLeft - DragDropBindingConstants.ScrollingSpeed;
                    scrolled = true;
                }

                if (scrolled && i === 0) {
                    // Sortable.refreshPositions doesn't recaclulate the positions of the containers scrolled partially into view.
                    // So, we need to force it to be refreshed explicitly.
                    // We need to recalculate the positions of all the droppable tiles, as per the revised layout on scrolling
                    // Recalculate only for the content container and not for the work item list container
                    ui.item.parent().sortable("refresh");
                    // No need to reset the value of scrolled as we don't need to recalculate the positions of the droppable containers
                    // on scrolling through the work item containers
                }
            }
        }
    }

    private _onKeyDown(event: JQueryKeyEventObject): boolean {
        if ((event.ctrlKey || event.metaKey) && (event.keyCode === Utils_UI.KeyCode.UP || event.keyCode === Utils_UI.KeyCode.DOWN)) {
            try {
                const target = $(event.target);
                // Get parent list to reset focus after move.
                const testListSortable = target.parent(DragDropBindingConstants.TEST_LIST_CONTAINER_SELECTOR);
                if (!testListSortable || testListSortable.length === 0) {
                    // not part of sortable... just ignore.
                    return false;
                }

                // Get what we are moving, parents, etc... what we need to move this item.
                const draggableViewModel: ViewModels.DraggableViewModel = target.data(DragDropBindingConstants.DataKeyDraggableItem);
                const droppableViewModel: ViewModels.DroppableViewModel = target.data(DragDropBindingConstants.DataKeyDroppableItem);

                if (!(draggableViewModel instanceof ViewModels.TestPointViewModel) || !(droppableViewModel instanceof ViewModels.TestSuiteViewModel) || !(droppableViewModel instanceof ViewModels.TestSuiteViewModel)) {
                    // Not a test... not sure what it is but just ignore event.
                    return false;
                }

                const testPointViewModel = draggableViewModel as ViewModels.TestPointViewModel;
                const testSuiteViewModel = droppableViewModel as ViewModels.TestSuiteViewModel;

                if (testPointViewModel.isSaving()) {
                    // Ignore reorder operations while saving.
                    return false;
                }

                const testPointCollection = testSuiteViewModel.testPointCollection();
                const currentPosition = testPointCollection.indexOf(testPointViewModel);
                if (currentPosition < 0) {
                    // Couldn't find the item... perhas something async remove it. Just ignore.
                    return false;
                }

                const targetPosition = (event.keyCode === Utils_UI.KeyCode.DOWN) ? currentPosition + 1 : currentPosition - 1;
                if (targetPosition < 0 || targetPosition >= testPointCollection.length) {
                    // Can't move past the 1st or last item. Just ignore.
                    return false;
                }

                testSuiteViewModel.dropHandler(testPointViewModel, testSuiteViewModel, false, targetPosition);

                // The drop handler updates the testPointCollection to have the new item but we pre-emptively update the sequence number here as well. This is done 
                // so, when the svc returns the result, if there is no change there won't be a subsequent change in the observable which removes focus.
                const swappedTestPoint = testSuiteViewModel.testPointCollection()[currentPosition];
                const temp = swappedTestPoint.testPoint().sequenceNumber();
                swappedTestPoint.testPoint().sequenceNumber(testPointViewModel.testPoint().sequenceNumber());
                testPointViewModel.testPoint().sequenceNumber(temp);

                // Set focus to the new item.
                $(testListSortable[0].children[targetPosition]).focus();
            }
            finally {
                event.preventDefault();
                event.stopPropagation();
            }
        }
    }

    private _getScrollableContentContainer(): JQuery {
        return $(".agile-content-container.scrollable");
    }
}

export class DragDropBindingConstants {
    public static DataKeyDraggableItem = "draggable-item";
    public static DataKeyDroppableItem = "droppable-item"; // Key name should match with the value in the Knockout template TestListView.ascx
    public static DataKeyId = "item-id";
    public static DataKeyItemDroppedOnTile = "droppedOnTile";
    public static DataKeyOldIndex = "start-index";

    public static TEST_POINT_CLASS = "test";
    public static TEST_POINT_SELECTOR = "." + DragDropBindingConstants.TEST_POINT_CLASS;
    public static TEST_LIST_CONTAINER_CLASS = "test-list-container";
    public static TEST_LIST_CONTAINER_SELECTOR = "." + DragDropBindingConstants.TEST_LIST_CONTAINER_CLASS;
    public static HIDE_PLACEHOLDER_CLASS = "hide-placeholder";
    public static DRAG_DROP_HOVER_CLASS = "agileDragTargetHoverColor";
    public static ORIGINAL_TESTPOINT_CLASS = "original-point";

    public static ScrollingSensitivity = 60;
    public static ScrollingSpeed = 10;
    public static DataKeyItemList = "itemList";
    public static EditModeClassSelector = ".point-edit-mode";

}

function registerBindings() {
    new FocusBinding().register();
    new TestOutcomeBinding().register();
    new DraggableTestPointBinding().register();
    new DroppableTestPointListBinding().register();
}

registerBindings();



