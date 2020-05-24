/// <reference types="jquery" />



import Cards = require("Agile/Scripts/Card/Cards");
import ko = require("knockout");
import StyleCustomization = require("Agile/Scripts/Card/CardCustomizationStyle");
import Resources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import Utils_String = require("VSS/Utils/String");
import Utils_Core = require("VSS/Utils/Core");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_TagService = require("Presentation/Scripts/TFS/FeatureRef/TFS.TagService");
import { Colors } from "Agile/Scripts/Common/Colors";
import { AccessibilityColor, PaletteColorPickerControl, PaletteColorPickerControlOptions } from "Presentation/Scripts/TFS/TFS.UI.Controls.ColorPicker";
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");

TFS_Knockout.overrideDefaultBindings()

export class TagColorViewModel {
    private _style: Cards.IStyleRule;
    private _collectionViewModel: TagColorCollectionViewModel;
    private _initialColor: string = Colors.YELLOW;
    private _isNew: boolean = false;
    private _accessibilityColors: IDictionaryStringTo<AccessibilityColor> = Colors.getAccessibilityColors();

    public static BACKGROUND_COLOR: string = "background-color";
    public static FONT_COLOR: string = "color";

    public isDirty: KnockoutComputed<boolean>;
    public hasError: KnockoutComputed<boolean>;

    public name: KnockoutObservable<string> = ko.observable("");
    public isOn: KnockoutObservable<boolean> = ko.observable(true);
    public selectedTagColor: KnockoutObservable<AccessibilityColor>;
    public backgroundColor: KnockoutComputed<string>;
    public color: KnockoutObservable<string> = ko.observable(Colors.WHITE);
    public showError: KnockoutObservable<boolean> = ko.observable(false);
    public errorMessage: KnockoutObservable<string> = ko.observable("");
    public isDuplicate: KnockoutObservable<boolean> = ko.observable(false);

    constructor(styleRule: Cards.IStyleRule, collectionViewModel: TagColorCollectionViewModel, isNew?: boolean) {
        this._style = styleRule;
        this._collectionViewModel = collectionViewModel;
        this._isNew = isNew;
        this.name(styleRule.name);
        this.isOn(styleRule.isEnabled);

        if (this._style && this._style.styles) {
            var backgroundColor = this._style.styles[TagColorViewModel.BACKGROUND_COLOR];
            var fontColor = this._style.styles[TagColorViewModel.FONT_COLOR];
            if (backgroundColor) {
                this._initialColor = backgroundColor;
            }
            if (fontColor) {
                this.color = ko.observable(fontColor);
            }
        }

        const initialColor = this._accessibilityColors.hasOwnProperty(this._initialColor) ? this._accessibilityColors[this._initialColor] : new AccessibilityColor(this._initialColor);
        this.selectedTagColor = ko.observable(initialColor);
        this.backgroundColor = ko.computed(() => {
            const selectedTagColorHex = this.selectedTagColor().asHex();
            if (this._collectionViewModel.BackGroundColorFontColorMapping[selectedTagColorHex]) {
                this.color(this._collectionViewModel.BackGroundColorFontColorMapping[selectedTagColorHex]);
            }
            else {
                this.color(Colors.WHITE);
            }
            return selectedTagColorHex;
        }, this);

        if (this.isDirty) {
            this.isDirty.dispose();
        }

        this.isDirty = ko.computed(() => {
            if (this._isNew) {
                return true;
            }
            else {
                return !(this._style.name === this.name() &&
                    this._style.isEnabled === this.isOn() &&
                    this._initialColor === this.backgroundColor());
            }
        }, this);

        if (this.hasError) {
            this.hasError.dispose();
        }

        this.hasError = ko.computed(() => {
            if (this.isDuplicate()) {
                this.errorMessage(Resources.CardOptions_DuplicateFieldError);
            }

            return this.isDuplicate();
        }, this);
    }

