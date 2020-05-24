import { ITag } from "OfficeFabric/Pickers";
import * as Utils_String from "VSS/Utils/String";

export class TagsSuggestionResolver {

    public static getSuggestedTags(
        userText: string,
        allTags: ITag[],
        selectedTags: ITag[],
        includeUserEnteredTextInSuggestedTags: boolean,
        getTagForText: (string) => ITag): ITag[] {

        let suggestedTags: ITag[] = [];
        let matchingTag: ITag;

        if (userText && userText.trim()) {

            allTags.forEach((tag) => {
                if (tag) {
                    if (tag.name && tag.name.toLocaleLowerCase().indexOf(userText.toLocaleLowerCase()) === 0) {
                        suggestedTags.push(tag);
                    }

                    if (Utils_String.localeIgnoreCaseComparer(userText, tag.name) === 0) {
                        matchingTag = tag;
                    }
                }
            });

            // If there is already a match, then do not include the user entered text in suggested tags.
            if (!matchingTag && includeUserEnteredTextInSuggestedTags && getTagForText) {
                let tagForText = getTagForText(userText);
                if (tagForText) {
                    suggestedTags.push(tagForText);
                }
            }

            // If the selected tags already contains the item, do not show it again. 
            return suggestedTags.filter(item => !this._isTagPresentInList(item, selectedTags));
        }
        else {
            return [];
        }
    }

    private static _isTagPresentInList(tag: ITag, tagList: ITag[]) {
        if (!tagList || !tagList.length || tagList.length === 0) {
            return false;
        }

        return tagList.filter(compareTag => Utils_String.ignoreCaseComparer(compareTag.key, tag.key) === 0).length > 0;
    }
}