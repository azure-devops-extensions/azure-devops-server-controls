/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { ICellIndex, IFlatViewTableRow, IFlatViewColumn } from "DistributedTaskControls/Common/FlatViewTableTypes";
import { FlatViewTableWithAddButton } from "DistributedTaskControls/Components/FlatViewTableWithAddButton";
import { FlatViewTable } from "DistributedTaskControls/Components/FlatViewTable";
import { VariablesActionCreatorBase } from "DistributedTaskControls/Variables/Common/Actions/VariablesActionCreatorBase";
import { IVariablesState } from "DistributedTaskControls/Variables/Common/DataStoreBase";
import { VariablesViewStoreBase } from "DistributedTaskControls/Variables/Common/ViewStoreBase";
import { VariableColumnKeys } from "DistributedTaskControls/Variables/Common/Constants";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { IState } from "DistributedTaskControls/Variables/ProcessVariablesV2/DataStore";

import { DetailsListLayoutMode } from "OfficeFabric/DetailsList";

import { Positioning } from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Variables/Common/ControllerViewBase";

/**
 * @brief Base class for the variables views
 */
export abstract class VariablesControllerViewBase<P extends Base.IProps, S extends IVariablesState> extends Base.Component<P, S> {

    public componentWillMount(): void {
        this._store = this._getViewStore();
        this._actionCreator = this._getActionCreator();

        this.setState(this._store.getState() as S);
        this._store.addChangedListener(this._refreshVariableList);
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._refreshVariableList);
    }

    public render(): JSX.Element {
        let headers = this._getHeaders();
        let state = this._store.getState() as IState;
        
        if (!!state.hideAddVariables) {
            return (
                <FlatViewTable
                    disabled={!!state.variablesDisabledMode}
                    layoutMode={DetailsListLayoutMode.fixedColumns}
                    isHeaderVisible={this._isHeaderVisible()}
                    headers={headers}
                    rows={this._getVariableRows()}
                    onCellValueChanged={this._onCellValueChanged.bind(this)}
                    ariaLabel={this._getAriaLabel()}/>
            );
        } 
        else {
            return (
                <FlatViewTableWithAddButton
                    disabled={!!state.variablesDisabledMode}
                    layoutMode={DetailsListLayoutMode.fixedColumns}
                    flatViewContainerClass="dtc-variables-list"
                    containerClass="variables-section"
                    isHeaderVisible={this._isHeaderVisible()}
                    headers={headers}
                    rows={this._getVariableRows()}
                    onCellValueChanged={this._onCellValueChanged.bind(this)}
                    onAdd={this._addNewVariable}
                    addButtonClass="fabric-style-overrides add-new-item-button add-variable-btn"
                    addButtonDescription={Resources.AddVariableDescription}
                    ariaLabel={this._getAriaLabel()}
                    setFocusOnRender={false}
                    stopAutoFocus={this.isAutoFocusDisabled()}
                    focusSelectorOnAddRow=".dtc-variable-name-cell .flat-view-text" />
            );
        }
    }

    protected abstract _getActionCreator(): VariablesActionCreatorBase;
    protected abstract _getViewStore(): VariablesViewStoreBase;
    protected abstract _getHeaders(): IFlatViewColumn[];
    protected abstract _getVariableRows(): IFlatViewTableRow[];
    protected abstract _getAriaLabel(): string;

    protected _onCellValueChanged(newValue: string, cellIndex: ICellIndex): void {
        switch (cellIndex.columnKey) {
            case VariableColumnKeys.NameColumnKey:
                this._actionCreator.updateVariableKey({
                    index: cellIndex.rowIndex,
                    key: newValue
                });
                break;

            case VariableColumnKeys.ValueColumnKey:
                this._actionCreator.updateVariableValue({
                    index: cellIndex.rowIndex,
                    variable: {
                        value: newValue
                    }
                });
                break;

            case VariableColumnKeys.SettableAtQueueTimeColumnKey:
                this._actionCreator.updateVariableValue({
                    index: cellIndex.rowIndex,
                    variable: {
                        value: this._store.getCurrentVariablesArray()[cellIndex.rowIndex].value,
                        allowOverride: (newValue === "true")
                    }
                });
                break;

            default:
                break;
        }
    }

    protected _isHeaderVisible(): boolean {
        return true;
    }

    protected _isVariablesInDisabledMode(): boolean {
        return false;
    }

    protected isAutoFocusDisabled(): boolean {
        return false;
    }

    private _refreshVariableList = () => {
        this.setState(this._store.getState() as S);
    }

    private _addNewVariable = (event: React.MouseEvent<HTMLButtonElement>) => {
        this._actionCreator.addVariable({});
        DtcUtils.scrollElementToView(event.currentTarget, Positioning.VerticalScrollBehavior.Middle);
    }

    private _store: VariablesViewStoreBase;
    private _actionCreator: VariablesActionCreatorBase;
}

