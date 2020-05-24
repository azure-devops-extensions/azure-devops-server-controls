import {CommonChartOptions, ChartTypesConstants, DataPoint, ClickEvent, LegendClickEvent, TooltipLineItem, TooltipLineItemMarkerType } from 'Charts/Contracts';
import { WorkItemStateCategory } from 'Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service';
import { Iteration } from 'Analytics/Scripts/CommonClientTypes';
import Resources = require('Widgets/Scripts/Resources/TFS.Resources.Widgets');
import { Metastate, Work } from 'Widgets/Scripts/Velocity/VelocityDataContract';
import { CommonChartInputs, ChartOptionFactoryBase } from 'Widgets/Scripts/ModernWidgetTypes/ChartOptionFactoryBase';
import { WidgetLinkHelper } from 'Widgets/Scripts/WidgetLinkHelper';
import Utils_Number = require("VSS/Utils/Number");

export interface VelocityChartClickEventData {
    iteration: Iteration;
    stateName: string;
    valueAtPoint: number;
}

export interface IHandleVelocityChartEvents {
    handleChartClick: (clickEvent: VelocityChartClickEventData) => void;
    handleLegendClick: () => void;
}

export interface VelocityChartInputs extends CommonChartInputs{
    suppressAnimations?: boolean;
    isAdvancedChart: boolean;
    allowChartClicks: boolean;

    velocityClickHandler: IHandleVelocityChartEvents;
    iterations: Iteration[];
    metastateResult: Metastate[];
    completedLateResult?: Metastate[];
    plannedWorkByDayResult?: Work[];
}
/**
 * Takes relevant analytics data, and generates pertinent chart options for rendering by common ChartComponent.
 */
export class VelocityChartOptionFactory extends ChartOptionFactoryBase<VelocityChartInputs>{
    //Stack group identifiers are merely used as distinguishing tokens in the Chart. Each separate stack group name gets rendered in it's own stack, visually.
    private static readonly startIterationStackGroup = "start";
    private static readonly endIterationStackGroup = "end";

    public createChartOptions(velocityChartInputs: VelocityChartInputs): CommonChartOptions {
        return velocityChartInputs.isAdvancedChart?
            this.renderAdvanced(velocityChartInputs):
            this.renderSimple(velocityChartInputs);
    }

    private renderSimple(velocityChartInputs: VelocityChartInputs): CommonChartOptions {
        var completedChartData: number[] = [];
        var completedLateChartData: number[] = [];
        var incompleteChartData: number[] = [];
        var iterationNames: string[] = [];
        let userHasClickPermission = WidgetLinkHelper.canUserAccessWITQueriesPage() && velocityChartInputs.allowChartClicks;

        velocityChartInputs.iterations.map((iteration: Iteration, index: number) => {
            iterationNames.push(iteration.IterationName);

            completedChartData[index] = 0;
            incompleteChartData[index] = 0;
            completedLateChartData[index] = 0;

            if (velocityChartInputs.completedLateResult != null) {
                velocityChartInputs.completedLateResult.map((result: Metastate) => {
                    if (iteration.IterationSK === result.IterationSK) {
                        completedLateChartData[index] = result.AggregationResult;
                    }
                });
            }

            velocityChartInputs.metastateResult.map((metastate: Metastate) => {
                if (iteration.IterationSK === metastate.IterationSK) {
                    if (metastate.StateCategory === WorkItemStateCategory[WorkItemStateCategory.Completed]) {
                        completedChartData[index] = metastate.AggregationResult - completedLateChartData[index];
                    } else if (metastate.StateCategory === WorkItemStateCategory[WorkItemStateCategory.InProgress]) {
                        incompleteChartData[index] = metastate.AggregationResult;
                    }
                }
            });
        });

        let options = {
            chartType: ChartTypesConstants.StackedColumn,
            series: [{
                name: Resources.VelocityChart_Completed_StateName,
                data: completedChartData,
                color: "#107c10"
            },
            {
                name: Resources.VelocityChart_Incomplete_StateName,
                data: incompleteChartData,
                color: "#0078d4"

            }],
            xAxis: {
                labelValues: iterationNames
            },
            tooltip:{
                customTooltipMapping: VelocityChartOptionFactory.customTooltipMapping
            },
            legendClick:(legendClickEvent: LegendClickEvent) => velocityChartInputs.velocityClickHandler.handleLegendClick(),
            suppressAnimation: velocityChartInputs.suppressAnimations
        } as CommonChartOptions;

        if (userHasClickPermission) {
            options.click = (clickEvent: ClickEvent) => VelocityChartOptionFactory.handleClick(velocityChartInputs.velocityClickHandler, clickEvent, velocityChartInputs.iterations)
        }

        if (velocityChartInputs.completedLateResult != null) {
            options.series.splice(1, 0, {
                name: Resources.VelocityChart_CompletedLate_StateName,
                data: completedLateChartData,
                color: "#8DC54B"
            });
        }

        return options;
    }

    public renderAdvanced(velocityChartInputs: VelocityChartInputs): CommonChartOptions {
        var plannedWorkChartData: number[] = [];

        velocityChartInputs.iterations.map((iteration: Iteration, index: number) => {
            plannedWorkChartData[index] = 0;
            velocityChartInputs.plannedWorkByDayResult.map((result: Work) => {
                if (iteration.IterationSK === result.IterationSK) {
                    plannedWorkChartData[index] = result.AggregationResult;
                }
            });
        });

        let options = this.renderSimple(velocityChartInputs);

        // Augment with grouping
        options.series.forEach(series => { series.stackGroup = VelocityChartOptionFactory.endIterationStackGroup });

        // Add planned work series
        options.series.unshift({
            name: Resources.VelocityChart_Planned_StateName,
            data: plannedWorkChartData,
            stackGroup: VelocityChartOptionFactory.startIterationStackGroup,
            color: "#86CCDE"
        });

        return options;
    }

    /***
     * Interprets the chart click event details into semantically relevant format.
     */
    private static handleClick(clickHandler: IHandleVelocityChartEvents, clickEvent: ClickEvent, iterations: Iteration[]){
        let statename = clickEvent.seriesName; //This is one of the localized VelocityChart stateNames
        let iterationPosition = clickEvent.seriesDataIndex; //This corresponds to the position of the iteration in the list.
        let iteration = iterations[iterationPosition];

        clickHandler.handleChartClick({
            stateName: statename,
            iteration: iteration,
            valueAtPoint: clickEvent.itemY
        });
    }

    private static customTooltipMapping(points: DataPoint[]): TooltipLineItem[] {
        return points.map<TooltipLineItem>(point => {

            const roundedVal = Math.round(+point.values[0]*10)/10;
            const localedNumber = Utils_Number.toDecimalLocaleString(roundedVal);

            return {
                styleType: {
                    color: point.color,
                    type: TooltipLineItemMarkerType.Square
                },
                text: `${point.seriesName}: ${localedNumber}`
            };
        });
    }
}