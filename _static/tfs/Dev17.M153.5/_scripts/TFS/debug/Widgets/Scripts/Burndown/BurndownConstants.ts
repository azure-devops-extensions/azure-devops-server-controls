/**
 * Class to declare constants pertaining to the Burndown Widget
 */
export class BurndownConstants {
    // Note: This was traditionally associated with the config consumer, but this pattern is muddied with the re-use scenario across widgets.
    public static readonly featureName: string = "BurndownWidget";

    /** Used to identify Analytics Service traffic requested by this widget in Kusto */
    public static readonly command: string = "Burndown";

    public static readonly remainingEffortSeriesColor = "#0078d4";
    public static readonly completedEffortSeriesColor = "#107c10";
    public static readonly burnTrendLineColor = "#9D9D9D";
    public static readonly scopeTrendLineColor = "#FFA438";
    public static readonly forecastAnnotationOutsideChartLabelColor = "#a80000";
};