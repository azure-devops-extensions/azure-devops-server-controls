/// <reference types="react" />

import * as React from "react";

import { InputBase } from "DistributedTaskControls/SharedControls/InputControls/Components/InputComponentBase";
import {
    IInputControlPropsBase,
    IInputControlStateBase
} from "DistributedTaskControls/SharedControls/InputControls/Common";

/**
 * @brief Base class for "Text" based input components.
 */
export abstract class TextInputComponentBase<T extends IInputControlPropsBase<string>> extends InputBase<string, T, IInputControlStateBase<string>> {
}

