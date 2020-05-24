import * as Q from "q";

import { KanbanTimeChart } from "Widgets/Scripts/KanbanTime/KanbanTimeChart";
import * as KanbanTimeChartContracts from "Widgets/Scripts/KanbanTime/KanbanTimeContracts";

import { MoreInfoControl, MoreInfoOptions } from "Presentation/Scripts/TFS/TFS.UI.Controls.MoreInfoControl";

import * as ItemListControl from "Widgets/Scripts/Shared/ItemListControl";
import * as NumberDisplayControl from "Widgets/Scripts/Shared/NumberDisplayControl";
import * as WorkItemTypeIconControl from "Presentation/Scripts/TFS/Components/WorkItemTypeIcon";
import { WorkItemTypeColorAndIconsProvider, IColorAndIcon } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import * as Resources_Widgets from "Widgets/Scripts/Resources/TFS.Resources.Widgets";

import * as PopupContent from "VSS/Controls/PopupContent";
import * as Controls from "VSS/Controls";

export interface KanbanTimeControlOptions extends KanbanTimeChartContracts.KanbanTimeChartOptions {
    /**
     * When widget's width is <= width of a widget with columnspan 2, hide filter control
     */
    hideFilterControlUntilWidth: number;
}

export class KanbanTimeControl extends Controls.Control<KanbanTimeControlOptions> {
    private workItemFilter: ItemListControl.ItemListControl;
    private averageDay: NumberDisplayControl.NumberDisplayControl;
    private kanbanChart: KanbanTimeChart;
    private topLayerHeight: number = 60;  // 60 px text height + padding
    private averageDayDisplaySpace: number = 180; // a rough space that is enough for the average display
    private chartRightMargin: number = 10; // 5px for the left padding on this control and 5px more for the margin
    private latestChartOptions: KanbanTimeChartContracts.KanbanTimeChartOptions;
    private $chartContainer: JQuery;
    private $averageControlContainer: JQuery;
    private $itemListContainer: JQuery;
    private $infoTooltipSpan: JQuery;
    private $headerContainer: JQuery;
    private $totalWorkItemCount: number;

    constructor(options: KanbanTimeControlOptions) {
        super($.extend({
            coreCssClass: "kanban-time-control"
        },
        options));
    }

    /**
     * Resize the existing control to a new height and width (in px)
     */
    public resize(height: number, width: number) {
        // We don't want to redraw the entire control.. so we are resizing the container and then resize the itemList.
        // Then we recreate the chart again
        this.getElement().css("width", width);
        this.getElement().css("height", height);
        this.workItemFilter.renderSize(
        <ItemListControl.SizeOptions>{
            height: this.topLayerHeight,
            width: width - this.averageDayDisplaySpace,
        },
        true);

        this.$chartContainer.empty();
        this.latestChartOptions.height = height - this.topLayerHeight;
        this.latestChartOptions.width = width - this.chartRightMargin;

        if (this.shouldHideFilterControl(width)) {
            this.$itemListContainer.hide();
        } else {
            this.$itemListContainer.show();
        }

        this.kanbanChart = KanbanTimeChart.create(
            KanbanTimeChart,
            this.$chartContainer,
            this.latestChartOptions
        );
        this.kanbanChart.drawWhenDataIsReady();
    }

    /**
     * Filter the existing chart with the work item types selection.
     * Item selection control will not be update
     * @param selections - the work item types
     */
    public filterChart(selections: ItemListControl.CountFilterItem[]): void {
        if (selections) {
            let workItemTypes: string[] = [];

            if (selections.length == 0) {
                // If the selection is empty.. user reset the selection
                workItemTypes = this._options.workItemTypes;
            } else {
                selections.forEach(selection => workItemTypes.push(selection.label));
            }

            this.$chartContainer.empty();
            this.latestChartOptions.workItemTypes = workItemTypes;
            this.latestChartOptions.animate = false;
            this.kanbanChart = KanbanTimeChart.create(
                KanbanTimeChart,
                this.$chartContainer,
                this.latestChartOptions
            );
            this.kanbanChart.drawWhenDataIsReady().then(
            (data: KanbanTimeChartContracts.ChartData) => {
                // Update the new average days
                this.averageDay.setCount(data.averageKanbanTime);
            });
        }
    }

