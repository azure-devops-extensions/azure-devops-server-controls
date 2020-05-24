/// <amd-dependency path="jQueryUI/sortable"/>
/// <reference types="jquery" />

import "VSS/LoaderPlugins/Css!Cards";
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Agile = require("Agile/Scripts/Common/Agile");
import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import AgileUtils = require("Agile/Scripts/Common/Utils");
import Cards_NO_REQUIRE = require("Agile/Scripts/Card/Cards");
import Configurations = require("Presentation/Scripts/TFS/TFS.Configurations");
import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
import Culture = require("VSS/Utils/Culture");
import Notifications = require("VSS/Controls/Notifications");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Diag = require("VSS/Diag");
import FieldsFilter = require("WorkItemTracking/Scripts/Controls/Fields/FieldsFilterControl");
import ko = require("knockout");
import Predicate_WIT = require("Agile/Scripts/Common/PredicateWIT");
import StyleCustomization = require("Agile/Scripts/Card/CardCustomizationStyle");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import { IdentityMruStore } from "Presentation/Scripts/TFS/TFS.OM.Identities.Mru";
import TFS_UI_Controls_Identities = require("Presentation/Scripts/TFS/TFS.UI.Controls.Identities");
import Utils_Array = require("VSS/Utils/Array");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import ViewModel = require("Agile/Scripts/Card/CardCustomizationStyleViewModel");
import VSS_Service = require("VSS/Service");
import WITCommonResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking.Common");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import { parseCurrentIteration } from "WorkItemTracking/Scripts/OM/WiqlValues";
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Q = require("q");
import Menus = require("VSS/Controls/Menus");
import Work_WebApi = require("TFS/Work/RestClient");
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import Boards = require("Agile/Scripts/TFS.Agile.Boards");
import Identities_RestClient = require("VSS/Identities/Picker/RestClient");
import IdentityPicker = require("VSS/Identities/Picker/Controls");
import WITHelpers = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Helpers");
import { WITIdentityHelpers } from "TfsCommon/Scripts/WITIdentityHelpers";
import Util_Cards = require("Agile/Scripts/Card/CardUtils");
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");
import { QueryAdapter } from "WorkItemTracking/Scripts/OM/QueryAdapter";
import { WiqlOperators, isTodayMacro } from "WorkItemTracking/Scripts/OM/WiqlOperators";
import { IClause } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import Utils_Date = require("VSS/Utils/Date");
import { loadHtmlTemplate } from "Agile/Scripts/Board/Templates";

TFS_Knockout.overrideDefaultBindings()

var domElem = Utils_UI.domElem;

class StyleControlConstants {
    public static styleRuleContentClass: string = "card-styling-dialog-content";
    public static styleRuleInfoTemplate: string = "card_styling_info_template";
    public static styleRuleListTemplate: string = "card_styling_rules_template";
}

function useCommonIdentityPicker() {
    // Explicity preventing the new idenity control from being used...
    return false;
}

export class ConfigureStylesCSCControl extends Configurations.TabContentBaseControl<StyleCustomization.ICardStyleSettingsCSCControlInitOptions> {
    public static enhancementTypeName: string = "tfs.agile.cardStylesCSCControl";
    private static SORT_ANIMATION_DURATION_TIME: number = 50;
    private static SORTABLE_HELPER_CLASS = "style-rule-sortable-helper";
    private static RULE_CONTAINER_CLASS = "rule-container";
    private static COMPACT_RULE_CONTAINER_CLASS = "compact-rule-container";
    private static RULE_CRITERION_CONTAINER_CLASS = "style-rule-criteria";
    private static REORDER_DRAG_DISTANCE = 5;
    private static DESCRIPTION_AREA_CONTAINER_CLASS = "style-settings-description-area-container";
    private static MESSAGE_AREA_CONTAINER_CLASS = "style-settings-message-area-container";
    private static OVERLAY_CLASS = "card-styling-control-overlay";
    private static CARD_STYLING_RULES_TEMPLATE_CLASS = "card-styling-rules-template";
    private static CARD_STYLES_TAB_CONTENT_CLASS = "card-styles-tab-content";
    private static POPUP_MENU_SELECTOR = "." + StyleControlConstants.styleRuleContentClass + " .menu-popup";
    private _messageArea: Notifications.MessageAreaControl;
    private _controlOverlay: JQuery;
    private _statusIndicator: StatusIndicator.StatusIndicator;
    private _menu: Menus.PopupMenu;

    public _options: StyleCustomization.ICardStyleSettingsCSCControlInitOptions;
    public styleRules: Cards_NO_REQUIRE.IStyleRule[];
    private _viewModel: ViewModel.StyleRuleCollectionViewModel;
    private _controls: IDisposable[] = [];
    private _supportedFieldsDefinitions: WITOM.FieldDefinition[] = [];
    private _predicateConfig: Predicate_WIT.WorkItemPredicateConfiguration;
    private _requireRefreshOnSave = true;
    public applyChanges: Function;

    public initializeOptions(options?: StyleCustomization.ICardStyleSettingsCSCControlInitOptions): void {
        this.styleRules = options.styleRules;
        this.applyChanges = options.applyChanges;
        super.initializeOptions($.extend({
            cssClass: StyleControlConstants.styleRuleContentClass
        }, options));
    }

