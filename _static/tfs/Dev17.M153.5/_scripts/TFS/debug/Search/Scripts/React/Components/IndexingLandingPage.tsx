import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Context from "Search/Scripts/Common/TFS.Search.Context";
import * as Models from "Search/Scripts/React/Models";
import * as Search_Resources from "Search/Scripts/Resources/TFS.Resources.Search";

import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";
import { SEARCH_PROVIDER_TO_ENTITY_ID } from "Search/Scripts/React/Stores/SearchProvidersStore";
import { TelemetryHelper } from "Search/Scripts/Common/TFS.Search.TelemetryHelper";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";
import { ActionCreator } from "Search/Scripts/React/ActionCreator";
import { StoresHub } from "Search/Scripts/React/StoresHub";

import "VSS/LoaderPlugins/Css!Search/React/Components/IndexingLandingPage";

export interface IIndexingLandingPageState {
    activityId: string;
    searchEntity: Models.SearchProvider;
    enabled: boolean;
}

export interface IndexingLandingPageProps {
    actionCreator: ActionCreator;
    storesHub: StoresHub;
    isOldLayout: boolean;
}

export function renderInto(container: HTMLElement, props: IndexingLandingPageProps): void {
    ReactDOM.render(
        <IndexingLandingPage { ...props } />,
        container);
}

export class IndexingLandingPage extends React.Component<IndexingLandingPageProps, IIndexingLandingPageState> {
    constructor(props: IndexingLandingPageProps) {
        super(props);
        this.state = {
            activityId: "",
            enabled: false
        } as IIndexingLandingPageState;
    }

    public render(): JSX.Element {
        const feedbackLink = SearchConstants.Feedback_Link_Content_Format.
            replace("{0}", SEARCH_PROVIDER_TO_ENTITY_ID[this.state.searchEntity])
            .replace("{1}", this.state.activityId);

        const isHosted = Context.SearchContext.isHosted();


        return (
            <div className="search-IndexingLandingPage--container">
                {
                    this.state.enabled &&
                    this._oldLayoutIndexingMessageRenderer(feedbackLink)
                }
            </div>);
    }

    public componentDidMount(): void {
        this.props.storesHub.searchResultsErrorStore.addChangedListener(this._onErrorsUpdated.bind(this));
    }

    public componentDidUpdate(): void {
        this.state.enabled && TelemetryHelper.traceLog({ "IndexingLandingPageShown": true });
    }

    private _onErrorsUpdated(): void {

        const activityId: string = this.props.storesHub.searchResultsErrorStore.ActivityId,
            response: any = this.props.storesHub.searchResultsErrorStore.Response,
            searchEntity: Models.SearchProvider = this.props.storesHub.searchProvidersStore.CurrentProvider,
            errors: any[] = this.props.storesHub.searchResultsErrorStore.Errors || [],
            enabled: boolean = response ? errors
                .some(e =>                    
                    e.errorCode === SearchConstants.IndexingNotStartedErrorCode ||
                    (e.errorCode === SearchConstants.AccountIsBeingOnboarded && response.results.values.length <= 0))
                : false;

        this.setState({
            activityId: activityId,
            enabled: enabled,
            searchEntity: searchEntity
        } as IIndexingLandingPageState);
    }

    private _oldLayoutIndexingMessageRenderer(feedbackLink: string): JSX.Element {
        const imgUrl = Context.SearchContext.getTfsContext().configuration.getResourcesFile("Indexing.png"),
            isHosted = Context.SearchContext.isHosted(),
            feedbackMessage = isHosted
                ? Search_Resources.ShowAccountNotIndexedFeedbackMessageForHostedWithoutLink
                : Search_Resources.ShowAccountNotIndexedFeedbackMessageForOnPrem;

        return (
            <div className="landing-page">
                <div>
                    <div className="indexing-message">{Search_Resources.WorkItemLandingPageIndexingMessage}</div>
                    <div className="finishing-message">{Search_Resources.WorkItemLandingPageFinishingmessage}</div>
                    <img className="workitem-indexing-icon" src={imgUrl} alt="" />
                    <div className="learn-more">
                        <a target="_blank" href={SearchConstants.WorkItemLearnMoreLink}>
                            <span className="bowtie-icon bowtie-status-help-outline" />
                            <span className="help-link-message">{Search_Resources.WorkItemLandingPageHelpMessage}</span>
                        </a>
                    </div>
                    <div className="feedback-message">
                        <p>
                            <span>
                                {feedbackMessage}
                            </span>
                            <a href={feedbackLink}>{Search_Resources.ContactUsText}</a>
                        </p>
                    </div>
                </div>
            </div>
        );
    }
}
