import Q = require("q");

import Charting = require("Charting/Scripts/TFS.Charting");
import Charting_Charts = require("Charting/Scripts/TFS.Charting.Charts");
import Charting_Data_Contracts = require("Charting/Scripts/DataService/Contracts");
import Charting_DataServices = require("Charting/Scripts/TFS.Charting.DataServices");
import Charting_Editors = require("Charting/Scripts/TFS.Charting.Editors");

import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import { SettingsField } from "Dashboards/Scripts/SettingsField";

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");

import Context = require("VSS/Context");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import SDK = require("VSS/SDK/Shim");
import Utils_String = require("VSS/Utils/String");

import ChartConfigurationBase = require("Widgets/Scripts/Shared/ChartConfigurationBase");

import QuerySelector = require("Widgets/Scripts/Shared/BladeConfigurationQueryControl");
import Widget_Telemetry = require("Widgets/Scripts/VSS.Widget.Telemetry");
import Widgets_Resources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");

import QueryCharts = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.Charts");
import WorkItemsProvider = require("WorkItemTracking/Scripts/Controls/WorkItemsProvider");
import WIT = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import {QueryHierarchy, QueryItem} from "WorkItemTracking/SharedScripts/QueryHierarchy";

import WITChart = require("Widgets/Scripts/WitChart");

/**A private data contract used exclusively in the WIT Query Selector */
export interface QueryChartData {
    queryName: string;
    queryId: string;
    resultsProvider: WorkItemsProvider.QueryResultsProvider;
    metadata: any;
    metadataProvider: QueryCharts.WITClientChartMetadataProvider;
}

/** Presents a bowtie-friendly Selector UI for WIT Query Data, to decouple the Config UI from the feature details */
export class WitQuerySelector implements ChartConfigurationBase.IDataSelector{

    public options: ChartConfigurationBase.IDataSelectorOptions;

    /**
    * flag that indicates whether the user ever interacted with the query selector (either via mouse or keyboard)
    */
    public querySelectorUsed: boolean = false;
    public querySelector: QuerySelector.QuerySelectorControl;
    public querySelectorField: SettingsField<QuerySelector.QuerySelectorControl>;
    public querySelectorValid: boolean = false;

    constructor(options: ChartConfigurationBase.IDataSelectorOptions) {
        this.options = options;
    }

    public renderSelector(): JQuery {
        return this._addQuerySelector(this.options.initialValue);
    }

    public getSelectionName(): string {
        return this.querySelector.getCurrentValue().queryName;
    }

    public getSelectionIdentifier(): string {
        return this.querySelector.getCurrentValue().queryId;
    }

    public isValid(): boolean {
        return this.querySelectorValid;
    }

    public showErrorOnSave(): void {
        if (!this.querySelectorUsed && !this.querySelectorField.hasError()) {
            this.querySelectorField.setErrorMessage(Widgets_Resources.QueryScalar_ConfigNoQuerySelected);
            this.querySelectorField.showError();
        }
    }

    /** Instantiates the query selector control and adds it to the container */
    public _addQuerySelector(initialValue: string) {
        var $querySelectorContainer = $('<div>')
            .addClass("query-selector-container");

        this.querySelector = this._createQuerySelector($querySelectorContainer, initialValue);

        this.querySelectorField = SettingsField.createSettingsField({
            labelText: Widgets_Resources.QueryScalar_QueryCaption,
            control: this.querySelector,
            // Just passing the control doesn't work for querySelector (it doesn't add all elements 
            // to the field container), so we need to use the container we created ourselves
            controlElement: $querySelectorContainer,
            initialErrorMessage: Widgets_Resources.QueryScalar_ConfigNoQuerySelected,
            toolTipText: Widgets_Resources.ChartWidget_QuerySelectionTooltip,
        });

        return this.querySelectorField.getElement();
    }

    /** Creates the query selector control */
    public _createQuerySelector($querySelectorContainer: JQuery, queryId: string): QuerySelector.QuerySelectorControl {

        return <QuerySelector.QuerySelectorControl>Controls.BaseControl.createIn(
            QuerySelector.QuerySelectorControl,
            $querySelectorContainer,
            <QuerySelector.QuerySelectorOptions>{
                onChange: () => this._onQuerySelectorValueChange(),
                onInitialized: () => this._onQuerySelectorLoaded(),
                onError: () => {
                    this.querySelectorField.setErrorMessage(Widgets_Resources.WitChart_ConfigurationErrorLoadingQueries);
                    this.querySelectorField.showError();
                    this.querySelectorValid = false;
                },
                webContext: Context.getDefaultWebContext(),
                initialValue: queryId && {
                    queryId: queryId,
                    queryName: null // Query name is not needed
                }
            });
    }

