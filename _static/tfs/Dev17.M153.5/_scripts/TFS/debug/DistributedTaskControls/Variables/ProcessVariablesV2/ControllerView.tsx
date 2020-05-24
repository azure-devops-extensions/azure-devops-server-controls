/// <reference types="react" />

import * as React from "react";

import { ContentType, ICellIndex, IFlatViewCell, IFlatViewColumn, IFlatViewTableRow } from "DistributedTaskControls/Common/FlatViewTableTypes";
import { FlatViewButton } from "DistributedTaskControls/Components/FlatViewButton";
import { FlatViewCheckBox } from "DistributedTaskControls/Components/FlatViewCheckBox";
import { FlatViewDropdown } from "DistributedTaskControls/Components/FlatViewDropdown";
import { FlatViewIcon } from "DistributedTaskControls/Components/FlatViewIcon";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { VariableColumnKeys, VariableConstants, ProcessVariableColumnOptionProperties } from "DistributedTaskControls/Variables/Common/Constants";
import { IVariablesState } from "DistributedTaskControls/Variables/Common/DataStoreBase";
import { IScope, IVariable } from "DistributedTaskControls/Variables/Common/Types";
import { VariablesUtils } from "DistributedTaskControls/Variables/Common/VariableUtils";
import { ProcessVariablesActionCreator } from "DistributedTaskControls/Variables/ProcessVariables/Actions/ProcessVariablesActionCreator";
import { IProcessVariablesControllerViewProps, ProcessVariablesControllerView } from "DistributedTaskControls/Variables/ProcessVariables/ControllerView";
import { IState } from "DistributedTaskControls/Variables/ProcessVariablesV2/DataStore";
import { ValidationHelper, ValidState } from "DistributedTaskControls/Variables/ProcessVariablesV2/ValidationHelper";

import { DirectionalHint } from "OfficeFabric/ContextualMenu";
import { ColumnActionsMode, IColumn } from "OfficeFabric/DetailsList";
import { TooltipHost } from "VSSUI/Tooltip";

import * as UtilsString from "VSS/Utils/String";

export interface IMessageIconProps {
    iconName: string;
    message: string;
    className?: string;
}

/**
 * @brief Controller view for Variables section under Variables tab.
 */
