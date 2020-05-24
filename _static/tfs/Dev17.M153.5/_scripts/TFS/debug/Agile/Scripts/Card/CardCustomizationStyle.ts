/// <reference types="jquery" />



import Cards = require("Agile/Scripts/Card/Cards");
import Predicate = require("Agile/Scripts/Common/Predicate");
import Predicate_WIT = require("Agile/Scripts/Common/PredicateWIT");
import Utils_String = require("VSS/Utils/String");
import Diag = require("VSS/Diag");
import Work_Contracts = require("TFS/Work/Contracts");
import AgileUtils = require("Agile/Scripts/Common/Utils");
import VSS_Service = require("VSS/Service");
import Work_WebApi = require("TFS/Work/RestClient");
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Service = require("VSS/Service");
import WIT_UI_Tags = require("WorkItemTracking/Scripts/TFS.UI.Tags");


var DatabaseCoreFieldRefName = AgileUtils.DatabaseCoreFieldRefName;

/**
 * Represents the initialize options for ConfigureStylesControl
 * @param StyleCustomization.IStyleRule[] List of current style rules configured for the board
 * @param boolean Whether the settings are editable
*/
export interface ICardStyleSettingsCSCControlInitOptions {
    styleRules?: Cards.IStyleRule[];
    isEditable: boolean;
    disableSave?: Function;
    saveDelegate?: (styles: IBaseStyleRule[], types: string[], successCallBack: IResultCallback, errorCallback: IErrorCallback) => any;
    itemTypes: string[];
    requireRefreshOnSave?: boolean;
    applyChanges?: Function;

    /** Id of the team owning the board */
    teamId: string;
    boardIdentity: string;
    boardType: string;
}

export interface IBaseStyleRule {
    name: string;
    isEnabled: boolean;
    type: string;
}

export interface ICardStyleRule extends IBaseStyleRule {
    backgroundColor: string;
    wiql: string;
    titleColor?: string;
    titleFontWeight?: string;
    titleFontStyle?: string;
    titleTextDecoration?: string;
}

export interface ITagColorRule extends IBaseStyleRule {
    color: string;
    backgroundColor: string;
}


export class RuleType {
    public static ANNOTATION = "annotation";
    public static FILL = "fill";
    public static TAGSTYLE = "tagStyle";
}

export class Attributes implements Work_Contracts.attribute {
}

export class FilterClause implements Work_Contracts.FilterClause {
    fieldName: string;
    index: number;
    logicalOperator: string;
    operator: string;
    value: string;
}

export class Rule implements Work_Contracts.Rule {
    settings: Attributes;
    filter: string;
    name: string;
    isEnabled: string;
    clauses: FilterClause[];
    constructor(on: string, name: string, filter: string, attributes: Attributes) {
        this.filter = filter;
        this.name = name;
        this.isEnabled = on;
        this.settings = attributes;
    }
}

export class BoardCardRuleSettings implements Work_Contracts.BoardCardRuleSettings {
    rules: {
        [key: string]: Rule[];
    };

    url: string;
    _links: any;

    constructor(types: string[]) {
        this.rules = {};
        if (types) {
            for (var i = 0; i < types.length; i++) {
                if (!this.rules[types[i]]) {
                    this.rules[types[i]] = [];
                }
            }
        }
    }

    public addRule(key: string, rule: Rule) {
        if (!this.rules[key]) {
            this.rules[key] = [];
        }
        this.rules[key].push(rule);
    }
}



export class StyleRuleSettings {
    public static BACKGROUND_COLOR = "background-color";
    public static TITLE_COLOR = "title-color";
    public static TITLE_FONT_WEIGHT = "title-font-weight";
    public static TITLE_FONT_STYLE = "title-font-style";
    public static TITLE_TEXT_DECORATION = "title-text-decoration";
}

export class CSSProperties {
    public static BACKGROUND_COLOR = "background-color";
    public static COLOR = "color";
    public static FONT_WEIGHT = "font-weight";
    public static FONT_STYLE = "font-style";
    public static TEXT_DECORATION = "text-decoration";
}

export class CSSPropertyValues {
    public static BOLD = "bold";
    public static ITALIC = "italic";
    public static UNDERLINE = "underline";
}

export class StyleRuleHelper {

    /**
     * Get stype attributes
     * @param style of type ICardStyleRule
     */
    public static getStyleAttribute(style: ICardStyleRule): Attributes {
        const attr: Attributes = {};
        attr[StyleRuleSettings.BACKGROUND_COLOR] = style.backgroundColor;
        if (style.titleColor) {
            attr[StyleRuleSettings.TITLE_COLOR] = style.titleColor;
        }
        if (style.titleFontStyle) {
            attr[StyleRuleSettings.TITLE_FONT_STYLE] = style.titleFontStyle;
        }
        if (style.titleFontWeight) {
            attr[StyleRuleSettings.TITLE_FONT_WEIGHT] = style.titleFontWeight;
        }
        if (style.titleTextDecoration) {
            attr[StyleRuleSettings.TITLE_TEXT_DECORATION] = style.titleTextDecoration;
        }
        return attr;
    }

