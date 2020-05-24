import * as Identities_Picker_Controls from "VSS/Identities/Picker/Controls";
import * as Identities_Picker_Services from "VSS/Identities/Picker/Services";
import { IEntity } from "VSS/Identities/Picker/RestClient";
import * as Utils_String from "VSS/Utils/String";

import { IdentityHelper } from "Presentation/Scripts/TFS/TFS.OM.Identities";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { IdentityPickerBaseComponent, IdentityPickerBaseComponentProps } from "Presentation/Scripts/TFS/Controls/Filters/Components/IdentityPickerBaseComponent";

export interface IdentityPickerComponentProps extends IdentityPickerBaseComponentProps {    
    placeholderText: string;
    // user to be present as watermark, instead of empty input value, when filterValue it not provided.
    defaultUser?: string;
    callbacks?: Identities_Picker_Controls.ISearchControlCallbackOptions;
    onChange?: (entity: IEntity) => void;
}

export class IdentityPickerComponent extends IdentityPickerBaseComponent<IdentityPickerComponentProps, {}> {

    protected getAdditionalSearchOptions(): Identities_Picker_Controls.IIdentityPickerSearchOptions {
        const identityType: Identities_Picker_Services.IEntityType = {
            User: true,
        };

        const operationScope: Identities_Picker_Services.IOperationScope = {
            Source: true,
            IMS: true,
        };
        return {
            showMruTriangle: true,
            operationScope: operationScope,
            identityType: identityType,
            consumerId: this.props.consumerId,
            showContactCard: true,
            pageSize: 10,
            placeholderText: this.props.placeholderText,
            size: Identities_Picker_Controls.IdentityPickerControlSize.Medium,
            callbacks: this.props.callbacks || {},
            watermark: this.props.defaultUser ? this.getInitialIdentity(this.props.defaultUser) : null,
        } as Identities_Picker_Controls.IIdentityPickerSearchOptions;
    }

    protected getInitialIdentity(fullName: string): IEntity {
        const identityReference = IdentityHelper.parseUniquefiedIdentityName(fullName);
        let entity: IEntity;
        if (identityReference) {
            const tfsContext = TfsContext.getDefault();
            const imageUrl = tfsContext.getIdentityImageUrl(identityReference.uniqueName, { defaultGravatar: "mm" });
            entity = Identities_Picker_Controls.EntityFactory.createStringEntity(identityReference.displayName, imageUrl);
            // createStringEntity() internally HTML encodes the display name, which causes it to appear in the picker control in encoded form.
            // Using htmlEncodeJavascriptAttribute() instead leaves single quotes unencoded, so we don't mangle names with apostrophes.
            entity.displayName = Utils_String.htmlEncodeJavascriptAttribute(identityReference.displayName);
            entity.mail = identityReference.uniqueName;
        }
        return entity;
    }

    protected onIdentityPickerSelectionChange(entity: IEntity): void {
        super.onIdentityPickerSelectionChange(entity);

        if (this.props.onUserInput) {
            let filterValue = "";
            if (entity) {
                this.getIdentityPickerSearchControl().addIdentitiesToMru([entity]);
                filterValue = this._getDecodedFilterValue(entity.displayName, entity.localId);
            }

            this.props.onUserInput(this.props.filterKey, filterValue);
        }

        if (this.props.onChange) {
            this.props.onChange(entity);
        }
    }


}
