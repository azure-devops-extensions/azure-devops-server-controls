import * as React from "react";
import * as Container from "Search/Scenarios/Code/Components/Container";
import * as ZeroData from "Search/Scenarios/Shared/Components/ZeroData";
import * as Constants from "Search/Scenarios/Code/Constants";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";
import { ScenarioType } from "Search/Scenarios/Shared/Components/ZeroData/ZeroData.Props";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import "VSS/LoaderPlugins/Css!Search/Scenarios/Code/Components/ZeroData";

export const ZeroDataContainer = Container.create(
    ["zeroDataStore"],
    ({ searchStoreState, zeroDataState }, props) => {
        const { scenario } = zeroDataState;
        if (scenario && scenario !== ZeroData.ScenarioType.None) {
            const { activityId, query, error } = searchStoreState;
            const {
                notifyResultsRendered,
                publishZeroData,
                onPreviewLoaded,
                notifySearchFailed,
                fetchMoreResults,
                notifyFeedbackMailLinkClicked
            } = props.actionCreator;

            let zeroDataProps = {} as ZeroData.IZeroDataProps;
            if (scenario === ZeroData.ScenarioType.LandingPage) {
                zeroDataProps.message = Resources.CodeWelocmeText;
                zeroDataProps.help = "";
            }
            else {

                zeroDataProps =
                    getZeroDataProps(fetchMoreResults, query.searchText, activityId, scenario, notifyFeedbackMailLinkClicked);
            }

            return <ZeroData.ZeroData
                {...zeroDataProps}
                onDidMount={
                    () => {
                        publishZeroData(ZeroData.ScenarioType[scenario], error);
                        onDidMount(scenario, notifyResultsRendered, notifySearchFailed, onPreviewLoaded)
                    }
                } />;
        }

        return null;
    });

