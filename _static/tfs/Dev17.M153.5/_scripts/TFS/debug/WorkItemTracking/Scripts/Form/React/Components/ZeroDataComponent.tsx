import "VSS/LoaderPlugins/Css!WorkItemTracking/Form/React/Components/ZeroDataComponent";

import * as React from "react";

import { PrimaryButton, IButtonProps, IButton } from "OfficeFabric/Button";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { Fabric } from "OfficeFabric/Fabric";
import { DropdownButton } from "Presentation/Scripts/TFS/Components/DropdownButton";

import { css, autobind } from "OfficeFabric/Utilities";

export interface IZeroDataCTA {
    className?: string;

    /** Label to show for button */
    label: string;

    buttonProps?: IButtonProps;

    /** If given, the CTA button will be a DropdownButton that shows the passed menu items, upon activation */
    menuItems?: IContextualMenuItem[];
}

export interface IZeroDataProps {
    /** Class name to add to component */
    className?: string;

    /** Class name for center icon */
    iconClassName: string;

    /** Label to show below icon */
    label: string;

    /** Optional CTA button */
    cta?: IZeroDataCTA;

    /** Optional method to provide additional content instead of CTA */
    onRenderAdditionalContent?: () => JSX.Element;
}


class ZeroDataCTA extends React.Component<IZeroDataCTA, {}> {
    private _button:IButton

    public focus() {
        this._button.focus();
    }

    public render() {
        const {
            buttonProps,
            className,
            menuItems
        } = this.props;

        const buttonClassName = css("work-item-zero-cta", className);
        
        if (menuItems) {
            return <Fabric>
                <DropdownButton
                    buttonProps={buttonProps}
                    ref={this._resolveButton}
                    menuItems={menuItems}
                    className={buttonClassName}
                    onButtonContentRender={this._renderButtonContent}
                />
            </Fabric>;
        }
        
        return <Fabric>
            <PrimaryButton {...buttonProps} className={buttonClassName} componentRef={this._resolveButton}>
                {this._renderButtonContent()}
            </PrimaryButton>
        </Fabric>;
    }

    @autobind
    private _renderButtonContent() {
        return <span className="work-item-zero-cta-label">
            <i className="bowtie-icon bowtie-math-plus-light" />{this.props.label}
        </span>;
    }

    @autobind
    private _resolveButton(button: IButton) {
        this._button = button;
    }
}

export class ZeroDataComponent extends React.Component<IZeroDataProps, {}> {
    private _zeroDataCTA: ZeroDataCTA;

    public focus() {
        if (this._zeroDataCTA) {
            this._zeroDataCTA.focus();
        }
    }

    public render() {
        const {
            label,
            className,
            iconClassName,
            onRenderAdditionalContent,
            cta
        } = this.props;

        let additionalContent: JSX.Element;
        if (onRenderAdditionalContent) {
            additionalContent = onRenderAdditionalContent();
        } else if (cta) {
            additionalContent = <ZeroDataCTA {...cta} ref={this._resolveCTA}/>;
        }

        // hide the icon from Voiceover screen reader via aria-hidden
        return <div className={css("work-item-zero-data", "bowtie-fabric", className)}>
            <div aria-hidden="true" className={css("bowtie-icon", "work-item-zero-data-icon", iconClassName)} />
            <div>{label}</div>
            {additionalContent}
        </div>;
    }

    @autobind
    private _resolveCTA(zeroDataCTA: ZeroDataCTA) {
        this._zeroDataCTA = zeroDataCTA;
    }
}