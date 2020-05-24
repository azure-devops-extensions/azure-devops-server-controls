/// <reference types="jquery" />
/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import { Events } from "Build/Scripts/Constants";
import { getStore as getRepositoryPickerControlStore, Store as RepositoryPickerControlStore, RepositoryKeys } from "Build/Scripts/Stores/RepositoryPicker";

import { RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { ITfsComponentProps, IState as ITfsReactState, TfsComponent } from "Presentation/Scripts/TFS/TFS.React";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { VersionControlProjectInfo, GitRepository } from "TFS/VersionControl/Contracts";

import { GitRepositorySelectorMenu, GitRepositorySelectorMenuOptions } from "VersionControl/Scripts/Controls/GitRepositorySelectorMenu";

import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";

import { create, EnhancementOptions } from "VSS/Controls";
import { EventService, getService as getEventService } from "VSS/Events/Services";

import "VSS/LoaderPlugins/Css!Build/RepositoryPicker";

export interface IRepoOption {
    id: string | null;
    type: string;
    data: GitRepository;
}

export type RepoOptionType = IRepoOption | null;

export interface IRepositoryPickerProps extends ITfsComponentProps {
    onRepositorySelected: (repo: RepoOptionType) => void;
    className?: string;
    showPlaceholderInitially?: boolean;
    showPlaceholder?: boolean;
}

export interface IRepositoryPickerState extends ITfsReactState {
    projectInfo: VersionControlProjectInfo;
    tfvcRepository: GitRepository;
    tfsContext: TfsContext;
    placeHolder: GitRepository;
    showPlaceholder?: boolean;
}

interface IControlOptions extends GitRepositorySelectorMenuOptions, EnhancementOptions {
    onItemChanged: (item) => void;
}

export class RepositoryPicker extends React.Component<IRepositoryPickerProps, IRepositoryPickerState> {
    private _onStoresUpdated: () => void;
    private _store: RepositoryPickerControlStore;

    constructor(props: IRepositoryPickerProps) {
        super(props);

        this._store = getRepositoryPickerControlStore();

        this.state = this._getState();

        this._onStoresUpdated = () => {
            this.setState(this._getState());
        }
    }

    public render(): JSX.Element {
        const { showPlaceholder, ...props } = this.props;
        if (!this.state.projectInfo) {
            return <Spinner size={SpinnerSize.small} />;
        }
        else {
            return <RepositoryPickerComponent
                projectInfo={this.state.projectInfo}
                tfvcRepository={this.state.tfvcRepository}
                tfsContext={this.state.tfsContext}
                placeHolder={this.state.placeHolder}
                showPlaceholder={this.state.showPlaceholder}
                { ...props }
            />
        }
    }

    public componentDidMount() {
        this._store.addChangedListener(this._onStoresUpdated);
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onStoresUpdated);
    }

    public componentWillReceiveProps(nextProps: IRepositoryPickerProps) {
        if (this.props.showPlaceholder != nextProps.showPlaceholder) {
            this.setState({
                showPlaceholder: nextProps.showPlaceholder
            });
        }
    }

    private _getState(): IRepositoryPickerState {
        return {
            projectInfo: this._store.getVersionControlProjectInfo(),
            tfvcRepository: this._store.getTfvcRepositoryAsGit(),
            tfsContext: this._store.getTfsContext(),
            placeHolder: this._store.getPlaceHolder()
        };
    }

}

interface RepositoryPickerProps extends IRepositoryPickerProps {
    projectInfo: VersionControlProjectInfo;
    tfvcRepository: GitRepository;
    tfsContext: TfsContext;
    placeHolder: GitRepository;
}

class RepositoryPickerComponent extends TfsComponent<RepositoryPickerProps, ITfsReactState> {
    private _control: GitRepositorySelectorMenu = null;

    constructor(props: RepositoryPickerProps) {
        super(props);
    }

    protected onRender(element: HTMLElement) {
        if (!element) {
            return;
        }

        if (this.props.className) {
            $(element).attr("class", this.props.className);
        }

        if (!this._control && this.props.projectInfo) {
            let options: IControlOptions = {
                tfsContext: this.props.tfsContext,
                projectId: this.props.projectInfo.project.id,
                showRepositoryActions: false,
                projectInfo: this.props.projectInfo,
                tfvcRepository: this.props.tfvcRepository,
                cssClass: "build-repository-picker-control",
                onItemChanged: this._repositorySelectionChanged,
                onDefaultRepositorySelected: this._repositorySelectionChanged
            };

            this._control = create(GitRepositorySelectorMenu, $(element), options);

            this._control.getElement().attr("data-is-focusable", "true");

            getEventService().attachEvent(Events.ClearComboControlInput, () => {
                this._control.setSelectedRepository(this.props.placeHolder);
            });

            if (this.props.showPlaceholderInitially) {
                this._control.setSelectedRepository(this.props.placeHolder);
            }

        }

        if (this.props.showPlaceholder) {
            this._control.setSelectedRepository(this.props.placeHolder);
        }
    }

    private _repositorySelectionChanged = (repo: GitRepository) => {
        if (repo && repo.id !== RepositoryKeys.PlaceHolder) {
            let option: IRepoOption = {
                id: null,
                data: repo
            } as IRepoOption;

            // May be we could use sourceprovidermanager to get these, but that seems to be overkill here, it loads so many files which are not needed at all
            // and we know that there's gonna be only two types in this picker as of now
            // the picker behaves differently for "Favorited items", if tfvc is favorited, it sends the ID too, where as normal selections doesn't
            if (repo.id && repo.id !== RepositoryKeys.Tfvc) {
                option.id = repo.id;
                option.type = RepositoryTypes.TfsGit;
            }
            else {
                // if repo has no Id or it's the tfvc id, it's the dummy tfvc repo we added
                option.type = RepositoryTypes.TfsVersionControl;
            }

            this.props.onRepositorySelected(option);
        }
        else {
            this.props.onRepositorySelected(null);
        }
    }
}
