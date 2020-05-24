import Controls = require("VSS/Controls");
import Models = require("WorkItemTracking/Scripts/Form/Models");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import Utils_String = require("VSS/Utils/String");
import { isNewHtmlEditorEnabled } from "WorkItemTracking/Scripts/Utils/WitControlMode";

export interface FormGridOptions extends Controls.EnhancementOptions {
    /**
    * Gets or sets the layout mode
    * FirstColumnWide - Default system layout mode - First column is wider than other columns
    * EqualColumns - All columns are equal width
    */
    layoutMode: Models.PageLayoutMode;

    useFixedLayout?: boolean;
}

interface SectionData {
    selectionElement: JQuery;
    isEmptySection: boolean
}

export enum GridSizeMode {
    MultipleColumns,
    SingleColumn
}

/**
* Base form grid component, all form grids derive from this class.
*/
export class FormGrid extends Controls.BaseControl {
    public static FormWidthMargin: number = 2;
    public static ExtraLargeFormWidth: number = 1200 + FormGrid.FormWidthMargin * 5;
    public static LargeFormWidth: number = 960 + FormGrid.FormWidthMargin * 4;
    public static MediumFormWidth: number = 720 + FormGrid.FormWidthMargin * 3;
    public static MediumFormWidthEqualColums: number = 500 + FormGrid.FormWidthMargin * 3;
    public static SmallFormWidth: number = 480 + FormGrid.FormWidthMargin * 2;
    public static LargeSectionWidth: number = 480;
    public static SmallSectionWidth: number = 240;
    public static BottomSection: string = "bottom-section";

    protected mode: GridSizeMode;

    protected layoutMode: Models.PageLayoutMode;

    /**
    * A container for all sections.
    */
    private _sectionContainer: JQuery;

    /**
    * Whether or not to use a 'fixed' layout.   If true the form will not react to resize events and wrapping will not occur.
    */
    private _useFixedLayout: boolean;

    /**
    * Property to store sectionId with corresponding sectionElement
    */
    private _sectionsMap: IDictionaryStringTo<JQuery>;

    /**
    * Section elements defined by derived classes except bottom-section
    */
    protected _sectionElements: JQuery[];

    /**
    * Property to store empty/non-empty sections
    */
    private _sectionsData: SectionData[];


    constructor(options: FormGridOptions) {
        super(options);
        this._sectionContainer = $("<div />").addClass("section-container");
        this._useFixedLayout = options && options.useFixedLayout;
        this._sectionsMap = {};
        this.mode = GridSizeMode.MultipleColumns;
        this.layoutMode = options ? options.layoutMode : Models.PageLayoutMode.firstColumnWide;
    }

    public initializeOptions(options: FormGridOptions) {
        super.initializeOptions($.extend({ coreCssClass: "form-grid" }, options));
    }

    public initialize(): void {
        this._prepareSections();
        this.addSections();

        if (this._useFixedLayout) {
            // If we are using a fixed layout set the min-width to the width required to prevent any wrapping.
            let width = this.getMinWidthForFullLayout();
            this._element.css("min-width", width + "px");
        }

        this.setAttribute("tabindex", -1);

        super.initialize();
    }

    public adjustGridSections(): void {
    }

    public handleSectionResize(): void {
    }

    public getSection(sectionId: string): JQuery {
        if (sectionId === FormGrid.BottomSection) {
            return $("." + sectionId.toLowerCase(), this._element);
        }
        else if (this._sectionsMap[sectionId]) {
            return this._sectionsMap[sectionId];
        }
        else {
            return this._getNextSection(sectionId)
        }
    }

    public show(): void {
        this._element.show();
    }

    public hide(): void {
        this._element.hide();
    }

    public addToSection(container: JQuery, sectionId: string): void {
        var section = this.getSection(sectionId);
        section.append(container);
    }

    protected addSections(): void {
        this._element.append(this._sectionContainer);
    }

    protected getSectionContainer(): JQuery {
        return this._sectionContainer;
    }

    protected getSectionContainerWidth(): number {
        var width = this.getPreciseWidth(this._sectionContainer);

        return Math.max(width, FormGrid.SmallFormWidth);
    }

    protected getMinWidthForFullLayout(): number {
        return FormGrid.LargeFormWidth;
    }

