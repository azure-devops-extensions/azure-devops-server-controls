
/// <reference types="jquery" />

import VSS = require("VSS/VSS");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Service = require("VSS/Service");
import WebApi_RestClient = require("VSS/WebApi/RestClient");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Diag = require("VSS/Diag");
import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import Telemetry = require("VSS/Telemetry/Services");

// NOTE: This is an obsolete legacy client layer, predating genclient. New consumers can just use generated client.

/*
***************************************************************
       Simple Data types
***************************************************************
*/

class Constants {
    public static reportingArea: string = "Reporting";
    public static chartConfigurationLocation = "50FBD84E-398E-41DA-8688-9A3A7B0E602B";
    public static transformQueryLocation = "087D5EE8-AA33-4CD4-8E76-31FE747EAC7E";
    public static dataServiceCapabilitiesLocation = "81AA1F62-C70D-4356-BA6B-D8EE4BE4379C";
}

export interface INameLabelPair {
    ///<summary> Describes an invariant name + localized label pair for describing values in UI.</summary>
    name: string;
    labelText: string;
}

export interface IFieldInfo extends INameLabelPair {
    ///<summary> Describes a Field for use on a chart.</summary>
    isAggregatable: boolean;
    isGroupable: boolean;
}

export interface IChartMetadataProvider {
    beginGetMetadata(callback, errorCallback?);
    getPluralArtifactName(): string;
    getNumericalAggregationFunctions(): INameLabelPair[];
    getAggregatableFields(): INameLabelPair[];
    getGroupableFields(): INameLabelPair[];
    getRangeOptions(): INameLabelPair[];
}

//Note: Does the "fixed" nature of these constants mean that we don't need to expose the accepted values from server?
export class OrderDirection {
    /// <summary>Describes the property for ordering the data set</summary>
    public static none: string = "none";
    public static ascending: string = "ascending";
    public static descending: string = "descending";
}

export class OrderProperty {
    /// <summary>Describes the property determining data order</summary>
    public static useLabel: string = "label";
    public static useValue: string = "value";
    public static useDefault: string = "default"; //note: default is a reserved keywork
}

export class AggregationFunction {
    /// <summary>Aggregation function to apply to the dataset measure</summary>
    public static count: string = "count";
    public static sum: string = "sum";

    public static isCount(functionName: string) {
        return functionName === AggregationFunction.count;
    }
}

export interface IChartConfiguration {
    /// <summary>Chart configuration metadata defining a renderable chart</summary>
    chartId?: string;
    scope: string;
    groupKey: string;
    title: string;
    chartType: string;
    transformOptions: ITransformOptions;
    userColors?: IColorEntry[];
}

export interface ITransformOptions {
    /// <summary>Defines a means of filtering and transforming a dataset</summary>
    transformId?: string;
    filter: string;
    historyRange?: string;
    groupBy: string;
    series?: string;
    orderBy: IOrderBy;
    measure: IMeasure;
    filterContext?: any;
}

export interface IMeasure {
    /// <summary>The aggregating function to apply and which column should be aggregated in a data set</summary>
    propertyName: string;
    aggregation: string;
}

export interface IOrderBy {
    /// <summary>The ordering direction and property which determines the ordering</summary>
    direction: string;
    propertyName: string;
}

export interface IDataTable {
    /// <summary>A Data Structure for holding simple tabular data</summary>
    transform: ITransformOptions;
    data: IDataTableData[];
}

export interface IDataTableData {
    /// <summary>Contains nested key value pairs representing the data to be visualized</summary>
    key: string;
    value: IDataTableKVP[];
}

export interface IDataTableKVP {
    /// <summary>A key value pair</summary>
    key: string;
    value: number;
}

export interface IColorEntry {
    ///<summary>
    /// A key value pair for a user selected color preference. 
    /// Foreground color is omitted because it is mapped from matching background Color. 
    /// Invalid color selections are rejected as policy on server.
    ///</summary>
    value: string;
    backgroundColor: string;
}

export interface IDataServiceCapabilities {
    /// <summary>Describes the capabilities of the chart provider.</summary>
    scope: string;
    pluralArtifactName: string;
    historyRanges: INameLabelPair[];
    fields: IFieldInfo[];
    numericalAggregationFunctions: INameLabelPair[];
}