    public initialize() {
        super.initialize();
        this.getElement().parents(".tab-content-main").addClass(ConfigureStylesCSCControl.CARD_STYLES_TAB_CONTENT_CLASS);
        this._predicateConfig = new Predicate_WIT.WorkItemPredicateConfiguration();

        this._bindCustomHandlers();

        this._drawMessageArea();

        if (!this.styleRules) {
            var constructView = (styleRules: Cards_NO_REQUIRE.IStyleRule[]) => {
                this.styleRules = styleRules;
                this._viewModel = new ViewModel.StyleRuleCollectionViewModel(this.styleRules, this._options.isEditable);
                this._createStyleInfo();
                this._createStyleList();

                if (this._supportedFieldsDefinitions) {
                    // Hide the overlay first
                    this.hideOverlay();
                    //For each style rule form, create a wiql control for the criteria editing.
                    this._drawStyleRuleCriteriaControls();
                }
            };
            var errorHandler = (error: { message: string; serverError: any; }) => {
                this.beginExecuteAction(() => {
                    this.hideOverlay();
                    this.viewModel().error(error.message);
                });
            };

            var successCallbackForKanban = (boardCardSettings: StyleCustomization.BoardCardRuleSettings) => {
                this.beginExecuteAction(() => {
                    var styleRules = StyleCustomization.StyleRuleHelper.convertRestDefinitionToBoardStyleSetting(boardCardSettings, StyleCustomization.RuleType.FILL);
                    constructView(styleRules);
                });
            };

            var successCallbackForTaskboard = (cardSettings: Cards_NO_REQUIRE.IBoardCardSettings) => {
                this.beginExecuteAction(() => {
                    constructView(cardSettings.styles);
                });
            };

            if (this._options.boardType === AgileUtils.BoardType.Kanban) {
                const boardIdentity = this._options.boardIdentity;
                const teamId = this._options.teamId;
                StyleCustomization.StyleRuleHelper.beginGetBoardCardRuleSettings(teamId, boardIdentity).then(successCallbackForKanban, errorHandler);
            }
            else if (this._options.boardType === AgileUtils.BoardType.Taskboard) {
                this._beginGetBoardCardSettingsMVC(successCallbackForTaskboard, errorHandler);
            }
        }
        else {
            this._viewModel = new ViewModel.StyleRuleCollectionViewModel(this.styleRules, this._options.isEditable);
            this._createStyleInfo();
            this._createStyleList();
        }

        this._requireRefreshOnSave = this._options.requireRefreshOnSave ? this._options.requireRefreshOnSave : false;

        // On IE9 and IE10, the height getting calculated for the .card-styling-dialog-content div is more than 100% of its parent though we have it set as 100% of its parent.
        // Because of this an extra scroll appears for IE9 and IE10 on the dialog as the content with the above height doesnt fit in the dialog. 
        // 1) For IE10 Reducing the height by 145px so that the content fits in the dialog. 
        // 2) For IE9 Changing the height to 55% as calc is not working on IE9. On most resolutions this looks fine.
        if (Utils_UI.BrowserCheckUtils.isIEVersion(10)) {
            this._element.css("height", "calc(100% - 145px)");
        }
        else if (Utils_UI.BrowserCheckUtils.isIEVersion(9)) {
            this._element.css("height", "55%");
        }
        // Show loading overlay since we will be making a server call to fetch field definitions
        this.showOverlay(AgileControlsResources.CardStyleRulesLoading);

        var fieldDefinitions: WITOM.FieldDefinition[] = [];

        AgileUtils.WorkItemUtils.beginGetWorkItemTypeMap(this._options.itemTypes,
            (workItemTypeMap: IDictionaryStringTo<WITOM.WorkItemType>) => {
                for (let key of Object.keys(workItemTypeMap)) {
                    let fieldMap: IDictionaryStringTo<WITOM.FieldDefinition> = workItemTypeMap[key].fieldMap;
                    for (let fieldName of Object.keys(fieldMap)) {
                        fieldDefinitions.push(fieldMap[fieldName]);
                    }
                }

                this._supportedFieldsDefinitions = this._getSupportedFields(fieldDefinitions);

                Utils_Array.uniqueSort<WITOM.FieldDefinition>(this._supportedFieldsDefinitions, (a: WITOM.FieldDefinition, b: WITOM.FieldDefinition) => {
                    return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
                });

                if (this.styleRules) {
                    // Hide the overlay first
                    this.hideOverlay();
                    //For each style rule form, create a wiql control for the criteria editing.
                    this._drawStyleRuleCriteriaControls();
                }
            },
            (error: TfsError) => {
                // Hide the overlay first
                this.hideOverlay();

                this.viewModel().error(error.message);
            });

    }

    /**
     * Bind the customized handler in knockout template.
     */
    private _bindCustomHandlers() {
        this._bindMenuClickHandler();
        this.bindReturnKey();
        this.bindEnterKeyDown();
    }

    private _beginGetBoardCardSettingsMVC(successCallBack: IResultCallback, errorCallBack: IErrorCallback) {
        const apiLocation = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl(
            "getboardcardsettings", /* Action */
            "backlog", /* Controller */
            {
                area: "api",
                teamId: this._options.teamId
            }
        );

        Ajax.getMSJSON(apiLocation, null,
            (result) => {
                successCallBack(result);
            },
            (error) => {
                errorCallBack(error);
            });
    }

    private _bindMenuClickHandler() {
        if (this._options.isEditable) {
            (<any>ko.bindingHandlers).menuClickHandler = {
                init: (element: HTMLElement, valueAccessor: KnockoutObservable<ViewModel.StyleRuleViewModel>, allBindings, viewModel: ViewModel.StyleRuleViewModel, bindingContext) => {
                    var viewModel = valueAccessor();
                    var $element = $(element);
                    // if there aren't any items to be shown hide the context menu on the tab and don't bind handlers
                    if (this._createPopupMenuItems(viewModel).length <= 0) {
                        $element.hide();
                    }
                    else {
                        var menuClickHandler = (e?: JQueryEventObject) => {
                            if (this._menu) {
                                this._menu.dispose();
                                this._menu = null;
                            }

                            var onHideCallback = () => {
                                $element.removeClass("focus");
                            };

                            this._menu = this._createPopupMenu(viewModel, this.getElement(), onHideCallback);
                            this._menu.popup($(e.currentTarget), $(e.currentTarget));
                            this._menu.focus();
                            e.stopPropagation();
                        };
                        $element.bind("click", (e?: JQueryEventObject) => {
                            $element.addClass("focus");
                            menuClickHandler(e);
                        });
                        $element.closest("." + ConfigureStylesCSCControl.COMPACT_RULE_CONTAINER_CLASS)
                            .keydown((e?: JQueryEventObject) => {
                                if (e.keyCode === Utils_UI.KeyCode.F10 && e.shiftKey && !e.ctrlKey && !e.metaKey) {
                                    e.preventDefault();
                                    menuClickHandler(e);
                                }
                            });
                    }
                }
            };
        }
    }

    private _createPopupMenu(styleRuleViewModel: ViewModel.StyleRuleViewModel, $element?: JQuery, onHideCallback?: Function) {
        var items = this._createPopupMenuItems(styleRuleViewModel);
        var menuOptions = {
            align: "left-bottom",
            items: [{ childItems: items }]
        };
        if (onHideCallback) {
            menuOptions["onHide"] = onHideCallback;
        }
        var menu = <Menus.PopupMenu>Controls.BaseControl.createIn(Menus.PopupMenu, $element, menuOptions);
        return menu;
    }

    private _createPopupMenuItems(styleRuleViewModel: ViewModel.StyleRuleViewModel) {

        var menuItems = [];
        var index = this._viewModel.styleRules().indexOf(styleRuleViewModel);

        menuItems.push({
            id: "delete-command",
            text: AgileControlsResources.CardStyles_Delete,
            noIcon: "true",
            argument: styleRuleViewModel,
            setTitleOnlyOnOverflow: true,
            action: () => {
                this._viewModel.onDeleteRule(index);
            }
        });

        menuItems.push({
            id: "clone-command",
            text: AgileControlsResources.CardStyles_Clone,
            noIcon: "true",
            argument: styleRuleViewModel,
            setTitleOnlyOnOverflow: true,
            action: () => {
                this._viewModel.onCloneRule(index);
            },
            disabled: this._viewModel.disableAddStyle()
        });

        if (index > 0) {
            menuItems.push({
                id: "moveup-command",
                text: AgileControlsResources.CardStyles_MoveUp,
                noIcon: "true",
                argument: styleRuleViewModel,
                setTitleOnlyOnOverflow: true,
                action: () => {
                    this._viewModel.onMoveUp(index);
                }
            });
        }

        if (index !== this._viewModel.styleRules().length - 1) {
            menuItems.push({
                id: "movedown-command",
                text: AgileControlsResources.CardStyles_MoveDown,
                noIcon: "true",
                argument: styleRuleViewModel,
                setTitleOnlyOnOverflow: true,
                action: () => {
                    this._viewModel.onMoveDown(index);
                }
            });
        }

        return menuItems;
    }

    public showOverlay(message: string, options?: any) {
        /// <summary>Shows an overlay over the entire control with a status indicator on top.</summary>
        /// <param name="message" type="string">The text to display next to the spinner.</param>
        /// <param name="options" type"Object" optional="true">Optional options for the StatusIndicator control.</param>
        if (!this._controlOverlay) {
            this._controlOverlay = $("<div />").addClass("control-busy-overlay " + ConfigureStylesCSCControl.OVERLAY_CLASS).appendTo(this.getElement());
        }

        var statusOptions = options ||
            {
                center: true,
                imageClass: "big-status-progress",
                message: message,
                throttleMinTime: 0
            };
        this._statusIndicator = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, this._controlOverlay, statusOptions);
        this._statusIndicator.start();

