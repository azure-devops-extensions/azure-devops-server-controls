/// Copyright (c) Microsoft Corporation. All rights reserved.
/// <reference types="react" />
/// <reference types="react-dom" />

"use strict";

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Models from "Search/Scripts/React/Models";
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");

import { SEARCH_PROVIDER_TO_ENTITY_ID } from "Search/Scripts/React/Stores/SearchProvidersStore";
import { StoresHub } from "Search/Scripts/React/StoresHub";
import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";
import { TelemetryHelper } from "Search/Scripts/Common/TFS.Search.TelemetryHelper";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";
import { using } from "VSS/VSS";

import { css, autobind } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!Search/React/Components/NoResultsPage";

import Events_Services_NO_REQUIRE = require("VSS/Events/Services");

export enum ScenariosTypes {
    ServiceError = 0x0,
    IndexingScenario = 0x1,

    // No results sceanrios (2nd set bit)
    NoResults = 0x2,
    PrefixWildCardNotSupported = 0x3,

    // Permission access scenarios (3rd set bit)
    NoPermission = 0x4,
    NoPermissionWithShowMore = 0x5,
    NoPermissionAfterShowMore = 0x6,
    WorkItemNoPermission = 0x7,
    EmptyQueryNotSupported = 0x8,

    OnlyWildcardQueryNotSupported =0x9,
    ZeroResultsWithWildcard = 0x10,
    ZeroResultsWithFilter = 0x11,
    ZeroResultsWithWildcardAndFilter = 0x12,
    ZeroResultsWithNoWildcardNoFilter = 0x13
}

export interface INoResultsPageState {
    enabled: boolean;
    scenario: ScenariosTypes;
    activityId: string;
    searchEntity: Models.SearchProvider;
    searchText: string;
}

export interface INoResultsPageProps {
    storesHub: StoresHub;
    isOldLayout: boolean;
}

