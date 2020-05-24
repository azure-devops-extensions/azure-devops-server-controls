/// <reference types="react" />

import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { ItemKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { GetSourcesControllerView } from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/GetSourcesControllerView";
import { SourceProviderUtils } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";
import { Store as StoreBase } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/Base";
import { IState as SourcesSelectionState, SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Item, ItemOverviewAriaProps, ItemOverviewProps } from "DistributedTaskControls/Common/Item";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { StateIndicator, StateIndicatorType } from "DistributedTaskControls/Components/StateIndicator";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";
import { ITwoPanelOverviewProps, TwoPanelOverviewComponent } from "DistributedTaskControls/Components/TwoPanelOverviewComponent";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import * as BuildContracts from "TFS/Build/Contracts";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Components/GetSources";

const RepositoryNode = ({ repositoryIconClassName, selectedRepositoryName }) => (
    <div className="repository left">
        <div className={repositoryIconClassName} />
        <TooltipIfOverflow tooltip={selectedRepositoryName} targetElementClassName="repository-name left">
            <div className="repository-name left">
                {selectedRepositoryName}
            </div>
        </TooltipIfOverflow>
    </div>);

const BranchNode = ({ branchName }) => (
    <div className="branch left">
        <div className="bowtie-icon bowtie-tfvc-branch left" />
        <TooltipIfOverflow tooltip={branchName} targetElementClassName="branch-name left">
            <div className="branch-name left">
                {branchName}
            </div>
        </TooltipIfOverflow>
    </div>
);

export class GetSourcesOverview extends Base.Component<ItemOverviewProps, SourcesSelectionState> {
    private _store: SourcesSelectionStore;

    constructor(props: ItemOverviewProps) {
        super(props);
        this._store = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
    }

    public componentDidMount(): void {
        super.componentDidMount();
        this._updateState();
        this._store.addChangedListener(this._updateState);

        this._store.getStores().forEach((store: StoreBase) => {
            store.addChangedListener(this._updateState);
        });
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._updateState);

        this._store.getStores().forEach((store: StoreBase) => {
            store.removeChangedListener(this._updateState);
        });
    }

    public render(): JSX.Element {
        let overviewProps = {
            title: Resources.GetSourcesText,
            view: this._getView(),
            item: this.props.item,
            instanceId: this.props.instanceId,
            iconClassName: "bowtie-icon bowtie-tfvc-raw-source",
            overviewClassName: "get-sources-item-overview-body",
            ariaProps: this.props.ariaProps
        } as ITwoPanelOverviewProps;

        return (
            <div className="get-sources-task">
                <TwoPanelOverviewComponent {...overviewProps} />
            </div>
        );
    }

    private _getView(): JSX.Element {
        if (!this._store.isValid()) {
            return <StateIndicator type={StateIndicatorType.Error} text={DTCResources.SettingsRequiredMessage} />;
        }

        let iconName: string = this._getSelectedVersionControlIcon();
        let repositoryIconClassName = "bowtie-icon left" + " " + iconName;

        let repositoryNode = null;
        let branchNode = null;
        if ((this.state && this.state.selectedRepositoryName) || (this.state && this.state.selectedBranchName)) {
            if (this.state.selectedRepositoryName) {
                repositoryNode = <RepositoryNode repositoryIconClassName={repositoryIconClassName} selectedRepositoryName={this.state.selectedRepositoryName} />;
            }
            if (this.state.selectedBranchName) {
                branchNode = <BranchNode branchName={this.state.selectedBranchName} />;
            }
        }

        else {
            repositoryNode = <StateIndicator type={StateIndicatorType.Error} text={Resources.SelectSources} />;
        }

        return (
            <div className="get-sources-task-view">
                {repositoryNode}
                {branchNode}
            </div>
        );
    }

    private _getSelectedVersionControlIcon(): string {
        const repository: BuildContracts.BuildRepository = this._store.getBuildRepository();
        const repositoryType: string = repository ? repository.type : Utils_String.empty;
        return SourceProviderUtils.getIconClass(repositoryType);
    }

    private _updateState = (): void => {
        this.setState(this._store.getState());
    }
}

export class GetSourcesItem implements Item {
    private _overview: JSX.Element;
    private _details: JSX.Element;
    private _treeLevel?: number;
    private _initialIndex?: number;
    private _treeLevelSetSizeDelegate?: () => number;

    constructor(isDraftDefinition: boolean, treeLevel?: number, initialIndex?: number, treeLevelSetSizeDelegate?: () => number) {
        this._details = <GetSourcesControllerView showAdvancedSettings={true} sourcesPanelLabel={Resources.GetSoucesPagePanelLabel} />;
        this._treeLevel = treeLevel;
        this._initialIndex = initialIndex;
        this._treeLevelSetSizeDelegate = treeLevelSetSizeDelegate;
    }

    public getOverview(instanceId?: string): JSX.Element {
        this._overview = <GetSourcesOverview instanceId={instanceId} item={this}
            ariaProps={{
                level: this._treeLevel,
                setSize: this._treeLevelSetSizeDelegate ? this._treeLevelSetSizeDelegate() : 1,
                positionInSet: this._initialIndex + 1,
                role: "treeitem"
            } as ItemOverviewAriaProps} />;

        return this._overview;
    }

    public getDetails(): JSX.Element {
        return this._details;
    }

    public getKey(): string {
        return ItemKeys.GetSourcesItemKey;
    }
}
