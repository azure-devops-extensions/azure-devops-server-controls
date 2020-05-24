/// copyright (c) microsoft corporation. all rights reserved.
/// <reference types="react" />
/// <reference types="react-dom" />

"use strict";

import * as React from "react";
import { FocusZone, FocusZoneDirection } from 'OfficeFabric/FocusZone';
import { autobind, css } from 'OfficeFabric/Utilities';
import { IStyle } from 'OfficeFabric/Styling';
import { Checkbox } from "OfficeFabric/Checkbox";
import { KeyCode } from "VSS/Utils/UI";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";

import "VSS/LoaderPlugins/Css!Search/React/Components/MultiSelectDropdownElement";

const CHECKBOX_LABEL_TEXT_OVERFLOW_RAW_STYLE: IStyle = {
    maxWidth: "calc(100% - 36px)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
};

export interface IMultiSelectDropdownElementProps {
    item: any;
    isDisabled: boolean,
    onChange: (item: any, isChecked: boolean) => void,
    onMount: () => void
}

export interface IMultiSelectDropdownElementState {
    checked: boolean
}

export class MultiSelectDropdownElement extends React.Component<IMultiSelectDropdownElementProps, IMultiSelectDropdownElementState> {
    private _elementContainer: HTMLElement;
    constructor(props: IMultiSelectDropdownElementProps) {
        super(props);
        this.state = { checked: props.item.selected };
    }

    public render(): JSX.Element {
        let selected = this.props.item.selected;
        return (
            // Needs wrapping in focus zone to avoid bringing the inner elements into focus on arrow key actions
            <div role="checkbox"
                ref={(container) => this._elementContainer = container}
                className={css("dropdown-element")}
                data-is-focusable={true}
                onKeyDown={this._onKeyDown}>
                <FocusZone
                    className={css("element-FocusZone")}
                    direction={FocusZoneDirection.horizontal}>
                    <Checkbox
                        styles={
                            {
                                text: CHECKBOX_LABEL_TEXT_OVERFLOW_RAW_STYLE
                            }
                        }
                        className="filter-checkbox"
                        label={this.props.item.name}
                        disabled={this.props.isDisabled}
                        checked={this.state.checked}
                        onChange={this._onCheckboxChange} />

                    {
                        this.props.item.resultCount > 0 &&
                        <div className="facet" onClick={this._onFacetClick}>
                            {this.props.item.resultCount}
                        </div>
                    }
                </FocusZone>
            </div>
        );
    };

    public componentDidMount(): void {
        if (this.props.onMount) {
            this.props.onMount();
        }
    }

    public componentWillReceiveProps(newProps: IMultiSelectDropdownElementProps): void {
        this.setState({ checked: newProps.item.selected });
    }

    @autobind
    private _onCheckboxChange(ev, isChecked: boolean): void {
        let { onChange, item } = this.props;
        if (onChange) {
            onChange(item, isChecked);
        }

        // Bring the container under focus so as to enable visual indication signifying a click
        if (this._elementContainer && ev.type === "click") {
            this._elementContainer.focus();
        }
    }

    @autobind
    private _onKeyDown(evt): void {
        if (evt.keyCode === KeyCode.ENTER || evt.keyCode === KeyCode.SPACE) {
            this._invoke(evt);
        }
    }

    @autobind
    private _onFacetClick(evt): void {
        this._invoke(evt);
    }

    private _invoke(evt) {
        if (!this.props.isDisabled) {
            let checked = !this.state.checked;
            this.setState({ checked: checked });

            this._onCheckboxChange(evt, checked);
        }
    }
}