/*
*****************************************************************************
        Holding tank for Chart Telemetry calls
*****************************************************************************
*/


export class ChartTelemetry {

    // Area Identifier for telemetry
    static LIGHTWEIGHT_CHARTING_AREA: string = "LightWeightCharting";
    static LIGHTWEIGHT_CHARTPINNING_AREA: string = "LightWeightChartPinning";


    /// <summary>Exposes charting events for telemetry purposes.
    /// When revising this, make sure to review Telemetry schema with Dev, QA and Test for consistency and queryability.
    /// Badly shaped telemetry data is a pain to query on and expensive to process at current data scale.
    ///
    /// GUIDANCE:
    /// -Express time in seconds with decimals
    /// -Use consistent, feature agnostic names
    /// -Name the events in relation to when they actually arise, in terminology grokkable to the team
    /// -Do NOT pack conflicting kinds of data for the same event. This makes for garbage data and costlier queries.
    /// </ summary>

    public static OnModelReady(dataset: IDataTableData[]): void {
        //Track UI Details...
        var eventName = "ChartModelReady";

        var i: number, j: number, keyLength: number, valueLength: number;
        var row: IDataTableData;
        var dim1Len: number = dataset.length;
        var dim2Len: number;
        var maxGroupLength: number;
        var maxValueLength: number;


        //We're scanning the Chart Model data, for the sole purpose of UI Centric telemetry.    
        //If anything goes wrong here, it's not appropriate to disrupt the user experience.
        try {
            for (i = 0; i < dim1Len; i++) {
                row = dataset[i];
                keyLength = row.key.length;
                if (maxGroupLength > keyLength) {
                    maxGroupLength = keyLength;
                }

                dim2Len = row.value.length;
                for (j = 0; j < dim2Len; j++) {
                    keyLength = row.value[j].key.length;
                    if (maxGroupLength > keyLength) {
                        maxGroupLength = keyLength;
                    }
                    valueLength = 1 + Math.floor(Math.log(row.value[j].value) / Math.log(10));
                    if (maxValueLength > valueLength) {
                        maxValueLength = valueLength;
                    }
                }
            }
            var cidata: IDictionaryStringTo<any> =
                {
                    "MaxGroupLength": maxGroupLength, //What is the peak length of grouping Strings on all dimensions
                    "MaxValueLength": maxValueLength, // What is  the peak length of value strings on all dimensions
                    "Dimension1_Count": dim1Len, //Generally, the "Group" field
                    "Dimension2_Count": dim2Len, //Generally, the "Series" field
                };
            this.Publish(eventName, cidata);
        } catch (ex) {
        }
    }

    public static OnChartClientFailure(scope: string, errorType: string): void {
        //Used for tracking what kinds of errors users are actually seeing.
        var eventName = "ChartClientViewFailed";
        var cidata: IDictionaryStringTo<any> =
            {
                "Scope": scope,
                "ErrorType": errorType
            };
        this.Publish(eventName, cidata);
    }

    public static OnShowCharts(filterId: string, chartCount: number): void {
        var cidata: IDictionaryStringTo<any> = {
            "FlatQueryIdUsingCharts": filterId,
            "NoOfChartsPerQuery": chartCount,
        };
        var eventName = "ViewCharts";
        this.Publish("ViewCharts", cidata);
    }

    public static OnTransformResultsRecieved(scope: string, filterId: string, elapsedTimeMs: number, hasResults: boolean): void {
        var cidata: IDictionaryStringTo<any> = {
            "Scope": scope,
            "QueryId": filterId,
            "ElapsedTime": elapsedTimeMs,
            "NoResults": !hasResults
        };
        this.Publish("TransformQuery", cidata);
    }

