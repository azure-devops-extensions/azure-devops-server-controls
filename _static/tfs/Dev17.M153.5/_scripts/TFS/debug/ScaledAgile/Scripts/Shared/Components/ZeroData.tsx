/// <reference types="react" />

import "VSS/LoaderPlugins/Css!ScaledAgile/Scripts/Shared/Components/ZeroData";

import * as React from "react";
import { Fabric } from "OfficeFabric/Fabric";

export interface ILink {
    href: string;
    linkText: string;
}

export interface IImage {
    imageUrl: string;
    altText: string;
}

export interface IZeroDataProps {
    image: IImage;
    primaryMessage: string;
    infoLink?: ILink;
    secondaryMessage?: string | JSX.Element;
    action?: JSX.Element;
}

export var ZeroData: React.StatelessComponent<IZeroDataProps> =
    (props: IZeroDataProps): JSX.Element => {
        let secondaryMessage: JSX.Element = null;
        if (props.secondaryMessage) {
            if (typeof props.secondaryMessage === "string") {
                secondaryMessage = <span>{props.secondaryMessage}</span>;
            }
            else {
                secondaryMessage = props.secondaryMessage;
            }
        }
        let infoLink: JSX.Element = null;
        if (props.infoLink) {
            infoLink = <div className="info-link ms-font-m">
                <a href={props.infoLink.href} target="_blank" rel="noopener noreferrer">{props.infoLink.linkText}</a>
            </div>;
        }

        return <Fabric>
                <div className="zerodata">
                    <div>
                        <img src={props.image.imageUrl} alt={props.image.altText} />
                    </div>
                    <div className="primary ms-font-xxl">
                        <span>{props.primaryMessage}</span>
                    </div>
                    <div className="ms-font-m">
                        {secondaryMessage}
                    </div>
                    {infoLink}
                    <div className="action">
                        {props.action}
                    </div>
                </div>
            </Fabric>;
    };
