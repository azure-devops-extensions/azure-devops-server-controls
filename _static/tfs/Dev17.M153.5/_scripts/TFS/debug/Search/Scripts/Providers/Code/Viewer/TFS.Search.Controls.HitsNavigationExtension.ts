// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";
import AdornmentCommon = require("Presentation/Scripts/TFS/TFS.Adornment.Common");
import Controls = require("VSS/Controls");
import Search_AdormentsHelper = require("Search/Scripts/Providers/Code/Viewer/TFS.Search.Adornments.Helper");
import Search_Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import State = require("Search/Scripts/Common/TFS.Search.ViewState");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import Utils_Core = require("VSS/Utils/Core");
import ViewBuilder = require("Search/Scripts/Common/TFS.Search.ViewBuilder");
import VCAnnotateAnnotatedFileViewer = require("VersionControl/Scripts/Controls/AnnotateAnnotatedFileViewer");
import VCFileViewer = require("VersionControl/Scripts/Controls/FileViewer");

var delegate = Utils_Core.delegate;

export class HitsNavigationExtension extends Controls.BaseControl {

    private static ACTION_DELAY_TIME_IN_MS: number = 50;

    private _annotatedFileViewer: VCAnnotateAnnotatedFileViewer.AnnotatedFileViewer;
    private _fileViewer: VCFileViewer.FileViewer;
    private _prevHitDisabled: boolean = true;
    private _nextHitDisabled: boolean = true;
    private _isNextIconUsed: boolean;
    private _isPreviousIconUsed: boolean;
    private _isNextKeyboardShortcutUsed: boolean;
    private _isPreviousKeyboardShortcutUsed: boolean;

    private _navigationAdornments: Search_AdormentsHelper.AdornmentLineDetails[] = [];
    private _highlightingAdornments: AdornmentCommon.DecorationAdornment[];
    private _isAnyHitHighlighted: boolean = true;
    private _selectedIndex: number;
    private _totalSearchResults: number;
    private _isPrevFileNavigated: boolean;
    private _selection: VCFileViewer.FileViewerSelection;    
    public _currentSelectedHitIndex: number = 0; //Setting the index to 0 initially to start the navigation from second hit
    public _selectedLineInFileViewer: number;
    public _selectedColumnInFileViewer: number;

    constructor(options?) {
        super(options);
    }

    /**
    * Constructs the hitsNavigation object
    */
    public update(viewer: any) {
        this._isAnyHitHighlighted = false;
        if (viewer instanceof VCAnnotateAnnotatedFileViewer.AnnotatedFileViewer) {
            this._annotatedFileViewer = viewer;
            this._fileViewer = viewer.getFileViewer();
        }
        else if (viewer instanceof VCFileViewer.FileViewer) {
            this._annotatedFileViewer = null;
            this._fileViewer = viewer;
        }
        else {
            throw new Error("Invalid Arguments.");
        }
    }

    public subscribeToCursorPositionChange() {
        // Add listener for selectionChange in the viewer to update the prev/next buttons according to the new cursor position
        this._fileViewer.addSelectionListener(delegate(this, this._onCursorPositionChange));
    }

