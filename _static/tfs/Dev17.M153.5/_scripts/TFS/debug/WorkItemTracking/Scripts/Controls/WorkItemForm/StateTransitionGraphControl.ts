import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import VSS = require("VSS/VSS");
import Events_Services = require("VSS/Events/Services");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import FormTabs = require("WorkItemTracking/Scripts/Form/Tabs");
import WITHelpers = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Helpers");
import { WorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import SpinnerOverlay = require("Presentation/Scripts/TFS/TFS.UI.SpinnerOverlay");
import { EditActionSet } from "WorkItemTracking/Scripts/OM/History/EditActionSet";
import { IStateTransitionGraphControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/Interfaces";
import { WorkItemHistory } from "WorkItemTracking/Scripts/OM/History/WorkItemHistory"
import { registerWorkItemFormControl } from "WorkItemTracking/Scripts/ControlRegistration";
import { IIdentityDisplayOptions, IdentityDisplayControl, IdentityPickerControlSize } from "VSS/Identities/Picker/Controls";
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import { FormEvents } from "WorkItemTracking/Scripts/Form/Events";
import { FormGroup } from "WorkItemTracking/Scripts/Form/FormGroup";
import { LayoutConstants } from "WorkItemTracking/Scripts/Form/Layout";
import { WITIdentityHelpers } from "TfsCommon/Scripts/WITIdentityHelpers";

const delegate = Utils_Core.delegate;
const domElem = Utils_UI.domElem;
const eventSvc = Events_Services.getService();

export interface StateTransition {
    revision: number;
    owner: string;
    date: string;
    reason: string;
    resultingState: string;
    stateTooltip?: string;
    isStateTransition: boolean;
    onClickState?: () => void;
}

export class StateTransitionGraphControl extends Controls.BaseControl {
    public static enhancementTypeName: string = "tfs.wit.statetransitiongraph";
    private static IDENTITY_PICKER_CONSUMER_ID: string = "ca25f1a2-35b8-46aa-aade-f74efddbb499";

    private _workItem: WITOM.WorkItem;

    /** The last revision of the work item we have rendered the graph for */
    private _lastRenderedRevision: number;

    private _transitionElements: any;
    private _contentElement: JQuery;
    private _offScreenHost: JQuery;
    private _transitionAndStatePinContainer: JQuery;
    private _transitionAndStateGraphContainer: JQuery;
    private _showMoreElement: any;
    private _transitionGraphCollapsed: boolean;
    private _tabsShowHandlersAttached: boolean;
    private _lastKnownWidth: number;
    private _showSpinner: boolean;
    private _showPin: boolean;
    private _statusHelper: SpinnerOverlay.StatusIndicatorOverlayHelper;
    private _showErrors: boolean;
    private _errorPane: JQuery;
    private _tabSelectedHandler: IEventHandler;
    private _groupExpandHandler: IEventHandler;

    public static STATEGRAPH_DECORATE_COMPLETE_EVENT = "StateGraphDecorateComplete";

    constructor(options?: IStateTransitionGraphControlOptions) {
        /// <summary>Control to show work item history by showing state transitions in graph form.</summary>
        /// <param name="options" type="Object">Options for the control
        ///     "workItem": work item object that will be bound to the control
        /// </param>

        super(options);
    }

    public initializeOptions(options?: IStateTransitionGraphControlOptions) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            workItem: null
        }, options));

        this._showSpinner = options && options.showSpinner === true;
        this._showErrors = options && options.showErrors === true;
        this._showPin = options && options.showPin === true;
    }

    public initialize() {
        ///<summary>initialize control.  Adds content div and offscreen div. Binds to workItem if provided in _options</summary>
        var element: JQuery = this.getElement();

        super.initialize();

        element.addClass('wit-state-transition-graph');

        this._transitionAndStatePinContainer = $("<div></div>").addClass('transition-and-state-pin-container').appendTo(element);

        this._transitionAndStateGraphContainer = $("<div></div>").addClass('transition-and-state-container-main').attr({ "tabindex": 0, "role": "text" });

        this._contentElement = $("<div></div>").addClass('state-transition-graph-spacer').appendTo(this._transitionAndStateGraphContainer);
        this._offScreenHost = $("<div></div>").addClass('state-transition-graph-unused-host')
            .attr({ "visibility": "hidden", "aria-hidden": "true" })
            .appendTo(this._transitionAndStateGraphContainer);
        this._transitionAndStateGraphContainer.appendTo(element);

        if (this._options && this._options.workItem) {
            this.bindToWorkItem(this._options.workItem);
        }

        this._attachEvents();
    }

    public destroyGraph() {
        this.getElement().remove();
    }

    private _showAll() {
        /// <summary>Expands the graph to show all states, regardless of the size of the container.</summary>
        this._transitionGraphCollapsed = false;
        this._decorateGraph();
        this._contentElement.focus();
        return false;
    }

    /**
     * Clears the control and renders the state transition graph for the given work item.
     * @param workItem the workitem to show history for. If null, the graph is cleared.
     */
    public bindToWorkItem(workItem: WITOM.WorkItem) {
        if (!this._tabsShowHandlersAttached) {
            this._attachHandlerToTabsShowEvent();
        }

        this._showContent(true);

        if (this._workItem === workItem
            && (workItem && this._lastRenderedRevision === workItem.revision)) {
            // The transition graph depends on work item and revision, if it hasn't changed since we rendered last, do nothing.
            return;
        }

        this._workItem = workItem;

        if (workItem) {
            Diag.Debug.assert(workItem instanceof WITOM.WorkItem, "workItem is expected to be an instance WorkItem object");

            this._lastRenderedRevision = workItem.revision;

            this._showProgress();
            this._generateTransitions(workItem).then(
                (transitions: StateTransition[]) => {
                    if (workItem !== this._workItem) {
                        // Work item changed while getting history, do nothing.
                        return;
                    }

                    this._clear();

                    this._transitionElements = this._createTransitionElements(transitions);

                    this._hideProgress();

                    // Delay render to fix the issue that it does not use the full form width on new WIT Form
                    // On new WIT form, the form element is 'display:none' when control are rendering and cannot get accurate width for adaptive fit.
                    Utils_Core.delay(this, 0, this._decorateGraph);
                },
                (error) => {
                    if (workItem === this._workItem) {
                        this._clear();
                        this._showError(error);
                        this._hideProgress();
                    }
                });

        } else {
            this._clear();
            this._hideProgress();

            this._lastRenderedRevision = null;
        }
    }

    public emptyGraph() {
        /// <summary>Clears the visible graph by moving all visible transitions to the hidden placeholder</summary>
        var that = this;
        $.each($('.transition-and-state-container', that._contentElement), function (i, visibleElement) {
            // position off screen
            $(visibleElement).addClass('off-screen');

            // Move it back to offscreen host
            that._offScreenHost.append(visibleElement);
        });

        this._transitionAndStatePinContainer.empty();
    }

    private _showContent(show: boolean) {
        if (show) {
            if (this._errorPane) {
                this._errorPane.hide();
            }
            this._transitionAndStateGraphContainer.show();
        }
        else {
            this._transitionAndStateGraphContainer.hide();
        }
    }

    private _showError(error: any) {
        if (this._showErrors) {
            this._showContent(false);

            if (!this._errorPane) {
                this._errorPane = $(domElem("span", "error"));
                this._errorPane.appendTo(this.getElement());
            }

            this._errorPane.text(error && error.message || WorkItemTrackingResources.GenericHistoryRetrievalError);
            this._errorPane.show();
        }
    }

    private _clear() {
        this._transitionElements = null;
        this._showMoreElement = null;
        this._transitionGraphCollapsed = true;
        this._contentElement.empty();
        this._offScreenHost.empty();
        this._transitionAndStatePinContainer.empty();
        this._contentElement.width(0);
    }

    private _attachEvents() {
        /// <summary>Attaches all events that should persist while the control persists.</summary>
        var that, $element = this.getElement();

        // Focus on the element when clicked
        $element.click(function () {
            $element.focus();
        });

        // Attach keyboard handler
        that = this;
        $element.keydown(function (e) {
            var delta = that._calcScrollDeltaFromKeyPressed(e);
            if (delta) {
                that._scrollGraph(delta);
                return false;
            }
        });

        Utils_UI.attachResize(this._element, delegate(this, this._onWindowResize));

        this._groupExpandHandler = (formGroup: FormGroup) => {
            if (this._workItem &&
                formGroup.isExpanded() &&
                formGroup.getGroupId() === LayoutConstants.StateGraphControlGroupName) {
                this._decorateGraph();
            }
        }

        eventSvc.attachEvent(FormEvents.GroupExpandStateChangedEvent(), this._groupExpandHandler);
    }

    private _calcScrollDeltaFromKeyPressed(event: any): number {
        /// <summary>Calculates the distance the scroll position should change based
        ///     on which keyboard button was pushed.</summary>
        /// <param name="event" type="Object">The keyboard eventObject passed to the handler</param>
        /// <returns type="Number">The distance the scroll position should changed</returns>

        var keyCode = Utils_UI.KeyCode;

        // if modifiers are pressed, return null here to allow the event to bubble up
        if (event.altKey || event.ctrlKey || event.shiftKey) {
            return;
        }

        if (event.keyCode === keyCode.LEFT) {
            return -50;
        } else if (event.keyCode === keyCode.RIGHT) {
            return 50;
        } else if (event.keyCode === keyCode.HOME) {
            return -this._contentElement.width();
        } else if (event.keyCode === keyCode.END) {
            return this._contentElement.width();
        }
    }

    private _onWindowResize() {
        if (this._workItem) {
            this._decorateGraph();
        }
    }

    private _attachHandlerToTabsShowEvent() {
        /// <summary>If this STG is in a tab that is hidden when the page renders, the STG is created in a container
        ///     that has 0 width, resulting in a overly compressed graph.  By hooking to the tabsShow event of the
        ///     parent tab control, we can resize the graph when this tab is selected.</summary>

        if (!this._tabSelectedHandler) {
            // Set up a handler which responds to all tab changed events.
            this._tabSelectedHandler = () => {
                const $element = this.getElement();

                // If the control is visible, redraw the graph to make sure it's updated to the correct size
                if ($element.is(":visible")) {
                    this._decorateGraph();
                }
            }
            eventSvc.attachEvent(FormTabs.WorkItemFormTabsControl.TAB_ACTIVATED_EVENT, this._tabSelectedHandler);
        }

        this._tabsShowHandlersAttached = true;
    }

    private _detachHandlerFromTabsShowEvent() {
        if (this._tabSelectedHandler) {
            eventSvc.detachEvent(FormTabs.WorkItemFormTabsControl.TAB_ACTIVATED_EVENT, this._tabSelectedHandler);
            this._tabSelectedHandler = null;
        }
    }

    private _scrollGraph(delta: number) {
        /// <summary> Scrolls the graph left or right based on the delta</summary>
        /// <param name="delta" type="Number" integer="true">The number of pixels to scroll the graph.  Positive values result in scrolling to the right.</param>
        var $element, curLeft;

        Diag.Debug.assertParamIsNumber(delta, "delta");

        $element = this._transitionAndStateGraphContainer;
        curLeft = $element.scrollLeft();
        $element.scrollLeft(curLeft + delta);
    }

    public _generateTransitions(workItem: WITOM.WorkItem): IPromise<StateTransition[]> {
        /// <summary> Generates an array of objects that encapsulate the relevant information
        ///     for all the state transitions made to a given workItem.</summary>
        /// <param name="workItem" type="Object">The workItem of interest.</param>
        /// <returns type="Array" elementType="Object">An array of objects that describes the
        ///     state changes for the given work item. See _createGraphTransitionElement for fields on these objects.</returns>
        /// <remarks>Method is only public to provide access for the unit tests.</remarks>

        Diag.Debug.assertParamIsObject(workItem, "workItem");

        return WorkItemHistory.getHistoryAsync(workItem).then(
            (workItemHistory: WorkItemHistory) => {
                actions = workItemHistory.getActions();

                var i, len, actions,
                    transitionList = [];

                for (i = 0, len = actions.length; i < len; i++) {
                    var actionSet: EditActionSet = actions[i];

                    // For generating transitions, the only relevant actionSets either include a state change or are the first revision.
                    if (actionSet && (actionSet.stateChanged() || actionSet.getRev() === 0)) {
                        if (i === len - 1) {
                            Diag.Debug.assert(actionSet.getRev() === 0, "Unexpected history action.  Expected rev 0, found rev " + actionSet.getRev());
                        }
                        transitionList.push(this._generateTransition(workItem, actionSet));
                    }
                }

                // order by revision, oldest to newest
                transitionList.sort(function (t1, t2) {
                    return t1.revision - t2.revision;
                });

                return transitionList;
            });
    }

    private _generateTransition(workItem: WITOM.WorkItem, actionSet: EditActionSet): StateTransition {
        /// <summary> Generates an object that encapsulate the relevant information
        ///     for a particular workItem's state transition.</summary>
        /// <param name="workItem" type="Object">The workItem of interest.</param>
        /// <param name="actionSet" type="Object">The actionSet for a particular checkin. Must be a state change or the first (New) revision.</param>
        /// <returns type="Object" mayBeNull="true">
        ///     An object that describes a particular state change:
        ///         revision: revision number for the change
        ///         owner: changed by user
        ///         date: changed date
        ///         reason: the reason that the state change took place
        ///         resultingState: the name of the resulting state
        /// </returns>
        Diag.Debug.assert((actionSet.stateChanged() || actionSet.getRev() === 0), "ActionSet provided does not represent a change in state.");

        var revision = actionSet.getRev();

        var newTransition: StateTransition = {
            revision: revision,
            owner: actionSet.changedByIdentity.distinctDisplayName,
            date: Utils_Date.localeFormat(actionSet.getChangedDate(), "d"),
            reason: workItem.getFieldValueByRevision(WITConstants.CoreField.Reason, revision),
            resultingState: null,
            isStateTransition: true
        };

        if (revision === 0) { // Work Item created
            // Get the initial state (i.e. the state of revision 0)
            newTransition.resultingState = workItem.getFieldValueByRevision(WITConstants.CoreField.State, 0);
        }
        else {
            Diag.Debug.assert(actionSet.stateChanged());
            newTransition.resultingState = actionSet.stateChanges[1];
        }

        return newTransition;
    }

    private _createTransitionElements(transitions: StateTransition[]) {
        /// <summary>Creates all the DOM elements for the given transition data</summary>
        var that = this, elements = [];

        Diag.Debug.assertParamIsArray(transitions, "transitions");

        $.each(transitions, function (i: number, transition: StateTransition) {
            var transitionAndStateContainer = that._createGraphTransitionElement(i, transition);
            that._offScreenHost.append(transitionAndStateContainer);
            elements.push(transitionAndStateContainer);
        });
        return elements;
    }

    /**
     * Creates a DOM element representing a transition and a state for the given transition data.
     * 
     * @param index {number} Index of the current transition among all the transitions
     * @param transition {StateTransition} The transition data.  The following fields are used:
     *          revision: revision number for the change
     *          owner: this should be Changed By user
     *          date: changed date
     *          reason: the reason that the state change took place
     *          resultingState: the name of the resulting state
     *          onClickState(optional): function that is bound to onClick of the state
     *          stateTooltip(optional): text that is shown as a tooltip on the state
     *          onClickTransition(optional): function that is bound to onClick of the transition container
     */
    private _createGraphTransitionElement(index: number, transition: StateTransition) {
        Diag.Debug.assertParamIsObject(transition, "transition");
        Diag.Debug.assertParamIsNumber(transition.revision, "transition.revision");
        Diag.Debug.assertParamIsString(transition.owner, "transition.owner");
        Diag.Debug.assertParamIsString(transition.date, "transition.date");

        if (!transition.resultingState) {
            // There was a bug which allowed work item types to be uploaded without any states which is what will cause this condition.
            transition.resultingState = WorkItemTrackingResources.Unknown;
        }

        const $transitionAndStateContainer = $("<div></div>").addClass('transition-and-state-container');

        if (transition.revision >= 0) {
            const ariaLabel = Utils_String.format(WorkItemTrackingResources.StateTransitionAriaLabel, index + 1,
                transition.resultingState, transition.reason, transition.owner, transition.date);
            $transitionAndStateContainer.attr("aria-label", ariaLabel);
        }

        // Add transition
        const $transitionContainer = $("<div></div>").addClass('transition-container');

        const $transitionArrow = $("<div></div>").addClass('transition-arrow');
        $transitionArrow.append($("<div></div>").addClass('arrow-tail'));
        $transitionArrow.append($("<div></div>").addClass('arrow-head'));

        var $reason = $("<div></div>").addClass('transition-reason');

        if (transition.reason) {
            $reason.text(transition.reason);
        }
        else {
            $reason.html("&nbsp;");
        }

        $transitionArrow.append($reason);

        const $transitionChangeInfo = $("<div></div>").addClass('transition-change-info');
        const $transitionChangeInfoOwner = $("<div/>").addClass('transition-change-info-owner');

        if (transition.owner) {
            const identity = WITIdentityHelpers.parseUniquefiedIdentityName(transition.owner);
            const options: IIdentityDisplayOptions = {
                identityType: { User: true },
                operationScope: { IMS: true },
                item: identity.entityId,
                friendlyDisplayName: identity.displayName,
                size: IdentityPickerControlSize.Small,
                turnOffHover: true,
                consumerId: StateTransitionGraphControl.IDENTITY_PICKER_CONSUMER_ID
            };

            <IdentityDisplayControl>Controls.BaseControl.createIn(IdentityDisplayControl, $transitionChangeInfoOwner, options);
            $transitionChangeInfo.append($transitionChangeInfoOwner);
        }

        $transitionChangeInfo.append($("<div></div>").addClass('transition-change-info-date').text(transition.date));
        $transitionArrow.append($transitionChangeInfo);

        $transitionContainer.append($transitionArrow);
        $transitionAndStateContainer.append($transitionContainer);

        // Add state
        const $stateContainer = $("<div></div>").addClass('state-container');
        const $state = $("<div></div>").addClass('state');

        if (transition.onClickState) {
            Diag.Debug.assertParamIsFunction(transition.onClickState, "transition.onClickState");
            //The supplied click handler should be factored to guarantee this script is never needed.
            $state.append($("<a/>").text(transition.resultingState).attr("href", "#").bind('click', transition.onClickState));
            $state.bind('click', transition.onClickState);
        } else {
            $state.text(transition.resultingState);
        }

        if (transition.stateTooltip) {
            RichContentTooltip.add(transition.stateTooltip, $state);
        }

        if (transition.isStateTransition && this._workItem.workItemType.stateColors) {
            var stateCircle = $("<div></div>").addClass("state-circle");
            WITHelpers.WITStateCircleColors.setStateColorsOnElement(stateCircle, transition.resultingState, this._workItem.workItemType);
            $state.append(stateCircle);
        }

        $stateContainer.append($state);

        $transitionAndStateContainer.append($stateContainer);

        $transitionAndStateContainer.addClass('off-screen');

        return $transitionAndStateContainer;
    }

    private _createShowMoreElement() {
        /// <summary>Creates a transition element for the showMore.</summary>
        /// <return type="Object">the newly created DOM element for the showMore placeholder. </return>
        const $showMore = this._createGraphTransitionElement(-1, {
            revision: -1,
            owner: "",
            date: "",
            reason: "",
            resultingState: WorkItemTrackingResources.StateTransitionGraphViewAllChangesText,
            onClickState: delegate(this, this._showAll),
            stateTooltip: WorkItemTrackingResources.StateTransitionGraphViewAllChangesTitle,
            isStateTransition: false
        });

        $showMore.addClass("show-more");
        return $showMore;
    }

    private _appendIcon() {

        if (!this._showPin) {
            return;
        }

        // Append icon to the state graph after it is created
        var isIconClicked = TFS_OM_Common.ProjectCollection.getConnection(this._getTfsContext())
            .getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService)
            .readLocalSetting("isStateGraphPinned", TFS_WebSettingsService.WebSettingsScope.User);

        var icon: JQuery = $("<span/>").addClass('icon').attr("tabindex", "0")
            .bind("click", delegate(this, this._triggerStateGraphPinClick))
            .bind("keydown", delegate(this, this._onKeyDown));

        // Add 'icon-pin' if graph is not pinned yet
        if (!isIconClicked || isIconClicked === "false") {
            icon.addClass('icon-pin')
                .hover(function () {
                    $(this).addClass("wit-state-transition-graph-icon-pin-hover");
                },
                function () {
                    $(this).removeClass("wit-state-transition-graph-icon-pin-hover");
                });
        }
        // Add 'icon-unpin' if graph is pinned
        else {
            icon.addClass('icon-unpin')
                .hover(function () {
                    $(this).addClass("wit-state-transition-graph-icon-unpin-hover");
                },
                function () {
                    $(this).removeClass("wit-state-transition-graph-icon-unpin-hover");
                });
        }
        this._transitionAndStatePinContainer.append(icon);
    }

    private _triggerStateGraphPinClick() {
        this.getElement().trigger("stateGraphPinClick");
        return false;
    }

    private _onKeyDown(e?: JQueryEventObject): void {
        if (e.keyCode === Utils_UI.KeyCode.ENTER) {
            this._triggerStateGraphPinClick();
        }
    }

    private _decorateGraph() {
        /// <summary>Display the transitions in the graph by moving them in from the offscreen container</summary>
        this.emptyGraph();

        if (!this._transitionElements || this._transitionElements.length === 0) {
            this.getElement().hide();
        } else {
            this.getElement().show();
            if (!this._transitionGraphCollapsed || this._transitionElements.length < 3) {
                this._decorateGraphWith(this._transitionElements);  // All of the transitions
            } else {
                this._decorateGraphWith(this._transitionsThatFitInContainer());
            }

            this._appendIcon();
        }

        this._fire(this.getElement(), StateTransitionGraphControl.STATEGRAPH_DECORATE_COMPLETE_EVENT);
    }

    private _decorateGraphWith(visibleTransitions) {
        /// <summary>
        ///     Displays the given transitions by moving the elements from the offscreen container into the the visible graph container.
        /// </summary>

        var that, widthOfAllTransitions = 0;
        // move the elements into this._contentElement and make them visible
        that = this;
        $.each(visibleTransitions, function (i, element) {
            widthOfAllTransitions += that._widthOfTransitionAndState(element);

            element.removeClass('off-screen');

            // Move it to visible host
            that._contentElement.append(element);
        });

        // Update the width of the container to fit all elements added
        this._contentElement.width(widthOfAllTransitions + 5);  // Add 5px because width calculations in IE seem to drop everything after the decimal point
    }

    private _transitionsThatFitInContainer() {
        /// <summary>
        ///     Returns as many transitions for the bound workItem that will fit in the visible space of the control.
        ///     All other transitions are hidden and a Show More transition is added. Items are moved in from the offscreen container.
        /// </summary>

        if (!this._showMoreElement) {
            this._showMoreElement = this._createShowMoreElement();
            this._offScreenHost.append(this._showMoreElement);
        }

        // Following width handling scenarios below
        // #1 - The tab containing control is activated and visible, we can have the actual width
        // #2 - The work item get refreshed, the tab containing control is not activated, we do not have the actual width, use last known.
        var $element = this.getElement();
        var width = $element.width();
        if ($element.is(":visible")) {
            this._lastKnownWidth = width;
        }
        else {
            width = this._lastKnownWidth ? this._lastKnownWidth : width;
        }
        return this._fitTransitionsIntoWidth(width, this._transitionElements, this._showMoreElement);
    }

    private _fitTransitionsIntoWidth(remainingWidth: number, transitionElements: any[], showMoreElement: any): any[] {
        /// <summary>
        ///     Helper function that selects as many of the given transitions that will fit in the given space.
        ///     All other transitions are hidden and a Show More transition is added.
        /// </summary>
        /// <param name="remainingWidth" type="Number" integer="true">This is the width that elements should fit into.</param>
        /// <param name="transitionElements" type="Array" elementType="Object" elementDomElement="true">
        ///     All of the transition DOM elements that can be displayed.
        ///     Must be created in a visible container to ensure the correct width can be calculated.
        /// </param>
        /// <param name="showMoreElement" type="Object" domElement="true" >
        ///     The placeholder DOM element for showing more. Must be created in a visible container to ensure the correct width can be calculated.
        /// </param>
        /// <returns type="Array" mayBeNull="false" elementType="Object" elementDomElement="true" elementMayBeNull="false">
        ///     Returns an array of DOM Elements that will fit into the given width.  Will always return at least the first, showMore, and last elements.
        ///     If they fit, more elements will be added between the last and show more elements.
        ///     The returned elements are guaranteed not to create a horizontal scrollbar unless the minimum elements are returned (First, ShowMore, Last)
        /// </returns>

        var showMoreWidth,
            currentElement,
            pushShowMore,
            visibleWithShowMoreThatFits,
            visibleElements = [],
            i,
            firstElement,
            lastElement;

        showMoreWidth = this._widthOfTransitionAndState(showMoreElement);

        firstElement = transitionElements[0];
        lastElement = transitionElements[transitionElements.length - 1];

        // Make sure there's room for the first element
        remainingWidth -= this._widthOfTransitionAndState(firstElement);

        visibleElements.unshift(lastElement);
        remainingWidth -= this._widthOfTransitionAndState(lastElement);

        pushShowMore = false;

        // Select elements until they won't fit
        for (i = transitionElements.length - 2; i > 0; i--) {
            currentElement = transitionElements[i];
            visibleElements.unshift(currentElement);
            remainingWidth -= this._widthOfTransitionAndState(currentElement);

            if (remainingWidth < showMoreWidth && !visibleWithShowMoreThatFits) {
                //remember which fit by copying the elements (excluding the most recently added).
                visibleWithShowMoreThatFits = visibleElements.slice(1);

            }

            if (remainingWidth < 0) {
                // undo and revert to the show more thing
                visibleElements = visibleWithShowMoreThatFits;
                pushShowMore = true;
                break;
            }
        }

        if (pushShowMore) {
            visibleElements.unshift(showMoreElement);
        }

        visibleElements.unshift(firstElement);

        return visibleElements;
    }

    private _widthOfTransitionAndState(element) {
        /// <summary>Measuring the width of the common parent (element) directly has browser
        ///     dependent behavior which does not consistently produce the size of the element.</summary>
        /// <return type="Number">The total width of the children of a given element</return>
        var totalWidth = 0;

        Diag.Debug.assertParamIsJQueryObject(element, "element");

        element.children().each(function (i, child) {
            var width = $(child).outerWidth(true);

            // in new work item form its possible that this control is hidden
            // so the width will be 0. We try to get the actual width with the logic below.
            var clone = $(child).clone();
            clone.css("visibility", "hidden");
            $('body').append(clone);
            var cloneWidth = clone.outerWidth(true);
            clone.remove();

            totalWidth += Math.max(width, cloneWidth);
        });
        return totalWidth;
    }

    public _dispose() {
        super._dispose();
        Utils_UI.detachResize(this._element);
        this._detachHandlerFromTabsShowEvent();
        this._workItem = null;
        eventSvc.detachEvent(FormEvents.GroupExpandStateChangedEvent(), this._groupExpandHandler);
        this._groupExpandHandler = null;
    }

    private _getTfsContext(): TFS_Host_TfsContext.TfsContext {
        return this._workItem
            ? this._workItem.store.getTfsContext()
            : TFS_Host_TfsContext.TfsContext.getDefault();
    }

    private _showProgress() {

        if (this._showSpinner) {
            if (!this._statusHelper) {
                this._statusHelper = new SpinnerOverlay.StatusIndicatorOverlayHelper(this.getElement().parent());
            }

            this._statusHelper.startProgress(50);
        }
    }

    private _hideProgress() {

        if (this._showSpinner) {
            if (this._statusHelper) {
                this._statusHelper.stopProgress();
                this._statusHelper = null;
            }
        }
    }

}

