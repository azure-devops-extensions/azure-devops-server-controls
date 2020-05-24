import { IAutocompleteSelectEvent, IAutocompleteSuggestEvent } from "Mention/Scripts/TFS.Social.Telemetry";

export interface IRange {
    start: number;
    end: number;
}

export interface IMentionArtifactContext {
    sourceArtifact: any;
    field: any;
    artifactType: any;
    artifactId: any;
}

export interface IAutocompletePluginOptions {
    menuContainer?: () => JQuery;
    positioningElement?: JQuery | (() => JQuery);
    textElement?: () => JQuery;
    menuMaxHeight?: number;
    isMenuWidthOverridable?: boolean;
    menuWidth?: number;

    /**
     * For JQuery autocomplete based controls (like the work item picker) allows
     * the dropdown to be positioned horizontally instead of being aligned
     * with the left edge of the positioning element.
     */
    allowHorizontalShift?: boolean;
    /**
     * Specifies whether or not the dropdown will try to use all remaining space below the positioning element.
     * and whether the hover for MRUs will be disabled.
     * For internal use only, this is specifically for the mobile work item form where we want to avoid iOS double-tap issue.
     * See #954521.
     * TODO: Ideally IdentityPicker should have two separate options for useRemainingSpace and supportHover
     * but for now we have only useRemainingSpace that control both.
     */
    useRemainingSpace?: boolean;
    select?(event: JQueryEventObject, replacement: IAutocompleteReplacement, telemetryProperties: IAutocompleteSelectEvent);
    focus?(event: JQueryEventObject, replacement: IAutocompleteReplacement);
    close?(event: JQueryEventObject, inputText: IInputText);
}

/**
 * Represents a plugin that implements functionality for a specific type of mentions.
 * @see JQueryAutocompletePlugin for #mentions.
 * @see PersonAutocompleteProvider for @mentions.
 */
export interface IAutocompletePlugin<TOptions extends IAutocompletePluginOptions> {
    getPluginName(): string;
    initialize();
    prefetch();
    canOpen(inputText: IInputText): IRange;
    open(event: JQueryEventObject, inputText: IInputText): void;
    suggest(event: JQueryEventObject, inputText: IInputText): PromiseLike<IResultWithTelemetry<{}, IAutocompleteSuggestEvent>>;
    close(event: JQueryEventObject, inputText: IInputText);
    handle(event: JQueryEventObject): boolean | void;
    dispose();
}

export interface IInputText {
    textBeforeSelection: string;
    textInSelection: string;
    textAfterSelection: string;
}

export interface ITruncatedInputText extends IInputText {
    truncatedTextLength: number;
}

export interface IAutocompleteReplacement {
    getPlainText(): IInputText;
    getHtml(): string;
}

export interface ISearchResult<TArtifact> {
    original: TArtifact;
    highlighted: TArtifact;
}

export interface IResultWithTelemetry<TResult, TTelemetry> {
    result: TResult;
    telemetry: TTelemetry;
}

export enum MentionType {
    WorkItem
}