/// <reference types="react-dom" />
/// <amd-dependency path='VSS/LoaderPlugins/Css!TFS:MultipleBindings' />

import * as Base from "VSS/Flux/Component";
import * as Constants from "DistributedTask/Scripts/Extensions/WebConfigParametersGrid/Constants";
import * as DetailsListProps from "OfficeFabric/components/DetailsList/DetailsList.types";
import * as Resources from "DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask";
import * as WebConfigParametersAction from "DistributedTask/Scripts/Extensions/WebConfigParametersGrid/WebConfigParametersAction";

import { ContentType, ICellIndex, IFlatViewCell, IFlatViewColumn, IFlatViewTableRow } from "DistributedTaskControls/Common/FlatViewTableTypes";
import { DropDownInputControl, IDropDownItem } from "DistributedTaskControls/SharedControls/InputControls/Components/DropDownInputComponent";
import { ParametersStore, WebConfigData, WebConfigParametersStore } from "DistributedTask/Scripts/Extensions/WebConfigParametersGrid/WebConfigParametersStore";

import { Component } from "DistributedTaskControls/Components/DropDownButton";
import { Fabric } from "OfficeFabric/Fabric";
import { FlatViewButton } from "DistributedTaskControls/Components/FlatViewButton";
import { FlatViewTable } from "DistributedTaskControls/Components/FlatViewTable";
import { IDropdownOption } from "OfficeFabric/components/Dropdown/Dropdown.types";
import { IInfoProps } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { NameValuePair } from "DistributedTask/Scripts/Extensions/Common/NameValuePair";
import { PickListInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/PickListInputComponent";
import { PowerShellParameters } from "DistributedTask/Scripts/Extensions/Common/PowerShellParameters";

import q = require("q");
import React = require("react");
import ReactDOM = require("react-dom");
import SDK_Shim = require("VSS/SDK/Shim");

export interface IState extends Base.State {
    webConfigData: WebConfigData
}

export class WebConfigParametersGrid extends Base.Component<Base.Props, IState> {

    private _webConfigStore: WebConfigParametersStore;
    private _webConfigParametersAction: WebConfigParametersAction.WebConfigParametersActionCreator;

    constructor() {
        super();
        this._webConfigStore = ParametersStore;
        this._webConfigParametersAction = WebConfigParametersAction.ActionCreator;

        this.state = {
            webConfigData: this._webConfigStore.getData()
        }
    }

    public componentWillMount() {
        this._webConfigStore.addChangedListener(this._onStoreChange.bind(this));
    }

    public componentWillUnmount() {
        super.componentWillUnmount();
        this._webConfigStore.removeChangedListener(this._onStoreChange.bind(this));
    }

    public render(): JSX.Element {
        return (
            <div>
                <DropDownInputControl
                    selectedKey={this.state.webConfigData.appType}
                    label={Resources.WebConfigParametersAppTypeText}
                    options={this._getAppTypeOptions()}
                    infoProps={this._getInfoProps(Resources.WebConfigParametersAppTypeText, Resources.WebConfigParametersAppTypeInfoText)}
                    onValueChanged={(val: IDropDownItem) => { this._updateWebConfigParameters(val.option.key as string); }} />

                <FlatViewTable
                    isHeaderVisible={true}
                    headers={this._getHeaders()}
                    rows={this._getVariableRows()}
                    onCellValueChanged={this._onCellValueChanged}
                    ariaLabel={Resources.WebConfigParametersAppTypeInfoText}
                />
            </div>
        );
    }

    private _getAppTypeOptions(): IDropdownOption[] {
        let options: IDropdownOption[] = [];

        for (let key in Constants.AppType) {
            options.push({
                text: Constants.AppType[key],
                key: key
            });
        }

        return options;
    }

    private _onStoreChange() {
        let webConfigStoreData: WebConfigData = this._webConfigStore.getData();
        this.setState({ webConfigData: webConfigStoreData });
    }

    private _updateWebConfigParameters = (appType: string) => {
        this._webConfigParametersAction.updateWebAppType(appType);
    }

    private _getInfoProps = (header: string, description: string): IInfoProps => {
        let createZeroDataSecondaryTextElement = () => {
            let linkElement = <a href='https://go.microsoft.com/fwlink/?linkid=843469' target='_blank'>{Resources.LearnMoreText}</a>;
            return <span>{description}{linkElement}</span>;
        }

        let infoProp: IInfoProps = {
            calloutContentProps: {
                calloutHeader: header,
                calloutAdditionalContent: createZeroDataSecondaryTextElement
            }
        };
        return infoProp;
    }

    private _getHeaders = () => {
        let headers: IFlatViewColumn[] = [];
        let headerClass: string = "flatview-header header-variables-table";

        headers.push({
            key: Constants.NameColumnKey,
            name: Resources.NameText,
            minWidth: 200,
            headerClassName: headerClass,
            columnActionsMode: DetailsListProps.ColumnActionsMode.disabled
        });

        headers.push({
            key: Constants.InfoColumnKey,
            name: "",
            minWidth: 25,
            maxWidth: 25,
            headerClassName: headerClass,
            columnActionsMode: DetailsListProps.ColumnActionsMode.disabled
        });

        headers.push({
            key: Constants.ValueColumnKey,
            name: Resources.ValueText,
            minWidth: 250,
            headerClassName: headerClass,
            columnActionsMode: DetailsListProps.ColumnActionsMode.disabled
        });

        return headers;
    }

    private _getVariableRows = (): IFlatViewTableRow[] => {
        var rows: IFlatViewTableRow[] = [];
        let variables = this.state.webConfigData.variables;

        variables.forEach((variable: NameValuePair, index: number) => {
            rows.push(this._getVariableRow(variable, index));
        });
        return rows;
    }

    private _getVariableRow = (variable: NameValuePair, index: number): IFlatViewTableRow => {
        let cells: IDictionaryStringTo<any> = {};

        cells[Constants.NameColumnKey] = {
            content: variable.name,
            contentType: ContentType.SimpleText,
            isTextDisabled: true
        } as IFlatViewCell;

        cells[Constants.InfoColumnKey] = {
            contentType: ContentType.JsxElement,
            content: <FlatViewButton
                tooltip={variable.info}
                rowSelected={true}
                iconProps={{
                    iconName: "Info"
                }}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => { }}
                disabled={false}
            />
        } as IFlatViewCell;

        cells[Constants.ValueColumnKey] = {
            content: variable.value,
            contentType: ContentType.SimpleText,
            isTextDisabled: false,
            contentHasErrors: this._getErrorState(variable)
        } as IFlatViewCell;

        let row: IFlatViewTableRow = {
            cells: cells,
            rowAriaLabel: variable.info || variable.name
        }
        return row;
    }

    private _getErrorState = (variable: NameValuePair): boolean => {
        if(variable.name.toUpperCase() === "DJANGO_SETTINGS_MODULE") {
            return false;
        } else if(variable.name.toUpperCase() === "ADDITIONAL_DEPLOYMENT_OPTIONS") {
            return false;
        } else if(variable.value.trim() == "") {
            return true;
        } else{
            return false;
        }
    }

    private _onCellValueChanged = (newValue: string, cellIndex: ICellIndex) => {
        switch (cellIndex.columnKey) {
            case Constants.ValueColumnKey:
                this._webConfigParametersAction.updateVariableValue({ index: cellIndex.rowIndex, value: newValue });
                break;
            case Constants.NameColumnKey:
                this._webConfigParametersAction.updateVariableName({ index: cellIndex.rowIndex, value: newValue });
                break;
            default:
                break;
        }
    }
}

export function start(element: HTMLElement, showError?: boolean): void {
    if (showError) {
        ReactDOM.render(<h3>{Resources.TargetNotFound}</h3>, element);
    }
    else {
        ReactDOM.render(<Fabric><WebConfigParametersGrid /></Fabric>, element);
    }
}