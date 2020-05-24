/// <reference types="react" />

import * as React from "react";

import { ColumnActionsMode, IColumn } from "OfficeFabric/DetailsList";

export const HighContrastSelectionClass: string = "high-contrast-is-selected";

export interface ICellIndex {
    rowIndex: number;
    columnKey: string;
}

export enum ContentType {
    SimpleText = 0,
    PasswordText,
    JsxElement
}

export interface IFlatViewCell {
    content: string | JSX.Element;
    contentType: ContentType;
    contentHasErrors?: boolean;
    cssClass?: string;
    controlIcon?: string;
    controlTitle?: string;
    controlClickCallback?: (cellIndex?: ICellIndex) => void;

    /**
     * Only applicable for contentTypes SimpleText and PasswordText
     */
    isTextDisabled?: boolean;
    placeHolder?: string;
    ignoreParentHighlight?: boolean;
    ariaLabel?: string;
}

export interface IFlatViewColumn {
    key: string;
    name: string;
    minWidth?: number;
    maxWidth?: number;
    isFixedColumn?: boolean;
    isIconOnly?: boolean;
    iconName?: string;
    iconClassName?: string;
    onColumnClick?: (ev?: React.MouseEvent<HTMLElement>, column?: IColumn) => any;
    isSortedDescending?: boolean;
    isSorted?: boolean;
    headerClassName?: string;
    columnActionsMode?: ColumnActionsMode;
    isMultiline?: boolean;
    ariaLabel?: string;
}

export interface IFlatViewTableRow {
    cells: IDictionaryStringTo<IFlatViewCell>;
    rowAriaLabel?: string;
}