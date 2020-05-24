import "VSS/LoaderPlugins/Css!TfsCommon/MobileNavigation/Navigation/Profile";

import * as React from "react";

import { IProfileProps } from "TfsCommon/Scripts/MobileNavigation/Navigation/Profile.props";

export const Profile = (props: IProfileProps): JSX.Element => {
    const { profile } = props;
    const { id, name, imageSrc } = profile;

    return <div className="profile">
        <div className="profile-avatar">
            <img src={imageSrc} aria-hidden={true} />
        </div>
        <div className="profile-text">
            <div className="profile-name">
                {name}
            </div>
            <div className="profile-email">
                {id}
            </div>
        </div>
    </div>;
};
