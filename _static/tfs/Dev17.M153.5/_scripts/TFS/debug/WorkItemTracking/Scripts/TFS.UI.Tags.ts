///<amd-dependency path="jQueryUI/autocomplete"/>
/// <reference types="jquery" />


import VSS = require("VSS/VSS");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import Diag = require("VSS/Diag");
import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import Utils_UI = require("VSS/Utils/UI");
import Controls = require("VSS/Controls");
import { TagUtils } from "WorkItemTracking/Scripts/Utils/TagUtils";
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import TagConstants = require("WorkItemTracking/Scripts/TFS.UI.Tags.Constants");

const domElem = Utils_UI.domElem;

export enum TagChangeType {
    Add = 0,
    Delete = 1,
}

export interface ITagControlOptions {
    /**
     * array of tag names to be rendered
     */
    tags?: string[];

    /**
     * prefix to the listed tags
     */
    tagLabel?: string;

    /**
     * to indicate if the control is readonly
     */
    readOnly?: boolean;

    /**
     * to indicate if the control is selectable
     */
    selectable?: boolean;

    /**
     * to indicate that we should never sort this TagControl.
     */
    unsorted?: boolean;

    /**
     * to indicate the max width of the control,
     * used to determine when the overflow button is shown
     */
    maxWidth?: number;

    /**
     * to indicate the max number of tags to render, if needed
     */
    maxTags?: number;

    /**
     * function for each tag's click event.
     */
    tagClick?;

    /**
     * function for each tag's keyDown event. Replaces the default behavior.
     */
    tagKeyDown?;

    /**
     * function for additional rendering on the tag item itself
     */
    tagRenderer?: ($tag: JQuery, fullTagName: string, displayTagName: string) => void;

    /**
     * Sorting function for tags.Default will be sorted alphabetically, ignoring case.
     */
    tagSort?;

    /**
     * denoting where this TagControl will be rendered; expected values are
     * null, "grid", "filter.availabe", or "filter.applied"
     */
    type?: string;

    /**
     * handler for available tag selection through filter dropdown
     */
    availableTagSelect?;

    /**
     * Function to get tag count
     */
    getTagCount?;

    /**
     * Tag character limit
     */
    tagCharacterLimit?: number;

    availableDropdownSelect?;
    useDeleteExperience?: boolean;
    beginGetSuggestedValues?;
    addTagTextOnChange?;
    addButtonText?;
}

export class TagControl extends Controls.Control<ITagControlOptions> {

    public static enhancementTypeName: string = "tfs.ui.tagcontrol";

    public static AUTOCOMPLETE_CHARACTER_LIMIT: number = 15;
    public static AUTOCOMPLETE_MATCHES_LIMIT: number = 200;
    public static FILTER_DROPDOWN_WIDTH: number = 150;
    public static coreCssClass: string = "tfs-tags";

    public static FullTagNameKey = "fullTagName";

    public static shouldKeydownTriggerClick(event: JQueryKeyEventObject): boolean {
        Diag.Debug.assertIsObject(event);
        return event.keyCode === Utils_UI.KeyCode.ENTER || event.keyCode === Utils_UI.KeyCode.SPACE;
    }

    private _tags: string[];
    private _$tagsList: JQuery;
    private _$tagInput: JQuery;
    private _$addButtonContainer: JQuery;
    private _gettingSuggestedValues: JQueryPromise<string[]>;
    private _width: number;
    private _selectedIndex: number;
    private _visibleTagsCount: number;
    private _isAutoCompleteVisible: boolean;
    private _addTagTooltip: RichContentTooltip;

    //whether the tag control is currently set to readonly
    private _readOnly: boolean;

    constructor(options?: ITagControlOptions) {
        super(options);
    }

    public initializeOptions(options?: ITagControlOptions) {
        super.initializeOptions($.extend({
            coreCssClass: TagControl.coreCssClass,
            tags: [],
            readOnly: false
        }, options));
    }

    /**
     * Initialize the control.
     */
    public initialize() {
        super.initialize();
        const element = this.getElement();

        // start selected index at first element
        this._selectedIndex = 0;
        // Set visible tags count to negative one for all tags visible
        this._visibleTagsCount = -1;

        // attach the control's label, if it has one
        if (this._options.tagLabel) {
            $(domElem("span", "tags-label"))
                .attr("id", "tags-label")
                .text(this._options.tagLabel)
                .appendTo($(domElem("div", "tags-label-container")).appendTo(element));
        }

        // create the tags list, attaching input elements if necessary
        this._$tagsList = $(domElem("ul"));

        this._readOnly = this._options.readOnly;

        if (!this._readOnly) {
            this._initializeInputElements();
        }

        // attach the list to the container, and the container to the element
        const $tagItemsContainer = $(domElem("div", "tags-items-container"))
            .attr("role", "toolbar");
        // Accessible Label, associate toolbar with created label or add aria-label
        if (this._options.tagLabel) {
            $tagItemsContainer.attr("aria-labelledby", "tags-label");
        } else if (this._options.tags) {
            const tagValues = this._options.tags.toString();
            $tagItemsContainer.attr("aria-label", tagValues);
        }
        this._$tagsList.appendTo($tagItemsContainer);
        $tagItemsContainer.appendTo(element);

        if (this._options.tags) {
            this.setItems(this._options.tags);
        }
    }

    /**
     * Adds a new tag entry if it does not already exist in the list.
     * @param name The tag to be added.
     */
    public addTag(name: string) {
        Diag.Debug.assertParamIsString(name, "name");
        if (name) {
            const trimName = name.trim();
            if (trimName && !Utils_Array.contains(this._tags, trimName, Utils_String.localeIgnoreCaseComparer)) {
                // Update our index if we are on the add button
                if (this._selectedIndex === this._tags.length) {
                    this._selectedIndex++;
                }
                this._tags.push(trimName);
                this._sortTags();
                this._renderItems();
                this._fireChange({
                    type: TagChangeType.Add,
                    name: trimName
                });
            }
        }
    }

    /**
     * Removes a tag entry from the list.
     * @param name The tag to be removed.
     */
    public removeTag(name: string) {
        this._removeTag(name, /* update*/ true, /*setFocus*/ false);
    }

