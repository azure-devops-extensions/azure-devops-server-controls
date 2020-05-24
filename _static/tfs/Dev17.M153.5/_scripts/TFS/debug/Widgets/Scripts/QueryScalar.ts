import "VSS/LoaderPlugins/Css!Widgets/Styles/QueryScalar";

import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");

import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import Controls = require("VSS/Controls");
import SDK = require("VSS/SDK/Shim");

import Base = require("Widgets/Scripts/BaseScalarWidget");
import Resources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import TFS_Widget_Utilities = require("Widgets/Scripts/TFS.Widget.Utilities");
import TFS_Widgets_CountControl = require("Widgets/Scripts/Shared/CountWidgetControl");
import WidgetLiveTitle = require("Widgets/Scripts/Shared/WidgetLiveTitle");
import ColorPicker = require("Presentation/Scripts/TFS/TFS.UI.Controls.ColorPicker");

import * as Service from "VSS/Service";
import WITRestClient = require("TFS/WorkItemTracking/RestClient");
import { WidgetLinkHelper } from "Widgets/Scripts/WidgetLinkHelper";
import { getWorkItemsHubId } from "WorkItemTracking/Scripts/Utils/WorkItemsHubIdHelper";
import { ColorUtilities } from "Charts/ColorUtilities";

/**
 * Used to verify that a string is a valid hex color code
 */
export class HexColorCodeValidator {
    private static hexColorRegex: RegExp = /^#(([0-9A-F]{6})|([0-9A-F]{3}))$/i; // Case-insensitive and matches 3 or 6 characters of 0-9 and/or A-F

    /**
     * Validates that the passed string is a valid hex color code that can be interpreted by a browser
     * @param {string} colorString - The string to test/verify
     * @returns true if the string is a valid hex color code
     */
    public static isValid(colorString: string): boolean {
        return HexColorCodeValidator.hexColorRegex.test(colorString);
    }
}

/**
 * Used for verifying rules, testing if values satisfy those rules,
 * and interpreting which rules should be used to supply color values
 */
export class ColorRuleInterpreter {
    /**
     * Checks if the result count satisfies the color rule
     * @param {IQueryColorRule} colorRule - The rule to check against
     * @param {number} resultCount - The value to check against the rule
     * @returns true if the value satisfies the rule
     */
    public static isRuleSatisfied(colorRule: IQueryColorRule, resultCount: number): boolean {
        var testResult = false;

        if (resultCount != null
            && ColorRuleInterpreter.isRuleValidAndEnabled(colorRule)
            && $.isNumeric(resultCount)
            && $.isNumeric(colorRule.thresholdCount)) {

            testResult = ColorRuleInterpreter.evaluate(resultCount, colorRule.operator, colorRule.thresholdCount);
        }

        return testResult;
    }

    /**
     * supports simple evaluations of two numbers, using operators described in validQueryOperators array
     */
    public static evaluate(leftVal: number, operator: string, rightVal: number): boolean {
        var result: boolean = false;
        switch (operator) {
            case "<":
                result = leftVal < rightVal;
                break;
            case ">":
                result = leftVal > rightVal;
                break;
            case "<=":
                result = leftVal <= rightVal;
                break;
            case ">=":
                result = leftVal >= rightVal;
                break;
            case "<>":
                result = leftVal != rightVal;
                break;
            case "=":
                result = leftVal == rightVal;
                break;
            default:
                throw Error("An unsupported operator was selected.");
        }

        return result;
    }

    /**
     * Checks if a rule is correctly defined and enabled
     * @param {IQueryColorRule} colorRule - The rule to check
     * @returns true if the rule is enabled and valid
     */
    public static isRuleValidAndEnabled(colorRule: IQueryColorRule): boolean {
        var validRule = false;

        if (colorRule && colorRule.isEnabled) {
            var operatorIndex = validQueryColorOperators.indexOf(colorRule.operator);

            validRule = (operatorIndex >= 0)
                && HexColorCodeValidator.isValid(colorRule.backgroundColor)
                && colorRule.thresholdCount != null;
        }

        return validRule;
    }

