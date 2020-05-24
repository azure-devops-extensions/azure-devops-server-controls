/// <reference types="react" />

import * as React from "react";

import { BuildConstants } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { OptionsUtilities } from "CIWorkflow/Scripts/Common/OptionsUtilities";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { BuildOptionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildOptionActionsCreator";
import { AutoLinkWorkItemsBranchFilterComponent } from "CIWorkflow/Scripts/Scenarios/Definition/Components/AutoLinkWorkItemsBranchFilterComponent";
import { BuildOptionStore, IAdditionalWIFieldsData, IAdditionalWIFieldsState } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/BuildOptionStore";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Common from "DistributedTaskControls/Common/Common";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { IFlatViewCell, IFlatViewTableRow, ICellIndex, ContentType, IFlatViewColumn } from "DistributedTaskControls/Common/FlatViewTableTypes";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import { FlatViewButton } from "DistributedTaskControls/Components/FlatViewButton";
import { FlatViewIcon } from "DistributedTaskControls/Components/FlatViewIcon";
import { FlatViewTableWithAddButton } from "DistributedTaskControls/Components/FlatViewTableWithAddButton";
import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import { TaskInput } from "DistributedTaskControls/Components/Task/TaskInput";
import { ProcessManagementCapabilities } from "DistributedTaskControls/ProcessManagement/Types";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { IMessageIconProps } from "DistributedTaskControls/Variables/ProcessVariablesV2/ControllerView";
import { ValidState } from "DistributedTaskControls/Variables/ProcessVariablesV2/ValidationHelper";

import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import * as DetailsListProps from "OfficeFabric/components/DetailsList/DetailsList.types";
import { Label } from "OfficeFabric/Label";
import { List } from "OfficeFabric/components/List/List";
import { TooltipHost } from "VSSUI/Tooltip";

import { BuildOptionInputDefinition, BuildOptionDefinition, BuildOptionInputType, BuildOption } from "TFS/Build/Contracts";
import { TaskInputDefinitionBase as TaskInputDefinition } from "TFS/DistributedTaskCommon/Contracts";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/BuildOptionView";

export namespace BuildOptionViewColumnKeys {
    export const deleteColumnKey: string = "delete";
    export const iconColumnKey: string = "icon";
    export const nameColumnKey: string = "name";
    export const valueColumnKey: string = "value";
}

export interface IBuildOptionViewProps extends Base.IProps {
    buildOptionDefinition: BuildOptionDefinition;
    buildOption: BuildOption;
    isReadOnly?: boolean;
}

export class BuildOptionView extends Base.Component<IBuildOptionViewProps, IAdditionalWIFieldsState> {
    private _actionCreator: BuildOptionActionsCreator;
    private _store: BuildOptionStore;

    public componentWillMount(): void {
        this._actionCreator = ActionCreatorManager.GetActionCreator<BuildOptionActionsCreator>(BuildOptionActionsCreator, this.props.buildOption.definition.id);
        this._store = StoreManager.GetStore<BuildOptionStore>(BuildOptionStore, this.props.buildOption.definition.id);
        this.setState(this._store.getAdditionalWIFieldsState());

        this._store.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {

        return (
            <div className="build-option-view constrained-width">
                <div className="build-option-content">
                    <div className="build-option-fields">
                        <List
                            className="build-option-inputs"
                            items={this._getInputsList()}
                            onRenderCell={this._getInputComponent.bind(this)} />
                    </div>
                    {this._getAdditionalInputsListElement()}
                </div>
            </div>
        );
    }

    private _getInputsList(): BuildOptionInputDefinition[] {
        return this.props.buildOptionDefinition.inputs.filter((buildOptionInputDefinition: BuildOptionInputDefinition) => {
            return buildOptionInputDefinition.name !== BuildConstants.BuildOptionAdditionalFieldsName;
        });
    }

    private _getAdditionalInputsListElement(): JSX.Element {
        let additionalInputsElement: JSX.Element = null;
        let headerClass: string = "flatview-header";

        let additionalInput = this.props.buildOptionDefinition.inputs.filter((buildOptionInputDefinition: BuildOptionInputDefinition) => {
            return buildOptionInputDefinition.name === BuildConstants.BuildOptionAdditionalFieldsName;
        })[0];

        if (additionalInput) {
            let additionalWIFieldsHelpMarkDown = additionalInput.help ? additionalInput.help["markdown"] || Utils_String.empty : Utils_String.empty;
            let calloutContent: ICalloutContentProps = {
                calloutMarkdown: additionalWIFieldsHelpMarkDown
            };

            let headers: IFlatViewColumn[] = [];
            // Making the columns un-resizable so that unnecessary scrolls can be avoided.

            // error icon
            headers.push({
                key: BuildOptionViewColumnKeys.iconColumnKey,
                name: Utils_String.empty,
                columnActionsMode: DetailsListProps.ColumnActionsMode.disabled,
                isFixedColumn: true,
                minWidth: 20,
                maxWidth: 20
            });

            // field
            headers.push({
                key: BuildOptionViewColumnKeys.nameColumnKey,
                name: Resources.FieldLabel,
                isFixedColumn: true,
                headerClassName: headerClass,
                columnActionsMode: DetailsListProps.ColumnActionsMode.disabled
            });

            // delete
            headers.push({
                key: BuildOptionViewColumnKeys.deleteColumnKey,
                name: Utils_String.empty,
                columnActionsMode: DetailsListProps.ColumnActionsMode.disabled,
                isFixedColumn: true,
                minWidth: 32,
                maxWidth: 32
            });

            // value
            headers.push({
                key: BuildOptionViewColumnKeys.valueColumnKey,
                name: Resources.ValueLabel,
                isFixedColumn: true,
                headerClassName: headerClass,
                columnActionsMode: DetailsListProps.ColumnActionsMode.disabled
            });

            additionalInputsElement =
                (<div className="build-option-additional-wi-fields">
                    <Label className="additional-wi-fields-label">
                        {additionalInput.label}
                        <InfoButton cssClass="additional-wi-fields-info"
                            calloutContent={calloutContent}
                            iconStyle="additional-wi-fields-info-icon" />
                    </Label>
                    <FlatViewTableWithAddButton
                        flatViewContainerClass="additional-wi-fields-list"
                        headers={headers}
                        rows={this._getWIFieldsRows()}
                        onCellValueChanged={this._onCellValueChanged}
                        onAdd={this._onAddWIFieldClick}
                        setFocusOnRender={false}
                        addButtonDescription={Resources.AddWorkItemNewFieldDescription}
                        addButtonClass="fabric-style-overrides add-new-item-button add-new-wi-field-button"
                        disabled={!!this.props.isReadOnly} />
                </div>);
        }
        return additionalInputsElement;
    }

    private _getInputComponent(buildOptionInputDefinition: BuildOptionInputDefinition): JSX.Element {
        let inputComponent: JSX.Element;
        const inputDefinition = this._convertToTaskInputDefinition(buildOptionInputDefinition);

        const inputType = DtcUtils.getTaskInputType(inputDefinition);

        if (inputType === Common.INPUT_TYPE_BRANCHFILTER) {
            // This is separated as this is not present as part of shared control
            inputComponent = <AutoLinkWorkItemsBranchFilterComponent
                branchFilters={this._store.getTaskInputState(inputDefinition.name).inputValue}
                label={inputDefinition.label}
                defaultBranch={inputDefinition.defaultValue}
                disabled={!!this.props.isReadOnly}
                onChange={(stringifiedFilters: string) => {
                    this._actionCreator.updateInputAction.invoke({
                        name: inputDefinition.name,
                        value: stringifiedFilters
                    });
                }} />;
        }
        else {
            // The control factory will handle the switch case by itself.
            // Requiring "EditTaskInputs" since that's the closest capability available
            inputComponent = (<TaskInput key={inputDefinition.name}
                taskInstanceId={this.props.buildOption.definition.id}
                inputDefinition={inputDefinition}
                controllerStore={this._store}
                controllerActions={this._actionCreator}
                skipCapabilityCheck={false}
                requiredEditCapability={ProcessManagementCapabilities.EditTaskInputs} />);
        }

        return inputComponent;
    }

    private _convertToTaskInputDefinition(buildOptionInputDefinition: BuildOptionInputDefinition): TaskInputDefinition {
        // TODO: pradeepn: This is the only place where extend takes more than 2 arguments. 
        // Review the usage before replacing with JQueryWrapper
        return $.extend({}, buildOptionInputDefinition, {
            type: (typeof buildOptionInputDefinition.type === "string") ?
                buildOptionInputDefinition.type :
                OptionsUtilities.convertBuildOptionInputTypeToString(buildOptionInputDefinition.type),
            helpMarkDown: buildOptionInputDefinition.help ? buildOptionInputDefinition.help["markdown"] || Utils_String.empty : Utils_String.empty
        });
    }

    private _onAddWIFieldClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        this._actionCreator.addWIField();
        DtcUtils.scrollElementToView(event.currentTarget);
    }

    private _getWIFieldsRows(): IFlatViewTableRow[] {
        let workItemFieldRows: IFlatViewTableRow[] = [];
        let workItemFields: IAdditionalWIFieldsData[] = this.state.additionalWIFields;

        workItemFields.forEach((workItemField: IAdditionalWIFieldsData, index: number) => {
            let row: IFlatViewTableRow = { cells: {} };

            // icon column
            row.cells[BuildOptionViewColumnKeys.iconColumnKey] = this._getIconCellContent(workItemField);

            // field column
            row.cells[BuildOptionViewColumnKeys.nameColumnKey] = this._getNameCellContent(workItemField);

            // delete column
            row.cells[BuildOptionViewColumnKeys.deleteColumnKey] = this._getDeleteCellContent(workItemField, index);

            // value column
            row.cells[BuildOptionViewColumnKeys.valueColumnKey] = this._getValueCellContent(workItemField);

            workItemFieldRows.push(row);
        });

        return workItemFieldRows;
    }

    private _getIconCellContent(workItemField: IAdditionalWIFieldsData): IFlatViewCell {
        let messageIconProps = this._getMessageIconProps(workItemField);
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

    private _getMessageIconProps(workItemField: IAdditionalWIFieldsData): IMessageIconProps {
        let fieldValidationState = this._getFieldValidationState(workItemField);

        // If error scenario, show the error message with icon
        if (fieldValidationState.state === ValidState.Invalid) {
            return {
                iconName: "Error",
                className: "work-item-field-validation-error",
                message: fieldValidationState.message
            };
        }

        return null;
    }

    private _getFieldValidationState(workItemField: IAdditionalWIFieldsData) {
        let workItemFieldName: string = workItemField.name.trim();

        if (workItemFieldName === Utils_String.empty) {
            return {
                state: ValidState.Invalid,
                message: Resources.WorkItemFieldEmptyErrorIconTooltip
            };
        }
        else if (/\s/g.test(workItemFieldName)) {
            return {
                state: ValidState.Invalid,
                message: Resources.WorkItemFieldSpacesErrorIconTooltip
            };
        }
        return {
            state: ValidState.Valid,
            message: Utils_String.empty
        };
    }

    private _getNameCellContent(workItemField: IAdditionalWIFieldsData): IFlatViewCell {
        let workItemFieldName: string = workItemField.name.trim();
        return {
            content: workItemField.name,
            contentType: ContentType.SimpleText,
            contentHasErrors: /\s/g.test(workItemFieldName) || workItemFieldName === Utils_String.empty
        } as IFlatViewCell;
    }

    private _getDeleteCellContent(workItemField: IAdditionalWIFieldsData, index: number): IFlatViewCell {
        return {
            content: (
                <FlatViewButton
                    tooltip={this._getDeleteWorkItemFieldIconAriaLabel(workItemField)}
                    rowSelected={false}
                    iconProps={{ iconName: "Delete" }}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                        this._actionCreator.deleteWIField(index, workItemField.name);
                    }}
                    disabled={false} />
            ),
            contentType: ContentType.JsxElement
        } as IFlatViewCell;
    }

    private _getDeleteWorkItemFieldIconAriaLabel(workItemField: IAdditionalWIFieldsData): string {
        return (!!workItemField.name) ?
            Utils_String.format(Resources.DeleteWorkItemFieldTooltip, workItemField.name) :
            Resources.DeleteWorkItemEmptyFieldTooltip;
    }

    private _getValueCellContent(workItemField: IAdditionalWIFieldsData): IFlatViewCell {
        return {
            content: workItemField.value,
            contentType: ContentType.SimpleText
        } as IFlatViewCell;
    }

    private _onCellValueChanged = (newValue: string, cellIndex: ICellIndex) => {
        switch (cellIndex.columnKey) {
            case BuildOptionViewColumnKeys.nameColumnKey:
                this._actionCreator.updateWIFieldKey(cellIndex.rowIndex, newValue);
                break;
            case BuildOptionViewColumnKeys.valueColumnKey:
                this._actionCreator.updateWIFieldValue(cellIndex.rowIndex, newValue);
                break;
            default:
                break;
        }
    }

    private _onChange = () => {
        this.setState(this._store.getAdditionalWIFieldsState());
    }
}