    public getTagColorPickerOptions(): PaletteColorPickerControlOptions {
        return <PaletteColorPickerControlOptions>{
            maximumColumns: 6,
            ariaLabelPrefix: Resources.TagColoring_SelectTag_Label,
            palette: this._collectionViewModel.getTagColorPalette(),
            comboWidth: 143,
            comboHeight: 32,
            defaultColor: this.selectedTagColor(),
            isDisabled: !this._collectionViewModel.isEditable(),
            onColorSelected: (source: PaletteColorPickerControl, selectedColor: AccessibilityColor) => {
                const colorAsHex = selectedColor.asHex();
                const selectedAccessibilityColor = this._accessibilityColors.hasOwnProperty(colorAsHex) ? this._accessibilityColors[colorAsHex] : new AccessibilityColor(colorAsHex);
                this.selectedTagColor(selectedAccessibilityColor);
            }
        };
    }

    public dispose(): void {
        if (this.hasError) {
            this.hasError.dispose();
        }

        if (this.isDirty) {
            this.isDirty.dispose();
        }
    }
}

export class TagColorCollectionViewModel {

    // KnockOut Object Sections 
    // Public Knockout observables
    public styleRules: KnockoutObservableArray<TagColorViewModel> = ko.observableArray<TagColorViewModel>([]);
    private _availableTags: KnockoutObservableArray<string> = ko.observableArray<string>([]);
    public isEditable: KnockoutObservable<boolean> = ko.observable(true);
    public showWarning: KnockoutComputed<boolean>;
    // Public Knockout Computed
    public disableAdd: KnockoutComputed<boolean>;
    public isDirty: KnockoutComputed<boolean>;
    public focusOnAddTag: KnockoutObservable<boolean> = ko.observable(false);

    public BackGroundColorFontColorMapping: IDictionaryStringTo<string> = {};

    // Private Knockout Computed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 
    public _isValid: KnockoutComputed<boolean>; //Making this public for unit testing
    private _collectionModified: KnockoutComputed<boolean>;

    // Public Variables
    public COMBOCONTAINERSELECTOR: string = ".comboarea";
    public tagsComboOptions: any;
    public tagColorUpdatedDelegate: (isDirty: boolean, isValid: boolean) => void;
    // private variables
    public static MAX_NUM_ALLOWED_TAG_COLOR: number = 20;
    private _originalStylesRuleLength: number;
    private _viewModelInFocus: TagColorViewModel;
    private _tagColorPalette: AccessibilityColor[];

    constructor(styleRules: Cards.IStyleRule[], isEditable: boolean) {
        this.isEditable = ko.observable(isEditable);
        this.reset(styleRules);

        this.tagsComboOptions = (() => {
            return {
                mode: "drop",
                source: this._availableTags,
                change: Utils_Core.delegate(this, this._tagsComboChange),
                enabled: isEditable,
                focus: (tagColorVM: TagColorViewModel) => {
                    // We need to refresh the dupicate entry once we focus on a combo
                    if (this.isDirty()) {
                        this._refreshDuplicates();
                    }
                    // since the current combo is focused, so we should remove the duplicate 
                    // entry here since it may be edited.
                    tagColorVM.isDuplicate(false);
                    tagColorVM.showError(false);
                    this._populateAvailableTags(this._viewModelInFocus);
                },
                blur: (tagColorVM: TagColorViewModel) => {
                    tagColorVM.showError(tagColorVM.isDuplicate());
                    // Once we go out of combo, it means may be we have selected something
                    // So we neeed to populate the available tags again.
                    this._populateAvailableTags(this._viewModelInFocus);
                    // also if we havemodified something it means need to refresh the 
                    // duplicate value.
                    if (this.isDirty()) {
                        this._refreshDuplicates();
                    }
                },
                dropOptions: {
                    preventMouseDown: true
                },
                dropHide: (tagColorVM: TagColorViewModel) => {
                    this._populateAvailableTags(this._viewModelInFocus);
                },
                label: Resources.Tag_Field_Label
            };
        });
    }

