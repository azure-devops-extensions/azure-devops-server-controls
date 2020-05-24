import * as TCMContracts from "TFS/TestManagement/Contracts";

export class TestAttachmentModel {
    /**
     * Legacy attachment.
     */
    legacyAttachments: TCMContracts.TestAttachment[];

    /**
     * Logstore attachment.
     */
    logStoreAttachments: TCMContracts.TestLog[];

    getLegacyAttachments(): TCMContracts.TestAttachment[] {
        return this.legacyAttachments;
    }

    setLegacyAttachments(legacyAttachments: TCMContracts.TestAttachment[]) {
        this.legacyAttachments = legacyAttachments;
    }

    getLogStoreAttachments(): TCMContracts.TestLog[] {
        return this.logStoreAttachments;
    }

    setLogStoreAttachments(logStoreAttachments: TCMContracts.TestLog[]) {
        this.logStoreAttachments = logStoreAttachments;
    }    
}
