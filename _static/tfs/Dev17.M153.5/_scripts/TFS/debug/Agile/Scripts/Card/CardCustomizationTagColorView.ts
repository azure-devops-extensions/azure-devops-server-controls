/// <reference types="jquery" />


import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import Cards = require("Agile/Scripts/Card/Cards");
import Configurations = require("Presentation/Scripts/TFS/TFS.Configurations");
import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
import Notifications = require("VSS/Controls/Notifications");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import ko = require("knockout");
import StyleCustomization = require("Agile/Scripts/Card/CardCustomizationStyle");
import ViewModel = require("Agile/Scripts/Card/CardCustomizationTagColorViewModel");
import Q = require("q");
import Utils_UI = require("VSS/Utils/UI");
import Diag = require("VSS/Diag");
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");
import { loadHtmlTemplate } from "Agile/Scripts/Board/Templates";

TFS_Knockout.overrideDefaultBindings()

import CardCustomization_NO_REQUIRE = require("Agile/Scripts/Card/CardCustomizationStyle");

var domElem = Utils_UI.domElem;

export class TagColorControlConstants {
    public static tagColorInfoTemplate: string = "tag_coloring_info_template";
    public static tagColorRuleContentClass: string = "tag-coloring-dialog-content";
    public static tagColorRuleListTemplate: string = "tag_coloring_rules_template";
}

export class ConfigureTagColorsCSCControl extends Configurations.TabContentBaseControl<CardCustomization_NO_REQUIRE.ICardStyleSettingsCSCControlInitOptions> {
    private _viewModel: ViewModel.TagColorCollectionViewModel;
    public styleRules: Cards.IStyleRule[];
    private static TAG_COLORING_RULES_TEMPLATE_CLASS = "tag-coloring-rules-template";
    private static CARD_STYLES_TAB_CONTENT_CLASS = "tag-coloring-tab-content";
    private _maxComboDropWidth: number;
    public applyChanges: Function;
    private static DESCRIPTION_AREA_CONTAINER_CLASS = "style-settings-description-area-container";
    private static MESSAGE_AREA_CONTAINER_CLASS = "style-settings-message-area-container";
    private _messageArea: Notifications.MessageAreaControl;
    private _controlOverlay: JQuery;
    private static OVERLAY_CLASS = "tag-styling-control-overlay";
    private _statusIndicator: StatusIndicator.StatusIndicator;

    public initialize() {
        super.initialize();
        this.getElement().parents(".tab-content-main").addClass(ConfigureTagColorsCSCControl.CARD_STYLES_TAB_CONTENT_CLASS);

        var _createViewModelAndBindHandlers = (styleRules: Cards.IStyleRule[]) => {
            this._viewModel = new ViewModel.TagColorCollectionViewModel(this.styleRules, this._options.isEditable);
            this._bindComboControl();
            this._bindReturnKey();
            var warningMessage = this._options.isEditable ? "" : AgileControlsResources.CardCustomizationStylesNoPermissions;
            this._ensureMessageArea(warningMessage, Notifications.MessageAreaType.Warning);

            this._viewModel.tagColorUpdatedDelegate = (isDirty: boolean, isValid: boolean) => {
                this.fireDirtyFlagChange(isDirty);
                this.fireValidFlagChange(isValid);
                this._adjustTagFieldHeaderTableColumnWidth();
                this._calculateScrollableSectionHeight();
            };
            this._createTagColorInfo();
            this.onResize();
        };

        var successCallback = (boardCardSettings: StyleCustomization.BoardCardRuleSettings) => {
            this.beginExecuteAction(() => {
                this.hideOverlay();
                this.styleRules = StyleCustomization.StyleRuleHelper.convertRestDefinitionToBoardStyleSetting(boardCardSettings, StyleCustomization.RuleType.TAGSTYLE);
                _createViewModelAndBindHandlers(this.styleRules);
            });
        };
        var errorCallback = (error: { message: string; serverError: any; }) => {
            this.beginExecuteAction(() => {
                this.hideOverlay();
                this._ensureMessageArea(error.message, Notifications.MessageAreaType.Error);
            });
        };

        if (!this.styleRules) {
            this.showOverlay(AgileControlsResources.CardStyleRulesLoading);
            const boardIdentity = this._options.boardIdentity;
            const teamId = this._options.teamId;
            StyleCustomization.StyleRuleHelper.beginGetBoardCardRuleSettings(teamId, boardIdentity).then(successCallback, errorCallback);
        }
        else {
            _createViewModelAndBindHandlers(this.styleRules);
        }
    }