    /**
    * Adds prev/next buttons to the tool bar
    */
    public addPrevNextButtons() {
        var onPrevClick = delegate(this, this._onPrevClick);
        var onNextClick = delegate(this, this._onNextClick);
        var isExclusivelyKeyPress = delegate(this, this._isExclusivelyKeyPress);
        var annotateMenuItems = this._annotatedFileViewer ? delegate(this._annotatedFileViewer, this._annotatedFileViewer.getAnnotateMenuItems) : null;
        var annotateViewer = this._annotatedFileViewer;
        var getButtonStatus = delegate(this, this.getButtonStatus);
        var hitsNavigation = this;

        // Overiding fileViewer getContributedViewMenuItems to add prev/next icons as menu items
        this._fileViewer._options.getContributedViewMenuItems = function () {
            var menuItems: any[] = [];

            // Push annotate menuitem
            menuItems = annotateViewer ? annotateMenuItems.call(annotateViewer) : [];

            // Get previous/next button state
            var prevButtonState = getButtonStatus.call(this, false);
            var nextButtonState = getButtonStatus.call(this, true);

            // Push previous button
            menuItems.push({
                id: "previous",
                title: Search_Resources.PreviousButtonToolTip,
                icon: "icon bowtie-icon bowtie-arrow-up",
                showText: false,
                disabled: prevButtonState,
                action: onPrevClick
            });

            // Push next button
            menuItems.push({
                id: "next",
                title: Search_Resources.NextButtonToolTip,
                icon: "icon bowtie-icon bowtie-arrow-down",
                showText: false,
                disabled: nextButtonState,
                action: onNextClick
            });

            return menuItems;
        }

        var documentKeyBoardShortcutsBinding = delegate(this, (e) => {
            if (e.keyCode === Search_Constants.SearchConstants.F8_KeyCode) {
                e.preventDefault();
                if (e.shiftKey) {
                    this.onPrevClick();
                }
                else if (isExclusivelyKeyPress.call(hitsNavigation, e)) {
                    this.onNextClick();
                }
            }
        });
        // Add listener for keydown events in the portal
        $(document).unbind("keydown", documentKeyBoardShortcutsBinding).bind("keydown", documentKeyBoardShortcutsBinding);
    }

    public onNextClick() {
        this._onNextClick();
        // Trace if NEXT keyboard shortcut was used
        if (!this._isNextKeyboardShortcutUsed) {
            TelemetryHelper.TelemetryHelper.traceLog({ "NextKeyboardShortcutUsed": true })
            this._isNextKeyboardShortcutUsed = true;
        }
    }

    public onPrevClick() {
        this._onPrevClick();
        // Trace if PREVIOUS keyboard shortcut was used
        if (!this._isPreviousKeyboardShortcutUsed) {
            TelemetryHelper.TelemetryHelper.traceLog({ "PreviousKeyboardShortcutUsed": true })
            this._isPreviousKeyboardShortcutUsed = true;
        }
    }

    public _isExclusivelyKeyPress(e: JQueryEventObject): boolean {
        return !e.ctrlKey && !e.altKey && !e.shiftKey;
    }

    /**
    * updates the globals used to trace prev/next usage on changing to a new file in preview
    */
    public updatePrevNextTracePointStatus(isNextIconUsed: boolean, isPreviousIconUsed: boolean, isNextKeyboardShortcutUsed: boolean, isPreviousKeyboardShortcutUsed: boolean) {
        this._isNextIconUsed = isNextIconUsed;
        this._isPreviousIconUsed = isPreviousIconUsed;
        this._isNextKeyboardShortcutUsed = isNextKeyboardShortcutUsed;
        this._isPreviousKeyboardShortcutUsed = isPreviousKeyboardShortcutUsed;
    }

    public updateSelectedIndexAndTotalResultsCount(selectedIndex: number, totalSearchResults: number): void {
        this._selectedIndex = selectedIndex;
        this._totalSearchResults = totalSearchResults;
    }

    /**
    * sets the selected row to fileIndex(index of prev/next search result to be navigated) from result grid
    */
    private navigateAcrossSearchResults(fileIndex: number): void {
        if (this._options.navigateSearchResults &&
            $.isFunction(this._options.navigateSearchResults)) {
            this._options.navigateSearchResults(fileIndex);
        }
    }

