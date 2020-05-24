/// <reference types="react" />

import * as React from "react";

import { triggerEnterOrSpaceKeyHandler } from "Build/Scripts/ReactHandlers";
import * as RichContentTooltip from "VSSPreview/Flux/Components/RichContentTooltip";
import "VSS/LoaderPlugins/Css!Build/IconButton";

export interface IconButtonProps extends React.HTMLAttributes<HTMLElement> {
    className: string;
    label: string;
    onClick?: React.EventHandler<React.SyntheticEvent<HTMLElement>>;
    toggleState?: boolean;
    disabled?: boolean;
}

export class IconButton extends React.Component<IconButtonProps, {}> {
    public render(): JSX.Element {
        let ariaPressedProp = {};
        // https://facebook.github.io/react/warnings/unknown-prop.html
        const { toggleState, className, ...rest } = this.props;
        if (toggleState) {
            ariaPressedProp["aria-pressed"] = this.props.toggleState;
        }

        return <div
            className={"build-common-icon-button " + className}
            role="button"
            tabIndex={0}
            aria-label={this.props.label}
            { ...ariaPressedProp }
            {...this.props.onClick ? { onKeyDown: this._onKeyDown } : {}}
            onClick={this.props.onClick}
            {...rest}>
            <RichContentTooltip.Component>
                {this.props.label}
            </RichContentTooltip.Component>
        </div>;
    }

    private _onKeyDown = (e) => {
        triggerEnterOrSpaceKeyHandler(e, this.props.onClick);
    }
}
