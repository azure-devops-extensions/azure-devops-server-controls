import * as React from "react";
import * as ReactDOM from "react-dom";

import { StoresHub } from "VersionControl/Scenarios/PullRequestCreate/Stores/StoresHub";
import { PullRequestCreateActionCreator } from "VersionControl/Scenarios/PullRequestCreate/Actions/PullRequestCreateActionCreator";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import { BranchesSelectionContainer } from "VersionControl/Scenarios/PullRequestCreate/Components/BranchesSelection";
import { Notifications } from "VersionControl/Scenarios/PullRequestCreate/Components/Notifications";
import { PropertiesEditorContainer } from "VersionControl/Scenarios/PullRequestCreate/Components/PropertiesEditor";
import { PivotsContainer } from "VersionControl/Scenarios/PullRequestCreate/Components/Pivots";
import { PageState } from "VersionControl/Scenarios/PullRequestCreate/Stores/PageStateStore";
import { Notification } from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import { Fabric } from "OfficeFabric/Fabric";
import { HubSpinner, Alignment } from "MyExperiences/Scenarios/Shared/Components/HubSpinner";

import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as Performance from "VSS/Performance";
import { SplitNames } from "VersionControl/Scenarios/Shared/PagePerformance";
import { autobind } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!VersionControl/CreatePage";

export module CreatePageRenderer {
    export function attachTab(element: HTMLElement, props: CreatePageContainerProps): React.Component<any, {}> {
        return ReactDOM.render(
            <CreatePageContainer {...props} />,
            element,
        ) as React.Component<any, {}>;
    }
}

export interface CreatePageContainerProps {
    storesHub: StoresHub;
    actionCreator: PullRequestCreateActionCreator;
    customerIntelligenceData: CustomerIntelligenceData;
    scenario: Performance.IScenarioDescriptor;
}

export interface CreatePageContainerState {
    pageState: PageState;
    hasBranches: boolean;
    notifications: Notification[];
}

export class CreatePageContainer extends React.Component<CreatePageContainerProps, CreatePageContainerState> {
    constructor(props: CreatePageContainerProps) {
        super(props);
        this.state = this._getStateFromStores();
    }

    public componentDidMount() {
        this.props.storesHub.pageStateStore.addChangedListener(this._onChange);
        this.props.storesHub.branchesStore.addChangedListener(this._onChange);
        this.props.storesHub.notificationStore.addChangedListener(this._onChange);

        if (this.props.scenario && this.props.scenario.isActive()) {
            this.props.scenario.addSplitTiming(SplitNames.viewLoaded);
            this.props.scenario.end();
        }
    }

    public componentWillUnmount() {
        this.props.storesHub.pageStateStore.removeChangedListener(this._onChange);
        this.props.storesHub.branchesStore.removeChangedListener(this._onChange);
        this.props.storesHub.notificationStore.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        return <CreatePageComponent {...{
            ...this.props,
            ...this.state
        }} />;
    }

    @autobind
    private _onChange() {
        this.setState(this._getStateFromStores());
    }

    private _getStateFromStores(): CreatePageContainerState {
        return {
            pageState: this.props.storesHub.pageStateStore.state,
            notifications: this.props.storesHub.notificationStore.state.notifications,
            hasBranches: this.props.storesHub.branchesStore.hasBranches()
        };
    }
}

export interface CreatePageComponentProps extends CreatePageContainerProps, CreatePageContainerState {

}

export class CreatePageComponent extends React.PureComponent<CreatePageComponentProps, {}> {

    public render(): JSX.Element {
        return <Fabric className="bowtie-fabric vc-pullRequestCreate-page">
            <div className="hub-content vc-pullRequestCreate-content">
                <div className="vc-pullRequestCreate-title">
                    <span className="bowtie-icon bowtie-tfvc-pull-request pr-icon" />
                    <span role="heading" aria-level={1} className="vc-page-title">{VCResources.PullRequest_CreateNewPullRequest_Title}</span>
                </div>
                <BranchesSelectionContainer {...this.props} />
                <Notifications notifications={this.props.notifications} />
                <Content {...this.props} />
            </div>
        </Fabric>;
    }
}

const Content = (props: CreatePageComponentProps): JSX.Element => {
    if (props.hasBranches) {

        if (props.pageState.isValidationPending && !props.notifications.length) {
            return <HubSpinner labelText={VCResources.LoadingText} alignment={Alignment.left} />;
        }

        if (!props.pageState.isValidationPending) {
            return (
                <div>
                    <PropertiesEditorContainer {...props} />
                    <div>
                        <div className="vc-pullRequestCreate-bar-separator" />
                        <div role="region" aria-label={VCResources.PullRequestCreate_PivotsRegionLabel}>
                            <PivotsContainer {...props} />
                        </div>
                    </div>
                </div>);
        }
    }
    return null;
}