    /**
     * Binds the control to a datasource and update the UI.
     * @param tags The array of tags to render.
     */
    public setItems(tags: string[]) {
        Diag.Debug.assertParamIsArray(tags, "tags");
        const newLength = tags.length + (this._readOnly ? 0 : 1);
        if (this._selectedIndex >= newLength) {
            this._selectedIndex = 0;
        }

        this._tags = tags;
        this._sortTags();
        this._renderItems();
    }

    /**
     * Sets the tag control to be in readonly mode
     * @param isReadOnly Whether or not the control should be set to readonly
     */
    public setReadOnly(isReadOnly: boolean) {
        this._readOnly = isReadOnly;
        if (!isReadOnly) {
            this._initializeInputElements();
        }
        else {
            this._disposeInputElements();
        }
    }

    /**
     * Unbinds the control, clears the tags and updates the UI.
     */
    public clearItems() {
        this.flush();
        this._tags = [];
        this._renderItems();
    }

    /**
     * Sets the TagsControl's getTagCount function.
     * @param getTagCount The function to set as getTagCount.
     */
    public setTagCount(getTagCount: (...args: any[]) => any) {
        Diag.Debug.assertParamIsFunction(getTagCount, "getTagCount");
        this._options.getTagCount = getTagCount;
    }

    /**
     * Sets the TagsControl's maxWidth.
     * @param maxWidth The TagsControl's new maxWidth.
     */
    public setMaxWidth(maxWidth: number) {
        Diag.Debug.assertParamIsInteger(maxWidth, "maxWidth");
        this._options.maxWidth = maxWidth;
    }

    /**
     * Returns the width of the rendered tags in this control.
     * @returns The width of the rendered tags in this control.
     */
    public getWidth(): number {
        return this._width;
    }

    /**
     * Set focus to the add button
     */
    public focusAddButton(): void {
        this._selectedIndex = this._getLastIndex();
        this._renderItems(true);
    }

    private _sortTags() {
        if (!this._options.unsorted) {
            this._tags.sort(this._options.tagSort || Utils_String.localeIgnoreCaseComparer);
        }
    }

    private _setupOverflowEvents($overflow: JQuery) {
        $overflow.click(() => {
            this._selectedIndex = this._visibleTagsCount;
            this._overflowClick($overflow);
        });
        $overflow.keydown((event: JQueryKeyEventObject) => {
            this._updateSelectedIndex(event);
            if (TagControl.shouldKeydownTriggerClick(event)) {
                $overflow.click();
            }
        });
    }

    /**
     * Default keydown handler.  Deletes the focused tag.
     * @param event
     */
    private _tagKeyDown(event: JQueryKeyEventObject) {
        this._updateSelectedIndex(event);
        if ($.isFunction(this._options.tagKeyDown)) {
            // Use option for key down behavior
            this._options.tagKeyDown(event);
        }
        else {
            // Default behavior for tag key down
            if (TagControl.shouldKeydownTriggerClick(event)) {
                $(event.target).click();
            }
            this._removeTagAndSetFocus(event);
        }
    }

    private _updateSelectedIndex(event: JQueryKeyEventObject) {
        let indexChange = 0;
        if (event.keyCode === Utils_UI.KeyCode.RIGHT) {
            indexChange = 1;
        }
        else if (event.keyCode === Utils_UI.KeyCode.LEFT) {
            indexChange = -1;
        }
        else {
            // not an index change, return
            return;
        }

        // Find the total length of indexes
        const lastIndex = this._getLastIndex();

        // Change the index
        const originalIndex = this._selectedIndex;
        this._selectedIndex += indexChange;
        // Handle left or right over step
        if (this._selectedIndex < 0) {
            // set to add button index
            this._selectedIndex = lastIndex;
        }
        else if (this._selectedIndex > lastIndex) {
            // Set to first element
            this._selectedIndex = 0;
        }

        // Update tabindex

        // Remove tab stop from original tab
        const $originalTag = this.getElement().find(".tag-item[index=\'" + originalIndex + "']");
        $originalTag.attr("tabindex", -1);

        // Move focus to the new tag
        const $selectedTag = this.getElement().find(".tag-item[index=\'" + this._selectedIndex + "']");
        $selectedTag.attr("tabindex", 0).focus();
    }

    private _getLastIndex(): number {
        let lastIndex = this._visibleTagsCount >= 0 ? this._visibleTagsCount : this._tags.length - 1;
        // Add index at end for add element
        if (!this._readOnly) { lastIndex++; }
        return lastIndex;
    }

    /**
     * Click handler to stop the propagation and focus on the current element
     * @param event
     */
    private _tagClick(event: JQueryEventObject, tagName: string) {
        event.preventDefault();
        event.stopPropagation();
        // Set tabIndex
        const index = Number($(event.target).closest(".tag-item").attr("index"));
        if (!isNaN(index)) {
            this._selectedIndex = index;
            this._renderItems(true);
        }

        if ($.isFunction(this._options.tagClick)) {
            event.data = { tagName: tagName };
            this._options.tagClick(event);
        }
    }

    /**
     * Returns a new string that is truncated to fit within a reasonable limit for presenting the tag name in the UI.
     * @param name The tag name that is to be presented in the UI.
     * @param limit The character limit to use for normalization.
     */
    private _normalizeName(name: string, limit: number): string {
        Diag.Debug.assertParamIsString(name, "name");
        Diag.Debug.assertParamIsInteger(limit, "limit");
        let normalized = name;
        if (name.length > limit) {
            normalized = name.substring(0, limit - 4) + TagConstants.TAG_ELLIPSIS;
        }
        return normalized;
    }

    /**
     * Renders an overflow element in the given container (allowing us to see the elements width, etc) before detaching it and returning it.
     * @param $offScreenTagsContainer The container in which to render the overflow element.
     * @param selectable boolean to indicate if the overflow element is selectable
     */
    private _renderOverflowElement($offScreenTagsContainer: JQuery, selectable: boolean): JQuery {
        Diag.Debug.assertParamIsJQueryObject($offScreenTagsContainer, "$offScreenTagsContainer");
        const $overflow = TagUtilities.generateTagContainer(selectable, false, this._visibleTagsCount, this._visibleTagsCount === this._selectedIndex);
        $overflow.find(".tag-box").text(TagConstants.TAG_ELLIPSIS);
        $overflow.addClass("tags-overflow");
        $overflow.appendTo($offScreenTagsContainer); // attach to offscreen container to force rendering
        return $overflow; // needs to stay attached otherwise the width will go down to 0.
    }

