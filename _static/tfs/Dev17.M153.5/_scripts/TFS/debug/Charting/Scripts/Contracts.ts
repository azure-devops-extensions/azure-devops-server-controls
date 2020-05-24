///<summary>Contracts Namespace for reusable Charts in VSO.
///This file contains UI agnostic declarations of charting interfaces.</summary >

/// <reference types="jquery" />

//Very early Tentative Contract

export interface ChartClickEventArgs {
    //TODO: Expose selectedDate as optional output (for trend charts)

    /**Exposes the grouping properties (if any), being clicked on, in terms of distinguishing values e.g. series data which was supplied */
    selectedSample?: string[];

    /** Current chart target clicked, e.g. column clicked or line clicked */
    target?: string;

    /** Exposes the value of the sample being clicked on.*/
    value?: number;

    /** Custom data associated with main data **/
    // This is expected to be returned along with normal value as part of click event.
    // This can be type-casted by the client as appropriate
    customData?: any;
}

//Very early tentative contract
export interface ChartErrorEventArgs {
    errorMessage: string;
}

/** Customize tooltip */
// This interface will expand as we provide more configurability to the users.
export interface TooltipOptions {
    enabled: boolean;
}

/** Customize data labels */
// This interface will expand as we provide more configurability to the users.
export interface DataLabelOptions {
    enabled: boolean;
    layout?: string;
}

/** Strongly typed contract for configuring chart controls */
export interface ChartOptions {

    /** Control Width, expressed in pixels */
    width?: number;

    /** Control Height, expressed in pixels */
    height?: number;

    /** Customize tooltips for the chart */
    tooltipOptions?: TooltipOptions;

    /** Cutomize data labels for the chart */
    dataLabelOptions?: DataLabelOptions;
    
    /** Produced during clicks anywhere within the chart body, including the background, but not including the axes.
    * This is relevant for use when providing a general interest "lightbox" view.
    */
    onBodyClick?: () => void;
    
    /** Produced during clicks on specific chart elements
     * This is relevant for navigation/drill down behaviors, which act on particular data
     */
    onDataClick?: (event: ChartClickEventArgs) => void;
    onFail?: (event: ChartErrorEventArgs) => void; //Note: Consumer has opportunity to represent failures to load/render.
}

export interface DataPoint {

    /** Indicates the  series name of the data point.*/
    name: string;

    /** Indicates the numerical value of the data point. */
    value: number;
}

export interface DataSeries {

    /** Name of the data series */
    name: string;

    /** data values for the series. Type is set to any so that custom data can be passed in the same */
    data: number[];

    /** custom data values for the series that can be passed along with data. These can be accessed as part click event, etc. later */
    // Make sure that the data and customData arrays are aligned in sequence and length otherwise some of the customData values will be truncated or marked undefined
    customData?: any[];

    /** Optional color for the series */
    color?: string;
}

/** Indicates a data point for a PieChart */
export interface PieChartDataPoint extends DataPoint {

    /** Optional color for the data */
    color?: string;
}

/** Options for rendering Pie chart */
export interface PieChartOptions extends ChartOptions {

    data: PieChartDataPoint[];

    /** Used for do-nut charts to represent the radius of the inner circle as a percentage of the outer circle. Defaults to 0% */
    innerSizePercentage?: string;

    /** size of chart as percentage of the container element **/
    // Default value is 100%
    size?: string;
    
    /** Distance between outer edge of the chart and the content. The numbers represent top, right, bottom, left. */
    // Note: This looks like a generic attribute for all charts. However, this is not used for other controls except Pie. If
    // more controls start using it, this could be moved to ChartOptions.
    // Default spacing is [0, 0, 0, 0]
    spacing?: number[];

    /** Margin between the container and the chart control **/
    // Note: This looks like a generic attribute for all charts. However, this is not used for other controls except Pie. If
    // more controls start using it, this could be moved to ChartOptions.
    // Default margin is [0, 0, 0, 0]
    margin?: number[];

    /** Indicates if the default hover behavior is enabled */
    enableHover?: boolean;
}

export interface AxisOptions {

    /** Indicates the options for the title of the axis */
    title?: AxisTitleOptions;

    /** Indicates the options for the labels in the axis. This is not meant for specifying label values */
    labels?: AxisLabelOptions;

    /** Indicates if the axis is visible. Defaults to true */
    visible?: boolean;
}

export enum AxisDataType {
    
    /** Represents data where properties are grouped by categories
        Eg.:
            Build Number | Pass Percent | Failure Count
            -------------------------------------------
            Build.1      |   99         |   2
            Build.2      |   98         |   4
            Build.3      |  100         |   0 
            Build.4      |  95          |   10

        "Pass Percent" and "Failure Count" are grouped by "Build Number" category.
     */
    Categorical,