    private applyFillStyle(element: JQuery, teamId: string, fieldDefinitions: IDictionaryStringTo<Cards.CardFieldDefinition>, getFieldValue: (refName: string) => string, styleRules: Cards.IStyleRule[]): void {
        Diag.logTracePoint("Fill.Style.start");
        var length: number = styleRules.length;
        var helper: Predicate.IPredicateEvaluationHelper = new Predicate_WIT.WorkItemPredicateEvaluationHelper(teamId, fieldDefinitions, getFieldValue);
        var allowedFillStyles: string[] = [StyleRuleSettings.BACKGROUND_COLOR];
        var allowedTitleStyles: string[] = [StyleRuleSettings.TITLE_COLOR, StyleRuleSettings.TITLE_TEXT_DECORATION, StyleRuleSettings.TITLE_FONT_WEIGHT, StyleRuleSettings.TITLE_FONT_STYLE];

        for (var j = 0; j < length; j++) {
            var styleRule = styleRules[j];

            if (styleRule.isEnabled) {
                var predicate = new Predicate_WIT.QueryExpression(styleRule.criteria).toPredicate();

                if (predicate.evaluate(helper)) {
                    var backgroundDecorator: CSSDecorator = new CSSDecorator(allowedFillStyles);
                    backgroundDecorator.decorate(element, styleRule.styles);
                    var titleDecorator: CSSDecorator = new CSSDecorator(allowedTitleStyles);
                    var $titleElem = element.find("[field='" + DatabaseCoreFieldRefName.Title + "']");
                    //now the title element has a clickable title hyperlink inside it which inturn wraps a clickable-title span
                    //coloring the span element would take precedence over all the default color styles(on hover, visited etc) applied for a hyperlink
                    var $titleSpan = $titleElem.find(".clickable-title").first();
                    titleDecorator.decorate($titleSpan, styleRule.styles);
                    // add a class if the card has custom style applied.
                    element.addClass("custom-style-applied");
                    return;
                }
            }
        }
        Diag.logTracePoint("Fill.Style.complete");
    }

    private applyTagColorStyle(element: JQuery, styleRules: Cards.IStyleRule[]): void {
        Diag.logTracePoint("TagColor.Style.start");
        var allowedTagColorStyles: string[] = ["color", "background-color"];
        var tagColorDecorator: CSSDecorator = new CSSDecorator(allowedTagColorStyles);
        for (var j = 0; j < styleRules.length; j++) {
            var styleRule = styleRules[j];
            if (styleRule.isEnabled && styleRule.styles) {
                var tagbox: JQuery = element.find("li.tag-item").filter(function () { return Utils_String.equals($(this).data(WIT_UI_Tags.TagControl.FullTagNameKey), styleRule.name, true) || Utils_String.equals($(this).text(), styleRule.name, true); });
                if (tagbox.length) {
                    tagColorDecorator.decorate(tagbox.find("span.tag-box"), styleRule.styles);
                }
            }
        }
        Diag.logTracePoint("TagColor.Style.complete");
    }

    /**
     * Customize tag color save handler
     * @param teamId teamId guid as string
     * @param styles array of ITagColorRule
     * @param board board scope id 
     * @param types type array such as ['tagStyle',.. etc]
     * @param successCallback callback to be called on success
     * @param errorCallback callback to be called on error
     */
    public static onCustomizeTagColorSave(teamId: string, styles: ITagColorRule[], board: string, types: string[], successCallback: IResultCallback, errorCallback: IErrorCallback) {

        const successHandler = (result) => {
            successCallback();
        };
        const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        const tfsConnection = new Service.VssConnection(tfsContext.contextData);
        const workHttpClient = tfsConnection.getHttpClient<Work_WebApi.WorkHttpClient>(Work_WebApi.WorkHttpClient);
        const teamContext: TFS_Core_Contracts.TeamContext = { projectId: tfsContext.contextData.project.id, teamId: teamId, project: undefined, team: undefined };

        workHttpClient.updateBoardCardRuleSettings(
            StyleRuleHelper._convertTagColorSettingToRestDefinition(styles, types),
            teamContext,
            board
        ).then(successHandler, errorCallback);
    }

    private static _convertTagColorSettingToRestDefinition(styles: ITagColorRule[], types: string[]): BoardCardRuleSettings {
        var newSettings: BoardCardRuleSettings = new BoardCardRuleSettings(types);
        var length: number = styles.length;
        for (var k = 0; k < length; k++) {
            var style = styles[k];
            var rule = new Rule(style.isEnabled.toString(), style.name, null, StyleRuleHelper._getTagColorAttribute(style.color, style.backgroundColor));
            newSettings.addRule(style.type, rule);
        }
        return newSettings;
    }