export class ProcessVariablesV2ControllerView<P extends IProcessVariablesControllerViewProps = IProcessVariablesControllerViewProps, S extends IVariablesState = IVariablesState> extends ProcessVariablesControllerView<P, S> {
    /**
     * Get column headers 
     * 
     * @protected
     * @returns {IDictionaryStringTo<IFlatViewColumn>}
     * 
     * @memberOf ProcessVariablesControllerView
     */
    protected _getHeaders(): IFlatViewColumn[] {
        let headers: IFlatViewColumn[] = [];
        let state = this._getViewStore().getState() as IState;

        if (!this.props.options.hideError) { 
            // error icon
            headers.push({
                key: VariableColumnKeys.IconColumnKey,
                name: this._getColumnOptionsPropertyValue(VariableColumnKeys.IconColumnKey, ProcessVariableColumnOptionProperties.HeaderName, Resources.VariableErrorMessageColumnHeader),
                isIconOnly: true,
                columnActionsMode: ColumnActionsMode.disabled,
                minWidth: this._getColumnOptionsPropertyValue(VariableColumnKeys.IconColumnKey, ProcessVariableColumnOptionProperties.MinWidth, 20),
                maxWidth: this._getColumnOptionsPropertyValue(VariableColumnKeys.IconColumnKey, ProcessVariableColumnOptionProperties.MaxWidth, 20)
            });
        }
        

        // name
        headers.push({
            key: VariableColumnKeys.NameColumnKey,
            name: this._getColumnOptionsPropertyValue(VariableColumnKeys.NameColumnKey, ProcessVariableColumnOptionProperties.HeaderName, Resources.NameLabel),
            minWidth: this._getColumnOptionsPropertyValue(VariableColumnKeys.NameColumnKey, ProcessVariableColumnOptionProperties.MinWidth, 200),
            maxWidth: this._getColumnOptionsPropertyValue(VariableColumnKeys.NameColumnKey, ProcessVariableColumnOptionProperties.MaxWidth, 300),
            onColumnClick: this._onColumnClick,
            columnActionsMode: this._isSortingEnabled() ? ColumnActionsMode.clickable : ColumnActionsMode.disabled,
            isSorted: this._isSortingEnabled() && state.sortedColumnKey === VariableColumnKeys.NameColumnKey,
            isSortedDescending: state.sortedColumnKey === VariableColumnKeys.NameColumnKey ? state.isSortedDescending : false
        });

        // delete
        if (!this.props.options.hideDelete) {
            headers.push({
                key: VariableColumnKeys.DeleteColumnKey,
                name: this._getColumnOptionsPropertyValue(VariableColumnKeys.DeleteColumnKey, ProcessVariableColumnOptionProperties.HeaderName, Resources.VariableDeleteColumnHeader),
                isIconOnly: true,
                columnActionsMode: ColumnActionsMode.disabled,
                minWidth: this._getColumnOptionsPropertyValue(VariableColumnKeys.DeleteColumnKey, ProcessVariableColumnOptionProperties.MinWidth, 32),
                maxWidth: this._getColumnOptionsPropertyValue(VariableColumnKeys.DeleteColumnKey, ProcessVariableColumnOptionProperties.MaxWidth, 32)
            });
        }

        // value
        headers.push({
            key: VariableColumnKeys.ValueColumnKey,
            name: this._getColumnOptionsPropertyValue(VariableColumnKeys.ValueColumnKey, ProcessVariableColumnOptionProperties.HeaderName, Resources.ValueLabel),
            columnActionsMode: ColumnActionsMode.disabled,
            minWidth: this._getColumnOptionsPropertyValue(VariableColumnKeys.ValueColumnKey, ProcessVariableColumnOptionProperties.MinWidth, 300),
            maxWidth: this._getColumnOptionsPropertyValue(VariableColumnKeys.ValueColumnKey, ProcessVariableColumnOptionProperties.MaxWidth, 450),
            isSorted: this._isSortingEnabled() && state.sortedColumnKey === VariableColumnKeys.ValueColumnKey,
            isSortedDescending: state.sortedColumnKey === VariableColumnKeys.ValueColumnKey ? state.isSortedDescending : false
        });

        // secret
        if (!this.props.options.hideSecret) {
            headers.push({
                key: VariableColumnKeys.SecretColumnKey,
                name: this._getColumnOptionsPropertyValue(VariableColumnKeys.SecretColumnKey, ProcessVariableColumnOptionProperties.HeaderName, Resources.VariableSecretColumnHeader),
                isIconOnly: true,
                columnActionsMode: ColumnActionsMode.disabled,
                iconClassName: "dtc-variables-secret-icon",
                iconName: "Lock",
                minWidth: this._getColumnOptionsPropertyValue(VariableColumnKeys.SecretColumnKey, ProcessVariableColumnOptionProperties.MinWidth, 32),
                maxWidth: this._getColumnOptionsPropertyValue(VariableColumnKeys.SecretColumnKey, ProcessVariableColumnOptionProperties.MaxWidth, 32)
            });
        }

        // scope
        if (this.props.options.supportScopes) {
            headers.push({
                key: VariableColumnKeys.ScopeColumnKey,
                name: this._getColumnOptionsPropertyValue(VariableColumnKeys.ScopeColumnKey, ProcessVariableColumnOptionProperties.HeaderName, Resources.ScopeText),
                minWidth: this._getColumnOptionsPropertyValue(VariableColumnKeys.ScopeColumnKey, ProcessVariableColumnOptionProperties.MinWidth, 220),
                maxWidth: this._getColumnOptionsPropertyValue(VariableColumnKeys.ScopeColumnKey, ProcessVariableColumnOptionProperties.MaxWidth, 220),
                onColumnClick: this._onColumnClick,
                columnActionsMode: this._isSortingEnabled() ? ColumnActionsMode.clickable : ColumnActionsMode.disabled,
                isSorted: this._isSortingEnabled() && state.sortedColumnKey === VariableColumnKeys.ScopeColumnKey,
                isSortedDescending: state.sortedColumnKey === VariableColumnKeys.ScopeColumnKey ? state.isSortedDescending : false
            });
        }

        // settable at queue time
        if (this.props.options.settableAtQueueTime) {

            headers.push({
                key: VariableColumnKeys.SettableAtQueueTimeColumnKey,
                name: this._getColumnOptionsPropertyValue(VariableColumnKeys.SettableAtQueueTimeColumnKey, ProcessVariableColumnOptionProperties.HeaderName, Resources.SettableAtQueueTimeText),
                columnActionsMode: ColumnActionsMode.disabled,
                minWidth: this._getColumnOptionsPropertyValue(VariableColumnKeys.SettableAtQueueTimeColumnKey, ProcessVariableColumnOptionProperties.MinWidth, 130),
                maxWidth: this._getColumnOptionsPropertyValue(VariableColumnKeys.SettableAtQueueTimeColumnKey, ProcessVariableColumnOptionProperties.MaxWidth, 140)
            });
        }

        return headers;
    }

