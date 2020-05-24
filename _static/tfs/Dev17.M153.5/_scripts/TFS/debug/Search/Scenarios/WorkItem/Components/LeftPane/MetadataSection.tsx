import * as React from "react";
import { ResultsViewConstants } from "Search/Scenarios/WorkItem/Constants";
import { getFieldValue } from "Search/Scenarios/WorkItem/Utils";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { ignoreCaseComparer } from "VSS/Utils/String";
import { WorkItemResult } from "Search/Scenarios/WebApi/Workitem.Contracts";
import { Tags } from "Search/Scenarios/WorkItem/Components/LeftPane/Tags";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { HighlightFragment } from "Search/Scenarios/WorkItem/Flux/Stores/SnippetFragmentCache";
import { ColorsDataPayload } from "Search/Scenarios/WorkItem/Flux/ActionsHub";

import "VSS/LoaderPlugins/Css!Search/Scenarios/WorkItem/Components/LeftPane/MetadataSection";

export interface MetadataSectionProps {
    item: WorkItemResult;
    aggregatedHits: IDictionaryStringTo<HighlightFragment>;
    colorsData: ColorsDataPayload;
}

interface StateCircleColor {
    border: string;

    fill: string;
}

export const MetadataSection: React.StatelessComponent<MetadataSectionProps> = (props: MetadataSectionProps) => {
    const item = props.item,
        aggregatedHits = props.aggregatedHits;
    // state and color
    const _workItemId: string = getFieldValue(item.fields, "system.id"),
        _workItemType: string = getFieldValue(item.fields, "system.workitemtype"),
        _stateValue: string = getFieldValue(item.fields, "system.state"),
        _stateHtmlText: string = aggregatedHits["system.state"] ? aggregatedHits["system.state"]["highlights"][0] : _stateValue,
        _stateCircleStyle: IDictionaryStringTo<string> = {},
        _stateStyle: IDictionaryStringTo<string> = {
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
        };

    let _stateCircleColor: StateCircleColor;

    if (props.colorsData && props.colorsData.colorsData) {
        _stateCircleColor = getStateCircleColor(_workItemId, props.colorsData.colorsData);
    }

    if (_stateCircleColor && _stateCircleColor.border && _stateCircleColor.fill) {
        const fillColor: string = _stateCircleColor.fill.replace(ResultsViewConstants.HashGlobalRegex, "");
        _stateCircleStyle["borderColor"] = "#" + _stateCircleColor.border.replace(ResultsViewConstants.HashGlobalRegex, "");
        _stateCircleStyle["backgroundColor"] = ignoreCaseComparer(fillColor, "ffffff") === 0 ? "transparent" : "#" + fillColor;
    }

    // avatar name and image
    const _avatarNameValue: string = getFieldValue(item.fields, "system.assignedto") || "",
        _avatarNameHtmlText: string = aggregatedHits["system.assignedto"] ? aggregatedHits["system.assignedto"]["highlights"][0] : _avatarNameValue,
        _isAliasHit: boolean = _avatarNameHtmlText.search(ResultsViewConstants.AvatarAliasHitRegex) > -1,
        _filteredText: string = removeAlias(_avatarNameHtmlText),
        _avatarName: string = _filteredText === "" ? Resources.Unassigned : _filteredText,
        _fontWeight: any = _isAliasHit && _filteredText ? "bold" : "normal",
        _avatarNameCssProps = {
            fontWeight: _fontWeight,
            width: ResultsViewConstants.AvatarWidth + "px"
        },

        // tags
        _tagsHitText: string = aggregatedHits["system.tags"] ? aggregatedHits["system.tags"]["highlights"][0] : null,
        _tagsValue: string = getFieldValue(item.fields, "system.tags"),
        _searchHitsInTags: boolean = !!_tagsHitText,
        _tagsHtmlText: string = _searchHitsInTags ? _tagsHitText : _tagsValue,
        _tagsListWithHighligtedContentInFront = new Array<any>(),
        _otherTags = new Array<any>();

    if (_tagsHtmlText) {
        const _tagsList: Array<string> = _tagsHtmlText.split(/[;,]/);
        for (let tagIndex in _tagsList) {
            if (_tagsList[tagIndex]) {
                const hasHighlight = _searchHitsInTags && _tagsList[tagIndex].search(ResultsViewConstants.HighlightRegex) > -1;
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
                        <td className="work-item-snippet-avatar-column" style={{ width: ResultsViewConstants.AvatarColonWidth + "px" }}>
                            <div style={{ whiteSpace: "nowrap", height: ResultsViewConstants.AvatarColumnHeight + "px" }}>
                                <div className="bowtie-icon bowtie-user avatar-image">
                                </div>
                                <TooltipHost
                                    content={_avatarNameValue || Resources.Unassigned}
                                    overflowMode={TooltipOverflowMode.Self}
                                    directionalHint={DirectionalHint.bottomCenter}>
                                    <div className="avatar-name"
                                        style={_avatarNameCssProps}
                                        dangerouslySetInnerHTML={{ __html: _avatarName }} />
                                </TooltipHost>
                            </div>
                        </td>
                        <td className="work-item-snippet-status-column" style={{ width: ResultsViewConstants.SnippetColumnWidth + "px" }}>
                            <div style={_stateStyle}>
                                <div className="state-circle" style={_stateCircleStyle}>
                                </div>
                                <TooltipHost
                                    content={_stateHtmlText}
                                    overflowMode={TooltipOverflowMode.Self}
                                    directionalHint={DirectionalHint.bottomCenter}>
                                    <div className="state-text"
                                        dangerouslySetInnerHTML={{ __html: _stateHtmlText }} />
                                </TooltipHost>
                            </div>
                        </td>
                        <Tags
                            tagsWithHighlights={_tagsListWithHighligtedContentInFront}
                            otherTags={_otherTags}
                        />
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

function removeAlias(avatarName: string): string {
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

function getStateCircleColor(workItemId: string, stateColorsMap: IDictionaryStringTo<string>): StateCircleColor {
    let border: string = "",
        color = stateColorsMap[parseInt(workItemId)];

    // if color is white
    if (color && ignoreCaseComparer(
        color.replace(ResultsViewConstants.HashGlobalRegex, ""), "ffffff") === 0) {
        border = "5688e0";
    }
    else if (color) {
        // in normal scenarios border and color are same.
        border = color;
    }

    return {
        border: border,
        fill: color
    };
}
