import * as React from "react";
import * as ZeroData from "Presentation/Scripts/TFS/Components/ZeroData";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";
import * as Locations from "VSS/Locations";

let createZeroDataSecondaryTextElement = () => {
    let starElement = <span className="bowtie-icon bowtie-favorite" aria-label={MyExperiencesResources.Favorites_FavoriteButton}/>;
    let text = MyExperiencesResources.FavoritesZeroDataSecondaryText;
    var textSplits = text.split('{0}');
    return <span>{textSplits[0]}{starElement}{textSplits[1]}</span>;
}

export var FavoritesZeroData: ZeroData.Props = {
    primaryText: MyExperiencesResources.FavoritesZeroDataPrimary,
    secondaryTextElement: createZeroDataSecondaryTextElement(),
    infoLink: {
        href: 'https://go.microsoft.com/fwlink/?linkid=830656',
        linkText: MyExperiencesResources.FavoritesZeroDataInfoLinkText
    },
    imageUrl: Locations.urlHelper.getVersionedContentUrl("MyExperiences/day-zero-favorites.svg"),
    imageAltText: MyExperiencesResources.Favorites_ZeroFavorites_AltText
};
