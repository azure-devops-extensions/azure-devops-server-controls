import * as React from "react";
import * as ReactDOM from "react-dom";

import * as VSS from "VSS/VSS";
import { StoresHub } from "VersionControl/Scenarios/PullRequestList/Stores/StoresHub";
import * as PivotView from "Presentation/Scripts/TFS/Components/PivotView";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { Fabric } from "OfficeFabric/Fabric";
import * as Alerts from "MyExperiences/Scenarios/Shared/Alerts";
import { HubAlert } from "MyExperiences/Scenarios/Shared/Components/HubAlert";
import { HubHeader } from "MyExperiences/Scenarios/Shared/Components/HubHeader";
import { IHubHeaderProps, IOrganizationInfoAndCollectionsPickerSectionProps } from "MyExperiences/Scenarios/Shared/Models";

import { isOrgAccountSelectorEnabled } from "MyExperiences/Scenarios/Shared/OrgAccountSelectorFeatureAvailabilityCheckHelper";
import { OrgInfoAndCollectionsPickerFluxAsync } from "MyExperiences/Scenarios/Shared/OrgInfoAndCollectionsPickerFluxAsync";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";

export interface MyPullRequestListTopViewProps {
    storesHub: StoresHub;
    pivotViewActions: PivotView.ActionsHub;
}

export interface MyPullRequestListTopViewState {
    pivotItems: PivotView.PivotViewItem[];
    headerProps: IHubHeaderProps;
    alertMessage?: string;
}

export class MyPullRequestListTopView extends React.Component<MyPullRequestListTopViewProps, MyPullRequestListTopViewState> {
    private _orgInfoAndCollectionsPickerFluxAsync: OrgInfoAndCollectionsPickerFluxAsync;

    public static attachView(element: HTMLElement, props: MyPullRequestListTopViewProps): React.Component<any, {}> {
        return ReactDOM.render(
            (<div>
                <MyPullRequestListTopView { ...props} />
            </div>),
            element) as React.Component<any, {}>;
    }

    constructor(props: MyPullRequestListTopViewProps) {
        super(props);

        const headerProps = this._getDefaultHeaderProps();
        if (headerProps.isOrganizationInfoAndCollectionPickerEnabled) {
            this._orgInfoAndCollectionsPickerFluxAsync = new OrgInfoAndCollectionsPickerFluxAsync({
                onHeaderOrganizationInfoAndCollectionPickerPropsUpdate: this._onHeaderOrganizationInfoAndCollectionPickerPropsUpdate,
                onCollectionNavigationFailed: this._onCollectionNavigationFailed
            });
            this._orgInfoAndCollectionsPickerFluxAsync.initializeOrgInfoAndCollectionsPickerFlux();
        }

        this.state = {
            pivotItems: this._getPivotItems(),
            headerProps: headerProps
        };
    }

    public render(): JSX.Element {
        return (
            <Fabric>
                {this._renderAlert()}
                <div className="hub-title">
                    <HubHeader {...this.state.headerProps} />
                </div>
                <div className="hub-content">
                    <PivotView.Component items={this.state.pivotItems} actions={this.props.pivotViewActions} useContributionComponent={true} />
                </div>
            </Fabric>);
    }

    public componentDidMount() {
        this.props.storesHub.contributionsStore.addChangedListener(this._onContributionsStoreChange);

        if (this._orgInfoAndCollectionsPickerFluxAsync) {
            this._orgInfoAndCollectionsPickerFluxAsync.registerStoresChangedListeners();
        }
    }

    public componentWillUnmount() {
        this.props.storesHub.contributionsStore.removeChangedListener(this._onContributionsStoreChange);

        if (this._orgInfoAndCollectionsPickerFluxAsync) {
            this._orgInfoAndCollectionsPickerFluxAsync.unregisterStoresChangedListeners();
        }
    }

    private _renderAlert(): JSX.Element {
        if (!this.state.alertMessage) {
            return null;
        }
        return (
            <HubAlert>
                {Alerts.createReloadPromptAlertMessage(this.state.alertMessage)}
            </HubAlert>
        );
    }

    private _onContributionsStoreChange = (): void => {
        this.setState({ pivotItems: this._getPivotItems() });
    }

    private _onHeaderOrganizationInfoAndCollectionPickerPropsUpdate = (props: IOrganizationInfoAndCollectionsPickerSectionProps): void => {
        let headerProps = this._getDefaultHeaderProps();
        headerProps.organizationInfoAndCollectionPickerProps = props;

        this.setState({ headerProps: headerProps });
    }

    private _onCollectionNavigationFailed = (): void => {
        this.setState({ alertMessage: MyExperiencesResources.AccountSwitcher_CollectionNavigationError });
    }

    private _getDefaultHeaderProps(): IHubHeaderProps {
        const headerProps: IHubHeaderProps = {
            isOrganizationInfoAndCollectionPickerEnabled: isOrgAccountSelectorEnabled(),
            title: VCResources.MyPullRequestsViewTitle
        };

        return headerProps;
    }

    private _getPivotItems(): PivotView.PivotViewItem[] {
        let items: PivotView.PivotViewItem[] = [];

        const contributions = this.props.storesHub.contributionsStore.getContributionsForTarget("ms.vss-tfs-web.collection-pullrequests-new-hub-tab-group", "ms.vss-web.tab");
        if (contributions && contributions.length > 0) {
            items = contributions.map((contribution: Contribution, index: number) => {
                return {
                    tabKey: contribution.properties.action,
                    title: contribution.properties.name,
                    contribution: contribution
                };
            });
        }

        return items;
    }
}
