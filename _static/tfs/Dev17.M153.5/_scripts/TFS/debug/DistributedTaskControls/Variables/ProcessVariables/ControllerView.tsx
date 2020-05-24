/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { IVariable } from "DistributedTaskControls/Variables/Common/Types";
import { IFlatViewTableRow, IFlatViewCell, ContentType, IFlatViewColumn } from "DistributedTaskControls/Common/FlatViewTableTypes";
import { FlatViewCheckBox } from "DistributedTaskControls/Components/FlatViewCheckBox";
import { ProcessVariablesActionCreator } from "DistributedTaskControls/Variables/ProcessVariables/Actions/ProcessVariablesActionCreator";
import { VariablesControllerViewBase } from "DistributedTaskControls/Variables/Common/ControllerViewBase";
import { IVariablesState } from "DistributedTaskControls/Variables/Common/DataStoreBase";
import { ProcessVariablesViewStore, IProcessVariablesViewStoreArgs } from "DistributedTaskControls/Variables/ProcessVariables/ViewStore";
import { VariableColumnKeys, ProcessVariableColumnOptionProperties } from "DistributedTaskControls/Variables/Common/Constants";
import { VariablesUtils } from "DistributedTaskControls/Variables/Common/VariableUtils";
import { IProcessVariablesOptions } from "DistributedTaskControls/Variables/Common/Types";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import * as DetailsListProps from "OfficeFabric/DetailsList";

import * as UtilsString from "VSS/Utils/String";

export interface IProcessVariablesControllerViewProps extends Base.IProps {
    options: IProcessVariablesOptions;
}

/**
 * @brief Controller view for Variables section under Variables tab.
 */
export class ProcessVariablesControllerView<P extends IProcessVariablesControllerViewProps = IProcessVariablesControllerViewProps, S extends IVariablesState = IVariablesState> extends VariablesControllerViewBase<P, S> {

    constructor(props: P) {
        super(props);
        this._processVariableViewStore = StoreManager.CreateStore<ProcessVariablesViewStore, IProcessVariablesViewStoreArgs>(ProcessVariablesViewStore, props.instanceId, {});
        this._processVariablesActionCreator = ActionCreatorManager.GetActionCreator<ProcessVariablesActionCreator>(ProcessVariablesActionCreator, props.instanceId);
    }

    protected _getViewStore(): ProcessVariablesViewStore {
        return this._processVariableViewStore;
    }

    protected _getActionCreator(): ProcessVariablesActionCreator {
        return this._processVariablesActionCreator;
    }

    protected _getHeaders(): IFlatViewColumn[] {
        let headers: IFlatViewColumn[] = [];
        let headerClass: string = "flatview-header header-variables-table";

        headers.push({
            key: VariableColumnKeys.NameColumnKey,
            name: this._getColumnOptionsPropertyValue(VariableColumnKeys.NameColumnKey, ProcessVariableColumnOptionProperties.HeaderName, Resources.NameLabel),
            minWidth: this._getColumnOptionsPropertyValue(VariableColumnKeys.NameColumnKey, ProcessVariableColumnOptionProperties.MinWidth, 200),
            headerClassName: headerClass,
            columnActionsMode: DetailsListProps.ColumnActionsMode.disabled
        });

        headers.push({
            key: VariableColumnKeys.ValueColumnKey,
            name: this._getColumnOptionsPropertyValue(VariableColumnKeys.ValueColumnKey, ProcessVariableColumnOptionProperties.HeaderName, Resources.ValueLabel),
            minWidth: this._getColumnOptionsPropertyValue(VariableColumnKeys.ValueColumnKey, ProcessVariableColumnOptionProperties.MinWidth, 400),
            headerClassName: headerClass,
            columnActionsMode: DetailsListProps.ColumnActionsMode.disabled
        });

        if (this.props.options.settableAtQueueTime) {

            headers.push({
                key: VariableColumnKeys.SettableAtQueueTimeColumnKey,
                name: this._getColumnOptionsPropertyValue(VariableColumnKeys.SettableAtQueueTimeColumnKey, ProcessVariableColumnOptionProperties.HeaderName, Resources.SettableAtQueueTimeText),
                minWidth: this._getColumnOptionsPropertyValue(VariableColumnKeys.SettableAtQueueTimeColumnKey, ProcessVariableColumnOptionProperties.MinWidth, 80),
                maxWidth: this._getColumnOptionsPropertyValue(VariableColumnKeys.SettableAtQueueTimeColumnKey, ProcessVariableColumnOptionProperties.MaxWidth, 100),
                headerClassName: headerClass,
                columnActionsMode: DetailsListProps.ColumnActionsMode.disabled
            });
        }

        return headers;
    }