    /**
     * Set focus back on the control
     */
    public _onQuerySelectorValueChange(): void {
        this._onQuerySelectorLoaded();
        
        //In Chrome, when user TABs out of an element whose container is not displayed anymore (eg popup), focus will go to body
        //Blade will close when focus goes out of Configuration
        this.querySelector.focus();
    }

    /**
     * Called when the user selects a query. If the user selects a valid query for charting, calls onChange() to host. 
     * @return IPromise <{}>
     * The resturn is really not need for the call, it is there for the unit test so it can test the call path.
     */
    public _onQuerySelectorLoaded(): IPromise<void> {

        this.querySelectorUsed = true;

        var queryId = this.querySelector.getCurrentValue().queryId;
        
        // While a query is not selected(e.g. a folder or tabbing out of field), we can't proceed to get data.
        if (queryId == null) {
            if (!this.querySelectorField.hasError()) {
                this.querySelectorField.setErrorMessage(Widgets_Resources.QueryScalar_ConfigNoQuerySelected);
                this.querySelectorField.showError();
            }
            this.querySelectorValid = false;
            return;
        }

        // Tell user we are busy now
        this._showLoadingProgress();

        return this._getQueryData(queryId)
            .then((data: QueryChartData) => {
                this._dismissLoadingProgress();
                if (data.metadata.isLinkQuery === true || data.metadata.isTreeQuery === true) {
                    this.querySelectorField.setErrorMessage(Widgets_Resources.WitChart_HierarchicalQueriesNotSupportedError);
                    this.querySelectorField.showError();
                    this.querySelectorValid = false;
                } else {
                    this.querySelectorField.hideError();
                    this.querySelectorValid = true;
                    this.options.onChange(data.metadataProvider);
                }
            }, (errorMessage) => {
                this._dismissLoadingProgress();
                this.querySelectorField.setErrorMessage(errorMessage, true);
                this.querySelectorField.showError();
                this.querySelectorValid = false;
            });
    }


    /** Wrapper for boilerplate code required to fetch the WIT project */
    public _getWitProject(): IPromise<WIT.Project> {
        var deferred = Q.defer<WIT.Project>();

        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var projectId = tfsContext.navigation.projectId;
        var store = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        store.beginGetProject(
            projectId,
            project => deferred.resolve(project),
            error => deferred.reject(error));

        return deferred.promise;
    }

    /** Asynchronously fetches metadata related to a query */
    public _getQueryData(queryId: string): IPromise<QueryChartData> {
        var deferred = Q.defer<QueryChartData>();

        //Note: Project & QueryResultsProvider data model are centered on a UI state model built for Work Item page, which has script baggage. 
        //We should evaluate if the Config & WIT Chart Metadata Provider can be effectively moved to a simpler, more succinct REST driven arrangement.
        
        //First, get the Query Information (WIQL)
        this._getWitProject()
            .then((project: WIT.Project) => {
                QueryHierarchy.beginGetQueryItemByIdOrPath(project, queryId).then(
                    (queryDefinition: QueryItem) => {
                        //Next get the result provider for the query
                        var resultsProvider = <WorkItemsProvider.QueryResultsProvider>
                            WorkItemsProvider.QueryResultsProvider.get(queryDefinition, { project: project });

                        var metadataProvider = new QueryCharts.WITClientChartMetadataProvider(resultsProvider);

                        //Get customization metadata (e.g. Column names) once we have the query provider. 
                        metadataProvider.beginGetMetadata((metadata: QueryCharts.WITClientChartMetadataProvider) => {
                            var result = <QueryChartData>{
                                queryName: queryDefinition.name,
                                queryId: queryDefinition.id,
                                resultsProvider: resultsProvider,
                                metadata: metadata,
                                metadataProvider: metadataProvider
                            };
                            deferred.resolve(result);
                        }, (errorMessage) => {
                            Diag.logWarning(errorMessage);
                            deferred.reject(WITChart.WitChartControl.buildErrorMessageFromQuery(queryId));
                        });
                    }, (errorMessage) => {
                        Diag.logWarning(errorMessage);
                        deferred.reject(Widgets_Resources.WitChart_ConfigurationQueryNotFound);
                    });
            }, (errorMessage) => {
                Diag.logWarning(errorMessage);
                deferred.reject(Widgets_Resources.WitChart_ConfigurationCannotGetProject);
            });

        return deferred.promise;
    }