    public static OnToggleChartPin(eventName: string, chartConfiguration: IChartConfiguration, teamId: string, callingLocation: string): void {
        var cidata: IDictionaryStringTo<any> = {
            "QueryId": chartConfiguration.transformOptions.filter,
            "ChartType": chartConfiguration.chartType,
            "HistoryRange": chartConfiguration.transformOptions.historyRange,
            "Scope": chartConfiguration.scope,
            "ColorPickerCount": (chartConfiguration.userColors ? chartConfiguration.userColors.length : 0),
            "UnpinLocation": callingLocation,
            "TeamId": teamId
        };

        //This line is different due to the mismatched namespace. :(
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(this.LIGHTWEIGHT_CHARTPINNING_AREA, eventName, cidata));
    }


    public static OnDeletingChart(chartConfiguration: IChartConfiguration): void {
        var cidata: IDictionaryStringTo<any> = {
            "QueryId": chartConfiguration.transformOptions.filter,
            "ChartType": chartConfiguration.chartType
        };
        this.Publish("DeleteChart", cidata);
    }


    public static PackEssentialConfigurationForTelemetry(configuration: IChartConfiguration): IDictionaryStringTo<any> {
        //Expose numbers and product defined options to guage popularity of choices. Only non-customizable choices for fields are foruse with telemetry.
        let cidata: IDictionaryStringTo<any> = {
            "ChartType": configuration.chartType,
            "ColorPickerCount": (configuration.userColors ? configuration.userColors.length : 0),

            "HistoryRange": configuration.transformOptions.historyRange,
            "Grouping_GroupBy": ChartTelemetry.RestrictToFirstPartyFields(configuration.transformOptions.groupBy),
            "Grouping_Series": ChartTelemetry.RestrictToFirstPartyFields(configuration.transformOptions.series),

            "Order_Mode": configuration.transformOptions.orderBy.propertyName,
            "Order_Direction": configuration.transformOptions.orderBy.direction,

            "Aggregation_Mode": configuration.transformOptions.measure.aggregation,
            "Aggregation_Field": ChartTelemetry.RestrictToFirstPartyFields(configuration.transformOptions.measure.propertyName)
        };
        return cidata;
    }

    // Used to pass just names of first party fields. Returns a constant to indicate presence of a custom field.
    private static RestrictToFirstPartyFields(fieldName: string){
        if(fieldName == null){
            return fieldName;
        }

        const lowerCasedName = fieldName.toLowerCase();
        //Restrict to field names with first party prefixes, and require presence of "." character, which is blocked for custom fields
        const allowField = (Utils_String.startsWith(lowerCasedName,"microsoft.") || Utils_String.startsWith(lowerCasedName,"system."));
        return allowField ? fieldName : "(CUSTOM)";
    }

    public static OnSavingChart(eventName: string, configuration: IChartConfiguration, inWidgetConfiguration = false): void {
        //Add charting specific aspects which are not relevant for common widget config scenarios.
        let cidata: IDictionaryStringTo<any> = $.extend(ChartTelemetry.PackEssentialConfigurationForTelemetry(configuration),
            {
                "Location": inWidgetConfiguration ? "WidgetConfiguration" : "ChartEditor",

                "ChartId": configuration.chartId,
                "groupKey": configuration.groupKey,
                "Scope": configuration.scope,

                "QueryId": configuration.transformOptions.filter
            });

        this.Publish(eventName, cidata);
    }

    private static Publish(eventName: string, cidata: IDictionaryStringTo<any>): void {
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(this.LIGHTWEIGHT_CHARTING_AREA, eventName, cidata));
    }
}

/*
*****************************************************************************
      Rest Service Implementation
*****************************************************************************
*/

// OBSOLETE - Use Generated REST Client for new Scenarios
export interface IDataServicesServer {

    beginPostChartConfiguration(
        projectNameOrId: string,
        configuration: IChartConfiguration,
        resultCallback: (newConfiguration: IChartConfiguration) => void,
        errorCallback?: IErrorCallback): void;

    beginPutChartConfiguration(
        projectNameOrId: string,
        configuration: IChartConfiguration,
        resultCallback?: (newConfiguration: IChartConfiguration) => void,
        errorCallback?: IErrorCallback): void;

    beginDeleteChartConfiguration(
        projectNameOrId: string,
        chartId: string,
        resultCallback?: IResultCallback,
        errorCallback?: IErrorCallback): void;

    beginGetChartConfiguration(
        projectNameOrId: string,
        chartId: string,
        resultCallback: (configurationResults: IChartConfiguration) => void,
        errorCallback?: IErrorCallback): void;