    /**
     * Returns jsx for list of variables
     * 
     * @protected
     * @returns {IFlatViewTableRow[]}
     * 
     * @memberOf ProcessVariablesControllerView
     */
    protected _getVariableRows(): IFlatViewTableRow[] {
        let variableRows: IFlatViewTableRow[] = [];

        let state = this._getViewStore().getState() as IState;
        let variablesArray: IVariable[] = state.variablesArray;
        let scopes: IScope[] = state.scopes;
        let variablesDisabledMode: boolean = state.variablesDisabledMode;

        // create a map of variable names that contains the count of its occurence. 
        let duplicateVariableNamesMap = this._getViewStore().getDuplicateVariableNamesMap();

        variablesArray.forEach((variable: IVariable, index: number) => {
            let row: IFlatViewTableRow = { cells: {} };

            row.rowAriaLabel = VariablesUtils.getVariableRowAriaLabel(variable);

            let scopedDuplicateVariableNamesMap = duplicateVariableNamesMap[(variable.scope && variable.scope.key) || VariableConstants.DefaultScopeKey];

            // icon column
            row.cells[VariableColumnKeys.IconColumnKey] = this._getIconCellContent(variable, scopedDuplicateVariableNamesMap, variablesDisabledMode);

            // name column
            row.cells[VariableColumnKeys.NameColumnKey] = this._getNameCellContent(variable, scopedDuplicateVariableNamesMap);

            // value column
            row.cells[VariableColumnKeys.ValueColumnKey] = this._getValueCellContent(variable);

            // settable at queue time column
            if (this.props.options.settableAtQueueTime) {
                row.cells[VariableColumnKeys.SettableAtQueueTimeColumnKey] = this._getSettableAtQueueTime(variable, index);
            }

            // secret column
            row.cells[VariableColumnKeys.SecretColumnKey] = this._getSecretCellContent(variable, index);

            // delete column
            row.cells[VariableColumnKeys.DeleteColumnKey] = this._getDeleteCellContent(variable, index);

            // scope column
            if (this.props.options.supportScopes) {
                row.cells[VariableColumnKeys.ScopeColumnKey] = this._getScopeCellContent(variable, scopes, index);
            }

            variableRows.push(row);
        });

        return variableRows;
    }

