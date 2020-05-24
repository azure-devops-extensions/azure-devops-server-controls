/// <reference types="react" />

import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { MessageBarComponentUtils } from "DistributedTaskControls/Utilities/MessageBarComponentUtils";

import { IMessageBarProps, MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

export interface IMessageBarComponentProps extends IMessageBarProps {
    errorStatusCode?: number;
}

export class MessageBarComponent extends Base.Component<IMessageBarComponentProps, Base.IStateless> {

    public render() {
        let closeButtonArialLabel = (this.props.dismissButtonAriaLabel ? this.props.dismissButtonAriaLabel : this._getCloseButtonAriaLabel(this.props.messageBarType));

        return (
            <MessageBar
                {...this.props}
                dismissButtonAriaLabel={closeButtonArialLabel}>
                {MessageBarComponentUtils.getErrorMessage(this.props.errorStatusCode) || this.props.children}
            </MessageBar>);
    }

    private _getCloseButtonAriaLabel(messageBarType: MessageBarType): string {
        if (messageBarType === MessageBarType.error) {
            return Resources.ARIALabelDismissErrorMessage;
        }
        else if (messageBarType === MessageBarType.warning || messageBarType === MessageBarType.severeWarning) {
            return Resources.ARIALabelDismissWarningMessage;
        }
        else {
            return Resources.CloseMessageBarButtonText;
        }
    }
}