    /**
    * sets the button status values to true/false based on the index of the current hit
    */
    public updatePrevNextButtons() {
        // If there are no hits in the file
        if (this._navigationAdornments && this._navigationAdornments.length === 0) {
            if (this._totalSearchResults === 1) { // Disable prev/next button if there are no hits and search results contain single file
                this.updateDisableStatusOfPrevNextButton(true, true);
            }
            else if (this._totalSearchResults - 1 === this._selectedIndex) { // On navigating to last search result
                this.updateDisableStatusOfPrevNextButton(false, true);
            }
            else if (this._selectedIndex === 0) { // On navigating to first search result
                this.updateDisableStatusOfPrevNextButton(true, false);
            }
            else {
                this.updateDisableStatusOfPrevNextButton(false, false);
            }
        }
        // Disable prev/next buttonf if there is a single hit and search results contain single file
        else if (this._totalSearchResults === 1 && this._navigationAdornments.length === 1) {
            this.updateDisableStatusOfPrevNextButton(true, true);
        }
        else if (this._selectedLineInFileViewer) { // If some selection happens in the file viewer
            this.updatePrevNextButtonWithRespectToSelectedLine();
        }
        // If the selected hit is the last hit and search result file is also last- disable the next button
        else if ((this._currentSelectedHitIndex + 1) === this._navigationAdornments.length && (this._totalSearchResults - 1 === this._selectedIndex)) {
            this.updateDisableStatusOfPrevNextButton(false, true);
        }    
        // If the selected hit is the first hit and search result file is also first- disable the previous button
        else if (this._currentSelectedHitIndex === 0 && this._selectedIndex === 0) {
            this.updateDisableStatusOfPrevNextButton(true, false);
        }
        else {  // Enable both the buttons if none of the above conditions are satisfied
            this.updateDisableStatusOfPrevNextButton(false, false);
        }

        // Update the tool bar with the latest button values
        this._fileViewer._updateViewsToolbar();
    }

    public updateNavigationAdornments(adornmentDetails: Search_AdormentsHelper.AdornmentLineDetails[]) {
        this._navigationAdornments = adornmentDetails;
    }

    public updateHighlightingAdornments(adornments: AdornmentCommon.DecorationAdornment[]) {
        this._highlightingAdornments = adornments;

        // Clear the highlighting if adornments contains no highlights
        if (adornments.length === 0) {
            this._fileViewer.extendEditorConfig({
                adornmentsEnabled: true,
                adornments: this._highlightingAdornments
            });
        }
        else {
            this._currentSelectedHitIndex = this._isPrevFileNavigated ? this._navigationAdornments.length - 1 : 0;
            this._isAnyHitHighlighted = true;
            // undo highlighting the first hit. And hightlight the last hit.
            this.updateSelectedAdornment(0, Search_Constants.SearchConstants.HitHightedLineCssClass, false);
            this.updateSelectedAdornment(this._currentSelectedHitIndex, Search_Constants.SearchConstants.SelectedHit, true);
            this._fileViewer.extendEditorConfig({
                adornmentsEnabled: true,
                adornments: this._highlightingAdornments
            });
        }
    }

    /**
    * Clears hits and cursor position cache.
    */
    public clearPrevNextCache() {
        this._navigationAdornments = [];
        this._selectedLineInFileViewer = null;
        this._selectedColumnInFileViewer = null;
    }

    private areSelectionsEqual(a: VCFileViewer.FileViewerSelection, b: VCFileViewer.FileViewerSelection): boolean {
        if (a === undefined || b === undefined) {
            return false;
        }
        if (a.endColumn !== b.endColumn ||
            a.endLineNumber !== b.endLineNumber ||
            a.positionColumn !== b.positionColumn ||
            a.positionLineNumber !== b.positionLineNumber ||
            a.startColumn !== b.startColumn ||
            a.startLineNumber !== b.startLineNumber) {
            return false;
        }
        return true;
    }

    /**
    * Called whenever there is a change in the cursor position
    */
    private _onCursorPositionChange(selection: VCFileViewer.FileViewerSelection) {
        // Neglecting no-op selection events fired by editor
        if (!this.areSelectionsEqual(this._selection, selection)) {            
            // Update the line/column variable to the selected line and column in the file viewwer
            this.cacheCursorPosition(selection.positionLineNumber, selection.positionColumn);

            if (this._navigationAdornments && this._navigationAdornments.length > 0) {
                // Update the buttons according to the current cursor position   
                this.updatePrevNextButtonWithRespectToSelectedLine();

                // Update the tool bar with the latest button values
                this._fileViewer._updateViewsToolbar();

                // Update all the hits with normal hit color if any hit is selected
                if (this._isAnyHitHighlighted && typeof this._selection !== "undefined") {
                    this.updateSelectedAdornment(this._currentSelectedHitIndex, Search_Constants.SearchConstants.HitHightedLineCssClass, false);
                    this._fileViewer.extendEditorConfig({
                        adornmentsEnabled: true,
                        adornments: this._highlightingAdornments
                    });
                    this._isAnyHitHighlighted = false;
                }
            }

            this._selection = selection;
        }
    }

