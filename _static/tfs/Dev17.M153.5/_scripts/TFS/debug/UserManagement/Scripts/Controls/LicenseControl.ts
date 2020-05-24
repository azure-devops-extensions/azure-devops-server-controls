import Controls = require("VSS/Controls");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import AccountResources = require("UserManagement/Scripts/Resources/SPS.Resources.UserManagement");
import Events_Services = require("VSS/Events/Services");
import VSS = require("VSS/VSS");
import Utils_Culture = require("VSS/Utils/Culture");
import Utils_String = require("VSS/Utils/String");
import ProgressControl = require("UserManagement/Scripts/Controls/ProgressControl");
import SPS_Host_TfsContext = require("Presentation/Scripts/TFS/SPS.Host.TfsContext");
import CoreAjax = require("Presentation/Scripts/TFS/SPS.Legacy.Ajax");

var eventService = Events_Services.getService();
var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;

export class LicenseControl extends Controls.BaseControl {
    public static enhancementTypeName: string = "tfs.account.LicenseControl";
    private $userTitle: any;
    private $userSection: any;
    private $licenseSection: any;
    private $billingFaq: any;
    private $linkArea: any;
    private $permissions: any;

    constructor(options?) {
        super(options);
    }
    public initialize() {
        super.initialize();
        this.$userTitle = this._element.find('#userTitle');
        this.$userSection = this._element.find('#userSection');
        this.$licenseSection = this._element.find('#licenseSection');
        this.$linkArea = this._element.find('#pricingInfoLink');
        this.$permissions = this._getPermissionContext();
        eventService.attachEvent("tfs-update-license", delegate(this, this._updateLicenseData));
        eventService.attachEvent("tfs-clear-license", delegate(this, this._clearLicenseData));
    }

    private _clearLicenseData() {
        this._animeHideLicenseView();
        var allLicenseData = [];
        allLicenseData.push(this.$userTitle);
        allLicenseData.push(this.$userSection);
        allLicenseData.push(this.$licenseSection);
        allLicenseData.push(this.$linkArea);
        allLicenseData.push(this.$permissions);
        for (var i in allLicenseData) {
            if (allLicenseData.hasOwnProperty(i)) {
                $(allLicenseData[i]).empty();
            }
        }
    }

    private _animeHideLicenseView(): void {
        $(".license-view").animate({ width: "0px" });
        $(".userHub-account-view").animate({ right: "0px" });
        $(".license-view").hide();
    }

    private _animeShowLicenseView(): void {
        $(".license-view").show();
        $(".license-view").animate({ width: "230px" });
        $(".userHub-account-view").css("right", "240px");
    }

