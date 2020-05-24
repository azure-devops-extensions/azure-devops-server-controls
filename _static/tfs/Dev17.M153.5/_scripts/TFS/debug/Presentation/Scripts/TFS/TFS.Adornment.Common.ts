export interface Adornment {
    /* ID.  Optional, for adornment providers to be notified of events on an adornment (e.g. status change) */
    id?: number;
    /** Adornment type */
    adornmentType: AdornmentType;
    /** The file to display the adornment on, if the path is known */
    path?: string;
    /** If in a diff viewer, displays the adornment on the original side versus the modified side. */
    isOriginalSide?: boolean;
    /** If set, specifies how a glyph for the adornment is displayed in the overview ruler (right gutter). */
    overviewRuler?: OverviewRulerOptions;
    /** Status options available. If statusOptions is null, no status menu will be displayed. */
    statusOptions?: StatusOption[];
    /** Current status.  If not specified, and statusOptions is specified, the first entry in statusOptions will be displayed. */
    statusId?: string;
    /** Options for showing in the change explorer */
    changeExplorer?: ChangeExplorerOptions;
    /** If true, glyphMargin is enabled on editor */
    usingGlyphMargin?: boolean;
}

export interface ChangeExplorerOptions {
    /** Text to display in the grid item */
    name: string;
    /** Tooltip to display on the grid item */
    tooltip: string;
    /** CSS class for the icon displayed next to the grid item */
    iconClass: string;
}

export interface StatusOption {
    /** ID of the status option */
    id: string;
    /** Text to be displayed in the status dropdown */
    text: string;
    /** Tooltip for the status.  If not specified, text will be used */
    title?: string;
}

export interface CommentStyleAdornment extends Adornment {
    /** Line to display the adornment under. */
    line: number;
    /** Text to display in the body of the adornment. */
    text: string;
    /** The "author" of the adornment.  The author may not be an actual user, e.g. "Code Analysis" or "Test Runner". */
    author: string;
    /** URL to an image to display as the author */
    authorImageUrl: string;
}

export interface GutterAdornment extends Adornment {
    /** Line the decoration starts on */
    startLine: number;
    /** Line the decoration ends on */
    endLine: number;
    /** CSS class for adornment element */
    className: string;
    /** Show line number in the adornment html */
    showLineNumber: boolean;
    /** HTML element that will be appended as a child to the gutter adornment element */
    htmlDecoration?: HTMLElement;
}

export interface DecorationAdornment extends Adornment {
    /** Line the decoration starts on */
    startLine: number;
    /** Line the decoration ends on */
    endLine: number;
    /** Column the decoration starts on */
    startColumn: number;
    /** Column the decoration ends on */
    endColumn: number;
    /* CSS class that the decoration should be styled as (gets translated to inlineClassName) */
    className: string;
    /* CSS class that the decoration should be styled as (gets translated to className) */
    actualClassName?: string;
    /** CSS class that the glyph margin should be styled as */
    glyphMarginClassName?: string;
    /** Text that shows up on hover of the glyph in the glyph margin */
    glyphMarginText?: string;
    /** CSS class that the line number should be styled as */
    linesDecorationsClassName?: string;
    /** If set, the editor will scroll to the adornment after loading (search shell uses this) */
    scrollToAdornment?: boolean;
    /** If set, the editor adornment will have isWholeLine passed to addDecoration()'s second param */
    isWholeLine?: boolean;
}

export interface OverviewRulerOptions {
    /**
	* CSS color to render in the overview ruler.
	* e.g.: rgba(100, 100, 100, 0.5)
	*/
    color: string;
    /** The position in the overview ruler. */
    position: OverviewRulerLane;
}

/** Vertical lane in the overview ruler of the editor. */
export enum OverviewRulerLane {
    Left = 1,
    Center = 2,
    Right = 4,
    Full = 7
}

/** Type of adornment to be displayed */
export enum AdornmentType {
    UNKNOWN,
    /* An adornment that looks like a comment */
    COMMENTSTYLE,
    /* A decoration (css style) on a selection of text */
    DECORATION,
    /* Adornments enabled in the gutter */
    GUTTER
}

/** Data for the event fired by AdornmentProviderCommunicator when adornments are updated */
export interface AdornmentsUpdateEventData {
    currentAdornments: Adornment[];
}
