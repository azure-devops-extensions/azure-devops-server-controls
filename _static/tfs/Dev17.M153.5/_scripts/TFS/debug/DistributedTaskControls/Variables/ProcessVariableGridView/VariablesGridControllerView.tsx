/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { IFlatViewTableRow, IFlatViewColumn, ICellIndex, ContentType, IFlatViewCell } from "DistributedTaskControls/Common/FlatViewTableTypes";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { VariablesGridViewStore } from "DistributedTaskControls/Variables/ProcessVariableGridView/VariablesGridViewStore";
import { FlatViewTable } from "DistributedTaskControls/Components/FlatViewTable";
import { ProcessVariablesGridViewUtility, ILinkedVariable, IVariablesGridViewState } from "DistributedTaskControls/Variables/ProcessVariableGridView/ProcessVariablesGridViewUtility";
import { IScope } from "DistributedTaskControls/Variables/Common/Types";
import { ProcessVariablesGridViewColumnKeys } from "DistributedTaskControls/Variables/Common/Constants";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { VariablesGridActionsCreator } from "DistributedTaskControls/Variables/ProcessVariableGridView/VariablesGridActionsCreator";
import { FlatViewIcon } from "DistributedTaskControls/Components/FlatViewIcon";

import { autobind } from "OfficeFabric/Utilities";
import { Label } from "OfficeFabric/Label";
import { TooltipHost, DirectionalHint, TooltipOverflowMode } from "VSSUI/Tooltip";
import { DetailsListLayoutMode } from "OfficeFabric/DetailsList";

import * as Utils_String from "VSS/Utils/String";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Variables/ProcessVariableGridView/VariablesGridControllerView";

export class VariablesGridControllerView extends React.Component<Base.IProps, IVariablesGridViewState> {

    public componentWillMount(): void {
        this._viewStore = StoreManager.GetStore<VariablesGridViewStore>(VariablesGridViewStore, this.props.instanceId);
        this._actionsCreator = ActionCreatorManager.GetActionCreator<VariablesGridActionsCreator>(VariablesGridActionsCreator, this.props.instanceId);

        this._viewStore.addChangedListener(this._onChange);
        this.setState(this._viewStore.getState());
    }

    public componentWillUnmount(): void {
        this._viewStore.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        return (
            <div className="variables-grid-view-container">
                <FlatViewTable
                    layoutMode={DetailsListLayoutMode.fixedColumns}
                    setKey={"variables-grid-view-key"}
                    headers={this._getHeaders()}
                    rows={this._getRows()}
                    onCellValueChanged={this._onCellValueChanged}
                    ariaLabel={this._getAriaLabel()} />
            </div>
        );
    }

    /**
     * Get column headers 
     * 
     * @private
     * @returns {IDictionaryStringTo<IFlatViewColumn>}
     * 
     * @memberOf VariablesGridControllerView
     */
    private _getHeaders(): IFlatViewColumn[] {
        return this.state.headers;
    }

    /**
     * Returns jsx for list of variables
     * 
     * @private
     * @returns {IFlatViewTableRow[]}
     * 
     * @memberOf VariablesGridControllerView
     */
    private _getRows(): IFlatViewTableRow[] {

        let { sortedUniqueVariableNames, variablesGrid } = this.state.gridViewData;
        let scopes = this.state.scopes;
        let rows: IFlatViewTableRow[] = [];

        // each name represents one row
        for (const name of sortedUniqueVariableNames) {

            let row: IFlatViewTableRow = { cells: {} };

            // get the row data
            let variableScopeMap = variablesGrid[name];

            // create the cells for the row
            let cells: IDictionaryStringTo<IFlatViewCell> = {};

            // create name column cell
            cells[ProcessVariablesGridViewColumnKeys.NameColumnKey] = this._getNameCell(name);

            let scopesInErrorState: IScope[] = [];

            // create cells for the scopes
            for (const scope of scopes) {

                const linkedVariables = variableScopeMap[ProcessVariablesGridViewUtility.getScopeColumnKey(scope)];
                cells[ProcessVariablesGridViewUtility.getScopeColumnKey(scope)] = this._getValueCellContent(scope, linkedVariables);

                if (linkedVariables && linkedVariables.length > 1) {
                    scopesInErrorState.push(scope);
                }
            }

            cells[ProcessVariablesGridViewColumnKeys.IconColumnKey] = this._getIconCellContent(name, scopesInErrorState);

            row.cells = cells;
            rows.push(row);
        }

        return rows;
    }

