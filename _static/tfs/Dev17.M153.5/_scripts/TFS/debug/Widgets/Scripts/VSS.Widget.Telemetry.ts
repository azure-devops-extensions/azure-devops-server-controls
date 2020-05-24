import { DashboardsTelemetryCore, PublicProjectsTelemetryHelper } from "Dashboards/Scripts/Telemetry";
import Dashboard_Services = require("TFS/Dashboards/Services");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import {ErrorParser} from "Widgets/Scripts/TFS.Widget.Utilities";

/*
 * Central handler for managing Widget Telemetry from Client code
 */
export class WidgetTelemetry {

    /*
     * Produces standard click event telemetry for all widgets. Always reports telemetry immediately.
     * @param {string} widget typeId
     * @param {string} linkDescription describes what the clicked link points at - should be unique in scope of that widget type and should not include spaces. For example: "CreateWorkItem"
     * @param { IDictionaryStringTo<any> } extendedProperties - Any additional information that should be recorded about the event
     */
    public static onWidgetClick(typeId: string, linkDescription: string, extendedProperties?: IDictionaryStringTo<any>): void {
        var measuredFeatureName = "WidgetClicked";
        var properties: IDictionaryStringTo<any> =
            {
                "WidgetTypeId": typeId,
                "Description": linkDescription
            };

        $.extend(properties, extendedProperties);

        DashboardsTelemetryCore.publish(measuredFeatureName, properties, Date.now(), true);
    }

    public static setupWidgetClickTelemetry(element: JQuery, typeId: string): void {
        // Click handles left mouse button clicks and keyboard clicks. 
        // Mouseup handles middle mouse clicks and right mouse clicks, because click() misses them.
        // Imperfect, but best option for CI purposes.
        element.mouseup((event) => {
            switch (event.which) {
                case 2:
                case 3:
                    WidgetTelemetry.onWidgetClick(typeId, "GenericClick", { WhichButton: event.which });
                    break;
                default:
                    break;
            }
        });
        element.click((event) => {
            WidgetTelemetry.onWidgetClick(typeId, "GenericClick", { WhichButton: event.which });
        });
    }

    /**
     * Telemetry about the state of widget configuration on save
     * @param {string} widgetTypeId - typeId for the widget which is being configured
     * @param { IDictionaryStringTo<any> } extendedProperties - Information about the state of the config that should be published
     */
    public static onConfigurationSave(
        widgetTypeId: string,
        extendedProperties?: IDictionaryStringTo<any>): void {

        if (!extendedProperties) {
            extendedProperties = {};
        }

        var measuredFeatureName = "WidgetConfigurationSave";
        var properties: IDictionaryStringTo<any> =
            {
                "WidgetTypeId": widgetTypeId
            };

        $.extend(properties, extendedProperties);

        DashboardsTelemetryCore.publish(measuredFeatureName, properties);
    }

    /**
    * Produces an event when the user click on the save button on WITChartWidget
    */
    public static onWITChartWidgetConfigSave() {
        var measuredFeatureName = "WITChartWidget";
        var properties: IDictionaryStringTo<any> =
            {
                "Configuration": "Saved"
            };
        DashboardsTelemetryCore.publish(measuredFeatureName, properties);
    }

    /**
     * Produces an event when the user change the WIT Chart title and save 
     * @param nameLength - The length of the new name
     */
    public static onWITChartWidgetCustomNameSave(nameLength: number) {
        var measuredFeatureName = "WITChartWidget";
        var properties: IDictionaryStringTo<any> =
            {
                "Configuration": "isCustomName",
                "NameLength": nameLength
            };
        DashboardsTelemetryCore.publish(measuredFeatureName, properties);
    }

    /**
     * Produces an event when the widget configuration fails to select a smart default or set the previously saved value of a field.
     * @param widgetTypeId - The type ID for the widget which is being configured
     * @param fieldName - The field that could not be auto populated
     * @param description - (Optional) Additional information about what went wrong
     */
    public static onConfigurationFailureToAutoPopulateField(widgetTypeId: string, fieldName: string, description?: string) {
        var measuredFeatureName = "WidgetConfigurationFailedToAutoPopulateField";
        var properties: IDictionaryStringTo<any> = {
            "WidgetTypeId": widgetTypeId,
            "Field": fieldName
        };

        if (description) {
            properties["Description"] = description;
        }

        DashboardsTelemetryCore.publish(measuredFeatureName, properties);
    }