    public onMouseOver = (tagColorVM: TagColorViewModel) => {
        this._viewModelInFocus = tagColorVM;
    };

    public onComboDropClick() {
        this._populateAvailableTags(this._viewModelInFocus);
    }

    // This function will be called when we click on the + tag button
    public addNewTagColor(): void {
        if (this.disableAdd()) {
            return;
        }
        // According to the new spec empty new combo
        var newName = "";
        var newRule: Cards.IStyleRule = { isEnabled: true, name: newName, styles: null, type: StyleCustomization.RuleType.TAGSTYLE, criteria: null };
        var viewModel = new TagColorViewModel(newRule, this, true);
        this.styleRules.unshift(viewModel);
        // We need to call this to let the framework know that the styleRules array is modified.
        this.styleRules.valueHasMutated();
    }

    public removeTagColor = (tagColorVM: TagColorViewModel) => {
        this.styleRules.remove(tagColorVM);
        this.styleRules.valueHasMutated();
        this._populateAvailableTags();
        // May be we have deleted the duplicate entry 
        // so duplicate needs to be refreshed.
        this._refreshDuplicates();
    };

    public dispose(): void {

        if (this.disableAdd) {
            this.disableAdd.dispose();
        }

        if (this._collectionModified) {
            this._collectionModified.dispose();
        }

        if (this.isDirty) {
            this.isDirty.dispose();
        }
        if (this._isValid) {
            this._isValid.dispose();
        }
        if (this.showWarning) {
            this.showWarning.dispose();
        }

        var viewModels = this.styleRules();
        for (var j = 0, length = viewModels.length; j < length; j++) {
            viewModels[j].dispose();
        }

    }

    public getTagColorPalette(): AccessibilityColor[] {
        if (!this._tagColorPalette) {
            this._initializeTagColorPalette();
        }
        return this._tagColorPalette;
    }

    private _initializeTagColorPalette() {
        const colorsDictionary: IDictionaryStringTo<AccessibilityColor> = Colors.getAccessibilityColors();
        this._tagColorPalette = [colorsDictionary[Colors.ORANGE], colorsDictionary[Colors.DARK_GREEN], colorsDictionary[Colors.BLUE], colorsDictionary[Colors.DARK_PURPLE],
        colorsDictionary[Colors.DARK_RED], colorsDictionary[Colors.GREY], colorsDictionary[Colors.YELLOW], colorsDictionary[Colors.GREEN],
        colorsDictionary[Colors.TEAL], colorsDictionary[Colors.PURPLE], colorsDictionary[Colors.RED], colorsDictionary[Colors.DEFAULT]];
    }

    private _populateFontColorMapping() {
        this.BackGroundColorFontColorMapping[Colors.DEFAULT] = Colors.BLACK;
        this.BackGroundColorFontColorMapping[Colors.ORANGE] = Colors.BLACK;
        this.BackGroundColorFontColorMapping[Colors.YELLOW] = Colors.BLACK;
        this.BackGroundColorFontColorMapping[Colors.GREEN] = Colors.BLACK;
        this.BackGroundColorFontColorMapping[Colors.TEAL] = Colors.BLACK;

        this.BackGroundColorFontColorMapping[Colors.DARK_GREEN] = Colors.WHITE;
        this.BackGroundColorFontColorMapping[Colors.BLUE] = Colors.WHITE;
        this.BackGroundColorFontColorMapping[Colors.DARK_PURPLE] = Colors.WHITE;
        this.BackGroundColorFontColorMapping[Colors.DARK_RED] = Colors.WHITE;
        this.BackGroundColorFontColorMapping[Colors.GREY] = Colors.WHITE;
        this.BackGroundColorFontColorMapping[Colors.PURPLE] = Colors.WHITE;
        this.BackGroundColorFontColorMapping[Colors.RED] = Colors.WHITE;
    }