const NoResultsMessageRenderer: React.StatelessComponent<INoResultsPageState> =
    (props: INoResultsPageState): JSX.Element => {
        let message: string,
            helpText: JSX.Element;
        const entitySpecificTexts = _getEntitySpecificMessageTexts(props.searchEntity);

        if (props.scenario === ScenariosTypes.NoResults) {

            message = Search_Resources.NoResultsMessage.replace("{1}", entitySpecificTexts.noResultsEntityText);

            helpText = _getNoResultsHelpTextComponent(
                entitySpecificTexts.learnMoreLink,
                entitySpecificTexts.learnMoreEntityText,
                _getFeedBackLink(props.searchEntity, props.activityId),
                Search_Resources.NoResultsHelptext);
        }
        else if (props.scenario === ScenariosTypes.EmptyQueryNotSupported) {
            message = Search_Resources.EmptyQueryMessage;

            helpText = _getNoResultsHelpTextComponent(
                entitySpecificTexts.learnMoreLink,
                entitySpecificTexts.learnMoreEntityText,
                _getFeedBackLink(props.searchEntity, props.activityId),
                Search_Resources.EmptyQueryHelpText);
        }
        else if (props.scenario === ScenariosTypes.OnlyWildcardQueryNotSupported) {
            message = Search_Resources.OnlyWildcardQueryNotSupportedMessage;

            helpText = _getNoResultsHelpTextComponent(
                entitySpecificTexts.learnMoreLink,
                entitySpecificTexts.learnMoreEntityText,
                _getFeedBackLink(props.searchEntity, props.activityId),
                Search_Resources.OnlyWildcardQueryNotSupportedHelpText);
        }
        else if (props.scenario === ScenariosTypes.ZeroResultsWithWildcard) {
            message = Search_Resources.NoResultsWithoutAppliedFiltersMessage.replace("{1}", entitySpecificTexts.noResultsEntityText);

            helpText = _getNoResultsHelpTextComponent(
                entitySpecificTexts.learnMoreLink,
                entitySpecificTexts.learnMoreEntityText,
                _getFeedBackLink(props.searchEntity, props.activityId),
                "");
        }
        else if (props.scenario === ScenariosTypes.ZeroResultsWithFilter) {
            message = Search_Resources.NoResultsMessage.replace("{1}", entitySpecificTexts.noResultsEntityText);
            
            helpText = _getNoResultsHelpTextComponent(
                entitySpecificTexts.learnMoreLink,
                entitySpecificTexts.learnMoreEntityText,
                _getFeedBackLink(props.searchEntity, props.activityId),
                Search_Resources.ZeroResultsWithFilterHelpText);
        }
        else if (props.scenario === ScenariosTypes.ZeroResultsWithWildcardAndFilter) {
            message = Search_Resources.NoResultsMessage.replace("{1}", entitySpecificTexts.noResultsEntityText);
            
            helpText = _getNoResultsHelpTextComponent(
                entitySpecificTexts.learnMoreLink,
                entitySpecificTexts.learnMoreEntityText,
                _getFeedBackLink(props.searchEntity, props.activityId),
                Search_Resources.ZeroResultsWithWildcardAndFilterHelpText);
        }
        else if (props.scenario === ScenariosTypes.ZeroResultsWithNoWildcardNoFilter) {
            message = Search_Resources.NoResultsWithoutAppliedFiltersMessage.replace("{1}", entitySpecificTexts.noResultsEntityText);
            
            helpText = _getNoResultsHelpTextComponent(
                entitySpecificTexts.learnMoreLink,
                entitySpecificTexts.learnMoreEntityText,
                _getFeedBackLink(props.searchEntity, props.activityId),
                Search_Resources.ZeroResultsWithNoWildcardNoFilterHelpText);
        }
        else if (props.scenario === ScenariosTypes.PrefixWildCardNotSupported) {
            message = Search_Resources.WildCardNotSupportedHelpText;
            
            helpText = <div>{Search_Resources.WildCardNotSupportedMessage}</div>;
        }

        return (
            <div className="search-NoResultsPage--container">
                <div className="no-results">
                    <img className="no-results-icon" src={Context.SearchContext.getTfsContext().configuration.getResourcesFile("NoResults.svg")} alt="" />
                    <div className="no-results-message">
                        <FormatComponent format={message}>
                            {
                                <span className="searchText">
                                    {props.searchText}
                                </span>
                            }
                        </FormatComponent>
                    </div>
                    <div className="no-results-suggestion">{helpText}</div>
                </div>
            </div>
        );
    }

const NoPermissionMessageRenderer: React.StatelessComponent<INoResultsPageState> =
    (props: INoResultsPageState): JSX.Element => {
        let message: string,
            helpText: string | JSX.Element;

        if (props.scenario === ScenariosTypes.NoPermission) {
            message = Search_Resources.NoPermissionMessage;
            helpText = _getNoPermissionHelpTextComponent();
        }
        else if (props.scenario === ScenariosTypes.NoPermissionWithShowMore) {
            message = Search_Resources.NoPermissionMessageWithShowMore;
            helpText = _getNoPermissionHelpTextWithShowMoreComponent();
        }
        else if (props.scenario === ScenariosTypes.NoPermissionAfterShowMore) {
            message = Search_Resources.NoPermissionMessageAfterShowMore;
            helpText = _getNoPermissionHelpTextComponent();
        }
        else if (props.scenario === ScenariosTypes.WorkItemNoPermission) {
            message = Search_Resources.WorkItemNoPermissionMessage;
            helpText = Search_Resources.NoPermissionHelptext.replace("{0}", Search_Resources.CheckAccessPermissionLabel);
        }

        return (
            <div className="search-NoResultsPage--container">
                <div className="no-results">
                    <img className="no-results-icon" src={Context.SearchContext.getTfsContext().configuration.getResourcesFile("NoPermission.svg")} alt="" />
                    <div className="no-results-message">{message}</div>
                    <div className="no-results-suggestion">{helpText}</div>
                </div>
            </div>
        );      
    }

