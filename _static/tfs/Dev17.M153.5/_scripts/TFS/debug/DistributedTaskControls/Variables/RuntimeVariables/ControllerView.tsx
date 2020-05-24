/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { IFlatViewTableRow, IFlatViewCell, ContentType, IFlatViewColumn } from "DistributedTaskControls/Common/FlatViewTableTypes";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { FlatViewButton } from "DistributedTaskControls/Components/FlatViewButton";
import { FlatViewIcon } from "DistributedTaskControls/Components/FlatViewIcon";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { VariableColumnKeys, VariableConstants } from "DistributedTaskControls/Variables/Common/Constants";
import { VariablesControllerViewBase } from "DistributedTaskControls/Variables/Common/ControllerViewBase";
import { IVariablesState } from "DistributedTaskControls/Variables/Common/DataStoreBase";
import { IVariable } from "DistributedTaskControls/Variables/Common/Types";
import { VariablesUtils } from "DistributedTaskControls/Variables/Common/VariableUtils";
import { IMessageIconProps } from "DistributedTaskControls/Variables/ProcessVariablesV2/ControllerView";
import { IValidationState, ValidState, ValidationHelper } from "DistributedTaskControls/Variables/ProcessVariablesV2/ValidationHelper";
import { RuntimeVariablesActionCreator } from "DistributedTaskControls/Variables/RuntimeVariables/Actions/RuntimeVariablesActionCreator";
import { RuntimeVariablesStore } from "DistributedTaskControls/Variables/RuntimeVariables/DataStore";

import { DirectionalHint } from "OfficeFabric/ContextualMenu";
import { TooltipHost } from "VSSUI/Tooltip";

import * as Utils_String from "VSS/Utils/String";
/**
 * @brief Controller view for Variables section under Variables tab.
 */
export class RuntimeVariablesControllerView extends VariablesControllerViewBase<Base.IProps, IVariablesState> {

    constructor(props: Base.IProps) {
        super(props);
        this._runTimeVariablesStore = StoreManager.GetStore<RuntimeVariablesStore>(RuntimeVariablesStore);
        this._runTimeVariablesActionCreator = ActionCreatorManager.GetActionCreator<RuntimeVariablesActionCreator>(RuntimeVariablesActionCreator);
    }

    protected _getViewStore(): RuntimeVariablesStore {
        return this._runTimeVariablesStore;
    }

    protected _getActionCreator(): RuntimeVariablesActionCreator {
        return this._runTimeVariablesActionCreator;
    }

    protected _getHeaders(): IFlatViewColumn[] {
        let headers: IFlatViewColumn[] = [];

        // error icon
        headers.push({
            key: VariableColumnKeys.IconColumnKey,
            name: Utils_String.empty,
            minWidth: 20,
            maxWidth: 20
        });

        // name
        headers.push({
            key: VariableColumnKeys.NameColumnKey,
            name: Resources.NameLabel,
            maxWidth: 230
        });

        // delete
        headers.push({
            key: VariableColumnKeys.DeleteColumnKey,
            name: Utils_String.empty,
            minWidth: 32,
            maxWidth: 32
        });

        // value
        headers.push({
            key: VariableColumnKeys.ValueColumnKey,
            name: Resources.ValueLabel,
            maxWidth: 230
        });

        // secret
        headers.push({
            key: VariableColumnKeys.SecretColumnKey,
            name: Utils_String.empty,
            minWidth: 32,
            maxWidth: 32
        });

        return headers;
    }

    /**
     * @brief Returns jsx for list of variables
     */
    protected _getVariableRows(): IFlatViewTableRow[] {
        let variableRows: IFlatViewTableRow[] = [];
        let variablesArray: IVariable[] = this.state.variablesArray;

        // create a map of variable names that contains the count of its occurence. 
        let duplicateVariableNamesMap = this._getViewStore().getDuplicateVariableNamesMap();

        variablesArray.forEach((variable: IVariable, index: number) => {
            let row: IFlatViewTableRow = { cells: {} };

            row.rowAriaLabel = VariablesUtils.getVariableRowAriaLabel(variable);

            let scopedDuplicateVariableNamesMap = duplicateVariableNamesMap[(variable.scope && variable.scope.key) || VariableConstants.DefaultScopeKey];

            // icon column
            row.cells[VariableColumnKeys.IconColumnKey] = this._getIconCellContent(variable, scopedDuplicateVariableNamesMap);

            // name column
            row.cells[VariableColumnKeys.NameColumnKey] = this._getNameCellContent(variable, scopedDuplicateVariableNamesMap);

            // delete column
            row.cells[VariableColumnKeys.DeleteColumnKey] = this._getDeleteCellContent(variable, index);

            // value
            row.cells[VariableColumnKeys.ValueColumnKey] = this._getValueCellContent(variable);

            // secret column
            row.cells[VariableColumnKeys.SecretColumnKey] = this._getSecretCellContent(variable, index);

            variableRows.push(row);
        });

        return variableRows;
    }

