/// <reference types="jquery" />


import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import Cards = require("Agile/Scripts/Card/Cards");
import ko = require("knockout");
import StyleCustomization = require("Agile/Scripts/Card/CardCustomizationStyle");
import Resources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");
import Predicate_WIT = require("Agile/Scripts/Common/PredicateWIT");
import { AccessibilityColor, PaletteColorPickerControl, PaletteColorPickerControlOptions } from "Presentation/Scripts/TFS/TFS.UI.Controls.ColorPicker";
import { Colors } from "Agile/Scripts/Common/Colors";
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");

TFS_Knockout.overrideDefaultBindings()

/** StyleRuleViewModel is the view model for a style rule shown in the Card Styles settings for a board */
export class StyleRuleViewModel {
    private _accessibilityColors: IDictionaryStringTo<AccessibilityColor> = Colors.getAccessibilityColors();

    public name: KnockoutObservable<string> = ko.observable("");
    public isOn: KnockoutObservable<boolean> = ko.observable(true);
    public color: KnockoutComputed<string>;
    public selectedColor: KnockoutObservable<AccessibilityColor>;
    public selectedTitleColor: KnockoutObservable<AccessibilityColor>;
    public titleColor: KnockoutComputed<string>;
    public isSelected: KnockoutObservable<boolean> = ko.observable(false);
    public isMenuVisible: KnockoutObservable<boolean> = ko.observable(false);
    public state: KnockoutComputed<string>;
    public isNameEmpty: KnockoutComputed<boolean>;
    public isDuplicateName: KnockoutComputed<boolean>;
    public isValid: KnockoutComputed<boolean>;
    public wiql: KnockoutObservable<string> = ko.observable("");
    public criteria: Cards.IItemQuery = null;
    public isDirty: KnockoutComputed<boolean>;
    public isAddClauseDisabled: KnockoutObservable<boolean> = ko.observable(false);
    public isWiqlEmpty: KnockoutComputed<boolean>;
    public isWiqlInvalid: KnockoutObservable<boolean> = ko.observable(false);
    public hideWiqlEmptyError: KnockoutObservable<boolean> = ko.observable(false);
    public isBoldSelected: KnockoutObservable<boolean> = ko.observable(false);
    public isItalicsSelected: KnockoutObservable<boolean> = ko.observable(false);
    public isUnderlineSelected: KnockoutObservable<boolean> = ko.observable(false);
    public hasBeenEdited: KnockoutObservable<boolean> = ko.observable(false);
    public ariaLabel: KnockoutObservable<string> = ko.observable("");