        this._controlOverlay.show();
    }

    public hideOverlay() {
        /// <summary>Hides the overlay.</summary>
        if (this._controlOverlay) {
            Diag.Debug.assertIsNotNull(this._statusIndicator, "this._statusIndicator");
            this._statusIndicator.complete();
            this._controlOverlay.hide();
            this._controlOverlay.empty();
        }
    }

    private _drawMessageArea() {
        var $element = this.getElement();
        var $textAreaContainer = $(domElem("div", ConfigureStylesCSCControl.DESCRIPTION_AREA_CONTAINER_CLASS));
        this._createMessageArea($textAreaContainer);
        $element.append($textAreaContainer);

        if (!this._options.isEditable) {
            this._showWarning(AgileControlsResources.CardCustomizationStylesNoPermissions);
        }
    }

    private _createMessageArea($container: JQuery) {
        var $messageAreaContainer = $(domElem("div", ConfigureStylesCSCControl.MESSAGE_AREA_CONTAINER_CLASS));
        var messageAreaOption: Notifications.IMessageAreaControlOptions = {
            closeable: false,
            showIcon: true,
            type: Notifications.MessageAreaType.Warning
        };
        this._messageArea = Controls.Control.create(Notifications.MessageAreaControl, $messageAreaContainer, messageAreaOption);
        $container.append($messageAreaContainer);
    }

    private _showWarning(message: string) {
        this._messageArea.setMessage(message, Notifications.MessageAreaType.Warning);
    }

    private _beginSettingsSaveRest(styles: StyleCustomization.ICardStyleRule[], types: string[], successCallback: IResultCallback, errorCallback: IErrorCallback) {
        // success
        var successHandler = (result) => {
            successCallback();
        };
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var tfsConnection = new VSS_Service.VssConnection(tfsContext.contextData);
        var workHttpClient = tfsConnection.getHttpClient<Work_WebApi.WorkHttpClient>(Work_WebApi.WorkHttpClient);
        var teamContext = <TFS_Core_Contracts.TeamContext>{
            projectId: tfsContext.contextData.project.id,
            teamId: this._options.teamId
        };

        workHttpClient.updateBoardCardRuleSettings(this._convertStylesToBoardCardRuleSettings(styles, types), teamContext, this._options.boardIdentity)
            .then(successHandler, errorCallback);
    }

    private _beginSettingsSaveMVC(styles: StyleCustomization.ICardStyleRule[], types: string[], successCallback: IResultCallback, errorCallback: IErrorCallback) {
        const apiLocation = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl(
            "setboardcardrules", /* Action */
            "backlog", /* Controller */
            {
                area: "api",
                teamId: this._options.teamId
            }
        );
        Ajax.postMSJSON(apiLocation,
            {
                data: Utils_Core.stringifyMSJSON(this._convertStylesToBoardCardRuleSettings(styles, types))
            },
            successCallback,
            errorCallback);
    }

    private _convertStylesToBoardCardRuleSettings(styles: StyleCustomization.ICardStyleRule[], types: string[]): StyleCustomization.BoardCardRuleSettings {
        var newSettings: StyleCustomization.BoardCardRuleSettings = new StyleCustomization.BoardCardRuleSettings(types);
        var length: number = styles.length;
        for (var k = 0; k < length; k++) {
            var style = styles[k];
            var rule = new StyleCustomization.Rule(style.isEnabled.toString(), style.name, style.wiql, StyleCustomization.StyleRuleHelper.getStyleAttribute(style));
            newSettings.addRule(style.type, rule);

        }
        return newSettings;
    }

    public dispose() {
        // Clear all binding context for this control
        ko.cleanNode(this.getElement()[0]);

        delete ko.bindingHandlers["returnKey"];
        delete ko.bindingHandlers["styleRulesSortable"];
        for (var i = 0, l = this._controls.length; i < l; i++) {
            this._controls[i].dispose();
        }

        super.dispose();
    }

    public viewModel(): ViewModel.StyleRuleCollectionViewModel {
        return this._viewModel;
    }

    public beginSave(): IPromise<any> {
        var deferred = Q.defer();

        this._viewModel.updateEmptyWiqlError();

        if (this._viewModel.isValid()) {
            var cardStyleRules = this._viewModel.getStyleSettings();
            var expandedRuleIndex = this._viewModel.getCurrentlySelectedRuleIndex();

            var successHandler = () => {
                this.beginExecuteAction(() => {
                    deferred.resolve(this._requireRefreshOnSave);
                    this.fireDirtyFlagChange(false);
                    var currentStyle = this._viewModel.getCurrentStyles();
                    this._viewModel.reset(currentStyle, expandedRuleIndex);
                    //For each style rule form, create a wiql control for the criteria editing.
                    this._drawStyleRuleCriteriaControls();
                    //Send out telemetry
                    if (this._options.boardType === AgileUtils.BoardType.Kanban) {
                        Boards.KanbanTelemetry.OnCardStyleSettingUpdate(currentStyle);
                    }
                });
            };
            var errorHanlder = (error: { message: string; serverError: any; }) => {
                this.beginExecuteAction(() => {
                    deferred.reject(error);
                });
            };

            if (this._options.boardType === AgileUtils.BoardType.Kanban) {
                this._beginSettingsSaveRest(cardStyleRules, [StyleCustomization.RuleType.FILL], successHandler, errorHanlder);
            }
            else if (this._options.boardType === AgileUtils.BoardType.Taskboard) {
                this._beginSettingsSaveMVC(cardStyleRules, [StyleCustomization.RuleType.FILL], successHandler, errorHanlder);
            }
        }
        else {
            deferred.reject(Configurations.TabSavingStatus.INVALID_USER_INPUT);
        }
        return deferred.promise;
    }

    public onTabChanging(): boolean {
        if (this._viewModel) {
            this._viewModel.updateEmptyWiqlError();
        }
        return true;
    }

    private _isFieldTypeAllowed(type: WITConstants.FieldType): boolean {
        return this._predicateConfig.getSupportedFieldTypes().indexOf(type) >= 0;
    }

    private _getSupportedFields(fieldDefinitions: WITOM.FieldDefinition[]): WITOM.FieldDefinition[] {
        return fieldDefinitions.filter((fieldDefinition: WITOM.FieldDefinition, index: number) => {
            // Field should be queryable
            // Field shouldn't be a part of blacklisted field types
            // Field should not be a part of static blacklisted field list 
            var fieldType = fieldDefinition.type;

            return fieldDefinition.isQueryable() && this._isFieldTypeAllowed(fieldType) && (!Util_Cards.isFieldBlackListed(fieldDefinition.referenceName));
        });
    }

    public bindSortable() {
        if (this._options.isEditable) {
            (<any>ko.bindingHandlers).styleRulesSortable = {
                init: (element, valueAccessor) => {
                    var styleRuleVMs: KnockoutObservableArray<ViewModel.StyleRuleViewModel> = valueAccessor();
                    var movedToNewPosition = false;
                    $(element).sortable(<JQueryUI.SortableOptions><any>{
                        items: "." + ConfigureStylesCSCControl.RULE_CONTAINER_CLASS,
                        handle: "." + ConfigureStylesCSCControl.COMPACT_RULE_CONTAINER_CLASS,
                        axis: "y",
                        containment: "parent",
                        helper: function (event, draggedElement) {
                            // We need to collapse the rule before reordering.
                            // At first, the 'start' option looks like the correct place to do it, but by
                            // the time the control reaches 'start', the helper and the placeholder have already been constructed,
                            // and they need to be adjusted as well (using inline-css), which is more effort.
                            var index = $(draggedElement).index();
                            styleRuleVMs()[index].isSelected(false);
                            // The statement below is needed to refresh the cached positions of the sortable items (since we 
                            // just updated the height of the rule)
                            $(element).sortable("refreshPositions");

                            return $(draggedElement).clone();
                        },
                        tolerance: 'pointer',
                        distance: ConfigureStylesCSCControl.REORDER_DRAG_DISTANCE,
                        update: (event, ui) => {
                            Diag.Debug.assert(ui.item.length === 1, "In reorder scenario, we should only find one and only one match for the ui item being reordered");
                            movedToNewPosition = true;

                            // get old and new position.
                            var oldIndex = ui.item.data("initial-index");
                            var newIndex = ui.item.index();

                            // Move from old index to new index.
                            // Shifting the rules manually (without using the splice's method) does not work well with ko)
                            styleRuleVMs.splice(newIndex, 0, styleRuleVMs.splice(oldIndex, 1)[0]);

                            // Because we removed the view model from the list of view model (to insert
                            // it a different place in the same array), the corresponding UI element is constructed 
                            // again. In this new UI element, the criterion element will be empty. We take the criterion
                            // control from rule's old UI element and attach it to the newer one, so that we don't need
                            // to construct it (the criterion control) again.
                            var $criterionElement: JQuery = ui.item.find("." + StyleRuleCriteriaControl.coreCssClass);
                            $criterionElement.detach();
                            // Remove the original UI element
                            ko.removeNode(ui.item[0]);

                            // Attach the criterion control to the new rule element
                            var $ruleNewElement = $(element).find("." + ConfigureStylesCSCControl.RULE_CONTAINER_CLASS).eq(newIndex);
                            var $criterionContainerElement = $ruleNewElement.find("." + ConfigureStylesCSCControl.RULE_CRITERION_CONTAINER_CLASS);
                            $criterionElement.appendTo($criterionContainerElement);
                        },
                        revert: ConfigureStylesCSCControl.SORT_ANIMATION_DURATION_TIME,
                        opacity: 0.5,
                        cursor: "move",
                        start: (event: JQueryEventObject, uiElement: any) => {
                            uiElement.helper.addClass(ConfigureStylesCSCControl.SORTABLE_HELPER_CLASS);

                            $(ConfigureStylesCSCControl.POPUP_MENU_SELECTOR).hide();

                            // store the inital position
                            uiElement.item.data("initial-index", uiElement.item.index());

                        },
                        stop: (event: JQueryEventObject, uiElement: any) => {

                            $(ConfigureStylesCSCControl.POPUP_MENU_SELECTOR).show();

                            uiElement.item.removeClass(ConfigureStylesCSCControl.SORTABLE_HELPER_CLASS);

                            // Using ko and jquery sortable together can lead to binding issues in ko which then causes 
                            // some rules getting disappeared while performing reorder. For more info see BUG 359308.
                            // As a workaround, refresh the ko bindings (remove and re-apply)
                            // Optimization: It was observed that problem occurs only on a reorder 
                            //               after the rule is dropped at it's original position. So refresh bindings only if
                            //               new position and old position is same.
                            if (!movedToNewPosition) {
                                var $styleRulesRoot = $(element).parents(".card-styling-rules-template");

                                // Criterion controls are not ko based, detach them so that we can attach them after the re-bind.
                                var $criterionElements = $(element).find("." + StyleRuleCriteriaControl.coreCssClass);
                                $criterionElements.detach();

                                //Rebind
                                ko.cleanNode($styleRulesRoot[0]);
                                ko.applyBindings(this._viewModel, $styleRulesRoot[0]);

                                // attach the criterion controls
                                var $criterionContainerElements = $styleRulesRoot.eq(0).find("." + ConfigureStylesCSCControl.RULE_CRITERION_CONTAINER_CLASS);
                                var length = $criterionElements.length;
                                for (var i = 0; i < length; i++) {
                                    $criterionElements.eq(i).appendTo($criterionContainerElements.eq(i));
                                }
                            }
                            movedToNewPosition = false;
                        }
                    }).keydown((e: JQueryEventObject) => {
                        // get old and new position.
                        if (e && e.target && (e.keyCode === Utils_UI.KeyCode.DOWN || e.keyCode === Utils_UI.KeyCode.UP) && (e.ctrlKey || e.metaKey)) {
                            const $ruleContainer = $(e.target).closest("." + ConfigureStylesCSCControl.RULE_CONTAINER_CLASS);
                            const context = ko.contextFor(e.target);
                            if (context && context.$parent) {
                                const styleRuleCollectionVM = <ViewModel.StyleRuleCollectionViewModel>context.$parent;
                                let styleRulesVM = styleRuleCollectionVM.styleRules;
                                const currentIndex = $ruleContainer.index();

                                // Calculate the new index
                                let newIndex = currentIndex;
                                if (e.keyCode === Utils_UI.KeyCode.DOWN) {
                                    // Ctrl+Down => Shift the row down
                                    newIndex++;
                                }
                                else {
                                    // Ctrl+Up => Shift the row up
                                    newIndex--;
                                }

                                // Reoder, if necessary
                                if (newIndex !== currentIndex && newIndex >= 0 && newIndex < styleRulesVM().length) {
                                    const $parentContainer = $ruleContainer.closest(".rule-list-template-container");
                                    // Because we removed the view model from the list of view model (to insert
                                    // it a different place in the same array), the corresponding UI element is constructed 
                                    // again. In this new UI element, the criterion element will be empty. We take the criterion
                                    // control from rule's old UI element and attach it to the newer one, so that we don't need
                                    // to construct it (the criterion control) again.
                                    const $criterionElement = $ruleContainer.find("." + StyleRuleCriteriaControl.coreCssClass);
                                    $criterionElement.detach();

                                    // Move from old index to new index.
                                    // Shifting the rules manually (without using the splice's method) does not work well with ko)
                                    styleRulesVM.splice(newIndex, 0, styleRulesVM.splice(currentIndex, 1)[0]);

                                    // Remove the original UI element
                                    ko.removeNode($ruleContainer[0]);

                                    // Attach the criterion control to the new rule element
                                    const $newRuleElement = $parentContainer.children("." + ConfigureStylesCSCControl.RULE_CONTAINER_CLASS).eq(newIndex);
                                    const $criterionContainer = $newRuleElement.find("." + ConfigureStylesCSCControl.RULE_CRITERION_CONTAINER_CLASS);
                                    $criterionElement.appendTo($criterionContainer);

                                    // Focus the replaced rule container.
                                    $newRuleElement.find("." + ConfigureStylesCSCControl.COMPACT_RULE_CONTAINER_CLASS).focus();
                                }
                            }
                        }
                    });
                }
            };
        }
    }

    private _loadTemplate(templateName: string, templateClass?: string) {
        var $element = loadHtmlTemplate(templateName, templateClass);
        if ($element) {
            ko.applyBindings(this._viewModel, $element[0]);
            this.getElement().append($element);
        }
    }

    private _createStyleInfo(): void {
        this._loadTemplate(StyleControlConstants.styleRuleInfoTemplate);
    }

    private _createStyleList(): void {
        this._viewModel.styleRuleAddedDelegate = (index: number) => {
            this._styleRuleInsertedHandler(index);
        };
        this._viewModel.styleRulesUpdatedDelegate = (isDirty: boolean, isValid: boolean) => {
            this.fireDirtyFlagChange(isDirty);
            this.fireValidFlagChange(isValid);
            if (this._options.disableSave) {
                this._options.disableSave(!isDirty || !isValid);
            }
        };
        this._viewModel.rulesContainerWidthUpdatedDelegate = () => {
            this._resetRulesHeaderWidth();
        };
        this.bindSortable();
        this.bindDialogResize();
        this._loadTemplate(StyleControlConstants.styleRuleListTemplate, ConfigureStylesCSCControl.CARD_STYLING_RULES_TEMPLATE_CLASS);
    }

    private bindDialogResize() {
        $(window).bind('resize', (e) => {
            var resizeTimer;
            $(window).resize(() => {
                var $styleHeader = $(".style-rules-header");
                //The inline width for the style rule interferes with the automatic width adjustment of the Rules with resoect to the dialog's size.
                // On resize, remove the inline width for the header and let automatic layout calculation happen
                // After the automatic layout calculation, set the header's width 
                $styleHeader.width("");
                if ($styleHeader.closest(".tab-content-container").css("display") !== "none") {
                    clearTimeout(resizeTimer);
                    resizeTimer = setTimeout(() => {
                        this._resetRulesHeaderWidth();
                    }, 100);
                }
            });
        });
    }

    private _resetRulesHeaderWidth(): void {
        //Based on whether scrollbar is present in the rules container, the header width needs to adjusted so that the header content aligns with rules' content.
        var rulesContainerWidth = $(".rule-list-template-container").width();
        $(".style-rules-header").width(rulesContainerWidth + "px");
    }

    private _drawStyleRuleCriteriaControls() {
        var criteraControlContainers = this.getElement().find("." + ConfigureStylesCSCControl.RULE_CRITERION_CONTAINER_CLASS);
        criteraControlContainers.each((index: number, container: Element) => {
            this._createCriteriaControl(index, container);
        });
    }

    private _styleRuleInsertedHandler(index: number) {
        var containers = this.getElement().find("." + ConfigureStylesCSCControl.RULE_CRITERION_CONTAINER_CLASS);
        this._createCriteriaControl(index, containers[index]);
    }

    private _createCriteriaControl(index: number, container: Element) {
        var styleRuleVM: ViewModel.StyleRuleViewModel = null;
        if (index < this._viewModel.styleRules().length) {
            styleRuleVM = this._viewModel.styleRules()[index];
        }
        var criteriaControl = <StyleRuleCriteriaControl>Controls.BaseControl.createIn(StyleRuleCriteriaControl, container, { supportedFieldsDefinitions: this._supportedFieldsDefinitions, predicateConfig: this._predicateConfig, enableRowAddRemove: this._options.isEditable, propogateControlBlur: true });
        this._controls.push(criteriaControl);
        if (styleRuleVM && styleRuleVM.criteria) {
            criteriaControl.setCriteria($.extend(true, {}, styleRuleVM.criteria));
        }
        else {
            criteriaControl.setCriteria(null);
        }

        styleRuleVM.isAddClauseDisabled(criteriaControl.isAddClauseDisabled);

        criteriaControl._bind("controlBlur", (event, filter) => {
            styleRuleVM.criteria = filter;
            var wiql = Predicate_WIT.WiqlHelper.getWiql(filter);
            styleRuleVM.isAddClauseDisabled(criteriaControl.isAddClauseDisabled);
            if (wiql.trim()) {
                var isInvalid: boolean[] = criteriaControl.areClausesValid.slice(0, filter.clauses.length);
                styleRuleVM.isWiqlInvalid(isInvalid.some(e => e === true));
            }
            else {
                styleRuleVM.isWiqlInvalid(false);
            }
            this._resetRulesHeaderWidth();
        });

        criteriaControl._bind("filterModified", (event, filter) => {
            styleRuleVM.criteria = filter;
            var wiql = Predicate_WIT.WiqlHelper.getWiql(filter);
            styleRuleVM.hasBeenEdited(true);
            styleRuleVM.wiql(wiql);
            if (wiql.trim()) {
                var isInvalid: boolean[] = criteriaControl.areClausesValid.slice(0, filter.clauses.length);
                if (!isInvalid.some(e => e === true)) {
                    styleRuleVM.isWiqlInvalid(false);
                }
            }
            else {
                styleRuleVM.hideWiqlEmptyError(false);
                styleRuleVM.isWiqlInvalid(false);
            }
            this._resetRulesHeaderWidth();
        });
    }

    public bindReturnKey() {
        (<any>ko.bindingHandlers).returnKey = {
            init: (element, valueAccessor, allBindingsAccessor, viewModel) => {
                ko.utils.registerEventHandler(element, 'keydown', function (evt) {
                    if (evt.keyCode === Utils_UI.KeyCode.ENTER || evt.keyCode === Utils_UI.KeyCode.SPACE) {
                        const ariaDisabled = (<HTMLElement>evt.target).getAttribute("aria-disabled");
                        // Do not invoke if the element has been disabled, otherwise the blur event causes the control to lose focus unnecessarily.
                        if (ariaDisabled !== "true") {
                            evt.preventDefault();
                            evt.target.blur();
                            valueAccessor().call(viewModel);
                        }
                    }
                });
            }
        };
    }

    public bindEnterKeyDown() {
        (<any>ko.bindingHandlers).enterKeyDown = {
            init: (element, valueAccessor, allBindingsAccessor, viewModel) => {
                ko.utils.registerEventHandler(element, 'keydown', function (evt) {
                    if (evt.keyCode === Utils_UI.KeyCode.ENTER || evt.keyCode === Utils_UI.KeyCode.SPACE) {
                        evt.preventDefault();
                        valueAccessor().call(viewModel);
                    }
                });
            }
        };
    }
}