    /**
     * Evaluates an array of color rules against the query result count and returns
     * the background color for the widget to use based upon which rules are satisfied.
     * If no rules are satisfied then the fallback background color is used.
     * Rule precedence is that a later satisfied rule in the array wins over an earlier satisfied rule.
     * @param {IQueryColorRule[]} colorRules - The rules to evaluate
     * @param {number} resultCount - The number to check the rules against
     * @returns The hex color code to use for the background color or null if no rules are matched
     */
    public static getBackgroundColor(colorRules: IQueryColorRule[], resultCount: number): string {
        var backgroundColor = null;

        if (colorRules && resultCount != null) {
            colorRules.forEach((rule: IQueryColorRule) => {
                if (ColorRuleInterpreter.isRuleSatisfied(rule, resultCount)) {
                    backgroundColor = rule.backgroundColor;
                }
            });
        }

        return backgroundColor;
    }

    /**
     * Convert the color string from previous queryScalar to match the new color picker
     * @param oldColor - The hex string of the color
     */
    public static convertOldColor(oldColor: string): string {
        var newColorString = oldColor;
        if (oldColor == "#339933") {
            newColorString = "#339947";
        } else if (oldColor == "#E51400") {
            newColorString = "#E60017";
        } else if (oldColor == "#009BCC") {
            newColorString == QueryScalar.defaultBackgroundColor;
        }
        return newColorString;
    }
}

/** The known set of query evaluation operators accepted for Coloring the Query Widget.*/
export var validQueryColorOperators: string[] = ['<', '>', '<=', '>=', '<>', '='];

/** These rules describe non-default conditions for coloring the query tile. 
  * This is evaluated like so:
  *   (actual queryResult) operator (thresholdCount)
  */
export interface IQueryColorRule {
    /** Determines if the rule is applicable. Notes on disabled state:
     *   -Editor and View do not treat malformed state of a disabled rule as a blocking issue.
     *   -Editor will still show last state, when disabled. 
     */
    isEnabled: boolean;

    /** The comparison operator to use. Only recognized operators from our shortlist are allowed for use.*/
    operator: string;

    /** The right-side number is a user supplied value we use with the operator to evaluate the rule.*/
    thresholdCount: number;

    /** The color to apply, if the rule is relevant. 
      * Well formed input is #RRGGBB(Clients should be tolerant of lower case). We don't need any other formats, as the content isn't directly user facing.*/
    backgroundColor: string;
}

/**
 * Describes a WIT Query
 */
export interface IQueryInformation {
    // Name of the selected query (query name from WIT)
    queryName: string;

    // ID for the selected query
    queryId: string;
}

/** Describes results from private QueryResultCount web API */
export interface QueryResult {
    Count: number;
    Name: string;
}

/**
 * Describes the settings/configuration used by Query Scalar Widget and its configuration view
 * Not a general purpose contract. Note: foreground color is not user selectable, but a secret managed by client implementation, which is why it is not stored. */
export interface IQueryConfiguration extends IQueryInformation, WidgetLiveTitle.ITrackName {
    defaultBackgroundColor: string;

    /** Rules must be evaluated in descending order.  The last rule to match is applied. */
    colorRules: IQueryColorRule[];
}

