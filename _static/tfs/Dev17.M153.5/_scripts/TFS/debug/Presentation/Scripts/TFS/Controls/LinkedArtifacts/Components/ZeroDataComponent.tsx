/// <reference types="react-dom" />

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import PresentationResource = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import { IZeroDataAction } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";

export interface IZeroDataComponentProps {
    message?: string;
    action?: IZeroDataAction
}

export class ZeroDataComponent extends React.Component<IZeroDataComponentProps, {}> {
    public render(): JSX.Element {
        let message = this.props.message || PresentationResource.LinkedArtifacts_ZeroData;
        let zeroDataAction: JSX.Element;

        if (this.props.action) {
            zeroDataAction = <div className="la-zero-data-action">
                <button className="la-action-button" onClick={this._onClickAction.bind(this)} >{this.props.action.actionMessage}</button>
            </div>;
        }

        return <div className="la-zero-data-container">
            <div className="la-zero-data">{ message }</div>
            { zeroDataAction }
        </div>;
    }

    private _onClickAction(e: React.MouseEvent<HTMLElement>): boolean {
        if (this.props.action && this.props.action.actionCallback) {
            if (this.props.action.actionCallback()) {
                return true;
            }
            else {
                e.preventDefault();
                return false;
            }
        }
        return true;
    }
}
