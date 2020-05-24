import * as React from "react";

import { BaseControl } from "VSS/Controls";

import { autobind } from "OfficeFabric/Utilities";

import { TeamProjectCollectionReference } from "TFS/Core/Contracts";

import { ProjectSelectorMenu, ProjectSelectorMenuOptions } from "VersionControl/Scripts/Controls/ProjectSelectorMenu";

export interface ProjectSelectorProps {
    currentProject: TeamProjectCollectionReference;
    onProjectChange: (project: TeamProjectCollectionReference) => void;
    className?: string;
    title?: string;
}

export class ProjectPicker extends React.PureComponent<ProjectSelectorProps, {}> {
    private _projectSelectorMenu: ProjectSelectorMenu;
    private _container: HTMLElement;

    public componentDidMount(): void {
        this._projectSelectorMenu = BaseControl.enhance(
            ProjectSelectorMenu,
            this._container,
            {
                projectId: null,
                projectInfo: undefined,
                showRepositoryActions: false,
                showItemIcons: true,
                tfvcRepository: null,
                initialSelectedItem: this.props.currentProject,
                onItemChanged: this._onItemSelected,
                initialRepositories: [],
            } as ProjectSelectorMenuOptions) as ProjectSelectorMenu;

        if (this.props.title) {
            this._container.title = this.props.title;
        }
    }

    public componentWillUnmount(): void {
        if (this._projectSelectorMenu) {
            this._projectSelectorMenu.dispose();
            this._projectSelectorMenu = null;
        }
    }

    public render(): JSX.Element {
        return <div ref={this._storeContainerRef} role={"combobox"} className={"vc-project-picker"} />;
    }

    @autobind
    private _storeContainerRef(elem: HTMLElement) {
        this._container = elem;
    }

    @autobind
    private _onItemSelected(project: TeamProjectCollectionReference) {
        if (this.props.onProjectChange) {
            this.props.onProjectChange(project);
        }
    }
}