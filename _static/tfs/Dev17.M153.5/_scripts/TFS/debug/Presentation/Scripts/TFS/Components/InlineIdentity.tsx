import "VSS/LoaderPlugins/Css!Presentation/Components/InlineIdentity";

import * as React from "react";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { Component as IdImgComponent } from "Presentation/Scripts/TFS/Components/IdentityImage";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { TooltipHost } from "VSSUI/Tooltip";

export interface IInlineIdentityProps {
    id?: string;
    displayName?: string;
    uniqueDisplayName?: string;
    tfsContext: TfsContext;
    imageUrl?: string;
    identity?: IdentityRef;
    supressTooltip?: boolean;
}

/**
 * A component that shows an identity image + name. Can be used inside of an inline span.
 */
export const Component = (props: IInlineIdentityProps): JSX.Element => {
    
    const identityRef = 
        props.identity 
            ? props.identity
            : props.id 
               ? {
                    id: props.id,
                    displayName: props.displayName,
                    _links: {
                        avatar: {
                            href: props.imageUrl,
                        },
                    }
                 } as IdentityRef
                : null;

    let identityComponent = (
        <div className="inline-identity" key={identityRef ? identityRef.id : "unknown-id"}>
            <IdImgComponent
                size="small"
                cssClass="identity-inline-image"
                identity={identityRef}
                tfsContext={props.tfsContext}
            />
            <span className="identity-bold">{identityRef ? identityRef.displayName : "[unknown]"}</span>
        </div>
    );

    // empty display name should not generate a tooltip
    if (!identityRef || !identityRef.displayName) {
        return identityComponent;
    }

    identityComponent.props.toolTip = ""; // Suppress parent tooltip.

    if (props.supressTooltip !== true) {
        identityComponent = <TooltipHost content={identityRef.displayName}>{identityComponent}</TooltipHost>;
    }

    return identityComponent;
};
