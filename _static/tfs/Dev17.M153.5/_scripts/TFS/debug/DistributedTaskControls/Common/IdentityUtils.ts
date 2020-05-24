import { SemiColon } from "DistributedTaskControls/Common/Common";
import { IEntity } from "VSS/Identities/Picker/RestClient";

import * as Utils_String from "VSS/Utils/String";

export class IdentityUtils {
    public static getUserIdsAsJSONString = (users: IEntity[]): string => {
        let userIds: string[] = [];
        let numberOfUsers: number = users ? users.length : 0;
        for (let i = 0; i < numberOfUsers; i++) {
            let userId: string = users[i].localId;
            userIds.push(userId);
        }

        return numberOfUsers ? JSON.stringify(userIds) : Utils_String.empty;
    }

    public static convertJsonArrayIdentitiesStringToSemicolonSeperatedString(str: string): string {
        let items: string[];
        if (!!str) {
            try{
                items = JSON.parse(str) as string[];
            }catch (e){
                // do nothing, we will return an empty items object
            }     
        }

        let returnVal: string = items && items.length ? items.join(SemiColon) : Utils_String.empty;
        return returnVal;
    }
}