function getZeroDataProps(
    onFetchMore: () => void,
    queryText: string,
    activityId: string,
    scenario: ScenarioType,
    notifyFeedbackMailLinkClicked: () => void): ZeroData.IZeroDataProps {

    let zeroDataProps = {} as ZeroData.IZeroDataProps;
    const isHosted: boolean = TfsContext.getDefault().isHosted;

    if (scenario === ZeroData.ScenarioType.ServiceError) {
        const messageText: string = Resources.ServiceErrorMessage;
        const feedbackLink = isHosted
            ? Constants.CodexFeedbackMailToLinkFormat.replace("{0}", activityId)
            : Constants.FeedbackMailToLinkFormat.replace("{0}", activityId);
        zeroDataProps.scenario = ZeroData.ScenarioType.ServiceError;
        zeroDataProps.message = messageText;
        zeroDataProps.help = ZeroData.getServiceErrorHelp(isHosted, feedbackLink);
    }
    else {
        zeroDataProps.scenario = scenario;
        if (zeroDataProps.scenario === ZeroData.ScenarioType.ZeroResults ||
            zeroDataProps.scenario === ZeroData.ScenarioType.ZeroResultsWithFilter ||
            zeroDataProps.scenario === ZeroData.ScenarioType.ZeroResultsWithWildcardAndFilter) {
            zeroDataProps.message = getZeroDataMessage(queryText, Resources.ZeroCodeResultsMessageFormat);
            let helpMessage: string = (zeroDataProps.scenario === ZeroData.ScenarioType.ZeroResults ||
                zeroDataProps.scenario === ZeroData.ScenarioType.ZeroResultsWithFilter) ?
                Resources.ZeroResultsWithFilterHelpText : Resources.ZeroResultsWithWildcardAndFilterHelpText;
            zeroDataProps.help = getZeroDataHelp(isHosted, helpMessage, activityId, notifyFeedbackMailLinkClicked);
        }
        else if (zeroDataProps.scenario === ZeroData.ScenarioType.EmptyQueryNotSupported) {
            zeroDataProps.message = getZeroDataMessage(queryText, Resources.EmptyQueryMessage);
            zeroDataProps.help = getZeroDataHelp(isHosted, Resources.EmptyQueryHelpText, activityId, notifyFeedbackMailLinkClicked);
        }
        else if (zeroDataProps.scenario === ZeroData.ScenarioType.OnlyWildcardQueryNotSupported) {
            zeroDataProps.message = getZeroDataMessage(queryText, Resources.OnlyWildcardQueryNotSupportedMessage);
            zeroDataProps.help = getZeroDataHelp(isHosted, Resources.OnlyWildcardQueryNotSupportedHelpText, activityId, notifyFeedbackMailLinkClicked);
        }
        else if (zeroDataProps.scenario === ZeroData.ScenarioType.ZeroResultsWithWildcard ||
            zeroDataProps.scenario === ZeroData.ScenarioType.ZeroResultsWithNoWildcardNoFilter) {
            zeroDataProps.message = getZeroDataMessage(queryText, Resources.ZeroCodeResultsWithoutFiltersMessageFormat);
            let helpMessage: string = (zeroDataProps.scenario === ZeroData.ScenarioType.ZeroResultsWithWildcard) ? "" : Resources.ZeroResultsWithNoWildcardNoFilterHelpText;
            zeroDataProps.help = getZeroDataHelp(isHosted, helpMessage, activityId, notifyFeedbackMailLinkClicked);
        }
        else if (zeroDataProps.scenario === ZeroData.ScenarioType.PrefixWildCardNotSupported) {
            zeroDataProps.message = ZeroData.getQueryNotSupportedHelp(queryText, Resources.WildCardNotSupportedHelpFormat);
            zeroDataProps.help = Resources.WildCardNotSupportedMessage;
        }
        else if(zeroDataProps.scenario === ZeroData.ScenarioType.PhraseQueriesWithCEFacetsNotSupported) {
            zeroDataProps.message = ZeroData.getQueryNotSupportedHelp(queryText, Resources.PhraseAndCEFacetsNotSupportedMessage);
            zeroDataProps.help = Resources.ZeroResultsWithWildcardAndFilterHelpText;
        }
        else if(zeroDataProps.scenario === ZeroData.ScenarioType.WildcardQueriesWithCEFacetsNotSupported) {
            zeroDataProps.message = ZeroData.getQueryNotSupportedHelp(queryText, Resources.WildcardAndCEFacetsNotSupportedMessage);
            zeroDataProps.help = Resources.ZeroResultsWithWildcardAndFilterHelpText;
        }
        else if (zeroDataProps.scenario === ZeroData.ScenarioType.NoPermission) {
            zeroDataProps.message = Resources.ZeroCodeResultsNoPermissionMessage;
            zeroDataProps.help = ZeroData.getAccessPermissionHelp(Constants.VersionControlPermissionsBlogLink);
        }
        else if (zeroDataProps.scenario === ZeroData.ScenarioType.NoPermissionWithShowMore) {
            const help: JSX.Element =
                <FormatComponent format={Resources.ZeroCodeResultsNoPermissionWithShowMoreHelpFormat}>
                    {
                        <a target="_blank" href={Constants.VersionControlPermissionsBlogLink}>
                            {Resources.CheckAccessPermissionLabel}
                        </a>
                    }
                    {
                        <span className="no-results-show-more-link" onClick={onFetchMore}>
                            {Resources.ShowMoreLabel}
                        </span>
                    }
                </FormatComponent>;

            zeroDataProps.message = Resources.ZeroCodeResultsNoPermissionMessageWithShowMore;
            zeroDataProps.help = help;
        }
        else if (zeroDataProps.scenario === ZeroData.ScenarioType.NoPermissionAfterShowMore) {
            zeroDataProps.message = Resources.ZeroCodeResultsNoPermissionMessageAfterShowMore;
            zeroDataProps.help = ZeroData.getAccessPermissionHelp(Constants.VersionControlPermissionsBlogLink);;
        }
        else if (zeroDataProps.scenario === ZeroData.ScenarioType.IndexingScenario) {
            const feedbackLink = isHosted
                ? Constants.CodexFeedbackMailToLinkFormat.replace("{0}", activityId)
                : Constants.FeedbackMailToLinkFormat.replace("{0}", activityId);
            zeroDataProps.message = Resources.AccountIndexingMessage;
            zeroDataProps.help = ZeroData.getIndexingHelp(isHosted, feedbackLink);
        }
    }

    return zeroDataProps;
}

function getZeroDataMessage(
    queryText: string,
    messageText: string): JSX.Element {
    const message: JSX.Element =
        <FormatComponent format={messageText}>
            {
                <span className="searchText">
                    {queryText}
                </span>
            }
        </FormatComponent>;

    return message;
}

function getZeroDataHelp(
    isHosted: boolean,
    helpText: string,
    activityId: string,
    notifyFeedbackMailLinkClicked: () => void
): JSX.Element {
    const feedbackLink = isHosted
        ? Constants.CodexFeedbackMailToLinkFormat.replace("{0}", activityId)
        : Constants.FeedbackMailToLinkFormat.replace("{0}", activityId);
    const help: JSX.Element = ZeroData.getZeroResultsHelpComponent(
        isHosted,
        helpText,
        Resources.ZeroCodeResultsLearnMoreFormat,
        Constants.LearnMoreLink,
        feedbackLink,
        notifyFeedbackMailLinkClicked);

    return help;
}

function onDidMount(
    zeroDataScenario: ZeroData.ScenarioType,
    notifyResultsRendered: () => void,
    notifySearchFailed: () => void,
    onPreviewLoaded: () => void): void {
    const searchFailed = zeroDataScenario === ZeroData.ScenarioType.ServiceError;

    if (!searchFailed) {
        notifyResultsRendered();
        onPreviewLoaded();
    }
    else {
        notifySearchFailed();
    }
}
