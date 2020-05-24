import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import { IAgentPhaseJobItem, JobStates } from "DistributedTaskUI/Logs/Logs.Types";

import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { css } from "OfficeFabric/Utilities";
import { TooltipHost } from "VSSUI/Tooltip";
import { autobind } from "OfficeFabric/Utilities";

import { ReleaseProgressNavigateStateActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { IJobInfo } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { ReleasePhaseHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/ReleasePhaseHelper";

import { TaskStatus } from "ReleaseManagement/Core/Contracts";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeploymentGroupInProgressGrid";
import * as NavigationService from "VSS/Navigation/Services";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";

export interface IDeploymentGroupGridItemContent {
    jobState: JobStates;
    machineName?: string;
    rank: number;
}

export interface IDeploymentGroupInProgressGridProps extends Base.IProps {
    items: IDeploymentGroupGridItemContent[];
    runningItemCount: number;
    maxGridSize: number;
    variableSizing?: boolean;
    onItemClick?: () => void;
    environmentId?: number;
    deploymentGroupPhaseId?: string;
}

export class DeploymentGroupInProgressGrid extends Base.Component<IDeploymentGroupInProgressGridProps, Base.IStateless>{

    public render(): JSX.Element {
        let containerClassName = null;
        let gridRowSize = 7;

        let items = this.props.items.slice(0, this.props.maxGridSize);

        let extraMachineCountContent = null;
        let variableSizingItemClassName = "";
        let variableSizingGridClassName = "";
        const itemListLength = this.props.items.length;

        if (this.props.variableSizing) {            
            let variableSizingGridPropertiesMap = this._getVariableSizingGridPropertiesMap();
            let variableSizingGridSizes = [
                // Removing usage of 2 largest sizes for now
                //DeploymentGroupInProgressGrid._maxItemCountXXL,
                //DeploymentGroupInProgressGrid._maxItemCountXL,
                DeploymentGroupInProgressGrid._maxItemCountL,
                DeploymentGroupInProgressGrid._maxItemCountM,
                DeploymentGroupInProgressGrid._maxItemCountS
            ];

            variableSizingGridClassName = DeploymentGroupInProgressGrid._variableGridSizeCss;
            variableSizingItemClassName = DeploymentGroupInProgressGrid._variableItemSizeCss;

            for (let key of variableSizingGridSizes) {
                if (itemListLength <= key) {
                    const gridProperties = variableSizingGridPropertiesMap.get(key);

                    variableSizingGridClassName = css(variableSizingGridClassName, gridProperties.variableSizingGridClassName);
                    variableSizingItemClassName = css(variableSizingItemClassName, gridProperties.variableSizingItemClassName);
                    gridRowSize = gridProperties.gridRowSize;
                    break;
                }
            }
        }

        let itemsContent = this._getItemsContent(items, gridRowSize, variableSizingItemClassName);

        // This is for adjusting single and double rows on canvas.
        if (!this.props.variableSizing) {
            if (itemListLength <= gridRowSize) {
                containerClassName = "single-row";
            }
            else if (itemListLength <= (gridRowSize * 2)) {
                containerClassName = "double-row";
            }
            else if (itemListLength > this.props.maxGridSize) {
                extraMachineCountContent = this._getExtraMachineCountContent();
            }
        }

        return <FocusZone className={css("deployment-groups-progress-grid", variableSizingGridClassName)}>
            <div className={css("deployment-groups-progress-grid-container", containerClassName)}>
                {itemsContent}
                {extraMachineCountContent}
            </div>
        </FocusZone>;
    }

    private _getVariableSizingGridPropertiesMap() {
        let variableSizingGridPropertiesMap = new Map();

        // Removing usage of 2 largest sizes for now
        /*variableSizingGridPropertiesMap.set(DeploymentGroupInProgressGrid._maxItemCountXXL, {
            variableSizingGridClassName: "",
            variableSizingItemClassName: "item-size-xxl",
            gridRowSize: 4
        });

        variableSizingGridPropertiesMap.set(DeploymentGroupInProgressGrid._maxItemCountXL, {
            variableSizingGridClassName: "",
            variableSizingItemClassName: "item-size-xl",
            gridRowSize: 7
        });*/

        variableSizingGridPropertiesMap.set(DeploymentGroupInProgressGrid._maxItemCountL, {
            variableSizingGridClassName: "",
            variableSizingItemClassName: "item-size-l",
            gridRowSize: 9
        });

        variableSizingGridPropertiesMap.set(DeploymentGroupInProgressGrid._maxItemCountM, {
            variableSizingGridClassName: "",
            variableSizingItemClassName: "item-size-m",
            gridRowSize: 14
        });

        variableSizingGridPropertiesMap.set(DeploymentGroupInProgressGrid._maxItemCountS, {
            variableSizingGridClassName: "variable-grid-wider",
            variableSizingItemClassName: "item-size-s",
            gridRowSize: 22
        });

        return variableSizingGridPropertiesMap;
    }

    private _getExtraMachineCountContent() {
        let extraCount = this.props.items.length - this.props.maxGridSize;

        // We need to account for the tiles being hidden by the extra machine count being shown
        if (extraCount >= 100) {
            // In case the extra count consists of 3 digits, 2 tiles will be hidden
            extraCount += 2;
        }
        else {
            // Only one tile is hidden otherwise
            extraCount++;
        }

        return <div className="extra-machine-count-container">
            <div className="extra-machine-fadeout"></div>
            <div className="extra-machine-count">{"+" + (extraCount)}</div>
        </div>;
    }

    private _getItemListkey(totalItems: number, runningItems: number, itemKeyIndex: number) {
        return "total-" + totalItems + "-running-" + runningItems + "-keyIndex-" + itemKeyIndex;
    }

    private _getItemsContent(items: IDeploymentGroupGridItemContent[], gridRowSize: number, variableSizingItemClassName: string) {
        let gridItemCounter = -1;
        let itemkeyIndex: number = 0;

        return items.map((item) => {
            let cssClass = null;
            let divStyle = null;
            let bowtieIconElement = null;
            let machineName = null;
            let jobStatusText: string = null;

            gridItemCounter++;
            
            if (item) {
                if (item.jobState) {
                    jobStatusText = ReleasePhaseHelper.getJobStatus(item.jobState).status;

                    switch (item.jobState) {
                        case JobStates.Succeeded:
                            cssClass = "phase-completed";

                            if (this.props.variableSizing) { 
                                bowtieIconElement = <div className={"bowtie-icon machine-status-icon bowtie-check-light"}/>;
                            }

                            break;

                        case JobStates.PartiallySucceeded:
                            cssClass = "phase-partially-succeeded";

                            bowtieIconElement = <div className={"bowtie-icon machine-status-icon bowtie-status-warning-outline"}/>;

                            break;

                        case JobStates.InProgress:
                            // In order to create a ripple effect on the in-progress items for a given row (7 items by default),
                            // we add a gradually increasing animation delay property with a differential of 300ms.

                            let animationDelayValue = ((gridItemCounter % gridRowSize)
                                * DeploymentGroupInProgressGrid._animationDelayMs);

                            divStyle = {
                                animationDelay: "" + animationDelayValue + "ms"
                            };

                            cssClass = "phase-running";

                            if (this.props.variableSizing) { 
                                bowtieIconElement = <div className={"bowtie-icon machine-status-icon bowtie-play"}/>;
                            }

                            break;

                        case JobStates.Failed:
                        case JobStates.Cancelled:
                        case JobStates.Cancelling:
                            cssClass = "phase-failed";

                            bowtieIconElement = <div className={"bowtie-icon machine-status-icon bowtie-edit-remove"}/>;

                            break;

                        case JobStates.Skipped:
                            cssClass = "phase-skipped";

                            break;

                        default:
                            cssClass = "phase-empty";

                            if (this.props.variableSizing) { 
                                bowtieIconElement = <div className={"bowtie-icon machine-status-icon bowtie-status-waiting"}/>;
                            }

                            break;
                    }
                }
                else {
                    cssClass = "phase-empty";
                }

                if (item.machineName) {
                    machineName = item.machineName;
                }
            }

            itemkeyIndex++;

            let itemListkey = this._getItemListkey(this.props.items.length, this.props.runningItemCount, itemkeyIndex);
            let id = "agent-job-status-hidden-text-id" + Utils_String.generateUID();

            if (this.props.variableSizing) {
                return <TooltipHost key={itemListkey} content={machineName} directionalHint={DirectionalHint.bottomCenter}>
                    <div key={itemListkey} role="link" data-is-focusable="true" aria-label={machineName} aria-describedby={id} className={css("phase-item", cssClass, variableSizingItemClassName)} style={divStyle} onClick={Utils_Core.curry(this._onGridMachineClick, machineName, item.jobState)}> 
                        {bowtieIconElement}
                    </div>
                    <div id={id} className="hidden">{jobStatusText}</div>
                </TooltipHost>;
            }
            else {
                return <div key={itemListkey} className={css("phase-item", cssClass)} style={divStyle}>
                    {bowtieIconElement}
                </div>;
            }
        });
    }

    @autobind
    private _onGridMachineClick(machineName: string, machineState: string): void {
        this._publishMachineClickTelemetry(machineState);

        NavigationService.getHistoryService().addHistoryPoint(ReleaseProgressNavigateStateActions.ReleaseEnvironmentDeploymentGroupLogs, { environmentId: this.props.environmentId, deploymentGroupPhaseId: this.props.deploymentGroupPhaseId, agentName: machineName }, null, false, true);
    }

    private _publishMachineClickTelemetry(machineState: string): void {
        let eventProperties: IDictionaryStringTo<any> = {};

        eventProperties[Properties.MachineState] = machineState;

        Telemetry.instance().publishEvent(Feature.DeploymentGroupPhaseView, eventProperties);
    }

    // Constants
    private static readonly _animationDelayMs = 300;

    private static readonly _variableGridSizeCss = "variable-grid-size";
    private static readonly _variableItemSizeCss = "variable-item-size";

    private static readonly _maxItemCountXXL = 10;
    private static readonly _maxItemCountXL = 25;
    private static readonly _maxItemCountL = 50;
    private static readonly _maxItemCountM = 100;
    private static readonly _maxItemCountS = 2000; // 2000 here is just a placeholder value for the max grid size
}