    /**
     * Attempt to split on comma or semi-colon add tags to the control.
     * @param text
     */
    private _splitAndAddTags(text: string) {
        const split = TagUtils.splitAndTrimTags(text);
        for (let i = 0, l = split.length; i < l; i++) {
            this.addTag(split[i]);
        }
    }

    /**
     * Show the input control, and hides the Add... button
     */
    private _showInputControl() {
        this._$addButtonContainer.hide();
        this._$tagInput.val("");
        if (!this._$tagInput.data("ui-autocomplete")) {
            this._$tagInput.autocomplete();
        }
        this._$tagInput.autocomplete("enable");
        this._$tagInput.css("display", "inline-block");
        this._$tagInput.focus();
        this._$tagInput.closest("li.tag-item-delete-experience").attr("aria-hidden", "false"); // Accessibility 
    }

    /**
     * Hides and clears the input control, and shows the Add... button
     * @param focusAddButton Indicates if the add button should be focused, once the input control is hidden
     */
    private _hideInputControl(focusAddButton?: boolean) {
        this._$tagInput.val("");

        if (this._$tagInput.is(":visible")) {
            this._$tagInput.css("display", "none");
            this._$tagInput.autocomplete("close");
            this._$tagInput.autocomplete("disable");
            this._$addButtonContainer.show();
        }
        if (focusAddButton) {
            this.focusAddButton();
        }

        this._$tagInput.closest("li.tag-item-delete-experience").attr("aria-hidden", "true"); // Accessibility 
    }

    /**
     * Removes all tag elements. Does not remove input elements.
     */
    private _resetListBeforeRender() {
        // Remove all <li class="tag-item" /> elements
        $("li.tag-item", this._$tagsList).not(".tags-add-button").remove();
    }

    /**
     * Renders all the tags stored in the control within the container as a list.
     * @param $container The container within which we want to render the tags.
     * @param setFocus Array of jquery objects representing the tag elements rendered within the container.
     */
    private _renderTagsInContainer($container: JQuery, setFocus?: boolean): JQuery {
        Diag.Debug.assertParamIsJQueryObject($container, "$container");

        for (let i = this._tags.length - 1; i >= 0; i--) {
            const $tag = this._renderTag(this._tags[i], this._normalizeName(this._tags[i], TagConstants.TAG_CHARACTER_LIMIT), i);
            $tag.prependTo($container);
            if (setFocus && i === this._selectedIndex) {
                $tag.focus();
            }
        }

        const elements = $container.find('.tag-item').not('.tags-overflow');
        return elements;
    }

    /**
     * Renders as many of the input tag elements (pre-rendered offscreen) within the TagsControl, bounded by maxWidth using the input overflow element.
     * @param elements The array of pre-rendered tag elements to render.
     * @param maxWidth The maximum width of the TagsControl.
     * @param $overflow The overflow element to use when maxWidth is reached.
     * @param setFocus Set focus to the active element
     */
    private _renderTagsWithMaxWidth(elements: JQuery, maxWidth: number, $overflow: JQuery, setFocus?: boolean) {
        Diag.Debug.assertParamIsObject(elements, "elements");
        Diag.Debug.assertParamIsJQueryObject($overflow, "$overflow");
        // note: maxWidth may not be defined, and control flow handles that, so no assertion

        const overflowTags = [];

        // if needed, figure out how many tags will fit
        if (maxWidth) {
            let visibleTagsCount = 0;
            let currentWidth = 0;
            const overflowWidth = $overflow.width(); //it's okay to crop the margin just no the overflow.
            while (elements[visibleTagsCount] && maxWidth - currentWidth > $(elements[visibleTagsCount]).outerWidth(true)) {
                currentWidth = currentWidth + $(elements[visibleTagsCount]).outerWidth(true);
                visibleTagsCount++;
            }

            if (visibleTagsCount !== elements.length) {
                // we can't display all tags, let reverse and make sure we have enough room to display the overflow
                while (elements[visibleTagsCount - 1] && maxWidth - currentWidth < overflowWidth) {
                    currentWidth = currentWidth - $(elements[visibleTagsCount - 1]).outerWidth(true);
                    visibleTagsCount--;
                }
            }
            this._visibleTagsCount = visibleTagsCount;
        }

        // add tags to on-screen grid cell
        for (let i = 0; i < this._visibleTagsCount; i++) {
            $(elements[i]).appendTo(this._$tagsList);
            if (setFocus && i === this._selectedIndex) {
                $(elements[i])[0].focus();
            }
        }

        // create list of tags to include in overflow tooltip
        for (let i = this._visibleTagsCount, len = elements.length; i < len; i++) {
            overflowTags.push(this._tags[i]);
        }

        // if we have overflow, display it with tooltip; otherwise dispose of overflow element
        if (overflowTags.length > 0) {
            // update overflow index
            $overflow.attr("index", this._visibleTagsCount);

            if (this._options.type === "grid" || this._options.type === "single.line") {
                const overflowTooltip = overflowTags.join(TagConstants.TAG_FORMATTING_SEPARATOR);
                RichContentTooltip.add(overflowTooltip, $overflow);
            } else {
                this._setupOverflowEvents($overflow);
            }
            $overflow.appendTo(this._$tagsList);
            if (this._selectedIndex == this._visibleTagsCount) {
                // Tab index is on overflow
                $overflow.focus();
            }
        } else {
            $overflow.remove();
            this._visibleTagsCount = -1;
        }
    }

    /**
     * Renders the list of tag items.
     * @param setFocus
     */
    private _render(setFocus?: boolean) {
        this._resetListBeforeRender();
        // Render in base tagsList
        this._renderTagsInContainer(this._$tagsList, setFocus);
    }

    /**
     * Renders all the tags stored in the control within the container as a list with a limit on max number of tags to be rendered.
     * Ellipsis are shown for the tags which overflow with a tooltip showing the list of overflowing tags
     * @param $container The container within which we want to render the tags.
     */
    private _renderTagsInContainerWithMaxTags($container: JQuery) {
        const maxTags = this._options.maxTags;
        const limit = (this._tags.length > maxTags) ? maxTags - 1 : this._tags.length - 1;

        const tagCharacterLimit: number = this._options.tagCharacterLimit || TagConstants.TAG_CHARACTER_LIMIT;

        for (let i = limit; i >= 0; i--) {
            const $tag = this._renderTag(this._tags[i], this._normalizeName(this._tags[i], tagCharacterLimit), i);
            $tag.prependTo($container);
        }

        // if we have more tags than maxTags, then we need to use overflow.
        if (this._tags.length > this._options.maxTags) {
            this._renderOverflowInContainer($container);
        }
    }