class StyleRuleCriteraControlFieldModes {
    public static DROP = "drop";
    public static TEXT = "text";
}

export class ClauseValueCombo extends Combos.Combo {
    public toggleDropDown(): any {
        super.toggleDropDown();
        var comboWidth = this.getElement().width();
        var $dropDown = this.getElement().find("." + "combo-drop-popup");
        $dropDown.css("width", comboWidth + 2);
        this.getBehavior().getDropPopup().setPosition();
    }
}

/** the control used to specify WIT fields criteria based on which styles would be applied */
export class StyleRuleCriteriaControl extends FieldsFilter.FieldsFilterControl {
    public static CLAUSES_MAX_COUNT = 5;
    public isAddClauseDisabled = false;
    public areClausesValid: boolean[] = [];
    public static coreCssClass = "card-styling-rule-criteria";
    private _queryAdapter: QueryAdapter;
    private _predicateConfig: Predicate_WIT.WorkItemPredicateConfiguration;

    constructor(options?) {
        super($.extend({
            coreCssClass: StyleRuleCriteriaControl.coreCssClass
        }, options));
        this._predicateConfig = options.predicateConfig;
    }

    public initialize() {
        super.initialize();
    }

    public setCriteria(criteria) {
        this._queryAdapter = VSS_Service.getService<QueryAdapter>(QueryAdapter);
        if (!criteria) {
            criteria = this._getDefaultClause();
        }
        // If there is only one clause, the logical operator could be missing. By default we add "AND" logical operator to allow inserting a clause above this clause and to insert abovethere has to be a logical operator.
        if (criteria && criteria.clauses && criteria.clauses.length > 0 && !(criteria.clauses[0].logicalOperator)) {
            criteria.clauses[0].logicalOperator = WiqlOperators.OperatorAnd;
        }
        this.setFilter(criteria ? criteria : null);
        this._updateAddClauseVisibility();
    }

