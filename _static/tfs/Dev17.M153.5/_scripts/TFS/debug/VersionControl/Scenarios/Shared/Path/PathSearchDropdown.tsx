import * as React from "react";

import { KeyCode } from 'VSS/Utils/UI';
import { format } from 'VSS/Utils/String';
import { equals } from 'VSS/Utils/Core';

import "VSS/LoaderPlugins/Css!VersionControl/Shared/Path/PathSearchDropdown";

export interface PathSearchDropdownProps {
    /**
     * Click callback
     */
    onRowClick(item: DropdownRow): void;

    /**
     * onRowMouseEnter click handler for the search result row. Called with the itemIndex of the result row
     */
    onRowMouseEnter(itemPosition: DropdownItemPosition): void;

    /**
     * Data associated with the dropdown
     */
    data: DropdownData;

    /**
     * CSS Class name of the dropdown
     */
    cssClass?: string;

    /**
     * DOM identifier
     */
    id?: string;

}

export interface DropdownData {
    /**
     * Sections to be displayed in the dropdown
     */
    sections: DropdownSection[];
    
    /**
     * Position of the selected row
     */
    selectedItemPosition: DropdownItemPosition;

    /**
     * Footer message of the dropdown
     */
    footerMessage?: string;

    /**
     * Error message
     */
    errorMessage?: string;
}

export interface DropdownSection {
    /**
     * Array of items for this section
     */
    rows: DropdownRow[];

    /**
     * Header message for this section
     */
    headerMessage?: string;
}

export interface DropdownRow {
    text: string;
    matchingIndices?: number[];
    iconCssClass?: string;
}

export interface DropdownItemPosition {
    sectionIndex: number;
    rowIndex: number;
}

export class PathSearchDropdown extends React.Component<PathSearchDropdownProps, {}> {
    private _sectionsContainer: HTMLElement;

    public componentDidUpdate(prevProps: PathSearchDropdownProps): void {
        this._scrollSelectedItemIntoView();
    }

    public render(): JSX.Element {
        let className = 'path-explorer-search-results bowtie';
        className = this.props.cssClass ? format('{0} {1}', className, this.props.cssClass) : className;

        return (
            <div className={className}>
                <div
                    id={this.props.id}
                    className='list-sections'
                    role="listbox"
                    ref={(c: HTMLElement) => this._sectionsContainer = c}>
                    {
                        this.props.data.sections.map((sectionData, sectionIndex) => {
                            return (
                                <DropdownSectionComponent
                                    sectionData={sectionData}
                                    sectionIndex={sectionIndex}
                                    selectedItemPosition={this.props.data.selectedItemPosition}
                                    getItemId={PathSearchDropdown.getSearchItemId}
                                    onRowClick={this.props.onRowClick}
                                    onRowMouseEnter={this.props.onRowMouseEnter}
                                    key={sectionIndex}
                                    />
                            );
                        })
                    }
                </div>
                {
                    this.props.data.footerMessage &&
                    <div className='footer-message'>{this.props.data.footerMessage}</div>
                }
                {
                    this.props.data.errorMessage &&
                    <div className='error-message'>{this.props.data.errorMessage}</div>
                }
            </div>
        );
    }

    private _scrollSelectedItemIntoView(): void {
        // TODO: We should avoid document reference here. And use react for referring the DOM.
        // React's ref will greatly add to the complexity here because of the component's heirarchy and child component's array.
        // Bug 643428: Find a replacement for document.getElementById in react
        const selectedElement = document.getElementById(PathSearchDropdown.getSearchItemId(this.props.data.selectedItemPosition));
        if (!selectedElement) {
            this._sectionsContainer.scrollTop = 0;
            return;
        }

        const top = selectedElement.offsetTop;
        const bottom = selectedElement.offsetTop + selectedElement.offsetHeight;

        // if the selected item is too far down
        if (bottom > this._sectionsContainer.clientHeight + this._sectionsContainer.scrollTop) {
            selectedElement.scrollIntoView(false);
        } else if (top < this._sectionsContainer.scrollTop) {
            // else if it's too far up
            selectedElement.scrollIntoView(true);
        }
    }

    public static getSearchItemId = (selectedItemIndex: DropdownItemPosition): string => {
        return format("SectionIndex:{0}-RowIndex:{1}", selectedItemIndex.sectionIndex, selectedItemIndex.rowIndex);
    }
}

