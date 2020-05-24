/// <reference types="react-dom" />
/// <reference types="react" />

import * as Base from "VSS/Flux/Component";
import * as DetailsListProps from "OfficeFabric/components/DetailsList/DetailsList.types";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Resources from "DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as q from "q";

import { ContentType, ICellIndex, IFlatViewCell, IFlatViewColumn, IFlatViewTableRow } from "DistributedTaskControls/Common/FlatViewTableTypes";
import { FlatViewButton } from "DistributedTaskControls/Components/FlatViewButton";

import { Fabric } from "OfficeFabric/Fabric";
import { FlatViewTableWithAddButton } from "DistributedTaskControls/Components/FlatViewTableWithAddButton";
import { NameValuePair } from "../Common/NameValuePair";

export interface IProps extends Base.Props {
    parameters: NameValuePair[];
    onValueChanged: (data: NameValuePair[]) => void;
    error?: string;
}

export interface IState extends Base.State {
    variables: NameValuePair[];
    error?: string;
}

export interface IPayload {
    index: number,
    key?: string,
    value?: string
}

export class ParametersGridComponent extends Base.Component<IProps, IState> {

    public componentWillMount() {
        this.setState({
            variables: this.props.parameters,
            error: this.props.error
        });
    }

    public render(): JSX.Element {
        return (
            this.state.error ?
                <h3> {this.state.error} </h3>
                : <FlatViewTableWithAddButton
                    containerClass="variables-section"
                    isHeaderVisible={true}
                    headers={this._getHeaders()}
                    rows={this._getVariableRows()}
                    onCellValueChanged={this._onCellValueChanged}
                    onAdd={this._addNewParameter}
                    addButtonClass="fabric-style-overrides add-new-item-button add-variable-btn"
                    addButtonDescription={"Add a new parameter"}
                    setFocusOnRender={false}
                />
        );
    }

    private _addNewParameter = () => {
        this.state.variables.push(this._createNewEmptyVariable());
        this._updateState();
    }

    private _createNewEmptyVariable(): NameValuePair {
        return {
            name: "",
            value: ""
        }
    }

    private _deleteVariable = (index: number) => {
        this.state.variables.splice(index, 1);
        this._updateState();
    }

    private _getHeaders() {
        let headers: IFlatViewColumn[] = [];
        let headerClass: string = "flatview-header header-variables-table";

        headers.push({
            key: HEADERS.NAME,
            name: Resources.NameText,
            maxWidth: 180,
            headerClassName: headerClass,
            columnActionsMode: DetailsListProps.ColumnActionsMode.disabled
        });

        headers.push({
            key: HEADERS.DELETE,
            name: "",
            minWidth: 25,
            maxWidth: 25,
            isIconOnly: true,
            headerClassName: headerClass,
            columnActionsMode: DetailsListProps.ColumnActionsMode.disabled
        });

        headers.push({
            key: HEADERS.VALUE,
            name: Resources.ValueText,
            maxWidth: 180,
            headerClassName: headerClass,
            columnActionsMode: DetailsListProps.ColumnActionsMode.disabled
        });

        return headers;
    }

    private _getVariableRow(variable: NameValuePair, index: number): IFlatViewTableRow {

        let row: IFlatViewTableRow = {
            cells: {},
            rowAriaLabel: variable.name
        };

        row.cells[HEADERS.NAME] = {
            content: variable.name,
            contentType: ContentType.SimpleText,
            contentHasErrors: false,
            isTextDisabled: false
        } as IFlatViewCell;

        row.cells[HEADERS.DELETE] = {
            content: (
                <FlatViewButton
                    tooltip={Resources.DeleteText}
                    rowSelected={false}
                    iconProps={{ iconName: "Delete" }}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                        this._deleteVariable(index);
                    }}
                    disabled={false} />
            ),
            contentType: ContentType.JsxElement
        } as IFlatViewCell;
        
        row.cells[HEADERS.VALUE] = {
            content: variable.value,
            contentType: ContentType.SimpleText,
            contentHasErrors: false,
            isTextDisabled: false
        } as IFlatViewCell;

        return row;
    }

    private _getVariableRows(): IFlatViewTableRow[] {
        var rows: IFlatViewTableRow[] = [];
        let variables = this.state.variables;
        variables.forEach((variable: NameValuePair, index: number) => {
            rows.push(this._getVariableRow(variable, index));
        });
        return rows;
    }

    private _onCellValueChanged = (newValue: string, cellIndex: ICellIndex) => {
        switch (cellIndex.columnKey) {
            case HEADERS.NAME:
                this._updateVariableName({
                    index: cellIndex.rowIndex,
                    key: newValue
                });
                break;

            case HEADERS.VALUE:
                this._updateVariableValue({
                    index: cellIndex.rowIndex,
                    value: newValue
                });
                break;
            default:
                break;
        }
    }

    private _updateState() {
        if (this.props.onValueChanged) {
            this.props.onValueChanged(this.state.variables);
        }
        this.setState(this.state);
    }

    private _updateVariableName = (payload: IPayload) => {
        this.state.variables[payload.index].name = payload.key;
        this._updateState();
    }

    private _updateVariableValue = (payload: IPayload) => {
        this.state.variables[payload.index].value = payload.value;
        this._updateState();
    }

}

export function start(element: HTMLElement, data: { inputs: NameValuePair[], error: string }, onValueChanged?: (data: NameValuePair[]) => void): void {
    ReactDOM.render(<Fabric><ParametersGridComponent parameters={data.inputs} error={data.error} onValueChanged={onValueChanged} /></Fabric>, element);
}

function isNonEmpty(object: any): boolean {
    if (typeof (object) === "string") {
        if (object && object.trim()) {
            return true;
        }
        return false;
    } else {
        return !!object;
    }
}

// Constants
// Using numbers instead of names as headers to fix the compat issue caused due to Object to Array change in FlatViewTable Headers
class HEADERS {
    public static NAME = "0";
    public static VALUE = "1";
    public static DELETE = "2";
}