    constructor(styleRule: Cards.IStyleRule, collectionViewModel: StyleRuleCollectionViewModel, isNew?: boolean) {

        var initialColor = Colors.ORANGE_LIGHTER_60;
        this._isNew = isNew || false;
        this.hideWiqlEmptyError = ko.observable(this._isNew);
        this._style = styleRule;
        this.name = ko.observable((this._style.name));
        this.ariaLabel = ko.observable(Utils_String.format(AgileControlsResources.CardStyling_CompatRuleLabel, this.name()));
        this.isOn = ko.observable((this._style.isEnabled));
        this._collectionViewModel = collectionViewModel;
        this.criteria = styleRule.criteria;
        var styles = this._style.styles;
        if (styles) {
            initialColor = styles[StyleCustomization.StyleRuleSettings.BACKGROUND_COLOR];
            var styleTitleColor = styles[StyleCustomization.StyleRuleSettings.TITLE_COLOR];
            if (styleTitleColor) {
                this._initialTitleColor = styleTitleColor;
            }
            if (styles[StyleCustomization.StyleRuleSettings.TITLE_FONT_WEIGHT] === StyleCustomization.CSSPropertyValues.BOLD) {
                this._initialIsBoldSelected = true;
                this.isBoldSelected(true);
            }
            if (styles[StyleCustomization.StyleRuleSettings.TITLE_FONT_STYLE] === StyleCustomization.CSSPropertyValues.ITALIC) {
                this._initialIsItalicSelected = true;
                this.isItalicsSelected(true);
            }
            if (styles[StyleCustomization.StyleRuleSettings.TITLE_TEXT_DECORATION] === StyleCustomization.CSSPropertyValues.UNDERLINE) {
                this._initialIsUnderlineSelected = true;
                this.isUnderlineSelected(true);
            }
        }

        // Initialize card color
        this.selectedColor = ko.observable(this._getAccessibilityColor(initialColor));
        this.color = ko.computed(() => {
            return this.selectedColor().asHex();
        });

        // Initialize font color
        this.selectedTitleColor = ko.observable(this._getAccessibilityColor(this._initialTitleColor));
        this.titleColor = ko.computed(() => {
            return this.selectedTitleColor().asHex();
        });

        this.state = ko.computed(() => {
            if (this.isOn()) {
                return Resources.CardStyleRule_State_On;
            }
            return Resources.CardStyleRule_State_Off;
        });

        this.isNameEmpty = ko.computed(() => {
            if (this.name().trim()) {
                return false;
            }
            return true;
        });

        this.isWiqlEmpty = ko.computed(() => {
            if (this.wiql().trim()) {
                return false;
            }
            return true;
        });

        this.isDuplicateName = ko.computed(() => {
            var length: number = this._collectionViewModel.styleRules().length;
            var count: number = 0;
            for (var i = 0; i < length; i++) {
                if (this._collectionViewModel.styleRules()[i].name().toLocaleLowerCase().trim() === this.name().toLocaleLowerCase().trim()) {
                    count++;
                }
                if (count > 1) {
                    return true;
                }
            }

            return false;
        });

        this._initialWiql = Predicate_WIT.WiqlHelper.getWiql(this._style.criteria);
        if (this._style && this._style.styles) {
            this._initialColor = this._style.styles["background-color"];
        }
        this.wiql(this._initialWiql);

        this.isDirty = ko.computed(() => {
            if (this._isNew) {
                return true;
            }
            else {
                // We need to do case-insensitve comparisons on colors so we don't think that this style is dirty on initialization
                // if the casing is different. This change is to make us more resilient from bugs in extensions.
                return !(this._style.name === this.name() &&
                    this._style.isEnabled === this.isOn() &&
                    Utils_String.equals(this._initialColor, this.color(), /* ignoreCase */ true) &&
                    Utils_String.equals(this._initialTitleColor, this.titleColor(), /* ignoreCase */ true) &&
                    this._initialWiql === this.wiql() &&
                    this._initialIsBoldSelected === this.isBoldSelected() &&
                    this._initialIsItalicSelected === this.isItalicsSelected() &&
                    this._initialIsUnderlineSelected === this.isUnderlineSelected());
            }
        });

        this.isValid = ko.computed(() => {
            let valid = !(this.isDuplicateName() || this.isNameEmpty() || (!this.hideWiqlEmptyError() && this.isWiqlEmpty()) || this.isWiqlInvalid());
            let message = valid ? this.name() : this.name() + " " + Resources.CSC_GENERIC_SERVER_ERROR_TOOLTIP;
            this.ariaLabel(Utils_String.format(AgileControlsResources.CardStyling_CompatRuleLabel, message));

            return valid;
        });
    }

    public getSelectedColorTooltip(): string {
        return this.selectedColor().getDisplayName();
    }

    public getStyleBackgroundPickerOptions(): PaletteColorPickerControlOptions {
        return <PaletteColorPickerControlOptions>{
            maximumColumns: 9,
            palette: this._collectionViewModel.getCardColorPalette(),
            comboWidth: 143,
            comboHeight: 32,
            defaultColor: this.selectedColor(),
            allowNonPaletteDefaultColor: true,
            isDisabled: !this._collectionViewModel.isEditable(),
            ariaLabelPrefix: AgileControlsResources.CardStyling_SelectCardColor_Label,
            onColorSelected: (source: PaletteColorPickerControl, selectedColor: AccessibilityColor) => {
                this.selectedColor(this._getAccessibilityColor(selectedColor.asHex()));
            }
        };
    }

    public getTitleColorPickerOptions(): PaletteColorPickerControlOptions {
        return <PaletteColorPickerControlOptions>{
            maximumColumns: 6,
            palette: this._collectionViewModel.getTitleColorPalette(),
            defaultColor: this.selectedTitleColor(),
            isDisabled: !this._collectionViewModel.isEditable(),
            ariaLabelPrefix: AgileControlsResources.CardStyling_SelectFontColor_label,
            onColorSelected: (source: PaletteColorPickerControl, selectedTitleColor: AccessibilityColor) => {
                this.selectedTitleColor(this._getAccessibilityColor(selectedTitleColor.asHex()));
            }
        };
    }

