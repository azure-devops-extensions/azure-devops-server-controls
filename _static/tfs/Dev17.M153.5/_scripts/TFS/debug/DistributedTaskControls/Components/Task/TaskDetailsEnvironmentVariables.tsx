/// <reference types="react" />

import * as React from "react";

import * as Common from "DistributedTaskControls/Common/Common";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { TaskActionCreator } from "DistributedTaskControls/Components/Task/TaskActionsCreator";
import { TaskStore, IEnvironmentVariableData } from "DistributedTaskControls/Components/Task/TaskStore";
import { EnvironmentVariableConstants } from "DistributedTaskControls/Common/Common";
import { FlatViewButton } from "DistributedTaskControls/Components/FlatViewButton";
import { FlatViewIcon } from "DistributedTaskControls/Components/FlatViewIcon";
import { FlatViewTableWithAddButton } from "DistributedTaskControls/Components/FlatViewTableWithAddButton";
import { IFlatViewCell, IFlatViewTableRow, ICellIndex, ContentType, IFlatViewColumn } from "DistributedTaskControls/Common/FlatViewTableTypes";
import { IMessageIconProps } from "DistributedTaskControls/Variables/ProcessVariablesV2/ControllerView";
import { ValidState } from "DistributedTaskControls/Variables/ProcessVariablesV2/ValidationHelper";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { Accordion } from "DistributedTaskControls/SharedControls/Accordion/Accordion";

import { ITask } from "DistributedTasksCommon/TFS.Tasks.Types";

import { autobind } from "OfficeFabric/Utilities";
import * as DetailsListProps from "OfficeFabric/components/DetailsList/DetailsList.types";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { TooltipHost } from "VSSUI/Tooltip";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/Task/TaskDetailsEnvironmentVariables";
import { NumberValidator } from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Utils";

export interface ITaskDetailsEnvironmentVariablesProps extends ComponentBase.IProps {
    controllerInstanceId: string;
    isSectionAutoCollapsed: boolean;
}

export interface ITaskDetailsEnvironmentVariablesState extends ComponentBase.IState {
    environmentVariables: IEnvironmentVariableData[];
}

export class TaskDetailsEnvironmentVariables extends ComponentBase.Component<ITaskDetailsEnvironmentVariablesProps, ITaskDetailsEnvironmentVariablesState>{

    constructor(props: ITaskDetailsEnvironmentVariablesProps) {
        super(props);

        this._actionCreator = ActionCreatorManager.GetActionCreator<TaskActionCreator>(TaskActionCreator, this.props.controllerInstanceId);
        this._store = StoreManager.GetStore<TaskStore>(TaskStore, this.props.controllerInstanceId);

        this.state = {
            environmentVariables: this._store.getEnvironmentVariableState()
        } as ITaskDetailsEnvironmentVariablesState;
    }

    public componentDidMount(): void {
        this._store.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        let headerClass: string = "flatview-header";
        let headers: IFlatViewColumn[] = [];

        // error icon
        headers.push({
            key: EnvironmentVariableConstants.iconColumnKey,
            name: Resources.EnvironmentVariableErrorMessageColumnHeader,
            isIconOnly: true,
            columnActionsMode: DetailsListProps.ColumnActionsMode.disabled,
            isFixedColumn: true,
            minWidth: 20,
            maxWidth: 20
        });

        // name
        headers.push({
            key: EnvironmentVariableConstants.nameColumnKey,
            name: Resources.NameLabel,
            isFixedColumn: true,
            headerClassName: headerClass,
            columnActionsMode: DetailsListProps.ColumnActionsMode.disabled
        });

        // delete
        headers.push({
            key: EnvironmentVariableConstants.deleteColumnKey,
            name: Resources.DeleteEnvironmentVariableColumnHeader,
            isIconOnly: true,
            columnActionsMode: DetailsListProps.ColumnActionsMode.disabled,
            isFixedColumn: true,
            minWidth: 32,
            maxWidth: 32
        });

        // value
        headers.push({
            key: EnvironmentVariableConstants.valueColumnKey,
            name: Resources.ValueLabel,
            isFixedColumn: true,
            headerClassName: headerClass,
            columnActionsMode: DetailsListProps.ColumnActionsMode.disabled
        });

        return (
            <div className="fabric-style-overrides task-details-environment-variables">
                <Accordion
                    label={Resources.EnvironmentVariablesHeader}
                    initiallyExpanded={!this.props.isSectionAutoCollapsed}
                    headingLevel={2}
                    addSeparator={false}
                    addSectionHeaderLine={true}>
                    <FlatViewTableWithAddButton
                        containerClass="task-details-environment-variables"
                        flatViewContainerClass="environment-variables-list"
                        isHeaderVisible={true}
                        headers={headers}
                        rows={this._getEnvironmentVariableRows()}
                        onCellValueChanged={this._onCellValueChanged}
                        onAdd={this._onAddEnvironmentVariableClick}
                        addButtonClass="fabric-style-overrides add-new-item-button add-new-environment-variable-button"
                        addButtonDescription={Resources.AddEnvironmentVariableDescription}
                        ariaLabel={Resources.ARIALabelEnvironmentVariablesTable}
                        setFocusOnRender={false}
                        focusSelectorOnAddRow={".dtc-environment-variable-name-cell .flat-view-text-input-read-only"}
                        disabled={false}/>
                </Accordion>
            </div>
        );
    }

    @autobind
    private _onAddEnvironmentVariableClick(event: React.MouseEvent<HTMLButtonElement>): void {
        this._actionCreator.addTaskEnvironmentVariable();
        DtcUtils.scrollElementToView(event.currentTarget);
    }

    private _getEnvironmentVariableRows = (): IFlatViewTableRow[]  => {
        return EnvironmentVariableUtils.getRowData(this.state.environmentVariables, this._store, this._actionCreator);
    }

