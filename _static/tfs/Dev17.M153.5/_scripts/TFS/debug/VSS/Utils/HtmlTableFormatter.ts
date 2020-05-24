import * as Utils_String from "VSS/Utils/String";

export interface IHtmlTableFormatterColumn {
    /**
     * Index of the column
     */
    index: number;

    /**
     * Name of the column
     */
    name: string;

    /**
     * True to disable HTML encoding and treat cell values of the column as HTML (default is treat as text)
     */
    isValueHtml?: boolean;
}

export interface ITableFormatterOptions {
    /**
     * Optional HTML text to extend at the end.
     */
    extendedHtml?: string;
}

export class HtmlTableFormatter {
    private static readonly HEADER_BACKGROUND_COLOR = "background-color: #106EBE;";
    private static readonly HEADER_COLOR = "color: white;";
    private static readonly FONT_SIZE = "font-size: 11pt;";
    private static readonly FONT_FAMILY = "font-family: Calibri, sans-serif;";
    private static readonly BORDER_COLLAPSE = "border-collapse: collapse;";
    private static readonly COLUMN_BORDER = "border: 1px solid white;";
    private static readonly COLUMN_VERTICAL_ALIGN = "vertical-align: top;";
    private static readonly COLUMN_PADDING = "padding: 1.45pt .05in;"
    private static readonly ROW_BACKGROUND_COLOR = "background-color: #FFFFFF";
    private static readonly ROW_ALT_BACKGROUND_COLOR = "background-color: #F8F8F8";
    private static readonly COLUMN_STYLE = HtmlTableFormatter.COLUMN_BORDER + HtmlTableFormatter.COLUMN_VERTICAL_ALIGN + HtmlTableFormatter.COLUMN_PADDING;
    private static readonly HEADER_STYLE = HtmlTableFormatter.HEADER_BACKGROUND_COLOR + HtmlTableFormatter.HEADER_COLOR;
    private static readonly TABLE_STYLE = HtmlTableFormatter.FONT_FAMILY + HtmlTableFormatter.FONT_SIZE + HtmlTableFormatter.BORDER_COLLAPSE;

    constructor(protected _rows: string[][], protected _columns: IHtmlTableFormatterColumn[], protected _options?: ITableFormatterOptions) { }

    protected _getCellValue(rowIndex: number, column: IHtmlTableFormatterColumn): string {
        return this._rows[rowIndex][column.index];
    }

    // keep this private and getHtml should call this method instead of _getCellValue to prevent security vulnerabilities
    private _getSafeCellValue(rowIndex: number, column: IHtmlTableFormatterColumn): string {
        const cellValue = this._getCellValue(rowIndex, column);
        const htmlValue = column.isValueHtml ? cellValue : Utils_String.htmlEncode(cellValue);

        // Chrome has a bug where it applies incorrect CSS on clipboard copy if a <td> is empty
        return htmlValue === "" ? "&nbsp;" : htmlValue;
    }

    /**
     * Iterates through the rows and builds a HTML table containing the results.
     * @return HTML table containing all rows and all columns
     */
    public getHtml(): string {
        if (this._rows.length === 0 || this._columns.length === 0) {
            return "<div></div>";
        }

        const headerRows = this._columns.map(c => `<th style="${HtmlTableFormatter.COLUMN_STYLE}">${Utils_String.htmlEncode(c.name)}</th>`);
        const tableHeader = `<thead style="${HtmlTableFormatter.HEADER_STYLE}"><tr>${headerRows.join(Utils_String.empty)}</tr></thead>`;
        const tableRows = this._rows.map((r, rowIndex) => {
            const rows = this._columns.map(c => `<td style="${HtmlTableFormatter.COLUMN_STYLE}">${this._getSafeCellValue(rowIndex, c)}</td>`);
            const rowStyle = rowIndex % 2 ? HtmlTableFormatter.ROW_ALT_BACKGROUND_COLOR : HtmlTableFormatter.ROW_BACKGROUND_COLOR;

            return `<tr style="${rowStyle}">${rows.join(Utils_String.empty)}</tr>`;
        });
        const tableBody = `<tbody>${tableRows.join(Utils_String.empty)}</tbody>`;
        const extendedSection = this._options && this._options.extendedHtml ?
            `<div style="${HtmlTableFormatter.FONT_FAMILY + HtmlTableFormatter.FONT_SIZE}">${this._options.extendedHtml}</div>` : Utils_String.empty;
        return `<div><table border="0" cellpadding="0" cellspacing="0" style="${HtmlTableFormatter.TABLE_STYLE}">${tableHeader}${tableBody}</table>${extendedSection}</div>`;
    }
}
