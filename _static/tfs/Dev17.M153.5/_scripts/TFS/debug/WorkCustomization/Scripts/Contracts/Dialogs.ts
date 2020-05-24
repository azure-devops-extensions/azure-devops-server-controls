import * as React from "react";
import { Props, State } from "VSS/Flux/Component";

export interface ICommonDialogProps extends Props {
    onCancel?: () => void;
    onDismiss?: () => void;
    isInputDisabled?: boolean;
    upfrontErrorMessage?: string;
}
