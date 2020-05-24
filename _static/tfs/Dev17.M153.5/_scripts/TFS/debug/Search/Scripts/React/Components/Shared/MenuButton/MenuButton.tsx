/// Copyright (c) Microsoft Corporation. All rights reserved.
/// <reference types="react" />
/// <reference types="react-dom" />

"use strict";

import * as React from "react";
import * as ReactDOM from "react-dom";

import { autobind, css } from 'OfficeFabric/Utilities';
import { IMenuButtonProps } from "Search/Scripts/React/Components/Shared/MenuButton/MenuButton.Props";

import "VSS/LoaderPlugins/Css!Search/React/Components/MenuButton";

export class MenuButton extends React.Component<IMenuButtonProps, any> {
    public render() {
        return (
            <div className={css("dropdown-menu-button", this.props.cssClass, {
                "is-disabled": !this.props.enabled
            })}
                {...this.getAriaAttributes() }
                {...this.getEventHandlers() }>
                <span
                    id={this.props.menuButtonId}
                    className={css("search-Filter-DisplayLabel")}
                    {...this.props.HTMLInputProps}>
                    <span
                        className={
                            css("search-Filter-Label", {
                                "is-disabled": !this.props.enabled
                            })}> {this.props.displayName + ": "}</span>
                    <span>{this.props.displayLabel}</span>
                </span>
                {
                    // render "help" icon
                    this.props.showHelp &&
                    this.props.calloutAnchor &&
                    <span
                        id={this.props.calloutAnchor}
                        className={css("disabled-Info-icon", "bowtie-status-help-outline", {
                            "is-disabled": !this.props.enabled
                        })} />
                }
                <span className={
                    css("bowtie-icon drop-button", {
                        "is-disabled": !this.props.enabled
                    })} />
            </div>
        );
    }

    private getAriaAttributes(): any {
        let attributes = {
            "role": this.props.role,
            "tabIndex": 0,
            "aria-disabled": !this.props.enabled,
            "aria-haspopup": this.props.hasDropdown,
            "aria-labelledby": this.props.menuButtonId,
        };

        if (this.props.ariaAutoComplete) {
            attributes["aria-autocomplete"] = this.props.ariaAutoComplete;
        }

        if (this.props.dropdownOpen) {
            attributes["aria-owns"] = this.props.dropdownId;
            attributes["aria-controls"] = this.props.dropdownId;
            attributes["aria-expanded"] = this.props.dropdownOpen;
        }

        if (this.props.showHelp) {
            attributes["aria-describedby"] = this.props.ariaDescribedby;
        }

        return attributes;
    }

    private getEventHandlers(): any {
        let attributes = {};
        // Bind to onClick, and OnkeyDown events only when the filter is enabled.
        if (this.props.showHelp) {
            attributes["onFocus"] = () => this.triggerCallout(true);
            attributes["onBlur"] = () => this.triggerCallout(false);
            attributes["onMouseOver"] = () => this.triggerCallout(true);
            attributes["onMouseLeave"] = () => this.triggerCallout(false);
        }
        else {
            attributes["onClick"] = this.props.onDropdownButtonClick;
            attributes["onKeyDown"] = this.props.onKeyDown;
        }

        return attributes;
    }

    @autobind
    private triggerCallout(showCallout: boolean): void {
        if (this.props.triggerCallout) {
            this.props.triggerCallout(showCallout);
        }
    }
}