    beginGetChartConfigurations(
        projectNameOrId: string,
        scope: string,
        groupKey: string,
        resultCallback: (configurationResults: IChartConfiguration[]) => void,
        errorCallback?: IErrorCallback): void;

    beginPostTransformQuery(
        projectNameOrId: string,
        scope: string,
        transform: ITransformOptions[],
        resultCallback: (results: IDataTable[]) => void,
        errorCallback?: IErrorCallback): void;

    beginGetDataServiceCapabilities(
        scope: string,
        resultCallback: (results: IDataServiceCapabilities) => void,
        errorCallback?: IErrorCallback): void;
}

// OBSOLETE - Use Generated REST Client for new Scenarios
export class DataServicesHttpClient extends WebApi_RestClient.VssHttpClient {
    public beginPostChartConfiguration(projectNameOrId: string, configuration: IChartConfiguration) {
        return this._beginRequest({
            area: Constants.reportingArea,
            locationId: Constants.chartConfigurationLocation,
            httpMethod: 'POST',
            data: configuration,
            routeValues: {
                project: projectNameOrId
            }
        });
    }

    public beginPutChartConfiguration(projectNameOrId: string, configuration: IChartConfiguration) {
        return this._beginRequest({
            area: Constants.reportingArea,
            locationId: Constants.chartConfigurationLocation,
            httpMethod: 'PUT',
            data: configuration,
            routeValues: {
                project: projectNameOrId
            }
        });
    }

    public beginDeleteChartConfiguration(projectNameOrId: string, chartID: string) {
        return this._beginRequest({
            area: Constants.reportingArea,
            locationId: Constants.chartConfigurationLocation,
            httpMethod: 'DELETE',
            httpResponseType: "html",
            routeValues: {
                id: chartID,
                project: projectNameOrId
            }
        });
    }

    public beginGetChartConfiguration(projectNameOrId: string, chartId: string) {
        return this._beginRequest({
            area: Constants.reportingArea,
            locationId: Constants.chartConfigurationLocation,
            httpMethod: 'GET',
            data: {
                id: chartId
            },
            routeValues: {
                project: projectNameOrId
            }
        });
    }

    public beginGetChartConfigurations(projectNameOrId: string, scope: string, groupKey: string) {
        return this._beginRequest({
            area: Constants.reportingArea,
            locationId: Constants.chartConfigurationLocation,
            httpMethod: 'GET',
            data: {
                scope: scope,
                groupKey: groupKey
            },
            routeValues: {
                project: projectNameOrId
            }
        });
    }

    public beginPostTransformQuery(projectNameOrId: string, scope: string, transform: ITransformOptions[]) {
        return this._beginRequest({
            area: Constants.reportingArea,
            locationId: Constants.transformQueryLocation,
            routeValues: {
                scope: scope,
                project: projectNameOrId
            },
            httpMethod: 'POST',
            data: transform,
            timeout: 150000 //2.5mins as our maximal wait before giving up on server responding, expressed in ms - this covers for peak allowed timeouts
        });
    }

    public beginGetDataServiceCapabilities(scope: string) {
        return this._beginRequest({
            area: Constants.reportingArea,
            locationId: Constants.dataServiceCapabilitiesLocation,
            httpMethod: 'GET',
            data: {
                scope: scope
            }
        });
    }
}

// OBSOLETE - Use Generated REST Client for new Scenarios.
/// Service layer over Charting REST Clients. Contains some policy such as client telemetry on Charting Stack.
export class DataServicesServer extends Service.VssService implements IDataServicesServer {
    private _httpClient: DataServicesHttpClient;

    public initializeConnection(connection: Service.VssConnection) {
        super.initializeConnection(connection);
        this._httpClient = connection.getHttpClient(DataServicesHttpClient);
    }

    public beginPostChartConfiguration(
        projectNameOrId: string,
        configuration: IChartConfiguration,
        callback: (newConfiguration: IChartConfiguration) => void,
        errorCallback?: IErrorCallback) {
        Diag.logTracePoint("DataServicesServer.beginPostChartConfiguration.start");
        this._httpClient.beginPostChartConfiguration(projectNameOrId, configuration).then(
            (newConfiguration: any) => {
                Diag.logTracePoint("DataServicesServer.beginPostChartConfiguration.end");
                callback(newConfiguration.chartConfiguration);
            },
            errorCallback || VSS.handleError);
    }