    /**
     * Renders the list of tag items on the agile board's cards
     */
    private _renderForCard() {
        this._resetListBeforeRender();
        this._renderTagsInContainerWithMaxTags(this._$tagsList);
    }

    private _renderOverflowInContainer($container) {
        const $overflow = this._getOverFlowElement();
        const tooltip = this._getOverflowTooltipContent();
        RichContentTooltip.add(tooltip, $overflow);
        $overflow.appendTo($container);
    }

    private _getOverflowTooltipContent(): string {
        const overflowTags = [];
        for (let i = this._options.maxTags, len = this._tags.length; i < len; i++) {
            overflowTags.push(this._tags[i]);
        }
        return overflowTags.join(TagConstants.TAG_FORMATTING_SEPARATOR);
    }

    private _getOverFlowElement(): JQuery {
        const $overflowTag = TagUtilities.generateTagContainer();
        $overflowTag.find(".tag-box").text(TagConstants.TAG_ELLIPSIS);
        $overflowTag.addClass("tags-overflow");
        return $overflowTag;
    }

    private _renderForSingleLine() {
        this._resetListBeforeRender();
        const $offScreenGridCell = $(this.getElement().parent()).clone();
        const $offScreenTagsList = $(domElem("div", "tags-items-container off-screen"));
        const $offScreenTagsContainer = $(domElem("ul", "tags-unused-host"));
        $offScreenTagsContainer.appendTo($offScreenTagsList);
        $offScreenTagsList.appendTo($offScreenGridCell);
        $offScreenGridCell.appendTo(document.body);
        const $overflow = this._renderOverflowElement($offScreenTagsContainer, false);
        const elements = this._renderTagsInContainer($offScreenTagsContainer);

        this._renderTagsWithMaxWidth(elements, this._options.maxWidth, $overflow);
        // remove off-screen elements
        $offScreenGridCell.remove();
    }

    /**
     * Renders a read-only list of tag items, with an overflow element as needed.
     */
    private _renderForGrid() {
        // create offscreen elements
        const $offScreenGridCell = $(this.getElement().parent('.grid-cell')).clone();
        const $offScreenTagsList = $(domElem("div", "tags-items-container off-screen"));
        const $offScreenTagsContainer = $(domElem("ul", "tags-unused-host"));
        $offScreenTagsContainer.appendTo($offScreenTagsList);
        $offScreenTagsList.appendTo($offScreenGridCell);
        $offScreenGridCell.appendTo(document.body);

        const $overflow = this._renderOverflowElement($offScreenTagsContainer, false);
        const elements = this._renderTagsInContainer($offScreenTagsContainer);
        const maxWidth = $offScreenGridCell.width();
        this._renderTagsWithMaxWidth(elements, maxWidth, $overflow);

        // remove off-screen elements
        $offScreenGridCell.remove();
    }

    /**
     * Renders the tags for the available bar in the tags filter, with an overflow element as needed.
     * @param setFocus
     */
    private _renderFilterAvailable(setFocus?: boolean) {
        this._resetListBeforeRender();

        // create offscreen elements
        const $offScreenGridCell = $(this.getElement().parent('.tfs-tags-filter')).clone();
        const $offScreenTagsList = $(domElem("div", "tags-items-container off-screen"));
        const $offScreenTagsContainer = $(domElem("ul", "tags-unused-host"));
        $offScreenTagsContainer.appendTo($offScreenTagsList);
        $offScreenTagsList.appendTo($offScreenGridCell);
        $offScreenGridCell.appendTo(document.body);

        const $overflow = this._renderOverflowElement($offScreenTagsContainer, this._options.selectable);
        RichContentTooltip.add(PresentationResources.TagFilterDropdownTooltip, $overflow);
        const elements = this._renderTagsInContainer($offScreenTagsContainer);
        this._renderTagsWithMaxWidth(elements, this._options.maxWidth, $overflow, setFocus);

        // remove off-screen elements
        $offScreenGridCell.remove();
    }

    /**
     * Renders the tags for the applied bar in the tags filter, with an overflow element as needed.
     * @param setFocus
     */
    private _renderFilterApplied(setFocus?: boolean) {
        const maxTags = this._options.maxTags
        const overflowTags = [];

        this._resetListBeforeRender();

        // create offscreen elements
        const $offScreenFilterBar = $(this.getElement().parent('.tfs-tags-filter')).clone();
        const $offScreenTagsList = $(domElem("div", "tags-items-container off-screen"));
        const $offScreenTagsContainer = $(domElem("ul", "tags-unused-host"));
        $offScreenTagsContainer.appendTo($offScreenTagsList);
        $offScreenTagsList.appendTo($offScreenFilterBar);
        $offScreenFilterBar.appendTo(document.body);

        // render as many tags as we need to off-screen
        if (!this._tags) {
            this._width = 0;
            return;
        }

        const limit = (this._tags.length > maxTags) ? maxTags - 1 : this._tags.length - 1;
        for (let i = limit; i >= 0; i--) {
            const $tag = this._renderTag(this._tags[i], this._normalizeName(this._tags[i], TagConstants.TAG_CHARACTER_LIMIT), i);
            $tag.prependTo($offScreenTagsContainer);
        }

        // if we have more tags than maxTags, then we need to use overflow.
        if (this._tags.length > maxTags) {
            this._visibleTagsCount = maxTags;
            const $overflow = TagUtilities.generateTagContainer(true, false, this._visibleTagsCount, this._visibleTagsCount === this._selectedIndex);
            $overflow.find(".tag-box").text(TagConstants.TAG_ELLIPSIS);
            $overflow.addClass("tags-overflow");

            for (let i = maxTags, len = this._tags.length; i < len; i++) {
                overflowTags.push(this._tags[i]);
            }
            const overflowTooltip = overflowTags.join(TagConstants.TAG_FORMATTING_SEPARATOR);
            RichContentTooltip.add(overflowTooltip, $overflow);
            $overflow.appendTo($offScreenTagsContainer);
            this._setupOverflowEvents($overflow);
        }
        else {
            this._visibleTagsCount = -1;
        }

        // by this point, everything required should be rendered off-screen, and we should be able to set the width of this control.
        // and now, we move everything on-screen.
        let width = 0;
        $.map($offScreenTagsContainer.children(), (child) => {
            width = width + $(child).outerWidth(true);
            this._$tagsList.append(child);
            const tag = $(child);
            const childIndex = Number(tag.attr("index"));
            if (setFocus && childIndex === this._selectedIndex) {
                tag.focus();
            }
        });
        this._width = width;

        // remove off-screen elements
        $offScreenFilterBar.remove();
    }

