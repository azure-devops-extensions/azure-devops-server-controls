/// <reference types="react-dom" />

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Diag from "VSS/Diag";

import { MessageAreaType } from "VSS/Controls/Notifications";

import PresentationResource = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");

import { IMessage } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Interfaces";

export interface IMessageProps {
    message: IMessage;
}

export class MessageComponent extends React.Component<IMessageProps, {}> {
    public render(): JSX.Element {        
        if (!this.props.message || !this.props.message.text) {
            // Do not render anything in that case
            return null;
        }

        let text: string = "";
        if (!(typeof this.props.message.text === "string")) {
            Diag.Debug.fail("Message.text is not string.");
            return null;
        }

        return <div className="la-message">
            <span className={ "la-message-icon icon bowtie-icon " + this._getIconClass() }></span>
            <div className="la-message-text">{ this.props.message.text }</div>
        </div>;
    }

    private _getIconClass() {
        switch (this.props.message.type) {
            case MessageAreaType.Error:
                return "bowtie-status-error";
            
            case MessageAreaType.Warning:
                return "bowtie-status-warning";

            case MessageAreaType.Info:
            default:
                return "bowtie-status-info";
        }
    }
}
