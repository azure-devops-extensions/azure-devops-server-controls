import * as React from "react";
import { Dropdown, IDropdownOption } from "OfficeFabric/Dropdown";
import { autobind } from "OfficeFabric/Utilities";

import { BaseControl } from "VSS/Controls";
import { GitRepository } from "TFS/VersionControl/Contracts";

import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { GitRepositorySelectorMenu, GitRepositorySelectorMenuOptions } from "VersionControl/Scripts/Controls/GitRepositorySelectorMenu";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Integration/RepositoryPicker/RepositoryPicker";

export interface RepositoryPickerProps {
    projectId: string;
    onRepositoryChanged(repository: GitRepository, isDefault?: boolean): void;
    defaultRepository?: GitRepository;
    disabled?: boolean;
    fullPopupWidth?: boolean;
}

export class RepositoryPicker extends React.Component<RepositoryPickerProps, {}> {
    private _container: HTMLElement;
    private _repositorySelectorMenu: GitRepositorySelectorMenu;

    public render(): JSX.Element {
        if (this.props.disabled) {
            // Using separate element for disabled view since GitRepositorySelectorMenu does not support a disabled behavior.
            const repositoryName = this.props.defaultRepository ? this.props.defaultRepository.name : null;

            return (
                <Dropdown
                    className={"repository-picker-dropdown"}
                    disabled={true}
                    selectedKey={repositoryName}
                    options={[
                        { key: repositoryName, text: repositoryName }
                    ]}
                    onRenderTitle={this._onRenderTitle} />);
        } else {
            return (
                <div
                    className={"repository-picker"}
                    role="button"
                    ref={(container) => { this._container = container }} />);
        }
    }

    public componentDidMount(): void {
        this._createGitRepositoryMenu();
    }

    public componentWillUnmount(): void {
        if (this._container) {
            this._container = null;
        }
    }

    private _createGitRepositoryMenu(): void {
        this._repositorySelectorMenu = BaseControl.enhance(
            GitRepositorySelectorMenu,
            this._container,
            {
                projectId: this.props.projectId,
                projectInfo: undefined,
                tfvcRepository: null,
                showItemIcons: true,
                showRepositoryActions: false,
                onItemChanged: this.props.onRepositoryChanged,
                onDefaultRepositorySelected: this._onDefaultRepositorySelected,
                setPopupWidthToMatchMenu: this.props.fullPopupWidth,
            } as GitRepositorySelectorMenuOptions) as GitRepositorySelectorMenu;
    }

    @autobind
    private _onDefaultRepositorySelected(repository: GitRepository): void {
        const inputDefaultRepository = this.props.defaultRepository;
        if (inputDefaultRepository
            && this._repositorySelectorMenu) {

            this._repositorySelectorMenu.setSelectedRepository(inputDefaultRepository);
            // Passing 'true' to denote we are setting the repository from the props
            this.props.onRepositoryChanged(inputDefaultRepository, true);
        } else {
            this.props.onRepositoryChanged(repository);
        }
    }

    @autobind
    private _onRenderTitle(selectedOptions: IDropdownOption[]): JSX.Element {
        return <div className={"repository-picker-title"}>
            <span className={"bowtie-icon bowtie-git"} />
            <span className={"title-text"}>{selectedOptions[0].text}</span>
        </div>;
    }
}
