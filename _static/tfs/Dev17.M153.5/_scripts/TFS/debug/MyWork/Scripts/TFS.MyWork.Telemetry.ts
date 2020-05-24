import Telemetry = require("VSS/Telemetry/Services");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

var tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

export class TelemetryConstants {
    /* Common telemetry constants and sources
    */
    //common
    public static MYWORK_AREA = "MyWork";
    public static WIDGET_INITIALIZATION = "WidgetInitialization";
    public static WIDGET_LOAD_ERROR = "WidgetLoadError";
    public static WIDGET_REFRESH = "WidgetRefresh";
    public static WIDGET_REFRESH_ERROR = "WidgetRefreshError";

    //Wit 
    public static WIT_WIDGET_SORT_EVENT = "WitWidgetSort";
    public static WIT_WIDGET_VIEW_ALL_EVENT = "WitWidgetViewAll";
    public static WIT_WIDGET_VIEW_ITEM_EVENT = "WitWidgetViewItem";
    public static WIT_WIDGET_TITLE_CLICK_EVENT = "WitWidgetViewItem";
    public static WIT_WIDGET_POPUP_CLICK_EVENT = "WitWidgetViewItem";
    public static WIT_WIDGET_CUSTOMIZE_COLUMNS_ADDED = "WitWidgetCustomizeColumnsAdded";
    public static WIT_WIDGET_CUSTOMIZE_COLUMNS_REMOVED = "WitWidgetCustomizeColumnsRemoved";
    public static WIT_WIDGET_CUSTOMIZE_COLUMNS_SAVED = "WitWidgetCustomizeColumnsSaved";
    public static WIT_WIDGET_QUERY_SELECTOR_OK_CLICKED = "WitWidgetCustomizeQuerySelectorOkClicked";
    public static WIT_WIDGET_QUERY_SELECTED = "WitWidgetQuerySelected";
    public static WIT_WIDGET_EDIT_CLICKED = "WitWidgetEditLinkClicked";
    public static WIT_WIDGET_EDIT_COLUMNS_SELECTED = "WitWidgetEditColumnsSelected";
    public static WIT_WIDGET_EDIT_QUERY_SELECTED = "WitWidgetEditQuerySelected";
    public static WIT_WIDGET_INITIALIZE = "WitWidgetInitialize";
    public static WIT_WIDGET_CUSTOMIZED = "Customized";
    public static WIT_WIDGET_LOAD_ITEMS_COUNT = "WitWidgetLoadItemsCount";
    public static WIT_WIDGET_LOAD_ITEMS_TYPE_COUNT = "WitWidgetLoadItemsTypeCount";
    public static WIT_WIDGET_ERROR = "WitWidgetError"

    //Sources
    public static SOURCE_PROJECT_NAV_WIDGET = "ProjectNav";
    public static SOURCE_MYCODE_NAV_WIDGET = "MyCodeNav";
    public static SOURCE_BUILD_WIDGET = "Build";
    public static SOURCE_QUERY_RESULTS_WIDGET = "QueryResults";
    public static SOURCE_PULSE_UPDATE = "PulseUpdate";
    public static SOURCE_PROJECT_SELECTOR = "ProjectSelector";

    //News
    public static NEWS_WIDGET_CLICK_VIEW_ALL_LINK = "NewsWidgetViewAllLinkClick";
    public static NEWS_WIDGET_CLICK_NEWS_LINK = "NewsWidgetItemLinkClick";

    //ProjectSelector
    public static PROJECT_SELECTOR_BROWSE_ALL_SELECTED = "ProjectSelectorBrowseAllSelected";
    public static PROJECT_SELECTOR_MENU_ITEM_CLICKED = "ProjectSelectorMenuItemClicked";
}

export class MyWorkTelemetry {
    public static publishTelemetry(eventName: string, properties: { [key: string]: string }, immediate: boolean = false) {
        /* Wrapper around VSS.Telemetry.publishEvent which appens the widget type to the properties passed
        * @param eventName The name of the event ("feature") to log.
        * @param properties The properties to pass in as metadata.
        * @param immediate To publish the event immediately or delayed/queued
        */
        properties = (properties || {});
        properties["userId"] = tfsContext.currentIdentity.id;

        Telemetry.publishEvent(
            new Telemetry.TelemetryEventData(
                TelemetryConstants.MYWORK_AREA,
                eventName,
                properties), immediate);
    }

    public static publishTelemetryBuild(eventName: string, properties: { [key: string]: string }, immediate: boolean = false) {
        properties = (properties || {});
        properties["widgetType"] = TelemetryConstants.SOURCE_BUILD_WIDGET;
        MyWorkTelemetry.publishTelemetry(eventName, properties, immediate);
    }

    public static publishTelemetryProjectNav(eventName: string, properties: { [key: string]: string }, immediate: boolean = false) {
        properties = (properties || {});
        properties["widgetType"] = TelemetryConstants.SOURCE_PROJECT_NAV_WIDGET;
        MyWorkTelemetry.publishTelemetry(eventName, properties, immediate);
    }

    public static publishTelemetryMyCodeNav(eventName: string, properties: { [key: string]: string }, immediate: boolean = false) {
        properties = (properties || {});
        properties["widgetType"] = TelemetryConstants.SOURCE_MYCODE_NAV_WIDGET;
        MyWorkTelemetry.publishTelemetry(eventName, properties, immediate);
    }

    public static publishTelemetryWIT(eventName: string, properties: { [key: string]: string }, widgetName, immediate: boolean = false) {
        properties = (properties || {});
        properties["widgetType"] = widgetName;
        MyWorkTelemetry.publishTelemetry(eventName, properties, immediate);
    }

    public static publishPulseUpdate(properties: { [key: string]: string }, immediate: boolean = false) {
        MyWorkTelemetry.publishTelemetry(TelemetryConstants.SOURCE_PULSE_UPDATE, properties, immediate);
    }

    public static publishTelemetryProjectSelector(eventName: string, properties: { [key: string]: string }, immediate: boolean = false) {
        properties = (properties || {});
        properties["widgetType"] = TelemetryConstants.SOURCE_PROJECT_SELECTOR;
        MyWorkTelemetry.publishTelemetry(eventName, properties, immediate);
    }
}