    protected getPreciseWidth(element: JQuery) {
        if (element.length >= 1) {
            // we need to get the precise width with decimal points. If we use width() that gives
            // ceiling of width and causes grid sections to not flow correctly since the 1 px difference
            // can make section 3 div go below section 2 div.
            // We also need to round it to the thousands, it seems that Edge has a bug where adding several
            // widths of items contained inside of a container may in some cases exceed the width of the container,
            // this rounding is here to fix that issue.
            return this.roundValue(element[0].getBoundingClientRect().width);
        }
        else {
            return 0;
        }
    }

    protected getPreciseHeight(element: JQuery) {
        if (element.length >= 1) {
            // we need to get the precise width with decimal points. If we use height() that gives
            // ceiling of width and causes grid sections to not flow correctly since the 1 px difference
            // can make the clear div incorrectly positioned
            // We also need to round it to the thousands, it seems that Edge has a bug where adding several
            // widths of items contained inside of a container may in some cases exceed the width of the container,
            // this rounding is here to fix that issue.
            return this.roundValue(element[0].getBoundingClientRect().height);
        }
        else {
            return 0;
        }
    }

    protected createSectionElement(cssClass: string, label: string): JQuery {
        var sectionElement = $("<div />").addClass(cssClass).addClass("section");

        return sectionElement;
    }

    /**
     * Rounds the specified number to the thousands.
     */
    protected roundValue(value: number): number {
        return Math.round(value * 1000) / 1000;
    }

    // returns nextavailable sectionElement
    private _getNextSection(sectionId: string): JQuery {

        for (var i = 0; i < this._sectionsData.length; i++) {
            var sectionData = this._sectionsData[i];
            var $sectionElement = sectionData.selectionElement;
            if (sectionData.isEmptySection) {
                sectionData.isEmptySection = false;
                this._sectionsMap[sectionId] = $sectionElement;
                return $sectionElement;
            }
        }

        return null;
    }

    // Populates section date to store empty/non-empty sections
    private _prepareSections(): void {

        this._sectionsData = [];
        this._sectionElements.forEach((section) => {
            this._sectionsData.push({
                selectionElement: section,
                isEmptySection: true
            });
        });
    }
}

/**
* Base class for the class of layout where there's one section on the left and several smaller sections which collapse/wrap on the right.  Also
* handles the bottom section (section below the left section which is always pushed to the bottom when wrapping other sections).
*/
export class LeftSectionPrimaryFormGrid extends FormGrid {

    /**
    * A container for all sections to the right of the first section (these wrap independently but must be bound inside this container).
    */
    private _wrappingSectionsContainer: JQuery;


    /**
    * A section which always resides at the bottom of left column.  When wrapping occurs and there is only one column
    */
    private _bottomSection: JQuery;

    /**
    * Div used to clear the 'float' property.  Required for proper wrapping of the wrapping container.
    */
    private _clearFloatDiv: JQuery;

    constructor(options: FormGridOptions) {
        super(options);
    }

    public initialize() {
        this._wrappingSectionsContainer = $("<div />").addClass("wrapping-container");

        this._sectionElements = [];

        // Ask the derived class how many sections it requires.
        var sectionCount = this.getNumberOfSections();

        for (var index = 0; index < sectionCount; index++) {
            var sectionNumber = index + 1;
            var className = `section${sectionNumber} form-section`;

            if (sectionNumber == 1 && this.layoutMode === Models.PageLayoutMode.firstColumnWide) {
                className += " wide-section";
            }

            if (sectionNumber == sectionCount) {
                className += " last-section";
            }

            var label = this._getLabelFromSectionNumber(sectionNumber)

            this._sectionElements[index] = this.createSectionElement(className, label);
        }

        // Last section needs to be aligned to the right
        this._sectionElements[sectionCount - 1].css("float", "right");

        var bottomSectionClass = this.layoutMode === Models.PageLayoutMode.equalColumns ? FormGrid.BottomSection + " equal-sections" : FormGrid.BottomSection;

        // Create the bottom section.  This section is not configurable and shouldn't have a section label.
        this._bottomSection = this.createSectionElement(bottomSectionClass, "");

        if (!isNewHtmlEditorEnabled()) {
            this._clearFloatDiv = $("<div />").css("clear", "both");
        }
        else {
            // use clear left for the new editor to keep the discussion section in the correct position. 
            // clear both would cause the discussion section to move/flicker to the wrong position
            this._clearFloatDiv = $("<div />").css("clear", "left");
        }

        super.initialize();
    }

