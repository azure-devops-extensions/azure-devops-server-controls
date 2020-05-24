/// <reference types="react" />

import React = require("react");

import { KeyCode } from "VSS/Utils/UI";

export function triggerEnterKeyHandler(e: React.KeyboardEvent<HTMLElement>, handler: (e?: React.KeyboardEvent<HTMLElement>) => void) {
    if (handler && e.keyCode === KeyCode.ENTER) {
        handler(e);
        e.preventDefault();
        e.stopPropagation();
    }
};

export function triggerEnterOrSpaceKeyHandler(e: React.KeyboardEvent<HTMLElement>, handler: (e?: React.KeyboardEvent<HTMLElement>) => void) {
    if (handler && (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.SPACE)) {
        handler(e);
        e.preventDefault();
        e.stopPropagation();
    }
};