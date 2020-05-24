/**
 * Class to declare constants pertaining to the Monte Carlo Widget
 */
export class MonteCarloConstants {
    // Note: This was traditionally associated with the config consumer, but this pattern is muddied with the re-use scenario across widgets.
    public static readonly featureName: string = "MonteCarloWidget";

    /** Used to identify Analytics Service traffic requested by this widget in Kusto */
    public static readonly command: string = "MonteCarlo";

    public static readonly targetError: number = 0.02;

    public static readonly maxNumberOfWorkItemsToForecast: number = 250;
};