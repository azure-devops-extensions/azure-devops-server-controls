/// <reference types="react" />
import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Boolean } from "DistributedTaskControls/Common/Primitives";
import { DomAttributeConstants } from "DistributedTaskControls/Common/Common";

import { css, EventGroup, KeyCodes, getParent } from "OfficeFabric/Utilities";

import { Debug, logError } from "VSS/Diag";

/**
 * Approach: GridFocusZone splits the 2D space where its children are rendered into 
 * grid cells. It then uses the cell indices to perform keyboard navigation.
 * 
 * On KeyUp and KeyDown, the navigation happens in the vertical direction in the grid.
 * On KeyRight and KeyLeft, the navigation happens in the horizontal direction in the grid.
 */
export interface IGridFocusZoneProps extends Base.IProps {
    /**
     * Height and width of the grid cell. These should be set such that 
     * each cell should end up containing at most one element. It is better
     * to have smaller values. However, smaller values can lead to bad performance.
     * So set this based on the dimensions of children. 
     */
    gridCellHeight: number;
    gridCellWidth: number;

    /**
     * This is used to control KeyLeft and KeyRight navigation. 
     * On KeyLeft and KeyRight, the navigation happens in the horizontal direction in the grid.
     * That is, the navigation happens along the row across columns in the grid. 
     * For instance, assume that the focus is on an element which is at index (i, j). When the 
     * user presses KeyRight, we look if there are any elements in the next cell i.e. at index (i, j+1)
     * and so on. 
     * 
     * However, in many cases, we may want to look at not just the next cell but a few rows above and below
     * the current row in the next column i.e (i - margin, j + 1) to (i + margin, j + 1). 
     * 
     * The below parameter controls how many rows we should look to search for elements in the next column.
     */
    rowMarginCount: number;

    /**
     * This is similar to rowMarginCount and is used for KeyUp and KeyDown navigation.
     */
    columnMarginCount: number;

    /**
     * This is used to re-populate the grid when there is a change in the children layout. 
     * The consumer can use this to force a re-population of grid. 
     */
    gridZoneKey: string;
}

interface ICellLocation {
    rowIndex: number;
    columnIndex: number;
}

export enum Direction {
    Vertical,
    Horizontal
}

export interface IState extends Base.IState {
    error: string;
}

export class GridFocusZone extends Base.Component<IGridFocusZoneProps, IState> {

    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    public componentDidMount(): void {
        this._navigationGrid = [];

        // Listen to 'tab' on window so that we populate the navigation grid on the first 
        // tab press on the window. This is to handle scenarios where the user deletes 
        // the selected element (with tabindex=0) and then expects the focus to shift to 
        // first element on tab navigation into the elements in the focus zone.
        if (this._parentElement) {
            const ownerWindow = this._parentElement.ownerDocument.defaultView;
            ownerWindow.addEventListener("keydown", this._handleGlobalKeydown);
        }
    }

    public componentWillUnmount(): void {
        if (this._parentElement) {
            const ownerWindow = this._parentElement.ownerDocument.defaultView;
            ownerWindow.removeEventListener("keydown", this._handleGlobalKeydown);
        }
    }

    public componentWillReceiveProps(nextProps: IGridFocusZoneProps): void {
        // When there is a property change, clear the navigation grid so that it gets  
        // repopulated with next interaction.
        if (this.props.gridZoneKey !== nextProps.gridZoneKey) {
            this._navigationGrid = [];
        }
    }

    public render(): JSX.Element {
        if (this.state.error) {
            logError(this.state.error);
            return null;
        }
        else {
            return (
                <div className={css(this.props.cssClass, "dtc-grid-focus-zone")}
                    ref={this._resolveRef("_parentElement")}
                    role="presentation"
                    onKeyDown={this._onKeyDown}
                    onFocus={this._onFocus}
                    onMouseDown={this._onMouseDown}>

                    {this.props.children}

                </div>
            );
        }
    }

