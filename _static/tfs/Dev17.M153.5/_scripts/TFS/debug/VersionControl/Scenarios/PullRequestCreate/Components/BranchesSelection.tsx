
import { IconButton } from "OfficeFabric/Button";
import { autobind, getId } from "OfficeFabric/Utilities";
import * as React from "react";
import { TooltipHost } from "VSSUI/Tooltip";

import { GitRepository } from "TFS/VersionControl/Contracts";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { GitRefDropdownSwitch } from "VersionControl/Scenarios/Shared/GitRefDropdownSwitch";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

import { PullRequestCreateActionCreator } from "VersionControl/Scenarios/PullRequestCreate/Actions/PullRequestCreateActionCreator";
import { BranchInfo } from "VersionControl/Scenarios/PullRequestCreate/Stores/BranchesStore";
import { StoresHub } from "VersionControl/Scenarios/PullRequestCreate/Stores/StoresHub";
import { RepositoryDropdownSwitch } from "VersionControl/Scenarios/Shared/RepositoryDropdownSwitch";

import "VSS/LoaderPlugins/Css!VersionControl/BranchesSelection";

export interface BranchesSelectionContainerProps {
    storesHub: StoresHub;
    actionCreator: PullRequestCreateActionCreator;
}

export interface BranchesSelectionContainerState {
    source: BranchInfo;
    target: BranchInfo;
    sourceRepository: GitRepository;
    targetRepository: GitRepository;
    availableRepositories: GitRepository[];
    tfsContext: TfsContext;
}

export class BranchesSelectionContainer extends React.Component<BranchesSelectionContainerProps, BranchesSelectionContainerState> {
    constructor(props: BranchesSelectionContainerProps) {
        super(props);

        this.state = this._getStateFromStores();
    }

    public componentDidMount() {
        this.props.storesHub.contextStore.addChangedListener(this._onChange);
        this.props.storesHub.branchesStore.addChangedListener(this._onChange);
        this.props.storesHub.pageStateStore.addChangedListener(this._onChange);
        this.props.storesHub.featureAvailabilityStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        this.props.storesHub.contextStore.removeChangedListener(this._onChange);
        this.props.storesHub.branchesStore.removeChangedListener(this._onChange);
        this.props.storesHub.pageStateStore.removeChangedListener(this._onChange);
        this.props.storesHub.featureAvailabilityStore.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        if (!this.state.tfsContext) {
            return null; // we can't load anything until we have a context
        }

        return (
            <BranchesSelection
                tfsContext={this.state.tfsContext}
                source={this.state.source}
                target={this.state.target}
                sourceRepository={this.state.sourceRepository}
                targetRepository={this.state.targetRepository}
                onSourceBranchChanged={this._sourceBranchUpdated}
                onTargetBranchChanged={this._targetBranchUpdated}
                onBranchesSwitched={this._branchesSwitched}
                repositories={this.state.availableRepositories} />);
    }

    @autobind
    private _onChange() {
        this.setState(this._getStateFromStores());
    }

    private _getStateFromStores(): BranchesSelectionContainerState {
        return {
            tfsContext: this.props.storesHub.contextStore.getTfsContext(),
            availableRepositories: this.props.storesHub.branchesStore.getAvailableRepositories(),
            source: this.props.storesHub.branchesStore.getSourceBranch(),
            target: this.props.storesHub.branchesStore.getTargetBranch(),
            sourceRepository: this.props.storesHub.branchesStore.getSourceRepository(),
            targetRepository: this.props.storesHub.branchesStore.getTargetRepository(),
        } as BranchesSelectionContainerState;
    }

    @autobind
    private _sourceBranchUpdated(repository: GitRepository, branchName: string) {
        this.props.actionCreator.onSourceBranchUpdated(repository, branchName);
    }

    @autobind
    private _targetBranchUpdated(repository: GitRepository, branchName: string) {
        this.props.actionCreator.onTargetBranchUpdated(repository, branchName);
    }

    @autobind
    private _branchesSwitched() {
        this.props.actionCreator.switchBranches();
    }
}

export interface BranchesSelectionComponentProps {
    tfsContext: TfsContext;
    source: BranchInfo;
    target: BranchInfo;
    targetRepository: GitRepository;
    sourceRepository: GitRepository;
    onBranchesSwitched(): void;
    onSourceBranchChanged(repository: GitRepository, branchName: string): void;
    onTargetBranchChanged(repository: GitRepository, branchName: string): void;
    repositories: GitRepository[];
}

