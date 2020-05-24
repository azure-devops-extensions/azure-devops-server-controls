import * as React from "react";

import { BaseControl } from "VSS/Controls";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { GitRepository } from "TFS/VersionControl/Contracts";

import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { GitRepositorySelectorMenu, GitRepositorySelectorMenuOptions } from "VersionControl/Scripts/Controls/GitRepositorySelectorMenu";

import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";
import { getTfvcRepositoryName } from "ProjectOverview/Scripts/Utils";
import { getRepositoryContext } from "ProjectOverview/Scripts/Utils";

import "VSS/LoaderPlugins/Css!PivotView";

export interface RepositorySelectorProps {
    initialRepositoryContext: RepositoryContext;
    supportsTfvc: boolean;
    onRepositoryChange: (repositoryContext: RepositoryContext) => void;
    className?: string;
    tfsContext: TfsContext;
    onDefaultRepositorySelected: (repository: RepositoryContext) => void; 
}

export class RepositorySelector extends React.Component<RepositorySelectorProps, {}> {
    private _innerControl: GitRepositorySelectorMenu;
    private _container: HTMLElement;

    public componentDidMount(): void {
        this._createControl();
    }

    public componentWillUnmount(): void {
        if (this._innerControl) {
            this._innerControl.dispose();
            this._innerControl = null;
        }
    }

    public render(): JSX.Element {
        return <div
            className={this.props.className}
            role="combobox"
            ref={(container) => { this._container = container }} />;
    }

    private _createControl(): void {

        let initialSelectedItem = null;
        if (this.props.initialRepositoryContext && this.props.initialRepositoryContext.getRepositoryType() === RepositoryType.Git) {
            initialSelectedItem = this.props.initialRepositoryContext.getRepository();
        } else {
            initialSelectedItem = this._getFormattedTfvcRepository();
            this._onDefaultRepositorySelected(initialSelectedItem);
        }
        this._innerControl = BaseControl.enhance(
            GitRepositorySelectorMenu,
            this._container,
            {
                projectId: this.props.tfsContext.contextData.project.id,
                projectInfo: undefined,
                showRepositoryActions: false,
                showItemIcons: true,
                tfvcRepository: this._getFormattedTfvcRepository(),
                initialSelectedItem: initialSelectedItem,
                onItemChanged: this._onItemSelected,
                onDefaultRepositorySelected: this._onDefaultRepositorySelected,
            } as GitRepositorySelectorMenuOptions) as GitRepositorySelectorMenu;

        this._container.title = ProjectOverviewResources.Readme_RepositorySelectorLabel;
    }

    private _onItemSelected = (repository: GitRepository): void => {
        let isTfvc = this.props.supportsTfvc && repository.name === getTfvcRepositoryName(this.props.tfsContext);
        this.props.onRepositoryChange(getRepositoryContext(isTfvc, repository));
    }

    private _onDefaultRepositorySelected = (repository): void =>{
        let isTfvc = this.props.supportsTfvc && repository.name === getTfvcRepositoryName(this.props.tfsContext);
        this.props.onDefaultRepositorySelected(getRepositoryContext(isTfvc, repository))
    }

    private _getFormattedTfvcRepository(): GitRepository {
        if (this.props.supportsTfvc) {
            return {
                name: getTfvcRepositoryName(this.props.tfsContext),
            } as GitRepository;
        }

        return null;
    }
}