    protected _getColumnOptionsPropertyValue<T>(columnKey: string, propertyName: string, defaultValue: T): T {
        const columnOptions = this.props.options.columnOptionOverrides;
        if (!!columnOptions
            && !!columnOptions[columnKey] 
            && !!columnOptions[columnKey][propertyName]) {

            return columnOptions[columnKey][propertyName];
        }

        return defaultValue;
    }

    protected _isColumnReadOnly(key: string): boolean {
        return this._getColumnOptionsPropertyValue(key, ProcessVariableColumnOptionProperties.IsReadOnly, false);
    }

    /**
     * @brief Returns jsx for list of variables
     */
    protected _getVariableRows(): IFlatViewTableRow[] {
        let variableRows: IFlatViewTableRow[] = [];

        let state = this._getViewStore().getState() as IVariablesState;
        let variablesArray: IVariable[] = state.variablesArray;

        let valueControlIcon: string = "Unlock";
        let valueControlTitle: string = Resources.UnLockText;

        let duplicateVariableNamesMap = this._getViewStore().getDefaultScopeDuplicateVariableNamesMap();

        variablesArray.forEach((variable: IVariable, index: number) => {
            let row: IFlatViewTableRow = { cells: {} };

            row.rowAriaLabel = VariablesUtils.getVariableRowAriaLabel(variable);

            row.cells[VariableColumnKeys.NameColumnKey] = {
                cssClass: "dtc-variable-name-cell",
                content: variable.name,
                contentType: ContentType.SimpleText,
                contentHasErrors: (variable.name.trim() === UtilsString.empty) || (duplicateVariableNamesMap[variable.name.trim().toLocaleLowerCase()] > 1),
                isTextDisabled: (!!variable.isSystemVariable),
                controlIcon: "Delete",
                controlTitle: VariablesUtils.getDeleteVariableIconAriaLabel(variable),
                controlClickCallback: () => {
                    this._getActionCreator().deleteVariable({
                        index: index,
                        key: variable.name
                    });
                }
            } as IFlatViewCell;

            if (!!variable.isSecret) {
                valueControlIcon = "Lock";
                valueControlTitle = Resources.ChangeVariableTypeToPlain;
            } else {
                valueControlIcon = "Unlock";
                valueControlTitle = Resources.ChangeVariableTypeToSecret;
            }

            row.cells[VariableColumnKeys.ValueColumnKey] = {
                cssClass: "dtc-variable-value-cell",
                content: variable.value,
                contentType: (!!variable.isSecret) ? ContentType.PasswordText : ContentType.SimpleText,
                payload: variable,
                isTextDisabled: (!!variable.isSystemVariable),
                controlIcon: valueControlIcon,
                controlTitle: valueControlTitle,
                controlClickCallback: () => {
                    this._getActionCreator().updateVariableValue({
                        index: index,
                        variable: {
                            value: variable.value,
                            isSecret: !(variable.isSecret)
                        }
                    });
                }
            } as IFlatViewCell;

            if (this.props.options.settableAtQueueTime) {
                row.cells[VariableColumnKeys.SettableAtQueueTimeColumnKey] = {
                    content: (
                        <FlatViewCheckBox
                            value={variable.allowOverride}
                            rowSelected={false}
                            onValueChanged={(newValue: boolean) => {
                                this._onCellValueChanged(newValue.toString(),
                                    {
                                        rowIndex: index,
                                        columnKey: VariableColumnKeys.SettableAtQueueTimeColumnKey
                                    });
                            }}
                            isDisabled={!!(variable.isSystemVariable)} />
                    ),
                    contentType: ContentType.JsxElement
                } as IFlatViewCell;
            }

            variableRows.push(row);
        });

        return variableRows;
    }

    protected _getAriaLabel(): string {
        return Resources.ARIALabelProcessVariablesTable;
    }

    private _processVariableViewStore: ProcessVariablesViewStore;
    private _processVariablesActionCreator: ProcessVariablesActionCreator;
}