/**
 * This component is responsible for selecting target and source branches
 */
export class BranchesSelection extends React.Component<BranchesSelectionComponentProps, {}> {
    private _sourceBranchSelectorLabel: string;
    private _targetBranchSelectorLabel: string;

    public constructor(props: BranchesSelectionComponentProps) {
        super(props);

        this._sourceBranchSelectorLabel = getId("vc-source-branch-selector-label");
        this._targetBranchSelectorLabel = getId("vc-target-branch-selector-label");
    }

    public render(): JSX.Element {
        return(
            <div className="vc-pullRequestCreate-branches-selection">
                {this.props.repositories && this.props.repositories.length > 1 &&
                    <RepositoryDropdownSwitch
                        currentRepository={this.props.sourceRepository}
                        onRepositoryChange={this._onSourceRepositoryChange}
                        repositories={this.props.repositories}
                    />
                }
                { /* We use a hidden span here so we can prepend it to the ariaLabelledBy property of the picker,
                     because the aria-label will not be read by SRs since there is an aria-labelledby attribute */}
                <span id={this._sourceBranchSelectorLabel} className="visually-hidden">{VCResources.PullRequestCreate_SourceBranchLabel}</span>
                <GitRefDropdownSwitch
                    className="vc-branches-container vc-pullRequestCreate-branches-container"
                    versionSpec={this.props.source && this.props.source.branchVersionSpec}
                    repositoryContext={GitRepositoryContext.create(this.props.sourceRepository, this.props.tfsContext)}
                    viewTagsPivot={false}
                    onSelectionChanged={(vs: VersionSpec) => this.props.onSourceBranchChanged(this.props.sourceRepository, vs.toDisplayText())}
                    ariaLabelledBy={this._sourceBranchSelectorLabel}
                    placeholderText={VCResources.PullRequestCreate_SourceBranchPlaceholder}
                    autoFocus={true}
                />
                <span className="vc-pullRequestCreate-into">{VCResources.Into}</span>
                {this.props.repositories && this.props.repositories.length > 1 &&
                    <RepositoryDropdownSwitch
                        currentRepository={this.props.targetRepository}
                        onRepositoryChange={this._onTargetRepositoryChange}
                        repositories={this.props.repositories}
                    />
                }
                <span id={this._targetBranchSelectorLabel} className="visually-hidden">{VCResources.PullRequestCreate_TargetBranchLabel}</span>
                <GitRefDropdownSwitch
                    className="vc-branches-container vc-pullRequestCreate-branches-container"
                    versionSpec={this.props.target && this.props.target.branchVersionSpec}
                    repositoryContext={GitRepositoryContext.create(this.props.targetRepository, this.props.tfsContext)}
                    viewTagsPivot={false}
                    onSelectionChanged={(vs: VersionSpec) => this.props.onTargetBranchChanged(this.props.targetRepository, vs.toDisplayText())}
                    ariaLabelledBy={this._targetBranchSelectorLabel}
                    placeholderText={VCResources.PullRequestCreate_TargetBranchPlaceholder}
                />
                <TooltipHost
                    content={VCResources.SwitchBaseTargetBranches}
                    calloutProps={{ gapSpace: 2 }}
                    delay={1}>
                    <IconButton className="vc-pullRequestCreate-branches-switch"
                        ariaLabel={VCResources.SwitchBaseTargetBranches}
                        onClick={this.props.onBranchesSwitched} >
                        <span className="bowtie-icon bowtie-switch" />
                    </IconButton>
                </TooltipHost>
            </div>);
    }

//TODO: should probably handle change logic in the store

    @autobind
    private _onSourceRepositoryChange(repository: GitRepository){
        if (repository.id !== this.props.source.repository.id) {
            this.props.onSourceBranchChanged(repository, GitRefUtility.getRefFriendlyName(repository.defaultBranch));
        }
    }

    @autobind
    private _onTargetRepositoryChange(repository: GitRepository){
        if (repository.id !== this.props.target.repository.id) {
            this.props.onTargetBranchChanged(repository, GitRefUtility.getRefFriendlyName(repository.defaultBranch));
        }
    }
}
