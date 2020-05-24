import * as React from "react";
import { css, getId } from "OfficeFabric/Utilities";
import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";
import "VSS/LoaderPlugins/Css!VersionControl/Accordion";

export interface IAccordionState {
    expanded: boolean;
    isMouseClick: boolean;
    isFocused: boolean;
}

export interface IAccordionProps {
    label: string;
    initiallyExpanded?: boolean;
    headingLevel: number;
    noSeparator?: boolean;
}

export class Accordion extends React.Component<IAccordionProps, IAccordionState> {
    private _titleId: string;
    private _contentId: string;

    constructor(props) {
        super(props);
        this._titleId = getId('Accordion');
        this._contentId = getId('AccordionContent');
        this.state = {
            expanded: props.initiallyExpanded || false,
            isMouseClick: false,
            isFocused: false,
        }
    }

    public render(): JSX.Element {
        const chevronIconClass = Utils_String.format("chevron bowtie-icon bowtie-chevron-{0}-light", this.state.expanded ? "up" : "down");
        const contentDisplayStyle = this.state.expanded ? "block" : "none";
        const showSeparator = !this.props.noSeparator && this.state.expanded;
        const showOutline = this.state.isFocused && !this.state.isMouseClick;
        return (
            <div className="vc-accordion">
                <dt
                    className={css("title-container", { "show-outline": showOutline })}
                    tabIndex={0}
                    role="button"
                    aria-expanded={this.state.expanded}
                    aria-labelledby={this._titleId}
                    aria-controls={this._contentId}
                    onFocus={this._onFocus}
                    onBlur={this._onBlur}
                    onMouseDown={this._onClick}
                    onKeyDown={this._handleKeyPress}
                    aria-level={this.props.headingLevel}>
                    <div className="chevron">
                        <span className={chevronIconClass} />
                    </div>
                    <div
                        className="title-text"
                        id={this._titleId}>
                        {this.props.label}
                    </div>
                </dt>
                <dd
                    className="content-container"
                    id={this._contentId}
                    aria-labelledby={this._titleId}
                    style={{ display: contentDisplayStyle }}>
                    {this.props.children}
                </dd>
                {
                    showSeparator && <Separator />
                }
            </div >
        );
    }

    private _toggle = (isMouseClick: boolean): void => {
        this.setState({
            expanded: !this.state.expanded,
            isMouseClick: isMouseClick,
            isFocused: true,
        });
    }

    private _onClick = (event: React.MouseEvent<HTMLDivElement>): void => {
        this._toggle(true);
        event.preventDefault();
        event.stopPropagation();
    }

    private _handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (event.keyCode === KeyCode.SPACE || event.keyCode === KeyCode.ENTER) {
            this._toggle(false);
            event.preventDefault();
            event.stopPropagation();
        }
    }

    private _onBlur = (event: React.FocusEvent<HTMLDivElement>): void => {
        this.setState({
            isFocused: false,
            isMouseClick: false,
        });
    }

    private _onFocus = (event: React.FocusEvent<HTMLDivElement>): void => {
        this.setState({ isFocused: true });
    }
}

const Separator = (): JSX.Element =>
    <div className="empty-repository-separator" />;