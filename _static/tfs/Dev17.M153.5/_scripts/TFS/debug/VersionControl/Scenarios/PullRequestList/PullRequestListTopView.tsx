import { Fabric } from "OfficeFabric/Fabric";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as UserClaimsService from "VSS/User/Services";

import * as PivotView from "Presentation/Scripts/TFS/Components/PivotView";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { PullRequestListActionCreator } from "VersionControl/Scenarios/PullRequestList/Actions/PullRequestListActionCreator";
import { NotificationAreaControllerView } from "VersionControl/Scenarios/PullRequestList/NotificationAreaControllerView";
import { PullRequestFilterSearchCriteria } from "VersionControl/Scenarios/PullRequestList/PullRequestListFilter";
import { PullRequestListTitle } from "VersionControl/Scenarios/PullRequestList/PullRequestListTitle";
import { StoresHub } from "VersionControl/Scenarios/PullRequestList/Stores/StoresHub";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

export interface PullRequestListTopViewProps {
    storesHub: StoresHub;
    actionCreators: PullRequestListActionCreator;
    repositoryContext: GitRepositoryContext;
    tfsContext: TfsContext;
    pivotViewActions: PivotView.ActionsHub;
    onSearchCriteriaUpdated(searchCriteria?: PullRequestFilterSearchCriteria): void;
}

export interface PullRequestListTopViewState {
    pivotItems: PivotView.PivotViewItem[];
    appliedSearchCriteria: PullRequestFilterSearchCriteria;
    hasPermissionToCreatePullRequest: boolean;
}

export class PullRequestListTopView extends React.Component<PullRequestListTopViewProps, PullRequestListTopViewState> {
    public static attachView(element: HTMLElement, props: PullRequestListTopViewProps): React.Component<any, {}> {
        return ReactDOM.render(
            <PullRequestListTopView {...props} />,
            element) as React.Component<any, {}>;
    }

    constructor(props: PullRequestListTopViewProps) {
        super(props);
        this.state = this.getState();
    }

    public render(): JSX.Element {
        const pickerEnabled: boolean = UserClaimsService.getService().hasClaim(UserClaimsService.UserClaims.Member);
        return <Fabric className="bowtie-fabric absolute-fill flex flex-column">
            <PullRequestListTitle
                actionCreators={this.props.actionCreators}
                repositoryContext={this.props.repositoryContext}
                tfsContext={this.props.tfsContext}
                storesHub={this.props.storesHub}
                initialSearchCriteria={this.state.appliedSearchCriteria}
                onSearchCriteriaUpdated={this.props.onSearchCriteriaUpdated}
                hasPermissionToCreatePullRequest={this.state.hasPermissionToCreatePullRequest}
                pickerEnabled={pickerEnabled} />
            <NotificationAreaControllerView
                notificationStore={this.props.storesHub.notificationStore}
                actionCreator={this.props.actionCreators}
            />
            <PivotView.Component
                className="vc-pullRequestList-pivotView"
                items={this.state.pivotItems}
                actions={this.props.pivotViewActions}
                useContributionComponent={true}
            />
        </Fabric>;
    }

    public componentDidMount() {
        this.props.storesHub.contributionsStore.addChangedListener(this._onChange);
        this.props.storesHub.tabsInfoStore.addChangedListener(this._onChange);
        this.props.storesHub.permissionsStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        this.props.storesHub.contributionsStore.removeChangedListener(this._onChange);
        this.props.storesHub.tabsInfoStore.removeChangedListener(this._onChange);
        this.props.storesHub.permissionsStore.removeChangedListener(this._onChange);
    }

    private _onChange = (): void => {
        this.setState(this.getState());
    }

    private getState() {
        return {
            pivotItems: this._getPivotItemsFromStore(),
            appliedSearchCriteria: this.props.storesHub.tabsInfoStore.getFilterCriteria(),
            hasPermissionToCreatePullRequest: this.props.storesHub.permissionsStore.getPermissions().createPullRequest,
        };
    }

    private _getPivotItemsFromStore(): PivotView.PivotViewItem[] {
        let items: PivotView.PivotViewItem[] = [];
        const contributions = this.props.storesHub.contributionsStore.getContributionsForTarget("ms.vss-code-web.pull-request-list-hub-tab-group", "ms.vss-web.tab");
        if (contributions && contributions.length > 0) {
            items = contributions.map((contribution: Contribution, index: number) => {
                return {
                    tabKey: contribution.properties.action,
                    title: contribution.properties.name,
                    contribution,
                };
            });
        }

        return items;
    }
}