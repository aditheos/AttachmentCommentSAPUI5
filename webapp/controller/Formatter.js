sap.ui.define(function() {
	"use strict";

	var Formatter = {
		attachmentUrl: function (sInstanceID, sId){
			var sPath = this.getView().getModel().sServiceUrl;
			var sGosData = this.getModel("gosObject").getData();
			sPath = sPath + "/";
			if(sId){
				var sUrl = sPath
					       + this.getView().getModel().createKey("AttachmentSet",{
					       		InstanceID: sInstanceID,
					       		TypeID: sGosData.TypeID,
					       		CategoryID: sGosData.CategoryID,
					       		Id: sId
					       	})                    
					       + "/$value" ;
			}
			return sUrl;
		}
	};

	return Formatter;

},  true);
