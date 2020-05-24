import * as React from "react";
import { autobind } from "OfficeFabric/Utilities";
import { getPageContext } from "VSS/Context";

import { WikiV2 } from "TFS/Wiki/Contracts";
import { PublishContainer, PublishMode, PublishInputData } from "Wiki/Scenarios/Publish/Components/PublishContainer";
import { SharedContainerProps } from "Wiki/Scenarios/Shared/Components/WikiContainer";
import { GitRepositorySource } from "Wiki/Scenarios/Publish/GitRepositorySource";
import { PublishActionCreator } from "Wiki/Scenarios/Publish/PublishActionCreator";
import { PublishDataStore } from "Wiki/Scenarios/Publish/PublishDataStore";
import { PublishWikiSource } from "Wiki/Scenarios/Publish/PublishWikiSource";
import { PublishActionsHub } from "Wiki/Scenarios/Publish/PublishActionsHub";
import { WikiActionIds } from "Wiki/Scripts/CommonConstants";
import { PerformanceConstants } from "Wiki/Scripts/CustomerIntelligenceConstants";

export class PublishModule extends React.Component<SharedContainerProps, {}> {
    private _gitRepoSource: GitRepositorySource;
    private _publishSource: PublishWikiSource;
    private _actionCreator: PublishActionCreator;
    private _actionsHub: PublishActionsHub;
    private _store: PublishDataStore;
    private _currentWiki: WikiV2;
    private _publishMode: PublishMode;

    constructor(props: SharedContainerProps) {
        super(props);

        const urlAction = this.props.sharedStoresHub.getSharedState().urlState.action;

        if (urlAction === WikiActionIds.Publish) {
            // No wiki is populated since Publish is not a wiki scope operation.
            this._publishMode = PublishMode.new;
            this._currentWiki = null;
        } else {
            this._publishMode = PublishMode.update;
            this._currentWiki = this.props.sharedStoresHub.getSharedState().commonState.wiki;
        }

        this._publishSource = new PublishWikiSource();
        this._gitRepoSource = new GitRepositorySource();
        this._actionsHub = new PublishActionsHub();
        this._actionCreator = new PublishActionCreator(
            this.props.sharedActionsHub,
            this._actionsHub,
            {
                publishSource: this._publishSource,
                gitRepositorySource: this._gitRepoSource,
            });
        this._store = new PublishDataStore(this._actionsHub, this._currentWiki);
    }

    public componentWillUnmount(): void {
        this._store.dispose();
        this._actionCreator = null;
        this._actionsHub = null;
    }

    public render(): JSX.Element {
        return (
            <PublishContainer
                inputData={{
                    mode: this._publishMode,
                    projectId: getPageContext().webContext.project.id,
                    wiki: this._currentWiki,
                }}
                actionCreator={this._actionCreator}
                store={this._store}
                onScenarioComplete={this._onScenarioComplete} />
        );
    }

    @autobind
    private _onScenarioComplete(): void {
        this.props.sharedActionCreator.notifyContentRendered(PerformanceConstants.Publish);
    }
}