    /**
     * Render the control, which with redraw all the components.
     */
    public render(animated: boolean): IPromise<void> {
        this.latestChartOptions = {
            height: this._options.height - this.topLayerHeight,
            width: this._options.width - this.chartRightMargin,
            startDate: this._options.startDate,
            workItemTypes: this._options.workItemTypes,
            backlogCategory: this._options.backlogCategory,
            teamIds: this._options.teamIds,
            timeType: this._options.timeType,
            animate: animated,
            timeoutMs: this._options.timeoutMs,
        } as KanbanTimeChartContracts.KanbanTimeChartOptions;

        if (this._options.onClick != null) {
            this.latestChartOptions.onClick = this._options.onClick;
        }

        this.preparedControlsLayout();

        // Don't show the header until the data is fully populated
        this.$headerContainer.css("visibility", "hidden");

        this.initializeControls();

        if (this.shouldHideFilterControl(this._options.width)) {
            this.$itemListContainer.hide();
        }

        return this.kanbanChart.drawWhenDataIsReady()
            .then((data: KanbanTimeChartContracts.ChartData) => {
                if (data == null) {
                    this.$headerContainer.hide();
                    return Q<void>(null);
                }

                this.averageDay.setCount(data.averageKanbanTime);
                let workItemsList: ItemListControl.CountFilterItem[] = [];
            	data.workItemTypeStats.forEach((item: KanbanTimeChartContracts.WorkItemTypeStats) => {
                    workItemsList.push({
                        color: item.color,
                        value: item.count,
                        label: item.workItemType,
                        icon: item.icon
                    });
                });
                this.workItemFilter.setItems(workItemsList);
                this.workItemFilter.renderSize({
                    height: this.topLayerHeight,
                    width: this._options.width - this.averageDayDisplaySpace,
                });
            	// We are going to show the tooltip info when the totalWorkItem count is greater than the default limit
                if (data.totalWorkItemCount > KanbanTimeChart.MAX_WORKITEM) {
                    this.$infoTooltipSpan.css("display", "block");
                }

                this.latestChartOptions.yAxisMinMax = data.yAxisMinMax;

                // Show the header now that the data is fully populated
                this.$headerContainer.css("visibility", "visible");
                return Q<void>(null);
            })
            .then<void>(null, e => Q.reject(e));
    }

    /**
     * If widget's width is small, returns true to hide filter
     */
    private shouldHideFilterControl(width: number): boolean {
        return width <= this._options.hideFilterControlUntilWidth;
    }

    private preparedControlsLayout(): void {
        this.$averageControlContainer = $("<div>").addClass("average-control-container");
        this.$itemListContainer = $("<div>").addClass("item-filter-list-container");
        this.$headerContainer = $("<div>").addClass("top-level")
            .append(this.$averageControlContainer)
            .append(this.$itemListContainer)
            .appendTo(this.getElement());

        this.$chartContainer = $("<div>").addClass("chart-item")
            .appendTo(this.getElement());
    }

    private initializeControls(): void {
        this.averageDay = <NumberDisplayControl.NumberDisplayControl>Controls.BaseControl.createIn(
            NumberDisplayControl.NumberDisplayControl,
            this.$averageControlContainer,
            <NumberDisplayControl.NumberDisplayControlOptions>
            {
                count: null,
                unit: Resources_Widgets.KanbanTimeControl_AverageDay,
                description: this._options.timeType === KanbanTimeChartContracts.KanbanTimeType.Lead
                    ? Resources_Widgets.KanbanTime_LeadTime_SubTitle
                    : Resources_Widgets.KanbanTime_CycleTime_SubTitle,
            }
        );

        this.workItemFilter = <ItemListControl.ItemListControl>Controls.BaseControl.createIn(
            ItemListControl.ItemListControl,
            this.$itemListContainer,
            <ItemListControl.ItemListControlOptions>{
                maxNumberDigit: 3,
                onSelectionChanged: (selection: ItemListControl.CountFilterItem[]) => {
                    this.filterChart(selection);
                },
                colorAndIconDrawer: (container: JQuery, color: string, icon: string, tooltip?: string)=> {
                    if(container)
                    {
                        container.css("top", "16px");
                        WorkItemTypeIconControl.renderWorkItemTypeIcon(container[0], "", {color: color, icon: icon}, {tooltip: tooltip} as WorkItemTypeIconControl.IIconAccessibilityOptions);
                    }
                },
                marginForColorAndIcon: "20px"
            }
        );

        this.kanbanChart = KanbanTimeChart.create(
            KanbanTimeChart,
            this.$chartContainer,
            this.latestChartOptions
        );

        let moreInfoControl = Controls.Control.create<MoreInfoControl<MoreInfoOptions>, MoreInfoOptions>(MoreInfoControl, this.getElement(), {
            tooltipText: Resources_Widgets.KanbanTime_TooManyWorkItemTooltip,
            ariaLabelText: Resources_Widgets.KanbanTime_TooManyWorkItemsAriaLabel
        });
        this.$infoTooltipSpan = moreInfoControl.getElement();
    }
}