function DropdownSectionComponent(props: {
    sectionData: DropdownSection,
    sectionIndex: number,
    selectedItemPosition: DropdownItemPosition,
    getItemId(itemPosition: DropdownItemPosition): string,
    onRowClick(item: DropdownRow): void,
    onRowMouseEnter(itemPosition: DropdownItemPosition): void
}): JSX.Element {
    if (!props.sectionData.rows.length && !props.sectionData.headerMessage) {
        return null;
    }

    return (
        <div
            className='dropdown-section'
            key={props.sectionIndex}>
            {
                props.sectionData.headerMessage &&
                <div className='message'>
                    <i>{props.sectionData.headerMessage}</i>
                </div>
            }
            {
                props.sectionData.rows.map((rowData, rowIndex) => {
                    const isSelected = props.selectedItemPosition.rowIndex === rowIndex &&
                        props.selectedItemPosition.sectionIndex === props.sectionIndex;

                    const itemPosition = {
                        rowIndex,
                        sectionIndex: props.sectionIndex,
                    } as DropdownItemPosition;

                    return (
                        <DropdownRowComponent
                            item={rowData}
                            itemIndex={itemPosition}
                            isSelected={isSelected}
                            getItemId={props.getItemId}
                            onRowClick={props.onRowClick}
                            onMouseEnter={props.onRowMouseEnter}
                            key={rowIndex}
                            />
                    );
                })
            }
        </div>
    );
};

function DropdownRowComponent(props: {
    item: DropdownRow,
    itemIndex: DropdownItemPosition,
    isSelected: boolean,
    getItemId(index: DropdownItemPosition): string,
    onRowClick(item: DropdownRow): void,
    onMouseEnter(index: DropdownItemPosition): void
}): JSX.Element {
    return (
        <div
            id={props.getItemId(props.itemIndex)}
            role='option'
            className={props.isSelected ? 'search-item selected' : 'search-item'}
            onMouseDown={() => props.onRowClick(props.item)}
            onMouseEnter={() => props.onMouseEnter(props.itemIndex)}
            key={props.item.text}
            >
            <span className={props.item.iconCssClass}/>
            <RowText
                text={props.item.text}
                highlightTextIndices={props.item.matchingIndices}
                highlighterClass='text-highlight'/>
        </div>
    );
}

/**
 * Marked export to make RowText component testable
 */
export interface RowTextProps {
    text: string;
    highlighterClass?: string;
    highlightTextIndices?: number[];
}

/**
 * Marked export to make RowText component testable
 */
export interface RowTextSubItem {
    text: string;
    highlight: boolean;
}

/**
 * Marked export to make RowText component testable
 */
export class RowText extends React.Component<RowTextProps, {}> {
    public render(): JSX.Element {
        return (
            <span>
                {
                    RowText._format(this.props.text, this.props.highlightTextIndices).map((item, index) =>
                        <span
                            className={item.highlight ? this.props.highlighterClass : ''}
                            key={item.text + index.toString()}>
                            {item.text}
                        </span>
                    )
                }
            </span>
        );
    }

    public shouldComponentUpdate(nextProps: RowTextProps): boolean {
        return this.props.highlighterClass !== nextProps.highlighterClass ||
            this.props.text !== nextProps.text ||
            this.props.highlightTextIndices !== nextProps.highlightTextIndices;
    }

    /**
     * Divides the string based upon the indices that are to be highlighted. Each created subItem has a propety 
     * 'highlight' which signifies whether to highlight it or not.
     * Eg. Let's say text = 'Hello', matchingIndices = [2, 3]. Then this method will return three items with text = 'He', 'll', 'o'. 
     * And highlight will be set to true for 'll'.
     */
    private static _format(text: string, matchingIndices?: number[]): RowTextSubItem[] {
        if (!text || !text.length) {
            throw new Error('Text of dropdown item can not be null');
        }

        let nextSubItemStartIndex = 0;
        const formattedData: RowTextSubItem[] = [];
        matchingIndices = matchingIndices || [];

        for (let i = 0; i < matchingIndices.length; i++) {
            if (nextSubItemStartIndex !== matchingIndices[i]) {
                formattedData.push(this._createItem(text, nextSubItemStartIndex, matchingIndices[i], false));
                nextSubItemStartIndex = matchingIndices[i];
            }

            while (i < matchingIndices.length && matchingIndices[i] + 1 === matchingIndices[i + 1]) {
                ++i;
            }

            formattedData.push(this._createItem(text, nextSubItemStartIndex, matchingIndices[i] + 1, true));
            nextSubItemStartIndex = matchingIndices[i] + 1;
        }

        if (nextSubItemStartIndex < text.length) {
            formattedData.push(this._createItem(text, nextSubItemStartIndex, text.length, false));
        }

        return formattedData;
    }

    private static _createItem(text: string, start: number, end: number, highlight: boolean): RowTextSubItem {
        return {
            text: text.substring(start, end),
            highlight,
        };
    }
}
