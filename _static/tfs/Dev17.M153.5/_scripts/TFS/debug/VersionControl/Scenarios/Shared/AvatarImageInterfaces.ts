export enum AvatarImageSize {
    ExtraSmall,
    SmallMinus,
    Small,
    SmallPlus,
    Medium,
    Large
}

export interface IAvatarImageStyle {
    className: string;
    imageSize: number;
}

export interface IAvatarImageProperties {
    email: string;
    displayName: string;
    identityId: string;
    size?: AvatarImageSize;
    imageUrl?: string;
}