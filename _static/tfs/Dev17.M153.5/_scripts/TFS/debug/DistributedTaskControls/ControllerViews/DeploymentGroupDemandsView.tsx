/// <reference types="react" />

import * as React from "react";

import { DemandCondition, DemandConstants } from "DistributedTaskControls/Common/Common";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { ContentType, ICellIndex, IFlatViewCell, IFlatViewColumn, IFlatViewTableRow } from "DistributedTaskControls/Common/FlatViewTableTypes";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { FlatViewTable } from "DistributedTaskControls/Components/FlatViewTable";
import { DeployPhaseUtilities } from "DistributedTaskControls/Phase/DeployPhaseUtilities";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { DeploymentGroupDemandsStore, IDeploymentGroupDemandData, IDeploymentGroupDemandsState, IMachineMissingDemandData } from "DistributedTaskControls/Stores/DeploymentGroupDemandsStore";

import { DirectionalHint } from "OfficeFabric/ContextualMenu";
import * as DetailsListProps from "OfficeFabric/DetailsList";
import { TooltipHost } from "VSSUI/Tooltip";

import * as Utils_HTML from "VSS/Utils/Html";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/ControllerViews/DemandsView";

export interface IProps extends Base.IProps {
    showHeader?: boolean;
    nameMaxWidth?: number;
    conditionMaxWidth?: number;
    valueMaxWidth?: number;
    taskListStoreInstanceId: string;
    disabled?: boolean;
}

export class DeploymentGroupDemandsView extends Base.Component<IProps, IDeploymentGroupDemandsState> {

    public componentWillMount() {
        this._store = StoreManager.GetStore<DeploymentGroupDemandsStore>(DeploymentGroupDemandsStore, this.props.instanceId);
    }

    public componentDidMount() {
        this._store.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        let headerClass: string = "flatview-header";
        let headers: IFlatViewColumn[] = [];

        headers.push({
            key: DemandConstants.nameColumnKey,
            name: Resources.DemandLabel,
            maxWidth: this.props.nameMaxWidth,
            isFixedColumn: true,
            headerClassName: headerClass
        });

        headers.push({
            key: DemandConstants.machinesMissingDemandColumnKey,
            name: Resources.TargetsLabel,
            maxWidth: this.props.valueMaxWidth,
            isFixedColumn: false,
            headerClassName: headerClass,
            isMultiline: true
        });

        return (
            <div className="options-details-component">
                <FlatViewTable
                    isHeaderVisible={!(this.props.showHeader === false)}
                    headers={headers}
                    rows={this._getDemandsRows()}
                    onCellValueChanged={this._onCellValueChanged}
                    ariaLabel={Resources.ARIALabelDemandsTable}
                    disabled={this.props.disabled}
                />
            </div >
        );
    }

    private _onCellValueChanged = (newValue: string, cellIndex: ICellIndex) => {
        // nothing todo
    }

    private _getDemandsRows(): IFlatViewTableRow[] {
        let rows: IFlatViewTableRow[] = [];
        let readOnlyDemands = this._store.getState().deploymentGroupDemands;
        readOnlyDemands = (readOnlyDemands && readOnlyDemands.length > 0) ? readOnlyDemands : [];
        return this._getRowData(readOnlyDemands, true);
    }

    private _getRowData(demands: IDeploymentGroupDemandData[], isReadOnly: boolean = false): IFlatViewTableRow[] {
        let demandRows: IFlatViewTableRow[] = [];

        if (demands && demands.length > 0) {
            demands.forEach((demand: IDeploymentGroupDemandData, index: number) => {

                let row: IFlatViewTableRow = { cells: {} };
                if (demand.machinesMissingDemand && demand.machinesMissingDemand.length > 0) {
                    row.cells[DemandConstants.nameColumnKey] = {
                        content: this._getDemandName(demand.machinesMissingDemand, demand.name, index, demand.value),
                        isTextDisabled: isReadOnly,
                        contentType: ContentType.JsxElement,
                        contentHasErrors: false,
                        columnActionsMode: DetailsListProps.ColumnActionsMode.disabled
                    } as IFlatViewCell;

                    row.cells[DemandConstants.machinesMissingDemandColumnKey] = {
                        content: this._getMatchingTargetsElement(demand.machinesMissingDemand),
                        contentType: ContentType.JsxElement,
                        isTextDisabled: isReadOnly,
                        contentHasErrors: false
                    } as IFlatViewCell;

                    demandRows.push(row);
                }
            });
        }

        return demandRows;
    }

    private _onChange = () => {
        this.setState(this._store.getState());
    }

    private _getDemandName(machinesMissingDemand: IMachineMissingDemandData[], name: string, index: number, value: string): JSX.Element {
        let demandName: string = name;
        if (value !== DemandCondition.Exists) {
            demandName = name + Resources.EqualSymbol + value;
        }

        if (machinesMissingDemand && machinesMissingDemand.length > 0) {
            return this._getWarninglement(demandName, index);
        }

        return this._getDemandDescription(demandName);
    }

    private _getMatchingTargetsElement(machinesMissingDemand: IMachineMissingDemandData[]): JSX.Element {
        let message: string = Utils_String.empty;
        const machinesLength = machinesMissingDemand.length;
        let targetMachines = machinesMissingDemand;
        let targetMachinesLength = machinesLength;
        if (machinesLength > DemandConstants.maxTargetToShow) {
            targetMachines = machinesMissingDemand.slice(0, DemandConstants.maxTargetToShow);
            targetMachinesLength = DemandConstants.maxTargetToShow;
        }

        targetMachines.forEach((machineMissingDemand: IMachineMissingDemandData, index: number) => {
            let machineName: string = machineMissingDemand.machineNameMissingDemand;
            message += Utils_String.localeFormat(
                Resources.DeploymentMachineLinkText,
                DeployPhaseUtilities.getMachinePageUrl(this._store.getQueueId(), machineMissingDemand.machineIdMissingDemand),
                machineName);

            if (index + 1 !== targetMachinesLength) {
                message += Resources.Comma + Resources.WhiteSpaceSeparator;
            }
        });

        if (machinesLength > DemandConstants.maxTargetToShow) {
            const moreCount = machinesLength - DemandConstants.maxTargetToShow;
            message += Resources.WhiteSpaceSeparator + Utils_String.localeFormat(
                Resources.MoreItem,
                moreCount);
        }

        // tslint:disable-next-line:react-no-dangerous-html
        return (<div className="machines-matching-targets" dangerouslySetInnerHTML={this._renderHtml(Utils_HTML.HtmlNormalizer.normalizeStripAttributes(message, null, ["target"]))}></div>);
    }

    private _getWarninglement(name: string, index: number): JSX.Element {
        return (<div className="accordion-section-label" >
            <TooltipHost content={Resources.MissingDemandWarning} directionalHint={DirectionalHint.rightBottomEdge} >
                <span data-is-focusable={true} aria-describedby={name + index} tabIndex={0} className="bowtie-icon bowtie-status-warning left" />
                {name}
            </TooltipHost>
        </div>);
    }

    private _getDemandDescription(name: string): JSX.Element {
        return (<div className="ms-font-s overview-description" >
            {name}
        </div>);
    }

    private _renderHtml(html: string) {
        return {
            __html: html
        };
    }

    private _store: DeploymentGroupDemandsStore;
}
