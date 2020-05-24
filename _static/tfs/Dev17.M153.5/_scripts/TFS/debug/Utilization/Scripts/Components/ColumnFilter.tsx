import React = require("react");

import { Checkbox } from "OfficeFabric/Checkbox";
import { FocusZone } from "OfficeFabric/FocusZone";
import { BaseComponent, IBaseProps } from "OfficeFabric/Utilities";

import { UtilizationColumn } from "Utilization/Scripts/Generated/Contracts";
import { IUrlState, Columns, ColumnKeys, ColumnNames, AlwaysVisibleColumns, shouldColumnOptionsBeEnabled, getColumnsForTab} from "Utilization/Scripts/UrlStateHelper";

export interface ColumnFilterProps extends IBaseProps {
    initialUrlState: IUrlState;
    userColumnEnabled: boolean;
    serviceColumnEnabled: boolean;
    onPendingColumnSelectionChanged?: (concatenatedColumns: string) => void;
}

export interface ColumnFilterState {
}

export class ColumnFilter extends BaseComponent<ColumnFilterProps, ColumnFilterState> {

    private _columnVisibilities: { [key: number]: boolean } = {};
    private _allOptionsDisabled: boolean;
    private _columns: UtilizationColumn[];

    constructor(props: ColumnFilterProps) {
        super(props);

        this._columns = getColumnsForTab(props.initialUrlState.tab);
        this._processProps(props.initialUrlState);
    }

    public render(): JSX.Element {
        let entries = [];
        let columns = this._columns;

        for (let i = 0; i < columns.length; i++) {
            let col: UtilizationColumn = columns[i];

            // Do not show Service Column if it is not enabled nor show any pipeline only columns in filter
            if (col === UtilizationColumn.Service && !this.props.serviceColumnEnabled) {
                continue;
            }

            let key: string = ColumnKeys[col];
            entries.push(<CheckboxContainer
                key={key}
                keyName={key}
                displayName={ColumnNames[col]}
                value={this._columnVisibilities[col]}
                disabled={this._allOptionsDisabled || AlwaysVisibleColumns.indexOf(col) >= 0 || (!this.props.userColumnEnabled && col == UtilizationColumn.User)}
                onChange={(key: string, value: boolean) => {
                    this._columnVisibilities[col] = value;
                    this._updateParentPendingColumnSelection();
                }}
            />);
        }

        return (<div className="column-filter-callout">
            <FocusZone>
                {entries}
            </FocusZone>
        </div>
        );
    }

    private _updateParentPendingColumnSelection() {
        let concatenated: string = "";
        for (let i = 0; i < this._columns.length; i++) {
            let col: UtilizationColumn = this._columns[i];
            if (this._columnVisibilities[col] && AlwaysVisibleColumns.indexOf(col) < 0) {
                concatenated += "," + ColumnKeys[col];
            }
        }
        if (concatenated.length > 0) {
            concatenated = concatenated.substr(1);
        }

        if (this.props.onPendingColumnSelectionChanged) {
            this.props.onPendingColumnSelectionChanged(concatenated);
        }
    }

    private _processProps(urlState: IUrlState) {
        let specifiedColumns: string[] = urlState.columns.toLowerCase().split(',');
        for (let i = 0; i < this._columns.length; i++) {
            let col: UtilizationColumn = this._columns[i];
            let visibility: boolean = (specifiedColumns.indexOf(ColumnKeys[col].toLowerCase()) >= 0) || (AlwaysVisibleColumns.indexOf(col) >= 0);
            this._columnVisibilities[col] = visibility;
        }
        this._updateParentPendingColumnSelection();
        this._allOptionsDisabled = !shouldColumnOptionsBeEnabled(urlState);
    }
}

export interface CheckboxContainerProps extends IBaseProps {
    keyName: string;
    displayName: string;
    value: boolean;
    disabled: boolean;
    onChange: (key: string, value: boolean) => void;
}

export interface CheckboxContainerState {
    value: boolean;
}

class CheckboxContainer extends BaseComponent<CheckboxContainerProps, CheckboxContainerState> {
    constructor(props: CheckboxContainerProps) {
        super(props);

        this.state = {
            value: this.props.value
        };
    }

    public render(): JSX.Element {
        return <div>
            <Checkbox
                inputProps={{
                    "aria-disabled": this.props.disabled
                } as React.HTMLProps<HTMLElement>}
                label={this.props.displayName}
                checked={this.state.value}
                disabled={this.props.disabled}
                onChange={(ev?: React.FormEvent<HTMLElement | HTMLInputElement>, checked?: boolean) => {
                    this.setState({ value: checked });
                    if (this.props.onChange) {
                        this.props.onChange(this.props.keyName, checked);
                    }
                }}
            />
        </div>;
    }
}