    public showOverlay(message: string, options?: any) {
        /// <summary>Shows an overlay over the entire control with a status indicator on top.</summary>
        /// <param name="message" type="string">The text to display next to the spinner.</param>
        /// <param name="options" type"Object" optional="true">Optional options for the StatusIndicator control.</param>
        if (!this._controlOverlay) {
            this._controlOverlay = $("<div />").addClass("control-busy-overlay " + ConfigureTagColorsCSCControl.OVERLAY_CLASS).appendTo(this.getElement());
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

    /**
     * On tab activated, we need to set focus on the add button.
     */
    public onTabActivated(isInit: boolean) {
        this.getElement().find(".add-control").focus();
    }

    private _createMessageArea($container: JQuery) {
        var $messageAreaContainer = $(domElem("div", ConfigureTagColorsCSCControl.MESSAGE_AREA_CONTAINER_CLASS));
        var messageAreaOption: Notifications.IMessageAreaControlOptions = {
            closeable: false,
            showIcon: true,
            type: Notifications.MessageAreaType.Warning
        };
        this._messageArea = Controls.Control.create(Notifications.MessageAreaControl, $messageAreaContainer, messageAreaOption);
        $container.append($messageAreaContainer);
    }

    private _ensureMessageArea(message: string, messageType?: Notifications.MessageAreaType) {
        if (message) {
            if (!this._messageArea) {
                this._drawMessageArea();
            }
            this._messageArea.setMessage(message, messageType);
        }
    }

    private _drawMessageArea() {
        var $element = this.getElement();
        var $textAreaContainer = $(domElem("div", ConfigureTagColorsCSCControl.DESCRIPTION_AREA_CONTAINER_CLASS));
        this._createMessageArea($textAreaContainer);
        $element.append($textAreaContainer);
    }

    public initializeOptions(options?: any): void {
        this.styleRules = options.styleRules;
        this.applyChanges = options.applyChanges;
        super.initializeOptions($.extend({
            cssClass: TagColorControlConstants.tagColorRuleContentClass
        }, options));
    }

    private _loadTemplate(templateName: string, templateClass?: string) {
        var $element = loadHtmlTemplate(templateName, templateClass);
        if ($element) {
            ko.applyBindings(this._viewModel, $element[0]);
            this.getElement().append($element);
        }
    }

    private _createTagColorInfo(): void {
        this._loadTemplate(TagColorControlConstants.tagColorInfoTemplate);
        this._loadTemplate(TagColorControlConstants.tagColorRuleListTemplate, ConfigureTagColorsCSCControl.TAG_COLORING_RULES_TEMPLATE_CLASS);
    }

    /**     
    * Called when the control is getting resized.     
    * Set tabstrip's tab content height based on common configration setting tab content height.  
    */
    public onResize() {
        this._maxComboDropWidth = this.getElement().find(".tags-container").width();
        this._calculateScrollableSectionHeight();
        this._adjustTagFieldHeaderTableColumnWidth();
    }

    public beginSave(): IPromise<any> {
        var deferred = Q.defer();

        var successCallback = () => {
            this.beginExecuteAction(() => {
                deferred.resolve(false);
                this.fireDirtyFlagChange(false);
                this._viewModel.reset(this._viewModel.getCurrentTagColors());
            });
        };
        var errorCallback = (error: { message: string; serverError: any; }) => {
            this.beginExecuteAction(() => {
                deferred.reject(error);
            });
        };

        var cardStyleRules = this._viewModel.getStyleSettings();
        this._options.saveDelegate(cardStyleRules, [StyleCustomization.RuleType.TAGSTYLE], successCallback, errorCallback);
        return deferred.promise;
    }


    public dispose() {
        // Clear all binding context for this control
        ko.cleanNode(this.getElement()[0]);

        delete ko.bindingHandlers["tagcombo"];
        delete ko.bindingHandlers["tagColorReturnKey"];
        delete ko.bindingHandlers["handleFocusOnCombo"];
        if (this._viewModel) {
            this._viewModel.dispose();
            this._viewModel = null;
        }
        super.dispose();
    }

    private _calculateScrollableSectionHeight() {
        var $tabContentContainer = this.getElement().parents(".tab-content-container");
        var $scrollableSection = this.getElement().find(".tag-fields-scrollable-section");
        if ($tabContentContainer && ($tabContentContainer.length > 0) && $scrollableSection && ($scrollableSection.length > 0)) {
            var totalContainerHeight = $tabContentContainer.outerHeight();
            var topOffset = $scrollableSection.offset().top - $tabContentContainer.offset().top;
            var newHeight = totalContainerHeight - topOffset;
            $scrollableSection.outerHeight(newHeight);
        }
    }

    private _adjustTagFieldHeaderTableColumnWidth() {
        var columnWidths: number[] = [];
        //calculate the width of the column cells in the content table and apply the respective column widths to the header table
        $(".tags-container tr:first").find('td').each((index: number, elem: Element) => {
            // doing this for the first three columns is sufficient as we have headers only for the first three columns
            if (index < 3) {
                columnWidths[index] = $(elem).outerWidth();
            }
        });

        $(".tag-fields-header").find('th').each((index: number, elem: Element) => {
            if (index < 3) {
                $(elem).outerWidth(columnWidths[index]);
            }
        });
    }

    private _bindReturnKey() {
        (<any>ko.bindingHandlers).tagColorReturnKey = {
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

    private _bindComboControl() {
        (<any>ko.bindingHandlers).tagcombo = {
            init: (element, valueAccessor, allBindings, viewModel, bindingContext) => {
                var comboContainerClass: string = allBindings().comboContainer;
                var comboOptions = allBindings().comboOptions();
                var existingChangeHandler: Function = comboOptions.change ? comboOptions.change : $.noop;
                var existingFocusHandler: Function = comboOptions.focus ? comboOptions.focus : $.noop;
                var existingBlurHandler: Function = comboOptions.blur ? comboOptions.blur : $.noop;
                var existingDropHideHandler: Function = comboOptions.dropHide ? comboOptions.dropHide : $.noop;

                var newComboOptions =
                    $.extend({}, comboOptions, {
                        change: (combo: Combos.Combo) => {
                            existingChangeHandler(combo.getElement().val(), valueAccessor());
                        },
                        value: comboOptions.value || valueAccessor().name(),
                        blur: () => {
                            existingBlurHandler(valueAccessor());
                        },
                        focus: () => {
                            existingFocusHandler(valueAccessor());
                        },
                        dropShow: (dropPopup: Combos.BaseComboDropPopup) => {
                            // the combo drop popup shouldn't exceed common config dialog content area
                            // so limit the max-width to be within the tabcontent
                            dropPopup.getElement().css("max-width", this._maxComboDropWidth);
                            dropPopup.setPosition();
                        },
                        dropHide: () => {
                            existingDropHideHandler(valueAccessor());
                            return true;
                        }
                    });
                //initialize combo control with provided options
                var tagOptionsCombo = <Combos.Combo>Controls.BaseControl.create(Combos.Combo, $(element).find(comboContainerClass),
                    newComboOptions);
                // bring the focus onto newly added combo field
                $(element).find("input[type=text]").focus();

                tagOptionsCombo.getDropButton().bind("mousedown", () => {
                    bindingContext.$parent.onComboDropClick();
                });

                // when the warning message is being shown recalculate the height of scroll area
                if (bindingContext.$parent.showWarning()) {
                    this._calculateScrollableSectionHeight();
                }
            },
            update: (element, valueAccessor, allBindings, viewModel, bindingContext) => {
                //add the invalid class on the combo when the input is not valid so that combo box shows the right background color
                var $combo = $(element).find(".combo");
                if (valueAccessor().hasError && valueAccessor().hasError()) {
                    $combo.addClass("invalid");
                }
                else {
                    $combo.removeClass("invalid");
                }
            }
        };
    }
}


