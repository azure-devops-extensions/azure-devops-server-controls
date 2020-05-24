import { DefaultButton, IButtonProps } from "OfficeFabric/Button";
import { TextField } from "OfficeFabric/TextField";
import { autobind, css } from "OfficeFabric/Utilities";
import * as TFSTagService from "Presentation/Scripts/TFS/FeatureRef/TFS.TagService";
import * as TFSOMCommon from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as React from "react";
import { pullRequestLabelsKindId } from "VersionControl/Scenarios/Shared/Constants";

import { WebApiTagDefinition } from "TFS/Core/Contracts";
import { IPullRequestLabelsProps, LabelsComponent } from "VersionControl/Scenarios/Shared/LabelsComponent";

import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import { KeyCode } from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!VersionControl/PullRequestLabelsList";
import "VSS/LoaderPlugins/Css!WorkItemArea";

export interface IPullRequestLabelSectionState {
    projectGuid: string;
    pullRequestId: number;
    pullRequestLabels: WebApiTagDefinition[];
    hasPermissionToUpdateLabels: boolean;
    isLabelFeatureEnabled: boolean;
    loading: boolean;
}

export class PullRequestLabelSection extends React.Component<{}, IPullRequestLabelSectionState> {
    constructor(props: {}) {
        super(props);
        this.state = this._getStateFromStores();
    }

    public render(): JSX.Element {
        if (!this.state.isLabelFeatureEnabled || this.state.loading) {
            return null;
        }
        return (
            <div className="vc-pullrequest-leftpane-section" >
                <div className="vc-pullrequest-leftpane-section-title" >
                    <span>{VCResources.PullRequest_Labels_Section_Title}</span>
                </div>
                <div className="divider" />
                <LabelsComponent
                    labels={this.state.pullRequestLabels.map(l => l.name)}
                    onNewLabel={this._addLabel}
                    onRemoveLabel={this._removeLabel}
                    beginGetSuggestedLabels={this._getSuggestedLabels}
                    readOnly={!this.state.hasPermissionToUpdateLabels}
                    useDeleteExperience={true}
                    onError={this.onError}/>
            </div>
        );
    }

    @autobind
    private _addLabel(newLabel: string) {
        Flux.instance().actionCreator.labelsActionCreator.addLabelToPullRequest(newLabel, this.state.pullRequestId);
    }

    @autobind
    private _removeLabel(toRemove: string) {
        const labelToRemove = this._fromNameToLabel(toRemove);
        if (labelToRemove)
        {
            Flux.instance().actionCreator.labelsActionCreator.removeLabelFromPullRequest(labelToRemove, this.state.pullRequestId);
        }
    }

    private _fromNameToLabel(name: string) {
        const findLabel = this.state.pullRequestLabels.filter(l => l.name === name);
        if (findLabel.length !== 0){
            return findLabel[0];
        }
        return undefined;
    }

    @autobind
    private _getSuggestedLabels(callback: (tagNames: string[]) => void): void {
        Flux.instance().actionCreator.labelsActionCreator.beginGetSuggestedLabels(this.state.projectGuid, callback);
    }

    private onError = (error: Error, component: string): void => {
        Flux.instance().actionCreator.pullRequestActionCreator.traceError(error, component);
    }

    public componentDidMount() {
        Flux.instance().storesHub.contextStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestLabelsStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestDetailStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.featureAvailabilityStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.permissionsStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        Flux.instance().storesHub.contextStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestLabelsStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestDetailStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.featureAvailabilityStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.permissionsStore.removeChangedListener(this._onChange);
    }

    private _onChange = () => {
        this.setState(this._getStateFromStores());
    }

    public shouldComponentUpdate(nextState: IPullRequestLabelSectionState): boolean {
        return !(nextState.loading && this.state.loading);
    }

    private _getStateFromStores(): IPullRequestLabelSectionState { // needs to be any since it is a partial store
        return {
            projectGuid: Flux.instance().storesHub.pullRequestDetailStore.getPullRequestDetail().projectGuid,
            pullRequestId: Flux.instance().storesHub.pullRequestDetailStore.getPullRequestDetail().pullRequestId,
            pullRequestLabels: Flux.instance().storesHub.pullRequestLabelsStore.getLabels(),
            hasPermissionToUpdateLabels: Flux.instance().storesHub.permissionsStore.getPermissions().updateLabels,
            isLabelFeatureEnabled:  Flux.instance().storesHub.featureAvailabilityStore.getPullRequestLabelsFeatureIsEnabled(),
            loading: Flux.instance().storesHub.pullRequestDetailStore.isLoading()
                  || Flux.instance().storesHub.contextStore.isLoading()
                  || Flux.instance().storesHub.pullRequestLabelsStore.isLoading()
                  || Flux.instance().storesHub.permissionsStore.isLoading()
        };
    }
}