    public _getDefaultClause(): IClause {
        return <IClause>{ logicalOperator: WiqlOperators.OperatorAnd, fieldName: "", operator: AgileControlsResources.QueryEqualTo, value: "", index: 0 };
    }

    public _updateAndOrControl(andOrControl, clause) {
        Diag.logTracePoint("StyleRuleCriteriaControl._updateAndOrControl.start");
        andOrControl.setText(this._queryAdapter.getLocalizedOperator(clause.logicalOperator));
        //Right now limiting to only AND operator
        andOrControl.setEnabled("false");
        andOrControl.setSource([WiqlOperators.OperatorAnd]);
        Diag.logTracePoint("StyleRuleCriteriaControl._updateAndOrControl.complete");
    }

    public _updateFieldControl(fieldControl, clause) {
        Diag.Debug.assertIsArray(this._options.supportedFieldsDefinitions, "Field Definitions should be a non-empty array", true);
        Diag.logTracePoint("StyleRuleCriteriaControl._updateFieldControl.start");
        fieldControl.setText(this._getFieldName(clause.fieldName));
        var fields: string[] = [];

        var fieldDefinitions = this._options.supportedFieldsDefinitions;
        $.each(fieldDefinitions, (index: number, fieldDefinition: WITOM.FieldDefinition) => {
            fields.push(fieldDefinition.name);
        });

        if (!fieldControl._disposed) {
            fieldControl.setSource(fields);
        }
        fieldControl.setMode(fields.length > 0 ? StyleRuleCriteraControlFieldModes.DROP : StyleRuleCriteraControlFieldModes.TEXT);

        // The following binding was always firing filterModified event even if there is any change in the input
        // Followed by the autocomplete filtermodified request. Which as causing the flicker in the error message
        // So we need to unbind the change input, so that only autocomplete one is getting fired.
        fieldControl._input.unbind('change input');

        Diag.logTracePoint("StyleRuleCriteriaControl._updateFieldControl.complete");
    }

