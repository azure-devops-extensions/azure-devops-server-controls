import * as React from "react";
import * as ReactDOM from "react-dom";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { ActionListener } from "VersionControl/Scenarios/Shared/ActionListener";
import { ProjectOverviewPage, ProjectOverviewProps } from "ProjectOverview/Scripts/Components/ProjectOverviewPage";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";
import { ReloadMessage } from "ProjectOverview/Scripts/Shared/Components/ReloadMessage";
import { StoreListener } from "ProjectOverview/Scripts/Utils";

import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/Components/ProjectOverviewPageContainer";

export interface ProjectOverviewPageContainerState {
    isLoading: boolean;
    isLoadingFailed: boolean;
}

export function renderInto(element: HTMLElement, props: ProjectOverviewProps): void {
    ReactDOM.render(
        <ProjectOverviewPageContainer { ...props } />,
        element);
}

export class ProjectOverviewPageContainer extends React.Component<ProjectOverviewProps, ProjectOverviewPageContainerState> {
    private _storeListener: StoreListener;

    constructor(props: ProjectOverviewProps, context?: any) {
        super(props, context);
        this.state = {
            isLoading: this.props.storesHub.isPageDataLoading(),
            isLoadingFailed: false,
        };
        this._storeListener = new StoreListener();
    }

    public render(): JSX.Element {
        return (
            this.state.isLoading
                ? <Spinner
                    className={"page-data-loading-spinner"}
                    size={SpinnerSize.large}
                    ariaLabel={ProjectOverviewResources.Loading_Label}
                    ariaLive={"assertive"} />
                : this.state.isLoadingFailed
                    ? <ReloadMessage message={ProjectOverviewResources.ProjectOverview_ErrorLoadingPageData} />
                    : <ProjectOverviewPage {...this.props } />
        );
    }

    public componentDidMount(): void {
        if (this.state.isLoading) {
            const storesHub = this.props.storesHub;
            const stores = [
                storesHub.projectInfoStore,
                storesHub.upsellSectionStore,
                storesHub.metricsStore,
                storesHub.projectMembersStore,
                storesHub.readmeStore,
                storesHub.cloneRepositoryStore,
            ];

            this._storeListener.addChangedListenerForMultipleStores(stores, this._updateIsPageDataLoading);
        }
    }

    public componentWillUnmount(): void {
        this._storeListener.disposeAllListeners();
    }

    private _updateIsPageDataLoading = (): void => {
        const isPageDataLoading = this.props.storesHub.isPageDataLoading();
        if (!isPageDataLoading) {
            this._storeListener.disposeAllListeners();
            this.setState({
                isLoading: false,
                isLoadingFailed: this.props.storesHub.getAggregatedState().projectInfoState.isLoadingFailed,
            });
        }
    }
}
