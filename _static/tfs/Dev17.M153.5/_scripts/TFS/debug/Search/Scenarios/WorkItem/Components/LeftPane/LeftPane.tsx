import * as React from "react";
import * as Constants from "Search/Scenarios/WorkItem/Constants";
import * as Container from "Search/Scenarios/WorkItem/Components/Container";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { css } from "OfficeFabric/Utilities";
import { SearchStatus } from "Search/Scenarios/Shared/Base/Stores/SearchStore";
import { ListWrapper } from "Search/Scenarios/WorkItem/Components/LeftPane/ListWrapper";
import { getFieldValue } from "Search/Scenarios/WorkItem/Utils";
import { FeedbackMailToLinkFormat, CodexFeedbackMailToLinkFormat } from "Search/Scenarios/WorkItem/Constants";
import { ResultsInfo } from "Search/Scenarios/Shared/Components/ResultsInfo";
import { ShowMoreRow } from "Search/Scenarios/Shared/Components/ShowMoreRow";
import "VSS/LoaderPlugins/Css!Search/Scenarios/WorkItem/Components/LeftPane/LeftPane";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

export const LeftPaneContainer = Container.create(
    ["searchStore", "colorsDataStore", "previewOrientationStore"],
    ({ searchStoreState, selectedItem, colorsData }, props) => {
        let idWidth: number = 0;
        const { response, query, activityId, searchStatus } = searchStoreState;
        const {
            clickFeedbackLink,
            changeActiveItem,
            notifyResultsRendered,
            fetchMoreResults,
            onWorkItemInvoked } = props.actionCreator;
        const items = response ? response.results.values : [];
        const totalResultsCount = response && response.results.count;
        const currentItemIndex = items.indexOf(selectedItem);
        const isHosted: boolean = TfsContext.getDefault().isHosted;
        const mail = Constants.CodexFeedbackMailToLinkFormat.replace("{0}", activityId);
        const itemsLength = items.length;
        const searchSucceeded = searchStatus === SearchStatus.Success;
        const needShowMore = response && totalResultsCount > query.takeResults && query.takeResults === Constants.WorkItemSearchTakeResults;

        if (response) {
            items.forEach((item) => {
                const numberOfDigits = getFieldValue(item.fields, "system.id").length;
                if (idWidth < numberOfDigits) {
                    idWidth = numberOfDigits;
                }
            });
        }

        return (
            <div className={css("resultsInfoAndItems--container", { hidden: !searchSucceeded })}>
                {
                    itemsLength > 0 &&
                    <ResultsInfo
                        infoMessage={getResultsInfoMessage(itemsLength, totalResultsCount)}
                        mailToLink={mail}
                        isHosted={isHosted}
                        onFeedbackLinkInvoked={clickFeedbackLink} />
                }
                <div className="items-ListPane">
                    {
                        itemsLength > 0 &&
                        <ListWrapper
                            key="workItemsList"
                            items={items}
                            changeActiveItem={changeActiveItem}
                            currentItemIndex={currentItemIndex}
                            idWidth={idWidth}
                            colorsData={colorsData}
                            onDidUpdate={() => searchSucceeded && notifyResultsRendered()}
                            getFragments={props.storesHub.snippetFragmentCache.get}
                            setFragments={props.storesHub.snippetFragmentCache.set}
                            onWorkItemInvoked={onWorkItemInvoked}/>
                    }
                    {
                        needShowMore &&
                        <ShowMoreRow className="workitem-search-cell" onClick={fetchMoreResults} />
                    }
                </div>
            </div>);
    });

function getResultsInfoMessage(resultsCount: number, totalResultsCount: number): string {
    return resultsCount < totalResultsCount
        ? Resources.ShowingWorkItemResultsFormat.replace("{0}", resultsCount.toString()).replace("{1}", totalResultsCount.toString())
        : (resultsCount === 1
            ? Resources.ShowingSingleWorkItemResult
            : Resources.ShowingNWorkItemResultsFormat.replace("{0}", totalResultsCount.toString()));
}
