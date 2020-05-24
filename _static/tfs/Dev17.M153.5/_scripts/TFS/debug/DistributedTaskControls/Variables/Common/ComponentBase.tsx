/// <reference types="react" />

import * as React from "react";

import { ItemOverviewState } from "DistributedTaskControls/Common/Item";

export interface IVariablesOverviewState extends ItemOverviewState {
    isValid: boolean;
}
