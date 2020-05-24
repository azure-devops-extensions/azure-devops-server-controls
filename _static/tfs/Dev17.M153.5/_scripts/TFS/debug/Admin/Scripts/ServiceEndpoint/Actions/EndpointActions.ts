import Action_Base = require("VSS/Flux/Action");
import Model = require("Admin/Scripts/ServiceEndpoint/EnpointSharedProjectsData")
import Contracts = require("TFS/DistributedTask/Contracts");

export var sharedEndpointProjectsData = new Action_Base.Action<Model.EnpointSharedProjectsData>();

export var updateSharedProjects = new Action_Base.Action<Contracts.ProjectReference[]>();

export var removedSharedProject = new Action_Base.Action<Contracts.ProjectReference>();

export var addedSharedProject = new Action_Base.Action<Contracts.ProjectReference>();

export var updateError = new Action_Base.Action<string>();
