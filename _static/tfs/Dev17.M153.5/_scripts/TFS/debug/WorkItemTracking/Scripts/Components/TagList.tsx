import "VSS/LoaderPlugins/Css!WorkItemTracking/Components/TagList";

import * as Array_Utils from "VSS/Utils/Array";
import * as Diag from "VSS/Diag";
import * as React from "react";
import * as TagConstants from "WorkItemTracking/Scripts/TFS.UI.Tags.Constants";
import { TooltipHost, ITooltipHostProps, TooltipOverflowMode } from "VSSUI/Tooltip";
import { autobind, getRect, IRectangle } from "OfficeFabric/Utilities";

export interface ITagListProps {
    /**
     * Cache object for tag widths (when used in a grid, we can cache the widths for all the rows).
     */
    tagWidthsCache: IDictionaryStringTo<number>;

    /**
     * Tags to render.
     */
    tags: string[] | ITag[];

    /**
     * Max width for each tag. If not specified, will use TagList.DefaultTagMaxWidth.
     */
    tagMaxWidth?: number;

    /**
     * Max width for the tag list component.
     */
    maxWidth: number;
}

export interface ITag {
    /**
     * Value for the tag.
     */
    value: string;

    /**
     * Optional background color in HEX (e.g. #FF00AA).
     */
    foreColor?: string;

    /**
     * Optional background color in HEX (e.g. #FF00AA).
     */
    backgroundColor?: string;
}

interface ITagToShowInfo {
    totalWidth: number;
    totalTagsToShow: number;
    showEllipsis: boolean;
    ellipsisWidth: number;
}

export class TagList extends React.Component<ITagListProps, {}>{
    private static readonly DefaultPageSizeForTagsToCalculate = 5;
    private static readonly EllipsisTag: ITag = { value: TagConstants.TAG_ELLIPSIS };
    private static readonly HiddenStyle: React.CSSProperties = { visibility: "hidden" };

    private _uncalculatedTagElements: IDictionaryStringTo<HTMLElement> = {};
    private _forceUpdate: boolean = false;
    private _tagList: ITag[];
    private _lastExternalPendingTags: string[] = [];

    public static readonly DefaultTagMaxWidth: number = 100;

    constructor(props: ITagListProps) {
        super(props);

        this._updateTagList(props);
    }

    public render(): JSX.Element {
        const { maxWidth } = this.props;

        const info: ITagToShowInfo = this._getTagsToShowInfo(this._tagList, maxWidth);
        return (
            <ul className="tag-list" style={info ? null : TagList.HiddenStyle}>
                {info ? this._getTagElementsToShow(this._tagList, info, maxWidth) : this._getTagElementsToCalculate(this._tagList)}
            </ul>
        );
    }

    public shouldComponentUpdate(newProps: ITagListProps, newState: {}): boolean {
        return this.props.maxWidth != newProps.maxWidth || this.props.tags != newProps.tags || this.props.tagMaxWidth != newProps.tagMaxWidth;
    }

    public componentWillReceiveProps(newProps: ITagListProps) {
        this._updateTagList(newProps);
    }

    public componentDidMount(): void {
        this._saveNewWidths();
    }

    public componentDidUpdate(): void {
        this._saveNewWidths();
    }

    private _updateTagList(props: ITagListProps) {
        const { tags } = props;
        if (!tags || tags.length === 0) {
            this._tagList = [];
            return;
        }

        this._tagList = (typeof tags[0] === "string") ? (tags as string[]).map(value => ({ value } as ITag)) : tags as ITag[];
    }

    private _saveNewWidths(): void {
        const tags = Object.keys(this._uncalculatedTagElements);
        if (tags.length === 0 && !this._forceUpdate) {
            return;
        }

        for (const tag in this._uncalculatedTagElements) {
            const rect: IRectangle = getRect(this._uncalculatedTagElements[tag]);
            this.props.tagWidthsCache[tag] = rect.width;
        }
        this._uncalculatedTagElements = {};
        this._forceUpdate = false;
        this.forceUpdate(); // signal to call render to attempt to show tags now that we cached new widths

        Diag.Debug.logVerbose(`Forced updated TagList for ${tags.length} tags: ${tags.join(TagConstants.TAG_FORMATTING_SEPARATOR)}`);
    }

    private _createTagBlock(tag: ITag, onRefForCalculatingWidth: (ref: HTMLElement) => void = null, tooltip: string = null): JSX.Element {
        const {
            tagMaxWidth = TagList.DefaultTagMaxWidth
        } = this.props;

        const tooltipHostProps: ITooltipHostProps = { hostClassName: "tag-value", content: tag.value, overflowMode: TooltipOverflowMode.Self };
        if (tooltip) {
            tooltipHostProps.content = tooltip;
            tooltipHostProps.overflowMode = undefined;
        }
        const content = (
            <div className="tag-value-box" style={{ color: tag.foreColor, backgroundColor: tag.backgroundColor } as React.CSSProperties}>
                <TooltipHost {...tooltipHostProps}>{tag.value}</TooltipHost>
            </div>);

        return <li
            className="tag-item"
            key={tag.value}
            style={{ maxWidth: tagMaxWidth } as React.CSSProperties}
            data-tag={tag.value}
            ref={onRefForCalculatingWidth}>{content}</li>;
    }

