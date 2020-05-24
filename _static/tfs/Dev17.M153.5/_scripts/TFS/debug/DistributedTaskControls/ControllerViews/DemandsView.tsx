/// <reference types="react" />

import * as React from "react";

import { DemandsActionsCreator } from "DistributedTaskControls/Actions/DemandsActionCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { DemandCondition, DemandConstants } from "DistributedTaskControls/Common/Common";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { ContentType, ICellIndex, IFlatViewCell, IFlatViewTableRow } from "DistributedTaskControls/Common/FlatViewTableTypes";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Demands } from "DistributedTaskControls/Components/Demands";
import { FlatViewButton } from "DistributedTaskControls/Components/FlatViewButton";
import { FlatViewDropdown } from "DistributedTaskControls/Components/FlatViewDropdown";
import { FlatViewIcon } from "DistributedTaskControls/Components/FlatViewIcon";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { DemandsStore, IDemandData, IDemandsState } from "DistributedTaskControls/Stores/DemandsStore";
import { IMessageIconProps } from "DistributedTaskControls/Variables/ProcessVariablesV2/ControllerView";
import { ValidState } from "DistributedTaskControls/Variables/ProcessVariablesV2/ValidationHelper";

import { DirectionalHint } from "OfficeFabric/ContextualMenu";
import { TooltipHost } from "VSSUI/Tooltip";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/ControllerViews/DemandsView";

export interface IProps extends Base.IProps {
    showHeader?: boolean;
    nameMaxWidth?: number;
    conditionMaxWidth?: number;
    valueMaxWidth?: number;
    isReadOnly?: boolean;
}

export class DemandsView extends Base.Component<IProps, IDemandsState> {

    constructor(props: IProps) {
        super(props);
        this._store = StoreManager.GetStore<DemandsStore>(DemandsStore, this.props.instanceId);
        this._actionCreator = ActionCreatorManager.GetActionCreator<DemandsActionsCreator>(DemandsActionsCreator, this.props.instanceId);
        this.state = this._store.getState();
    }

    public componentDidMount() {
        this._store.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        return <Demands
            showHeader={this.props.showHeader}
            nameMaxWidth={this.props.nameMaxWidth}
            conditionMaxWidth={this.props.conditionMaxWidth}
            valueMaxWidth={this.props.valueMaxWidth}
            rows={this._getDemandsRows()}
            onCellValueChanged={this._onCellValueChanged}
            onAddDemandClick={this._onAddDemandClick}
            focusSelectorOnAddRow={".dtc-demand-name-cell .flat-view-text-input-read-only"}
            disabled={!!this.props.isReadOnly}
        />;
    }

    private _onAddDemandClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
        this._actionCreator.addDemand();
    }

    private _onCellValueChanged = (newValue: string, cellIndex: ICellIndex): void => {
        switch (cellIndex.columnKey) {
            case DemandConstants.nameColumnKey:
                this._actionCreator.updateDemandKey(cellIndex.rowIndex, newValue);
                break;
            case DemandConstants.valueColumnKey:
                this._actionCreator.updateDemandValue(cellIndex.rowIndex, newValue);
                break;
            default:
                break;
        }
    }

    protected _getDemandsRows(): IFlatViewTableRow[] {
        return DemandsViewUtils.getRowData(this.state.demands, this._store, this._actionCreator, this.props.isReadOnly);
    }

    private _onChange = () => {
        this.setState(this._store.getState());
    }
    private _store: DemandsStore;
    private _actionCreator: DemandsActionsCreator;
}

export class DemandsViewUtils {

    public static getRowData(demands: IDemandData[], store: DemandsStore, actionCreator: DemandsActionsCreator, isReadOnly: boolean = false): IFlatViewTableRow[] {
        let demandRows: IFlatViewTableRow[] = [];

        if (demands && demands.length > 0) {
            demands.forEach((demand: IDemandData, index: number) => {
                let row: IFlatViewTableRow = { cells: {} };
                row.rowAriaLabel = DemandsViewUtils._getDemandsRowAriaLabel(demand);

                // icon column
                row.cells[DemandConstants.iconColumnKey] = this._getIconCellContent(demand, store);

                // name column
                row.cells[DemandConstants.nameColumnKey] = this._getNameCellContent(demand, store, index, isReadOnly);

                // delete column
                row.cells[DemandConstants.deleteColumnKey] = this._getDeleteCellContent(demand, actionCreator, index, isReadOnly);

                // condition column
                row.cells[DemandConstants.conditionColumnKey] = this._getConditionCellContent(demand, actionCreator, index, isReadOnly);

                // value column
                row.cells[DemandConstants.valueColumnKey] = this._getValueCellContent(demand, store, isReadOnly);

                demandRows.push(row);
            });
        }

        return demandRows;
    }

    private static _getIconCellContent(demand: IDemandData, store: DemandsStore): IFlatViewCell {
        let messageIconProps = this._getMessageIconProps(demand, store);
        let content: JSX.Element = null;

        if (messageIconProps) {
            let { message, iconName, className } = messageIconProps;
            content = (
                <TooltipHost content={message} directionalHint={DirectionalHint.bottomCenter} >
                    <FlatViewIcon ariaLiveRegionMessage={message} rowSelected={true} iconName={iconName} className={className} />
                </TooltipHost>
            );
        }

        return {
            content: content,
            contentType: ContentType.JsxElement
        } as IFlatViewCell;
    }