    /**
    * Called whenever the next button is clicked
    */
    private _onNextClick() {
        if (!this._nextHitDisabled) {
            this.delayExecute("GoToNextHit", HitsNavigationExtension.ACTION_DELAY_TIME_IN_MS, true, () => {
                this.revealPositionOrNavigateToFile(true);
            });
        }

        // Trace if NEXT icon was used
        if (!this._isNextIconUsed) {
            TelemetryHelper.TelemetryHelper.traceLog({ "NextIconUsed": true })
            this._isNextIconUsed = true;
        }
    }

    /**
    * Called whenever the previous button is clicked
    */
    private _onPrevClick() {
        if (!this._prevHitDisabled) {
            this.delayExecute("GoToPrevHit", HitsNavigationExtension.ACTION_DELAY_TIME_IN_MS, true, () => {
                this.revealPositionOrNavigateToFile(false);
            });
        }

        // Trace if PREVIOUS icon was used
        if (!this._isPreviousIconUsed) {
            TelemetryHelper.TelemetryHelper.traceLog({ "PreviousIconUsed": true })
            this._isPreviousIconUsed = true;
        }
    }

    /**
    * Returns the staus of prev/next buttons
    */
    private getButtonStatus(nextButton: boolean): boolean {
        return (nextButton ? this._nextHitDisabled : this._prevHitDisabled);
    }

    /**
    * Updates the staus of prev/next buttons with respect to the selected line
    */
    private updatePrevNextButtonWithRespectToSelectedLine() {
        var lastHitIndex = this._navigationAdornments.length - 1;

        if (this._selectedLineInFileViewer > this._navigationAdornments[0].lineNumber && this._selectedLineInFileViewer < this._navigationAdornments[lastHitIndex].lineNumber) {
            this.updateDisableStatusOfPrevNextButton(false, false); // If some selection happens in the file viewer
        }
        else if (this._selectedLineInFileViewer && this._selectedLineInFileViewer < this._navigationAdornments[0].lineNumber) { // If some selection happens in the file viewer
            if (this._selectedIndex === 0) {
                this.updateDisableStatusOfPrevNextButton(true, false);
            }
            else {
                this.updateDisableStatusOfPrevNextButton(false, false);
            }
        }
        else if (this._selectedLineInFileViewer && this._selectedLineInFileViewer > this._navigationAdornments[lastHitIndex].lineNumber) { // If some selection happens in the file viewer
            if (this._totalSearchResults - 1 === this._selectedIndex) {
                this.updateDisableStatusOfPrevNextButton(false, true);
            }
            else {
                this.updateDisableStatusOfPrevNextButton(false, false);
            }
        }
        else {
            this.updateDisableStatusOfPrevNextButton(false, false);
            if (this.getIndexOfNextHit() === this._navigationAdornments.length && this._totalSearchResults - 1 === this._selectedIndex) {
                this._nextHitDisabled = true;
            }
            if (this.getIndexOfPrevHit() === -1 && this._selectedIndex === 0) {
                this._prevHitDisabled = true;
            }
        }
    }

    /**
    * sets the values of line/column variable to current cursor position values
    */
    private cacheCursorPosition(lineNumber: number, columnNumber: number) {
        this._selectedLineInFileViewer = lineNumber;
        this._selectedColumnInFileViewer = columnNumber;
    }

    /**
    * sets the values of prev/next variables
    */
    private updateDisableStatusOfPrevNextButton(prev: boolean, next: boolean) {
        this._prevHitDisabled = prev;
        this._nextHitDisabled = next;
    }

