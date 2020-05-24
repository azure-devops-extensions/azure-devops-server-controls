import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { MessageBarComponent } from "DistributedTaskControls/Components/MessageBarComponent";

import { ProgressHubViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ProgressHubViewStore";
import { ReleaseActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseActionCreator";
import { ReleaseUrlUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Utilities/ReleaseUrlUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { MessageBarType } from "OfficeFabric/MessageBar";

import * as Utils_HTML from "VSS/Utils/Html";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/ContainerTabWithMessage";
import { IStateless } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/Charts/DeploymentTimeTrendChart";

export interface IContainerTabWithMessageProps extends Base.IProps {
    isEditMode: boolean;
    infoMessage?: string;
    errorMessage?: string;
    errorStatusCode?: number;
    onDismiss?(): void;
}

export class ContainerTabWithMessage extends Base.Component<IContainerTabWithMessageProps, IStateless> {
    constructor(props) {
        super(props);
        let progressHubViewStore = StoreManager.GetStore<ProgressHubViewStore>(ProgressHubViewStore);
        let definitionId: number = progressHubViewStore.getReleaseDefinitionId();
        this._definitionUrl = ReleaseUrlUtils.getReleaseDefinitionUrl(definitionId);
    }

    public render(): JSX.Element {
        return (
            <div className="cd-release-progress-edit-warning-tab-container">
                {this._getEditReleaseWarningMessage()}
                {this._getEditReleaseInfoBarMessage()}
                {this._getErrorMessage()}
                {this.props.children}
            </div>
        );
    }
    
    //Returns the Edit Release Warning Message Bar Component
    private _getEditReleaseWarningMessage (): JSX.Element {
        /* tslint:disable:react-no-dangerous-html */
        return (
            this.props.isEditMode && !this.props.errorMessage &&
            <MessageBarComponent
                messageBarType={MessageBarType.warning}>
                <div className="message-container"
                    dangerouslySetInnerHTML={this._renderHtml(Utils_HTML.HtmlNormalizer.normalize(Utils_String.format(Resources.EditReleaseWarning, this._definitionUrl, "message-edit-link")))}>
                </div>
            </MessageBarComponent>
        );       
        /* tslint:enable:react-no-dangerous-html */
    }

    //Returns the Edit Release Info Message Bar Component
    private _getEditReleaseInfoBarMessage(): JSX.Element  {
        /* tslint:disable:react-no-dangerous-html */
        return (
            this.props.infoMessage && !this.props.errorMessage && !this.props.isEditMode &&
            <MessageBarComponent
                messageBarType={MessageBarType.info}
                onDismiss={this.props.onDismiss}>
                <div className="message-container"
                    dangerouslySetInnerHTML={this._renderHtml(this.props.infoMessage)}>
                </div>
            </MessageBarComponent>
        );
        /* tslint:disable:react-no-dangerous-html */
    }

    //Returns the Error Message Bar Component
    private _getErrorMessage(): JSX.Element {
        return (
            this.props.errorMessage &&
            <MessageBarComponent
                messageBarType={MessageBarType.error}
                errorStatusCode={this.props.errorStatusCode}
                onDismiss={this._onDismissErrorMessage}>
                {this.props.errorMessage}
            </MessageBarComponent>
        );
    }

    private _onDismissErrorMessage = (): void => {
        let releaseActionCreator = ActionCreatorManager.GetActionCreator<ReleaseActionCreator>(ReleaseActionCreator);
        releaseActionCreator.updateErrorMessage(null);
    }

    private _renderHtml(html: string) {
        return {
            __html: html
        };
    }

    private _definitionUrl: string;
}