    private static _getTagColorAttribute(color: string, backgroundColor: string): Attributes {
        var attr: Attributes = {};
        attr["background-color"] = backgroundColor;
        attr["color"] = color;
        return attr;
    }

    /**
     * Apply customer style
     * @param element JQuery element
     * @param teamId team id
     * @param fieldDefinitions fieldDefinitions dictionary
     * @param getFieldValue helper to get fieldValue
     * @param styleRules style rules array
     */
    public applyCustomStyle(element: JQuery, teamId: string, fieldDefinitions: IDictionaryStringTo<Cards.CardFieldDefinition>, getFieldValue: (refName: string) => string, styleRules: Cards.IStyleRule[]): void {
        var fillStyleRules: Cards.IStyleRule[] = [];
        var tagColorStyleRules: Cards.IStyleRule[] = [];

        for (var i = 0; i < styleRules.length; i++) {
            // Fill Data population
            if (Utils_String.equals(styleRules[i].type, RuleType.FILL, true) && styleRules[i].criteria) {
                fillStyleRules.push(styleRules[i]);
            }
            // Tag Color Data population
            else if (Utils_String.equals(styleRules[i].type, RuleType.TAGSTYLE, true)) {
                tagColorStyleRules.push(styleRules[i]);
            }
        }
        // Helper method to apply Fill Style
        this.applyFillStyle(element, teamId, fieldDefinitions, getFieldValue, fillStyleRules);

        // Helper method to apply Tag Color Style
        this.applyTagColorStyle(element, tagColorStyleRules);
    }

    /**
     * Get board card rule settings
     * @param teamId teamId
     * @param boardIdentity boardId
     */
    public static beginGetBoardCardRuleSettings(teamId: string, boardIdentity: string): IPromise<any> {
        const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        const tfsConnection = new VSS_Service.VssConnection(tfsContext.contextData);
        const workHttpClient = tfsConnection.getHttpClient<Work_WebApi.WorkHttpClient>(Work_WebApi.WorkHttpClient);
        const teamContext = <TFS_Core_Contracts.TeamContext>{
            projectId: tfsContext.contextData.project.id,
            teamId: teamId
        };
        return workHttpClient.getBoardCardRuleSettings(teamContext, boardIdentity);
    }

    /**
     * Convert REST definition to board style setting
     * @param styles BoardCardRuleSettings
     * @param ruleType rule type
     */
    public static convertRestDefinitionToBoardStyleSetting(styles: BoardCardRuleSettings, ruleType: string): Cards.IStyleRule[] {
        const styleRules: Cards.IStyleRule[] = [];
        if (styles.rules) {
            const filteredRules = styles.rules[ruleType];
            if (filteredRules) {
                const length: number = filteredRules.length;
                for (let k = 0; k < length; k++) {
                    const style = filteredRules[k];
                    const fillRule: Cards.ICardRuleAttribute = {};

                    if (style.settings) {
                        for (const key in style.settings) {
                            if (style.settings.hasOwnProperty(key)) {
                                fillRule[key] = style.settings[key];
                            }
                        }
                    }

                    const styleArray: Cards.ICardRuleAttribute[] = [];
                    styleArray.push(fillRule);

                    let criteria: Cards.IItemQuery = <Cards.IItemQuery>{};
                    if (style.clauses) {
                        criteria = { clauses: style.clauses, groups: [], maxGroupLevel: 0 };
                    }

                    const styleRule: Cards.IStyleRule =
                    {
                        isEnabled: Utils_String.ignoreCaseComparer(style.isEnabled, "true") === 0,
                        name: style.name,
                        styles: fillRule,
                        type: ruleType,
                        criteria: criteria
                    };

                    styleRules.push(styleRule);
                }
            }
        }
        return styleRules;
    }
}

export class CSSDecorator {
    private allowedStyles: string[];

    constructor(styles: string[]) {
        this.allowedStyles = styles;
    }
    public decorate($element: JQuery, styles: Cards.ICardRuleAttribute) {
        Object.keys(styles).forEach((key) => {
            if (this.allowedStyles.indexOf(key) >= 0) {
                $element.css(this.getCssPropertyName(key), styles[key]);
            }
        });
    }

    public getCssPropertyName(styleKey: string): string {
        switch (styleKey) {
            case StyleRuleSettings.TITLE_COLOR:
                return CSSProperties.COLOR;
            case StyleRuleSettings.TITLE_TEXT_DECORATION:
                return CSSProperties.TEXT_DECORATION;
            case StyleRuleSettings.TITLE_FONT_STYLE:
                return CSSProperties.FONT_STYLE;
            case StyleRuleSettings.TITLE_FONT_WEIGHT:
                return CSSProperties.FONT_WEIGHT;
            default:
                return styleKey;
        }
    }
}