    public onKeyPress(command: string, index: number, data: any, event: any) {
        if (event.keyCode === Utils_UI.KeyCode.ENTER) {
            switch (command) {
                case "toggle-menu":
                    this.showMenu(index);
                    break;
                case "delete-style":
                    this._collectionViewModel.onDeleteRule(index);
                    break;
                case "clone-style":
                    this._collectionViewModel.onCloneRule(index);
                    break;
                case "move-up":
                    this._collectionViewModel.onMoveUp(index);
                    break;
                case "move-down":
                    this._collectionViewModel.onMoveDown(index);
                    break;
            }
        }
        if (event.keyCode === Utils_UI.KeyCode.SPACE) {
            switch (command) {
                case "toggle-on-off":
                    this.isOn(!this.isOn());
            }
        }
    }

    public toggleBold() {
        if (this._collectionViewModel.isEditable()) {
            this.isBoldSelected(!this.isBoldSelected());
        }
    }

    public toggleItalics() {
        if (this._collectionViewModel.isEditable()) {
            this.isItalicsSelected(!this.isItalicsSelected());
        }
    }

    public toggleUnderline() {
        if (this._collectionViewModel.isEditable()) {
            this.isUnderlineSelected(!this.isUnderlineSelected());
        }
    }

    public onTitleToolbarKeydown(itemVM: StyleRuleViewModel, e: JQueryEventObject): boolean {
        if (e && e.target && (e.keyCode === Utils_UI.KeyCode.LEFT || e.keyCode === Utils_UI.KeyCode.RIGHT)
            && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            const $button = $(e.target);
            const $toolbar = $button.closest(".title-styling-container");
            const currentIndex = $button.index(".font-trigger, .title-style-btn");
            let newIndex = currentIndex;
            const $toolbarButtons = $toolbar.find(".font-trigger, .title-style-btn");
            if (e.keyCode === Utils_UI.KeyCode.RIGHT) {
                newIndex++;
            }
            else {
                newIndex--;
            }
            if (currentIndex !== newIndex && newIndex >= 0 && newIndex < $toolbarButtons.length) {
                $toolbarButtons.eq(newIndex).focus();
                return false;
            }
        }
        return true;
    }

    public clone(clonedName: string): StyleRuleViewModel {
        var newName = clonedName;
        var newRule: Cards.IStyleRule = { isEnabled: this.isOn(), name: newName, styles: null, type: StyleCustomization.RuleType.FILL, criteria: this.criteria };
        var viewModel = new StyleRuleViewModel(newRule, this._collectionViewModel, true);
        viewModel.wiql(this.wiql());
        viewModel.criteria = this.criteria;
        viewModel.selectedColor(this.selectedColor());
        viewModel.selectedTitleColor(this.selectedTitleColor());
        viewModel.isBoldSelected(this.isBoldSelected());
        viewModel.isItalicsSelected(this.isItalicsSelected());
        viewModel.isUnderlineSelected(this.isUnderlineSelected());
        return viewModel;
    }

    public showMenu(index: number): void {
        this.isMenuVisible(!this.isMenuVisible());
        setTimeout(() => {
            var length = this._collectionViewModel.styleRules().length;
            for (var i = 0; i < length; i++) {
                if (i !== index) {
                    this._collectionViewModel.styleRules()[i].isMenuVisible(false);
                }
            }
        }, 0);
    }

    private _getAccessibilityColor(colorAsHex: string): AccessibilityColor {
        return this._accessibilityColors.hasOwnProperty(colorAsHex) ? this._accessibilityColors[colorAsHex] : new AccessibilityColor(colorAsHex);
    }

    private _style: Cards.IStyleRule;
    private _collectionViewModel: StyleRuleCollectionViewModel;
    private _initialWiql: string;
    private _initialColor: string = Colors.ORANGE_LIGHTER_60;
    private _initialIsBoldSelected: boolean = false;
    private _initialIsItalicSelected: boolean = false;
    private _initialIsUnderlineSelected: boolean = false;
    private _initialTitleColor: string = Colors.BLACK;
    private _isNew: boolean = false;
}


/** the view model for the collection of style rules in the Card Styles settings for a board */
export class StyleRuleCollectionViewModel {
    private _accesibilityColors: IDictionaryStringTo<AccessibilityColor> = Colors.getAccessibilityColors();

