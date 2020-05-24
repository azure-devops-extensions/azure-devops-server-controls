import * as React from "react";

import { Label } from "OfficeFabric/Label";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { autobind } from "OfficeFabric/Utilities";
import { StateMergeOptions } from "VSS/Navigation/NavigationHistoryService";
import * as Utils_String from "VSS/Utils/String";

import { WikiV2 } from "TFS/Wiki/Contracts";
import { GitRepositorySource } from "Wiki/Scenarios/Publish/GitRepositorySource";
import { PublishActionCreator } from "Wiki/Scenarios/Publish/PublishActionCreator";
import { UnpublishDataStore, UnpublishData } from "Wiki/Scenarios/Publish/UnpublishDataStore";
import { PublishWikiSource } from "Wiki/Scenarios/Publish/PublishWikiSource";
import { PublishActionsHub } from "Wiki/Scenarios/Publish/PublishActionsHub";
import { ConfirmationDialog } from "Wiki/Scenarios/Shared/Components/ConfirmationDialog";
import { SharedActionsHub } from "Wiki/Scenarios/Shared/SharedActionsHub";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import { getWikiUrl, redirectToUrl } from "Wiki/Scripts/WikiUrls";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Publish/Components/UnpublishWikiDialog";

export interface UnpublishWikiDialogProps {
    wiki: WikiV2;
    repositoryName: string;
    onUnpublished(): void;
    onDismiss(): void;
    sharedActionsHub: SharedActionsHub;
}

export class UnpublishWikiDialog extends React.Component<UnpublishWikiDialogProps, UnpublishData> {
    private _gitRepoSource: GitRepositorySource;
    private _publishSource: PublishWikiSource;
    private _actionCreator: PublishActionCreator;
    private _actionsHub: PublishActionsHub;
    private _store: UnpublishDataStore;
    private _onWikiUnpublishedTimeoutHandler: number = null;

    constructor(props: UnpublishWikiDialogProps) {
        super(props);

        this._publishSource = new PublishWikiSource();
        this._gitRepoSource = new GitRepositorySource();
        this._actionsHub = new PublishActionsHub();
        this._actionCreator = new PublishActionCreator(
            this.props.sharedActionsHub,
            this._actionsHub,
            {
                publishSource: this._publishSource,
                gitRepositorySource: this._gitRepoSource,
            });
        this._store = new UnpublishDataStore(this._actionsHub);

        this.state = {
            unpublishOperation: {
                isInProgress: false,
                isComplete: false,
                error: null,
            }
        };
    }

    public render(): JSX.Element {
        return (
            <ConfirmationDialog
                isOpen={true}
                title={WikiResources.UnpublishWikiDialogTitle}
                confirmButtonText={WikiResources.UnpublishWikiDialogConfirmButtonText}
                onConfirm={this._onUnpublish}
                cancelButtonText={WikiResources.CancelButtonText}
                onCancel={this.props.onDismiss}
                onDismiss={this.props.onDismiss}
                isWaiting={this.state.unpublishOperation.isInProgress}
                waitSpinnerLabel={WikiResources.UnpublishWikiDialogSpinnerText}
                onRenderContent={this._renderDialogContent}
            />
        );
    }

    public componentWillMount(): void {
        this._store.addChangedListener(this._onUnpublishDataStoreChanged);
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onUnpublishDataStoreChanged);

        if (this._onWikiUnpublishedTimeoutHandler) {
            clearTimeout(this._onWikiUnpublishedTimeoutHandler);
            this._onWikiUnpublishedTimeoutHandler = null;
        }

        this._store.dispose();
        this._actionCreator = null;
        this._actionsHub = null;
    }

    @autobind
    private _onUnpublishDataStoreChanged(): void {
        if (this._store.state.unpublishOperation.isComplete) {
            this._onWikiUnpublishedTimeoutHandler = setTimeout(this.props.onUnpublished, 0);
        } else {
            this.setState({ unpublishOperation: this._store.state.unpublishOperation });
        }
    }

    @autobind
    private _renderDialogContent(): JSX.Element {
        return (
            <div className="unpublish-wiki-dialog-content-container">
                {this.state.unpublishOperation.error &&
                    <MessageBar
                        className={"wiki-message-bar"}
                        messageBarType={MessageBarType.error}>
                        {this.state.unpublishOperation.error.message}
                    </MessageBar>
                }
                <Label>{WikiResources.UnpublishWikiDialogMessage}</Label>
                <FieldRow
                    name={WikiResources.NameLabel}
                    value={this.props.wiki.name}
                />
                <FieldRow
                    name={WikiResources.RepositoryLabel}
                    value={this.props.repositoryName}
                />
                <FieldRow
                    name={WikiResources.FolderLabel}
                    value={this.props.wiki.mappedPath}
                />
            </div>
        );
    }

    @autobind
    private _onUnpublish(): void {
        this._actionCreator.unpublishWiki(this.props.wiki.id);
    }
}

interface FieldRowProps {
    name: string;
    value: string;
}

const FieldRow = (props: FieldRowProps): JSX.Element =>
    <div className="field-row">
        <label className="field-name">{props.name}</label>
        <label className="field-value">{props.value}</label>
    </div>;