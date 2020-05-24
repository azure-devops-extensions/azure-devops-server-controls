/// <reference types="react" />

import "VSS/LoaderPlugins/Css!Presentation/Components/ZeroData";
import { BaseButton, DefaultButton, IButtonProps, PrimaryButton } from "OfficeFabric/Button";
import * as React from "react";

export interface ILink {
    href: string;
    linkText: string;
}

export interface IZeroDataButtonProps {
    text: string;
    onClick: (ev?: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement | BaseButton>) => void;
    isPrimaryButton?: boolean;
}

export interface Props {
    primaryText: string;

    secondaryText?: string;

    /*
     * Alternative for `secondaryText` in order to provide an element
     */
    secondaryTextElement?: JSX.Element;

    infoLink?: ILink;

    /*
     * Alternative for `infoLink`
     */
    infoButton?: IZeroDataButtonProps;

    imageUrl: string;
    imageAltText?: string;
}

export var ZeroData: React.StatelessComponent<Props> =
    (props: Props): JSX.Element => {
        return (
            <div className="zerodata">
                <div>
                    <img src={props.imageUrl} alt={props.imageAltText} />
                </div>
                <div className="primary">
                    <span>{props.primaryText}</span>
                </div>
                <div> {
                    props.secondaryTextElement ?
                        props.secondaryTextElement :
                        <span>{props.secondaryText}</span>
                }
                </div>
                <div className="info-link">
                    {
                        props.infoLink ?
                            <a href={props.infoLink.href} target="_blank">{props.infoLink.linkText}</a> :
                            (
                                props.infoButton ?
                                    (
                                        props.infoButton.isPrimaryButton ?
                                            <PrimaryButton {...{
                                                text: props.infoButton.text,
                                                onClick: props.infoButton.onClick
                                            }} /> :
                                            <button
                                                className="zero-data-info-button"
                                                onClick={() => { props.infoButton.onClick(); }}>
                                                {props.infoButton.text}
                                            </button>
                                    )
                                    : null
                            )
                    }
                </div>
            </div>
        );
    }