    public beginPutChartConfiguration(projectNameOrId: string, configuration: IChartConfiguration, callback?: (newConfiguration: IChartConfiguration) => void, errorCallback?: IErrorCallback) {
        Diag.logTracePoint("DataServicesServer.beginPutChartConfiguration.start");
        this._httpClient.beginPutChartConfiguration(projectNameOrId, configuration).then(
            (newConfiguration: any) => {
                Diag.logTracePoint("DataServicesServer.beginPutChartConfiguration.end");
                if (typeof callback !== "undefined" && callback !== null) {
                    callback(newConfiguration.chartConfiguration)
                };
            },
            errorCallback || VSS.handleError);
    }

    public beginDeleteChartConfiguration(projectNameOrId: string, chartId: string, callback?: () => void, errorCallback?: IErrorCallback) {
        Diag.logTracePoint("DataServicesServer.beginDeleteChartConfiguration.start");
        this._httpClient.beginDeleteChartConfiguration(projectNameOrId, chartId).then(
            () => {
                Diag.logTracePoint("DataServicesServer.beginDeleteChartConfiguration.end");
                if (typeof callback !== "undefined" && callback !== null) {
                    callback();
                }
            },
            errorCallback || VSS.handleError);
    }

    public beginGetChartConfigurations(
        projectNameOrId: string,
        scope: string,
        groupKey: string,
        resultCallback: (configurationResults: IChartConfiguration[]) => void,
        errorCallback?: IErrorCallback) {
        Diag.logTracePoint("DataServicesServer.beginGetChartConfigurations.start");
        this._httpClient.beginGetChartConfigurations(projectNameOrId, scope, groupKey).then(
            (configurationResults: any) => {
                resultCallback(configurationResults.value.map((configResult) => {
                    Diag.logTracePoint("DataServicesServer.beginGetChartConfigurations.end");
                    return configResult.chartConfiguration;
                }));
            },
            errorCallback || VSS.handleError);
    }

    public beginGetChartConfiguration(
        projectNameOrId: string,
        chartId: string,
        resultCallback: (configurationResult: IChartConfiguration) => void,
        errorCallback?: IErrorCallback) {
        Diag.logTracePoint("DataServicesServer.beginGetChartConfiguration.start");

        this._httpClient.beginGetChartConfiguration(projectNameOrId, chartId).then(
            (configurationResult: any) => {
                Diag.logTracePoint("DataServicesServer.beginGetChartConfiguration.end");
                resultCallback(configurationResult.chartConfiguration);
            },
            errorCallback || VSS.handleError);
    }


    public beginPostTransformQuery(
        projectNameOrId: string,
        scope: string,
        transform: ITransformOptions[],
        callback: (results: IDataTable[]) => void,
        errorCallback?: IErrorCallback) {
        var startTime: number = Date.now();
        Diag.logTracePoint("DataServicesServer.beginPostTransformQuery.start");
        this._httpClient.beginPostTransformQuery(projectNameOrId, scope, transform).then(
            (transformResults: any) => {
                Diag.logTracePoint("DataServicesServer.beginPostTransformQuery.end");

                var endTime: number = Date.now();
                var elapsedTime: number = (endTime - startTime);
                //The data services transform service starts to return an OK code, and will attempt to stream results before it has finished processing.
                var hasResults: boolean = !(transformResults === null || transformResults === undefined);

                ChartTelemetry.OnTransformResultsRecieved(scope, transform[0].filter, elapsedTime, hasResults);

                if (hasResults) {
                    callback(transformResults.result);
                } else if (errorCallback) {
                    errorCallback(PresentationResources.DataServicesEmptyResponse);
                } else {
                    VSS.handleError({ message: PresentationResources.DataServicesEmptyResponse, name: "EmptyResult" }, null, null);
                }
            },
            errorCallback || VSS.handleError);
    }

