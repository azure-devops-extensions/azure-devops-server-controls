import * as Utils_String from "VSS/Utils/String";

interface IItemWithScore {
    item: any;
    score: number;
}

export class FilteringUtils {

    public static performFilteringWithScore<T>(
        currentFilteredList: T[],
        completeList: T[],
        currentFilter: string,
        lastFilter: string,
        getMatchScore: ((item: T, filter: string, performExactMatch?: boolean) => number)
    ): T[] {
        let filterBaseList: T[] = [];
        let filteredListWithScore: IItemWithScore[] = [];
        if (currentFilter) {

            if (!Utils_String.equals(currentFilter, lastFilter, true)) {
                // Filter the list only if there is a filter set or if the filter has changed. 
                if (lastFilter && currentFilter.length > lastFilter.length && currentFilter.indexOf(lastFilter) >= 0) {
                    // If the new filter is longer than the last filter and the last filter is a substring of new filter, then we just need to search in the previously 
                    // filtered list instead of entire list.
                    //
                    // For instance, if the last filter is "art" and the new filter is "arti", then the list filtered with "art" is a superset of
                    // list filtered with "arti". So we just need to filter the already filtered list.
                    //
                    // Similarly if the last filter is "ask" and the new filter is "taskinput", then the list filtered with "ask" is a superset of 
                    // list filtered with "taskinput"
                    filterBaseList = currentFilteredList;
                }
                else {
                    filterBaseList = completeList;
                }

                // filterBaseList can be null so checking that
                if (!!filterBaseList) {
                    // instead of matching the entire string, we will tokenize it by "SPACE" 
                    // This is cautious decision and we will not support this in CJK lang.
                    // For each token, we do filtered match and keep using the matched list 
                    // for next matches
                    // match-order is as per sequence in search string - i.e. first word acts 
                    // as filter, before second word is considered.
                    // we are keeping track of the match score to determine the order
                    // in which the filtered results should be returned
                    let filterTokens: string[] = currentFilter.split(FilteringUtils._stringSpace);
                    filteredListWithScore = filterBaseList.map((item: T) => {
                        // set initial score based on full filter text to promote item with exact match
                        return {
                            item: item,
                            score: getMatchScore(item, currentFilter, true)
                        } as IItemWithScore;
                    });

                    for (let index = 0; index < filterTokens.length; index++) {

                        // Skip empty tokens
                        if (filterTokens[index] !== Utils_String.empty) {

                            filteredListWithScore = filteredListWithScore
                                .filter((itemWithScore: IItemWithScore) => {
                                    return (getMatchScore(itemWithScore.item, filterTokens[index]) !== 0);
                                })
                                .map((itemWithScore: IItemWithScore) => {
                                    let matchScore = getMatchScore(itemWithScore.item, filterTokens[index]);
                                    return {
                                        item: itemWithScore.item,
                                        score: itemWithScore.score + matchScore
                                    } as IItemWithScore;
                                });
                        }
                    }
                }
            }
        }
        else {
            // The filter is cleared. 
            return completeList;
        }

        // sort the list by score obtained
        return filteredListWithScore
            .sort((a: IItemWithScore, b: IItemWithScore) => {
                return (b.score - a.score);
            })
            .map((itemWithScore: IItemWithScore) => {
                return itemWithScore.item;
            });
    }

    public static getStringMatchScore(stringToMatch: string, dataForMatching: string[], performExactMatch: boolean = false): number {
        const dataForMatchingCount = dataForMatching ? dataForMatching.length : 0;
        stringToMatch = stringToMatch ? stringToMatch.toLowerCase().trim() : Utils_String.empty;

        if (dataForMatchingCount <= 0 || !stringToMatch) {
            return 0;
        }

        for (let i = 0, score = dataForMatchingCount; i < dataForMatchingCount; i++ , score--) {
            // score will be max for the match in first data for matching and least for last
            dataForMatching[i] = dataForMatching[i] ? dataForMatching[i].toLowerCase().trim() : Utils_String.empty;

            if (dataForMatching[i]) {
                if (!!performExactMatch && Utils_String.equals(dataForMatching[i], stringToMatch, true)) {
                    // if there is an exact match, it should be given precedence
                    return score + dataForMatchingCount;
                }

                if (!performExactMatch && dataForMatching[i].indexOf(stringToMatch) >= 0) {
                    return score;
                }
            }
        }

        return 0;
    }

    private static _stringSpace: string = " ";
}
