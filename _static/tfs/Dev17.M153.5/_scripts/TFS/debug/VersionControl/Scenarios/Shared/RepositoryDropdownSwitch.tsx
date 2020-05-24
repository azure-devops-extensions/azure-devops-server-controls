import * as React from "react";
import { BaseControl } from "VSS/Controls";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { TeamProjectReference } from "TFS/Core/Contracts";
import { GitRepository } from "TFS/VersionControl/Contracts";
import * as _VCRepositoryDropdown from "VC/Common/Components/RepositoryDropdown";
import { IRepositoryPickerItem } from "VC/Common/RepositoryPickerProvider";
import { EnsurePageContext } from "VersionControl/Scenarios/Shared/EnsurePageContext";
import { GitRepositorySelectorMenu, GitRepositorySelectorMenuOptions } from "VersionControl/Scripts/Controls/GitRepositorySelectorMenu";

export interface RepositoryDropdownSwitchProps {
    className?: string;
    ariaLabelledby?: string;
    currentRepository: GitRepository;
    onRepositoryChange: (repository: GitRepository) => void;
    repositories?: GitRepository[];

    /**
     * If true, dropdown width matches the component width.
     * False by default, so dropdown would use a fixed width.
     */
    isDrodownFullWidth?: boolean;
}

export class RepositoryDropdownSwitch extends React.Component<RepositoryDropdownSwitchProps, {}> {
    public render(): JSX.Element {
        const selectedItem = this.props.currentRepository || { project: {} } as GitRepository;

        return <EnsurePageContext
            onFallback={() => <LegacyRepositorySelector {...this.props} />}
        >
            <RepositoryDropdownAsync
                className={this.props.className}
                ariaLabelledby={this.props.ariaLabelledby}
                fullPopupWidth={this.props.isDrodownFullWidth}
                providerOptions={{
                    projectName: selectedItem.project.name,
                    projectId: selectedItem.project.id,
                    selectedRepositoryId: selectedItem.id,
                    selectedRepositoryName: selectedItem.name,
                    selectedRepositoryIsFork: selectedItem.isFork,
                    selectedRepositoryIsTfvc: false,
                    supportsTfvc: false,
                    getRepositories: this.props.repositories && (() => Promise.resolve(this.props.repositories)),
                    onRepositorySelected: this._onItemSelected,
                    showFavoritesEarly: false,
                }}
            />
        </EnsurePageContext>;
    }

    private _onItemSelected = (item: IRepositoryPickerItem): void => {
        this.props.onRepositoryChange(item && item.repository);
    }
}

export class LegacyRepositorySelector extends React.Component<RepositoryDropdownSwitchProps, {}> {
    private _container: HTMLElement;
    private _repositorySelectorMenu: GitRepositorySelectorMenu;

    public render(): JSX.Element {
        return (
            <div
                role="combobox"
                ref={container => { this._container = container }}
            />);
    }

    public componentDidMount(): void {
        const repository = this.props.currentRepository;
        const project = repository && repository.project || {} as TeamProjectReference;

        this._repositorySelectorMenu = BaseControl.enhance(
            GitRepositorySelectorMenu,
            this._container,
            {
                tfsContext: TfsContext.getDefault(),
                projectId: project.id,
                projectName: project.name,
                projectInfo: undefined,
                showItemIcons: true,
                showRepositoryActions: false,
                setPopupWidthToMatchMenu: this.props.isDrodownFullWidth,
                onItemChanged: this.onRepositoryChanged,
                onInitialSelectedItem: this.onRepositoryChanged,
            } as GitRepositorySelectorMenuOptions) as GitRepositorySelectorMenu;
    }

    public componentWillUnmount(): void {
        if (this._container) {
            this._container = null;
        }
    }

    private onRepositoryChanged = (repository: GitRepository): void => {
        if (this._repositorySelectorMenu) {
            this._repositorySelectorMenu.setSelectedRepository(repository);
        }

        this.props.onRepositoryChange(repository);
    }
}

const RepositoryDropdownAsync = getAsyncLoadedComponent(
    ["VC/Common/Components/RepositoryDropdown"],
    (vcRepositoryDropdown: typeof _VCRepositoryDropdown) => vcRepositoryDropdown.RepositoryDropdownComponent);