    public _updateOperatorControl(operatorControl: any, clause: any, updateClause?: boolean) {
        if (clause.fieldName) {
            Diag.logTracePoint("StyleRuleCriteriaControl._updateOperatorControl.async-start");
            this._queryAdapter.beginGetAvailableOperators(clause.fieldName, (operators: string[]) => {
                var fieldType: WITConstants.FieldType = this._queryAdapter.getFieldType(null, clause.fieldName);
                operators = this._getSupportedOperators(operators, fieldType);
                if (!operatorControl._disposed) {
                    this._setSourceForOperatorControl(operators, operatorControl, clause, updateClause);
                }
                Diag.logTracePoint("StyleRuleCriteriaControl._updateOperatorControl.async-complete");
            });
        }
        else {
            this._setSourceForOperatorControl([AgileControlsResources.QueryEqualTo], operatorControl, clause, updateClause);
        }
        //The following binding was always firing filterModified event even if there is any change in the input
        // Followed by the autocomplete request. Which as causing the flicker in the error message
        // So we need to unbind the change input, so that only autocomplete one is getting fired.
        operatorControl._input.unbind('change input');
    }


    private _setupCommonIdentityControl(valueControl: any, clause: any, getAllowedNonIdentityValues: () => string[]) {
        var commonIdentityPickerOptions = WITHelpers.WITIdentityControlHelpers.setupCommonIdentityPickerOptions(false,
            true,
            FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WorkItemTrackingAADSupport),
            getAllowedNonIdentityValues,
            (item: Identities_RestClient.IEntity) => {
                valueControl.fireChange();
            },
            () => {
                return valueControl.getControl().getDropdownPrefix();
            },
            null);

        commonIdentityPickerOptions.consumerId = Agile.IdentityControlConsumerIds.CardStylingSearchControl;
        valueControl.setControl(IdentityPicker.IdentityPickerSearchControl, commonIdentityPickerOptions);

        var inputText = valueControl.getControl().getElement().find("input");
        inputText.change(() => {
            // on each key type, we want to dirty the query
            valueControl.fireChange();
        });