    private _populateNavigationGridIfRequired(): void {

        // Populate navigation grid only if it is not already populated.
        if (this._navigationGrid.length === 0) {

            // Find all elements that have data-is-grid-focusable and arrange them in a grid. 
            const focusableElements = this._parentElement.querySelectorAll(`[${GridFocusZone._gridFocusableAttribute}]`);
            const length = focusableElements.length;
            const selectedElement = focusableElements.item(0);

            const parentRect = this._parentElement.getBoundingClientRect();
            let navigationGrid = this._navigationGrid;

            for (let i = 0; i < length; i++) {

                let element = focusableElements.item(i) as HTMLElement;

                // Set tabindex for all elements to -1 so that they cannot be reached directly by keyboard but can be
                // focused programmatically.
                element.setAttribute(DomAttributeConstants.TabIndex, DomAttributeConstants.TabIndexMinusOne);

                // Get the cell location for the element based on position relative to the parent.
                const { rowIndex, columnIndex } = this._getCellLocationForElement(element, parentRect);

                // If an element is selected, then set the tab index to zero so that tabbing will 
                // move the focus to the selected element. 
                if (element === selectedElement) {
                    element.setAttribute(DomAttributeConstants.TabIndex, DomAttributeConstants.TabIndexZero);
                    this._selectedCell = { rowIndex: rowIndex, columnIndex: columnIndex };
                }

                if (!navigationGrid[rowIndex]) {
                    navigationGrid[rowIndex] = [];
                }

                if (navigationGrid[rowIndex][columnIndex]) {
                    this.setState({ error: "Multiple elements map to same cell in the grid. Reduce the gridCellHeight and gridCellWidth and try again." });
                }

                navigationGrid[rowIndex][columnIndex] = element;
            }

            // Set cell location on the element as data attributes to reverse lookup grid location from the element.
            const rowCount = navigationGrid.length;
            for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
                const row = navigationGrid[rowIndex];
                if (row) {
                    const columnCount = row.length;
                    for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
                        if (row[columnIndex]) {
                            row[columnIndex].setAttribute(GridFocusZone._locationAttribute, `${rowIndex}${GridFocusZone._locationSeparator}${columnIndex}`);
                        }
                    }

                    if (columnCount > this._maxColumnCount) {
                        this._maxColumnCount = columnCount;
                    }
                }
            }
        }
    }

    private _handleGlobalKeydown = (ev: KeyboardEvent) => {
        if (ev.which === KeyCodes.tab) {
            this._populateNavigationGridIfRequired();
        }
    }

    private _getCellLocationForElement(element: HTMLElement, parentRect: ClientRect): ICellLocation {
        const elementRect = element.getBoundingClientRect();
        const top = elementRect.top - parentRect.top;
        const left = elementRect.left - parentRect.left;

        const rowIndex = Math.floor(top / this.props.gridCellHeight);
        const columnIndex = Math.floor(left / this.props.gridCellWidth);
        return { rowIndex: rowIndex, columnIndex: columnIndex };
    }

    private _onFocus = (ev: React.FocusEvent<HTMLElement>) => {
        this._selectElementWithoutTakingFocus(ev);
    }

    private _onMouseDown = (ev: React.MouseEvent<HTMLElement>) => {
        this._selectElementWithoutTakingFocus(ev);
    }

    private _selectElementWithoutTakingFocus(ev: React.SyntheticEvent<HTMLElement>): void {
        // When the focus is triggered on a child element or an inner elment is clicked and there is a grid focusable parent, ensure that the 
        // parent is selected but not focused. This is to ensure that focus is not shifted to parent element. 
        this._populateNavigationGridIfRequired();
        let target = ev.target as HTMLElement;
        this._selectTargetElement(target, Boolean.isFalse(target.getAttribute(GridFocusZone._gridFocusableAttribute)));
    }

    private _onKeyDown = (ev: React.KeyboardEvent<HTMLElement>) => {
        this._populateNavigationGridIfRequired();
        if (ev.altKey) {
            return;
        }

        const target = ev.target as HTMLElement;
        if (!Boolean.isTrue(target.getAttribute(GridFocusZone._gridFocusableAttribute))) {
            return;
        }

        switch (ev.which) {
            case KeyCodes.up:
                if (this._moveVertical(
                    this._selectedCell.rowIndex - 1,
                    this._selectedCell.columnIndex,
                    -1,
                    this.props.columnMarginCount,
                    this._navigationGrid.length,
                    rowIndex => rowIndex >= 0,
                    columnIndex => columnIndex >= 0)) {

                    break;
                }

                return;

            case KeyCodes.down:
                if (this._moveVertical(
                    this._selectedCell.rowIndex + 1,
                    this._selectedCell.columnIndex,
                    1,
                    this.props.columnMarginCount,
                    0,
                    rowIndex => rowIndex < this._navigationGrid.length,
                    columnIndex => columnIndex < this._maxColumnCount)) {

                    break;
                }

                return;

            case KeyCodes.left:
                if (this._moveHorizontal(
                    this._selectedCell.columnIndex - 1,
                    this._selectedCell.rowIndex,
                    -1,
                    this.props.rowMarginCount,
                    this._maxColumnCount,
                    columnIndex => columnIndex >= 0,
                    rowIndex => rowIndex >= 0)) {

                    break;
                }

                return;

            case KeyCodes.right:
                if (this._moveHorizontal(
                    this._selectedCell.columnIndex + 1,
                    this._selectedCell.rowIndex,
                    1,
                    this.props.rowMarginCount,
                    0,
                    columnIndex => columnIndex < this._maxColumnCount,
                    rowIndex => rowIndex < this._navigationGrid.length)) {

                    break;
                }

                return;

            default:
                return;
        }

        ev.preventDefault();
        ev.stopPropagation();
    }

    /**
     * 
     * @param startRowIndex The row index from where to begin searching for the next element to select
     * @param columnIndex The column index from where to begin searching for the next element to select
     * @param increment For up navigation, set this to negative and positive for down navigation
     * @param columnMargin As we navigate up and down the grid across rows, in each row, we look to see if there is a
     *        an element in any column (in that row). However, to keep the spatial navigation intuitive, we just look for
     *        the nearest element within a reasonable range of columns. columnMargin controls that range. 
     * @param rowIndexToResetAfterExceedingRange As we navigate across rows, if the row index exceeds the range, it is reset
     *        to the start (or end) index. This parameter is used to specify that index.
     * @param isRowIndexInRange Delegate to validate if the row index is in range as we move across the grid.
     * @param isColumnIndexInRange Delegate to validate if the column index is in range as we move across the grid.
     */
    private _moveVertical(startRowIndex: number,
        columnIndex: number,
        increment: number,
        columnMargin: number,
        rowIndexToResetAfterExceedingRange: number,
        isRowIndexInRange: (number) => boolean,
        isColumnIndexInRange: (number) => boolean): boolean {

        let nextRowIndex = startRowIndex;
        let nextColumnIndex = columnIndex;
        let elementFound = false;
        while (isColumnIndexInRange(nextColumnIndex)) {

            elementFound = false;
            while (isRowIndexInRange(nextRowIndex)) {

                // Find the nearest column in "nextRowIndex" with a valid element within the "columnMargin" (in both direction)
                const nearestColumnIndex = this._findNearestColumnWithElementInAGivenRow(nextRowIndex, nextColumnIndex, columnMargin);
                if (nearestColumnIndex === GridFocusZone._invalidIndex) {
                    nextRowIndex = nextRowIndex + increment;
                }
                else {
                    columnIndex = nearestColumnIndex;
                    elementFound = true;
                    break;
                }
            }

            if (elementFound) {
                // If the element is found, break the loop.
                break;
            }
            else {
                // Move to the next column. Start with the column before or after the column margin based
                // on whether we are navigating up or down. 
                nextColumnIndex += (columnMargin * (increment > 0 ? 1 : -1) + increment);
                nextRowIndex = rowIndexToResetAfterExceedingRange;
            }
        }

        if (elementFound && this._selectElement(nextRowIndex, columnIndex)) {
            return true;
        }

        return false;
    }

    /**
     * 
     * @param startColumnIndex The column index from where to begin searching for the next element to select
     * @param rowIndex The rowIndex from where to begin searching for the next element to select
     * @param increment For left navigation, set this to negative and positive for right navigation
     * @param rowMarginCount As we navigate left and right the grid across columns, in each column, we look to see if there is a
     *        an element in any row (in that column). However, to keep the spatial navigation intuitive, we just look for
     *        the nearest element within a reasonable range of rows (in each column). rowMargin controls that range.
     * @param columnIndexToResetAfterExceedingRange As we navigate across columns, if the column index exceeds the range, it is reset
     *        to the start (or end) index. This parameter is used to specify that index.
     * @param isColumnIndexInRange Delegate to validate if the column index is in range as we move across the grid.
     * @param isRowIndexInRange Delegate to validate if the row index is in range as we move across the grid.
     */
    private _moveHorizontal(startColumnIndex: number,
        rowIndex: number,
        increment: number,
        rowMarginCount,
        columnIndexToResetAfterExceedingRange: number,
        isColumnIndexInRange: (number) => boolean,
        isRowIndexInRange: (number) => boolean): boolean {

        let nextColumnIndex = startColumnIndex;
        let nextRowIndex = rowIndex;
        let elementFound = false;
        while (isRowIndexInRange(nextRowIndex)) {
            elementFound = false;

            while (isColumnIndexInRange(nextColumnIndex)) {
                const nearestRowIndex = this._findNearestRowWithElementInAGivenColumn(nextColumnIndex, nextRowIndex, rowMarginCount);
                if (nearestRowIndex === GridFocusZone._invalidIndex) {
                    nextColumnIndex = nextColumnIndex + increment;
                }
                else {
                    elementFound = true;
                    rowIndex = nearestRowIndex;
                    break;
                }
            }

            if (elementFound) {
                break;
            }
            else {
                nextColumnIndex = columnIndexToResetAfterExceedingRange;

                // Move to the next row. Start with the row before or after the row margin based
                // on whether we are navigating right or left. 
                nextRowIndex += (rowMarginCount * (increment > 0 ? 1 : -1) + increment);
            }
        }

        if (elementFound && this._selectElement(rowIndex, nextColumnIndex)) {
            return true;
        }

        return false;
    }

    private _selectTargetElement(target: HTMLElement, doNotMoveFocus?: boolean): void {
        while (target && target !== this._parentElement && target.getAttribute) {
            if (Boolean.isTrue(target.getAttribute(GridFocusZone._gridFocusableAttribute))) {
                const cellLocationString = target.getAttribute(GridFocusZone._locationAttribute);
                if (cellLocationString) {
                    const cellLocation = cellLocationString.split(GridFocusZone._locationSeparator);

                    const rowIndex = parseInt(cellLocation[0]);
                    const columnIndex = parseInt(cellLocation[1]);

                    this._selectElement(rowIndex, columnIndex, doNotMoveFocus);
                }
                else {
                    Debug.logInfo("Target element does not have cell location. This should get regenerated with next update");
                }

                break;
            }
            else {
                target = getParent(target);
            }
        }
    }

    private _findNearestRowWithElementInAGivenColumn(columnIndex: number, initialRowIndex: number, rowMargin: number): number {
        return this._findNearestIndexWithElementInAGivenDimension(
            initialRowIndex,
            rowMargin,
            0,
            this._navigationGrid.length - 1,
            rowIndex => this._getElement(rowIndex, columnIndex)
        );
    }

    private _findNearestColumnWithElementInAGivenRow(rowIndex: number, initialColumnIndex: number, columnMargin: number): number {
        return this._findNearestIndexWithElementInAGivenDimension(
            initialColumnIndex,
            columnMargin,
            0,
            this._maxColumnCount - 1,
            columnIndex => this._getElement(rowIndex, columnIndex)
        );
    }

    private _findNearestIndexWithElementInAGivenDimension(
        initialVariableIndex: number,
        margin: number,
        minValue: number,
        maxValue: number,
        getElement: (index) => HTMLElement
    ): number {

        let navigator = initialVariableIndex;
        let oppositeNavigator = initialVariableIndex;
        let nearestIndex = GridFocusZone._invalidIndex;
        let displacement = 0;

        // Start two navigators. One moving in one direction and the other moving in another direction.
        // Whatever navigator finds the element first within the margin wins. 
        while (!getElement(navigator) &&
            !getElement(oppositeNavigator)) {

            if (navigator >= maxValue && oppositeNavigator <= minValue) {
                break;
            }

            if (displacement >= margin) {
                break;
            }

            if (navigator < maxValue) {
                navigator++;
            }

            if (navigator > minValue) {
                oppositeNavigator--;
            }

            displacement++;
        }

        if (getElement(navigator)) {
            nearestIndex = navigator;
        }

        if (getElement(oppositeNavigator)) {
            nearestIndex = oppositeNavigator;
        }

        return nearestIndex;
    }

    private _getElement(rowIndex: number, columnIndex: number): HTMLElement {
        if (!this._navigationGrid[rowIndex]) {
            return null;
        }

        return this._navigationGrid[rowIndex][columnIndex];
    }

    private _selectElement(rowIndex: number, columnIndex: number, doNotMoveFocus?: boolean): boolean {
        if (!this._navigationGrid[rowIndex] || !this._navigationGrid[rowIndex][columnIndex]) {
            return false;
        }

        const element = this._navigationGrid[rowIndex][columnIndex];
        if (element) {
            if (this._selectedCell) {
                if (this._navigationGrid[this._selectedCell.rowIndex]) {
                    const prevElement = this._navigationGrid[this._selectedCell.rowIndex][this._selectedCell.columnIndex];
                    if (prevElement && prevElement !== element) {
                        prevElement.setAttribute(DomAttributeConstants.TabIndex, DomAttributeConstants.TabIndexMinusOne);
                    }
                }
            }

            this._selectedCell = {
                rowIndex: rowIndex,
                columnIndex: columnIndex
            };

            element.setAttribute(DomAttributeConstants.TabIndex, DomAttributeConstants.TabIndexZero);
            if (!doNotMoveFocus) {
                element.focus();
            }

            return true;
        }
        else {
            return false;
        }
    }

    private static readonly _gridFocusableAttribute = "data-is-grid-focusable";
    private static readonly _locationAttribute = "data-grid-cell-location";
    private static readonly _locationSeparator = "_";
    private static readonly _invalidIndex = -1;

    private _parentElement: HTMLElement;
    private _navigationGrid: HTMLElement[][] = [];
    private _selectedCell: ICellLocation;
    private _maxColumnCount: number = 0;
}