/**
* Draws the 1 x 1  Query Count/Scalar Tile. 
*/
export class QueryScalar extends Base.BaseScalarWidget
    implements Dashboards_WidgetContracts.IConfigurableWidget {

    /**
    * unique identifier for the query whose results/aggregations are being presented. 
    */
    private _queryId: string;

    private _backgroundColor: string;

    // resources
    public static FooterText: string = Resources.QueryScalar_FooterText;

    // dom constants. 
    public static DomCoreCssClass: string = "queryscalar-container";

    // other constants.
    public static QueryDoesNotExistVSCode: string = "TF401243";
    public static QueryScalarEnhancementName: string = "dashboards.queryScalar";

    public static defaultBackgroundColor: string = "#009CCC";

    public constructor(options: Dashboard_Shared_Contracts.WidgetOptions) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: QueryScalar.DomCoreCssClass
        }, options));
    }

    public reloadData(newSettings: Dashboards_WidgetContracts.WidgetSettings): boolean {
        var parsedNewSettings = this._getParsedSettings(newSettings.customSettings.data);
        return (this._queryId != parsedNewSettings.queryId);
    }

    public render(): void {
        super.render();
        var parsedSettings = this._getParsedSettings(this.settings);
        this.applyColorRules(parsedSettings);
    }

    protected getClickPermission(): boolean {
        return WidgetLinkHelper.canUserAccessWITQueriesPage();
    }

    public applyColorRules(parsedSettings: IQueryConfiguration) {
        // Select background color, based on current count.
        this._backgroundColor = QueryScalar.defaultBackgroundColor;
        if (parsedSettings) {
            var defaultBackgroundColor = parsedSettings.defaultBackgroundColor ? parsedSettings.defaultBackgroundColor : QueryScalar.defaultBackgroundColor;
            this._backgroundColor = ColorRuleInterpreter.getBackgroundColor(
                parsedSettings.colorRules,
                this.scalarResultCount);
            if (this._backgroundColor == null) {
                this._backgroundColor = ColorRuleInterpreter.convertOldColor(defaultBackgroundColor);
            }
        }
        this.getElement().css("background-color", this._backgroundColor);

        // Determine the font color
        var backgroundColor = new ColorPicker.Color(this._backgroundColor);

        TFS_Widget_Utilities.DashboardGridUIHelper.toggleDarkWidget(this.getElement(), backgroundColor.toBlackOrWhite().asHex() == "#000000");
        
        this.countWidgetControl.getElement().css("color", ColorUtilities.selectForegroundColor(this._backgroundColor));
    }

    /**
    * Load the data from the server and then call render() to load the widget.
    */
    public loadAndRender(state: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        {
            var parsedSettings = this._getParsedSettings(this.settings);
            if (!parsedSettings) {
                return WidgetHelpers.WidgetStatusHelper.Failure(Resources.InvalidConfigurationReconfigure);
            }

            this._queryId = parsedSettings.queryId;

            // start data load to render widget. 
            return this.getData().then((count: number) => {
                if (!this.isDisposed()) {
                    this.scalarResultCount = count;

                    this.render();
                }
                return WidgetHelpers.WidgetStatusHelper.Success();
            }, (reason: any) => {
                var error: string = TFS_Widget_Utilities.ErrorParser.stringifyError(reason);
                return WidgetHelpers.WidgetStatusHelper.Failure(error);
            });

        }
    }

    /**
    * Returns the url to be used when the user clicks on the widget
    */
    public getUrlForWidget(): string {
        return this._getUrlForClickingAction(this._queryId);
    }

    /**
     * Returns the Id of the hub targeted by the widget Url
    */
    public getUrlHubId(): string {
        return getWorkItemsHubId();
    }
    /**
     * Get work item results count from WIT REST APIs 
     * @returns the list of work item references for the widget queryId
     */
    public getData(): IPromise<any> {
        var witClient = Service.getClient(WITRestClient.WorkItemTrackingHttpClient, undefined, undefined, undefined, { timeout: TFS_Dashboards_Common.ClientConstants.WidgetAjaxTimeoutMs });
        return witClient.getQueryResultCount(this._queryId, this.webContext.project.id, this.teamContext.id);
    }

    public getCurrentOptions(): TFS_Widgets_CountControl.CountControlOptions {
        return {
            header: this.getWidgetName(),
            count: this.scalarResultCount,
            footer: QueryScalar.FooterText
        };
    }

    /**
     * Parses the widget's settings and returns the result
     * @returns The widget's settings/configuration or null if parsing fails
     */
    public _getParsedSettings(inputSettings: string): IQueryConfiguration {
        var settings: IQueryConfiguration = null;

        try {
            settings = JSON.parse(inputSettings);
        }
        catch (e) {
            // suppressing exception as we handle null configuration within load and Render. 
        }

        return settings;
    }

    /**
    * Get the link for the widget to pass to the scalar control setup. 
    * @param {string} queryId - id for the query.
    * @ return url for the link that would display work items associated with the query. 
    */
    public _getUrlForClickingAction(queryId: string): string {
        var context = TFS_Host_TfsContext.TfsContext.getDefault();
        var actionReplacementToken = "ACTIONREPLACEMENTTOKEN";
        var url = context.getActionUrl(actionReplacementToken, "queries", {});
        url = url.replace(actionReplacementToken, "resultsById/" + queryId);
        return url;
    }
}

SDK.VSS.register(QueryScalar.QueryScalarEnhancementName, () => QueryScalar);
SDK.registerContent("dashboards.queryScalar-init", (context) => {
    return Controls.create(QueryScalar, context.$container, context.options);
});
