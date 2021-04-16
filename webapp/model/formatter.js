sap.ui.define([], function () {
	"use strict";

	return {

		/**
		 * Rounds the number unit value to 2 digits
		 * @public
		 * @param {string} sValue the number string to be rounded
		 * @returns {string} sValue with 2 digits rounded
		 */
		numberUnit : function (sValue) {
			if (!sValue) {
				return "";
			}
			return parseFloat(sValue).toFixed(2);
		},
		
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

});