    /**
     * Creates the autocomplete functionality for the tagControl's _$tagInput.
     */
    private _initializeFilterDropdown() {
        this._isAutoCompleteVisible = false;

        const hideAndClearDropdown = () => {
            this._$tagInput.hide();
            this._$tagInput.val("");
            this._$tagInput.autocomplete("disable");
            $('.tags-filter-overflow-text').toggleClass("pressed", false);
        }

        const validateAndApplyTagFilter = (value: string) => {
            if ($.inArray(value, this._tags) >= 0 && $.isFunction(this._options.availableDropdownSelect)) {
                this._options.availableDropdownSelect(value);
            }
        }

        // initialize the input field
        this._$tagInput = $(domElem("input", "tags-input tags-filter-dropdown-input tag-box")).attr("type", "text").attr("placeholder", "").hide();
        this._$tagInput.closest("li.tag-item-delete-experience").attr("aria-hidden", "true"); // Accessibility 

        this._$tagInput.autocomplete({
            delay: 0,
            minLength: 0,
            position: { my: "left top", at: "left bottom", offset: "0 -1" },
            source: (req, responseFn) => {
                const suggestions = this._getMatchesForPrefix(req.term, this._tags.sort(Utils_String.localeIgnoreCaseComparer), true);
                responseFn(suggestions);
            },
            open: (event, ui) => {
                this._isAutoCompleteVisible = true;
            },
            select: (event, ui) => {
                validateAndApplyTagFilter(ui.item.value);
                hideAndClearDropdown();
            },
            change: (event, ui) => {
                validateAndApplyTagFilter(this._$tagInput.val());
                hideAndClearDropdown();
            },
            close: (event, ui) => {
                this._isAutoCompleteVisible = false;
                if (!this._$tagInput.is(":focus")) {
                    if (this._$tagInput.val()) {
                        validateAndApplyTagFilter(this._$tagInput.val());
                    }
                    hideAndClearDropdown();
                }
            }
        });

        this._$tagInput.blur(function (event) {
            if (!this._isAutoCompleteVisible) {
                hideAndClearDropdown();
            }
        });

        // when we focus the input, kick off a search to show autocomplete immediately
        this._$tagInput.focus(() => {
            if (this._$tagInput.is(":visible")) {
                this._$tagInput.autocomplete("search");
            }
        });

        // add escape and enter key behavior to the filter dropdown input
        this._$tagInput.keydown((event) => {
            if (event.keyCode === Utils_UI.KeyCode.ESCAPE) {
                this._$tagInput.autocomplete("close");
                hideAndClearDropdown();
            } else if (event.keyCode === Utils_UI.KeyCode.ENTER) {
                if ($.inArray(this._$tagInput.val(), this._tags) >= 0) {
                    if ($.isFunction(this._options.availableDropdownSelect)) {
                        this._options.availableDropdownSelect(this._$tagInput.val());
                    }
                    this._$tagInput.autocomplete("close");
                    hideAndClearDropdown();
                }
            }
        });

        // qualify the autocomplete menu with our own class so that we can apply styles
        // to this specific instance of the jQuery autocomplete menu
        this._$tagInput.data("ui-autocomplete").menu.element.addClass('tags-autocomplete-menu');
        // Calculating the z-index so that the autocomplete menu will be on top of other dialogs
        // the calculation logic is same as the one used in dialog
        const zIndex = this._getNextZIndex();
        this._$tagInput.data("ui-autocomplete").menu.element.css("cssText", "z-index: " + zIndex + "! important;");

        // override the rendering of individual items to add a tooltip
        this._$tagInput.data("ui-autocomplete")._renderItem = function (ul, item) {
            const label = item.label;
            const anchor = $(domElem("a")).text(label);

            RichContentTooltip.addIfOverflow(item.value, anchor);

            return $(domElem("li"))
                .data("ui-autocomplete-item", item)
                .append(anchor)
                .appendTo(ul);
        };

        $(window).resize(() => {
            this._$tagInput.autocomplete("close");
        });

        $(document.body).append(this._$tagInput);
    }

    // Gets the next even z-index value to stack above other dialogs, at least 1002 as used before.
    private _getNextZIndex(): number {
        let thisZ, nextZ, maxZ = 0;
        $('div.ui-dialog').each(function () {
            thisZ = $(this).css("z-index");
            if (!isNaN(thisZ) && (thisZ > maxZ)) {
                maxZ = thisZ;
            }
        });

        if (maxZ < 1001) {
            nextZ = 1002;
        }
        else {
            nextZ = maxZ + 2;
            if (nextZ % 2 !== 0) {
                nextZ++;
            }
        }
        return nextZ;
    }

    /**
     * Click function for the overflow element in the filter bar's available tags control.
     * @param $overflow The overflow element for which this click function is defined.
     */
    private _overflowClick($overflow: JQuery) {
        Diag.Debug.assertParamIsJQueryObject($overflow, "$overflow");

        // qualify the element that we'll be using for positioning of the dropdown
        $overflow.children().first().addClass('tags-filter-overflow-text');

        // if the dropdown hasn't been initialized, do the initialization work
        if (!this._$tagInput) {
            this._initializeFilterDropdown();
        }

        // show and position the dropdown, then trigger a search and focus the input
        this._$tagInput.show();
        this._$tagInput.autocomplete("enable");
        $('.tags-filter-overflow-text').toggleClass("pressed", true);
        this._$tagInput.position({ my: "right top", at: "right bottom", of: $overflow.children().first() });
        this._$tagInput.autocomplete("search");
        this._$tagInput.focus();
    }