    /**
     * Handle the value changed event on the respective cell
     * 
     * @protected
     * @param {string} newValue 
     * @param {ICellIndex} cellIndex 
     * 
     * @memberOf ProcessVariablesV2ControllerView
     */
    protected _onCellValueChanged(newValue: string, cellIndex: ICellIndex): void {
        switch (cellIndex.columnKey) {
            case VariableColumnKeys.NameColumnKey:
                this._getActionCreator().updateVariableKey({
                    index: this._getDataIndex(cellIndex.rowIndex),
                    key: newValue
                });
                break;

            case VariableColumnKeys.ValueColumnKey:
                this._getActionCreator().updateVariableValue({
                    index: this._getDataIndex(cellIndex.rowIndex),
                    variable: {
                        value: newValue
                    }
                });
                break;

            case VariableColumnKeys.SettableAtQueueTimeColumnKey:
                this._getActionCreator().updateVariableValue({
                    index: this._getDataIndex(cellIndex.rowIndex),
                    variable: {
                        value: this._getViewStore().getCurrentVariablesArray()[cellIndex.rowIndex].value,
                        allowOverride: (newValue === "true")
                    }
                });
                break;

            case VariableColumnKeys.ScopeColumnKey:

                let state = this._getViewStore().getState() as IState;
                let scopes: IScope[] = state.scopes;
                let selectedScope: IScope;

                let filteredScopes = scopes.filter((scope: IScope) => { return scope.value === newValue; });
                if (filteredScopes && filteredScopes.length > 0) {
                    selectedScope = filteredScopes[0];
                }

                this._getActionCreator().updateVariableValue({
                    index: this._getDataIndex(cellIndex.rowIndex),
                    variable: {
                        value: this._getViewStore().getCurrentVariablesArray()[cellIndex.rowIndex].value,
                        scope: selectedScope
                    }
                });
                break;

            default:
                break;
        }
    }

    protected isAutoFocusDisabled(): boolean {
        let state = this._getViewStore().getState();
        return state.stopAutoFocus;
    }

    /**
     * Create cell for icon
     * 
     * @private
     * @param {IVariable} variable 
     * @param {IDictionaryStringTo<number>} duplicateVariableNamesMap 
     * @returns {IFlatViewCell} 
     * 
     * @memberOf ProcessVariablesV2ControllerView
     */
    private _getIconCellContent(variable: IVariable, duplicateVariableNamesMap: IDictionaryStringTo<number>, variablesDisabledMode: boolean = false): IFlatViewCell {

        // Don't show permission warning icon when variables UI is in disabled mode, which is the case for variables in release progress
        let messageIconProps = !variablesDisabledMode ? this._getMessageIconProps(variable, duplicateVariableNamesMap) : null;
        let content: JSX.Element;

        if (messageIconProps) {
            let { message, iconName, className } = messageIconProps;
            content = (
                <TooltipHost content={message} directionalHint={DirectionalHint.bottomCenter}>
                    <FlatViewIcon ariaLiveRegionMessage={message} rowSelected={false} iconName={iconName} className={className} />
                </TooltipHost>
            );
        }

        return {
            content: content,
            contentType: ContentType.JsxElement
        } as IFlatViewCell;
    }

    private _getMessageIconProps(variable: IVariable, duplicateVariableNamesMap: IDictionaryStringTo<number>): IMessageIconProps {

        let valueValidationState = ValidationHelper.getValueValidationState(variable);

        // If error scenario, show the error message with icon
        if (valueValidationState.state === ValidState.Invalid) {
            return {
                iconName: "Error",
                className: "dtc-variable-validation-error",
                message: valueValidationState.message
            };
        }

        let nameValidationState = ValidationHelper.getNameValidationState(variable, duplicateVariableNamesMap);

        // If error scenario, show the error message with icon
        if (nameValidationState.state === ValidState.Invalid) {
            return {
                iconName: "Error",
                className: "dtc-variable-validation-error",
                message: nameValidationState.message
            };
        }

        // If permission issue, show the warning message with icon
        else if (variable.scope && this._getViewStore().shouldShowPermissionWarning(variable.scope.key)) {
            return {
                iconName: "Info",
                message: this._getViewStore().getPermissionWarningMessage()
            };
        }

        return null;
    }