    private _cardColorPalette: AccessibilityColor[];
    private _titleColorPalette: AccessibilityColor[];

    public styleRules: KnockoutObservableArray<StyleRuleViewModel> = ko.observableArray<StyleRuleViewModel>([]);

    public disableAddStyle: KnockoutComputed<boolean>;
    public styleRuleAddedDelegate: (index: number) => void;
    public styleRulesUpdatedDelegate: (isDirty: boolean, isValid: boolean) => void;
    public rulesContainerWidthUpdatedDelegate: () => void;
    public isDirty: KnockoutComputed<boolean>;
    public isValid: KnockoutComputed<boolean>;
    public error: KnockoutObservable<string> = ko.observable("");
    public styleRuleLimitReached: KnockoutComputed<boolean>;
    public isEditable: KnockoutObservable<boolean> = ko.observable(false);
    public addRuleFocus: KnockoutObservable<boolean> = ko.observable(false);

    private _originalStylesOrder: string[];
    private _collectionModified: KnockoutComputed<boolean>;

    public static MAXRULELIMIT: number = 10;

    constructor(styleRules: Cards.IStyleRule[], isEditable: boolean = true) {
        this.isEditable = ko.observable(isEditable);
        this.reset(styleRules);
    }

    public reset(styleRules: Cards.IStyleRule[], expandedRuleIndex = -1) {

        this.styleRules.removeAll();
        this._originalStylesOrder = [];

        if (this.disableAddStyle !== undefined) {
            this.disableAddStyle.dispose();
        }

        if (this.styleRuleLimitReached !== undefined) {
            this.styleRuleLimitReached.dispose();
        }

        if (this._collectionModified !== undefined) {
            this._collectionModified.dispose();
        }

        if (this.isDirty !== undefined) {
            this.isDirty.dispose();
        }

        if (this.isValid !== undefined) {
            this.isValid.dispose();
        }


        var length: number = styleRules.length;

        for (var i = 0; i < length; i++) {
            this.styleRules.push(new StyleRuleViewModel(styleRules[i], this));
            this._originalStylesOrder.push(styleRules[i].name);
        }

        if (expandedRuleIndex >= 0) {
            this.styleRules()[expandedRuleIndex].isSelected(true);
        }

        this.styleRuleLimitReached = ko.computed(() => {
            return this.styleRules().length >= StyleRuleCollectionViewModel.MAXRULELIMIT;
        });

        this.disableAddStyle = ko.computed(() => {
            return this.styleRuleLimitReached() || !this.isEditable();
        });

        this._collectionModified = ko.computed(() => {
            var modified: boolean = false;

            if (this.styleRules().length !== this._originalStylesOrder.length) {
                modified = true;
            }
            else {
                var length = this.styleRules().length;
                // See if the rules have been reordered
                for (var k = 0; k < length; k++) {
                    if (Utils_String.ignoreCaseComparer(this.styleRules()[k].name(), this._originalStylesOrder[k]) !== 0) {
                        modified = true;
                        break;
                    }
                }
            }
            return modified;
        });

        this.isDirty = ko.computed(() => {
            var modified: boolean = false;
            var length = this.styleRules().length;
            for (var j = 0; j < length; j++) {
                if (this.styleRules()[j].isDirty()) {
                    modified = true;
                    break;
                }
            }
            if (!modified) {
                modified = this._collectionModified();
            }

            this.error("");
            if (this.styleRulesUpdatedDelegate) {
                this.styleRulesUpdatedDelegate(modified, this.isValid());
            }

            return modified;
        });

        this.isValid = ko.computed(() => {
            var valid: boolean = true;

            var length = this.styleRules().length;
            for (var j = 0; j < length; j++) {
                if (!this.styleRules()[j].isValid()) {
                    valid = false;
                    break;
                }
            }

            return valid;
        });
    }

    public onClickCompactRule = (styleRuleVM: StyleRuleViewModel, event?: JQueryEventObject) => {
        if (event && $(event.target).hasClass("rule-switch")) {
            //On click on the rule enabled checkbox, the rule should not be expanded/collapsed.
            return true;
        }

        const index: number = this.styleRules().indexOf(styleRuleVM);
        this.onSelectRule(index);
        return false;
    }