    /**
     * Wrapper function calling normal or overflow rendering as needed.
     * @param setFocus
     */
    private _renderItems(setFocus?: boolean) {
        if (this._$tagInput && this._$tagInput.data("ui-autocomplete")) {
            this._$tagInput.autocomplete("close");
        }

        if (!this._options.type) {
            this._render(setFocus);
        } else if (this._options.type === "grid") {
            this._renderForGrid();
        } else if (this._options.type === "filter.available") {
            this._renderFilterAvailable(setFocus);
        } else if (this._options.type === "filter.applied") {
            this._renderFilterApplied(setFocus);
        } else if (this._options.type === "card") {
            this._renderForCard();
        } else if (this._options.type === "single.line") {
            this._renderForSingleLine();
        }

        this._renderAddButton(setFocus);
    }

    /**
     * Returns a jQuery object for a single tag.
     * @param fullTagName The full name of the tag.
     * @param displayTagName The tag name that is to be presented in the UI.
     * @param isCurrentIndex Use with the roving tabIndex
     */
    private _renderTag(fullTagName: string, displayTagName: string, index: number): JQuery {
        Diag.Debug.assertParamIsStringNotEmpty(fullTagName, "fullTagName");

        // use the full tag name as the display name if display name is not specified.
        if (!displayTagName) {
            displayTagName = fullTagName;
        }

        const isSelected = index === this._selectedIndex;
        const $tagItem = TagUtilities.generateTagContainer(this._options.selectable, this._useDeleteExperience(), index, isSelected);

        if (this._useDeleteExperience()) {
            $tagItem.addClass("tag-item-delete-experience");
        }

        if (fullTagName !== displayTagName) {
            //The tag controls does not use browser truncation, so always add tooltip when it truncates the tag itself.
            RichContentTooltip.add(fullTagName, $tagItem);
            $tagItem.data(TagControl.FullTagNameKey, fullTagName);
        }

        if (this._options.selectable) {
            // Add click behavior
            $tagItem.click((event: JQueryEventObject) => this._tagClick(event, fullTagName));
            // Add keydown
            $tagItem.keydown({ tagName: fullTagName }, (event) => this._tagKeyDown(event));
        }

        // Render tag contents using custom render if available
        if ($.isFunction(this._options.tagRenderer)) {
            this._options.tagRenderer($tagItem.find(".tag-container"), fullTagName, displayTagName);
        } else {
            $tagItem.find(".tag-box").text(displayTagName);
        }

        if (this._useDeleteExperience()) {
            // add delete experience for tags
            const $deleteButton = $("<span>")
                .addClass("tag-delete tag-box-delete-experience")
                .attr("role", "button")
                .attr("aria-label", Utils_String.format(WITResources.TagsDeleteButton_AriaLabel, fullTagName))
                .attr("dir", "ltr")
                .appendTo($tagItem.find(".tag-container"));
            $("<span>").addClass("bowtie-icon bowtie-math-multiply-light").appendTo($deleteButton);
            $deleteButton.click((event) => {
                // true = isClick
                this._removeTagAndSetFocus(event, true);
            });
        }

        return $tagItem;
    }

    /**
     * Tag delete helper.  Deletes the focused tag.
     * @param event
     */
    private _removeTagAndSetFocus(event: JQueryEventObject | JQueryKeyEventObject, isClick?: boolean) {
        const isDelete = event.keyCode === Utils_UI.KeyCode.DELETE;
        const isBackspace = event.keyCode === Utils_UI.KeyCode.BACKSPACE;

        const afterFade = ($parent) => {
            if ($parent[0]) {
                this._selectedIndex = Number($parent.attr("index"));
                const lastIndex = this._getLastIndex();
                if (this._selectedIndex > lastIndex) {
                    this._selectedIndex = lastIndex;
                }
            }
            const text = $parent.data(TagControl.FullTagNameKey) || $parent.text();
            this._removeTag(text, true, true);
        }

        if ((isClick || isDelete || isBackspace || TagControl.shouldKeydownTriggerClick(event)) && !this._readOnly) {
            event.preventDefault();
            event.stopPropagation();
            const $toDelete = $(event.target).closest(".tag-item");

            afterFade($toDelete);
            $toDelete.remove();
        }
    }

    /**
     * Removes a tag entry from the list.
     * @param name The tag to be removed.
     * @param update Bool to indicate if the UI should be updated.
     */
    private _removeTag(name: string, update: boolean, setFocus: boolean) {
        Diag.Debug.assertParamIsString(name, "name");
        if (name && Utils_Array.contains(this._tags, name, Utils_String.localeIgnoreCaseComparer)) {
            this._tags.splice($.inArray(name, this._tags), 1);
            const lastIndex = this._getLastIndex()
            if (this._selectedIndex > lastIndex) {
                this._selectedIndex == lastIndex;
            }
            if (update) {
                this._renderItems(setFocus);
            }
            else {
                //we still need to render add button
                this._renderAddButton(setFocus);
            }
            this._fireChange({
                type: TagChangeType.Delete,
                name: name
            });
        }
    }

    /**
     * Returns the list of items matching the prefix term, selected from the input list of items.
     * @param prefix The prefix to match against.
     * @param items The list of items to match the prefix against.
     * @param includeAppliedTags Determines whether to include tags already applied to this control's work item in the matches.
     * @returns An array of strings containing the matches for the prefix in the input list of items.
     *          If the number of results will be over TagControl.AUTOCOMPLETE_MATCHES_LIMIT an empty list is returned.
     */
    private _getMatchesForPrefix(prefix: string, items: string[], includeAppliedTags: boolean): string[] {
        Diag.Debug.assertParamIsString(prefix, "prefix");
        Diag.Debug.assertParamIsArray(items, "items");

        let matches: string[];
        let max = TagControl.AUTOCOMPLETE_MATCHES_LIMIT + 1;

        // handle early termination if there's no prefix
        if (!prefix) {
            if (items.length < max) {
                matches = items;
            }
            else {
                return [];
            }
        }
        else {
            const regexp = $.ui.autocomplete.escapeRegex(prefix);
            const matcher = new RegExp("^" + regexp, "i");

            matches = $.grep(items || [], (item: string, index) => {
                // We want to bail out as early as possible to avoid the cost of regexp.test.
                // First check that we haven't reached our max number of results yet. Only decrement max if we have a match.
                return (max > 0) && (matcher.test(item) ? (max-- > 0) : false);
            });

            if (max <= 0) {
                return [];
            }
        }

        if (!Boolean(includeAppliedTags)) {
            matches = Utils_Array.subtract(matches, this._tags, Utils_String.localeIgnoreCaseComparer);
        }
        return matches;
    }

