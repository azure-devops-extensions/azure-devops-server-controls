import * as React from "react";
import * as Constants from "Search/Scenarios/Code/Constants";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import * as _ContextualMenu from "OfficeFabric/ContextualMenu";
import * as _ItemRowContextualMenuButton from "Search/Scenarios/Code/Components/ItemContextualMenu";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { FocusZone } from "OfficeFabric/FocusZone";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { css } from "OfficeFabric/Utilities";
import { CodeResult } from "Search/Scenarios/WebApi/Code.Contracts";
import { constructLinkToContent, isGitType, isTfvcType, isVCType } from "Search/Scenarios/Code/Utils";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { PreviewOrientationActionIds, ContentHitKey } from "Search/Scenarios/Code/Constants";

import "VSS/LoaderPlugins/Css!Search/Scenarios/Code/Components/ItemRow";

export interface ItemRowProps {
    item: CodeResult;

    active: boolean;

    previewOrientation: string;

    onActivation(item: CodeResult): void;

    onMenuItemInvoked?(menuItem: _ContextualMenu.IContextualMenuItem): void;

    onFileNameClicked?(link: string, evt: React.MouseEvent<HTMLElement>): void;
}

export const ItemRow: React.StatelessComponent<ItemRowProps> = (props: ItemRowProps) => {
    const { item, active, previewOrientation, onActivation, onMenuItemInvoked, onFileNameClicked } = props;
    const {fileName, project, matches } = item;
    const hitCount = matches[ContentHitKey].length;
    // Hit count is capped to 100 from backend due to perf issues, so for hit count 100 we need to show 100+ matches
    const hitsMessage = hitCount > 0 && (
        hitCount >= Constants.MaxHitsToHighlight
        ? `${Constants.MaxHitsToHighlight}+ ${Resources.Matches}`
        : `${hitCount} ${(hitCount > 1 ? Resources.Matches : Resources.Match)}`);
    const isCustomVC: boolean = !isVCType(item.vcType);
    const repoNameRequired = isGitType(item.vcType) || isCustomVC;
    const projectRepoName = repoNameRequired ? `${project} > ${item.repository}` : project;
    const linkToFile = constructLinkToContent(item);

    const cellHeader =
        <span className="file-info">
            {
                active && !isCustomVC ? (
                    <a className="file-link"
                        href={linkToFile} target="_blank"
                        aria-label={Resources.FileNameLabel}
                        onClick={evt => onFileNameClicked(linkToFile, evt)}
                        rel="noopener noreferrer"
                    >{fileName}</a>
                ) : <span className={css("file-name", { "custom-vc": isCustomVC })}>{fileName}</span>
            }
            <span className="project-repo-info">{projectRepoName}</span>
        </span>;

    const cellContent =
        <div className="text-content-container">
            <TooltipHost
                overflowMode={TooltipOverflowMode.Parent}
                content={item.path}
                directionalHint={DirectionalHint.bottomLeftEdge}>
                <span>{item.path}</span>
            </TooltipHost>
        </div>;

    const horizontalSplitView: JSX.Element =
        <div
            className={css("code-search-cell", {
                "is-active": props.active
            })}
            data-is-focusable={true}
            onFocus={() => onActivation(item)}>
            <FocusZone>
                <div className={css("cell-header")}>
                    {cellHeader}
                    <span className={css("hits")}>{hitsMessage}</span>
                </div>
                <div className={css("cell-content")}>
                    {cellContent}
                    <ItemContextualMenuButtonAsync item={item} onMenuItemInvoked={onMenuItemInvoked} />
                </div>
            </FocusZone>
        </div>;

    const verticalSplitView: JSX.Element =
        <div
            className={css("code-search-cell", {
                "is-active": props.active
            })}
            data-is-focusable={true}
            onFocus={() => onActivation(item)}>
            <FocusZone className={css("vertical-mode")}>
                <div className={css("cell-header")}>
                    {cellHeader}
                </div>
                <ItemContextualMenuButtonAsync item={item} onMenuItemInvoked={onMenuItemInvoked} />
                <div className={css("cell-content")}>
                    {cellContent}
                </div>
                <span className={css("hits")}>{hitsMessage}</span>
            </FocusZone>
        </div>;

    return (previewOrientation === PreviewOrientationActionIds.Bottom ? verticalSplitView : horizontalSplitView);
}

const ItemContextualMenuButtonAsync = getAsyncLoadedComponent(
    ["Search/Scenarios/Code/Components/ItemContextualMenu"],
    (itemContextualMenuButton: typeof _ItemRowContextualMenuButton) => itemContextualMenuButton.ItemRowContextualMenuButton, null);
