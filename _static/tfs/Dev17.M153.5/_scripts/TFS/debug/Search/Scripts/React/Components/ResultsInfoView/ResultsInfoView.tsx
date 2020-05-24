/// Copyright (c) Microsoft Corporation. All rights reserved.
/// <reference types="react" />
/// <reference types="react-dom" />

"use strict";

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Models from "Search/Scripts/React/Models";
import Utils_String = require("VSS/Utils/String");
import { DefaultButton, IButtonProps } from "OfficeFabric/Button";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { Fabric } from "OfficeFabric/Fabric";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { autobind, getId } from 'OfficeFabric/Utilities';
import {KeyCode} from "VSS/Utils/UI";
import {SearchConstants} from "Search/Scripts/Common/TFS.Search.Constants";
import {TelemetryHelper} from "Search/Scripts/Common/TFS.Search.TelemetryHelper";
import {ActionCreator} from "Search/Scripts/React/ActionCreator";
import {StoresHub} from "Search/Scripts/React/StoresHub";
import {WorkItemConstants} from "Search/Scripts/Providers/WorkItem/TFS.Search.WorkItem.Constants";
import * as Resource_Strings from "Search/Scripts/Resources/TFS.Resources.Search";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import "VSS/LoaderPlugins/Css!Search/React/Components/ResultsInfoView";

export interface ISortField {
    referenceName: string,
    displayName: string
}

export interface ISearchResultsInfoViewProps {
    isClientSideSortEnabled: boolean,
    isServerSortEnabled: boolean,
    searchEntity: string,
    sortFields: ISortField[],
    v2Layout: boolean,
    actionCreator: ActionCreator,
    storesHub: StoresHub
}

interface ISearchResultsInfoViewState {
    totalResultsCount: number,
    fetchedResultsCount: number,
    activityId: string,
    sortOption: Models.ISortOption
}

export function renderResultsInfoView(container: any, props: ISearchResultsInfoViewProps): void {
    ReactDOM.render(
        <ResultsInfoView { ...props }/>,
        container);
}

const FEEDBACK_LINK_CONTENT_FORMAT: string =
    "mailto:vstssearch@microsoft.com?Subject=Feedback on Azure DevOps Services {0} [Reference ID: {1}]";
const SEARCH_ENTITY_DISPLAY_NAME = {};
SEARCH_ENTITY_DISPLAY_NAME[SearchConstants.CodeEntityTypeId] = "Code Search";
SEARCH_ENTITY_DISPLAY_NAME[SearchConstants.WorkItemEntityTypeId] = "Workitem Search";

/**
 * Parent container which contains the whole view giving information about the results obtained.
 * E.g. total results count, shown results count, feedback link etc.
 */
class ResultsInfoView extends React.Component<ISearchResultsInfoViewProps, ISearchResultsInfoViewState> {
    private _viewState: ISearchResultsInfoViewState;
    private _isHosted: boolean;
    constructor(props: ISearchResultsInfoViewProps) {
        super(props);
        this._isHosted = TfsContext.getDefault().isHosted;
        // Compile initial state
        this._viewState = {
            sortOption: props.storesHub.sortCriteriaStore.firstSortOption,
            totalResultsCount: props.storesHub.searchResultsStore.totalResultsCount,
            fetchedResultsCount: props.storesHub.searchResultsStore.fetchedResultsCount,
            activityId: props.storesHub.searchResultsStore.activityId
        }

        this.state = this._viewState;
    }