        if (clause.value) {
            var entity = WITIdentityHelpers.parseUniquefiedIdentityName(clause.value);
            var entityIdentifier = WITIdentityHelpers.getEntityIdentifier(entity);

            if (entityIdentifier) {
                valueControl.getControl().setEntities([], [entityIdentifier]);
            }
            else {
                // If the value is a non identity string - we cant ask the control to resolve it
                // So we pass the value as a dummy string entity object
                valueControl.getControl().setEntities([entity], []);
            }
        }
    }

    public _updateValueControl(valueControl: any, clause: any) {
        var allowedNonIdentityValues: string[];

        var getAllowedNonIdentityValues = () => {
            return allowedNonIdentityValues;
        }

        if (this._isIdentityPickerSupported(clause)) {
            if (useCommonIdentityPicker()) {
                this._setupCommonIdentityControl(valueControl, clause, getAllowedNonIdentityValues);
            }
            else {
                var identityPickerOptions = {
                    identityMru: IdentityMruStore.getIdentityMru(),
                    identityFilter: this._queryAdapter.isGroupOperator(clause.operator) ? TFS_OM_Identities.IdentityFilter.Groups : TFS_OM_Identities.IdentityFilter.All
                };

                valueControl.setControl(TFS_UI_Controls_Identities.MruIdentityPickerControl, identityPickerOptions);
                if (clause.value) { // if we have a value for the identity field
                    var identity = TFS_OM_Identities.IdentityHelper.parseUniquefiedIdentityName(clause.value); // try to get the identity
                    if (this._queryAdapter.isMeMacro(clause.value, false)) { // but also if the value is a macro, let's disable the image
                        identity.showGenericImage = false;
                        valueControl._selectedControl.setInputText(this._getLocalizedValue(clause.fieldName, clause.operator, clause.value)); // display localized version of macro
                    }
                    else {
                        valueControl.setValue(identity);
                    }
                }
            }
        }
        else {
            valueControl.setControl(ClauseValueCombo);
            valueControl.setText(this._getLocalizedValue(clause.fieldName, clause.operator, clause.value));
        }

        if (!clause.fieldName || !clause.operator) {
            valueControl.setEnabled(false);
        }
        else {
            Diag.logTracePoint("StyleRuleCriteriaControl._updateValueControl.async.start");

            Diag.logTracePoint("QueryEditor._updateValueControl.async-pending"); //TODO:merge-check
            valueControl.setEnabled(true);
            var control = valueControl.getControl();
            var store = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);

            store.beginGetProject(TFS_Host_TfsContext.TfsContext.getDefault().navigation.projectId,
                (project: WITOM.Project) => {
                    this._queryAdapter.beginGetAvailableFieldValues(project, this._getFieldName(clause.fieldName), clause.operator, true, true, (values) => {
                        var fieldType: WITConstants.FieldType = this._queryAdapter.getFieldType(null, clause.fieldName);
                        values = this._getSupportedValues(values, fieldType);
                        if (control && !control._disposed) {
                            var field = this._queryAdapter.getField(clause.fieldName);
                            if (field && field.isIdentity) {
                                if (useCommonIdentityPicker()) {
                                    allowedNonIdentityValues = values;
                                }
                                else {
                                    values = $.map(values, (val: string, i) => {
                                        return { id: "", displayName: val, uniqueName: "", isContainer: false, showGenericImage: !this._queryAdapter.isMeMacro(val, true) };
                                    });
                                }
                            }
                            this._updateFieldValues(valueControl, fieldType, values);
                        }
                        Diag.logTracePoint("StyleRuleCriteriaControl._updateValueControl.async.complete");
                    },
                        (error) => {
                            //TODO - Provide errorcallback
                        });
                },
                (error) => {
                    //TODO - Provide errorcallback
                });
        }

    }

    private _shouldUpdateClauseValue(fieldType: WITConstants.FieldType, invariantValue: string): boolean {

        if (!Utils_String.startsWith(invariantValue, WiqlOperators.MacroStart)) {
            return false;
        }

        if (fieldType === WITConstants.FieldType.DateTime &&
            Utils_String.startsWith(invariantValue, WiqlOperators.MacroToday)) {
            return true;
        }

        var predicateSupportedMacros: string[] = this._predicateConfig.getSupportedMacros(fieldType);
        return predicateSupportedMacros.some(macro =>
            Utils_String.ignoreCaseComparer(macro, invariantValue) === 0);
    }

    /**
     * For a given date, get the short date format (day/month/year or flipped around in some variation) in the users locale
     */
    private _getLocaleShortDateString(date: Date, fromUTCFormat?: boolean): string {
        var format = Culture.getCurrentCulture().dateTimeFormat.ShortDatePattern; // get the short date locale formatting
        if (fromUTCFormat) {
            date = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
        }
        return Utils_Date.localeFormat(date, format, true);
    }


    public _validateClause(clauseInfo) {
        Diag.logTracePoint("StyleRuleCriteriaControl._validateClause.start");
        var clause = clauseInfo.clause;
        this.areClausesValid[clause.index] = false;
        if (!clause.fieldName || !clause.operator) {
            clauseInfo.fieldNameControl.setInvalid(false);
            clauseInfo.operatorControl.setInvalid(false);
        }
        else {
            this._queryAdapter.beginEnsureFields(() => {
                var field = this._queryAdapter.getField(clause.fieldName);

                if (field) {
                    clauseInfo.fieldNameControl.setInvalid(false);

                    this._queryAdapter.beginGetAvailableOperators(clause.fieldName, (operators) => {
                        var fieldType: WITConstants.FieldType = this._queryAdapter.getFieldType(null, clause.fieldName);
                        operators = this._getSupportedOperators(operators, fieldType);
                        if (operators && Utils_Array.contains(operators, this._queryAdapter.getLocalizedOperator(clause.operator), Utils_String.localeIgnoreCaseComparer)) {
                            clauseInfo.operatorControl.setInvalid(false);

                            if (clause.value) {
                                try {
                                    var invariantValue: string;
                                    if (fieldType === WITConstants.FieldType.DateTime &&
                                        !Utils_String.startsWith(clause.value, WiqlOperators.MacroStart)) {
                                        // need to do special update scenario here to handle localizing dates
                                        // parse the date string which is in locale or in UTC format
                                        var date: Date = Utils_Date.parseDateString(clause.value, undefined, true);
                                        invariantValue = this._queryAdapter.getInvariantFieldValue(clause.fieldName, clause.operator, this._getLocaleShortDateString(date, clause.value.length > 10));
                                        // get it back and remove single quotes from string (date comes out as WIQL safe aka quoted string)
                                        invariantValue = invariantValue.replace(/'/g, "");
                                        clause.value = invariantValue;
                                        clauseInfo.valueControl.setInvalid(false);
                                    }
                                    else if (fieldType === WITConstants.FieldType.DateTime && !isTodayMacro(clause.value, true)) {
                                        // @Today is only valid macro for datetime, set invalid if different macro
                                        clauseInfo.valueControl.setInvalid(true);
                                        this.areClausesValid[clause.index] = true;
                                    }
                                    else {
                                        let value = clause.value;
                                        const ciParts = parseCurrentIteration(value);
                                        if (ciParts) {
                                            const offset = ciParts.offset < 0 ? ` - ${-ciParts.offset}` : ciParts.offset > 0 ? ` + ${ciParts.offset}` : "";
                                            invariantValue = `@CurrentIteration${offset}`;
                                        } else {
                                            invariantValue = this._queryAdapter.getInvariantFieldValue(clause.fieldName, clause.operator, clause.value);
                                        }
                                        if (this._shouldUpdateClauseValue(fieldType, invariantValue)) {
                                            clause.value = invariantValue;
                                        }
                                        clauseInfo.valueControl.setInvalid(false);
                                    }
                                }
                                catch (e) {
                                    clauseInfo.valueControl.setInvalid(true);
                                    this.areClausesValid[clause.index] = true;
                                }

                                // Client side validation to check for any special characters at the start of a macro's name

                                if (clause.value.charAt(0) === '@') {
                                    if (!clause.value.charAt(1).match(/[0-9a-z]/i)) {
                                        clauseInfo.valueControl.setInvalid(true);
                                        this.areClausesValid[clause.index] = true;
                                    }
                                }
                            }

                        }
                        else {
                            clauseInfo.operatorControl.setInvalid(true);
                            this.areClausesValid[clause.index] = true;
                        }
                    });
                }
                else {
                    clauseInfo.fieldNameControl.setInvalid(true);
                    clauseInfo.operatorControl.setInvalid(Utils_String.localeIgnoreCaseComparer(clause.operator, AgileControlsResources.QueryEqualTo) !== 0);
                    this.areClausesValid[clause.index] = true;
                }
            });
        }
        Diag.logTracePoint("StyleRuleCriteriaControl._validateClause.complete");
    }

    public _handleOperatorChanged(clauseInfo: any, oldValue: string) {
        var clause = clauseInfo.clause;
        if (clause.operator) {
            clause.operator = this._queryAdapter.getInvariantOperator(clause.operator);
        }
        this._updateValueControlEnablement(clauseInfo.valueControl, clause);

    }

    public _updateValueControlEnablement(valueControl, clause) {
        if (!clause.fieldName || !clause.operator) {
            valueControl.setEnabled(false);
        }
        else {
            valueControl.setEnabled(true);
        }
    }

    public _setDirty() {
        //When the filter is modified, enable/disable the AddClause
        this._updateAddClauseVisibility();
    }

    public getClauseValue(valueControl: any, clause: any): string {
        if (this._isIdentityPickerSupported(clause)) {
            if (useCommonIdentityPicker()) {
                var resolvedEntities = valueControl.getControl().getIdentitySearchResult().resolvedEntities;

                if (resolvedEntities && resolvedEntities.length === 1) {
                    return WITIdentityHelpers.getUniquefiedIdentityName(resolvedEntities[0]);
                }
                else {
                    var inputText = valueControl.getControl().getElement().find("input");
                    return inputText.val();
                }
            }
            else {
                var item: TFS_OM_Identities.IIdentityReference = valueControl.getValue();
                return TFS_OM_Identities.IdentityHelper.getUniquefiedIdentityName(item);
            }
        }
        else {
            return valueControl.getText();
        }
    }

    public _handleFieldNameChanged(clauseInfo: any, oldValue: string) {
        Diag.logTracePoint("StyleRuleCriteriaControl._onClauseChange.async.start");

        var clause = clauseInfo.clause;
        this._queryAdapter.beginEnsureFields(() => {
            var fieldName = this._queryAdapter.getInvariantFieldName(clause.fieldName, false);
            if (fieldName !== oldValue) {
                this._clearOperatorAndValueControlsIfRequired(clause, oldValue);
                if (!clauseInfo.operatorControl._disposed) {
                    this._updateOperatorControl(clauseInfo.operatorControl, clause, true);
                }
                //In StyleRuleCriteria, fieldRefNames are maintained in the clauses. So for saving purpose we need to store the fieldRefName instead of the localized displayname
                clause.fieldName = fieldName;

                // Update the Field value control based on the new fieldName selected
                if (!clauseInfo.valueControl._disposed) {
                    this._updateValueControl(clauseInfo.valueControl, clause);
                }
            }
            Diag.logTracePoint("StyleRuleCriteriaControl._onClauseChange.async.complete");
        });
    }

    public _updateAddClauseVisibility() {
        var element = this.getElement();
        var clausesCount = element.find(".clause-row").length;
        // The Add icons at the start of each clause row.
        var addIconAnchors = element.find(".clause.clause-row .add-remove .icon-add").closest("a");
        // The last row containing Add icona and Add new clause anchor
        var addRemoveRow = element.find(".add-clause.clause-row .add-remove");

        if (clausesCount <= StyleRuleCriteriaControl.CLAUSES_MAX_COUNT) {
            addIconAnchors.removeClass("disabled");
            addRemoveRow.removeClass("disabled");
            this.isAddClauseDisabled = false;
        }
        else {
            addIconAnchors.addClass("disabled");
            addRemoveRow.addClass("disabled");
            this.isAddClauseDisabled = true;
        }
    }

    private _getLocalizedValue(fieldName: string, operator: string, invariantValue: string) {
        var localizedValue: string = $.trim(invariantValue);

        if (Utils_String.startsWith(localizedValue, WiqlOperators.MacroToday, Utils_String.localeIgnoreCaseComparer)) {
            localizedValue = this._queryAdapter.getLocalizedOperator(WiqlOperators.MacroToday) +
                localizedValue.substr(WiqlOperators.MacroToday.length);
        }
        else if ((Utils_String.ignoreCaseComparer(WiqlOperators.MacroMe, localizedValue) === 0) ||
            (Utils_String.ignoreCaseComparer(WiqlOperators.MacroCurrentIteration, localizedValue) === 0)) {
            localizedValue = this._queryAdapter.getLocalizedOperator(localizedValue);
        }
        else {
            var field = this._queryAdapter.getField(fieldName);
            if (field && invariantValue && field.type === WITConstants.FieldType.DateTime) {
                var date = Utils_Date.parseDateString(invariantValue, undefined, true); // show localized value
                localizedValue = this._getLocaleShortDateString(date, invariantValue.length > 10); // show the locale version of the dates
            }
        }

        return localizedValue;
    }

    private _clearOperatorAndValueControlsIfRequired(clause: IClause, oldValue: string) {
        var field = this._queryAdapter.getField(clause.fieldName);
        var oldField = this._queryAdapter.getField(oldValue);

        //Clear the operator and value fields if the new fieldtype is not the same as old field type
        if (!field || this._queryAdapter.getFieldType(oldField, oldValue) !== this._queryAdapter.getFieldType(field, clause.fieldName) || (field && field.id === WITConstants.CoreField.Title) ||
            (oldField && field && field.isIdentity !== oldField.isIdentity)) {
            clause.operator = "";
            clause.value = "";
        }
    }

    private _getFieldName(fieldRefName: string) {
        var fieldName = fieldRefName;
        var fieldDef = this._queryAdapter.getField(fieldName);
        if (fieldDef) {
            fieldName = fieldDef.name;
        }
        return fieldName;
    }

    private _getSupportedOperators(operators: string[], fieldType: WITConstants.FieldType): string[] {
        var filteredOperators: string[] = [];
        var predicateSupportedOperators: string[] = this._predicateConfig.getSupportedOperators(fieldType);

        $.each(predicateSupportedOperators, (index: number, wiqlOperator: string) => {
            var localizedEqualToOperator = this._queryAdapter.getLocalizedOperator(wiqlOperator);
            if (Utils_Array.contains(operators, localizedEqualToOperator, Utils_String.localeIgnoreCaseComparer)) {
                filteredOperators.push(localizedEqualToOperator);
            }
        });
        return filteredOperators;
    }

    private _getSupportedValues(values: any[], fieldType: WITConstants.FieldType): any[] {
        var predicateSupportedMacros: string[] = this._predicateConfig.getSupportedMacros(fieldType);

        var filteredValues = values.filter((value: any, index: number) => {
            var displayName = "";
            if (value) {
                displayName = value.displayName || value.name || value;
            }

            if (displayName) {
                displayName = $.trim(displayName);

                // [Any] isn't supported.
                if (Utils_String.startsWith(displayName, WITCommonResources.WiqlOperators_Any, Utils_String.ignoreCaseComparer)) {
                    return false;
                }

                // If this is a macro, it should be a supported one.
                if (Utils_String.startsWith(displayName, WiqlOperators.MacroStart)) {
                    return predicateSupportedMacros.some(macro =>
                        Utils_String.startsWith(displayName, this._queryAdapter.getLocalizedOperator(macro), Utils_String.ignoreCaseComparer));
                }
            }
            return true;
        });
        return filteredValues;
    }

    private _isIdentityPickerSupported(clause: any): boolean {
        if (this._queryAdapter.areFieldsLoaded()) {
            var field: WITOM.FieldDefinition = this._queryAdapter.getField(clause.fieldName);

            return field && field.isIdentity &&
                !this._queryAdapter.isFieldComparisonOperator(clause.operator);
        }
        return false;
    }

    private _setSourceForOperatorControl(operators: string[], operatorControl, clause: any, updateClause?: boolean) {
        operators = operators || [];

        if (operators.length) {
            operators = operators.filter((operator: string, index: number) => {
                return !this._queryAdapter.isFieldComparisonOperator(operator);
            });
            operatorControl.setSource(operators);
            operatorControl.setMode(operators.length ? StyleRuleCriteraControlFieldModes.DROP : StyleRuleCriteraControlFieldModes.TEXT);
        }
        else {
            operatorControl.setSource([]);
            operatorControl.setMode(StyleRuleCriteraControlFieldModes.TEXT);
        }

        var localizedOperator = this._queryAdapter.getLocalizedOperator(clause.operator);

        if (updateClause) {
            if (clause.operator) {
                if (!Utils_Array.contains(operators, localizedOperator, Utils_String.localeIgnoreCaseComparer)) {
                    clause.operator = "";
                    clause.value = "";
                }
            }
            if (!clause.operator && operators.length) {
                localizedOperator = operators[0];
            }
        }
        clause.operator = this._queryAdapter.getInvariantOperator(localizedOperator);
        operatorControl.setText(localizedOperator || "");

    }
}