    /// <summary>Update the right hand rail with new data</summary>
    private _updateLicenseData(data, licenseCount) {
        $(this.$userTitle).text(AccountResources.HubDisplayText);
        if (data != null) {
            this._animeShowLicenseView();
            var earlyAdopter = (licenseCount["Account-EarlyAdopter"]) ? licenseCount["Account-EarlyAdopter"] : 0;
            var standard = data["Account-Express"];
            var professional = data["Account-Professional"];
            var advanced = data["Account-Advanced"];
            var useStakeholder = data["Account-Stakeholder"] ? true : false;
            var stakeholder = useStakeholder ? (data["Account-Stakeholder"]).InUse : 0;
            var eligibleMSDN = (licenseCount["Msdn-Eligible"]) ? licenseCount["Msdn-Eligible"] : 0;
            var msdnUltimate = (licenseCount["Msdn-Ultimate"]) ? licenseCount["Msdn-Ultimate"] : 0;
            var msdnPremium = (licenseCount["Msdn-Premium"]) ? licenseCount["Msdn-Premium"] : 0;
            var msdnTestProfessional = (licenseCount["Msdn-TestProfessional"]) ? licenseCount["Msdn-TestProfessional"] : 0;
            var msdnProfessional = (licenseCount["Msdn-Professional"]) ? licenseCount["Msdn-Professional"] : 0;
            var msdnPlatforms = (licenseCount["Msdn-Platforms"]) ? licenseCount["Msdn-Platforms"] : 0;
            var msdnEnterprise = (licenseCount["Msdn-Enterprise"]) ? licenseCount["Msdn-Enterprise"] : 0;
            var inactive = (licenseCount["Inactive"]) ? licenseCount["Inactive"] : 0;

            var freeExpress = this._calculateFree(standard);
            var freeProfessional = this._calculateFree(professional);
            var freeAdvanced = this._calculateFree(advanced);
            var freeTotal = freeExpress + freeProfessional + freeAdvanced;

            var monthlyExpress = this._calculateMonthly(standard);
            var monthlyProfessional = this._calculateMonthly(professional);
            var monthlyAdvanced = this._calculateMonthly(advanced);
            var monthlyTotal = monthlyExpress + monthlyProfessional + monthlyAdvanced;

            var standardProvisioned = standard.Maximum - standard.IncludedQuantity;
            var professionalProvisioned = professional.Maximum - professional.IncludedQuantity;
            var advancedProvisioned = advanced.Maximum - advanced.IncludedQuantity;
            var totalProvisioned = standardProvisioned + professionalProvisioned + advancedProvisioned;

            var totalEnterprise = msdnUltimate + msdnPremium + msdnEnterprise;
            var totalMSDN = msdnUltimate + msdnPremium + msdnTestProfessional + msdnProfessional + msdnPlatforms + msdnEnterprise;
            var total = freeTotal + monthlyTotal + earlyAdopter + eligibleMSDN + totalMSDN + stakeholder + inactive;

            //Find a better way to do this
            $(this.$userSection).empty();

            //Early Adopters
            this._appendUserRow(AccountResources.AccountEarlyAdopterLicense, earlyAdopter, this.$userSection);

            //Free Users
            this._appendUserRow(AccountResources.UserSectionFree, freeTotal, this.$userSection);

            //Monthly Users
            this._appendUserRow(AccountResources.UserSectionMonthly, monthlyTotal, this.$userSection);

            //Eligible MSDN
            this._appendUserRow(AccountResources.UserSectionMSDNPending, eligibleMSDN, this.$userSection);

            //Stakeholder
            this._appendUserRow(AccountResources.AccountStakeholderLicense, stakeholder, this.$userSection);

            //valid MSDN Enterprise
            this._appendUserRow(AccountResources.UserSectionEnterprise, totalEnterprise, this.$userSection);

            //valid MSDN Professional
            this._appendUserRow(AccountResources.UserSectionPro, msdnProfessional, this.$userSection);

            //valid MSDN Test Professional
            this._appendUserRow(AccountResources.UserSectionTestPro, msdnTestProfessional, this.$userSection);

            //valid MSDN Platforms
            this._appendUserRow(AccountResources.MsdnPlatforms, msdnPlatforms, this.$userSection);

            //Inactive
            if (inactive > 0) {
                var inactiveRow = $(domElem('tr')).addClass('user-row').appendTo(this.$userSection);
                $(domElem('td')).addClass('icon icon-tfs-tcm-blocked-small').appendTo(inactiveRow);
                $(domElem('td')).addClass('inactiveLeftColumn').text(AccountResources.UserSectionInvalid).appendTo(inactiveRow);
                $(domElem('td')).addClass('rightColumn').text(inactive).appendTo(inactiveRow);
            }

            //Total
            var row = $(domElem('tr')).addClass('total-row').appendTo(this.$userSection);
            $(domElem('td')).addClass('leftColumn').text(AccountResources.UserSectionTotal).appendTo(row);
            $(domElem('td')).addClass('rightColumn').text(total).appendTo(row);

            //Find a better way to do this
            $(this.$licenseSection).empty();

            //License Section
            var licenseHeader = $(domElem('div')).addClass('licenses-title').attr("id", "licenseTitle").appendTo(this.$licenseSection).text(AccountResources.LicenseSection);

            //Free progress bars
            var freeSection = $(domElem('div')).addClass('progress-section').attr("id", "free-progress-bars").appendTo(this.$licenseSection);

            var freeHeader = $(domElem('div')).addClass("header").text(AccountResources.UserSectionFree).appendTo(freeSection).text(AccountResources.UserSectionFree);
            var freeLink = $(domElem('div')).addClass('rightLink').html(AccountResources.FreeLearnMore).appendTo(freeHeader);

            this._appendProgressBar(freeExpress, standard.IncludedQuantity, AccountResources.AccountStandardLicense, freeSection, 'standardFreeContainer');
            this._appendProgressBar(freeProfessional, professional.IncludedQuantity, AccountResources.AccountStandardProLicense, freeSection, 'professionalFreeContainer');
            this._appendProgressBar(freeAdvanced, advanced.IncludedQuantity, AccountResources.AccountAdvancedLicense, freeSection, 'advancedFreeContainer');

            //Monthly Paid Progress Bars
            var monthlySection = $(domElem('div')).addClass('progress-section').attr("id", "monthly-progress-bars").appendTo(this.$licenseSection);
            var monthlyHeader = $(domElem('div')).addClass("monthlyHeader").text(AccountResources.UserSectionFree).appendTo(monthlySection).text(AccountResources.UserSectionMonthly);
            var rightLink = $(domElem('div')).addClass('rightLink').html(AccountResources.MonthlyLearnMore).appendTo(monthlyHeader);

            if (this.$permissions.displayLink) {
                var cycleDate = $(domElem('div')).addClass('date').text(this.$permissions.monthlyCycle).appendTo(monthlySection);
            }

            if (totalProvisioned > 0) {
                this._appendProgressBar(monthlyExpress, standardProvisioned, AccountResources.AccountStandardLicense, monthlySection, 'standardMonthlyContainer');
                this._appendProgressBar(monthlyProfessional, professionalProvisioned, AccountResources.AccountStandardProLicense, monthlySection, 'professionalMonthlyContainer');
                this._appendProgressBar(monthlyAdvanced, advancedProvisioned, AccountResources.AccountAdvancedLicense, monthlySection, 'advancedMonthlyProfessContainer');
            }
            var browseExtUrl = Utils_String.format(AccountResources.BrowseExtensions, AccountResources.BrowseExtensionsLink);
            $(domElem('div')).appendTo(monthlySection).html(browseExtUrl).addClass("browse-extensions-link");

            var manageLicenses;
            if (this._linkedOwner()) {
                manageLicenses = $(domElem('div')).appendTo(monthlySection).html(this.$permissions.licenseLink).addClass("license-link");
            }
            else if (this.$permissions.isAccountOwner) {
                manageLicenses = $(domElem('div')).appendTo(monthlySection).html(AccountResources.SetUpBilling).addClass("license-link");
            }
        }


        return null;
    }

