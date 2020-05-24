import { css } from "OfficeFabric/Utilities";
import * as React from "react";
import * as Controls from "VSS/Controls";

import { DecorationAdornment } from "Presentation/Scripts/TFS/TFS.Adornment.Common";
import {
    FileViewer,
    FileEditSettings,
    FileViewSettings,
    FileViewerSelection,
    FileViewerScrollPosition,
    FileViewerOfflineSettings
} from "VersionControl/Scripts/Controls/FileViewer";
import { LineAdornmentOptions, FileViewerLineAdornment } from "VersionControl/Scripts/FileViewerLineAdornment";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { ContextMenuItemExtension } from "VersionControl/Scripts/TFS.VersionControl.EditorExtensions";
import { CodeExplorerWikiLinkTransformer } from "VersionControl/Scripts/TFS.VersionControl.WikiLinkTransformer";
import { areSimilar } from "VersionControl/Scripts/Utils/Number";

import "VSS/LoaderPlugins/Css!VersionControl/Shared/FileViewers/EditableFileViewer";

export { FileViewerSelection, FileViewerScrollPosition };

export interface EditableFileViewerProps {
    className: string;
    isVisible?: boolean;
    repositoryContext: RepositoryContext;
    displayItem: ItemModel;
    isEditing: boolean;
    isNewFile: boolean;
    hideBranchCreationOption?: boolean;
    initialContent: string;
    scrollToAnchor?: string;
    /**
     * Whether local Markdown links will be rendered as complete URLs or as fragments.
     * Fragments will only work if the page handle navigation like Code Explorer.
     */
    useFragmentsForMarkdownLinks?: boolean;
    scrollTop?: number;
    line?: LineAdornmentOptions;
    isPreviewMode: boolean | undefined;
    isDiffMode?: boolean;
    isDiffInline?: boolean;
    /**
     * Disables editor features that alter line height, like word wrapping and code folding.
     */
    preserveLineHeight?: boolean;
    /**
     * FileViewerOfflineSettings can be used for passing prefetched file content,
     * adornments and such properties.
     * It is used on search page for Git, TFVC and Source Depot scenarios.
     */
    fileViewerOfflineSettings?: FileViewerOfflineSettings;
    /**
     * This property governs whether to show the link generated on selecting a snippet of code.
     * The link takes the user to the selection in code explorer
     * Default value: false
     */
    copyLinkToSelectionDisabled?: boolean
    /**
     * addExtension property provides a callback to the user which can be used to ad extensions to the fileViewer
     * This property is used by the Search page to add the hit navigation extension.
     */
    addExtension?(fileViewer: FileViewer): void;
    onContentEdited?(content: string): void;
    onFileContentLoaded?(originalContent: string, isTooBigToEdit: boolean): void;
    onSelectionChanged?(selection: FileViewerSelection): void;
    onScrollChanged?(position: FileViewerScrollPosition): void;
    onEditorEscapeEdit?(): void;
}

const configPropNames: Array<keyof EditableFileViewerProps> = [
    "isDiffMode",
    "isDiffInline",
    "line",
    "preserveLineHeight",
];

/**
 * Component that wraps a JQuery FileViewer to display and edit files.
 */
export class EditableFileViewer extends React.Component<EditableFileViewerProps, {}> {
    public static defaultProps = {
        isVisible: true,
    } as EditableFileViewerProps;

    private innerControl: FileViewer;
    private lastKnownScrollTop: number;

    public componentDidMount(): void {
        this.innerControl = this.createControl();

        this.configControl(this.props);
        this.viewItem(this.props);

        this.updateScrollTop(this.props.scrollTop);
    }

    public componentWillUnmount(): void {
        if (this.innerControl) {
            this.innerControl.dispose();
            this.innerControl = null;
        }
    }

    public componentWillReceiveProps(nextProps: EditableFileViewerProps): void {
        if (!shallowCompareSomeProps(this.props, nextProps, configPropNames) || haveOfflineSettingsChanged(this.props, nextProps)) {
            const doNotSetFocusWhenConfigChangesAfterMount = true;
            this.configControl(nextProps, doNotSetFocusWhenConfigChangesAfterMount);
        }
    }

    public componentWillUpdate(nextProps: EditableFileViewerProps): void {
        if (hasChangedViewItem(nextProps, this.props) || haveOfflineContentChanged(this.props, nextProps)) {
            this.viewItem(nextProps);
        }

        this.updateScrollTop(nextProps.scrollTop);
    }

