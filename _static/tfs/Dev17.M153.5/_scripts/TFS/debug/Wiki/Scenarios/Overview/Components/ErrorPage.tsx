import * as React from "react";
import { Debug } from "VSS/Diag";
import * as Locations from "VSS/Locations";
import { announce } from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";

import { CommandButton, PrimaryButton } from "OfficeFabric/Button";
import { Fabric } from "OfficeFabric/Fabric";
import { ViewActionCreator } from "Wiki/Scenarios/Overview/ViewActionCreator";
import { ErrorProps } from "Wiki/Scenarios/Shared/SharedActionsHub";
import { RepoConstants, WikiErrorConstants } from "Wiki/Scripts/CommonConstants";
import { WikiErrorNames } from "Wiki/Scripts/ErrorHelper";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Overview/Components/ErrorPage";

export interface IErrorPageProps {
    error: Error;
    errorProps: ErrorProps;
    onMount?(pagePath: string): void;
}

export class ErrorPage extends React.Component<IErrorPageProps, {}> {
    private pageNotFoundErrorPage(): JSX.Element {
        const errorIconPath: string = this.props.errorProps.errorIconPath
            ? this.props.errorProps.errorIconPath
            : "Wiki/page-not-found.svg";

        return (
            <Fabric className="wiki-page-not-found">
                <div>
                    <img src={Locations.urlHelper.getVersionedContentUrl(errorIconPath)} alt="" />
                </div>
                <div className="primary-message">
                    <span>
                        {this.props.errorProps.errorMessage}
                    </span>
                </div>
                {
                    this.props.errorProps.actionButtonText
                    && this.props.errorProps.actionCallbackHandler
                    && <PrimaryButton
                        className={"wiki-errorpage-button"}
                        disabled={this.props.errorProps.disableActionButton}
                        onClick={() => {
                            this.props.errorProps.actionCallbackHandler(this.props.errorProps);
                        }}>
                        {this.props.errorProps.actionButtonText}
                    </PrimaryButton>
                }
                {
                    this.props.errorProps.secondaryErrorMessage &&
                    <div className="secondary-message">
                        <span>
                            {this.props.errorProps.secondaryErrorMessage}
                        </span>
                    </div>
                }
            </Fabric>);
    }

    public componentDidMount(): void {
        this.props.onMount &&
            this.props.onMount(this.props.errorProps.actionCallbackData);
        announce(this.props.errorProps.errorMessage, false);
    }

    public render(): JSX.Element {
        return (this._getErrorPageContent(this.props.error));
    }

    private _getErrorPageContent = (error: Error): JSX.Element => {
        switch (error.name) {
            case WikiErrorNames.gitItemNotFoundException:
            case WikiErrorNames.wikiPageNotFoundException:
            case WikiErrorNames.parentPageContentUnavailableException:
            case WikiErrorNames.noValidPagesToLand:
            case WikiErrorNames.zeroPagesInWiki:
                return this.pageNotFoundErrorPage();
            default:
                return null;
        }
    }
}

export function showImageForError(error: Error | JSX.Element): boolean {
    if (error instanceof Error) {
        error = error as Error;
        switch (error.name) {
            case WikiErrorNames.gitItemNotFoundException:
            case WikiErrorNames.wikiPageNotFoundException:
            case WikiErrorNames.parentPageContentUnavailableException:
            case WikiErrorNames.noValidPagesToLand:
            case WikiErrorNames.zeroPagesInWiki:
                return true;
            default:
                return false;
        }
    }

    return false;
}