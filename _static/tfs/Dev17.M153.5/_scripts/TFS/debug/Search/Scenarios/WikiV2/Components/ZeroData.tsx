import * as React from "react";
import * as Container from "Search/Scenarios/WikiV2/Components/Container";
import * as ZeroData from "Search/Scenarios/Shared/Components/ZeroData";
import * as Constants from "Search/Scenarios/WikiV2/Constants";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ScenarioType } from "Search/Scenarios/Shared/Components/ZeroData/ZeroData.Props";

import "VSS/LoaderPlugins/Css!Search/Scenarios/WikiV2/Components/ZeroData";

export const ZeroDataContainer = Container.create(
    ["zeroDataStore"],
    ({ searchStoreState, zeroDataState }, props) => {
        if (zeroDataState.scenario && (zeroDataState.scenario !== ZeroData.ScenarioType.None)) {
            const { request } = searchStoreState,
                { notifyResultsRendered, publishZeroData, notifyFeedbackMailLinkClicked } = props.actionCreator
            let zeroDataProps = {} as ZeroData.IZeroDataProps;

            if (zeroDataState.scenario === ZeroData.ScenarioType.LandingPage) {
                zeroDataProps.message = Resources.WikiWelcomeText;
                zeroDataProps.help = "";
            }
            else {
                zeroDataProps = getZeroDataProps(
                    request.searchText,
                    zeroDataState.scenario,
                    notifyFeedbackMailLinkClicked);
            }

            return <ZeroData.ZeroData
                {...zeroDataProps}
                onDidMount={() => {
                    notifyResultsRendered();
                    publishZeroData(ZeroData.ScenarioType[zeroDataProps.scenario]);
                }} />;
        }

        return null;
    });

function getZeroDataProps(queryText: string, scenario: ScenarioType, notifyFeedbackMailLinkClicked: () => void): ZeroData.IZeroDataProps {
    let zeroDataProps = {} as ZeroData.IZeroDataProps;
    const isHosted: boolean = TfsContext.getDefault().isHosted;

    if (scenario === ZeroData.ScenarioType.ServiceError) {
        const messageText: string = Resources.ServiceErrorMessage;
        const feedbackLink = isHosted
            ? Constants.CodexFeedbackMailToLinkFormat
            : Constants.FeedbackMailToLinkFormat;
        zeroDataProps.scenario = ZeroData.ScenarioType.ServiceError;
        zeroDataProps.message = messageText;
        zeroDataProps.help = ZeroData.getServiceErrorHelp(isHosted, feedbackLink);
    }
    else {
        zeroDataProps.scenario = scenario;

        if (zeroDataProps.scenario === ZeroData.ScenarioType.ZeroResults) {
            const feedbackLink = isHosted
                ? Constants.CodexFeedbackMailToLinkFormat
                : Constants.FeedbackMailToLinkFormat;
            const message: JSX.Element =
                <FormatComponent format={Resources.ZeroWikiResultsMessageFormat}>
                    {
                        <span className="searchText">
                            {queryText}
                        </span>
                    }
                </FormatComponent>;

            const help: JSX.Element = ZeroData.getZeroResultsHelpComponent(
                isHosted,
                Resources.ZeroResultsHelpText,
                Resources.ZeroWikiResultsLearnMoreFormat,
                Constants.LearnMoreLink,
                feedbackLink,
                notifyFeedbackMailLinkClicked);

            zeroDataProps.message = message;
            zeroDataProps.help = help;
        }
        else if (zeroDataProps.scenario === ZeroData.ScenarioType.PrefixWildCardNotSupported) {
            zeroDataProps.message = ZeroData.getQueryNotSupportedHelp(queryText, Resources.WildCardNotSupportedHelpFormat);
            zeroDataProps.help = Resources.WildCardNotSupportedMessage;
        }
        else if (zeroDataProps.scenario === ZeroData.ScenarioType.NoPermission) {
            zeroDataProps.message = Resources.ZeroWikiResultsNoPermissionMessage;
            zeroDataProps.help = ZeroData.getAccessPermissionHelp();
        }
        else if (zeroDataProps.scenario === ZeroData.ScenarioType.IndexingScenario) {
            const feedbackLink = isHosted
                ? Constants.CodexFeedbackMailToLinkFormat
                : Constants.FeedbackMailToLinkFormat;
            zeroDataProps.message = Resources.AccountIndexingMessage;
            zeroDataProps.help = ZeroData.getIndexingHelp(isHosted, feedbackLink);
        }
    }

    return zeroDataProps;
}