    /**
     * Produces an event when an arbitrary error is encountered. Use this for tracking of any one-off failures which do not get tracked by widgetHost, or more specialized widget telemetry.
     * For errors which do not get tracked with widgetHost error UI.
     * @param widgetTypeId 
     * @param operationName - Unique, meaningful description of the operation which failed for traceability
     * @param extendedProps - provides additional context about the error. To support detailed investigation.
     */
    public static onWidgetFailure(widgetTypeId: string, errorMessage: string, operationName: string, extendedProps: IDictionaryStringTo<any> = {}){
        var measuredFeatureName = "WidgetFailed";
        extendedProps = {
            "WidgetTypeId": widgetTypeId,
            "ErrorMessage": errorMessage,
            "ErrorId": DashboardsTelemetryCore.extractErrorId(errorMessage),
            "OperationName": operationName,
            ...PublicProjectsTelemetryHelper.getPublicProjectsTelemetryData()
        };
        DashboardsTelemetryCore.publish(measuredFeatureName, extendedProps);
    }

    /**
     * Produces an event when the widget is loaded. All custom properties supplied here will be tracked on Widget dashboard.
     * @param widgetTypeId - The type ID of the widget
     * @param widgetService - Collects extended information about the widget
     * @param properties - Widget-specific information about the state of the widget, such as configuration and data shape.
     */
    public static onWidgetLoaded(widgetTypeId: string, widgetId: string, properties: IDictionaryStringTo<any> ): void {
        var measuredFeatureName = "WidgetLoaded";

        let coreProps = {
            "WidgetTypeId": widgetTypeId,
            "WidgetId": widgetId,
            "WidgetProperties": {
                ...properties, //Pack the widget-specific details here. This allows us to ignore stock dashboard supplied fields in modern, downstream reporting.
                ...PublicProjectsTelemetryHelper.getPublicProjectsTelemetryData()
            }
        };
        DashboardsTelemetryCore.publish(measuredFeatureName, coreProps);
    }

    /**
     * Produces an event when the widget displays a message
     * @param widgetName - The name of the widget
     * @param widgetMessageType - The type of message displayed to the user
     */
    public static onWidgetMessageDisplayed(widgetName: string, widgetMessageType: string): void {
        var measuredFeatureName = "WidgetMessageDisplayed";
        var properties: IDictionaryStringTo<any> = {
            "WidgetName": widgetName,
        };

        if (widgetMessageType) {
            properties["MessageType"] = widgetMessageType;
        }

        DashboardsTelemetryCore.publish(measuredFeatureName, properties);
    }

    /**
     * Calls a function and records telemetry for the time it takes
     * for the function to execute and resolve its returned promise.
     * If the function throws an exception or the promise is rejected a failure event is recorded instead.
     * @param funcName - The name of the argument to asyncFunc
     * @param asyncFunc - The function or a delegate that calls the function to execute and time
     * @param featureName - The name of the feature for which telemetry is being recorded
     * @param extendedProperties - (Optional) Any additional information that should be recorded about the event
     * @returns <IPromise<T>> The promise returned by asyncFunc
     */
    public static executeAndTimeAsync<T>(featureName: string, funcName: string, asyncFunc: () => IPromise<T>, extendedProperties?: IDictionaryStringTo<any>): IPromise<T> {
        var promise: IPromise<T> = null;

        var properties: IDictionaryStringTo<any> = {
            "Function": funcName,
            "StartDate": new Date(),
            "StartTime": Date.now()
        };

        var publishSuccess = () => {
            properties["ElapsedTimeMs"] = Date.now() - properties["StartTime"];
            properties = $.extend(properties, extendedProperties);

            DashboardsTelemetryCore.publish(featureName, properties);
        };

        var publishError = e => {
            properties["ElapsedTimeMs"] = Date.now() - properties["StartTime"];
            var parsedError = ErrorParser.stringifyError(e);
            properties["Error"] = parsedError;
            properties = $.extend(properties, extendedProperties);

            DashboardsTelemetryCore.publish(featureName, properties);
        };

        try {
            // We use the promise returned by .then rather than the promise returned by asyncFunc directly to ensure
            // the execution time calculation isn't delayed by any .thens chained to this function call.
            promise = asyncFunc()
                .then(value => {
                    publishSuccess();
                    return value;
                }, e => {
                    publishError(e);
                    throw e; // Throw the error so the promise is rejected
                });
        } catch (e) {
            publishError(e);
            throw e; // Throw the error so it can be handled by the caller
        }

        return promise;
    }
}

export class PullRequestTelemetry {
    public static SOURCE_PULL_REQUEST_WIDGET = "PullRequest";
    public static WIDGET_INITIALIZATION = "WidgetInitialization";
    public static WIDGET_LOAD_ERROR = "WidgetLoadError";

    public static publish(eventName: string, properties: IDictionaryStringTo<string>) {
        properties = (properties || {});
        properties["widgetType"] = PullRequestTelemetry.SOURCE_PULL_REQUEST_WIDGET;
        properties["userId"] = TFS_Host_TfsContext.TfsContext.getDefault().currentIdentity.id;

        DashboardsTelemetryCore.publish(eventName, properties);
    }
}