import * as React from "react";
import { ResultsViewConstants } from "Search/Scenarios/WorkItem/Constants";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { domElem } from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!Search/Scenarios/WorkItem/Components/LeftPane/Tags";

export interface Tag {
    displayName: string;

    fullTagName: string;

    isOverflowElement: boolean;

    style: IDictionaryStringTo<string>;
}

export interface TagsMetadataProps {
    tagsWithHighlights: string[];

    otherTags: string[];
}

export interface TagsMetadataState {
    availableWidth: number;
}

export class Tags extends React.Component<TagsMetadataProps, TagsMetadataState>  {
    private divRef: HTMLElement;

    constructor(props: TagsMetadataProps) {
        super(props);
        this.state = {
            availableWidth: null
        };
    }

    public render() {
        let tagsToRenderList: Tag[] = [];
        if (this.state.availableWidth) {
            let i: number, $tag: JQuery,
                tagsRendered = 0,
                remainingWidth = this.state.availableWidth - 30, // 30px for accomodating overflow controls;
                shouldRenderMoreTags: boolean = true;
            const _$offscreenTagsContainer = $(domElem("div")).css(
                {
                    "top": -5000,
                    "left": -5000,
                    "position": "absolute",
                    "width": (this.state.availableWidth - 30).toString() + "px"
                }).appendTo(document.body),
                getTagsToRenderDelegate = (tagsList: Array<string>, _$offscreenTagsContainerObject: JQuery, needHighlight: boolean) => {
                    let renderedTagsArray: Tag[] = [];
                    for (i = 0; i < tagsList.length; i++) {
                        // strip of <highlight> tags
                        const _name = needHighlight ? tagsList[i].replace(ResultsViewConstants.HighlightRegex, "") : tagsList[i],
                            _normalizedNameValue = normalizeName(_name, 30);
                        $tag = renderTag(_name, needHighlight, _normalizedNameValue);
                        _$offscreenTagsContainerObject.append($tag);
                        if (remainingWidth - $tag.find(".tag-container").outerWidth() - 5 > 0) { // adjusted for margin.                    
                            remainingWidth -= $tag.find(".tag-container").outerWidth() - 5;
                            $tag.remove();
                            renderedTagsArray.push({
                                displayName: _normalizedNameValue ? _normalizedNameValue : _name,
                                fullTagName: _name,
                                isOverflowElement: false,
                                style: {
                                    fontWeight: needHighlight ? "600" : "normal"
                                }
                            });

                            tagsRendered += 1;
                        }
                        else {
                            shouldRenderMoreTags = false;
                            break;
                        }
                    }

                    return renderedTagsArray;
                };

            tagsToRenderList = getTagsToRenderDelegate(this.props.tagsWithHighlights, _$offscreenTagsContainer, true);
            if (shouldRenderMoreTags) {
                tagsToRenderList = tagsToRenderList.concat(getTagsToRenderDelegate(this.props.otherTags, _$offscreenTagsContainer, false));
            }

            _$offscreenTagsContainer.remove();

            // tags overflow. Draw ellipsis control
            const totalLength = this.props.tagsWithHighlights.length + this.props.otherTags.length;
            if (totalLength > tagsRendered) {
                const remainingTags = this.props.tagsWithHighlights
                    .concat(this.props.otherTags)
                    .splice(tagsRendered, totalLength - tagsRendered);
                tagsToRenderList.push({
                    displayName: ResultsViewConstants.Ellipsis,
                    fullTagName: remainingTags.join(";").replace(ResultsViewConstants.HighlightRegex, "").trim(),
                    isOverflowElement: true,
                    style: {}
                });
            }
        }
        return (
            <td className="work-item-snippet-tags-column" style={{ width: "100%" }}
                ref={(htmlElementRef) => {
                    this.divRef = htmlElementRef;
                }}>
                <div style={{ whiteSpace: "nowrap", height: "16px" }}>
                    <div className="tags-name">
                        <div className="tags-items-container">
                            <ul>
                                {
                                    tagsToRenderList.map((v, i) => {
                                        const className = "tag-item" + (v.isOverflowElement ? "tags-overflow" : "");
                                        return (
                                            <li className={className}
                                                key={i}>
                                                <span className="tag-container" dir="ltr">
                                                    <TooltipHost
                                                        content={v.fullTagName}
                                                        overflowMode={TooltipOverflowMode.Self}
                                                        directionalHint={DirectionalHint.bottomCenter}>
                                                        <span className="tag-box" dir="ltr" style={v.style}>
                                                            {v.displayName}
                                                        </span>
                                                    </TooltipHost>
                                                </span>
                                            </li>
                                        );
                                    })
                                }
                            </ul>
                        </div>
                    </div>
                </div>

            </td>
        );
    }

    public componentDidMount() {
        const availableWidth = this.divRef ? this.divRef.clientWidth : 0;
        this.setState({
            availableWidth: availableWidth
        });
    }
}

function renderTag(fullTagName: string, needHighlight: boolean, displayTagName?: string): JQuery {
    var $tag: JQuery,
        $tagItem: JQuery,
        $tagBox: JQuery,
        $tagContainer: JQuery;

    // use the full tag name as the display name if display name is not specified.
    if (!displayTagName) {
        displayTagName = fullTagName;
    }

    $tagItem = $(domElem("li", "tag-item"))
    $tagContainer = $(domElem("span", "tag-container")).attr("dir", "ltr");
    $tagBox = $(domElem("span", "tag-box"))
        .attr("dir", "ltr")
        .text(displayTagName)
        .css("font-weight", needHighlight ? "bold" : "normal");;
    $tagContainer.append($tagBox);

    $tagContainer.appendTo($tagItem);

    return $tagItem;
}

function normalizeName(name: string, limit: number): string {
    var normalized = name;
    if (name.length > limit) {
        normalized = name.substring(0, limit - 4) + ResultsViewConstants.Ellipsis;
    }
    return normalized;
}