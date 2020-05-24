/// <reference types="react" />
import * as React from "react";
import { DiagnosticComponent } from "VersionControl/Scripts/Components/PullRequestReview/Mixins";
import { GitDiffItem } from "VersionControl/Scripts/Stores/PullRequestReview/ChangeTransformer";
import * as VCSharedDiffViewer from "VersionControl/Scenarios/Shared/FileViewers/DiffViewer";

export interface IDiffViewerProps extends VCSharedDiffViewer.CommonDiffViewerProps {
    commitVersion?: string;
    selectedDiffItem?: GitDiffItem;
}

const diffViewerToolbarSelector = ".pr-diffviewer-toolbar";

export class DiffViewer extends DiagnosticComponent<IDiffViewerProps, {}> {

    public render(): JSX.Element {
        return <VCSharedDiffViewer.DiffViewer
            {...this.props}
            mpath={this.props.selectedDiffItem && this.props.selectedDiffItem.mpath}
            mversion={this.props.selectedDiffItem && this.props.selectedDiffItem.mversion}
            opath={this.props.selectedDiffItem && this.props.selectedDiffItem.opath}
            oversion={this.props.selectedDiffItem && this.props.selectedDiffItem.oversion}
            item={this.getItem()}
            separateToolbarSelector={diffViewerToolbarSelector}
            className="vc-pullrequest-details-compare"
            />;
    }

    public componentDidUpdate(): void {
        super.componentDidUpdate();

        $(diffViewerToolbarSelector).toggle(!!this.props.isVisible);
    }

    private getItem() {
        const item = this.props.selectedDiffItem && this.props.selectedDiffItem.item as any;

        if (item && this.props.commitVersion) {
            item.version = this.props.commitVersion;
        }

        return item;
    }
}