    /// <summary>Helper method to add a row to thr right hand rail</summary>
    private _appendUserRow(text, total, container, embed?: boolean) {
        embed = (typeof embed === "undefined") ? false : embed;
        if (total > 0) {
            var row = $(domElem('tr')).addClass('user-row').appendTo(container);
            if (embed == false) {
                $(domElem('td')).addClass('leftColumn').text(text).appendTo(row);
                $(domElem('td')).addClass('rightColumn').text(total).appendTo(row);
            }
            else {
                $(domElem('td')).addClass('leftColumn').text(Utils_String.format(text, total)).appendTo(row);
            }
        }
    }

    /// <summary>Helper method to append a progress bar</summary>
    private _appendProgressBar(current, total, licenseText, container, newContainerName) {

        if (total > 0) {
            var container: any = $(domElem('div')).appendTo(container).attr('id', newContainerName).addClass('progressContainer');
            var stdProgess = <ProgressControl.ProgressControl>Controls.Enhancement.enhance(ProgressControl.ProgressControl, container, {
                current: current,
                total: total,
                maxTotal: total,
                text: licenseText,
                suffixFormat: "{0} " + AccountResources.RightRailAssigned
            });
        }
    }

    /// <summary>Calculate the amount of a free resource in use</summary>
    private _calculateFree(resource) {
        var free = (resource.InUse < resource.IncludedQuantity) ? resource.InUse : resource.IncludedQuantity;
        return free;
    }

    /// <summary>Calculate the amount of a paid resource in use</summary>
    private _calculateMonthly(resource) {
        var monthly = (resource.InUse - resource.IncludedQuantity > 0) ? resource.InUse - resource.IncludedQuantity : 0;
        return monthly;
    }

    /// <summary>Determines whether an account has been linked or not</summary>
    private _linkedOwner() {
        if (this.$permissions.isAccountOwner) {
            if (this.$permissions.displayLink) {
                return true;
            }
        }
        return false;
    }

    /// <summary>Get's the permission data</summary>
    private _getPermissionContext() {
        // Getting the JSON string serialized by the server according to the current host
        var contextElement, json;

        contextElement = $(".permissions-context", document);

        if (contextElement.length > 0) {
            json = contextElement.eq(0).html();
            if (json) {
                return Utils_Core.parseMSJSON(json, false);
            }
        }
        return null;
    }

}
VSS.classExtend(LicenseControl, SPS_Host_TfsContext.TfsContext.ControlExtensions);

VSS.initClassPrototype(ProgressControl.ProgressControl, {
    _text: null
});