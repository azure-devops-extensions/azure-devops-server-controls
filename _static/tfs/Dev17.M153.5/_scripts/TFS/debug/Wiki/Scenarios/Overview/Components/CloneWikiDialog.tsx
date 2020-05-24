import { Callout, DirectionalHint } from "OfficeFabric/Callout";
import { autobind } from "OfficeFabric/Utilities";

import * as React from "react";

import { GettingStartedView } from "VersionControl/Scenarios/NewGettingStarted/GettingStartedView";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";

import "VSS/LoaderPlugins/Css!Site";
import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Overview/Components/CloneWikiDialog";

export interface CloneWikiDialogProps {
    repositoryContext: GitRepositoryContext;
    sshEnabled: boolean;
    sshUrl: string;
    cloneUrl: string;
    headingLevel: number;
    onDismiss(): void;
    isOpen: boolean;
    publishCopyCloneUrlClicked(): void;
    targetElement?: HTMLElement;
}

export class CloneWikiDialog extends React.Component<CloneWikiDialogProps, {}> {
    private _cloneWikiContainer: HTMLElement;
    private _copyButton: JQuery;

    public render(): JSX.Element {
        return (
            <Callout
                className="clone-wiki-dialog container"
                onDismiss={this.props.onDismiss}
                target={this.props.targetElement}
                coverTarget={false}
                isBeakVisible={false}
                gapSpace={0}
                directionalHint={DirectionalHint.bottomRightEdge}>
                <div
                    className="clone-wiki-dialog-content"
                    ref={this._saveDialogRef}>
                    <GettingStartedView
                        tfsContext={this.props.repositoryContext.getTfsContext()}
                        repositoryContext={this.props.repositoryContext}
                        isCloneExperience={true}
                        showOnlyCommandLine={true}
                        sshEnabled={this.props.sshEnabled}
                        sshUrl={this.props.sshUrl}
                        cloneUrl={this.props.cloneUrl}
                        branchName={this.props.repositoryContext.getRepository().defaultBranch}
                        heading={WikiResources.CloneWikiDialog_Title}
                        headingLevel={this.props.headingLevel}
                    />
                </div>
            </Callout>
        );
    }

    @autobind
    private _saveDialogRef(ref: HTMLElement): void {
        this._cloneWikiContainer = ref;
        if (this._cloneWikiContainer) {
            // Setting max-height to avoid trimming at higher zoom levels.
            const maxHeight = Math.max(window.innerHeight - 150, 0);
            this._cloneWikiContainer.setAttribute("style", "max-height: " + maxHeight + "px");

            this._copyButton = $(this._cloneWikiContainer).find("#clone-section-in-popup .pivoted-textbox-with-copy-container button.copy-button");
            if (this._copyButton.length > 0) {
                this._copyButton[0].focus();
                this._copyButton.on("click", this.props.publishCopyCloneUrlClicked);
            }
        }
    }

    public componentWillUnmount(): void {
        if (this._cloneWikiContainer) {
            if (this._copyButton) {
                this._copyButton.off("click", this.props.publishCopyCloneUrlClicked);
            }

            this._cloneWikiContainer.innerHTML = "";
        }
    }
}
