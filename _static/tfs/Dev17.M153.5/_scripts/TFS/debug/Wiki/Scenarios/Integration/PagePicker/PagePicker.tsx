import * as React from "react";
import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Dialog, DialogFooter, DialogType } from "OfficeFabric/Dialog";
import { Label } from "OfficeFabric/Label";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Spinner } from "OfficeFabric/Spinner";
import { Async, autobind } from "OfficeFabric/Utilities";
import { GitVersionDescriptor } from "TFS/VersionControl/Contracts";
import { WikiV2, WikiPage } from "TFS/Wiki/Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import { ActionCreator } from "Wiki/Scenarios/Integration/PagePicker/ActionCreator";
import { ActionsHub } from "Wiki/Scenarios/Integration/PagePicker/ActionsHub";
import { StoresHub } from "Wiki/Scenarios/Integration/PagePicker/StoresHub";
import { FilterableWikiTreeProps, FilterableWikiTree } from "Wiki/Scenarios/Integration/Tree/FilterableWikiTree";
import { WikiPagesSource } from "Wiki/Scenarios/Shared/Sources/WikiPagesSource";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Integration/PagePicker/PagePicker";

export interface PagePickerProps {
    title: string;
    isOpen: boolean;
    ctaText: string;
    wiki: WikiV2;
    onCTA(selectedPage: WikiPage): IPromise<Boolean>;
    onCancel(): void;
    getPageIsDisabled?(page: WikiPage): boolean;
    getPagePathIsSelectable?(pagePath: string): boolean;
    text?: string;
}

export interface PagePickerState {
    error: Error;
    isLoading: boolean;
    selectedPagePath: string;
    isCTADisabled: boolean;
    isStatusLoading: boolean;
    statusError: Error;
}

/**
 * Wiki pages picker for Project Wikis. Currently does not support Code Wikis.
 */
export class PagePicker extends React.Component<PagePickerProps, PagePickerState> {
    private _actionCreator: ActionCreator;
    private _actionsHub: ActionsHub;
    private _storesHub: StoresHub;
    private _wikiPagesSource: WikiPagesSource;
    private _async: Async;
    private _selectedWikiVersion: GitVersionDescriptor;

    constructor(props: PagePickerProps) {
        super(props);

        // Currently page picker is used only for Project Wikis, which has only one version.
        this._selectedWikiVersion = this.props.wiki.versions[0];
        this._actionsHub = new ActionsHub();
        this._storesHub = new StoresHub(this._actionsHub);
        this._wikiPagesSource = new WikiPagesSource(this.props.wiki, this._selectedWikiVersion);
        this._actionCreator = new ActionCreator(
            this._actionsHub,
            {
                wikiPagesSource: this._wikiPagesSource,
            },
            this._storesHub.getState
        );

        this.state = {
            error: null,
            isLoading: true,
            selectedPagePath: null,
            isCTADisabled: true,
            isStatusLoading: false,
            statusError: null,
        };
    }

    public componentWillMount(): void {
        this._actionCreator.getAllPages().then(
            () => {
                this.setState({
                isLoading: false,
                });
            }, (error: Error) => {
                this.setState({
                isLoading: false,
                error: error,
                });
        });
    }

    public componentWillUnmount(): void {
        if (this._async) {
            this._async.dispose();
        }
    }

    public render(): JSX.Element {
        return <Dialog
            hidden={!this.props.isOpen}
            modalProps={{
                className: "page-picker-dialog",
                containerClassName: "container",
                isBlocking: true,
            }}
            dialogContentProps={{
                type: DialogType.close,
                showCloseButton: true,
                closeButtonAriaLabel: WikiResources.DialogCloseButtonAriaLabel,
            }}
            title={this.props.title}
            onDismiss={this.props.onCancel}>
            {this.props.text &&
                <Label className="text-content">{this.props.text}</Label>
            }
            {this._getContent()}
            {this._getStatusArea()}
            {this._getFooter()}
        </Dialog>;        
    }

    @autobind
    private _onCTA(): void {
        this.setState({
            isCTADisabled: true,
        });

        this._async = new Async();
        this._async.setTimeout(
            () => this.setState({
                isStatusLoading: true,
                statusError: null,
            }),
            500,
        );

        const page: WikiPage = this._storesHub.wikiPagesStore.state.wikiPages[this.state.selectedPagePath];
        this.props.onCTA(page).then(
            (value: boolean) => {
                this.setState({
                    isStatusLoading: false,
                    isCTADisabled: false,
                });
                this.props.onCancel();
                this._async.dispose();
            }, (error: Error) => {
                this.setState({
                    isStatusLoading: false,
                    isCTADisabled: false,
                    statusError: error,
                });
                this._async.dispose();
            });
    }

    @autobind
    private _onPageSelected(pagePath: string): void {
        if (!this.props.getPagePathIsSelectable || this.props.getPagePathIsSelectable(pagePath)) {
            this.setState({
                selectedPagePath: pagePath,
                isCTADisabled: false,
            });
        }
    }

    private _getContent(): JSX.Element {
        if (this.state.isLoading) {
            return this._getLoadingStateContent();
        } else if (this.state.error) {
            return this._getErrorStateContent(this.state.error);
        } else {
            return this._getTreeContent();
        }
    }

    private _getLoadingStateContent(): JSX.Element {
        return <Spinner
            ariaLabel={WikiResources.FilteringInProgressAriaLabel}
            key={"PagePickerSpinner"}
            className={"wiki-spinner"}
            />;
    }

    private _getErrorStateContent(error: Error): JSX.Element {
        return <MessageBar
            className={"error-message-bar"}
            messageBarType={MessageBarType.error}>
            {error.message}
        </MessageBar>;
    }

    private _getTreeContent(): JSX.Element {
        const filterableWikiTreeProps: FilterableWikiTreeProps = {
            pagesStore: this._storesHub.wikiPagesStore,
            treeStore: this._storesHub.treeStore,
            selectedFullPath: this.state.selectedPagePath,
            onPageSelected: this._onPageSelected,
            onPageExpand: this._actionCreator.expandParentPage,
            onPageCollapse: this._actionCreator.collapseParentPage,
            getPagesToFilter: this._actionCreator.getPagesToFilter,
            onFilterCleared: this._actionCreator.onFilterCleared,
            getPageIsDisabled: this.props.getPageIsDisabled,
            onFilteredPageSelected: this._onPageSelected,
            setFilterFocusOnMount: true,
            treeRootDisplayName: WikiResources.Root,
        };

        return <FilterableWikiTree {...filterableWikiTreeProps} />;
    }

    private _getStatusArea(): JSX.Element {
        return <div className={"status-area"}>
            {this.state.isStatusLoading && this._getLoadingStateContent() }
            {this.state.statusError && this._getErrorStateContent(this.state.statusError) }
        </div>;
    }

    private _getFooter(): JSX.Element {
        return <DialogFooter>
            <PrimaryButton
                onClick={this._onCTA}
                disabled={this.state.isCTADisabled}>
                {this.props.ctaText}
            </PrimaryButton>
            <DefaultButton
                onClick={this.props.onCancel}>
                {WikiResources.CancelButtonText}
            </DefaultButton>
        </DialogFooter>;
    }
}