    public onSelectRule(index: number): void {
        var length = this.styleRules().length;
        var currentStyleRule = this.styleRules()[index];
        var alreadySelected: boolean = currentStyleRule.isSelected();

        if (alreadySelected) {
            if (currentStyleRule.hideWiqlEmptyError()) {
                currentStyleRule.hideWiqlEmptyError(false);
            }
            currentStyleRule.isSelected(false);
            if (this.rulesContainerWidthUpdatedDelegate) {
                this.rulesContainerWidthUpdatedDelegate();
            }
            return;
        }

        for (var i = 0; i < length; i++) {
            if (index !== i) {
                if (this.styleRules()[i].hideWiqlEmptyError()) {
                    // If we are collapsing a rule which has hideWiqlEmpty error set to true because it was a new rule, we need to set it to false when it is collapsed.
                    this.styleRules()[i].hideWiqlEmptyError(false);
                }
            }
            this.styleRules()[i].isSelected(index === i);
        }
        var nameInput: HTMLInputElement = <HTMLInputElement>$("div.rule-form-container .name-section input")[index];
        if (nameInput) {
            nameInput.focus();
            nameInput.select();
        }
        if (this.rulesContainerWidthUpdatedDelegate) {
            this.rulesContainerWidthUpdatedDelegate();
        }
    }

    public onDeleteRule(index: number): void {
        this.styleRules.remove(this.styleRules()[index]);
        this.addRuleFocus(true);
        if (this.rulesContainerWidthUpdatedDelegate) {
            this.rulesContainerWidthUpdatedDelegate();
        }
    }

    public onCloneRule(index: number): void {
        if (this.disableAddStyle()) {
            return;
        }
        this.styleRules()[index].isMenuVisible(false);
        var clonedRule = this.styleRules()[index].clone(this._getClonedRuleName(this.styleRules()[index].name()));
        this.styleRules().splice(index, 0, clonedRule);
        this.styleRules.valueHasMutated();

        if (this.styleRuleAddedDelegate) {
            this.styleRuleAddedDelegate(index);
        }
        this.onSelectRule(index);
    }

    public onKeyPress(index: number, data: any, event: any) {
        if (!event) {
            // If the third parameter is null, the event is the second parameter
            event = data;
        }

        if (event.keyCode === Utils_UI.KeyCode.ENTER) {
            this.onSelectRule(index);
        }
        else if (this.isEditable()) {
            if (event.keyCode === Utils_UI.KeyCode.DELETE) {
                this.onDeleteRule(index);
            }
            else if (event.keyCode === Utils_UI.KeyCode.SPACE) {
                let currentStyleRule = this.styleRules()[index];
                currentStyleRule.isOn(!currentStyleRule.isOn());
            }
        }
        return true;
    }

    public onMoveUp(index: number): void {
        if (index <= 0) {
            return;
        }
        this._swapRules(index, index - 1);
    }

    public onMoveDown(index: number): void {
        if (index >= this.styleRules().length - 1) {
            return;
        }
        this._swapRules(index, index + 1);
    }

    public addNewStyleRule(): void {
        if (this.disableAddStyle()) {
            return;
        }

        var newName = this._getNewRuleName();
        var newRule: Cards.IStyleRule = { isEnabled: true, name: newName, styles: null, type: StyleCustomization.RuleType.FILL, criteria: null };
        var viewModel = new StyleRuleViewModel(newRule, this, true);
        this.styleRules().unshift(viewModel);
        this.styleRules.valueHasMutated();

        if (this.styleRuleAddedDelegate) {
            this.styleRuleAddedDelegate(0);
        }

        this.onSelectRule(0);
    }

    public getStyleSettings(): StyleCustomization.ICardStyleRule[] {
        var rules: StyleCustomization.ICardStyleRule[] = [];
        var length = this.styleRules().length;
        for (var i = 0; i < length; i++) {
            var ruleViewModel: StyleRuleViewModel = this.styleRules()[i];
            var rule: StyleCustomization.ICardStyleRule = {
                isEnabled: ruleViewModel.isOn(),
                name: ruleViewModel.name(),
                backgroundColor: ruleViewModel.color(),
                type: StyleCustomization.RuleType.FILL,
                wiql: ruleViewModel.wiql()
            };
            if (ruleViewModel.titleColor()) {
                rule.titleColor = ruleViewModel.titleColor();
            }
            if (ruleViewModel.isBoldSelected()) {
                rule.titleFontWeight = StyleCustomization.CSSPropertyValues.BOLD;
            }
            if (ruleViewModel.isItalicsSelected()) {
                rule.titleFontStyle = StyleCustomization.CSSPropertyValues.ITALIC;
            }
            if (ruleViewModel.isUnderlineSelected()) {
                rule.titleTextDecoration = StyleCustomization.CSSPropertyValues.UNDERLINE;
            }
            rules.push(rule);
        }

        return rules;
    }

