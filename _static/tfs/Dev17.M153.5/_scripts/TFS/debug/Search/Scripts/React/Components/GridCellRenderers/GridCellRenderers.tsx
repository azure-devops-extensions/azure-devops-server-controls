/// Copyright (c) Microsoft Corporation. All rights reserved.
/// <reference types="react" />
/// <reference types="react-dom" />

"use strict";

import * as React from "react";
import * as Search_Strings from "Search/Scripts/Resources/TFS.Resources.Search";
import { VersionControlType } from "Search/Scripts/Contracts/TFS.Search.Base.Contracts";
import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";
import { Link } from "OfficeFabric/Link";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { ActionCreator } from "Search/Scripts/React/ActionCreator";
import { ItemContextualMenuButton } from "Search/Scripts/React/Components/ItemContextualMenu/ItemContextualMenu";
import { htmlEncode, ignoreCaseComparer } from "VSS/Utils/String";
import { domElem } from "VSS/Utils/UI";
import { HASH_GLOBAL_REGEX, Utils } from "Search/Scripts/Providers/WorkItem/TFS.Search.WorkItem.Common";
import { CodeUtils } from "Search/Scripts/Providers/Code/TFS.Search.CodeUtils";
import { WorkItemTypeIcon, IWorkItemTypeIconProps } from "Presentation/Scripts/TFS/Components/WorkItemTypeIcon";

export interface GridCellRenderProps {
    item: any;
    index: number;
    columnData: any;
}

import "VSS/LoaderPlugins/Css!Search/React/Components/GridCellRenderers";

export interface CodeSearchGridCellRenderState {
    isContextualMenuOpen: boolean;
}