const ZeroDataMessageRenderer: React.StatelessComponent<INoResultsPageState> =
    (props: INoResultsPageState): JSX.Element => {
        const isHosted: boolean = Context.SearchContext.isHosted(),
            messages = _getZeroDataScenarioSpecificMessageTexts(props.scenario);

        return (
            <div className="search-NoResultsPage--container">
                <div className="no-results">
                    <img className="no-results-icon" src={Context.SearchContext.getTfsContext().configuration.getResourcesFile("ServiceError.svg")} alt="" />
                    <div className="no-results-message">{messages.message}</div>
                    <div className="no-results-suggestion">
                        {
                            isHosted &&
                            <FormatComponent format={messages.helpText}>
                                {
                                    <a href={_getFeedBackLink(props.searchEntity, props.activityId)}>
                                        {messages.helpTextLinkMessage}
                                    </a>
                                }
                            </FormatComponent>
                        }
                        {
                            !isHosted &&
                            messages.helpText.replace("{0}", Search_Resources.ContactAdminText)
                        }
                    </div>
                </div>
            </div>
        );
    }


function _getNoResultsHelpTextComponent(learnMoreLink: string, learnMoreEntityText: string, feedbackLink: string, helpText: string): JSX.Element {
    const isHosted: boolean = Context.SearchContext.isHosted();
    return (
        <div>
            <div>{helpText}</div>
            <div className="learn-more">
                <FormatComponent format={Search_Resources.NoResultsLearnMoreText}>
                    {
                        <a className="help-link-message" target="_blank" href={learnMoreLink}>
                            {Search_Resources.LearnMoreText}
                        </a>
                    }
                    {learnMoreEntityText}
                </FormatComponent>
            </div>
            <div>
                {
                    isHosted &&
                    <FormatComponent format={Search_Resources.NoResultsContactUsMessage}>
                        {<a href={feedbackLink}>{Search_Resources.LetUsKnowLabel}</a>}
                    </FormatComponent>
                }
                {
                    !isHosted &&
                    Search_Resources.NoResultsContactUsMessage.replace("{0}", Search_Resources.ContactAdminText)
                }

            </div>
        </div>
    );
}

function _getNoPermissionHelpTextWithShowMoreComponent(): JSX.Element {
    return (
        <FormatComponent format={Search_Resources.NoPermissionHelpTextWithShowMore}>
            {
                <a target="_blank" href={SearchConstants.VersionControlPermissionsBlogLink}>
                    {Search_Resources.CheckAccessPermissionLabel}
                </a>
            }
            {
                <span className='no-results-show-more-link'
                    style={{
                        color: "#077acc",
                        cursor: "pointer"
                    }}
                    onClick={
                        (e) => {
                            using(["VSS/Events/Services"],
                                (Events_Services: typeof Events_Services_NO_REQUIRE) => {
                                    Events_Services.getService().fire(SearchConstants.ShowMoreResultsEvent);
                                });
                        }
                    }>
                    {Search_Resources.ShowMoreLabel}
                </span>
            }
        </FormatComponent>
    );
}

function _getNoPermissionHelpTextComponent(): JSX.Element {
    return (
        <FormatComponent format={Search_Resources.NoPermissionHelptext}>
            {
                <a target="_blank" href={SearchConstants.VersionControlPermissionsBlogLink}>
                    {Search_Resources.CheckAccessPermissionLabel}
                </a>
            }
        </FormatComponent >
    );
}

function _getFeedBackLink(searchEntity: Models.SearchProvider, activityId: string): string {
    const searchEntityId = SEARCH_PROVIDER_TO_ENTITY_ID[searchEntity];
    return SearchConstants.Feedback_Link_Content_Format.replace("{0}", searchEntityId).replace("{1}", activityId);
}