    /**
     * Create cell for name
     * 
     * @private
     * @param {IVariable} variable
     * @param {IDictionaryStringTo<number>} duplicateVariableNamesMap
     * @returns {IFlatViewCell}
     * 
     * @memberOf ProcessVariablesControllerView
     */
    private _getNameCellContent(variable: IVariable, duplicateVariableNamesMap: IDictionaryStringTo<number>): IFlatViewCell {

        let validationState = ValidationHelper.getNameValidationState(variable, duplicateVariableNamesMap);

        return {
            cssClass: "dtc-variable-name-cell",
            content: variable.name,
            contentType: ContentType.SimpleText,
            contentHasErrors: validationState.state === ValidState.Invalid,
            isTextDisabled: (!!variable.disableVariable) || (!!variable.isSystemVariable) || (!!variable.disableSecretVariableName) || (!!this._isColumnReadOnly(VariableColumnKeys.NameColumnKey)),
            placeHolder: Resources.VariableNamePlaceHolder
        } as IFlatViewCell;
    }

    /**
     * Create cell for value
     * 
     * @private
     * @param {IVariable} variable
     * @returns {IFlatViewCell}
     * 
     * @memberOf ProcessVariablesControllerView
     */
    private _getValueCellContent(variable: IVariable): IFlatViewCell {

        let validationState = ValidationHelper.getValueValidationState(variable);

        return {
            cssClass: "dtc-variable-value-cell",
            content: variable.value,
            contentType: (!!variable.isSecret) ? ContentType.PasswordText : ContentType.SimpleText,
            contentHasErrors: validationState.state === ValidState.Invalid,
            payload: variable,
            isTextDisabled: (!!variable.disableVariable) || (!!variable.isSystemVariable) || (!!this._isColumnReadOnly(VariableColumnKeys.ValueColumnKey)),
            placeHolder: Resources.VariableValuePlaceHolder,
            ariaLabel: UtilsString.format(Resources.VariableValueLabel, variable.name)
        } as IFlatViewCell;
    }

