import * as React from "react";

import { VersionControlChangeType } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { CompareActionCreator } from "Wiki/Scenarios/Compare/CompareActionCreator";
import { ItemContentContainer } from "Wiki/Scenarios/Compare/Components/ItemContentContainer";
import { TopContentContainer } from "Wiki/Scenarios/Compare/Components/TopContentContainer";
import { CompareStoresHub } from "Wiki/Scenarios/Compare/Stores/CompareStoresHub";
import { CompareViews } from "Wiki/Scripts/CommonConstants";
import { getGitItemPathForPage } from "Wiki/Scripts/Helpers";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Compare/Components/CompareContainer";

export interface CompareModuleFluxProps {
    actionCreator: CompareActionCreator;
    storesHub: CompareStoresHub;
    onContentRendered?: (scenario?: string) => void;
}

export interface CompareContainerState {
    currentView: string;
}

export class CompareContainer extends React.Component<CompareModuleFluxProps, CompareContainerState> {
    constructor(props: CompareModuleFluxProps) {
        super(props);

        const urlState = this.props.storesHub.state.sharedState.urlState;
        const commonState = this.props.storesHub.state.sharedState.commonState;
        this.state = {
            currentView: urlState.view,
        };

        const pagePath = urlState.pagePath;
        const gitItemPath = getGitItemPathForPage(pagePath, commonState.wiki.mappedPath);

        this.props.actionCreator.renderRevisionDetailsPage(
            urlState.version,
            pagePath,
            gitItemPath,
            urlState.view);
    }

    public render(): JSX.Element {
        return (
            <div className={"wiki-compare-container"}>
                <TopContentContainer {...this.props} />
                <ItemContentContainer {...this.props} />
            </div>
        );
    }

    public componentWillReceiveProps(nextProps: CompareModuleFluxProps): void {
        const urlState = this.props.storesHub.state.sharedState.urlState;
        const commonState = this.props.storesHub.state.sharedState.commonState;
        const comparePageStoreState = this.props.storesHub.comparePageStore.state;

        // Do not fetch data if view hasn't changed
        if (urlState.view === this.state.currentView) {
            return;
        }

        const version = urlState.version;
        const currentView = urlState.view;
        const pagePath = urlState.pagePath;
        const gitItemPath = getGitItemPathForPage(pagePath, commonState.wiki.mappedPath);

        if (currentView === CompareViews.Compare && !comparePageStoreState.item) {
            this.props.actionCreator.fetchCompareViewData(version, pagePath, gitItemPath);
        } else if (currentView === CompareViews.Preview && !comparePageStoreState.fileContent) {
            const isDeleted = comparePageStoreState.itemChangeType === VersionControlChangeType.Delete;
            this.props.actionCreator.fetchPreviewViewData(version, pagePath, isDeleted);
        }

        this.setState({ currentView: currentView });
    }
}