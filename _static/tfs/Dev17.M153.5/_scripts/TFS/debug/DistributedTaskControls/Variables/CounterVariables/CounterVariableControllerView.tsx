/// <reference types="react" />

import * as React from "react";

import { CounterVariableActionsCreator } from "./Actions/CounterVariableActionsCreator";
import { ICounterVariableItem } from "./Store/CounterVariableDataStore";
import { CounterVariableViewStore } from "./Store/CounterVariableViewStore";
import { ICounterVariable, ICounterVariableReference } from "./Types";
import { CounterVariablesUtils, ICounterVariableValidation } from "./Utils";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import {
    ContentType,
    ICellIndex,
    IFlatViewCell,
    IFlatViewColumn,
    IFlatViewTableRow
} from "DistributedTaskControls/Common/FlatViewTableTypes";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { FlatViewButton } from "DistributedTaskControls/Components/FlatViewButton";
import { FlatViewIcon } from "DistributedTaskControls/Components/FlatViewIcon";
import { VariablesControllerViewBase } from "DistributedTaskControls/Variables/Common/ControllerViewBase";
import { IVariablesState } from "DistributedTaskControls/Variables/Common/DataStoreBase";
import { CounterVariableColumnKeys, VariableConstants } from "DistributedTaskControls/Variables/Common/Constants";
import { VariablesUtils } from "DistributedTaskControls/Variables/Common/VariableUtils";
import { IMessageIconProps } from "DistributedTaskControls/Variables/ProcessVariablesV2/ControllerView";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { ColumnActionsMode, IColumn } from "OfficeFabric/DetailsList";

import * as Utils_String from "VSS/Utils/String";

import { DirectionalHint } from "OfficeFabric/ContextualMenu";
import { TooltipHost } from "VSSUI/Tooltip";

export interface ICounterVariableControllerViewProps extends Base.IProps {
}

export class CounterVariableControllerView extends VariablesControllerViewBase<Base.IProps, IVariablesState> {
    constructor(props: ICounterVariableControllerViewProps) {
        super(props);

        this._cvViewStore = StoreManager.GetStore<CounterVariableViewStore>(CounterVariableViewStore);
        this._cvActionCreator = ActionCreatorManager.GetActionCreator<CounterVariableActionsCreator>(CounterVariableActionsCreator);
    }

    protected _getActionCreator(): CounterVariableActionsCreator {
        return this._cvActionCreator;
    }

    protected _getViewStore(): CounterVariableViewStore {
        return this._cvViewStore;
    }

    protected _getAriaLabel(): string {
        return Resources.ARIALabelVariablesTable;
    }

    protected _onCellValueChanged(newValue: string, cellIndex: ICellIndex): void {
        switch (cellIndex.columnKey) {
            case CounterVariableColumnKeys.Name:
                this._getActionCreator().updateVariableName(cellIndex.rowIndex, newValue);
                break;

            case CounterVariableColumnKeys.Seed:
                this._getActionCreator().updateVariableSeed(cellIndex.rowIndex, newValue);
                break;

            default:
                break;
        }
    }

    protected _getHeaders(): IFlatViewColumn[] {
        return [
            {
                key: CounterVariableColumnKeys.Icon,
                name: Utils_String.empty,
                columnActionsMode: ColumnActionsMode.disabled,
                minWidth: 20,
                maxWidth: 20
            },
            {
                key: CounterVariableColumnKeys.Name,
                name: Resources.NameLabel,
                minWidth: 200,
                maxWidth: 300,
                onColumnClick: this._onColumnClick,
                isSorted: true,
                isSortedDescending: this._getViewStore().getState().isSortedDescending,
                columnActionsMode: ColumnActionsMode.clickable
            },
            {
                key: CounterVariableColumnKeys.Delete,
                name: Utils_String.empty,
                columnActionsMode: ColumnActionsMode.disabled,
                minWidth: 32,
                maxWidth: 32
            },
            {
                key: CounterVariableColumnKeys.Seed,
                name: Resources.SeedLabel,
                minWidth: 60,
                maxWidth: 60,
                columnActionsMode: ColumnActionsMode.disabled
            },
            {
                key: CounterVariableColumnKeys.Value,
                name: Resources.ValueLabel,
                minWidth: 60,
                maxWidth: 60,
                columnActionsMode: ColumnActionsMode.disabled
            },
            {
                key: CounterVariableColumnKeys.Reset,
                name: Utils_String.empty,
                minWidth: 32,
                maxWidth: 32
            }
        ];
    }