    public render(): JSX.Element {
        const className = css(
            "file-viewer-holder",
            this.props.className,
            !this.props.isVisible && "file-viewer-hidden");

        return <div className={className} ref="holder" />;
    }

    public raiseScrollChanged(): void {
        this.innerControl.beginGetScrollPosition(this.onScrollChanged);
    }

    private createControl(): FileViewer {
        // In Code Search scenario where FileViewer previews a Source depot file, repository context is passed as null.
        const tfsContext = this.props.repositoryContext ? this.props.repositoryContext.getTfsContext() : null;
        const fileViewer =
            Controls.BaseControl.createIn(FileViewer, this.refs["holder"], {
                tfsContext: tfsContext,
                monitorScroll: this.props.onScrollChanged,
                monitorSelection: this.props.onSelectionChanged,
                hideActionsToolbar: true,
                allowEditing: true,
            }) as FileViewer;

        ContextMenuItemExtension.addContextMenuItems(fileViewer);
        ContextMenuItemExtension.bindContextMenuItems(fileViewer);

        fileViewer.setContentChangedCallback(this.onContentChanged);
        fileViewer.addSelectionListener(this.onSelectionChanged);
        fileViewer.addScrollPositionListener(this.onScrollChanged);
        fileViewer.setEditorEscapeEditCallback(this.onEditorEscapeEdit);

        fileViewer.showElement();

        fileViewer.setActiveState(true, true);

        // Add the optional extension to the fileViewer. This extension is being used in Search Page to add HitNavigationExtension
        if (this.props.addExtension) {
            this.props.addExtension(fileViewer);
        }

        return fileViewer;
    }

    private configControl(props: EditableFileViewerProps, noFocus: boolean = false): void {
        const commonConfig = {
            showDiff: props.isDiffMode,
            inline: props.isDiffInline,
            preserveLineHeight: props.preserveLineHeight,
            noFocus,
        };

        if (props.fileViewerOfflineSettings) {
            this.innerControl.extendEditorConfig({
                ...commonConfig,
                adornmentsEnabled: true,
                adornments: props.fileViewerOfflineSettings.hitAdornments,
            });
        } else {
            this.innerControl.extendEditorConfig({
                ...commonConfig,
                adornmentsEnabled: Boolean(props.line),
                adornments: props.line ? FileViewerLineAdornment.create(props.line) : [],
            });
        }
    }

    private viewItem(props: EditableFileViewerProps): void {
        const item = props.displayItem;
        const fileViewer = this.innerControl;
        if (!fileViewer) {
            return;
        }

        if (!item || !item.contentMetadata || item.isFolder) {
            // Clear content to prevent it to be displayed provisionally while loading another item content,
            // and to prevent it to be used if another item with the same name of a deleted one is created.
            // Don't clear if we just toggle visibility (like switching tabs in Explorer) to prevent extra content fetch.
            fileViewer.clearContent();
            return;
        }

        if (props.isVisible) {
            if (!props.copyLinkToSelectionDisabled) {
                fileViewer.setLineLinkingWidgetUrl(window.location.href);
            }
            fileViewer.viewItem(
                props.repositoryContext,
                item,
                this.getEditSettings(props),
                this.getViewSettings(props),
                props.fileViewerOfflineSettings
            ).then(() => {
                if (!this.innerControl || this.innerControl.isDisposed()) {
                    return;
                }

                if (props.isPreviewMode !== undefined) {
                    fileViewer.setPreviewContentMode(props.isPreviewMode);
                }

                const { onFileContentLoaded } = props;
                if (onFileContentLoaded && item === props.displayItem) {
                    fileViewer.beginGetEditorContent(content => {
                        onFileContentLoaded(content, fileViewer.isContentTooBigToEdit());
                    });
                }
            });
        }
    }

    private getEditSettings(props: EditableFileViewerProps): FileEditSettings {
        const editSettings: FileEditSettings = {
            allowBranchCreation: !props.hideBranchCreationOption,
            editMode: props.isEditing,
            allowEditing: true,
            newFile: props.isNewFile,
        };

        if (props.isNewFile && props.initialContent) {
            editSettings.initialContent = props.initialContent;
        }

        return editSettings;
    }