    public beginGetDataServiceCapabilities(
        scope: string,
        callback: (results: IDataServiceCapabilities) => void,
        errorCallback?: IErrorCallback) {
        Diag.logTracePoint("DataServicesServer.beginGetDataServiceCapabilities.start");
        this._httpClient.beginGetDataServiceCapabilities(scope).then(
            (capabilityPayload: any) => {
                Diag.logTracePoint("DataServicesServer.beginGetDataServiceCapabilities.end");
                callback(capabilityPayload.dataServiceCapabilities);
            },
            errorCallback || VSS.handleError);
    }
}

export class ServiceConsumer {
    private _dataServicesServer: IDataServicesServer;
    private _serviceFactory: () => IDataServicesServer;

    constructor(serverFactory: () => IDataServicesServer) {
        this._serviceFactory = serverFactory;
    }

    public getServer(): IDataServicesServer {
        if (this._dataServicesServer == undefined) {
            this._dataServicesServer = this._serviceFactory();
        }
        return this._dataServicesServer;
    }
}


/*
*****************************************************************************
      Query Execution
*****************************************************************************
*/
export interface IQueryExecutionEngine {
    /// <summary>creates server queries and returns results</summary>
    beginPostDataQuery(
        projectNameOrId: string,
        scope: string,
        options: ITransformOptions[],
        resultCallback: (results: IDataTable[]) => void,
        errorCallback?: IErrorCallback): void;
}

export class RestfulQueryEngine extends ServiceConsumer implements IQueryExecutionEngine {
    constructor(serverFactory: () => IDataServicesServer = () => {
        return Service.getCollectionService(DataServicesServer, tfsContext.contextData)
    }) {
        super(serverFactory);
    }

    public beginPostDataQuery(
        projectNameOrId: string,
        scope: string,
        options: ITransformOptions[],
        resultCallback: (results: IDataTable[]) => void,
        errorCallback?: IErrorCallback): void {
        super.getServer().beginPostTransformQuery(projectNameOrId, scope, options, resultCallback, errorCallback);
    }
}

export interface IDataServiceCapabilityProvider {
    /// <summary>creates server queries and returns results</summary>
    beginGetDataServiceCapabilities(
        scope: string,
        resultCallback: (results: IDataServiceCapabilities) => void,
        errorCallback?: IErrorCallback): void;
}

export class DataServiceCapabilityProvider extends ServiceConsumer implements IDataServiceCapabilityProvider {
    constructor(serverFactory: () => IDataServicesServer = () => {
        return Service.getCollectionService(DataServicesServer, tfsContext.contextData)
    }) {
        super(serverFactory);
    }

    public beginGetDataServiceCapabilities(
        scope: string,
        resultCallback: (results: IDataServiceCapabilities) => void,
        errorCallback?: IErrorCallback): void {
        super.getServer().beginGetDataServiceCapabilities(scope, resultCallback, errorCallback);
    }
}


/*
*****************************************************************************
      Chart Configuration Persistence
*****************************************************************************
*/
export interface IChartConfigurationStore {
    /// <summary>Manages Chart Configuration persistence</summary>
    beginGetChartConfigurationsInGroup(
        projectNameOrId: string,
        scope: string,
        groupKey: string,
        resultCallback: (results: IChartConfiguration[]) => void,
        errorCallback?: IErrorCallback): void;
    beginGetChartConfiguration(
        projectNameOrId: string,
        chartId: string,
        resultCallback: (results: IChartConfiguration) => void,
        errorCallback?: IErrorCallback): void;
    beginSaveNewChartConfiguration(
        projectNameOrId: string,
        configuration: IChartConfiguration,
        resultCallback: (newConfiguration: IChartConfiguration) => void,
        errorCallback?: IErrorCallback): void;
    beginUpdateChartConfiguration(
        projectNameOrId: string,
        configuration: IChartConfiguration,
        resultCallback?: (newConfiguration: IChartConfiguration) => void,
        errorCallback?: IErrorCallback): void;
    beginRemoveChartConfiguration(
        projectNameOrId: string,
        chartId: string,
        resultCallback?: () => void,
        errorCallback?: IErrorCallback): void;

}

