/// <reference types="jquery" />
import { Selection } from "OfficeFabric/DetailsList";
import {
    AssociateWITDialogActionsHub,
} from "TestManagement/Scripts/Scenarios/TestTabExtension/Actions/AssociateWITDialogActionsHub";
import { WorkItem } from "TFS/WorkItemTracking/Contracts";
import * as ComponentBase from "VSS/Flux/Component";
import { Store } from "VSS/Flux/Store";
import { delegate } from "VSS/Utils/Core";

export interface IAssociateWorkItemState extends ComponentBase.State {
    showDialog: boolean;
    itemSelecled: boolean;
    workItems: WorkItem[];
    workItemTypeColorAndIcon: {};
    WorkItemsStateColor: {};
    ShowWorkItemCountInfoBar: boolean;
    isWorkItemsFetching: boolean;
    searchTriggered: boolean;
    errorMessage: string;
    selection: Selection;
}

export interface IWorkItemInfo {
    workItems: WorkItem[];
    workItemTypeColorAndIcon: {};
    WorkItemsStateColor: {};
}

export class AssociateWITDialogStore extends Store {

    private _state: IAssociateWorkItemState;

    constructor(private _actionsHub: AssociateWITDialogActionsHub) {
        super();
        this._initialize();
    }

    public getState(): IAssociateWorkItemState {
        return this._state;
    }

    private _initialize(): void {
        this._state = this._getDefaultState();

        this._actionsHub.onError.addListener(delegate(this, this._onErrorListener));
        this._actionsHub.initializeResult.addListener(delegate(this, this._initializeResult));
        this._actionsHub.fetchingWorkItems.addListener(delegate(this, this._updateSpinner));
        this._actionsHub.onColumnSorted.addListener(delegate(this, this._updateSortedResult));
        this._actionsHub.closeInfoBar.addListener(delegate(this, this._closeInfoBar));
        this._actionsHub.clearStore.addListener(delegate(this, this._clearStore));
    }

    private _getDefaultState(): IAssociateWorkItemState {
        return {
            showDialog: true,
            itemSelecled: false,
            workItems: [],
            workItemTypeColorAndIcon: {},
            WorkItemsStateColor: {},
            isWorkItemsFetching: false,
            ShowWorkItemCountInfoBar: true,
            searchTriggered: false,
            errorMessage: null,
            selection: new Selection(),
        } as IAssociateWorkItemState;
    }

    private _onErrorListener(errorMessage: string): void {
        this._state.isWorkItemsFetching = false;
        this._state.errorMessage = errorMessage;
        this.emitChanged();
    }

    private _initializeResult(workItemInfo: IWorkItemInfo): void {
        this._state.workItems = workItemInfo.workItems;
        this._state.workItemTypeColorAndIcon = workItemInfo.workItemTypeColorAndIcon;
        this._state.WorkItemsStateColor = workItemInfo.WorkItemsStateColor;
        this._state.isWorkItemsFetching = false;
        this.emitChanged();
    }

    private _updateSpinner() {
        this._state.isWorkItemsFetching = true;
        this._state.workItems = [];
        this._state.searchTriggered = true;
        this.emitChanged();
    }

    private _updateSortedResult(workItems: WorkItem[]) {
        this._state.workItems = workItems;
        this.emitChanged();
    }

    private _closeInfoBar() {
        this._state.ShowWorkItemCountInfoBar = false;
        this.emitChanged();
    }

    private _clearStore() {
        this._state = this._getDefaultState();
        this.emitChanged();
    }
}
