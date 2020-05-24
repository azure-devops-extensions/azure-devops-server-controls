/// <reference types="react-dom" />
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Fabric } from "OfficeFabric/Fabric";
import { getScenarioManager } from "VSS/Performance";
import { globalProgressIndicator } from "VSS/VSS";

import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

import { VisibilityTag } from "ProjectOverview/Scripts/Shared/Components/VisibilityTag";

import { CIConstants, PerfConstants } from "RepositoryOverview/Scripts/Constants";
import * as RepositoryOverviewContracts from "RepositoryOverview/Scripts/Generated/Contracts";
import { GitRepositoryFavorite } from "RepositoryOverview/Scripts/Components/RepositoryFavorite";
import { ReadmeEditorContainer } from "RepositoryOverview/Scripts/Components/ReadmeEditorContainer";
import { RepositoryActionMenu } from "RepositoryOverview/Scripts/Components/RepositoryActionMenu";
import { RepositoryTagsContainer } from "RepositoryOverview/Scripts/Components/RepositoryTagsContainer";
import { ActionCreatorHub } from "RepositoryOverview/Scripts/ActionCreatorsHub";
import { StoresHub, AggregatedState } from "RepositoryOverview/Scripts/StoresHub";
import * as RepositoryOverviewResources from "RepositoryOverview/Scripts/Resources/TFS.Resources.RepositoryOverview";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!RepositoryOverview/Scripts/Components/RepositoryOverview";

export function renderInto(element: HTMLElement, props: RepositoryOverviewProps): void {
    ReactDOM.render(
        <RepositoryOverview { ...props } />,
        element);
}

export interface RepositoryOverviewProps {
    actionCreatorHub: ActionCreatorHub;
    storesHub: StoresHub;
    repositoryContext: RepositoryContext;
    repositoryData: RepositoryOverviewContracts.RepositoryOverviewData;
    hasReadmeEditPermissions: boolean;
    isEmptyRepository: boolean;
    renderEmptyRepositorySection: (element: HTMLElement) => void;
}

interface RepositoryOverviewState extends AggregatedState { }

class RepositoryOverview extends React.Component<RepositoryOverviewProps, RepositoryOverviewState> {
    private _emptyRepositoryRef: HTMLElement;

    constructor(props: RepositoryOverviewProps, context?: any) {
        super(props, context);
        this.state = props.storesHub.getAggregatedState();
    }

    public componentDidMount(): void {
        globalProgressIndicator.registerProgressElement($(".project-overview-progress"));
        getScenarioManager().recordPageLoadScenario(
            CIConstants.Area,
            PerfConstants.PageLoadScenario,
            {
                "RepositoryId": this.props.repositoryData.id,
            });

        if (this.props.isEmptyRepository) {
            this.props.renderEmptyRepositorySection(this._emptyRepositoryRef);
        }

        this.props.storesHub.readmeSectionStore.addChangedListener(this._onStoreChanged);
        this.props.storesHub.commitPromptStore.addChangedListener(this._onStoreChanged);
        this.props.storesHub.languagesStore.addChangedListener(this._onStoreChanged);
    }

    public componentWillUnmount(): void {
        this.props.storesHub.readmeSectionStore.removeChangedListener(this._onStoreChanged);
        this.props.storesHub.commitPromptStore.removeChangedListener(this._onStoreChanged);
        this.props.storesHub.languagesStore.removeChangedListener(this._onStoreChanged);

        if (this._emptyRepositoryRef) {
            ReactDOM.unmountComponentAtNode(this._emptyRepositoryRef);
            this._emptyRepositoryRef = null;
        }
    }

    public render(): JSX.Element {
        const aggregatedState = this.props.storesHub.getAggregatedState();

        return (
            <Fabric className="ro-page-container">
                <div id="ro-title-section">
                    <div className="ro-title-left-section">
                        <span className="ro-title-text">{this.props.repositoryData.name}</span>
                        {
                            this.props.repositoryContext.getRepositoryType() === RepositoryType.Git && 
                            <GitRepositoryFavorite 
                                className="ro-repo-favorite-container" 
                                repositoryContext={this.props.repositoryContext as GitRepositoryContext}/>
                        }
                    </div>
                    <div className="ro-title-right-content">
                        <VisibilityTag visibility={this.props.repositoryData.projectInfo.visibilityText} className={"ro-visibility-tag"}/>
                    </div>
                    <div className="clear-floats"/>
                </div>
                <RepositoryTagsContainer
                    className="ro-tags-container"
                    languagesInfo={aggregatedState.languagesState.languagesInfo}/>
                <div className="ro-menu-container">
                    <RepositoryActionMenu repositoryData={this.props.repositoryData}/>
                </div>
                {this.props.isEmptyRepository 
                    ? <div ref={(ele) => this._emptyRepositoryRef = ele}/>
                    : <div className="ro-readme-container">
                        <ReadmeEditorContainer
                            notificationState={aggregatedState.readmeNotificationState}
                            readmeEditorState={aggregatedState.readmeEditorState}
                            commitPromptState={aggregatedState.commitPromptState}
                            readmeEditorActionCreator={this.props.actionCreatorHub.readmeEditorActionCreator}
                            hasReadmeEditPermissions={this.props.hasReadmeEditPermissions} />
                    </div>
                }
            </Fabric>
        );
    }

    private _onStoreChanged = (): void => {
        this.setState(this.props.storesHub.getAggregatedState());
    }
}