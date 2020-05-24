import * as React from "react";
import * as Container from "Search/Scenarios/Code/Components/Container";
import * as Constants from "Search/Scenarios/Code/Constants";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { DetailsListWrapper } from "Search/Scenarios/Code/Components/DetailsListWrapper";
import { CodeResult } from "Search/Scenarios/WebApi/Code.Contracts";
import { css } from "OfficeFabric/Utilities";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { SearchStatus } from "Search/Scenarios/Shared/Base/Stores/SearchStore";
import { ItemRow } from "Search/Scenarios/Code/Components/ItemRow";
import { ResultsInfo } from "Search/Scenarios/Shared/Components/ResultsInfo";
import { ShowMoreRow } from "Search/Scenarios/Shared/Components/ShowMoreRow";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import "VSS/LoaderPlugins/Css!Search/Scenarios/Code/Components/LeftPane";

export const LeftPaneContainer = Container.create(
    ["searchStore", "itemContentStore", "previewOrientationStore"],
    ({ searchStoreState, selectedItem, previewOrientationStoreState }, props) => {
        const { response, query, activityId, searchStatus } = searchStoreState;
        const { previewOrientation } = previewOrientationStoreState;
        const { clickFeedbackLink,
            changeActiveItem,
            clickContextualMenuItem,
            notifyResultsRendered,
            fetchMoreResults,
            clickLeftPaneFileNameLink
        } = props.actionCreator;
        const items = response ? response.results.values : [];
        const totalResultsCount = response && response.results.count;
        const needShowMore = response && totalResultsCount > query.takeResults && query.takeResults === Constants.CodeSearchTakeResults;
        const currentItemIndex = items.indexOf(selectedItem);
        const isHosted: boolean = TfsContext.getDefault().isHosted;
        const mail = Constants.CodexFeedbackMailToLinkFormat.replace("{0}", activityId);
        const searchSucceeded = searchStatus === SearchStatus.Success;

        return (
            <div className={css("resultsInfoAndItems--container", { hidden: !searchSucceeded })}>
                {
                    items.length > 0 &&
                    <ResultsInfo
                        infoMessage={getResultsInfoMessage(items.length, totalResultsCount)}
                        mailToLink={mail}
                        isHosted={isHosted}
                        onFeedbackLinkInvoked={clickFeedbackLink} />
                }
                <div className="items-ListPane">
                    {
                        items.length > 0 &&
                        <DetailsListWrapper
                            key="itemsList"
                            previewOrientation={previewOrientation}
                            items={items}
                            currentItemIndex={currentItemIndex}
                            onRenderCell={
                                getCellRenderer(
                                    previewOrientation,
                                    currentItemIndex,
                                    changeActiveItem,
                                    clickContextualMenuItem,
                                    clickLeftPaneFileNameLink)
                            }
                            searchSucceeded={searchSucceeded}
                            notifyResultsRendered={notifyResultsRendered} />
                    }
                    {
                        needShowMore &&
                        <ShowMoreRow className="code-search-cell" onClick={fetchMoreResults} />
                    }
                </div>
            </div>
        );
    });

function getCellRenderer(
    previewOrientation: string,
    currentItemIndex: number,
    onActivation: (it: CodeResult) => void,
    onMenuItemInvoked: (menuItem: IContextualMenuItem) => void,
    onFileNameClicked: (link: string, evt: React.MouseEvent<HTMLElement>) => void
): (item: CodeResult, id: number) => JSX.Element {
    return (item: CodeResult, index: number) =>
        <ItemRow
            item={item}
            active={currentItemIndex === index}
            previewOrientation={previewOrientation}
            onActivation={onActivation}
            onMenuItemInvoked={onMenuItemInvoked}
            onFileNameClicked={onFileNameClicked} />;
}

function getResultsInfoMessage(resultsCount: number, totalResultsCount: number): string {
    return resultsCount < totalResultsCount
        ? Resources.ShowingCodeResultsFormat.replace("{0}", resultsCount.toString()).replace("{1}", totalResultsCount.toString())
        : (resultsCount === 1
            ? Resources.ShowingSingleCodeResult
            : Resources.ShowingNCodeResultsFormat.replace("{0}", totalResultsCount.toString()));
}