    private getViewSettings(props: EditableFileViewerProps): FileViewSettings {
        return {
            contentRendererOptions: {
                linkTransformer: new CodeExplorerWikiLinkTransformer(props.repositoryContext, props.displayItem, props.useFragmentsForMarkdownLinks),
            },
            scrollContentTo: props.scrollToAnchor,
        };
    }

    private onContentChanged = (content: string): void => {
        if (this.props.onContentEdited) {
            this.props.onContentEdited(content);
        }
    }

    private onSelectionChanged = (selection: FileViewerSelection): void => {
        if (this.props.onSelectionChanged) {
            this.props.onSelectionChanged(selection);
        }
    }

    private updateScrollTop(scrollTop: number) {
        if (this.innerControl &&
            scrollTop !== undefined &&
            !areSimilar(scrollTop, this.lastKnownScrollTop)) {
            this.innerControl.scroll(scrollTop);
        }
    }

    private onScrollChanged = (position: FileViewerScrollPosition): void => {
        if (this.props.onScrollChanged) {
            this.props.onScrollChanged(position);
        }

        this.lastKnownScrollTop = position.scrollTop;
    }

    private onEditorEscapeEdit = (): void => {
        if (this.props.onEditorEscapeEdit) {
            this.props.onEditorEscapeEdit();
        }
    }
}

function hasChangedViewItem(nextProps: EditableFileViewerProps, props: EditableFileViewerProps): boolean {
    return !shallowCompareSomeProps(
        nextProps,
        props,
        [
            "isVisible",
            "displayItem",
            "isPreviewMode",
            "isEditing",
            "scrollToAnchor",
            "isNewFile",
            "initialContent",
            "hideBranchCreationOption",
        ]);
}

function shallowCompareSomeProps<T>(a: T, b: T, keys: Array<keyof T>): boolean {
    for (const key of keys) {
        if (a[key] !== b[key]) {
            return false;
        }
    }

    return true;
}

/**
 * Compares both the props for the change in offline settings.
 * returns false if both are same else returns true
 * @param oldProps
 * @param newProps
 */
function haveOfflineSettingsChanged(oldProps: EditableFileViewerProps, newProps: EditableFileViewerProps): boolean {
    if (oldProps.fileViewerOfflineSettings && newProps.fileViewerOfflineSettings) {
        const oldHighlights: DecorationAdornment[] = oldProps.fileViewerOfflineSettings.hitAdornments;
        const newHighlights: DecorationAdornment[] = newProps.fileViewerOfflineSettings.hitAdornments;

        // Return true if one of oldHighlight or newHighlight is null but not the other.
        if ((oldHighlights && !newHighlights) || (newHighlights && !oldHighlights)) {
            return true;
        }
        else if (oldHighlights && newHighlights) {
            // If none of the highlight is null.
             if (oldHighlights.length != newHighlights.length) {
                return true;
            }
            return oldHighlights.some((adornment, index) => {
                return adornment.startLine !== newHighlights[index].startLine ||
                    adornment.endLine !== newHighlights[index].endLine ||
                    adornment.startColumn != newHighlights[index].startColumn ||
                    adornment.endColumn !== newHighlights[index].endColumn ||
                    adornment.className !== newHighlights[index].className ||
                    adornment.scrollToAdornment !== newHighlights[index].scrollToAdornment;
            });
        }
    }
    return false;
}

/**
 * Compares both the prop for change in offline file content
 * returns false if both are same else returns true
 * @param oldProps
 * @param newProps
 */
function haveOfflineContentChanged(oldProps: EditableFileViewerProps, newProps: EditableFileViewerProps): boolean {

    if (oldProps.fileViewerOfflineSettings && newProps.fileViewerOfflineSettings) {
        if ((oldProps.fileViewerOfflineSettings.offlineFileContent && !newProps.fileViewerOfflineSettings.offlineFileContent) ||
            (newProps.fileViewerOfflineSettings.offlineFileContent && !oldProps.fileViewerOfflineSettings.offlineFileContent)) {
            // Return true if one of old or new offlineFileContent is null
            return true;
        }
        else if (oldProps.fileViewerOfflineSettings.offlineFileContent && newProps.fileViewerOfflineSettings.offlineFileContent) {
            // If none of the offlineFileContent is null.
            return oldProps.fileViewerOfflineSettings.offlineFileContent.content !== newProps.fileViewerOfflineSettings.offlineFileContent.content;
        }
    }
    return false;
}