    public getCurrentStyles(): Cards.IStyleRule[] {

        var currentStyles: Cards.IStyleRule[] = [],
            styleCount = this.styleRules().length;

        for (var i = 0; i < styleCount; i++) {
            currentStyles.push(this._convertStyleRuleViewModelToIStyleRule(this.styleRules()[i]));
        }
        return currentStyles;
    }

    public getCurrentlySelectedRuleIndex(): number {
        var selectedRuleIndex: number = -1,
            styleCount = this.styleRules().length;

        for (var i = 0; i < styleCount; i++) {
            if (this.styleRules()[i].isSelected()) {
                selectedRuleIndex = i;
                break;
            }
        }

        return selectedRuleIndex;
    }

    private _convertStyleRuleViewModelToIStyleRule(ruleViewModel: StyleRuleViewModel): Cards.IStyleRule {
        var StyleRuleSettings = StyleCustomization.StyleRuleSettings;
        var rule: Cards.IStyleRule = {
            name: ruleViewModel.name(),
            type: StyleCustomization.RuleType.FILL,
            isEnabled: ruleViewModel.isOn(),
            styles: {},
            criteria: ruleViewModel.criteria
        };

        rule.styles[StyleRuleSettings.BACKGROUND_COLOR] = ruleViewModel.color();

        if (ruleViewModel.titleColor()) {
            rule.styles[StyleRuleSettings.TITLE_COLOR] = ruleViewModel.titleColor();
        }
        if (ruleViewModel.isBoldSelected()) {
            rule.styles[StyleRuleSettings.TITLE_FONT_WEIGHT] = StyleCustomization.CSSPropertyValues.BOLD;
        }
        if (ruleViewModel.isItalicsSelected()) {
            rule.styles[StyleRuleSettings.TITLE_FONT_STYLE] = StyleCustomization.CSSPropertyValues.ITALIC;
        }
        if (ruleViewModel.isUnderlineSelected()) {
            rule.styles[StyleRuleSettings.TITLE_TEXT_DECORATION] = StyleCustomization.CSSPropertyValues.UNDERLINE;
        }

        return rule;
    }

    public collapseAllRules() {
        var length = this.styleRules().length;

        for (var i = 0; i < length; i++) {
            this.styleRules()[i].isSelected(false);
        }
        if (this.rulesContainerWidthUpdatedDelegate) {
            this.rulesContainerWidthUpdatedDelegate();
        }
    }

    public updateEmptyWiqlError() {
        var currentlySelectedIndex = this.getCurrentlySelectedRuleIndex();

        if (currentlySelectedIndex >= 0) {
            this.styleRules()[currentlySelectedIndex].hideWiqlEmptyError(false);
        }
    }

    public getTitleColorPalette(): AccessibilityColor[] {
        if (!this._titleColorPalette) {
            this._initializeTitleColorPalette();
        }
        return this._titleColorPalette;
    }

    public getCardColorPalette(): AccessibilityColor[] {
        if (!this._cardColorPalette) {
            this._initializeCardColorPalette();
        }
        return this._cardColorPalette;
    }

    private _initializeTitleColorPalette(): void {
        const colorsDictionary = this._accesibilityColors;
        this._titleColorPalette = [colorsDictionary[Colors.ORANGE], colorsDictionary[Colors.DARK_GREEN], colorsDictionary[Colors.BLUE], colorsDictionary[Colors.DARK_PURPLE],
        colorsDictionary[Colors.DARK_RED], colorsDictionary[Colors.BLACK], colorsDictionary[Colors.YELLOW], colorsDictionary[Colors.GREEN],
        colorsDictionary[Colors.TEAL], colorsDictionary[Colors.GREY], colorsDictionary[Colors.RED], colorsDictionary[Colors.WHITE]];
    }

