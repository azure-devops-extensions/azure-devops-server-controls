import * as React from "react";
import { css } from "OfficeFabric/Utilities";

// legacy stuff for control rendering
import Controls = require("VSS/Controls");
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { DiscussionManager } from "Presentation/Scripts/TFS/TFS.Discussion.OM";
import VCFileViewer = require("VersionControl/Scripts/Controls/FileViewer");
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";

import "VSS/LoaderPlugins/Css!VersionControl/Shared/FileViewers/FileViewer";

export interface IFileViewerProps extends React.Props<void> {
    tfsContext: TfsContext;
    repositoryContext: RepositoryContext;
    discussionManager: DiscussionManager;
    selectedDiscussionId?: number;
    disableInitialPreview?: boolean;
    itemDetail: ItemModel;
    isDelete: boolean;
    isVisible: boolean;
    cssClass?: string;
}

const fileViewerToolbarSelector = ".pr-fileviewer-toolbar";

/**
 * Rendering container for jquery files component.
 */
export class FileViewer extends React.Component<IFileViewerProps, {}> {
    private _fileViewerControl: VCFileViewer.FileViewer;

    private static readonly _defaultFileViewerClass = "vc-file-viewer";

    public render(): JSX.Element {
        return <div className={css(FileViewer._defaultFileViewerClass, this.props.cssClass)}></div>;
    }

    public componentDidMount(): void {
        // first render after loading is complete should create the control
        this._fileViewerControl =
            Controls.BaseControl.createIn(VCFileViewer.FileViewer, $("." + FileViewer._defaultFileViewerClass), {
                tfsContext: this.props.tfsContext,
                separateToolbarSelector: fileViewerToolbarSelector,
                hideActionsToolbar: true,
                disableDiscussionWorkItemCreation: true,
                supportCommentStatus: true,
                selectedDiscussionId: this.props.selectedDiscussionId,
            } as VCFileViewer.FileViewerOptions) as VCFileViewer.FileViewer;

        // do an initial refresh in case it is needed
        this.componentDidUpdate(this.props);
    }

    public componentWillUnmount(): void {
        if (this._fileViewerControl) {
            this._fileViewerControl.dispose();
            this._fileViewerControl = null;
        }
    }

    public componentDidUpdate(prevProps: IFileViewerProps): void {
        if (this.props.isVisible && this._fileViewerControl && this.props.itemDetail) {
            // reload data in the control
            if (this.props.discussionManager) {
                this._fileViewerControl.setDiscussionManager(this.props.discussionManager, false, this.props.isDelete);
            }

            this._fileViewerControl.setActiveState(true, true);
            this._fileViewerControl.viewItem(this.props.repositoryContext, this.props.itemDetail, null, null)
                .then(() => {
                    const discussionSelectionChanged: boolean = Boolean(this.props.selectedDiscussionId) && this.props.selectedDiscussionId !== prevProps.selectedDiscussionId;
                    const itemSelectionChanged: boolean = this.props.itemDetail !== prevProps.itemDetail;

                    // markdown and other file types might show a preview, so force preview off if
                    // 1. we have a discussion we want to view and it has changed since the last update (can't view discussions in preview mode)
                    // 2. we are viewing a different file item than before and preview was explicitly requested to be initially off
                    if (discussionSelectionChanged || (this.props.disableInitialPreview && itemSelectionChanged)) {
                        this._fileViewerControl.setPreviewContentMode(false);
                    }
                });

            this._fileViewerControl.showElement();
        }

        $(fileViewerToolbarSelector).toggle(!!this.props.isVisible);
    }

    public shouldComponentUpdate(nextProps: IFileViewerProps, nextState: {}): boolean {
        return (this.props.discussionManager !== nextProps.discussionManager
            || this.props.itemDetail !== nextProps.itemDetail
            || this.props.isVisible !== nextProps.isVisible
            || (Boolean(nextProps.selectedDiscussionId) && this.props.selectedDiscussionId !== nextProps.selectedDiscussionId));
    }
}
