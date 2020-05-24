export class ChartLimiter {

    public static defaultSeriesLimit: number = 1;
    public static defaultGroupByLimit: number = 1;
    public static defaultHorizontalLegendRowCount: number = 3;

    public static widthPerLegendItem: number = 100;
    public static heightPerLegendItem: number = 16;
    public static heightRowItem: number = 20;
    public static widthPerColumnItem: number = 40;

    //Number of cells which are reserved for "other" group in peak element scenarios
    public static otherItemReservation: number = 1;

    //Standard "dead" space which is not available for rendering
    public static reservedHorizontalSpaceForCols: number = 50;
    public static reservedVerticalSpaceForRows: number = 40;
    public static reservedVerticalSpaceForLegend: number = 36;

    public static defaultLegendHeight: number = ChartLimiter.defaultHorizontalLegendRowCount * ChartLimiter.heightRowItem;
    public static reservedHorzontalSpaceForLegend: number = 160;

    /**
     * Determines the allowable number of elements for presentation in a horizontal legend.
     * @param width
     * @param rowCount
     */
    public static getHorizontalLegendElements(
        width: number,
        rowCount: number = ChartLimiter.defaultHorizontalLegendRowCount): number {

        return Math.max(0, Math.floor(width / ChartLimiter.widthPerLegendItem) * rowCount - ChartLimiter.otherItemReservation);
    }

    /**
     * Determines the allowable number of elements for presentation in a vertical legend.
     * @param height
     */
    public static getVerticalLegendElements(height: number): number {
        var availableWidth = Math.max(0, height - ChartLimiter.reservedVerticalSpaceForLegend);
        return Math.max(0, Math.floor(availableWidth / ChartLimiter.heightPerLegendItem) - ChartLimiter.otherItemReservation);
    }

    /**
     * Determines the allowed number of rows for views such as pivot table and bar chart
     * @param height
     */
    public static getAllowedRows(height: number,
        reservedVerticalSpace: number = ChartLimiter.reservedVerticalSpaceForRows): number {
        var availableWidth = Math.max(0, height - reservedVerticalSpace);
        return Math.max(0, Math.floor(availableWidth / ChartLimiter.heightRowItem) - ChartLimiter.otherItemReservation);
    }

    /**
     * Determines the allowed number of columns for views such as pivot table and column chart
     * @param height
     */
    public static getAllowedColumns(width: number,
        reservedHorizontalSpace: number = ChartLimiter.reservedHorizontalSpaceForCols): number {
        var availableHeight = Math.max(0, width - reservedHorizontalSpace);
        return Math.max(0, Math.floor(availableHeight / ChartLimiter.widthPerColumnItem) - ChartLimiter.otherItemReservation);
    }
}