export class ChartConfigurationMemoryStore implements IChartConfigurationStore {
    /// <summary>A Chart Configuration Store keeping store instances in memory. Used for testing.</summary>
    constructor(configs: IChartConfiguration[]) {
        this.repository = configs;
    }

    public beginGetChartConfigurationsInGroup(
        projectNameOrId: string,
        scope: string,
        groupKey: string,
        resultCallback: (results: IChartConfiguration[]) => void,
        errorCallback?: IErrorCallback): void {
        var results = this.repository.reduce<IChartConfiguration[]>(function (result, current) {
            if (current.scope == scope && current.groupKey == groupKey)
                return result.concat(JSON.parse(JSON.stringify(current)));
            else
                return result;
        }, []);
        resultCallback(results);
    }

    public beginGetChartConfiguration(
        projectNameOrId: string,
        chartId: string,
        resultCallback: (results: IChartConfiguration) => void,
        errorCallback?: IErrorCallback): void {
        var results = this.repository.reduce<IChartConfiguration[]>(function (result, current) {
            if (current.chartId == chartId)
                return result.concat(JSON.parse(JSON.stringify(current)));
            else
                return result;
        }, []);
        resultCallback(results ? results[0] : null);
    }

    public beginSaveNewChartConfiguration(
        projectNameOrId: string,
        configuration: IChartConfiguration,
        resultCallback: (newConfiguration: IChartConfiguration) => void,
        errorCallback?: IErrorCallback): void {
        var newConfig: IChartConfiguration = JSON.parse(JSON.stringify(configuration));
        var len = this.repository.push(newConfig);
        if (newConfig.chartId == undefined) {
            newConfig.chartId = len.toString();
            newConfig.transformOptions.transformId = len.toString();
        }
        if (resultCallback != undefined) { resultCallback(JSON.parse(JSON.stringify(newConfig))) };
    }

    public beginUpdateChartConfiguration(
        projectNameOrId: string,
        configuration: IChartConfiguration,
        resultCallback?: (newConfiguration: IChartConfiguration) => void,
        errorCallback?: IErrorCallback): void {
        for (var i = 0; i < this.repository.length; i++) {
            if (this.repository[i].chartId == configuration.chartId) {
                this.repository[i] = JSON.parse(JSON.stringify(configuration));
                break;
            }
        }
        if (resultCallback != undefined) { resultCallback(configuration) };
    }

    public beginRemoveChartConfiguration(
        projectNameOrId: string,
        chartId: string,
        resultCallback?: IResultCallback,
        errorCallback?: IErrorCallback): void {
        var result: IChartConfiguration;
        for (var i = 0; i < this.repository.length; i++) {
            if (this.repository[i].chartId == chartId) {
                result = this.repository[i];
                this.repository.splice(i, 1);
                break;
            }
        }
        if (resultCallback != undefined) { resultCallback() };
    }

    repository: IChartConfiguration[] = [];
}

export class ChartConfigurationRestStore extends ServiceConsumer implements IChartConfigurationStore {
    /// <summary>Chart configuration store kept on a server and accessed via a rest endpoint</summary>

    constructor(serverFactory: () => IDataServicesServer = () => {
        return Service.getCollectionService(DataServicesServer, tfsContext.contextData)
    }) {
        super(serverFactory);
    }

    public beginGetChartConfiguration(
        projectNameOrId: string,
        chartId: string,
        resultCallback: (result: IChartConfiguration) => void,
        errorCallback?: IErrorCallback): void {
        super.getServer().beginGetChartConfiguration(projectNameOrId, chartId, (result) => {
            resultCallback(result);
        },
            errorCallback);
    }

    public beginGetChartConfigurationsInGroup(
        projectNameOrId: string,
        scope: string,
        groupKey: string,
        resultCallback: (results: IChartConfiguration[]) => void,
        errorCallback?: IErrorCallback): void {
        super.getServer().beginGetChartConfigurations(projectNameOrId, scope, groupKey, (results) => {
            resultCallback(results);
        },
            errorCallback);
    }
    public beginSaveNewChartConfiguration(
        projectNameOrId: string,
        configuration: IChartConfiguration,
        resultCallback: (newConfiguration: IChartConfiguration) => void,
        errorCallback?: IErrorCallback): void {
        super.getServer().beginPostChartConfiguration(projectNameOrId, configuration, resultCallback, errorCallback);
    }