    public gettingSuggestedTagNamesForPrefix(prefix: string): JQueryPromise<string[]> {
        const filteringSuggestedValuesByPrefix = this._getSuggestedValues().then(allTagNames => {
            Diag.logTracePoint('TagControl.getAutoCompleteMatches.start');
            const suggestions = this._getMatchesForPrefix(prefix, allTagNames, false);
            Diag.logTracePoint('TagControl.getAutoCompleteMatches.completed');

            return suggestions;
        });

        return filteringSuggestedValuesByPrefix;
    }

    /**
     * Initializes autocomplete functionality for an input element using the input list of tag definitions
     */
    private _initializeSuggestedValues() {
        this._$tagInput.autocomplete({
            delay: 0,
            minLength: 0,
            position: { my: "left top", at: "left bottom", collision: "flip", offset: "0 -1" },
            source: (req, responseFn) => {
                this.gettingSuggestedTagNamesForPrefix(req.term)
                    .done(names => { responseFn(names); })
                    .fail(() => { responseFn([]); });
            },
            select: (event, ui) => {
                this.addTag(ui.item.value);
                this._hideInputControl(true);
            },
            // autocomplete change occurs on autocomplete blur, except when selecting an autocomplete element
            change: (event, ui) => {
                this.flush();
            },
            close: (event, ui) => {
                if (!this._$tagInput.is(":focus")) {
                    if (this._$tagInput.val()) {
                        this.flush();
                    }
                    this._hideInputControl();
                }
            }
        });

        // qualify the autocomplete menu with our own class so that we can apply styles
        // to this specific instance of the jQuery autocomplete menu
        this._$tagInput.data("ui-autocomplete").menu.element.addClass('tags-autocomplete-menu');
        // Calculating the z-index so that the autocomplete menu will be on top of other dialogs
        // the calculation logic is same as the one used in dialog
        const zIndex = this._getNextZIndex();
        this._$tagInput.data("ui-autocomplete").menu.element.css("cssText", "z-index: " + zIndex + "! important;");

        // override the rendering of individual items to add a tooltip
        this._$tagInput.data("ui-autocomplete")._renderItem = function (ul, item) {
            const label = item.label;
            const anchor = $(domElem("a")).text(label);

            RichContentTooltip.addIfOverflow(item.value, anchor);

            return $(domElem("li"))
                .data("ui-autocomplete-item", item)
                .append(anchor)
                .appendTo(ul);
        };
    }

    private _getSuggestedValues(): JQueryPromise<string[]> {
        if (!this._gettingSuggestedValues) {
            const deferredSuggestedValues: JQueryDeferred<string[]> = jQuery.Deferred();

            if ($.isFunction(this._options.beginGetSuggestedValues)) {
                this._options.beginGetSuggestedValues((tagNames: string[]) => {
                    deferredSuggestedValues.resolve(tagNames);
                });
            }
            else {
                deferredSuggestedValues.resolve([]);
            }

            this._gettingSuggestedValues = deferredSuggestedValues.promise();
        }
        return this._gettingSuggestedValues;
    }

    /**
     * Force the control to update the suggested values
     */
    public resetSuggestedValues() {
        this._gettingSuggestedValues = null;
    }

    private _renderAddButton(setFocus: boolean) {
        if (!this._$addButtonContainer) {
            // No add button, return
            return;
        }

        if (this._options.addTagTextOnChange) {
            const $addButton: JQuery = this._$addButtonContainer.find(".tag-box");

            //  Remove tooltip at this point to avoid creating multiple tooltips every time the user
            //  adds a new tag.
            if (this._addTagTooltip) {
                this._addTagTooltip.dispose();
                this._addTagTooltip = null;
            }

            if (this._tags.length === 0) {
                $addButton.removeClass("bowtie-icon bowtie-math-plus-light");
                $addButton.text(this._options.addButtonText || PresentationResources.AddButtonText);
            }
            else {
                $addButton.text(""); // only need plus symbol for this button.
                $addButton.append($(domElem("span", "bowtie-icon bowtie-math-plus-light")));
                this._addTagTooltip = RichContentTooltip.add(this._options.addButtonText || PresentationResources.AddButtonText, this._$addButtonContainer);
            }

            // Accessibility - aria-label on tabIndex element
            const $tagContainer = this._$addButtonContainer.find(".tag-container");
            $tagContainer.attr("aria-label", this._options.addButtonText || PresentationResources.AddButtonText);
        }

        // Make sure tabIndex is up to date
        this._$addButtonContainer.attr("index", this._getLastIndex());
        if (this._selectedIndex === this._getLastIndex()) {
            this._$addButtonContainer.attr("tabIndex", 0);
            if (setFocus) {
                this._$addButtonContainer.focus();
            }
        }
        else {
            this._$addButtonContainer.attr("tabIndex", -1);
        }
    };

