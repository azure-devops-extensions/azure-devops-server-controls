import React = require("react");
import Mixins = require("VersionControl/Scripts/Components/PullRequestReview/Mixins");

import ChangeTransformer = require("VersionControl/Scripts/Stores/PullRequestReview/ChangeTransformer");

// legacy stuff for control rendering
import VCPullRequestBranchesDiffChangeListControl = require("VersionControl/Scripts/Controls/PullRequestBranchesDiffChangeListControl");
import DiscussionOM = require("Presentation/Scripts/TFS/TFS.Discussion.OM");
import Controls = require("VSS/Controls");
import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import VCContracts = require("TFS/VersionControl/Contracts");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import { ChangeExplorerGridDisplayMode, DiffViewerOrientation } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import Menus = require("VSS/Controls/Menus");
import { FullScreenHelper } from "VSS/Controls/Navigation";

import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

export interface IDiffSummaryViewerProps extends React.Props<void> {
    tfsContext: TFS_Host_TfsContext.TfsContext;
    repositoryContext: RepositoryContext;
    discussionManager: DiscussionOM.DiscussionManager;
    changeList: ChangeTransformer.ChangeList;
    selectedDiffItem?: ChangeTransformer.GitDiffItem;
    displayMode: ChangeExplorerGridDisplayMode;
    orientation: DiffViewerOrientation;
    isVisible: boolean;
    onOrientationChange(orientation: DiffViewerOrientation): void;
    additionalMenuItems?(): Menus.IMenuItemSpec[];
}

/**
 * hybrid renderer for jquery change list component
 */
export class DiffSummaryViewer extends Mixins.DiagnosticComponent<IDiffSummaryViewerProps, {}> {
    private _diffSummaryViewerControl: VCPullRequestBranchesDiffChangeListControl.BranchesDiffChangeListControl

    public render(): JSX.Element {
        return <div className="vc-pullrequest-details-files"></div>;
    }

    public componentDidMount(): void {
        super.componentDidMount();

        const repository = (this.props.repositoryContext.getRepository() as VCContracts.GitRepository);

        this._diffSummaryViewerControl =
            Controls.BaseControl.createIn(VCPullRequestBranchesDiffChangeListControl.BranchesDiffChangeListControl, $(".vc-pullrequest-details-files"), {
                tfsContext: this.props.tfsContext,
                hideArtifactLevelDiscussions: true,
                supportCommentStatus: true,
                headerTitle: repository.name,
                collapseIfNoChange: true,
                keepFilePanelExpandState: true,
                changesModelChangesChangedCallback: () => { },
                orientationChangeCallback: this.props.onOrientationChange,
                additionalMenuItems: this.props.additionalMenuItems,
                noChangesMessage: VCResources.NoChangesMessage,
                contentTruncatedMessage: VCResources.PullRequestFileContentIsTrimmed
        }) as VCPullRequestBranchesDiffChangeListControl.BranchesDiffChangeListControl;
        this._diffSummaryViewerControl.setAllowHideComments(false);

        FullScreenHelper.attachFullScreenUrlUpdateEvent(this._fullScreenHandler);

        // do an initial refresh in case it is needed
        this.componentDidUpdate();
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount();

        if (this._diffSummaryViewerControl) {
            this._diffSummaryViewerControl.dispose();
            this._diffSummaryViewerControl = null;
        }

        FullScreenHelper.detachFullScreenUrlUpdateEvent(this._fullScreenHandler);
    }

    public componentDidUpdate(): void {
        super.componentDidUpdate();

        if (this._diffSummaryViewerControl && 
            this.props.changeList && 
            this.props.selectedDiffItem && 
            this.props.isVisible) {

            // reload data in the control
            this._diffSummaryViewerControl.setDiscussionManager(this.props.discussionManager);

            // reset the model if the changelists are different or if the display mode has changed
            const shouldResetModel: boolean =
                this.props.changeList.legacyChangeList() !== this._diffSummaryViewerControl.getCurrentChangeModel() ||
                this.props.displayMode !== this._diffSummaryViewerControl.getCurrentDisplayMode();

            if (!shouldResetModel) {
                // if the changelist is the same, then only reset the filter
                // (this avoids an XHR)
                this._diffSummaryViewerControl.setFilter({
                    path: this.props.selectedDiffItem.mpath,
                    recursive: true,
                });
            } else {
                // if the changelist is different we need to reset the whole model
                this._diffSummaryViewerControl.setModel(
                    this.props.repositoryContext,
                    this.props.changeList.legacyChangeList(),
                    this.props.selectedDiffItem.oversion,
                    this.props.selectedDiffItem.mversion,
                    {
                        path: this.props.selectedDiffItem.mpath,
                        recursive: true,
                    },
                    this.props.orientation,
                    this.props.displayMode);
            }
            this._diffSummaryViewerControl.showElement();
            this._diffSummaryViewerControl.setActiveState(true, true);  
        }
    }

    public shouldComponentUpdate(nextProps: IDiffSummaryViewerProps, nextState: {}): boolean {
        if (!nextProps.changeList) {
            // there is a chance the changelist will be null during switches between iterations
            // in order to avoid blowing up the jquery control we will just not update this cycle
            return false; 
        }

        return (this.props.discussionManager !== nextProps.discussionManager
            || this.props.selectedDiffItem !== nextProps.selectedDiffItem
            || this.props.changeList !== nextProps.changeList
            || this.props.displayMode !== nextProps.displayMode
            || this.props.isVisible !== nextProps.isVisible);
    }

    private _fullScreenHandler = (): void => {
        this._diffSummaryViewerControl.updateAdditionalMenuItems(this.props.additionalMenuItems());
    };
}