    private _getIconCellContent(variable: IVariable, duplicateVariableNamesMap: IDictionaryStringTo<number>): IFlatViewCell {
        let nameValidationState = this._getNameValidationState(variable, duplicateVariableNamesMap);
        let messageIconProps = this._getMessageIconProps(nameValidationState);
        let content: JSX.Element = null;

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

    private _getMessageIconProps(nameValidationState: IValidationState): IMessageIconProps {
        // If error scenario, show the error message with icon
        if (nameValidationState.state === ValidState.Invalid) {
            return {
                iconName: "Error",
                className: "variable-name-validation-error",
                message: nameValidationState.message
            };
        }

        return null;
    }

    private _getNameCellContent(variable: IVariable, duplicateVariableNamesMap: IDictionaryStringTo<number>): IFlatViewCell {
        let validationState = this._getNameValidationState(variable, duplicateVariableNamesMap);

        return {
            cssClass: "dtc-variable-name-cell",
            content: variable.name,
            contentType: ContentType.SimpleText,
            contentHasErrors: validationState.state === ValidState.Invalid,
            isTextDisabled: variable.disableDelete
        } as IFlatViewCell;
    }

    private _getNameValidationState(variable: IVariable, duplicateVariableNamesMap: IDictionaryStringTo<number>) {
        if (!variable.name || variable.name.trim() === Utils_String.empty) {
            return {
                state: ValidState.Invalid,
                message: Resources.VariableNameRequiredMessage
            };
        } // If the variable name is occuring more than once
        else if (duplicateVariableNamesMap[variable.name.trim().toLocaleLowerCase()] > 1) {
            return {
                state: ValidState.Invalid,
                message: Utils_String.format(Resources.VariableNameDuplicateMessageNoScope, variable.name)
            };
        }
        return {
            state: ValidState.Valid,
            message: Utils_String.empty
        };
    }

    private _getDeleteCellContent(variable: IVariable, index: number): IFlatViewCell {
        return {
            content: (
                <FlatViewButton
                    tooltip={VariablesUtils.getDeleteVariableIconAriaLabel(variable)}
                    rowSelected={false}
                    iconProps={{ iconName: "Delete" }}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                        this._runTimeVariablesActionCreator.deleteVariable({
                            index: index,
                            key: variable.name
                        });
                    }}
                    disabled={variable.disableDelete} />
            ),
            contentType: ContentType.JsxElement
        } as IFlatViewCell;
    }

    private _getValueCellContent(variable: IVariable): IFlatViewCell {
        return {
            cssClass: "dtc-variable-value-cell",
            content: variable.value,
            contentType: (!!variable.isSecret) ? ContentType.PasswordText : ContentType.SimpleText,
            payload: variable,
            isTextDisabled: (!!variable.isSecret)
        } as IFlatViewCell;
    }

    private _getSecretCellContent(variable: IVariable, index: number): IFlatViewCell {
        if (!variable.disableSecretConversion) {
            return {
                content: (
                    <FlatViewButton
                        tooltip={!!variable.isSecret ? Resources.UnLockText : Resources.LockText}
                        rowSelected={false}
                        iconProps={{ iconName: !!variable.isSecret ? "Lock" : "Unlock" }}
                        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                            this._runTimeVariablesActionCreator.updateVariableValue({
                                index: index,
                                variable: {
                                    value: variable.value,
                                    isSecret: !(variable.isSecret)
                                }
                            });
                        }}
                        disabled={false} />
                ),
                contentType: ContentType.JsxElement
            } as IFlatViewCell;
        }
        return null;
    }

    protected _isHeaderVisible(): boolean {
        return false;
    }

    protected _getAriaLabel(): string {
        return Resources.ARIALabelVariablesTable;
    }

    private _runTimeVariablesStore: RuntimeVariablesStore;
    private _runTimeVariablesActionCreator: RuntimeVariablesActionCreator;
}

