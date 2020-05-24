import * as React from "react";

import "VSS/LoaderPlugins/Css!VersionControl/NotFoundComponent";

import { Link } from "OfficeFabric/Link";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";

export interface NotFoundComponentProps {
    errorText: string;
    actionUrl: string;
    navigateBackText: string;
    hubId: string;
}

export const NotFoundComponent = (props: NotFoundComponentProps): JSX.Element => {
    return (
        <div className="vc-id-not-found-component" role="alert">
            <div className={"description-row title"}>{props.errorText}</div>
            <div>
                <Link
                    href={props.actionUrl}
                    onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
                        onClickNavigationHandler(event, props.hubId, (event.currentTarget as HTMLAnchorElement).href);
                    }
                    }>
                    {props.navigateBackText}
                </Link>
            </div>
        </div>
    );
}
