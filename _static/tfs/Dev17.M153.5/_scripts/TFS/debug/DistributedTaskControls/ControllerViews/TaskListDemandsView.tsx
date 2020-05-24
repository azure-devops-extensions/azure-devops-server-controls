/// <reference types="react" />

import * as React from "react";

import { DemandsActionsCreator } from "DistributedTaskControls/Actions/DemandsActionCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { DemandConstants } from "DistributedTaskControls/Common/Common";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { ICellIndex, IFlatViewTableRow } from "DistributedTaskControls/Common/FlatViewTableTypes";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { Demands } from "DistributedTaskControls/Components/Demands";
import { DemandsViewUtils } from "DistributedTaskControls/ControllerViews/DemandsView";
import { DemandsStore, DemandsUtils, IDemandData, IDemandsState } from "DistributedTaskControls/Stores/DemandsStore";
import { TaskListStore } from "DistributedTaskControls/Stores/TaskListStore";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/ControllerViews/DemandsView";

export interface IProps extends Base.IProps {
    showHeader?: boolean;
    nameMaxWidth?: number;
    conditionMaxWidth?: number;
    valueMaxWidth?: number;
    taskListStoreInstanceId: string;
    disabled?: boolean;
}

export class TaskListDemandsView extends Base.Component<IProps, IDemandsState> {

    constructor(props: IProps) {
        super(props);

        this._store = StoreManager.GetStore<DemandsStore>(DemandsStore, this.props.instanceId);
        this.state = this._store.getState();
        try {
            this._taskListStore = StoreManager.GetStore<TaskListStore>(TaskListStore, this.props.taskListStoreInstanceId);
        }
        catch (err) {
            // When queue dialog is rendered with out tasks information, tasklist store will not be initialized, we will not see readonlydemands
            //  if this fails, but for that we shouldn't blow up the experience
            console.warn(err);
        }

        this._actionCreator = ActionCreatorManager.GetActionCreator<DemandsActionsCreator>(DemandsActionsCreator, this.props.instanceId);
    }

    public componentDidMount() {
        this._store.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        if (this._taskListStore) {
            this._readOnlyDemands = DtcUtils.convertSerializedDemandToDemandData(this._taskListStore.getReadOnlyDemands());
        }

        return <Demands
            showHeader={this.props.showHeader}
            nameMaxWidth={this.props.nameMaxWidth}
            conditionMaxWidth={this.props.conditionMaxWidth}
            valueMaxWidth={this.props.valueMaxWidth}
            rows={this._getDemandsRows()}
            onCellValueChanged={this._onCellValueChanged}
            onAddDemandClick={this._onAddDemandClick}
            disabled={this.props.disabled}
            focusSelectorOnAddRow={".dtc-demand-name-cell .flat-view-text-input-read-only"}
        />;
    }

    private _onAddDemandClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
        this._actionCreator.addDemand();
    }

    private _onCellValueChanged = (newValue: string, cellIndex: ICellIndex): void => {
        //Length to reduce from cellIndex as only custom demands can be modified
        let readOnlyDemandsLength = (this._readOnlyDemands && this._readOnlyDemands.length > 0) ? this._readOnlyDemands.length : 0;

        switch (cellIndex.columnKey) {
            case DemandConstants.nameColumnKey:
                this._actionCreator.updateDemandKey(cellIndex.rowIndex - readOnlyDemandsLength, newValue);
                break;
            case DemandConstants.valueColumnKey:
                this._actionCreator.updateDemandValue(cellIndex.rowIndex - readOnlyDemandsLength, newValue);
                break;
            default:
                break;
        }
    }

    private _getDemandsRows(): IFlatViewTableRow[] {
        let rows: IFlatViewTableRow[] = [];

        let readOnlyDemands = (this._readOnlyDemands && this._readOnlyDemands.length > 0) ? DemandsUtils.createDemandsCopy(this._readOnlyDemands) : [];

        let readOnlyDemandsRows = DemandsViewUtils.getRowData(readOnlyDemands, this._store, this._actionCreator, true);
        let customDemandsRows = DemandsViewUtils.getRowData(this.state.demands, this._store, this._actionCreator, this.props.disabled);

        rows = readOnlyDemandsRows.concat(customDemandsRows);
        return rows;
    }

    private _onChange = () => {
        this.setState(this._store.getState());
    }

    private _readOnlyDemands: IDemandData[];
    private _taskListStore: TaskListStore | null = null;
    private _store: DemandsStore;
    private _actionCreator: DemandsActionsCreator;
}
