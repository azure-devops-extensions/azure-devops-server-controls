/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { DemandConstants } from "DistributedTaskControls/Common/Common";
import { IFlatViewCell, IFlatViewTableRow, ICellIndex, ContentType, IFlatViewColumn } from "DistributedTaskControls/Common/FlatViewTableTypes";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { FlatViewTableWithAddButton } from "DistributedTaskControls/Components/FlatViewTableWithAddButton";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import * as DetailsListProps from "OfficeFabric/DetailsList";
import { autobind } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";

export interface IDemandsProps extends Base.IProps {
    showHeader: boolean;
    nameMaxWidth: number;
    conditionMaxWidth: number;
    valueMaxWidth: number;
    rows: IFlatViewTableRow[];
    onCellValueChanged: (newValue: string, cellIndex: ICellIndex) => void;
    onAddDemandClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
    focusSelectorOnAddRow?: string;
    disabled?: boolean;
}

export class Demands extends Base.Component<IDemandsProps, Base.IStateless> {
    public render(): JSX.Element {
        let headerClass: string = "flatview-header";
        let headers: IFlatViewColumn[] = [];

        // error icon
        headers.push({
            key: DemandConstants.iconColumnKey,
            name: Resources.DemandErrorMessageColumnHeader,
            isIconOnly: true,
            columnActionsMode: DetailsListProps.ColumnActionsMode.disabled,
            isFixedColumn: true,
            minWidth: 20,
            maxWidth: 20
        });

        // name
        headers.push({
            key: DemandConstants.nameColumnKey,
            name: Resources.NameLabel,
            maxWidth: this.props.nameMaxWidth,
            isFixedColumn: true,
            headerClassName: headerClass,
            columnActionsMode: DetailsListProps.ColumnActionsMode.disabled
        });

        // delete
        headers.push({
            key: DemandConstants.deleteColumnKey,
            name: Resources.DeleteDemandColumnHeader,
            isIconOnly: true,
            columnActionsMode: DetailsListProps.ColumnActionsMode.disabled,
            isFixedColumn: true,
            minWidth: 32,
            maxWidth: 32
        });

        // condition
        headers.push({
            key: DemandConstants.conditionColumnKey,
            name: Resources.ConditionLabel,
            maxWidth: this.props.conditionMaxWidth,
            isFixedColumn: true,
            headerClassName: headerClass,
            columnActionsMode: DetailsListProps.ColumnActionsMode.disabled
        });

        // value
        headers.push({
            key: DemandConstants.valueColumnKey,
            name: Resources.ValueLabel,
            maxWidth: this.props.valueMaxWidth,
            isFixedColumn: true,
            headerClassName: headerClass,
            columnActionsMode: DetailsListProps.ColumnActionsMode.disabled
        });

        return (
            <div className="options-details-component">
                <FlatViewTableWithAddButton
                    containerClass="details-component-content"
                    flatViewContainerClass="demands-list"
                    isHeaderVisible={!(this.props.showHeader === false)}
                    headers={headers}
                    rows={this.props.rows}
                    onCellValueChanged={this.props.onCellValueChanged}
                    onAdd={this._onAddDemandClick}
                    addButtonClass="fabric-style-overrides add-new-item-button add-new-demand-button"
                    addButtonDescription={Resources.AddDemandDescription}
                    ariaLabel={Resources.ARIALabelDemandsTable}
                    setFocusOnRender={false}
                    focusSelectorOnAddRow={this.props.focusSelectorOnAddRow}
                    disabled={this.props.disabled}
                />
            </div >
        );
    }

    @autobind
    private _onAddDemandClick(event: React.MouseEvent<HTMLButtonElement>) {
        if (this.props.onAddDemandClick) {
            this.props.onAddDemandClick(event);
        }
        DtcUtils.scrollElementToView(event.currentTarget);
    }
}