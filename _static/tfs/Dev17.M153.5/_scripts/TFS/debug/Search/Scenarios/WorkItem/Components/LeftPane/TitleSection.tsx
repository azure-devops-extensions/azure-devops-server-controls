import * as React from "react";
import * as _WorkItemTypeIconWrapper from "Search/Scenarios/WorkItem/Components/LeftPane/WorkItemTypeIconWrapper";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { sanitizeHtml, getFieldValue } from "Search/Scenarios/WorkItem/Utils";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { WorkItemResult } from "Search/Scenarios/WebApi/Workitem.Contracts";
import { HighlightFragment } from "Search/Scenarios/WorkItem/Flux/Stores/SnippetFragmentCache";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { FocusZone } from "OfficeFabric/FocusZone";
import { KeyCodes } from "OfficeFabric/Utilities";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import "VSS/LoaderPlugins/Css!Search/Scenarios/WorkItem/Components/LeftPane/TitleSection";

export interface TitleSectionProps {
    item: WorkItemResult;

    aggregatedHits: IDictionaryStringTo<HighlightFragment>;

    idWidth: number;

    onWorkItemInvoked(workItemId: string, url: string, openInNewTab: boolean): void;
}

export const TitleSection: React.StatelessComponent<TitleSectionProps> = (props: TitleSectionProps) => {
    const item: WorkItemResult = props.item,
        aggregatedHits: IDictionaryStringTo<HighlightFragment> = props.aggregatedHits,
        _idValue: string = getFieldValue(item.fields, "system.id"),
        _titleValue: string = getFieldValue(item.fields, "system.title"),
        _titleDivHtmlText: string = sanitizeHtml(aggregatedHits["system.title"] ? aggregatedHits["system.title"]["highlights"][0] : _titleValue),
        _idText: string = aggregatedHits["system.id"] ? aggregatedHits["system.id"]["highlights"][0] : _idValue,
        projectName: string = item.project,
        workItemTypeName: string = getFieldValue(item.fields, "system.workitemtype");

    return (
        <FocusZone>
            <div className="work-item-snippet-header">
                <div className="work-item-id-title">
                    <span className="workitem-type-icon">
                        <WorkItemTypeIconWrapperAsyc projectName={projectName} workItemTypeName={workItemTypeName} />
                    </span>
                    <span>
                        <TooltipHost
                            content={_idValue}
                            overflowMode={TooltipOverflowMode.Parent}
                            directionalHint={DirectionalHint.bottomCenter}>
                            <div className="workitem-id" dangerouslySetInnerHTML={{ __html: _idText }} style={{ width: props.idWidth + "px" }} />
                        </TooltipHost>
                    </span>
                    <span className="overflow">
                        <TooltipHost
                            content={_titleValue}
                            overflowMode={TooltipOverflowMode.Parent}
                            directionalHint={DirectionalHint.bottomCenter}>
                            <a className="workitem-title"
                                href={getEditWorkItemUrl(_idValue)}
                                aria-label={Resources.WorkItemTitleLabel}
                                onClick={evt => {
                                    props.onWorkItemInvoked(_idValue, getEditWorkItemUrl(_idValue), evt.ctrlKey);
                                    evt.preventDefault();
                                }}
                                onKeyDown={evt => {
                                    if (evt.keyCode === KeyCodes.enter) {
                                        props.onWorkItemInvoked(_idValue, getEditWorkItemUrl(_idValue), evt.ctrlKey);
                                    }
                                }}
                                dangerouslySetInnerHTML={{ __html: _titleDivHtmlText }} />
                        </TooltipHost>
                    </span>
                </div>
            </div>
        </FocusZone>
    );
}

export function getEditWorkItemUrl(workItemId: string): string {
    const WorkItemHubUrl = TfsContext.getDefault().getActionUrl(null, "workitems");
    return `${WorkItemHubUrl}/edit/${workItemId}`;
}

const WorkItemTypeIconWrapperAsyc = getAsyncLoadedComponent(
    ["Search/Scenarios/WorkItem/Components/LeftPane/WorkItemTypeIconWrapper"],
    (workItemTypeIconWrapper: typeof _WorkItemTypeIconWrapper) => workItemTypeIconWrapper.WorkItemTypeIconWrapper, null);