    private _initializeCardColorPalette(): void {
        const colorsDictionary = this._accesibilityColors;
        this._cardColorPalette = [
            colorsDictionary[Colors.LIGHT_GREY], colorsDictionary[Colors.LIGHT_PURPLE], colorsDictionary[Colors.LIGHT_BLUE], colorsDictionary[Colors.LIGHT_TEAL],
            colorsDictionary[Colors.LIGHT_GREEN], colorsDictionary[Colors.LIGHT_ORANGE], colorsDictionary[Colors.LIGHT_YELLOW], colorsDictionary[Colors.BEIGE], colorsDictionary[Colors.LIGHT_RED],

            colorsDictionary[Colors.GREY_LIGHTER_20], colorsDictionary[Colors.PURPLE_LIGHTER_20], colorsDictionary[Colors.BLUE_LIGHTER_20], colorsDictionary[Colors.TEAL_LIGHTER_20],
            colorsDictionary[Colors.GREEN_LIGHTER_20], colorsDictionary[Colors.ORANGE_LIGHTER_20], colorsDictionary[Colors.YELLOW_LIGHTER_20], colorsDictionary[Colors.BEIGE_LIGHTER_20], colorsDictionary[Colors.RED_LIGHTER_20],

            colorsDictionary[Colors.GREY_LIGHTER_40], colorsDictionary[Colors.PURPLE_LIGHTER_40], colorsDictionary[Colors.BLUE_LIGHTER_40], colorsDictionary[Colors.TEAL_LIGHTER_40],
            colorsDictionary[Colors.GREEN_LIGHTER_40], colorsDictionary[Colors.ORANGE_LIGHTER_40], colorsDictionary[Colors.YELLOW_LIGHTER_40], colorsDictionary[Colors.BEIGE_LIGHTER_40], colorsDictionary[Colors.RED_LIGHTER_40],

            colorsDictionary[Colors.GREY_LIGHTER_60], colorsDictionary[Colors.PURPLE_LIGHTER_60], colorsDictionary[Colors.BLUE_LIGHTER_60], colorsDictionary[Colors.TEAL_LIGHTER_60],
            colorsDictionary[Colors.GREEN_LIGHTER_60], colorsDictionary[Colors.ORANGE_LIGHTER_60], colorsDictionary[Colors.YELLOW_LIGHTER_60], colorsDictionary[Colors.BEIGE_LIGHTER_60], colorsDictionary[Colors.RED_LIGHTER_60],

            colorsDictionary[Colors.WHITE], colorsDictionary[Colors.PURPLE_LIGHTER_80], colorsDictionary[Colors.BLUE_LIGHTER_80], colorsDictionary[Colors.TEAL_LIGHTER_80],
            colorsDictionary[Colors.GREEN_LIGHTER_80], colorsDictionary[Colors.ORANGE_LIGHTER_80], colorsDictionary[Colors.YELLOW_LIGHTER_80], colorsDictionary[Colors.BEIGE_LIGHTER_80], colorsDictionary[Colors.RED_LIGHTER_80]
        ];
    }

    private _getNewRuleName(attempt?: number): string {
        var defaultName = Resources.CardStyling_DefaultName;
        return this._getUniqueRuleName(defaultName);
    }

    private _getClonedRuleName(sourceRuleName: string): string {
        return this._getUniqueRuleName(sourceRuleName, 1);
    }

    private _getUniqueRuleName(baseRuleName: string, attempt?: number): string {
        var ruleName: string = baseRuleName;
        if (!attempt) {
            attempt = 0;
        }
        if (attempt > 0) {
            ruleName = Utils_String.format(Resources.NewRuleName, baseRuleName, attempt);
        }
        var length = this.styleRules().length;
        var retry: boolean = false;
        for (var i = 0; i < length; i++) {
            var viewModel = this.styleRules()[i];
            if (viewModel.name() === ruleName) {
                retry = true;
                break;
            }
        }

        if (retry) {
            return this._getUniqueRuleName(baseRuleName, attempt + 1);
        }

        return ruleName;
    }

    private _swapRules(sourceIndex: number, targetIndex: number): void {
        var source: StyleRuleViewModel = this.styleRules()[sourceIndex];
        var target: StyleRuleViewModel = this.styleRules()[targetIndex];
        var collection: StyleRuleViewModel[] = this.styleRules();
        collection[targetIndex] = source;
        collection[sourceIndex] = target;
        this.styleRules.valueHasMutated();
        this.styleRules()[targetIndex].isMenuVisible(false);
    }
}

