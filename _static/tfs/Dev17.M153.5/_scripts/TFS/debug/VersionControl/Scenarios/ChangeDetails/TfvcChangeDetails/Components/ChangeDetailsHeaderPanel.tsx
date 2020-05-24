import * as React from "react";
import * as ReactDOM from "react-dom";
import * as VSS from "VSS/VSS";
import { getTfvcFilesHubContributionId } from "VersionControl/Scripts/CodeHubContributionsHelper";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { TfsChangeList } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { getChangeListUrl, getExplorerUrl } from "VersionControl/Scripts/VersionControlUrls";
import { getCustomerIntelligenceData, ChangeDetailsTelemetryFeatures } from "VersionControl/Scenarios/ChangeDetails/ChangeDetailsTelemetry";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";
import { ChangeListTitle } from "VersionControl/Scenarios/ChangeDetails/Components/ChangeListTitle";
import { StatBadge } from "VersionControl/Scenarios/Shared/StatBadge";
import { HeaderBar } from "VersionControl/Scenarios/ChangeDetails/TfvcChangeDetails/Components/HeaderBar";
import { StoresHub } from "VersionControl/Scenarios/ChangeDetails/Stores/StoresHub";
import { IChangeDetailsPropsBase } from "VersionControl/Scenarios/ChangeDetails/IChangeDetailsPropsBase";

import "VSS/LoaderPlugins/Css!VersionControl/CommitDetailsHeaderPanel";

export interface IChangeDetailsHeaderProps extends IChangeDetailsPropsBase {
    storesHub: StoresHub;
}

export interface IChangeDetailsHeaderState {
    changeList: TfsChangeList;
    repositoryContext: RepositoryContext;
    version: string;
    isLoading: boolean;
}

/**
 *  Container for components present in the Header panel of the ChangeListView
 */
export class ChangeDetailsHeaderPanel extends React.Component<IChangeDetailsHeaderProps, IChangeDetailsHeaderState> {
    constructor(props: IChangeDetailsHeaderProps, context?: any) {
        super(props, context);

        this.state = this._getStateFromStores();
    }

    public componentDidMount(): void {
        this.props.storesHub.changeListStore.addChangedListener(this._onChange);
        this.props.storesHub.contextStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        this.props.storesHub.changeListStore.removeChangedListener(this._onChange);
        this.props.storesHub.contextStore.removeChangedListener(this._onChange);
    }

    public shouldComponentUpdate(nextProps: IChangeDetailsHeaderProps, nextState: IChangeDetailsHeaderState): boolean {
        return !(nextState.isLoading && this.state.isLoading);
    }

    public render(): JSX.Element {
        const {repositoryContext, changeList, isLoading} = this.state;
        const {storesHub, customerIntelligenceData} = this.props;

        return (
            !isLoading &&
            <div className="vc-headerpane-section">
                <div className="hub-title">
                    <ChangeListTitle
                        changeList={changeList}
                        pageUrl={getChangeListUrl(repositoryContext, changeList, true)}
                        changeListType={changeList.isShelveset ? 'shelveset' : 'changeset'}
                        customerIntelligenceData={customerIntelligenceData ? customerIntelligenceData.clone() : null} />
                    <div className="vc-page-summary-area">
                        <div className="vc-header-tool-bar">
                            <HeaderBar
                                authorDetailsStore={storesHub.authorDetailsStore}
                                workItemsStore={storesHub.workItemsStore}
                                contextStore={storesHub.contextStore}
                                urlParametersStore={storesHub.urlParametersStore}
                                customerIntelligenceData={customerIntelligenceData ? customerIntelligenceData.clone() : null} />
                            <div className="vc-actions-toolbar">
                                <div className="stats-badges-container">
                                    {
                                        !changeList.isShelveset &&
                                        <StatBadge
                                            title={VCResources.BrowseFiles}
                                            tooltip={VCResources.ExploreThisVersionMenuTooltip}
                                            iconClassName={"bowtie-file-preview"}
                                            url={getExplorerUrl(this.state.repositoryContext, null, null, { version: this.state.version, })}
                                            onLinkClick={this._onBrowseFiles}
                                            badgeName={"BrowseFilesBadge"}
                                            telemetryEventData={this.props.customerIntelligenceData ? this.props.customerIntelligenceData.clone() : null} />
                                    }
                                </div>
                            </div>
                            <div className="clear-float"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    private _onBrowseFiles = (event: React.MouseEvent<HTMLAnchorElement>): void => {
        onClickNavigationHandler(event, getTfvcFilesHubContributionId(this.state.repositoryContext), event.currentTarget.href);
    }

    private _onChange = (): void => {
        this.setState(this._getStateFromStores());
    };

    private _getStateFromStores(): IChangeDetailsHeaderState {
        const {contextStore, changeListStore} = this.props.storesHub;
        const isLoading = contextStore.isLoading() || changeListStore.isLoading();

        return {
            changeList: changeListStore.originalChangeList as TfsChangeList,
            repositoryContext: contextStore.getRepositoryContext(),
            version: changeListStore.versionSpec && changeListStore.versionSpec.toVersionString(),
            isLoading: isLoading
        };
    }
}
