import { ErrorParser as AnalyticsErrorParser } from "Analytics/Scripts/AnalyticsExceptionUtilities";

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import { RepositoryType } from "VersionControl/Scripts/RepositoryContext";

import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Locations = require("VSS/Locations");
import Utils_String = require("VSS/Utils/String");

export function isUndefinedOrNull(exp : any) : boolean {
    return (exp === undefined || exp === null);
}

// This class is deprecated.
//Directly use framework API's for getMvcUrl (preferred) or getActionUrl if you need non-standard scope on uri's.
export class WebContextHelper {

    /**
    * Gets the link to the Mvc route url that matches the action and controller.
    * @param {string} action -  action method for the workflow that maps to the list item.
    * @param {string} controller -  MVC Controller that manages the action method.
    * @return url to the mvc action controller.
    */
    public static getActionUrl(webContext: Contracts_Platform.WebContext, action: string, controller: string): string {
        return Locations.urlHelper.getMvcUrl(<Locations.MvcRouteOptions>{
            webContext: webContext,
            action: action,
            controller: controller
        });
    }

    public static getCollectionRelativeUrl(webContext: Contracts_Platform.WebContext): string {
        if (webContext.collection) return webContext.collection.relativeUri;
    }

    public static getProjectUrl(): string {
        var context = TFS_Host_TfsContext.TfsContext.getDefault();
        return context.getActionUrl(null, null, { team: "" });
    }
}

export class DashboardGridUIHelper {
    /**
     * Indicates whether the widget has a dark background or not.
     * A dark widget gets a white ellipsis in its menu instead of the default black ellipsis for better visibility.
     * @param $widgetElement - The widget for which to adjust the state.
     * @param value - True to set for a dark widget. False to set for a light widget.
     */
    public static toggleDarkWidget($widgetElement: JQuery, value: boolean): void {
        const $widgetHost = $widgetElement.closest(".widgethost, #preview");
        $widgetHost.toggleClass("dark-widget", value);
        $widgetHost.toggleClass("light-widget", !value);
    }
}

export class ErrorParser {
    /*
       Given an error object returns string component of that error
    */
    public static stringifyError(error: any): string {
        return AnalyticsErrorParser.stringifyError(error);
    }

    public static isHtmlError(arg: any): arg is HtmlError {
        return !isUndefinedOrNull(arg)
            && typeof arg.html !== "undefined";
    }
}

/**
 * An error that is structured html.
 */
export interface HtmlError {
    html: string;
}

export class VersionControlHelper {
    public static TfvcPathRoot = "$/";

    /**
    * Get the type of the Repo by providing the
    */
    public static GetRepoType(reproPath: string): RepositoryType {
        return (reproPath.indexOf(VersionControlHelper.TfvcPathRoot) == 0) ?
            RepositoryType.Tfvc :
            RepositoryType.Git;
    }
}