    public adjustGridSections(): void {
        // Call 'updateLayout' which is handled by the derived classes
        this.updateLayout();

        // Make sure the height of the wrapping section is still correct.
        this.handleSectionResize();
    }

    public handleSectionResize(): void {
        if (!this._sectionElements.length) {
            return;
        }

        // When the grid is in single column mode the clear div should always appear before the bottom section
        // which will make discussions appear below all the sections.
        if (this.mode === GridSizeMode.SingleColumn) {

            this._bottomSection.css("width", "100%");

            if (this._clearFloatDiv.next().length === 0) {
                this._clearFloatDiv.insertBefore(this._bottomSection);
            }
        }
        else {
            // When the grid is not in single mode the bottom section should fit right below section 1
            var percentWidthString: string = $(this._sectionElements[0]).prop("style").width;

            if (percentWidthString && percentWidthString.indexOf("%") === percentWidthString.length - 1) {
                percentWidthString = percentWidthString.replace("%", "");
                var percentWidth = parseInt(percentWidthString);

                if (!isNewHtmlEditorEnabled()) { 

                    // When the height of the other sections is smaller than section1 I increase the width of the bottom section to be slightly bigger than the 
                    // width of section1 to allow the div to always snap below section1 otherwise the bottom section will snap below the other sections.
                    if (this.getPreciseHeight(this._sectionElements[0]) > this.getPreciseHeight(this._wrappingSectionsContainer)) {  
                        this._bottomSection.css("width", percentWidth + 0.1 + "%");
                        
                        if (this._clearFloatDiv.next().length === 0) {
                            this._clearFloatDiv.insertBefore(this._bottomSection);
                        }
                    }
                    else {
                        this._bottomSection.css("width", percentWidth + "%");
                        if (this._clearFloatDiv.next().length != 0) {
                            this._clearFloatDiv.insertAfter(this._bottomSection);
                        }
                    }
                }
                else {
                    this._bottomSection.css("width", percentWidth + "%");
                }
            }
        }
    }

    /**
    * Implemented by derived classes to adjust layout of sections.
    */
    protected updateLayout() {
    }

    protected addSections(): void {
        var sections = this._getSectionElements();

        var sectionContainer = this.getSectionContainer();
        var container = sectionContainer;

        $.each(sections, (index, section) => {
            container.append(section);

            if (index == 0) {
                // Add the wrapping container, make it so all other sections but the first are added to the new container.
                sectionContainer.append(this._wrappingSectionsContainer);
                container = this._wrappingSectionsContainer;
            }
        });

        
        if (!isNewHtmlEditorEnabled()) {
            sectionContainer.append(this._bottomSection);
            sectionContainer.append(this._clearFloatDiv);
        }
        else {
            // When the new editor is being used, move the clear float left before the bottom section 
            // so that the bottom section will snap below the other sections
            sectionContainer.append(this._clearFloatDiv);
            sectionContainer.append(this._bottomSection);
        }

        super.addSections();
    }

    /**
    * Overriden by derived classes to specify how many sections to create.
    */
    protected getNumberOfSections(): number {
        return 0;
    }

    /**
    * Sets the widths of all sections and the wrapping section.  
    * The wrapping section's width will be set to the width remaining after applying the 'firstSectionWidth'
    * The remainingSectionWidthsPercent is applied to all the remaining sections and the percentage
    * is relative the width of the wrapping container.
    */
    protected updateWidths(firstSectionWidthPercent: number, remainingSectionWidthsPercent: number) {
        var sections = this._getSectionElements();

        $.each(sections, (index: number, section: JQuery) => {
            if (index === 0) {
                section.css("width", firstSectionWidthPercent + "%");

                var wrappingSectionWidth = 100 - firstSectionWidthPercent;

                if (wrappingSectionWidth === 0 && sections.length > 1) {
                    // This means there is no room in the parent container on the same row so
                    // the wrapping section container should be wrapped to a new line below the first section so make this 100%
                    wrappingSectionWidth = 100;
                }

                this._wrappingSectionsContainer.width(wrappingSectionWidth + "%");
            }
            else {
                section.css("width", remainingSectionWidthsPercent + "%");
            }
        });
    }

