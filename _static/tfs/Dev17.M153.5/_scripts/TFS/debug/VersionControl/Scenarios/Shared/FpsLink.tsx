import * as React from "react";

import { Link, ILinkProps } from "OfficeFabric/Link";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";

export interface FpsLinkProps extends ILinkProps {
    targetHubId: string;
}

/**
 * OfficeFabric Link with Fast Page Switch navigation
 */
export class FpsLink extends React.PureComponent<FpsLinkProps> {
    public render(): JSX.Element {
        return <Link {...this.props} onClick={this._onClick} />;
    }

    private _onClick = (event: React.MouseEvent<HTMLAnchorElement>): void => {
        if (this.props.targetHubId) {
            onClickNavigationHandler(event, this.props.targetHubId, (event.currentTarget as HTMLAnchorElement).href);
        }
    }
}
