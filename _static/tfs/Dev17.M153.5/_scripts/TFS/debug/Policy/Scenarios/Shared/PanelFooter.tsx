import * as React from "react";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { autobind, css } from "OfficeFabric/Utilities";
import * as Resources from "Policy/Scripts/Resources/TFS.Resources.Policy";

import "VSS/LoaderPlugins/Css!Policy/Scenarios/Shared/PanelFooter";

export interface PanelFooterProps {
    readonlyMode: boolean;
    canSave: boolean;
    onSaveClicked();
    onCancelClicked();
}

export class PanelFooter extends React.Component<PanelFooterProps, {}> {
    public render(): JSX.Element {
        return <div className="panel-footer">
        {
            this.props.readonlyMode ||
            <PrimaryButton
                key="save"
                className="panel-footer-button"
                disabled={!this.props.canSave}
                onClick={this._onSaveClicked}>
                {Resources.Save}
            </PrimaryButton>
        }

        {
            this.props.readonlyMode ?
                <PrimaryButton key="close" className="panel-footer-button" onClick={this._onCancelClicked}>
                    {Resources.Close}
                </PrimaryButton>
                : <DefaultButton key="cancel" className="panel-footer-button" onClick={this._onCancelClicked}>
                    {Resources.Cancel}
                </DefaultButton>
        }
    </div>;
    }

    @autobind
    private _onSaveClicked(ev: React.MouseEvent<HTMLButtonElement>) {
        if (this.props.onSaveClicked) {
            this.props.onSaveClicked();
        }
    }

    @autobind
    private _onCancelClicked(ev: React.MouseEvent<HTMLButtonElement>) {
        if (this.props.onCancelClicked) {
            this.props.onCancelClicked();
        }
    }
}
