/// <reference types="react" />

import React = require("react");

export interface Props {
    iconClassName: string;
}

export const Icon = (props: Props): JSX.Element => {
    if (props.iconClassName) {
        return <div className={ props.iconClassName }></div>
    }
    else {
        return null;
    }
}