    private static _getMessageIconProps(demand: IDemandData, store: DemandsStore): IMessageIconProps {
        let fieldValidationState = this._getFieldValidationState(demand, store);

        // If error scenario, show the error message with icon
        if (fieldValidationState.state === ValidState.Invalid) {
            return {
                iconName: "Error",
                className: "demands-validation-error",
                message: fieldValidationState.message
            };
        }

        return null;
    }

    private static _getFieldValidationState(demand: IDemandData, store: DemandsStore) {
        let demandNameErrorMessage: string = store.getDemandNameInvalidErrorMessage(demand);

        if (!!demandNameErrorMessage) {
            return {
                state: ValidState.Invalid,
                message: demandNameErrorMessage
            };
        }
        else if (demand.condition === DemandCondition.Equals && store.isDemandValueInvalid(demand.value)) {
            return {
                state: ValidState.Invalid,
                message: Resources.DemandValueEmptyErrorTooltip
            };
        }
        return {
            state: ValidState.Valid,
            message: Utils_String.empty
        };
    }

    private static _getNameCellContent(demand: IDemandData, store: DemandsStore, index: number, isReadOnly: boolean): IFlatViewCell {
        return {
            cssClass: "dtc-demand-name-cell",
            content: demand.name,
            isTextDisabled: isReadOnly,
            contentType: ContentType.SimpleText,
            contentHasErrors: store.isDemandNameInvalid(demand)
        } as IFlatViewCell;
    }

    private static _getDeleteCellContent(demand: IDemandData, actionCreator: DemandsActionsCreator, index: number, isReadOnly: boolean): IFlatViewCell {
        return {
            content: (
                <FlatViewButton
                    tooltip={this._getDeleteDemandIconAriaLabel(demand)}
                    rowSelected={false}
                    iconProps={{ iconName: "Delete" }}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                        actionCreator.deleteDemand(index, demand.name);
                    }}
                    disabled={isReadOnly} />
            ),
            contentType: ContentType.JsxElement
        } as IFlatViewCell;
    }

    private static _getDeleteDemandIconAriaLabel(demand: IDemandData): string {
        let demandName: string = !!demand.name ? demand.name.trim() : Utils_String.empty;
        return (demandName ?
            Utils_String.format(Resources.DeleteDemandTooltip, demandName) :
            Resources.DeleteEmptyDemandTooltip);
    }

    private static _getConditionCellContent(demand: IDemandData, actionCreator: DemandsActionsCreator, index: number, isReadOnly: boolean): IFlatViewCell {
        return {
            content: (
                <FlatViewDropdown
                    isDisabled={isReadOnly}
                    conditions={this._getConditions()}
                    selectedCondition={this._getResourceFromDemandCondition(demand.condition)}
                    rowSelected={false}
                    onValueChanged={(newValue: string) => {
                        actionCreator.updateDemandCondition(index, this._getDemandConditionFromResource(newValue));
                    }} />
            ),
            contentType: ContentType.JsxElement,
            ariaLabel: this._getResourceFromDemandCondition(demand.condition)
        } as IFlatViewCell;
    }

    private static _getValueCellContent(demand: IDemandData, store: DemandsStore, isReadOnly: boolean): IFlatViewCell {
        return {
            cssClass: "dtc-demand-value-cell",
            content: (demand.condition === DemandCondition.Exists) ? null : demand.value,
            isTextDisabled: isReadOnly,
            contentHasErrors: store.isDemandValueInvalid(demand.value),
            contentType: (demand.condition === DemandCondition.Exists) ? ContentType.JsxElement : ContentType.SimpleText
        } as IFlatViewCell;
    }

    private static _getConditions(): string[] {
        let options: string[] = [];
        options.push(Resources.DemandEquals);
        options.push(Resources.DemandExists);
        return options;
    }

    static _getResourceFromDemandCondition(demandCondition: string): string {
        switch (demandCondition) {
            case DemandCondition.Equals:
                return Resources.DemandEquals;
            case DemandCondition.Exists:
                return Resources.DemandExists;
            default:
                return null;
        }
    }

    static _getDemandConditionFromResource(demandCondition: string): string {
        if ((Utils_String.localeIgnoreCaseComparer(demandCondition, Resources.DemandEquals) === 0)) {
            return DemandCondition.Equals;
        }
        else if ((Utils_String.localeIgnoreCaseComparer(demandCondition, Resources.DemandExists) === 0)) {
            return DemandCondition.Exists;
        }
    }

    private static _getDemandsRowAriaLabel(demand: IDemandData): string {
        if (demand) {
            if (!!demand.name && demand.name !== Utils_String.empty) {
                return Utils_String.format(Resources.DemandRowAriaLabel, demand.name);
            }
        }
        return Resources.EmptyDemandRowAriaLabel;
    }
}