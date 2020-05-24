import * as React from "react";
import { Link } from "OfficeFabric/Link";
import * as String_Utils from "VSS/Utils/String";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";

import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";
import { InfoCodes } from "Search/Scripts/Generated/Search.Shared.Contracts";
import { getSearchEntities, SearchEntity, SearchEntitiesIds, getSearchEntitiesMap } from "Search/Scripts/React/Models";
import * as Search_Resources from "Search/Scripts/Resources/TFS.Resources.Search";

import "VSS/LoaderPlugins/Css!Search/ZeroData";

export interface ErrorMessageProps {
    searchText: string;
    searchEntity: SearchEntity;
    errorCode: InfoCodes;
    activityId: string;
    isServiceError: boolean;
}

export const ErrorMessage = ({ searchEntity, errorCode, activityId, searchText, isServiceError }: ErrorMessageProps): JSX.Element => {

    if (errorCode) {
        if (errorCode === InfoCodes.AccountIsBeingOnboarded ||
            errorCode === InfoCodes.IndexingNotStarted ||
            errorCode === InfoCodes.AccountIsBeingReindexed) {
            return (
                <ZeroDataMessage
                    activityId={activityId}
                    searchEntity={searchEntity}
                    errorType={ErrorTypes.IndexingScenario} />);
        }

        else if (errorCode === InfoCodes.PrefixWildcardQueryNotSupported) {
            return (
                <NoResultsMessage
                    searchText={searchText}
                    activityId={activityId}
                    searchEntity={searchEntity}
                    errorType={ErrorTypes.PrefixWildCardNotSupported} />
            );
        }
    }

    else {
        return (
            isServiceError
                ? <ZeroDataMessage
                    activityId={activityId}
                    searchEntity={searchEntity}
                    errorType={ErrorTypes.ServiceError} />
                : searchText
                    ? <NoResultsMessage
                        searchText={searchText}
                        activityId={activityId}
                        searchEntity={searchEntity}
                        errorType={ErrorTypes.NoResults} />
                    : <FirstDayExperience />
        );
    }
};

/**
 * Creates a new component for the given render function by passing into it the global TfsContext.
 * @param render The function that renders the original component.
 * Don't forget to assign also the props passed as an argument.
 * @returns A function that creates the new tfsContext-bound component.
 */

export function useTfsContext<P>(render: (tfsContext: TfsContext, props: P) => JSX.Element): React.StatelessComponent<P> {
    return (props: P) => render(TfsContext.getDefault(), props);
}

export enum ErrorTypes {
    ServiceError = 0x0,
    IndexingScenario = 0x1,

    // No results sceanrios (2nd set bit)
    NoResults = 0x2,
    PrefixWildCardNotSupported = 0x3,

    // Permission access scenarios (3rd set bit)
    NoPermission = 0x4,
    NoPermissionWithShowMore = 0x5,
    NoPermissionAfterShowMore = 0x6,
    WorkItemNoPermission = 0x7
}

export interface NoResultsPageProps {
    errorType: ErrorTypes;
    activityId: string;
    searchEntity: SearchEntity;
    searchText: string;
}

interface NoResultsMessagePureProps extends NoResultsPageProps {
    noResultImageUrl: string;
    isHosted: boolean;
}

const NoResultsMessagePure = (props: NoResultsMessagePureProps): JSX.Element => {
    let message: string;
    let helpText: JSX.Element;

    if (props.errorType === ErrorTypes.NoResults) {
        message = Search_Resources.NoResultsMessage.replace("{1}", props.searchEntity.noResultsText);
        helpText =
            <NoResultsHelpText
                searchEntity={props.searchEntity}
                learnMoreEntityText={props.searchEntity.learnMoreText}
                feedbackLink={constructFeedBackLink(props.searchEntity, props.activityId)}
                isHosted={props.isHosted} />;
    }
    else if (props.errorType === ErrorTypes.PrefixWildCardNotSupported) {
        message = Search_Resources.WildCardNotSupportedHelpText;
        helpText = <div>{Search_Resources.WildCardNotSupportedMessage}</div>;
    }

    return (
        <ZeroDataContainer noResultImageUrl={props.noResultImageUrl}>
            <div className="no-results-message">
                <FormatComponent format={message}>
                    <span className="searchText">
                        {
                            props.searchText
                        }
                    </span>
                </FormatComponent>
            </div>
            <div className="no-results-suggestion">
                {
                    helpText
                }
            </div>
        </ZeroDataContainer>
    );
};