    private _onCellValueChanged = (newValue: string, cellIndex: ICellIndex): void => {
        switch (cellIndex.columnKey) {
            case EnvironmentVariableConstants.nameColumnKey:
                this._actionCreator.updateTaskEnvironmentVariableName(cellIndex.rowIndex, newValue);
                break;
            case EnvironmentVariableConstants.valueColumnKey:
                this._actionCreator.updateTaskEnvironmentVariableValue(cellIndex.rowIndex, newValue);
                break;
            default:
                break;
        }
    }

    private _onChange = (): void => {
        this.setState({
            environmentVariables: this._store.getEnvironmentVariableState()
        } as ITaskDetailsEnvironmentVariablesState);
    }

    private _actionCreator: TaskActionCreator;
    private _store: TaskStore;
}

export class EnvironmentVariableUtils {

    public static getRowData(environmentVariables: IEnvironmentVariableData[], store: TaskStore, actionCreator: TaskActionCreator): IFlatViewTableRow[] {
        let envVarRows: IFlatViewTableRow[] = [];

        (environmentVariables || []).forEach((environmentVariable: IEnvironmentVariableData, index: number) => {
            let row: IFlatViewTableRow = { cells: {} };
            row.rowAriaLabel = this._getRowAriaLabel(environmentVariable);

            // icon column
            row.cells[EnvironmentVariableConstants.iconColumnKey] = this._getIconCellContent(environmentVariable, store);

            // name column
            row.cells[EnvironmentVariableConstants.nameColumnKey] = this._getNameCellContent(environmentVariable, store);

            // delete column
            row.cells[EnvironmentVariableConstants.deleteColumnKey] = this._getDeleteCellContent(environmentVariable, actionCreator, index);

            // value column
            row.cells[EnvironmentVariableConstants.valueColumnKey] = this._getValueCellContent(environmentVariable, store);

            envVarRows.push(row);
        });

        return envVarRows;
    }

    private static _getIconCellContent(environmentVariable: IEnvironmentVariableData, store: TaskStore): IFlatViewCell {
        let messageIconProps = this._getMessageIconProps(environmentVariable, store);
        let content: JSX.Element = null;

        if (messageIconProps) {
            const { message, iconName, className } = messageIconProps;
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

    private static _getMessageIconProps(environmentVariable: IEnvironmentVariableData, store: TaskStore): IMessageIconProps {
        let fieldValidationState = this._getFieldValidationState(environmentVariable, store);

        // If error scenario, show the error message with icon
        if (fieldValidationState.state === ValidState.Invalid) {
            return {
                iconName: "Error",
                className: "environment-variable-validation-error",
                message: fieldValidationState.message
            };
        }

        return null;
    }

    private static _getFieldValidationState(environmentVariable: IEnvironmentVariableData, store: TaskStore) {
        let envVarNameErrorMessage: string = store.getEnvironmentVariableNameInvalidErrorMessage(environmentVariable.name);
        let envVarValueErrorMessage: string = store.getEnvironmentVariableValueInvalidErrorMessage(environmentVariable.value);

        if ((!!envVarNameErrorMessage) || (!!envVarValueErrorMessage)) {
            return {
                state: ValidState.Invalid,
                message: !!envVarNameErrorMessage ? envVarNameErrorMessage : envVarValueErrorMessage
            };
        }

        return {
            state: ValidState.Valid,
            message: Utils_String.empty
        };
    }

    private static _getNameCellContent(environmentVariable: IEnvironmentVariableData, store: TaskStore): IFlatViewCell {
        return {
            cssClass: "dtc-environment-variable-name-cell",
            content: environmentVariable.name,
            isTextDisabled: false,
            contentType: ContentType.SimpleText,
            contentHasErrors: !!store.getEnvironmentVariableNameInvalidErrorMessage(environmentVariable.name)
        } as IFlatViewCell;
    }

    private static _getDeleteCellContent(environmentVariable: IEnvironmentVariableData, actionCreator: TaskActionCreator, index: number): IFlatViewCell {
        return {
            content: (
                <FlatViewButton
                    tooltip={this._getDeleteIconAriaLabel(environmentVariable)}
                    rowSelected={false}
                    iconProps={{ iconName: "Delete" }}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                        actionCreator.deleteTaskEnvironmentVariable(index, environmentVariable.name);
                    }}
                    disabled={false} />
            ),
            contentType: ContentType.JsxElement
        } as IFlatViewCell;
    }

    private static _getDeleteIconAriaLabel(environmentVariable: IEnvironmentVariableData): string {
        let environmentVariableName: string = !!environmentVariable.name ? environmentVariable.name.trim() : Utils_String.empty;
        return (environmentVariableName ?
            Utils_String.format(Resources.DeleteEnvironmentVariableTooltip, environmentVariableName) :
            Resources.DeleteEmptyEnvironmentVariableTooltip);
    }

    private static _getValueCellContent(environmentVariable: IEnvironmentVariableData, store: TaskStore): IFlatViewCell {
        return {
            cssClass: "dtc-environment-variable-value-cell",
            content: environmentVariable.value,
            isTextDisabled: false,
            contentHasErrors: !!store.getEnvironmentVariableValueInvalidErrorMessage(environmentVariable.value),
            contentType: ContentType.SimpleText
        } as IFlatViewCell;
    }

    private static _getRowAriaLabel(environmentVariable: IEnvironmentVariableData): string {
        if (!!environmentVariable.name && environmentVariable.name.trim() !== Utils_String.empty) {
            return Utils_String.format(Resources.EnvironmentVariableRowAriaLabel, environmentVariable.name);
        }

        return Resources.EmptyEnvironmentVariableRowAriaLabel;
    }
}