function _getEntitySpecificMessageTexts(searchEntity: Models.SearchProvider): any {
    let noResultsEntityText: string,
        learnMoreEntityText: string,
        learnMoreLink: string;

    if (searchEntity === Models.SearchProvider.workItem) {
        noResultsEntityText = Search_Resources.WorkItemsText;
        learnMoreEntityText = Search_Resources.WorkItemEntityName;
        learnMoreLink = SearchConstants.WorkItemLearnMoreLink;
    }
    else if (searchEntity === Models.SearchProvider.code) {
        noResultsEntityText = Search_Resources.CodeFilesText;
        learnMoreEntityText = Search_Resources.CodeEntityName;
        learnMoreLink = SearchConstants.CodeLearnMoreLink;
    }

    return ({
        noResultsEntityText: noResultsEntityText,
        learnMoreEntityText: learnMoreEntityText,
        learnMoreLink: learnMoreLink
    });
 }

function _getZeroDataScenarioSpecificMessageTexts(scenario: ScenariosTypes): any {
    let message: string,
        helpText: string,
        helpTextLinkMessage: string;

    if (scenario === ScenariosTypes.ServiceError) {
        message = Search_Resources.ServiceErrorMessage;
        helpText = Search_Resources.ServiceErrorHelpText;
        helpTextLinkMessage = Search_Resources.LetUsKnowLabel;
    }
    else if (scenario === ScenariosTypes.IndexingScenario) {
        message = Search_Resources.AccountIndexingMessage;
        helpText = Search_Resources.AccountIndexingHelpText;
        helpTextLinkMessage = Search_Resources.PleaseContactUsText;
    }

    return ({
        message: message,
        helpText: helpText,
        helpTextLinkMessage: helpTextLinkMessage
    });
}

export class NoResultsPage extends React.Component<INoResultsPageProps, INoResultsPageState> {
    constructor(props: INoResultsPageProps) {
        super(props);
        this.state = {
            enabled: false
        } as INoResultsPageState;
    }

    public render(): JSX.Element {
        if (!this.state.enabled) {
            return null;
        }

        if (this.state.scenario & ScenariosTypes.NoPermission) {
            return <NoPermissionMessageRenderer {...this.state}/>;
        }
        else if (this.state.scenario === ScenariosTypes.NoResults || 
                 this.state.scenario === ScenariosTypes.PrefixWildCardNotSupported ||
                 this.state.scenario === ScenariosTypes.EmptyQueryNotSupported ||
                 this.state.scenario === ScenariosTypes.OnlyWildcardQueryNotSupported || 
                 this.state.scenario === ScenariosTypes.ZeroResultsWithWildcard || 
                 this.state.scenario === ScenariosTypes.ZeroResultsWithFilter || 
                 this.state.scenario === ScenariosTypes.ZeroResultsWithWildcardAndFilter || 
                 this.state.scenario === ScenariosTypes.ZeroResultsWithNoWildcardNoFilter) {
            return <NoResultsMessageRenderer {...this.state}/>;
        }
        else {
            return <ZeroDataMessageRenderer {...this.state}/>;
        }
    }

    public componentDidMount(): void {
        this.props.storesHub.searchResultsErrorStore.addChangedListener(this._onErrorsUpdated);
        this.props.storesHub.searchActionStore.addChangedListener(this._onSearchResultsUpdated);
    }

    @autobind
    private _onSearchResultsUpdated(): void {
        this.setState({
            enabled: false
        });
    }

    /**
     * If response has error codes then below is the priority order in which we show messages in the results pane.
     *  1. Show PrefixWildcardQueryNotSupported message if PrefixWildcardQueryNotSupported is present
     *  2. If none of the above is there and there are 0 results then show no results found message.
     */
    @autobind
    private _onErrorsUpdated(): void {
        const activityId: string = this.props.storesHub.searchResultsErrorStore.ActivityId,
            response: any = this.props.storesHub.searchResultsErrorStore.Response,
            searchEntity: Models.SearchProvider = this.props.storesHub.searchProvidersStore.CurrentProvider,
            errors: any[] = this.props.storesHub.searchResultsErrorStore.Errors || [],
            showMoreResults: boolean = this.props.storesHub.searchResultsErrorStore.ShowMoreResults,
            searchText = response ? response.query.searchText : "";

        const scenario = this._getNoResultsScenario(response, errors, showMoreResults);
        this.setState({
            enabled: typeof scenario !== "undefined",
            scenario: scenario,
            activityId: activityId,
            searchEntity: searchEntity,
            searchText: searchText
        });
    }

