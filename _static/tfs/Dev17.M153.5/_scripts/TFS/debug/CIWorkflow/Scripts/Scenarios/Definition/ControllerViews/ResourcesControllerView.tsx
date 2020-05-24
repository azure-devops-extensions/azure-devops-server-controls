/// <reference types="react" />

import * as React from "react";

import { ResourceColumnKeys } from "CIWorkflow/Scripts/Common/Constants";
import { ProcessResourcesStore, IProcessResourcesStoreState, ResourceTypes, IResourceData } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/ProcessResourcesStore";
import { ResourcesActionCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/ResourcesActionCreator";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { ICellIndex, IFlatViewTableRow, IFlatViewCell, ContentType, IFlatViewColumn } from "DistributedTaskControls/Common/FlatViewTableTypes";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { FlatViewButton } from "DistributedTaskControls/Components/FlatViewButton";
import { FlatViewDropdown } from "DistributedTaskControls/Components/FlatViewDropdown";
import { FlatViewTableWithAddButton } from "DistributedTaskControls/Components/FlatViewTableWithAddButton";
import { FlatViewIcon } from "DistributedTaskControls/Components/FlatViewIcon";

import * as DetailsListProps from "OfficeFabric/DetailsList";
import { DirectionalHint } from "OfficeFabric/ContextualMenu";
import { TooltipHost } from "VSSUI/Tooltip";

import * as UtilsString from "VSS/Utils/String";

import { Positioning } from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/ResourcesControllerView";

/**
 * @brief Controller view for Resourse section under YAML tab.
 */
export class ResourcesControllerView extends Base.Component<Base.IProps, Base.IState> {

    constructor(props: any) {
        super(props);
        this._processResourcesStore = StoreManager.GetStore<ProcessResourcesStore>(ProcessResourcesStore);
        this._resourcesActionCreator = ActionCreatorManager.GetActionCreator<ResourcesActionCreator>(ResourcesActionCreator, props.instanceId);
    }

    public render(): JSX.Element {
        let headers = this._getHeaders();

        return (
            <div className="ci-resources-section-container">
                <div className="ci-yaml-resources-title">{ Resources.YamlResourcesSectionTitle}</div>
                <FlatViewTableWithAddButton
                    layoutMode={DetailsListProps.DetailsListLayoutMode.fixedColumns}
                    flatViewContainerClass="dtc-variables-list"
                    containerClass="variables-section"
                    isHeaderVisible={true}
                    headers={headers}
                    rows={this._getResourceRows()}
                    onCellValueChanged={this._onCellValueChanged.bind(this)}
                    onAdd={this._addNewVariable}
                    addButtonClass="fabric-style-overrides add-new-item-button add-variable-btn"
                    addButtonDescription={Resources.Add}
                    ariaLabel={Resources.ARIALabelResourcesTable}
                    setFocusOnRender={false}
                    focusSelectorOnAddRow=".dtc-variable-value-cell .flat-view-text" />
            </div>
        );
    }

    public componentWillMount() {
        this._processResourcesStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        this._processResourcesStore.removeChangedListener(this._onChange);
    }

    private _onChange = () => {
        this.setState(this._processResourcesStore.getState());
    }

    protected _onCellValueChanged = (newValue: string, cellIndex: ICellIndex) => {
        switch (cellIndex.columnKey) {
            case ResourceColumnKeys.TypeColumnKey:
                this._resourcesActionCreator.updateResourceFieldType(cellIndex.rowIndex, newValue);
                break;
            case ResourceColumnKeys.NameColumnKey:
                this._resourcesActionCreator.updateResourceFieldName(cellIndex.rowIndex, newValue);
                break;
            default:
                break;
        }
    }

    private _addNewVariable = (event: React.MouseEvent<HTMLButtonElement>) => {
        this._resourcesActionCreator.addResource({});
        DtcUtils.scrollElementToView(event.currentTarget, Positioning.VerticalScrollBehavior.Middle);
    }

    protected _getHeaders(): IFlatViewColumn[] {
        let headers: IFlatViewColumn[] = [];
        let headerClass: string = "flatview-header header-variables-table";

        // error icon
        headers.push({
            key: ResourceColumnKeys.IconColumnKey,
            name: Resources.ResourcesErrorMessageHeader,
            isIconOnly: true,
            columnActionsMode: DetailsListProps.ColumnActionsMode.disabled,
            minWidth: 20,
            maxWidth: 20
        });

        headers.push({
            key: ResourceColumnKeys.TypeColumnKey,
            name: Resources.TypeLabel,
            minWidth: 300,
            headerClassName: headerClass,
            columnActionsMode: DetailsListProps.ColumnActionsMode.disabled
        });

        headers.push({
            key: ResourceColumnKeys.NameColumnKey,
            name: Resources.NameLabel,
            minWidth: 200,
            headerClassName: headerClass,
            columnActionsMode: DetailsListProps.ColumnActionsMode.disabled
        });

        headers.push({
            key: ResourceColumnKeys.DeleteColumnKey,
            name: Resources.ResourceDeleteColumnHeader,
            isIconOnly: true,
            columnActionsMode: DetailsListProps.ColumnActionsMode.disabled,
            minWidth: 32,
            maxWidth: 32
        });

        return headers;
    }

    /**
     * @brief Returns jsx for list of resources
     */
    protected _getResourceRows(): IFlatViewTableRow[] {
        let variableRows: IFlatViewTableRow[] = [];

        let state = this._processResourcesStore.getState() as IProcessResourcesStoreState;
        let resourcesArray = state.resources;

        let valueControlIcon: string = "Unlock";
        let valueControlTitle: string = "";

        if (resourcesArray) {
            resourcesArray.forEach((resource: IResourceData, index: number) => {
                let row: IFlatViewTableRow = { cells: {} };

                // icon column
                row.cells[ResourceColumnKeys.IconColumnKey] = this._getIconCellContent(resource);

                row.cells[ResourceColumnKeys.TypeColumnKey] = {
                    cssClass: "dtc-variable-value-cell",
                    content: (
                        <FlatViewDropdown
                            conditions={this._getConditions()}
                            selectedCondition={resource.type}
                            rowSelected={false}
                            onValueChanged={(newValue: string) => {
                                this._resourcesActionCreator.updateResourceFieldType(index, newValue);
                            }} />
                    ),
                    contentHasErrors: (!resource.type || resource.type.trim() === UtilsString.empty),
                    contentType: ContentType.JsxElement,
                } as IFlatViewCell;

                row.cells[ResourceColumnKeys.NameColumnKey] = {
                    cssClass: "dtc-variable-name-cell",
                    content: resource.name,
                    contentType: ContentType.SimpleText,
                    contentHasErrors: (!resource.name || resource.name.trim() === UtilsString.empty),
                    isTextDisabled: false,
                } as IFlatViewCell;

                row.cells[ResourceColumnKeys.DeleteColumnKey] =  { 
                    content: (
                    <FlatViewButton
                        tooltip={UtilsString.format(Resources.DeleteResourceToolTip, resource.name)}
                        rowSelected={false}
                        iconProps={{ iconName: "Delete" }}
                        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                            this._resourcesActionCreator.deleteResource(index);
                        }} 
                        disabled={false}/>
                    ),
                    contentType: ContentType.JsxElement
            } as IFlatViewCell;

                variableRows.push(row);
            });
        }

        return variableRows;
    }

    private _getIconCellContent(resource: IResourceData): IFlatViewCell {
        let messageIconProps = null;
        if (!resource.type || resource.type.trim() === UtilsString.empty || !resource.name || resource.name.trim() === UtilsString.empty) {
            const message = (!resource.type || resource.type.trim() === UtilsString.empty) ? Resources.ResourceTypeRequiredMessage : Resources.ResourceNameRequiredMessage;
            messageIconProps = {
                iconName: "Error",
                className: "dtc-variable-validation-error",
                message: message
            }
        }

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


    private _getConditions(): string[] {
        let options: string[] = [];
        options.push(ResourceTypes.QUEUE_TYPE);
        options.push(ResourceTypes.SERVICE_ENDPOINT_TYPE);
        options.push(ResourceTypes.VARIABLE_GROUP_TYPE);
        return options;
    }

    private _resourcesActionCreator: ResourcesActionCreator;
    private _processResourcesStore: ProcessResourcesStore;
}

