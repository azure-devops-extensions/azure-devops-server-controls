import Action_Base = require("VSS/Flux/Action");
import Model = require("DistributedTask/Scripts/DT.VariableGroup.Model");
import SecureFileModel = require("DistributedTask/Scripts/DT.SecureFile.Model");


export var loadVariableGroup = new Action_Base.Action<Model.VariableGroup>();

export var cloneVariableGroup = new Action_Base.Action<Model.VariableGroup>();

export var deleteVariableGroup = new Action_Base.Action<number>();

export var getVariableGroup = new Action_Base.Action<Model.VariableGroup>();

export var getVariableGroups = new Action_Base.Action<Model.VariableGroup[]>();

export var refreshKeyVaultVariableGroup = new Action_Base.Action();

export var updateServiceEndPointInVariableGroup = new Action_Base.Action<string>();

export var updateKeyVaultNameInVariableGroup = new Action_Base.Action<string>();

export var updateKeyVaultAuthorizationState = new Action_Base.Action<boolean>();

export var refreshKeyVaultsList = new Action_Base.Action();

export var loadSecureFile = new Action_Base.Action<SecureFileModel.SecureFile>();

export var uploadSecureFile = new Action_Base.Action<SecureFileModel.SecureFile>();

export var deleteSecureFile = new Action_Base.Action<string>();

export var getSecureFile = new Action_Base.Action<SecureFileModel.SecureFile>();

export var getSecureFiles = new Action_Base.Action<SecureFileModel.SecureFile[]>();