    /**
     * Get the Icon cell content
     * 
     * @private
     * @param {String} name
     * @param {IScope[]} scopesInErrorState 
     * @returns {IFlatViewCell} 
     * @memberof VariablesGridControllerView
     */
    private _getIconCellContent(name: string, scopesInErrorState: IScope[]): IFlatViewCell {

        let content: JSX.Element = null;

        if (scopesInErrorState && scopesInErrorState.length > 0) {

            const scopeNames = scopesInErrorState.map((scope: IScope) => { return scope.value; });
            let message: string;

            if (scopesInErrorState.length === 1) {
                message = Utils_String.format(Resources.VariablesGridDuplicateNameMessage, scopeNames);
            }
            else {
                message = Utils_String.format(Resources.VariablesGridDuplicateNameMessageMultipleScope, scopeNames);
            }

            content = (
                <TooltipHost content={message} directionalHint={DirectionalHint.bottomCenter}>
                    <FlatViewIcon ariaLiveRegionMessage={message} rowSelected={false} iconName={"Error"} className={"dtc-variable-validation-error"} />
                </TooltipHost>
            );
        }

        return {
            content: content,
            contentType: ContentType.JsxElement
        } as IFlatViewCell;
    }

    /**
     * Get the aria-label for the grid view
     * 
     * @private
     * @returns {string} 
     * @memberof VariablesGridControllerView
     */
    private _getAriaLabel(): string {
        return Resources.ARIALabelVariablesTable;
    }

    /**
     * Handle the value changed event on the respective cell
     * 
     * @private
     * @param {string} newValue 
     * @param {ICellIndex} cellIndex 
     * 
     * @memberOf VariablesGridControllerView
     */
    @autobind
    private _onCellValueChanged(newValue: string, cellIndex: ICellIndex): void {

        const { gridViewData } = this._viewStore.getState();
        const dataIndex = ProcessVariablesGridViewUtility.getDataIndex(cellIndex, gridViewData);

        this._actionsCreator.updateVariableValue({
            index: dataIndex,
            variable: {
                value: newValue
            }
        });
    }

    /**
     * Handle the onChange event of the store
     * 
     * @private
     * @memberof VariablesGridControllerView
     */
    @autobind
    private _onChange() {
        this.setState(this._viewStore.getState());
    }

    /**
     * Create cell content for variable name
     * 
     * @private
     * @returns {IFlatViewCell} 
     * @memberof VariablesGridControllerView
     */
    private _getNameCell(name: string): IFlatViewCell {

        const content = (
            <Label className="dtc-variables-grid-name">
                <TooltipHost content={name} directionalHint={DirectionalHint.bottomCenter} overflowMode={TooltipOverflowMode.Parent}>
                    {name}
                </TooltipHost>
            </Label>
        );

        return {
            content: content,
            contentType: ContentType.JsxElement,
        } as IFlatViewCell;
    }

    /**
     * Create cell content for each variable value
     * 
     * @private
     * @param {IScope} scope 
     * @param {IDictionaryStringTo<IVariable>} variableScopeMap 
     * @returns {IFlatViewCell} 
     * @memberof VariablesGridControllerView
     */
    private _getValueCellContent(scope: IScope, linkedVariables: ILinkedVariable[]): IFlatViewCell {

        // create value cell only when variable with unique name exists for the scope
        if (linkedVariables && linkedVariables.length === 1) {
            return this._getCellForVariable(linkedVariables[0]);
        }
        else {
            return this._getValueCellForNonExistentVariable();
        }
    }

    /**
     * Create cell content for variable value which is not present in the scope (ex. environment not have particular variable set)
     * 
     * @private
     * @returns {IFlatViewCell} 
     * @memberof VariablesGridControllerView
     */
    private _getValueCellForNonExistentVariable(): IFlatViewCell {
        return {
            content: (<Label> </Label>),
            contentType: ContentType.JsxElement
        } as IFlatViewCell;
    }

    /**
     * Create cell content for variable value 
     * 
     * @private
     * @param {IVariable} variable 
     * @returns {IFlatViewCell} 
     * @memberof VariablesGridControllerView
     */
    private _getCellForVariable(linkedVariable: ILinkedVariable): IFlatViewCell {

        const variable = linkedVariable.variable;
        let valueControlIcon: string, valueControlTitle: string;

        if (!!variable.isSecret) {
            valueControlIcon = "Lock";
            valueControlTitle = Resources.ChangeVariableTypeToPlain;
        } else {
            valueControlIcon = "Unlock";
            valueControlTitle = Resources.ChangeVariableTypeToSecret;
        }

        return {
            controlIcon: valueControlIcon,
            controlTitle: valueControlTitle,
            controlClickCallback: () => {
                this._actionsCreator.updateVariableValue({
                    index: linkedVariable.dataIndex,
                    variable: {
                        value: variable.value,
                        isSecret: !(variable.isSecret)
                    }
                });
            },
            content: variable.value,
            contentType: (!!variable.isSecret) ? ContentType.PasswordText : ContentType.SimpleText,
            payload: variable,
            isTextDisabled: (!!variable.disableVariable || !!variable.isSystemVariable),
            placeHolder: Resources.VariableValuePlaceHolder,
            ignoreParentHighlight: true,
            ariaLabel: Utils_String.format(Resources.VariableValueLabel, variable.name)
        } as IFlatViewCell;
    }

    private _viewStore: VariablesGridViewStore;
    private _actionsCreator: VariablesGridActionsCreator;
}

