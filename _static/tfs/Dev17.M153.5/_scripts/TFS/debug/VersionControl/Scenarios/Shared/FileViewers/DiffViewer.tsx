/// <reference types="react" />
import * as React from "react";
import { Async } from "OfficeFabric/Utilities";
import { BaseControl } from "VSS/Controls";
import * as VCDiffViewer from "VersionControl/Scripts/Controls/DiffViewer";
import { DiscussionManager } from "Presentation/Scripts/TFS/TFS.Discussion.OM";
import { Adornment } from "Presentation/Scripts/TFS/TFS.Adornment.Common";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { DiffViewerOrientation } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

export interface CommonDiffViewerProps {
    repositoryContext: RepositoryContext;
    discussionManager: DiscussionManager;
    selectedDiscussionId?: number;
    orientation: DiffViewerOrientation;
    isVisible: boolean;
    hideActionsToolbar?: boolean; // Hides the action tool bar of diff viewer if this is true or undefined.
    hideVersionSelector?: boolean; // Hides the version selector in actions toolbar of diffviewer if this is true or undefined.
    rightAlignVersionSelectorDropDown?: boolean; // Right aligns the version selector dropdown if this is true. If this is false or undefined, uses left align.
    hideComments?: boolean; // Hides comments icon if this is true. If this is false or undefined, shows the comment icon from actions toolbar.
    disableDownloadFile?: boolean; // Hides download option if this is true. If this is false or undefined, shows the download option from actions toolbar.
    hideFileName?: boolean; // Hides filename in version selector in case of Rename of file, if True. If this is false or undefined, will show the file name in version selector in case of rename of file.
    supportCommentStatus?: boolean;
    desiredLine?: number;
    adornments?: Adornment[];
    onLoadComplete?(): void;
    onDiffLinesChanged?(diffLines: number[]): void;
    onVersionPicked?(version: string, isOriginalSide: boolean): void;
    onError(error: any): void;
    onOrientationChange(orientation: DiffViewerOrientation): void;
}

export interface DiffViewerProps extends CommonDiffViewerProps {
    className: string;
    addViewsToolbarAfterActionsToolbar?: boolean; // This option is to change the taborder of the actions and views toolbars
    separateToolbarSelector?: string;
    item: ItemModel;
    mpath: string;
    mversion: string;
    opath: string;
    oversion: string;
}

export class DiffViewer extends React.PureComponent<DiffViewerProps, {}> {
    static defaultProps = {
        hideActionsToolbar: true,
        hideVersionSelector: true,
        hideComments: true,
        disableDownloadFile: true,
        supportCommentStatus: true,
    } as DiffViewerProps;

    private _diffViewerControl: VCDiffViewer.DiffViewer;
    private _async: Async;

    public render(): JSX.Element {
        return (
            <div
                className={this.props.className + (this.props.isVisible ? "" : " hidden")}
                ref="holder"
                />);
    }

    public componentWillUnmount(): void {
        this._diffViewerControl && this._diffViewerControl.dispose();
        this._diffViewerControl = null;

        this._async && this._async.dispose();
        this._async = null;
    }

    public componentWillReceiveProps(newProps: DiffViewerProps): void {
        if (this._diffViewerControl) {
            if (newProps.desiredLine && newProps.desiredLine !== this.props.desiredLine) {
                this._diffViewerControl.setPosition({ lineNumber: newProps.desiredLine, column: 1 });
            }
        }
    }

    public componentDidMount(): void {
        this._diffViewerControl =
            BaseControl.createIn(VCDiffViewer.DiffViewer, this.refs["holder"], {
                tfsContext: this.props.repositoryContext.getTfsContext(),
                separateToolbarSelector: this.props.separateToolbarSelector,
                hideActionsToolbar: this.props.hideActionsToolbar,
                hideVersionSelector: this.props.hideVersionSelector,
                addViewsToolbarAfterActionsToolbar: this.props.addViewsToolbarAfterActionsToolbar,
                rightAlignVersionSelectorDropDown: this.props.rightAlignVersionSelectorDropDown,
                hideComments: this.props.hideComments,
                disableDownloadFile: this.props.disableDownloadFile,
                hideFileName: this.props.hideFileName,
                disableAnnotate: true,
                disableDiscussionWorkItemCreation: true,
                supportCommentStatus: this.props.supportCommentStatus,
                selectedDiscussionId: this.props.selectedDiscussionId,
                orientationChangeCallback: this.props.onOrientationChange,
                onDiffLinesChanged: this.props.onDiffLinesChanged,
                onVersionPicked: this.props.onVersionPicked,
                adornments: this.props.adornments
            } as VCDiffViewer.DiffViewerOptions) as VCDiffViewer.DiffViewer;

        this._async = new Async();

        // do an initial refresh in case it is needed
        this.componentDidUpdate(this.props);
    }

    public componentDidUpdate(prevProps: DiffViewerProps): void {
        if (this._diffViewerControl && this.props.item && this.props.isVisible) {

            // reload data in the control
            this._diffViewerControl.setDiscussionManager(this.props.discussionManager);
            this._diffViewerControl.setActiveState(true, true);
            this._diffViewerControl.setOrientation(this.props.orientation, false);

            const item = this.props.item;

            this._diffViewerControl.diffItems(
                this.props.repositoryContext,
                item,
                this.props.oversion,
                this.props.mversion,
                this.props.opath,
                this.props.mpath,
                this.props.onLoadComplete,
                this.props.onError,
            );

            // Markdown and other file types might show a preview, so ensure it is showing raw source code to view comments.
            if (this.props.selectedDiscussionId) {
                this._diffViewerControl.setPreviewContentMode(false);
            }

            // when moving from not visible to visible we should refresh the layout in case
            // window/control sizes have changed while this control was not visible
            if (!prevProps.isVisible) {
                this._async && this._async.setTimeout(() => this._diffViewerControl.refreshLayout(), 0);
            }
        }
    }
}