    private _populateTagRulesObjects(styleRules: Cards.IStyleRule[]): void {
        this._originalStylesRuleLength = styleRules.length;
        for (var i = 0; i < styleRules.length; i++) {
            var newRule: Cards.IStyleRule = { isEnabled: styleRules[i].isEnabled, name: styleRules[i].name, styles: styleRules[i].styles, type: StyleCustomization.RuleType.TAGSTYLE, criteria: null };
            var viewModel = new TagColorViewModel(newRule, this, false);
            this.styleRules().push(viewModel);
        }
        this.styleRules.valueHasMutated();
    }

    private _populateComputedKOObjects(): void {
        // IF the total number of tags are more then MAX_NUM_ALLOWED_TAG_COLOR then 
        // disableAdd will be true and it will gray out the + tag button.
        this.disableAdd = ko.computed(() => {
            if (this.styleRules().length >= TagColorCollectionViewModel.MAX_NUM_ALLOWED_TAG_COLOR || !this.isEditable()) {
                return true;
            }
            else {
                return false;
            }
        }, this);

        // warning will be shown when the max limit of tag rules is reached and there is edit permission to add more tag rules
        this.showWarning = ko.computed(() => {
            if (this.styleRules().length >= TagColorCollectionViewModel.MAX_NUM_ALLOWED_TAG_COLOR && this.isEditable()) {
                return true;
            }
            else {
                return false;
            }
        }, this);

        // If the stylerule array length is not equal to the original length it means the collection is modified
        this._collectionModified = ko.computed(() => {
            var modified: boolean = false;
            if (this.styleRules().length !== this._originalStylesRuleLength) {
                modified = true;
            }
            return modified;
        }, this);

        // This is used to tell the CSC framework if there is any error, or if the data is valid.
        // If any name is a duplicate name it means the collection is not valid.
        this._isValid = ko.computed(() => {
            return this._ifNoDuplicateName();
        }, this);

        // Either the collection is modified or any of the tag color is dirty. 
        // this will make the collection dirty and will enable the save button
        this.isDirty = ko.computed(() => {
            var modified: boolean = this._ifAnyTagColorDirty();

            if (!modified) {
                modified = this._collectionModified();
            }

            // Need to let the CSC framework know if it has to show modified and/or invalid status at the tab.
            if (this.tagColorUpdatedDelegate) {
                this.tagColorUpdatedDelegate(modified, this._isValid());
            }
            return modified;
        }, this);
    }

    private _ifAnyTagColorDirty(): boolean {
        for (var i = 0; i < this.styleRules().length; i++) {
            if (this.styleRules()[i].isDirty()) {
                return true;
            }
        }
        return false;
    }

    private _ifNoDuplicateName(): boolean {
        for (var i = 0; i < this.styleRules().length; i++) {
            if (this.styleRules()[i].isDuplicate()) {
                return false;
            }
        }
        return true;
    }

    // This will use the tag service to get the available tags. if the tags are not cached an asyc callback will be called to set the available tags. 
    private _populateAvailableTags(currentSelectedViewModel?: TagColorViewModel): void {
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var tagService = <TFS_TagService.TagService>TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService(TFS_TagService.TagService);
        var projectScope = tfsContext.contextData.project.id;

        this._availableTags.removeAll();

        tagService.beginQueryTagNames(
            [TFS_TagService.TagService.WORK_ITEM_ARTIFACT_KIND],
            projectScope,
            (tags: string[]) => {
                var availableTags = this._availableTags();
                for (var i = 0; i < tags.length; i++) {
                    availableTags.push(tags[i]);
                }
                // Once we have the available tags we need to trim its value depending upon the already available items in the list.
                this._trimAvailableTags(currentSelectedViewModel);
            },
            function (error) {
                // no-op error handler; if the autocomplete doesn't retrieve it simply won't be displayed
            });
    }