VSS.initClassPrototype(StateTransitionGraphControl, {
    _workItem: null,
    _transitionElements: null,
    _contentElement: null,
    _offScreenHost: null,
    _transitionAndStatePinContainer: null,
    _transitionAndStateGraphContainer: null,
    _showMoreElement: null,
    _transitionGraphCollapsed: true,
    _tabsShowHandlersAttached: false,
    _statusHelper: null,
    _showSpinner: false
});

export class WorkItemStateGraphControl extends WorkItemControl {

    public _options: IStateTransitionGraphControlOptions;
    private _stateGraph: StateTransitionGraphControl;
    private _$graphContainer: JQuery;

    public _init() {

        //This field name is dummy - this control does not write to field but to comply with the framework we set it so.
        this._fieldName = this._fieldName || "System.History";

        super._init();

        this._$graphContainer = $("<div></div>").addClass("wit-state-transition-graph-unpinned-container");
        this._container.append(this._$graphContainer);
    }

    public dispose() {
        super.dispose();

        if (this._stateGraph) {
            this._stateGraph.dispose();
        }
    }

    public invalidate(flushing: boolean) {
        if (!flushing) {
            this._updateStateTransitionGraph();
        }
        super.invalidate(flushing);
    }

    public clear() {
        if (this._stateGraph) {
            this._stateGraph.emptyGraph();
        }
    }

    /** @override **/
    protected isReadOnlyIconHidden(): boolean {
        return true;
    }

    /** @override **/
    protected isEmpty(): boolean {
        return this._workItem.isNew();
    }

    private _updateStateTransitionGraph() {
        if (!this._stateGraph) {
            this._stateGraph = <StateTransitionGraphControl>Controls.BaseControl.createIn(StateTransitionGraphControl, this._$graphContainer, this._options);
        }
        this._stateGraph.bindToWorkItem(this._workItem);
    }
}

registerWorkItemFormControl(WITConstants.WellKnownControlNames.WorkItemStateGraphControl, WorkItemStateGraphControl);