    /**
    * Get the combined widths of the specified range of sections
    */
    protected getSectionWidths(startSectionNumber: number, endIndex: number): number {

        var totalWidth = 0;
        var sections = this._getSectionElements();

        // Use index instead of section numbers
        startSectionNumber--;
        endIndex--;

        $.each(sections, (index: number, section: JQuery) => {
            if (index >= startSectionNumber && index <= endIndex) {
                // Javascript computes (574.08 + 382.72) = 956.8000000000001 (for example) so rounding is necessary after addition
                // or we get flicker at some sizes.
                totalWidth = this.roundValue(totalWidth + this._getSectionWidth(index));
            }
        });

        return totalWidth;
    }

    /**
    * Override default value.  For this type of grid we can calculate the
    * min width for derived classes since the left panel's min is 480 and the 
    * remaining are 240
    */
    protected getMinWidthForFullLayout(): number {
        let width = FormGrid.LargeFormWidth;
        let countSections = this.getNumberOfSections();

        if (countSections > 0) {
            width = (FormGrid.LargeSectionWidth + FormGrid.FormWidthMargin * 2) + ((countSections - 1) * (FormGrid.SmallSectionWidth + FormGrid.FormWidthMargin));
        }

        return width;
    }

    private _getSectionElements(): JQuery[] {
        return this._sectionElements;
    }

    private _getLabelFromSectionNumber(sectionNumber: number): string {
        return Utils_String.format(WorkItemTrackingResources.FormGridSectionLabel, sectionNumber);
    }

    /**
    * Get the width of the specified section
    */
    private _getSectionWidth(sectionIndex: number): number {
        var sections = this._getSectionElements();

        if (sectionIndex >= 0 && sectionIndex < sections.length) {
            return this.getPreciseWidth(sections[sectionIndex]);
        }
        return 0;
    }


    public getMediumFormWidth(): number {
        if (this.layoutMode === Models.PageLayoutMode.equalColumns) {
            return FormGrid.MediumFormWidthEqualColums;
        }
        return FormGrid.MediumFormWidth;
    }
}

/**
* Single column layout.
*/
export class SingleSectionFormGrid extends LeftSectionPrimaryFormGrid {

    constructor(options?) {
        super(options);
    }

    protected updateLayout(): void {
        this.mode = GridSizeMode.SingleColumn;
        this.updateWidths(100, 0);
    }

    protected getNumberOfSections(): number {
        return 1;
    }
}

/**
* Three column layout.
*/
export class TwoOneOneSectionFormGrid extends LeftSectionPrimaryFormGrid {

    constructor(options?) {
        super(options);
    }

    protected getNumberOfSections(): number {
        return 3;
    }

    protected updateLayout(): void {
        // For equal columns, make the first column 34% of the width of the container
        // The remaining two columns are 50% of the remaining space and 33% of the total width
        if (this.layoutMode === Models.PageLayoutMode.equalColumns) {
            this.updateWidths(34, 50);
        }
        else {
            this.updateWidths(50, 50);
        }
        this.mode = GridSizeMode.MultipleColumns;
        var sectionWidth = this.getSectionContainerWidth();
        if (sectionWidth < FormGrid.LargeFormWidth && sectionWidth >= this.getMediumFormWidth()) {
            this._resizeToMediumGrid(sectionWidth);
        }
        else if (sectionWidth < this.getMediumFormWidth()) {
            this._resizeToSmallGrid(sectionWidth);
        }
    }

    private _resizeToMediumGrid(formWidth: number): void {

        if (this.layoutMode === Models.PageLayoutMode.equalColumns) {
            this.updateWidths(50, 100);
        }
        else {
            this.updateWidths(67, 100);
        }

        this.mode = GridSizeMode.MultipleColumns;
        var sectionContainerWidth = this.getSectionContainerWidth();
        var section12Width = this.getSectionWidths(1, 2);

        // After resizing to medium grid, we need to recheck the size
        // in case the scrollbar appears and resize again if neccessary
        if (section12Width > sectionContainerWidth) {
            this._resizeToSmallGrid(formWidth);
        }
    }

    private _resizeToSmallGrid(formWidth: number): void {
        if (this.layoutMode === Models.PageLayoutMode.equalColumns) {
            this.updateWidths(100, 100);
        }
        else {
            this.updateWidths(100, 50);
        }
        this.mode = GridSizeMode.SingleColumn;
    }
}

/**
* Two column layout of the grid.
*/
export class ThreeOneSectionFormGrid extends LeftSectionPrimaryFormGrid {

    constructor(options?) {
        super(options);
    }

