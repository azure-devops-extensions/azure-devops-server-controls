import * as React from "react";
import * as Container from "Search/Scenarios/WorkItem/Components/Container";
import * as ZeroData from "Search/Scenarios/Shared/Components/ZeroData";
import * as Constants from "Search/Scenarios/WorkItem/Constants";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ScenarioType } from "Search/Scenarios/Shared/Components/ZeroData/ZeroData.Props";

import "VSS/LoaderPlugins/Css!Search/Scenarios/WorkItem/Components/ZeroData";

export const ZeroDataContainer = Container.create(
    ["zeroDataStore"],
    ({ searchStoreState, zeroDataState }, props) => {
        const { scenario } = zeroDataState;
        if (scenario && scenario !== ZeroData.ScenarioType.None) {
            const { activityId, query, error } = searchStoreState,
                { notifyResultsRendered, publishZeroData, onPreviewLoaded, notifySearchFailed, notifyFeedbackMailLinkClicked } = props.actionCreator
            let zeroDataProps = {} as ZeroData.IZeroDataProps;

            if (scenario === ZeroData.ScenarioType.LandingPage) {
                zeroDataProps.message = Resources.WorkItemWelcomeText;
                zeroDataProps.help = "";
            }
            else {
                zeroDataProps = getZeroDataProps(query.searchText, activityId, scenario, notifyFeedbackMailLinkClicked);
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
    queryText: string,
    activityId: string,
    scenario: ScenarioType,
    notifyFeedbackMailLinkClicked: () => void
): ZeroData.IZeroDataProps {
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

        if (zeroDataProps.scenario === ZeroData.ScenarioType.ZeroResults) {
            const feedbackLink = isHosted
                ? Constants.CodexFeedbackMailToLinkFormat.replace("{0}", activityId)
                : Constants.FeedbackMailToLinkFormat.replace("{0}", activityId);
            const message: JSX.Element =
                <FormatComponent format={Resources.ZeroWorkItemResultsMessageFormat}>
                    {
                        <span className="searchText">
                            {queryText}
                        </span>
                    }
                </FormatComponent>;

            const help: JSX.Element = ZeroData.getZeroResultsHelpComponent(
                isHosted,
                Resources.ZeroResultsHelpText,
                Resources.ZeroWorkItemResultsLearnMoreFormat,
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
            zeroDataProps.message = Resources.ZeroWorkItemResultsNoPermissionMessage;
            zeroDataProps.help = ZeroData.getAccessPermissionHelp();
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