    public _showLoadingProgress(): void {
        this.querySelector.showLoadingProgress();
    }

    public _dismissLoadingProgress(): void {
        this.querySelector.hideLoadingProgress();
    }

}

/** Implementation of a WIT Query Chart Configuration Blade. */
export class WitChartConfiguration
    extends ChartConfigurationBase.ChartConfigurationBase {

    constructor(options?: Dashboard_Shared_Contracts.WidgetConfigurationOptions) {
        super(options);
    }

    public initializeOptions(options: Dashboard_Shared_Contracts.WidgetConfigurationOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "chart-configuration-container wit-chart-configuration"
        }, options));
    }

    /** Override the default onSaveCompleteBehavior to collect telemetry */
    public onSaveComplete(): void {
        super.onSaveComplete();
        // Tracking when the user make a valid changes and save
        Widget_Telemetry.WidgetTelemetry.onWITChartWidgetConfigSave();
        
        // Track for cases where the widget title changed
        var currentWidgetName = this.configureName.getCurrentWidgetName();
        if (this._initialWidgetName != currentWidgetName) {
            Widget_Telemetry.WidgetTelemetry.onWITChartWidgetCustomNameSave(currentWidgetName.length);
        }
    }
     
    /** Provides an initial title for newly created Widgets.*/
    public getInitialTitle(): string {
        return Widgets_Resources.WitChart_DefaultWidgetName;
    }

    /** Generates a default title for configured widget.*/
    public generateDefaultTitle(): string {
        var currentDefaultTitle;
        var aggregationFilterLabel = this._chartConfigurationEditor.getFirstGroupingDimension();
        if (aggregationFilterLabel != null) {
            currentDefaultTitle = Utils_String.format(Widgets_Resources.WitChart_TitleTemplate_QueryName_GroupBy,
                this._featureDataSelector.getSelectionName(), aggregationFilterLabel);
        }
        else {
            currentDefaultTitle = this._featureDataSelector.getSelectionName();
        }

        return currentDefaultTitle;
    }

    public getArtifactPluralName(): string {
        return Widgets_Resources.WitChart_WorkItemsPluralName;
    }

    public getSelectArtifactReminderMessage(): string {
        return Widgets_Resources.WitChart_SelectAQueryMessage;
    }

    public getUpgradeWarning(): string {
        return Widgets_Resources.WitChart_ConfigLazyUpgradeWarning;
    }

    public getDataSourceNeededMessage(): string {
        return Widgets_Resources.WitQueryChart_DataSourceNeeded;
    }


    /** Creates a data selector for this feature. */
    public createFeatureSelector(options: ChartConfigurationBase.IDataSelectorOptions): ChartConfigurationBase.IDataSelector {
        return new WitQuerySelector(options);
    }


    /** Takes query data and packs up the minimum configuration state needed so new chart dialog can customize settings for persistence */
    public createDefaultChartConfiguration(): Charting_Data_Contracts.ChartConfiguration {
        var transformOptions = <Charting_DataServices.ITransformOptions>{
            filter: null,
            groupBy: "",
            orderBy: {
                direction: Charting_DataServices.OrderDirection.descending,
                propertyName: Charting_DataServices.OrderProperty.useValue
            },
            measure: {
                aggregation: Charting_DataServices.AggregationFunction.count,
                propertyName: "" //Count Aggregation does not use any property data
            }
        };
        //Configure a new Configuration using a snap of current settings.
        var configuration = <Charting_Data_Contracts.ChartConfiguration> {
            scope: Charting.ChartProviders.witQueries,
            groupKey: null,
            title: Widgets_Resources.WitChart_DefaultWidgetName,
            chartType: Charting_Charts.ChartTypes.pieChart,
            transformOptions: transformOptions
        };

        return configuration;
    }

    /**
     * Override the default tooltip
     */
    public getChartTemplates(): Charting_Editors.ChartTemplateItem[] {
        var tooltipGenerator = new QueryCharts.QueryChartEditorTooltipMap();
        var chartTemplates = new Charting_Editors.ChartTemplateGenerator().getAllTemplates(tooltipGenerator);
        return chartTemplates;
    }
}



SDK.VSS.register("dashboards.witChartConfiguration", () => WitChartConfiguration);
SDK.registerContent("dashboards.witChartConfiguration-init", (context) => {
    return Controls.create(WitChartConfiguration, context.$container, context.options);
});