    public reset(styleRules: Cards.IStyleRule[]) {

        this._populateFontColorMapping();

        this.styleRules.removeAll();

        this._populateTagRulesObjects(styleRules);

        this._populateComputedKOObjects();

        this._populateAvailableTags();
    }

    // update the view model on input change
    private _tagsComboChange(currentComboValue: string, tagsColorVM: TagColorViewModel) {
        tagsColorVM.name(currentComboValue);
    }

    private _trimAvailableTags(currentSelectedViewModel?: TagColorViewModel) {

        for (var i = 0; i < this.styleRules().length; i++) {
            // We are going to show the tag name in the combo drop down even if it selected in the 
            // current focused combo. This is according to the new spec.
            var curIndex = -1;
            if (currentSelectedViewModel) {
                curIndex = this._availableTags().indexOf(currentSelectedViewModel.name());
            }
            var index = this._availableTags().indexOf(this.styleRules()[i].name());

            if (index !== curIndex && index > -1) {
                this._availableTags().splice(index, 1);
            }
        }
    }

    // populate the duplicate flag for each style rule.
    private _refreshDuplicates(): void {
        for (var i = 0; i < this.styleRules().length; i++) {
            this.styleRules()[i].isDuplicate(false);
            this.styleRules()[i].name(this.styleRules()[i].name().trim());
        }

        for (var i = 0; i < this.styleRules().length - 1; i++) {
            // We will not take into account any of the empty tag names
            // On save we are anyway going to discard the empty name combo
            if (!this.styleRules()[i].isDuplicate() && this.styleRules()[i].name().trim().length !== 0) {
                for (var j = i + 1; j < this.styleRules().length; j++) {
                    if (this.styleRules()[j].name().trim().length !== 0) {
                        if (Utils_String.localeIgnoreCaseComparer(this.styleRules()[i].name(), this.styleRules()[j].name()) === 0) {
                            this.styleRules()[j].isDuplicate(true);
                        }
                    }
                }
            }
        }
    }

    // The following code is related to saving of the dialog.
    public getStyleSettings(): StyleCustomization.ITagColorRule[] {
        var rules: StyleCustomization.ITagColorRule[] = [];
        var length = this.styleRules().length;
        for (var i = 0; i < length; i++) {
            var ruleViewModel: TagColorViewModel = this.styleRules()[i];
            // discarding the empty name combo for save
            if (ruleViewModel.name().trim().length !== 0) {
                var rule =
                    {
                        isEnabled: ruleViewModel.isOn(),
                        name: ruleViewModel.name(),
                        backgroundColor: ruleViewModel.backgroundColor(),
                        type: StyleCustomization.RuleType.TAGSTYLE,
                        wiql: null,
                        color: ruleViewModel.color()
                    } as StyleCustomization.ITagColorRule;
                rules.push(rule);
            }
        }

        return rules;
    }

    private _convertTagColorViewModelToIStyleRule(ruleViewModel: TagColorViewModel): Cards.IStyleRule {

        var newRule: Cards.IStyleRule = {
            name: ruleViewModel.name(),
            type: StyleCustomization.RuleType.TAGSTYLE,
            isEnabled: ruleViewModel.isOn(),
            // Hard coding here. Earlier tried without hardcoding it was not working. 
            styles: { "background-color": ruleViewModel.backgroundColor(), "color": ruleViewModel.color() },
            criteria: null
        };

        return newRule;
    }

    public getCurrentTagColors(): Cards.IStyleRule[] {
        var currentTagColors: Cards.IStyleRule[] = [],
            styleCount = this.styleRules().length;

        for (var i = 0; i < styleCount; i++) {
            // discarding the empty name combo for save
            if (this.styleRules()[i].name().trim().length !== 0) {
                currentTagColors.push(this._convertTagColorViewModelToIStyleRule(this.styleRules()[i]));
            }
        }
        return currentTagColors;

    }

}