export var CodeSearchGridCellRenderer: React.StatelessComponent<GridCellRenderProps> = (props: GridCellRenderProps) => {
    if ($.isEmptyObject(props.item)) {
        return (
            <div className="code-search-cell">
                <div className="cell-content">
                    <div className="center-align">
                        <Link className="show-more-results"
                            aria-label={Search_Strings.ShowMoreResults}
                            onClick={() => props.columnData.actionCreator.fetchMoreItems(this)} >
                            {Search_Strings.ShowMoreResults}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }
    else {
        // render code search results
        let fileName = props.item.fileName,
            project = props.item.project,
            hitCount = props.item.matches["content"].length,
            // Hit count is capped to 100 from backend due to perf issues, so for hit count 100 we need to show 100+ matches
            hitsMessage = hitCount > 0 && (hitCount >= SearchConstants.MaxHitsToHighlight
                ? SearchConstants.MaxHitsToHighlight.toString() + "+ " + Search_Strings.MatchCount
                : hitCount.toString() + " " + (hitCount > 1
                    ? Search_Strings.MatchCount
                    : Search_Strings.SingleMatchCount)),
            isCustomVC = props.item.vcType === VersionControlType.Custom,
            fileLink = CodeUtils.constructLinkToContent(props.item),
            repoNameRequired = props.item.vcType === VersionControlType.Git ||
                props.item.vcType === VersionControlType.Custom;
        let projectRepoName = repoNameRequired ? project + " > " + props.item.repository : project;

        let horizontalSplitView: JSX.Element =
            <div className="code-search-cell">
                <div className="cell-header">
                    <span className="file-info">
                        <TooltipHost
                            content={Search_Strings.ResultCellFileNameToolTip.replace("{0}", fileName)}
                            directionalHint={DirectionalHint.bottomCenter}>
                            <span className={"file-name " + (isCustomVC ? "custom-vc" : "")}>{fileName}</span>
                            {
                                !isCustomVC &&
                                <a className="file-link"
                                    href={fileLink}
                                    target="_blank">{fileName}</a>
                            }
                        </TooltipHost>
                        <TooltipHost
                            overflowMode={TooltipOverflowMode.Self}
                            content={projectRepoName}
                            directionalHint={DirectionalHint.bottomCenter}>
                            <span className="project-repo-info">{projectRepoName}</span>
                        </TooltipHost>
                    </span>
                    <span className="hits">{hitsMessage}</span>
                </div>
                <div className="cell-content">
                    <div className="text-content-container">
                        <TooltipHost
                            overflowMode={TooltipOverflowMode.Parent}
                            content={props.item.path}
                            directionalHint={DirectionalHint.bottomLeftEdge}>
                            <span>{props.item.path}</span>
                        </TooltipHost>
                    </div>
                    <ItemContextualMenuButton actionCreator={props.columnData.actionCreator} storesHub={props.columnData.storesHub} item={props.item} index={props.index} />
                </div>
            </div>;

        // arrangements of items is different when split orientation is vertical.
        let verticalSplitView =
            <div className="code-search-cell">
                <span className="cell-header">
                    <span className="file-info">
                        <TooltipHost
                            content={Search_Strings.ResultCellFileNameToolTip.replace("{0}", fileName)}
                            directionalHint={DirectionalHint.bottomCenter}>
                            <span className={"file-name " + (isCustomVC ? "custom-vc" : "")}>{fileName}</span>
                            {
                                !isCustomVC &&
                                <a className="file-link"
                                    href={fileLink}
                                    target="_blank">{fileName}</a>
                            }
                        </TooltipHost>
                        <TooltipHost
                            overflowMode={TooltipOverflowMode.Self}
                            content={repoNameRequired ? project + " > " + props.item.repository : project}
                            directionalHint={DirectionalHint.bottomCenter}>
                            <span className="project-repo-info">{
                                repoNameRequired ? project + " > " + props.item.repository : project
                            }</span>
                        </TooltipHost>
                    </span>
                </span>
                <ItemContextualMenuButton actionCreator={props.columnData.actionCreator} storesHub={props.columnData.storesHub} item={props.item} index={props.index} />
                <div className="cell-content">
                    <div className="text-content-container">
                        <TooltipHost
                            overflowMode={TooltipOverflowMode.Parent}
                            content={props.item.path}
                            directionalHint={DirectionalHint.bottomCenter}>
                            <span>{props.item.path}</span>
                        </TooltipHost>
                    </div>
                </div>
                <span className="hits">{hitsMessage}</span>
            </div>;

        return props.columnData.previewOrientation === "bottom" ? verticalSplitView : horizontalSplitView;
    }
}

const WHITE_SPACE_REGEX = /(\s+)/g;
const HIT_HIGHT_LIGHT_HTML_ENCODED_START_TAG_REGEX = /(&lt;highlighthit&gt;)/gi;
const HIT_HIGHT_LIGHT_HTML_ENCODED_END_TAG_REGEX = /(&lt;\/highlighthit&gt;)/gi;
const HIGHLIGHTSTARTTAG = "<highlighthit>";
const HIGHLIGHTENDTAG = "</highlighthit>";
const AVATAR_ALIAS_HIT_REGEX = /<<highlighthit\s*[\/]?>([\w\.]+)<\s*[\/]highlighthit>@[<>\/\w\.]+>/;
const ASSIGNED_TO_EMAIL_REGEX = /(<[\/<>\w\.]+@[\/<>\w\.]+>)/g;
const HIGHLIGHT_REGEX = /(<highlighthit\s*[\/]?>)|(<\s*[\/]highlighthit>)/gi;
const ELLIPSIS = "...";
const METADATAFIELDS: Array<string> = [
    "system.state",
    "system.id",
    "system.assignedto",
    "system.tags",
    "system.title",
    "system.workitemtype"];

const FIELD_NAME_TO_DISPLAY_NAME = {
    "history": "Discussion"
};
const AVATAR_WIDTH = 130;
const AVATAR_COLON_WIDTH = 160;
const SNIPPET_COLMN_WIDTH = 100;
const AVATAR_COLMN_HEIGHT = 16;
const WIDTH_FOR_EACH_DIGIT = 8;
const BUFFER_WIDTH_FOR_WORK_ITEM_ID = 3;

export var WorkItemSearchGridCellRenderer: React.StatelessComponent<GridCellRenderProps> = (props: GridCellRenderProps) => {
    let aggregatedHits = {},
        item = props.item,
        workItemId: string = item.flattenFields["system.id"] ? item.flattenFields["system.id"].value : null,
        // Calculating width for the work item ID by giving each digit 8px size and a buffer of 3px
        idWidth = ((props.columnData.optionalResultsMetadata["maxDigitsInWorkItemId"]) * WIDTH_FOR_EACH_DIGIT) + BUFFER_WIDTH_FOR_WORK_ITEM_ID;
    item.hits.forEach((hit, index) => {
        aggregatedHits[hit.fieldReferenceName] ?
            aggregatedHits[hit.fieldReferenceName].highlights.concat(hit.highlights) :
            aggregatedHits[hit.fieldReferenceName] = {
                "fieldName": hit.fieldName,
                "highlights": hit.highlights
            };
    });

    return (
        <div className="search-workitem-snippet-outerdiv">
            <div className="search-workitem-snippet-maindiv">
                <WorkItemSearchGridCellHeader
                    availableWidth={props.columnData.availableWidth}
                    item={props.item}
                    aggregatedHits={aggregatedHits}
                    idWidth={idWidth} />
                <WorkItemSearchGridCellMetadataSection
                    item={props.item}
                    colorsData={props.columnData.data}
                    aggregatedHits={aggregatedHits}
                    availableWidth={props.columnData.availableWidth} />
                <WorkItemSearchGridCellSummarySection
                    item={props.item}
                    aggregatedHits={aggregatedHits}
                    cache={props.columnData.cache}
                    availableWidth={props.columnData.availableWidth} />
            </div>
        </div>
    );
}

export interface IWorkItemSearchGridCellHeaderProps {
    item: any;
    aggregatedHits: any;
    availableWidth: number;
    idWidth: number;
}

export interface IWorkItemSearchGridCellMetadataSectionProps {
    item: any;
    aggregatedHits: any;
    availableWidth: number;
    colorsData: any;
}

export interface IWorkItemSearchGridCellSummarySectionProps {
    aggregatedHits: any;
    availableWidth: number;
    item: any;
    cache: any;
}

export interface IWorkItemSearchGridCellTagsMetadataProps {
    tagsWithHighlights: string[];
    otherTags: string[];
    availableWidth: number;
}

interface IWorkItemSearchGridCellSummaryComponentProps {
    fragmentFieldReferenceNames: string[];
    fragments: any;
}

export class WorkItemSearchGridCellHeader extends React.Component<IWorkItemSearchGridCellHeaderProps, {}> {
    public render(): JSX.Element {
        let item: any = this.props.item,
            aggregatedHits: any = this.props.aggregatedHits,
            _idValue: string = _getFieldValue(item.flattenFields, "system.id"),
            _titleValue: string = _getFieldValue(item.flattenFields, "system.title"),
            _titleDivHtmlText: string = _sanitizeHtml(aggregatedHits["system.title"] ? aggregatedHits["system.title"]["highlights"][0] : _titleValue),
            _idText: string = aggregatedHits["system.id"] ? aggregatedHits["system.id"]["highlights"][0] : _idValue,
            projectName: string = item.project,
            hasCustomInput = typeof projectName !== "string",
            workItemIconProps: IWorkItemTypeIconProps = {
                workItemTypeName: _getFieldValue(item.flattenFields, "system.workitemtype"),
                projectName: hasCustomInput ? null : projectName as string
            };

        return (
            <div className="work-item-snippet-header">
                <div className="work-item-id-title">
                    <span>
                        <WorkItemTypeIcon {...workItemIconProps}> </WorkItemTypeIcon>
                    </span>
                    <span>
                        <TooltipHost
                            content={_idValue}
                            overflowMode={TooltipOverflowMode.Parent}
                            directionalHint={DirectionalHint.bottomCenter}>
                            <div className="workitem-id" dangerouslySetInnerHTML={{ __html: _idText }} style={{ width: this.props.idWidth + "px" }} />
                        </TooltipHost>
                    </span>
                    <span className="overflow">
                        <TooltipHost
                            content={_titleValue}
                            overflowMode={TooltipOverflowMode.Parent}
                            directionalHint={DirectionalHint.bottomCenter}>
                            <div className="workitem-title"
                                dangerouslySetInnerHTML={{ __html: _titleDivHtmlText }} />
                        </TooltipHost>
                    </span>
                </div>
            </div>
        );
    }
}

export class WorkItemSearchGridCellMetadataSection extends React.Component<IWorkItemSearchGridCellMetadataSectionProps, {}> {
    public render(): JSX.Element {
        let item = this.props.item,
            aggregatedHits = this.props.aggregatedHits,
            availableWidth = this.props.availableWidth - 20; // adjusted for margin.
        // state and color
        let _workItemId: string = _getFieldValue(item.flattenFields, "system.id"),
            _workItemType: string = _getFieldValue(item.flattenFields, "system.workitemtype"),
            _stateValue: string = _getFieldValue(item.flattenFields, "system.state"),
            _stateHtmlText: string = aggregatedHits["system.state"] ? aggregatedHits["system.state"]["highlights"][0] : _stateValue,
            _stateCircleColor: any,
            _stateCircleStyle = {},
            _stateStyle: any = {
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
            };

        if (this.props.colorsData && this.props.colorsData.statesColorMap) {
            _stateCircleColor = Utils.getStateCircleColor(_workItemId, this.props.colorsData.statesColorMap);
        }

        if (_stateCircleColor && _stateCircleColor.border && _stateCircleColor.fill) {
            let fillColor: string = _stateCircleColor.fill.replace(HASH_GLOBAL_REGEX, "");
            _stateCircleStyle["borderColor"] = "#" + _stateCircleColor.border.replace(HASH_GLOBAL_REGEX, "");
            _stateCircleStyle["backgroundColor"] = ignoreCaseComparer(fillColor, "ffffff") === 0 ? "transparent" : "#" + fillColor;
        }

        // avatar name and image
        let _avatarNameValue: string = _getFieldValue(item.flattenFields, "system.assignedto"),
            _avatarNameHtmlText: string = aggregatedHits["system.assignedto"] ? aggregatedHits["system.assignedto"]["highlights"][0] : _avatarNameValue,
            _isAliasHit: boolean = _avatarNameHtmlText.search(AVATAR_ALIAS_HIT_REGEX) > -1,
            _filteredText: any = _removeAlias(_avatarNameHtmlText),
            _avatarName: string = _filteredText === "" ? Search_Strings.Unassigned : _filteredText,
            _fontWeight: any = _isAliasHit && _filteredText ? "bold" : "normal",
            _avatarNameCssProps = {
                fontWeight: _fontWeight,
                width: AVATAR_WIDTH + "px"
            },

            // tags
            _tagsHitText: string = aggregatedHits["system.tags"] ? aggregatedHits["system.tags"]["highlights"][0] : null,
            _tagsValue: string = _getFieldValue(item.flattenFields, "system.tags"),
            _searchHitsInTags: boolean = !!_tagsHitText,
            _tagsHtmlText: string = _searchHitsInTags ? _tagsHitText : _tagsValue,
            _tagsListWithHighligtedContentInFront = new Array<any>(),
            _otherTags = new Array<any>();

        if (_tagsHtmlText) {
            let _tagsList: Array<string> = _tagsHtmlText.split(/[;,]/);
            for (var tagIndex in _tagsList) {
                if (_tagsList[tagIndex]) {
                    var hasHighlight = _searchHitsInTags && _tagsList[tagIndex].search(HIGHLIGHT_REGEX) > -1;
                    // push all tags with hits in them in front.
                    if (hasHighlight) {
                        _tagsListWithHighligtedContentInFront.push(_tagsList[tagIndex]);
                    }
                    else {
                        _otherTags.push(_tagsList[tagIndex]);
                    }
                }
            }
        }

        return (
            <div className="work-item-snippet-bottom-area">
                <table>
                    <tbody>
                        <tr>
                            <td className="work-item-snippet-avatar-column" style={{ width: AVATAR_COLON_WIDTH + "px" }}>
                                <div style={{ whiteSpace: "nowrap", height: AVATAR_COLMN_HEIGHT + "px" }}>
                                    <div className="bowtie-icon bowtie-user avatar-image">
                                    </div>
                                    <TooltipHost
                                        content={_avatarNameValue || Search_Strings.Unassigned}
                                        directionalHint={DirectionalHint.bottomCenter}>
                                        <div className="avatar-name"
                                            style={_avatarNameCssProps}
                                            dangerouslySetInnerHTML={{ __html: _avatarName }} />
                                    </TooltipHost>
                                </div>
                            </td>
                            <td className="work-item-snippet-status-column" style={{ width: SNIPPET_COLMN_WIDTH + "px" }}>
                                <div style={_stateStyle}>
                                    <div className="state-circle" style={_stateCircleStyle}>
                                    </div>
                                    <TooltipHost
                                        content={_stateHtmlText}
                                        overflowMode={TooltipOverflowMode.Parent}
                                        directionalHint={DirectionalHint.bottomCenter}>
                                        <div className="state-text"
                                            dangerouslySetInnerHTML={{ __html: _stateHtmlText }} />
                                    </TooltipHost>
                                </div>
                            </td>
                            <WorkItemSearchGridCellTagsMetadata
                                tagsWithHighlights={_tagsListWithHighligtedContentInFront}
                                otherTags={_otherTags}
                                availableWidth={availableWidth - 140 * 2} // First two columns are already occupied by state and avatar name.
                            />
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }
}

export class WorkItemSearchGridCellTagsMetadata extends React.Component<IWorkItemSearchGridCellTagsMetadataProps, {}> {
    public render(): JSX.Element {
        let i, $tag: JQuery, elements, _$offscreenTagsContainer = $(domElem("div")).css(
            {
                "top": -5000,
                "left": -5000,
                "position": "absolute",
                "width": (this.props.availableWidth - 30).toString() + "px"
            }).appendTo(document.body),
            remainingWidth = this.props.availableWidth - 30, // 30px for accomodating overflow controls
            tagsRendered = 0,
            shouldRenderMoreTags: boolean = true,
            getTagsToRenderDelegate = (tagsList: Array<string>, _$offscreenTagsContainerObject: JQuery, needHighlight: boolean) => {
                let renderedTagsArray = [];
                for (i = 0; i < tagsList.length; i++) {
                    // strip of <highlight> tags
                    let _name = needHighlight ? tagsList[i].replace(HIGHLIGHT_REGEX, "") : tagsList[i],
                        _normalizedNameValue = _normalizeName(_name, 30);
                    $tag = _renderTag(_name, needHighlight, _normalizedNameValue);
                    _$offscreenTagsContainerObject.append($tag);

                    if (remainingWidth - $tag.find(".tag-container").outerWidth() - 5 > 0) { // adjusted for margin.                    
                        remainingWidth -= $tag.find(".tag-container").outerWidth() - 5;
                        $tag.remove();
                        renderedTagsArray.push({
                            displayName: _normalizedNameValue ? _normalizedNameValue : _name,
                            fullTagName: _name,
                            isOverflowElement: false,
                            style: {
                                fontWeight: needHighlight ? "bold" : "normal"
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

        let tagsToRenderList = getTagsToRenderDelegate(this.props.tagsWithHighlights, _$offscreenTagsContainer, true);
        if (shouldRenderMoreTags) {
            tagsToRenderList = tagsToRenderList.concat(getTagsToRenderDelegate(this.props.otherTags, _$offscreenTagsContainer, false));
        }

        _$offscreenTagsContainer.remove();

        // tags overflow. Draw ellipsis control
        let totalLength = this.props.tagsWithHighlights.length + this.props.otherTags.length;
        if (totalLength > tagsRendered) {
            let remainingTags = this.props.tagsWithHighlights
                .concat(this.props.otherTags)
                .splice(tagsRendered, totalLength - tagsRendered);
            tagsToRenderList.push({
                displayName: ELLIPSIS,
                fullTagName: remainingTags.join(";").replace(HIGHLIGHT_REGEX, "").trim(),
                isOverflowElement: true,
                style: {}
            });
        }

        return (
            <td className="work-item-snippet-tags-column" style={{ width: "100%" }}>
                <div style={{ whiteSpace: "nowrap", height: "16px" }}>
                    <div className="tags-name">
                        <div className="tags-items-container">
                            <ul>
                                {
                                    tagsToRenderList.map((v, i) => {
                                        let className = "tag-item" + (v.isOverflowElement ? "tags-overflow" : "");
                                        return (
                                            <li className={className}
                                                key={i}>
                                                <span className="tag-container" dir="ltr">
                                                    <TooltipHost
                                                        content={v.fullTagName}
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
}

export class WorkItemSearchGridCellSummarySection extends React.Component<IWorkItemSearchGridCellSummarySectionProps, {}> {
    public render(): JSX.Element {
        let item = this.props.item, workItemId = item.flattenFields["system.id"].value, fragments = this.props.cache.get(workItemId);
        if (!fragments) {
            let $measureContainer = $(domElem("div", "work-item-highlighted-text"))
                .css({
                    "top": -5000,
                    "left": -5000,
                    "position": "absolute",
                    "width": this.props.availableWidth
                }).appendTo(document.body),
                summaryTextWithinAvailableSpace = "";

            fragments = {};

            // construct summary div.
            for (var i in item.hits) {
                var hit = item.hits[i];
                summaryTextWithinAvailableSpace = "";
                fragments[hit.fieldReferenceName] ?
                    (fragments[hit.fieldReferenceName].highlights =
                        fragments[hit.fieldReferenceName].highlights.concat(hit.highlights)) :
                    (fragments[hit.fieldReferenceName] = {
                        "fieldName": hit.fieldName,
                        "highlights": hit.highlights
                    });

                for (var key in fragments) {
                    if (METADATAFIELDS.indexOf(key.toLowerCase()) < 0) {
                        let fieldNameToLower = fragments[key].fieldName ? fragments[key].fieldName.toLowerCase() : fragments[key].fieldName,
                            displayName = FIELD_NAME_TO_DISPLAY_NAME[fieldNameToLower];

                        displayName = displayName ? displayName : fragments[key].fieldName;

                        summaryTextWithinAvailableSpace += "<span style=\"color: #999999\">{0}</span>: {1}"
                            .replace("{0}", displayName)
                            .replace("{1}", fragments[key].highlights.map((value, index) => {
                                return _sanitizeHtml(value);
                            }).join("... "));
                        summaryTextWithinAvailableSpace += "... ";
                    }
                }

                summaryTextWithinAvailableSpace = summaryTextWithinAvailableSpace.substr(0, summaryTextWithinAvailableSpace.length - 4);
                $measureContainer.html(summaryTextWithinAvailableSpace);
                let height = $measureContainer.height();
                $measureContainer.empty();

                // available space exhausted. Not able to accomodate further more snippets so bail out.
                if (height > 32) {
                    break;
                }
            }

            $measureContainer.remove();

            // all highest ranked fragments are accomodated within the available real estate. Append the fragments for properties which haven't occurred even once in the summary yet.
            // So that on expanding the middle pane they will show up on their own. 
            // It is better to accomodate as much snippets as possible once user starts resizing the available width rather than showing just the one created earlier, 
            // even though there is more space to draw more.
            for (var fieldRerenceName in this.props.aggregatedHits) {
                // if the fieldName is not in metadata already shown, and the the fieldName is not the part of summary text yet.
                if (METADATAFIELDS.indexOf(fieldRerenceName.toLowerCase()) < 0 && !fragments[fieldRerenceName]) {
                    fragments[fieldRerenceName] = this.props.aggregatedHits[fieldRerenceName];
                }
            }

            // set the cache for future use.
            this.props.cache.set(workItemId, fragments);
        }

        // filter out only those fields which are not there in metada data section.
        let fragmentFieldReferenceNames = Object.keys(fragments).filter((k, j) => {
            return METADATAFIELDS.indexOf(k.toLowerCase()) < 0;
        });

        return (
            <WorkItemSearchGridCellSummaryComponent
                fragmentFieldReferenceNames={fragmentFieldReferenceNames}
                fragments={fragments} />);
    }
}

class WorkItemSearchGridCellSummaryComponent extends React.Component<IWorkItemSearchGridCellSummaryComponentProps, {}> {
    public render(): JSX.Element {
        if (this.props.fragmentFieldReferenceNames.length > 0) {
            return (
                <div className="work-item-highlighted-text">
                    {
                        this.props.fragmentFieldReferenceNames.map((refName, index) => {
                            let fieldNameToLower = this.props.fragments[refName].fieldName
                                ? this.props.fragments[refName].fieldName.toLowerCase()
                                : this.props.fragments[refName].fieldName,
                                displayName = FIELD_NAME_TO_DISPLAY_NAME[fieldNameToLower];

                            displayName = displayName ? displayName : this.props.fragments[refName].fieldName;
                            return (
                                <span key={index}>
                                    <span style={{ color: "#999999" }}>{displayName}</span>
                                    : <span dangerouslySetInnerHTML={{
                                        __html: this.props.fragments[refName].highlights.map((v, idx) => {
                                            return _sanitizeHtml(v);
                                        }).join("... ") + (index < this.props.fragmentFieldReferenceNames.length - 1 ? "..." : "")
                                    }}
                                        style={{
                                            whiteSpace: "normal"
                                        }} />
                                </span>
                            )
                        })
                    }
                </div>);
        }
        else {
            return <div />;
        }
    }
}

function _getFieldValue(fields: any, fieldReferenceName: string): any {
    let fieldValue = fields[fieldReferenceName.toLowerCase()] ? fields[fieldReferenceName.toLowerCase()].value : null;
    return fieldValue;
}

function _sanitizeHtml(html: string): string {
    // replace multiple white spaces with a single white space.
    html = html.replace(WHITE_SPACE_REGEX, " ");
    let encodedValue = htmlEncode(html);

    return encodedValue
        .replace(HIT_HIGHT_LIGHT_HTML_ENCODED_START_TAG_REGEX, HIGHLIGHTSTARTTAG)
        .replace(HIT_HIGHT_LIGHT_HTML_ENCODED_END_TAG_REGEX, HIGHLIGHTENDTAG);
}

function _renderTag(fullTagName: string, needHighlight: boolean, displayTagName?: string): JQuery {
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

function _normalizeName(name, limit) {
    var normalized = name;
    if (name.length > limit) {
        normalized = name.substring(0, limit - 4) + ELLIPSIS;
    }
    return normalized;
}

export function _removeAlias(avatarName: string) {
    avatarName = avatarName.trim();

    let lengthOfString: number = avatarName.length,
        unpairedClosedBrackets: number = avatarName[lengthOfString - 1] === ">" ? 1 : 0,
        i = lengthOfString - 2;

    // Return if the string is empty or if there is no '>' character at the end of string.
    if (lengthOfString === 0 || unpairedClosedBrackets === 0) {
        return avatarName;
    }

    // Scan backwards until the matching open bracket for the '>' (at the end of string) is found.
    for (; unpairedClosedBrackets > 0 && i >= 0; i--) {
        avatarName[i] === ">" ? unpairedClosedBrackets++ : (avatarName[i] === "<" && unpairedClosedBrackets--);
    }
    return avatarName.substring(0, i + 1).trim();
}