    protected _getVariableRows(): IFlatViewTableRow[] {
        const variableNameCounts = this._getViewStore().getVariableNameCounts();

        return [...
            this._getViewStore().getState().items.map((variable: ICounterVariableItem, idx: number) => {
                const nameValidation = CounterVariablesUtils.validateName(variable, variableNameCounts);
                const seedValidation = CounterVariablesUtils.validateSeed(variable.counter);

                return {
                    rowAriaLabel: VariablesUtils.getVariableRowAriaLabel(variable.name),
                    cells: {
                        [CounterVariableColumnKeys.Icon]: this._getIconCell(nameValidation, seedValidation),
                        [CounterVariableColumnKeys.Name]: this._getNameCell(variable, nameValidation),
                        [CounterVariableColumnKeys.Delete]: this._getDeleteCell(variable, idx),
                        [CounterVariableColumnKeys.Seed]: this._getSeedCell(variable, seedValidation),
                        [CounterVariableColumnKeys.Value]: this._getValueCell(variable),
                        [CounterVariableColumnKeys.Reset]: this._getResetCell(variable, idx)
                    }
                } as IFlatViewTableRow;
            })];
    }

    private _getIconCell(nameValidation: ICounterVariableValidation, seedValidation: ICounterVariableValidation): IFlatViewCell {
        let content: JSX.Element;

        const iconProps = this._getIconProps(nameValidation, seedValidation);

        if (iconProps) {
            content = (
                <TooltipHost content={iconProps.message} directionalHint={DirectionalHint.bottomCenter}>
                    <FlatViewIcon ariaLiveRegionMessage={iconProps.message} rowSelected={false} iconName={iconProps.iconName} className={iconProps.className} />
                </TooltipHost>
            );
        }

        return {
            content: content,
            contentType: ContentType.JsxElement
        };
    }

    private _getIconProps(nameValidation: ICounterVariableValidation, seedValidation: ICounterVariableValidation): IMessageIconProps {
        let message: string;

        if (nameValidation) {
            message = nameValidation.message;
        } else if (seedValidation) {
            message = seedValidation.message;
        }

        if (message !== Utils_String.empty) {
            return {
                iconName: "Error",
                className: "dtc-variable-validation-error",
                message: message
            };
        }

        return null;
    }

    private _getNameCell(variable: ICounterVariableReference, nameValidation: ICounterVariableValidation): IFlatViewCell {
        return {
            cssClass: "dtc-variable-name-cell",
            content: variable.name,
            contentType: ContentType.SimpleText,
            contentHasErrors: nameValidation.hasError,
            placeHolder: Resources.VariableNamePlaceHolder
        };
    }

    private _getDeleteCell(variable: ICounterVariableReference, index: number): IFlatViewCell {
        const label = (!!variable.name || variable.name === Utils_String.empty) ?
            Resources.DeleteVariableTitleTextNoName :
            Utils_String.format(Resources.DeleteVariableTitleText, variable.name);

        return {
            content: (
                <FlatViewButton
                    tooltip={label}
                    rowSelected={false}
                    iconProps={{ iconName: "Delete" }}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                        this._getActionCreator().deleteVariable({
                            index: index,
                            key: variable.name
                        });
                    }}
                    disabled={false} />
            ),
            contentType: ContentType.JsxElement
        } as IFlatViewCell;
    }

    private _getSeedCell(variable: ICounterVariableReference, seedValidation: ICounterVariableValidation): IFlatViewCell {
        return {
            cssClass: "dtc-variable-value-cell",
            content: variable.counter.seed,
            contentType: ContentType.SimpleText,
            contentHasErrors: seedValidation.hasError,
            ariaLabel: Utils_String.format(Resources.CounterVariableSeedLabel, variable.name)
        };
    }

    private _getValueCell(variable: ICounterVariableReference): IFlatViewCell {
        return {
            cssClass: "dtc-variable-value-cell",
            content: variable.counter.value,
            contentType: ContentType.SimpleText,
            isTextDisabled: true,
            ariaLabel: Utils_String.format(Resources.CounterVariableValueLabel, variable.name)
        };
    }

    private _getResetCell(variable: ICounterVariableReference, index: number): IFlatViewCell {
        return {
            content: (
                <FlatViewButton
                    tooltip={Resources.ResetCounterVariableValue}
                    rowSelected={false}
                    iconProps={{ iconName: "Refresh" }}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                        this._getActionCreator().resetVariableValue(index);
                    }}
                    disabled={variable.counter.seed === variable.counter.value} />
            ),
            contentType: ContentType.JsxElement
        };
    }

    private _onColumnClick = (event?: React.MouseEvent<HTMLElement>, column?: IColumn) =>
        this._getActionCreator().sort({ columnKey: column.key, isSortedDescending: !column.isSortedDescending })

    private _cvViewStore: CounterVariableViewStore;
    private _cvActionCreator: CounterVariableActionsCreator;
}
