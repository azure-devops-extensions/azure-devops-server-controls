import React = require("react");
import ReactDOM = require("react-dom");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");

import * as Events_Services from "VSS/Events/Services";
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import { FormEvents } from "WorkItemTracking/Scripts/Form/Events";
import { HistoryActionSet } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Actions/HistoryActionSet";
import { HistoryControlActionSet } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Actions/HistoryControlActions";
import { HistoryActionsCreator } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Actions/HistoryActionsCreator";
import { HistoryItemViewer } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Components/HistoryItemViewer";
import { HistoryControlActionsCreator } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Actions/HistoryControlActionsCreator";
import { HistoryControlStore } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Stores/HistoryControlStore";
import { SimpleWorkItemArtifactCache } from "WorkItemTracking/Scripts/Controls/Links/ArtifactCache";
import { WorkItemActions } from "WorkItemTracking/Scripts/Utils/WorkItemControlsActions";
import { WorkItemHistory } from "WorkItemTracking/Scripts/OM/History/WorkItemHistory"
import { WorkItemControlComponent, IWorkItemControlProps } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemControlComponent";
import { IWorkItemFormComponentContext } from "WorkItemTracking/Scripts/Form/React/FormContext";
import { IWorkItemBindableComponentOptions } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemBindableComponent";
import { HistoryComponent } from "WorkItemTracking/Scripts/Form/Mobile/Components/HistoryComponent";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { FormContextItems, IOpenFullScreen } from "WorkItemTracking/Scripts/Form/Mobile/Interfaces";
import { IHistoryItem, ItemType } from  "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Interfaces";
import { CoreField } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";

export interface IWorkItemHistoryControlProps extends IWorkItemControlProps {
}

export class WorkItemHistoryComponent extends WorkItemControlComponent<IWorkItemHistoryControlProps, void> {

    private _historyActionsCreator: HistoryActionsCreator;
    private _cache: SimpleWorkItemArtifactCache;
    private _workItemLoadTime: Date;
    private _linkUpdateTime: Date;
    private _store: HistoryControlStore;
    private _historyControlActionsCreator: HistoryControlActionsCreator;
    private _resolveControl = (control: HTMLDivElement) => this._control = control;
    private _control: HTMLDivElement;
    private _fullScreenHistoryItemViewer: HistoryItemViewer;
    private static _instanceId: number = 0;

    constructor(props: IWorkItemHistoryControlProps, context: IWorkItemFormComponentContext, options?: IWorkItemBindableComponentOptions) {
        super(props, context, options);

        this._cache = new SimpleWorkItemArtifactCache();
        const historyActionSet = new HistoryActionSet();
        const historyControlActionSet = new HistoryControlActionSet();
        this._historyControlActionsCreator = new HistoryControlActionsCreator(historyControlActionSet, TfsContext.getDefault(), this._cache);
        this._historyActionsCreator = new HistoryActionsCreator(historyActionSet);

        // The event system fires events to all listeners to a specific event name so the name must be different for each instance of the control.
        this._store = new HistoryControlStore(historyActionSet, historyControlActionSet, "workitem_history_updated_" + WorkItemHistoryComponent._instanceId++);

        this._subscribeToWorkItemChanges();

        historyControlActionSet.historyItemSelected().addListener((selectedItem) => this._onHistoryItemSelected(selectedItem));
        historyControlActionSet.resolveLinks().addListener((linksArgs) => this._onLinksResolved());

        // Update when we are retrieving/retrieved history data
        historyActionSet.workItemHistoryUpdateCompleted().addListener((payload) => this.forceUpdate());
        historyActionSet.workItemHistoryUpdateStarted().addListener((payload) => this.forceUpdate());
        historyActionSet.workItemHistoryUpdateFailed().addListener((payload) => this.forceUpdate());
    }

    public render(): JSX.Element {
        if (this._store.isLoading()) {
            return <div className= "history-loading" >
                <Spinner label={PresentationResources.Loading} type={SpinnerType.large} />
            </div >;            
        }
        else {
            return <div ref={this._resolveControl}>
                <HistoryComponent store={this._store}
                    actionCreator={this._historyControlActionsCreator} />
            </div>
        }
    }

    protected _bind(workItem: WITOM.WorkItem, isDisabledView?: boolean) {
        this._invalidate();
    }

    protected _unbind() {
        this._historyActionsCreator.workItemHistoryClear();
    }

    protected _workItemChanged(change?: WITOM.IWorkItemChangedArgs) {
        this._invalidate();
    }

    private _invalidate() {

        const workItem = this._formContext.workItem;

        if (!workItem) {
            return;
        }

        // Only invalidate if the work item has been updated.
        if (this._workItemLoadTime === workItem.getLoadTime() && this._linkUpdateTime === workItem.getLinkUpdatedExternallyDate()) {
            return;
        }

        this._workItemLoadTime = workItem.getLoadTime();
        this._linkUpdateTime = workItem.getLinkUpdatedExternallyDate();

        this._historyActionsCreator.workItemHistoryUpdateStarted();
        this._cache.clear();

        const originalWorkItem = workItem;

        WorkItemHistory.getHistoryAsync(workItem).then(
            (history: WorkItemHistory) => {

                if (originalWorkItem !== workItem) {
                    return;
                }

                this._historyActionsCreator.workItemHistoryUpdateCompleted(history);
            },
            (error) => {
                if (originalWorkItem === workItem) {
                    this._historyActionsCreator.workItemHistoryUpdateFailed(error);
                }
            }
        );
    }

    private _onHistoryItemSelected(selectedItemId: number) {
        let historyItem = this._store.getHistoryItem(selectedItemId);
        if (historyItem.itemType !== ItemType.HistoryItem) {
            historyItem = null;
        }

        if (historyItem) {
            // Show the fullscreen view of this history item.
            const fsInvoke: IOpenFullScreen = this._formContext.items[FormContextItems.FullScreenInvoke];

            if (fsInvoke) {
                const field = this._formContext.workItem.getField(CoreField.History);
                const fieldName = field.fieldDefinition.name;

                // When the HistoryItemViewer is created in full screen it is outside of the react tree for the 
                // history component which means it will not get automatically refreshed when the store is updated.
                // This only happens when links are resolved so we have to handle link updates manually by 
                // listening for updates to links and calling 'forceUpdate' on the HistoryItemViewer component.
                const resolveControl = (resolvedControl: HistoryItemViewer) => this._fullScreenHistoryItemViewer = resolvedControl;

                fsInvoke(
                    fieldName,
                    (closeFullscreen: () => void, $container: JQuery): JSX.Element => {
                        return <div className='history-details-panel single-column'>
                            <HistoryItemViewer
                                item={historyItem as IHistoryItem}
                                actionCreator={this._historyControlActionsCreator}
                                ref={resolveControl} />
                               </div>
                    },
                    () => {
                        this._fullScreenHistoryItemViewer = null;
                    });
            }
        }
    }

    private _onLinksResolved() {
        if (this._fullScreenHistoryItemViewer) {
            this._fullScreenHistoryItemViewer.forceUpdate();
        }
    }
}