    /** Represents time stamped properties 
        Eg.
            UTC Date     | Pass Percent | 
            -------------------------------
            12/1/2015    |   99         | 
            12/2/2015    |   98         | 
            12/3/2015    |  100         | 
            12/4/2015    |   95         |  
    */
    TimeSeries
}

export interface XAxisOptions extends AxisOptions {

    /** Indicates the x-axis data type */
    dataType: AxisDataType;
}

export enum YAxisPlacement {

    /** Left of the chart */
    Left,

    /** Right of the chart */
    Right
}

export enum NumericalScaleMode {
    /** Integer numbers */
    Integer,

    /** Floating point numbers */
    Float
}

export interface YAxisOptions extends AxisOptions {

    /** Minimum value of the axis */
    min?: number;

    /** Maximum value of the axis */
    max?: number;

    /** Orientation of the y-axis */
    placement?: YAxisPlacement;

    /** Type of scale in which y-axis is divided */
    scaleMode?: NumericalScaleMode;
}

export interface AxisTitleOptions {

    /** Actual text for the title */
    text: string;

    /** Styling for the title */
    style?: AxisStyleOptions;
}

export interface AxisStyleOptions {

    color?: string;
}

export interface AxisLabelOptions {

    /** Provides a way to format the axis labels. For instance, if a label for value 20 is to be shown as 20%, then the 
        format has to be {value}% */
    format?: string;

    style?: AxisStyleOptions;

    /** Indicates if the axis labels are visible */
    enabled?: boolean;
}

/** Represents data that involves multiple dimensions of grouping based on categories:
   
    Example:    

    Build Number | Pass Percent | Failure Count
    -------------------------------------------
    Build.1      |   99         |   2
    Build.2      |   98         |   4
    Build.3      |  100         |   0 
    Build.4      |  95          |   10
    
    This data is represented as 

    categories: ["Build.1", "Build.2", "Build.3", "Build.4"]
    data: [ 
            { 
              name: "Pass Percent",
              data: [99, 98, 100, 95]
            },
            {
               name: "Failure Count",
               data: [2, 4, 0, 10]
            }
          ]

    you can also send some custom data like below
    categories: ["Build.1", "Build.2", "Build.3", "Build.4"]
    data: [ 
            { 
              name: "Pass Percent",
              data: [99, 98, 100, 95],
              customData: [buildObj99, buildObj98, buildObj100, buildObj95]
            },
            {
               name: "Failure Count",
               data: [2, 4, 0, 10]
              customData: [buildObj2, buildObj4, buildObj0, buildObj10]
            }
          ]
     
    The values in the inner data array is mapped to the corresponding keys based purely on the order of data.
    More data values that keys are ignored and less data values than keys are backfilled with zeros.
*/
export interface CategoricalData {

    /** Indicates the data values representing the set the keys. This will be used as x-Axis data */
    categories?: string[];

    data: DataSeries[]
}

/** Represents data that involves grouping based on timeseries:
   
    Example:    

    UTC Date     | Pass Percent | 
    -------------------------------
    12/1/2015    |   99         | 
    12/2/2015    |   98         | 
    12/3/2015    |  100         | 
    12/4/2015    |   95         |           
    
    This data is represented as 

    data: [ 
            ["12/1/2015", 99],
            ["12/1/2015", 98],
            ["12/1/2015", 100],
            ["12/1/2015", 95]
          ]
*/
export interface TimeSeriesData {

    /** Name of the time series */
    name: string;

    /** Timestamped values. Used string for timestamp mainly for simplicity.
        The javascript function Date.parse() will be used to parse the string.
     */
    data: [string, number][];

    /** Timestamped custom data values. These can be used to pass in custom data associated with the original data.
        This information can be retrieved from highchart library
    */
    customData?: any[];

    /** Optional color */
    color?: string;
}

/** Options for the following chart types for both categorical and time series plotting:
    1. Column charts
    2. Bar charts
    3. Line charts
*/
export interface DataSeriesChartOptions extends ChartOptions {

    /** Options to configure x-Axis */
    xAxis?: XAxisOptions;

    /** Options to configure y-Axis */
    yAxis?: YAxisOptions;

    /** Data series representation for both categorical and time series data */
    series: CategoricalData | TimeSeriesData[];
}

export interface ColumnChartOptions extends DataSeriesChartOptions {
}

export interface LineChartOptions extends DataSeriesChartOptions {
}

/** Options for Column and Line chart combo. The x-Axis specified in column chart is considered.
    The x-Axis specified in line chart is ignored. */
/* Combo chart can be defined in a lot of ways. We could define a generic combo chart that 
   can be used to combine arbitary kind of charts. We can revisit that model, if we need that
   flexibility in the future. Till then, we will just support specific combinations only */
export interface ColumnLineComboChartOptions extends ChartOptions {
    
    /** Options for column chart */
    columnChartOptions: ColumnChartOptions;

    /** Options for line chart */
    lineChartOptions: LineChartOptions;
}