    protected getNumberOfSections(): number {
        return 2;
    }

    protected getMinWidthForFullLayout(): number {
        // Special case for this layout since 33% of 720 is less than the minimum size 
        // of section2 so wrapping still occurs.
        return Math.ceil((FormGrid.SmallSectionWidth + FormGrid.FormWidthMargin) / .33);
    }

    protected updateLayout(): void {
        if (this.layoutMode === Models.PageLayoutMode.equalColumns) {
            this.updateWidths(50, 100);
        }
        else {
            this.updateWidths(67, 100);
        }
        this.mode = GridSizeMode.MultipleColumns;
        // Calculate the container width after setting the percentages. There was an issue
        // where the contain width would be under reported otherwise
        var sectionWidth = this.getSectionContainerWidth();

        if (sectionWidth < this.getMediumFormWidth()) {
            this._resizeToSmallGrid(sectionWidth);
        }
    }

    private _resizeToSmallGrid(formWidth: number): void {
        this.updateWidths(100, 100);
        this.mode = GridSizeMode.SingleColumn;
    }
}

/**
* Four column layout of the grid.
*/
export class TwoOneOneOneSectionFormGrid extends LeftSectionPrimaryFormGrid {

    constructor(options?) {
        super(options);
    }

    protected getNumberOfSections(): number {
        return 4;
    }

    protected updateLayout(): void {
        if (this.layoutMode === Models.PageLayoutMode.equalColumns) {
            this.updateWidths(25, 33);
        }
        else {
            this.updateWidths(40, 33);
        }

        this.mode = GridSizeMode.MultipleColumns;

        // Calculate the container width after setting the percentages. There was an issue
        // where the container width would be under reported otherwise
        var sectionContainerWidth = this.getSectionContainerWidth();

        if (sectionContainerWidth < FormGrid.ExtraLargeFormWidth && sectionContainerWidth >= FormGrid.LargeFormWidth) {
            this._resizeToLargeGrid();
        }
        else if (sectionContainerWidth < FormGrid.LargeFormWidth && sectionContainerWidth >= this.getMediumFormWidth()) {
            this._resizeToMediumGrid();
        }
        else if (sectionContainerWidth < this.getMediumFormWidth()) {
            this._resizeToSmallGrid();
        }
    }

    /**
    * For FirstColumnWide, make the first section 50% of the width of the container,
    * other sections in 2 columns each with 50% of the remaining space.
    * In EqualColumns, make the first section 34% of the width of the container and
    * other sections in 2 columns each 50% of the remaining space
    */
    private _resizeToLargeGrid(): void {
        // For equal columns, make the first column 34% of the width of the container
        // The remaining two columns are 50% of the remaining space and 33% of the total width
        if (this.layoutMode === Models.PageLayoutMode.equalColumns) {
            this.updateWidths(34, 50);
        }
        else {
            this.updateWidths(50, 50);
        }
        this.mode = GridSizeMode.MultipleColumns;
        var sectionContainerWidth = this.getSectionContainerWidth();
        var section123Widths = this.getSectionWidths(1, 3);

        // After resizing to large grid, we need to recheck the size
        // in case the scrollbar appears and resize again if neccessary
        if (section123Widths > sectionContainerWidth) {
            this._resizeToMediumGrid();
        }
    }

    /**
    * Make the first column 60% of the width, remaining columns in a single column (100% width in the column)
    */
    private _resizeToMediumGrid(): void {
        if (this.layoutMode === Models.PageLayoutMode.equalColumns) {
            this.updateWidths(50, 100);
        }
        else {
            this.updateWidths(60, 100);
        }
        this.mode = GridSizeMode.MultipleColumns;
        var sectionContainerWidth = this.getSectionContainerWidth();
        var section12Width = this.getSectionWidths(1, 2);

        // After resizing to medium grid, we need to recheck the size
        // in case the scrollbar appears and resize again if neccessary
        if (section12Width > sectionContainerWidth) {
            this._resizeToSmallGrid();
        }
    }

    /**
    * Make the first section 100%, have two columns under it at 50% each.
    */
    private _resizeToSmallGrid(): void {
        if (this.layoutMode === Models.PageLayoutMode.equalColumns) {
            this.updateWidths(100, 100);
        }
        else {
            this.updateWidths(100, 50);
        }
        this.mode = GridSizeMode.SingleColumn;
    }
}