const NoResultsMessage = useTfsContext<NoResultsPageProps>((tfsContext, props) =>
    <NoResultsMessagePure
        noResultImageUrl={tfsContext.configuration.getResourcesFile("NoResults.svg")}
        isHosted={tfsContext.isHosted}
        {...props} />);


// Will be adding this later based on spec availability
const FirstDayExperience = (): JSX.Element => null;

interface NoResultHelpTextProps {
    searchEntity: SearchEntity;
    learnMoreEntityText: string;
    feedbackLink: string;
    isHosted: boolean;
}

function constructFeedBackLink(searchEntity: SearchEntity, activityId: string): string {
    const searchEntityId = searchEntity.entity;
    if (searchEntityId === SearchEntitiesIds.wiki) {
        return SearchConstants.WikiSearchLetUsKnowLink;
    }
    
    return String_Utils.format(SearchConstants.Feedback_Link_Content_Format, searchEntityId, activityId);
}

const NoResultsHelpText = ({ searchEntity, learnMoreEntityText, feedbackLink, isHosted }: NoResultHelpTextProps): JSX.Element => {
    return (
        <div>
            <div>{Search_Resources.NoResultsHelptext}</div>
            {
                searchEntity.entity !== SearchEntitiesIds.wiki
                ? <div className="learn-more">
                        <FormatComponent format={Search_Resources.NoResultsLearnMoreText}>
                            <Link className="help-link-message" target="_blank" rel="noopener noreferrer" href={searchEntity.learnMoreLink}>
                                {Search_Resources.LearnMoreText}
                            </Link>
                            {
                                learnMoreEntityText
                            }
                        </FormatComponent>
                  </div>
                : null
            }
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
};

export interface ZeroDataMessageProps {
    errorType: ErrorTypes;
    searchEntity: SearchEntity;
    activityId: string;
}

interface ZeroDataMessagePureProps extends ZeroDataMessageProps {
    noResultImageUrl: string;
    isHosted: boolean;
}

const ZeroDataMessagePure = ({ errorType, noResultImageUrl, searchEntity, activityId, isHosted }: ZeroDataMessagePureProps): JSX.Element => {

    const messages = getZeroDataSpecificMessages(errorType);

    return (
        <ZeroDataContainer noResultImageUrl={noResultImageUrl}>
            <div className="no-results-message">{messages.message}</div>
            <div className="no-results-suggestion">
                {
                    isHosted
                        ? <FormatComponent format={messages.helpText}>
                            <a href={constructFeedBackLink(searchEntity, activityId)}>
                                {messages.helpTextLinkMessage}
                            </a>
                        </FormatComponent>
                        : messages.helpText.replace("{0}", Search_Resources.ContactAdminText)
                }
            </div>
        </ZeroDataContainer>
    );
};

interface ZeroDataContainerProps {
    noResultImageUrl: string;
}

const ZeroDataContainer: React.StatelessComponent<ZeroDataContainerProps> = (props): JSX.Element =>
    <div className="search-zerodata--container">
        <div className="no-results">
            <img className="no-results-icon" src={props.noResultImageUrl} alt="" />
            {props.children}
        </div>
    </div>;

export const ZeroDataMessage = useTfsContext<ZeroDataMessageProps>((tfsContext, props) =>
    <ZeroDataMessagePure
        noResultImageUrl={tfsContext.configuration.getResourcesFile("ServiceError.svg")}
        isHosted={tfsContext.isHosted}
        {...props} />);

interface ZeroDataSpecificMessages {
    message: string;
    helpText: string;
    helpTextLinkMessage: string;
}

function getZeroDataSpecificMessages(errorType: ErrorTypes): ZeroDataSpecificMessages {
    if (errorType === ErrorTypes.ServiceError) {
        return {
            message: Search_Resources.ServiceErrorMessage,
            helpText: Search_Resources.ServiceErrorHelpText,
            helpTextLinkMessage: Search_Resources.LetUsKnowLabel
        };
    }
    else if (errorType === ErrorTypes.IndexingScenario) {
        return {
            message: Search_Resources.AccountIndexingMessage,
            helpText: Search_Resources.AccountIndexingHelpText,
            helpTextLinkMessage: Search_Resources.PleaseContactUsText
        };
    }
}
