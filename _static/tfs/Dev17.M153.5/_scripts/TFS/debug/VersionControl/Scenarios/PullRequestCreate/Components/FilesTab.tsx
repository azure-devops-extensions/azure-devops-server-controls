import * as React from "react";
import { Pivot, PivotItem } from "OfficeFabric/Pivot";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { GitCommit } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as VSSPlatformComponent from "VSS/Flux/PlatformComponent";
import { DiffChangeListControl } from "VersionControl/Scripts/Controls/BranchesDiffChangeListControl";
import * as VSSControls from "VSS/Controls";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { HubSpinner, Alignment } from "MyExperiences/Scenarios/Shared/Components/HubSpinner";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

import "VSS/LoaderPlugins/Css!VersionControlControls";
import "VSS/LoaderPlugins/Css!VersionControl/FilesTab";

export interface FilesTabProps {
    tfsContext: TfsContext;
    repositoryContext: GitRepositoryContext;
    diffCommit: GitCommit;
    isLoading: boolean;
    sourceBranchVersionString: string;
}

export class FilesTab extends React.PureComponent<FilesTabProps, {}> {
    public render(): JSX.Element {
        if (this.props.isLoading || !this.props.diffCommit) {
            return <HubSpinner labelText={VCResources.PullRequest_FetchingChanges} alignment={Alignment.center} />;
        }

        const oversion = this.props.diffCommit.commitId && new VCSpecs.GitCommitVersionSpec(this.props.diffCommit.commitId.full).toVersionString();
        const mversion = this.props.sourceBranchVersionString;

        return <div className="vc-change-summary">
            <DiffViewer
                options={
                    {
                        tfsContext: this.props.tfsContext,
                        title: this.props.repositoryContext.getRepository().name,
                        noChangesMessage: VCResources.NoChangesMessage
                    }
                }
                repositoryContext={this.props.repositoryContext}
                oversion={oversion}
                mversion={mversion}
                diffCommit={this.props.diffCommit} />
        </div>;
    }
}

interface DiffChangeListControlOptions {
    tfsContext: TfsContext,
    title: string,
    noChangesMessage: string
}

interface DiffViewerProps extends VSSPlatformComponent.Props<DiffChangeListControlOptions> {
    repositoryContext: GitRepositoryContext;
    diffCommit: GitCommit;
    oversion: string;
    mversion: string;
}

class DiffViewer extends VSSPlatformComponent.Component<DiffChangeListControl, DiffViewerProps, VSSPlatformComponent.State> {
    protected createControl(element: JQuery): DiffChangeListControl {
        const control = VSSControls.create(DiffChangeListControl, element, this.props.options);
        control.setModel(this.props.repositoryContext, this.props.diffCommit, this.props.oversion, this.props.mversion);
        return control;
    }
}