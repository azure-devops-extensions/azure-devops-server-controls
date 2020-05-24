import Events_Services = require("VSS/Events/Services");

import React = require("react");
import ReactDOM = require("react-dom");
import SpinnerOverlay = require("Presentation/Scripts/TFS/TFS.UI.SpinnerOverlay");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WorkItemControl = require("WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl");
import WorkItemFormEvents = require("WorkItemTracking/Scripts/Form/Events");


import { HistoryActionSet } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Actions/HistoryActionSet";
import { HistoryControlActionSet } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Actions/HistoryControlActions";
import { HistoryActionsCreator } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Actions/HistoryActionsCreator";
import { HistoryControlActionsCreator } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Actions/HistoryControlActionsCreator";
import { HistoryControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Components/HistoryControl";
import { HistoryControlStore } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Stores/HistoryControlStore";
import { SimpleWorkItemArtifactCache } from "WorkItemTracking/Scripts/Controls/Links/ArtifactCache";
import { WorkItemFormTabsControl } from "WorkItemTracking/Scripts/Form/Tabs";
import { FormGroup } from "WorkItemTracking/Scripts/Form/FormGroup";
import { WorkItemActions } from "WorkItemTracking/Scripts/Utils/WorkItemControlsActions";
import { WorkItemHistory } from "WorkItemTracking/Scripts/OM/History/WorkItemHistory"
import { LayoutConstants } from "WorkItemTracking/Scripts/Form/Layout";

export class WorkItemHistoryControl extends WorkItemControl.WorkItemControl {
    private _historyActionsCreator: HistoryActionsCreator;
    private _statusHelper: SpinnerOverlay.StatusIndicatorOverlayHelper;
    private _cache: SimpleWorkItemArtifactCache;
    private _groupExpandHandler: IEventHandler;
    private _tabActivatedHandler: IEventHandler;
    private _formMaximizedHandler: IEventHandler;
    private _workItemLoadTime: Date;
    private _linkUpdateTime: Date;
    private _historyControl: HistoryControl;
    private static _instanceId: number = 0;

    constructor(container, options?, workItemType?) {
        super(container, options, workItemType);
    }

    public _init() {
        super._init();
        this._cache = new SimpleWorkItemArtifactCache();
        const historyActionSet = new HistoryActionSet();
        const historyControlActionSet = new HistoryControlActionSet();
        const historyControlActionsCreator = new HistoryControlActionsCreator(historyControlActionSet, this.getTfsContext(), this._cache);
        this._historyActionsCreator = new HistoryActionsCreator(historyActionSet);

        // The event system fires events to all listeners to a specific event name so the name must be different for each instance of the control.
        let store = new HistoryControlStore(historyActionSet, historyControlActionSet, "workitem_history_updated_" + WorkItemHistoryControl._instanceId++);

        this._historyControl = ReactDOM.render(
            <HistoryControl store={store}
                actionCreator={historyControlActionsCreator}
                onComponentMount={() => { this._updateAvailableSpace() }} />,
            this._container[0],
            null) as HistoryControl;

        this._groupExpandHandler = (formGroup: FormGroup) => {
            if (formGroup.getGroupId() === LayoutConstants.StateGraphControlGroupName) {
                this._updateAvailableSpace();
            }
        }

        this._formMaximizedHandler = () => {
            this._updateAvailableSpace();
        }

        this._tabActivatedHandler = () => {
            this._updateAvailableSpace();
        }

        Events_Services.getService().attachEvent(WorkItemFormTabsControl.TAB_ACTIVATED_EVENT, this._tabActivatedHandler);
        Events_Services.getService().attachEvent(WorkItemActions.WORKITEM_MAXIMIZE_STATE_CHANGED, this._formMaximizedHandler);
        Events_Services.getService().attachEvent(WorkItemFormEvents.FormEvents.GroupExpandStateChangedEvent(), this._groupExpandHandler);

        this._container.addClass("workitem-history-control-container");
    }

    public dispose(): void {
        if (this._container) {
            ReactDOM.unmountComponentAtNode(this._container[0]);
        }

        Events_Services.getService().detachEvent(WorkItemFormTabsControl.TAB_ACTIVATED_EVENT, this._tabActivatedHandler);
        Events_Services.getService().detachEvent(WorkItemActions.WORKITEM_MAXIMIZE_STATE_CHANGED, this._formMaximizedHandler);
        Events_Services.getService().detachEvent(WorkItemFormEvents.FormEvents.GroupExpandStateChangedEvent(), this._groupExpandHandler);

        super.dispose();
    }

    public invalidate(flushing) {

        // Only invalidate if the work item has been updated.
        if (this._workItemLoadTime === this._workItem.getLoadTime() && this._linkUpdateTime === this._workItem.getLinkUpdatedExternallyDate()) {
            return;
        }

        this._workItemLoadTime = this._workItem.getLoadTime();
        this._linkUpdateTime = this._workItem.getLinkUpdatedExternallyDate();

        this._historyActionsCreator.workItemHistoryUpdateStarted();
        this._cache.clear();

        var originalWorkItem = this._workItem;

        WorkItemHistory.getHistoryAsync(this._workItem).then(
            (history: WorkItemHistory) => {

                if (originalWorkItem !== this._workItem) {
                    return;
                }

                this._historyActionsCreator.workItemHistoryUpdateCompleted(history);
                this._hideProgress();
                this._updateAvailableSpace();
            },
            (error) => {
                if (originalWorkItem === this._workItem) {
                    this._historyActionsCreator.workItemHistoryUpdateFailed(error);
                    this._hideProgress();
                    this._updateAvailableSpace();
                }
            }
        );

        this._showProgress();

        super.invalidate(flushing);
    }

    public _getControlValue(): any {
        return "";
    }

    public clear() {
    }

    public bind(workItem: WITOM.WorkItem, disabled?: boolean) {
        this._hideProgress();
        this._workItemLoadTime = null;
        this._linkUpdateTime = null;
        super.bind(workItem, disabled);
    }

    public unbind() {
        super.unbind();
        this._workItemLoadTime = null;
        this._linkUpdateTime = null;
        this._historyActionsCreator.workItemHistoryClear();

        this._hideProgress();
    }

    public onControlResized() {
        super.onControlResized();
        this._updateAvailableSpace();
    }

    /** @override **/
    protected isReadOnlyIconHidden(): boolean {
        return true;
    }

    /** @override **/
    protected isEmpty(): boolean {
        return this._workItem.isNew();
    }

    private _updateAvailableSpace() {

        // This code assumes that the history control is always at the bottom of the page.  
        // The  .form-grid elemement which holds the control is absolutely positioned so it fully fits the remaining space.
        // Since we know we are at the bottom we can simply subtract off our top value and set the height to the remaining space.

        let $grid = this._container.parents(".form-grid");
        let $control = this._container;

        if ($grid &&
            $control &&
            $control.is(":visible")) {

            let height = $grid.height() - $control[0].offsetTop - 7; // should be 6, bumped to 7 as workaround for Bug# 990180

            if (this._historyControl) {
                this._historyControl.updateHeight(height);
            }
        }
    }

    private _showProgress() {

        if (!this._statusHelper) {
            this._statusHelper = new SpinnerOverlay.StatusIndicatorOverlayHelper(this._container);
        }

        this._statusHelper.startProgress(50);
    }

    private _hideProgress() {
        if (this._statusHelper) {
            this._statusHelper.stopProgress();
            this._statusHelper = null;
        }
    }
}