    /**
     * Add the input and "Add..." buttons to the control.
     */
    private _initializeInputElements() {
        // Create the Add... button
        if (this._$addButtonContainer) {
            return;
        }

        this._$addButtonContainer = TagUtilities.generateTagContainer(true, false, 0, true);
        this._$addButtonContainer.addClass("tags-add-button");
        if (this._useDeleteExperience()) {
            this._$addButtonContainer.addClass("tag-item-delete-experience");
        }
        // Initialize add button and make sure it has a tab index
        this._$addButtonContainer.find(".tag-box").text(this._options.addButtonText || PresentationResources.AddButtonText);
        this._$addButtonContainer.click((event: JQueryEventObject) => {
            this._showInputControl();
        });

        this._$addButtonContainer.keydown((event: JQueryKeyEventObject) => {
            this._updateSelectedIndex(event);
            if (TagControl.shouldKeydownTriggerClick(event)) {
                event.preventDefault();
                event.stopPropagation();
                this._$addButtonContainer.click();
            }
            else if (event.keyCode === Utils_UI.KeyCode.BACKSPACE) {
                // Prevent backspace from navigating Back in the browser when Add... is focused.
                event.preventDefault();
                event.stopPropagation();
            }
        });

        // Create the input text box
        const $inputContainer = $(domElem("li"));

        if (this._useDeleteExperience()) {
            $inputContainer.addClass("tag-item-delete-experience");
        }

        this._$tagInput = $(domElem("input", "tags-input tag-box")).attr({
            type: "text",
            placeholder: ""
        }).hide();

        // Stop the 'change' event from re-populating the control
        this._$tagInput.change(function (event) {
            event.stopPropagation();
            event.preventDefault();
        });


        if ($.isFunction(this._options.beginGetSuggestedValues)) {
            this._initializeSuggestedValues();
        }

        this._$tagInput.focus(() => {
            this._$tagInput.autocomplete("search");
        });

        this._$tagInput.blur(() => {
            // HACK: This is to allow the input control to be hidden when there are no
            //       suggested values available and focus is lost from the input control.
            if (!this._$tagInput.data("ui-autocomplete").menu.element.is(":visible")) {
                if (!this._$tagInput.val()) {
                    this._hideInputControl();
                }
            }
        });

        this._$tagInput.keydown((event: JQueryEventObject) => {
            if (event.keyCode === Utils_UI.KeyCode.ENTER && !Utils_UI.KeyUtils.isModifierKey(event) || event.keyCode === Utils_UI.KeyCode.TAB) {
                const text = $(event.target).val();
                this._splitAndAddTags(text);

                //Using the below to see if the tag has any actual content
                //(since commas and semicolons are used as tag separators)
                //If it does not, then keyboard tab will move to the next control.
                //Otherwise cursor will move to a new tag.
                const cleanedTagText = text.replace(/,|;/g, '');

                if (event.keyCode === Utils_UI.KeyCode.TAB && cleanedTagText.length === 0) {
                    this._hideInputControl(true);
                    if (event.shiftKey) {
                        event.preventDefault();
                    }
                }
                else { // ENTER was key-downed.
                    $(event.target).val("");

                    event.preventDefault();
                    event.stopPropagation();
                    if ($.isFunction(this._options.beginGetSuggestedValues)) {
                        this._$tagInput.autocomplete('search');
                    }
                }
                this._selectedIndex = this._tags.length
            }
            else if (event.keyCode === Utils_UI.KeyCode.ESCAPE) {
                event.stopPropagation();
                this._hideInputControl(true);
            }
        });

        this._$addButtonContainer.appendTo(this._$tagsList);
        this._$tagInput.appendTo($inputContainer);
        $inputContainer.appendTo(this._$tagsList);
    }

    private _useDeleteExperience(): boolean {
        return this._options.useDeleteExperience && !this._readOnly;
    }

    private _disposeInputElements(): void {
        if (this._$addButtonContainer) {
            this._$addButtonContainer.remove();
        }
        if (this._$tagInput) {
            this._$tagInput.remove();
        }
    }

    /**
     * Applies the input field's contents as a tag, closes the input and adds the Add button.
     */
    public flush() {
        if (this._$tagInput) {
            const text = this._$tagInput.val();
            if (text) {
                this._splitAndAddTags(text);
            }
            this._hideInputControl();
        }
    }
}

VSS.initClassPrototype(TagControl, {
    _tags: null,
    _$tagsList: null,
    _$tagInput: null,
    _$addButtonContainer: null,
    _gettingSuggestedValues: null,
    _width: null
});

export class TagUtilities {

    public static enhancementTypeName: string = "tfs.ui.tagutilities";

    /**
     * Generate the cell contents for a tag column. This will create readonly TagControls with the relevant tags.
     * @param grid The grid we are operating on
     * @param dataIndex The index of the row.
     * @param column Information about the column that is being rendered.
     * @param columnOrder The index of the column in the grid's column array. This is the current visible order of the column
     * @returns Returns jQuery element representing the requested grid cell. The first returned element will be appended
     *          to the row (unless the function returns <c>null</c> or <c>undefined</c>).
     */
    public static renderTagCellContents(grid: any, dataIndex: number, column: any, columnOrder: number): JQuery {
        Diag.Debug.assertParamIsObject(column, "column");

        const tagColValue = column.getColumnValue.call(grid, dataIndex, column.index, columnOrder);
        const tags = tagColValue ? tagColValue.split(TagConstants.TAG_SPLITTING_SEPARATOR) : [];
        $.each(tags, function (i, str) {
            tags[i] = $.trim(str);
        });

        const $cell = $(domElem("div", "grid-cell"));
        $cell.width(column.width || 20);

        // Only draw custom tag cell content if there are tags to display
        if (tags && tags.length > 0) {
            <TagControl>Controls.BaseControl.createIn(TagControl, $cell,
                {
                    tags: tags,
                    readOnly: true,
                    type: "grid"
                });

            // Update the maxLength on the column (this is not a width length, but a character length).
            // This is abit odd, because the grid uses text length and multiples the it by a ratio to calculate
            // a reasonable size.  So if we have tags, we calculate the string literal length, and add some padding
            // for the spaces based.
            const tagText = tags.join("     ");  // these spaces account for the paddings and margins of a tag item.
            column.maxLength = Math.max(column.maxLength || 0, tagText.length);
        }
        else {
            $cell.html("&nbsp;");
        }

        return $cell;
    }

    /**
     * Generates a jQuery object for a tag-box.
     * @param selectable Bool to determine if this tag-box is selectable or not.
     * @param useDeleteExperience Bool to determine if this tag-box uses an enhanced delete experience or not.
     * @param index Value to set index attribute on the tag element
     * @param isCurrentTabIndex Whether or not to be tabble, only the selected index should be tabbable.
     * @returns A jQuery object for the created tag-box element.
     */
    public static generateTagContainer(selectable?: boolean, useDeleteExperience?: boolean, index?: number, isCurrentTabIndex?: boolean): JQuery {
        const $tagItem = $(domElem("li", "tag-item")).attr("index", index);;
        const $tagContainer = $(domElem("span", "tag-container"));
        const $tagBox = $(domElem("span", "tag-box"));

        if (selectable) {
            if (isCurrentTabIndex) {
                $tagItem.attr("tabindex", 0);
            }
            else {
                $tagItem.attr("tabindex", -1);
            }

            if (useDeleteExperience) {
                $tagBox.addClass("tag-box-delete-experience");
                $tagContainer.addClass("tag-container-delete-experience");
            } else {
                // Selectable tag elements are buttons
                $tagContainer.attr("role", "button");
                $tagContainer.addClass("tag-container-selectable");
                $tagBox.addClass("tag-box-selectable");
            }
        }

        // set the layout direction to left-to-right to correctly support right-to-left text
        $tagBox.attr("dir", "ltr");
        $tagContainer.attr("dir", "ltr");

        $tagContainer.append($tagBox);
        $tagItem.append($tagContainer);
        return $tagItem;
    }
}


// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.UI.Tags", exports);
