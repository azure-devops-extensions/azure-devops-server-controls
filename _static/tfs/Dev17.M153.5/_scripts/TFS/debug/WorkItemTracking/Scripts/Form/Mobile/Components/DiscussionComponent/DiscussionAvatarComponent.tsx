import React = require("react");

import  { IdentityHelper, IIdentityReference, IdentityImageMode } from "Presentation/Scripts/TFS/TFS.OM.Identities";

export interface IDiscussionAvatarProps {
    identity: IIdentityReference;
}

export const DiscussionAvatarComponent: React.StatelessComponent<IDiscussionAvatarProps> = (props: IDiscussionAvatarProps) => {
    const src = IdentityHelper.getIdentityImageUrl(props.identity, IdentityImageMode.ShowGenericImage);
    const avatar = <img src={src} alt={IdentityHelper.getUniquefiedIdentityName(props.identity)} />;

    return <div className="avatar">
        {avatar}
    </div>;
}