    public beginUpdateChartConfiguration(
        projectNameOrId: string,
        configuration: IChartConfiguration,
        resultCallback?: (newConfiguration: IChartConfiguration) => void,
        errorCallback?: IErrorCallback): void {
        super.getServer().beginPutChartConfiguration(projectNameOrId, configuration, resultCallback, errorCallback);
    }

    public beginRemoveChartConfiguration(
        projectNameOrId: string,
        chartId: string,
        resultCallback?: IResultCallback,
        errorCallback?: IErrorCallback): void {
        super.getServer().beginDeleteChartConfiguration(projectNameOrId, chartId, resultCallback, errorCallback);
    }

}

export class DataServicesHelpers {
    public static applyFilterContext(transformOptions: ITransformOptions, filterContext: any): ITransformOptions {
        ///<summary>Apply filter context onto the supplied transformOptions.
        /// Unlike the rest of the options, this depends on session details, not server retained state.< summary >

        transformOptions.filterContext = filterContext;
        return transformOptions;
    }

    public static InterpretServerError(error): string {
        ///<summary> Interpret Data Service errors, and provide any additional context for benefit of client.</summary>
        var message: string;
        if (error && error.name == "VSS.WebApi_RestClient.Exception.Timeout") {
            message = PresentationResources.ChartingTimeout;
        } else {
            message = Utils_String.format(PresentationResources.ChartMessage_DescribeServerError, VSS.getErrorMessage(error));
        }
        return message;
    }

    public static FilterFields(serverFields: INameLabelPair[], clientFields: string[]): INameLabelPair[] {
        /// <summary>
        /// This method filters out any fields from the clientFields which are not present in serverFields
        /// </summary>

        return $.map(serverFields, (item: INameLabelPair): INameLabelPair => {
            if (clientFields.indexOf(item.name) >= 0) {
                return item;
            };
        });
    }
}

export class ChartMetadataProvider implements IChartMetadataProvider {
    ///summary>Exposes the Metadata capabilities of a feature chart Service .
    ///</summary >
    private _providerIdentifier: string
    private _serviceCapabilities: IDataServiceCapabilities;

    constructor(providerIdentifier: string) {
        this._providerIdentifier = providerIdentifier;
    }

    public beginGetMetadata(callback, errorCallback?) {
        var onCapabilitiesLoaded = (results: IDataServiceCapabilities) => {
            this._serviceCapabilities = results;
            callback();
        };
        ChartCapabilityProvider.beginGetDataServiceCapabilities(this._providerIdentifier, onCapabilitiesLoaded, errorCallback);
    }

    public getPluralArtifactName(): string {
        return this._serviceCapabilities.pluralArtifactName;
    }

    public getNumericalAggregationFunctions(): INameLabelPair[] {
        return this._serviceCapabilities.numericalAggregationFunctions;
    }

    public getRangeOptions(): INameLabelPair[] {
        return this._serviceCapabilities.historyRanges;
    }

    public getGroupableFields(): INameLabelPair[] {
        var fields: INameLabelPair[] = [];
        $.each(this._serviceCapabilities.fields, function (i, item: IFieldInfo) {
            if (item.isGroupable) {
                fields.push({
                    name: item.name,
                    labelText: item.labelText
                });
            }
        });

        return fields;
    }

    public getAggregatableFields(): INameLabelPair[] {
        var fields: INameLabelPair[] = [];
        $.each(this._serviceCapabilities.fields, function (i, item: IFieldInfo) {
            if (item.isAggregatable) {
                fields.push({
                    name: item.name,
                    labelText: item.labelText
                });
            }
        });
        return fields;
    }
}


//allows consumers to inject their own instances. Used primarily for testing
export var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
export var ChartConfigStore: IChartConfigurationStore = new ChartConfigurationRestStore();
export var ChartQueryEngine: IQueryExecutionEngine = new RestfulQueryEngine();
export var ChartCapabilityProvider: IDataServiceCapabilityProvider = new DataServiceCapabilityProvider();

VSS.tfsModuleLoaded("TFS.Charting.DataServices", exports);