    private _getTagElementsToShow(tags: ITag[], tagToShowInfo: ITagToShowInfo, viewportWidth: number): JSX.Element[] {
        const elementsToShow = [];
        if (tags.length === 0) {
            return elementsToShow;
        }

        const { totalTagsToShow, totalWidth, ellipsisWidth, showEllipsis } = tagToShowInfo;
        let finalTotalTagsToShow = totalTagsToShow;

        if (showEllipsis) {
            let totalWidthWithEllipsis = totalWidth + ellipsisWidth;
            while (finalTotalTagsToShow > 0 && totalWidthWithEllipsis > viewportWidth) {
                --finalTotalTagsToShow;
                totalWidthWithEllipsis -= this.props.tagWidthsCache[tags[finalTotalTagsToShow].value];
            }
        }

        for (let i = 0; i < finalTotalTagsToShow; ++i) {
            elementsToShow.push(this._createTagBlock(tags[i]));
        }

        if (showEllipsis) {
            // show the hidden tags as tooltip
            const tooltip = tags.slice(finalTotalTagsToShow).map(t => t.value).join(TagConstants.TAG_FORMATTING_SEPARATOR);
            elementsToShow.push(this._createTagBlock(TagList.EllipsisTag, null, tooltip));
        }

        return elementsToShow;
    }

    private _getTagElementsToCalculate(tags: ITag[]): JSX.Element[] {
        const elementsToCalculate: JSX.Element[] = [];
        const externalPendingTags: string[] = [];
        for (const tag of tags) {
            const cachedWidth: number = this.props.tagWidthsCache[tag.value];
            if (cachedWidth === null) {
                externalPendingTags.push(tag.value); // track externally calculated tags (from other TagList instance)
                continue;
            }

            if (cachedWidth === undefined) {
                this.props.tagWidthsCache[tag.value] = null; // so we don't queue up the same tag for calculation
                elementsToCalculate.push(this._createTagBlock(tag, this._onRefForUncalculatedElement));

                if (elementsToCalculate.length >= TagList.DefaultPageSizeForTagsToCalculate) {
                    break;
                }
            }
        }
        // only wait one render cycle for externally calculated tags to be available, otherwise we calculate them ourself
        // for DetailsList where rows are painted together via timer, pending tags are resolved after one render cycle
        Array_Utils.intersectPrimitives(this._lastExternalPendingTags, externalPendingTags).forEach(
            tag => elementsToCalculate.push(this._createTagBlock({ value: tag } as ITag, this._onRefForUncalculatedElement)));
        this._lastExternalPendingTags = externalPendingTags;

        // make sure to append the ellipsis to the tag list for width calculation if it hasn't been initialized
        if (this.props.tagWidthsCache[TagConstants.TAG_ELLIPSIS] === undefined) {
            this.props.tagWidthsCache[TagConstants.TAG_ELLIPSIS] = null;
            elementsToCalculate.push(this._createTagBlock(TagList.EllipsisTag, this._onRefForUncalculatedElement, TagConstants.TAG_ELLIPSIS));
        }

        this._forceUpdate = elementsToCalculate.length > 0 || externalPendingTags.length > 0;
        return elementsToCalculate;
    }

    @autobind
    private _onRefForUncalculatedElement(ref: HTMLElement): void {
        if (ref) {
            this._uncalculatedTagElements[ref.dataset.tag] = ref;
        }
    }

    // Gets info based on cache to help show tags. Null will be returned to indicate calculation is needed.
    private _getTagsToShowInfo(tags: ITag[], viewportWidth: number): ITagToShowInfo {
        if (tags.length === 0) {
            return { totalTagsToShow: 0, totalWidth: 0, ellipsisWidth: 0, showEllipsis: false };
        }

        const ellipsisWidth = this.props.tagWidthsCache[TagConstants.TAG_ELLIPSIS];
        if (!ellipsisWidth) {
            return null; // ellipsis hasn't been calculated
        }

        let totalTagsToShow = 0;
        let totalWidth = 0;
        for (const tag of tags) {
            const width = this.props.tagWidthsCache[tag.value];
            if (width == null) {
                return null; // additional tag widths need to be calculated
            }

            if (totalWidth + width > viewportWidth) {
                break; // peeking ahead with the current tag, there will be overflow so exit with the current amount of tags
            }

            totalWidth += width;
            ++totalTagsToShow;
            continue;
        }

        return { totalTagsToShow, totalWidth, ellipsisWidth, showEllipsis: totalTagsToShow < tags.length } as ITagToShowInfo;
    }
}