    /**
     * Create cell for secret
     * 
     * @private
     * @param {IVariable} variable
     * @param {number} index
     * @returns {IFlatViewCell}
     * 
     * @memberOf ProcessVariablesControllerView
     */
    private _getSecretCellContent(variable: IVariable, index: number): IFlatViewCell {
        let disabled: boolean;
        let tooltip: string = UtilsString.empty;
        disabled = this._isVariableDisabled(variable);

        if (!!disabled) {
            // If disabled, show a tool tip that indicates wheather the variable is secret/plain
            tooltip = !!variable.isSecret 
            ? Resources.SecretVariable 
            : Resources.PlainVariable;
        } else {
            // If not disabled, show actionable tool tip. Eg: Change variable type to secret.
            tooltip = !!variable.isSecret 
            ? Resources.ChangeVariableTypeToPlain 
            : Resources.ChangeVariableTypeToSecret;
        }

        return {
            content: (
                <FlatViewButton
                    tooltip={tooltip}
                    rowSelected={false}
                    iconProps={{ iconName: !!variable.isSecret ? "Lock" : "Unlock" }}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                        this._getActionCreator().updateVariableValue({
                            index: this._getDataIndex(index),
                            variable: {
                                value: variable.value,
                                isSecret: !(variable.isSecret)
                            }
                        });
                    }}
                    disabled={disabled} />
            ),
            contentType: ContentType.JsxElement
        } as IFlatViewCell;
    }

    private _isVariableDisabled(variable: IVariable): boolean {
        return !!variable.disableVariable 
        || !!(variable.isSystemVariable) 
        || (!!this._isColumnReadOnly(VariableColumnKeys.SecretColumnKey));
    }

    /**
     * Create cell for scope
     * 
     * @private
     * @param {IVariable} variable
     * @param {number} index
     * @param {string[]} targets
     * @returns {IFlatViewCell}
     * 
     * @memberOf ProcessVariablesControllerView
     */
    private _getScopeCellContent(variable: IVariable, scopes: IScope[], index: number): IFlatViewCell {

        let selectedCondition: string = UtilsString.empty;
        let conditions: string[] = [];
        let disabledConditions: string[] = [];

        let filteredScopes = scopes.filter((scope: IScope) => { return scope.key === variable.scope.key; });
        if (filteredScopes && filteredScopes.length > 0) {
            selectedCondition = filteredScopes[0].value;
        }

        conditions = scopes.map((scope: IScope) => { return scope.value; });
        scopes.forEach((scope: IScope) => {
            if (scope.isDisabled) {
                disabledConditions.push(scope.value);
            }
        });

        if (this._isColumnReadOnly(VariableColumnKeys.ScopeColumnKey)) {
            return {
                content: selectedCondition,
                contentType: ContentType.SimpleText,
                contentHasErrors: false,
                isTextDisabled: true
            } as IFlatViewCell;
        }
        else {
            return {
                content: (
                    <FlatViewDropdown
                        disabledConditions={disabledConditions}
                        staticFlatViewDropdown={true}
                        maxAutoExpandDropWidth={300}
                        conditions={conditions}
                        selectedCondition={selectedCondition}
                        rowSelected={false}
                        isDisabled={!!variable.disableVariable}
                        onValueChanged={(newValue: string) => {
                            this._onCellValueChanged(newValue,
                                {
                                    rowIndex: index,
                                    columnKey: VariableColumnKeys.ScopeColumnKey
                                });
                        }} />
                ),
                contentType: ContentType.JsxElement,
                ariaLabel: UtilsString.format(Resources.VariableScopeLabel, variable.name)
            } as IFlatViewCell;
        }
    }

    /**
     * Create cell for delete 
     * 
     * @private
     * @param {IVariable} variable
     * @param {number} index
     * @returns {IFlatViewCell}
     * 
     * @memberOf ProcessVariablesControllerView
     */
    private _getDeleteCellContent(variable: IVariable, index: number): IFlatViewCell {
        return {
            content: (
                <FlatViewButton
                    tooltip={VariablesUtils.getDeleteVariableIconAriaLabel(variable)}
                    rowSelected={false}
                    iconProps={{ iconName: "Delete" }}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                        this._getActionCreator().deleteVariable({
                            index: this._getDataIndex(index),
                            key: variable.name
                        });
                    }}
                    disabled={!!variable.disableVariable || !!(variable.isSystemVariable) || (!!this._isColumnReadOnly(VariableColumnKeys.DeleteColumnKey))} />
            ),
            contentType: ContentType.JsxElement
        } as IFlatViewCell;
    }

    /**
     * Create cell for settable at queue time
     * 
     * @private
     * @param {IVariable} variable
     * @param {number} index
     * @returns {IFlatViewCell}
     * 
     * @memberOf ProcessVariablesControllerView
     */
    private _getSettableAtQueueTime(variable: IVariable, index: number): IFlatViewCell {
        return {
            content: (
                <FlatViewCheckBox
                    ariaLabel={VariablesUtils.getSettableAtQueueTimeAriaLabel(variable)}
                    value={variable.allowOverride}
                    rowSelected={false}
                    onValueChanged={(newValue: boolean) => {
                        this._onCellValueChanged(newValue.toString(),
                            {
                                rowIndex: index,
                                columnKey: VariableColumnKeys.SettableAtQueueTimeColumnKey
                            });
                    }}
                    isDisabled={!!variable.disableVariable || !!(variable.isSystemVariable) || (!!this._isColumnReadOnly(VariableColumnKeys.SettableAtQueueTimeColumnKey))} />
            ),
            contentType: ContentType.JsxElement
        } as IFlatViewCell;
    }

    /**
     * Handle the onClick event on the column
     * Sorts the variables based on the column key
     * 
     * @private
     * 
     * @memberOf ProcessVariablesV2ControllerView
     */
    private _onColumnClick = (event?: React.MouseEvent<HTMLElement>, column?: IColumn) => {
        if (this._isSortingEnabled()) {
            let actions = this._getActionCreator() as ProcessVariablesActionCreator;
            actions.sort({ columnKey: column.key, isSortedDescending: !column.isSortedDescending });
        }
    }

    private _getDataIndex(viewIndex: number): number {
        return this._getViewStore().getState().viewIndexTodataIndexMap[viewIndex];
    }

    private _isSortingEnabled(): boolean {
        return !this.props.options.disableSorting;
    }
}