    /**
     * Method called upon by the react framework to render the component.
     */
    public render(): JSX.Element {
        let mailLink = FEEDBACK_LINK_CONTENT_FORMAT
            .replace("{0}", SEARCH_ENTITY_DISPLAY_NAME[this.props.searchEntity])
            .replace("{1}", this.state.activityId),

            resultInformationClassName = "results-information",
            resultsCountMessage: string = this._getResultsInfoMessage();

        // Hide the control if not required.
        if (!this._isVisible()) {
            resultInformationClassName = resultInformationClassName + " collapsed";
        }

        // Include sort control if feature flag is enabled.
        if (this.props.isClientSideSortEnabled || this.props.isServerSortEnabled) {
            // Add feedback link right at the very begining as a fix for FIREFOX's float issue.
            let {displayName, referenceName} = getCurrentSelectedItem(this.props.sortFields, this.state.sortOption.field),
                sortControlLabel = Resource_Strings.SortByLabel.replace("{0}", displayName),
                isDescendingOrder: boolean = this.state.sortOption.sortOrder === "desc",
                bowtieSortClass: string = isDescendingOrder ? "bowtie-sort-descending" : "bowtie-sort-ascending",
                sortIconClassName: string = "bowtie-icon {0}".replace("{0}", bowtieSortClass),
                sortIconToolTip: string = isDescendingOrder ?
                    Resource_Strings.SortControlDescendingLabel :
                    Resource_Strings.SortControlAscendingLabel,
                sortControlButtonId: string = getId("search-Sort-DropdownButton-"),
                isRelevanceField: boolean = referenceName &&
                    Utils_String.ignoreCaseComparer(referenceName,
                        WorkItemConstants.RELEVANCE_FIELD_REFERENCE_NAME) === 0,
                sortControlButton = <DefaultButton
                    className='sort-dropdown-button'
                    ariaLabel={sortControlLabel}
                    id={sortControlButtonId}
                    text={sortControlLabel}
                    menuProps={{
                        target: sortControlButtonId,
                        shouldFocusOnMount: true,
                        directionalHint: DirectionalHint.bottomCenter,
                        isBeakVisible: true,
                        items: this.props.sortFields.map((item, index) => ({
                            key: item.referenceName,
                            name: item.displayName,
                            onClick: this._onSelection,
                            canCheck: true,
                            checked: referenceName === item.referenceName
                        } as IContextualMenuItem))
                    }}>
                </DefaultButton>,
                sortOrderButton = <DefaultButton
                    className='sort-order-button'
                    ariaLabel={sortIconToolTip}
                    title={sortIconToolTip}
                    onClick={this._onSortButtonClick}
                    iconProps={{
                        iconName: undefined,
                        className: sortIconClassName
                    }}>
                </DefaultButton>;

            // Put the sort control inside Fabric component for old layout for the outline to appear on focus on the sort button.
            return (
                <div className={resultInformationClassName}>
                    <span aria-live="assertive" className="count-message">{resultsCountMessage}</span>
                    {
                        !this.props.v2Layout && <Fabric>
                            {sortControlButton}
                            {!isRelevanceField && sortOrderButton}
                        </Fabric>
                    }
                    {
                        this._isHosted &&
                        <span className="feedback">
                            <a href={mailLink} target="_top" title="Send feedback to the Search team" onClick={this._onFeedbackLinkClick.bind(this) }>{Resource_Strings.ProvideFeedbackLink}</a>
                        </span>
                    }
                </div>);
        }
        else {
            return (
                <div className={resultInformationClassName}>
                    <span aria-live="assertive" className="count-message">{resultsCountMessage}</span>
                    {
                        this._isHosted &&
                        <span className="feedback">
                            <a href={mailLink} target="_top" onClick={this._onFeedbackLinkClick.bind(this) }>{Resource_Strings.ProvideFeedbackLink}</a>
                        </span>
                    }
                </div>);
        }
    }

    /**
     * Method called when the component is successfully mounted in the component's lifecycle.
     * We are using this method to bind to changes in the results info store.
     */
    public componentDidMount(): void {
        this.props.storesHub.searchResultsStore.addChangedListener(this._onResultsStoreChanged.bind(this));
        this.props.storesHub.sortCriteriaStore.addChangedListener(this._onSortCriteriaStoreChanged.bind(this));
    }

    /**
     * Method is called upon selection of an item from the drop down list.
     * It updates components state after setting the selectedItem property.
     * @param item
     */
    @autobind
    private _onSelection(ev?: any, item?: IContextualMenuItem): void {
        // Create action only if the sort field changes.
        if (Utils_String.ignoreCaseComparer(
            this.state.sortOption.field,
            item.key) !== 0) {
            // invoke sort option for new field with existing sort order.
            this._invokeSortAction(item.key, this.state.sortOption.sortOrder, false)
        }
    }

    /**
     * Method is called upon clicking the button to change the sort order.
     * It modifies the state to update the sort order appropriately.
     */
    @autobind
    private _onSortButtonClick(): void {
        this._invokeSortAction(this.state.sortOption.field, this.state.sortOption.sortOrder, true);
    }