    private _check(errors: any[], ...args: string[]): boolean {
        return errors
            .some(e => args.some((arg: string) => e.errorCode === arg));
    }

    private _getNoResultsScenario(response: any, errors: any[], showMoreClicked: boolean): ScenariosTypes {
        let scenario: ScenariosTypes;

        if (!response) {
            scenario = ScenariosTypes.ServiceError;
        }
        else if (response.results.values.length <= 0) {
            const isPrefixErrorScenario = this._check(
                errors,
                SearchConstants.PrefixWildcardQueryNotSupported),
                isProjectIndexingScenario = this._check(
                    errors,                    
                    SearchConstants.IndexingNotStartedErrorCode,
                    SearchConstants.AccountIsBeingOnboarded
                ),
                isWorkitemNoPermissionScenario = this._check(
                    errors,
                    SearchConstants.WorkItemsNotAccessible
                ),
                isEmptyQueryScenario = this._check(
                   errors,
                   SearchConstants.EmptyQueryNotSupported
                ),
                isOnlyWildcardQueryNotSupported = this._check(
                   errors,
                   SearchConstants.OnlyWildcardQueryNotSupported
                ),
                isZeroResultsWithWildcard = this._check(
                   errors,
                   SearchConstants.ZeroResultsWithWildcard
                ),
                isZeroResultsWithFilter = this._check(
                   errors,
                   SearchConstants.ZeroResultsWithFilter
                ),
                isZeroResultsWithWildcardAndFilter = this._check(
                   errors,
                   SearchConstants.ZeroResultsWithWildcardAndFilter
                ),
                isZeroResultsWithNoWildcardNoFilter = this._check(
                   errors,
                   SearchConstants.ZeroResultsWithNoWildcardNoFilter
                );

            if (isProjectIndexingScenario) {
                scenario = ScenariosTypes.IndexingScenario;
            }
            else if (isPrefixErrorScenario) {
                scenario = ScenariosTypes.PrefixWildCardNotSupported;
            }
            else if (isWorkitemNoPermissionScenario) {
                scenario = ScenariosTypes.WorkItemNoPermission;
            }
            else if (isEmptyQueryScenario) {
                scenario = ScenariosTypes.EmptyQueryNotSupported
            }
            else if (isOnlyWildcardQueryNotSupported) {
                scenario = ScenariosTypes.OnlyWildcardQueryNotSupported
            }
            else if (isZeroResultsWithWildcard) {
                scenario = ScenariosTypes.ZeroResultsWithWildcard
            }
            else if (isZeroResultsWithFilter) {
                scenario = ScenariosTypes.ZeroResultsWithFilter
            }
            else if (isZeroResultsWithWildcardAndFilter) {
                scenario = ScenariosTypes.ZeroResultsWithWildcardAndFilter
            }
            else if (isZeroResultsWithNoWildcardNoFilter) {
                scenario = ScenariosTypes.ZeroResultsWithNoWildcardNoFilter
            }
            else {
                const totalResultsCount = response.results.count;

                if (totalResultsCount <= 0) {
                    scenario = ScenariosTypes.NoResults;
                }
                else if (totalResultsCount <= SearchConstants.DefaultTakeResults) {
                    scenario = ScenariosTypes.NoPermission;
                }
                else {
                    // Lets present user with a show more link if one hasn't clicked it already.
                    scenario = !showMoreClicked
                        ? ScenariosTypes.NoPermissionWithShowMore
                        : ScenariosTypes.NoPermissionAfterShowMore;
                }
            }
        }

        return scenario;
    }
}