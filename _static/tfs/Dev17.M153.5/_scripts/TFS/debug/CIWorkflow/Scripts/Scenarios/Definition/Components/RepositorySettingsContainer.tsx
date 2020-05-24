/// <reference types="react" />

import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { SourceProviderUtils } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { FocusableContainer } from "DistributedTaskControls/Components/FocusableContainer";

import { DefaultButton } from "OfficeFabric/components/Button/DefaultButton/DefaultButton";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { css } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";

export interface IRepositorySettingsContainerProps extends Base.IProps {
    isExpanded: boolean;
    repositoryName: string;
    repositoryType: string;
    repositorySubheading: string;
    isFocused: boolean;
    remoteWebhooksAreSupported: boolean;
    remoteWebhooksAreValid: boolean;
    restoringRemoteWebhooks: boolean;
    restoreRemoteWebhooksErrorMessage: string;
    onIsExpandedChange: () => void;
    onRestoreRemoteWebhooks: () => void;
}

export class RepositorySettingsContainer extends Base.Component<IRepositorySettingsContainerProps, Base.IStateless> {
    public render(): JSX.Element {
        let repositoryName: string = this.props.repositoryName ? this.props.repositoryName : Resources.DefaultRepositoryLabel;
        return (
            <div className="repositories">

                <div className="repositories-header">
                    <div className="repo-text">
                        {Resources.RepositoriesText}
                    </div>
                </div>

                <div className="repositories-content">
                    {
                        this.props.remoteWebhooksAreSupported && !this.props.remoteWebhooksAreValid && (
                            <div>
                                <MessageBar
                                    actions={
                                        <div className="actions-container bowtie">
                                            <DefaultButton
                                                className="btn-cta"
                                                ariaDescription={Resources.RestoreTriggerWebhookButtonDescription}
                                                disabled={this.props.restoringRemoteWebhooks}
                                                onClick={this.props.onRestoreRemoteWebhooks}>
                                                <span className="restore-webhook-button">
                                                    {this.props.restoringRemoteWebhooks &&
                                                        <span className="bowtie-icon bowtie-spinner" />
                                                    }
                                                    {this.props.restoringRemoteWebhooks ? Resources.RestoreTriggerWebhookButtonBusyText : Resources.RestoreTriggerWebhookButtonText}
                                                </span>
                                            </DefaultButton>
                                        </div>
                                    }
                                    messageBarType={ this.props.restoreRemoteWebhooksErrorMessage ? MessageBarType.error : MessageBarType.warning }
                                    isMultiline={ false }>
                                    { this._getRestoreWebhookMessage() }
                                </MessageBar>
                            </div>
                        )
                    }

                    <div className="repo-content-header">
                        <div className={css(
                            "image-icon bowtie-icon",
                            this._getIconClass(),
                            (this.props.isExpanded ? "image-icon-enabled" : "image-icon-disabled"))}>
                        </div>

                        <div className="repo-content">
                            <FocusableContainer cssClass="repo-header"
                                onFocus={this.props.onIsExpandedChange}
                                isFocused={this.props.isFocused}
                                expanded={this.props.isExpanded}
                                ariaLabel={Resources.Repository}>
                                <div className="repo-name">
                                    {repositoryName}
                                </div>

                                <div className={"bowtie-icon repo-drop-icon-bowtie " + (this.props.isExpanded ? "bowtie-chevron-up" : "bowtie-chevron-down")}>
                                </div>

                                <div className="repo-subhead">
                                    {this.props.repositorySubheading}
                                </div>
                            </FocusableContainer>

                            {this.props.isExpanded && this.props.children}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    private _getIconClass(): string {
        return SourceProviderUtils.getIconClass(this.props.repositoryType);
    }

    private _getRestoreWebhookMessage(): string {
        if (!this.props.restoreRemoteWebhooksErrorMessage) {
            return Resources.RepositoryWebhookMissingDescription;
        }

        return Resources.RestoreTriggerWebhookErrorTextPrefix + this.props.restoreRemoteWebhooksErrorMessage;
    }
}