    private _invokeSortAction(field: string, order: string, toggleOrder: boolean): void {
        let isRelevanceField = Utils_String.ignoreCaseComparer(field, WorkItemConstants.RELEVANCE_FIELD_REFERENCE_NAME) === 0,
            // If field is "relevance" order is always descending.
            clientSortResultLimit = this.props.searchEntity === SearchConstants.CodeEntityTypeId ? SearchConstants.CodeSearchClientSortLimit : SearchConstants.WorkItemSearchTakeResults,
            sortOrder = isRelevanceField ? "desc" : (toggleOrder ? (order === "asc" ? "desc" : "asc") : order),
            suppressNavigate = this.state.totalResultsCount <= clientSortResultLimit,
            replaceHistory = this.props.searchEntity === SearchConstants.CodeEntityTypeId ? true : false,
            currentSearchProvider = this.props.storesHub.searchProvidersStore.CurrentProvider;

        this.props
            .actionCreator
            .changeSearchResultsSortCriteria([{
                field: field,
                sortOrder: sortOrder            
            }],
            this.props.isServerSortEnabled,
            currentSearchProvider,
            suppressNavigate,
            replaceHistory);

        TelemetryHelper.traceLog({
            "SearchResultsSortControlColumn": field,
            "SearchResultsSortControlSortOrder": sortOrder
        });
    }

    private _onFeedbackLinkClick(): void {
        TelemetryHelper.traceLog({
            "ProvideFeedBackActionOnResultsPane": true
        });
    }

    /**
     * Method is invoked whenever there is a change in the ResultsInfo store's state(flux component)
     * It updates the state of the component after compiling it from the results info store.
     */
    private _onResultsStoreChanged(): void {
        // Update various information required to draw the control
        this._viewState.activityId = this.props.storesHub.searchResultsStore.activityId;
        this._viewState.totalResultsCount = this.props.storesHub.searchResultsStore.totalResultsCount;
        this._viewState.fetchedResultsCount = this.props.storesHub.searchResultsStore.fetchedResultsCount;

        // Update the sort criteria.
        this._viewState.sortOption = this.props.storesHub.sortCriteriaStore.firstSortOption;
        this.setState(this._viewState);
    }

    private _onSortCriteriaStoreChanged(): void {
        this._viewState.sortOption = this.props.storesHub.sortCriteriaStore.firstSortOption;
        this.setState(this._viewState);
    }

    /**
     * Returns the message to be shown to user indicating the number of results fetched/drawn compared to total number of search hits
     */
    private _getResultsInfoMessage(): string {
        // Construct results count string based on the number of results fetched out of total number of hits.
        let isClientSideSortEnabled = this.props.isClientSideSortEnabled,
            isServerSideSortEnabled = this.props.isServerSortEnabled,
            totalCount: number = this.state.totalResultsCount,
            fetchedCount: number = this.state.fetchedResultsCount,
            resultsCountMessage: string,
            entityTitle: string;

        switch (this.props.searchEntity) {
            case SearchConstants.CodeEntityTypeId:
                entityTitle = Resource_Strings.CodeEntityTitle;
                break;
            case SearchConstants.WorkItemEntityTypeId:
            case SearchConstants.WorkItemEntityTypeIdV2:
                entityTitle = Resource_Strings.WorkItemEntityTitle;
                break;
            case SearchConstants.WikiEntityTypeId:
                entityTitle = Resource_Strings.WikiEntityTitle;
                break;
        }

        if (typeof totalCount === "number" && typeof fetchedCount === "number") {
            resultsCountMessage = fetchedCount < totalCount
                ? Resource_Strings
                    .ShowingXofYEntityResultsTitle
                    .replace("{0}", fetchedCount.toString())
                    .replace("{1}", totalCount.toString())
                    .replace("{2}", entityTitle)
                : (fetchedCount === 1
                    ? Resource_Strings.ShowingSingleEntityResultTitle
                      .replace("{0}", entityTitle)
                    : Resource_Strings.ShowingXEntityResultsTitle
                      .replace("{0}", totalCount.toString()))
                      .replace("{1}", entityTitle);
            return resultsCountMessage;
        }
    }

    private _isVisible(): boolean {
        let resultsCount = this
            .state
            .totalResultsCount;

        return resultsCount > 0;
    }
}

function getCurrentSelectedItem(items: Array<ISortField>, refName: string): ISortField {
    let currentSelectedItemIndex: number;
    for (let i = 0; i < items.length; i++) {
        if (Utils_String.ignoreCaseComparer(
            items[i].referenceName,
            refName) === 0) {
            currentSelectedItemIndex = i;
            break;
        }
    }

    return items[currentSelectedItemIndex];
}