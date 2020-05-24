/// <reference types="react" />

import * as React from "react";

import { SecureFilePropertyActions } from "DistributedTask/Scripts/Actions/SecureFilePropertyActions";
import Types = require("DistributedTask/Scripts/DT.Types");
import { ISecureFilePropertiesState, SecureFilePropertiesStore } from "DistributedTask/Scripts/Stores/SecureFilePropertiesStore";
import Resources = require("DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask");

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ContentType, ICellIndex, IFlatViewCell, IFlatViewColumn, IFlatViewTableRow } from "DistributedTaskControls/Common/FlatViewTableTypes";
import { FlatViewTableWithAddButton } from "DistributedTaskControls/Components/FlatViewTableWithAddButton";
import { PerfTelemetryManager, TelemetryScenarios } from "DistributedTask/Scripts/Utils/TelemetryUtils";

import { Checkbox } from "VSSUI/Checkbox";

import * as Utils_String from "VSS/Utils/String";

export const NameColumnKey: string = "name";
export const ValueColumnKey: string = "value";

export class SecureFilePropertiesView<P extends Base.IProps, S extends ISecureFilePropertiesState> extends Base.Component<Base.IProps, Base.IState> {

    constructor(props: P) {
        super(props);

        PerfTelemetryManager.initialize();
        PerfTelemetryManager.instance.startTTIScenarioOrNormalScenario(TelemetryScenarios.SecureFilesPropertiesEditorLanding);

        this._store = StoreManager.GetStore<SecureFilePropertiesStore>(SecureFilePropertiesStore);
        this._actionHub = ActionsHubManager.GetActionsHub<SecureFilePropertyActions>(SecureFilePropertyActions);
    }

    public componentWillMount(): void {
        this._store = this._getStore();
        this._actionHub = this._getActionsHub();

        this.setState(this._store.getState() as S);
        this._store.addChangedListener(this._refreshPropertiesList);
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._refreshPropertiesList);
    }

    public componentDidMount() {
        PerfTelemetryManager.instance.endScenario(TelemetryScenarios.SecureFilesPropertiesEditorLanding);
    }

    public render(): JSX.Element {
        let headers = this._getHeaders();

        return (
            <div>
                <FlatViewTableWithAddButton
                    containerClass="variables-section"
                    isHeaderVisible={true}
                    headers={headers}
                    rows={this._getPropertyRows()}
                    onCellValueChanged={this._onPropertyValueChanged.bind(this)}
                    onAdd={this._onAddPropertyClicked}
                    addButtonClass="fabric-style-overrides add-new-item-button add-new-demand-button"
                    ariaLabel="lib-sf-header-details"
                />
                <Checkbox className="authorize-pipelines-checkbox"
                    label={Resources.AuthorizeForUseInAllPipelines}
                    ariaLabel={Resources.AuthorizeForUseInAllPipelines}
                    checked={this._store.isAuthorized()}
                    onChange={(ev: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, checked: boolean) => {
                        this._actionHub.toggleAuthorized.invoke({});
                    }}
                />
            </div>
        );
    }

    protected _getStore(): SecureFilePropertiesStore {
        return this._store;
    }

    protected _getActionsHub(): SecureFilePropertyActions {
        return this._actionHub;
    }

    private _getHeaders(): IFlatViewColumn[] {
        let headers: IFlatViewColumn[] = [];

        headers.push({
            key: NameColumnKey,
            name: Resources.NameText,
            minWidth: 200,
            isFixedColumn: true
        });

        headers.push({
            key: ValueColumnKey,
            name: Resources.ValueText,
            minWidth: 400,
            isFixedColumn: true
        });

        return headers;
    }

    private _getPropertyRows(): IFlatViewTableRow[] {
        let propertyRows: IFlatViewTableRow[] = [];

        let properties: Types.ISecureFileProperty[] = this._store.getCurrentProperties();

        properties.forEach((property: Types.ISecureFileProperty, index: number) => {
            let row: IFlatViewTableRow = { cells: {} };

            row.cells[NameColumnKey] = {
                content: property.key,
                contentType: ContentType.SimpleText,
                contentHasErrors: (property.key.trim() === Utils_String.empty),
                isTextDisabled: false,
                controlIcon: "Trash",
                controlTitle: Resources.DeleteText,
                controlClickCallback: () => {
                    this._actionHub.deleteProperty.invoke({
                        index: index,
                        key: property.key
                    })
                }
            } as IFlatViewCell;

            row.cells[ValueColumnKey] = {
                content: property.value,
                contentHasErrors: (property.value.trim() === Utils_String.empty),
                contentType: ContentType.SimpleText,
                payload: property.value,
                controlClickCallback: () => {
                    this._actionHub.updatePropertyValue.invoke({
                        index: index,
                        value: property.value
                    })
                }
            } as IFlatViewCell;

            propertyRows.push(row);
        });

        return propertyRows;
    }

    private _refreshPropertiesList = () => {
        this.setState(this._store.getState() as S);
    }

    private _onPropertyValueChanged = (newValue: string, cellIndex: ICellIndex) => {
        switch (cellIndex.columnKey) {
            case NameColumnKey:
                this._actionHub.updatePropertyKey.invoke({
                    index: cellIndex.rowIndex,
                    key: newValue
                });
                break;
            case ValueColumnKey:
                this._actionHub.updatePropertyValue.invoke({
                    index: cellIndex.rowIndex,
                    value: newValue
                });
                break;
            default:
                break;
        }
    }

    private _onAddPropertyClicked = (event: React.MouseEvent<HTMLButtonElement>) => {
        this._actionHub.addProperty.invoke({});
    }

    private _store: SecureFilePropertiesStore;
    private _actionHub: SecureFilePropertyActions;
}