    /**
    * Gets the index of the next hit to be higlighted or prev/next search result to be navigated to 
    * based on prev/next selection and updates the prev/next buttons accordingly 
    */
    private revealPositionOrNavigateToFile(showNext: boolean) {
        // Changing the css back to normal of the previous selected hit before rendering the current selected hit
        this.updateSelectedAdornment(this._currentSelectedHitIndex, Search_Constants.SearchConstants.HitHightedLineCssClass, false);

        // If cursor is placed at a particular position in the fileviewer we need to update the selected index according to the new location of the cursor
        // as prev/next hits should be shown with respect to that location
        if (this._selectedLineInFileViewer) {
            this._currentSelectedHitIndex = showNext ? this.getIndexOfNextHit() : this.getIndexOfPrevHit();
        }
        else {
            this._currentSelectedHitIndex = showNext ? this._currentSelectedHitIndex + 1 : this._currentSelectedHitIndex - 1;
        }

        if (this._navigationAdornments && this._navigationAdornments.length > 0) {
            // Changing the css of the selected hit so that is it highligted with a different color
            this.updateSelectedAdornment(this._currentSelectedHitIndex, Search_Constants.SearchConstants.SelectedHit, true);

            // Re-painting the hits with current selected hit with a different color and setting the scroll position to that particular hit
            this._fileViewer.extendEditorConfig({
                adornmentsEnabled: true,
                adornments: this._highlightingAdornments
            });
            this._isAnyHitHighlighted = true;

            // Clear the current selected line as prev/next action is happened after the user selects a particular line
            this._selectedLineInFileViewer = null;
            this._selectedColumnInFileViewer = null;

            if ((this._currentSelectedHitIndex + 1) > this._navigationAdornments.length) { // If current hit index is greater then last search hit index- navigate to next file
                this.navigateAcrossSearchResults(this._selectedIndex + 1);
                this._isPrevFileNavigated = false;
            }

            else if (this._currentSelectedHitIndex < 0) { // If current hit index is greater then last search hit index- navigate to next file
                this.navigateAcrossSearchResults(this._selectedIndex - 1);
                this._isPrevFileNavigated = true;
            }
            else {
                this.updatePrevNextButtons(); // Update the buttons acording to the current selected hit
            }
        }
        else {
            var fileIndex: number = showNext ? this._selectedIndex + 1 : this._selectedIndex - 1

            this._isPrevFileNavigated = showNext ? false : true;
            this.navigateAcrossSearchResults(fileIndex);
        }
    }

    /**
    * Updates the css/scroll variable of the hit at the passed index in the list
    */
    private updateSelectedAdornment(selectedindex: number, className: string, scrollToAdornment: boolean) {
        if (selectedindex >= 0 && selectedindex < this._navigationAdornments.length) {
            this._highlightingAdornments[selectedindex].className = className;
            this._highlightingAdornments[selectedindex].scrollToAdornment = scrollToAdornment;
        }
    }

    /**
    * Returns the index of the next hit with respect to the cursor position
    */
    public getIndexOfNextHit(): number {
        var length = this._navigationAdornments ? this._navigationAdornments.length : 0;

        for (var i = 0; i < length; i++) {
            // Checks if the current selected line has hits after the current cursor position
            if ((this._navigationAdornments[i].lineNumber > this._selectedLineInFileViewer) ||
                (this._navigationAdornments[i].lineNumber === this._selectedLineInFileViewer && this._navigationAdornments[i].startColumn > this._selectedColumnInFileViewer)) {
                return i;
            }
        }

        return length;
    }

    /**
    * Returns the index of the previous hit with respect to the cursor position
    */
    public getIndexOfPrevHit(): number {
        var length = this._navigationAdornments ? this._navigationAdornments.length : 0;
        var tempIndex = null;

        for (var i = 0; i < length; i++) {
            // Checks if there are hits before the current cursor line
            if ((this._navigationAdornments[i].lineNumber < this._selectedLineInFileViewer) ||
                ((this._navigationAdornments[i].lineNumber === this._selectedLineInFileViewer) && (this._navigationAdornments[i].endColumn < this._selectedColumnInFileViewer))) {
                tempIndex = i;
            }
        }

        // Return the index of the hit just before the cursor position in case of previous selection
        if (tempIndex != null) {
            return tempIndex;
        }
        else {
            return -1
        }
    }
}

